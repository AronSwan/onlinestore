// 用途：CQRS查询基础类
// 作者：后端开发团队
// 时间：2025-10-05

import { v4 as uuidv4 } from 'uuid';

/**
 * 查询基础接口
 * 所有查询都应该实现此接口
 */
export interface IQuery<TResult = any> {
  /**
   * 查询唯一标识符
   */
  id: string;

  /**
   * 查询创建时间
   */
  timestamp: Date;

  /**
   * 查询元数据
   */
  metadata?: Record<string, any>;

  /**
   * 缓存键，用于TanStack Query缓存
   */
  cacheKey?: string;

  /**
   * 缓存时间（秒），用于TanStack Query
   */
  cacheTime?: number;

  /**
   * 重新获取时间（秒），用于TanStack Query
   */
  staleTime?: number;
}

/**
 * 抽象查询基类
 * 提供查询的基本实现
 */
export abstract class QueryBase<TResult = any> implements IQuery<TResult> {
  /**
   * 查询唯一标识符
   */
  public readonly id: string;

  /**
   * 查询创建时间
   */
  public readonly timestamp: Date;

  /**
   * 查询元数据
   */
  public readonly metadata?: Record<string, any>;

  /**
   * 缓存键，用于TanStack Query缓存
   */
  public readonly cacheKey?: string;

  /**
   * 缓存时间（秒），用于TanStack Query
   */
  public readonly cacheTime?: number;

  /**
   * 重新获取时间（秒），用于TanStack Query
   */
  public readonly staleTime?: number;

  constructor(options?: {
    metadata?: Record<string, any>;
    cacheKey?: string;
    cacheTime?: number;
    staleTime?: number;
  }) {
    this.id = uuidv4();
    this.timestamp = new Date();
    this.metadata = options?.metadata;
    this.cacheKey = options?.cacheKey;
    this.cacheTime = options?.cacheTime;
    this.staleTime = options?.staleTime;
  }

  /**
   * 获取查询名称
   */
  public getName(): string {
    return this.constructor.name;
  }

  /**
   * 获取查询缓存键
   * 如果没有指定缓存键，则生成默认的
   */
  public getCacheKey(): string {
    if (this.cacheKey) {
      return this.cacheKey;
    }

    // 生成默认缓存键：查询名称 + 序列化参数
    return `${this.getName()}_${Buffer.from(JSON.stringify(this.getData())).toString('base64')}`;
  }

  /**
   * 序列化查询
   */
  public serialize(): string {
    return JSON.stringify({
      id: this.id,
      timestamp: this.timestamp,
      metadata: this.metadata,
      type: this.getName(),
      data: this.getData(),
      cacheKey: this.cacheKey,
      cacheTime: this.cacheTime,
      staleTime: this.staleTime,
    });
  }

  /**
   * 获取查询数据
   * 子类需要实现此方法
   */
  protected abstract getData(): Record<string, any>;
}

/**
 * 查询结果接口
 */
export interface IQueryResult<TResult = any> {
  /**
   * 是否成功
   */
  success: boolean;

  /**
   * 结果数据
   */
  data?: TResult;

  /**
   * 错误信息
   */
  error?: string;

  /**
   * 错误代码
   */
  errorCode?: string;

  /**
   * 元数据
   */
  metadata?: Record<string, any>;

  /**
   * 是否来自缓存
   */
  fromCache?: boolean;

  /**
   * 缓存过期时间
   */
  cacheExpiresAt?: Date;
}

/**
 * 成功查询结果
 */
export class QuerySuccess<TResult = any> implements IQueryResult<TResult> {
  public readonly success = true;
  public readonly data: TResult;
  public readonly metadata?: Record<string, any>;
  public readonly fromCache?: boolean;
  public readonly cacheExpiresAt?: Date;

  constructor(
    data: TResult,
    metadata?: Record<string, any>,
    fromCache?: boolean,
    cacheExpiresAt?: Date,
  ) {
    this.data = data;
    this.metadata = metadata;
    this.fromCache = fromCache;
    this.cacheExpiresAt = cacheExpiresAt;
  }
}

/**
 * 失败查询结果
 */
export class QueryFailure implements IQueryResult {
  public readonly success = false;
  public readonly error: string;
  public readonly errorCode?: string;
  public readonly metadata?: Record<string, any>;

  constructor(error: string, errorCode?: string, metadata?: Record<string, any>) {
    this.error = error;
    this.errorCode = errorCode;
    this.metadata = metadata;
  }
}

/**
 * 分页查询参数接口
 */
export interface IPaginationQuery {
  /**
   * 页码，从1开始
   */
  page: number;

  /**
   * 每页大小
   */
  pageSize: number;

  /**
   * 排序字段
   */
  sortBy?: string;

  /**
   * 排序方向
   */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页查询结果接口
 */
export interface IPaginatedResult<T> {
  /**
   * 数据列表
   */
  items: T[];

  /**
   * 总记录数
   */
  total: number;

  /**
   * 当前页码
   */
  page: number;

  /**
   * 每页大小
   */
  pageSize: number;

  /**
   * 总页数
   */
  totalPages: number;

  /**
   * 是否有下一页
   */
  hasNext: boolean;

  /**
   * 是否有上一页
   */
  hasPrevious: boolean;
}

/**
 * 分页查询基础类
 */
export abstract class PaginatedQueryBase<TResult = any>
  extends QueryBase<TResult>
  implements IPaginationQuery
{
  public readonly page: number;
  public readonly pageSize: number;
  public readonly sortBy?: string;
  public readonly sortOrder?: 'asc' | 'desc';

  constructor(
    pagination: IPaginationQuery,
    options?: {
      metadata?: Record<string, any>;
      cacheKey?: string;
      cacheTime?: number;
      staleTime?: number;
    },
  ) {
    super(options);
    this.page = pagination.page;
    this.pageSize = pagination.pageSize;
    this.sortBy = pagination.sortBy;
    this.sortOrder = pagination.sortOrder;
  }

  protected getData(): Record<string, any> {
    return {
      page: this.page,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
    };
  }
}
