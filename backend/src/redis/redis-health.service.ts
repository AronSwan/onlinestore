// 用途：Redis连接健康检查服务，确保Redis缓存正常工作
// 作者：后端开发团队
// 时间：2025-06-17 11:50:00

import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createMasterConfiguration } from '../config/unified-master.config';

@Injectable()
export class RedisHealthService {
  private readonly logger = new Logger(RedisHealthService.name);
  private redisClient: Redis;
  private stubMode = false;

  constructor(
    @Optional() @Inject('REDIS_CLIENT') redisClient?: Redis,
    @Optional() private readonly configService?: ConfigService,
  ) {
    const isTest = process.env.NODE_ENV === 'test';

    // 读取Redis启用开关，允许生产环境也禁用以降级
    const enabledRaw = (this.configService?.get?.('REDIS_ENABLED') as string) ?? process.env.REDIS_ENABLED ?? 'true';
    const redisEnabled = typeof enabledRaw === 'string'
      ? ['true', '1', 'yes', 'on'].includes(enabledRaw.toLowerCase())
      : !!enabledRaw;

    // 在测试环境中，如果传入了redisClient，则使用它
    if (isTest && redisClient !== undefined) {
      this.redisClient = redisClient;
      this.setupEventListeners();
      return;
    }

    if (redisClient !== undefined) {
      this.redisClient = redisClient;
      // 若注入的是模块提供的 Stub，则标记为 stubMode，getClient 返回 undefined
      if ((this.redisClient as any)?.__stub === true) {
        this.stubMode = true;
      }
      this.setupEventListeners();
    } else {
      const isDev = process.env.NODE_ENV === 'development';

      // 开发环境或测试环境：不实例化 Redis 客户端，避免无 Redis 服务时产生连接错误
      if (isDev || isTest || !redisEnabled) {
        // 禁用或开发/测试模式：使用最小可用的Stub，避免连接错误
        this.redisClient = this.createStubClient() as any;
        this.stubMode = true;
        const reason = !redisEnabled
          ? 'Redis disabled via REDIS_ENABLED'
          : (isTest ? 'Test environment' : 'Development environment');
        this.logger.warn(`${reason}: Redis client is using stub.`);
        this.setupEventListeners();
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

      const isDev = process.env.NODE_ENV === 'development';
      const isTest = process.env.NODE_ENV === 'test';

      // 读取Redis启用开关
      const enabledRaw = (this.configService?.get?.('REDIS_ENABLED') as string) ?? process.env.REDIS_ENABLED ?? 'true';
      const redisEnabled = typeof enabledRaw === 'string'
        ? ['true', '1', 'yes', 'on'].includes(enabledRaw.toLowerCase())
        : !!enabledRaw;

      // 开发环境或测试环境：不实例化 Redis 客户端，避免无 Redis 服务时产生连接错误
      if (isDev || isTest || !redisEnabled) {
        this.redisClient = this.createStubClient() as any;
        this.stubMode = true;
        const reason = !redisEnabled
          ? 'Redis disabled via REDIS_ENABLED'
          : (isTest ? 'Test environment' : 'Development environment');
        this.logger.warn(`${reason}: Redis client is using stub.`);
        this.setupEventListeners();
        return;
      }

      const master = createMasterConfiguration?.();
      const host = this.configService?.get<string>('REDIS_HOST') ?? master?.redis?.host ?? 'localhost';
      const port = this.configService?.get<number>('REDIS_PORT') ?? master?.redis?.port ?? 6379;
      const password = this.configService?.get<string>('REDIS_PASSWORD') ?? master?.redis?.password ?? undefined;
      const db = this.configService?.get<number>('REDIS_DB') ?? master?.redis?.db ?? 0;

      this.redisClient = new Redis({
        host,
        port,
        password,
        db,
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

  // 创建一个最小可用的Stub客户端，避免连接错误
  private createStubClient(): any {
    const store = new Map<string, string>();
    const ttlMap = new Map<string, NodeJS.Timeout>();
    return {
      async get(key: string) { return store.has(key) ? store.get(key)! : null; },
      async set(key: string, value: string) {
        if (ttlMap.has(key)) { clearTimeout(ttlMap.get(key)!); ttlMap.delete(key); }
        store.set(key, value); return 'OK';
      },
      async del(key: string) { return store.delete(key) ? 1 : 0; },
      async ping() { return 'PONG'; },
      async info() { return 'redis_version:stub\r\nconnected_clients:1\r\nused_memory_human:1K\r\nuptime_in_seconds:1'; },
      on() { /* noop */ },
      quit: async () => {},
    };
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
    if (this.stubMode) {
      return { status: 'unhealthy', error: 'Redis client disabled in development or test' };
    }
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
    if (this.stubMode) {
      return null;
    }
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
    if (this.stubMode) {
      return false;
    }
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
    if (this.stubMode) {
      return;
    }
    if (this.redisClient && typeof this.redisClient.quit === 'function') {
      await this.redisClient.quit();
      this.logger.log('Redis client disconnected');
    }
  }

  getClient(): Redis {
    // 测试期望：在开发/测试或禁用场景返回 undefined
    if (this.stubMode) {
      return undefined as any;
    }
    return this.redisClient;
  }
}
