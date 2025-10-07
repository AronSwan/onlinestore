import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';
import { randomInt } from 'crypto';

/**
 * 增强缓存服务 - 防止缓存击穿、雪崩、穿透
 */
@Injectable()
export class EnhancedCacheService {
  private readonly logger = new Logger(EnhancedCacheService.name);
  private readonly localCache = new Map<string, { data: any; expiry: number }>();
  private readonly lockMap = new Map<string, Promise<any>>();

  constructor(private readonly cacheService: CacheService) {}

  /**
   * 获取缓存 - 带防击穿保护
   */
  async get<T>(
    key: string,
    fallback: () => Promise<T>,
    ttl: number = 3600,
    options: {
      enableLocalCache?: boolean;
      localCacheTtl?: number;
      preventPenetration?: boolean;
    } = {},
  ): Promise<T> {
    const { enableLocalCache = true, localCacheTtl = 60, preventPenetration = true } = options;

    // L1: 本地缓存检查
    if (enableLocalCache) {
      const localData = this.getFromLocalCache<T>(key);
      if (localData !== null) {
        return localData;
      }
    }

    // L2: Redis缓存检查
    try {
      const cachedData = await this.cacheService.get<T>('enhanced', key);
      if (cachedData !== null && cachedData !== undefined) {
        // 更新本地缓存
        if (enableLocalCache) {
          this.setToLocalCache(key, cachedData, localCacheTtl);
        }
        return cachedData;
      }
    } catch (error) {
      this.logger.warn(`Redis缓存获取失败: ${error.message}`);
    }

    // 防击穿：检查是否有正在执行的请求
    const lockKey = `lock:${key}`;
    if (this.lockMap.has(lockKey)) {
      this.logger.debug(`等待正在执行的请求: ${key}`);
      return await this.lockMap.get(lockKey);
    }

    // 创建锁并执行回调
    const promise = this.executeWithLock(key, fallback, ttl, {
      enableLocalCache,
      localCacheTtl,
      preventPenetration,
    });

    this.lockMap.set(lockKey, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.lockMap.delete(lockKey);
    }
  }

  /**
   * 带锁执行回调
   */
  private async executeWithLock<T>(
    key: string,
    fallback: () => Promise<T>,
    ttl: number,
    options: {
      enableLocalCache: boolean;
      localCacheTtl: number;
      preventPenetration: boolean;
    },
  ): Promise<T> {
    try {
      const data = await fallback();

      // 防穿透：即使是null/undefined也缓存（短时间）
      if (data === null || data === undefined) {
        if (options.preventPenetration) {
          const shortTtl = Math.min(ttl, 300); // 最多5分钟
          await this.setCache(key, data, shortTtl, options);
        }
        return data;
      }

      // 防雪崩：添加随机过期时间
      const randomTtl = ttl + randomInt(0, Math.floor(ttl * 0.1));
      await this.setCache(key, data, randomTtl, options);

      return data;
    } catch (error) {
      this.logger.error(`回调执行失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 设置缓存
   */
  private async setCache<T>(
    key: string,
    data: T,
    ttl: number,
    options: {
      enableLocalCache: boolean;
      localCacheTtl: number;
    },
  ): Promise<void> {
    // 设置Redis缓存
    try {
      await this.cacheService.set('enhanced', key, JSON.stringify(data), ttl);
    } catch (error) {
      this.logger.warn(`Redis缓存设置失败: ${error.message}`);
    }

    // 设置本地缓存
    if (options.enableLocalCache) {
      this.setToLocalCache(key, data, options.localCacheTtl);
    }
  }

  /**
   * 本地缓存获取
   */
  private getFromLocalCache<T>(key: string): T | null {
    const cached = this.localCache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.localCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 本地缓存设置
   */
  private setToLocalCache<T>(key: string, data: T, ttlSeconds: number): void {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.localCache.set(key, { data, expiry });

    // 限制本地缓存大小
    if (this.localCache.size > 1000) {
      const firstKey = this.localCache.keys().next().value;
      this.localCache.delete(firstKey);
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    this.localCache.delete(key);
    try {
      await this.cacheService.delete('enhanced', key);
    } catch (error) {
      this.logger.warn(`缓存删除失败: ${error.message}`);
    }
  }

  /**
   * 批量删除缓存
   */
  async deletePattern(pattern: string): Promise<void> {
    // 清理本地缓存中匹配的键
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.localCache.keys()) {
      if (regex.test(key)) {
        this.localCache.delete(key);
      }
    }

    // 清理Redis缓存
    try {
      // 这里需要根据实际的CacheService实现来调整
      // await this.cacheService.deletePattern(pattern);
    } catch (error) {
      this.logger.warn(`批量缓存删除失败: ${error.message}`);
    }
  }

  /**
   * 预热缓存
   */
  async warmup<T>(
    keys: Array<{ key: string; fallback: () => Promise<T>; ttl?: number }>,
  ): Promise<void> {
    this.logger.log(`开始预热缓存，共 ${keys.length} 个键`);

    const promises = keys.map(async ({ key, fallback, ttl = 3600 }) => {
      try {
        await this.get(key, fallback, ttl, { enableLocalCache: false });
        this.logger.debug(`缓存预热成功: ${key}`);
      } catch (error) {
        this.logger.warn(`缓存预热失败: ${key}, ${error.message}`);
      }
    });

    await Promise.allSettled(promises);
    this.logger.log('缓存预热完成');
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      localCacheSize: this.localCache.size,
      activeLocks: this.lockMap.size,
      timestamp: new Date().toISOString(),
    };
  }
}
