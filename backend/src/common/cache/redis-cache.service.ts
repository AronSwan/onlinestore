import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import Redis, { RedisOptions, Cluster } from 'ioredis';
import { TracingService } from '../tracing/tracing.service';

/**
 * 缓存操作类型
 */
export enum CacheOperationType {
  GET = 'GET',
  SET = 'SET',
  DELETE = 'DELETE',
  EXISTS = 'EXISTS',
  EXPIRE = 'EXPIRE',
  INCR = 'INCR',
  DECR = 'DECR',
}

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  ttl: number; // 生存时间（秒）
  prefix?: string; // 键前缀
  compress?: boolean; // 是否压缩
  serialize?: boolean; // 是否序列化
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
  totalOperations: number;
}

/**
 * 缓存健康状态
 */
export interface CacheHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  memoryUsage: number;
  connectedClients: number;
  uptime: number;
  version: string;
}

/**
 * Redis缓存服务
 * 提供高性能的分布式缓存功能
 */
@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private redis: Redis | Cluster;
  private readonly stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    hitRate: 0,
    totalOperations: 0,
  };

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly tracingService: TracingService,
  ) {}

  async onModuleInit(): Promise<void> {
    const enabledRaw = this.configService.get<string>('REDIS_ENABLED', 'true');
    const enabled =
      typeof enabledRaw === 'string'
        ? ['true', '1', 'yes', 'on'].includes(enabledRaw.toLowerCase())
        : !!enabledRaw;

    if (!enabled) {
      this.logger.warn('Redis已禁用，使用No-Op Stub客户端以保障服务可用');
      this.redis = this.createStubClient() as any;
      return;
    }

    await this.initializeRedis();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  /**
   * 初始化Redis连接
   */
  private async initializeRedis(): Promise<void> {
    try {
      const isDev = process.env.NODE_ENV === 'development';
      const isCluster = this.configService.get<boolean>('REDIS_CLUSTER_ENABLED', false);

      if (isCluster) {
        await this.initializeCluster();
      } else {
        await this.initializeSingle();
      }

      this.setupEventHandlers();
      this.logger.log('✅ Redis cache service initialized successfully');
    } catch (error) {
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev) {
        this.logger.warn(
          '⚠️ Failed to initialize Redis cache service in development mode, continuing without it',
        );
        // 创建一个空的 Redis 客户端，避免运行时错误
        this.redis = {
          get: async () => null,
          set: async () => 'OK',
          del: async () => 0,
          exists: async () => 0,
          expire: async () => 0,
          ttl: async () => -1,
          incrby: async () => 0,
          decrby: async () => 0,
          mget: async () => [],
          mset: async () => 'OK',
          pipeline: () => ({
            set: () => ({ pipeline: () => ({ exec: async () => [] }) }),
            setex: () => ({ pipeline: () => ({ exec: async () => [] }) }),
            exec: async () => [],
          }),
          keys: async () => [],
          info: async () => 'redis_version:6.0.0',
          quit: async () => {},
          on: () => {},
        } as any;
      } else {
        this.logger.error('❌ Failed to initialize Redis cache service:', error.message);
        throw error;
      }
    }
  }

  /**
   * 初始化单实例Redis
   */
  private async initializeSingle(): Promise<void> {
    const options: RedisOptions = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
      maxRetriesPerRequest: this.configService.get<number>('REDIS_MAX_RETRIES', 3),
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: this.configService.get<number>('REDIS_CONNECT_TIMEOUT', 10000),
      commandTimeout: this.configService.get<number>('REDIS_COMMAND_TIMEOUT', 5000),
      keyPrefix: this.configService.get<string>('REDIS_KEY_PREFIX', 'caddy:'),
    };

    this.redis = new Redis(options);
    await this.redis.connect();
    this.logger.log('🔗 Connected to Redis single instance');
  }

  /**
   * 创建一个最小可用的Stub客户端，在禁用Redis时使用
   */
  private createStubClient(): any {
    const store = new Map<string, string>();
    const ttlMap = new Map<string, NodeJS.Timeout>();
    return {
      async get(key: string) {
        return store.has(key) ? store.get(key)! : null;
      },
      async set(key: string, value: string) {
        if (ttlMap.has(key)) {
          clearTimeout(ttlMap.get(key)!);
          ttlMap.delete(key);
        }
        store.set(key, value);
        return 'OK';
      },
      async del(key: string) {
        return store.delete(key) ? 1 : 0;
      },
      async exists(key: string) {
        return store.has(key) ? 1 : 0;
      },
      async expire(key: string, ttl: number) {
        if (!store.has(key)) return 0;
        if (ttlMap.has(key)) {
          clearTimeout(ttlMap.get(key)!);
          ttlMap.delete(key);
        }
        const timer = setTimeout(() => {
          store.delete(key);
          ttlMap.delete(key);
        }, ttl * 1000);
        ttlMap.set(key, timer);
        return 1;
      },
      async ttl(_key: string) {
        return -1;
      },
      async mget(...keys: string[]) {
        return keys.map(k => (store.has(k) ? store.get(k)! : null));
      },
      async mset(..._args: any[]) {
        return 'OK';
      },
      async ping() {
        return 'PONG';
      },
      async quit() {
        /* noop */
      },
      on() {
        /* noop */
      },
      async connect() {
        /* noop */
      },
      pipeline: () => ({
        set: (_key: string, _value: string) => ({ pipeline: () => ({ exec: async () => [] }) }),
        setex: (_key: string, _ttl: number, _value: string) => ({
          pipeline: () => ({ exec: async () => [] }),
        }),
        exec: async () => [],
      }),
    };
  }

  /**
   * 初始化Redis集群
   */
  private async initializeCluster(): Promise<void> {
    const nodes = this.configService
      .get<string>('REDIS_CLUSTER_NODES', 'localhost:6379')
      .split(',')
      .map(node => {
        const [host, port] = node.trim().split(':');
        return { host, port: parseInt(port, 10) };
      });

    const options = {
      redisOptions: {
        password: this.configService.get<string>('REDIS_PASSWORD'),
        keyPrefix: this.configService.get<string>('REDIS_KEY_PREFIX', 'caddy:'),
      },
      maxRetriesPerRequest: this.configService.get<number>('REDIS_MAX_RETRIES', 3),
    };

    this.redis = new Redis.Cluster(nodes, options);
    this.logger.log('🔗 Connected to Redis cluster');
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.logger.log('📡 Redis connected');
    });

    this.redis.on('ready', () => {
      this.logger.log('✅ Redis ready');
    });

    this.redis.on('error', error => {
      this.logger.error('❌ Redis error:', error.message);
      this.stats.errors++;
    });

    this.redis.on('close', () => {
      this.logger.warn('🔌 Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      this.logger.log('🔄 Redis reconnecting...');
    });
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string, config?: Partial<CacheConfig>): Promise<T | null> {
    const traceId = this.getTraceId();
    const fullKey = this.buildKey(key, config?.prefix);

    try {
      this.logger.debug(`[${traceId}] Getting cache key: ${fullKey}`);

      const value = await this.redis.get(fullKey);

      if (value === null) {
        this.stats.misses++;
        this.logger.debug(`[${traceId}] Cache miss for key: ${fullKey}`);
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();

      const result = config?.serialize !== false ? JSON.parse(value) : value;
      this.logger.debug(`[${traceId}] Cache hit for key: ${fullKey}`);

      return result;
    } catch (error) {
      this.stats.errors++;
      this.logger.error(`[${traceId}] Failed to get cache key ${fullKey}:`, error.message);
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  async set<T>(key: string, value: T, config?: CacheConfig): Promise<boolean> {
    const traceId = this.getTraceId();
    const fullKey = this.buildKey(key, config?.prefix);

    try {
      this.logger.debug(`[${traceId}] Setting cache key: ${fullKey}`);

      const serializedValue =
        config?.serialize !== false ? JSON.stringify(value) : (value as string);

      if (config?.ttl) {
        await this.redis.setex(fullKey, config.ttl, serializedValue);
      } else {
        await this.redis.set(fullKey, serializedValue);
      }

      this.stats.sets++;
      this.logger.debug(
        `[${traceId}] Cache set for key: ${fullKey}, TTL: ${config?.ttl || 'none'}`,
      );

      return true;
    } catch (error) {
      this.stats.errors++;
      this.logger.error(`[${traceId}] Failed to set cache key ${fullKey}:`, error.message);
      return false;
    }
  }

  /**
   * 删除缓存键
   */
  async delete(key: string, prefix?: string): Promise<boolean> {
    const traceId = this.getTraceId();
    const fullKey = this.buildKey(key, prefix);

    try {
      this.logger.debug(`[${traceId}] Deleting cache key: ${fullKey}`);

      const result = await this.redis.del(fullKey);
      this.stats.deletes++;

      this.logger.debug(`[${traceId}] Cache deleted for key: ${fullKey}, result: ${result}`);
      return result > 0;
    } catch (error) {
      this.stats.errors++;
      this.logger.error(`[${traceId}] Failed to delete cache key ${fullKey}:`, error.message);
      return false;
    }
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key: string, prefix?: string): Promise<boolean> {
    const traceId = this.getTraceId();
    const fullKey = this.buildKey(key, prefix);

    try {
      const result = await this.redis.exists(fullKey);
      this.logger.debug(`[${traceId}] Cache exists check for key: ${fullKey}, result: ${result}`);
      return result === 1;
    } catch (error) {
      this.stats.errors++;
      this.logger.error(`[${traceId}] Failed to check cache key ${fullKey}:`, error.message);
      return false;
    }
  }

  /**
   * 设置缓存过期时间
   */
  async expire(key: string, ttl: number, prefix?: string): Promise<boolean> {
    const traceId = this.getTraceId();
    const fullKey = this.buildKey(key, prefix);

    try {
      const result = await this.redis.expire(fullKey, ttl);
      this.logger.debug(
        `[${traceId}] Set expiration for key: ${fullKey}, TTL: ${ttl}, result: ${result}`,
      );
      return result === 1;
    } catch (error) {
      this.stats.errors++;
      this.logger.error(`[${traceId}] Failed to set expiration for key ${fullKey}:`, error.message);
      return false;
    }
  }

  /**
   * 获取缓存剩余生存时间
   */
  async ttl(key: string, prefix?: string): Promise<number> {
    const traceId = this.getTraceId();
    const fullKey = this.buildKey(key, prefix);

    try {
      const result = await this.redis.ttl(fullKey);
      this.logger.debug(`[${traceId}] TTL for key: ${fullKey}, result: ${result}`);
      return result;
    } catch (error) {
      this.stats.errors++;
      this.logger.error(`[${traceId}] Failed to get TTL for key ${fullKey}:`, error.message);
      return -1;
    }
  }

  /**
   * 原子递增
   */
  async increment(key: string, delta: number = 1, prefix?: string): Promise<number> {
    const traceId = this.getTraceId();
    const fullKey = this.buildKey(key, prefix);

    try {
      const result = await this.redis.incrby(fullKey, delta);
      this.logger.debug(`[${traceId}] Incremented key: ${fullKey} by ${delta}, result: ${result}`);
      return result;
    } catch (error) {
      this.stats.errors++;
      this.logger.error(`[${traceId}] Failed to increment key ${fullKey}:`, error.message);
      throw error;
    }
  }

  /**
   * 原子递减
   */
  async decrement(key: string, delta: number = 1, prefix?: string): Promise<number> {
    const traceId = this.getTraceId();
    const fullKey = this.buildKey(key, prefix);

    try {
      const result = await this.redis.decrby(fullKey, delta);
      this.logger.debug(`[${traceId}] Decremented key: ${fullKey} by ${delta}, result: ${result}`);
      return result;
    } catch (error) {
      this.stats.errors++;
      this.logger.error(`[${traceId}] Failed to decrement key ${fullKey}:`, error.message);
      throw error;
    }
  }

  /**
   * 批量获取
   */
  async mget<T>(keys: string[], prefix?: string): Promise<(T | null)[]> {
    const traceId = this.getTraceId();
    const fullKeys = keys.map(key => this.buildKey(key, prefix));

    try {
      this.logger.debug(`[${traceId}] Batch getting ${keys.length} cache keys`);

      const values = await this.redis.mget(...fullKeys);
      const results = values.map(value => {
        if (value === null) {
          this.stats.misses++;
          return null;
        }
        this.stats.hits++;
        return JSON.parse(value);
      });

      this.updateHitRate();
      this.logger.debug(
        `[${traceId}] Batch get completed, ${results.filter(r => r !== null).length}/${keys.length} hits`,
      );

      return results;
    } catch (error) {
      this.stats.errors++;
      this.logger.error(`[${traceId}] Failed to batch get cache keys:`, error.message);
      return keys.map(() => null);
    }
  }

  /**
   * 批量设置
   */
  async mset<T>(keyValuePairs: Record<string, T>, config?: CacheConfig): Promise<boolean> {
    const traceId = this.getTraceId();

    try {
      this.logger.debug(
        `[${traceId}] Batch setting ${Object.keys(keyValuePairs).length} cache keys`,
      );

      const pipeline = this.redis.pipeline();

      for (const [key, value] of Object.entries(keyValuePairs)) {
        const fullKey = this.buildKey(key, config?.prefix);
        const serializedValue =
          config?.serialize !== false ? JSON.stringify(value) : (value as string);

        if (config?.ttl) {
          pipeline.setex(fullKey, config.ttl, serializedValue);
        } else {
          pipeline.set(fullKey, serializedValue);
        }
      }

      await pipeline.exec();
      this.stats.sets += Object.keys(keyValuePairs).length;

      this.logger.debug(
        `[${traceId}] Batch set completed for ${Object.keys(keyValuePairs).length} keys`,
      );
      return true;
    } catch (error) {
      this.stats.errors++;
      this.logger.error(`[${traceId}] Failed to batch set cache keys:`, error.message);
      return false;
    }
  }

  /**
   * 批量删除
   */
  async mdel(keys: string[], prefix?: string): Promise<number> {
    const traceId = this.getTraceId();
    const fullKeys = keys.map(key => this.buildKey(key, prefix));

    try {
      this.logger.debug(`[${traceId}] Batch deleting ${keys.length} cache keys`);

      const result = await this.redis.del(...fullKeys);
      this.stats.deletes += result;

      this.logger.debug(`[${traceId}] Batch delete completed, ${result} keys deleted`);
      return result;
    } catch (error) {
      this.stats.errors++;
      this.logger.error(`[${traceId}] Failed to batch delete cache keys:`, error.message);
      return 0;
    }
  }

  /**
   * 模式匹配删除
   */
  async deleteByPattern(pattern: string, prefix?: string): Promise<number> {
    const traceId = this.getTraceId();
    const fullPattern = this.buildKey(pattern, prefix);

    try {
      this.logger.debug(`[${traceId}] Deleting cache keys by pattern: ${fullPattern}`);

      const keys = await this.redis.keys(fullPattern);
      if (keys.length === 0) {
        this.logger.debug(`[${traceId}] No keys found for pattern: ${fullPattern}`);
        return 0;
      }

      const result = await this.redis.del(...keys);
      this.stats.deletes += result;

      this.logger.debug(`[${traceId}] Pattern delete completed, ${result} keys deleted`);
      return result;
    } catch (error) {
      this.stats.errors++;
      this.logger.error(`[${traceId}] Failed to delete by pattern ${fullPattern}:`, error.message);
      return 0;
    }
  }

  /**
   * 清空所有缓存
   */
  async flush(): Promise<boolean> {
    const traceId = this.getTraceId();

    try {
      this.logger.warn(`[${traceId}] Flushing all cache data`);

      await this.redis.flushdb();
      this.resetStats();

      this.logger.warn(`[${traceId}] All cache data flushed`);
      return true;
    } catch (error) {
      this.stats.errors++;
      this.logger.error(`[${traceId}] Failed to flush cache:`, error.message);
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
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
    this.stats.errors = 0;
    this.stats.hitRate = 0;
    this.stats.totalOperations = 0;
  }

  /**
   * 获取缓存健康状态
   */
  async getHealth(): Promise<CacheHealth> {
    try {
      const start = Date.now();
      const info = await this.redis.info();
      const latency = Date.now() - start;

      const infoLines = info.split('\r\n');
      const infoObj: Record<string, string> = {};

      infoLines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          infoObj[key] = value;
        }
      });

      const memoryUsage = parseInt(infoObj.used_memory || '0', 10);
      const connectedClients = parseInt(infoObj.connected_clients || '0', 10);
      const uptime = parseInt(infoObj.uptime_in_seconds || '0', 10);
      const version = infoObj.redis_version || 'unknown';

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (latency > 1000) {
        status = 'unhealthy';
      } else if (latency > 500) {
        status = 'degraded';
      }

      return {
        status,
        latency,
        memoryUsage,
        connectedClients,
        uptime,
        version,
      };
    } catch (error) {
      this.logger.error('Failed to get cache health:', error.message);
      return {
        status: 'unhealthy',
        latency: -1,
        memoryUsage: -1,
        connectedClients: -1,
        uptime: -1,
        version: 'unknown',
      };
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.quit();
        this.logger.log('🔌 Redis connection closed');
      }
    } catch (error) {
      this.logger.error('Failed to disconnect from Redis:', error.message);
    }
  }

  /**
   * 构建完整的缓存键
   */
  private buildKey(key: string, prefix?: string): string {
    const basePrefix = this.configService.get<string>('REDIS_KEY_PREFIX', 'caddy:');
    const fullPrefix = prefix ? `${basePrefix}${prefix}:` : basePrefix;
    return `${fullPrefix}${key}`;
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    this.stats.totalOperations = this.stats.hits + this.stats.misses;
    this.stats.hitRate =
      this.stats.totalOperations > 0 ? (this.stats.hits / this.stats.totalOperations) * 100 : 0;
  }

  /**
   * 获取追踪ID，处理TracingService可能为空的情况
   */
  private getTraceId(): string {
    try {
      return this.tracingService?.getTraceId() || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * 定期清理过期统计数据
   */
  // @Cron(CronExpression.EVERY_HOUR)
  private async cleanupStats() {
    try {
      // 每小时重置错误计数，避免累积过多
      if (this.stats.errors > 1000) {
        this.logger.warn('Resetting error count due to high error rate');
        this.stats.errors = 0;
      }

      // 记录当前统计信息
      this.logger.debug('Cache stats:', this.getStats());
    } catch (error) {
      this.logger.error('Failed to cleanup stats:', error.message);
    }
  }
}
