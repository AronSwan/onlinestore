import { Injectable, Logger } from '@nestjs/common';
import { OpenObserveConfigService } from '../config/openobserve-config.service';

/**
 * 指标数据接口
 */
export interface MetricData {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
}

/**
 * 请求统计接口
 */
export interface RequestStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  timestamp: number;
}

/**
 * 指标收集器
 * 提供更准确的错误率统计和性能指标
 */
@Injectable()
export class MetricsCollector {
  private readonly logger = new Logger(MetricsCollector.name);
  private readonly configService: OpenObserveConfigService;
  private readonly metrics: Map<string, MetricData[]> = new Map();
  private readonly responseTimes: number[] = [];
  private readonly requestStats: RequestStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    p95ResponseTime: 0,
    p99ResponseTime: 0,
    errorRate: 0,
    timestamp: Date.now(),
  };
  private readonly maxResponseTimeSamples = 1000;
  private readonly metricsRetentionPeriod = 24 * 60 * 60 * 1000; // 24小时

  constructor(configService: OpenObserveConfigService) {
    this.configService = configService;
    
    // 定期清理过期指标
    setInterval(() => {
      this.cleanupExpiredMetrics();
    }, 60000); // 每分钟清理一次
    
    this.logger.debug('MetricsCollector initialized');
  }

  /**
   * 记录请求指标
   */
  recordRequest(
    success: boolean, 
    responseTime: number, 
    statusCode?: number,
    labels?: Record<string, string>
  ): void {
    // 更新请求统计
    this.requestStats.totalRequests++;
    
    if (success) {
      this.requestStats.successfulRequests++;
    } else {
      this.requestStats.failedRequests++;
    }
    
    // 记录响应时间
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > this.maxResponseTimeSamples) {
      this.responseTimes.shift();
    }
    
    // 计算统计指标
    this.calculateStats();
    
    // 记录详细指标
    this.recordMetric('request_count', 1, {
      ...labels,
      success: success.toString(),
      status_code: statusCode?.toString() || 'unknown',
    });
    
    this.recordMetric('response_time', responseTime, {
      ...labels,
      status_code: statusCode?.toString() || 'unknown',
    });
  }

  /**
   * 记录错误指标
   */
  recordError(
    errorType: string, 
    errorMessage: string, 
    labels?: Record<string, string>
  ): void {
    this.recordMetric('error_count', 1, {
      ...labels,
      error_type: errorType,
    });
    
    this.logger.debug(`Error recorded: ${errorType} - ${errorMessage}`);
  }

  /**
   * 记录自定义指标
   */
  recordMetric(
    name: string, 
    value: number, 
    labels?: Record<string, string>
  ): void {
    const timestamp = Date.now();
    const metricData: MetricData = {
      name,
      value,
      labels,
      timestamp,
    };
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const metricList = this.metrics.get(name)!;
    metricList.push(metricData);
    
    // 如果启用了OpenObserve指标收集，则发送到OpenObserve
    if (this.configService.getConfig().metrics?.enabled) {
      this.sendMetricToOpenObserve(metricData).catch(error => {
        this.logger.warn('Failed to send metric to OpenObserve', error.message);
      });
    }
  }

  /**
   * 获取请求统计
   */
  getRequestStats(): RequestStats {
    return { ...this.requestStats };
  }

  /**
   * 获取指标数据
   */
  getMetrics(name?: string, timeRange?: number): MetricData[] {
    const now = Date.now();
    const timeThreshold = timeRange ? now - timeRange : now - this.metricsRetentionPeriod;
    
    if (name) {
      const metricList = this.metrics.get(name) || [];
      return metricList.filter(metric => metric.timestamp >= timeThreshold);
    }
    
    // 返回所有指标
    const allMetrics: MetricData[] = [];
    for (const metricList of this.metrics.values()) {
      allMetrics.push(...metricList.filter(metric => metric.timestamp >= timeThreshold));
    }
    
    return allMetrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 计算统计指标
   */
  private calculateStats(): void {
    if (this.responseTimes.length === 0) {
      return;
    }
    
    // 计算平均响应时间
    const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
    this.requestStats.averageResponseTime = sum / this.responseTimes.length;
    
    // 计算百分位数
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    this.requestStats.p95ResponseTime = this.calculatePercentile(sortedTimes, 0.95);
    this.requestStats.p99ResponseTime = this.calculatePercentile(sortedTimes, 0.99);
    
    // 计算错误率
    this.requestStats.errorRate = this.requestStats.totalRequests > 0 
      ? this.requestStats.failedRequests / this.requestStats.totalRequests 
      : 0;
    
    this.requestStats.timestamp = Date.now();
  }

  /**
   * 计算百分位数
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) {
      return 0;
    }
    
    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * 发送指标到OpenObserve
   */
  private async sendMetricToOpenObserve(metric: MetricData): Promise<void> {
    try {
      const config = this.configService.getConfig();
      const metricData = {
        stream: 'metrics',
        timestamp: new Date(metric.timestamp).toISOString(),
        ...metric.labels,
        metric_name: metric.name,
        metric_value: metric.value,
      };
      
      // 这里应该使用OpenObserveService发送数据
      // 为了避免循环依赖，我们直接使用axios
      const axios = require('axios');
      const url = `${config.url}/api/${config.organization}/metrics/_json`;
      
      const headers = {};
      if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`;
      }
      
      await axios.post(url, [metricData], { headers, timeout: 5000 });
      
    } catch (error) {
      this.logger.error('Failed to send metric to OpenObserve', error.message);
    }
  }

  /**
   * 清理过期指标
   */
  private cleanupExpiredMetrics(): void {
    const now = Date.now();
    const timeThreshold = now - this.metricsRetentionPeriod;
    
    for (const [name, metricList] of this.metrics.entries()) {
      const filteredMetrics = metricList.filter(metric => metric.timestamp >= timeThreshold);
      
      if (filteredMetrics.length !== metricList.length) {
        this.metrics.set(name, filteredMetrics);
        this.logger.debug(`Cleaned up ${metricList.length - filteredMetrics.length} expired metrics for ${name}`);
      }
    }
  }

  /**
   * 重置所有指标
   */
  resetMetrics(): void {
    this.metrics.clear();
    this.responseTimes.length = 0;
    this.requestStats.totalRequests = 0;
    this.requestStats.successfulRequests = 0;
    this.requestStats.failedRequests = 0;
    this.requestStats.averageResponseTime = 0;
    this.requestStats.p95ResponseTime = 0;
    this.requestStats.p99ResponseTime = 0;
    this.requestStats.errorRate = 0;
    this.requestStats.timestamp = Date.now();
    
    this.logger.log('All metrics have been reset');
  }

  /**
   * 获取Prometheus格式的指标
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];
    
    // 请求统计指标
    lines.push(`# HELP openobserve_requests_total Total number of requests`);
    lines.push(`# TYPE openobserve_requests_total counter`);
    lines.push(`openobserve_requests_total ${this.requestStats.totalRequests}`);
    
    lines.push(`# HELP openobserve_requests_successful_total Total number of successful requests`);
    lines.push(`# TYPE openobserve_requests_successful_total counter`);
    lines.push(`openobserve_requests_successful_total ${this.requestStats.successfulRequests}`);
    
    lines.push(`# HELP openobserve_requests_failed_total Total number of failed requests`);
    lines.push(`# TYPE openobserve_requests_failed_total counter`);
    lines.push(`openobserve_requests_failed_total ${this.requestStats.failedRequests}`);
    
    // 响应时间指标
    lines.push(`# HELP openobserve_response_time_average Average response time in milliseconds`);
    lines.push(`# TYPE openobserve_response_time_average gauge`);
    lines.push(`openobserve_response_time_average ${this.requestStats.averageResponseTime}`);
    
    lines.push(`# HELP openobserve_response_time_p95 95th percentile response time in milliseconds`);
    lines.push(`# TYPE openobserve_response_time_p95 gauge`);
    lines.push(`openobserve_response_time_p95 ${this.requestStats.p95ResponseTime}`);
    
    lines.push(`# HELP openobserve_response_time_p99 99th percentile response time in milliseconds`);
    lines.push(`# TYPE openobserve_response_time_p99 gauge`);
    lines.push(`openobserve_response_time_p99 ${this.requestStats.p99ResponseTime}`);
    
    // 错误率指标
    lines.push(`# HELP openobserve_error_rate Error rate as a fraction of total requests`);
    lines.push(`# TYPE openobserve_error_rate gauge`);
    lines.push(`openobserve_error_rate ${this.requestStats.errorRate}`);
    
    return lines.join('\n') + '\n';
  }
}