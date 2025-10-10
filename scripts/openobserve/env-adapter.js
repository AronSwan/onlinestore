/**
 * OpenObserve 环境变量适配器（CommonJS 版本）
 * - 统一读取 OPENOBSERVE_* 变量
 * - 对历史变体 OPENOBSERVE_BASE_URL / OPENOBSERVE_ORG 做回退映射
 * - 非生产环境输出弃用警告
 */
function warnDeprecated(name, replacement) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[OpenObserve Env] 检测到过时变量 ${name}，已回退到 ${replacement}，请尽快统一环境命名。`);
  }
}

function getOpenObserveEnv() {
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

  if (!url) throw new Error('OPENOBSERVE_URL 未设置（或 OPENOBSERVE_BASE_URL 未设置），请配置环境变量。');
  if (!token) throw new Error('OPENOBSERVE_TOKEN 未设置，请配置环境变量或通过密钥管理注入。');

  return { url, organization, token, streams, otlp };
}

const env = (() => {
  try {
    return getOpenObserveEnv();
  } catch (e) {
    // 延迟失败：允许某些无 Token 的只读脚本先运行到登录步骤
    return {
      url:
        process.env.OPENOBSERVE_URL ||
        process.env.OPENOBSERVE_BASE_URL ||
        'http://localhost:5080',
      organization:
        process.env.OPENOBSERVE_ORGANIZATION ||
        process.env.OPENOBSERVE_ORG ||
        'default',
      token: process.env.OPENOBSERVE_TOKEN || '',
      streams: {
        commands: process.env.CQRS_STREAM_COMMANDS || 'cqrs-commands',
        queries: process.env.CQRS_STREAM_QUERIES || 'cqrs-queries',
        events: process.env.CQRS_STREAM_EVENTS || 'cqrs-events',
        metrics: process.env.CQRS_STREAM_METRICS || 'cqrs-metrics',
        traces: process.env.CQRS_STREAM_TRACES || 'traces',
      },
      otlp: {
        logsEndpoint: process.env.OTLP_LOGS_ENDPOINT || undefined,
        metricsEndpoint: process.env.OTLP_METRICS_ENDPOINT || undefined,
        tracesEndpoint: process.env.OTLP_TRACES_ENDPOINT || undefined,
      },
    };
  }
})();

module.exports = {
  getOpenObserveEnv,
  env,
  OPENOBSERVE_URL: env.url,
  OPENOBSERVE_ORGANIZATION: env.organization,
  OPENOBSERVE_TOKEN: env.token,
  OPENOBSERVE_STREAMS: env.streams,
  OTLP_ENDPOINTS: env.otlp,
};