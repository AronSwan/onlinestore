export declare class TiDBOptimizer {
    static validateTiDBConfig(): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    };
    static getTiDBOptimizationConfig(): {
        distributedTransaction: {
            enable: boolean;
            maxRetries: number;
            retryDelay: number;
            timeout: number;
        };
        sharding: {
            autoSplit: boolean;
            splitThreshold: number;
            maxShardSize: number;
            enableCrossShardQuery: boolean;
        };
        connectionPool: {
            minIdle: number;
            maxIdle: number;
            idleTimeout: number;
            acquireTimeout: number;
            validationQuery: string;
        };
        performance: {
            batchSize: number;
            chunkSize: number;
            parallelDegree: number;
            enableQueryCache: boolean;
            cacheSize: number;
        };
    };
    static generateTiDBReport(): string;
}
