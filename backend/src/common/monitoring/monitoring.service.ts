import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisCacheService } from '../cache/redis-cache.service';
import { TracingService } from '../tracing/tracing.service';
import * as os from 'os';
import * as process from 'process';

/**
 * 监控指标类型
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

/**
 * 监控指标
 */
export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
  help?: string;
}

/**
 * HTTP指标
 */
export interface HttpMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  statusCodes: Record<string, number>;
  endpoints: Record<string, EndpointMetrics>;
}

/**
 * 端点指标
 */
export interface EndpointMetrics {
  path: string;
  method: string;
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  lastAccessed: Date;
}

/**
 * 系统指标
 */
export interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  process: {
    pid: number;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
}

/**
 * 应用指标
 */
export interface ApplicationMetrics {
  activeConnections: number;
  databaseConnections: number;
  cacheHitRate: number;
  queueSize: number;
  errorCount: number;
  warningCount: number;
  customMetrics: Record<string, number>;
}

/**
 * 健康状态
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, HealthCheck>;
  timestamp: Date;
  uptime: number;
}

/**
 * 健康检查
 */
export interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  responseTime?: number;
  details?: any;
}

/**
 * 监控配置
 */
export interface MonitoringConfig {
  enabled: boolean;
  interval: number;
  retention: number;
  metrics: {
    http: boolean;
    system: boolean;
    application: boolean;
    custom: boolean;
  };
  alerts: {
    enabled: boolean;
    thresholds: Record<string, number>;
  };
  exporters: {
    prometheus: boolean;
    grafana: boolean;
    elasticsearch: boolean;
  };
}

/**
 * 监控服务
 */
@Injectable()
export class MonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly metrics = new Map<string, Metric[]>();
  private readonly httpMetrics: HttpMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    p95ResponseTime: 0,
    p99ResponseTime: 0,
    requestsPerSecond: 0,
    errorRate: 0,
    statusCodes: {},
    endpoints: {},
  };
  private readonly responseTimes: number[] = [];
  private startTime: Date;
  private config: MonitoringConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: RedisCacheService,
    private readonly tracingService: TracingService,
  ) {
    this.startTime = new Date();
    this.initializeConfig();
  }

  async onModuleInit() {
    this.logger.log('Monitoring service initialized');
    await this.initializeMetrics();
  }

  async onModuleDestroy() {
    this.logger.log('Monitoring service destroyed');
    await this.cleanup();
  }

  /**
   * 初始化配置
   */
  private initializeConfig() {
    this.config = {
      enabled: this.configService.get('MONITORING_ENABLED', true),
      interval: this.configService.get('MONITORING_INTERVAL', 60),
      retention: this.configService.get('MONITORING_RETENTION', 86400),
      metrics: {
        http: this.configService.get('MONITORING_HTTP_METRICS', true),
        system: this.configService.get('MONITORING_SYSTEM_METRICS', true),
        application: this.configService.get('MONITORING_APP_METRICS', true),
        custom: this.configService.get('MONITORING_CUSTOM_METRICS', true),
      },
      alerts: {
        enabled: this.configService.get('MONITORING_ALERTS_ENABLED', true),
        thresholds: {
          cpu_usage: this.configService.get('ALERT_CPU_THRESHOLD', 80),
          memory_usage: this.configService.get('ALERT_MEMORY_THRESHOLD', 80),
          error_rate: this.configService.get('ALERT_ERROR_RATE_THRESHOLD', 5),
          response_time: this.configService.get('ALERT_RESPONSE_TIME_THRESHOLD', 1000),
        },
      },
      exporters: {
        prometheus: this.configService.get('PROMETHEUS_ENABLED', false),
        grafana: this.configService.get('GRAFANA_ENABLED', false),
        elasticsearch: false, // 禁用Elasticsearch导出器
      },
    };
  }

  /**
   * 初始化指标
   */
  private async initializeMetrics() {
    if (!this.config.enabled) return;

    // 初始化基础指标
    this.recordMetric({
      name: 'app_start_time',
      type: MetricType.GAUGE,
      value: this.startTime.getTime(),
      timestamp: Date.now(),
      help: 'Application start time',
    });

    this.logger.log('Metrics initialized');
  }

  /**
   * 记录HTTP请求
   */
  recordHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    responseTime: number,
    userAgent?: string,
    ip?: string,
  ) {
    if (!this.config.metrics.http) return;

    const span = this.tracingService.startSpan('monitoring.record_http_request');

    try {
      // 更新总体指标
      this.httpMetrics.totalRequests++;

      if (statusCode >= 200 && statusCode < 400) {
        this.httpMetrics.successfulRequests++;
      } else {
        this.httpMetrics.failedRequests++;
      }

      // 记录响应时间
      this.responseTimes.push(responseTime);
      if (this.responseTimes.length > 1000) {
        this.responseTimes.shift();
      }

      // 更新状态码统计
      const statusKey = statusCode.toString();
      this.httpMetrics.statusCodes[statusKey] = (this.httpMetrics.statusCodes[statusKey] || 0) + 1;

      // 更新端点指标
      const endpointKey = `${method}:${path}`;
      if (!this.httpMetrics.endpoints[endpointKey]) {
        this.httpMetrics.endpoints[endpointKey] = {
          path,
          method,
          totalRequests: 0,
          averageResponseTime: 0,
          errorRate: 0,
          lastAccessed: new Date(),
        };
      }

      const endpoint = this.httpMetrics.endpoints[endpointKey];
      endpoint.totalRequests++;
      endpoint.averageResponseTime =
        (endpoint.averageResponseTime * (endpoint.totalRequests - 1) + responseTime) /
        endpoint.totalRequests;
      endpoint.lastAccessed = new Date();

      if (statusCode >= 400) {
        endpoint.errorRate =
          (endpoint.errorRate * (endpoint.totalRequests - 1) + 1) / endpoint.totalRequests;
      }

      // 记录Prometheus指标
      this.recordMetric({
        name: 'http_requests_total',
        type: MetricType.COUNTER,
        value: 1,
        labels: {
          method,
          path,
          status_code: statusCode.toString(),
        },
        timestamp: Date.now(),
      });

      this.recordMetric({
        name: 'http_request_duration_ms',
        type: MetricType.HISTOGRAM,
        value: responseTime,
        labels: { method, path },
        timestamp: Date.now(),
      });

      span.setAttributes({
        'http.method': method,
        'http.path': path,
        'http.status_code': statusCode,
        'http.response_time': responseTime,
      });
    } catch (error) {
      this.logger.error('Failed to record HTTP request', error);
      span.recordException(error);
    } finally {
      span.end();
    }
  }

  /**
   * 记录自定义指标
   */
  recordMetric(metric: Metric) {
    if (!this.config.metrics.custom) return;

    const key = `${metric.name}:${JSON.stringify(metric.labels || {})}`;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metricHistory = this.metrics.get(key);
    if (metricHistory) {
      metricHistory.push(metric);

      // 保持指标历史在合理范围内
      if (metricHistory.length > 1000) {
        metricHistory.shift();
      }
    }
    // 异步存储到Redis
    this.storeMetricToRedis(metric).catch(error => {
      this.logger.warn('Failed to store metric to Redis', error);
    });
  }

  /**
   * 获取HTTP指标
   */
  getHttpMetrics(): HttpMetrics {
    // 计算实时指标
    if (this.responseTimes.length > 0) {
      const sorted = [...this.responseTimes].sort((a, b) => a - b);
      this.httpMetrics.averageResponseTime =
        this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
      this.httpMetrics.p95ResponseTime = sorted[Math.floor(sorted.length * 0.95)];
      this.httpMetrics.p99ResponseTime = sorted[Math.floor(sorted.length * 0.99)];
    }

    this.httpMetrics.errorRate =
      this.httpMetrics.totalRequests > 0
        ? (this.httpMetrics.failedRequests / this.httpMetrics.totalRequests) * 100
        : 0;

    return { ...this.httpMetrics };
  }

  /**
   * 获取系统指标
   */
  getSystemMetrics(): SystemMetrics {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      cpu: {
        usage: this.getCpuUsage(),
        loadAverage: os.loadavg(),
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        usage: (usedMemory / totalMemory) * 100,
      },
      disk: {
        total: 0, // 需要额外的库来获取磁盘信息
        used: 0,
        free: 0,
        usage: 0,
      },
      network: {
        bytesIn: 0, // 需要额外的库来获取网络信息
        bytesOut: 0,
        packetsIn: 0,
        packetsOut: 0,
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage,
        cpuUsage,
      },
    };
  }

  /**
   * 获取应用指标
   */
  async getApplicationMetrics(): Promise<ApplicationMetrics> {
    const cacheStats = await this.cacheService.getStats();

    return {
      activeConnections: 0, // 需要从连接池获取
      databaseConnections: 0, // 需要从数据库连接池获取
      cacheHitRate: cacheStats.hitRate,
      queueSize: 0, // 需要从队列系统获取
      errorCount: this.httpMetrics.failedRequests,
      warningCount: 0, // 需要从日志系统获取
      customMetrics: this.getCustomMetricsSummary(),
    };
  }

  /**
   * 获取健康状态
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const checks: Record<string, HealthCheck> = {};

    // 检查Redis连接
    try {
      const start = Date.now();
      await this.cacheService.get('health_check');
      checks.redis = {
        status: 'pass',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      checks.redis = {
        status: 'fail',
        message: error.message,
      };
    }

    // 检查内存使用
    const systemMetrics = this.getSystemMetrics();
    checks.memory = {
      status:
        systemMetrics.memory.usage > 90
          ? 'fail'
          : systemMetrics.memory.usage > 80
            ? 'warn'
            : 'pass',
      details: {
        usage: systemMetrics.memory.usage,
        total: systemMetrics.memory.total,
        used: systemMetrics.memory.used,
      },
    };

    // 检查CPU使用
    checks.cpu = {
      status:
        systemMetrics.cpu.usage > 90 ? 'fail' : systemMetrics.cpu.usage > 80 ? 'warn' : 'pass',
      details: {
        usage: systemMetrics.cpu.usage,
        loadAverage: systemMetrics.cpu.loadAverage,
      },
    };

    // 检查错误率
    const errorRate = this.httpMetrics.errorRate;
    checks.error_rate = {
      status: errorRate > 10 ? 'fail' : errorRate > 5 ? 'warn' : 'pass',
      details: {
        errorRate,
        totalRequests: this.httpMetrics.totalRequests,
        failedRequests: this.httpMetrics.failedRequests,
      },
    };

    // 确定总体状态
    const statuses = Object.values(checks).map(check => check.status);
    const overallStatus = statuses.includes('fail')
      ? 'unhealthy'
      : statuses.includes('warn')
        ? 'degraded'
        : 'healthy';

    return {
      status: overallStatus,
      checks,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
    };
  }

  /**
   * 获取Prometheus格式指标
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];

    // HTTP指标
    lines.push('# HELP http_requests_total Total number of HTTP requests');
    lines.push('# TYPE http_requests_total counter');

    for (const [statusCode, count] of Object.entries(this.httpMetrics.statusCodes)) {
      lines.push(`http_requests_total{status_code="${statusCode}"} ${count}`);
    }

    lines.push('# HELP http_request_duration_seconds HTTP request duration');
    lines.push('# TYPE http_request_duration_seconds histogram');
    lines.push(
      `http_request_duration_seconds_sum ${this.responseTimes.reduce((sum, time) => sum + time, 0) / 1000}`,
    );
    lines.push(`http_request_duration_seconds_count ${this.responseTimes.length}`);

    // 系统指标
    const systemMetrics = this.getSystemMetrics();
    lines.push('# HELP system_memory_usage_percent System memory usage percentage');
    lines.push('# TYPE system_memory_usage_percent gauge');
    lines.push(`system_memory_usage_percent ${systemMetrics.memory.usage}`);

    lines.push('# HELP system_cpu_usage_percent System CPU usage percentage');
    lines.push('# TYPE system_cpu_usage_percent gauge');
    lines.push(`system_cpu_usage_percent ${systemMetrics.cpu.usage}`);

    // 自定义指标
    for (const [key, metricHistory] of this.metrics.entries()) {
      if (metricHistory.length > 0) {
        const latest = metricHistory[metricHistory.length - 1];
        const labelsStr = latest.labels
          ? Object.entries(latest.labels)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',')
          : '';

        if (latest.help) {
          lines.push(`# HELP ${latest.name} ${latest.help}`);
        }
        lines.push(`# TYPE ${latest.name} ${latest.type}`);
        lines.push(`${latest.name}${labelsStr ? `{${labelsStr}}` : ''} ${latest.value}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 重置指标
   */
  resetMetrics() {
    this.metrics.clear();
    Object.assign(this.httpMetrics, {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      statusCodes: {},
      endpoints: {},
    });
    this.responseTimes.length = 0;
    this.logger.log('Metrics reset');
  }

  /**
   * 定时收集系统指标
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async collectSystemMetrics() {
    if (!this.config.enabled || !this.config.metrics.system) return;

    try {
      const systemMetrics = this.getSystemMetrics();

      // 记录系统指标
      this.recordMetric({
        name: 'system_memory_usage_percent',
        type: MetricType.GAUGE,
        value: systemMetrics.memory.usage,
        timestamp: Date.now(),
      });

      this.recordMetric({
        name: 'system_cpu_usage_percent',
        type: MetricType.GAUGE,
        value: systemMetrics.cpu.usage,
        timestamp: Date.now(),
      });

      this.recordMetric({
        name: 'process_uptime_seconds',
        type: MetricType.GAUGE,
        value: systemMetrics.process.uptime,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.error('Failed to collect system metrics', error);
    }
  }

  /**
   * 定时清理过期指标
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupMetrics() {
    if (!this.config.enabled) return;

    try {
      const cutoff = Date.now() - this.config.retention * 1000;
      let cleaned = 0;

      for (const [key, metricHistory] of this.metrics.entries()) {
        const filtered = metricHistory.filter(metric => metric.timestamp > cutoff);
        if (filtered.length !== metricHistory.length) {
          this.metrics.set(key, filtered);
          cleaned += metricHistory.length - filtered.length;
        }
      }

      if (cleaned > 0) {
        this.logger.log(`Cleaned up ${cleaned} expired metrics`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup metrics', error);
    }
  }

  /**
   * 获取CPU使用率
   */
  private getCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    }

    return 100 - (totalIdle / totalTick) * 100;
  }

  /**
   * 获取自定义指标摘要
   */
  private getCustomMetricsSummary(): Record<string, number> {
    const summary: Record<string, number> = {};

    for (const [key, metricHistory] of this.metrics.entries()) {
      if (metricHistory && metricHistory.length > 0) {
        const latest = metricHistory[metricHistory.length - 1];
        summary[key] = latest.value;
      }
    }

    return summary;
  }

  /**
   * 存储指标到Redis
   */
  private async storeMetricToRedis(metric: Metric) {
    const key = `metrics:${metric.name}:${Date.now()}`;
    await this.cacheService.set(key, JSON.stringify(metric), this.config.retention as any);
  }

  /**
   * 清理资源
   */
  private async cleanup() {
    // 清理定时任务和资源
    this.metrics.clear();
    this.responseTimes.length = 0;
  }
}
