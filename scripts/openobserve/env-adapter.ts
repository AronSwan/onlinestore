/**
 * OpenObserve 环境变量适配器
 * - 统一读取 OPENOBSERVE_* 变量
 * - 对历史变体 OPENOBSERVE_BASE_URL / OPENOBSERVE_ORG 做回退映射
 * - 输出弃用警告，帮助尽快统一命名
 */
export interface OpenObserveEnv {
  url: string;
  organization: string;
  token: string;
  streams?: {
    commands?: string;
    queries?: string;
    events?: string;
    metrics?: string;
    traces?: string;
  };
  otlp?: {
    logsEndpoint?: string;
    metricsEndpoint?: string;
    tracesEndpoint?: string;
  };
}

function warnDeprecated(name: string, replacement: string) {
  // 仅在本地/开发环境输出，避免生产日志污染
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(`[OpenObserve Env] 检测到过时变量 ${name}，已回退到 ${replacement}，请尽快统一环境命名。`);
  }
}

export function getOpenObserveEnv(): OpenObserveEnv {
  const url =
    process.env.OPENOBSERVE_URL ||
    (process.env.OPENOBSERVE_BASE_URL ? (warnDeprecated('OPENOBSERVE_BASE_URL', 'OPENOBSERVE_URL'), process.env.OPENOBSERVE_BASE_URL) : undefined);

  const organization =
    process.env.OPENOBSERVE_ORGANIZATION ||
    (process.env.OPENOBSERVE_ORG ? (warnDeprecated('OPENOBSERVE_ORG', 'OPENOBSERVE_ORGANIZATION'), process.env.OPENOBSERVE_ORG) : undefined) ||
    'default';

  const token = process.env.OPENOBSERVE_TOKEN || '';

  const streams = {
    commands: process.env.CQRS_STREAM_COMMANDS || 'cqrs-commands',
    queries: process.env.CQRS_STREAM_QUERIES || 'cqrs-queries',
    events: process.env.CQRS_STREAM_EVENTS || 'cqrs-events',
    metrics: process.env.CQRS_STREAM_METRICS || 'cqrs-metrics',
    traces: process.env.CQRS_STREAM_TRACES || 'traces',
  };

  const otlp = {
    logsEndpoint: process.env.OTLP_LOGS_ENDPOINT || (url ? `${url}/otlp/v1/logs` : undefined),
    metricsEndpoint: process.env.OTLP_METRICS_ENDPOINT || (url ? `${url}/otlp/v1/metrics` : undefined),
    tracesEndpoint: process.env.OTLP_TRACES_ENDPOINT || (url ? `${url}/otlp/v1/traces` : undefined),
  };

  if (!url) {
    throw new Error('OPENOBSERVE_URL 未设置（或 OPENOBSERVE_BASE_URL 未设置），请配置环境变量。');
  }
  if (!token) {
    throw new Error('OPENOBSERVE_TOKEN 未设置，请配置环境变量或通过密钥管理注入。');
  }

  return { url, organization, token, streams, otlp };
}

/**
 * 使用示例：
 * const env = getOpenObserveEnv();
 * await fetch(`${env.url}/api/${env.organization}/${env.streams.commands}/_json`, { ... });
 */