// 用途：创建用户命令处理器示例
// 作者：后端开发团队
// 时间：2025-10-05

import { Injectable } from '@nestjs/common';
import { ICommandHandler } from '../interfaces/command-handler.interface';
import { ICommandResult } from '../commands/command.base';
import {
  CommandHandler,
  CommandHandlerOptions,
  CommandValidate,
  CommandLogging,
} from '../decorators/command-handler.decorator';
import { CreateUserCommand, CreateUserResult } from './create-user.command';
import { UserCreatedEvent } from './user-created.event';
import { IEventBus } from '../bus/event.bus';

/**
 * 创建用户命令处理器
 */
@Injectable()
@CommandHandler(CreateUserCommand)
@CommandHandlerOptions({
  retry: true,
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 10000,
  audit: true,
  auditCategory: 'user_management',
})
@CommandLogging({
  level: 'info',
  logInput: true,
  logOutput: true,
  logError: true,
  logDuration: true,
  sensitiveFields: ['password'],
})
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(private readonly eventBus: IEventBus) {}

  /**
   * 处理创建用户命令
   */
  async handle(command: CreateUserCommand): Promise<ICommandResult<CreateUserResult>> {
    try {
      // 验证命令
      const isValid = await this.validate(command);
      if (!isValid) {
        return {
          success: false,
          error: 'Command validation failed',
          errorCode: 'VALIDATION_ERROR',
        };
      }

      // 这里应该是实际的业务逻辑，例如：
      // 1. 检查用户名是否已存在
      // 2. 检查邮箱是否已存在
      // 3. 密码加密
      // 4. 创建用户实体
      // 5. 保存到数据库
      // 6. 分配角色

      // 模拟创建用户
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const createdAt = new Date();

      // 创建用户结果
      const result: CreateUserResult = {
        userId,
        username: command.username,
        email: command.email,
        createdAt,
      };

      // 发布用户创建事件
      const event = new UserCreatedEvent({
        userId,
        username: command.username,
        email: command.email,
        firstName: command.firstName,
        lastName: command.lastName,
        roleIds: command.roleIds,
        createdAt,
        createdBy: 'system', // 在实际应用中，这应该是当前用户的ID
      });

      await this.eventBus.publish(event);

      return {
        success: true,
        data: result,
        metadata: {
          userId,
          eventIds: [event.id],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'CREATION_FAILED',
        metadata: {
          originalError: error,
        },
      };
    }
  }

  /**
   * 验证命令
   */
  async validate(command: CreateUserCommand): Promise<boolean> {
    // 基本验证
    if (!command.username || command.username.trim().length < 3) {
      return false;
    }

    if (!command.email || !this.isValidEmail(command.email)) {
      return false;
    }

    if (!command.password || command.password.length < 8) {
      return false;
    }

    if (!command.firstName || command.firstName.trim().length < 1) {
      return false;
    }

    if (!command.lastName || command.lastName.trim().length < 1) {
      return false;
    }

    if (!command.roleIds || command.roleIds.length === 0) {
      return false;
    }

    return true;
  }

  /**
   * 获取处理器名称
   */
  getName(): string {
    return 'CreateUserHandler';
  }

  /**
   * 验证邮箱格式
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
