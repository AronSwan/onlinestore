// 用途：用户查询应用服务
// 依赖文件：user.repository.interface.ts, get-user-by-id.query.ts, get-users.query.ts
// 作者：后端开发团队
// 时间：2025-09-30

import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { UserAggregate } from '../../domain/aggregates/user.aggregate';
import { UserRepository } from '../../domain/repositories/user.repository.interface';
import { GetUserByIdQuery } from '../queries/get-user-by-id.query';
import { GetUsersQuery } from '../queries/get-users.query';

@Injectable()
export class UserQueryService {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * 根据ID获取用户
   */
  // @QueryHandler(GetUserByIdQuery)
  async getUserById(query: GetUserByIdQuery): Promise<UserAggregate> {
    // 查询验证逻辑
    if (!query.userId) {
      throw new Error('用户ID是必填项');
    }

    const userId = { value: query.userId } as any; // 临时解决方案
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  /**
   * 获取用户列表
   */
  // @QueryHandler(GetUsersQuery)
  async getUsers(query: GetUsersQuery): Promise<{ users: UserAggregate[]; total: number }> {
    // 查询验证逻辑
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;

    return await this.userRepository.findAll({
      page,
      limit,
      search: query.search,
    });
  }

  /**
   * 根据邮箱获取用户
   */
  async getUserByEmail(email: string): Promise<UserAggregate | null> {
    return await this.userRepository.findByEmail(email);
  }

  /**
   * 获取用户统计信息
   */
  async getUserStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
  }> {
    return await this.userRepository.getStatistics();
  }
}
