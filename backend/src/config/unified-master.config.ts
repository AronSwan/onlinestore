// 用途：统一主配置管理器 - 整合所有配置功能
// 依赖文件：无
// 作者：后端开发团队
// 版本：v2.0.0
// 时间：2025-10-05

import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

// ================================
// 📋 配置接口定义
// ================================

export interface MasterConfig {
  app: AppConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JwtConfig;
  security: SecurityConfig;
  throttler: ThrottlerConfig;
  logging: LoggingConfig;
  monitoring: MonitoringConfig;
  upload: UploadConfig;
  mail: MailConfig;
  messaging: MessagingConfig;
  search: SearchConfig;
  i18n: I18nConfig;
  testing: TestingConfig;
}

export interface AppConfig {
  env: string;
  port: number;
  name: string;
  version: string;
  apiPrefix: string;
}

export interface DatabaseConfig {
  type: 'postgres' | 'mysql' | 'tidb' | 'sqlite';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database: string;
  charset: string;
  timezone: string;
  ssl: boolean;
  synchronize: boolean;
  logging: boolean;
  poolSize: number;
  maxConnections: number;
  minConnections: number;
  connectionTimeout: number;
  acquireTimeout: number;
  idleTimeout: number;
  // TiDB 特定配置
  tidb?: {
    clusterName: string;
    pdEndpoints: string;
    tikvEndpoints: string;
    tidbEndpoints: string;
    nodes: string;
    dashboardUrl: string;
  };
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  ttl: number;
  poolSize: number;
  connectTimeout: number;
  commandTimeout: number;
  tls: boolean;
  // 购物车特定配置
  cart: {
    db: number;
    cacheDb: number;
    cacheTtl: number;
    lockTimeout: number;
    lockRetryDelay: number;
    lockRetryCount: number;
  };
}

export interface JwtConfig {
  secret: string;
  algorithm: string;
  expiresIn: string;
  refreshExpiresIn: string;
  issuer: string;
  audience: string;
  // RSA 配置
  privateKey?: string;
  publicKey?: string;
  keySize: number;
  keyFormat: string;
  publicKeyFormat: string;
}

export interface SecurityConfig {
  encryption: {
    key: string;
    algorithm: string;
    keyLength: number;
    ivLength: number;
    tagLength: number;
  };
  payment: {
    signatureSecret: string;
    maxAmount: number;
    maxRetryCount: number;
    callbackTimeoutMinutes: number;
    nonceExpiryMinutes: number;
  };
  cors: {
    origins: string[];
    credentials: boolean;
  };
  ssrf: {
    allowedDomains: string[];
    blockPrivateIps: boolean;
  };
  fields: {
    passwordExclude: string[];
    responseExclude: string[];
  };
  csrf: {
    cookieName: string;
  };
  check: {
    enabled: boolean;
    failOnHigh: boolean;
    scanTimeout: number;
    cacheEnabled: boolean;
    cacheDir: string;
  };
}

export interface ThrottlerConfig {
  ttl: number;
  limit: number;
  payment: {
    createTtl: number;
    createLimit: number;
    callbackTtl: number;
    callbackLimit: number;
    queryTtl: number;
    queryLimit: number;
  };
}

export interface LoggingConfig {
  level: string;
  file: string;
  filePath: string;
  format: string;
  mask: {
    sensitiveFields: string[];
    char: string;
    visibleChars: number;
  };
  audit: {
    enabled: boolean;
    file: string;
    level: string;
  };
}

export interface MonitoringConfig {
  metrics: boolean;
  healthCheck: boolean;
  tracing: boolean;
  openobserveUrl: string;
  security: {
    enabled: boolean;
    alertThreshold: number;
    logRetentionDays: number;
  };
}

export interface UploadConfig {
  dest: string;
  maxFileSize: number;
  maxPayloadSize: string;
  provider: string;
  aws?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export interface MailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  provider: string;
  sendgrid?: {
    apiKey: string;
  };
}

export interface MessagingConfig {
  redpanda: {
    brokers: string;
    clientId: string;
    groupId: string;
  };
}

export interface SearchConfig {
  provider: string;
  meilisearch?: {
    host: string;
    apiKey: string;
  };
}

export interface I18nConfig {
  defaultTimezone: string;
  supportedLocales: string[];
  defaultLocale: string;
}

export interface TestingConfig {
  database: string;
  redisDb: number;
  jwtSecret: string;
  logLevel: string;
  metricsEnabled: boolean;
  uploadDest: string;
  maxFileSize: number;
}

// ================================
// 🔍 配置验证 Schema
// ================================

// 强制要求64字符密钥长度，提供最高安全性
const getEncryptionKeyValidation = () => {
  return Joi.string().length(64).required(); // 32字节 = 64字符
};

const configValidationSchema = Joi.object({
  // 应用配置
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  APP_NAME: Joi.string().default('caddy-style-shopping-backend'),
  APP_VERSION: Joi.string().default('1.0.0'),
  API_PREFIX: Joi.string().default('api'),

  // 数据库配置
  DB_TYPE: Joi.string().valid('postgres', 'mysql', 'tidb', 'sqlite').default('sqlite'),
  DB_HOST: Joi.string().when('DB_TYPE', {
    is: Joi.string().valid('postgres', 'mysql', 'tidb'),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  DB_PORT: Joi.number().when('DB_TYPE', {
    is: Joi.string().valid('postgres', 'mysql', 'tidb'),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  DB_USERNAME: Joi.string().when('DB_TYPE', {
    is: Joi.string().valid('postgres', 'mysql', 'tidb'),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  DB_PASSWORD: Joi.string()
    .allow('')
    .when('DB_TYPE', {
      is: Joi.string().valid('postgres', 'mysql', 'tidb'),
      then: Joi.optional(),
      otherwise: Joi.optional(),
    }),
  DB_DATABASE: Joi.string().required(),
  DB_POOL_SIZE: Joi.number().default(20),
  DB_CONNECTION_TIMEOUT: Joi.number().default(60000),

  // Redis 配置
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().default(0),
  REDIS_TTL: Joi.number().default(3600),

  // JWT 配置
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ALGORITHM: Joi.string().default('HS256'),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // 安全配置
  ENCRYPTION_ALGORITHM: Joi.string()
    .valid('aes-128-gcm', 'aes-192-gcm', 'aes-256-gcm', 'aes-256-cbc')
    .default('aes-256-gcm'),
  ENCRYPTION_KEY: getEncryptionKeyValidation(),
  PAYMENT_MAX_AMOUNT: Joi.number().default(1000000),
  CORS_ORIGINS: Joi.string().required(),

  // 限流配置
  THROTTLER_TTL: Joi.number().default(60),
  THROTTLER_LIMIT: Joi.number().default(100),

  // 日志配置
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('debug'),
  LOG_FILE: Joi.string().default('./logs/app.log'),

  // 监控配置
  METRICS_ENABLED: Joi.boolean().default(true),
  HEALTH_CHECK_ENABLED: Joi.boolean().default(true),

  // 文件上传配置
  UPLOAD_DEST: Joi.string().default('./uploads'),
  MAX_FILE_SIZE: Joi.number().default(10485760),
});

// ================================
// 🏭 配置工厂函数
// ================================

export const createMasterConfiguration = (): MasterConfig => {
  // 环境变量验证
  const { error, value: validatedEnvConfig } = configValidationSchema.validate(process.env, {
    allowUnknown: true,
    abortEarly: false,
  });

  const skipValidation =
    process.env.SKIP_CONFIG_VALIDATION === 'true' || process.env.NODE_ENV === 'development';
  if (error) {
    if (!skipValidation) {
      // 统一生产环境下的错误文案，使与强校验分支一致
      const firstDetail: any = (error as any).details?.[0];
      const key = firstDetail?.context?.key || firstDetail?.path?.[0];
      const type = firstDetail?.type;
      if (key === 'JWT_SECRET' && type && type.startsWith('string.')) {
        const actualLen = (process.env.JWT_SECRET || '').length;
        throw new Error(
          `生产环境 JWT_SECRET 必须至少32字符长度，当前长度: ${actualLen}。请设置有效的JWT密钥`,
        );
      }
      if (key === 'ENCRYPTION_KEY' && type === 'string.length') {
        const actualLen = (process.env.ENCRYPTION_KEY || '').length;
        throw new Error(
          `生产环境 ENCRYPTION_KEY 必须为64字符长度，当前长度: ${actualLen}。请设置有效的加密密钥`,
        );
      }
      // 其他情况保持原始错误格式
      throw new Error(`配置验证失败: ${error.message}`);
    } else {
      // 在开发或显式跳过验证时，统一中文警告文案并继续
      const details: any[] = (error as any).details || [];
      const msgs: string[] = [];
      for (const d of details) {
        const k = d?.context?.key || d?.path?.[0];
        const t = d?.type;
        if (k === 'JWT_SECRET' && t && t.startsWith('string.')) {
          const actualLen = (process.env.JWT_SECRET || '').length;
          msgs.push(`JWT_SECRET 至少为32字符，当前长度: ${actualLen}`);
          continue;
        }
        if (k === 'ENCRYPTION_KEY') {
          if (t === 'any.required' || t === 'string.empty') {
            msgs.push('ENCRYPTION_KEY 未提供或为空，开发环境将使用默认值');
            continue;
          }
          if (t === 'string.length') {
            const actualLen = (process.env.ENCRYPTION_KEY || '').length;
            msgs.push(`ENCRYPTION_KEY 必须为64字符，当前长度: ${actualLen}`);
            continue;
          }
        }
        // 其他字段保持原始消息但前缀中文说明
        if (k) {
          msgs.push(`字段 ${k} 校验失败: ${d?.message}`);
        } else if (d?.message) {
          msgs.push(`${d.message}`);
        }
      }
      const merged = msgs.length ? msgs.join('; ') : (error as any).message;
      console.warn(`⚠️ 跳过严格配置验证: ${merged}`);
    }
  }

  let env: any = validatedEnvConfig;
  if (skipValidation) {
    env.JWT_SECRET = env.JWT_SECRET || 'dev-jwt-secret-key-32-chars-xxxxxxxxxxxxxxxx';
    env.ENCRYPTION_KEY =
      env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    env.DB_DATABASE = env.DB_DATABASE || './data/dev_caddy_shopping.db';
    env.CORS_ORIGINS = env.CORS_ORIGINS || 'http://localhost:3000';
  }
  const isTest = env.NODE_ENV === 'test';
  const isProd = env.NODE_ENV === 'production';

  // 生产环境严格校验：禁止不完整配置与SQLite回退
  // 测试环境下放宽限制，允许使用SQLite进行单元测试
  // 同时考虑测试环境中可能临时设置生产环境模式的情况
  const shouldValidateProduction = isProd && !isTest && process.env.JEST_WORKER_ID === undefined;
  if (shouldValidateProduction) {
    // 禁止在生产环境使用 sqlite，避免隐式回退
    if (env.DB_TYPE === 'sqlite') {
      throw new Error(
        '生产环境禁止使用 sqlite 数据库，请设置 DB_TYPE 为 postgres/mysql/tidb 并提供连接信息',
      );
    }

    // 强制要求数据库核心参数
    const requiredDbKeys = ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_DATABASE'];
    const missingDb = requiredDbKeys.filter(k => !env[k] || `${env[k]}`.trim() === '');
    if (missingDb.length > 0) {
      throw new Error(`生产环境数据库配置缺失: ${missingDb.join(', ')}`);
    }

    // 强制要求 Redis 基本参数（不使用默认值）
    const requiredRedisKeys = ['REDIS_HOST', 'REDIS_PORT'];
    const missingRedis = requiredRedisKeys.filter(k => !env[k] || `${env[k]}`.trim() === '');
    if (missingRedis.length > 0) {
      throw new Error(`生产环境 Redis 配置缺失: ${missingRedis.join(', ')}`);
    }

    // 强制要求 JWT_SECRET 满足安全标准
    const jwtSecret = env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error(
        `生产环境 JWT_SECRET 必须至少32字符长度，当前长度: ${jwtSecret?.length || 0}。请设置有效的JWT密钥`,
      );
    }

    // 强制要求 ENCRYPTION_KEY 满足安全标准
    const encryptionKey = env.ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length !== 64) {
      throw new Error(
        `生产环境 ENCRYPTION_KEY 必须为64字符长度，当前长度: ${encryptionKey?.length || 0}。请设置有效的加密密钥`,
      );
    }

    // Kafka/Redpanda：若未显式禁用，则必须提供 broker 列表
    if (env.KAFKA_ENABLED !== 'false') {
      const brokers = env.REDPANDA_BROKERS;
      if (!brokers || `${brokers}`.trim() === '') {
        throw new Error('生产环境需设置 REDPANDA_BROKERS 或将 KAFKA_ENABLED=false');
      }
    }
  }

  return {
    app: {
      env: env.NODE_ENV,
      port: parseInt(env.PORT, 10),
      name: env.APP_NAME,
      version: env.APP_VERSION,
      apiPrefix: env.API_PREFIX,
    },

    database: {
      type: env.DB_TYPE,
      host: env.DB_HOST,
      port: env.DB_PORT ? parseInt(env.DB_PORT, 10) : undefined,
      username: env.DB_USERNAME,
      password: env.DB_PASSWORD,
      database: isTest ? env.TEST_DB_DATABASE || env.DB_DATABASE : env.DB_DATABASE,
      charset: env.DB_CHARSET || 'utf8mb4',
      timezone: env.DB_TIMEZONE || '+08:00',
      ssl: env.DB_SSL === 'true',
      synchronize: isProd ? false : env.DB_SYNCHRONIZE === 'true',
      logging: isProd ? false : env.DB_LOGGING === 'true',
      poolSize: parseInt(env.DB_POOL_SIZE, 10),
      maxConnections: parseInt(env.DB_MAX_CONNECTIONS, 10),
      minConnections: parseInt(env.DB_MIN_CONNECTIONS, 10),
      connectionTimeout: parseInt(env.DB_CONNECTION_TIMEOUT, 10),
      acquireTimeout: parseInt(env.DB_ACQUIRE_TIMEOUT, 10),
      idleTimeout: parseInt(env.DB_IDLE_TIMEOUT, 10),
      tidb:
        env.DB_TYPE === 'tidb'
          ? {
              clusterName: env.TIDB_CLUSTER_NAME,
              pdEndpoints: env.TIDB_PD_ENDPOINTS,
              tikvEndpoints: env.TIDB_TIKV_ENDPOINTS,
              tidbEndpoints: env.TIDB_TIDB_ENDPOINTS,
              nodes: env.TIDB_NODES,
              dashboardUrl: env.TIDB_DASHBOARD_URL,
            }
          : undefined,
    },

    redis: {
      host: env.REDIS_HOST,
      port: parseInt(env.REDIS_PORT, 10),
      password: env.REDIS_PASSWORD || undefined,
      db: isTest ? parseInt(env.TEST_REDIS_DB || env.REDIS_DB, 10) : parseInt(env.REDIS_DB, 10),
      keyPrefix: env.REDIS_KEY_PREFIX || 'caddy:',
      ttl: parseInt(env.REDIS_TTL, 10),
      poolSize: parseInt(env.REDIS_POOL_SIZE || '10', 10),
      connectTimeout: parseInt(env.REDIS_CONNECT_TIMEOUT || '10000', 10),
      commandTimeout: parseInt(env.REDIS_COMMAND_TIMEOUT || '5000', 10),
      tls: env.REDIS_TLS === 'true',
      cart: {
        db: parseInt(env.CART_REDIS_DB, 10),
        cacheDb: parseInt(env.CART_CACHE_REDIS_DB, 10),
        cacheTtl: parseInt(env.CART_CACHE_TTL, 10),
        lockTimeout: parseInt(env.CART_LOCK_TIMEOUT, 10),
        lockRetryDelay: parseInt(env.CART_LOCK_RETRY_DELAY, 10),
        lockRetryCount: parseInt(env.CART_LOCK_RETRY_COUNT, 10),
      },
    },

    jwt: {
      secret: isTest ? env.TEST_JWT_SECRET : env.JWT_SECRET,
      algorithm: env.JWT_ALGORITHM,
      expiresIn: env.JWT_EXPIRES_IN,
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
      issuer: env.JWT_ISSUER || 'caddy-shopping-api',
      audience: env.JWT_AUDIENCE || 'caddy-shopping-client',
      privateKey: env.JWT_PRIVATE_KEY,
      publicKey: env.JWT_PUBLIC_KEY,
      keySize: parseInt(env.JWT_KEY_SIZE || '2048', 10),
      keyFormat: env.JWT_KEY_FORMAT || 'pkcs8',
      publicKeyFormat: env.JWT_PUBLIC_KEY_FORMAT || 'spki',
    },

    security: {
      encryption: {
        key: env.ENCRYPTION_KEY,
        algorithm: env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
        keyLength: parseInt(env.ENCRYPTION_KEY_LENGTH || '32', 10),
        ivLength: parseInt(env.ENCRYPTION_IV_LENGTH || '12', 10),
        tagLength: parseInt(env.ENCRYPTION_TAG_LENGTH || '16', 10),
      },
      payment: {
        signatureSecret: env.PAYMENT_SIGNATURE_SECRET,
        maxAmount: parseInt(env.PAYMENT_MAX_AMOUNT, 10),
        maxRetryCount: parseInt(env.PAYMENT_MAX_RETRY_COUNT || '3', 10),
        callbackTimeoutMinutes: parseInt(env.PAYMENT_CALLBACK_TIMEOUT_MINUTES || '15', 10),
        nonceExpiryMinutes: parseInt(env.PAYMENT_NONCE_EXPIRY_MINUTES || '15', 10),
      },
      cors: {
        origins: env.CORS_ORIGINS.split(',').map((origin: string) => origin.trim()),
        credentials: env.CORS_CREDENTIALS === 'true',
      },
      ssrf: {
        allowedDomains: (env.SSRF_ALLOWED_DOMAINS || '')
          .split(',')
          .map((domain: string) => domain.trim()),
        blockPrivateIps: env.SSRF_BLOCK_PRIVATE_IPS === 'true',
      },
      fields: {
        passwordExclude: (env.PASSWORD_EXCLUDE_FIELDS || '')
          .split(',')
          .map((field: string) => field.trim()),
        responseExclude: (env.RESPONSE_EXCLUDE_FIELDS || '')
          .split(',')
          .map((field: string) => field.trim()),
      },
      csrf: {
        cookieName: env.CSRF_COOKIE_NAME || 'csrf-token',
      },
      check: {
        enabled: env.SECURITY_CHECK_ENABLED === 'true',
        failOnHigh: env.SECURITY_CHECK_FAIL_ON_HIGH === 'true',
        scanTimeout: parseInt(env.SECURITY_CHECK_SCAN_TIMEOUT || '300000', 10),
        cacheEnabled: env.SECURITY_CHECK_CACHE_ENABLED === 'true',
        cacheDir: env.SECURITY_CHECK_CACHE_DIR || '.security-cache',
      },
    },

    throttler: {
      ttl: parseInt(env.THROTTLER_TTL, 10),
      limit: parseInt(env.THROTTLER_LIMIT, 10),
      payment: {
        createTtl: parseInt(env.PAYMENT_RATE_LIMIT_CREATE_TTL || '60', 10),
        createLimit: parseInt(env.PAYMENT_RATE_LIMIT_CREATE_LIMIT || '10', 10),
        callbackTtl: parseInt(env.PAYMENT_RATE_LIMIT_CALLBACK_TTL || '60', 10),
        callbackLimit: parseInt(env.PAYMENT_RATE_LIMIT_CALLBACK_LIMIT || '100', 10),
        queryTtl: parseInt(env.PAYMENT_RATE_LIMIT_QUERY_TTL || '60', 10),
        queryLimit: parseInt(env.PAYMENT_RATE_LIMIT_QUERY_LIMIT || '60', 10),
      },
    },

    logging: {
      level: isTest
        ? env.TEST_LOG_LEVEL || 'error'
        : isProd
          ? env.PROD_LOG_LEVEL || 'info'
          : env.LOG_LEVEL,
      file: env.LOG_FILE,
      filePath: env.LOG_FILE_PATH,
      format: isProd ? env.PROD_LOG_FORMAT || 'json' : env.LOG_FORMAT || 'simple',
      mask: {
        sensitiveFields: (env.LOG_MASK_SENSITIVE_FIELDS || '')
          .split(',')
          .map((field: string) => field.trim()),
        char: env.LOG_MASK_CHAR || '*',
        visibleChars: parseInt(env.LOG_MASK_VISIBLE_CHARS || '4', 10),
      },
      audit: {
        enabled: env.AUDIT_LOG_ENABLED === 'true',
        file: env.AUDIT_LOG_FILE || './logs/audit.log',
        level: env.AUDIT_LOG_LEVEL || 'info',
      },
    },

    monitoring: {
      metrics: isTest ? env.TEST_METRICS_ENABLED === 'true' : env.METRICS_ENABLED === 'true',
      healthCheck: env.HEALTH_CHECK_ENABLED === 'true',
      tracing: isProd ? env.PROD_TRACING_ENABLED === 'true' : env.TRACING_ENABLED === 'true',
      openobserveUrl: env.OPENOBSERVE_URL || 'http://localhost:5080',
      security: {
        enabled: env.SECURITY_MONITORING_ENABLED === 'true',
        alertThreshold: parseInt(env.SECURITY_ALERT_THRESHOLD || '5', 10),
        logRetentionDays: parseInt(env.SECURITY_LOG_RETENTION_DAYS || '30', 10),
      },
    },

    upload: {
      dest: isTest ? env.TEST_UPLOAD_DEST || env.UPLOAD_DEST : env.UPLOAD_DEST,
      maxFileSize: isTest
        ? parseInt(env.TEST_MAX_FILE_SIZE || env.MAX_FILE_SIZE, 10)
        : parseInt(env.MAX_FILE_SIZE, 10),
      maxPayloadSize: env.REQUEST_MAX_PAYLOAD_SIZE || '10mb',
      provider: env.UPLOAD_PROVIDER || 'local',
      aws:
        env.UPLOAD_PROVIDER === 'aws-s3'
          ? {
              bucket: env.AWS_S3_BUCKET,
              region: env.AWS_S3_REGION,
              accessKeyId: env.AWS_ACCESS_KEY_ID,
              secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    },

    mail: {
      host: env.MAIL_HOST,
      port: parseInt(env.MAIL_PORT, 10),
      user: env.MAIL_USER,
      pass: env.MAIL_PASS,
      from: env.MAIL_FROM,
      provider: env.MAIL_PROVIDER || 'smtp',
      sendgrid:
        env.MAIL_PROVIDER === 'sendgrid'
          ? {
              apiKey: env.SENDGRID_API_KEY,
            }
          : undefined,
    },

    messaging: {
      redpanda: {
        brokers: env.REDPANDA_BROKERS || 'localhost:9092',
        clientId: env.REDPANDA_CLIENT_ID || 'caddy-shopping-backend',
        groupId: env.REDPANDA_GROUP_ID || 'caddy-shopping-group',
      },
    },

    search: {
      provider: env.SEARCH_PROVIDER || 'local',
      meilisearch:
        env.SEARCH_PROVIDER === 'meilisearch'
          ? {
              host: env.MEILISEARCH_HOST,
              apiKey: env.MEILISEARCH_API_KEY,
            }
          : undefined,
    },

    i18n: {
      defaultTimezone: env.DEFAULT_TIMEZONE || 'Asia/Shanghai',
      supportedLocales: (env.SUPPORTED_LOCALES || 'zh,en')
        .split(',')
        .map((locale: string) => locale.trim()),
      defaultLocale: env.DEFAULT_LOCALE || 'zh',
    },

    testing: {
      database: env.TEST_DB_DATABASE || './data/test_caddy_shopping.db',
      redisDb: parseInt(env.TEST_REDIS_DB || '15', 10),
      jwtSecret: env.TEST_JWT_SECRET || 'test-jwt-secret-key-for-testing-only-32-chars',
      logLevel: env.TEST_LOG_LEVEL || 'error',
      metricsEnabled: env.TEST_METRICS_ENABLED === 'true',
      uploadDest: env.TEST_UPLOAD_DEST || './test-uploads',
      maxFileSize: parseInt(env.TEST_MAX_FILE_SIZE || '1048576', 10),
    },
  };
};

// ================================
// 📤 导出配置
// ================================

export default registerAs('master', createMasterConfiguration);

// 导出类型和工厂函数
export { createMasterConfiguration as masterConfiguration };

// 验证函数
export const validateMasterConfiguration = (config: Record<string, unknown>) => {
  const { error, value } = configValidationSchema.validate(config, {
    allowUnknown: true,
    abortEarly: false,
  });

  if (error) {
    throw new Error(`Master configuration validation failed: ${error.message}`);
  }

  return value;
};
