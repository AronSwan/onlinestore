import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SECURITY_CONSTANTS } from './security.constants';

// 速率限制装饰器
export const RateLimit = (options: { ttl: number; limit: number }) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('rate-limit', options, descriptor.value);
  };
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly requestCounts = new Map<string, { count: number; resetTime: number }>();

  constructor(private reflector: Reflector) {
    // 定期清理过期的计数器
    setInterval(() => this.cleanExpiredCounters(), 60 * 1000); // 每分钟清理一次
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();

    // 获取速率限制配置
    const rateLimitConfig = this.reflector.get<{ ttl: number; limit: number }>(
      'rate-limit',
      handler,
    );

    if (!rateLimitConfig) {
      return true; // 没有配置速率限制，直接通过
    }

    const key = this.generateKey(request, context);
    const now = Date.now();

    // 获取或创建计数器
    let counter = this.requestCounts.get(key);
    if (!counter || now > counter.resetTime) {
      counter = {
        count: 0,
        resetTime: now + rateLimitConfig.ttl * 1000,
      };
      this.requestCounts.set(key, counter);
    }

    // 检查是否超过限制
    if (counter.count >= rateLimitConfig.limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: '请求过于频繁，请稍后再试',
          retryAfter: Math.ceil((counter.resetTime - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 增加计数
    counter.count++;

    return true;
  }

  /**
   * 生成速率限制键
   */
  private generateKey(request: Request, context: ExecutionContext): string {
    const ip = this.getClientIP(request);
    const route = context.getClass().name + '.' + context.getHandler().name;
    const userId = (request as any).user?.id || 'anonymous';

    return `${ip}:${userId}:${route}`;
  }

  /**
   * 获取客户端IP
   */
  private getClientIP(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string) ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * 清理过期的计数器
   */
  private cleanExpiredCounters(): void {
    const now = Date.now();
    for (const [key, counter] of this.requestCounts.entries()) {
      if (now > counter.resetTime) {
        this.requestCounts.delete(key);
      }
    }
  }
}

// 预定义的速率限制装饰器
export const PaymentRateLimit = () =>
  RateLimit(SECURITY_CONSTANTS.PAYMENT.RATE_LIMIT.CREATE_PAYMENT);
export const CallbackRateLimit = () => RateLimit(SECURITY_CONSTANTS.PAYMENT.RATE_LIMIT.CALLBACK);
export const QueryRateLimit = () => RateLimit(SECURITY_CONSTANTS.PAYMENT.RATE_LIMIT.QUERY);
