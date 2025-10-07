import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { promisify } from 'util';

export interface CacheOptions {
  ttl?: number; // 秒
  compress?: boolean;
  tags?: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
}

@Injectable()
export class UnifiedCacheService implements OnModuleInit {
  private readonly logger = new Logger(UnifiedCacheService.name);
  private redis: Redis;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
  };

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeRedis();
  }

  private async initializeRedis() {
    const redisConfig = {
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB', 0),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
      keyPrefix: this.configService.get('REDIS_KEY_PREFIX', 'caddy:'),
    };

    this.redis = new Redis(redisConfig);

    this.redis.on('connect', () => {
      this.logger.log('Redis连接成功');
    });

    this.redis.on('error', error => {
      this.logger.error('Redis连接错误:', error);
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis准备就绪');
    });

    try {
      await this.redis.connect();
      await this.redis.ping();
      this.logger.log('Redis健康检查通过');
    } catch (error) {
      this.logger.error('Redis初始化失败:', error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const start = Date.now();
      const value = await this.redis.get(key);
      const duration = Date.now() - start;

      if (value === null) {
        this.stats.misses++;
        this.updateHitRate();
        this.logger.debug(`缓存未命中: ${key} (${duration}ms)`);
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();
      this.logger.debug(`缓存命中: ${key} (${duration}ms)`);

      return JSON.parse(value);
    } catch (error) {
      this.logger.error(`缓存读取失败: ${key}`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    try {
      const start = Date.now();
      const serialized = JSON.stringify(value);

      let result: string;
      if (options.ttl) {
        result = await this.redis.setex(key, options.ttl, serialized);
      } else {
        result = await this.redis.set(key, serialized);
      }

      const duration = Date.now() - start;
      this.stats.sets++;

      // 如果有标签，添加到标签集合中
      if (options.tags && options.tags.length > 0) {
        await this.addToTags(key, options.tags);
      }

      this.logger.debug(`缓存设置: ${key} TTL:${options.ttl || '永久'} (${duration}ms)`);
      return result === 'OK';
    } catch (error) {
      this.logger.error(`缓存设置失败: ${key}`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const start = Date.now();
      const result = await this.redis.del(key);
      const duration = Date.now() - start;

      this.stats.deletes++;
      this.logger.debug(`缓存删除: ${key} (${duration}ms)`);

      return result > 0;
    } catch (error) {
      this.logger.error(`缓存删除失败: ${key}`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`缓存检查失败: ${key}`, error);
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      this.logger.error(`缓存键查询失败: ${pattern}`, error);
      return [];
    }
  }

  async flushByTag(tag: string): Promise<number> {
    try {
      const tagKey = `tag:${tag}`;
      const keys = await this.redis.smembers(tagKey);

      if (keys.length === 0) {
        return 0;
      }

      const pipeline = this.redis.pipeline();
      keys.forEach(key => pipeline.del(key));
      pipeline.del(tagKey);

      const results = await pipeline.exec();
      const deletedCount = results
        ? results.filter(([err, result]) => !err && result === 1).length
        : 0;

      this.logger.log(`按标签清除缓存: ${tag}, 删除 ${deletedCount} 个键`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`按标签清除缓存失败: ${tag}`, error);
      return 0;
    }
  }

  async flushAll(): Promise<boolean> {
    try {
      await this.redis.flushdb();
      this.logger.warn('清空所有缓存');
      return true;
    } catch (error) {
      this.logger.error('清空缓存失败', error);
      return false;
    }
  }

  // 批量操作
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const start = Date.now();
      const values = await this.redis.mget(...keys);
      const duration = Date.now() - start;

      const results = values.map((value, index) => {
        if (value === null) {
          this.stats.misses++;
          return null;
        }
        this.stats.hits++;
        try {
          return JSON.parse(value);
        } catch {
          this.logger.warn(`反序列化失败: ${keys[index]}`);
          return null;
        }
      });

      this.updateHitRate();
      this.logger.debug(`批量缓存读取: ${keys.length} 个键 (${duration}ms)`);
      return results;
    } catch (error) {
      this.logger.error('批量缓存读取失败', error);
      return keys.map(() => null);
    }
  }

  async mset<T>(keyValues: Record<string, T>, ttl?: number): Promise<boolean> {
    try {
      const start = Date.now();
      const pipeline = this.redis.pipeline();

      Object.entries(keyValues).forEach(([key, value]) => {
        const serialized = JSON.stringify(value);
        if (ttl) {
          pipeline.setex(key, ttl, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      });

      await pipeline.exec();
      const duration = Date.now() - start;

      this.stats.sets += Object.keys(keyValues).length;
      this.logger.debug(`批量缓存设置: ${Object.keys(keyValues).length} 个键 (${duration}ms)`);
      return true;
    } catch (error) {
      this.logger.error('批量缓存设置失败', error);
      return false;
    }
  }

  // 缓存装饰器辅助方法
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  // 分布式锁
  async lock(key: string, ttl: number = 30): Promise<string | null> {
    try {
      const lockKey = `lock:${key}`;
      const lockValue = `${Date.now()}-${Math.random()}`;
      const result = await this.redis.set(lockKey, lockValue, 'EX', ttl, 'NX');

      if (result === 'OK') {
        this.logger.debug(`获取分布式锁: ${key}`);
        return lockValue;
      }
      return null;
    } catch (error) {
      this.logger.error(`获取分布式锁失败: ${key}`, error);
      return null;
    }
  }

  async unlock(key: string, lockValue: string): Promise<boolean> {
    try {
      const lockKey = `lock:${key}`;
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      const result = await this.redis.eval(script, 1, lockKey, lockValue);

      if (result === 1) {
        this.logger.debug(`释放分布式锁: ${key}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`释放分布式锁失败: ${key}`, error);
      return false;
    }
  }

  // 统计信息
  getStats(): CacheStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
    };
  }

  async getRedisInfo(): Promise<any> {
    try {
      const info = await this.redis.info();
      return this.parseRedisInfo(info);
    } catch (error) {
      this.logger.error('获取Redis信息失败', error);
      return null;
    }
  }

  private async addToTags(key: string, tags: string[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    tags.forEach(tag => {
      pipeline.sadd(`tag:${tag}`, key);
    });
    await pipeline.exec();
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private parseRedisInfo(info: string): any {
    const lines = info.split('\r\n');
    const result: any = {};

    lines.forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = isNaN(Number(value)) ? value : Number(value);
        }
      }
    });

    return result;
  }

  // 健康检查
  async healthCheck(): Promise<{ status: string; latency: number; info?: any }> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      return {
        status: 'healthy',
        latency,
        info: await this.getRedisInfo(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: -1,
        info: { error: error.message },
      };
    }
  }
}
