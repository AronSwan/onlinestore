// 安全常量配置 - 支持环境变量覆盖
export const SECURITY_CONSTANTS = {
  // JWT 安全配置
  JWT: {
    MIN_SECRET_LENGTH: parseInt(process.env.JWT_MIN_SECRET_LENGTH || '32', 10),
    ALGORITHM: process.env.JWT_ALGORITHM || 'RS256', // 升级为RSA-SHA256非对称加密
    ISSUER: process.env.JWT_ISSUER || 'caddy-shopping-api',
    AUDIENCE: process.env.JWT_AUDIENCE || 'caddy-shopping-client',
    KEY_SIZE: parseInt(process.env.JWT_KEY_SIZE || '2048', 10), // RSA密钥长度
    KEY_FORMAT: process.env.JWT_KEY_FORMAT || 'pkcs8', // 私钥格式
    PUBLIC_KEY_FORMAT: process.env.JWT_PUBLIC_KEY_FORMAT || 'spki', // 公钥格式
    TOKEN_EXPIRY: process.env.JWT_TOKEN_EXPIRY || '1h',
    REFRESH_TOKEN_EXPIRY: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
  },

  // 支付安全配置
  // CALLBACK_TIMEOUT_MINUTES: 回调/时间戳有效期（分钟），已设为 15 分钟。
  // 单笔支付上限完全由环境变量 PAYMENT_MAX_AMOUNT 控制：
  //   - PAYMENT_MAX_AMOUNT 未设置或为 0 -> 表示无限制
  //   - PAYMENT_MAX_AMOUNT 为正整数（单位：分）-> 使用该值作为单笔上限
  PAYMENT: {
    MAX_RETRY_COUNT: parseInt(process.env.PAYMENT_MAX_RETRY_COUNT || '3', 10),
    CALLBACK_TIMEOUT_MINUTES: parseInt(process.env.PAYMENT_CALLBACK_TIMEOUT_MINUTES || '15', 10),
    NONCE_EXPIRY_MINUTES: parseInt(process.env.PAYMENT_NONCE_EXPIRY_MINUTES || '15', 10),
    MAX_AMOUNT_PER_TRANSACTION: (() => {
      const v = process.env.PAYMENT_MAX_AMOUNT;
      if (!v) return 0; // 0 表示无限制
      const n = Number(v);
      return Number.isNaN(n) ? 0 : Math.max(0, Math.floor(n));
    })(),
    RATE_LIMIT: {
      CREATE_PAYMENT: {
        ttl: parseInt(process.env.PAYMENT_RATE_LIMIT_CREATE_TTL || '60', 10),
        limit: parseInt(process.env.PAYMENT_RATE_LIMIT_CREATE_LIMIT || '10', 10),
      },
      CALLBACK: {
        ttl: parseInt(process.env.PAYMENT_RATE_LIMIT_CALLBACK_TTL || '60', 10),
        limit: parseInt(process.env.PAYMENT_RATE_LIMIT_CALLBACK_LIMIT || '100', 10),
      },
      QUERY: {
        ttl: parseInt(process.env.PAYMENT_RATE_LIMIT_QUERY_TTL || '60', 10),
        limit: parseInt(process.env.PAYMENT_RATE_LIMIT_QUERY_LIMIT || '60', 10),
      },
    },
  },

  // 加密配置 (现代化AES-GCM实现)
  ENCRYPTION: {
    ALGORITHM: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
    // 强制使用32字节（64字符）密钥长度，提供最高安全性
    KEY_LENGTH: 32, // 256位 = 32字节 = 64字符
    IV_LENGTH: parseInt(process.env.ENCRYPTION_IV_LENGTH || '12', 10), // GCM推荐12字节IV
    TAG_LENGTH: parseInt(process.env.ENCRYPTION_TAG_LENGTH || '16', 10), // GCM认证标签长度
  },

  // 日志掩码配置
  LOG_MASK: {
    SENSITIVE_FIELDS: process.env.LOG_MASK_SENSITIVE_FIELDS?.split(',') || [
      'password',
      'secret',
      'token',
      'key',
      'signature',
      'cardNumber',
      'cvv',
      'pin',
      'privateKey',
      'apiKey',
      'accessToken',
      'refreshToken',
    ],
    MASK_CHAR: process.env.LOG_MASK_CHAR || '*',
    VISIBLE_CHARS: parseInt(process.env.LOG_MASK_VISIBLE_CHARS || '4', 10), // 显示前后各4个字符
  },

  // 请求验证
  REQUEST_VALIDATION: {
    MAX_PAYLOAD_SIZE: process.env.REQUEST_MAX_PAYLOAD_SIZE || '10mb',
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    CSRF_COOKIE_NAME: process.env.CSRF_COOKIE_NAME || 'csrf-token',
  },

  // 安全检查配置
  SECURITY_CHECK: {
    ENABLED: process.env.SECURITY_CHECK_ENABLED === 'true',
    FAIL_ON_HIGH: process.env.SECURITY_CHECK_FAIL_ON_HIGH === 'true',
    SCAN_TIMEOUT: parseInt(process.env.SECURITY_CHECK_SCAN_TIMEOUT || '300000', 10), // 5分钟
    CACHE_ENABLED: process.env.SECURITY_CHECK_CACHE_ENABLED !== 'false',
    CACHE_DIR: process.env.SECURITY_CHECK_CACHE_DIR || '.security-cache',
  },

  // 监控配置
  MONITORING: {
    ENABLED: process.env.SECURITY_MONITORING_ENABLED !== 'false',
    ALERT_THRESHOLD: parseInt(process.env.SECURITY_ALERT_THRESHOLD || '5', 10),
    RETENTION_DAYS: parseInt(process.env.SECURITY_LOG_RETENTION_DAYS || '30', 10),
  },
};

// 敏感字段检测正则
export const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /signature/i,
  /card.*number/i,
  /cvv/i,
  /pin/i,
  /private.*key/i,
  /api.*key/i,
  /access.*token/i,
  /refresh.*token/i,
];
