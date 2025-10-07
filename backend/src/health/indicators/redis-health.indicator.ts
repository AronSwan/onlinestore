import { Injectable, Inject } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // 开发环境处理
      if (process.env.NODE_ENV === 'development' && !this.redis) {
        return this.getStatus(key, true, {
          status: 'skipped',
          message: 'Redis disabled in development',
        });
      }

      const startTime = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - startTime;

      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      const result = this.getStatus(key, true, {
        responseTime: `${responseTime}ms`,
        connection: 'active',
        memoryUsage,
      });

      return result;
    } catch (error) {
      const result = this.getStatus(key, false, {
        message: error.message,
        connection: 'failed',
      });

      // 开发环境不抛异常，只返回状态
      if (process.env.NODE_ENV === 'development') {
        return result;
      }

      throw new HealthCheckError('Redis health check failed', result);
    }
  }
}
