declare const _default: (() => {
    cache: {
        geocodeTTL: number;
        reverseTTL: number;
        failedTTL: number;
    };
    queue: {
        defaultJobOptions: {
            removeOnComplete: number;
            removeOnFail: number;
            attempts: number;
            backoff: {
                type: string;
                delay: number;
            };
        };
        batchSize: number;
        batchDelay: number;
    };
    nominatim: {
        baseUrl: string;
        userAgent: string;
        timeout: number;
        rateLimit: number;
        email: string;
        requestsPerSecond: number;
        retryAttempts: number;
        retryDelayMs: number;
    };
    validation: {
        maxAddressLength: number;
        minAddressLength: number;
        confidenceThreshold: number;
        maxBatchSize: number;
    };
    database: {
        coordinatePrecision: number;
        coordinateScale: number;
        cleanupDays: number;
    };
    logging: {
        level: string;
        enableSensitiveLogging: boolean;
    };
    performance: {
        timeoutMs: number;
    };
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    cache: {
        geocodeTTL: number;
        reverseTTL: number;
        failedTTL: number;
    };
    queue: {
        defaultJobOptions: {
            removeOnComplete: number;
            removeOnFail: number;
            attempts: number;
            backoff: {
                type: string;
                delay: number;
            };
        };
        batchSize: number;
        batchDelay: number;
    };
    nominatim: {
        baseUrl: string;
        userAgent: string;
        timeout: number;
        rateLimit: number;
        email: string;
        requestsPerSecond: number;
        retryAttempts: number;
        retryDelayMs: number;
    };
    validation: {
        maxAddressLength: number;
        minAddressLength: number;
        confidenceThreshold: number;
        maxBatchSize: number;
    };
    database: {
        coordinatePrecision: number;
        coordinateScale: number;
        cleanupDays: number;
    };
    logging: {
        level: string;
        enableSensitiveLogging: boolean;
    };
    performance: {
        timeoutMs: number;
    };
}>;
export default _default;
