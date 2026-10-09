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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const config_1 = require("@nestjs/config");
const monitoring_service_1 = require("../monitoring/monitoring.service");
let CacheService = class CacheService {
    constructor(cacheManager, configService, monitoring) {
        this.cacheManager = cacheManager;
        this.configService = configService;
        this.monitoring = monitoring;
        this.keyPrefix = this.configService.get('redis.keyPrefix') || 'caddy_shopping';
    }
    generateKey(module, resource, id) {
        const parts = [this.keyPrefix, module, resource];
        if (id)
            parts.push(id.toString());
        return parts.join(':');
    }
    async get(module, resource, id) {
        const key = this.generateKey(module, resource, id);
        const start = process.hrtime.bigint();
        try {
            const value = await this.cacheManager.get(key);
            const end = process.hrtime.bigint();
            const duration = Number(end - start) / 1_000_000_000;
            this.monitoring.observeRedisDuration('get', duration);
            if (value !== null && value !== undefined) {
                this.monitoring.recordCacheHit(key);
                return value;
            }
            this.monitoring.recordCacheMiss(key);
            return null;
        }
        catch (error) {
            this.monitoring.incrementCacheError('get');
            console.error('Cache get error:', error);
            return null;
        }
    }
    async set(module, resource, value, id, options = {}) {
        const key = this.generateKey(module, resource, id);
        const ttl = options.ttl || this.getDefaultTtl(resource);
        const start = process.hrtime.bigint();
        try {
            await this.cacheManager.set(key, value, ttl * 1000);
            const end = process.hrtime.bigint();
            const duration = Number(end - start) / 1_000_000_000;
            this.monitoring.observeRedisDuration('set', duration);
            this.monitoring.incrementCacheSet(resource);
        }
        catch (error) {
            this.monitoring.incrementCacheError('set');
            console.error('Cache set error:', error);
        }
    }
    async delete(module, resource, id) {
        const key = this.generateKey(module, resource, id);
        try {
            await this.cacheManager.del(key);
            this.monitoring.incrementCacheDelete(resource);
        }
        catch (error) {
            this.monitoring.incrementCacheError('delete');
            console.error('Cache delete error:', error);
        }
    }
    async deleteByPattern(pattern) {
        try {
            console.warn('Pattern-based deletion not fully implemented');
        }
        catch (error) {
            this.monitoring.incrementCacheError('delete_pattern');
            console.error('Cache delete pattern error:', error);
        }
    }
    getDefaultTtl(resource) {
        const cacheConfig = this.configService.get('cache.ttl') || {};
        switch (resource) {
            case 'product_detail':
                return cacheConfig.detail || 300;
            case 'popular_products':
                return cacheConfig.popular || 600;
            case 'product_list':
                return cacheConfig.list || 30;
            default:
                return 300;
        }
    }
    async warmup(module, resource, data) {
        const promises = data.map((item, index) => this.set(module, resource, item, item.id || index));
        await Promise.allSettled(promises);
    }
    getStats() {
        return {
            keyPrefix: this.keyPrefix,
        };
    }
};
exports.CacheService = CacheService;
exports.CacheService = CacheService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [Object, config_1.ConfigService,
        monitoring_service_1.MonitoringService])
], CacheService);
