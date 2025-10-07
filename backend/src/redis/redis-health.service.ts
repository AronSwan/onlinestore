// 用途：Redis连接健康检查服务，确保Redis缓存正常工作
// 依赖文件：unified-master.config.ts
// 作者：后端开发团队
// 时间：2025-06-17 11:50:00

import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { createMasterConfiguration } from '../config/unified-master.config';

@Injectable()
export class RedisHealthService {
  private readonly logger = new Logger(RedisHealthService.name);
  private redisClient: Redis;
  private config = createMasterConfiguration();

  constructor(redisClient?: Redis) {
    const isTest = process.env.NODE_ENV === 'test';

    // 在测试环境中，如果传入了redisClient，则使用它
    if (isTest && redisClient !== undefined) {
      this.redisClient = redisClient;
      this.setupEventListeners();
      return;
    }

    if (redisClient !== undefined) {
      this.redisClient = redisClient;
      this.setupEventListeners();
    } else {
      const isDev = this.config?.app?.env === 'development';

      // 开发环境或测试环境：不实例化 Redis 客户端，避免无 Redis 服务时产生连接错误
      if (isDev || isTest) {
        this.redisClient = undefined as any;
        if (isTest) {
          this.logger.warn('Test environment detected: Redis client is disabled.');
        } else {
          this.logger.warn('Development environment detected: Redis client is disabled.');
        }
      } else {
        this.initializeRedisClient();
      }
    }
  }

  private initializeRedisClient() {
    try {
      // 如果redisClient已经设置，直接返回，不进行任何操作
      if (this.redisClient !== undefined) {
        return;
      }

      const isDev = this.config?.app?.env === 'development';
      const isTest = process.env.NODE_ENV === 'test';

      // 开发环境或测试环境：不实例化 Redis 客户端，避免无 Redis 服务时产生连接错误
      if (isDev || isTest) {
        this.redisClient = undefined as any;
        if (isTest) {
          this.logger.warn('Test environment detected: Redis client is disabled.');
        } else {
          this.logger.warn('Development environment detected: Redis client is disabled.');
        }
        return;
      }

      this.redisClient = new Redis({
        host: this.config?.redis?.host || 'localhost',
        port: this.config?.redis?.port || 6379,
        password: this.config?.redis?.password,
        db: this.config?.redis?.db || 0,
        connectTimeout: 3000,
        commandTimeout: 2000,
        lazyConnect: false,
        retryStrategy: times => {
          // 生产环境：指数退避，最大 10 秒
          const delay = Math.min(times * 200, 10000);
          return delay;
        },
        enableOfflineQueue: true,
        reconnectOnError: err => {
          const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET'];
          return targetErrors.some(code => err.message.includes(code));
        },
      });

      this.setupEventListeners();
    } catch (error) {
      this.logger.error('Failed to initialize Redis client', error);
    }
  }

  private setupEventListeners() {
    if (!this.redisClient || typeof this.redisClient.on !== 'function') return;

    this.redisClient.on('connect', () => {
      this.logger.log('Redis client connected successfully');
    });

    this.redisClient.on('error', error => {
      this.logger.error('Redis client error', error);
    });

    this.redisClient.on('close', () => {
      this.logger.warn('Redis client connection closed');
    });

    this.redisClient.on('reconnecting', () => {
      this.logger.log('Redis client reconnecting...');
    });

    this.redisClient.on('ready', () => {
      this.logger.log('Redis client is ready');
    });
  }

  async checkHealth(): Promise<{ status: string; latency?: number; error?: string }> {
    if (!this.redisClient || typeof this.redisClient.ping !== 'function') {
      return { status: 'unhealthy', error: 'Redis client disabled in development or test' };
    }
    try {
      const startTime = Date.now();
      await this.redisClient.ping();
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  async getRedisInfo(): Promise<any> {
    if (!this.redisClient || typeof this.redisClient.info !== 'function') {
      return null;
    }
    try {
      const info = await this.redisClient.info();
      return {
        version: info.match(/redis_version:(.*)/)?.[1]?.trim(),
        connected_clients: info.match(/connected_clients:(.*)/)?.[1]?.trim(),
        used_memory: info.match(/used_memory_human:(.*)/)?.[1]?.trim(),
        uptime: info.match(/uptime_in_seconds:(.*)/)?.[1]?.trim(),
      };
    } catch (error) {
      this.logger.error('Failed to get Redis info', error);
      return null;
    }
  }

  async testCacheOperation(): Promise<boolean> {
    if (!this.redisClient || typeof this.redisClient.set !== 'function' || typeof this.redisClient.get !== 'function' || typeof this.redisClient.del !== 'function') {
      return false;
    }
    try {
      const testKey = 'health_check_' + Date.now();
      const testValue = 'test_value';
      await this.redisClient.set(testKey, testValue, 'EX', 10);
      const retrievedValue = await this.redisClient.get(testKey);
      await this.redisClient.del(testKey);
      return retrievedValue === testValue;
    } catch (error) {
      this.logger.error('Cache operation test failed', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.redisClient && typeof this.redisClient.quit === 'function') {
      await this.redisClient.quit();
      this.logger.log('Redis client disconnected');
    }
  }

  getClient(): Redis {
    return this.redisClient;
  }
}
