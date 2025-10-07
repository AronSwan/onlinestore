// 用途：用户注册应用服务
// 依赖文件：user.repository.interface.ts, register-user.command.ts
// 作者：后端开发团队
// 时间：2025-09-30

import { Injectable, ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserAggregate } from '../../domain/aggregates/user.aggregate';
import { UserRepository } from '../../domain/repositories/user.repository.interface';
import { RegisterUserCommand } from '../commands/register-user.command';
import { EventPublisher } from '../../../common/domain/event-publisher';

@Injectable()
@CommandHandler(RegisterUserCommand)
export class UserRegistrationService implements ICommandHandler<RegisterUserCommand> {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * 执行用户注册命令
   */
  async execute(command: RegisterUserCommand): Promise<UserAggregate> {
    // 验证命令数据
    // 命令验证逻辑
    if (!command.email || !command.password || !command.username) {
      throw new Error('邮箱、密码和用户名是必填项');
    }

    // 检查邮箱是否已存在
    const emailExists = await this.userRepository.existsByEmail(command.email);
    if (emailExists) {
      throw new ConflictException('邮箱已被注册');
    }

    // 检查用户名是否已存在
    const usernameExists = await this.userRepository.existsByUsername(command.username);
    if (usernameExists) {
      throw new ConflictException('用户名已被使用');
    }

    // 创建用户聚合根
    const user = await UserAggregate.create(
      command.email,
      command.username,
      command.password,
      command.avatar,
      command.phone,
    );

    // 保存用户
    await this.userRepository.save(user);

    // 发布领域事件
    // await this.eventPublisher.publishAll(user.getUncommittedEvents());

    return user;
  }
}
