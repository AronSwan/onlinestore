export interface OpenObserveRuntimeConfig {
    baseUrl: string;
    organization: string;
    token: string;
    streams: {
        commands: string;
        queries: string;
        events: string;
        metrics: string;
        traces: string;
    };
    endpoints: {
        logs: string;
        metrics: string;
        traces: string;
    };
    performance: {
        batchSize: number;
        flushInterval: number;
        maxRetries: number;
        timeout: number;
    };
    tracing: {
        enabled: boolean;
        samplingRate: number;
    };
    alerts: {
        enabled: boolean;
        evaluationInterval: number;
    };
    metrics?: {
        histogramBuckets?: {
            swrRefreshMs?: number[];
        };
        labels?: {
            enableCacheKeyPrefix: boolean;
            cacheKeyPrefixSegments: number;
            enableDomain: boolean;
        };
    };
}
export declare const EnvironmentAdapter: {
    env(): string;
    isDev(): boolean;
    isProd(): boolean;
    isTest(): boolean;
    getOpenObserve(): OpenObserveRuntimeConfig;
    getRedis(): {
        host: string;
        port: number;
        password: string | undefined;
        db: number;
        tls: boolean;
        connectTimeout: number;
        commandTimeout: number;
        enabled: boolean;
    };
    getDefaultTimeoutMs(): number;
};
