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
var PopularSearchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopularSearchService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cache_service_1 = require("../../cache/cache.service");
const search_suggestion_service_1 = require("./search-suggestion.service");
const products_service_1 = require("../products.service");
let PopularSearchService = PopularSearchService_1 = class PopularSearchService {
    constructor(configService, cacheService, searchSuggestionService, productsService) {
        this.configService = configService;
        this.cacheService = cacheService;
        this.searchSuggestionService = searchSuggestionService;
        this.productsService = productsService;
        this.logger = new common_1.Logger(PopularSearchService_1.name);
        this.popularSearchesCacheKey = 'search:popular:terms';
        this.searchHistoryCacheKey = 'search:history';
        this.cacheTTL = this.configService.get('search.popular.cacheTTL') || 600;
    }
    async getPopularSearches(options = {}) {
        const { limit = 10, includeTrends = true, timeRange = 'week', category } = options;
        const cacheKey = `${this.popularSearchesCacheKey}:${timeRange}:${category || 'all'}`;
        const cachedPopular = await this.cacheService.get('search', 'popular', cacheKey);
        if (cachedPopular) {
            this.logger.debug(`从缓存获取热门搜索: ${cacheKey}`);
            return cachedPopular.slice(0, limit);
        }
        const popularTerms = await this.calculatePopularSearches({
            limit,
            timeRange,
            category,
        });
        if (includeTrends) {
            await this.enrichWithTrends(popularTerms, timeRange);
        }
        await this.cacheService.set('search', 'popular', popularTerms, cacheKey, {
            ttl: this.cacheTTL,
        });
        return popularTerms.slice(0, limit);
    }
    async recordSearch(query, userId, resultCount) {
        try {
            const normalizedQuery = query.toLowerCase().trim();
            const timestamp = new Date().toISOString();
            const dateKey = new Date().toISOString().split('T')[0];
            const searchRecord = {
                query: normalizedQuery,
                userId,
                resultCount,
                timestamp,
            };
            await this.cacheService.set('search', 'history', searchRecord, `${dateKey}:${normalizedQuery}:${userId || 'anonymous'}`, { ttl: 2592000 });
            await this.incrementSearchCount(normalizedQuery);
            this.logger.debug(`记录搜索历史: ${normalizedQuery}`);
        }
        catch (error) {
            this.logger.error('记录搜索历史失败', error);
        }
    }
    async incrementSearchCount(query) {
        try {
            const counterKey = `search:counter:${query}`;
            let count = (await this.cacheService.get('search', 'counter', query)) || 0;
            count += 1;
            await this.cacheService.set('search', 'counter', count, query, { ttl: 2592000 });
        }
        catch (error) {
            this.logger.error('更新搜索计数失败', error);
        }
    }
    async calculatePopularSearches(options) {
        const { limit = 10, timeRange = 'week', category } = options;
        try {
            const counters = await this.getSearchCounters(timeRange);
            let popularTerms = Object.entries(counters)
                .map(([term, count]) => ({
                term,
                count: count,
                trend: 'stable',
                lastUpdated: new Date().toISOString(),
            }))
                .sort((a, b) => b.count - a.count);
            if (category) {
                popularTerms = await this.filterByCategory(popularTerms, category);
            }
            popularTerms = popularTerms.filter(term => term.term.length >= 2 && !this.isStopWord(term.term));
            return popularTerms.slice(0, limit);
        }
        catch (error) {
            this.logger.error('计算热门搜索失败', error);
            return [];
        }
    }
    async getSearchCounters(timeRange) {
        try {
            const popularProducts = await this.productsService.findPopular(20);
            const productBasedCounters = {};
            popularProducts.forEach(product => {
                const words = product.name.toLowerCase().split(/\s+/);
                words.forEach(word => {
                    if (word.length >= 2) {
                        productBasedCounters[word] = (productBasedCounters[word] || 0) + (product.views || 1);
                    }
                });
            });
            return productBasedCounters;
        }
        catch (error) {
            this.logger.error('获取搜索计数器失败', error);
            return {};
        }
    }
    async filterByCategory(terms, category) {
        try {
            const categoryProducts = await this.productsService.findByCategory(category, 50);
            const categoryTerms = new Set();
            categoryProducts.forEach(product => {
                const words = product.name.toLowerCase().split(/\s+/);
                words.forEach(word => {
                    if (word.length >= 2) {
                        categoryTerms.add(word);
                    }
                });
            });
            return terms.filter(term => categoryTerms.has(term.term) || term.term.includes(category.toLowerCase()));
        }
        catch (error) {
            this.logger.error('按分类过滤搜索词失败', error);
            return terms;
        }
    }
    async enrichWithTrends(terms, timeRange) {
        try {
            const previousRange = this.getPreviousTimeRange(timeRange);
            const previousCounters = await this.getSearchCounters(previousRange);
            terms.forEach(term => {
                const previousCount = previousCounters[term.term] || 0;
                if (term.count > previousCount * 1.2) {
                    term.trend = 'up';
                }
                else if (term.count < previousCount * 0.8) {
                    term.trend = 'down';
                }
                else {
                    term.trend = 'stable';
                }
            });
        }
        catch (error) {
            this.logger.error('计算趋势失败', error);
            terms.forEach(term => {
                term.trend = 'stable';
            });
        }
    }
    getPreviousTimeRange(timeRange) {
        switch (timeRange) {
            case 'day':
                return 'yesterday';
            case 'week':
                return 'last_week';
            case 'month':
                return 'last_month';
            default:
                return 'last_week';
        }
    }
    isStopWord(term) {
        const stopWords = [
            '的',
            '了',
            '在',
            '是',
            '我',
            '有',
            '和',
            '就',
            '不',
            '人',
            '都',
            '一',
            '个',
            '上',
            '也',
            '很',
            '到',
            '说',
            '要',
            '去',
            '你',
            '会',
            '着',
            '没有',
            '看',
            '好',
            '自己',
            '这',
            'the',
            'a',
            'an',
            'and',
            'or',
            'but',
            'in',
            'on',
            'at',
            'to',
            'for',
            'of',
            'with',
            'by',
            'is',
            'are',
            'was',
            'were',
            'be',
            'been',
            'being',
            'have',
            'has',
            'had',
            'do',
            'does',
            'did',
            'will',
            'would',
            'could',
            'should',
            'may',
            'might',
            'must',
            'can',
            'this',
            'that',
            'these',
            'those',
        ];
        return stopWords.includes(term.toLowerCase());
    }
    async clearCache() {
        try {
            await this.cacheService.delete('search', 'popular');
            this.logger.log('热门搜索缓存已清除');
        }
        catch (error) {
            this.logger.error('清除热门搜索缓存失败', error);
        }
    }
    async addPopularSearchTerm(term, category) {
        try {
            const normalizedTerm = term.toLowerCase().trim();
            await this.incrementSearchCount(normalizedTerm);
            await this.clearCache();
            this.logger.log(`已添加热门搜索词: ${normalizedTerm}`);
        }
        catch (error) {
            this.logger.error('添加热门搜索词失败', error);
        }
    }
    async getSearchTrends(days = 7) {
        try {
            const allPopular = await this.getPopularSearches({
                limit: 50,
                includeTrends: true,
                timeRange: 'week',
            });
            return {
                trendingUp: allPopular.filter(term => term.trend === 'up'),
                trendingDown: allPopular.filter(term => term.trend === 'down'),
                stable: allPopular.filter(term => term.trend === 'stable'),
            };
        }
        catch (error) {
            this.logger.error('获取搜索趋势失败', error);
            return {
                trendingUp: [],
                trendingDown: [],
                stable: [],
            };
        }
    }
};
exports.PopularSearchService = PopularSearchService;
exports.PopularSearchService = PopularSearchService = PopularSearchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        cache_service_1.CacheService,
        search_suggestion_service_1.SearchSuggestionService,
        products_service_1.ProductsService])
], PopularSearchService);
