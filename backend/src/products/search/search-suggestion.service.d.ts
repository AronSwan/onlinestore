import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../cache/cache.service';
import { SearchManagerService } from './search-manager.service';
import { ProductsService } from '../products.service';
export interface SearchSuggestion {
    text: string;
    category?: string;
    popularity: number;
    highlight?: string;
}
export interface SearchSuggestionOptions {
    limit?: number;
    includeCategories?: boolean;
    includePopular?: boolean;
    minCharacters?: number;
}
export declare class SearchSuggestionService {
    private readonly configService;
    private readonly cacheService;
    private readonly searchManager;
    private readonly productsService;
    private readonly logger;
    private readonly suggestionCacheTTL;
    private readonly popularSearchesCacheKey;
    private readonly categorySuggestionsCacheKey;
    constructor(configService: ConfigService, cacheService: CacheService, searchManager: SearchManagerService, productsService: ProductsService);
    getSuggestions(query: string, options?: SearchSuggestionOptions): Promise<SearchSuggestion[]>;
    private getProductSuggestions;
    private getCategorySuggestions;
    private getPopularSearchSuggestions;
    private highlightText;
    private deduplicateSuggestions;
    recordSearch(query: string, userId?: string, resultCount?: number): Promise<void>;
    clearCache(): Promise<void>;
}
