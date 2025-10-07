// 用途：TanStack Query集成实现
// 作者：后端开发团队
// 时间：2025-10-05

import { Injectable, Logger } from '@nestjs/common';
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
export class TanStackQueryIntegrationService implements ITanStackQueryClient {
  private readonly logger = new Logger(TanStackQueryIntegrationService.name);
  private readonly queryCache = new Map<string, TanStackQueryState>();
  private readonly config: TanStackQueryConfig;

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
      refetchOnWindowFocus = this.config.refetchOnReconnect,
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

    // 执行查询
    this.logger.debug(`Executing query: ${cacheKey}`);

    const state: TanStackQueryState<T> = {
      isLoading: !cachedState,
      isFetching: true,
      isSuccess: false,
      isError: false,
      queryKey,
    };

    try {
      let result = await queryFn();

      // 应用选择器
      if (select) {
        result = select(result);
      }

      // 更新状态
      const successState: TanStackQueryState<T> = {
        data: result,
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        isError: false,
        isFromCache: false,
        cacheExpiresAt: new Date(Date.now() + (cacheTime || 300) * 1000),
        lastUpdated: new Date(),
        queryKey,
      };

      // 缓存结果
      this.queryCache.set(cacheKey, successState);

      // 设置后台刷新
      if (enableBackgroundRefresh && refreshInterval && refreshInterval > 0) {
        this.setupBackgroundRefresh(cacheKey, options, refreshInterval);
      }

      return successState;
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
      if (retry && retry > 0) {
        this.logger.debug(`Retrying query: ${cacheKey}, attempts left: ${retry}`);

        setTimeout(async () => {
          const retryOptions = { ...options, retry: retry - 1 };
          await this.query(retryOptions);
        }, retryDelay);
      }

      return errorState;
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

    // 从缓存中删除
    this.queryCache.delete(cacheKey);

    // 如果查询总线支持，也使其缓存失效
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
   * 设置后台刷新
   */
  private setupBackgroundRefresh(
    cacheKey: string,
    options: TanStackQueryOptions,
    interval: number,
  ): void {
    setInterval(async () => {
      this.logger.debug(`Background refresh for query: ${cacheKey}`);
      await this.query(options);
    }, interval * 1000);
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
