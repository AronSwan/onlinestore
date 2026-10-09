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
var SearchManagerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchManagerService = exports.SearchEngine = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const meilisearch_service_1 = require("./meilisearch.service");
const zincsearch_service_1 = require("./zincsearch.service");
var SearchEngine;
(function (SearchEngine) {
    SearchEngine["MEILISEARCH"] = "meilisearch";
    SearchEngine["ZINCSEARCH"] = "zincsearch";
})(SearchEngine || (exports.SearchEngine = SearchEngine = {}));
let SearchManagerService = SearchManagerService_1 = class SearchManagerService {
    isSearchEnabled() {
        const env = process.env.SEARCH_ENABLED;
        return env === undefined ? true : env !== 'false';
    }
    constructor(configService, meiliSearchService, zincSearchService) {
        this.configService = configService;
        this.meiliSearchService = meiliSearchService;
        this.zincSearchService = zincSearchService;
        this.logger = new common_1.Logger(SearchManagerService_1.name);
        this.strategies = new Map();
        this.currentStrategy = SearchEngine.MEILISEARCH;
        this.fallbackStrategy = SearchEngine.ZINCSEARCH;
        this.isInitialized = false;
        this.strategies.set(SearchEngine.MEILISEARCH, meiliSearchService);
        this.strategies.set(SearchEngine.ZINCSEARCH, zincSearchService);
    }
    async onModuleInit() {
        if (!this.isSearchEnabled()) {
            this.logger.log('搜索服务已禁用（SEARCH_ENABLED=false），跳过初始化与健康监控');
            this.isInitialized = true;
            return;
        }
        await this.initialize();
        this.startHealthMonitoring();
    }
    async initialize() {
        try {
            this.logger.log('开始初始化搜索服务管理器...');
            if (!this.isSearchEnabled()) {
                this.logger.log('搜索服务禁用，跳过搜索引擎健康检查与设置初始化');
                this.isInitialized = true;
                return;
            }
            const primaryHealthy = await this.meiliSearchService.healthCheck();
            if (primaryHealthy) {
                this.currentStrategy = SearchEngine.MEILISEARCH;
                this.fallbackStrategy = SearchEngine.ZINCSEARCH;
                this.logger.log(`首选搜索引擎: ${this.currentStrategy}`);
                try {
                    if (typeof this.meiliSearchService['initializeIndexSettings'] === 'function') {
                        await this.meiliSearchService['initializeIndexSettings']();
                    }
                }
                catch (error) {
                    this.logger.warn('MeiliSearch索引设置初始化失败，但服务仍可用');
                }
            }
            else {
                const fallbackHealthy = await this.zincSearchService.healthCheck();
                if (fallbackHealthy) {
                    this.currentStrategy = SearchEngine.ZINCSEARCH;
                    this.fallbackStrategy = SearchEngine.MEILISEARCH;
                    this.logger.log(`切换到备用搜索引擎: ${this.currentStrategy}`);
                    try {
                        if (typeof this.zincSearchService['createIndexMapping'] === 'function') {
                            await this.zincSearchService['createIndexMapping']();
                        }
                    }
                    catch (error) {
                        this.logger.warn('ZincSearch索引映射创建失败，但服务仍可用');
                    }
                }
                else {
                    this.logger.warn('所有搜索引擎服务都不可用，搜索服务降级运行，等待健康监控自动恢复');
                }
            }
            this.isInitialized = true;
            this.logger.log('搜索服务管理器初始化完成');
        }
        catch (error) {
            this.logger.warn('搜索服务管理器初始化失败，搜索服务降级运行', error);
        }
    }
    startHealthMonitoring() {
        if (!this.isSearchEnabled()) {
            this.logger.log('搜索服务禁用，未启动健康检查监控');
            return;
        }
        const interval = this.configService.get('search.healthCheckInterval') || 30000;
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthCheck();
        }, interval);
        this.logger.log(`健康检查监控已启动，间隔: ${interval}ms`);
    }
    async performHealthCheck() {
        try {
            const currentStrategy = this.strategies.get(this.currentStrategy);
            if (!currentStrategy) {
                this.logger.error('当前搜索策略不存在');
                return;
            }
            const isHealthy = await currentStrategy.healthCheck();
            if (!isHealthy) {
                this.logger.warn(`当前搜索引擎 ${this.currentStrategy} 不可用，尝试切换到备用引擎`);
                await this.switchToFallback();
            }
            else if (!this.isInitialized) {
                this.isInitialized = true;
                this.logger.log(`搜索引擎 ${this.currentStrategy} 已恢复，搜索服务恢复可用`);
            }
        }
        catch (error) {
            this.logger.error('健康检查失败', error);
        }
    }
    async switchToFallback() {
        try {
            const fallbackStrategy = this.strategies.get(this.fallbackStrategy);
            if (!fallbackStrategy) {
                this.logger.error('备用搜索策略不存在');
                return;
            }
            const isFallbackHealthy = await fallbackStrategy.healthCheck();
            if (isFallbackHealthy) {
                const oldStrategy = this.currentStrategy;
                this.currentStrategy = this.fallbackStrategy;
                this.fallbackStrategy = oldStrategy;
                this.logger.log(`已切换到备用搜索引擎: ${this.currentStrategy}`);
            }
            else {
                this.logger.error('备用搜索引擎也不可用，无法切换');
            }
        }
        catch (error) {
            this.logger.error('切换搜索引擎失败', error);
        }
    }
    async search(query, options = {}) {
        if (!this.isInitialized) {
            throw new Error('搜索服务管理器未初始化');
        }
        let lastError;
        try {
            const currentStrategy = this.strategies.get(this.currentStrategy);
            if (!currentStrategy) {
                throw new Error('当前搜索策略不存在');
            }
            const result = await currentStrategy.search(query, options);
            this.logger.log(`搜索成功 [${this.currentStrategy}]: "${query}" - ${result.total} 个结果`);
            return result;
        }
        catch (error) {
            lastError = error;
            this.logger.warn(`当前搜索引擎 ${this.currentStrategy} 搜索失败: ${error.message}`);
        }
        try {
            const fallbackStrategy = this.strategies.get(this.fallbackStrategy);
            if (!fallbackStrategy) {
                throw new Error('备用搜索策略不存在');
            }
            const result = await fallbackStrategy.search(query, options);
            this.logger.log(`备用搜索引擎搜索成功 [${this.fallbackStrategy}]: "${query}" - ${result.total} 个结果`);
            await this.considerSwitchBack();
            return result;
        }
        catch (error) {
            lastError = error;
            this.logger.error(`备用搜索引擎 ${this.fallbackStrategy} 也失败: ${error.message}`);
        }
        throw new Error(`所有搜索引擎都失败: ${lastError.message}`);
    }
    async indexProduct(product) {
        if (!this.isInitialized) {
            throw new Error('搜索服务管理器未初始化');
        }
        const promises = [];
        for (const [engine, strategy] of this.strategies) {
            try {
                const isHealthy = await strategy.healthCheck();
                if (isHealthy) {
                    promises.push(strategy.indexProduct(product));
                }
            }
            catch (error) {
                this.logger.warn(`搜索引擎 ${engine} 健康检查失败，跳过索引`);
            }
        }
        if (promises.length === 0) {
            throw new Error('没有可用的搜索引擎进行索引');
        }
        try {
            await Promise.all(promises);
            this.logger.log(`产品索引成功: ${product.id}`);
        }
        catch (error) {
            this.logger.error('产品索引失败', error);
            throw new Error(`索引失败: ${error.message}`);
        }
    }
    async indexProducts(products) {
        if (!this.isInitialized) {
            throw new Error('搜索服务管理器未初始化');
        }
        const promises = [];
        for (const [engine, strategy] of this.strategies) {
            try {
                const isHealthy = await strategy.healthCheck();
                if (isHealthy) {
                    promises.push(strategy.indexProducts(products));
                }
            }
            catch (error) {
                this.logger.warn(`搜索引擎 ${engine} 健康检查失败，跳过批量索引`);
            }
        }
        if (promises.length === 0) {
            throw new Error('没有可用的搜索引擎进行批量索引');
        }
        try {
            await Promise.all(promises);
            this.logger.log(`批量索引成功: ${products.length} 个产品`);
        }
        catch (error) {
            this.logger.error('批量索引失败', error);
            throw new Error(`批量索引失败: ${error.message}`);
        }
    }
    async deleteProduct(productId) {
        if (!this.isInitialized) {
            throw new Error('搜索服务管理器未初始化');
        }
        const promises = [];
        for (const [engine, strategy] of this.strategies) {
            try {
                const isHealthy = await strategy.healthCheck();
                if (isHealthy) {
                    promises.push(strategy.deleteProduct(productId));
                }
            }
            catch (error) {
                this.logger.warn(`搜索引擎 ${engine} 健康检查失败，跳过删除`);
            }
        }
        if (promises.length === 0) {
            throw new Error('没有可用的搜索引擎进行删除操作');
        }
        try {
            await Promise.all(promises);
            this.logger.log(`产品索引删除成功: ${productId}`);
        }
        catch (error) {
            this.logger.error('产品索引删除失败', error);
            throw new Error(`删除失败: ${error.message}`);
        }
    }
    async getStatus() {
        const strategies = [];
        for (const [engine, strategy] of this.strategies) {
            strategies.push({
                engine,
                name: strategy.getName(),
                isHealthy: await this.isStrategyHealthy(engine),
            });
        }
        return {
            currentEngine: this.currentStrategy,
            fallbackEngine: this.fallbackStrategy,
            strategies,
        };
    }
    async switchEngine(engine) {
        const strategy = this.strategies.get(engine);
        if (!strategy) {
            throw new Error(`搜索引擎 ${engine} 不存在`);
        }
        const isHealthy = await strategy.healthCheck();
        if (!isHealthy) {
            throw new Error(`搜索引擎 ${engine} 不可用`);
        }
        const oldStrategy = this.currentStrategy;
        this.currentStrategy = engine;
        this.fallbackStrategy = oldStrategy;
        this.logger.log(`手动切换搜索引擎: ${oldStrategy} -> ${engine}`);
    }
    async reinitialize() {
        this.logger.log('强制重新初始化搜索服务管理器...');
        clearInterval(this.healthCheckInterval);
        this.isInitialized = false;
        await this.initialize();
        this.startHealthMonitoring();
    }
    async considerSwitchBack() {
        if (this.currentStrategy !== SearchEngine.MEILISEARCH) {
            try {
                const primaryStrategy = this.strategies.get(SearchEngine.MEILISEARCH);
                if (primaryStrategy) {
                    const isPrimaryHealthy = await primaryStrategy.healthCheck();
                    if (isPrimaryHealthy) {
                        this.logger.log('首选搜索引擎已恢复，切换回首选策略');
                        this.currentStrategy = SearchEngine.MEILISEARCH;
                        this.fallbackStrategy = SearchEngine.ZINCSEARCH;
                    }
                }
            }
            catch (error) {
                this.logger.warn('检查首选搜索引擎状态失败', error);
            }
        }
    }
    async isStrategyHealthy(engine) {
        const strategy = this.strategies.get(engine);
        if (!strategy || typeof strategy.healthCheck !== 'function') {
            return false;
        }
        try {
            return await strategy.healthCheck();
        }
        catch {
            return false;
        }
    }
    onModuleDestroy() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.logger.log('健康检查监控已停止');
        }
    }
};
exports.SearchManagerService = SearchManagerService;
exports.SearchManagerService = SearchManagerService = SearchManagerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        meilisearch_service_1.MeiliSearchService,
        zincsearch_service_1.ZincSearchService])
], SearchManagerService);
