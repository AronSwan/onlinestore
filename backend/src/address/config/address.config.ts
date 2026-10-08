import { registerAs } from '@nestjs/config';

export default registerAs('address', () => ({
  // 缓存配置
  cache: {
    geocodeTTL: parseInt(process.env.ADDRESS_GEOCODE_TTL || '2592000', 10), // 30天
    reverseTTL: parseInt(process.env.ADDRESS_REVERSE_TTL || '604800', 10), // 7天
    failedTTL: parseInt(process.env.ADDRESS_FAILED_TTL || '14400', 10), // 4小时
  },

  // 队列配置
  queue: {
    defaultJobOptions: {
      removeOnComplete: parseInt(process.env.ADDRESS_QUEUE_REMOVE_COMPLETE || '100', 10),
      removeOnFail: parseInt(process.env.ADDRESS_QUEUE_REMOVE_FAIL || '50', 10),
      attempts: parseInt(process.env.ADDRESS_QUEUE_ATTEMPTS || '3', 10),
      backoff: {
        type: 'exponential',
        delay: parseInt(process.env.ADDRESS_QUEUE_BACKOFF_DELAY || '2000', 10),
      },
    },
    batchSize: parseInt(process.env.ADDRESS_BATCH_SIZE || '10', 10),
    batchDelay: parseInt(process.env.ADDRESS_BATCH_DELAY || '1000', 10),
  },

  // Nominatim 配置
  nominatim: {
    baseUrl: process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org',
    userAgent:
      process.env.NOMINATIM_USER_AGENT || 'CaddyStyleShoppingSite/1.0 (contact@example.com)',
    timeout: parseInt(process.env.NOMINATIM_TIMEOUT || '10000', 10),
    rateLimit: parseInt(process.env.NOMINATIM_RATE_LIMIT || '1000', 10), // 1秒间隔
    email: process.env.NOMINATIM_EMAIL || 'admin@example.com',
    requestsPerSecond: parseInt(process.env.NOMINATIM_REQUESTS_PER_SECOND || '1', 10),
    retryAttempts: parseInt(process.env.NOMINATIM_RETRY_ATTEMPTS || '3', 10),
    retryDelayMs: parseInt(process.env.NOMINATIM_RETRY_DELAY_MS || '1000', 10),
  },

  // 验证配置
  validation: {
    maxAddressLength: parseInt(process.env.ADDRESS_MAX_LENGTH || '500', 10),
    minAddressLength: parseInt(process.env.ADDRESS_MIN_LENGTH || '1', 10),
    confidenceThreshold: parseFloat(process.env.ADDRESS_CONFIDENCE_THRESHOLD || '0.7'),
    maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE || '10', 10),
  },

  // 数据库配置
  database: {
    coordinatePrecision: parseInt(process.env.ADDRESS_COORDINATE_PRECISION || '15', 10),
    coordinateScale: parseInt(process.env.ADDRESS_COORDINATE_SCALE || '10', 10),
    cleanupDays: parseInt(process.env.ADDRESS_CLEANUP_DAYS || '90', 10),
  },

  // 日志配置
  logging: {
    level: process.env.ADDRESS_LOG_LEVEL || 'info',
    enableSensitiveLogging: process.env.ENABLE_SENSITIVE_LOGGING === 'true',
  },

  // 性能配置
  performance: {
    timeoutMs: parseInt(process.env.NOMINATIM_TIMEOUT_MS || '10000', 10),
  },
}));
