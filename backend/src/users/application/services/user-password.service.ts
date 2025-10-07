// 用途：用户密码管理应用服务
// 依赖文件：user.repository.interface.ts, change-user-password.command.ts
// 作者：后端开发团队
// 时间：2025-09-30

import { Injectable, NotFoundException, UnauthorizedException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserAggregate } from '../../domain/aggregates/user.aggregate';
import { UserRepository } from '../../domain/repositories/user.repository.interface';
import { ChangeUserPasswordCommand } from '../commands/change-user-password.command';
import { EventPublisher } from '../../../common/domain/event-publisher';

@Injectable()
@CommandHandler(ChangeUserPasswordCommand)
export class UserPasswordService implements ICommandHandler<ChangeUserPasswordCommand> {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * 执行更改用户密码命令
   */
  async execute(command: ChangeUserPasswordCommand): Promise<UserAggregate> {
    // 验证命令数据
    // 命令验证逻辑
    if (!command.userId || !command.oldPassword || !command.newPassword) {
      throw new Error('用户ID、旧密码和新密码是必填项');
    }

    // 查找用户
    const userId = { value: command.userId } as any; // 临时解决方案
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 验证当前密码
    const isCurrentPasswordValid = await user.validateLogin(command.oldPassword);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('当前密码不正确');
    }

    // 更改密码
    await user.changePassword(command.newPassword);

    // 保存用户
    await this.userRepository.save(user);

    // 发布领域事件
    await this.eventPublisher.publishAll(user.getUncommittedEvents());

    return user;
  }
}
