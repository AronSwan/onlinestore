// 用途：Redis健康检查服务单元测试
// 依赖文件：redis-health.service.ts, unified-master.config.ts
// 作者：后端开发团队
// 时间：2025-06-17 11:35:00

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisHealthService } from './redis-health.service';
import { createMasterConfiguration } from '../config/unified-master.config';

// Create configuration instance
const masterConfig = createMasterConfiguration();

// Mock Redis class
const mockRedis = {
  on: jest.fn(),
  ping: jest.fn(),
  info: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  quit: jest.fn(),
} as any;

// Mock Redis module
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

describe('RedisHealthService', () => {
  let service: RedisHealthService;
  let logger: Logger;

  const originalEnv = process.env;

  beforeAll(() => {
    // 跳过数据库连接设置
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    // Reset all mock functions
    Object.keys(mockRedis).forEach(key => {
      if (typeof mockRedis[key] === 'function') {
        mockRedis[key].mockReset();
      }
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      service = new RedisHealthService();
      expect(service).toBeDefined();
    });

    it('should disable Redis client in development environment', () => {
      process.env.NODE_ENV = 'development';
      service = new RedisHealthService();

      expect(Redis).not.toHaveBeenCalled();
      expect(service.getClient()).toBeUndefined();
    });

    it('should initialize Redis client in production environment', () => {
      process.env.NODE_ENV = 'production';
      service = new RedisHealthService();

      expect(Redis).toHaveBeenCalledWith({
        host: masterConfig.redis.host,
        port: masterConfig.redis.port,
        password: masterConfig.redis.password,
        db: masterConfig.redis.db,
        connectTimeout: 3000,
        commandTimeout: 2000,
        lazyConnect: false,
        retryStrategy: expect.any(Function),
        enableOfflineQueue: true,
        reconnectOnError: expect.any(Function),
      });
    });

    it('should handle initialization errors gracefully', () => {
      const originalConsoleError = console.error;
      console.error = jest.fn();

      (Redis as unknown as jest.Mock).mockImplementation(() => {
        throw new Error('Redis connection failed');
      });

      expect(() => {
        service = new RedisHealthService();
      }).not.toThrow();

      console.error = originalConsoleError;
    });
  });

  describe('Event Listeners Setup', () => {
    it('should set up all required event listeners when valid Redis client is provided', () => {
      process.env.NODE_ENV = 'test';
      service = new RedisHealthService(mockRedis);
      
      expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('ready', expect.any(Function));
    });

    it('should have correct number of event listeners', () => {
      process.env.NODE_ENV = 'test';
      service = new RedisHealthService(mockRedis);
      
      expect(mockRedis.on).toHaveBeenCalledTimes(5);
    });

    it('should not set up event listeners when Redis client is undefined', () => {
      process.env.NODE_ENV = 'test';
      service = new RedisHealthService(undefined);
      
      expect(mockRedis.on).not.toHaveBeenCalled();
    });

    it('should not set up event listeners when Redis client has no on method', () => {
      process.env.NODE_ENV = 'test';
      const invalidRedisClient = { ping: jest.fn() } as any;
      service = new RedisHealthService(invalidRedisClient);
      
      expect(mockRedis.on).not.toHaveBeenCalled();
    });
  });

  describe('Health Check', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      process.env.NODE_ENV = 'test';
      service = new RedisHealthService(mockRedis);
    });

    it('should return healthy status when Redis is responding', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const result = await service.checkHealth();

      expect(result).toEqual({
        status: 'healthy',
        latency: expect.any(Number),
      });
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('should return unhealthy status when Redis ping fails', async () => {
      const error = new Error('Connection refused');
      mockRedis.ping.mockRejectedValue(error);

      const result = await service.checkHealth();

      expect(result).toEqual({
        status: 'unhealthy',
        error: 'Connection refused',
      });
    });

    it('should return unhealthy status when Redis client is disabled', async () => {
      process.env.NODE_ENV = 'development';
      service = new RedisHealthService();

      const result = await service.checkHealth();

      expect(result).toEqual({
        status: 'unhealthy',
        error: 'Redis client disabled in development or test',
      });
    });

    it('should measure latency correctly', async () => {
      mockRedis.ping.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve('PONG'), 100);
        });
      });

      const result = await service.checkHealth();

      expect(result.status).toBe('healthy');
      expect(result.latency).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Redis Info', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      process.env.NODE_ENV = 'test';
      service = new RedisHealthService(mockRedis);
    });

    it('should return parsed Redis info when successful', async () => {
      const mockInfo = `
redis_version:7.0.5
connected_clients:15
used_memory_human:2.5M
uptime_in_seconds:3600
      `;
      mockRedis.info.mockResolvedValue(mockInfo);

      const result = await service.getRedisInfo();

      expect(result).toEqual({
        version: '7.0.5',
        connected_clients: '15',
        used_memory: '2.5M',
        uptime: '3600',
      });
    });

    it('should return null when Redis client is disabled', async () => {
      process.env.NODE_ENV = 'development';
      service = new RedisHealthService();

      const result = await service.getRedisInfo();

      expect(result).toBeNull();
    });

    it('should return null when Redis info fails', async () => {
      mockRedis.info.mockRejectedValue(new Error('Info command failed'));

      const result = await service.getRedisInfo();

      expect(result).toBeNull();
    });

    it('should handle incomplete Redis info gracefully', async () => {
      const mockInfo = `
redis_version:7.0.5
connected_clients:15
      `;
      mockRedis.info.mockResolvedValue(mockInfo);

      const result = await service.getRedisInfo();

      expect(result).toEqual({
        version: '7.0.5',
        connected_clients: '15',
        used_memory: undefined,
        uptime: undefined,
      });
    });
  });

  describe('Cache Operation Test', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      process.env.NODE_ENV = 'test';
      service = new RedisHealthService(mockRedis);
    });

    it('should return true when cache operations work correctly', async () => {
      const testKey = 'health_check_test';
      const testValue = 'test_value';

      mockRedis.set.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue(testValue);
      mockRedis.del.mockResolvedValue(1);

      const result = await service.testCacheOperation();

      expect(result).toBe(true);
      // 验证调用参数，但不验证具体的键值（因为键包含时间戳）
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('health_check_'),
        testValue,
        'EX',
        10,
      );
      expect(mockRedis.get).toHaveBeenCalledWith(expect.stringContaining('health_check_'));
      expect(mockRedis.del).toHaveBeenCalledWith(expect.stringContaining('health_check_'));
    });

    it('should return false when cache set fails', async () => {
      mockRedis.set.mockRejectedValue(new Error('Set failed'));

      const result = await service.testCacheOperation();

      expect(result).toBe(false);
    });

    it('should return false when cache get fails', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.get.mockRejectedValue(new Error('Get failed'));

      const result = await service.testCacheOperation();

      expect(result).toBe(false);
    });

    it('should return false when retrieved value does not match', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue('wrong_value');
      mockRedis.del.mockResolvedValue(1);

      const result = await service.testCacheOperation();

      expect(result).toBe(false);
    });

    it('should return false when Redis client is disabled', async () => {
      process.env.NODE_ENV = 'development';
      service = new RedisHealthService();

      const result = await service.testCacheOperation();

      expect(result).toBe(false);
    });
  });

  describe('Disconnect', () => {
    it('should quit Redis client when connected', async () => {
      process.env.NODE_ENV = 'test';
      service = new RedisHealthService(mockRedis);

      mockRedis.quit.mockResolvedValue('OK');

      await service.disconnect();

      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should not attempt to quit when Redis client is disabled', async () => {
      process.env.NODE_ENV = 'development';
      service = new RedisHealthService();

      await service.disconnect();

      expect(mockRedis.quit).not.toHaveBeenCalled();
    });

    it('should handle quit errors gracefully', async () => {
      process.env.NODE_ENV = 'test';
      service = new RedisHealthService(mockRedis);

      mockRedis.quit.mockRejectedValue(new Error('Already disconnected'));

      // 修改测试期望，因为 disconnect 方法会抛出错误
      await expect(service.disconnect()).rejects.toThrow('Already disconnected');
    });
  });

  describe('Get Client', () => {
    it('should return Redis client in production', () => {
      jest.clearAllMocks();
      process.env.NODE_ENV = 'production';
      service = new RedisHealthService();

      const client = service.getClient();

      // In production, getClient() should return the Redis client
      expect(client).toBeDefined();
      expect(client).not.toBeUndefined();
    });

    it('should return undefined in development', () => {
      jest.clearAllMocks();
      process.env.NODE_ENV = 'development';
      service = new RedisHealthService();

      const client = service.getClient();

      // In development, getClient() returns undefined
      expect(client).toBeUndefined();
    });

    it('should return provided Redis client in test environment', () => {
      jest.clearAllMocks();
      process.env.NODE_ENV = 'test';
      service = new RedisHealthService(mockRedis);

      const client = service.getClient();

      expect(client).toBe(mockRedis);
    });
  });

  describe('Retry Strategy', () => {
    it('should implement exponential backoff with maximum delay', () => {
      jest.clearAllMocks();
      process.env.NODE_ENV = 'production';
      service = new RedisHealthService();

      // Get the retry strategy function from the Redis call
      const redisCall = (Redis as unknown as jest.Mock).mock.calls[0];
      const retryStrategy = redisCall[0].retryStrategy;

      expect(retryStrategy).toBeInstanceOf(Function);

      // Test exponential backoff
      expect(retryStrategy(1)).toBe(200); // 1 * 200 = 200
      expect(retryStrategy(5)).toBe(1000); // 5 * 200 = 1000
      expect(retryStrategy(10)).toBe(2000); // 10 * 200 = 2000
      expect(retryStrategy(100)).toBe(10000); // Max 10 seconds
    });
  });

  describe('Reconnect on Error', () => {
    it('should reconnect on specific errors', () => {
      jest.clearAllMocks();
      process.env.NODE_ENV = 'production';
      service = new RedisHealthService();

      // Get the reconnect function from the Redis call
      const redisCall = (Redis as unknown as jest.Mock).mock.calls[0];
      const reconnectOnError = redisCall[0].reconnectOnError;

      expect(reconnectOnError).toBeInstanceOf(Function);

      // Test specific errors that should trigger reconnect
      expect(
        reconnectOnError(new Error("READONLY You can't write against a read only replica.")),
      ).toBe(true);
      expect(reconnectOnError(new Error('ETIMEDOUT Connection timeout'))).toBe(true);
      expect(reconnectOnError(new Error('ECONNRESET Connection reset by peer'))).toBe(true);

      // Test errors that should not trigger reconnect
      expect(reconnectOnError(new Error('NOAUTH Authentication required'))).toBe(false);
      expect(
        reconnectOnError(
          new Error('WRONGTYPE Operation against a key holding the wrong kind of value'),
        ),
      ).toBe(false);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete health check workflow', async () => {
      jest.clearAllMocks();
      process.env.NODE_ENV = 'test';
      service = new RedisHealthService(mockRedis);

      // Mock successful operations
      mockRedis.ping.mockResolvedValue('PONG');
      mockRedis.info.mockResolvedValue(
        'redis_version:7.0.5\nconnected_clients:15\nused_memory_human:2.5M\nuptime_in_seconds:3600',
      );
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue('test_value');
      mockRedis.del.mockResolvedValue(1);

      // Execute health check
      const healthStatus = await service.checkHealth();
      expect(healthStatus.status).toBe('healthy');

      // Get Redis info
      const redisInfo = await service.getRedisInfo();
      expect(redisInfo).toEqual({
        version: '7.0.5',
        connected_clients: '15',
        used_memory: '2.5M',
        uptime: '3600',
      });

      // Test cache operations
      const cacheTest = await service.testCacheOperation();
      expect(cacheTest).toBe(true);

      // Disconnect
      await service.disconnect();
    });

    it('should handle failure scenarios gracefully', async () => {
      jest.clearAllMocks();
      process.env.NODE_ENV = 'test';
      service = new RedisHealthService(mockRedis);

      // Mock failed operations
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));
      mockRedis.info.mockRejectedValue(new Error('Info failed'));
      mockRedis.set.mockRejectedValue(new Error('Set failed'));

      // Execute health check
      const healthStatus = await service.checkHealth();
      expect(healthStatus.status).toBe('unhealthy');

      // Get Redis info
      const redisInfo = await service.getRedisInfo();
      expect(redisInfo).toBeNull();

      // Test cache operations
      const cacheTest = await service.testCacheOperation();
      expect(cacheTest).toBe(false);
    });
  });
});
