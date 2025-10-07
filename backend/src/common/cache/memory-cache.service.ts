import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TracingService } from '../tracing/tracing.service';

/**
 * 缓存项接口
 */
interface CacheItem<T> {
  value: T;
  expireAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

/**
 * LRU缓存配置
 */
export interface LRUCacheConfig {
  maxSize: number; // 最大条目数
  maxMemory: number; // 最大内存使用量（字节）
  ttl: number; // 默认TTL（毫秒）
  checkPeriod: number; // 清理检查周期（毫秒）
}

/**
 * 内存缓存统计信息
 */
export interface MemoryCacheStats {
  size: number;
  maxSize: number;
  memoryUsage: number;
  maxMemory: number;
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  hitRate: number;
  memoryUsageRate: number;
}

/**
 * 内存缓存健康状态
 */
export interface MemoryCacheHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  memoryUsage: number;
  memoryUsageRate: number;
  size: number;
  sizeRate: number;
  avgAccessTime: number;
}

/**
 * 本地内存缓存服务
 * 提供高性能的本地缓存功能，支持LRU淘汰策略
 */
@Injectable()
export class MemoryCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MemoryCacheService.name);
  private readonly cache = new Map<string, CacheItem<any>>();
  private readonly accessOrder = new Map<string, number>(); // 访问顺序跟踪
  private accessCounter = 0;

  private readonly config: LRUCacheConfig;
  private readonly stats: MemoryCacheStats = {
    size: 0,
    maxSize: 0,
    memoryUsage: 0,
    maxMemory: 0,
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    hitRate: 0,
    memoryUsageRate: 0,
  };

  private cleanupTimer: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly tracingService: TracingService,
  ) {
    this.config = {
      maxSize: this.configService.get<number>('MEMORY_CACHE_MAX_SIZE', 10000),
      maxMemory: this.configService.get<number>('MEMORY_CACHE_MAX_MEMORY', 100 * 1024 * 1024), // 100MB
      ttl: this.configService.get<number>('MEMORY_CACHE_TTL', 5 * 60 * 1000), // 5分钟
      checkPeriod: this.configService.get<number>('MEMORY_CACHE_CHECK_PERIOD', 60 * 1000), // 1分钟
    };

    this.stats.maxSize = this.config.maxSize;
    this.stats.maxMemory = this.config.maxMemory;
  }

  async onModuleInit(): Promise<void> {
    this.startCleanupTimer();
    this.logger.log('✅ Memory cache service initialized successfully');
    this.logger.log(
      `📊 Cache config: maxSize=${this.config.maxSize}, maxMemory=${Math.round(this.config.maxMemory / 1024 / 1024)}MB, ttl=${this.config.ttl}ms`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.stopCleanupTimer();
    this.clear();
    this.logger.log('🔌 Memory cache service destroyed');
  }

  /**
   * 获取缓存值
   */
  get<T>(key: string): T | null {
    const traceId = this.tracingService.getTraceId();

    try {
      const item = this.cache.get(key);

      if (!item) {
        this.stats.misses++;
        this.updateHitRate();
        this.logger.debug(`[${traceId}] Memory cache miss for key: ${key}`);
        return null;
      }

      // 检查是否过期
      if (this.isExpired(item)) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        this.updateMemoryUsage();
        this.stats.misses++;
        this.updateHitRate();
        this.logger.debug(`[${traceId}] Memory cache expired for key: ${key}`);
        return null;
      }

      // 更新访问信息
      item.accessCount++;
      item.lastAccessed = Date.now();
      this.accessOrder.set(key, ++this.accessCounter);

      this.stats.hits++;
      this.updateHitRate();
      this.logger.debug(`[${traceId}] Memory cache hit for key: ${key}`);

      return item.value;
    } catch (error) {
      this.logger.error(`[${traceId}] Failed to get memory cache key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    const traceId = this.tracingService.generateTraceId();

    try {
      const size = this.calculateSize(value);
      const expireAt = Date.now() + (ttl || this.config.ttl);

      // 检查内存限制
      if (this.stats.memoryUsage + size > this.config.maxMemory) {
        this.evictByMemory(size);
      }

      // 检查大小限制
      if (this.cache.size >= this.config.maxSize) {
        this.evictBySize();
      }

      const item: CacheItem<T> = {
        value,
        expireAt,
        accessCount: 1,
        lastAccessed: Date.now(),
        size,
      };

      // 如果键已存在，先删除旧的
      if (this.cache.has(key)) {
        const oldItem = this.cache.get(key);
        this.stats.memoryUsage -= oldItem?.size || 0;
      }

      this.cache.set(key, item);
      this.accessOrder.set(key, ++this.accessCounter);
      this.stats.memoryUsage += size;
      this.stats.size = this.cache.size;
      this.stats.sets++;
      this.updateMemoryUsageRate();

      this.logger.debug(
        `[${traceId}] Memory cache set for key: ${key}, size: ${size}B, TTL: ${ttl || this.config.ttl}ms`,
      );
      return true;
    } catch (error) {
      this.logger.error(`[${traceId}] Failed to set memory cache key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * 删除缓存值
   */
  delete(key: string): boolean {
    const traceId = this.tracingService.generateTraceId();

    try {
      const item = this.cache.get(key);
      if (!item) {
        this.logger.debug(`[${traceId}] Memory cache key not found for deletion: ${key}`);
        return false;
      }

      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.stats.memoryUsage -= item.size;
      this.stats.size = this.cache.size;
      this.stats.deletes++;
      this.updateMemoryUsageRate();

      this.logger.debug(`[${traceId}] Memory cache deleted for key: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`[${traceId}] Failed to delete memory cache key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    if (this.isExpired(item)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.updateMemoryUsage();
      return false;
    }

    return true;
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    const traceId = this.tracingService.generateTraceId();

    try {
      this.cache.clear();
      this.accessOrder.clear();
      this.accessCounter = 0;
      this.stats.memoryUsage = 0;
      this.stats.size = 0;
      this.updateMemoryUsageRate();

      this.logger.warn(`[${traceId}] Memory cache cleared`);
    } catch (error) {
      this.logger.error(`[${traceId}] Failed to clear memory cache:`, error.message);
    }
  }

  /**
   * 获取所有键
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 批量获取
   */
  mget<T>(keys: string[]): (T | null)[] {
    return keys.map(key => this.get<T>(key));
  }

  /**
   * 批量设置
   */
  mset<T>(keyValuePairs: Record<string, T>, ttl?: number): boolean {
    try {
      for (const [key, value] of Object.entries(keyValuePairs)) {
        this.set(key, value, ttl);
      }
      return true;
    } catch (error) {
      this.logger.error('Failed to batch set memory cache:', error.message);
      return false;
    }
  }

  /**
   * 批量删除
   */
  mdel(keys: string[]): number {
    let deletedCount = 0;
    for (const key of keys) {
      if (this.delete(key)) {
        deletedCount++;
      }
    }
    return deletedCount;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): MemoryCacheStats {
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.sets = 0;
    this.stats.deletes = 0;
    this.stats.evictions = 0;
    this.stats.hitRate = 0;
    this.updateMemoryUsageRate();
  }

  /**
   * 获取缓存健康状态
   */
  getHealth(): MemoryCacheHealth {
    const memoryUsageRate = (this.stats.memoryUsage / this.config.maxMemory) * 100;
    const sizeRate = (this.cache.size / this.config.maxSize) * 100;

    // 计算平均访问时间（模拟）
    const avgAccessTime = this.calculateAverageAccessTime();

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (memoryUsageRate > 90 || sizeRate > 90) {
      status = 'unhealthy';
    } else if (memoryUsageRate > 75 || sizeRate > 75) {
      status = 'degraded';
    }

    return {
      status,
      memoryUsage: this.stats.memoryUsage,
      memoryUsageRate,
      size: this.cache.size,
      sizeRate,
      avgAccessTime,
    };
  }

  /**
   * 手动触发清理
   */
  cleanup(): number {
    const traceId = this.tracingService.generateTraceId();
    let cleanedCount = 0;

    try {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, item] of this.cache.entries()) {
        if (this.isExpired(item)) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        cleanedCount++;
      }

      this.updateMemoryUsage();
      this.logger.debug(
        `[${traceId}] Memory cache cleanup completed, removed ${cleanedCount} expired items`,
      );

      return cleanedCount;
    } catch (error) {
      this.logger.error(`[${traceId}] Failed to cleanup memory cache:`, error.message);
      return 0;
    }
  }

  /**
   * 检查项是否过期
   */
  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() > item.expireAt;
  }

  /**
   * 计算值的大小（字节）
   */
  private calculateSize(value: any): number {
    try {
      const jsonString = JSON.stringify(value);
      return Buffer.byteLength(jsonString, 'utf8');
    } catch {
      // 如果无法序列化，使用估算值
      return 1024; // 1KB 估算
    }
  }

  /**
   * 按内存使用量淘汰
   */
  private evictByMemory(requiredSize: number): void {
    const targetMemory = this.config.maxMemory - requiredSize;
    let evictedCount = 0;

    // 按访问顺序淘汰（LRU）
    const sortedEntries = Array.from(this.accessOrder.entries()).sort((a, b) => a[1] - b[1]); // 按访问顺序排序

    for (const [key] of sortedEntries) {
      if (this.stats.memoryUsage <= targetMemory) {
        break;
      }

      const item = this.cache.get(key);
      if (item) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        this.stats.memoryUsage -= item.size;
        evictedCount++;
      }
    }

    this.stats.evictions += evictedCount;
    this.stats.size = this.cache.size;
    this.updateMemoryUsageRate();

    if (evictedCount > 0) {
      this.logger.debug(`Memory cache evicted ${evictedCount} items due to memory pressure`);
    }
  }

  /**
   * 按大小淘汰
   */
  private evictBySize(): void {
    let evictedCount = 0;

    // 按访问顺序淘汰（LRU）
    const sortedEntries = Array.from(this.accessOrder.entries()).sort((a, b) => a[1] - b[1]); // 按访问顺序排序

    for (const [key] of sortedEntries) {
      if (this.cache.size < this.config.maxSize) {
        break;
      }

      const item = this.cache.get(key);
      if (item) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        this.stats.memoryUsage -= item.size;
        evictedCount++;
      }
    }

    this.stats.evictions += evictedCount;
    this.stats.size = this.cache.size;
    this.updateMemoryUsageRate();

    if (evictedCount > 0) {
      this.logger.debug(`Memory cache evicted ${evictedCount} items due to size limit`);
    }
  }

  /**
   * 更新内存使用情况
   */
  private updateMemoryUsage(): void {
    let totalMemory = 0;
    for (const item of this.cache.values()) {
      totalMemory += item.size;
    }
    this.stats.memoryUsage = totalMemory;
    this.stats.size = this.cache.size;
    this.updateMemoryUsageRate();
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const totalOperations = this.stats.hits + this.stats.misses;
    this.stats.hitRate = totalOperations > 0 ? (this.stats.hits / totalOperations) * 100 : 0;
  }

  /**
   * 更新内存使用率
   */
  private updateMemoryUsageRate(): void {
    this.stats.memoryUsageRate = (this.stats.memoryUsage / this.config.maxMemory) * 100;
  }

  /**
   * 计算平均访问时间
   */
  private calculateAverageAccessTime(): number {
    // 这里返回一个模拟值，实际应用中可以通过性能监控获取
    return 0.1; // 0.1ms
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.checkPeriod);
  }

  /**
   * 停止清理定时器
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null as any;
    }
  }

  /**
   * 定期清理过期项
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  private async scheduledCleanup(): Promise<void> {
    try {
      const cleaned = this.cleanup();
      if (cleaned > 0) {
        this.logger.debug(`Scheduled cleanup removed ${cleaned} expired items`);
      }
    } catch (error) {
      this.logger.error('Failed to perform scheduled cleanup:', error.message);
    }
  }

  /**
   * 定期记录统计信息
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  private async logStats(): Promise<void> {
    try {
      const stats = this.getStats();
      const health = this.getHealth();

      this.logger.debug('Memory cache stats:', {
        size: stats.size,
        memoryUsage: `${Math.round((stats.memoryUsage / 1024 / 1024) * 100) / 100}MB`,
        hitRate: `${Math.round(stats.hitRate * 100) / 100}%`,
        status: health.status,
      });
    } catch (error) {
      this.logger.error('Failed to log stats:', error.message);
    }
  }
}
