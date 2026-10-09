"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RedisHealthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisHealthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
const unified_master_config_1 = require("../config/unified-master.config");
let RedisHealthService = RedisHealthService_1 = class RedisHealthService {
    constructor(redisClient, configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(RedisHealthService_1.name);
        this.stubMode = false;
        const isTest = process.env.NODE_ENV === 'test';
        const enabledRaw = this.configService?.get?.('REDIS_ENABLED') ?? process.env.REDIS_ENABLED ?? 'true';
        const redisEnabled = typeof enabledRaw === 'string'
            ? ['true', '1', 'yes', 'on'].includes(enabledRaw.toLowerCase())
            : !!enabledRaw;
        if (isTest && redisClient !== undefined) {
            this.redisClient = redisClient;
            this.setupEventListeners();
            return;
        }
        if (redisClient !== undefined) {
            this.redisClient = redisClient;
            if (this.redisClient?.__stub === true) {
                this.stubMode = true;
            }
            this.setupEventListeners();
        }
        else {
            const isDev = process.env.NODE_ENV === 'development';
            if (isDev || isTest || !redisEnabled) {
                this.redisClient = this.createStubClient();
                this.stubMode = true;
                const reason = !redisEnabled
                    ? 'Redis disabled via REDIS_ENABLED'
                    : isTest
                        ? 'Test environment'
                        : 'Development environment';
                this.logger.warn(`${reason}: Redis client is using stub.`);
                this.setupEventListeners();
            }
            else {
                this.initializeRedisClient();
            }
        }
    }
    initializeRedisClient() {
        try {
            if (this.redisClient !== undefined) {
                return;
            }
            const isDev = process.env.NODE_ENV === 'development';
            const isTest = process.env.NODE_ENV === 'test';
            const enabledRaw = this.configService?.get?.('REDIS_ENABLED') ??
                process.env.REDIS_ENABLED ??
                'true';
            const redisEnabled = typeof enabledRaw === 'string'
                ? ['true', '1', 'yes', 'on'].includes(enabledRaw.toLowerCase())
                : !!enabledRaw;
            if (isDev || isTest || !redisEnabled) {
                this.redisClient = this.createStubClient();
                this.stubMode = true;
                const reason = !redisEnabled
                    ? 'Redis disabled via REDIS_ENABLED'
                    : isTest
                        ? 'Test environment'
                        : 'Development environment';
                this.logger.warn(`${reason}: Redis client is using stub.`);
                this.setupEventListeners();
                return;
            }
            const master = (0, unified_master_config_1.createMasterConfiguration)?.();
            const host = this.configService?.get('REDIS_HOST') ?? master?.redis?.host ?? 'localhost';
            const port = this.configService?.get('REDIS_PORT') ?? master?.redis?.port ?? 6379;
            const password = this.configService?.get('REDIS_PASSWORD') ?? master?.redis?.password ?? undefined;
            const db = this.configService?.get('REDIS_DB') ?? master?.redis?.db ?? 0;
            this.redisClient = new ioredis_1.default({
                host,
                port,
                password,
                db,
                connectTimeout: 3000,
                commandTimeout: 2000,
                lazyConnect: false,
                retryStrategy: times => {
                    const delay = Math.min(times * 200, 10000);
                    return delay;
                },
                enableOfflineQueue: true,
                reconnectOnError: err => {
                    const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET'];
                    return targetErrors.some(code => err.message.includes(code));
                },
            });
            this.setupEventListeners();
        }
        catch (error) {
            this.logger.error('Failed to initialize Redis client', error);
        }
    }
    createStubClient() {
        const store = new Map();
        const ttlMap = new Map();
        return {
            async get(key) {
                return store.has(key) ? store.get(key) : null;
            },
            async set(key, value) {
                if (ttlMap.has(key)) {
                    clearTimeout(ttlMap.get(key));
                    ttlMap.delete(key);
                }
                store.set(key, value);
                return 'OK';
            },
            async del(key) {
                return store.delete(key) ? 1 : 0;
            },
            async ping() {
                return 'PONG';
            },
            async info() {
                return 'redis_version:stub\r\nconnected_clients:1\r\nused_memory_human:1K\r\nuptime_in_seconds:1';
            },
            on() {
            },
            quit: async () => { },
        };
    }
    setupEventListeners() {
        if (!this.redisClient || typeof this.redisClient.on !== 'function')
            return;
        this.redisClient.on('connect', () => {
            this.logger.log('Redis client connected successfully');
        });
        this.redisClient.on('error', error => {
            this.logger.error('Redis client error', error);
        });
        this.redisClient.on('close', () => {
            this.logger.warn('Redis client connection closed');
        });
        this.redisClient.on('reconnecting', () => {
            this.logger.log('Redis client reconnecting...');
        });
        this.redisClient.on('ready', () => {
            this.logger.log('Redis client is ready');
        });
    }
    async checkHealth() {
        if (this.stubMode) {
            return { status: 'unhealthy', error: 'Redis client disabled in development or test' };
        }
        if (!this.redisClient || typeof this.redisClient.ping !== 'function') {
            return { status: 'unhealthy', error: 'Redis client disabled in development or test' };
        }
        try {
            const startTime = Date.now();
            await this.redisClient.ping();
            const latency = Date.now() - startTime;
            return {
                status: 'healthy',
                latency,
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
            };
        }
    }
    async getRedisInfo() {
        if (this.stubMode) {
            return null;
        }
        if (!this.redisClient || typeof this.redisClient.info !== 'function') {
            return null;
        }
        try {
            const info = await this.redisClient.info();
            return {
                version: info.match(/redis_version:(.*)/)?.[1]?.trim(),
                connected_clients: info.match(/connected_clients:(.*)/)?.[1]?.trim(),
                used_memory: info.match(/used_memory_human:(.*)/)?.[1]?.trim(),
                uptime: info.match(/uptime_in_seconds:(.*)/)?.[1]?.trim(),
            };
        }
        catch (error) {
            this.logger.error('Failed to get Redis info', error);
            return null;
        }
    }
    async testCacheOperation() {
        if (this.stubMode) {
            return false;
        }
        if (!this.redisClient ||
            typeof this.redisClient.set !== 'function' ||
            typeof this.redisClient.get !== 'function' ||
            typeof this.redisClient.del !== 'function') {
            return false;
        }
        try {
            const testKey = 'health_check_' + Date.now();
            const testValue = 'test_value';
            await this.redisClient.set(testKey, testValue, 'EX', 10);
            const retrievedValue = await this.redisClient.get(testKey);
            await this.redisClient.del(testKey);
            return retrievedValue === testValue;
        }
        catch (error) {
            this.logger.error('Cache operation test failed', error);
            return false;
        }
    }
    async disconnect() {
        if (this.stubMode) {
            return;
        }
        if (this.redisClient && typeof this.redisClient.quit === 'function') {
            await this.redisClient.quit();
            this.logger.log('Redis client disconnected');
        }
    }
    getClient() {
        if (this.stubMode) {
            return undefined;
        }
        return this.redisClient;
    }
};
exports.RedisHealthService = RedisHealthService;
exports.RedisHealthService = RedisHealthService = RedisHealthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)('REDIS_CLIENT')),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [ioredis_1.default,
        config_1.ConfigService])
], RedisHealthService);
