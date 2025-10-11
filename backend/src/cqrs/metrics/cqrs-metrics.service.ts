// 用途：CQRS模块指标收集服务
// 作者：后端开发团队
// 时间：2025-10-09

import { Injectable, Logger, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsOpenObserveConfig } from '../../config/cqrs-openobserve.config';
import OpenObserveTransport from '../../logging/openobserve-transport';

export interface MetricData {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp?: Date;
}

@Injectable()
export class CqrsMetricsService implements OnModuleDestroy {
  private readonly logger = new Logger(CqrsMetricsService.name);
  private readonly config: CqrsOpenObserveConfig;
  private readonly metricsBuffer: MetricData[] = [];
  private flushTimer?: NodeJS.Timeout;
  private static readonly DEFAULT_BUCKETS = [50, 100, 200, 500, 1000, 2000, 5000, 10000];

  constructor(
    @Inject('OPENOBSERVE_TRANSPORT') private readonly openObserveTransport: OpenObserveTransport,
    private readonly configService: ConfigService,
  ) {
    const config = this.configService.get<CqrsOpenObserveConfig>('cqrsOpenObserve');
    if (!config) {
      throw new Error('CQRS OpenObserve configuration not found');
    }
    this.config = config;
    this.setupFlushTimer();
  }

  /**
   * 记录计数器指标
   */
  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    this.addMetric({
      name,
      value,
      labels,
      timestamp: new Date(),
    });
  }

  /**
   * 记录直方图指标
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    this.addMetric({
      name,
      value,
      labels,
      timestamp: new Date(),
    });
  }

  /**
   * 以 Prometheus 风格桶上报直方图（name_bucket + _sum + _count）
   * 支持在 OpenObserve 中使用 PromQL 的 histogram_quantile 做分位数查询。
   */
  recordHistogramBuckets(
    name: string,
    value: number,
    labels?: Record<string, string>,
    buckets?: number[],
  ): void {
    const baseLabels: Record<string, string> = { ...(labels || {}) };
    const usedBuckets = buckets && buckets.length ? buckets : this.getHistogramBuckets(name);

    // 累计桶：对所有上界 >= value 的桶递增 1
    for (const upperBound of usedBuckets) {
      if (value <= upperBound) {
        this.incrementCounter(`${name}_bucket`, 1, { ...baseLabels, le: upperBound.toString() });
      }
    }
    // +Inf 桶总是递增 1
    this.incrementCounter(`${name}_bucket`, 1, { ...baseLabels, le: '+Inf' });

    // 汇总指标
    this.incrementCounter(`${name}_sum`, value, baseLabels);
    this.incrementCounter(`${name}_count`, 1, baseLabels);
  }

  /**
   * 获取指定指标的直方图桶配置
   */
  getHistogramBuckets(name: string): number[] {
    // 针对 SWR 刷新耗时配置
    if (name === 'cqrs_swr_refresh_duration_ms') {
      return (
        this.config.metrics?.histogramBuckets?.swrRefreshMs || CqrsMetricsService.DEFAULT_BUCKETS
      );
    }
    return CqrsMetricsService.DEFAULT_BUCKETS;
  }

  /**
   * 记录命令指标
   */
  recordCommand(
    type: string,
    status: 'success' | 'error',
    durationMs: number,
    handler: string,
    retryCount: number = 0,
  ): void {
    this.incrementCounter('cqrs_command_total', 1, { type, status });
    this.recordHistogram('cqrs_command_duration_ms', durationMs, { type, handler });

    if (retryCount > 0) {
      this.incrementCounter('cqrs_command_retry_total', 1, { type });
      this.recordHistogram('cqrs_command_retry_count', retryCount, { type });
    }
  }

  /**
   * 记录查询指标
   */
  recordQuery(type: string, cacheHit: boolean, durationMs: number, handler: string): void {
    this.incrementCounter('cqrs_query_total', 1, { type, cache_hit: cacheHit.toString() });
    this.recordHistogram('cqrs_query_duration_ms', durationMs, { type, handler });
  }

  /**
   * 记录事件指标
   */
  recordEvent(
    type: string,
    status: 'published' | 'handled' | 'error',
    durationMs: number,
    subscriber?: string,
  ): void {
    this.incrementCounter('cqrs_event_published_total', 1, { type });

    if (status === 'handled') {
      this.incrementCounter('cqrs_event_handle_total', 1, {
        type,
        status,
        subscriber: subscriber || 'unknown',
      });
      this.recordHistogram('cqrs_event_handle_duration_ms', durationMs, {
        type,
        subscriber: subscriber || 'unknown',
      });
    } else if (status === 'error') {
      this.incrementCounter('cqrs_event_dlq_total', 1, { type });
    }
  }

  /**
   * 记录运行时指标
   */
  recordRuntimeMetric(
    kind: string,
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    this.recordHistogram(`cqrs_${kind}_${name}`, value, labels || {});
  }

  /**
   * 添加指标到缓冲区
   */
  private addMetric(metric: MetricData): void {
    this.metricsBuffer.push(metric);

    // 如果缓冲区满了，立即刷新
    if (this.metricsBuffer.length >= this.config.performance.batchSize) {
      this.flushMetrics();
    }
  }

  /**
   * 设置定时刷新
   */
  private setupFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushMetrics();
    }, this.config.performance.flushInterval);
  }

  /**
   * 刷新指标到 OpenObserve
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return;
    }

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer.length = 0;

    try {
      // 将指标转换为 OpenObserve 格式
      const logData = metrics.map(metric => ({
        timestamp: metric.timestamp?.toISOString() || new Date().toISOString(),
        level: 'INFO',
        service: process.env.SERVICE_NAME || 'backend',
        source: 'metrics',
        env: process.env.NODE_ENV || 'development',
        version: process.env.SERVICE_VERSION || '1.0.0',
        metric_name: metric.name,
        metric_value: metric.value,
        ...metric.labels,
      }));

      // 批量写入
      for (const logEntry of logData) {
        this.openObserveTransport.log(logEntry);
      }

      this.logger.debug(`Flushed ${metrics.length} metrics to OpenObserve`);
    } catch (error) {
      this.logger.error('Failed to flush metrics to OpenObserve', error);

      // 将指标放回缓冲区，以便下次重试
      this.metricsBuffer.unshift(...metrics);
    }
  }

  /**
   * 清理资源
   */
  onModuleDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // 刷新剩余指标
    this.flushMetrics();
  }
}
