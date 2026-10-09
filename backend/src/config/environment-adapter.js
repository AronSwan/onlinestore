"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentAdapter = void 0;
const unified_master_config_1 = require("./unified-master.config");
const master = (0, unified_master_config_1.createMasterConfiguration)();
exports.EnvironmentAdapter = {
    env() {
        return master.app.env;
    },
    isDev() {
        return master.app.env === 'development';
    },
    isProd() {
        return master.app.env === 'production';
    },
    isTest() {
        return master.app.env === 'test';
    },
    getOpenObserve() {
        const baseUrl = process.env.OPENOBSERVE_URL || master.monitoring.openobserveUrl || 'http://localhost:5080';
        const organization = process.env.OPENOBSERVE_ORG || 'default';
        const token = process.env.OPENOBSERVE_TOKEN || '';
        const swrBucketsEnv = process.env.CQRS_SWR_REFRESH_BUCKETS;
        const swrRefreshMs = (swrBucketsEnv
            ? swrBucketsEnv
                .split(',')
                .map(v => parseInt(v.trim(), 10))
                .filter(v => !isNaN(v))
            : undefined) || [50, 100, 200, 500, 1000, 2000, 5000, 10000];
        const enableCacheKeyPrefix = process.env.CQRS_SWR_LABEL_CACHEKEY_PREFIX_ENABLED !== 'false';
        const cacheKeyPrefixSegments = parseInt(process.env.CQRS_SWR_LABEL_CACHEKEY_PREFIX_SEGMENTS || '2', 10);
        const enableDomain = process.env.CQRS_SWR_LABEL_DOMAIN_ENABLED !== 'false';
        return {
            baseUrl,
            organization,
            token,
            streams: {
                commands: process.env.CQRS_STREAM_COMMANDS || 'cqrs-commands',
                queries: process.env.CQRS_STREAM_QUERIES || 'cqrs-queries',
                events: process.env.CQRS_STREAM_EVENTS || 'cqrs-events',
                metrics: process.env.CQRS_STREAM_METRICS || 'cqrs-metrics',
                traces: process.env.CQRS_STREAM_TRACES || 'traces',
            },
            endpoints: {
                logs: `${baseUrl}/otlp/v1/logs`,
                metrics: `${baseUrl}/otlp/v1/metrics`,
                traces: `${baseUrl}/otlp/v1/traces`,
            },
            performance: {
                batchSize: parseInt(process.env.OPENOBSERVE_BATCH_SIZE || '100', 10),
                flushInterval: parseInt(process.env.OPENOBSERVE_FLUSH_INTERVAL || '5000', 10),
                maxRetries: parseInt(process.env.OPENOBSERVE_MAX_RETRIES || '3', 10),
                timeout: parseInt(process.env.OPENOBSERVE_TIMEOUT || '10000', 10),
            },
            tracing: {
                enabled: process.env.OPENOBSERVE_TRACING_ENABLED !== 'false',
                samplingRate: parseFloat(process.env.OPENOBSERVE_TRACING_SAMPLING_RATE || '0.1'),
            },
            alerts: {
                enabled: process.env.OPENOBSERVE_ALERTS_ENABLED !== 'false',
                evaluationInterval: parseInt(process.env.OPENOBSERVE_ALERTS_EVALUATION_INTERVAL || '60000', 10),
            },
            metrics: {
                histogramBuckets: {
                    swrRefreshMs,
                },
                labels: {
                    enableCacheKeyPrefix,
                    cacheKeyPrefixSegments,
                    enableDomain,
                },
            },
        };
    },
    getRedis() {
        return {
            host: master.redis.host,
            port: master.redis.port,
            password: master.redis.password,
            db: master.redis.db,
            tls: master.redis.tls,
            connectTimeout: master.redis.connectTimeout,
            commandTimeout: master.redis.commandTimeout,
            enabled: this.isProd() ? true : (process.env.REDIS_ENABLED ?? 'true') !== 'false',
        };
    },
    getDefaultTimeoutMs() {
        return master.database.connectionTimeout || 60000;
    },
};
