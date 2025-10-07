import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, from } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { CacheService, CacheLevel, CacheStrategy } from './cache.service';
import {
  CACHE_KEY,
  CACHE_TTL,
  CACHE_STRATEGY,
  CACHE_LEVELS,
  CACHE_CONDITION,
  CACHE_SERIALIZER,
  CACHE_DESERIALIZER,
  CACHE_EVICT,
  CACHE_PUT,
  CACHE_INVALIDATE,
  CacheKeyGenerator,
  CacheCondition,
  CacheSerializer,
  CacheDeserializer,
  CacheEvictOptions,
  CachePutOptions,
  CacheInvalidateOptions,
  CacheTags,
} from './cache.decorators';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const handler = context.getHandler();
    const target = context.getClass();
    const methodName = handler.name;
    const args = context.getArgs();

    // 获取装饰器元数据
    const cacheKey = this.reflector.get<string | CacheKeyGenerator>(CACHE_KEY, handler);
    const cacheTTL = this.reflector.get<number>(CACHE_TTL, handler);
    const cacheStrategy = this.reflector.get<CacheStrategy>(CACHE_STRATEGY, handler);
    const cacheLevels = this.reflector.get<CacheLevel[]>(CACHE_LEVELS, handler);
    const cacheCondition = this.reflector.get<CacheCondition>(CACHE_CONDITION, handler);
    const cacheSerializer = this.reflector.get<CacheSerializer<any>>(CACHE_SERIALIZER, handler);
    const cacheDeserializer = this.reflector.get<CacheDeserializer<any>>(
      CACHE_DESERIALIZER,
      handler,
    );

    const cacheEvictOptions = this.reflector.get<CacheEvictOptions>(CACHE_EVICT, handler);
    const cachePutOptions = this.reflector.get<CachePutOptions>(CACHE_PUT, handler);
    const cacheInvalidateOptions = this.reflector.get<CacheInvalidateOptions>(
      CACHE_INVALIDATE,
      handler,
    );

    // 处理缓存清除（方法执行前）
    if (cacheEvictOptions?.beforeInvocation) {
      await this.handleCacheEvict(cacheEvictOptions, target, methodName, args);
    }

    // 处理缓存失效（方法执行前）
    if (cacheInvalidateOptions) {
      await this.handleCacheInvalidate(cacheInvalidateOptions, target, methodName, args);
    }

    // 如果有缓存键，尝试从缓存获取
    if (cacheKey) {
      const resolvedKey = this.resolveKey(cacheKey, target, methodName, args);

      // 检查缓存条件
      if (!cacheCondition || cacheCondition(target.prototype, methodName, args)) {
        try {
          const cachedResult = await this.cacheService.get(resolvedKey, {
            levels: cacheLevels,
            deserializer: cacheDeserializer,
          });

          if (cachedResult.hit) {
            this.logger.debug(`Cache hit for key: ${resolvedKey}`);
            return of(cachedResult.value);
          }
        } catch (error) {
          this.logger.warn(`Cache get error for key ${resolvedKey}:`, error);
        }
      }
    }

    // 执行原方法
    return next.handle().pipe(
      switchMap(async result => {
        // 处理缓存存储
        if (cacheKey) {
          const resolvedKey = this.resolveKey(cacheKey, target, methodName, args);

          // 检查缓存条件（包括结果）
          if (!cacheCondition || cacheCondition(target.prototype, methodName, args, result)) {
            try {
              await this.cacheService.set(resolvedKey, result, {
                ttl: cacheTTL,
                levels: cacheLevels,
                strategy: cacheStrategy,
                serializer: cacheSerializer,
              });
              this.logger.debug(`Cached result for key: ${resolvedKey}`);
            } catch (error) {
              this.logger.warn(`Cache set error for key ${resolvedKey}:`, error);
            }
          }
        }

        // 处理CachePut
        if (cachePutOptions) {
          await this.handleCachePut(cachePutOptions, target, methodName, args, result);
        }

        // 处理缓存清除（方法执行后）
        if (cacheEvictOptions && !cacheEvictOptions.beforeInvocation) {
          await this.handleCacheEvict(cacheEvictOptions, target, methodName, args, result);
        }

        return result;
      }),
      catchError(async error => {
        // 如果方法执行失败，也可能需要清除缓存
        if (cacheEvictOptions && !cacheEvictOptions.beforeInvocation) {
          try {
            await this.handleCacheEvict(cacheEvictOptions, target, methodName, args);
          } catch (evictError) {
            this.logger.warn('Cache evict error during exception handling:', evictError);
          }
        }
        throw error;
      }),
    );
  }

  /**
   * 解析缓存键
   */
  private resolveKey(
    key: string | CacheKeyGenerator,
    target: any,
    methodName: string,
    args: any[],
  ): string {
    if (typeof key === 'string') {
      return key;
    }

    if (typeof key === 'function') {
      return key(target.prototype, methodName, args);
    }

    // 默认键生成策略
    const className = target.name;
    const argsHash = this.hashArgs(args);
    return `${className}:${methodName}:${argsHash}`;
  }

  /**
   * 处理缓存清除
   */
  private async handleCacheEvict(
    options: CacheEvictOptions,
    target: any,
    methodName: string,
    args: any[],
    result?: any,
  ): Promise<void> {
    // 检查条件
    if (options.condition && !options.condition(target.prototype, methodName, args, result)) {
      return;
    }

    try {
      if (options.allEntries) {
        // 清空所有缓存
        await this.cacheService.clear({ levels: options.levels });
        this.logger.debug('Cleared all cache entries');
      } else if (options.pattern) {
        // 按模式清除
        await this.cacheService.deleteByPattern(options.pattern, { levels: options.levels });
        this.logger.debug(`Cleared cache entries matching pattern: ${options.pattern}`);
      } else if (options.key) {
        // 清除指定键
        const resolvedKey = this.resolveKey(options.key, target, methodName, args);
        await this.cacheService.delete(resolvedKey, { levels: options.levels });
        this.logger.debug(`Cleared cache entry: ${resolvedKey}`);
      }
    } catch (error) {
      this.logger.warn('Cache evict error:', error);
    }
  }

  /**
   * 处理缓存更新
   */
  private async handleCachePut(
    options: CachePutOptions,
    target: any,
    methodName: string,
    args: any[],
    result: any,
  ): Promise<void> {
    // 检查条件
    if (options.condition && !options.condition(target.prototype, methodName, args, result)) {
      return;
    }

    // 检查unless条件
    if (options.unless && options.unless(target.prototype, methodName, args, result)) {
      return;
    }

    if (!options.key) {
      return;
    }

    try {
      const resolvedKey = this.resolveKey(options.key, target, methodName, args);
      await this.cacheService.set(resolvedKey, result, {
        ttl: options.ttl,
        levels: options.levels,
        strategy: options.strategy,
        serializer: options.serializer,
      });
      this.logger.debug(`Updated cache entry: ${resolvedKey}`);
    } catch (error) {
      this.logger.warn('Cache put error:', error);
    }
  }

  /**
   * 处理缓存失效
   */
  private async handleCacheInvalidate(
    options: CacheInvalidateOptions,
    target: any,
    methodName: string,
    args: any[],
    result?: any,
  ): Promise<void> {
    // 检查条件
    if (options.condition && !options.condition(target.prototype, methodName, args, result)) {
      return;
    }

    try {
      // 按模式失效
      if (options.pattern) {
        await this.cacheService.deleteByPattern(options.pattern, { levels: options.levels });
        this.logger.debug(`Invalidated cache entries matching pattern: ${options.pattern}`);
      }

      // 按标签失效
      if (options.tags) {
        for (const tag of options.tags) {
          const keys = CacheTags.getKeysByTag(tag);
          for (const key of keys) {
            await this.cacheService.delete(key, { levels: options.levels });
          }
          CacheTags.removeTag(tag);
        }
        this.logger.debug(`Invalidated cache entries for tags: ${options.tags.join(', ')}`);
      }

      // 按键失效
      if (options.keys) {
        for (const key of options.keys) {
          const resolvedKey = this.resolveKey(key, target, methodName, args);
          await this.cacheService.delete(resolvedKey, { levels: options.levels });
        }
        this.logger.debug(`Invalidated cache entries for keys: ${options.keys.length} keys`);
      }
    } catch (error) {
      this.logger.warn('Cache invalidate error:', error);
    }
  }

  /**
   * 哈希参数数组
   */
  private hashArgs(args: any[]): string {
    try {
      const argsString = JSON.stringify(args);
      return this.simpleHash(argsString);
    } catch {
      return 'unhashable-args';
    }
  }

  /**
   * 简单哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }

    return Math.abs(hash).toString(36);
  }
}

/**
 * 缓存管理器 - 提供编程式缓存操作
 */
@Injectable()
export class CacheManager {
  private readonly logger = new Logger(CacheManager.name);

  constructor(private readonly cacheService: CacheService) {}

  /**
   * 手动缓存值
   */
  async cache<T>(
    key: string,
    value: T,
    ttl?: number,
    levels?: CacheLevel[],
    strategy?: CacheStrategy,
  ): Promise<void> {
    try {
      await this.cacheService.set(key, value, {
        ttl,
        levels,
        strategy,
      });
      this.logger.debug(`Manually cached value for key: ${key}`);
    } catch (error) {
      this.logger.warn(`Manual cache error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * 手动获取缓存值
   */
  async get<T>(key: string, levels?: CacheLevel[]): Promise<T | null> {
    try {
      const result = await this.cacheService.get<T>(key, { levels });
      return result.hit ? result.value : null;
    } catch (error) {
      this.logger.warn(`Manual cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * 手动删除缓存
   */
  async evict(key: string, levels?: CacheLevel[]): Promise<void> {
    try {
      await this.cacheService.delete(key, { levels });
      this.logger.debug(`Manually evicted cache for key: ${key}`);
    } catch (error) {
      this.logger.warn(`Manual cache evict error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * 按模式删除缓存
   */
  async evictByPattern(pattern: string, levels?: CacheLevel[]): Promise<void> {
    try {
      await this.cacheService.deleteByPattern(pattern, { levels });
      this.logger.debug(`Manually evicted cache entries matching pattern: ${pattern}`);
    } catch (error) {
      this.logger.warn(`Manual cache evict by pattern error for pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(levels?: CacheLevel[]): Promise<void> {
    try {
      await this.cacheService.clear({ levels });
      this.logger.debug('Manually cleared all cache entries');
    } catch (error) {
      this.logger.warn('Manual cache clear error:', error);
      throw error;
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<any> {
    try {
      return await this.cacheService.getStats();
    } catch (error) {
      this.logger.warn('Get cache stats error:', error);
      return null;
    }
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key: string, levels?: CacheLevel[]): Promise<boolean> {
    try {
      return await this.cacheService.exists(key, { levels });
    } catch (error) {
      this.logger.warn(`Cache exists check error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * 获取缓存大小
   */
  async size(levels?: CacheLevel[]): Promise<number> {
    try {
      return await this.cacheService.size({ levels });
    } catch (error) {
      this.logger.warn('Get cache size error:', error);
      return 0;
    }
  }

  /**
   * 批量操作
   */
  async batchGet<T>(keys: string[], levels?: CacheLevel[]): Promise<Map<string, T | null>> {
    try {
      const results = await this.cacheService.batchGet<T>(keys, { levels });
      const processedResults = new Map<string, T | null>();

      for (const [key, cacheResult] of Array.from(results.entries())) {
        processedResults.set(key, cacheResult.hit ? cacheResult.value : null);
      }

      return processedResults;
    } catch (error) {
      this.logger.warn('Batch get error:', error);
      return new Map();
    }
  }

  async batchSet<T>(
    entries: Map<string, T>,
    ttl?: number,
    levels?: CacheLevel[],
    strategy?: CacheStrategy,
  ): Promise<void> {
    try {
      await this.cacheService.batchSet(entries, {
        ttl,
        levels,
        strategy,
      });
      this.logger.debug(`Batch set ${entries.size} cache entries`);
    } catch (error) {
      this.logger.warn('Batch set error:', error);
      throw error;
    }
  }

  async batchDelete(keys: string[], levels?: CacheLevel[]): Promise<void> {
    try {
      await this.cacheService.batchDelete(keys, { levels });
      this.logger.debug(`Batch deleted ${keys.length} cache entries`);
    } catch (error) {
      this.logger.warn('Batch delete error:', error);
      throw error;
    }
  }

  /**
   * 缓存预热
   */
  async warmup<T>(
    key: string,
    valueProvider: () => Promise<T>,
    ttl?: number,
    levels?: CacheLevel[],
  ): Promise<T> {
    try {
      // 检查缓存是否存在
      const cached = await this.get<T>(key, levels);
      if (cached !== null) {
        return cached;
      }

      // 获取新值并缓存
      const value = await valueProvider();
      await this.cache(key, value, ttl, levels);
      return value;
    } catch (error) {
      this.logger.warn(`Cache warmup error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * 缓存刷新
   */
  async refresh<T>(
    key: string,
    valueProvider: () => Promise<T>,
    ttl?: number,
    levels?: CacheLevel[],
  ): Promise<T> {
    try {
      // 删除旧缓存
      await this.evict(key, levels);

      // 获取新值并缓存
      const value = await valueProvider();
      await this.cache(key, value, ttl, levels);
      return value;
    } catch (error) {
      this.logger.warn(`Cache refresh error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * 获取或设置缓存
   */
  async getOrSet<T>(
    key: string,
    valueProvider: () => Promise<T>,
    ttl?: number,
    levels?: CacheLevel[],
  ): Promise<T> {
    try {
      // 尝试获取缓存
      const cached = await this.get<T>(key, levels);
      if (cached !== null) {
        return cached;
      }

      // 获取新值并缓存
      const value = await valueProvider();
      await this.cache(key, value, ttl, levels);
      return value;
    } catch (error) {
      this.logger.warn(`Cache getOrSet error for key ${key}:`, error);
      throw error;
    }
  }
}

// 缓存工具类
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
   * 验证缓存键格式
   */
  static validateKey(key: string): boolean {
    return /^[a-zA-Z0-9:_-]+$/.test(key);
  }

  /**
   * 清理缓存键
   */
  static sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9:_-]/g, '_');
  }

  /**
   * 计算缓存大小（字节）
   */
  static calculateSize(value: any): number {
    try {
      return new Blob([JSON.stringify(value)]).size;
    } catch {
      return 0;
    }
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
   * 生成缓存标签
   */
  static generateTag(category: string, identifier: string): string {
    return `${category}:${identifier}`;
  }

  /**
   * 解析缓存标签
   */
  static parseTag(tag: string): { category: string; identifier: string } {
    const [category, identifier] = tag.split(':', 2);
    return { category, identifier };
  }
}
