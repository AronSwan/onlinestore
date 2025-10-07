// 用途：Redis缓存和会话管理模块，支持高并发数据缓存
// 依赖文件：unified-master.config.ts, redis-health.service.ts
// 作者：后端开发团队
// 时间：2025-06-17 10:35:00

import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';
import { createMasterConfiguration } from '../config/unified-master.config';
import { RedisHealthService } from './redis-health.service';

// Create configuration instance
const masterConfig = createMasterConfiguration();

@Global()
@Module({
  imports: [],
  providers: [
    RedisHealthService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        const isDev = masterConfig.app.env === 'development';
        if (isDev) {
          // 提供一个最小可用的Stub，避免开发环境无Redis时阻断启动
          const stub: any = {
            async get() {
              return null;
            },
            async set() {
              return 'OK';
            },
            async del() {
              return 0;
            },
            multi() {
              return this;
            },
            async incr() {
              return 0;
            },
            async expire() {
              return 1;
            },
            async exec() {
              return [];
            },
          };
          return stub;
        }
        const client = new Redis({
          host: masterConfig.redis.host,
          port: masterConfig.redis.port,
          password: masterConfig.redis.password,
          db: masterConfig.redis.db,
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
    },
  ],
  exports: [RedisHealthService, 'REDIS_CLIENT'],
})
export class RedisModule {}
