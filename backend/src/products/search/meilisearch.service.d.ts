import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { SearchStrategy, SearchOptions, SearchResult, ProductIndexData } from './search-strategy.interface';
export declare class MeiliSearchService implements SearchStrategy {
    private configService;
    private httpService;
    private readonly logger;
    private baseUrl;
    private apiKey;
    private indexName;
    private isConnected;
    constructor(configService: ConfigService, httpService: HttpService);
    private initializeClient;
    search(query: string, options?: SearchOptions): Promise<SearchResult>;
    indexProduct(product: ProductIndexData): Promise<void>;
    indexProducts(products: ProductIndexData[]): Promise<void>;
    deleteProduct(productId: string): Promise<void>;
    healthCheck(): Promise<boolean>;
    getName(): string;
    private buildFilters;
    private transformHit;
    private transformProductForIndexing;
    initializeIndexSettings(): Promise<void>;
    private updateSearchableAttributes;
    private updateFilterableAttributes;
    private updateSortableAttributes;
}
