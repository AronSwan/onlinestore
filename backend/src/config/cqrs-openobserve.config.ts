// 用途：CQRS模块OpenObserve配置
// 作者：后端开发团队
// 时间：2025-10-09

import { registerAs } from '@nestjs/config';
import { EnvironmentAdapter } from './environment-adapter';

export interface CqrsOpenObserveConfig {
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

export default registerAs('cqrsOpenObserve', (): CqrsOpenObserveConfig => {
  const oo = (EnvironmentAdapter as any)?.getOpenObserve?.() ?? {} as any;
  const baseUrl = oo.baseUrl || process.env.OPENOBSERVE_URL || 'http://localhost:5080';
  const organization = oo.organization || process.env.OPENOBSERVE_ORG || 'default';
  const token = oo.token || process.env.OPENOBSERVE_TOKEN || '';
  const swrBucketsEnv = process.env.CQRS_SWR_REFRESH_BUCKETS;
  const swrBuckets = (swrBucketsEnv
    ? swrBucketsEnv.split(',').map(v => parseInt(v.trim(), 10)).filter(v => !isNaN(v))
    : undefined) || [50, 100, 200, 500, 1000, 2000, 5000, 10000];
  const enableCacheKeyPrefix = process.env.CQRS_SWR_LABEL_CACHEKEY_PREFIX_ENABLED !== 'false';
  const cacheKeyPrefixSegments = parseInt(process.env.CQRS_SWR_LABEL_CACHEKEY_PREFIX_SEGMENTS || '2', 10);
  const enableDomain = process.env.CQRS_SWR_LABEL_DOMAIN_ENABLED !== 'false';
  return {
  baseUrl: baseUrl,
  organization: organization,
  token: token,
  streams: {
    commands: process.env.CQRS_STREAM_COMMANDS || 'cqrs-commands',
    queries: process.env.CQRS_STREAM_QUERIES || 'cqrs-queries',
    events: process.env.CQRS_STREAM_EVENTS || 'cqrs-events',
    metrics: process.env.CQRS_STREAM_METRICS || 'cqrs-metrics',
    traces: process.env.CQRS_STREAM_TRACES || 'traces',
  },
  endpoints: {
    logs: oo.endpoints?.logs || `${baseUrl}/otlp/v1/logs`,
    metrics: oo.endpoints?.metrics || `${baseUrl}/otlp/v1/metrics`,
    traces: oo.endpoints?.traces || `${baseUrl}/otlp/v1/traces`,
  },
  performance: {
    batchSize: oo.performance?.batchSize ?? parseInt(process.env.OPENOBSERVE_BATCH_SIZE || '100', 10),
    flushInterval: oo.performance?.flushInterval ?? parseInt(process.env.OPENOBSERVE_FLUSH_INTERVAL || '5000', 10),
    maxRetries: oo.performance?.maxRetries ?? parseInt(process.env.OPENOBSERVE_MAX_RETRIES || '3', 10),
    timeout: oo.performance?.timeout ?? parseInt(process.env.OPENOBSERVE_TIMEOUT || '10000', 10),
  },
  tracing: {
    enabled: oo.tracing?.enabled ?? (process.env.OPENOBSERVE_TRACING_ENABLED !== 'false'),
    samplingRate: oo.tracing?.samplingRate ?? parseFloat(process.env.OPENOBSERVE_TRACING_SAMPLING_RATE || '0.1'),
  },
  alerts: {
    enabled: oo.alerts?.enabled ?? (process.env.OPENOBSERVE_ALERTS_ENABLED !== 'false'),
    evaluationInterval: oo.alerts?.evaluationInterval ?? parseInt(process.env.OPENOBSERVE_ALERTS_EVALUATION_INTERVAL || '60000', 10),
  },
  metrics: {
    histogramBuckets: {
      swrRefreshMs: oo.metrics?.histogramBuckets?.swrRefreshMs || swrBuckets,
    },
    labels: {
      enableCacheKeyPrefix: oo.metrics?.labels?.enableCacheKeyPrefix ?? enableCacheKeyPrefix,
      cacheKeyPrefixSegments: oo.metrics?.labels?.cacheKeyPrefixSegments ?? cacheKeyPrefixSegments,
      enableDomain: oo.metrics?.labels?.enableDomain ?? enableDomain,
    },
  },
  };
});