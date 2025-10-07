// 用途：多层缓存策略服务，提供L1内存缓存和L2 Redis缓存
// 依赖文件：Redis模块，监控服务
// 作者：后端开发团队
// 时间：2025-09-29 23:25:00

import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { MonitoringService } from '../monitoring/monitoring.service';
import { Logger } from 'winston';

// 缓存接口
interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

// L1 内存缓存提供者
class MemoryCacheProvider implements ICacheProvider {
  private cache = new Map<string, { value: any; expires: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // 每5分钟清理一次过期缓存
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  async set<T>(key: string, value: T, ttl = 300000): Promise<void> {
    const expires = Date.now() + ttl;
    this.cache.set(key, { value, expires });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.cache.forEach((item, key) => {
      if (now > item.expires) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });
  }

  onModuleDestroy() {
    clearInterval(this.cleanupInterval);
  }
}

// L2 Redis缓存提供者
class RedisCacheProvider implements ICacheProvider {
  constructor(
    private redis: Redis,
    private monitoring: MonitoringService,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;

      this.monitoring.incrementCacheHit('redis');
      return JSON.parse(value) as T;
    } catch (error) {
      this.monitoring.incrementCacheError('redis');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl = 3600): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.set(key, serialized, 'EX', ttl);
      this.monitoring.incrementCacheSet('redis');
    } catch (error) {
      this.monitoring.incrementCacheError('redis');
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.monitoring.incrementCacheDelete('redis');
    } catch (error) {
      this.monitoring.incrementCacheError('redis');
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.monitoring.incrementCacheError('redis');
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.monitoring.incrementCacheClear('redis');
    } catch (error) {
      this.monitoring.incrementCacheError('redis');
      throw error;
    }
  }
}

// 缓存配置接口
interface CacheConfig {
  l1Ttl: number; // L1缓存TTL（毫秒）
  l2Ttl: number; // L2缓存TTL（秒）
  enableL1: boolean;
  enableL2: boolean;
  enableCacheWarmer: boolean;
  cacheWarmerInterval: number;
}

@Injectable()
export class CacheStrategiesService implements OnModuleInit {
  private l1Cache: ICacheProvider;
  private l2Cache: ICacheProvider;
  private cacheWarmerInterval: NodeJS.Timeout;
  private readonly config: CacheConfig = {
    l1Ttl: 300000, // 5分钟
    l2Ttl: 3600, // 1小时
    enableL1: true,
    enableL2: true,
    enableCacheWarmer: true,
    cacheWarmerInterval: 10 * 60 * 1000, // 10分钟
  };

  constructor(
    @Inject('REDIS_CLIENT') private redis: Redis,
    private monitoring: MonitoringService,
    @Inject('WINSTON_LOGGER') private logger: Logger,
  ) {
    this.l1Cache = new MemoryCacheProvider();
    this.l2Cache = new RedisCacheProvider(redis, monitoring);
  }

  onModuleInit() {
    if (this.config.enableCacheWarmer) {
      this.startCacheWarmer();
    }
  }

  // 多级缓存获取
  async get<T>(key: string): Promise<T | null> {
    // 尝试从L1缓存获取
    if (this.config.enableL1) {
      const l1Value = await this.l1Cache.get<T>(key);
      if (l1Value) {
        this.monitoring.incrementCacheHit('l1');
        return l1Value;
      }
      this.monitoring.incrementCacheMiss('l1');
    }

    // 尝试从L2缓存获取
    if (this.config.enableL2) {
      const l2Value = await this.l2Cache.get<T>(key);
      if (l2Value) {
        this.monitoring.incrementCacheHit('l2');
        // 回填L1缓存
        if (this.config.enableL1) {
          await this.l1Cache.set(key, l2Value, this.config.l1Ttl);
        }
        return l2Value;
      }
      this.monitoring.incrementCacheMiss('l2');
    }

    return null;
  }

  // 多级缓存设置
  async set<T>(key: string, value: T, customTtl?: { l1?: number; l2?: number }): Promise<void> {
    // 设置L1缓存
    if (this.config.enableL1) {
      const l1Ttl = customTtl?.l1 || this.config.l1Ttl;
      await this.l1Cache.set(key, value, l1Ttl);
    }

    // 设置L2缓存
    if (this.config.enableL2) {
      const l2Ttl = customTtl?.l2 || this.config.l2Ttl;
      await this.l2Cache.set(key, value, l2Ttl);
    }
  }

  // 多级缓存删除
  async del(key: string): Promise<void> {
    if (this.config.enableL1) {
      await this.l1Cache.del(key);
    }
    if (this.config.enableL2) {
      await this.l2Cache.del(key);
    }
  }

  // 检查缓存是否存在
  async exists(key: string): Promise<boolean> {
    if (this.config.enableL1 && (await this.l1Cache.exists(key))) {
      return true;
    }
    if (this.config.enableL2 && (await this.l2Cache.exists(key))) {
      return true;
    }
    return false;
  }

  // 清空所有缓存
  async clear(): Promise<void> {
    if (this.config.enableL1) {
      await this.l1Cache.clear();
    }
    if (this.config.enableL2) {
      await this.l2Cache.clear();
    }
  }

  // 带有缓存击穿保护的获取
  async getWithBreakdownProtection<T>(
    key: string,
    fallback: () => Promise<T>,
    ttl?: { l1?: number; l2?: number },
  ): Promise<T> {
    // 尝试从缓存获取
    const cachedValue = await this.get<T>(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    // 缓存未命中，使用互斥锁防止缓存击穿
    const lockKey = `${key}:lock`;
    const lockValue = Date.now().toString();

    try {
      // 尝试获取锁
      const lockAcquired = await this.redis.set(lockKey, lockValue, 'EX', 30, 'NX');

      if (lockAcquired === 'OK') {
        // 获取到锁，执行数据加载
        try {
          const value = await fallback();
          await this.set(key, value, ttl);
          return value;
        } finally {
          // 释放锁
          await this.redis.del(lockKey);
        }
      } else {
        // 未获取到锁，等待并重试
        await new Promise(resolve => setTimeout(resolve, 100));
        const retryValue = await this.get<T>(key);
        if (retryValue !== null) {
          return retryValue;
        }
        // 重试后仍然没有值，直接执行fallback
        const value = await fallback();
        await this.set(key, value, ttl);
        return value;
      }
    } catch (error) {
      this.logger.error('Cache breakdown protection error:', error);
      // 出错时直接执行fallback
      const value = await fallback();
      await this.set(key, value, ttl);
      return value;
    }
  }

  // 缓存预热
  async warmUp(): Promise<void> {
    this.logger.info('Starting cache warm up...');

    // 预热热门产品缓存
    try {
      // 这里应该从数据库获取热门产品
      // 为了示例，我们使用模拟数据
      const hotProducts = [
        { id: 1, name: 'Product 1', price: 100 },
        { id: 2, name: 'Product 2', price: 200 },
      ];

      for (const product of hotProducts) {
        await this.set(`product:${product.id}`, product, {
          l1: this.config.l1Ttl,
          l2: this.config.l2Ttl,
        });
      }

      this.logger.info('Cache warm up completed');
    } catch (error) {
      this.logger.error('Cache warm up failed:', error);
    }
  }

  // 启动缓存预热器
  private startCacheWarmer(): void {
    this.cacheWarmerInterval = setInterval(() => this.warmUp(), this.config.cacheWarmerInterval);
  }

  // 获取缓存统计信息
  async getStats(): Promise<{
    l1Size: number;
    l2Keys: number;
    hitRate: number;
  }> {
    // 获取L2缓存中的键数量
    let l2Keys = 0;
    try {
      l2Keys = await this.redis.dbsize();
    } catch (error) {
      this.logger.error('Failed to get Redis DB size:', error);
    }

    return {
      l1Size: (this.l1Cache as any).cache?.size || 0,
      l2Keys,
      hitRate: await this.calculateHitRate(),
    };
  }

  // 计算缓存命中率
  private async calculateHitRate(): Promise<number> {
    // 这里应该从监控服务获取真实的命中率
    // 为了示例，返回模拟值
    return 0.85; // 85%命中率
  }

  onModuleDestroy() {
    if (this.cacheWarmerInterval) {
      clearInterval(this.cacheWarmerInterval);
    }
    if (this.l1Cache && typeof (this.l1Cache as any).onModuleDestroy === 'function') {
      (this.l1Cache as any).onModuleDestroy();
    }
  }
}
