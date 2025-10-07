import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RedisCacheService } from '../cache/redis-cache.service';
import { TracingService } from '../tracing/tracing.service';

/**
 * 安全配置
 */
export interface SecurityConfig {
  ipWhitelist?: string[];
  ipBlacklist?: string[];
  allowedCountries?: string[];
  blockedCountries?: string[];
  maxRequestsPerMinute?: number;
  maxFailedAttempts?: number;
  blockDuration?: number;
  requireHttps?: boolean;
  allowedUserAgents?: string[];
  blockedUserAgents?: string[];
  maxRequestSize?: number;
  allowedMethods?: string[];
  corsOrigins?: string[];
}

/**
 * 安全元数据键
 */
export const SECURITY_CONFIG_KEY = 'security_config';
export const SKIP_SECURITY_KEY = 'skip_security';
export const IP_WHITELIST_KEY = 'ip_whitelist';
export const IP_BLACKLIST_KEY = 'ip_blacklist';
export const REQUIRE_HTTPS_KEY = 'require_https';

/**
 * 安全装饰器
 */
export const Security = (config: SecurityConfig) => {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(SECURITY_CONFIG_KEY, config, target, propertyKey || '');
  };
};

export const SkipSecurity = () => {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(SKIP_SECURITY_KEY, true, target, propertyKey || '');
  };
};

export const IpWhitelist = (ips: string[]) => {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(IP_WHITELIST_KEY, ips, target, propertyKey || '');
  };
};

export const IpBlacklist = (ips: string[]) => {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(IP_BLACKLIST_KEY, ips, target, propertyKey || '');
  };
};

export const RequireHttps = () => {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(REQUIRE_HTTPS_KEY, true, target, propertyKey || '');
  };
};

/**
 * 安全防护守卫
 */
@Injectable()
export class SecurityGuard implements CanActivate {
  private readonly logger = new Logger(SecurityGuard.name);
  private readonly defaultConfig: SecurityConfig;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly redisCache: RedisCacheService,
    private readonly tracingService: TracingService,
  ) {
    this.defaultConfig = {
      ipWhitelist: (this.configService.get<string>('SECURITY_IP_WHITELIST') || '')
        .split(',')
        .filter(Boolean),
      ipBlacklist: (this.configService.get<string>('SECURITY_IP_BLACKLIST') || '')
        .split(',')
        .filter(Boolean),
      allowedCountries: (this.configService.get<string>('SECURITY_ALLOWED_COUNTRIES') || '')
        .split(',')
        .filter(Boolean),
      blockedCountries: (this.configService.get<string>('SECURITY_BLOCKED_COUNTRIES') || '')
        .split(',')
        .filter(Boolean),
      maxRequestsPerMinute:
        this.configService.get<number>('SECURITY_MAX_REQUESTS_PER_MINUTE') || 60,
      maxFailedAttempts: this.configService.get<number>('SECURITY_MAX_FAILED_ATTEMPTS') || 5,
      blockDuration: this.configService.get<number>('SECURITY_BLOCK_DURATION') || 900, // 15分钟
      requireHttps: this.configService.get<boolean>('SECURITY_REQUIRE_HTTPS') || false,
      allowedUserAgents: (this.configService.get<string>('SECURITY_ALLOWED_USER_AGENTS') || '')
        .split(',')
        .filter(Boolean),
      blockedUserAgents: (this.configService.get<string>('SECURITY_BLOCKED_USER_AGENTS') || '')
        .split(',')
        .filter(Boolean),
      maxRequestSize:
        this.configService.get<number>('SECURITY_MAX_REQUEST_SIZE') || 10 * 1024 * 1024, // 10MB
      allowedMethods: (
        this.configService.get<string>('SECURITY_ALLOWED_METHODS') ||
        'GET,POST,PUT,DELETE,PATCH,OPTIONS'
      ).split(','),
      corsOrigins: (this.configService.get<string>('SECURITY_CORS_ORIGINS') || '')
        .split(',')
        .filter(Boolean),
    };
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const traceId = this.tracingService.generateTraceId() || 'unknown';

    try {
      // 检查是否跳过安全检查
      const skipSecurity = this.reflector.getAllAndOverride<boolean>(SKIP_SECURITY_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (skipSecurity) {
        this.logger.debug(`[${traceId}] Security check skipped`);
        return true;
      }

      const request = context.switchToHttp().getRequest<Request>();

      // 获取安全配置
      const securityConfig = this.getSecurityConfig(context);

      // 执行各项安全检查
      await this.checkHttps(request, securityConfig, traceId);
      await this.checkIpWhitelist(request, securityConfig, traceId);
      await this.checkIpBlacklist(request, securityConfig, traceId);
      await this.checkUserAgent(request, securityConfig, traceId);
      await this.checkRequestMethod(request, securityConfig, traceId);
      await this.checkRequestSize(request, securityConfig, traceId);
      await this.checkRequestFrequency(request, securityConfig, traceId);
      await this.checkFailedAttempts(request, securityConfig, traceId);
      await this.checkGeolocation(request, securityConfig, traceId);

      this.logger.debug(`[${traceId}] Security check passed for IP: ${request.ip}`);
      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        this.logger.warn(`[${traceId}] Security check failed: ${error.message}`);
        throw error;
      }

      this.logger.error(`[${traceId}] Security guard error:`, error.message);

      // 出错时根据配置决定是否允许
      const allowOnError = this.configService.get('SECURITY_ALLOW_ON_ERROR', true);
      return allowOnError;
    }
  }

  /**
   * 获取安全配置
   */
  private getSecurityConfig(context: ExecutionContext): SecurityConfig {
    const methodConfig = this.reflector.get<SecurityConfig>(
      SECURITY_CONFIG_KEY,
      context.getHandler(),
    );

    const classConfig = this.reflector.get<SecurityConfig>(SECURITY_CONFIG_KEY, context.getClass());

    // 合并配置，方法级配置优先
    return {
      ...this.defaultConfig,
      ...classConfig,
      ...methodConfig,
    };
  }

  /**
   * 检查HTTPS要求
   */
  private async checkHttps(
    request: Request,
    config: SecurityConfig,
    traceId: string,
  ): Promise<void> {
    const requireHttps =
      config.requireHttps ||
      this.reflector.getAllAndOverride<boolean>(REQUIRE_HTTPS_KEY, [request.route?.path || '']);

    if (requireHttps && !request.secure && request.get('x-forwarded-proto') !== 'https') {
      this.logger.warn(`[${traceId}] HTTPS required but request is not secure`);
      throw new ForbiddenException('HTTPS required');
    }
  }

  /**
   * 检查IP白名单
   */
  private async checkIpWhitelist(
    request: Request,
    config: SecurityConfig,
    traceId: string,
  ): Promise<void> {
    const whitelist =
      config.ipWhitelist ||
      this.reflector.getAllAndOverride<string[]>(IP_WHITELIST_KEY, [request.route?.path || '']);

    if (whitelist && whitelist.length > 0) {
      const clientIp = this.getClientIp(request);

      if (!this.isIpInList(clientIp, whitelist)) {
        this.logger.warn(`[${traceId}] IP ${clientIp} not in whitelist`);
        throw new ForbiddenException('IP not allowed');
      }
    }
  }

  /**
   * 检查IP黑名单
   */
  private async checkIpBlacklist(
    request: Request,
    config: SecurityConfig,
    traceId: string,
  ): Promise<void> {
    const blacklist =
      config.ipBlacklist ||
      this.reflector.getAllAndOverride<string[]>(IP_BLACKLIST_KEY, [request.route?.path || '']);

    if (blacklist && blacklist.length > 0) {
      const clientIp = this.getClientIp(request);

      if (this.isIpInList(clientIp, blacklist)) {
        this.logger.warn(`[${traceId}] IP ${clientIp} is blacklisted`);
        throw new ForbiddenException('IP blocked');
      }
    }
  }

  /**
   * 检查User-Agent
   */
  private async checkUserAgent(
    request: Request,
    config: SecurityConfig,
    traceId: string,
  ): Promise<void> {
    const userAgent = request.get('User-Agent') || '';

    // 检查被阻止的User-Agent
    if (config.blockedUserAgents && config.blockedUserAgents.length > 0) {
      const isBlocked = config.blockedUserAgents.some(blocked =>
        userAgent.toLowerCase().includes(blocked.toLowerCase()),
      );

      if (isBlocked) {
        this.logger.warn(`[${traceId}] Blocked User-Agent: ${userAgent}`);
        throw new ForbiddenException('User-Agent blocked');
      }
    }

    // 检查允许的User-Agent
    if (config.allowedUserAgents && config.allowedUserAgents.length > 0) {
      const isAllowed = config.allowedUserAgents.some(allowed =>
        userAgent.toLowerCase().includes(allowed.toLowerCase()),
      );

      if (!isAllowed) {
        this.logger.warn(`[${traceId}] User-Agent not allowed: ${userAgent}`);
        throw new ForbiddenException('User-Agent not allowed');
      }
    }
  }

  /**
   * 检查请求方法
   */
  private async checkRequestMethod(
    request: Request,
    config: SecurityConfig,
    traceId: string,
  ): Promise<void> {
    if (config.allowedMethods && config.allowedMethods.length > 0) {
      if (!config.allowedMethods.includes(request.method)) {
        this.logger.warn(`[${traceId}] Method ${request.method} not allowed`);
        throw new ForbiddenException('Method not allowed');
      }
    }
  }

  /**
   * 检查请求大小
   */
  private async checkRequestSize(
    request: Request,
    config: SecurityConfig,
    traceId: string,
  ): Promise<void> {
    if (config.maxRequestSize) {
      const contentLength = parseInt(request.get('Content-Length') || '0');

      if (contentLength > config.maxRequestSize) {
        this.logger.warn(
          `[${traceId}] Request size ${contentLength} exceeds limit ${config.maxRequestSize}`,
        );
        throw new ForbiddenException('Request too large');
      }
    }
  }

  /**
   * 检查请求频率
   */
  private async checkRequestFrequency(
    request: Request,
    config: SecurityConfig,
    traceId: string,
  ): Promise<void> {
    if (config.maxRequestsPerMinute) {
      const clientIp = this.getClientIp(request);
      const key = `security:frequency:${clientIp}`;

      const count = Number((await this.redisCache.get(key)) || 0);

      if (count >= config.maxRequestsPerMinute) {
        this.logger.warn(`[${traceId}] Request frequency exceeded for IP: ${clientIp}`);
        throw new ForbiddenException('Request frequency exceeded');
      }

      await this.redisCache.increment(key);
      await this.redisCache.expire(key, 60); // 1分钟过期
    }
  }

  /**
   * 检查失败尝试次数
   */
  private async checkFailedAttempts(
    request: Request,
    config: SecurityConfig,
    traceId: string,
  ): Promise<void> {
    if (config.maxFailedAttempts && config.blockDuration) {
      const clientIp = this.getClientIp(request);
      const key = `security:failed:${clientIp}`;

      const failedCount = Number((await this.redisCache.get(key)) || 0);

      if (failedCount >= config.maxFailedAttempts) {
        this.logger.warn(`[${traceId}] Too many failed attempts for IP: ${clientIp}`);
        throw new ForbiddenException('Too many failed attempts');
      }
    }
  }

  /**
   * 检查地理位置
   */
  private async checkGeolocation(
    request: Request,
    config: SecurityConfig,
    traceId: string,
  ): Promise<void> {
    // 这里可以集成地理位置服务，如MaxMind GeoIP
    // 暂时跳过实现
  }

  /**
   * 获取客户端IP
   */
  private getClientIp(request: Request): string {
    return (
      request.ip ||
      request.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.get('x-real-ip') ||
      request.connection?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * 检查IP是否在列表中
   */
  private isIpInList(ip: string, list: string[]): boolean {
    return list.some(item => {
      // 支持CIDR格式
      if (item.includes('/')) {
        return this.isIpInCidr(ip, item);
      }

      // 支持通配符
      if (item.includes('*')) {
        const regex = new RegExp(item.replace(/\*/g, '.*'));
        return regex.test(ip);
      }

      // 精确匹配
      return ip === item;
    });
  }

  /**
   * 检查IP是否在CIDR范围内
   */
  private isIpInCidr(ip: string, cidr: string): boolean {
    // 简单的CIDR检查实现
    // 生产环境建议使用专门的库如ip-range-check
    try {
      const [network, prefixLength] = cidr.split('/');
      const ipParts = ip.split('.').map(Number);
      const networkParts = network.split('.').map(Number);
      const prefix = parseInt(prefixLength);

      const ipInt = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
      const networkInt =
        (networkParts[0] << 24) +
        (networkParts[1] << 16) +
        (networkParts[2] << 8) +
        networkParts[3];
      const mask = (-1 << (32 - prefix)) >>> 0;

      return (ipInt & mask) === (networkInt & mask);
    } catch (error) {
      this.logger.error(`Failed to check CIDR: ${error.message}`);
      return false;
    }
  }

  /**
   * 记录失败尝试
   */
  async recordFailedAttempt(request: Request): Promise<void> {
    const clientIp = this.getClientIp(request);
    const key = `security:failed:${clientIp}`;

    await this.redisCache.increment(key);
    await this.redisCache.expire(key, this.defaultConfig.blockDuration || 900);

    this.logger.warn(`Failed attempt recorded for IP: ${clientIp}`);
  }

  /**
   * 清除失败尝试记录
   */
  async clearFailedAttempts(request: Request): Promise<void> {
    const clientIp = this.getClientIp(request);
    const key = `security:failed:${clientIp}`;

    await this.redisCache.delete(key);
    this.logger.debug(`Failed attempts cleared for IP: ${clientIp}`);
  }
}

/**
 * API密钥守卫
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly redisCache: RedisCacheService,
    private readonly tracingService: TracingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const traceId = this.tracingService?.generateTraceId() || 'unknown';

    try {
      const request = context.switchToHttp().getRequest<Request>();
      const apiKey = request.get('X-API-Key') || (request.query.apiKey as string) || '';

      if (!apiKey) {
        this.logger.warn(`[${traceId}] API key missing`);
        throw new UnauthorizedException('API key required');
      }

      // 验证API密钥
      const isValid = await this.validateApiKey(apiKey, traceId);

      if (!isValid) {
        this.logger.warn(`[${traceId}] Invalid API key: ${apiKey.substring(0, 8)}...`);
        throw new UnauthorizedException('Invalid API key');
      }

      // 记录API密钥使用
      await this.recordApiKeyUsage(apiKey || '', request, traceId);

      this.logger.debug(`[${traceId}] API key validation passed`);
      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`[${traceId}] API key guard error:`, error.message);
      throw new UnauthorizedException('API key validation failed');
    }
  }

  /**
   * 验证API密钥
   */
  private async validateApiKey(apiKey: string, traceId: string): Promise<boolean> {
    try {
      // 从缓存或数据库中验证API密钥
      const keyInfo = (await this.redisCache.get(`api_key:${apiKey}`)) as {
        expiresAt?: string;
        disabled?: boolean;
      } | null;

      if (!keyInfo) {
        // 如果缓存中没有，可以从数据库查询
        // 这里简化处理，实际应该查询数据库
        return false;
      }

      // 检查密钥是否过期
      if (keyInfo.expiresAt && new Date(keyInfo.expiresAt) < new Date()) {
        this.logger.warn(`[${traceId}] API key expired: ${apiKey.substring(0, 8)}...`);
        return false;
      }

      // 检查密钥是否被禁用
      if (keyInfo.disabled) {
        this.logger.warn(`[${traceId}] API key disabled: ${apiKey.substring(0, 8)}...`);
        return false;
      }

      return true;
    } catch (error: any) {
      this.logger.error(`[${traceId}] API key validation error:`, error.message);
      return false;
    }
  }

  /**
   * 记录API密钥使用
   */
  private async recordApiKeyUsage(
    apiKey: string,
    request: Request,
    traceId: string,
  ): Promise<void> {
    try {
      const usageKey = `api_key_usage:${apiKey}:${new Date().toISOString().split('T')[0]}`;

      await this.redisCache.increment(usageKey);
      await this.redisCache.expire(usageKey, 86400 * 30); // 保留30天

      // 记录详细使用信息
      const usageInfo = {
        timestamp: new Date().toISOString(),
        ip: request.ip,
        userAgent: request.get('User-Agent') || '',
        method: request.method,
        path: request.path,
        traceId,
      };

      const detailKey = `api_key_detail:${apiKey}:${Date.now()}`;
      await this.redisCache.set(detailKey, usageInfo, { ttl: 86400 * 7 }); // 保留7天
    } catch (error: any) {
      this.logger.error(`[${traceId}] Failed to record API key usage:`, error.message);
    }
  }
}
