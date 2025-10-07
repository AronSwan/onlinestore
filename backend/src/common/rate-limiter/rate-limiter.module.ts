import { Module, DynamicModule, Global, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { RateLimiterService } from './rate-limiter.service';
import {
  RateLimitInterceptor,
  GlobalRateLimitInterceptor,
  IpWhitelistInterceptor,
} from '../interceptors/rate-limit.interceptor';
import { SecurityGuard, ApiKeyGuard } from '../guards/security.guard';
import { CacheModule } from '../cache/cache.module';
import { TracingModule } from '../tracing/tracing.module';

/**
 * 限流模块选项
 */
export interface RateLimiterModuleOptions {
  // Redis配置
  redis?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
  };

  // 全局限流配置
  global?: {
    enabled?: boolean;
    limit?: number;
    window?: number;
    skipRoutes?: string[];
    skipIps?: string[];
  };

  // 安全配置
  security?: {
    enabled?: boolean;
    ipWhitelist?: string[];
    ipBlacklist?: string[];
    requireHttps?: boolean;
    maxRequestSize?: number;
    allowedMethods?: string[];
  };

  // API密钥配置
  apiKey?: {
    enabled?: boolean;
    header?: string;
    queryParam?: string;
  };

  // 监控配置
  monitoring?: {
    enabled?: boolean;
    metricsInterval?: number;
    logLevel?: string;
  };
}

/**
 * 限流模块异步选项
 */
export interface RateLimiterModuleAsyncOptions {
  imports?: any[];
  useFactory?: (...args: any[]) => Promise<RateLimiterModuleOptions> | RateLimiterModuleOptions;
  inject?: any[];
}

/**
 * 限流服务模块
 */
@Global()
@Module({})
export class RateLimiterModule {
  /**
   * 同步配置
   */
  static forRoot(options: RateLimiterModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'RATE_LIMIT_OPTIONS',
        useValue: options,
      },
      RateLimiterService,
      RateLimitInterceptor,
      SecurityGuard,
      ApiKeyGuard,
    ];

    // 添加全局拦截器
    if (options.global?.enabled !== false) {
      providers.push({
        provide: APP_INTERCEPTOR,
        useClass: GlobalRateLimitInterceptor,
      });
    }

    // 添加IP白名单拦截器
    if (options.security?.ipWhitelist?.length) {
      providers.push({
        provide: APP_INTERCEPTOR,
        useFactory: tracingService =>
          new IpWhitelistInterceptor(tracingService, options.security?.ipWhitelist || []),
        inject: ['TracingService'],
      });
    }

    // 添加安全守卫
    if (options.security?.enabled !== false) {
      providers.push({
        provide: APP_GUARD,
        useClass: SecurityGuard,
      });
    }

    // 添加API密钥守卫
    if (options.apiKey?.enabled) {
      providers.push({
        provide: APP_GUARD,
        useClass: ApiKeyGuard,
      });
    }

    return {
      module: RateLimiterModule,
      imports: [
        ConfigModule,
        ScheduleModule.forRoot(),
        CacheModule.forRoot({ redis: options.redis || {} }),
        TracingModule,
      ],
      providers,
      exports: [RateLimiterService, RateLimitInterceptor, SecurityGuard, ApiKeyGuard],
    };
  }

  /**
   * 异步配置
   */
  static forRootAsync(options: RateLimiterModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'RATE_LIMIT_OPTIONS',
        useFactory: options.useFactory || (() => ({})),
        inject: options.inject || [],
      },
      RateLimiterService,
      RateLimitInterceptor,
      SecurityGuard,
      ApiKeyGuard,
    ];

    return {
      module: RateLimiterModule,
      imports: [
        ConfigModule,
        ScheduleModule.forRoot(),
        CacheModule.forRootAsync({
          useFactory: async (configService: ConfigService) => ({
            redis: {
              host: configService.get('REDIS_HOST', 'localhost'),
              port: configService.get('REDIS_PORT', 6379),
              password: configService.get('REDIS_PASSWORD'),
              db: configService.get('REDIS_DB', 0),
            },
          }),
          inject: [ConfigService],
        }),
        TracingModule,
        ...(options.imports || []),
      ],
      providers,
      exports: [RateLimiterService, RateLimitInterceptor, SecurityGuard, ApiKeyGuard],
    };
  }

  /**
   * 功能模块配置
   */
  static forFeature(options: Partial<RateLimiterModuleOptions> = {}): DynamicModule {
    return {
      module: RateLimiterModule,
      providers: [
        {
          provide: 'RATE_LIMIT_FEATURE_OPTIONS',
          useValue: options,
        },
        RateLimitInterceptor,
      ],
      exports: [RateLimitInterceptor],
    };
  }
}

/**
 * 核心限流模块（不包含拦截器和守卫）
 */
@Module({})
export class RateLimiterCoreModule {
  static forRoot(options: RateLimiterModuleOptions = {}): DynamicModule {
    return {
      module: RateLimiterCoreModule,
      imports: [
        ConfigModule,
        ScheduleModule.forRoot(),
        CacheModule.forRoot({ redis: options.redis || {} }),
        TracingModule,
      ],
      providers: [
        {
          provide: 'RATE_LIMIT_OPTIONS',
          useValue: options,
        },
        RateLimiterService,
      ],
      exports: [RateLimiterService],
    };
  }

  static forRootAsync(options: RateLimiterModuleAsyncOptions): DynamicModule {
    return {
      module: RateLimiterCoreModule,
      imports: [
        ConfigModule,
        ScheduleModule.forRoot(),
        CacheModule.forRootAsync({
          useFactory: async (configService: ConfigService) => ({
            redis: {
              host: configService.get('REDIS_HOST', 'localhost'),
              port: configService.get('REDIS_PORT', 6379),
              password: configService.get('REDIS_PASSWORD'),
              db: configService.get('REDIS_DB', 0),
            },
          }),
          inject: [ConfigService],
        }),
        TracingModule,
        ...(options.imports || []),
      ],
      providers: [
        {
          provide: 'RATE_LIMIT_OPTIONS',
          useFactory: options.useFactory || (() => ({})),
          inject: options.inject || [],
        },
        RateLimiterService,
      ],
      exports: [RateLimiterService],
    };
  }
}

/**
 * 安全模块（仅包含安全相关功能）
 */
@Module({})
export class SecurityModule {
  static forRoot(options: RateLimiterModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'SECURITY_OPTIONS',
        useValue: options.security || {},
      },
      SecurityGuard,
    ];

    // 添加安全守卫
    if (options.security?.enabled !== false) {
      providers.push({
        provide: APP_GUARD,
        useClass: SecurityGuard,
      });
    }

    // 添加API密钥守卫
    if (options.apiKey?.enabled) {
      providers.push(ApiKeyGuard, {
        provide: APP_GUARD,
        useClass: ApiKeyGuard,
      });
    }

    return {
      module: SecurityModule,
      imports: [ConfigModule, CacheModule.forRoot({ redis: options.redis || {} }), TracingModule],
      providers,
      exports: [SecurityGuard, ApiKeyGuard],
    };
  }
}

/**
 * 限流工具类
 */
export class RateLimiterUtils {
  /**
   * 生成限流键
   */
  static generateKey(prefix: string, identifier: string, suffix?: string): string {
    const parts = [prefix, identifier];
    if (suffix) {
      parts.push(suffix);
    }
    return parts.join(':');
  }

  /**
   * 解析限流结果
   */
  static parseRateLimitHeaders(headers: Record<string, string>) {
    return {
      limit: parseInt(headers['X-RateLimit-Limit'] || '0'),
      remaining: parseInt(headers['X-RateLimit-Remaining'] || '0'),
      reset: parseInt(headers['X-RateLimit-Reset'] || '0'),
      retryAfter: parseInt(headers['Retry-After'] || '0'),
    };
  }

  /**
   * 计算重置时间
   */
  static calculateResetTime(windowSeconds: number): number {
    return Math.ceil(Date.now() / 1000) + windowSeconds;
  }

  /**
   * 格式化限流消息
   */
  static formatRateLimitMessage(limit: number, window: number, retryAfter?: number): string {
    const windowText =
      window < 60
        ? `${window} seconds`
        : window < 3600
          ? `${Math.ceil(window / 60)} minutes`
          : `${Math.ceil(window / 3600)} hours`;

    let message = `Rate limit exceeded. Maximum ${limit} requests per ${windowText}.`;

    if (retryAfter) {
      const retryText =
        retryAfter < 60
          ? `${retryAfter} seconds`
          : retryAfter < 3600
            ? `${Math.ceil(retryAfter / 60)} minutes`
            : `${Math.ceil(retryAfter / 3600)} hours`;
      message += ` Try again in ${retryText}.`;
    }

    return message;
  }

  /**
   * 验证IP地址格式
   */
  static isValidIp(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * 验证CIDR格式
   */
  static isValidCidr(cidr: string): boolean {
    const parts = cidr.split('/');
    if (parts.length !== 2) return false;

    const [ip, prefix] = parts;
    const prefixNum = parseInt(prefix);

    return this.isValidIp(ip) && !isNaN(prefixNum) && prefixNum >= 0 && prefixNum <= 32;
  }

  /**
   * 生成API密钥
   */
  static generateApiKey(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  /**
   * 哈希API密钥
   */
  static hashApiKey(apiKey: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }
}
