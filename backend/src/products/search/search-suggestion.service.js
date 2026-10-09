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
var SearchSuggestionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchSuggestionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cache_service_1 = require("../../cache/cache.service");
const search_manager_service_1 = require("./search-manager.service");
const products_service_1 = require("../products.service");
let SearchSuggestionService = SearchSuggestionService_1 = class SearchSuggestionService {
    constructor(configService, cacheService, searchManager, productsService) {
        this.configService = configService;
        this.cacheService = cacheService;
        this.searchManager = searchManager;
        this.productsService = productsService;
        this.logger = new common_1.Logger(SearchSuggestionService_1.name);
        this.popularSearchesCacheKey = 'search:suggestions:popular';
        this.categorySuggestionsCacheKey = 'search:suggestions:categories';
        this.suggestionCacheTTL = this.configService.get('search.suggestions.cacheTTL') || 300;
    }
    async getSuggestions(query, options = {}) {
        const { limit = 8, includeCategories = true, includePopular = true, minCharacters = 2, } = options;
        if (!query || query.trim().length < minCharacters) {
            return [];
        }
        const normalizedQuery = query.toLowerCase().trim();
        const cacheKey = `search:suggestions:${normalizedQuery}`;
        const cachedSuggestions = await this.cacheService.get('search', 'suggestions', normalizedQuery);
        if (cachedSuggestions) {
            this.logger.debug(`从缓存获取搜索建议: ${normalizedQuery}`);
            return cachedSuggestions.slice(0, limit);
        }
        const suggestions = [];
        const productSuggestions = await this.getProductSuggestions(normalizedQuery, Math.floor(limit / 2));
        suggestions.push(...productSuggestions);
        if (includeCategories) {
            const categorySuggestions = await this.getCategorySuggestions(normalizedQuery, Math.floor(limit / 4));
            suggestions.push(...categorySuggestions);
        }
        if (includePopular) {
            const popularSuggestions = await this.getPopularSearchSuggestions(normalizedQuery, Math.floor(limit / 4));
            suggestions.push(...popularSuggestions);
        }
        const sortedSuggestions = suggestions
            .sort((a, b) => b.popularity - a.popularity)
            .slice(0, limit);
        await this.cacheService.set('search', 'suggestions', sortedSuggestions, normalizedQuery, {
            ttl: this.suggestionCacheTTL,
        });
        return sortedSuggestions;
    }
    async getProductSuggestions(query, limit) {
        try {
            const searchResult = await this.searchManager.search(query, {
                limit: limit * 2,
                facets: ['category'],
                filters: { isActive: true },
            });
            const suggestions = searchResult.hits.map(hit => ({
                text: hit.name,
                category: hit.category,
                popularity: hit.score,
                highlight: this.highlightText(hit.name, query),
            }));
            const uniqueSuggestions = this.deduplicateSuggestions(suggestions);
            return uniqueSuggestions.slice(0, limit);
        }
        catch (error) {
            this.logger.error('获取产品建议失败', error);
            return [];
        }
    }
    async getCategorySuggestions(query, limit) {
        try {
            const cachedCategories = await this.cacheService.get('search', 'suggestions', 'categories');
            if (cachedCategories) {
                return cachedCategories
                    .filter(suggestion => suggestion.text.toLowerCase().includes(query))
                    .slice(0, limit);
            }
            const categories = await this.productsService.getCategories();
            const suggestions = categories
                .filter(category => category.name.toLowerCase().includes(query))
                .map(category => ({
                text: category.name,
                popularity: category.products?.length || 1,
                highlight: this.highlightText(category.name, query),
            }));
            await this.cacheService.set('search', 'suggestions', suggestions, 'categories', { ttl: this.suggestionCacheTTL * 2 });
            return suggestions.slice(0, limit);
        }
        catch (error) {
            this.logger.error('获取分类建议失败', error);
            return [];
        }
    }
    async getPopularSearchSuggestions(query, limit) {
        try {
            const cachedPopular = await this.cacheService.get('search', 'suggestions', 'popular');
            if (cachedPopular) {
                return cachedPopular
                    .filter(suggestion => suggestion.text.toLowerCase().includes(query))
                    .slice(0, limit);
            }
            const popularProducts = await this.productsService.findPopular(limit * 2);
            const suggestions = popularProducts
                .filter(product => product.name.toLowerCase().includes(query))
                .map(product => ({
                text: product.name,
                category: product.category?.name,
                popularity: product.views || product.sales || 1,
                highlight: this.highlightText(product.name, query),
            }));
            await this.cacheService.set('search', 'suggestions', suggestions, 'popular', { ttl: this.suggestionCacheTTL * 3 });
            return suggestions.slice(0, limit);
        }
        catch (error) {
            this.logger.error('获取热门搜索建议失败', error);
            return [];
        }
    }
    highlightText(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<strong>$1</strong>');
    }
    deduplicateSuggestions(suggestions) {
        const seen = new Set();
        return suggestions.filter(suggestion => {
            const key = suggestion.text.toLowerCase();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    async recordSearch(query, userId, resultCount) {
        try {
            const normalizedQuery = query.toLowerCase().trim();
            const timestamp = new Date().toISOString();
            const searchRecord = {
                query: normalizedQuery,
                userId,
                resultCount,
                timestamp,
            };
            await this.cacheService.set('search', 'records', searchRecord, `${timestamp}:${normalizedQuery}:${userId || 'anonymous'}`, { ttl: 86400 });
            if (resultCount === 0) {
                await this.cacheService.set('search', 'zero_results', searchRecord, normalizedQuery, { ttl: 604800 });
            }
            this.logger.debug(`记录搜索行为: ${normalizedQuery}`);
        }
        catch (error) {
            this.logger.error('记录搜索行为失败', error);
        }
    }
    async clearCache() {
        try {
            await this.cacheService.delete('search', 'suggestions');
            this.logger.log('搜索建议缓存已清除');
        }
        catch (error) {
            this.logger.error('清除搜索建议缓存失败', error);
        }
    }
};
exports.SearchSuggestionService = SearchSuggestionService;
exports.SearchSuggestionService = SearchSuggestionService = SearchSuggestionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        cache_service_1.CacheService,
        search_manager_service_1.SearchManagerService,
        products_service_1.ProductsService])
], SearchSuggestionService);
