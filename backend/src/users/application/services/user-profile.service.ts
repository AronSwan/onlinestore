// 用途：用户资料管理应用服务
// 依赖文件：user.repository.interface.ts, update-user-profile.command.ts
// 作者：后端开发团队
// 时间：2025-09-30

import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserAggregate } from '../../domain/aggregates/user.aggregate';
import { UserRepository } from '../../domain/repositories/user.repository.interface';
import { UpdateUserProfileCommand } from '../commands/update-user-profile.command';
import { EventPublisher } from '../../../common/domain/event-publisher';

@Injectable()
@CommandHandler(UpdateUserProfileCommand)
export class UserProfileService implements ICommandHandler<UpdateUserProfileCommand> {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * 执行更新用户资料命令
   */
  async execute(command: UpdateUserProfileCommand): Promise<UserAggregate> {
    // 验证命令数据
    // 命令验证逻辑
    if (!command.userId) {
      throw new Error('用户ID是必填项');
    }

    // 查找用户
    const userId = { value: command.userId } as any; // 临时解决方案
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 检查用户名是否已被其他用户使用
    if (command.username && command.username !== user.getUsername()) {
      const usernameExists = await this.userRepository.existsByUsername(command.username);
      if (usernameExists) {
        throw new ConflictException('用户名已被使用');
      }
    }

    // 更新用户资料
    user.updateProfile(command.username, command.avatar, command.phone);

    // 保存用户
    await this.userRepository.save(user);

    // 发布领域事件
    await this.eventPublisher.publishAll(user.getUncommittedEvents());

    return user;
  }
}
