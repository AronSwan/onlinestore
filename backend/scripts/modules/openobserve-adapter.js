// 用途：脚本侧 OpenObserve 配置适配器（优先 dist，失败回退 env）
// 作者：运维与后端联合
// 时间：2025-10-09

function loadFromEnv() {
  const url = process.env.OPENOBSERVE_URL || process.env.OPENOBSERVE_BASE_URL || '';
  const organization = process.env.OPENOBSERVE_ORGANIZATION || process.env.OPENOBSERVE_ORG || '';
  const token = process.env.OPENOBSERVE_TOKEN || process.env.ZO_TOKEN || '';
  return { baseUrl: url, organization, token };
}

function ensureUrl(u) {
  if (!u) return u;
  // 规范 baseUrl，去除末尾斜杠
  return u.endsWith('/') ? u.replace(/\/+$/, '') : u;
}

function getOpenObserve() {
  try {
    // 优先使用后端编译产物
    const { EnvironmentAdapter } = require('../../dist/src/config/environment-adapter.js');
    const cfg = EnvironmentAdapter.getOpenObserve();
    return {
      baseUrl: ensureUrl(cfg.baseUrl),
      organization: cfg.organization,
      token: cfg.token,
    };
  } catch {
    // 回退到环境变量
    const cfg = loadFromEnv();
    return {
      baseUrl: ensureUrl(cfg.baseUrl),
      organization: cfg.organization,
      token: cfg.token,
    };
  }
}

function loadRedisFromEnv() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '5000', 10),
    enabled: process.env.REDIS_ENABLED === 'true' || process.env.REDIS_ENABLED === '1',
  };
}

function getRedis() {
  try {
    const { EnvironmentAdapter } = require('../../dist/src/config/environment-adapter.js');
    const cfg = EnvironmentAdapter.getRedis ? EnvironmentAdapter.getRedis() : loadRedisFromEnv();
    return cfg;
  } catch {
    return loadRedisFromEnv();
  }
}

function loadSlackFromEnv() {
  return {
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    channel: process.env.SLACK_CHANNEL || '#security-alerts',
    username: process.env.SLACK_USERNAME || 'Security Bot',
    enabled: (process.env.SLACK_ENABLED || 'false').toLowerCase() === 'true',
  };
}
function loadEmailFromEnv() {
  return {
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    from: process.env.EMAIL_FROM || '',
    to: (process.env.EMAIL_TO || '').split(',').map(s => s.trim()).filter(Boolean),
    enabled: (process.env.EMAIL_ENABLED || 'false').toLowerCase() === 'true',
  };
}
function getSlack() {
  try {
    const { EnvironmentAdapter } = require('../../dist/src/config/environment-adapter.js');
    return EnvironmentAdapter.getSlack ? EnvironmentAdapter.getSlack() : loadSlackFromEnv();
  } catch {
    return loadSlackFromEnv();
  }
}
function getEmail() {
  try {
    const { EnvironmentAdapter } = require('../../dist/src/config/environment-adapter.js');
    return EnvironmentAdapter.getEmail ? EnvironmentAdapter.getEmail() : loadEmailFromEnv();
  } catch {
    return loadEmailFromEnv();
  }
}
module.exports = { getOpenObserve, getRedis, getSlack, getEmail };