"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
const redis_health_service_1 = require("./redis-health.service");
const environment_adapter_1 = require("../config/environment-adapter");
let RedisModule = class RedisModule {
};
exports.RedisModule = RedisModule;
exports.RedisModule = RedisModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [],
        providers: [
            redis_health_service_1.RedisHealthService,
            {
                provide: 'REDIS_CLIENT',
                useFactory: (configService) => {
                    const nodeEnv = configService.get('NODE_ENV') ?? process.env.NODE_ENV;
                    const isDev = nodeEnv === 'development';
                    const isTest = process.env.NODE_ENV === 'test';
                    const adapterRedis = environment_adapter_1.EnvironmentAdapter.getRedis();
                    const redisEnabledRaw = configService.get('REDIS_ENABLED', 'true');
                    const redisEnabled = adapterRedis.enabled;
                    if (isDev || isTest || !redisEnabled) {
                        const stub = {
                            __stub: true,
                            async get() {
                                return null;
                            },
                            async set() {
                                return 'OK';
                            },
                            async del() {
                                return 0;
                            },
                            async exists() {
                                return 0;
                            },
                            async expire() {
                                return 1;
                            },
                            async ttl() {
                                return -1;
                            },
                            async incrby() {
                                return 0;
                            },
                            async decrby() {
                                return 0;
                            },
                            async mget() {
                                return [];
                            },
                            async mset() {
                                return 'OK';
                            },
                            pipeline: () => ({
                                set: () => ({ pipeline: () => ({ exec: async () => [] }) }),
                                setex: () => ({ pipeline: () => ({ exec: async () => [] }) }),
                                exec: async () => [],
                            }),
                            keys: async () => [],
                            info: async () => 'redis_version:6.0.0',
                            quit: async () => { },
                            on: () => { },
                        };
                        try {
                            console.warn('[RedisModule] Redis disabled or non-prod stub in use');
                        }
                        catch { }
                        return stub;
                    }
                    const client = new ioredis_1.default({
                        host: adapterRedis.host ?? configService.get('REDIS_HOST', 'localhost'),
                        port: adapterRedis.port ?? configService.get('REDIS_PORT', 6379),
                        password: adapterRedis.password ?? configService.get('REDIS_PASSWORD'),
                        db: adapterRedis.db ?? configService.get('REDIS_DB', 0),
                        lazyConnect: true,
                        enableOfflineQueue: true,
                        retryStrategy: times => Math.min(times * 200, 2000),
                        maxRetriesPerRequest: 3,
                        connectTimeout: 10000,
                        commandTimeout: 5000,
                        maxLoadingRetryTime: 60000,
                    });
                    client.on('error', err => {
                        console.warn('Redis client error:', err?.message || err);
                    });
                    return client;
                },
                inject: [config_1.ConfigService],
            },
        ],
        exports: [redis_health_service_1.RedisHealthService, 'REDIS_CLIENT'],
    })
], RedisModule);
