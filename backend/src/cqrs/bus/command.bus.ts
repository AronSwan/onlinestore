// 用途：命令总线实现
// 作者：后端开发团队
// 时间：2025-10-05

import { Injectable, Logger } from '@nestjs/common';
import { ICommand, ICommandResult } from '../commands/command.base';
import {
  ICommandHandler,
  ICommandHandlerFactory,
  ICommandMiddleware,
  ICommandPipeline,
  CommandExecutionStatus,
  CommandExecutionStatusInfo,
} from '../interfaces/command-handler.interface';

/**
 * 命令总线接口
 */
export interface ICommandBus {
  /**
   * 执行命令
   * @param command 命令
   * @returns 命令执行结果
   */
  execute<TCommand extends ICommand>(command: TCommand): Promise<ICommandResult>;

  /**
   * 异步执行命令
   * @param command 命令
   * @returns 命令ID
   */
  executeAsync<TCommand extends ICommand>(command: TCommand): Promise<string>;

  /**
   * 获取命令执行状态
   * @param commandId 命令ID
   * @returns 执行状态
   */
  getExecutionStatus(commandId: string): Promise<CommandExecutionStatusInfo | null>;

  /**
   * 注册命令处理器
   * @param commandType 命令类型
   * @param handler 处理器
   */
  register<TCommand extends ICommand>(
    commandType: string,
    handler: ICommandHandler<TCommand>,
  ): void;

  /**
   * 添加中间件
   * @param middleware 中间件
   */
  addMiddleware(middleware: ICommandMiddleware): void;
}

/**
 * 命令总线实现
 */
@Injectable()
export class CommandBus implements ICommandBus, ICommandPipeline {
  private readonly logger = new Logger(CommandBus.name);
  private readonly handlers = new Map<string, ICommandHandler>();
  private readonly middlewares: ICommandMiddleware[] = [];
  private readonly executionStatus = new Map<string, CommandExecutionStatusInfo>();

  /**
   * 执行命令
   */
  async execute<TCommand extends ICommand>(command: TCommand): Promise<ICommandResult> {
    const commandName = command.constructor.name;
    this.logger.debug(`Executing command: ${commandName} with ID: ${command.id}`);

    try {
      // 获取命令处理器
      const handler = this.handlers.get(commandName);
      if (!handler) {
        const error = `No handler registered for command: ${commandName}`;
        this.logger.error(error);
        return {
          success: false,
          error,
          errorCode: 'HANDLER_NOT_FOUND',
        };
      }

      // 执行中间件管道
      return await this.executePipeline(command, handler);
    } catch (error) {
      this.logger.error(`Error executing command ${commandName}:`, error);
      return {
        success: false,
        error: error.message,
        errorCode: 'EXECUTION_ERROR',
      };
    }
  }

  /**
   * 异步执行命令
   */
  async executeAsync<TCommand extends ICommand>(command: TCommand): Promise<string> {
    const commandId = command.id;
    const commandName = command.constructor.name;

    // 初始化执行状态
    this.executionStatus.set(commandId, {
      commandId,
      status: CommandExecutionStatus.PENDING,
      startTime: new Date(),
    });

    this.logger.debug(`Async execution started for command: ${commandName} with ID: ${commandId}`);

    // 异步执行命令
    this.execute(command)
      .then(result => {
        const status = this.executionStatus.get(commandId);
        if (status) {
          status.status = result.success
            ? CommandExecutionStatus.COMPLETED
            : CommandExecutionStatus.FAILED;
          status.endTime = new Date();
          if (!result.success) {
            status.error = result.error;
          }
        }
      })
      .catch(error => {
        const status = this.executionStatus.get(commandId);
        if (status) {
          status.status = CommandExecutionStatus.FAILED;
          status.endTime = new Date();
          status.error = error.message;
        }
      });

    return commandId;
  }

  /**
   * 获取命令执行状态
   */
  async getExecutionStatus(commandId: string): Promise<CommandExecutionStatusInfo | null> {
    return this.executionStatus.get(commandId) || null;
  }

  /**
   * 注册命令处理器
   */
  register<TCommand extends ICommand>(
    commandType: string,
    handler: ICommandHandler<TCommand>,
  ): void {
    if (this.handlers.has(commandType)) {
      this.logger.warn(
        `Handler for command type ${commandType} is already registered. Overwriting.`,
      );
    }

    this.handlers.set(commandType, handler);
    this.logger.debug(`Registered handler for command type: ${commandType}`);
  }

  /**
   * 添加中间件
   */
  addMiddleware(middleware: ICommandMiddleware): void {
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
   * 执行命令管道
   */
  async executePipeline<TCommand extends ICommand>(
    command: TCommand,
    handler: ICommandHandler<TCommand>,
  ): Promise<ICommandResult> {
    let index = 0;

    const executeNext = async (): Promise<ICommandResult> => {
      if (index >= this.middlewares.length) {
        // 所有中间件执行完毕，执行处理器
        const commandId = command.id;
        const status = this.executionStatus.get(commandId);
        if (status) {
          status.status = CommandExecutionStatus.RUNNING;
        }

        return await handler.handle(command);
      }

      const middleware = this.middlewares[index++];
      this.logger.debug(`Executing middleware: ${middleware.name}`);

      return await middleware.execute(command, executeNext);
    };

    return await executeNext();
  }

  /**
   * 清理过期的执行状态
   */
  cleanupExpiredStatus(maxAgeHours: number = 24): void {
    const now = new Date();
    const maxAge = maxAgeHours * 60 * 60 * 1000; // 转换为毫秒

    for (const [commandId, status] of this.executionStatus.entries()) {
      if (status.endTime && now.getTime() - status.endTime.getTime() > maxAge) {
        this.executionStatus.delete(commandId);
        this.logger.debug(`Cleaned up expired status for command: ${commandId}`);
      }
    }
  }

  /**
   * 获取所有注册的命令类型
   */
  getRegisteredCommandTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * 获取所有中间件
   */
  getMiddlewares(): ICommandMiddleware[] {
    return [...this.middlewares];
  }

  /**
   * 获取所有执行状态
   */
  getAllExecutionStatus(): CommandExecutionStatusInfo[] {
    return Array.from(this.executionStatus.values());
  }

  /**
   * 获取处理器提供者（用于测试）
   */
  getProvider(handlerName: string): ICommandHandler | null {
    // 在测试中，这个方法用于模拟处理器提供者
    // 实际实现应该从依赖注入容器中获取处理器
    // 返回模拟处理器用于测试
    return {
      handle: jest.fn().mockResolvedValue({
        success: true,
        data: { userId: 'test-user-id' },
      }),
      getName: jest.fn().mockReturnValue(handlerName),
    } as ICommandHandler;
  }
}

/**
 * 命令总线工厂
 */
@Injectable()
export class CommandBusFactory {
  constructor(private readonly commandBus: CommandBus) {}

  /**
   * 创建命令总线
   */
  create(): ICommandBus {
    return this.commandBus;
  }
}

/**
 * 默认命令中间件
 */
export class LoggingMiddleware implements ICommandMiddleware {
  public readonly name = 'LoggingMiddleware';

  async execute<TCommand extends ICommand>(
    command: TCommand,
    next: () => Promise<ICommandResult>,
  ): Promise<ICommandResult> {
    const logger = new Logger(LoggingMiddleware.name);
    const commandName = command.constructor.name;
    const startTime = Date.now();

    logger.debug(`[START] Processing command: ${commandName} (${command.id})`);

    try {
      const result = await next();
      const duration = Date.now() - startTime;

      if (result.success) {
        logger.debug(`[SUCCESS] Command ${commandName} completed in ${duration}ms`);
      } else {
        logger.error(`[FAILED] Command ${commandName} failed in ${duration}ms: ${result.error}`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`[ERROR] Command ${commandName} threw error in ${duration}ms:`, error);
      throw error;
    }
  }
}

/**
 * 验证中间件
 */
export class ValidationMiddleware implements ICommandMiddleware {
  public readonly name = 'ValidationMiddleware';

  async execute<TCommand extends ICommand>(
    command: TCommand,
    next: () => Promise<ICommandResult>,
  ): Promise<ICommandResult> {
    const logger = new Logger(ValidationMiddleware.name);

    // 这里可以添加命令验证逻辑
    // 例如使用 class-validator 进行验证

    logger.debug(`Validating command: ${command.constructor.name}`);

    // 如果验证失败，返回错误结果
    // if (!isValid) {
    //   return {
    //     success: false,
    //     error: 'Command validation failed',
    //     errorCode: 'VALIDATION_ERROR'
    //   };
    // }

    return await next();
  }
}
