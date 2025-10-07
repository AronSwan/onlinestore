// 用途：命令处理器装饰器
// 作者：后端开发团队
// 时间：2025-10-05

import { SetMetadata } from '@nestjs/common';
import { ICommand } from '../commands/command.base';

/**
 * 命令处理器元数据键
 */
export const COMMAND_HANDLER_METADATA = 'command_handler';

/**
 * 命令处理器装饰器
 * 用于标记类为命令处理器，并指定处理的命令类型
 * @param commandType 命令类型
 */
export const CommandHandler = (commandType: string | (new (...args: any[]) => ICommand)) => {
  const commandTypeName = typeof commandType === 'string' ? commandType : commandType.name;

  return SetMetadata(COMMAND_HANDLER_METADATA, commandTypeName);
};

/**
 * 异步命令处理器装饰器
 * 用于标记类为异步命令处理器
 * @param commandType 命令类型
 */
export const AsyncCommandHandler = (commandType: string | (new (...args: any[]) => ICommand)) => {
  const commandTypeName = typeof commandType === 'string' ? commandType : commandType.name;

  return SetMetadata(`${COMMAND_HANDLER_METADATA}_async`, commandTypeName);
};

/**
 * 命令处理器选项装饰器
 * 用于配置命令处理器的选项
 * @param options 处理器选项
 */
export const CommandHandlerOptions = (options: {
  /**
   * 是否启用重试
   */
  retry?: boolean;

  /**
   * 最大重试次数
   */
  maxRetries?: number;

  /**
   * 重试延迟（毫秒）
   */
  retryDelay?: number;

  /**
   * 超时时间（毫秒）
   */
  timeout?: number;

  /**
   * 是否启用事务
   */
  transaction?: boolean;

  /**
   * 事务隔离级别
   */
  isolationLevel?: string;

  /**
   * 是否启用审计
   */
  audit?: boolean;

  /**
   * 审计类别
   */
  auditCategory?: string;
}) => SetMetadata(`${COMMAND_HANDLER_METADATA}_options`, options);

/**
 * 命令验证装饰器
 * 用于标记命令处理器方法需要验证
 * @param validator 验证器函数或类
 */
export const CommandValidate = (validator?: Function | string) => {
  return SetMetadata(`${COMMAND_HANDLER_METADATA}_validate`, validator);
};

/**
 * 命令权限装饰器
 * 用于标记命令处理器需要的权限
 * @param permissions 权限列表
 */
export const CommandPermissions = (...permissions: string[]) => {
  return SetMetadata(`${COMMAND_HANDLER_METADATA}_permissions`, permissions);
};

/**
 * 命令角色装饰器
 * 用于标记命令处理器需要的角色
 * @param roles 角色列表
 */
export const CommandRoles = (...roles: string[]) => {
  return SetMetadata(`${COMMAND_HANDLER_METADATA}_roles`, roles);
};

/**
 * 命令缓存装饰器
 * 用于标记命令处理器结果需要缓存
 * @param options 缓存选项
 */
export const CommandCache = (options: {
  /**
   * 缓存时间（秒）
   */
  ttl?: number;

  /**
   * 缓存键前缀
   */
  keyPrefix?: string;

  /**
   * 是否根据用户缓存
   */
  byUser?: boolean;

  /**
   * 缓存条件
   */
  condition?: (command: ICommand) => boolean;
}) => SetMetadata(`${COMMAND_HANDLER_METADATA}_cache`, options);

/**
 * 命令限流装饰器
 * 用于标记命令处理器需要限流
 * @param options 限流选项
 */
export const CommandRateLimit = (options: {
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
  keyGenerator?: (command: ICommand) => string;

  /**
   * 跳过成功的请求
   */
  skipSuccessfulRequests?: boolean;

  /**
   * 跳过失败的请求
   */
  skipFailedRequests?: boolean;
}) => SetMetadata(`${COMMAND_HANDLER_METADATA}_rate_limit`, options);

/**
 * 命令指标装饰器
 * 用于标记命令处理器需要收集指标
 * @param options 指标选项
 */
export const CommandMetrics = (options: {
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
   * 标签
   */
  labels?: Record<string, string>;
}) => SetMetadata(`${COMMAND_HANDLER_METADATA}_metrics`, options);

/**
 * 命令日志装饰器
 * 用于标记命令处理器需要日志记录
 * @param options 日志选项
 */
export const CommandLogging = (options: {
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
   * 敏感字段列表
   */
  sensitiveFields?: string[];
}) => SetMetadata(`${COMMAND_HANDLER_METADATA}_logging`, options);

/**
 * 命令事务装饰器
 * 用于标记命令处理器需要在事务中执行
 * @param options 事务选项
 */
export const CommandTransaction = (options: {
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
}) => SetMetadata(`${COMMAND_HANDLER_METADATA}_transaction`, options);

/**
 * 命令重试装饰器
 * 用于标记命令处理器需要重试
 * @param options 重试选项
 */
export const CommandRetry = (options: {
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
}) => SetMetadata(`${COMMAND_HANDLER_METADATA}_retry`, options);
