import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MonitoringService } from './monitoring.service';
import { AlertingService } from '../alerting/alerting.service';
import { CacheModule } from '../cache/cache.module';
import { TracingModule } from '../tracing/tracing.module';
import { RedisCacheService } from '../cache/redis-cache.service';
import { TracingService } from '../tracing/tracing.service';

/**
 * 监控模块选项
 */
export interface MonitoringModuleOptions {
  // 监控配置
  monitoring?: {
    enabled?: boolean;
    metricsInterval?: number; // 指标收集间隔（秒）
    retentionDays?: number; // 数据保留天数
    enableSystemMetrics?: boolean;
    enableApplicationMetrics?: boolean;
    enableCustomMetrics?: boolean;
    prometheus?: {
      enabled?: boolean;
      endpoint?: string;
      port?: number;
    };
    healthCheck?: {
      enabled?: boolean;
      endpoint?: string;
      timeout?: number;
      checks?: string[];
    };
  };

  // 告警配置
  alerting?: {
    enabled?: boolean;
    checkInterval?: number; // 告警检查间隔（秒）
    historyRetentionDays?: number;
    defaultRules?: boolean; // 是否启用默认规则
    notifications?: {
      email?: {
        enabled?: boolean;
        smtp?: {
          host?: string;
          port?: number;
          secure?: boolean;
          auth?: {
            user?: string;
            pass?: string;
          };
        };
        from?: string;
        to?: string[];
      };
      slack?: {
        enabled?: boolean;
        webhookUrl?: string;
        channel?: string;
        username?: string;
        iconEmoji?: string;
      };
      webhook?: {
        enabled?: boolean;
        url?: string;
        method?: 'POST' | 'PUT';
        headers?: Record<string, string>;
        timeout?: number;
      };
      sms?: {
        enabled?: boolean;
        provider?: string;
        apiKey?: string;
        from?: string;
        to?: string[];
      };
    };
  };

  // Redis配置
  redis?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
  };

  // 性能配置
  performance?: {
    enableCaching?: boolean;
    cacheSize?: number;
    cacheTtl?: number;
    enableCompression?: boolean;
    batchSize?: number;
    maxConcurrency?: number;
  };

  // 安全配置
  security?: {
    enableAuth?: boolean;
    apiKeys?: string[];
    allowedIps?: string[];
    enableRateLimit?: boolean;
    rateLimit?: {
      windowMs?: number;
      max?: number;
    };
  };

  // 集成配置
  integrations?: {
    prometheus?: {
      enabled?: boolean;
      pushGateway?: string;
      jobName?: string;
      interval?: number;
    };
    grafana?: {
      enabled?: boolean;
      url?: string;
      apiKey?: string;
      dashboardId?: string;
    };
    elasticsearch?: {
      enabled?: boolean;
      node?: string;
      index?: string;
      auth?: {
        username?: string;
        password?: string;
      };
    };
    jaeger?: {
      enabled?: boolean;
      endpoint?: string;
      serviceName?: string;
    };
  };
}

/**
 * 监控核心模块
 */
@Module({})
export class MonitoringCoreModule {
  static forRoot(options: MonitoringModuleOptions = {}): DynamicModule {
    return {
      module: MonitoringCoreModule,
      imports: [
        ConfigModule,
        ScheduleModule.forRoot(),
        CacheModule.forRoot({
          redis: options.redis || {},
          memory: {
            maxSize: options.performance?.cacheSize || 1000,
            maxMemoryMB: options.performance?.cacheSize || 100,
            ttl: options.performance?.cacheTtl || 300,
            checkPeriod: 60,
            useClones: false,
            deleteOnExpire: true,
            enableLogs: false,
          },
        }),
        TracingModule,
      ],
      providers: [
        {
          provide: 'MONITORING_OPTIONS',
          useValue: options,
        },
        MonitoringService,
        AlertingService,
      ],
      exports: [MonitoringService, AlertingService],
    };
  }

  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => Promise<MonitoringModuleOptions> | MonitoringModuleOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: MonitoringCoreModule,
      imports: [
        ConfigModule,
        ScheduleModule.forRoot(),
        CacheModule.forRoot({
          redis: {},
          memory: {
            maxSize: 1000,
            maxMemoryMB: 100,
            ttl: 300,
            checkPeriod: 60,
            useClones: false,
            deleteOnExpire: true,
            enableLogs: false,
          },
        }),
        TracingModule,
        ...(options.imports || []),
      ],
      providers: [
        {
          provide: 'MONITORING_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: MonitoringService,
          useFactory: (
            monitoringOptions: MonitoringModuleOptions,
            configService: ConfigService,
            redisCacheService: RedisCacheService,
            tracingService: TracingService,
          ) => {
            return new MonitoringService(configService, redisCacheService, tracingService);
          },
          inject: ['MONITORING_OPTIONS', ConfigService, RedisCacheService, TracingService],
        },
        {
          provide: AlertingService,
          useFactory: (
            monitoringOptions: MonitoringModuleOptions,
            configService: ConfigService,
          ) => {
            return new AlertingService(
              configService,
              undefined as any, // Will be injected properly
              undefined as any, // Will be injected properly
            );
          },
          inject: ['MONITORING_OPTIONS', ConfigService],
        },
      ],
      exports: [MonitoringService, AlertingService],
    };
  }
}

/**
 * 监控模块
 */
@Global()
@Module({})
export class MonitoringModule {
  static forRoot(options: MonitoringModuleOptions = {}): DynamicModule {
    return {
      module: MonitoringModule,
      imports: [MonitoringCoreModule.forRoot(options)],
      exports: [MonitoringCoreModule],
    };
  }

  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => Promise<MonitoringModuleOptions> | MonitoringModuleOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: MonitoringModule,
      imports: [MonitoringCoreModule.forRootAsync(options)],
      exports: [MonitoringCoreModule],
    };
  }

  static forFeature(): DynamicModule {
    return {
      module: MonitoringModule,
      providers: [
        MonitoringService,
        AlertingService,
        {
          provide: 'MONITORING_OPTIONS',
          useValue: {},
        },
      ],
      exports: [MonitoringService, AlertingService],
    };
  }
}

/**
 * 监控工具类
 */
export class MonitoringUtils {
  /**
   * 格式化指标名称
   */
  static formatMetricName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * 格式化标签
   */
  static formatLabels(labels: Record<string, any>): Record<string, string> {
    const formatted: Record<string, string> = {};

    for (const [key, value] of Object.entries(labels)) {
      const formattedKey = this.formatMetricName(key);
      formatted[formattedKey] = String(value);
    }

    return formatted;
  }

  /**
   * 计算百分位数
   */
  static calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;

    return sorted[Math.max(0, index)];
  }

  /**
   * 计算移动平均
   */
  static calculateMovingAverage(values: number[], window: number): number[] {
    const result: number[] = [];

    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - window + 1);
      const slice = values.slice(start, i + 1);
      const average = slice.reduce((sum, val) => sum + val, 0) / slice.length;
      result.push(average);
    }

    return result;
  }

  /**
   * 检测异常值
   */
  static detectAnomalies(values: number[], threshold: number = 2): number[] {
    if (values.length < 2) return [];

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return values.filter(val => Math.abs(val - mean) > threshold * stdDev);
  }

  /**
   * 格式化字节大小
   */
  static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * 格式化持续时间
   */
  static formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }

    const seconds = milliseconds / 1000;
    if (seconds < 60) {
      return `${seconds.toFixed(2)}s`;
    }

    const minutes = seconds / 60;
    if (minutes < 60) {
      return `${minutes.toFixed(2)}m`;
    }

    const hours = minutes / 60;
    return `${hours.toFixed(2)}h`;
  }

  /**
   * 生成指标键
   */
  static generateMetricKey(name: string, labels: Record<string, string> = {}): string {
    const formattedName = this.formatMetricName(name);
    const labelPairs = Object.entries(labels)
      .map(([key, value]) => `${key}=${value}`)
      .sort()
      .join(',');

    return labelPairs ? `${formattedName}{${labelPairs}}` : formattedName;
  }

  /**
   * 解析指标键
   */
  static parseMetricKey(key: string): { name: string; labels: Record<string, string> } {
    const match = key.match(/^([^{]+)(?:\{([^}]+)\})?$/);

    if (!match) {
      return { name: key, labels: {} };
    }

    const name = match[1];
    const labelsStr = match[2];
    const labels: Record<string, string> = {};

    if (labelsStr) {
      const pairs = labelsStr.split(',');
      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key && value) {
          labels[key] = value;
        }
      }
    }

    return { name, labels };
  }

  /**
   * 验证指标值
   */
  static validateMetricValue(value: any): boolean {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  }

  /**
   * 聚合指标
   */
  static aggregateMetrics(
    metrics: Array<{ value: number; timestamp: Date }>,
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count',
  ): number {
    if (metrics.length === 0) return 0;

    const values = metrics.map(m => m.value);

    switch (aggregation) {
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      default:
        return 0;
    }
  }

  /**
   * 生成Prometheus格式
   */
  static toPrometheusFormat(
    name: string,
    value: number,
    labels: Record<string, string> = {},
    help?: string,
    type?: string,
  ): string {
    const lines: string[] = [];

    if (help) {
      lines.push(`# HELP ${name} ${help}`);
    }

    if (type) {
      lines.push(`# TYPE ${name} ${type}`);
    }

    const labelStr = Object.entries(labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');

    const metricLine = labelStr ? `${name}{${labelStr}} ${value}` : `${name} ${value}`;

    lines.push(metricLine);

    return lines.join('\n');
  }
}
