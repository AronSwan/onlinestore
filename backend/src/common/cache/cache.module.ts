import { Module, DynamicModule, Global, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisCacheService } from './redis-cache.service';
import { MemoryCacheService } from './memory-cache.service';
import { CacheService, CacheStrategy, CacheLevel } from './cache.service';
import { CacheInterceptor as NewCacheInterceptor, CacheManager } from './cache.interceptor';
import { CacheInterceptor, GlobalCacheInterceptor } from '../interceptors/cache.interceptor';
import { TracingModule } from '../tracing/tracing.module';

/**
 * 缓存配置接口
 */
export interface CacheModuleOptions {
  // 新缓存系统配置
  newCacheSystem?: {
    enabled?: boolean;
    defaultTtl?: number;
    defaultStrategy?: CacheStrategy;
    defaultLevels?: CacheLevel[];

    // L1缓存配置（内存）
    l1?: {
      enabled?: boolean;
      maxSize?: number;
      ttl?: number;
      checkPeriod?: number;
    };

    // L2缓存配置（Redis）
    l2?: {
      enabled?: boolean;
      host?: string;
      port?: number;
      password?: string;
      db?: number;
      keyPrefix?: string;
      ttl?: number;
      maxRetries?: number;
      retryDelayOnFailover?: number;
      enableReadyCheck?: boolean;
      maxRetriesPerRequest?: number;
      lazyConnect?: boolean;
      keepAlive?: number;
      family?: number;
      connectTimeout?: number;
      commandTimeout?: number;
    };

    // L3缓存配置（持久化）
    l3?: {
      enabled?: boolean;
      type?: 'file' | 'database';
      path?: string;
      ttl?: number;
    };

    // 监控配置
    monitoring?: {
      enabled?: boolean;
      metricsInterval?: number;
      logLevel?: 'debug' | 'info' | 'warn' | 'error';
    };

    // 序列化配置
    serialization?: {
      defaultSerializer?: 'json' | 'msgpack' | 'custom';
      compression?: boolean;
    };
  };

  // Redis配置（兼容旧系统）
  redis?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    cluster?: {
      enabled: boolean;
      nodes: Array<{ host: string; port: number }>;
    };
    keyPrefix?: string;
    retryDelayOnFailover?: number;
    maxRetriesPerRequest?: number;
    lazyConnect?: boolean;
    keepAlive?: number;
    connectTimeout?: number;
    commandTimeout?: number;
  };

  // 内存缓存配置（兼容旧系统）
  memory?: {
    maxSize?: number;
    maxMemoryMB?: number;
    ttl?: number;
    checkPeriod?: number;
    useClones?: boolean;
    deleteOnExpire?: boolean;
    enableLogs?: boolean;
  };

  // 全局配置
  global?: {
    enableGlobalInterceptor?: boolean;
    enableMethodInterceptor?: boolean;
    enableNewCacheInterceptor?: boolean;
    defaultTtl?: number;
    keyPrefix?: string;
    enableMetrics?: boolean;
    enableTracing?: boolean;
  };
}

/**
 * 缓存模块
 * 提供Redis和内存缓存功能
 */
@Global()
@Module({})
export class CacheModule {
  /**
   * 同步配置缓存模块
   */
  static forRoot(options: CacheModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'CACHE_OPTIONS',
        useValue: options,
      },
    ];

    // 添加新缓存系统的提供者
    if (options.newCacheSystem?.enabled !== false) {
      providers.push(
        {
          provide: CacheService,
          useFactory: (configService: ConfigService, eventEmitter: EventEmitter2) => {
            const config = this.mergeWithEnvironmentConfig(options, configService);
            return new CacheService(configService, eventEmitter);
          },
          inject: [ConfigService, EventEmitter2],
        },
        CacheManager,
      );

      // 添加新缓存拦截器
      if (options.global?.enableNewCacheInterceptor !== false) {
        providers.push({
          provide: APP_INTERCEPTOR,
          useClass: NewCacheInterceptor,
        });
      }
    }

    return {
      module: CacheModule,
      imports: [CacheCoreModule, CacheConfigModule, TracingModule],
      providers,
      exports: [CacheCoreModule, 'CACHE_OPTIONS', CacheService, CacheManager],
      global: true,
    };
  }

  /**
   * 异步配置缓存模块
   */
  static forRootAsync(options: {
    imports?: any[];
    useFactory?: (...args: any[]) => Promise<CacheModuleOptions> | CacheModuleOptions;
    inject?: any[];
  }): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'CACHE_OPTIONS',
        useFactory: options.useFactory || (() => ({})),
        inject: options.inject || [],
      },
    ];

    // 添加新缓存系统的异步提供者
    providers.push(
      {
        provide: CacheService,
        useFactory: async (
          cacheOptions: CacheModuleOptions,
          configService: ConfigService,
          eventEmitter: EventEmitter2,
        ) => {
          const config = this.mergeWithEnvironmentConfig(cacheOptions, configService);
          return new CacheService(configService, eventEmitter);
        },
        inject: ['CACHE_OPTIONS', ConfigService, EventEmitter2],
      },
      CacheManager,
    );

    // 添加新缓存拦截器
    providers.push({
      provide: APP_INTERCEPTOR,
      useClass: NewCacheInterceptor,
    });

    return {
      module: CacheModule,
      imports: [CacheCoreModule, CacheConfigModule, TracingModule, ...(options.imports || [])],
      providers,
      exports: [CacheCoreModule, 'CACHE_OPTIONS', CacheService, CacheManager],
      global: true,
    };
  }

  /**
   * 功能模块（不包含全局拦截器）
   */
  static forFeature(): DynamicModule {
    return {
      module: CacheModule,
      imports: [ConfigModule, TracingModule],
      providers: [RedisCacheService, MemoryCacheService, CacheInterceptor],
      exports: [RedisCacheService, MemoryCacheService, CacheInterceptor],
    };
  }

  /**
   * 合并环境配置
   */
  private static mergeWithEnvironmentConfig(
    options: CacheModuleOptions,
    configService: ConfigService,
  ): CacheModuleOptions {
    const envConfig = CacheConfigFactory.createFromEnvironment(configService);

    return {
      ...envConfig,
      ...options,
      newCacheSystem: {
        ...envConfig.newCacheSystem,
        ...options.newCacheSystem,
        l1: {
          ...(envConfig.newCacheSystem?.l1 || {}),
          ...(options.newCacheSystem?.l1 || {}),
        },
        l2: {
          ...(envConfig.newCacheSystem?.l2 || {}),
          ...(options.newCacheSystem?.l2 || {}),
        },
        l3: {
          ...(envConfig.newCacheSystem?.l3 || {}),
          ...(options.newCacheSystem?.l3 || {}),
        },
        monitoring: {
          ...(envConfig.newCacheSystem?.monitoring || {}),
          ...(options.newCacheSystem?.monitoring || {}),
        },
        serialization: {
          ...(envConfig.newCacheSystem?.serialization || {}),
          ...(options.newCacheSystem?.serialization || {}),
        },
      },
      global: {
        ...envConfig.global,
        ...options.global,
      },
    };
  }
}

/**
 * 缓存配置工厂
 */
export class CacheConfigFactory {
  /**
   * 创建默认配置
   */
  static createDefault(): CacheModuleOptions {
    return {
      newCacheSystem: {
        enabled: true,
        defaultTtl: 300, // 5分钟
        defaultStrategy: CacheStrategy.LRU,
        defaultLevels: [CacheLevel.L1, CacheLevel.L2],

        l1: {
          enabled: true,
          maxSize: 1000,
          ttl: 300,
          checkPeriod: 60,
        },

        l2: {
          enabled: true,
          host: 'localhost',
          port: 6379,
          db: 0,
          keyPrefix: 'cache:',
          ttl: 3600,
          maxRetries: 3,
          retryDelayOnFailover: 100,
          enableReadyCheck: true,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          keepAlive: 30000,
          family: 4,
          connectTimeout: 10000,
          commandTimeout: 5000,
        },

        l3: {
          enabled: false,
          type: 'file',
          path: './cache',
          ttl: 86400, // 24小时
        },

        monitoring: {
          enabled: true,
          metricsInterval: 60000,
          logLevel: 'info',
        },

        serialization: {
          defaultSerializer: 'json',
          compression: false,
        },
      },

      global: {
        enableGlobalInterceptor: false,
        enableMethodInterceptor: false,
        enableNewCacheInterceptor: true,
        defaultTtl: 300,
        keyPrefix: 'app:',
        enableMetrics: true,
        enableTracing: false,
      },
    };
  }

  /**
   * 从环境变量创建配置
   */
  static createFromEnvironment(configService: ConfigService): CacheModuleOptions {
    const defaultConfig = this.createDefault();

    return {
      ...defaultConfig,
      newCacheSystem: {
        ...defaultConfig.newCacheSystem,
        enabled: configService.get<boolean>('CACHE_ENABLED', true),
        defaultTtl: configService.get<number>('CACHE_DEFAULT_TTL', 300),

        l1: {
          ...(defaultConfig.newCacheSystem?.l1 || {}),
          enabled: configService.get<boolean>('CACHE_L1_ENABLED', true),
          maxSize: configService.get<number>('CACHE_L1_MAX_SIZE', 1000),
          ttl: configService.get<number>('CACHE_L1_TTL', 300),
        },

        l2: {
          ...(defaultConfig.newCacheSystem?.l2 || {}),
          enabled: configService.get<boolean>('CACHE_L2_ENABLED', true),
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB', 0),
          keyPrefix: configService.get<string>('CACHE_KEY_PREFIX', 'cache:'),
          ttl: configService.get<number>('CACHE_L2_TTL', 3600),
        },

        l3: {
          ...(defaultConfig.newCacheSystem?.l3 || {}),
          enabled: configService.get<boolean>('CACHE_L3_ENABLED', false),
          type: configService.get<'file' | 'database'>('CACHE_L3_TYPE', 'file'),
          path: configService.get<string>('CACHE_L3_PATH', './cache'),
          ttl: configService.get<number>('CACHE_L3_TTL', 86400),
        },

        monitoring: {
          ...(defaultConfig.newCacheSystem?.monitoring || {}),
          enabled: configService.get<boolean>('CACHE_MONITORING_ENABLED', true),
          metricsInterval: configService.get<number>('CACHE_METRICS_INTERVAL', 60000),
          logLevel: configService.get<'debug' | 'info' | 'warn' | 'error'>(
            'CACHE_LOG_LEVEL',
            'info',
          ),
        },
      },

      global: {
        ...defaultConfig.global,
        enableNewCacheInterceptor: configService.get<boolean>('CACHE_INTERCEPTOR_ENABLED', true),
        defaultTtl: configService.get<number>('CACHE_DEFAULT_TTL', 300),
        keyPrefix: configService.get<string>('CACHE_KEY_PREFIX', 'app:'),
        enableMetrics: configService.get<boolean>('CACHE_METRICS_ENABLED', true),
        enableTracing: configService.get<boolean>('CACHE_TRACING_ENABLED', false),
      },
    };
  }

  /**
   * 创建生产环境配置
   */
  static createProduction(): CacheModuleOptions {
    const defaultConfig = this.createDefault();

    return {
      ...defaultConfig,
      newCacheSystem: {
        ...defaultConfig.newCacheSystem,
        defaultTtl: 600, // 10分钟

        l1: {
          ...(defaultConfig.newCacheSystem?.l1 || {}),
          maxSize: 5000,
          ttl: 600,
        },

        l2: {
          ...(defaultConfig.newCacheSystem?.l2 || {}),
          ttl: 7200, // 2小时
          maxRetries: 5,
          retryDelayOnFailover: 200,
        },

        l3: {
          ...(defaultConfig.newCacheSystem?.l3 || {}),
          enabled: true,
          ttl: 172800, // 48小时
        },

        monitoring: {
          ...(defaultConfig.newCacheSystem?.monitoring || {}),
          logLevel: 'warn',
        },

        serialization: {
          ...(defaultConfig.newCacheSystem?.serialization || {}),
          compression: true,
        },
      },
    };
  }

  /**
   * 创建开发环境配置
   */
  static createDevelopment(): CacheModuleOptions {
    const defaultConfig = this.createDefault();

    return {
      ...defaultConfig,
      newCacheSystem: {
        ...defaultConfig.newCacheSystem,
        defaultTtl: 60, // 1分钟

        l1: {
          ...(defaultConfig.newCacheSystem?.l1 || {}),
          maxSize: 100,
          ttl: 60,
        },

        l2: {
          ...(defaultConfig.newCacheSystem?.l2 || {}),
          ttl: 300, // 5分钟
        },

        l3: {
          ...(defaultConfig.newCacheSystem?.l3 || {}),
          enabled: false,
        },

        monitoring: {
          ...(defaultConfig.newCacheSystem?.monitoring || {}),
          logLevel: 'debug',
        },
      },

      global: {
        ...defaultConfig.global,
        enableTracing: true,
      },
    };
  }
}

/**
 * 缓存核心模块
 * 仅提供缓存服务，不包含拦截器
 */
@Module({
  imports: [ConfigModule, ScheduleModule.forRoot(), TracingModule],
  providers: [RedisCacheService, MemoryCacheService],
  exports: [RedisCacheService, MemoryCacheService],
})
export class CacheCoreModule {}

/**
 * 缓存配置模块
 * 仅提供配置相关功能
 */
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'CACHE_CONFIG',
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
          cluster: {
            enabled: configService.get('REDIS_CLUSTER_ENABLED', false),
            nodes: configService.get('REDIS_CLUSTER_NODES', []),
          },
          keyPrefix: configService.get('REDIS_KEY_PREFIX', 'cache:'),
          retryDelayOnFailover: configService.get('REDIS_RETRY_DELAY', 100),
          maxRetriesPerRequest: configService.get('REDIS_MAX_RETRIES', 3),
          lazyConnect: configService.get('REDIS_LAZY_CONNECT', true),
          keepAlive: configService.get('REDIS_KEEP_ALIVE', 30000),
          connectTimeout: configService.get('REDIS_CONNECT_TIMEOUT', 10000),
          commandTimeout: configService.get('REDIS_COMMAND_TIMEOUT', 5000),
        },
        memory: {
          maxSize: configService.get('MEMORY_CACHE_MAX_SIZE', 1000),
          maxMemoryMB: configService.get('MEMORY_CACHE_MAX_MEMORY_MB', 100),
          ttl: configService.get('MEMORY_CACHE_TTL', 600),
          checkPeriod: configService.get('MEMORY_CACHE_CHECK_PERIOD', 60),
          useClones: configService.get('MEMORY_CACHE_USE_CLONES', false),
          deleteOnExpire: configService.get('MEMORY_CACHE_DELETE_ON_EXPIRE', true),
          enableLogs: configService.get('MEMORY_CACHE_ENABLE_LOGS', false),
        },
        global: {
          enableGlobalInterceptor: configService.get('CACHE_ENABLE_GLOBAL_INTERCEPTOR', true),
          enableMethodInterceptor: configService.get('CACHE_ENABLE_METHOD_INTERCEPTOR', true),
          defaultTtl: configService.get('CACHE_DEFAULT_TTL', 300),
          keyPrefix: configService.get('CACHE_KEY_PREFIX', 'app:'),
          enableMetrics: configService.get('CACHE_ENABLE_METRICS', true),
          enableTracing: configService.get('CACHE_ENABLE_TRACING', true),
        },
      }),
      inject: [ConfigService],
    },
  ],
  exports: ['CACHE_CONFIG'],
})
export class CacheConfigModule {}

/**
 * 缓存工具类
 */
export class CacheUtils {
  /**
   * 生成缓存键
   */
  static generateKey(prefix: string, ...parts: (string | number)[]): string {
    return [prefix, ...parts.map(p => String(p))].join(':');
  }

  /**
   * 解析缓存键
   */
  static parseKey(key: string): string[] {
    return key.split(':');
  }

  /**
   * 格式化缓存大小
   */
  static formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * 计算缓存命中率
   */
  static calculateHitRate(hits: number, misses: number): number {
    const total = hits + misses;
    return total > 0 ? (hits / total) * 100 : 0;
  }

  /**
   * 生成缓存统计报告
   */
  static generateStatsReport(stats: any): string {
    return `
Cache Statistics Report
=======================
Hits: ${stats.hits}
Misses: ${stats.misses}
Hit Rate: ${this.calculateHitRate(stats.hits, stats.misses).toFixed(2)}%
Total Operations: ${stats.hits + stats.misses}
Cache Size: ${this.formatSize(stats.size || 0)}
Memory Usage: ${this.formatSize(stats.memoryUsage || 0)}
Uptime: ${Math.floor((Date.now() - stats.startTime) / 1000)}s
    `.trim();
  }

  /**
   * 验证缓存键格式
   */
  static validateKey(key: string): boolean {
    // 检查键是否为空或包含非法字符
    if (!key || key.length === 0) {
      return false;
    }

    // 检查键长度（Redis限制为512MB，但实际应该更短）
    if (key.length > 250) {
      return false;
    }

    // 检查是否包含空格或特殊字符
    const invalidChars = /[\s\r\n\t]/;
    return !invalidChars.test(key);
  }

  /**
   * 清理缓存键
   */
  static sanitizeKey(key: string): string {
    return key
      .replace(/[\s\r\n\t]/g, '_')
      .replace(/[^\w\-.:]/g, '')
      .substring(0, 250);
  }

  /**
   * 序列化值
   */
  static serialize(value: any): string {
    try {
      return JSON.stringify(value);
    } catch (error) {
      throw new Error(`Failed to serialize cache value: ${error.message}`);
    }
  }

  /**
   * 反序列化值
   */
  static deserialize<T = any>(value: string): T {
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new Error(`Failed to deserialize cache value: ${error.message}`);
    }
  }

  /**
   * 压缩数据
   */
  static async compress(data: string): Promise<Buffer> {
    const zlib = await import('zlib');
    return new Promise((resolve, reject) => {
      zlib.gzip(data, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * 解压数据
   */
  static async decompress(data: Buffer): Promise<string> {
    const zlib = await import('zlib');
    return new Promise((resolve, reject) => {
      zlib.gunzip(data, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.toString());
        }
      });
    });
  }
}
