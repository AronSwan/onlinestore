"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRedisEnabled = isRedisEnabled;
exports.createRedisClient = createRedisClient;
const ioredis_1 = __importDefault(require("ioredis"));
function isRedisEnabled(configService) {
    const enabledRaw = configService?.get?.('REDIS_ENABLED') ?? process.env.REDIS_ENABLED ?? 'true';
    if (typeof enabledRaw === 'string') {
        const v = enabledRaw.toLowerCase();
        return v === 'true' || v === '1' || v === 'yes' || v === 'on';
    }
    return !!enabledRaw;
}
class NoopRedis {
    constructor() {
        this.store = new Map();
        this.ttlMap = new Map();
    }
    async get(key) {
        return this.store.has(key) ? this.store.get(key) : null;
    }
    async set(key, value, ...args) {
        let ttlMs;
        let nx = false;
        if (args && args.length >= 2) {
            for (let i = 0; i < args.length; i++) {
                const arg = args[i];
                if (typeof arg === 'string' && arg.toUpperCase() === 'PX') {
                    const next = args[i + 1];
                    if (typeof next === 'number')
                        ttlMs = next;
                }
                if (typeof arg === 'string' && arg.toUpperCase() === 'NX') {
                    nx = true;
                }
            }
        }
        if (nx && this.store.has(key)) {
            return null;
        }
        if (this.ttlMap.has(key)) {
            clearTimeout(this.ttlMap.get(key));
            this.ttlMap.delete(key);
        }
        this.store.set(key, value);
        if (ttlMs && ttlMs > 0) {
            const t = setTimeout(() => {
                this.store.delete(key);
                this.ttlMap.delete(key);
            }, ttlMs);
            this.ttlMap.set(key, t);
        }
        return 'OK';
    }
    async setex(key, ttlSeconds, value) {
        if (this.ttlMap.has(key)) {
            clearTimeout(this.ttlMap.get(key));
            this.ttlMap.delete(key);
        }
        this.store.set(key, value);
        const t = setTimeout(() => {
            this.store.delete(key);
            this.ttlMap.delete(key);
        }, ttlSeconds * 1000);
        this.ttlMap.set(key, t);
        return 'OK';
    }
    async del(...keys) {
        let count = 0;
        for (const key of keys) {
            const existed = this.store.delete(key);
            if (existed)
                count++;
            if (this.ttlMap.has(key)) {
                clearTimeout(this.ttlMap.get(key));
                this.ttlMap.delete(key);
            }
        }
        return count;
    }
    async eval(script, numKeys, ...args) {
        if (args.length >= 2 && typeof args[0] === 'string' && typeof args[1] === 'string') {
            const key = args[0];
            const requestId = args[1];
            const current = this.store.get(key);
            if (current === requestId) {
                await this.del(key);
                return 1;
            }
            return 0;
        }
        if (args.length >= 1 && typeof args[0] === 'string') {
            const pattern = args[0];
            const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
            let count = 0;
            for (const key of this.store.keys()) {
                if (regex.test(key))
                    count++;
            }
            return count;
        }
        return 0;
    }
    async ping() {
        return 'PONG';
    }
    async info(section) {
        return 'redis_version:stub\r\nconnected_clients:1\r\nused_memory_human:1K\r\nuptime_in_seconds:1';
    }
    async keys(pattern) {
        const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
        const result = [];
        for (const key of this.store.keys()) {
            if (regex.test(key))
                result.push(key);
        }
        return result;
    }
    on(event, listener) {
    }
    async quit() {
    }
    async disconnect() {
    }
    async exists(key) {
        return this.store.has(key) ? 1 : 0;
    }
}
function createRedisClient(configService, options) {
    const isDev = (configService?.get('NODE_ENV') ?? process.env.NODE_ENV) === 'development';
    const isTest = (configService?.get('NODE_ENV') ?? process.env.NODE_ENV) === 'test';
    const enabled = isRedisEnabled(configService);
    if (isDev || isTest || !enabled) {
        return new NoopRedis();
    }
    const client = new ioredis_1.default(options ?? {
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        password: configService.get('REDIS_PASSWORD'),
        db: configService.get('REDIS_DB', 0),
        connectTimeout: 3000,
        commandTimeout: 2000,
        lazyConnect: false,
        retryStrategy: times => Math.min(times * 200, 10000),
        enableOfflineQueue: true,
    });
    return client;
}
