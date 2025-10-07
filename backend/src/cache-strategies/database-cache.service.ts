// 用途：数据库查询缓存服务，提供查询结果和实体级缓存
// 依赖文件：CacheStrategiesService, 监控服务
// 作者：后端开发团队
// 时间：2025-09-29 23:35:00

import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { MonitoringService } from '../monitoring/monitoring.service';
import { Logger } from 'winston';
import { CacheStrategiesService } from './cache-strategies.service';

// 数据库缓存配置接口
interface DatabaseCacheConfig {
  enabled: boolean;
  queryCache: {
    enabled: boolean;
    defaultTTL: number;
    maxSize: number;
    excludePatterns: string[];
  };
  entityCache: {
    enabled: boolean;
    defaultTTL: number;
    autoInvalidate: boolean;
    entities: string[];
  };
  statistics: {
    enabled: boolean;
    interval: number;
  };
}

// 查询缓存键
interface QueryCacheKey {
  sql: string;
  parameters: any[];
  hash: string;
}

// 实体缓存键
interface EntityCacheKey {
  entity: string;
  id: string | number;
  hash: string;
}

// 缓存统计信息
interface CacheStatistics {
  queryHits: number;
  queryMisses: number;
  entityHits: number;
  entityMisses: number;
  invalidations: number;
  size: number;
  hitRate: number;
}

@Injectable()
export class DatabaseCacheService implements OnModuleInit {
  private readonly config: DatabaseCacheConfig;
  private statistics: CacheStatistics;
  private statsInterval: NodeJS.Timeout;
  private queryCache = new Map<string, { result: any; timestamp: number; ttl: number }>();
  private entityCache = new Map<string, { entity: any; timestamp: number; ttl: number }>();

  constructor(
    @Inject('REDIS_CLIENT') private redis: Redis,
    private monitoring: MonitoringService,
    private cacheStrategies: CacheStrategiesService,
    @Inject('WINSTON_LOGGER') private logger: Logger,
  ) {
    this.config = {
      enabled: true,
      queryCache: {
        enabled: true,
        defaultTTL: 300, // 5分钟
        maxSize: 1000,
        excludePatterns: ['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TRUNCATE'],
      },
      entityCache: {
        enabled: true,
        defaultTTL: 600, // 10分钟
        autoInvalidate: true,
        entities: ['User', 'Product', 'Order', 'Category', 'OrderItem'],
      },
      statistics: {
        enabled: true,
        interval: 60000, // 1分钟
      },
    };

    this.statistics = {
      queryHits: 0,
      queryMisses: 0,
      entityHits: 0,
      entityMisses: 0,
      invalidations: 0,
      size: 0,
      hitRate: 0,
    };
  }

  onModuleInit() {
    if (this.config.statistics.enabled) {
      this.startStatisticsCollection();
    }
  }

  // 查询缓存方法
  async getQueryResult<T>(sql: string, parameters: any[] = []): Promise<T | null> {
    if (!this.config.enabled || !this.config.queryCache.enabled) {
      return null;
    }

    // 检查是否应该缓存此查询
    if (this.shouldExcludeQuery(sql)) {
      return null;
    }

    const cacheKey = this.generateQueryCacheKey(sql, parameters);

    // 首先检查内存缓存
    const memoryCached = this.queryCache.get(cacheKey.hash);
    if (memoryCached && Date.now() < memoryCached.timestamp + memoryCached.ttl * 1000) {
      this.statistics.queryHits++;
      this.monitoring.incrementCacheHit('db_query');
      return memoryCached.result as T;
    }

    // 检查Redis缓存
    const redisCached = await this.cacheStrategies.get<T>(`db:query:${cacheKey.hash}`);
    if (redisCached !== null) {
      this.statistics.queryHits++;
      this.monitoring.incrementCacheHit('db_query');
      // 回填内存缓存
      this.queryCache.set(cacheKey.hash, {
        result: redisCached,
        timestamp: Date.now(),
        ttl: this.config.queryCache.defaultTTL,
      });
      return redisCached;
    }

    this.statistics.queryMisses++;
    this.monitoring.incrementCacheMiss('db_query');
    return null;
  }

  // 设置查询缓存
  async setQueryResult<T>(sql: string, parameters: any[], result: T, ttl?: number): Promise<void> {
    if (!this.config.enabled || !this.config.queryCache.enabled) {
      return;
    }

    if (this.shouldExcludeQuery(sql)) {
      return;
    }

    const cacheKey = this.generateQueryCacheKey(sql, parameters);
    const finalTTL = ttl || this.config.queryCache.defaultTTL;

    // 设置内存缓存
    this.queryCache.set(cacheKey.hash, {
      result,
      timestamp: Date.now(),
      ttl: finalTTL,
    });

    // 清理过期的内存缓存
    this.cleanupMemoryCache();

    // 设置Redis缓存
    await this.cacheStrategies.set(`db:query:${cacheKey.hash}`, result, {
      l2: finalTTL,
    });

    this.monitoring.incrementCacheSet('db_query');
  }

  // 实体缓存方法
  async getEntity<T>(entityName: string, id: string | number): Promise<T | null> {
    if (!this.config.enabled || !this.config.entityCache.enabled) {
      return null;
    }

    if (!this.config.entityCache.entities.includes(entityName)) {
      return null;
    }

    const cacheKey = this.generateEntityCacheKey(entityName, id);

    // 检查内存缓存
    const memoryCached = this.entityCache.get(cacheKey.hash);
    if (memoryCached && Date.now() < memoryCached.timestamp + memoryCached.ttl * 1000) {
      this.statistics.entityHits++;
      this.monitoring.incrementCacheHit('db_entity');
      return memoryCached.entity as T;
    }

    // 检查Redis缓存
    const redisCached = await this.cacheStrategies.get<T>(`db:entity:${cacheKey.hash}`);
    if (redisCached !== null) {
      this.statistics.entityHits++;
      this.monitoring.incrementCacheHit('db_entity');
      // 回填内存缓存
      this.entityCache.set(cacheKey.hash, {
        entity: redisCached,
        timestamp: Date.now(),
        ttl: this.config.entityCache.defaultTTL,
      });
      return redisCached;
    }

    this.statistics.entityMisses++;
    this.monitoring.incrementCacheMiss('db_entity');
    return null;
  }

  // 设置实体缓存
  async setEntity<T>(
    entityName: string,
    id: string | number,
    entity: T,
    ttl?: number,
  ): Promise<void> {
    if (!this.config.enabled || !this.config.entityCache.enabled) {
      return;
    }

    if (!this.config.entityCache.entities.includes(entityName)) {
      return;
    }

    const cacheKey = this.generateEntityCacheKey(entityName, id);
    const finalTTL = ttl || this.config.entityCache.defaultTTL;

    // 设置内存缓存
    this.entityCache.set(cacheKey.hash, {
      entity,
      timestamp: Date.now(),
      ttl: finalTTL,
    });

    // 设置Redis缓存
    await this.cacheStrategies.set(`db:entity:${cacheKey.hash}`, entity, {
      l2: finalTTL,
    });

    this.monitoring.incrementCacheSet('db_entity');
  }

  // 失效实体缓存
  async invalidateEntity(entityName: string, id: string | number): Promise<void> {
    if (!this.config.enabled || !this.config.entityCache.enabled) {
      return;
    }

    const cacheKey = this.generateEntityCacheKey(entityName, id);

    // 删除内存缓存
    this.entityCache.delete(cacheKey.hash);

    // 删除Redis缓存
    await this.cacheStrategies.del(`db:entity:${cacheKey.hash}`);

    this.statistics.invalidations++;
    this.monitoring.incrementCacheDelete('db_entity');
  }

  // 失效查询缓存（基于模式）
  async invalidateQueryCache(pattern: string): Promise<void> {
    if (!this.config.enabled || !this.config.queryCache.enabled) {
      return;
    }

    // 删除匹配的内存缓存
    const keysToDelete: string[] = [];
    this.queryCache.forEach((value, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });

    // 实际删除操作
    keysToDelete.forEach(key => {
      this.queryCache.delete(key);
    });

    // 在实际应用中，这里应该使用Redis的SCAN命令来删除匹配的键
    // 为了简化，我们只删除内存缓存
    this.statistics.invalidations++;
  }

  // 获取缓存统计信息
  async getStatistics(): Promise<CacheStatistics> {
    const totalRequests =
      this.statistics.queryHits +
      this.statistics.queryMisses +
      this.statistics.entityHits +
      this.statistics.entityMisses;

    return {
      ...this.statistics,
      size: this.queryCache.size + this.entityCache.size,
      hitRate:
        totalRequests > 0
          ? (this.statistics.queryHits + this.statistics.entityHits) / totalRequests
          : 0,
    };
  }

  // 清空所有缓存
  async clear(): Promise<void> {
    this.queryCache.clear();
    this.entityCache.clear();

    // 清空Redis中的数据库缓存
    const keys = await this.redis.keys('db:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }

    this.statistics = {
      queryHits: 0,
      queryMisses: 0,
      entityHits: 0,
      entityMisses: 0,
      invalidations: 0,
      size: 0,
      hitRate: 0,
    };

    this.monitoring.incrementCacheClear('db_cache');
  }

  // 生成查询缓存键
  private generateQueryCacheKey(sql: string, parameters: any[]): QueryCacheKey {
    const normalizedSql = sql.trim().toLowerCase();
    const paramString = JSON.stringify(parameters || []);
    const hash = this.hash(`${normalizedSql}:${paramString}`);

    return {
      sql: normalizedSql,
      parameters,
      hash,
    };
  }

  // 生成实体缓存键
  private generateEntityCacheKey(entityName: string, id: string | number): EntityCacheKey {
    const hash = this.hash(`${entityName}:${id}`);

    return {
      entity: entityName,
      id,
      hash,
    };
  }

  // 检查是否应该排除查询
  private shouldExcludeQuery(sql: string): boolean {
    const upperSql = sql.trim().toUpperCase();
    return this.config.queryCache.excludePatterns.some(pattern => upperSql.includes(pattern));
  }

  // 清理过期的内存缓存
  private cleanupMemoryCache(): void {
    const now = Date.now();

    // 清理查询缓存
    const queryKeysToDelete: string[] = [];
    this.queryCache.forEach((value, key) => {
      if (now > value.timestamp + value.ttl * 1000) {
        queryKeysToDelete.push(key);
      }
    });

    queryKeysToDelete.forEach(key => {
      this.queryCache.delete(key);
    });

    // 清理实体缓存
    const entityKeysToDelete: string[] = [];
    this.entityCache.forEach((value, key) => {
      if (now > value.timestamp + value.ttl * 1000) {
        entityKeysToDelete.push(key);
      }
    });

    entityKeysToDelete.forEach(key => {
      this.entityCache.delete(key);
    });
  }

  // 启动统计信息收集
  private startStatisticsCollection(): void {
    this.statsInterval = setInterval(async () => {
      try {
        const stats = await this.getStatistics();

        // 记录到监控系统
        this.monitoring.incrementCacheSet('db_cache_stats');

        // 记录日志
        this.logger.info('Database Cache Statistics', {
          queryHitRate: stats.queryHits / (stats.queryHits + stats.queryMisses) || 0,
          entityHitRate: stats.entityHits / (stats.entityHits + stats.entityMisses) || 0,
          totalHitRate: stats.hitRate,
          cacheSize: stats.size,
          invalidations: stats.invalidations,
        });
      } catch (error) {
        this.logger.error('Failed to collect database cache statistics:', error);
      }
    }, this.config.statistics.interval);
  }

  // 简单的哈希函数
  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  onModuleDestroy() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
  }
}
