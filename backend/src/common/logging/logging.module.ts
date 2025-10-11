import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { LoggingService } from './logging.service';
import { LogAggregationService } from './log-aggregation.service';
import { TracingService } from '../tracing/tracing.service';
import { OpenObserveModule } from '../openobserve/openobserve.module';

// 日志模块配置接口
export interface LoggingModuleOptions {
  // 基础配置
  isGlobal?: boolean;

  // 日志配置
  logging?: {
    level?: string;
    format?: 'json' | 'simple' | 'combined';
    colorize?: boolean;
    timestamp?: boolean;
    prettyPrint?: boolean;
    maxFiles?: number;
    maxSize?: string;
    datePattern?: string;
    zippedArchive?: boolean;

    // 控制台输出
    console?: {
      enabled?: boolean;
      level?: string;
      colorize?: boolean;
      timestamp?: boolean;
      format?: string;
    };

    // 文件输出
    file?: {
      enabled?: boolean;
      level?: string;
      filename?: string;
      dirname?: string;
      maxSize?: string;
      maxFiles?: number;
      datePattern?: string;
      zippedArchive?: boolean;
      auditFile?: string;
    };

    // Elasticsearch输出
    elasticsearch?: {
      enabled?: boolean;
      level?: string;
      clientOpts?: {
        nodes?: string[];
        username?: string;
        password?: string;
        apiKey?: string;
      };
      index?: string;
      indexPrefix?: string;
      indexSuffixPattern?: string;
      messageType?: string;
      ensureMappingTemplate?: boolean;
      mappingTemplate?: any;
      flushInterval?: number;
      waitForActiveShards?: number;
      handleExceptions?: boolean;
      pipeline?: string;
    };

    // HTTP输出
    http?: {
      enabled?: boolean;
      level?: string;
      host?: string;
      port?: number;
      path?: string;
      auth?: {
        username?: string;
        password?: string;
        bearer?: string;
      };
      ssl?: boolean;
      headers?: Record<string, string>;
      batch?: boolean;
      batchInterval?: number;
      batchCount?: number;
    };

    // Syslog输出
    syslog?: {
      enabled?: boolean;
      level?: string;
      host?: string;
      port?: number;
      protocol?: 'tcp' | 'udp';
      localhost?: string;
      type?: string;
      facility?: string;
      app_name?: string;
    };
  };

  // 追踪配置
  tracing?: {
    enabled?: boolean;
    serviceName?: string;
    serviceVersion?: string;
    environment?: string;

    // Jaeger配置
    jaeger?: {
      enabled?: boolean;
      endpoint?: string;
      agentHost?: string;
      agentPort?: number;
      username?: string;
      password?: string;
      headers?: Record<string, string>;
    };

    // OTLP配置
    otlp?: {
      enabled?: boolean;
      endpoint?: string;
      headers?: Record<string, string>;
      compression?: 'gzip' | 'none';
    };

    // 控制台输出
    console?: {
      enabled?: boolean;
    };

    // 采样配置
    sampling?: {
      type?: 'always_on' | 'always_off' | 'traceid_ratio' | 'parent_based';
      ratio?: number;
    };

    // 资源配置
    resource?: {
      attributes?: Record<string, string>;
    };

    // 仪表化配置
    instrumentations?: {
      http?: boolean;
      express?: boolean;
      redis?: boolean;
      mongodb?: boolean;
      mysql?: boolean;
      postgresql?: boolean;
      fs?: boolean;
      dns?: boolean;
    };
  };

  // 聚合配置
  aggregation?: {
    enabled?: boolean;

    // Elasticsearch配置
    elasticsearch?: {
      enabled?: boolean;
      nodes?: string[];
      username?: string;
      password?: string;
      apiKey?: string;
      indexPrefix?: string;
      indexPattern?: string;
      rollover?: {
        maxSize?: string;
        maxAge?: string;
        maxDocs?: number;
      };
      bulk?: {
        size?: number;
        flushInterval?: number;
        maxRetries?: number;
      };
    };

    // Kibana配置
    kibana?: {
      enabled?: boolean;
      host?: string;
      username?: string;
      password?: string;
      dashboards?: {
        autoCreate?: boolean;
        templates?: string[];
      };
    };

    // 文件聚合配置
    file?: {
      enabled?: boolean;
      directory?: string;
      compression?: boolean;
      retention?: {
        days?: number;
        maxSize?: string;
      };
      formats?: ('json' | 'csv' | 'parquet')[];
    };

    // 流式配置
    streaming?: {
      enabled?: boolean;
      kafka?: {
        brokers?: string[];
        topic?: string;
        clientId?: string;
      };
      redis?: {
        host?: string;
        port?: number;
        stream?: string;
      };
    };

    // 搜索配置
    search?: {
      enabled?: boolean;
      indexing?: {
        realtime?: boolean;
        batchSize?: number;
        refreshInterval?: string;
      };
      queries?: {
        maxResults?: number;
        timeout?: string;
        defaultSort?: string;
      };
    };

    // 分析配置
    analytics?: {
      enabled?: boolean;
      aggregations?: {
        timeWindows?: string[];
        metrics?: string[];
      };
      alerts?: {
        enabled?: boolean;
        rules?: Array<{
          name: string;
          condition: string;
          threshold: number;
          window: string;
        }>;
      };
    };
  };

  // 性能配置
  performance?: {
    asyncLogging?: boolean;
    bufferSize?: number;
    flushInterval?: number;
    maxMemoryUsage?: string;
    compression?: boolean;
    sampling?: {
      enabled?: boolean;
      rate?: number;
      rules?: Array<{
        level?: string;
        service?: string;
        rate?: number;
      }>;
    };
  };

  // 安全配置
  security?: {
    sanitization?: {
      enabled?: boolean;
      fields?: string[];
      replacement?: string;
      patterns?: Array<{
        pattern: string;
        replacement: string;
        flags?: string;
      }>;
    };
    encryption?: {
      enabled?: boolean;
      algorithm?: string;
      key?: string;
      fields?: string[];
    };
    masking?: {
      enabled?: boolean;
      fields?: string[];
      maskChar?: string;
      showFirst?: number;
      showLast?: number;
    };
  };

  // 集成配置
  integrations?: {
    prometheus?: {
      enabled?: boolean;
      prefix?: string;
      labels?: Record<string, string>;
    };
    grafana?: {
      enabled?: boolean;
      url?: string;
      apiKey?: string;
      dashboards?: string[];
    };
    elasticsearch?: {
      enabled?: boolean;
      url?: string;
      username?: string;
      password?: string;
      indices?: string[];
    };
    jaeger?: {
      enabled?: boolean;
      url?: string;
      service?: string;
    };
    apm?: {
      enabled?: boolean;
      serverUrl?: string;
      secretToken?: string;
      serviceName?: string;
    };
  };
}

// 异步配置接口
export interface LoggingModuleAsyncOptions {
  isGlobal?: boolean;
  imports?: any[];
  useFactory?: (...args: any[]) => Promise<LoggingModuleOptions> | LoggingModuleOptions;
  inject?: any[];
  useClass?: any;
  useExisting?: any;
}

@Global()
@Module({})
export class LoggingCoreModule {
  static forRoot(options: LoggingModuleOptions = {}): DynamicModule {
    return {
      module: LoggingCoreModule,
      imports: [
        ConfigModule,
        ScheduleModule.forRoot(),
        OpenObserveModule,
        WinstonModule.forRoot({
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
          transports: [new winston.transports.Console()],
        }),
      ],
      providers: [
        {
          provide: 'LOGGING_MODULE_OPTIONS',
          useValue: options,
        },
        LoggingService,
        TracingService,
        LogAggregationService,
      ],
      exports: [LoggingService, TracingService, LogAggregationService, WinstonModule],
      global: options.isGlobal !== false,
    };
  }

  static forRootAsync(options: LoggingModuleAsyncOptions): DynamicModule {
    return {
      module: LoggingCoreModule,
      imports: [
        ConfigModule,
        ScheduleModule.forRoot(),
        OpenObserveModule,
        WinstonModule.forRoot({
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
          transports: [new winston.transports.Console()],
        }),
        ...(options.imports || []),
      ],
      providers: [
        {
          provide: 'LOGGING_MODULE_OPTIONS',
          useFactory: options.useFactory as any,
          inject: options.inject || [],
        },
        LoggingService,
        TracingService,
        LogAggregationService,
      ],
      exports: [LoggingService, TracingService, LogAggregationService, WinstonModule],
      global: options.isGlobal !== false,
    };
  }
}

@Module({})
export class LoggingModule {
  static forRoot(options: LoggingModuleOptions = {}): DynamicModule {
    return LoggingCoreModule.forRoot(options);
  }

  static forRootAsync(options: LoggingModuleAsyncOptions): DynamicModule {
    return LoggingCoreModule.forRootAsync(options);
  }

  static forFeature(): DynamicModule {
    return {
      module: LoggingModule,
      providers: [],
      exports: [],
    };
  }
}

// 日志工具类
export class LoggingUtils {
  // 格式化日志消息
  static formatMessage(template: string, params: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }

  // 提取错误信息
  static extractErrorInfo(error: any): {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  } {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    if (typeof error === 'string') {
      return {
        name: 'Error',
        message: error,
      };
    }

    return {
      name: 'UnknownError',
      message: String(error),
    };
  }

  // 清理敏感数据
  static sanitizeData(data: any, sensitiveFields: string[] = []): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const defaultSensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'session',
      'credit_card',
      'ssn',
      'email',
      'phone',
    ];

    const allSensitiveFields = [...defaultSensitiveFields, ...sensitiveFields];
    const sanitized = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();
      const isSensitive = allSensitiveFields.some(field => keyLower.includes(field.toLowerCase()));

      if (isSensitive) {
        (sanitized as any)[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        (sanitized as any)[key] = this.sanitizeData(value, sensitiveFields);
      } else {
        (sanitized as any)[key] = value;
      }
    }

    return sanitized;
  }

  // 计算对象大小
  static calculateObjectSize(obj: any): number {
    const seen = new WeakSet();

    function sizeOf(obj: any): number {
      if (obj === null || obj === undefined) return 0;

      if (typeof obj === 'boolean') return 4;
      if (typeof obj === 'number') return 8;
      if (typeof obj === 'string') return obj.length * 2;
      if (typeof obj === 'symbol') return 8;

      if (seen.has(obj)) return 0;
      seen.add(obj);

      if (Array.isArray(obj)) {
        return obj.reduce((acc, item) => acc + sizeOf(item), 0);
      }

      if (typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
          return acc + sizeOf(key) + sizeOf(obj[key]);
        }, 0);
      }

      return 0;
    }

    return sizeOf(obj);
  }

  // 生成相关ID
  static generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // 格式化持续时间
  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
    return `${(ms / 3600000).toFixed(2)}h`;
  }

  // 格式化字节大小
  static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)}${units[unitIndex]}`;
  }

  // 创建日志上下文
  static createContext(
    service: string,
    operation: string,
    additionalContext: Record<string, any> = {},
  ): Record<string, any> {
    return {
      service,
      operation,
      timestamp: new Date().toISOString(),
      correlationId: this.generateCorrelationId(),
      ...additionalContext,
    };
  }

  // 验证日志级别
  static isValidLogLevel(level: string): boolean {
    const validLevels = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
    return validLevels.includes(level.toLowerCase());
  }

  // 解析日志级别
  static parseLogLevel(level: string): string {
    const normalizedLevel = level.toLowerCase();

    switch (normalizedLevel) {
      case 'fatal':
      case 'critical':
        return 'error';
      case 'warning':
        return 'warn';
      case 'information':
        return 'info';
      case 'trace':
        return 'debug';
      default:
        return this.isValidLogLevel(normalizedLevel) ? normalizedLevel : 'info';
    }
  }

  // 创建结构化错误
  static createStructuredError(error: any, context: Record<string, any> = {}): Record<string, any> {
    const errorInfo = this.extractErrorInfo(error);

    return {
      error: errorInfo,
      context: this.sanitizeData(context),
      timestamp: new Date().toISOString(),
      correlationId: this.generateCorrelationId(),
    };
  }

  // 合并日志上下文
  static mergeContexts(...contexts: Record<string, any>[]): Record<string, any> {
    return contexts.reduce((merged, context) => {
      if (!context || typeof context !== 'object') return merged;

      return {
        ...merged,
        ...context,
        // 特殊处理嵌套对象
        tags: [...(merged.tags || []), ...(context.tags || [])],
        labels: { ...(merged.labels || {}), ...(context.labels || {}) },
      };
    }, {});
  }

  // 检查日志级别是否启用
  static isLevelEnabled(currentLevel: string, targetLevel: string): boolean {
    const levels = {
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      verbose: 4,
      debug: 5,
      silly: 6,
    };

    const current = (levels as any)[currentLevel.toLowerCase()] ?? levels.info;
    const target = (levels as any)[targetLevel.toLowerCase()] ?? levels.info;

    return target <= current;
  }
}
