// 用途：统一环境适配器 - 为各服务初始化提供一致的环境/配置读取
// 依赖：unified-master.config.ts, cqrs-openobserve.config.ts
// 作者：后端开发团队
// 时间：2025-10-09

/* decoupled: avoid importing cqrs-openobserve.config to prevent circular dependency */
import { createMasterConfiguration } from './unified-master.config';

// 由于 registerAs 返回函数式配置，适配器在运行时直接构造一次静态快照。
// 注意：如需对动态变更敏感，可改为注入 ConfigService 获取最新值。
const master = createMasterConfiguration();

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
  /**
   * 可选的指标配置，供上层配置文件复用适配器提供的运行时覆盖。
   * 若未提供，将在 cqrs-openobserve.config.ts 中使用环境变量与默认值兜底。
   */
  metrics?: {
    histogramBuckets?: {
      /** SWR 刷新耗时桶（毫秒） */
      swrRefreshMs?: number[];
    };
    labels?: {
      /** 是否启用缓存键前缀标签 */
      enableCacheKeyPrefix: boolean;
      /** 缓存键前缀分段数 */
      cacheKeyPrefixSegments: number;
      /** 是否启用域名标签 */
      enableDomain: boolean;
    };
  };
}

export const EnvironmentAdapter = {
  // 基本环境态
  env(): string {
    return master.app.env;
  },
  isDev(): boolean {
    return master.app.env === 'development';
  },
  isProd(): boolean {
    return master.app.env === 'production';
  },
  isTest(): boolean {
    return master.app.env === 'test';
  },

  // OpenObserve 统一读取（供日志/追踪/监控初始化）
  getOpenObserve(): OpenObserveRuntimeConfig {
    const baseUrl =
      process.env.OPENOBSERVE_URL || master.monitoring.openobserveUrl || 'http://localhost:5080';
    const organization = process.env.OPENOBSERVE_ORG || 'default';
    const token = process.env.OPENOBSERVE_TOKEN || '';
    // 运行时指标配置（适配器提供，供上层配置复用或覆盖）
    const swrBucketsEnv = process.env.CQRS_SWR_REFRESH_BUCKETS;
    const swrRefreshMs = (swrBucketsEnv
      ? swrBucketsEnv
          .split(',')
          .map(v => parseInt(v.trim(), 10))
          .filter(v => !isNaN(v))
      : undefined) || [50, 100, 200, 500, 1000, 2000, 5000, 10000];
    const enableCacheKeyPrefix = process.env.CQRS_SWR_LABEL_CACHEKEY_PREFIX_ENABLED !== 'false';
    const cacheKeyPrefixSegments = parseInt(
      process.env.CQRS_SWR_LABEL_CACHEKEY_PREFIX_SEGMENTS || '2',
      10,
    );
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
        evaluationInterval: parseInt(
          process.env.OPENOBSERVE_ALERTS_EVALUATION_INTERVAL || '60000',
          10,
        ),
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

  // Redis 常用读取
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

  // 通用超时设置（例如外部HTTP、初始化等待等）
  getDefaultTimeoutMs(): number {
    // 复用数据库连接超时作为通用兜底
    return master.database.connectionTimeout || 60000;
  },
};
