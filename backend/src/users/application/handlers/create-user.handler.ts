/**
 * 创建用户命令处理器，基于PrestaShop CQRS模式
 * 处理用户创建的业务逻辑和验证
 */

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Injectable, Inject } from '@nestjs/common';
import { CreateUserCommand } from '../commands/create-user.command';
import { FirstName } from '../../domain/value-objects/first-name.value-object';
import { LastName } from '../../domain/value-objects/last-name.value-object';
import { EnhancedEmail } from '../../domain/value-objects/enhanced-email.value-object';
import { EnhancedPassword } from '../../domain/value-objects/enhanced-password.value-object';
import { Birthday } from '../../domain/value-objects/birthday.value-object';
import { UserAlreadyExistsException } from '../../domain/errors/user.errors';
import { EnhancedUsersRepository } from '../../infrastructure/repositories/enhanced-users.repository';
import { EnhancedUser } from '../../domain/entities/enhanced-user.entity';

@Injectable()
@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @Inject('EnhancedUsersRepository')
    private readonly usersRepository: EnhancedUsersRepository,
  ) {}

  async execute(command: CreateUserCommand): Promise<{ userId: string }> {
    // 1. 创建值对象并验证
    const email = new EnhancedEmail(command.email);
    const password = new EnhancedPassword(command.password);
    const firstName = new FirstName(command.firstName);
    const lastName = new LastName(command.lastName);
    const birthday = command.birthday ? new Birthday(command.birthday) : Birthday.createEmpty();

    // 2. 检查用户是否已存在
    await this.assertUserDoesNotExist(email);

    // 3. 创建用户实体
    const user = EnhancedUser.create({
      email: email.getValue(),
      password: await password.hash(),
      firstName: firstName.getValue(),
      lastName: lastName.getValue(),
      birthday: birthday.getValue(),
      phone: command.phone,
      address: command.address,
      preferences: command.preferences,
    });

    // 4. 保存用户
    const savedUser = await this.usersRepository.save(user);

    // 5. 发送欢迎邮件（异步）
    this.sendWelcomeEmail(email.getValue(), firstName.getFormatted());

    return { userId: savedUser.id };
  }

  /**
   * 验证用户不存在
   */
  private async assertUserDoesNotExist(email: EnhancedEmail): Promise<void> {
    const existingUser = await this.usersRepository.findByEmail(email.getValue());

    if (existingUser) {
      throw new UserAlreadyExistsException(
        email.getValue(),
        `User with email ${email.getValue()} already exists`,
      );
    }
  }

  /**
   * 发送欢迎邮件（异步处理）
   */
  private sendWelcomeEmail(email: string, firstName: string): void {
    // 这里可以集成邮件服务
    // 例如：this.emailService.sendWelcomeEmail(email, firstName);
    console.log(`Welcome email would be sent to ${email} for ${firstName}`);
  }
}
