/**
 * 获取用户编辑信息查询处理器，基于PrestaShop CQRS模式
 * 处理用户信息查询的业务逻辑
 */

import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Injectable, Inject } from '@nestjs/common';
import {
  GetUserForEditingQuery,
  UserForEditingResult,
} from '../queries/get-user-for-editing.query';
import { UserNotFoundException } from '../../domain/errors/user.errors';
import { EnhancedUsersRepository } from '../../infrastructure/repositories/enhanced-users.repository';

@Injectable()
@QueryHandler(GetUserForEditingQuery)
export class GetUserForEditingHandler implements IQueryHandler<GetUserForEditingQuery> {
  constructor(
    @Inject('EnhancedUsersRepository')
    private readonly usersRepository: EnhancedUsersRepository,
  ) {}

  async execute(query: GetUserForEditingQuery): Promise<UserForEditingResult> {
    // 1. 获取用户基本信息
    const user = await this.usersRepository.findById(query.userId);
    if (!user) {
      throw new UserNotFoundException(query.userId);
    }

    // 2. 构建基本响应
    const result: UserForEditingResult = {
      id: user.id,
      email: user.email.getValue(),
      firstName: user.firstName.getValue(),
      lastName: user.lastName.getValue(),
      birthday:
        user.birthday && user.birthday.getValue() !== '0000-00-00'
          ? user.birthday.getValue()
          : undefined,
      phone: user.phone,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };

    // 3. 根据查询选项添加额外信息
    if (query.shouldIncludeAddress()) {
      result.address = {
        street: user.address?.street || '',
        city: user.address?.city || '',
        country: user.address?.country || '',
        postalCode: user.address?.postalCode || '',
      };
    }

    if (query.shouldIncludePreferences()) {
      result.preferences = {
        newsletterSubscription: user.preferences?.newsletterSubscription || false,
        marketingEmails: user.preferences?.marketingEmails || false,
        preferredLanguage: user.preferences?.preferredLanguage || 'zh-CN',
        timezone: user.preferences?.timezone || 'Asia/Shanghai',
      };
    }

    if (query.shouldIncludeSensitiveData()) {
      result.sensitiveData = await this.getSensitiveData(user.id);
    }

    return result;
  }

  /**
   * 获取敏感数据（仅管理员可访问）
   */
  private async getSensitiveData(userId: string): Promise<any> {
    // 这里可以从安全日志表获取敏感信息
    return {
      loginAttempts: 0,
      lastFailedLoginAt: undefined,
      passwordChangedAt: undefined,
      securityQuestions: [],
    };
  }
}
