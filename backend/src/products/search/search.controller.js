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
exports.SearchController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const search_manager_service_1 = require("./search-manager.service");
const search_suggestion_service_1 = require("./search-suggestion.service");
const popular_search_service_1 = require("./popular-search.service");
const products_service_1 = require("../products.service");
const api_docs_decorator_1 = require("../../common/decorators/api-docs.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const role_enum_1 = require("../../auth/enums/role.enum");
let SearchController = class SearchController {
    constructor(searchManagerService, searchSuggestionService, popularSearchService, productsService) {
        this.searchManagerService = searchManagerService;
        this.searchSuggestionService = searchSuggestionService;
        this.popularSearchService = popularSearchService;
        this.productsService = productsService;
    }
    async search(q, limit, offset, category, minPrice, maxPrice) {
        if (!q || !q.trim()) {
            throw new common_1.BadRequestException('搜索关键词 q 必填');
        }
        const options = {
            limit,
            offset,
            filters: {},
        };
        if (category) {
            options.filters.category = category;
        }
        if (minPrice) {
            options.filters.minPrice = parseFloat(minPrice);
        }
        if (maxPrice) {
            options.filters.maxPrice = parseFloat(maxPrice);
        }
        let result;
        try {
            result = await this.searchManagerService.search(q, options);
        }
        catch (error) {
            console.warn('/api/search 搜索引擎全灭，回退到数据库搜索:', error instanceof Error ? error.message : error);
            const started = Date.now();
            const dbResult = await this.productsService.search({
                keyword: q,
                page: Math.floor(offset / Math.max(limit, 1)) + 1,
                limit,
            });
            result = {
                hits: dbResult.products,
                total: dbResult.total,
                processingTimeMs: Date.now() - started,
                query: q,
            };
        }
        await this.popularSearchService.recordSearch(q, undefined, result.hits.length);
        return result;
    }
    async getSuggestions(q, limit) {
        const suggestions = await this.searchSuggestionService.getSuggestions(q, {
            limit,
        });
        return suggestions.map(suggestion => suggestion.text);
    }
    async getPopularSearches(limit, includeTrends, timeRange, category) {
        const options = {
            limit,
            includeTrends,
            timeRange,
            category,
        };
        return this.popularSearchService.getPopularSearches(options);
    }
    async recordSearchHistory(body) {
        const { query, userId, resultCount } = body;
        await this.popularSearchService.recordSearch(query, userId, resultCount);
        return;
    }
    async getSearchTrends(days) {
        return this.popularSearchService.getSearchTrends(parseInt(days, 10));
    }
    async addPopularSearchTerm(body) {
        const { term, category } = body;
        await this.popularSearchService.addPopularSearchTerm(term, category);
        return;
    }
    async clearSearchCache() {
        await this.searchSuggestionService.clearCache();
        await this.popularSearchService.clearCache();
        return;
    }
    async getSearchStatus() {
        return this.searchManagerService.getStatus();
    }
    async switchSearchEngine(engine) {
        return this.searchManagerService.switchEngine(engine);
    }
    async reinitializeSearchEngine() {
        return this.searchManagerService.reinitialize();
    }
};
exports.SearchController = SearchController;
__decorate([
    (0, api_docs_decorator_1.ApiPaginatedQuery)(Object, '执行搜索'),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)('category')),
    __param(4, (0, common_1.Query)('minPrice')),
    __param(5, (0, common_1.Query)('maxPrice')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "search", null);
__decorate([
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '获取搜索建议',
        description: '根据输入的关键词前缀获取搜索建议',
        queries: [
            { name: 'q', required: true, description: '搜索关键词前缀' },
            { name: 'limit', required: false, description: '返回建议数量限制，默认10' },
        ],
    }),
    (0, common_1.Get)('suggestions'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "getSuggestions", null);
__decorate([
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '获取热门搜索',
        description: '获取热门搜索词列表，支持时间范围和分类过滤',
        queries: [
            { name: 'limit', required: false, description: '返回热门搜索数量限制，默认10' },
            { name: 'includeTrends', required: false, description: '是否包含趋势信息，默认true' },
            { name: 'timeRange', required: false, type: 'string', description: '时间范围，默认week' },
            { name: 'category', required: false, description: '分类过滤' },
        ],
    }),
    (0, common_1.Get)('popular'),
    __param(0, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('includeTrends', new common_1.DefaultValuePipe(true))),
    __param(2, (0, common_1.Query)('timeRange', new common_1.DefaultValuePipe('week'))),
    __param(3, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Boolean, String, String]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "getPopularSearches", null);
__decorate([
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '记录搜索历史',
        description: '记录用户搜索历史，用于统计和分析',
        body: {
            type: Object,
            description: '搜索历史数据',
        },
    }),
    (0, common_1.Post)('history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "recordSearchHistory", null);
__decorate([
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '获取搜索趋势分析',
        description: '获取指定天数内的搜索趋势分析数据',
        queries: [{ name: 'days', required: false, description: '分析天数，默认7天' }],
    }),
    (0, common_1.Get)('trends'),
    __param(0, (0, common_1.Query)('days', new common_1.DefaultValuePipe('7'))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "getSearchTrends", null);
__decorate([
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '添加热门搜索词',
        description: '手动添加热门搜索词到系统',
        body: {
            type: Object,
            description: '热门搜索词数据',
        },
    }),
    (0, common_1.Post)('popular'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "addPopularSearchTerm", null);
__decorate([
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '清除搜索缓存',
        description: '清除所有搜索相关的缓存数据',
    }),
    (0, common_1.Delete)('cache'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "clearSearchCache", null);
__decorate([
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '获取搜索系统状态',
        description: '获取搜索系统的运行状态和统计信息',
    }),
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "getSearchStatus", null);
__decorate([
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '手动切换搜索引擎',
        description: '手动切换到指定的搜索引擎',
        params: [{ name: 'engine', required: true, description: '搜索引擎名称' }],
    }),
    (0, common_1.Post)('switch/:engine'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('engine')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "switchSearchEngine", null);
__decorate([
    (0, api_docs_decorator_1.ApiDocs)({
        summary: '重新初始化搜索引擎',
        description: '重新初始化搜索引擎，重建索引和配置',
    }),
    (0, common_1.Post)('reinitialize'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "reinitializeSearchEngine", null);
exports.SearchController = SearchController = __decorate([
    (0, swagger_1.ApiTags)('搜索'),
    (0, common_1.Controller)('search'),
    __metadata("design:paramtypes", [search_manager_service_1.SearchManagerService,
        search_suggestion_service_1.SearchSuggestionService,
        popular_search_service_1.PopularSearchService,
        products_service_1.ProductsService])
], SearchController);
