// 用途：健康检查控制器单元测试
// 依赖文件：health.controller.ts, redis-health.service.ts
// 作者：后端开发团队
// 时间：2025-09-30 23:26:00

import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { RedisHealthService } from '../redis/redis-health.service';
import { RedpandaHealthIndicator } from './redpanda.health';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  HttpHealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { HttpStatus } from '@nestjs/common';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;
  let typeOrmHealthIndicator: TypeOrmHealthIndicator;
  let httpHealthIndicator: HttpHealthIndicator;
  let redisHealthService: RedisHealthService;
  let redpandaHealthIndicator: RedpandaHealthIndicator;

  const mockRedisHealthResult = {
    status: 'healthy',
    latency: 2,
    error: null,
  };

  const mockHealthIndicatorResult = {
    api: {
      status: 'up',
      latency: 5,
    },
    database: {
      status: 'up',
    },
    redis: {
      status: 'up',
      latency: 2,
    },
  };

  const mockHealthCheckService = {
    check: jest.fn(),
  } as any;

  const mockTypeOrmHealthIndicator = {
    pingCheck: jest.fn(),
  } as any;

  const mockHttpHealthIndicator = {
    pingCheck: jest.fn(),
  } as any;

  const mockRedisHealthService = {
    checkHealth: jest.fn(),
  } as any;

  const mockRedpandaHealthIndicator = {
    isHealthy: jest.fn(),
    checkTopicHealth: jest.fn(),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: TypeOrmHealthIndicator, useValue: mockTypeOrmHealthIndicator },
        { provide: HttpHealthIndicator, useValue: mockHttpHealthIndicator },
        { provide: RedisHealthService, useValue: mockRedisHealthService },
        { provide: RedpandaHealthIndicator, useValue: mockRedpandaHealthIndicator },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    typeOrmHealthIndicator = module.get<TypeOrmHealthIndicator>(TypeOrmHealthIndicator);
    httpHealthIndicator = module.get<HttpHealthIndicator>(HttpHealthIndicator);
    redisHealthService = module.get<RedisHealthService>(RedisHealthService);
    redpandaHealthIndicator = module.get<RedpandaHealthIndicator>(RedpandaHealthIndicator);
  });

  describe('check', () => {
    it('should return health status in development environment', async () => {
      // Mock development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockHttpHealthIndicator.pingCheck.mockResolvedValue({
        api: { status: 'up' },
      } as HealthIndicatorResult);
      mockRedisHealthService.checkHealth.mockResolvedValue(mockRedisHealthResult);

      const result = await controller.check();

      expect(result).toEqual({
        status: 'ok',
        info: {
          api: { status: 'up' },
        },
        error: {},
        details: {
          api: { status: 'up' },
          redis: { status: 'up', latency: 2 },
        },
      });

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should return health status in production environment', async () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockHealthCheckService.check.mockResolvedValue(mockHealthIndicatorResult);

      const result = await controller.check();

      expect(healthCheckService.check).toHaveBeenCalled();
      expect(result).toEqual(mockHealthIndicatorResult);

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle health check failure', async () => {
      mockHealthCheckService.check.mockRejectedValue(new Error('Health check failed'));

      await expect(controller.check()).rejects.toThrow();
    });
  });

  describe('getStatus', () => {
    it('should return system status', () => {
      // Mock environment to ensure consistent test results
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const result = controller.getStatus();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: 'development',
        version: expect.any(String),
      });

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('getMetrics', () => {
    it('should return system metrics', () => {
      const result = controller.getMetrics();

      expect(result).toEqual({
        memory: expect.any(Object),
        cpu: expect.any(Object),
        uptime: expect.any(Number),
        timestamp: expect.any(String),
      });
    });
  });

  describe('checkRedpanda', () => {
    it('should return redpanda health when configured', async () => {
      mockRedpandaHealthIndicator.isHealthy.mockResolvedValue({
        redpanda_connection: { status: 'up' },
      } as HealthIndicatorResult);
      mockRedpandaHealthIndicator.checkTopicHealth.mockResolvedValue({
        redpanda_topic: { status: 'up' },
      } as HealthIndicatorResult);

      // Mock the health check service to return the expected result
      mockHealthCheckService.check.mockResolvedValue({
        status: 'ok',
        info: { redpanda_connection: { status: 'up' } },
        error: {},
        details: { redpanda_connection: { status: 'up' } },
      });

      const result = await controller.checkRedpanda();

      // Verify that the health check service was called with the right checks
      expect(mockHealthCheckService.check).toHaveBeenCalled();

      // Verify the result structure
      expect(result).toEqual({
        status: 'ok',
        info: { redpanda_connection: { status: 'up' } },
        error: {},
        details: { redpanda_connection: { status: 'up' } },
      });
    });

    it('should return not configured when redpanda is not available', async () => {
      // Test with controller that doesn't have redpanda indicator
      const module: TestingModule = await Test.createTestingModule({
        controllers: [HealthController],
        providers: [
          { provide: HealthCheckService, useValue: mockHealthCheckService },
          { provide: TypeOrmHealthIndicator, useValue: mockTypeOrmHealthIndicator },
          { provide: HttpHealthIndicator, useValue: mockHttpHealthIndicator },
          { provide: RedisHealthService, useValue: mockRedisHealthService },
        ],
      }).compile();

      const controllerWithoutRedpanda = module.get<HealthController>(HealthController);
      const result = await controllerWithoutRedpanda.checkRedpanda();

      expect(result).toEqual({
        status: 'ok',
        info: { redpanda: { status: 'not_configured' } },
        error: {},
        details: { redpanda: { status: 'not_configured' } },
      });
    });

    it('should handle redpanda health check failure', async () => {
      mockHealthCheckService.check.mockRejectedValue(new Error('Redpanda health check failed'));

      await expect(controller.checkRedpanda()).rejects.toThrow();
    });
  });

  describe('redisIndicator', () => {
    it('should return redis up status when healthy', async () => {
      mockRedisHealthService.checkHealth.mockResolvedValue({ status: 'healthy', latency: 2 });

      // Access private method for testing
      const redisIndicator = (controller as any).redisIndicator.bind(controller);
      const result = await redisIndicator();

      expect(result).toEqual({
        redis: { status: 'up', latency: 2 },
      });
    });

    it('should return redis down status in development environment when unhealthy', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockRedisHealthService.checkHealth.mockResolvedValue({
        status: 'unhealthy',
        error: 'Connection failed',
      });

      const redisIndicator = (controller as any).redisIndicator.bind(controller);
      const result = await redisIndicator();

      expect(result).toEqual({
        redis: { status: 'down', error: 'Connection failed' },
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should throw HealthCheckError in production environment when unhealthy', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockRedisHealthService.checkHealth.mockResolvedValue({
        status: 'unhealthy',
        error: 'Connection failed',
      });

      const redisIndicator = (controller as any).redisIndicator.bind(controller);

      await expect(redisIndicator()).rejects.toThrow();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
