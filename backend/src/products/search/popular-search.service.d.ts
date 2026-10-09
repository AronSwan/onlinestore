import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../cache/cache.service';
import { SearchSuggestionService } from './search-suggestion.service';
import { ProductsService } from '../products.service';
export interface PopularSearchTerm {
    term: string;
    count: number;
    category?: string;
    trend: 'up' | 'down' | 'stable';
    lastUpdated: string;
}
export interface PopularSearchOptions {
    limit?: number;
    includeTrends?: boolean;
    timeRange?: 'day' | 'week' | 'month';
    category?: string;
}
export declare class PopularSearchService {
    private readonly configService;
    private readonly cacheService;
    private readonly searchSuggestionService;
    private readonly productsService;
    private readonly logger;
    private readonly cacheTTL;
    private readonly popularSearchesCacheKey;
    private readonly searchHistoryCacheKey;
    constructor(configService: ConfigService, cacheService: CacheService, searchSuggestionService: SearchSuggestionService, productsService: ProductsService);
    getPopularSearches(options?: PopularSearchOptions): Promise<PopularSearchTerm[]>;
    recordSearch(query: string, userId?: string, resultCount?: number): Promise<void>;
    private incrementSearchCount;
    private calculatePopularSearches;
    private getSearchCounters;
    private filterByCategory;
    private enrichWithTrends;
    private getPreviousTimeRange;
    private isStopWord;
    clearCache(): Promise<void>;
    addPopularSearchTerm(term: string, category?: string): Promise<void>;
    getSearchTrends(days?: number): Promise<{
        trendingUp: PopularSearchTerm[];
        trendingDown: PopularSearchTerm[];
        stable: PopularSearchTerm[];
    }>;
}
