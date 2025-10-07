// 用途：查询处理器装饰器
// 作者：后端开发团队
// 时间：2025-10-05

import { SetMetadata } from '@nestjs/common';
import { IQuery } from '../queries/query.base';

/**
 * 查询处理器元数据键
 */
export const QUERY_HANDLER_METADATA = 'query_handler';

/**
 * 查询处理器装饰器
 * 用于标记类为查询处理器，并指定处理的查询类型
 * @param queryType 查询类型
 */
export const QueryHandler = (queryType: string | (new (...args: any[]) => IQuery)) => {
  const queryTypeName = typeof queryType === 'string' ? queryType : queryType.name;

  return SetMetadata(QUERY_HANDLER_METADATA, queryTypeName);
};

/**
 * 查询处理器选项装饰器
 * 用于配置查询处理器的选项
 * @param options 处理器选项
 */
export const QueryHandlerOptions = (options: {
  /**
   * 超时时间（毫秒）
   */
  timeout?: number;

  /**
   * 是否启用审计
   */
  audit?: boolean;

  /**
   * 审计类别
   */
  auditCategory?: string;

  /**
   * 是否启用缓存
   */
  cache?: boolean;

  /**
   * 默认缓存时间（秒）
   */
  defaultCacheTime?: number;

  /**
   * 默认数据过期时间（秒）
   */
  defaultStaleTime?: number;
}) => SetMetadata(`${QUERY_HANDLER_METADATA}_options`, options);

/**
 * 查询验证装饰器
 * 用于标记查询处理器方法需要验证
 * @param validator 验证器函数或类
 */
export const QueryValidate = (validator?: Function | string) => {
  return SetMetadata(`${QUERY_HANDLER_METADATA}_validate`, validator);
};

/**
 * 查询权限装饰器
 * 用于标记查询处理器需要的权限
 * @param permissions 权限列表
 */
export const QueryPermissions = (...permissions: string[]) => {
  return SetMetadata(`${QUERY_HANDLER_METADATA}_permissions`, permissions);
};

/**
 * 查询角色装饰器
 * 用于标记查询处理器需要的角色
 * @param roles 角色列表
 */
export const QueryRoles = (...roles: string[]) => {
  return SetMetadata(`${QUERY_HANDLER_METADATA}_roles`, roles);
};

/**
 * 查询缓存装饰器
 * 用于标记查询处理器结果需要缓存
 * @param options 缓存选项
 */
export const QueryCache = (options: {
  /**
   * 缓存时间（秒）
   */
  ttl?: number;

  /**
   * 数据过期时间（秒）
   */
  staleTime?: number;

  /**
   * 缓存键前缀
   */
  keyPrefix?: string;

  /**
   * 是否根据用户缓存
   */
  byUser?: boolean;

  /**
   * 是否根据参数缓存
   */
  byParams?: boolean;

  /**
   * 缓存条件
   */
  condition?: (query: IQuery) => boolean;

  /**
   * 缓存键生成器
   */
  keyGenerator?: (query: IQuery) => string;

  /**
   * 是否在后台更新缓存
   */
  backgroundRefresh?: boolean;
}) => SetMetadata(`${QUERY_HANDLER_METADATA}_cache`, options);

/**
 * 查询限流装饰器
 * 用于标记查询处理器需要限流
 * @param options 限流选项
 */
export const QueryRateLimit = (options: {
  /**
   * 时间窗口（秒）
   */
  windowMs?: number;

  /**
   * 最大请求数
   */
  maxRequests?: number;

  /**
   * 限流键生成器
   */
  keyGenerator?: (query: IQuery) => string;

  /**
   * 跳过成功的请求
   */
  skipSuccessfulRequests?: boolean;

  /**
   * 跳过失败的请求
   */
  skipFailedRequests?: boolean;

  /**
   * 是否对缓存命中进行限流
   */
  limitCacheHits?: boolean;
}) => SetMetadata(`${QUERY_HANDLER_METADATA}_rate_limit`, options);

/**
 * 查询指标装饰器
 * 用于标记查询处理器需要收集指标
 * @param options 指标选项
 */
export const QueryMetrics = (options: {
  /**
   * 指标名称前缀
   */
  namePrefix?: string;

  /**
   * 是否启用执行时间指标
   */
  enableDuration?: boolean;

  /**
   * 是否启用成功率指标
   */
  enableSuccessRate?: boolean;

  /**
   * 是否启用错误率指标
   */
  enableErrorRate?: boolean;

  /**
   * 是否启用缓存命中率指标
   */
  enableCacheHitRate?: boolean;

  /**
   * 标签
   */
  labels?: Record<string, string>;
}) => SetMetadata(`${QUERY_HANDLER_METADATA}_metrics`, options);

/**
 * 查询日志装饰器
 * 用于标记查询处理器需要日志记录
 * @param options 日志选项
 */
export const QueryLogging = (options: {
  /**
   * 日志级别
   */
  level?: 'debug' | 'info' | 'warn' | 'error';

  /**
   * 是否记录输入
   */
  logInput?: boolean;

  /**
   * 是否记录输出
   */
  logOutput?: boolean;

  /**
   * 是否记录错误
   */
  logError?: boolean;

  /**
   * 是否记录执行时间
   */
  logDuration?: boolean;

  /**
   * 是否记录缓存命中
   */
  logCacheHit?: boolean;

  /**
   * 敏感字段列表
   */
  sensitiveFields?: string[];
}) => SetMetadata(`${QUERY_HANDLER_METADATA}_logging`, options);

/**
 * 查询预加载装饰器
 * 用于标记查询处理器支持预加载
 * @param options 预加载选项
 */
export const QueryPrefetch = (options: {
  /**
   * 是否自动预加载相关查询
   */
  auto?: boolean;

  /**
   * 预加载条件
   */
  condition?: (query: IQuery) => boolean;

  /**
   * 预加载延迟（毫秒）
   */
  delay?: number;

  /**
   * 相关查询列表
   */
  relatedQueries?: ((query: IQuery) => IQuery)[];
}) => SetMetadata(`${QUERY_HANDLER_METADATA}_prefetch`, options);

/**
 * 查询数据源装饰器
 * 用于标记查询处理器的数据源
 * @param dataSource 数据源配置
 */
export const QueryDataSource = (dataSource: {
  /**
   * 数据源类型
   */
  type: 'database' | 'cache' | 'external' | 'file' | 'memory';

  /**
   * 数据源名称
   */
  name?: string;

  /**
   * 连接字符串
   */
  connectionString?: string;

  /**
   * 是否只读
   */
  readOnly?: boolean;

  /**
   * 超时时间（秒）
   */
  timeout?: number;

  /**
   * 连接池大小
   */
  poolSize?: number;
}) => SetMetadata(`${QUERY_HANDLER_METADATA}_data_source`, dataSource);

/**
 * 查询转换装饰器
 * 用于标记查询处理器需要转换结果
 * @param transformer 转换器函数或类
 */
export const QueryTransform = (transformer: Function | string) => {
  return SetMetadata(`${QUERY_HANDLER_METADATA}_transform`, transformer);
};

/**
 * 查询分页装饰器
 * 用于标记查询处理器支持分页
 * @param options 分页选项
 */
export const QueryPagination = (options: {
  /**
   * 默认页大小
   */
  defaultPageSize?: number;

  /**
   * 最大页大小
   */
  maxPageSize?: number;

  /**
   * 是否启用总数查询
   */
  enableCount?: boolean;

  /**
   * 是否启用游标分页
   */
  enableCursor?: boolean;
}) => SetMetadata(`${QUERY_HANDLER_METADATA}_pagination`, options);

/**
 * 查询排序装饰器
 * 用于标记查询处理器支持排序
 * @param options 排序选项
 */
export const QuerySort = (options: {
  /**
   * 默认排序字段
   */
  defaultSort?: string;

  /**
   * 默认排序方向
   */
  defaultOrder?: 'asc' | 'desc';

  /**
   * 允许的排序字段
   */
  allowedFields?: string[];
}) => SetMetadata(`${QUERY_HANDLER_METADATA}_sort`, options);

/**
 * 查询过滤装饰器
 * 用于标记查询处理器支持过滤
 * @param options 过滤选项
 */
export const QueryFilter = (options: {
  /**
   * 允许的过滤字段
   */
  allowedFields?: string[];

  /**
   * 默认过滤条件
   */
  defaultFilters?: Record<string, any>;

  /**
   * 是否支持复杂过滤
   */
  enableComplex?: boolean;
}) => SetMetadata(`${QUERY_HANDLER_METADATA}_filter`, options);

/**
 * 查询聚合装饰器
 * 用于标记查询处理器支持聚合
 * @param options 聚合选项
 */
export const QueryAggregation = (options: {
  /**
   * 允许的聚合函数
   */
  allowedFunctions?: ('count' | 'sum' | 'avg' | 'min' | 'max')[];

  /**
   * 允许的聚合字段
   */
  allowedFields?: string[];

  /**
   * 是否支持分组
   */
  enableGrouping?: boolean;
}) => SetMetadata(`${QUERY_HANDLER_METADATA}_aggregation`, options);
