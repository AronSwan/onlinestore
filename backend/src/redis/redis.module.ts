// 用途：Redis缓存和会话管理模块，支持高并发数据缓存
// 依赖文件：redis-health.service.ts
// 作者：后端开发团队
// 时间：2025-06-17 10:35:00

import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisHealthService } from './redis-health.service';
import { EnvironmentAdapter } from '../config/environment-adapter';

@Global()
@Module({
  imports: [],
  providers: [
    RedisHealthService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV;
        const isDev = nodeEnv === 'development';
        const isTest = process.env.NODE_ENV === 'test';
        const adapterRedis = EnvironmentAdapter.getRedis();

        // 允许通过环境变量禁用Redis，在生产环境下也可降级为Stub
        const redisEnabledRaw = configService.get<string>('REDIS_ENABLED', 'true');
        const redisEnabled = adapterRedis.enabled;

        if (isDev || isTest || !redisEnabled) {
          // 提供一个最小可用的Stub，避免开发环境无Redis时阻断启动
          const stub: any = {
            __stub: true,
            async get() { return null; },
            async set() { return 'OK'; },
            async del() { return 0; },
            async exists() { return 0; },
            async expire() { return 1; },
            async ttl() { return -1; },
            async incrby() { return 0; },
            async decrby() { return 0; },
            async mget() { return []; },
            async mset() { return 'OK'; },
            pipeline: () => ({
              set: () => ({ pipeline: () => ({ exec: async () => [] }) }),
              setex: () => ({ pipeline: () => ({ exec: async () => [] }) }),
              exec: async () => []
            }),
            keys: async () => [],
            info: async () => 'redis_version:6.0.0',
            quit: async () => {},
            on: () => {},
          };
          // 记录降级信息，便于观察
          try { console.warn('[RedisModule] Redis disabled or non-prod stub in use'); } catch {}
          return stub;
        }

        const client = new Redis({
          host: adapterRedis.host ?? configService.get<string>('REDIS_HOST', 'localhost'),
          port: adapterRedis.port ?? configService.get<number>('REDIS_PORT', 6379),
          password: adapterRedis.password ?? configService.get<string>('REDIS_PASSWORD'),
          db: adapterRedis.db ?? configService.get<number>('REDIS_DB', 0),
          lazyConnect: true,
          enableOfflineQueue: true,
          retryStrategy: times => Math.min(times * 200, 2000),
          // 连接池优化配置
          maxRetriesPerRequest: 3,
          connectTimeout: 10000,
          commandTimeout: 5000,
          // 连接池大小
          maxLoadingRetryTime: 60000,
        });

        client.on('error', err => {
          console.warn('Redis client error:', err?.message || err);
        });

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [RedisHealthService, 'REDIS_CLIENT'],
})
export class RedisModule {}
