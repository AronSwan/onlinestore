/**
 * 更新用户命令处理器，基于PrestaShop CQRS模式
 * 处理用户更新的业务逻辑和验证
 */

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Injectable, Inject } from '@nestjs/common';
import { UpdateUserCommand } from '../commands/update-user.command';
import { FirstName } from '../../domain/value-objects/first-name.value-object';
import { LastName } from '../../domain/value-objects/last-name.value-object';
import { EnhancedEmail } from '../../domain/value-objects/enhanced-email.value-object';
import { Birthday } from '../../domain/value-objects/birthday.value-object';
import { UserNotFoundException, UserAlreadyExistsException } from '../../domain/errors/user.errors';
import { EnhancedUsersRepository } from '../../infrastructure/repositories/enhanced-users.repository';

@Injectable()
@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand> {
  constructor(
    @Inject('EnhancedUsersRepository')
    private readonly usersRepository: EnhancedUsersRepository,
  ) {}

  async execute(
    command: UpdateUserCommand,
  ): Promise<{ success: boolean; updatedFields: string[] }> {
    // 1. 检查是否有更新内容
    if (!command.hasUpdates()) {
      return { success: true, updatedFields: [] };
    }

    // 2. 获取现有用户
    const user = await this.usersRepository.findById(command.userId);
    if (!user) {
      throw new UserNotFoundException(command.userId);
    }

    // 3. 验证并准备更新数据
    const updateData: any = {};
    const updatedFields: string[] = [];

    // 验证和更新邮箱
    if (command.email) {
      const email = new EnhancedEmail(command.email);
      await this.assertEmailIsNotTaken(email.value, command.userId);
      updateData.email = email.value;
      updatedFields.push('email');
    }

    // 验证和更新名字
    if (command.firstName) {
      const firstName = new FirstName(command.firstName);
      updateData.firstName = firstName.value;
      updatedFields.push('firstName');
    }

    // 验证和更新姓氏
    if (command.lastName) {
      const lastName = new LastName(command.lastName);
      updateData.lastName = lastName.value;
      updatedFields.push('lastName');
    }

    // 验证和更新生日
    if (command.birthday) {
      const birthday = new Birthday(command.birthday);
      updateData.birthday = birthday.value;
      updatedFields.push('birthday');
    }

    // 更新其他字段
    this.updateSimpleFields(command, updateData, updatedFields);

    // 4. 执行更新
    updateData.updatedAt = new Date();
    await this.usersRepository.update(command.userId, updateData);

    // 5. 记录更新日志
    this.logUserUpdate(command.userId, updatedFields);

    return { success: true, updatedFields };
  }

  /**
   * 验证邮箱未被其他用户使用
   */
  private async assertEmailIsNotTaken(email: string, currentUserId: string): Promise<void> {
    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser && existingUser.id !== currentUserId) {
      throw new UserAlreadyExistsException(
        email,
        `Email ${email} is already in use by another user`,
      );
    }
  }

  /**
   * 更新简单字段（不需要值对象验证的字段）
   */
  private updateSimpleFields(
    command: UpdateUserCommand,
    updateData: any,
    updatedFields: string[],
  ): void {
    const simpleFields = [
      'phone',
      'address',
      'city',
      'country',
      'postalCode',
      'newsletterSubscription',
      'marketingEmails',
      'preferredLanguage',
      'timezone',
      'isActive',
    ];

    simpleFields.forEach(field => {
      if ((command as any)[field] !== undefined) {
        updateData[field] = (command as any)[field];
        updatedFields.push(field);
      }
    });
  }

  /**
   * 记录用户更新日志
   */
  private logUserUpdate(userId: string, updatedFields: string[]): void {
    // 这里可以集成日志服务
    console.log(`User ${userId} updated fields: ${updatedFields.join(', ')}`);
  }
}
