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
var ZincSearchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZincSearchService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let ZincSearchService = ZincSearchService_1 = class ZincSearchService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(ZincSearchService_1.name);
        this.indexName = 'products';
        this.isConnected = false;
        this.initializeClient();
    }
    initializeClient() {
        try {
            this.baseUrl =
                this.configService.get('search.zincsearch.host') || 'http://localhost:4080';
            this.username = this.configService.get('search.zincsearch.username') || 'admin';
            this.password =
                this.configService.get('search.zincsearch.password') || 'CHANGE_ME_zinc_admin_password';
            this.logger.log(`ZincSearch客户端初始化成功: ${this.baseUrl}`);
            this.isConnected = true;
        }
        catch (error) {
            this.logger.error('ZincSearch客户端初始化失败', error);
            this.isConnected = false;
        }
    }
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        if (!this.isValidUrl(url)) {
            throw new Error('SSRF防护：不允许访问外部服务器');
        }
        const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
        const defaultOptions = {
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        };
        const response = await fetch(url, { ...defaultOptions, ...options });
        if (!response.ok) {
            throw new Error(`ZincSearch请求失败: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
    isValidUrl(url) {
        try {
            const urlObj = new URL(url);
            const allowedHost = this.baseUrl.replace('http://', '').replace('https://', '').split('/')[0];
            const requestHost = urlObj.host;
            if (requestHost !== allowedHost) {
                this.logger.warn(`SSRF防护阻止了到 ${requestHost} 的请求，只允许访问 ${allowedHost}`);
                return false;
            }
            if (process.env.NODE_ENV === 'production' && urlObj.protocol !== 'https:') {
                this.logger.warn('生产环境要求使用HTTPS');
                return false;
            }
            return true;
        }
        catch (error) {
            this.logger.error('URL验证失败', error);
            return false;
        }
    }
    async search(query, options = {}) {
        if (!this.isConnected) {
            throw new Error('ZincSearch服务未连接');
        }
        try {
            const searchBody = {
                search_type: 'match',
                query: {
                    term: query,
                },
                from: options.offset || 0,
                max_results: options.limit || 20,
                _source: ['id', 'name', 'description', 'price', 'category', 'tags', 'stock', 'isActive'],
            };
            if (options.filters) {
                searchBody.query = this.buildQueryWithFilters(query, options.filters);
            }
            if (options.sortBy) {
                searchBody.sort_fields = [`-${options.sortBy}`];
                if (options.sortOrder === 'asc') {
                    searchBody.sort_fields = [`${options.sortBy}`];
                }
            }
            const response = await this.makeRequest(`/api/${this.indexName}/_search`, {
                method: 'POST',
                body: JSON.stringify(searchBody),
            });
            const resp = response;
            return {
                hits: resp.hits.hits.map(hit => this.transformHit(hit)),
                total: resp.hits.total.value,
                processingTimeMs: resp.took,
                query,
            };
        }
        catch (error) {
            this.logger.error('ZincSearch搜索失败', error);
            throw new Error(`搜索失败: ${error.message}`);
        }
    }
    async indexProduct(product) {
        if (!this.isConnected) {
            throw new Error('ZincSearch服务未连接');
        }
        try {
            await this.makeRequest(`/api/${this.indexName}/_doc/${product.id}`, {
                method: 'PUT',
                body: JSON.stringify(this.transformProductForIndexing(product)),
            });
            this.logger.log(`产品索引成功: ${product.id}`);
        }
        catch (error) {
            this.logger.error('产品索引失败', error);
            throw new Error(`索引失败: ${error.message}`);
        }
    }
    async indexProducts(products) {
        if (!this.isConnected) {
            throw new Error('ZincSearch服务未连接');
        }
        try {
            const bulkData = products.map(product => ({
                index: { _index: this.indexName, _id: product.id },
                ...this.transformProductForIndexing(product),
            }));
            const bulkBody = bulkData.map(item => JSON.stringify(item)).join('\n') + '\n';
            await this.makeRequest('/api/_bulk', {
                method: 'POST',
                body: bulkBody,
                headers: {
                    'Content-Type': 'application/x-ndjson',
                },
            });
            this.logger.log(`批量索引成功: ${products.length}个产品`);
        }
        catch (error) {
            this.logger.error('批量索引失败', error);
            throw new Error(`批量索引失败: ${error.message}`);
        }
    }
    async deleteProduct(productId) {
        if (!this.isConnected) {
            throw new Error('ZincSearch服务未连接');
        }
        try {
            await this.makeRequest(`/api/${this.indexName}/_doc/${productId}`, {
                method: 'DELETE',
            });
            this.logger.log(`产品索引删除成功: ${productId}`);
        }
        catch (error) {
            this.logger.error('产品索引删除失败', error);
            throw new Error(`删除失败: ${error.message}`);
        }
    }
    async healthCheck() {
        if (!this.baseUrl) {
            return false;
        }
        for (const endpoint of ['/api/health', '/healthz']) {
            try {
                await this.makeRequest(endpoint, { method: 'GET' });
                this.isConnected = true;
                return true;
            }
            catch (error) {
            }
        }
        this.isConnected = false;
        return false;
    }
    getName() {
        return 'ZincSearch';
    }
    buildQueryWithFilters(query, filters) {
        const mustClauses = [
            {
                match: {
                    query: query,
                },
            },
        ];
        const filterClauses = [];
        if (filters.categoryId) {
            filterClauses.push({
                term: {
                    categoryId: filters.categoryId,
                },
            });
        }
        if (filters.minPrice !== undefined) {
            filterClauses.push({
                range: {
                    price: {
                        gte: filters.minPrice,
                    },
                },
            });
        }
        if (filters.maxPrice !== undefined) {
            filterClauses.push({
                range: {
                    price: {
                        lte: filters.maxPrice,
                    },
                },
            });
        }
        if (Array.isArray(filters.tags) && filters.tags.length > 0) {
            filterClauses.push({
                terms: {
                    tags: filters.tags,
                },
            });
        }
        if (filters.inStock) {
            filterClauses.push({
                range: {
                    stock: {
                        gt: 0,
                    },
                },
            });
        }
        if (filters.isActive !== undefined) {
            filterClauses.push({
                term: {
                    isActive: filters.isActive,
                },
            });
        }
        return {
            bool: {
                must: mustClauses,
                filter: filterClauses,
            },
        };
    }
    transformHit(hit) {
        return {
            id: hit._id,
            name: hit._source.name,
            description: hit._source.description,
            price: hit._source.price,
            category: hit._source.category,
            tags: hit._source.tags || [],
            score: hit._score || 0,
        };
    }
    transformProductForIndexing(product) {
        return {
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
    }
    async createIndexMapping() {
        if (!this.isConnected) {
            throw new Error('ZincSearch服务未连接');
        }
        try {
            const mapping = {
                name: this.indexName,
                storage_type: 'disk',
                mappings: {
                    properties: {
                        id: { type: 'text' },
                        name: { type: 'text', analyzer: 'standard' },
                        description: { type: 'text', analyzer: 'standard' },
                        price: { type: 'numeric' },
                        originalPrice: { type: 'numeric' },
                        category: { type: 'text' },
                        categoryId: { type: 'numeric' },
                        tags: { type: 'keyword' },
                        stock: { type: 'numeric' },
                        isActive: { type: 'boolean' },
                        createdAt: { type: 'date' },
                        updatedAt: { type: 'date' },
                        specifications: { type: 'object' },
                    },
                },
            };
            await this.makeRequest(`/api/index`, {
                method: 'POST',
                body: JSON.stringify(mapping),
            });
            this.logger.log('ZincSearch索引映射创建成功');
        }
        catch (error) {
            this.logger.error('索引映射创建失败', error);
            throw error;
        }
    }
};
exports.ZincSearchService = ZincSearchService;
exports.ZincSearchService = ZincSearchService = ZincSearchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ZincSearchService);
