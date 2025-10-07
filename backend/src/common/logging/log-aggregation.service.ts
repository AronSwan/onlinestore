import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggingService, LogEntry, LogLevel } from './logging.service';
import { TracingService } from '../tracing/tracing.service';
import { OpenObserveService } from '../openobserve/openobserve.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

// 日志聚合配置接口
export interface LogAggregationConfig {
  enabled: boolean;
  elasticsearch: {
    enabled: boolean;
    nodes: string[];
    username?: string;
    password?: string;
    apiKey?: string;
    index: {
      prefix: string;
      pattern: string;
      rollover: {
        maxSize: string;
        maxAge: string;
        maxDocs: number;
      };
    };
    mapping: {
      dynamicTemplates: boolean;
      fieldLimit: number;
    };
    bulk: {
      size: number;
      flushInterval: number;
      maxRetries: number;
    };
  };
  kibana: {
    enabled: boolean;
    host: string;
    username?: string;
    password?: string;
    dashboards: {
      autoCreate: boolean;
      templates: string[];
    };
  };
  fileAggregation: {
    enabled: boolean;
    directory: string;
    compression: boolean;
    retention: {
      days: number;
      maxSize: string;
    };
    formats: ('json' | 'csv' | 'parquet')[];
  };
  streaming: {
    enabled: boolean;
    kafka: {
      brokers: string[];
      topic: string;
      clientId: string;
    };
    redis: {
      host: string;
      port: number;
      stream: string;
    };
  };
  search: {
    enabled: boolean;
    indexing: {
      realtime: boolean;
      batchSize: number;
      refreshInterval: string;
    };
    queries: {
      maxResults: number;
      timeout: string;
      defaultSort: string;
    };
  };
  analytics: {
    enabled: boolean;
    aggregations: {
      timeWindows: string[];
      metrics: string[];
    };
    alerts: {
      enabled: boolean;
      rules: Array<{
        name: string;
        condition: string;
        threshold: number;
        window: string;
      }>;
    };
  };
}

// 搜索查询接口
export interface SearchQuery {
  query?: string;
  filters?: Record<string, any>;
  timeRange?: {
    from: string;
    to: string;
  };
  sort?: Array<{
    field: string;
    order: 'asc' | 'desc';
  }>;
  size?: number;
  from?: number;
  aggregations?: Record<string, any>;
}

// 搜索结果接口
export interface SearchResult {
  total: number;
  hits: LogEntry[];
  aggregations?: Record<string, any>;
  took: number;
  timedOut: boolean;
}

// 日志统计接口
export interface LogAnalytics {
  totalLogs: number;
  logsByLevel: Record<LogLevel, number>;
  logsByService: Record<string, number>;
  errorTrends: Array<{
    timestamp: string;
    count: number;
  }>;
  topErrors: Array<{
    message: string;
    count: number;
    lastSeen: string;
  }>;
  performanceMetrics: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
  };
  alertsSummary: {
    active: number;
    resolved: number;
    critical: number;
  };
}

@Injectable()
export class LogAggregationService implements OnModuleInit, OnModuleDestroy {
  private config: LogAggregationConfig;
  private logBuffer: LogEntry[] = [];
  private isShuttingDown = false;
  private flushTimer: NodeJS.Timeout;

  constructor(
    private configService: ConfigService,
    private loggingService: LoggingService,
    private tracingService: TracingService,
    private openobserveService: OpenObserveService,
  ) {
    this.initializeConfig();
  }

  async onModuleInit(): Promise<void> {
    if (this.config.enabled) {
      await this.initializeOpenObserve();
      await this.startLogBuffering();
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // 刷新剩余的日志
    await this.flushLogs();
  }

  private initializeConfig(): void {
    this.config = {
      enabled: this.configService.get<boolean>('LOG_AGGREGATION_ENABLED', true),
      elasticsearch: {
        enabled: false, // 禁用Elasticsearch
        nodes: this.configService
          .get<string>('LOG_AGGREGATION_ES_NODES', 'http://localhost:9200')
          .split(','),
        username: this.configService.get<string>('LOG_AGGREGATION_ES_USERNAME'),
        password: this.configService.get<string>('LOG_AGGREGATION_ES_PASSWORD'),
        apiKey: this.configService.get<string>('LOG_AGGREGATION_ES_API_KEY'),
        index: {
          prefix: this.configService.get<string>('LOG_AGGREGATION_ES_INDEX_PREFIX', 'logs'),
          pattern: this.configService.get<string>(
            'LOG_AGGREGATION_ES_INDEX_PATTERN',
            'logs-{yyyy.MM.dd}',
          ),
          rollover: {
            maxSize: this.configService.get<string>('LOG_AGGREGATION_ES_ROLLOVER_MAX_SIZE', '1gb'),
            maxAge: this.configService.get<string>('LOG_AGGREGATION_ES_ROLLOVER_MAX_AGE', '1d'),
            maxDocs: this.configService.get<number>(
              'LOG_AGGREGATION_ES_ROLLOVER_MAX_DOCS',
              1000000,
            ),
          },
        },
        mapping: {
          dynamicTemplates: this.configService.get<boolean>(
            'LOG_AGGREGATION_ES_DYNAMIC_TEMPLATES',
            true,
          ),
          fieldLimit: this.configService.get<number>('LOG_AGGREGATION_ES_FIELD_LIMIT', 10000),
        },
        bulk: {
          size: this.configService.get<number>('LOG_AGGREGATION_ES_BULK_SIZE', 1000),
          flushInterval: this.configService.get<number>('LOG_AGGREGATION_ES_FLUSH_INTERVAL', 5000),
          maxRetries: this.configService.get<number>('LOG_AGGREGATION_ES_MAX_RETRIES', 3),
        },
      },
      kibana: {
        enabled: this.configService.get<boolean>('LOG_AGGREGATION_KIBANA_ENABLED', false),
        host: this.configService.get<string>(
          'LOG_AGGREGATION_KIBANA_HOST',
          'http://localhost:5601',
        ),
        username: this.configService.get<string>('LOG_AGGREGATION_KIBANA_USERNAME'),
        password: this.configService.get<string>('LOG_AGGREGATION_KIBANA_PASSWORD'),
        dashboards: {
          autoCreate: this.configService.get<boolean>(
            'LOG_AGGREGATION_KIBANA_AUTO_CREATE_DASHBOARDS',
            true,
          ),
          templates: this.configService
            .get<string>(
              'LOG_AGGREGATION_KIBANA_DASHBOARD_TEMPLATES',
              'application,errors,performance',
            )
            .split(','),
        },
      },
      fileAggregation: {
        enabled: this.configService.get<boolean>('LOG_AGGREGATION_FILE_ENABLED', true),
        directory: this.configService.get<string>(
          'LOG_AGGREGATION_FILE_DIRECTORY',
          './logs/aggregated',
        ),
        compression: this.configService.get<boolean>('LOG_AGGREGATION_FILE_COMPRESSION', true),
        retention: {
          days: this.configService.get<number>('LOG_AGGREGATION_FILE_RETENTION_DAYS', 30),
          maxSize: this.configService.get<string>(
            'LOG_AGGREGATION_FILE_RETENTION_MAX_SIZE',
            '10gb',
          ),
        },
        formats: this.configService
          .get<string>('LOG_AGGREGATION_FILE_FORMATS', 'json,csv')
          .split(',') as ('json' | 'csv' | 'parquet')[],
      },
      streaming: {
        enabled: this.configService.get<boolean>('LOG_AGGREGATION_STREAMING_ENABLED', false),
        kafka: {
          brokers: this.configService
            .get<string>('LOG_AGGREGATION_KAFKA_BROKERS', 'localhost:9092')
            .split(','),
          topic: this.configService.get<string>('LOG_AGGREGATION_KAFKA_TOPIC', 'application-logs'),
          clientId: this.configService.get<string>(
            'LOG_AGGREGATION_KAFKA_CLIENT_ID',
            'log-aggregator',
          ),
        },
        redis: {
          host: this.configService.get<string>('LOG_AGGREGATION_REDIS_HOST', 'localhost'),
          port: this.configService.get<number>('LOG_AGGREGATION_REDIS_PORT', 6379),
          stream: this.configService.get<string>('LOG_AGGREGATION_REDIS_STREAM', 'logs'),
        },
      },
      search: {
        enabled: this.configService.get<boolean>('LOG_AGGREGATION_SEARCH_ENABLED', true),
        indexing: {
          realtime: this.configService.get<boolean>('LOG_AGGREGATION_SEARCH_REALTIME', true),
          batchSize: this.configService.get<number>('LOG_AGGREGATION_SEARCH_BATCH_SIZE', 1000),
          refreshInterval: this.configService.get<string>(
            'LOG_AGGREGATION_SEARCH_REFRESH_INTERVAL',
            '1s',
          ),
        },
        queries: {
          maxResults: this.configService.get<number>('LOG_AGGREGATION_SEARCH_MAX_RESULTS', 10000),
          timeout: this.configService.get<string>('LOG_AGGREGATION_SEARCH_TIMEOUT', '30s'),
          defaultSort: this.configService.get<string>(
            'LOG_AGGREGATION_SEARCH_DEFAULT_SORT',
            '@timestamp:desc',
          ),
        },
      },
      analytics: {
        enabled: this.configService.get<boolean>('LOG_AGGREGATION_ANALYTICS_ENABLED', true),
        aggregations: {
          timeWindows: this.configService
            .get<string>('LOG_AGGREGATION_ANALYTICS_TIME_WINDOWS', '1m,5m,15m,1h,1d')
            .split(','),
          metrics: this.configService
            .get<string>('LOG_AGGREGATION_ANALYTICS_METRICS', 'count,avg,p95,p99')
            .split(','),
        },
        alerts: {
          enabled: this.configService.get<boolean>(
            'LOG_AGGREGATION_ANALYTICS_ALERTS_ENABLED',
            true,
          ),
          rules: this.parseAlertRules(
            this.configService.get<string>('LOG_AGGREGATION_ANALYTICS_ALERT_RULES', ''),
          ),
        },
      },
    };
  }

  private parseAlertRules(
    rulesStr: string,
  ): Array<{ name: string; condition: string; threshold: number; window: string }> {
    if (!rulesStr) {
      return [
        {
          name: 'High Error Rate',
          condition: 'error_rate > threshold',
          threshold: 0.05,
          window: '5m',
        },
        {
          name: 'High Response Time',
          condition: 'avg_response_time > threshold',
          threshold: 1000,
          window: '5m',
        },
        {
          name: 'Low Disk Space',
          condition: 'disk_usage > threshold',
          threshold: 0.9,
          window: '1m',
        },
      ];
    }

    try {
      return JSON.parse(rulesStr);
    } catch {
      return [];
    }
  }

  private async initializeOpenObserve(): Promise<void> {
    try {
      await this.openobserveService.testConnection();
      this.loggingService.info('Connected to OpenObserve');
    } catch (error) {
      this.loggingService.error('Failed to connect to OpenObserve', error);
      throw error;
    }
  }

  // OpenObserve不需要手动创建索引模板

  // OpenObserve自动管理数据生命周期

  private async startLogBuffering(): Promise<void> {
    // 启动定时刷新 - 使用默认间隔，因为Elasticsearch已禁用
    this.flushTimer = setInterval(async () => {
      await this.flushLogs();
    }, 5000); // 使用5秒作为默认刷新间隔
  }

  // 添加日志到缓冲区
  async addLog(logEntry: LogEntry): Promise<void> {
    if (!this.config.enabled || this.isShuttingDown) return;

    // 添加追踪信息
    const traceContext = this.tracingService.getCurrentTraceContext();
    if (traceContext) {
      logEntry.context = {
        ...logEntry.context,
        traceId: traceContext.traceId,
        spanId: traceContext.spanId,
      };
    }

    this.logBuffer.push(logEntry);

    // 如果缓冲区满了，立即刷新 - 使用默认大小，因为Elasticsearch已禁用
    if (this.logBuffer.length >= 1000) {
      await this.flushLogs();
    }
  }

  // 刷新日志到OpenObserve
  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logs = [...this.logBuffer];
    this.logBuffer = [];

    try {
      // 使用OpenObserve批量发送日志
      await this.openobserveService.sendLogs(logs);
      this.loggingService.debug(`Successfully sent ${logs.length} log entries to OpenObserve`);

      // 同时写入文件
      if (this.config.fileAggregation.enabled) {
        await this.writeToFile(logs);
      }
    } catch (error) {
      this.loggingService.error('Failed to flush logs to OpenObserve', error);
      // 将失败的日志重新加入缓冲区
      this.logBuffer.unshift(...logs);
    }
  }

  // OpenObserve不需要手动生成索引名

  // 写入文件
  private async writeToFile(logs: LogEntry[]): Promise<void> {
    const directory = this.config.fileAggregation.directory;

    // 确保目录存在
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];

    for (const format of this.config.fileAggregation.formats) {
      const filename = `logs-${timestamp}.${format}`;
      const filepath = path.join(directory, filename);

      let content: string;

      switch (format) {
        case 'json':
          content = logs.map(log => JSON.stringify(log)).join('\n') + '\n';
          break;
        case 'csv':
          content = this.convertToCSV(logs);
          break;
        default:
          continue;
      }

      if (this.config.fileAggregation.compression) {
        const compressed = zlib.gzipSync(content);
        fs.appendFileSync(`${filepath}.gz`, compressed);
      } else {
        fs.appendFileSync(filepath, content);
      }
    }
  }

  private convertToCSV(logs: LogEntry[]): string {
    if (logs.length === 0) return '';

    const headers = [
      'timestamp',
      'level',
      'message',
      'service',
      'traceId',
      'statusCode',
      'responseTime',
    ];
    const rows = logs.map(log => [
      log.timestamp,
      log.level,
      `"${log.message.replace(/"/g, '""')}"`,
      log.context?.service || '',
      log.context?.traceId || '',
      log.context?.statusCode || '',
      log.context?.responseTime || '',
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n') + '\n';
  }

  // 搜索日志
  async searchLogs(query: SearchQuery): Promise<SearchResult> {
    if (!this.config.search.enabled) {
      throw new Error('Search is not enabled');
    }

    try {
      // 使用OpenObserve查询接口
      const result = await this.openobserveService.queryLogs(query);
      return result;
    } catch (error) {
      this.loggingService.error('Failed to search logs', error);
      throw error;
    }
  }

  // 获取日志分析
  async getLogAnalytics(timeRange?: { from: string; to: string }): Promise<LogAnalytics> {
    if (!this.config.analytics.enabled) {
      throw new Error('Analytics is not enabled');
    }

    try {
      // 使用OpenObserve分析接口
      const analytics = await this.openobserveService.getLogAnalytics(timeRange);
      return analytics;
    } catch (error) {
      this.loggingService.error('Failed to get log analytics', error);
      throw error;
    }
  }

  private transformBuckets(buckets: any[]): Record<string, number> {
    return buckets.reduce((acc, bucket) => {
      acc[bucket.key] = bucket.doc_count;
      return acc;
    }, {});
  }

  private calculateErrorRate(levelBuckets: any[], total: number): number {
    const errorBucket = levelBuckets.find(bucket => bucket.key === 'error');
    return errorBucket ? errorBucket.doc_count / total : 0;
  }

  // OpenObserve自带仪表板功能

  // 清理过期日志文件
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldLogs(): Promise<void> {
    if (!this.config.fileAggregation.enabled) return;

    const directory = this.config.fileAggregation.directory;
    const retentionDays = this.config.fileAggregation.retention.days;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const files = fs.readdirSync(directory);
      let deletedCount = 0;

      for (const file of files) {
        const filepath = path.join(directory, file);
        const stats = fs.statSync(filepath);

        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filepath);
          deletedCount++;
        }
      }

      this.loggingService.info(`Cleaned up ${deletedCount} old log files`);
    } catch (error) {
      this.loggingService.error('Failed to cleanup old log files', error);
    }
  }

  // 获取配置
  getConfig(): LogAggregationConfig {
    return { ...this.config };
  }

  // 健康检查
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, any> }> {
    const details: Record<string, any> = {
      enabled: this.config.enabled,
      bufferSize: this.logBuffer.length,
      openobserve: 'unknown',
      fileAggregation: this.config.fileAggregation.enabled,
    };

    try {
      // 测试OpenObserve连接
      await this.openobserveService.testConnection();
      details.openobserve = 'healthy';

      const isHealthy = this.config.enabled && this.logBuffer.length < 1000; // 简化健康检查逻辑

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { ...details, error: error.message },
      };
    }
  }
}
