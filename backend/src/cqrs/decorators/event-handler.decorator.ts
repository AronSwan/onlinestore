// 用途：事件处理器装饰器
// 作者：后端开发团队
// 时间：2025-10-05

import { SetMetadata } from '@nestjs/common';
import { IEvent } from '../events/event.base';

/**
 * 事件处理器元数据键
 */
export const EVENT_HANDLER_METADATA = 'event_handler';

/**
 * 事件处理器装饰器
 * 用于标记类为事件处理器，并指定处理的事件类型
 * @param eventType 事件类型
 */
export const EventHandler = (eventType: string | (new (...args: any[]) => IEvent)) => {
  const eventTypeName = typeof eventType === 'string' ? eventType : eventType.name;

  return SetMetadata(EVENT_HANDLER_METADATA, eventTypeName);
};

/**
 * 异步事件处理器装饰器
 * 用于标记类为异步事件处理器
 * @param eventType 事件类型
 */
export const AsyncEventHandler = (eventType: string | (new (...args: any[]) => IEvent)) => {
  const eventTypeName = typeof eventType === 'string' ? eventType : eventType.name;

  return SetMetadata(`${EVENT_HANDLER_METADATA}_async`, eventTypeName);
};

/**
 * 事件处理器选项装饰器
 * 用于配置事件处理器的选项
 * @param options 处理器选项
 */
export const EventHandlerOptions = (options: {
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
   * 是否启用事务
   */
  transaction?: boolean;

  /**
   * 事务隔离级别
   */
  isolationLevel?: string;
}) => SetMetadata(`${EVENT_HANDLER_METADATA}_options`, options);

/**
 * 事件验证装饰器
 * 用于标记事件处理器方法需要验证
 * @param validator 验证器函数或类
 */
export const EventValidate = (validator?: Function | string) => {
  return SetMetadata(`${EVENT_HANDLER_METADATA}_validate`, validator);
};

/**
 * 事件权限装饰器
 * 用于标记事件处理器需要的权限
 * @param permissions 权限列表
 */
export const EventPermissions = (...permissions: string[]) => {
  return SetMetadata(`${EVENT_HANDLER_METADATA}_permissions`, permissions);
};

/**
 * 事件角色装饰器
 * 用于标记事件处理器需要的角色
 * @param roles 角色列表
 */
export const EventRoles = (...roles: string[]) => {
  return SetMetadata(`${EVENT_HANDLER_METADATA}_roles`, roles);
};

/**
 * 事件重试装饰器
 * 用于标记事件处理器需要重试
 * @param options 重试选项
 */
export const EventRetry = (options: {
  /**
   * 最大重试次数
   */
  maxAttempts?: number;

  /**
   * 重试延迟（毫秒）
   */
  delay?: number;

  /**
   * 指数退避
   */
  exponentialBackoff?: boolean;

  /**
   * 抖动因子
   */
  jitter?: boolean;

  /**
   * 重试条件
   */
  retryCondition?: (error: Error) => boolean;

  /**
   * 需要重试的错误类型
   */
  retryableErrors?: (new (...args: any[]) => Error)[];
}) => SetMetadata(`${EVENT_HANDLER_METADATA}_retry`, options);

/**
 * 事件死信队列装饰器
 * 用于标记事件处理器失败后的处理方式
 * @param options 死信队列选项
 */
export const EventDeadLetter = (options: {
  /**
   * 是否启用死信队列
   */
  enabled?: boolean;

  /**
   * 死信队列名称
   */
  queueName?: string;

  /**
   * 死信队列TTL（毫秒）
   */
  ttl?: number;

  /**
   * 最大重试次数后进入死信队列
   */
  maxRetries?: number;
}) => SetMetadata(`${EVENT_HANDLER_METADATA}_dead_letter`, options);

/**
 * 事件指标装饰器
 * 用于标记事件处理器需要收集指标
 * @param options 指标选项
 */
export const EventMetrics = (options: {
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
   * 是否启用重试次数指标
   */
  enableRetryCount?: boolean;

  /**
   * 标签
   */
  labels?: Record<string, string>;
}) => SetMetadata(`${EVENT_HANDLER_METADATA}_metrics`, options);

/**
 * 事件日志装饰器
 * 用于标记事件处理器需要日志记录
 * @param options 日志选项
 */
export const EventLogging = (options: {
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
   * 是否记录重试
   */
  logRetry?: boolean;

  /**
   * 敏感字段列表
   */
  sensitiveFields?: string[];
}) => SetMetadata(`${EVENT_HANDLER_METADATA}_logging`, options);

/**
 * 事件事务装饰器
 * 用于标记事件处理器需要在事务中执行
 * @param options 事务选项
 */
export const EventTransaction = (options: {
  /**
   * 事务隔离级别
   */
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';

  /**
   * 是否只读
   */
  readOnly?: boolean;

  /**
   * 超时时间（秒）
   */
  timeout?: number;

  /**
   * 回滚条件
   */
  rollbackFor?: Error[];
}) => SetMetadata(`${EVENT_HANDLER_METADATA}_transaction`, options);

/**
 * 事件并发控制装饰器
 * 用于标记事件处理器的并发控制
 * @param options 并发控制选项
 */
export const EventConcurrency = (options: {
  /**
   * 最大并发数
   */
  maxConcurrency?: number;

  /**
   * 并发键生成器
   */
  keyGenerator?: (event: IEvent) => string;

  /**
   * 等待策略
   */
  waitStrategy?: 'queue' | 'reject' | 'timeout';

  /**
   * 等待超时（毫秒）
   */
  timeout?: number;
}) => SetMetadata(`${EVENT_HANDLER_METADATA}_concurrency`, options);

/**
 * 事件限流装饰器
 * 用于标记事件处理器需要限流
 * @param options 限流选项
 */
export const EventRateLimit = (options: {
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
  keyGenerator?: (event: IEvent) => string;

  /**
   * 跳过成功的请求
   */
  skipSuccessfulRequests?: boolean;

  /**
   * 跳过失败的请求
   */
  skipFailedRequests?: boolean;
}) => SetMetadata(`${EVENT_HANDLER_METADATA}_rate_limit`, options);

/**
 * 事件条件装饰器
 * 用于标记事件处理器的执行条件
 * @param condition 条件函数
 */
export const EventCondition = (condition: (event: IEvent) => boolean) => {
  return SetMetadata(`${EVENT_HANDLER_METADATA}_condition`, condition);
};

/**
 * 事件优先级装饰器
 * 用于标记事件处理器的优先级
 * @param priority 优先级
 */
export const EventPriority = (priority: number) => {
  return SetMetadata(`${EVENT_HANDLER_METADATA}_priority`, priority);
};

/**
 * 事件版本装饰器
 * 用于标记事件处理器支持的事件版本
 * @param versions 支持的版本列表
 */
export const EventVersions = (...versions: number[]) => {
  return SetMetadata(`${EVENT_HANDLER_METADATA}_versions`, versions);
};

/**
 * 事件源装饰器
 * 用于标记事件处理器支持的事件源
 * @param sources 支持的事件源列表
 */
export const EventSources = (...sources: string[]) => {
  return SetMetadata(`${EVENT_HANDLER_METADATA}_sources`, sources);
};

/**
 * 事件批处理装饰器
 * 用于标记事件处理器支持批处理
 * @param options 批处理选项
 */
export const EventBatch = (options: {
  /**
   * 批处理大小
   */
  size?: number;

  /**
   * 批处理超时（毫秒）
   */
  timeout?: number;

  /**
   * 是否启用部分处理
   */
  partialProcessing?: boolean;
}) => SetMetadata(`${EVENT_HANDLER_METADATA}_batch`, options);

/**
 * 事件序列化装饰器
 * 用于标记事件处理器的序列化方式
 * @param serializer 序列化器
 */
export const EventSerializer = (serializer: Function | string) => {
  return SetMetadata(`${EVENT_HANDLER_METADATA}_serializer`, serializer);
};

/**
 * 事件反序列化装饰器
 * 用于标记事件处理器的反序列化方式
 * @param deserializer 反序列化器
 */
export const EventDeserializer = (deserializer: Function | string) => {
  return SetMetadata(`${EVENT_HANDLER_METADATA}_deserializer`, deserializer);
};
