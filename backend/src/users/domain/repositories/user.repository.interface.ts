// 用途：用户仓储接口
// 依赖文件：user.aggregate.ts, user-id.value-object.ts
// 作者：后端开发团队
// 时间：2025-09-30

import { UserAggregate } from '../aggregates/user.aggregate';
import { UserId } from '../value-objects/user-id.value-object';

export interface UserRepository {
  /**
   * 根据ID查找用户
   */
  findById(id: UserId): Promise<UserAggregate | null>;

  /**
   * 根据邮箱查找用户
   */
  findByEmail(email: string): Promise<UserAggregate | null>;

  /**
   * 根据用户名查找用户
   */
  findByUsername(username: string): Promise<UserAggregate | null>;

  /**
   * 保存用户
   */
  save(user: UserAggregate): Promise<void>;

  /**
   * 删除用户
   */
  delete(user: UserAggregate): Promise<void>;

  /**
   * 检查邮箱是否已存在
   */
  existsByEmail(email: string): Promise<boolean>;

  /**
   * 检查用户名是否已存在
   */
  existsByUsername(username: string): Promise<boolean>;

  /**
   * 获取用户统计信息
   */
  getStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
  }>;

  /**
   * 分页查询用户列表
   */
  findAll(options: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ users: UserAggregate[]; total: number }>;
}
