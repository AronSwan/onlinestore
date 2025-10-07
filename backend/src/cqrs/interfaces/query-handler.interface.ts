// 用途：查询处理器接口
// 作者：后端开发团队
// 时间：2025-10-05

import { IQuery, IQueryResult } from '../queries/query.base';

/**
 * 查询处理器接口
 * 定义了处理查询的基本契约
 */
export interface IQueryHandler<TQuery extends IQuery = IQuery, TResult = any> {
  /**
   * 处理查询
   * @param query 要处理的查询
   * @returns 查询处理结果
   */
  handle(query: TQuery): Promise<IQueryResult<TResult>>;

  /**
   * 验证查询
   * @param query 要验证的查询
   * @returns 验证结果
   */
  validate?(query: TQuery): Promise<boolean>;

  /**
   * 获取处理器名称
   */
  getName(): string;

  /**
   * 获取查询缓存键
   * @param query 查询对象
   * @returns 缓存键
   */
  getCacheKey?(query: TQuery): string;

  /**
   * 获取缓存过期时间
   * @param query 查询对象
   * @returns 缓存过期时间（秒）
   */
  getCacheTime?(query: TQuery): number;

  /**
   * 获取数据过期时间
   * @param query 查询对象
   * @returns 数据过期时间（秒）
   */
  getStaleTime?(query: TQuery): number;
}

/**
 * 缓存查询处理器接口
 * 扩展了查询处理器，增加了缓存相关功能
 */
export interface ICachedQueryHandler<TQuery extends IQuery = IQuery, TResult = any>
  extends IQueryHandler<TQuery, TResult> {
  /**
   * 检查缓存是否存在
   * @param cacheKey 缓存键
   * @returns 是否存在缓存
   */
  hasCache?(cacheKey: string): Promise<boolean>;

  /**
   * 从缓存获取数据
   * @param cacheKey 缓存键
   * @returns 缓存的数据
   */
  getFromCache?(cacheKey: string): Promise<TResult | null>;

  /**
   * 将数据保存到缓存
   * @param cacheKey 缓存键
   * @param data 数据
   * @param ttl 过期时间（秒）
   */
  setCache?(cacheKey: string, data: TResult, ttl?: number): Promise<void>;

  /**
   * 清除缓存
   * @param cacheKey 缓存键
   */
  clearCache?(cacheKey: string): Promise<void>;

  /**
   * 清除所有相关缓存
   * @param pattern 缓存键模式
   */
  clearCachePattern?(pattern: string): Promise<void>;
}

/**
 * 查询处理器工厂接口
 */
export interface IQueryHandlerFactory {
  /**
   * 创建查询处理器
   * @param queryType 查询类型
   * @returns 查询处理器实例
   */
  createHandler<TQuery extends IQuery>(queryType: string): IQueryHandler<TQuery> | null;

  /**
   * 注册查询处理器
   * @param queryType 查询类型
   * @param handlerFactory 处理器工厂函数
   */
  registerHandler<TQuery extends IQuery>(
    queryType: string,
    handlerFactory: () => IQueryHandler<TQuery>,
  ): void;

  /**
   * 获取所有已注册的查询类型
   */
  getRegisteredQueryTypes(): string[];
}

/**
 * 查询中间件接口
 */
export interface IQueryMiddleware {
  /**
   * 中间件名称
   */
  name: string;

  /**
   * 执行中间件
   * @param query 查询
   * @param next 下一个中间件或处理器
   * @returns 查询处理结果
   */
  execute<TQuery extends IQuery, TResult = any>(
    query: TQuery,
    next: () => Promise<IQueryResult<TResult>>,
  ): Promise<IQueryResult<TResult>>;
}

/**
 * 查询管道接口
 */
export interface IQueryPipeline {
  /**
   * 添加中间件
   * @param middleware 中间件
   */
  addMiddleware(middleware: IQueryMiddleware): void;

  /**
   * 移除中间件
   * @param middlewareName 中间件名称
   */
  removeMiddleware(middlewareName: string): void;

  /**
   * 执行查询管道
   * @param query 查询
   * @param handler 查询处理器
   * @returns 查询处理结果
   */
  execute<TQuery extends IQuery, TResult = any>(
    query: TQuery,
    handler: IQueryHandler<TQuery, TResult>,
  ): Promise<IQueryResult<TResult>>;
}

/**
 * 查询缓存接口
 */
export interface IQueryCache {
  /**
   * 获取缓存数据
   * @param key 缓存键
   * @returns 缓存数据
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * 设置缓存数据
   * @param key 缓存键
   * @param value 数据
   * @param ttl 过期时间（秒）
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * 删除缓存数据
   * @param key 缓存键
   */
  delete(key: string): Promise<void>;

  /**
   * 检查缓存是否存在
   * @param key 缓存键
   * @returns 是否存在
   */
  exists(key: string): Promise<boolean>;

  /**
   * 根据模式清除缓存
   * @param pattern 缓存键模式
   */
  clearPattern(pattern: string): Promise<void>;

  /**
   * 清除所有缓存
   */
  clear(): Promise<void>;

  /**
   * 获取缓存统计信息
   */
  getStats?(): Promise<QueryCacheStats>;
}

/**
 * 查询缓存统计信息
 */
export interface QueryCacheStats {
  /**
   * 缓存命中次数
   */
  hits: number;

  /**
   * 缓存未命中次数
   */
  misses: number;

  /**
   * 缓存命中率
   */
  hitRate: number;

  /**
   * 缓存键总数
   */
  totalKeys: number;

  /**
   * 缓存大小（字节）
   */
  size: number;
}
