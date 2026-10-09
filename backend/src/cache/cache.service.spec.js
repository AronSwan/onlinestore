"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const cache_service_1 = require("./cache.service");
const config_1 = require("@nestjs/config");
const monitoring_service_1 = require("../monitoring/monitoring.service");
const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
};
const mockConfigService = {
    get: jest.fn(),
};
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
    let service;
    let cache;
    let configService;
    let monitoringService;
    let consoleErrorSpy;
    beforeEach(async () => {
        jest.clearAllMocks();
        const module = await testing_1.Test.createTestingModule({
            providers: [
                cache_service_1.CacheService,
                { provide: 'CACHE_MANAGER', useValue: mockCache },
                { provide: config_1.ConfigService, useValue: mockConfigService },
                { provide: monitoring_service_1.MonitoringService, useValue: mockMonitoringService },
            ],
        }).compile();
        service = module.get(cache_service_1.CacheService);
        cache = module.get('CACHE_MANAGER');
        configService = module.get(config_1.ConfigService);
        monitoringService = module.get(monitoring_service_1.MonitoringService);
        mockConfigService.get.mockImplementation((key) => {
            const defaults = {
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
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
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
            expect(monitoringService.recordCacheHit).toHaveBeenCalledWith('caddy_shopping:products:product_detail:1');
            expect(monitoringService.observeRedisDuration).toHaveBeenCalledWith('get', expect.any(Number));
        });
        it('should return null when value does not exist', async () => {
            const module = 'products';
            const resource = 'product_detail';
            const id = '999';
            mockCache.get.mockResolvedValue(null);
            const result = await service.get(module, resource, id);
            expect(result).toBeNull();
            expect(mockCache.get).toHaveBeenCalledWith('caddy_shopping:products:product_detail:999');
            expect(monitoringService.recordCacheMiss).toHaveBeenCalledWith('caddy_shopping:products:product_detail:999');
            expect(monitoringService.observeRedisDuration).toHaveBeenCalledWith('get', expect.any(Number));
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
            expect(mockCache.set).toHaveBeenCalledWith('caddy_shopping:products:product_detail:1', value, 300000);
            expect(monitoringService.incrementCacheSet).toHaveBeenCalledWith('product_detail');
            expect(monitoringService.observeRedisDuration).toHaveBeenCalledWith('set', expect.any(Number));
        });
        it('should set value in cache with custom TTL', async () => {
            const module = 'products';
            const resource = 'product_detail';
            const id = '1';
            const value = { id: 1, name: 'Test Product' };
            const options = { ttl: 600 };
            mockCache.set.mockResolvedValue(undefined);
            await service.set(module, resource, value, id, options);
            expect(mockCache.set).toHaveBeenCalledWith('caddy_shopping:products:product_detail:1', value, 600000);
            expect(monitoringService.incrementCacheSet).toHaveBeenCalledWith('product_detail');
        });
        it('should set value in cache without ID', async () => {
            const module = 'products';
            const resource = 'popular_products';
            const value = [{ id: 1, name: 'Product 1' }];
            mockCache.set.mockResolvedValue(undefined);
            await service.set(module, resource, value);
            expect(mockCache.set).toHaveBeenCalledWith('caddy_shopping:products:popular_products', value, 600000);
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
            await service.deleteByPattern(pattern);
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
            expect(mockCache.set).toHaveBeenCalledWith('caddy_shopping:products:product_detail:1', data[0], 300000);
            expect(mockCache.set).toHaveBeenCalledWith('caddy_shopping:products:product_detail:2', data[1], 300000);
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
                { resource: 'product_detail', expectedTtl: 300000 },
                { resource: 'popular_products', expectedTtl: 600000 },
                { resource: 'product_list', expectedTtl: 30000 },
                { resource: 'unknown_resource', expectedTtl: 300000 },
            ];
            for (const testCase of testCases) {
                const value = { id: 1, name: 'Test' };
                mockCache.set.mockResolvedValue(undefined);
                await service.set('test', testCase.resource, value, '1');
                expect(mockCache.set).toHaveBeenCalledWith(`caddy_shopping:test:${testCase.resource}:1`, value, testCase.expectedTtl);
            }
        });
    });
    describe('R1 TTL Unit (cache-manager v7 milliseconds)', () => {
        it('converts caller seconds to milliseconds at the cache-manager boundary', async () => {
            mockCache.set.mockResolvedValue(undefined);
            await service.set('search', 'suggestions', [{ text: 'a' }], 'query', { ttl: 300 });
            expect(mockCache.set).toHaveBeenCalledWith('caddy_shopping:search:suggestions:query', [{ text: 'a' }], 300000);
        });
        it('converts long-horizon second TTLs (7d/30d) without overflow or pass-through', async () => {
            mockCache.set.mockResolvedValue(undefined);
            await service.set('search', 'zero_results', {}, 'q', { ttl: 604800 });
            expect(mockCache.set).toHaveBeenCalledWith('caddy_shopping:search:zero_results:q', {}, 604800000);
            await service.set('search', 'records', {}, 'k', { ttl: 86400 * 30 });
            expect(mockCache.set).toHaveBeenCalledWith('caddy_shopping:search:records:k', {}, 2592000000);
        });
    });
    describe('Integration Scenarios', () => {
        it('should handle complete cache workflow', async () => {
            const module = 'products';
            const resource = 'product_detail';
            const id = '1';
            const value = { id: 1, name: 'Test Product' };
            mockCache.set.mockResolvedValue(undefined);
            await service.set(module, resource, value, id);
            mockCache.get.mockResolvedValue(value);
            const getResult = await service.get(module, resource, id);
            expect(getResult).toEqual(value);
            mockCache.del.mockResolvedValue(undefined);
            await service.delete(module, resource, id);
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
            mockCache.set.mockResolvedValue(undefined);
            await service.set(module, resource, value, id);
            expect(monitoringService.incrementCacheSet).toHaveBeenCalledWith('product_detail');
            expect(monitoringService.observeRedisDuration).toHaveBeenCalledWith('set', expect.any(Number));
            mockCache.get.mockResolvedValue(value);
            await service.get(module, resource, id);
            expect(monitoringService.recordCacheHit).toHaveBeenCalledWith('caddy_shopping:products:product_detail:1');
            expect(monitoringService.observeRedisDuration).toHaveBeenCalledWith('get', expect.any(Number));
            mockCache.get.mockResolvedValue(null);
            await service.get(module, resource, 'miss-id');
            expect(monitoringService.recordCacheMiss).toHaveBeenCalledWith('caddy_shopping:products:product_detail:miss-id');
            mockCache.del.mockResolvedValue(undefined);
            await service.delete(module, resource, id);
            expect(monitoringService.incrementCacheDelete).toHaveBeenCalledWith('product_detail');
        });
    });
});
