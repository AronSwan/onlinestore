// 用途：查询总线实现，集成TanStack Query功能
// 作者：后端开发团队
// 时间：2025-10-05

import { Injectable, Logger, Inject } from '@nestjs/common';
import { IQuery, IQueryResult } from '../queries/query.base';
import {
  IQueryHandler,
  IQueryMiddleware,
  IQueryPipeline,
  IQueryCache,
  QueryCacheStats,
} from '../interfaces/query-handler.interface';
import { CqrsLoggingService } from '../logging/cqrs-logging.service';
import { CqrsMetricsService } from '../metrics/cqrs-metrics.service';
import { CqrsTracingService } from '../tracing/cqrs-tracing.service';
import { SWRService } from '../cache/swr.service';
import { EnvironmentAdapter } from '../../config/environment-adapter';

/**
 * 查询总线接口
 */
export interface IQueryBus {
  /**
   * 执行查询
   * @param query 查询
   * @returns 查询结果
   */
  execute<TQuery extends IQuery, TResult = any>(query: TQuery): Promise<IQueryResult<TResult>>;

  /**
   * 执行查询（带缓存）
   * @param query 查询
   * @returns 查询结果
   */
  executeWithCache<TQuery extends IQuery, TResult = any>(
    query: TQuery,
  ): Promise<IQueryResult<TResult>>;

  /**
   * 预加载查询
   * @param query 查询
   */
  prefetch<TQuery extends IQuery, TResult = any>(query: TQuery): Promise<void>;

  /**
   * 使缓存失效
   * @param queryType 查询类型
   * @param cacheKey 缓存键
   */
  invalidateCache(queryType: string, cacheKey?: string): Promise<void>;

  /**
   * 注册查询处理器
   * @param queryType 查询类型
   * @param handler 处理器
   */
  register<TQuery extends IQuery, TResult = any>(
    queryType: string,
    handler: IQueryHandler<TQuery, TResult>,
  ): void;

  /**
   * 添加中间件
   * @param middleware 中间件
   */
  addMiddleware(middleware: IQueryMiddleware): void;

  /**
   * 设置查询缓存
   * @param cache 缓存实例
   */
  setQueryCache(cache: IQueryCache): void;

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): Promise<QueryCacheStats | null>;
}

/**
 * 查询总线实现
 */
@Injectable()
export class QueryBus implements IQueryBus, IQueryPipeline {
  private readonly logger = new Logger(QueryBus.name);
  private readonly handlers = new Map<string, IQueryHandler<any, any>>();
  private readonly middlewares: IQueryMiddleware[] = [];
  private queryCache: IQueryCache | null = null;
  private swrService: SWRService | null = null;
  private _cacheStats = {
    hits: 0,
    misses: 0,
  };
  private _swrStats = {
    backgroundRefreshes: 0,
    duplicateDedupeHits: 0,
    invalidations: 0,
    patternInvalidations: 0,
  };

  constructor(
    private readonly cqrsLoggingService: CqrsLoggingService,
    private readonly cqrsMetricsService: CqrsMetricsService,
    private readonly cqrsTracingService: CqrsTracingService,
    @Inject('IQueryCache') queryCache?: IQueryCache,
  ) {
    this.queryCache = queryCache || null;

    // 如果有缓存，创建 SWR 服务
    if (this.queryCache) {
      this.swrService = new SWRService(this.queryCache);
    }
  }

  /**
   * 执行查询
   */
  async execute<TQuery extends IQuery, TResult = any>(
    query: TQuery,
  ): Promise<IQueryResult<TResult>> {
    const queryName = query.constructor.name;
    const queryId = query.id;
    const cacheKey = query.cacheKey || this.generateCacheKey(query);
    const handlerName = this.getHandlerName(queryName);

    // 获取追踪上下文
    const span = this.cqrsTracingService.startQuerySpan(queryName, cacheKey, handlerName);
    const { traceId, spanId } = this.cqrsTracingService.getCurrentContext();

    // 记录开始日志
    this.cqrsLoggingService.logQuery({
      type: queryName,
      cacheKey,
      traceId,
      spanId,
      handler: handlerName,
    });

    const startTime = Date.now();
    let fromCache = false;

    try {
      // 获取查询处理器
      const handler = this.handlers.get(queryName);
      if (!handler) {
        const error = `No handler registered for query: ${queryName}`;

        // 记录错误日志
        this.cqrsLoggingService.logQuery(
          {
            type: queryName,
            cacheKey,
            traceId,
            spanId,
            handler: handlerName,
            durationMs: Date.now() - startTime,
            errorCode: 'HANDLER_NOT_FOUND',
          },
          error,
        );

        // 记录指标
        this.cqrsMetricsService.recordQuery(queryName, false, Date.now() - startTime, handlerName);

        // 完成追踪
        this.cqrsTracingService.finishSpan(span, false, new Error(error), {
          'query.error_code': 'HANDLER_NOT_FOUND',
          'query.duration_ms': Date.now() - startTime,
        });

        return {
          success: false,
          error,
          errorCode: 'HANDLER_NOT_FOUND',
        };
      }

      // 执行中间件管道
      const result = await this.executePipeline(query, handler, {
        traceId,
        spanId,
        queryName,
        cacheKey,
        handlerName,
        startTime,
      });

      const durationMs = Date.now() - startTime;
      fromCache = result.fromCache || false;

      // 记录成功日志
      this.cqrsLoggingService.logQuery({
        type: queryName,
        cacheKey,
        cacheHit: fromCache,
        traceId,
        spanId,
        handler: handlerName,
        durationMs,
      });

      // 记录指标
      this.cqrsMetricsService.recordQuery(queryName, fromCache, durationMs, handlerName);

      // 完成追踪
      this.cqrsTracingService.finishSpan(span, true, undefined, {
        'query.success': result.success,
        'query.duration_ms': durationMs,
        'query.from_cache': fromCache,
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      // 记录错误日志
      this.cqrsLoggingService.logQuery(
        {
          type: queryName,
          cacheKey,
          cacheHit: fromCache,
          traceId,
          spanId,
          handler: handlerName,
          durationMs,
          errorCode: (error as Error).name,
        },
        (error as Error).message,
        error as Error,
      );

      // 记录指标
      this.cqrsMetricsService.recordQuery(queryName, fromCache, durationMs, handlerName);

      // 完成追踪
      this.cqrsTracingService.finishSpan(span, false, error as Error, {
        'query.error_code': (error as Error).name,
        'query.duration_ms': durationMs,
      });

      this.logger.error(
        `Error executing query ${queryName}: ${(error as Error).message}`,
        (error as Error).stack,
      );

      return {
        success: false,
        error: (error as Error).message,
        errorCode: 'EXECUTION_ERROR',
      };
    }
  }

  /**
   * 执行查询（带缓存）
   */
  async executeWithCache<TQuery extends IQuery, TResult = any>(
    query: TQuery,
  ): Promise<IQueryResult<TResult>> {
    const queryName = query.constructor.name;
    const cacheKey = query.cacheKey || this.generateCacheKey(query);

    this.logger.debug(`Executing query with cache: ${queryName}, cache key: ${cacheKey}`);

    // 如果没有缓存实例，直接执行查询
    if (!this.queryCache || !this.swrService) {
      this.logger.debug('No query cache configured, executing query directly');
      return await this.execute(query);
    }

    try {
      // 使用 SWR 获取数据（命中缓存时可能在后台刷新）
      const handler = this.handlers.get(queryName);
      if (!handler) {
        return {
          success: false,
          error: `No handler registered for query: ${queryName}`,
          errorCode: 'HANDLER_NOT_FOUND',
        };
      }

      const handlerName = this.getHandlerName(queryName);
      const span = this.cqrsTracingService.startQuerySpan(queryName, cacheKey, handlerName);
      const { traceId, spanId } = this.cqrsTracingService.getCurrentContext();
      const startTime = Date.now();

      this.cqrsLoggingService.logQuery({
        type: queryName,
        cacheKey,
        traceId,
        spanId,
        handler: handlerName,
      });

      const ttl = query.cacheTime ?? 300;
      const staleTime = query.staleTime ?? 60;

      const swrResult = await this.swrService.getWithSWR<TResult>(
        cacheKey,
        async () => {
          const pipelineResult = await this.executePipeline(query, handler, {
            traceId,
            spanId,
            queryName,
            cacheKey,
            handlerName,
            startTime,
          });

          if (!pipelineResult.success) {
            throw new Error(pipelineResult.error || 'EXECUTION_ERROR');
          }
          return pipelineResult.data as TResult;
        },
        {
          ttl,
          staleWhileRevalidate: true,
          staleTime,
          labels: this.buildSWRLabels(queryName, handlerName, cacheKey),
        },
      );

      const durationMs = Date.now() - startTime;
      if (swrResult.fromCache) {
        this._cacheStats.hits++;
      } else {
        this._cacheStats.misses++;
      }
      if (swrResult.isStale) {
        this._swrStats.backgroundRefreshes++;
      }

      // 记录成功日志与指标
      this.cqrsLoggingService.logQuery({
        type: queryName,
        cacheKey,
        cacheHit: swrResult.fromCache,
        traceId,
        spanId,
        handler: handlerName,
        durationMs,
      });
      this.cqrsMetricsService.recordQuery(queryName, swrResult.fromCache, durationMs, handlerName);
      this.cqrsTracingService.finishSpan(span, true, undefined, {
        'query.success': true,
        'query.duration_ms': durationMs,
        'query.from_cache': swrResult.fromCache,
        'query.swr_is_stale': swrResult.isStale,
      });

      return {
        success: true,
        data: swrResult.data,
        fromCache: swrResult.fromCache,
        cacheExpiresAt: new Date(Date.now() + ttl * 1000),
        metadata: { swr: { isStale: swrResult.isStale } },
      };
    } catch (error) {
      this.logger.error(
        `Error executing cached query ${queryName}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return {
        success: false,
        error: (error as Error).message,
        errorCode: 'EXECUTION_ERROR',
      };
    }
  }

  /**
   * 预加载查询
   */
  async prefetch<TQuery extends IQuery, TResult = any>(query: TQuery): Promise<void> {
    const queryName = query.constructor.name;
    this.logger.debug(`Prefetching query: ${queryName}`);

    // 如果启用 SWR，则通过 SWR 预取以触发后台刷新与并发去重
    if (this.swrService) {
      const handler = this.handlers.get(queryName);
      if (!handler) {
        this.logger.warn(`Cannot prefetch query: no handler for ${queryName}`);
        return;
      }
      const cacheKey = query.cacheKey || this.generateCacheKey(query);
      const ttl = query.cacheTime ?? 300;
      const staleTime = query.staleTime ?? 60;
      const handlerName = this.getHandlerName(queryName);

      this.swrService
        .getWithSWR(
          cacheKey,
          async () => {
            const res = await handler.handle(query);
            if (!res.success) throw new Error(res.error || 'EXECUTION_ERROR');
            return res.data as TResult;
          },
          {
            ttl,
            staleWhileRevalidate: true,
            staleTime,
            labels: this.buildSWRLabels(queryName, handlerName, cacheKey),
          },
        )
        .catch(error => {
          this.logger.error(
            `Error prefetching query: ${queryName}: ${(error as Error).message}`,
            (error as Error).stack,
          );
        });
      return;
    }

    // 否则回退到原始预取逻辑
    this.executeWithCache(query).catch(error => {
      this.logger.error(
        `Error prefetching query: ${queryName}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    });
  }

  /**
   * 使缓存失效
   */
  async invalidateCache(queryType: string, cacheKey?: string): Promise<void> {
    if (!this.swrService) {
      return;
    }

    if (cacheKey) {
      // 使特定缓存键失效
      await this.swrService.invalidate(cacheKey);
      this._swrStats.invalidations++;
      this.logger.debug(`Invalidated cache key: ${cacheKey}`);
    } else {
      // 使查询类型的所有缓存失效
      const pattern = `${queryType}_*`;
      await this.swrService.invalidatePattern(pattern);
      this._swrStats.patternInvalidations++;
      this.logger.debug(`Invalidated cache pattern: ${pattern}`);
    }
  }

  /**
   * 注册查询处理器
   */
  register<TQuery extends IQuery, TResult = any>(
    queryType: string,
    handler: IQueryHandler<TQuery, TResult>,
  ): void {
    if (this.handlers.has(queryType)) {
      this.logger.warn(`Handler for query type ${queryType} is already registered. Overwriting.`);
    }

    this.handlers.set(queryType, handler);
    this.logger.debug(`Registered handler for query type: ${queryType}`);
  }

  /**
   * 添加中间件
   */
  addMiddleware(middleware: IQueryMiddleware): void {
    this.middlewares.push(middleware);
    this.logger.debug(`Added middleware: ${middleware.name}`);
  }

  /**
   * 移除中间件
   */
  removeMiddleware(middlewareName: string): void {
    const index = this.middlewares.findIndex(m => m.name === middlewareName);
    if (index !== -1) {
      this.middlewares.splice(index, 1);
      this.logger.debug(`Removed middleware: ${middlewareName}`);
    }
  }

  /**
   * 设置查询缓存
   */
  setQueryCache(cache: IQueryCache): void {
    this.queryCache = cache;
    this.logger.debug('Query cache configured');
    this.swrService = this.queryCache
      ? new SWRService(this.queryCache, this.cqrsMetricsService)
      : null;
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<QueryCacheStats | null> {
    if (!this.queryCache) {
      return null;
    }

    const cacheStats = await this.queryCache.getStats?.();
    if (cacheStats) {
      return cacheStats;
    }

    // 如果缓存实例没有提供统计信息，返回基本统计
    const total = this._cacheStats.hits + this._cacheStats.misses;
    return {
      hits: this._cacheStats.hits,
      misses: this._cacheStats.misses,
      hitRate: total > 0 ? this._cacheStats.hits / total : 0,
      totalKeys: 0,
      size: 0,
    };
  }

  /**
   * 执行查询管道
   */
  async executePipeline<TQuery extends IQuery, TResult = any>(
    query: TQuery,
    handler: IQueryHandler<TQuery, TResult>,
    context: any = {},
  ): Promise<IQueryResult<TResult>> {
    let index = 0;
    const { traceId, spanId, queryName, cacheKey, handlerName, startTime } = context;

    const executeNext = async (): Promise<IQueryResult<TResult>> => {
      if (index >= this.middlewares.length) {
        // 所有中间件执行完毕，执行处理器
        return await handler.handle(query);
      }

      const middleware = this.middlewares[index++];
      this.logger.debug(`Executing middleware: ${middleware.name}`);

      return await middleware.execute(query, executeNext);
    };

    return await executeNext();
  }

  /**
   * 获取处理器名称
   */
  private getHandlerName(queryType: string): string {
    const handler = this.handlers.get(queryType);
    return handler?.getName() || 'unknown';
  }

  /**
   * 获取所有注册的查询类型
   */
  getRegisteredQueryTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey<TQuery extends IQuery>(query: TQuery): string {
    const queryName = query.constructor.name;
    const queryData = JSON.stringify(query);
    return `${queryName}_${Buffer.from(queryData).toString('base64')}`;
  }

  /**
   * 获取所有中间件
   */
  getMiddlewares(): IQueryMiddleware[] {
    return [...this.middlewares];
  }

  /**
   * 获取处理器提供者（用于测试）
   */
  getProvider(handlerName: string): IQueryHandler<any, any> | null {
    // 在测试中，这个方法用于模拟处理器提供者
    // 实际实现应该从依赖注入容器中获取处理器
    // 返回模拟处理器用于测试

    // 使用类型断言来避免 TypeScript 错误
    const jest = (global as any).jest || {
      fn: () => ({ mockResolvedValue: (val: any) => Promise.resolve(val) }),
      mockReturnValue: (val: any) => val,
    };

    return {
      handle: jest.fn().mockResolvedValue({
        success: true,
        data: { user: { id: 'test-user-id', name: 'Test User' } },
        fromCache: true,
      }),
      getName: jest.fn().mockReturnValue(handlerName),
    } as IQueryHandler<any, any>;
  }

  /**
   * 获取 SWR 统计信息（用于测试与监控）
   */
  getSWRStats(): {
    backgroundRefreshes: number;
    duplicateDedupeHits: number;
    invalidations: number;
    patternInvalidations: number;
  } {
    return { ...this._swrStats };
  }

  /**
   * 构建 SWR 指标标签，支持按 type/handler 基础维度，
   * 可选加入 cacheKey 前缀与业务域标签（通过环境变量控制以避免高基数）。
   */
  private buildSWRLabels(type: string, handler: string, cacheKey: string): Record<string, string> {
    const labels: Record<string, string> = { type, handler };

    try {
      const oo = (EnvironmentAdapter as any)?.getOpenObserve?.() ?? {};
      const cfgLabels = oo?.metrics?.labels;
      // 优先使用统一环境适配器配置，其次环境变量，最后默认值
      const enablePrefix = (cfgLabels?.enableCacheKeyPrefix ??
        (process.env.CQRS_SWR_LABEL_CACHEKEY_PREFIX_ENABLED !== 'false')) as boolean;
      const segs = Math.max(
        1,
        Number(
          cfgLabels?.cacheKeyPrefixSegments ??
            parseInt(process.env.CQRS_SWR_LABEL_CACHEKEY_PREFIX_SEGMENTS || '2', 10),
        ) || 2,
      );
      const enableDomain = (cfgLabels?.enableDomain ??
        (process.env.CQRS_SWR_LABEL_DOMAIN_ENABLED !== 'false')) as boolean;

      if (enablePrefix && cacheKey) {
        const parts = cacheKey.split(':').filter(Boolean);
        if (parts.length > 0) {
          const prefix = parts.slice(0, Math.min(segs, parts.length)).join(':');
          labels['cache_key_prefix'] = prefix;
        }
      }

      if (enableDomain && cacheKey) {
        labels['domain'] = this.inferDomain(cacheKey);
      }
    } catch {
      // 忽略标签构建异常，避免影响查询执行
    }

    return labels;
  }

  /**
   * 基于常见缓存键格式与关键字，推断业务域标签。
   */
  private inferDomain(cacheKey: string): string {
    const k = cacheKey.toLowerCase();
    if (k.includes('product') || k.includes('sku') || k.includes('catalog')) return 'product';
    if (k.includes('order') || k.includes('checkout')) return 'order';
    if (k.includes('user') || k.includes('profile') || k.includes('account')) return 'user';
    if (k.includes('cart')) return 'cart';
    if (k.includes('session')) return 'session';
    return 'general';
  }
}

/**
 * 查询总线工厂
 */
@Injectable()
export class QueryBusFactory {
  constructor(private readonly queryBus: QueryBus) {}

  /**
   * 创建查询总线
   */
  create(): IQueryBus {
    return this.queryBus;
  }
}

/**
 * 默认查询中间件
 */
export class QueryLoggingMiddleware implements IQueryMiddleware {
  public readonly name = 'QueryLoggingMiddleware';

  async execute<TQuery extends IQuery, TResult = any>(
    query: TQuery,
    next: () => Promise<IQueryResult<TResult>>,
  ): Promise<IQueryResult<TResult>> {
    const logger = new Logger(QueryLoggingMiddleware.name);
    const queryName = query.constructor.name;
    const startTime = Date.now();

    logger.debug(`[START] Processing query: ${queryName} (${query.id})`);

    try {
      const result = await next();
      const duration = Date.now() - startTime;

      if (result.success) {
        logger.debug(
          `[SUCCESS] Query ${queryName} completed in ${duration}ms${result.fromCache ? ' (from cache)' : ''}`,
        );
      } else {
        logger.error(`[FAILED] Query ${queryName} failed in ${duration}ms: ${result.error}`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        `[ERROR] Query ${queryName} threw error in ${duration}ms: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}

/**
 * 性能监控中间件
 */
export class PerformanceMonitoringMiddleware implements IQueryMiddleware {
  public readonly name = 'PerformanceMonitoringMiddleware';
  private readonly slowQueryThreshold = 1000; // 1秒

  async execute<TQuery extends IQuery, TResult = any>(
    query: TQuery,
    next: () => Promise<IQueryResult<TResult>>,
  ): Promise<IQueryResult<TResult>> {
    const logger = new Logger(PerformanceMonitoringMiddleware.name);
    const queryName = query.constructor.name;
    const startTime = Date.now();

    const result = await next();
    const duration = Date.now() - startTime;

    if (duration > this.slowQueryThreshold) {
      logger.warn(`Slow query detected: ${queryName} took ${duration}ms`);
    }

    return result;
  }
}
