// 用途：命令处理器接口
// 作者：后端开发团队
// 时间：2025-10-05

import { ICommand, ICommandResult } from '../commands/command.base';

/**
 * 命令处理器接口
 * 定义了处理命令的基本契约
 */
export interface ICommandHandler<TCommand extends ICommand = ICommand> {
  /**
   * 处理命令
   * @param command 要处理的命令
   * @returns 命令处理结果
   */
  handle(command: TCommand): Promise<ICommandResult>;

  /**
   * 验证命令
   * @param command 要验证的命令
   * @returns 验证结果
   */
  validate?(command: TCommand): Promise<boolean>;

  /**
   * 获取处理器名称
   */
  getName(): string;
}

/**
 * 异步命令处理器接口
 * 用于处理需要长时间执行的命令
 */
export interface IAsyncCommandHandler<TCommand extends ICommand = ICommand>
  extends ICommandHandler<TCommand> {
  /**
   * 异步处理命令
   * @param command 要处理的命令
   * @returns 命令处理结果
   */
  handleAsync(command: TCommand): Promise<ICommandResult>;

  /**
   * 获取命令执行状态
   * @param commandId 命令ID
   * @returns 执行状态
   */
  getExecutionStatus?(commandId: string): Promise<CommandExecutionStatus>;
}

/**
 * 命令执行状态枚举
 */
export enum CommandExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * 命令执行状态信息
 */
export interface CommandExecutionStatusInfo {
  /**
   * 命令ID
   */
  commandId: string;

  /**
   * 执行状态
   */
  status: CommandExecutionStatus;

  /**
   * 开始时间
   */
  startTime?: Date;

  /**
   * 结束时间
   */
  endTime?: Date;

  /**
   * 进度百分比
   */
  progress?: number;

  /**
   * 错误信息
   */
  error?: string;

  /**
   * 元数据
   */
  metadata?: Record<string, any>;
}

/**
 * 命令处理器工厂接口
 */
export interface ICommandHandlerFactory {
  /**
   * 创建命令处理器
   * @param commandType 命令类型
   * @returns 命令处理器实例
   */
  createHandler<TCommand extends ICommand>(commandType: string): ICommandHandler<TCommand> | null;

  /**
   * 注册命令处理器
   * @param commandType 命令类型
   * @param handlerFactory 处理器工厂函数
   */
  registerHandler<TCommand extends ICommand>(
    commandType: string,
    handlerFactory: () => ICommandHandler<TCommand>,
  ): void;

  /**
   * 获取所有已注册的命令类型
   */
  getRegisteredCommandTypes(): string[];
}

/**
 * 命令中间件接口
 */
export interface ICommandMiddleware {
  /**
   * 中间件名称
   */
  name: string;

  /**
   * 执行中间件
   * @param command 命令
   * @param next 下一个中间件或处理器
   * @returns 命令处理结果
   */
  execute<TCommand extends ICommand>(
    command: TCommand,
    next: () => Promise<ICommandResult>,
  ): Promise<ICommandResult>;
}

/**
 * 命令管道接口
 */
export interface ICommandPipeline {
  /**
   * 添加中间件
   * @param middleware 中间件
   */
  addMiddleware(middleware: ICommandMiddleware): void;

  /**
   * 移除中间件
   * @param middlewareName 中间件名称
   */
  removeMiddleware(middlewareName: string): void;

  /**
   * 执行命令管道
   * @param command 命令
   * @param handler 命令处理器
   * @returns 命令处理结果
   */
  execute<TCommand extends ICommand>(
    command: TCommand,
    handler: ICommandHandler<TCommand>,
  ): Promise<ICommandResult>;
}
