import { ConfigService } from '@nestjs/config';
import { SearchStrategy, SearchOptions, SearchResult, ProductIndexData } from './search-strategy.interface';
export declare class ZincSearchService implements SearchStrategy {
    private configService;
    private readonly logger;
    private baseUrl;
    private indexName;
    private username;
    private password;
    private isConnected;
    constructor(configService: ConfigService);
    private initializeClient;
    private makeRequest;
    private isValidUrl;
    search(query: string, options?: SearchOptions): Promise<SearchResult>;
    indexProduct(product: ProductIndexData): Promise<void>;
    indexProducts(products: ProductIndexData[]): Promise<void>;
    deleteProduct(productId: string): Promise<void>;
    healthCheck(): Promise<boolean>;
    getName(): string;
    private buildQueryWithFilters;
    private transformHit;
    private transformProductForIndexing;
    createIndexMapping(): Promise<void>;
}
