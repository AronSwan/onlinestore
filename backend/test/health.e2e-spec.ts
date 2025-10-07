// 用途：健康检查端到端测试，覆盖开发与生产模式关键分支，防止回归
// 依赖文件：health.controller.ts, redis-health.service.ts
// 作者：后端开发团队
// 时间：2025-09-29 10:00:00

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { TerminusModule, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from '../src/health/health.controller';

describe('健康检查 E2E（开发模式）', () => {
  let app: INestApplication;
  const devPort = 3101;

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
    process.env.PORT = String(devPort);

    const { RedisHealthService } = await import('../src/redis/redis-health.service');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule, HttpModule],
      controllers: [HealthController],
      providers: [
        {
          provide: RedisHealthService,
          useValue: {
            checkHealth: jest.fn(async () => ({
              status: 'unhealthy',
              error: 'Redis client disabled in development',
            })),
          },
        },
      ],
    })
      .overrideProvider(TypeOrmHealthIndicator)
      .useValue({
        pingCheck: jest.fn(async () => ({ database: { status: 'up' } })),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(devPort);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/health (GET) - 开发模式应返回200，并包含 redis: down', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toHaveProperty('status', 'ok');
    // api 状态由 HttpHealthIndicator 提供
    expect(res.body?.details?.api?.status).toBe('up');
    // redis 在开发模式下为 down，且包含错误信息
    expect(res.body?.details?.redis?.status).toBe('down');
    expect(String(res.body?.details?.redis?.error || '')).toContain('Redis client disabled');
  });

  it('/health/status (HEAD) - 应返回200', () => {
    return request(app.getHttpServer()).head('/health/status').expect(200);
  });

  it('/health/status (GET) - 应返回200，且包含基础状态字段', async () => {
    const res = await request(app.getHttpServer()).get('/health/status').expect(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
  });
});

describe('健康检查 E2E（生产模式）', () => {
  let app: INestApplication;
  const prodPort = 3102;

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    process.env.PORT = String(prodPort);

    const { RedisHealthService } = await import('../src/redis/redis-health.service');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule, HttpModule],
      controllers: [HealthController],
      providers: [
        {
          provide: RedisHealthService,
          useValue: {
            checkHealth: jest.fn(async () => ({ status: 'unhealthy', error: 'simulated failure' })),
          },
        },
      ],
    })
      .overrideProvider(TypeOrmHealthIndicator)
      .useValue({
        pingCheck: jest.fn(async () => ({ database: { status: 'up' } })),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(prodPort);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/health (GET) - 生产模式Redis不健康应返回503', () => {
    return request(app.getHttpServer()).get('/health').expect(503);
  });

  it('/health/status (GET) - 应返回200', () => {
    return request(app.getHttpServer()).get('/health/status').expect(200);
  });
});
