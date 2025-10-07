import { Test, TestingModule } from '@nestjs/testing';
import { EnhancedCacheService } from './enhanced-cache.service';
import { CacheService } from './cache.service';

describe('EnhancedCacheService', () => {
  let service: EnhancedCacheService;
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnhancedCacheService,
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EnhancedCacheService>(EnhancedCacheService);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('基础缓存操作', () => {
    it('should get cache with correct parameters', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      const fallbackMock = jest.fn().mockResolvedValue(value);

      // 修正断言期望值，匹配实际实现
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (cacheService.set as jest.Mock).mockResolvedValue(undefined);

      const result = await service.get(key, fallbackMock, 3600);

      // 验证缓存参数正确
      expect(cacheService.get).toHaveBeenCalledWith('enhanced', key);
      expect(cacheService.set).toHaveBeenCalledWith(
        'enhanced',
        key,
        JSON.stringify(value),
        expect.any(Number), // TTL包含随机值
      );
      expect(result).toEqual(value);
    });

    it('should return cached value', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      const fallbackMock = jest.fn().mockResolvedValue(value);

      // 模拟Redis缓存命中
      (cacheService.get as jest.Mock).mockResolvedValue(value);

      const result = await service.get(key, fallbackMock, 3600);

      expect(cacheService.get).toHaveBeenCalledWith('enhanced', key);
      expect(fallbackMock).not.toHaveBeenCalled();
      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const key = 'non-existent-key';
      const fallbackMock = jest.fn().mockResolvedValue(null);

      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (cacheService.set as jest.Mock).mockResolvedValue(undefined);

      const result = await service.get(key, fallbackMock, 3600);

      expect(cacheService.get).toHaveBeenCalledWith('enhanced', key);
      expect(result).toBeNull();
    });

    it('should delete cache key', async () => {
      const key = 'test-key';

      (cacheService.delete as jest.Mock).mockResolvedValue(undefined);

      await service.delete(key);

      expect(cacheService.delete).toHaveBeenCalledWith('enhanced', key);
    });

    it('should delete pattern', async () => {
      const pattern = 'user:*';

      await service.deletePattern(pattern);

      // 验证本地缓存清理
      expect(service.getStats().localCacheSize).toBe(0);
    });
  });

  describe('缓存击穿防护测试', () => {
    it('应该防止并发请求重复执行回调', async () => {
      const key = 'test-key';
      const fallbackMock = jest.fn().mockResolvedValue('test-data');

      // 模拟Redis缓存未命中
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (cacheService.set as jest.Mock).mockResolvedValue(undefined);

      // 并发执行多个请求
      const promises = Array.from({ length: 5 }, () => service.get(key, fallbackMock, 3600));

      const results = await Promise.all(promises);

      // 验证所有请求都返回相同结果
      results.forEach(result => {
        expect(result).toBe('test-data');
      });

      // 验证回调只被执行一次
      expect(fallbackMock).toHaveBeenCalledTimes(1);
    });

    it('应该正确处理本地缓存命中', async () => {
      const key = 'local-cache-test';
      const fallbackMock = jest.fn().mockResolvedValue('fresh-data');

      // 第一次调用，设置缓存
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (cacheService.set as jest.Mock).mockResolvedValue(undefined);

      const firstResult = await service.get(key, fallbackMock, 3600, {
        enableLocalCache: true,
        localCacheTtl: 60,
      });

      expect(firstResult).toBe('fresh-data');
      expect(fallbackMock).toHaveBeenCalledTimes(1);

      // 第二次调用，应该命中本地缓存
      const secondResult = await service.get(key, fallbackMock, 3600, {
        enableLocalCache: true,
        localCacheTtl: 60,
      });

      expect(secondResult).toBe('fresh-data');
      // 回调不应该再次执行
      expect(fallbackMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('缓存穿透防护测试', () => {
    it('应该缓存null值以防止穿透', async () => {
      const key = 'null-value-test';
      const fallbackMock = jest.fn().mockResolvedValue(null);

      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (cacheService.set as jest.Mock).mockResolvedValue(undefined);

      const result = await service.get(key, fallbackMock, 3600, {
        preventPenetration: true,
      });

      expect(result).toBeNull();
      expect(fallbackMock).toHaveBeenCalledTimes(1);

      // 验证null值被缓存（使用较短的TTL）
      expect(cacheService.set).toHaveBeenCalledWith('enhanced', key, 'null', expect.any(Number));
    });

    it('应该缓存undefined值以防止穿透', async () => {
      const key = 'undefined-value-test';
      const fallbackMock = jest.fn().mockResolvedValue(undefined);

      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (cacheService.set as jest.Mock).mockResolvedValue(undefined);

      const result = await service.get(key, fallbackMock, 3600, {
        preventPenetration: true,
      });

      expect(result).toBeUndefined();
      expect(cacheService.set).toHaveBeenCalledWith('enhanced', key, undefined, expect.any(Number));
    });
  });

  describe('缓存雪崩防护测试', () => {
    it('应该为TTL添加随机值以防止雪崩', async () => {
      const key = 'avalanche-test';
      const fallbackMock = jest.fn().mockResolvedValue('test-data');
      const baseTtl = 3600;

      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (cacheService.set as jest.Mock).mockResolvedValue(undefined);

      await service.get(key, fallbackMock, baseTtl);

      // 验证设置的TTL包含随机值
      const setCall = (cacheService.set as jest.Mock).mock.calls[0];
      const actualTtl = setCall[3]; // TTL是第4个参数

      expect(actualTtl).toBeGreaterThanOrEqual(baseTtl);
      expect(actualTtl).toBeLessThanOrEqual(baseTtl + Math.floor(baseTtl * 0.1));
    });
  });

  describe('缓存预热测试', () => {
    it('应该正确预热多个缓存键', async () => {
      const keys = [
        { key: 'key1', fallback: jest.fn().mockResolvedValue('data1') },
        { key: 'key2', fallback: jest.fn().mockResolvedValue('data2') },
        { key: 'key3', fallback: jest.fn().mockResolvedValue('data3') },
      ];

      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (cacheService.set as jest.Mock).mockResolvedValue(undefined);

      await service.warmup(keys);

      // 验证所有回调都被执行
      keys.forEach(({ fallback }) => {
        expect(fallback).toHaveBeenCalledTimes(1);
      });

      // 验证所有数据都被缓存
      expect(cacheService.set).toHaveBeenCalledTimes(3);
    });

    it('应该处理预热过程中的错误', async () => {
      const keys = [
        { key: 'key1', fallback: jest.fn().mockResolvedValue('data1') },
        { key: 'key2', fallback: jest.fn().mockRejectedValue(new Error('Fallback error')) },
        { key: 'key3', fallback: jest.fn().mockResolvedValue('data3') },
      ];

      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (cacheService.set as jest.Mock).mockResolvedValue(undefined);

      // 预热不应该抛出错误
      await expect(service.warmup(keys)).resolves.not.toThrow();

      // 验证成功的键被缓存
      expect(cacheService.set).toHaveBeenCalledWith(
        'enhanced',
        'key1',
        '"data1"',
        expect.any(Number),
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        'enhanced',
        'key3',
        '"data3"',
        expect.any(Number),
      );
    });
  });

  describe('缓存统计测试', () => {
    it('应该返回正确的缓存统计信息', async () => {
      const stats = service.getStats();

      expect(stats).toHaveProperty('localCacheSize');
      expect(stats).toHaveProperty('activeLocks');
      expect(stats).toHaveProperty('timestamp');
      expect(typeof stats.localCacheSize).toBe('number');
      expect(typeof stats.activeLocks).toBe('number');
      expect(typeof stats.timestamp).toBe('string');
    });
  });

  describe('错误处理测试', () => {
    it('应该在Redis失败时降级到回调', async () => {
      const key = 'redis-fail-test';
      const fallbackMock = jest.fn().mockResolvedValue('fallback-data');

      // 模拟Redis操作失败
      (cacheService.get as jest.Mock).mockRejectedValue(new Error('Redis connection failed'));
      (cacheService.set as jest.Mock).mockRejectedValue(new Error('Redis set failed'));

      const result = await service.get(key, fallbackMock, 3600);

      expect(result).toBe('fallback-data');
      expect(fallbackMock).toHaveBeenCalledTimes(1);
    });

    it('应该在回调失败时抛出错误', async () => {
      const key = 'callback-fail-test';
      const fallbackMock = jest.fn().mockRejectedValue(new Error('Callback failed'));

      (cacheService.get as jest.Mock).mockResolvedValue(null);

      await expect(service.get(key, fallbackMock, 3600)).rejects.toThrow('Callback failed');
    });
  });

  describe('本地缓存限制测试', () => {
    it('应该限制本地缓存大小', async () => {
      const fallbackMock = jest.fn().mockResolvedValue('test-data');
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (cacheService.set as jest.Mock).mockResolvedValue(undefined);

      // 添加超过1000个键
      for (let i = 0; i < 1005; i++) {
        await service.get(`key${i}`, fallbackMock, 3600, { enableLocalCache: true });
      }

      const stats = service.getStats();
      // 本地缓存大小应该被限制在1000
      expect(stats.localCacheSize).toBeLessThanOrEqual(1000);
    });
  });

  describe('锁机制测试', () => {
    it('应该正确管理活跃锁', async () => {
      const key = 'lock-test';
      const fallbackMock = jest
        .fn()
        .mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve('test-data'), 100)),
        );

      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (cacheService.set as jest.Mock).mockResolvedValue(undefined);

      // 启动请求但不等待完成
      const promise = service.get(key, fallbackMock, 3600);

      // 等待一小段时间确保锁已设置
      await new Promise(resolve => setTimeout(resolve, 10));

      // 检查是否有活跃锁
      const statsDuringExecution = service.getStats();
      expect(statsDuringExecution.activeLocks).toBe(1);

      // 等待请求完成
      await promise;

      // 检查锁是否被释放
      const statsAfterExecution = service.getStats();
      expect(statsAfterExecution.activeLocks).toBe(0);
    });
  });
});
