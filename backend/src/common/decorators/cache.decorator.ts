import { SetMetadata } from '@nestjs/common';

/**
 * 缓存策略枚举
 */
export enum CacheStrategy {
  MEMORY_ONLY = 'memory_only', // 仅内存缓存
  REDIS_ONLY = 'redis_only', // 仅Redis缓存
  MEMORY_FIRST = 'memory_first', // 内存优先，Redis备用
  REDIS_FIRST = 'redis_first', // Redis优先，内存备用
  WRITE_THROUGH = 'write_through', // 写穿透（同时写入两级缓存）
  WRITE_BEHIND = 'write_behind', // 写回（异步写入Redis）
  WRITE_AROUND = 'write_around', // 写绕过（只写Redis，不写内存）
}

/**
 * 缓存级别枚举
 */
export enum CacheLevel {
  L1 = 'L1', // 一级缓存（内存）
  L2 = 'L2', // 二级缓存（Redis）
  L3 = 'L3', // 三级缓存（数据库等）
}

/**
 * 缓存配置接口
 */
export interface CacheOptions {
  // 基础配置
  key?: string | ((args: any[]) => string); // 缓存键，支持函数动态生成
  ttl?: number; // 生存时间（秒）
  prefix?: string; // 键前缀

  // 策略配置
  strategy?: CacheStrategy; // 缓存策略
  level?: CacheLevel[]; // 缓存级别

  // 行为配置
  serialize?: boolean; // 是否序列化
  compress?: boolean; // 是否压缩
  refresh?: boolean; // 是否刷新缓存
  fallback?: boolean; // 是否启用降级

  // 条件配置
  condition?: (args: any[]) => boolean; // 缓存条件
  unless?: (result: any) => boolean; // 排除条件

  // 性能配置
  timeout?: number; // 超时时间（毫秒）
  retries?: number; // 重试次数

  // 监控配置
  metrics?: boolean; // 是否收集指标
  trace?: boolean; // 是否启用追踪
}

/**
 * 缓存元数据键
 */
export const CACHE_METADATA_KEY = 'cache:options';
export const CACHE_EVICT_METADATA_KEY = 'cache:evict';
export const CACHE_PUT_METADATA_KEY = 'cache:put';

/**
 * 缓存装饰器 - 用于方法级缓存
 *
 * @param options 缓存配置选项
 *
 * @example
 * ```typescript
 * @Cache({
 *   key: 'user:profile',
 *   ttl: 300,
 *   strategy: CacheStrategy.MEMORY_FIRST
 * })
 * async getUserProfile(userId: string) {
 *   return await this.userService.findById(userId);
 * }
 * ```
 */
export function Cache(options: CacheOptions = {}): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // 设置默认值
    const defaultOptions: CacheOptions = {
      ttl: 300, // 5分钟
      strategy: CacheStrategy.MEMORY_FIRST,
      level: [CacheLevel.L1, CacheLevel.L2],
      serialize: true,
      compress: false,
      refresh: false,
      fallback: true,
      timeout: 5000,
      retries: 3,
      metrics: true,
      trace: true,
      ...options,
    };

    // 如果没有指定key，使用类名和方法名生成
    if (!defaultOptions.key) {
      const className = target.constructor.name;
      const methodName = String(propertyKey);
      defaultOptions.key = `${className}:${methodName}`;
    }

    SetMetadata(CACHE_METADATA_KEY, defaultOptions)(target, propertyKey, descriptor);
    return descriptor;
  };
}

/**
 * 缓存清除装饰器 - 用于清除指定缓存
 *
 * @param options 清除配置选项
 *
 * @example
 * ```typescript
 * @CacheEvict({
 *   key: 'user:profile',
 *   allEntries: true
 * })
 * async updateUserProfile(userId: string, data: any) {
 *   return await this.userService.update(userId, data);
 * }
 * ```
 */
export function CacheEvict(
  options: {
    key?: string | ((args: any[]) => string);
    prefix?: string;
    pattern?: string;
    allEntries?: boolean;
    beforeInvocation?: boolean;
    condition?: (args: any[]) => boolean;
  } = {},
): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const defaultOptions = {
      allEntries: false,
      beforeInvocation: false,
      ...options,
    };

    SetMetadata(CACHE_EVICT_METADATA_KEY, defaultOptions)(target, propertyKey, descriptor);
    return descriptor;
  };
}

/**
 * 缓存更新装饰器 - 用于更新缓存内容
 *
 * @param options 更新配置选项
 *
 * @example
 * ```typescript
 * @CachePut({
 *   key: 'user:profile',
 *   ttl: 600
 * })
 * async refreshUserProfile(userId: string) {
 *   return await this.userService.findById(userId);
 * }
 * ```
 */
export function CachePut(options: CacheOptions = {}): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const defaultOptions: CacheOptions = {
      ttl: 300,
      strategy: CacheStrategy.WRITE_THROUGH,
      level: [CacheLevel.L1, CacheLevel.L2],
      serialize: true,
      refresh: true,
      ...options,
    };

    if (!defaultOptions.key) {
      const className = target.constructor.name;
      const methodName = String(propertyKey);
      defaultOptions.key = `${className}:${methodName}`;
    }

    SetMetadata(CACHE_PUT_METADATA_KEY, defaultOptions)(target, propertyKey, descriptor);
    return descriptor;
  };
}

/**
 * 用户相关缓存装饰器
 */
export function UserCache(options: Partial<CacheOptions> = {}): MethodDecorator {
  return Cache({
    prefix: 'user',
    ttl: 600, // 10分钟
    strategy: CacheStrategy.MEMORY_FIRST,
    ...options,
  });
}

/**
 * 产品相关缓存装饰器
 */
export function ProductCache(options: Partial<CacheOptions> = {}): MethodDecorator {
  return Cache({
    prefix: 'product',
    ttl: 1800, // 30分钟
    strategy: CacheStrategy.REDIS_FIRST,
    ...options,
  });
}

/**
 * 订单相关缓存装饰器
 */
export function OrderCache(options: Partial<CacheOptions> = {}): MethodDecorator {
  return Cache({
    prefix: 'order',
    ttl: 300, // 5分钟
    strategy: CacheStrategy.MEMORY_ONLY,
    ...options,
  });
}

/**
 * 配置相关缓存装饰器
 */
export function ConfigCache(options: Partial<CacheOptions> = {}): MethodDecorator {
  return Cache({
    prefix: 'config',
    ttl: 3600, // 1小时
    strategy: CacheStrategy.REDIS_ONLY,
    ...options,
  });
}

/**
 * 统计相关缓存装饰器
 */
export function StatsCache(options: Partial<CacheOptions> = {}): MethodDecorator {
  return Cache({
    prefix: 'stats',
    ttl: 60, // 1分钟
    strategy: CacheStrategy.WRITE_THROUGH,
    ...options,
  });
}

/**
 * 搜索相关缓存装饰器
 */
export function SearchCache(options: Partial<CacheOptions> = {}): MethodDecorator {
  return Cache({
    prefix: 'search',
    ttl: 900, // 15分钟
    strategy: CacheStrategy.REDIS_FIRST,
    compress: true,
    ...options,
  });
}

/**
 * 会话相关缓存装饰器
 */
export function SessionCache(options: Partial<CacheOptions> = {}): MethodDecorator {
  return Cache({
    prefix: 'session',
    ttl: 1800, // 30分钟
    strategy: CacheStrategy.REDIS_ONLY,
    ...options,
  });
}

/**
 * 权限相关缓存装饰器
 */
export function PermissionCache(options: Partial<CacheOptions> = {}): MethodDecorator {
  return Cache({
    prefix: 'permission',
    ttl: 3600, // 1小时
    strategy: CacheStrategy.MEMORY_FIRST,
    ...options,
  });
}

/**
 * 短期缓存装饰器（1分钟）
 */
export function ShortCache(options: Partial<CacheOptions> = {}): MethodDecorator {
  return Cache({
    ttl: 60,
    strategy: CacheStrategy.MEMORY_ONLY,
    ...options,
  });
}

/**
 * 中期缓存装饰器（15分钟）
 */
export function MediumCache(options: Partial<CacheOptions> = {}): MethodDecorator {
  return Cache({
    ttl: 900,
    strategy: CacheStrategy.MEMORY_FIRST,
    ...options,
  });
}

/**
 * 长期缓存装饰器（1小时）
 */
export function LongCache(options: Partial<CacheOptions> = {}): MethodDecorator {
  return Cache({
    ttl: 3600,
    strategy: CacheStrategy.REDIS_FIRST,
    ...options,
  });
}

/**
 * 永久缓存装饰器（24小时）
 */
export function PermanentCache(options: Partial<CacheOptions> = {}): MethodDecorator {
  return Cache({
    ttl: 86400,
    strategy: CacheStrategy.REDIS_ONLY,
    ...options,
  });
}

/**
 * 高频访问缓存装饰器
 */
export function HighFrequencyCache(options: Partial<CacheOptions> = {}): MethodDecorator {
  return Cache({
    ttl: 300,
    strategy: CacheStrategy.MEMORY_FIRST,
    compress: false,
    ...options,
  });
}

/**
 * 低频访问缓存装饰器
 */
export function LowFrequencyCache(options: Partial<CacheOptions> = {}): MethodDecorator {
  return Cache({
    ttl: 1800,
    strategy: CacheStrategy.REDIS_ONLY,
    compress: true,
    ...options,
  });
}

/**
 * 只读缓存装饰器
 */
export function ReadOnlyCache(options: Partial<CacheOptions> = {}): MethodDecorator {
  return Cache({
    ttl: 3600,
    strategy: CacheStrategy.REDIS_FIRST,
    refresh: false,
    ...options,
  });
}

/**
 * 写穿透缓存装饰器
 */
export function WriteThroughCache(options: Partial<CacheOptions> = {}): MethodDecorator {
  return Cache({
    strategy: CacheStrategy.WRITE_THROUGH,
    refresh: true,
    ...options,
  });
}

/**
 * 条件缓存装饰器
 */
export function ConditionalCache(
  condition: (args: any[]) => boolean,
  options: Partial<CacheOptions> = {},
): MethodDecorator {
  return Cache({
    condition,
    ...options,
  });
}

/**
 * 参数化缓存装饰器
 */
export function ParameterizedCache(
  keyGenerator: (args: any[]) => string,
  options: Partial<CacheOptions> = {},
): MethodDecorator {
  return Cache({
    key: keyGenerator,
    ...options,
  });
}

/**
 * 分页缓存装饰器
 */
export function PaginationCache(options: Partial<CacheOptions> = {}): MethodDecorator {
  return Cache({
    key: (args: any[]) => {
      const [page = 1, limit = 10, ...rest] = args;
      return `page:${page}:limit:${limit}:${JSON.stringify(rest)}`;
    },
    ttl: 300,
    strategy: CacheStrategy.REDIS_FIRST,
    ...options,
  });
}

/**
 * 聚合缓存装饰器
 */
export function AggregationCache(options: Partial<CacheOptions> = {}): MethodDecorator {
  return Cache({
    prefix: 'aggregation',
    ttl: 600,
    strategy: CacheStrategy.REDIS_ONLY,
    compress: true,
    ...options,
  });
}

/**
 * 实时缓存装饰器
 */
export function RealtimeCache(options: Partial<CacheOptions> = {}): MethodDecorator {
  return Cache({
    ttl: 30, // 30秒
    strategy: CacheStrategy.MEMORY_ONLY,
    refresh: true,
    ...options,
  });
}

/**
 * 缓存键生成工具函数
 */
export class CacheKeyGenerator {
  /**
   * 生成用户相关的缓存键
   */
  static user(userId: string, suffix?: string): string {
    return suffix ? `user:${userId}:${suffix}` : `user:${userId}`;
  }

  /**
   * 生成产品相关的缓存键
   */
  static product(productId: string, suffix?: string): string {
    return suffix ? `product:${productId}:${suffix}` : `product:${productId}`;
  }

  /**
   * 生成订单相关的缓存键
   */
  static order(orderId: string, suffix?: string): string {
    return suffix ? `order:${orderId}:${suffix}` : `order:${orderId}`;
  }

  /**
   * 生成分页缓存键
   */
  static pagination(prefix: string, page: number, limit: number, filters?: any): string {
    const filterStr = filters ? `:${JSON.stringify(filters)}` : '';
    return `${prefix}:page:${page}:limit:${limit}${filterStr}`;
  }

  /**
   * 生成搜索缓存键
   */
  static search(query: string, filters?: any): string {
    const filterStr = filters ? `:${JSON.stringify(filters)}` : '';
    return `search:${encodeURIComponent(query)}${filterStr}`;
  }

  /**
   * 生成统计缓存键
   */
  static stats(type: string, period: string, date?: string): string {
    const dateStr = date ? `:${date}` : '';
    return `stats:${type}:${period}${dateStr}`;
  }

  /**
   * 生成配置缓存键
   */
  static config(key: string, version?: string): string {
    const versionStr = version ? `:${version}` : '';
    return `config:${key}${versionStr}`;
  }

  /**
   * 生成会话缓存键
   */
  static session(sessionId: string, suffix?: string): string {
    return suffix ? `session:${sessionId}:${suffix}` : `session:${sessionId}`;
  }
}
