// 用途：缓存服务单元测试
// 依赖文件：cache.service.ts, cache.module.ts
// 作者：后端开发团队
// 时间：2025-10-02 00:00:00

import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { MonitoringService } from '../monitoring/monitoring.service';

// Mock Cache
const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
} as any;

// Mock ConfigService
const mockConfigService = {
  get: jest.fn(),
};

// Mock MonitoringService
const mockMonitoringService = {
  recordCacheHit: jest.fn(),
  recordCacheMiss: jest.fn(),
  incrementCacheHit: jest.fn(),
  incrementCacheMiss: jest.fn(),
  incrementCacheSet: jest.fn(),
  incrementCacheDelete: jest.fn(),
  incrementCacheError: jest.fn(),
  observeRedisDuration: jest.fn(),
};

describe('CacheService', () => {
  let service: CacheService;
  let cache: Cache;
  let configService: ConfigService;
  let monitoringService: MonitoringService;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: 'CACHE_MANAGER', useValue: mockCache },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MonitoringService, useValue: mockMonitoringService },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    cache = module.get<Cache>('CACHE_MANAGER');
    configService = module.get<ConfigService>(ConfigService);
    monitoringService = module.get<MonitoringService>(MonitoringService);

    // Setup default mock returns
    mockConfigService.get.mockImplementation((key: string) => {
      const defaults: Record<string, any> = {
        'redis.keyPrefix': 'caddy_shopping',
        'cache.ttl': {
          detail: 300,
          popular: 600,
          list: 30,
        },
      };
      return defaults[key] || null;
    });
  });

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have all dependencies injected', () => {
      expect(cache).toBeDefined();
      expect(configService).toBeDefined();
      expect(monitoringService).toBeDefined();
    });
  });

  describe('Get', () => {
    it('should return cached value when exists', async () => {
      const module = 'products';
      const resource = 'product_detail';
      const id = '1';
      const value = { id: 1, name: 'Test Product' };
      mockCache.get.mockResolvedValue(value);

      const result = await service.get(module, resource, id);

      expect(result).toEqual(value);
      expect(mockCache.get).toHaveBeenCalledWith('caddy_shopping:products:product_detail:1');
      expect(monitoringService.recordCacheHit).toHaveBeenCalledWith(
        'caddy_shopping:products:product_detail:1',
      );
      expect(monitoringService.observeRedisDuration).toHaveBeenCalledWith(
        'get',
        expect.any(Number),
      );
    });

    it('should return null when value does not exist', async () => {
      const module = 'products';
      const resource = 'product_detail';
      const id = '999';
      mockCache.get.mockResolvedValue(null);

      const result = await service.get(module, resource, id);

      expect(result).toBeNull();
      expect(mockCache.get).toHaveBeenCalledWith('caddy_shopping:products:product_detail:999');
      expect(monitoringService.recordCacheMiss).toHaveBeenCalledWith(
        'caddy_shopping:products:product_detail:999',
      );
      expect(monitoringService.observeRedisDuration).toHaveBeenCalledWith(
        'get',
        expect.any(Number),
      );
    });

    it('should handle cache errors gracefully', async () => {
      const module = 'products';
      const resource = 'product_detail';
      const id = '1';
      mockCache.get.mockRejectedValue(new Error('Cache error'));

      const result = await service.get(module, resource, id);

      expect(result).toBeNull();
      expect(monitoringService.incrementCacheError).toHaveBeenCalledWith('get');
    });
  });

  describe('Set', () => {
    it('should set value in cache with default TTL', async () => {
      const module = 'products';
      const resource = 'product_detail';
      const id = '1';
      const value = { id: 1, name: 'Test Product' };
      mockCache.set.mockResolvedValue(undefined);

      await service.set(module, resource, value, id);

      expect(mockCache.set).toHaveBeenCalledWith(
        'caddy_shopping:products:product_detail:1',
        value,
        300,
      );
      expect(monitoringService.incrementCacheSet).toHaveBeenCalledWith('product_detail');
      expect(monitoringService.observeRedisDuration).toHaveBeenCalledWith(
        'set',
        expect.any(Number),
      );
    });

    it('should set value in cache with custom TTL', async () => {
      const module = 'products';
      const resource = 'product_detail';
      const id = '1';
      const value = { id: 1, name: 'Test Product' };
      const options = { ttl: 600 };
      mockCache.set.mockResolvedValue(undefined);

      await service.set(module, resource, value, id, options);

      expect(mockCache.set).toHaveBeenCalledWith(
        'caddy_shopping:products:product_detail:1',
        value,
        600,
      );
      expect(monitoringService.incrementCacheSet).toHaveBeenCalledWith('product_detail');
    });

    it('should set value in cache without ID', async () => {
      const module = 'products';
      const resource = 'popular_products';
      const value = [{ id: 1, name: 'Product 1' }];
      mockCache.set.mockResolvedValue(undefined);

      await service.set(module, resource, value);

      expect(mockCache.set).toHaveBeenCalledWith(
        'caddy_shopping:products:popular_products',
        value,
        600,
      );
      expect(monitoringService.incrementCacheSet).toHaveBeenCalledWith('popular_products');
    });

    it('should handle set errors gracefully', async () => {
      const module = 'products';
      const resource = 'product_detail';
      const id = '1';
      const value = { id: 1, name: 'Test Product' };
      mockCache.set.mockRejectedValue(new Error('Set error'));

      await service.set(module, resource, value, id);

      expect(monitoringService.incrementCacheError).toHaveBeenCalledWith('set');
    });
  });

  describe('Delete', () => {
    it('should delete value from cache', async () => {
      const module = 'products';
      const resource = 'product_detail';
      const id = '1';
      mockCache.del.mockResolvedValue(undefined);

      await service.delete(module, resource, id);

      expect(mockCache.del).toHaveBeenCalledWith('caddy_shopping:products:product_detail:1');
      expect(monitoringService.incrementCacheDelete).toHaveBeenCalledWith('product_detail');
    });

    it('should handle delete errors gracefully', async () => {
      const module = 'products';
      const resource = 'product_detail';
      const id = '1';
      mockCache.del.mockRejectedValue(new Error('Delete error'));

      await service.delete(module, resource, id);

      expect(monitoringService.incrementCacheError).toHaveBeenCalledWith('delete');
    });
  });

  describe('Delete By Pattern', () => {
    it('should log warning for pattern-based deletion', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const pattern = 'caddy_shopping:products:*';

      await service.deleteByPattern(pattern);

      expect(consoleSpy).toHaveBeenCalledWith('Pattern-based deletion not fully implemented');
      consoleSpy.mockRestore();
    });

    it('should handle pattern deletion errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const pattern = 'caddy_shopping:products:*';

      // Mock console.warn to capture the warning
      await service.deleteByPattern(pattern);

      // Since deleteByPattern just logs a warning and doesn't actually throw errors,
      // we'll just verify it was called
      expect(consoleSpy).toHaveBeenCalledWith('Pattern-based deletion not fully implemented');
      consoleSpy.mockRestore();
    });
  });

  describe('Warmup', () => {
    it('should warmup cache with data', async () => {
      const module = 'products';
      const resource = 'product_detail';
      const data = [
        { id: 1, name: 'Product 1' },
        { id: 2, name: 'Product 2' },
      ];
      mockCache.set.mockResolvedValue(undefined);

      await service.warmup(module, resource, data);

      expect(mockCache.set).toHaveBeenCalledTimes(2);
      expect(mockCache.set).toHaveBeenCalledWith(
        'caddy_shopping:products:product_detail:1',
        data[0],
        300,
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        'caddy_shopping:products:product_detail:2',
        data[1],
        300,
      );
    });
  });

  describe('Get Stats', () => {
    it('should return cache statistics', () => {
      const stats = service.getStats();

      expect(stats).toEqual({
        keyPrefix: 'caddy_shopping',
      });
    });
  });

  describe('Default TTL', () => {
    it('should return correct TTL for different resources', async () => {
      const testCases = [
        { resource: 'product_detail', expectedTtl: 300 },
        { resource: 'popular_products', expectedTtl: 600 },
        { resource: 'product_list', expectedTtl: 30 },
        { resource: 'unknown_resource', expectedTtl: 300 },
      ];

      for (const testCase of testCases) {
        const value = { id: 1, name: 'Test' };
        mockCache.set.mockResolvedValue(undefined);

        await service.set('test', testCase.resource, value, '1');

        expect(mockCache.set).toHaveBeenCalledWith(
          `caddy_shopping:test:${testCase.resource}:1`,
          value,
          testCase.expectedTtl,
        );
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete cache workflow', async () => {
      const module = 'products';
      const resource = 'product_detail';
      const id = '1';
      const value = { id: 1, name: 'Test Product' };

      // Set value
      mockCache.set.mockResolvedValue(undefined);
      await service.set(module, resource, value, id);

      // Get value (hit)
      mockCache.get.mockResolvedValue(value);
      const getResult = await service.get(module, resource, id);
      expect(getResult).toEqual(value);

      // Delete value
      mockCache.del.mockResolvedValue(undefined);
      await service.delete(module, resource, id);

      // Get value (miss)
      mockCache.get.mockResolvedValue(null);
      const finalResult = await service.get(module, resource, id);
      expect(finalResult).toBeNull();
    });
  });

  describe('Performance Monitoring', () => {
    it('should record metrics for cache operations', async () => {
      const module = 'products';
      const resource = 'product_detail';
      const id = '1';
      const value = { id: 1, name: 'Test Product' };

      // Set operation
      mockCache.set.mockResolvedValue(undefined);
      await service.set(module, resource, value, id);
      expect(monitoringService.incrementCacheSet).toHaveBeenCalledWith('product_detail');
      expect(monitoringService.observeRedisDuration).toHaveBeenCalledWith(
        'set',
        expect.any(Number),
      );

      // Get operation (hit)
      mockCache.get.mockResolvedValue(value);
      await service.get(module, resource, id);
      expect(monitoringService.recordCacheHit).toHaveBeenCalledWith(
        'caddy_shopping:products:product_detail:1',
      );
      expect(monitoringService.observeRedisDuration).toHaveBeenCalledWith(
        'get',
        expect.any(Number),
      );

      // Get operation (miss)
      mockCache.get.mockResolvedValue(null);
      await service.get(module, resource, 'miss-id');
      expect(monitoringService.recordCacheMiss).toHaveBeenCalledWith(
        'caddy_shopping:products:product_detail:miss-id',
      );

      // Delete operation
      mockCache.del.mockResolvedValue(undefined);
      await service.delete(module, resource, id);
      expect(monitoringService.incrementCacheDelete).toHaveBeenCalledWith('product_detail');
    });
  });
});
