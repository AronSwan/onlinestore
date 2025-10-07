import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as Joi from 'joi';

// 环境类型
export enum Environment {
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  STAGING = 'staging',
  PRODUCTION = 'production',
  LOCAL = 'local',
}

// 部署模式
export enum DeploymentMode {
  STANDALONE = 'standalone',
  CLUSTER = 'cluster',
  MICROSERVICE = 'microservice',
  SERVERLESS = 'serverless',
}

// 环境配置接口
export interface EnvironmentConfig {
  name: Environment;
  displayName: string;
  description: string;
  deploymentMode: DeploymentMode;
  features: FeatureFlags;
  database: DatabaseConfig;
  redis: RedisConfig;
  logging: LoggingConfig;
  monitoring: MonitoringConfig;
  security: SecurityConfig;
  performance: PerformanceConfig;
  integrations: IntegrationsConfig;
  resources: ResourceConfig;
  networking: NetworkingConfig;
  storage: StorageConfig;
}

// 功能开关
export interface FeatureFlags {
  [key: string]: boolean | FeatureFlagConfig;
}

export interface FeatureFlagConfig {
  enabled: boolean;
  rolloutPercentage?: number;
  userGroups?: string[];
  startDate?: Date;
  endDate?: Date;
  conditions?: Record<string, any>;
}

// 数据库配置
export interface DatabaseConfig {
  primary: {
    type: 'postgres' | 'mysql' | 'mongodb' | 'sqlite';
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
    poolSize: number;
    timeout: number;
  };
  replica?: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
  };
  migrations: {
    enabled: boolean;
    directory: string;
    autoRun: boolean;
  };
}

// Redis配置
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  database: number;
  keyPrefix: string;
  ttl: number;
  cluster?: {
    enabled: boolean;
    nodes: Array<{ host: string; port: number }>;
  };
}

// 日志配置
export interface LoggingConfig {
  level: string;
  format: string;
  outputs: string[];
  elasticsearch?: {
    enabled: boolean;
    nodes: string[];
    index: string;
  };
  file?: {
    enabled: boolean;
    path: string;
    maxSize: string;
    maxFiles: number;
  };
}

// 监控配置
export interface MonitoringConfig {
  enabled: boolean;
  prometheus: {
    enabled: boolean;
    port: number;
    path: string;
  };
  jaeger: {
    enabled: boolean;
    endpoint: string;
    serviceName: string;
  };
  healthChecks: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };
}

// 安全配置
export interface SecurityConfig {
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  cors: {
    enabled: boolean;
    origins: string[];
    methods: string[];
    credentials: boolean;
  };
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    max: number;
  };
  encryption: {
    algorithm: string;
    key: string;
  };
}

// 性能配置
export interface PerformanceConfig {
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  compression: {
    enabled: boolean;
    level: number;
  };
  clustering: {
    enabled: boolean;
    workers: number;
  };
  timeout: {
    request: number;
    database: number;
    external: number;
  };
}

// 集成配置
export interface IntegrationsConfig {
  payment: {
    provider: string;
    apiKey: string;
    webhookSecret: string;
    sandbox: boolean;
  };
  email: {
    provider: string;
    apiKey: string;
    fromAddress: string;
    templates: Record<string, string>;
  };
  sms: {
    provider: string;
    apiKey: string;
    fromNumber: string;
  };
  storage: {
    provider: string;
    bucket: string;
    region: string;
    accessKey: string;
    secretKey: string;
  };
}

// 资源配置
export interface ResourceConfig {
  cpu: {
    limit: string;
    request: string;
  };
  memory: {
    limit: string;
    request: string;
  };
  disk: {
    size: string;
    type: string;
  };
  scaling: {
    minReplicas: number;
    maxReplicas: number;
    targetCPU: number;
    targetMemory: number;
  };
}

// 网络配置
export interface NetworkingConfig {
  port: number;
  host: string;
  ssl: {
    enabled: boolean;
    cert?: string;
    key?: string;
  };
  proxy: {
    enabled: boolean;
    url?: string;
    timeout: number;
  };
  loadBalancer: {
    enabled: boolean;
    algorithm: string;
    healthCheck: string;
  };
}

// 存储配置
export interface StorageConfig {
  uploads: {
    path: string;
    maxSize: number;
    allowedTypes: string[];
  };
  temp: {
    path: string;
    cleanupInterval: number;
  };
  backup: {
    enabled: boolean;
    schedule: string;
    retention: number;
    destination: string;
  };
}

// 环境验证规则
export interface EnvironmentValidationRule {
  path: string;
  schema: Joi.Schema;
  required: boolean;
  description: string;
}

// 环境比较结果
export interface EnvironmentComparison {
  source: Environment;
  target: Environment;
  differences: ConfigDifference[];
  summary: {
    added: number;
    modified: number;
    removed: number;
  };
}

export interface ConfigDifference {
  path: string;
  type: 'added' | 'modified' | 'removed';
  sourceValue?: any;
  targetValue?: any;
}

@Injectable()
export class EnvironmentService implements OnModuleInit {
  private readonly logger = new Logger(EnvironmentService.name);
  private currentEnvironment: Environment;
  private environmentConfigs = new Map<Environment, EnvironmentConfig>();
  private validationRules: EnvironmentValidationRule[] = [];

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  private async initialize(): Promise<void> {
    // 检测当前环境
    this.currentEnvironment = this.detectEnvironment();

    // 加载所有环境配置
    await this.loadAllEnvironmentConfigs();

    // 加载验证规则
    await this.loadValidationRules();

    // 验证当前环境配置
    await this.validateCurrentEnvironment();

    this.logger.log(`Environment service initialized for: ${this.currentEnvironment}`);
  }

  private detectEnvironment(): Environment {
    const nodeEnv = this.configService.get('NODE_ENV', 'development').toLowerCase();
    const envOverride = this.configService.get('ENVIRONMENT_OVERRIDE');

    if (envOverride) {
      return envOverride as Environment;
    }

    switch (nodeEnv) {
      case 'production':
      case 'prod':
        return Environment.PRODUCTION;
      case 'staging':
      case 'stage':
        return Environment.STAGING;
      case 'testing':
      case 'test':
        return Environment.TESTING;
      case 'local':
        return Environment.LOCAL;
      default:
        return Environment.DEVELOPMENT;
    }
  }

  private async loadAllEnvironmentConfigs(): Promise<void> {
    const environments = Object.values(Environment);

    for (const env of environments) {
      try {
        const config = await this.loadEnvironmentConfig(env);
        this.environmentConfigs.set(env, config);
        this.logger.debug(`Loaded configuration for environment: ${env}`);
      } catch (error) {
        this.logger.warn(`Failed to load configuration for environment: ${env}`, error.message);
      }
    }
  }

  private async loadEnvironmentConfig(environment: Environment): Promise<EnvironmentConfig> {
    const configPaths = [
      `./config/environments/${environment}.yaml`,
      `./config/environments/${environment}.yml`,
      `./config/environments/${environment}.json`,
      `./config/${environment}.yaml`,
      `./config/${environment}.yml`,
      `./config/${environment}.json`,
    ];

    let config: Partial<EnvironmentConfig> = {};
    let configLoaded = false;

    // 尝试从文件加载配置
    for (const configPath of configPaths) {
      try {
        const fullPath = path.resolve(configPath);
        const content = await fs.readFile(fullPath, 'utf-8');

        if (configPath.endsWith('.json')) {
          config = JSON.parse(content);
        } else {
          config = yaml.load(content) as Partial<EnvironmentConfig>;
        }

        configLoaded = true;
        this.logger.debug(`Loaded config from: ${configPath}`);
        break;
      } catch (error) {
        // 继续尝试下一个路径
      }
    }

    // 如果没有找到配置文件，使用默认配置
    if (!configLoaded) {
      config = this.getDefaultEnvironmentConfig(environment);
      this.logger.warn(`No config file found for ${environment}, using defaults`);
    }

    // 合并环境变量覆盖
    const envOverrides = this.getEnvironmentVariableOverrides(environment);
    const mergedConfig = this.mergeConfigs(config, envOverrides);

    return this.normalizeEnvironmentConfig(mergedConfig, environment);
  }

  private getDefaultEnvironmentConfig(environment: Environment): Partial<EnvironmentConfig> {
    const baseConfig = {
      name: environment,
      displayName: this.getEnvironmentDisplayName(environment),
      description: `Default configuration for ${environment} environment`,
      deploymentMode: this.getDefaultDeploymentMode(environment),
      features: this.getDefaultFeatureFlags(environment),
      database: this.getDefaultDatabaseConfig(environment),
      redis: this.getDefaultRedisConfig(environment),
      logging: this.getDefaultLoggingConfig(environment),
      monitoring: this.getDefaultMonitoringConfig(environment),
      security: this.getDefaultSecurityConfig(environment),
      performance: this.getDefaultPerformanceConfig(environment),
      integrations: this.getDefaultIntegrationsConfig(environment),
      resources: this.getDefaultResourceConfig(environment),
      networking: this.getDefaultNetworkingConfig(environment),
      storage: this.getDefaultStorageConfig(environment),
    };

    return baseConfig;
  }

  private getEnvironmentDisplayName(environment: Environment): string {
    const names = {
      [Environment.DEVELOPMENT]: 'Development',
      [Environment.TESTING]: 'Testing',
      [Environment.STAGING]: 'Staging',
      [Environment.PRODUCTION]: 'Production',
      [Environment.LOCAL]: 'Local',
    };
    return names[environment] || environment;
  }

  private getDefaultDeploymentMode(environment: Environment): DeploymentMode {
    switch (environment) {
      case Environment.LOCAL:
      case Environment.DEVELOPMENT:
        return DeploymentMode.STANDALONE;
      case Environment.TESTING:
        return DeploymentMode.STANDALONE;
      case Environment.STAGING:
        return DeploymentMode.CLUSTER;
      case Environment.PRODUCTION:
        return DeploymentMode.MICROSERVICE;
      default:
        return DeploymentMode.STANDALONE;
    }
  }

  private getDefaultFeatureFlags(environment: Environment): FeatureFlags {
    const baseFlags = {
      userRegistration: true,
      paymentProcessing: true,
      emailNotifications: true,
      smsNotifications: false,
      advancedAnalytics: false,
      experimentalFeatures: false,
    };

    switch (environment) {
      case Environment.DEVELOPMENT:
      case Environment.LOCAL:
        return {
          ...baseFlags,
          experimentalFeatures: true,
          debugMode: true,
          mockPayments: true,
        };
      case Environment.TESTING:
        return {
          ...baseFlags,
          mockPayments: true,
          testDataGeneration: true,
        };
      case Environment.STAGING:
        return {
          ...baseFlags,
          advancedAnalytics: true,
        };
      case Environment.PRODUCTION:
        return {
          ...baseFlags,
          advancedAnalytics: true,
          performanceOptimizations: true,
        };
      default:
        return baseFlags;
    }
  }

  private getDefaultDatabaseConfig(environment: Environment): DatabaseConfig {
    const config: DatabaseConfig = {
      primary: {
        type: 'postgres' as const,
        host: this.configService.get('DB_HOST', 'localhost'),
        port: this.configService.get('DB_PORT', 5432),
        database: this.configService.get('DB_NAME', 'shopping_app'),
        username: this.configService.get('DB_USERNAME', 'postgres'),
        password: this.configService.get('DB_PASSWORD', 'password'),
        ssl: environment === Environment.PRODUCTION,
        poolSize: environment === Environment.PRODUCTION ? 20 : 10,
        timeout: 30000,
      },
      migrations: {
        enabled: true,
        directory: './src/database/migrations',
        autoRun: environment !== Environment.PRODUCTION,
      },
    };

    if (environment === Environment.PRODUCTION) {
      config.replica = {
        host: this.configService.get('DB_REPLICA_HOST', config.primary.host),
        port: this.configService.get('DB_REPLICA_PORT', config.primary.port),
        database: config.primary.database,
        username: config.primary.username,
        password: config.primary.password,
        ssl: true,
      };
    }

    return config;
  }

  private getDefaultRedisConfig(environment: Environment): RedisConfig {
    return {
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      database: this.configService.get('REDIS_DB', 0),
      keyPrefix: `shopping_app:${environment}:`,
      ttl: environment === Environment.PRODUCTION ? 3600 : 1800,
    };
  }

  private getDefaultLoggingConfig(environment: Environment): LoggingConfig {
    const baseConfig = {
      level: environment === Environment.PRODUCTION ? 'info' : 'debug',
      format: 'json',
      outputs: ['console'],
    };

    if (environment === Environment.PRODUCTION || environment === Environment.STAGING) {
      baseConfig.outputs.push('elasticsearch');
      (baseConfig as any).elasticsearch = {
        enabled: true,
        nodes: [this.configService.get('ELASTICSEARCH_URL', 'http://localhost:9200')],
        index: `shopping-app-logs-${environment}`,
      };
    }

    if (environment !== Environment.PRODUCTION) {
      baseConfig.outputs.push('file');
      (baseConfig as any).file = {
        enabled: true,
        path: `./logs/${environment}`,
        maxSize: '100MB',
        maxFiles: 10,
      };
    }

    return baseConfig;
  }

  private getDefaultMonitoringConfig(environment: Environment): MonitoringConfig {
    return {
      enabled: environment !== Environment.LOCAL,
      prometheus: {
        enabled: environment === Environment.PRODUCTION || environment === Environment.STAGING,
        port: 9090,
        path: '/metrics',
      },
      jaeger: {
        enabled: environment !== Environment.LOCAL,
        endpoint: this.configService.get('JAEGER_ENDPOINT', 'http://localhost:14268/api/traces'),
        serviceName: `shopping-app-${environment}`,
      },
      healthChecks: {
        enabled: true,
        interval: environment === Environment.PRODUCTION ? 30000 : 60000,
        timeout: 5000,
      },
    };
  }

  private getDefaultSecurityConfig(environment: Environment): SecurityConfig {
    return {
      jwt: {
        secret: this.configService.get('JWT_SECRET', 'default-secret-change-in-production'),
        expiresIn: environment === Environment.PRODUCTION ? '15m' : '1h',
        refreshExpiresIn: environment === Environment.PRODUCTION ? '7d' : '30d',
      },
      cors: {
        enabled: true,
        origins:
          environment === Environment.PRODUCTION
            ? [this.configService.get('FRONTEND_URL', 'https://shop.example.com')]
            : ['http://localhost:3000', 'http://localhost:8080'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true,
      },
      rateLimit: {
        enabled: environment === Environment.PRODUCTION,
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: environment === Environment.PRODUCTION ? 100 : 1000,
      },
      encryption: {
        algorithm: 'aes-256-gcm',
        key: this.configService.get('ENCRYPTION_KEY', 'default-key-change-in-production'),
      },
    };
  }

  private getDefaultPerformanceConfig(environment: Environment): PerformanceConfig {
    return {
      cache: {
        enabled: true,
        ttl: environment === Environment.PRODUCTION ? 3600000 : 1800000,
        maxSize: environment === Environment.PRODUCTION ? 10000 : 1000,
      },
      compression: {
        enabled: environment === Environment.PRODUCTION,
        level: 6,
      },
      clustering: {
        enabled: environment === Environment.PRODUCTION,
        workers: environment === Environment.PRODUCTION ? 0 : 1, // 0 = auto
      },
      timeout: {
        request: environment === Environment.PRODUCTION ? 30000 : 60000,
        database: 30000,
        external: 10000,
      },
    };
  }

  private getDefaultIntegrationsConfig(environment: Environment): IntegrationsConfig {
    return {
      payment: {
        provider: 'stripe',
        apiKey: this.configService.get('STRIPE_API_KEY', ''),
        webhookSecret: this.configService.get('STRIPE_WEBHOOK_SECRET', ''),
        sandbox: environment !== Environment.PRODUCTION,
      },
      email: {
        provider: 'sendgrid',
        apiKey: this.configService.get('SENDGRID_API_KEY', ''),
        fromAddress: this.configService.get('FROM_EMAIL', 'noreply@example.com'),
        templates: {
          welcome: 'welcome-template',
          orderConfirmation: 'order-confirmation-template',
          passwordReset: 'password-reset-template',
        },
      },
      sms: {
        provider: 'twilio',
        apiKey: this.configService.get('TWILIO_API_KEY', ''),
        fromNumber: this.configService.get('TWILIO_FROM_NUMBER', ''),
      },
      storage: {
        provider: 'aws-s3',
        bucket: this.configService.get('S3_BUCKET', `shopping-app-${environment}`),
        region: this.configService.get('AWS_REGION', 'us-east-1'),
        accessKey: this.configService.get('AWS_ACCESS_KEY_ID', ''),
        secretKey: this.configService.get('AWS_SECRET_ACCESS_KEY', ''),
      },
    };
  }

  private getDefaultResourceConfig(environment: Environment): ResourceConfig {
    const configs = {
      [Environment.LOCAL]: {
        cpu: { limit: '1000m', request: '100m' },
        memory: { limit: '1Gi', request: '256Mi' },
        disk: { size: '10Gi', type: 'standard' },
        scaling: { minReplicas: 1, maxReplicas: 1, targetCPU: 80, targetMemory: 80 },
      },
      [Environment.DEVELOPMENT]: {
        cpu: { limit: '1000m', request: '200m' },
        memory: { limit: '2Gi', request: '512Mi' },
        disk: { size: '20Gi', type: 'standard' },
        scaling: { minReplicas: 1, maxReplicas: 2, targetCPU: 70, targetMemory: 70 },
      },
      [Environment.TESTING]: {
        cpu: { limit: '2000m', request: '500m' },
        memory: { limit: '4Gi', request: '1Gi' },
        disk: { size: '50Gi', type: 'ssd' },
        scaling: { minReplicas: 2, maxReplicas: 4, targetCPU: 70, targetMemory: 70 },
      },
      [Environment.STAGING]: {
        cpu: { limit: '4000m', request: '1000m' },
        memory: { limit: '8Gi', request: '2Gi' },
        disk: { size: '100Gi', type: 'ssd' },
        scaling: { minReplicas: 2, maxReplicas: 8, targetCPU: 60, targetMemory: 60 },
      },
      [Environment.PRODUCTION]: {
        cpu: { limit: '8000m', request: '2000m' },
        memory: { limit: '16Gi', request: '4Gi' },
        disk: { size: '500Gi', type: 'nvme' },
        scaling: { minReplicas: 3, maxReplicas: 20, targetCPU: 50, targetMemory: 50 },
      },
    };

    return configs[environment] || configs[Environment.DEVELOPMENT];
  }

  private getDefaultNetworkingConfig(environment: Environment): NetworkingConfig {
    return {
      port: this.configService.get('PORT', 3000),
      host: this.configService.get('HOST', '0.0.0.0'),
      ssl: {
        enabled: environment === Environment.PRODUCTION,
        cert: this.configService.get('SSL_CERT_PATH'),
        key: this.configService.get('SSL_KEY_PATH'),
      },
      proxy: {
        enabled: environment === Environment.PRODUCTION,
        url: this.configService.get('PROXY_URL'),
        timeout: 30000,
      },
      loadBalancer: {
        enabled: environment === Environment.PRODUCTION || environment === Environment.STAGING,
        algorithm: 'round-robin',
        healthCheck: '/health',
      },
    };
  }

  private getDefaultStorageConfig(environment: Environment): StorageConfig {
    return {
      uploads: {
        path: './uploads',
        maxSize: environment === Environment.PRODUCTION ? 50 * 1024 * 1024 : 10 * 1024 * 1024, // 50MB prod, 10MB others
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      },
      temp: {
        path: './temp',
        cleanupInterval: 3600000, // 1 hour
      },
      backup: {
        enabled: environment === Environment.PRODUCTION || environment === Environment.STAGING,
        schedule: '0 2 * * *', // Daily at 2 AM
        retention: environment === Environment.PRODUCTION ? 30 : 7, // days
        destination: this.configService.get('BACKUP_DESTINATION', 's3://backups'),
      },
    };
  }

  private getEnvironmentVariableOverrides(environment: Environment): Partial<EnvironmentConfig> {
    // 实现环境变量覆盖逻辑
    // 这里可以根据特定的环境变量前缀来覆盖配置
    const overrides: any = {};

    // 例如：ENV_DATABASE_HOST -> database.primary.host
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(`${environment.toUpperCase()}_`)) {
        const configPath = key
          .substring(environment.length + 1)
          .toLowerCase()
          .split('_');
        this.setNestedValue(overrides, configPath, value);
      }
    }

    return overrides;
  }

  private setNestedValue(obj: any, path: string[], value: any): void {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    current[path[path.length - 1]] = this.parseValue(value);
  }

  private parseValue(value: string): any {
    // 尝试解析为JSON
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    // 解析布尔值
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // 解析数字
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

    return value;
  }

  private mergeConfigs(base: any, override: any): any {
    const result = { ...base };

    for (const [key, value] of Object.entries(override)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.mergeConfigs(result[key] || {}, value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private normalizeEnvironmentConfig(config: any, environment: Environment): EnvironmentConfig {
    // 确保所有必需的字段都存在
    return {
      name: environment,
      displayName: config.displayName || this.getEnvironmentDisplayName(environment),
      description: config.description || `Configuration for ${environment} environment`,
      deploymentMode: config.deploymentMode || this.getDefaultDeploymentMode(environment),
      features: config.features || this.getDefaultFeatureFlags(environment),
      database: config.database || this.getDefaultDatabaseConfig(environment),
      redis: config.redis || this.getDefaultRedisConfig(environment),
      logging: config.logging || this.getDefaultLoggingConfig(environment),
      monitoring: config.monitoring || this.getDefaultMonitoringConfig(environment),
      security: config.security || this.getDefaultSecurityConfig(environment),
      performance: config.performance || this.getDefaultPerformanceConfig(environment),
      integrations: config.integrations || this.getDefaultIntegrationsConfig(environment),
      resources: config.resources || this.getDefaultResourceConfig(environment),
      networking: config.networking || this.getDefaultNetworkingConfig(environment),
      storage: config.storage || this.getDefaultStorageConfig(environment),
    };
  }

  private async loadValidationRules(): Promise<void> {
    try {
      const rulesPath = './config/validation-rules.yaml';
      const content = await fs.readFile(rulesPath, 'utf-8');
      const rules = yaml.load(content) as any;

      this.validationRules = rules.map((rule: any) => ({
        path: rule.path,
        schema: this.createJoiSchema(rule.schema),
        required: rule.required || false,
        description: rule.description || '',
      }));
    } catch (error) {
      this.logger.warn('Could not load validation rules, using defaults');
      this.validationRules = this.getDefaultValidationRules();
    }
  }

  private createJoiSchema(schemaConfig: any): Joi.Schema {
    // 简化的Joi schema创建逻辑
    switch (schemaConfig.type) {
      case 'string':
        return Joi.string();
      case 'number':
        return Joi.number();
      case 'boolean':
        return Joi.boolean();
      case 'object':
        return Joi.object();
      case 'array':
        return Joi.array();
      default:
        return Joi.any();
    }
  }

  private getDefaultValidationRules(): EnvironmentValidationRule[] {
    return [
      {
        path: 'database.primary.host',
        schema: Joi.string().required(),
        required: true,
        description: 'Database host is required',
      },
      {
        path: 'database.primary.port',
        schema: Joi.number().port().required(),
        required: true,
        description: 'Database port must be a valid port number',
      },
      {
        path: 'security.jwt.secret',
        schema: Joi.string().min(32).required(),
        required: true,
        description: 'JWT secret must be at least 32 characters',
      },
    ];
  }

  private async validateCurrentEnvironment(): Promise<void> {
    const config = this.environmentConfigs.get(this.currentEnvironment);

    if (!config) {
      throw new Error(`Configuration not found for environment: ${this.currentEnvironment}`);
    }

    const errors: string[] = [];

    for (const rule of this.validationRules) {
      try {
        const value = this.getNestedValue(config, rule.path.split('.'));

        if (rule.required && (value === undefined || value === null)) {
          errors.push(`Required configuration missing: ${rule.path}`);
          continue;
        }

        if (value !== undefined && value !== null) {
          const { error } = rule.schema.validate(value);
          if (error) {
            errors.push(`Configuration validation failed for ${rule.path}: ${error.message}`);
          }
        }
      } catch (error) {
        errors.push(`Configuration validation error for ${rule.path}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      const message = `Environment configuration validation failed:\n${errors.join('\n')}`;
      this.logger.error(message);
      throw new Error(message);
    }

    this.logger.log(
      `Environment configuration validated successfully for: ${this.currentEnvironment}`,
    );
  }

  private getNestedValue(obj: any, path: string[]): any {
    let current = obj;
    for (const key of path) {
      if (current && typeof current === 'object') {
        current = current[key];
      } else {
        return undefined;
      }
    }
    return current;
  }

  // 公共API方法

  /**
   * 获取当前环境
   */
  getCurrentEnvironment(): Environment {
    return this.currentEnvironment;
  }

  /**
   * 获取环境配置
   */
  getEnvironmentConfig(environment?: Environment): EnvironmentConfig {
    const env = environment || this.currentEnvironment;
    const config = this.environmentConfigs.get(env);

    if (!config) {
      throw new Error(`Configuration not found for environment: ${env}`);
    }

    return config;
  }

  /**
   * 获取所有环境配置
   */
  getAllEnvironmentConfigs(): Map<Environment, EnvironmentConfig> {
    return new Map(this.environmentConfigs);
  }

  /**
   * 检查功能开关
   */
  isFeatureEnabled(featureName: string, environment?: Environment): boolean {
    const config = this.getEnvironmentConfig(environment);
    const feature = config.features[featureName];

    if (typeof feature === 'boolean') {
      return feature;
    }

    if (typeof feature === 'object' && feature.enabled !== undefined) {
      // 这里可以添加更复杂的功能开关逻辑，如用户组、时间范围等
      return feature.enabled;
    }

    return false;
  }

  /**
   * 获取功能开关配置
   */
  getFeatureConfig(featureName: string, environment?: Environment): FeatureFlagConfig | boolean {
    const config = this.getEnvironmentConfig(environment);
    return config.features[featureName];
  }

  /**
   * 比较环境配置
   */
  compareEnvironments(source: Environment, target: Environment): EnvironmentComparison {
    const sourceConfig = this.getEnvironmentConfig(source);
    const targetConfig = this.getEnvironmentConfig(target);

    const differences = this.findConfigDifferences(sourceConfig, targetConfig);

    const summary = {
      added: differences.filter(d => d.type === 'added').length,
      modified: differences.filter(d => d.type === 'modified').length,
      removed: differences.filter(d => d.type === 'removed').length,
    };

    return {
      source,
      target,
      differences,
      summary,
    };
  }

  private findConfigDifferences(source: any, target: any, basePath = ''): ConfigDifference[] {
    const differences: ConfigDifference[] = [];

    // 检查源配置中的键
    for (const [key, sourceValue] of Object.entries(source)) {
      const path = basePath ? `${basePath}.${key}` : key;
      const targetValue = target[key];

      if (targetValue === undefined) {
        differences.push({
          path,
          type: 'removed',
          sourceValue,
        });
      } else if (typeof sourceValue === 'object' && typeof targetValue === 'object') {
        differences.push(...this.findConfigDifferences(sourceValue, targetValue, path));
      } else if (sourceValue !== targetValue) {
        differences.push({
          path,
          type: 'modified',
          sourceValue,
          targetValue,
        });
      }
    }

    // 检查目标配置中新增的键
    for (const [key, targetValue] of Object.entries(target)) {
      const path = basePath ? `${basePath}.${key}` : key;

      if (source[key] === undefined) {
        differences.push({
          path,
          type: 'added',
          targetValue,
        });
      }
    }

    return differences;
  }

  /**
   * 验证环境配置
   */
  async validateEnvironment(
    environment: Environment,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const config = this.getEnvironmentConfig(environment);
    const errors: string[] = [];

    for (const rule of this.validationRules) {
      try {
        const value = this.getNestedValue(config, rule.path.split('.'));

        if (rule.required && (value === undefined || value === null)) {
          errors.push(`Required configuration missing: ${rule.path}`);
          continue;
        }

        if (value !== undefined && value !== null) {
          const { error } = rule.schema.validate(value);
          if (error) {
            errors.push(`Configuration validation failed for ${rule.path}: ${error.message}`);
          }
        }
      } catch (error) {
        errors.push(`Configuration validation error for ${rule.path}: ${error.message}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取环境信息
   */
  getEnvironmentInfo(): {
    current: Environment;
    available: Environment[];
    deploymentMode: DeploymentMode;
    isProduction: boolean;
  } {
    const config = this.getEnvironmentConfig();

    return {
      current: this.currentEnvironment,
      available: Object.values(Environment),
      deploymentMode: config.deploymentMode,
      isProduction: this.currentEnvironment === Environment.PRODUCTION,
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    const details: any = {
      currentEnvironment: this.currentEnvironment,
      configsLoaded: this.environmentConfigs.size,
      validationRules: this.validationRules.length,
    };

    try {
      const validation = await this.validateEnvironment(this.currentEnvironment);
      details.configValid = validation.valid;

      if (!validation.valid) {
        details.validationErrors = validation.errors;
      }

      const status = validation.valid ? 'healthy' : 'unhealthy';
      return { status, details };
    } catch (error) {
      details.error = error.message;
      return { status: 'unhealthy', details };
    }
  }
}
