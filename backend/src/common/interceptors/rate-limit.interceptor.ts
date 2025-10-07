import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { RateLimiterService, RateLimitResult } from '../rate-limiter/rate-limiter.service';
import { TracingService } from '../tracing/tracing.service';
import { RATE_LIMIT_KEY, RATE_LIMIT_SKIP_KEY } from '../decorators/rate-limit.decorator';

/**
 * 限流异常
 */
export class RateLimitException extends HttpException {
  constructor(
    message: string,
    statusCode: number = HttpStatus.TOO_MANY_REQUESTS,
    public readonly rateLimitResult: RateLimitResult,
    public readonly headers: Record<string, string> = {},
  ) {
    super(message, statusCode);
  }
}

/**
 * 限流拦截器
 * 自动处理方法级别的限流
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitInterceptor.name);

  constructor(
    private readonly rateLimiterService: RateLimiterService,
    private readonly reflector: Reflector,
    private readonly tracingService: TracingService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const traceId = this.tracingService.generateTraceId();

    try {
      // 检查是否跳过限流
      const skipRateLimit = this.reflector.getAllAndOverride<boolean>(RATE_LIMIT_SKIP_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (skipRateLimit) {
        this.logger.debug(`[${traceId}] Rate limiting skipped`);
        return next.handle();
      }

      // 获取限流配置
      const rateLimitMetadata = this.reflector.getAllAndOverride<any>(RATE_LIMIT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (!rateLimitMetadata) {
        return next.handle();
      }

      const request = context.switchToHttp().getRequest<Request>();
      const response = context.switchToHttp().getResponse<Response>();

      // 生成限流键
      const key = await this.generateRateLimitKey(
        request,
        rateLimitMetadata,
        context,
        traceId ?? 'unknown',
      );

      // 执行限流检查
      const result = await this.rateLimiterService.checkRateLimit(
        key,
        (rateLimitMetadata as any).config || {},
        context,
      );

      // 设置响应头
      this.setRateLimitHeaders(response, result, rateLimitMetadata);

      if (!result.allowed) {
        this.logger.warn(
          `[${traceId}] Rate limit exceeded for key: ${key}, ` +
            `algorithm: ${result.algorithm}, remaining: ${result.remaining}`,
        );

        throw new RateLimitException(
          (rateLimitMetadata as any).message || 'Rate limit exceeded',
          (rateLimitMetadata as any).statusCode || HttpStatus.TOO_MANY_REQUESTS,
          result,
          (rateLimitMetadata as any).headers || {},
        );
      }

      this.logger.debug(
        `[${traceId}] Rate limit check passed for key: ${key}, ` + `remaining: ${result.remaining}`,
      );

      return next.handle().pipe(
        catchError(error => {
          this.logger.error(`[${traceId}] Request processing error:`, error.message);
          return throwError(() => error);
        }),
      );
    } catch (error) {
      if (error instanceof RateLimitException) {
        throw error;
      }

      this.logger.error(`[${traceId}] Rate limit interceptor error:`, error.message);

      // 出错时允许请求继续
      return next.handle();
    }
  }

  /**
   * 生成限流键
   */
  private async generateRateLimitKey(
    request: Request,
    metadata: any,
    context: ExecutionContext,
    traceId: string,
  ): Promise<string> {
    try {
      // 使用自定义键生成器
      if ((metadata as any).config?.keyGenerator) {
        return (metadata as any).config.keyGenerator(context);
      }

      // 使用默认键生成策略
      const prefix = ((metadata as any).keyPrefix || (metadata as any).name || 'default') as string;
      const userId = (request as any).user?.id;
      const ip = request.ip || request.connection?.remoteAddress || 'unknown';
      const userAgent = request.get('User-Agent') || 'unknown';
      const method = request.method;
      const path = request.route?.path || request.path;

      // 根据不同情况生成键
      if (userId) {
        return `${prefix}:user:${userId}`;
      } else {
        // 使用IP和User-Agent的组合
        const fingerprint = this.generateFingerprint(ip, userAgent);
        return `${prefix}:ip:${fingerprint}`;
      }
    } catch (error) {
      this.logger.error(`[${traceId}] Failed to generate rate limit key:`, error.message);

      // 回退到简单的IP键
      const ip = request.ip || 'unknown';
      return `fallback:ip:${ip}`;
    }
  }

  /**
   * 生成客户端指纹
   */
  private generateFingerprint(ip: string, userAgent: string): string {
    const crypto = require('crypto');
    const data = `${ip}:${userAgent}`;
    return crypto.createHash('md5').update(data).digest('hex').substring(0, 16);
  }

  /**
   * 设置限流响应头
   */
  private setRateLimitHeaders(response: Response, result: RateLimitResult, metadata: any): void {
    try {
      // 标准限流头
      response.setHeader('X-RateLimit-Limit', (metadata as any).config?.limit);
      response.setHeader('X-RateLimit-Remaining', result.remaining);
      response.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
      response.setHeader('X-RateLimit-Algorithm', result.algorithm);

      // 如果被限流，设置重试时间
      if (!result.allowed && result.retryAfter) {
        response.setHeader('Retry-After', result.retryAfter);
      }

      // 设置自定义头
      if ((metadata as any).headers) {
        Object.entries((metadata as any).headers).forEach(([key, value]) => {
          response.setHeader(key, value as string);
        });
      }
    } catch (error) {
      this.logger.error('Failed to set rate limit headers:', error.message);
    }
  }
}

/**
 * 全局限流拦截器
 * 为所有请求提供基础限流保护
 */
@Injectable()
export class GlobalRateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(GlobalRateLimitInterceptor.name);

  constructor(
    private readonly rateLimiterService: RateLimiterService,
    private readonly tracingService: TracingService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const traceId = this.tracingService.generateTraceId();

    try {
      const request = context.switchToHttp().getRequest<Request>();
      const response = context.switchToHttp().getResponse<Response>();

      // 获取客户端标识
      const clientId = this.getClientIdentifier(request);

      // 执行全局限流检查
      const result = await this.rateLimiterService.checkByType('api', clientId, context);

      // 设置响应头
      response.setHeader('X-RateLimit-Global-Limit', 100);
      response.setHeader('X-RateLimit-Global-Remaining', result.remaining);
      response.setHeader('X-RateLimit-Global-Reset', Math.ceil(result.resetTime / 1000));

      if (!result.allowed) {
        this.logger.warn(
          `[${traceId}] Global rate limit exceeded for client: ${clientId}, ` +
            `remaining: ${result.remaining}`,
        );

        if (result.retryAfter) {
          response.setHeader('Retry-After', result.retryAfter);
        }

        throw new RateLimitException(
          'Global rate limit exceeded',
          HttpStatus.TOO_MANY_REQUESTS,
          result,
        );
      }

      return next.handle();
    } catch (error) {
      if (error instanceof RateLimitException) {
        throw error;
      }

      this.logger.error(`[${traceId}] Global rate limit interceptor error:`, error.message);

      // 出错时允许请求继续
      return next.handle();
    }
  }

  /**
   * 获取客户端标识
   */
  private getClientIdentifier(request: Request): string {
    const userId = (request as any).user?.id;
    if (userId) {
      return `user:${userId}`;
    }

    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const userAgent = request.get('User-Agent') || 'unknown';

    // 生成客户端指纹
    const crypto = require('crypto');
    const fingerprint = crypto
      .createHash('md5')
      .update(`${ip}:${userAgent}`)
      .digest('hex')
      .substring(0, 16);

    return `client:${fingerprint}`;
  }
}

/**
 * IP白名单拦截器
 * 为白名单IP跳过限流
 */
@Injectable()
export class IpWhitelistInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IpWhitelistInterceptor.name);
  private readonly whitelist: Set<string>;

  constructor(
    private readonly tracingService: TracingService,
    whitelistIps: string[] = [],
  ) {
    this.whitelist = new Set(['127.0.0.1', '::1', 'localhost', ...whitelistIps]);
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const traceId = this.tracingService.generateTraceId();

    try {
      const request = context.switchToHttp().getRequest<Request>();
      const ip = request.ip || request.connection?.remoteAddress;

      if (ip && this.whitelist.has(ip)) {
        this.logger.debug(`[${traceId}] IP ${ip} is whitelisted, skipping rate limit`);

        // 设置跳过标记
        (request as any).skipRateLimit = true;
      }

      return next.handle();
    } catch (error) {
      this.logger.error(`[${traceId}] IP whitelist interceptor error:`, error.message);
      return next.handle();
    }
  }

  /**
   * 添加IP到白名单
   */
  addToWhitelist(ip: string): void {
    this.whitelist.add(ip);
    this.logger.log(`IP ${ip} added to whitelist`);
  }

  /**
   * 从白名单移除IP
   */
  removeFromWhitelist(ip: string): void {
    this.whitelist.delete(ip);
    this.logger.log(`IP ${ip} removed from whitelist`);
  }

  /**
   * 检查IP是否在白名单中
   */
  isWhitelisted(ip: string): boolean {
    return this.whitelist.has(ip);
  }

  /**
   * 获取白名单
   */
  getWhitelist(): string[] {
    return Array.from(this.whitelist);
  }
}
