export declare class MetricsService {
    private readonly logger;
    private metrics;
    constructor();
    private initializeMetrics;
    recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void;
    updateActiveConnections(count: number): void;
    recordDatabaseQuery(operation: string, table: string, duration: number): void;
    recordCacheHit(): void;
    recordCacheMiss(): void;
    getMetrics(): {
        derived: {
            httpRequestDurationAvg: number;
            databaseQueryDurationAvg: number;
            cacheHitRate: number;
            errorRate: number;
        };
        timestamp: string;
        httpRequests: {
            total: number;
            byMethod: Record<string, number>;
            byRoute: Record<string, number>;
            byStatus: Record<string, number>;
        };
        httpRequestDurations: {
            data: number[];
            buckets: {
                '0-100': number;
                '100-500': number;
                '500-1000': number;
                '1000-2000': number;
                '2000+': number;
            };
        };
        httpRequestErrors: {
            total: number;
            byMethod: Record<string, number>;
            byRoute: Record<string, number>;
            byStatus: Record<string, number>;
        };
        activeConnections: number;
        databaseQueries: {
            total: number;
            durations: number[];
            byOperation: Record<string, number>;
            byTable: Record<string, number>;
        };
        cache: {
            hits: number;
            misses: number;
        };
    };
    getMetricsSummary(): {
        httpRequests: {
            total: number;
            errorRate: number;
            avgResponseTime: number;
        };
        database: {
            totalQueries: number;
            avgQueryTime: number;
        };
        cache: {
            hitRate: number;
        };
        connections: {
            active: number;
        };
        timestamp: string;
    };
    getMetricsByCategory(category: 'http' | 'database' | 'cache' | 'connections'): {
        requests: {
            total: number;
            byMethod: Record<string, number>;
            byRoute: Record<string, number>;
            byStatus: Record<string, number>;
        };
        durations: {
            data: number[];
            buckets: {
                '0-100': number;
                '100-500': number;
                '500-1000': number;
                '1000-2000': number;
                '2000+': number;
            };
        };
        errors: {
            total: number;
            byMethod: Record<string, number>;
            byRoute: Record<string, number>;
            byStatus: Record<string, number>;
        };
        derived: {
            avgResponseTime: number;
            errorRate: number;
            avgQueryTime?: undefined;
            hitRate?: undefined;
        };
        queries?: undefined;
        cache?: undefined;
        activeConnections?: undefined;
    } | {
        queries: {
            total: number;
            durations: number[];
            byOperation: Record<string, number>;
            byTable: Record<string, number>;
        };
        derived: {
            avgQueryTime: number;
            avgResponseTime?: undefined;
            errorRate?: undefined;
            hitRate?: undefined;
        };
        requests?: undefined;
        durations?: undefined;
        errors?: undefined;
        cache?: undefined;
        activeConnections?: undefined;
    } | {
        cache: {
            hits: number;
            misses: number;
        };
        derived: {
            hitRate: number;
            avgResponseTime?: undefined;
            errorRate?: undefined;
            avgQueryTime?: undefined;
        };
        requests?: undefined;
        durations?: undefined;
        errors?: undefined;
        queries?: undefined;
        activeConnections?: undefined;
    } | {
        activeConnections: number;
        requests?: undefined;
        durations?: undefined;
        errors?: undefined;
        derived?: undefined;
        queries?: undefined;
        cache?: undefined;
    } | {
        requests?: undefined;
        durations?: undefined;
        errors?: undefined;
        derived?: undefined;
        queries?: undefined;
        cache?: undefined;
        activeConnections?: undefined;
    };
}
