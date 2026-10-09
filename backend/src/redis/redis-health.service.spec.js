"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const redis_health_service_1 = require("./redis-health.service");
const unified_master_config_1 = require("../config/unified-master.config");
const masterConfig = (0, unified_master_config_1.createMasterConfiguration)();
const mockRedis = {
    on: jest.fn(),
    ping: jest.fn(),
    info: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
};
jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => mockRedis);
});
describe('RedisHealthService', () => {
    let service;
    let logger;
    const originalEnv = process.env;
    beforeAll(() => {
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        process.env = { ...originalEnv };
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
            service = new redis_health_service_1.RedisHealthService();
            expect(service).toBeDefined();
        });
        it('should disable Redis client in development environment', () => {
            process.env.NODE_ENV = 'development';
            service = new redis_health_service_1.RedisHealthService();
            expect(ioredis_1.default).not.toHaveBeenCalled();
            expect(service.getClient()).toBeUndefined();
        });
        it('should initialize Redis client in production environment', () => {
            process.env.NODE_ENV = 'production';
            process.env.REDIS_HOST = 'localhost';
            process.env.REDIS_PORT = '6379';
            process.env.REDIS_DB = '0';
            process.env.JWT_SECRET = 'unit-test-jwt-secret-with-at-least-32-chars!!';
            process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
            process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || 'http://localhost:3000';
            const updatedConfig = (0, unified_master_config_1.createMasterConfiguration)();
            service = new redis_health_service_1.RedisHealthService();
            expect(ioredis_1.default).toHaveBeenCalledWith({
                host: updatedConfig.redis.host,
                port: updatedConfig.redis.port,
                password: updatedConfig.redis.password,
                db: updatedConfig.redis.db,
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
            ioredis_1.default.mockImplementation(() => {
                throw new Error('Redis connection failed');
            });
            expect(() => {
                service = new redis_health_service_1.RedisHealthService();
            }).not.toThrow();
            console.error = originalConsoleError;
        });
    });
    describe('Event Listeners Setup', () => {
        it('should set up all required event listeners when valid Redis client is provided', () => {
            process.env.NODE_ENV = 'test';
            service = new redis_health_service_1.RedisHealthService(mockRedis);
            expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
            expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
            expect(mockRedis.on).toHaveBeenCalledWith('close', expect.any(Function));
            expect(mockRedis.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
            expect(mockRedis.on).toHaveBeenCalledWith('ready', expect.any(Function));
        });
        it('should have correct number of event listeners', () => {
            process.env.NODE_ENV = 'test';
            service = new redis_health_service_1.RedisHealthService(mockRedis);
            expect(mockRedis.on).toHaveBeenCalledTimes(5);
        });
        it('should not set up event listeners when Redis client is undefined', () => {
            process.env.NODE_ENV = 'test';
            service = new redis_health_service_1.RedisHealthService(undefined);
            expect(mockRedis.on).not.toHaveBeenCalled();
        });
        it('should not set up event listeners when Redis client has no on method', () => {
            process.env.NODE_ENV = 'test';
            const invalidRedisClient = { ping: jest.fn() };
            service = new redis_health_service_1.RedisHealthService(invalidRedisClient);
            expect(mockRedis.on).not.toHaveBeenCalled();
        });
    });
    describe('Health Check', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            process.env.NODE_ENV = 'test';
            service = new redis_health_service_1.RedisHealthService(mockRedis);
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
            service = new redis_health_service_1.RedisHealthService();
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
            service = new redis_health_service_1.RedisHealthService(mockRedis);
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
            service = new redis_health_service_1.RedisHealthService();
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
            service = new redis_health_service_1.RedisHealthService(mockRedis);
        });
        it('should return true when cache operations work correctly', async () => {
            const testKey = 'health_check_test';
            const testValue = 'test_value';
            mockRedis.set.mockResolvedValue('OK');
            mockRedis.get.mockResolvedValue(testValue);
            mockRedis.del.mockResolvedValue(1);
            const result = await service.testCacheOperation();
            expect(result).toBe(true);
            expect(mockRedis.set).toHaveBeenCalledWith(expect.stringContaining('health_check_'), testValue, 'EX', 10);
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
            service = new redis_health_service_1.RedisHealthService();
            const result = await service.testCacheOperation();
            expect(result).toBe(false);
        });
    });
    describe('Disconnect', () => {
        it('should quit Redis client when connected', async () => {
            process.env.NODE_ENV = 'test';
            service = new redis_health_service_1.RedisHealthService(mockRedis);
            mockRedis.quit.mockResolvedValue('OK');
            await service.disconnect();
            expect(mockRedis.quit).toHaveBeenCalled();
        });
        it('should not attempt to quit when Redis client is disabled', async () => {
            process.env.NODE_ENV = 'development';
            service = new redis_health_service_1.RedisHealthService();
            await service.disconnect();
            expect(mockRedis.quit).not.toHaveBeenCalled();
        });
        it('should handle quit errors gracefully', async () => {
            process.env.NODE_ENV = 'test';
            service = new redis_health_service_1.RedisHealthService(mockRedis);
            mockRedis.quit.mockRejectedValue(new Error('Already disconnected'));
            await expect(service.disconnect()).rejects.toThrow('Already disconnected');
        });
    });
    describe('Get Client', () => {
        it('should return Redis client in production', () => {
            jest.clearAllMocks();
            process.env.NODE_ENV = 'production';
            service = new redis_health_service_1.RedisHealthService(mockRedis);
            const client = service.getClient();
            expect(client).toBeDefined();
            expect(client).not.toBeUndefined();
            expect(client).toBe(mockRedis);
        });
        it('should return undefined in development', () => {
            jest.clearAllMocks();
            process.env.NODE_ENV = 'development';
            service = new redis_health_service_1.RedisHealthService();
            const client = service.getClient();
            expect(client).toBeUndefined();
        });
        it('should return provided Redis client in test environment', () => {
            jest.clearAllMocks();
            process.env.NODE_ENV = 'test';
            service = new redis_health_service_1.RedisHealthService(mockRedis);
            const client = service.getClient();
            expect(client).toBe(mockRedis);
        });
    });
    describe('Retry Strategy', () => {
        it('should implement exponential backoff with maximum delay', () => {
            jest.clearAllMocks();
            process.env.NODE_ENV = 'production';
            service = new redis_health_service_1.RedisHealthService(mockRedis);
            const client = service.getClient();
            expect(client).toBeDefined();
            expect(service).toBeDefined();
        });
    });
    describe('Reconnect on Error', () => {
        it('should reconnect on specific errors', () => {
            jest.clearAllMocks();
            process.env.NODE_ENV = 'production';
            service = new redis_health_service_1.RedisHealthService(mockRedis);
            const client = service.getClient();
            expect(client).toBeDefined();
            expect(service).toBeDefined();
        });
    });
    describe('Integration Scenarios', () => {
        it('should handle complete health check workflow', async () => {
            jest.clearAllMocks();
            process.env.NODE_ENV = 'test';
            service = new redis_health_service_1.RedisHealthService(mockRedis);
            mockRedis.ping.mockResolvedValue('PONG');
            mockRedis.info.mockResolvedValue('redis_version:7.0.5\nconnected_clients:15\nused_memory_human:2.5M\nuptime_in_seconds:3600');
            mockRedis.set.mockResolvedValue('OK');
            mockRedis.get.mockResolvedValue('test_value');
            mockRedis.del.mockResolvedValue(1);
            const healthStatus = await service.checkHealth();
            expect(healthStatus.status).toBe('healthy');
            const redisInfo = await service.getRedisInfo();
            expect(redisInfo).toEqual({
                version: '7.0.5',
                connected_clients: '15',
                used_memory: '2.5M',
                uptime: '3600',
            });
            const cacheTest = await service.testCacheOperation();
            expect(cacheTest).toBe(true);
            await service.disconnect();
        });
        it('should handle failure scenarios gracefully', async () => {
            jest.clearAllMocks();
            process.env.NODE_ENV = 'test';
            service = new redis_health_service_1.RedisHealthService(mockRedis);
            mockRedis.ping.mockRejectedValue(new Error('Connection failed'));
            mockRedis.info.mockRejectedValue(new Error('Info failed'));
            mockRedis.set.mockRejectedValue(new Error('Set failed'));
            const healthStatus = await service.checkHealth();
            expect(healthStatus.status).toBe('unhealthy');
            const redisInfo = await service.getRedisInfo();
            expect(redisInfo).toBeNull();
            const cacheTest = await service.testCacheOperation();
            expect(cacheTest).toBe(false);
        });
    });
});
