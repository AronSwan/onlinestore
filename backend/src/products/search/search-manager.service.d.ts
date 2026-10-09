import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SearchOptions, SearchResult, ProductIndexData } from './search-strategy.interface';
import { MeiliSearchService } from './meilisearch.service';
import { ZincSearchService } from './zincsearch.service';
export declare enum SearchEngine {
    MEILISEARCH = "meilisearch",
    ZINCSEARCH = "zincsearch"
}
export declare class SearchManagerService implements OnModuleInit {
    private configService;
    private meiliSearchService;
    private zincSearchService;
    private readonly logger;
    private strategies;
    private currentStrategy;
    private fallbackStrategy;
    private healthCheckInterval;
    private isInitialized;
    private isSearchEnabled;
    constructor(configService: ConfigService, meiliSearchService: MeiliSearchService, zincSearchService: ZincSearchService);
    onModuleInit(): Promise<void>;
    private initialize;
    private startHealthMonitoring;
    private performHealthCheck;
    private switchToFallback;
    search(query: string, options?: SearchOptions): Promise<SearchResult>;
    indexProduct(product: ProductIndexData): Promise<void>;
    indexProducts(products: ProductIndexData[]): Promise<void>;
    deleteProduct(productId: string): Promise<void>;
    getStatus(): Promise<{
        currentEngine: SearchEngine;
        fallbackEngine: SearchEngine;
        strategies: Array<{
            engine: SearchEngine;
            name: string;
            isHealthy: boolean;
        }>;
    }>;
    switchEngine(engine: SearchEngine): Promise<void>;
    reinitialize(): Promise<void>;
    private considerSwitchBack;
    private isStrategyHealthy;
    onModuleDestroy(): void;
}
