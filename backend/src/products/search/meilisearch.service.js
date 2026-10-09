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
var MeiliSearchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeiliSearchService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let MeiliSearchService = MeiliSearchService_1 = class MeiliSearchService {
    constructor(configService, httpService) {
        this.configService = configService;
        this.httpService = httpService;
        this.logger = new common_1.Logger(MeiliSearchService_1.name);
        this.indexName = 'products';
        this.isConnected = false;
        this.initializeClient();
    }
    initializeClient() {
        try {
            this.baseUrl =
                this.configService.get('search.meilisearch.host') || 'http://localhost:7700';
            this.apiKey = this.configService.get('search.meilisearch.apiKey')
                || process.env.MEILISEARCH_API_KEY
                || 'masterKey';
            this.logger.log(`MeiliSearch客户端初始化成功: ${this.baseUrl}`);
            this.isConnected = true;
        }
        catch (error) {
            this.logger.error('MeiliSearch客户端初始化失败', error);
            this.isConnected = false;
        }
    }
    async search(query, options = {}) {
        if (!this.isConnected) {
            throw new Error('MeiliSearch服务未连接');
        }
        try {
            const url = `${this.baseUrl}/indexes/${this.indexName}/search`;
            const headers = {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            };
            const searchOptions = {
                q: query,
                limit: options.limit || 20,
                offset: options.offset || 0,
            };
            if (options.filters) {
                searchOptions.filter = this.buildFilters(options.filters);
            }
            if (options.sortBy) {
                searchOptions.sort = [`${options.sortBy}:${options.sortOrder || 'asc'}`];
            }
            if (options.queryVector && options.queryVector.length) {
                searchOptions.vector = options.queryVector;
                searchOptions.hybrid = { embedder: 'default', semanticRatio: 0.5 };
            }
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, searchOptions, { headers }));
            return {
                hits: response.data.hits.map((hit) => this.transformHit(hit)),
                total: response.data.estimatedTotalHits || response.data.totalHits || 0,
                processingTimeMs: response.data.processingTimeMs,
                query,
                facets: response.data.facetDistribution,
            };
        }
        catch (error) {
            this.logger.error('MeiliSearch搜索失败', error);
            throw new Error(`搜索失败: ${error.message}`);
        }
    }
    async indexProduct(product) {
        if (!this.isConnected) {
            throw new Error('MeiliSearch服务未连接');
        }
        try {
            const url = `${this.baseUrl}/indexes/${this.indexName}/documents`;
            const headers = {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            };
            const document = this.transformProductForIndexing(product);
            await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, [document], { headers }));
            this.logger.log(`产品索引成功: ${product.id}`);
        }
        catch (error) {
            this.logger.error('产品索引失败', error);
            throw new Error(`索引失败: ${error.message}`);
        }
    }
    async indexProducts(products) {
        if (!this.isConnected) {
            throw new Error('MeiliSearch服务未连接');
        }
        try {
            const url = `${this.baseUrl}/indexes/${this.indexName}/documents`;
            const headers = {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            };
            const documents = products.map(product => this.transformProductForIndexing(product));
            await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, documents, { headers }));
            this.logger.log(`批量索引成功: ${products.length}个产品`);
        }
        catch (error) {
            this.logger.error('批量索引失败', error);
            throw new Error(`批量索引失败: ${error.message}`);
        }
    }
    async deleteProduct(productId) {
        if (!this.isConnected) {
            throw new Error('MeiliSearch服务未连接');
        }
        try {
            const url = `${this.baseUrl}/indexes/${this.indexName}/documents/${productId}`;
            const headers = {
                Authorization: `Bearer ${this.apiKey}`,
            };
            await (0, rxjs_1.firstValueFrom)(this.httpService.delete(url, { headers }));
            this.logger.log(`产品索引删除成功: ${productId}`);
        }
        catch (error) {
            this.logger.error('产品索引删除失败', error);
            throw new Error(`删除失败: ${error.message}`);
        }
    }
    async healthCheck() {
        if (!this.isConnected) {
            return false;
        }
        try {
            const url = `${this.baseUrl}/health`;
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url));
            this.isConnected = response.data.status === 'available';
            return this.isConnected;
        }
        catch (error) {
            this.isConnected = false;
            return false;
        }
    }
    getName() {
        return 'MeiliSearch';
    }
    buildFilters(filters) {
        const filterParts = [];
        if (filters.categoryId) {
            filterParts.push(`categoryId = ${filters.categoryId}`);
        }
        if (filters.minPrice !== undefined) {
            filterParts.push(`price >= ${filters.minPrice}`);
        }
        if (filters.maxPrice !== undefined) {
            filterParts.push(`price <= ${filters.maxPrice}`);
        }
        if (filters.tags && filters.tags.length > 0) {
            const tagFilters = filters.tags.map((tag) => `tags = "${tag}"`).join(' OR ');
            filterParts.push(`(${tagFilters})`);
        }
        if (filters.inStock) {
            filterParts.push('stock > 0');
        }
        if (filters.isActive !== undefined) {
            filterParts.push(`isActive = ${filters.isActive}`);
        }
        return filterParts.join(' AND ');
    }
    transformHit(hit) {
        return {
            id: hit.id,
            name: hit.name,
            description: hit.description,
            price: hit.price,
            category: hit.category,
            tags: hit.tags || [],
            score: hit._score || 0,
            highlight: hit._formatted,
        };
    }
    transformProductForIndexing(product) {
        const doc = {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            originalPrice: product.originalPrice,
            category: product.category,
            categoryId: product.categoryId,
            tags: product.tags,
            stock: product.stock,
            isActive: product.isActive,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
            specifications: product.specifications,
        };
        if (product.embedding && product.embedding.length) {
            doc._vectors = { default: product.embedding };
        }
        return doc;
    }
    async initializeIndexSettings() {
        if (!this.isConnected) {
            throw new Error('MeiliSearch服务未连接');
        }
        try {
            await this.updateSearchableAttributes(['name', 'description', 'tags', 'category']);
            await this.updateFilterableAttributes(['categoryId', 'price', 'tags', 'stock', 'isActive']);
            await this.updateSortableAttributes(['price', 'createdAt', 'updatedAt']);
            try {
                const eurl = `${this.baseUrl}/indexes/${this.indexName}/settings/embedders`;
                const eheaders = { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' };
                await (0, rxjs_1.firstValueFrom)(this.httpService.patch(eurl, {
                    default: { source: 'userProvided', dimensions: 512 },
                }, { headers: eheaders }));
            }
            catch (error) {
                this.logger.warn('embedders 配置失败（语义检索不可用，关键词不受影响）');
            }
            this.logger.log('MeiliSearch索引设置初始化成功');
        }
        catch (error) {
            this.logger.error('索引设置初始化失败', error);
            throw error;
        }
    }
    async updateSearchableAttributes(attributes) {
        const url = `${this.baseUrl}/indexes/${this.indexName}/settings/searchable-attributes`;
        const headers = {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
        };
        await (0, rxjs_1.firstValueFrom)(this.httpService.patch(url, attributes, { headers }));
    }
    async updateFilterableAttributes(attributes) {
        const url = `${this.baseUrl}/indexes/${this.indexName}/settings/filterable-attributes`;
        const headers = {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
        };
        await (0, rxjs_1.firstValueFrom)(this.httpService.patch(url, attributes, { headers }));
    }
    async updateSortableAttributes(attributes) {
        const url = `${this.baseUrl}/indexes/${this.indexName}/settings/sortable-attributes`;
        const headers = {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
        };
        await (0, rxjs_1.firstValueFrom)(this.httpService.patch(url, attributes, { headers }));
    }
};
exports.MeiliSearchService = MeiliSearchService;
exports.MeiliSearchService = MeiliSearchService = MeiliSearchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        axios_1.HttpService])
], MeiliSearchService);
