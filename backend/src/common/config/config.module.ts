import { Module, DynamicModule, Global, Provider } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  DynamicConfigService,
  DynamicConfigServiceConfig,
  ConfigSourceType,
  ConfigFormat,
} from './config.service';
import { EnvironmentService, Environment } from './environment.service';
import { ConfigValidationService } from './config-validation.service';
import * as Joi from 'joi';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

// 配置模块选项
export interface ConfigModuleOptions {
  // 基础配置
  envFilePath?: string | string[];
  ignoreEnvFile?: boolean;
  isGlobal?: boolean;

  // 动态配置选项
  dynamicConfig?: Partial<DynamicConfigServiceConfig>;

  // 环境配置选项
  environment?: {
    autoDetect?: boolean;
    override?: Environment;
    configPath?: string;
  };

  // 验证选项
  validation?: {
    enabled?: boolean;
    config?: Record<string, any>;
    schema?: Joi.ObjectSchema;
    customRules?: any[];
  };

  // 加载选项
  load?: Array<() => any>;
  expandVariables?: boolean;
  cache?: boolean;
}

// 异步配置选项
export interface ConfigModuleAsyncOptions {
  imports?: any[];
  useFactory?: (...args: any[]) => Promise<ConfigModuleOptions> | ConfigModuleOptions;
  inject?: any[];
  isGlobal?: boolean;
}

// 配置工厂
export class ConfigFactory {
  /**
   * 创建数据库配置
   */
  static createDatabaseConfig() {
    return () => ({
      database: {
        primary: {
          type: process.env.DB_TYPE || 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          database: process.env.DB_NAME || 'shopping_app',
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          ssl: process.env.DB_SSL === 'true',
          poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
          timeout: parseInt(process.env.DB_TIMEOUT || '30000', 10),
        },
        replica: process.env.DB_REPLICA_HOST
          ? {
              host: process.env.DB_REPLICA_HOST,
              port: parseInt(process.env.DB_REPLICA_PORT || process.env.DB_PORT || '5432', 10),
              database: process.env.DB_REPLICA_NAME || process.env.DB_NAME || 'shopping_app',
              username: process.env.DB_REPLICA_USERNAME || process.env.DB_USERNAME || 'postgres',
              password: process.env.DB_REPLICA_PASSWORD || process.env.DB_PASSWORD || 'password',
              ssl: process.env.DB_REPLICA_SSL === 'true',
            }
          : undefined,
        migrations: {
          enabled: process.env.DB_MIGRATIONS_ENABLED !== 'false',
          directory: process.env.DB_MIGRATIONS_DIR || './src/database/migrations',
          autoRun: process.env.DB_MIGRATIONS_AUTO_RUN === 'true',
        },
      },
    });
  }

  /**
   * 创建Redis配置
   */
  static createRedisConfig() {
    return () => ({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        database: parseInt(process.env.REDIS_DB || '0', 10),
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'shopping_app:',
        ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
        cluster:
          process.env.REDIS_CLUSTER_ENABLED === 'true'
            ? {
                enabled: true,
                nodes:
                  process.env.REDIS_CLUSTER_NODES?.split(',').map(node => {
                    const [host, port] = node.split(':');
                    return { host, port: parseInt(port, 10) };
                  }) || [],
              }
            : undefined,
      },
    });
  }

  /**
   * 创建安全配置
   */
  static createSecurityConfig() {
    return () => ({
      security: {
        jwt: {
          secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
          expiresIn: process.env.JWT_EXPIRES_IN || '15m',
          refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        },
        cors: {
          enabled: process.env.CORS_ENABLED !== 'false',
          origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
          methods: process.env.CORS_METHODS?.split(',') || [
            'GET',
            'POST',
            'PUT',
            'DELETE',
            'PATCH',
          ],
          credentials: process.env.CORS_CREDENTIALS === 'true',
        },
        rateLimit: {
          enabled: process.env.RATE_LIMIT_ENABLED === 'true',
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
          max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
        },
        encryption: {
          algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
          key: process.env.ENCRYPTION_KEY || 'default-key-change-in-production',
        },
      },
    });
  }

  /**
   * 创建监控配置
   */
  static createMonitoringConfig() {
    return () => ({
      monitoring: {
        enabled: process.env.MONITORING_ENABLED !== 'false',
        prometheus: {
          enabled: process.env.PROMETHEUS_ENABLED === 'true',
          port: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),
          path: process.env.PROMETHEUS_PATH || '/metrics',
        },
        jaeger: {
          enabled: process.env.JAEGER_ENABLED === 'true',
          endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
          serviceName: process.env.JAEGER_SERVICE_NAME || 'shopping-app',
        },
        healthChecks: {
          enabled: process.env.HEALTH_CHECKS_ENABLED !== 'false',
          interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
          timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),
        },
      },
    });
  }

  /**
   * 创建应用配置
   */
  static createAppConfig() {
    return () => ({
      app: {
        name: process.env.APP_NAME || 'Shopping App',
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT || '3000', 10),
        host: process.env.HOST || '0.0.0.0',
        globalPrefix: process.env.GLOBAL_PREFIX || 'api',
        timezone: process.env.TZ || 'UTC',
        locale: process.env.LOCALE || 'en',
      },
    });
  }

  /**
   * 从文件加载配置
   */
  static loadFromFile(filePath: string) {
    return () => {
      try {
        const fullPath = path.resolve(filePath);
        const content = fs.readFileSync(fullPath, 'utf-8');

        if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
          return yaml.load(content);
        } else if (filePath.endsWith('.json')) {
          return JSON.parse(content);
        } else {
          throw new Error(`Unsupported file format: ${filePath}`);
        }
      } catch (error) {
        console.warn(`Failed to load config from ${filePath}:`, error.message);
        return {};
      }
    };
  }
}

// 配置验证Schema
export const configValidationSchema = Joi.object({
  // 应用配置
  NODE_ENV: Joi.string()
    .valid('development', 'testing', 'staging', 'production', 'local')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  HOST: Joi.string().default('0.0.0.0'),

  // 数据库配置
  DB_TYPE: Joi.string().valid('postgres', 'mysql', 'mongodb', 'sqlite').default('postgres'),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_SSL: Joi.boolean().default(false),
  DB_POOL_SIZE: Joi.number().min(1).max(100).default(10),
  DB_TIMEOUT: Joi.number().min(1000).default(30000),

  // Redis配置
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().min(0).max(15).default(0),
  REDIS_KEY_PREFIX: Joi.string().default('shopping_app:'),
  REDIS_TTL: Joi.number().min(60).default(3600),

  // JWT配置
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('7d'),

  // CORS配置
  CORS_ENABLED: Joi.boolean().default(true),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
  CORS_METHODS: Joi.string().default('GET,POST,PUT,DELETE,PATCH'),
  CORS_CREDENTIALS: Joi.boolean().default(true),

  // 速率限制
  RATE_LIMIT_ENABLED: Joi.boolean().default(false),
  RATE_LIMIT_WINDOW_MS: Joi.number().min(1000).default(900000),
  RATE_LIMIT_MAX: Joi.number().min(1).default(100),

  // 加密配置
  ENCRYPTION_ALGORITHM: Joi.string()
    .valid('aes-128-gcm', 'aes-192-gcm', 'aes-256-gcm', 'aes-256-cbc')
    .default('aes-256-gcm'),
  ENCRYPTION_KEY: Joi.string().length(64).required(), // 强制要求64字符密钥长度

  // 监控配置
  MONITORING_ENABLED: Joi.boolean().default(true),
  PROMETHEUS_ENABLED: Joi.boolean().default(false),
  PROMETHEUS_PORT: Joi.number().port().default(9090),
  JAEGER_ENABLED: Joi.boolean().default(false),
  JAEGER_ENDPOINT: Joi.string().uri().default('http://localhost:14268/api/traces'),
});

@Global()
@Module({})
export class ConfigModule {
  /**
   * 同步注册配置模块
   */
  static forRoot(options: ConfigModuleOptions = {}): DynamicModule {
    const providers = this.createProviders(options);
    const imports = this.createImports(options);

    return {
      module: ConfigModule,
      imports,
      providers,
      exports: providers,
      global: options.isGlobal !== false,
    };
  }

  /**
   * 异步注册配置模块
   */
  static forRootAsync(options: ConfigModuleAsyncOptions): DynamicModule {
    const providers = this.createAsyncProviders(options);
    const imports = this.createAsyncImports(options);

    return {
      module: ConfigModule,
      imports,
      providers,
      exports: [DynamicConfigService, EnvironmentService, ConfigValidationService, ConfigService],
      global: options.isGlobal !== false,
    };
  }

  /**
   * 创建默认配置
   */
  static createDefaultConfig(): ConfigModuleOptions {
    return {
      envFilePath: ['.env.local', '.env'],
      isGlobal: true,
      expandVariables: true,
      cache: true,
      load: [
        ConfigFactory.createAppConfig(),
        ConfigFactory.createDatabaseConfig(),
        ConfigFactory.createRedisConfig(),
        ConfigFactory.createSecurityConfig(),
        ConfigFactory.createMonitoringConfig(),
      ],
      validation: {
        enabled: true,
        schema: configValidationSchema,
      },
      environment: {
        autoDetect: true,
      },
      dynamicConfig: {
        environment: (process.env.NODE_ENV as any) || 'development',
        sources: [
          {
            type: ConfigSourceType.FILE,
            name: 'dynamic-file',
            priority: 1,
            enabled: true,
            path: './config/dynamic.yaml',
            format: ConfigFormat.YAML,
            watchEnabled: true,
          },
          {
            type: ConfigSourceType.ENVIRONMENT,
            name: 'dynamic-env',
            priority: 2,
            enabled: true,
            options: { prefix: 'DYNAMIC_' },
          },
        ],
        validation: {
          enabled: true,
          strictMode: false,
          rules: [],
        },
        caching: {
          enabled: true,
          ttl: 300000, // 5 minutes
          maxSize: 1000,
        },
        persistence: {
          enabled: true,
          storageType: 'file' as const,
          snapshotInterval: 300000,
          maxSnapshots: 10,
          storagePath: './config/dynamic-state.json',
        },
      },
    };
  }

  private static createProviders(options: ConfigModuleOptions): Provider[] {
    const providers: Provider[] = [];

    // 动态配置服务
    if (options.dynamicConfig) {
      providers.push({
        provide: 'DYNAMIC_CONFIG_OPTIONS',
        useValue: options.dynamicConfig,
      });
    }

    providers.push(DynamicConfigService);

    // 环境服务
    providers.push(EnvironmentService);

    // 配置验证服务
    if (options.validation?.enabled !== false) {
      providers.push({
        provide: 'VALIDATION_CONFIG',
        useValue: options.validation?.config || {},
      });
      providers.push(ConfigValidationService);
    }

    return providers;
  }

  private static createImports(options: ConfigModuleOptions): any[] {
    const imports: any[] = [];

    // NestJS ConfigModule
    const nestConfigOptions: any = {
      isGlobal: options.isGlobal !== false,
      envFilePath: options.envFilePath,
      ignoreEnvFile: options.ignoreEnvFile,
      load: options.load || [],
      expandVariables: options.expandVariables,
      cache: options.cache,
    };

    if (options.validation?.enabled !== false && options.validation?.schema) {
      nestConfigOptions.validationSchema = options.validation.schema;
      nestConfigOptions.validationOptions = {
        allowUnknown: true,
        abortEarly: false,
      };
    }

    imports.push(NestConfigModule.forRoot(nestConfigOptions));

    // 调度模块（用于动态配置的定时任务）
    imports.push(ScheduleModule.forRoot());

    // 事件发射器模块（用于配置变更事件）
    imports.push(
      EventEmitterModule.forRoot({
        wildcard: false,
        delimiter: '.',
        newListener: false,
        removeListener: false,
        maxListeners: 10,
        verboseMemoryLeak: false,
        ignoreErrors: false,
      }),
    );

    return imports;
  }

  private static createAsyncProviders(options: ConfigModuleAsyncOptions): Provider[] {
    const providers: Provider[] = [];

    if (options.useFactory) {
      providers.push({
        provide: 'CONFIG_MODULE_OPTIONS',
        useFactory: options.useFactory,
        inject: options.inject || [],
      });

      providers.push({
        provide: DynamicConfigService,
        useFactory: async (configOptions: ConfigModuleOptions) => {
          const service = new DynamicConfigService(
            {} as any, // ConfigService will be injected
            {} as any, // EventEmitter2 will be injected
          );
          return service;
        },
        inject: ['CONFIG_MODULE_OPTIONS', ConfigService],
      });
    }

    providers.push(EnvironmentService);
    providers.push(ConfigValidationService);

    return providers;
  }

  private static createAsyncImports(options: ConfigModuleAsyncOptions): any[] {
    const imports: any[] = [];

    if (options.imports) {
      imports.push(...options.imports);
    }

    // 基础模块
    imports.push(
      NestConfigModule.forRoot({
        isGlobal: options.isGlobal !== false,
      }),
      ScheduleModule.forRoot(),
      EventEmitterModule.forRoot(),
    );

    return imports;
  }
}

// 配置装饰器
export function InjectConfig(key?: string) {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    // 这里可以实现自定义的配置注入逻辑
    // 暂时使用标准的 @Inject 装饰器
  };
}

// 配置工具类
export class ConfigUtils {
  /**
   * 解析环境变量为配置对象
   */
  static parseEnvToConfig(prefix: string = ''): Record<string, any> {
    const config: Record<string, any> = {};

    for (const [key, value] of Object.entries(process.env)) {
      if (!prefix || key.startsWith(prefix)) {
        const configKey = prefix ? key.substring(prefix.length) : key;
        const configPath = configKey.toLowerCase().split('_');

        this.setNestedValue(config, configPath, this.parseValue(value));
      }
    }

    return config;
  }

  /**
   * 设置嵌套值
   */
  private static setNestedValue(obj: any, path: string[], value: any): void {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
  }

  /**
   * 解析值类型
   */
  private static parseValue(value: string | undefined): any {
    if (!value) return undefined;

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

  /**
   * 合并配置对象
   */
  static mergeConfigs(...configs: any[]): any {
    const result = {};

    for (const config of configs) {
      this.deepMerge(result, config);
    }

    return result;
  }

  /**
   * 深度合并对象
   */
  private static deepMerge(target: any, source: any): any {
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (!target[key]) {
          target[key] = {};
        }
        this.deepMerge(target[key], value);
      } else {
        target[key] = value;
      }
    }
    return target;
  }

  /**
   * 获取嵌套配置值
   */
  static getNestedValue(obj: any, path: string, defaultValue?: any): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }

    return current;
  }

  /**
   * 验证配置完整性
   */
  static validateConfigCompleteness(config: any, requiredPaths: string[]): string[] {
    const missingPaths: string[] = [];

    for (const path of requiredPaths) {
      const value = this.getNestedValue(config, path);
      if (value === undefined || value === null) {
        missingPaths.push(path);
      }
    }

    return missingPaths;
  }
}
