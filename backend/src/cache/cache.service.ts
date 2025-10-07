// 用途：抽象缓存服务层，统一管理缓存策略
// 依赖文件：cache.module.ts, unified-master.config.ts
// 作者：后端开发团队
// 时间：2025-06-17 12:10:00

import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { MonitoringService } from '../monitoring/monitoring.service';

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
  tags?: string[];
}

@Injectable()
export class CacheService {
  private readonly keyPrefix: string;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
    private monitoring: MonitoringService,
  ) {
    this.keyPrefix = this.configService.get<string>('redis.keyPrefix') || 'caddy_shopping';
  }

  /**
   * 生成标准化的缓存键
   */
  private generateKey(module: string, resource: string, id?: string | number): string {
    const parts = [this.keyPrefix, module, resource];
    if (id) parts.push(id.toString());
    return parts.join(':');
  }

  /**
   * 获取缓存值
   */
  async get<T>(module: string, resource: string, id?: string | number): Promise<T | null> {
    const key = this.generateKey(module, resource, id);
    const start = process.hrtime.bigint();

    try {
      const value = await this.cacheManager.get<T>(key);
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1_000_000_000;

      this.monitoring.observeRedisDuration('get', duration);

      if (value !== null && value !== undefined) {
        this.monitoring.recordCacheHit(key);
        return value;
      }

      this.monitoring.recordCacheMiss(key);
      return null;
    } catch (error) {
      this.monitoring.incrementCacheError('get');
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  async set<T>(
    module: string,
    resource: string,
    value: T,
    id?: string | number,
    options: CacheOptions = {},
  ): Promise<void> {
    const key = this.generateKey(module, resource, id);
    const ttl = options.ttl || this.getDefaultTtl(resource);
    const start = process.hrtime.bigint();

    try {
      await this.cacheManager.set(key, value, ttl);
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1_000_000_000;

      this.monitoring.observeRedisDuration('set', duration);
      this.monitoring.incrementCacheSet(resource);
    } catch (error) {
      this.monitoring.incrementCacheError('set');
      console.error('Cache set error:', error);
    }
  }

  /**
   * 删除缓存
   */
  async delete(module: string, resource: string, id?: string | number): Promise<void> {
    const key = this.generateKey(module, resource, id);

    try {
      await this.cacheManager.del(key);
      this.monitoring.incrementCacheDelete(resource);
    } catch (error) {
      this.monitoring.incrementCacheError('delete');
      console.error('Cache delete error:', error);
    }
  }

  /**
   * 批量删除缓存（按模式）
   */
  async deleteByPattern(pattern: string): Promise<void> {
    // 注意：此功能依赖于 Redis 的 SCAN 命令
    // 在内存缓存中可能不支持
    try {
      // 这里可以实现基于模式的缓存清理
      // 实际实现需要根据缓存存储类型调整
      console.warn('Pattern-based deletion not fully implemented');
    } catch (error) {
      this.monitoring.incrementCacheError('delete_pattern');
      console.error('Cache delete pattern error:', error);
    }
  }

  /**
   * 获取默认TTL
   */
  private getDefaultTtl(resource: string): number {
    const cacheConfig = this.configService.get('cache.ttl') || {};

    switch (resource) {
      case 'product_detail':
        return cacheConfig.detail || 300; // 5分钟
      case 'popular_products':
        return cacheConfig.popular || 600; // 10分钟
      case 'product_list':
        return cacheConfig.list || 30; // 30秒
      default:
        return 300; // 默认5分钟
    }
  }

  /**
   * 缓存预热
   */
  async warmup(module: string, resource: string, data: any[]): Promise<void> {
    const promises = data.map((item, index) => this.set(module, resource, item, item.id || index));

    await Promise.allSettled(promises);
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    return {
      keyPrefix: this.keyPrefix,
      // 可以从监控服务获取更多统计信息
    };
  }
}
