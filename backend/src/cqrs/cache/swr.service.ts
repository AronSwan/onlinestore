// 用途：CQRS模块SWR和并发去重服务
// 作者：后端开发团队
// 时间：2025-10-09

import { Injectable, Logger } from '@nestjs/common';
import { IQueryCache } from '../interfaces/query-handler.interface';
import { CqrsMetricsService } from '../metrics/cqrs-metrics.service';

export interface SWROptions {
  ttl?: number;
  staleWhileRevalidate?: boolean;
  staleTime?: number;
  labels?: { type?: string; handler?: string };
}

export interface CacheEntry<T> {
  data: T;
  expiresAt: Date;
  staleAt?: Date;
}

export interface PendingQuery<T> {
  promise: Promise<T>;
  createdAt: Date;
}

@Injectable()
export class SWRService {
  private readonly logger = new Logger(SWRService.name);
  private readonly pendingQueries = new Map<string, PendingQuery<any>>();

  constructor(
    private readonly queryCache: IQueryCache,
    private readonly metrics?: CqrsMetricsService,
  ) {}

  /**
   * 获取支持 SWR 的数据
   */
  async getWithSWR<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: SWROptions = {},
  ): Promise<{ data: T; fromCache: boolean; isStale: boolean }> {
    const { ttl = 300, staleWhileRevalidate = true, staleTime = 60, labels } = options;
    const normLabels = this.normalizeLabels(labels);
    const now = new Date();

    try {
      // 检查并发查询
      const existingPending = this.pendingQueries.get(key);
      if (existingPending) {
        this.logger.debug(`Duplicating query for key: ${key}`);
        const data = await existingPending.promise;
        return { data, fromCache: true, isStale: false };
      }

      // 尝试从缓存获取
      const cached = await this.queryCache.get<CacheEntry<T>>(key);
      if (cached) {
        const isExpired = cached.expiresAt <= now;
        const isStale = cached.staleAt ? cached.staleAt <= now : isExpired;

        if (!isExpired) {
          // 缓存未过期，直接返回
          return { data: cached.data, fromCache: true, isStale: false };
        }

        // 缓存过期但数据仍然可用
        if (staleWhileRevalidate && !isStale) {
          // 后台刷新
          this.metrics?.incrementCounter('cqrs_swr_background_refresh_total', 1, {
            stage: 'scheduled',
            ...normLabels,
          });
          this.backgroundRefresh(key, fetcher, { ttl, staleTime, labels: normLabels });
          return { data: cached.data, fromCache: true, isStale: true };
        }
      }

      // 执行查询
      const pendingQuery = this.createPendingQuery(fetcher);
      this.pendingQueries.set(key, pendingQuery);

      try {
        const data = await pendingQuery.promise;

        // 保存到缓存
        const expiresAt = new Date(now.getTime() + ttl * 1000);
        const staleAt = staleTime ? new Date(now.getTime() + staleTime * 1000) : expiresAt;

        await this.queryCache.set(key, { data, expiresAt, staleAt });

        return { data, fromCache: false, isStale: false };
      } finally {
        // 清理待处理查询
        this.pendingQueries.delete(key);
      }
    } catch (error) {
      // 发生错误时尝试返回过期缓存
      const cached = await this.queryCache.get<CacheEntry<T>>(key);
      if (cached) {
        this.logger.warn(`Returning stale cache due to error for key: ${key}`, error);
        this.metrics?.incrementCounter('cqrs_swr_stale_return_total', 1, { ...normLabels });
        return { data: cached.data, fromCache: true, isStale: true };
      }

      throw error;
    }
  }

  /**
   * 后台刷新
   */
  private async backgroundRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { ttl: number; staleTime?: number; labels?: { type?: string; handler?: string } },
  ): Promise<void> {
    try {
      this.logger.debug(`Background refresh for key: ${key}`);
      const labels = this.normalizeLabels(options.labels);
      this.metrics?.incrementCounter('cqrs_swr_background_refresh_total', 1, {
        stage: 'start',
        ...labels,
      });
      const start = Date.now();

      const data = await fetcher();
      const now = new Date();
      const { ttl, staleTime } = options;

      const expiresAt = new Date(now.getTime() + ttl * 1000);
      const staleAt = staleTime ? new Date(now.getTime() + staleTime * 1000) : expiresAt;

      await this.queryCache.set(key, { data, expiresAt, staleAt });
      const durationMs = Date.now() - start;
      // 以 Prometheus 风格上报直方图 buckets/_sum/_count（桶边界由配置提供）
      this.metrics?.recordHistogramBuckets('cqrs_swr_refresh_duration_ms', durationMs, labels);

      this.metrics?.incrementCounter('cqrs_swr_background_refresh_total', 1, {
        stage: 'complete',
        ...labels,
      });
      this.logger.debug(`Background refresh completed for key: ${key}`);
    } catch (error) {
      const labels = this.normalizeLabels(options.labels);
      this.metrics?.incrementCounter('cqrs_swr_background_refresh_total', 1, {
        stage: 'error',
        ...labels,
      });
      this.logger.error(`Background refresh failed for key: ${key}`, error);
    }
  }

  /**
   * 创建待处理查询
   */
  private createPendingQuery<T>(fetcher: () => Promise<T>): PendingQuery<T> {
    const promise = fetcher();
    return {
      promise,
      createdAt: new Date(),
    };
  }

  /**
   * 失效缓存
   */
  async invalidate(key: string): Promise<void> {
    await this.queryCache.delete(key);
    this.logger.debug(`Invalidated cache for key: ${key}`);
  }

  /**
   * 批量失效缓存
   */
  async invalidatePattern(pattern: string): Promise<void> {
    await this.queryCache.clearPattern(pattern);
    this.logger.debug(`Invalidated cache pattern: ${pattern}`);
  }

  /**
   * 清理过期的待处理查询（防止内存泄漏）
   */
  cleanupPendingQueries(maxAge: number = 60000): void {
    const now = new Date();

    for (const [key, pending] of this.pendingQueries.entries()) {
      if (now.getTime() - pending.createdAt.getTime() > maxAge) {
        this.pendingQueries.delete(key);
        this.logger.debug(`Cleaned up pending query for key: ${key}`);
      }
    }
  }

  private normalizeLabels(labels?: {
    [k: string]: string | undefined;
  }): { [k: string]: string } | undefined {
    if (!labels) return undefined;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(labels)) {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        out[k] = String(v);
      }
    }
    return Object.keys(out).length ? out : undefined;
  }
}
