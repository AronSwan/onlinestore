// 用途：健康检查控制器，监控系统状态和性能
// 依赖文件：database.module.ts, redis.module.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:25:00

import { Controller, Get, Head, Optional } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiDocs, ApiGetResource } from '../common/decorators/api-docs.decorator';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  HttpHealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { RedisHealthService } from '../redis/redis-health.service';
import { RedpandaHealthIndicator } from './redpanda.health';
import { ConfigService } from '@nestjs/config';
import { isRedisEnabled } from '../common/redis/redis-utils';

@ApiTags('系统健康')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    @Optional() private db: TypeOrmHealthIndicator,
    private http: HttpHealthIndicator,
    @Optional() private redisHealth: RedisHealthService,
    @Optional() private redpanda: RedpandaHealthIndicator,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiGetResource(Object, 'API接口')
  async check() {
    const isDev = process.env.NODE_ENV === 'development';
    const redisEnabled = isRedisEnabled(this.configService);

    // 开发环境：自定义返回，保证 200 且包含 redis: down 信息
    if (isDev) {
      const apiRes = await this.http.pingCheck(
        'api',
        `http://localhost:${process.env.PORT || 3000}/health/status`,
      );
      const redisRes = this.redisHealth && redisEnabled
        ? await this.redisIndicator()
        : ({ redis: { status: 'down', error: 'redis skipped' } } as any);
      return {
        status: 'ok',
        info: {
          api: (apiRes as any).api,
        },
        error: {},
        details: {
          api: (apiRes as any).api,
          redis: (redisRes as any).redis,
        },
      } as any;
    }

    // 生产环境：严格执行数据库与 Redis 检查
    const checks: Array<() => Promise<HealthIndicatorResult>> = [
      () =>
        this.http.pingCheck('api', `http://localhost:${process.env.PORT || 3000}/health/status`),
    ];

    if (this.db) {
      checks.push(() => this.db.pingCheck('database'));
    }

    if (this.redisHealth && redisEnabled) {
      checks.push(() => this.redisIndicator());
    }

    if (this.redpanda) {
      checks.push(() => this.redpanda.isHealthy('redpanda'));
    }

    return this.health.check(checks);
  }

  private async redisIndicator(): Promise<HealthIndicatorResult> {
    const result = await this.redisHealth.checkHealth();
    const isDev = process.env.NODE_ENV === 'development';
    if (result.status === 'healthy') {
      return { redis: { status: 'up', latency: result.latency } } as HealthIndicatorResult;
    }
    // 开发环境不抛错，返回 down 以便健康接口整体可用；生产环境抛 HealthCheckError 触发 503
    if (isDev) {
      return {
        redis: { status: 'down', error: result.error || 'unknown error' },
      } as HealthIndicatorResult;
    }
    throw new HealthCheckError('Redis unhealthy', {
      redis: { status: 'down', error: result.error || 'unknown error' },
    });
  }

  @Get('status')
  @Head('status')
  @ApiGetResource(Object, 'API接口')
  getStatus() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  @Get('metrics')
  @ApiGetResource(Object, 'API接口')
  getMetrics() {
    const memUsage = process.memoryUsage();
    return {
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
      },
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('redpanda')
  @HealthCheck()
  @ApiGetResource(Object, 'API接口')
  async checkRedpanda() {
    if (!this.redpanda) {
      return {
        status: 'ok',
        info: { redpanda: { status: 'not_configured' } },
        error: {},
        details: { redpanda: { status: 'not_configured' } },
      };
    }

    const checks: Array<() => Promise<HealthIndicatorResult>> = [
      () => this.redpanda.isHealthy('redpanda_connection'),
    ];

    // 检查关键主题
    const topics = ['orders', 'products', 'users'];
    for (const topic of topics) {
      checks.push(() => this.redpanda.checkTopicHealth('redpanda_topic', topic));
    }

    return this.health.check(checks);
  }
}
