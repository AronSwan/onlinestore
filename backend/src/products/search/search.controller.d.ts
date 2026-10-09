import { SearchManagerService } from './search-manager.service';
import { SearchSuggestionService } from './search-suggestion.service';
import { PopularSearchService } from './popular-search.service';
import { SearchResult } from './search-strategy.interface';
import { ProductsService } from '../products.service';
export declare class SearchController {
    private readonly searchManagerService;
    private readonly searchSuggestionService;
    private readonly popularSearchService;
    private readonly productsService;
    constructor(searchManagerService: SearchManagerService, searchSuggestionService: SearchSuggestionService, popularSearchService: PopularSearchService, productsService: ProductsService);
    search(q: string, limit: number, offset: number, category?: string, minPrice?: string, maxPrice?: string): Promise<SearchResult>;
    getSuggestions(q: string, limit: number): Promise<string[]>;
    getPopularSearches(limit: number, includeTrends: boolean, timeRange: 'day' | 'week' | 'month', category?: string): Promise<import("./popular-search.service").PopularSearchTerm[]>;
    recordSearchHistory(body: {
        query: string;
        userId?: string;
        resultCount?: number;
    }): Promise<void>;
    getSearchTrends(days: string): Promise<{
        trendingUp: import("./popular-search.service").PopularSearchTerm[];
        trendingDown: import("./popular-search.service").PopularSearchTerm[];
        stable: import("./popular-search.service").PopularSearchTerm[];
    }>;
    addPopularSearchTerm(body: {
        term: string;
        category?: string;
    }): Promise<void>;
    clearSearchCache(): Promise<void>;
    getSearchStatus(): Promise<{
        currentEngine: import("./search-manager.service").SearchEngine;
        fallbackEngine: import("./search-manager.service").SearchEngine;
        strategies: Array<{
            engine: import("./search-manager.service").SearchEngine;
            name: string;
            isHealthy: boolean;
        }>;
    }>;
    switchSearchEngine(engine: string): Promise<void>;
    reinitializeSearchEngine(): Promise<void>;
}
