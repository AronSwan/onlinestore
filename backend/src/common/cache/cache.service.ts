import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis, { RedisOptions } from 'ioredis';
import { performance } from 'perf_hooks';

// 缓存策略枚举
export enum CacheStrategy {
  LRU = 'lru',
  TTL = 'ttl',
  LFU = 'lfu',
  FIFO = 'fifo',
  LAYERED = 'layered',
  WRITE_THROUGH = 'write_through',
  WRITE_BACK = 'write_back',
  WRITE_AROUND = 'write_around',
}

// 缓存级别枚举
export enum CacheLevel {
  L1 = 'l1', // 内存缓存
  L2 = 'l2', // Redis缓存
  L3 = 'l3', // 持久化缓存
}

// 缓存操作类型
export enum CacheOperation {
  GET = 'get',
  SET = 'set',
  DELETE = 'delete',
  CLEAR = 'clear',
  INVALIDATE = 'invalidate',
}

// 缓存配置接口
export interface CacheConfig {
  strategy: CacheStrategy;
  ttl: number; // 生存时间（秒）
  maxSize: number; // 最大缓存项数
  maxMemory: number; // 最大内存使用（字节）
  enableCompression: boolean;
  enableEncryption: boolean;
  enableMetrics: boolean;
  enableEvents: boolean;
  keyPrefix: string;
  namespace: string;
  serializer: 'json' | 'msgpack' | 'custom';
  layers: CacheLevel[];
}

// 缓存项接口
export interface CacheItem<T = any> {
  key: string;
  value: T;
  ttl: number;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  size: number;
  compressed: boolean;
  encrypted: boolean;
  metadata: Record<string, any>;
}

// 缓存结果接口
export interface CacheResult<T = any> {
  hit: boolean;
  value: T | null;
  key: string;
  level: CacheLevel | null;
  responseTime: number;
  metadata: {
    ttl: number;
    createdAt: Date;
    lastAccessed: Date;
    accessCount: number;
    size: number;
  };
}

// 缓存统计接口
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  totalSize: number;
  itemCount: number;
  averageResponseTime: number;
  memoryUsage: number;
  levelStats: Map<
    CacheLevel,
    {
      hits: number;
      misses: number;
      hitRate: number;
      size: number;
      itemCount: number;
    }
  >;
  operationStats: Map<
    CacheOperation,
    {
      count: number;
      totalTime: number;
      averageTime: number;
      errors: number;
    }
  >;
}

// 缓存事件接口
export interface CacheEvent {
  type: CacheOperation;
  key: string;
  level: CacheLevel;
  success: boolean;
  responseTime: number;
  size?: number;
  error?: string;
  metadata?: Record<string, any>;
}

// LRU缓存实现
class LRUCache<T = any> {
  private cache = new Map<string, CacheItem<T>>();
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;

  constructor(
    private maxSize: number,
    private defaultTtl: number,
  ) {}

  get(key: string): CacheItem<T> | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // 检查TTL
    if (this.isExpired(item)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return null;
    }

    // 更新访问信息
    item.lastAccessed = new Date();
    item.accessCount++;
    this.accessOrder.set(key, ++this.accessCounter);

    return item;
  }

  set(key: string, value: T, ttl?: number): void {
    const now = new Date();
    const item: CacheItem<T> = {
      key,
      value,
      ttl: ttl || this.defaultTtl,
      createdAt: now,
      lastAccessed: now,
      accessCount: 1,
      size: this.calculateSize(value),
      compressed: false,
      encrypted: false,
      metadata: {},
    };

    // 如果缓存已满，移除最少使用的项
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, item);
    this.accessOrder.set(key, ++this.accessCounter);
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.accessOrder.delete(key);
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  private isExpired(item: CacheItem<T>): boolean {
    if (item.ttl <= 0) return false; // 永不过期
    const now = Date.now();
    const expiry = item.createdAt.getTime() + item.ttl * 1000;
    return now > expiry;
  }

  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruAccess = Infinity;

    for (const [key, access] of Array.from(this.accessOrder.entries())) {
      if (access < lruAccess) {
        lruAccess = access;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.accessOrder.delete(lruKey);
    }
  }

  private calculateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2; // 粗略估算字节数
    } catch {
      return 0;
    }
  }
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private l1Cache: LRUCache;
  private config: CacheConfig;
  private stats: CacheStats;
  private isInitialized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeConfig();
    this.initializeStats();
    this.initializeL1Cache();
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.initializeRedis();
      this.isInitialized = true;
      this.logger.log('Cache service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize cache service', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.quit();
      }
      this.l1Cache.clear();
      this.logger.log('Cache service destroyed');
    } catch (error) {
      this.logger.error('Error during cache service destruction', error);
    }
  }

  // 获取缓存值
  async get<T = any>(
    key: string,
    options?: {
      levels?: CacheLevel[];
      deserializer?: (value: string) => T;
    },
  ): Promise<CacheResult<T>> {
    const startTime = performance.now();
    const fullKey = this.buildKey(key);
    const levels = options?.levels || this.config.layers;

    try {
      // 按层级顺序查找
      for (const level of levels) {
        const result = await this.getFromLevel<T>(fullKey, level, options?.deserializer);
        if (result.hit) {
          // 如果在较低层级找到，提升到较高层级
          await this.promoteToHigherLevels(fullKey, result.value, level, levels);

          const responseTime = performance.now() - startTime;
          this.updateStats(CacheOperation.GET, true, responseTime, level);
          this.emitEvent(CacheOperation.GET, fullKey, level, true, responseTime);

          return {
            ...result,
            responseTime,
          };
        }
      }

      // 缓存未命中
      const responseTime = performance.now() - startTime;
      this.updateStats(CacheOperation.GET, false, responseTime);
      this.emitEvent(CacheOperation.GET, fullKey, CacheLevel.L1, false, responseTime);

      return {
        hit: false,
        value: null,
        key: fullKey,
        level: null,
        responseTime,
        metadata: {
          ttl: 0,
          createdAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 0,
          size: 0,
        },
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.logger.error(`Cache get error for key ${fullKey}`, error);
      this.updateStats(CacheOperation.GET, false, responseTime, undefined, true);
      this.emitEvent(
        CacheOperation.GET,
        fullKey,
        CacheLevel.L1,
        false,
        responseTime,
        undefined,
        error.message,
      );

      return {
        hit: false,
        value: null,
        key: fullKey,
        level: null,
        responseTime,
        metadata: {
          ttl: 0,
          createdAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 0,
          size: 0,
        },
      };
    }
  }

  // 设置缓存值
  async set<T = any>(
    key: string,
    value: T,
    options?: {
      ttl?: number;
      levels?: CacheLevel[];
      strategy?: CacheStrategy;
      serializer?: (value: T) => string;
      metadata?: Record<string, any>;
    },
  ): Promise<boolean> {
    const startTime = performance.now();
    const fullKey = this.buildKey(key);
    const ttl = options?.ttl || this.config.ttl;
    const levels = options?.levels || this.config.layers;
    const strategy = options?.strategy || this.config.strategy;

    try {
      let success = true;

      // 根据策略决定写入方式
      switch (strategy) {
        case CacheStrategy.WRITE_THROUGH:
          // 同时写入所有层级
          for (const level of levels) {
            const levelSuccess = await this.setToLevel(
              fullKey,
              value,
              ttl,
              level,
              options?.serializer,
              options?.metadata,
            );
            success = success && levelSuccess;
          }
          break;

        case CacheStrategy.WRITE_BACK:
          // 只写入最高层级，延迟写入其他层级
          if (levels.length > 0) {
            success = await this.setToLevel(
              fullKey,
              value,
              ttl,
              levels[0],
              options?.serializer,
              options?.metadata,
            );
            // 异步写入其他层级
            this.writeBackToLowerLevels(
              fullKey,
              value,
              ttl,
              levels.slice(1),
              options?.serializer,
              options?.metadata,
            );
          }
          break;

        case CacheStrategy.WRITE_AROUND:
          // 跳过L1缓存，直接写入持久层
          const persistentLevels = levels.filter(level => level !== CacheLevel.L1);
          for (const level of persistentLevels) {
            const levelSuccess = await this.setToLevel(
              fullKey,
              value,
              ttl,
              level,
              options?.serializer,
              options?.metadata,
            );
            success = success && levelSuccess;
          }
          break;

        default:
          // 默认写入所有层级
          for (const level of levels) {
            const levelSuccess = await this.setToLevel(
              fullKey,
              value,
              ttl,
              level,
              options?.serializer,
              options?.metadata,
            );
            success = success && levelSuccess;
          }
      }

      const responseTime = performance.now() - startTime;
      const size = this.calculateSize(value);
      this.updateStats(CacheOperation.SET, success, responseTime, levels[0], false, size);
      this.emitEvent(CacheOperation.SET, fullKey, levels[0], success, responseTime, size);

      return success;
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.logger.error(`Cache set error for key ${fullKey}`, error);
      this.updateStats(CacheOperation.SET, false, responseTime, undefined, true);
      this.emitEvent(
        CacheOperation.SET,
        fullKey,
        CacheLevel.L1,
        false,
        responseTime,
        undefined,
        error.message,
      );
      return false;
    }
  }

  // 删除缓存
  async delete(
    key: string,
    options?: {
      levels?: CacheLevel[];
    },
  ): Promise<boolean> {
    const startTime = performance.now();
    const fullKey = this.buildKey(key);
    const levels = options?.levels || this.config.layers;

    try {
      let success = true;

      for (const level of levels) {
        const levelSuccess = await this.deleteFromLevel(fullKey, level);
        success = success && levelSuccess;
      }

      const responseTime = performance.now() - startTime;
      this.updateStats(CacheOperation.DELETE, success, responseTime);
      this.emitEvent(CacheOperation.DELETE, fullKey, levels[0], success, responseTime);

      return success;
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.logger.error(`Cache delete error for key ${fullKey}`, error);
      this.updateStats(CacheOperation.DELETE, false, responseTime, undefined, true);
      this.emitEvent(
        CacheOperation.DELETE,
        fullKey,
        CacheLevel.L1,
        false,
        responseTime,
        undefined,
        error.message,
      );
      return false;
    }
  }

  // 清空缓存
  async clear(options?: { levels?: CacheLevel[]; pattern?: string }): Promise<boolean> {
    const startTime = performance.now();
    const levels = options?.levels || this.config.layers;

    try {
      let success = true;

      for (const level of levels) {
        const levelSuccess = await this.clearLevel(level, options?.pattern);
        success = success && levelSuccess;
      }

      const responseTime = performance.now() - startTime;
      this.updateStats(CacheOperation.CLEAR, success, responseTime);
      this.emitEvent(
        CacheOperation.CLEAR,
        options?.pattern || '*',
        levels[0],
        success,
        responseTime,
      );

      return success;
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.logger.error('Cache clear error', error);
      this.updateStats(CacheOperation.CLEAR, false, responseTime, undefined, true);
      this.emitEvent(
        CacheOperation.CLEAR,
        '*',
        CacheLevel.L1,
        false,
        responseTime,
        undefined,
        error.message,
      );
      return false;
    }
  }

  // 批量获取
  async mget<T = any>(
    keys: string[],
    options?: {
      levels?: CacheLevel[];
      deserializer?: (value: string) => T;
    },
  ): Promise<Map<string, CacheResult<T>>> {
    const results = new Map<string, CacheResult<T>>();

    // 并行获取所有键
    const promises = keys.map(async key => {
      const result = await this.get<T>(key, options);
      return { key, result };
    });

    const resolvedResults = await Promise.all(promises);

    for (const { key, result } of resolvedResults) {
      results.set(key, result);
    }

    return results;
  }

  // 批量设置
  async mset<T = any>(
    entries: Map<string, T>,
    options?: {
      ttl?: number;
      levels?: CacheLevel[];
      strategy?: CacheStrategy;
      serializer?: (value: T) => string;
    },
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    // 并行设置所有键值对
    const promises = Array.from(entries.entries()).map(async ([key, value]) => {
      const success = await this.set(key, value, options);
      return { key, success };
    });

    const resolvedResults = await Promise.all(promises);

    for (const { key, success } of resolvedResults) {
      results.set(key, success);
    }

    return results;
  }

  // 检查键是否存在
  async exists(
    key: string,
    options?: {
      levels?: CacheLevel[];
    },
  ): Promise<boolean> {
    const result = await this.get(key, options);
    return result.hit;
  }

  // 获取缓存统计
  getStats(): CacheStats {
    return { ...this.stats };
  }

  // 重置统计
  resetStats(): void {
    this.initializeStats();
  }

  // 获取缓存键列表
  async getKeys(pattern?: string, level?: CacheLevel): Promise<string[]> {
    const targetLevel = level || CacheLevel.L1;

    try {
      switch (targetLevel) {
        case CacheLevel.L1:
          const l1Keys = this.l1Cache.keys();
          if (pattern) {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return l1Keys.filter(key => regex.test(key));
          }
          return l1Keys;

        case CacheLevel.L2:
          if (this.redis) {
            const searchPattern = pattern ? this.buildKey(pattern) : this.buildKey('*');
            return await this.redis.keys(searchPattern);
          }
          return [];

        default:
          return [];
      }
    } catch (error) {
      this.logger.error(`Error getting keys for level ${targetLevel}`, error);
      return [];
    }
  }

  // 获取缓存大小
  async getSize(level?: CacheLevel): Promise<number> {
    const targetLevel = level || CacheLevel.L1;

    try {
      switch (targetLevel) {
        case CacheLevel.L1:
          return this.l1Cache.size();

        case CacheLevel.L2:
          if (this.redis) {
            const keys = await this.redis.keys(this.buildKey('*'));
            return keys.length;
          }
          return 0;

        default:
          return 0;
      }
    } catch (error) {
      this.logger.error(`Error getting size for level ${targetLevel}`, error);
      return 0;
    }
  }

  /**
   * 根据模式删除缓存项
   */
  async deleteByPattern(
    pattern: string,
    options?: {
      levels?: CacheLevel[];
    },
  ): Promise<number> {
    const startTime = performance.now();
    const levels = options?.levels || this.config.layers;
    let deletedCount = 0;

    try {
      for (const level of levels) {
        switch (level) {
          case CacheLevel.L1:
            const l1Keys = this.l1Cache.keys();
            const l1MatchingKeys = l1Keys.filter(key => this.matchPattern(key, pattern));
            for (const key of l1MatchingKeys) {
              if (this.l1Cache.delete(key)) {
                deletedCount++;
              }
            }
            break;

          case CacheLevel.L2:
            if (this.redis) {
              const redisPattern = this.buildKey(pattern);
              const redisKeys = await this.redis.keys(redisPattern);
              if (redisKeys.length > 0) {
                const deleted = await this.redis.del(...redisKeys);
                deletedCount += deleted;
              }
            }
            break;

          case CacheLevel.L3:
            // L3 持久化缓存模式删除
            break;
        }
      }

      this.logger.debug(`Deleted ${deletedCount} cache entries matching pattern: ${pattern}`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to delete by pattern ${pattern}: ${error.message}`);
      return 0;
    } finally {
      const responseTime = performance.now() - startTime;
      this.updateStats(CacheOperation.DELETE, true, responseTime);
    }
  }

  /**
   * 获取缓存大小（别名方法）
   */
  async size(options?: { levels?: CacheLevel[] }): Promise<number> {
    if (options?.levels) {
      let totalSize = 0;
      for (const level of options.levels) {
        totalSize += await this.getSize(level);
      }
      return totalSize;
    }
    return this.getSize();
  }

  /**
   * 批量获取缓存项
   */
  async batchGet<T = any>(
    keys: string[],
    options?: {
      levels?: CacheLevel[];
      deserializer?: (value: string) => T;
    },
  ): Promise<Map<string, CacheResult<T>>> {
    const results = new Map<string, CacheResult<T>>();

    // 使用现有的 mget 方法
    return this.mget(keys, options);
  }

  /**
   * 批量设置缓存项
   */
  async batchSet<T = any>(
    entries: Map<string, T>,
    options?: {
      ttl?: number;
      levels?: CacheLevel[];
      strategy?: CacheStrategy;
      serializer?: (value: T) => string;
    },
  ): Promise<Map<string, boolean>> {
    // 使用现有的 mset 方法
    return this.mset(entries, options);
  }

  /**
   * 批量删除缓存项
   */
  async batchDelete(
    keys: string[],
    options?: {
      levels?: CacheLevel[];
    },
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const levels = options?.levels || this.config.layers;

    for (const key of keys) {
      try {
        const deleted = await this.delete(key, { levels });
        results.set(key, deleted);
      } catch (error) {
        this.logger.error(`Failed to delete key ${key}: ${error.message}`);
        results.set(key, false);
      }
    }

    return results;
  }

  /**
   * 模式匹配辅助方法
   */
  private matchPattern(key: string, pattern: string): boolean {
    // 简单的通配符匹配，支持 * 和 ?
    const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
  }

  // 私有方法：初始化配置
  private initializeConfig(): void {
    this.config = {
      strategy: this.configService.get<CacheStrategy>('CACHE_STRATEGY', CacheStrategy.LRU),
      ttl: this.configService.get<number>('CACHE_TTL', 3600),
      maxSize: this.configService.get<number>('CACHE_MAX_SIZE', 1000),
      maxMemory: this.configService.get<number>('CACHE_MAX_MEMORY', 100 * 1024 * 1024), // 100MB
      enableCompression: this.configService.get<boolean>('CACHE_ENABLE_COMPRESSION', false),
      enableEncryption: this.configService.get<boolean>('CACHE_ENABLE_ENCRYPTION', false),
      enableMetrics: this.configService.get<boolean>('CACHE_ENABLE_METRICS', true),
      enableEvents: this.configService.get<boolean>('CACHE_ENABLE_EVENTS', true),
      keyPrefix: this.configService.get<string>('CACHE_KEY_PREFIX', 'app:cache:'),
      namespace: this.configService.get<string>('CACHE_NAMESPACE', 'default'),
      serializer: this.configService.get<'json' | 'msgpack' | 'custom'>('CACHE_SERIALIZER', 'json'),
      layers: this.parseCacheLayers(),
    };
  }

  // 私有方法：解析缓存层级
  private parseCacheLayers(): CacheLevel[] {
    const layersConfig = this.configService.get<string>('CACHE_LAYERS', 'l1,l2');
    return layersConfig.split(',').map(layer => layer.trim() as CacheLevel);
  }

  // 私有方法：初始化统计
  private initializeStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      totalSize: 0,
      itemCount: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      levelStats: new Map(),
      operationStats: new Map(),
    };

    // 初始化层级统计
    for (const level of Object.values(CacheLevel)) {
      this.stats.levelStats.set(level, {
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0,
        itemCount: 0,
      });
    }

    // 初始化操作统计
    for (const operation of Object.values(CacheOperation)) {
      this.stats.operationStats.set(operation, {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        errors: 0,
      });
    }
  }

  // 私有方法：初始化L1缓存
  private initializeL1Cache(): void {
    this.l1Cache = new LRUCache(this.config.maxSize, this.config.ttl);
  }

  // 私有方法：初始化Redis
  private async initializeRedis(): Promise<void> {
    if (!this.config.layers.includes(CacheLevel.L2)) {
      return;
    }

    const redisConfig: RedisOptions = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    };

    this.redis = new Redis(redisConfig);

    this.redis.on('connect', () => {
      this.logger.log('Redis connected');
    });

    this.redis.on('error', error => {
      this.logger.error('Redis connection error', error);
    });

    await this.redis.connect();
  }

  // 私有方法：构建缓存键
  private buildKey(key: string): string {
    return `${this.config.keyPrefix}${this.config.namespace}:${key}`;
  }

  // 私有方法：从指定层级获取
  private async getFromLevel<T>(
    key: string,
    level: CacheLevel,
    deserializer?: (value: string) => T,
  ): Promise<CacheResult<T>> {
    switch (level) {
      case CacheLevel.L1:
        const l1Item = this.l1Cache.get(key);
        if (l1Item) {
          return {
            hit: true,
            value: l1Item.value,
            key,
            level,
            responseTime: 0,
            metadata: {
              ttl: l1Item.ttl,
              createdAt: l1Item.createdAt,
              lastAccessed: l1Item.lastAccessed,
              accessCount: l1Item.accessCount,
              size: l1Item.size,
            },
          };
        }
        break;

      case CacheLevel.L2:
        if (this.redis) {
          const value = await this.redis.get(key);
          if (value !== null) {
            const deserializedValue = deserializer ? deserializer(value) : JSON.parse(value);
            const ttl = await this.redis.ttl(key);
            return {
              hit: true,
              value: deserializedValue,
              key,
              level,
              responseTime: 0,
              metadata: {
                ttl,
                createdAt: new Date(),
                lastAccessed: new Date(),
                accessCount: 1,
                size: value.length,
              },
            };
          }
        }
        break;
    }

    return {
      hit: false,
      value: null,
      key,
      level: null,
      responseTime: 0,
      metadata: {
        ttl: 0,
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        size: 0,
      },
    };
  }

  // 私有方法：设置到指定层级
  private async setToLevel<T>(
    key: string,
    value: T,
    ttl: number,
    level: CacheLevel,
    serializer?: (value: T) => string,
    metadata?: Record<string, any>,
  ): Promise<boolean> {
    try {
      switch (level) {
        case CacheLevel.L1:
          this.l1Cache.set(key, value, ttl);
          return true;

        case CacheLevel.L2:
          if (this.redis) {
            const serializedValue = serializer ? serializer(value) : JSON.stringify(value);
            if (ttl > 0) {
              await this.redis.setex(key, ttl, serializedValue);
            } else {
              await this.redis.set(key, serializedValue);
            }
            return true;
          }
          break;
      }
      return false;
    } catch (error) {
      this.logger.error(`Error setting to level ${level}`, error);
      return false;
    }
  }

  // 私有方法：从指定层级删除
  private async deleteFromLevel(key: string, level: CacheLevel): Promise<boolean> {
    try {
      switch (level) {
        case CacheLevel.L1:
          return this.l1Cache.delete(key);

        case CacheLevel.L2:
          if (this.redis) {
            const result = await this.redis.del(key);
            return result > 0;
          }
          break;
      }
      return false;
    } catch (error) {
      this.logger.error(`Error deleting from level ${level}`, error);
      return false;
    }
  }

  // 私有方法：清空指定层级
  private async clearLevel(level: CacheLevel, pattern?: string): Promise<boolean> {
    try {
      switch (level) {
        case CacheLevel.L1:
          if (pattern) {
            const keys = this.l1Cache.keys();
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            for (const key of keys) {
              if (regex.test(key)) {
                this.l1Cache.delete(key);
              }
            }
          } else {
            this.l1Cache.clear();
          }
          return true;

        case CacheLevel.L2:
          if (this.redis) {
            const searchPattern = pattern ? this.buildKey(pattern) : this.buildKey('*');
            const keys = await this.redis.keys(searchPattern);
            if (keys.length > 0) {
              await this.redis.del(...keys);
            }
            return true;
          }
          break;
      }
      return false;
    } catch (error) {
      this.logger.error(`Error clearing level ${level}`, error);
      return false;
    }
  }

  // 私有方法：提升到更高层级
  private async promoteToHigherLevels<T>(
    key: string,
    value: T,
    currentLevel: CacheLevel,
    allLevels: CacheLevel[],
  ): Promise<void> {
    const currentIndex = allLevels.indexOf(currentLevel);
    if (currentIndex <= 0) return;

    const higherLevels = allLevels.slice(0, currentIndex);
    for (const level of higherLevels) {
      await this.setToLevel(key, value, this.config.ttl, level);
    }
  }

  // 私有方法：延迟写入较低层级
  private async writeBackToLowerLevels<T>(
    key: string,
    value: T,
    ttl: number,
    levels: CacheLevel[],
    serializer?: (value: T) => string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    // 异步执行，不阻塞主流程
    setImmediate(async () => {
      for (const level of levels) {
        await this.setToLevel(key, value, ttl, level, serializer, metadata);
      }
    });
  }

  // 私有方法：计算大小
  private calculateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 0;
    }
  }

  // 私有方法：更新统计
  private updateStats(
    operation: CacheOperation,
    success: boolean,
    responseTime: number,
    level?: CacheLevel,
    isError: boolean = false,
    size?: number,
  ): void {
    if (!this.config.enableMetrics) return;

    // 更新总体统计
    this.stats.totalRequests++;
    if (operation === CacheOperation.GET) {
      if (success) {
        this.stats.hits++;
      } else {
        this.stats.misses++;
      }
      this.stats.hitRate = this.stats.hits / (this.stats.hits + this.stats.misses);
    }

    // 更新层级统计
    if (level) {
      const levelStats = this.stats.levelStats.get(level);
      if (levelStats) {
        if (operation === CacheOperation.GET) {
          if (success) {
            levelStats.hits++;
          } else {
            levelStats.misses++;
          }
          levelStats.hitRate = levelStats.hits / (levelStats.hits + levelStats.misses);
        }
        if (size) {
          levelStats.size += size;
        }
      }
    }

    // 更新操作统计
    const operationStats = this.stats.operationStats.get(operation);
    if (operationStats) {
      operationStats.count++;
      operationStats.totalTime += responseTime;
      operationStats.averageTime = operationStats.totalTime / operationStats.count;
      if (isError) {
        operationStats.errors++;
      }
    }

    // 更新平均响应时间
    const totalOperations = Array.from(this.stats.operationStats.values()).reduce(
      (sum, stats) => sum + stats.count,
      0,
    );
    const totalTime = Array.from(this.stats.operationStats.values()).reduce(
      (sum, stats) => sum + stats.totalTime,
      0,
    );
    this.stats.averageResponseTime = totalOperations > 0 ? totalTime / totalOperations : 0;
  }

  // 私有方法：发送事件
  private emitEvent(
    type: CacheOperation,
    key: string,
    level: CacheLevel,
    success: boolean,
    responseTime: number,
    size?: number,
    error?: string,
  ): void {
    if (!this.config.enableEvents) return;

    const event: CacheEvent = {
      type,
      key,
      level,
      success,
      responseTime,
      size,
      error,
      metadata: {
        timestamp: new Date(),
        namespace: this.config.namespace,
      },
    };

    this.eventEmitter.emit('cache.operation', event);
  }
}
