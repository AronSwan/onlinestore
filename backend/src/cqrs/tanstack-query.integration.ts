// 用途：TanStack Query集成实现
// 作者：后端开发团队
// 时间：2025-10-05

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
/* ESM 兼容：p-retry 在 node_modules 为 ESM，Jest 默认不转换。这里使用 CommonJS 方式引入 */
const pRetry = require('p-retry').default ?? require('p-retry');
import { IQuery, IQueryResult } from './queries/query.base';
import { IQueryBus } from './bus/query.bus';
import { IQueryCache } from './interfaces/query-handler.interface';

/**
 * TanStack Query配置接口
 */
export interface TanStackQueryConfig {
  /**
   * 默认缓存时间（秒）
   */
  defaultCacheTime?: number;

  /**
   * 默认数据过期时间（秒）
   */
  defaultStaleTime?: number;

  /**
   * 是否启用后台刷新
   */
  enableBackgroundRefresh?: boolean;

  /**
   * 刷新间隔（秒）
   */
  refreshInterval?: number;

  /**
   * 重试次数
   */
  retry?: number;

  /**
   * 重试延迟（毫秒）
   */
  retryDelay?: number;

  /**
   * 是否在窗口聚焦时重新获取
   */
  refetchOnWindowFocus?: boolean;

  /**
   * 是否在网络重连时重新获取
   */
  refetchOnReconnect?: boolean;

  /**
   * 并发去重：同一 queryKey 并发调用仅执行一次
   */
  dedupeConcurrent?: boolean;
}

/**
 * TanStack Query查询选项
 */
export interface TanStackQueryOptions {
  /**
   * 查询键
   */
  queryKey: string[];

  /**
   * 查询函数
   */
  queryFn: () => Promise<any>;

  /**
   * 缓存时间（秒）
   */
  cacheTime?: number;

  /**
   * 数据过期时间（秒）
   */
  staleTime?: number;

  /**
   * 是否启用后台刷新
   */
  enableBackgroundRefresh?: boolean;

  /**
   * 刷新间隔（秒）
   */
  refreshInterval?: number;

  /**
   * 重试次数
   */
  retry?: number;

  /**
   * 重试延迟（毫秒）
   */
  retryDelay?: number;

  /**
   * 是否在窗口聚焦时重新获取
   */
  refetchOnWindowFocus?: boolean;

  /**
   * 是否在网络重连时重新获取
   */
  refetchOnReconnect?: boolean;

  /**
   * 是否启用查询
   */
  enabled?: boolean;

  /**
   * 并发去重：同一 queryKey 并发调用仅执行一次
   */
  dedupeConcurrent?: boolean;

  /**
   * 取消信号：支持中途取消
   */
  abortSignal?: AbortSignal;

  /**
   * 选择器函数
   */
  select?: (data: any) => any;
}

/**
 * TanStack Query查询状态
 */
export interface TanStackQueryState<T = any> {
  /**
   * 数据
   */
  data?: T;

  /**
   * 是否正在加载
   */
  isLoading: boolean;

  /**
   * 是否正在获取
   */
  isFetching: boolean;

  /**
   * 是否成功
   */
  isSuccess: boolean;

  /**
   * 是否出错
   */
  isError: boolean;

  /**
   * 错误信息
   */
  error?: Error;

  /**
   * 是否从缓存获取
   */
  isFromCache?: boolean;

  /**
   * 缓存过期时间
   */
  cacheExpiresAt?: Date;

  /**
   * 最后更新时间
   */
  lastUpdated?: Date;

  /**
   * 查询键
   */
  queryKey: string[];
}

/**
 * TanStack Query变异选项
 */
export interface TanStackMutationOptions<T = any, V = any> {
  /**
   * 变异函数
   */
  mutationFn: (variables: V) => Promise<T>;

  /**
   * 成功回调
   */
  onSuccess?: (data: T, variables: V) => void;

  /**
   * 错误回调
   */
  onError?: (error: Error, variables: V) => void;

  /**
   * 完成回调
   */
  onSettled?: (data: T | undefined, error: Error | null, variables: V) => void;

  /**
   * 重试次数
   */
  retry?: number;

  /**
   * 重试延迟（毫秒）
   */
  retryDelay?: number;
}

/**
 * TanStack Query变异状态
 */
export interface TanStackMutationState<T = any> {
  /**
   * 数据
   */
  data?: T;

  /**
   * 是否正在加载
   */
  isLoading: boolean;

  /**
   * 是否出错
   */
  isError: boolean;

  /**
   * 错误信息
   */
  error?: Error;

  /**
   * 是否重置
   */
  isReset: boolean;

  /**
   * 变量
   */
  variables?: any;
}

/**
 * TanStack Query客户端接口
 */
export interface ITanStackQueryClient {
  /**
   * 执行查询
   * @param options 查询选项
   * @returns 查询状态
   */
  query<T>(options: TanStackQueryOptions): Promise<TanStackQueryState<T>>;

  /**
   * 预加载查询
   * @param options 查询选项
   */
  prefetchQuery(options: TanStackQueryOptions): Promise<void>;

  /**
   * 使查询失效
   * @param queryKey 查询键
   */
  invalidateQueries(queryKey: string[]): Promise<void>;

  /**
   * 重置查询
   * @param queryKey 查询键
   */
  resetQueries(queryKey: string[]): Promise<void>;

  /**
   * 获取查询数据
   * @param queryKey 查询键
   * @returns 查询数据
   */
  getQueryData<T>(queryKey: string[]): T | undefined;

  /**
   * 设置查询数据
   * @param queryKey 查询键
   * @param data 数据
   */
  setQueryData<T>(queryKey: string[], data: T): void;

  /**
   * 执行变异
   * @param options 变异选项
   * @returns 变异状态
   */
  mutate<T, V>(options: TanStackMutationOptions<T, V>): Promise<TanStackMutationState<T>>;
}

/**
 * TanStack Query集成服务
 */
@Injectable()
export class TanStackQueryIntegrationService implements ITanStackQueryClient, OnModuleDestroy {
  private readonly logger = new Logger(TanStackQueryIntegrationService.name);
  private readonly queryCache = new Map<string, TanStackQueryState>();
  private readonly config: TanStackQueryConfig;
  private readonly intervals = new Map<string, NodeJS.Timeout>();
  // 并发去重映射：按 cacheKey 复用进行中的 Promise
  private readonly inFlight = new Map<string, Promise<TanStackQueryState>>();

  constructor(
    private readonly queryBus: IQueryBus,
    config: TanStackQueryConfig = {},
  ) {
    this.config = {
      defaultCacheTime: 300, // 5分钟
      defaultStaleTime: 60, // 1分钟
      enableBackgroundRefresh: false,
      refreshInterval: 0,
      retry: 3,
      retryDelay: 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      dedupeConcurrent: false,
      ...config,
    };
  }

  /**
   * 执行查询
   */
  async query<T>(options: TanStackQueryOptions): Promise<TanStackQueryState<T>> {
    const {
      queryKey,
      queryFn,
      cacheTime = this.config.defaultCacheTime,
      staleTime = this.config.defaultStaleTime,
      enableBackgroundRefresh = this.config.enableBackgroundRefresh,
      refreshInterval = this.config.refreshInterval,
      retry = this.config.retry,
      retryDelay = this.config.retryDelay,
      refetchOnWindowFocus = this.config.refetchOnWindowFocus, // 修复这里
      refetchOnReconnect = this.config.refetchOnReconnect,
      enabled = true,
      select,
    } = options;

    const cacheKey = queryKey.join('.');

    // 检查是否启用查询
    if (!enabled) {
      return {
        isLoading: false,
        isFetching: false,
        isSuccess: false,
        isError: false,
        queryKey,
      };
    }

    // 检查缓存
    const cachedState = this.queryCache.get(cacheKey);
    if (
      cachedState &&
      cachedState.data &&
      cachedState.cacheExpiresAt &&
      cachedState.cacheExpiresAt > new Date()
    ) {
      this.logger.debug(`Cache hit for query: ${cacheKey}`);

      return {
        ...cachedState,
        isFetching: false,
        isLoading: false,
        isSuccess: true,
        isError: false,
        isFromCache: true,
      };
    }

    // SWR：若缓存存在但已过期，且启用后台刷新，则返回旧值并触发后台刷新
    if (
      cachedState &&
      cachedState.data &&
      cachedState.cacheExpiresAt &&
      cachedState.cacheExpiresAt <= new Date() &&
      (enableBackgroundRefresh || this.config.enableBackgroundRefresh)
    ) {
      this.logger.debug(`SWR stale return for query: ${cacheKey}, scheduling background refresh`);
      // 立即后台刷新一次（不等待）：先删除缓存，确保下一次 query 走新请求路径而非再次 SWR 分支
      setTimeout(() => {
        try {
          this.queryCache.delete(cacheKey);
        } catch {}
        this.query({ ...options }); // 触发更新
      }, 0);
      return {
        ...cachedState,
        isFetching: false,
        isLoading: false,
        isSuccess: true,
        isError: false,
        isFromCache: true,
      } as TanStackQueryState<T>;
    }

    // 执行查询
    this.logger.debug(`Executing query: ${cacheKey}`);

    const state: TanStackQueryState<T> = {
      isLoading: !cachedState,
      isFetching: true,
      isSuccess: false,
      isError: false,
      queryKey,
    };

    // 并发去重：若启用且已有进行中的请求，直接复用
    const dedupeOn = options.dedupeConcurrent ?? this.config.dedupeConcurrent;
    if (dedupeOn && this.inFlight.has(cacheKey)) {
      return (await this.inFlight.get(cacheKey)!) as TanStackQueryState<T>;
    }

    // 构造执行 Promise，支持 AbortSignal
    const exec = async (): Promise<TanStackQueryState<T>> => {
      try {
        // 支持取消：若已取消，抛错
        if (options.abortSignal?.aborted) {
          throw new Error('aborted');
        }

        const runPromise = (async () => {
          let res = await queryFn();
          // 应用选择器
          if (select) {
            res = select(res);
          }
          const successState: TanStackQueryState<T> = {
            data: res,
            isLoading: false,
            isFetching: false,
            isSuccess: true,
            isError: false,
            isFromCache: false,
            cacheExpiresAt: this.createCacheExpiration(cacheTime),
            lastUpdated: new Date(),
            queryKey,
          };
          // 缓存结果
          this.queryCache.set(cacheKey, successState);

          // 设置后台刷新
          const interval = refreshInterval ?? this.config.refreshInterval ?? 0;
          if (enableBackgroundRefresh && interval > 0) {
            this.setupBackgroundRefresh(cacheKey, options, interval);
          }

          return successState;
        })();

        if (options.abortSignal) {
          const abortPromise = new Promise<TanStackQueryState<T>>((_, reject) => {
            const onAbort = () => {
              options.abortSignal?.removeEventListener('abort', onAbort);
              reject(new Error('aborted'));
            };
            options.abortSignal!.addEventListener('abort', onAbort);
          });
          return await Promise.race([runPromise, abortPromise]);
        }

        return await runPromise;
      } catch (error) {
        this.logger.error(`Query failed: ${cacheKey}`, error);

        const errorState: TanStackQueryState<T> = {
          isLoading: false,
          isFetching: false,
          isSuccess: false,
          isError: true,
          error: error as Error,
          queryKey,
        };

        // 重试逻辑
        if (retry && retry > 0 && (error as Error)?.message !== 'aborted') {
          this.logger.debug(`Retrying query: ${cacheKey}, attempts left: ${retry}`);
          try {
            const retryOptions = { ...options, retry: retry - 1 };
            const retryState = await pRetry(() => this.query(retryOptions), {
              retries: retry,
              minTimeout: retryDelay,
              onFailedAttempt: err => {
                this.logger.error(`Query attempt ${err.attemptNumber} failed: ${cacheKey}`, err);
              },
            });
            return retryState ?? errorState;
          } catch (retryError) {
            this.logger.error(`Query failed after retries: ${cacheKey}`, retryError);
            return errorState;
          }
        }

        return errorState;
      }
    };

    try {
      const promise = exec();
      if (dedupeOn) {
        this.inFlight.set(cacheKey, promise as Promise<TanStackQueryState>);
      }
      const finalState = await promise;
      if (dedupeOn) {
        this.inFlight.delete(cacheKey);
      }
      return finalState as TanStackQueryState<T>;
    } catch (error) {
      if (dedupeOn) {
        this.inFlight.delete(cacheKey);
      }
      this.logger.error(`Query execution failed: ${cacheKey}`, error as Error);
      return {
        isLoading: false,
        isFetching: false,
        isSuccess: false,
        isError: true,
        error: error as Error,
        queryKey,
      } as TanStackQueryState<T>;
    }
  }

  /**
   * 预加载查询
   */
  async prefetchQuery(options: TanStackQueryOptions): Promise<void> {
    this.logger.debug(`Prefetching query: ${options.queryKey.join('.')}`);

    // 异步执行查询但不返回结果
    this.query(options).catch(error => {
      this.logger.error(`Error prefetching query: ${options.queryKey.join('.')}`, error);
    });
  }

  /**
   * 使查询失效
   */
  async invalidateQueries(queryKey: string[]): Promise<void> {
    const cacheKey = queryKey.join('.');

    // 清理后台刷新定时器
    if (this.intervals.has(cacheKey)) {
      clearInterval(this.intervals.get(cacheKey)!);
      this.intervals.delete(cacheKey);
    }

    // 从缓存中删除
    this.queryCache.delete(cacheKey);

    // 调用查询总线失效（如果需要）
    const [queryType, ...cacheKeyParts] = queryKey;
    if (queryType) {
      await this.queryBus.invalidateCache(queryType, cacheKeyParts.join('_'));
    }

    this.logger.debug(`Invalidated query: ${cacheKey}`);
  }

  /**
   * 重置查询
   */
  async resetQueries(queryKey: string[]): Promise<void> {
    const cacheKey = queryKey.join('.');

    // 清理后台刷新定时器
    if (this.intervals.has(cacheKey)) {
      clearInterval(this.intervals.get(cacheKey)!);
      this.intervals.delete(cacheKey);
    }

    this.queryCache.delete(cacheKey);
    this.logger.debug(`Reset query: ${cacheKey}`);
  }

  /**
   * 获取查询数据
   */
  getQueryData<T>(queryKey: string[]): T | undefined {
    const cacheKey = queryKey.join('.');
    const state = this.queryCache.get(cacheKey);
    return state?.data as T;
  }

  /**
   * 设置查询数据
   */
  setQueryData<T>(queryKey: string[], data: T): void {
    const cacheKey = queryKey.join('.');

    const state: TanStackQueryState<T> = {
      data,
      isLoading: false,
      isFetching: false,
      isSuccess: true,
      isError: false,
      isFromCache: true,
      cacheExpiresAt: new Date(Date.now() + this.config.defaultCacheTime! * 1000),
      lastUpdated: new Date(),
      queryKey,
    };

    this.queryCache.set(cacheKey, state);
    this.logger.debug(`Set query data: ${cacheKey}`);
  }

  /**
   * 执行变异
   */
  async mutate<T, V>(options: TanStackMutationOptions<T, V>): Promise<TanStackMutationState<T>> {
    const {
      mutationFn,
      onSuccess,
      onError,
      onSettled,
      retry = this.config.retry,
      retryDelay = this.config.retryDelay,
    } = options;

    this.logger.debug('Executing mutation');

    const state: TanStackMutationState<T> = {
      isLoading: true,
      isError: false,
      isReset: false,
    };

    try {
      const result = await mutationFn(state.variables);

      const successState: TanStackMutationState<T> = {
        data: result,
        isLoading: false,
        isError: false,
        isReset: false,
        variables: state.variables,
      };

      // 调用成功回调
      if (onSuccess) {
        onSuccess(result, state.variables);
      }

      // 调用完成回调
      if (onSettled) {
        onSettled(result, null, state.variables);
      }

      return successState;
    } catch (error) {
      this.logger.error('Mutation failed', error);

      const errorState: TanStackMutationState<T> = {
        isLoading: false,
        isError: true,
        error: error as Error,
        isReset: false,
        variables: state.variables,
      };

      // 调用错误回调
      if (onError) {
        onError(error as Error, state.variables);
      }

      // 调用完成回调
      if (onSettled) {
        onSettled(undefined, error as Error, state.variables);
      }

      // 重试逻辑
      if (retry && retry > 0) {
        this.logger.debug(`Retrying mutation, attempts left: ${retry}`);

        setTimeout(async () => {
          const retryOptions = { ...options, retry: retry - 1 };
          await this.mutate(retryOptions);
        }, retryDelay);
      }

      return errorState;
    }
  }

  /**
   * 创建缓存过期时间
   */
  private createCacheExpiration(cacheTime: number | undefined): Date | undefined {
    // 修复：cacheTime=0 严格禁用缓存
    const expiresMs =
      cacheTime === 0 ? 0 : (cacheTime || this.config.defaultCacheTime || 300) * 1000;
    return expiresMs ? new Date(Date.now() + expiresMs) : undefined;
  }

  /**
   * 设置后台刷新
   */
  private setupBackgroundRefresh(
    cacheKey: string,
    options: TanStackQueryOptions,
    interval: number,
  ): void {
    // 清理已存在的定时器
    if (this.intervals.has(cacheKey)) {
      clearInterval(this.intervals.get(cacheKey)!);
    }

    const timer = setInterval(async () => {
      this.logger.debug(`Background refresh for query: ${cacheKey}`);
      try {
        await this.query(options);
      } catch (error) {
        this.logger.error(`Background refresh failed for query: ${cacheKey}`, error);
      }
    }, interval * 1000);

    this.intervals.set(cacheKey, timer);
  }

  /**
   * 清理资源
   */
  onModuleDestroy(): void {
    // 清理所有定时器
    for (const [cacheKey, timer] of this.intervals.entries()) {
      clearInterval(timer);
      this.logger.debug(`Cleaned up background refresh for query: ${cacheKey}`);
    }
    this.intervals.clear();
  }

  /**
   * 清理过期缓存
   */
  cleanupExpiredCache(): void {
    const now = new Date();

    for (const [cacheKey, state] of this.queryCache.entries()) {
      if (state.cacheExpiresAt && state.cacheExpiresAt < now) {
        this.queryCache.delete(cacheKey);
        this.logger.debug(`Cleaned up expired cache: ${cacheKey}`);
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    totalQueries: number;
    cachedQueries: number;
    expiredQueries: number;
    hitRate: number;
  } {
    const totalQueries = this.queryCache.size;
    const now = new Date();
    let cachedQueries = 0;
    let expiredQueries = 0;

    for (const state of this.queryCache.values()) {
      if (state.cacheExpiresAt) {
        if (state.cacheExpiresAt > now) {
          cachedQueries++;
        } else {
          expiredQueries++;
        }
      }
    }

    return {
      totalQueries,
      cachedQueries,
      expiredQueries,
      hitRate: totalQueries > 0 ? cachedQueries / totalQueries : 0,
    };
  }
}

/**
 * TanStack Query工厂
 */
@Injectable()
export class TanStackQueryFactory {
  constructor(
    private readonly queryBus: IQueryBus,
    private readonly queryCache?: IQueryCache,
  ) {}

  /**
   * 创建TanStack Query客户端
   * @param config 配置选项
   * @returns TanStack Query客户端
   */
  create(config: TanStackQueryConfig = {}): ITanStackQueryClient {
    return new TanStackQueryIntegrationService(this.queryBus, config);
  }
}
