/**
 * 增强的用户仓储接口，基于PrestaShop仓储模式
 * 定义用户数据访问的契约
 */

import { EnhancedUser } from '../../domain/entities/enhanced-user.entity';
import { SearchUsersQuery, SearchUsersResult } from '../../application/queries/search-users.query';

export interface EnhancedUsersRepository {
  /**
   * 根据ID查找用户
   */
  findById(id: string): Promise<EnhancedUser | null>;

  /**
   * 根据邮箱查找用户
   */
  findByEmail(email: string): Promise<EnhancedUser | null>;

  /**
   * 保存用户
   */
  save(user: EnhancedUser): Promise<EnhancedUser>;

  /**
   * 更新用户
   */
  update(id: string, updateData: Partial<any>): Promise<void>;

  /**
   * 删除用户
   */
  delete(id: string): Promise<void>;

  /**
   * 搜索用户
   */
  search(query: SearchUsersQuery): Promise<SearchUsersResult>;

  /**
   * 检查邮箱是否存在
   */
  emailExists(email: string, excludeUserId?: string): Promise<boolean>;

  /**
   * 获取用户总数
   */
  count(): Promise<number>;

  /**
   * 获取活跃用户数
   */
  countActive(): Promise<number>;

  /**
   * 批量更新用户状态
   */
  bulkUpdateStatus(userIds: string[], isActive: boolean): Promise<void>;

  /**
   * 获取最近注册的用户
   */
  findRecentlyRegistered(limit: number): Promise<EnhancedUser[]>;

  /**
   * 获取最近登录的用户
   */
  findRecentlyLoggedIn(limit: number): Promise<EnhancedUser[]>;

  /**
   * 根据国家查找用户
   */
  findByCountry(country: string, limit?: number): Promise<EnhancedUser[]>;

  /**
   * 查找生日在指定日期范围内的用户
   */
  findByBirthdayRange(startDate: Date, endDate: Date): Promise<EnhancedUser[]>;

  /**
   * 查找订阅了营销邮件的用户
   */
  findMarketingSubscribers(): Promise<EnhancedUser[]>;

  /**
   * 查找未验证邮箱的用户
   */
  findUnverifiedUsers(olderThanDays?: number): Promise<EnhancedUser[]>;
}
