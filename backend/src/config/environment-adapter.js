/**
 * 用途：JS 适配器桥接文件，供纯 JS 模块读取统一环境适配器。
 * 优先加载已编译的 dist 版本；若不可用则回退到环境变量。
 * 作者：后端开发团队
 * 时间：2025-10-09
 */
let adapter = null;

try {
  // 优先使用已编译的 TS 产物
  const { EnvironmentAdapter } = require('../../dist/src/config/environment-adapter.js');
  if (EnvironmentAdapter && typeof EnvironmentAdapter.getOpenObserve === 'function') {
    adapter = EnvironmentAdapter;
  }
} catch (_) {
  // ignore
}

function getOpenObserve() {
  if (adapter) {
    return adapter.getOpenObserve();
  }
  // env 回退
  const baseUrl = process.env.OPENOBSERVE_URL || 'http://localhost:5080';
  const organization = process.env.OPENOBSERVE_ORGANIZATION || 'default';
  const token = process.env.OPENOBSERVE_TOKEN || '';
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
  };
}

module.exports = { getOpenObserve };