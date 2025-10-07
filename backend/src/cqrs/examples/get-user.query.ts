// 用途：获取用户查询示例
// 作者：后端开发团队
// 时间：2025-10-05

import { QueryBase } from '../queries/query.base';

/**
 * 获取用户查询
 */
export class GetUserQuery extends QueryBase {
  /**
   * 用户ID
   */
  public readonly userId: string;

  /**
   * 是否包含角色信息
   */
  public readonly includeRoles: boolean;

  /**
   * 是否包含权限信息
   */
  public readonly includePermissions: boolean;

  constructor(data: { userId: string; includeRoles?: boolean; includePermissions?: boolean }) {
    super({
      cacheKey: `user_${data.userId}_${data.includeRoles ? 'withRoles' : 'noRoles'}_${data.includePermissions ? 'withPermissions' : 'noPermissions'}`,
      cacheTime: 300, // 5分钟缓存
      staleTime: 60, // 1分钟后数据过期
    });

    this.userId = data.userId;
    this.includeRoles = data.includeRoles ?? false;
    this.includePermissions = data.includePermissions ?? false;
  }

  protected getData(): Record<string, any> {
    return {
      userId: this.userId,
      includeRoles: this.includeRoles,
      includePermissions: this.includePermissions,
    };
  }
}

/**
 * 获取用户查询结果
 */
export interface GetUserResult {
  /**
   * 用户ID
   */
  userId: string;

  /**
   * 用户名
   */
  username: string;

  /**
   * 邮箱
   */
  email: string;

  /**
   * 名字
   */
  firstName: string;

  /**
   * 姓氏
   */
  lastName: string;

  /**
   * 是否激活
   */
  isActive: boolean;

  /**
   * 创建时间
   */
  createdAt: Date;

  /**
   * 更新时间
   */
  updatedAt: Date;

  /**
   * 角色列表（如果请求）
   */
  roles?: Array<{
    roleId: string;
    name: string;
    description: string;
  }>;

  /**
   * 权限列表（如果请求）
   */
  permissions?: Array<{
    permissionId: string;
    name: string;
    resource: string;
    action: string;
  }>;
}

/**
 * 获取用户列表查询
 */
export class GetUserListQuery extends QueryBase {
  /**
   * 页码
   */
  public readonly page: number;

  /**
   * 每页大小
   */
  public readonly pageSize: number;

  /**
   * 搜索关键词
   */
  public readonly search?: string;

  /**
   * 角色过滤
   */
  public readonly roleId?: string;

  /**
   * 是否激活过滤
   */
  public readonly isActive?: boolean;

  /**
   * 排序字段
   */
  public readonly sortBy?: string;

  /**
   * 排序方向
   */
  public readonly sortOrder?: 'asc' | 'desc';

  constructor(data: {
    page: number;
    pageSize: number;
    search?: string;
    roleId?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    super({
      cacheKey: `user_list_${data.page}_${data.pageSize}_${data.search || 'noSearch'}_${data.roleId || 'noRole'}_${data.isActive !== undefined ? data.isActive : 'noActiveFilter'}_${data.sortBy || 'noSort'}_${data.sortOrder || 'asc'}`,
      cacheTime: 180, // 3分钟缓存
      staleTime: 30, // 30秒后数据过期
    });

    this.page = data.page;
    this.pageSize = data.pageSize;
    this.search = data.search;
    this.roleId = data.roleId;
    this.isActive = data.isActive;
    this.sortBy = data.sortBy;
    this.sortOrder = data.sortOrder;
  }

  protected getData(): Record<string, any> {
    return {
      page: this.page,
      pageSize: this.pageSize,
      search: this.search,
      roleId: this.roleId,
      isActive: this.isActive,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
    };
  }
}

/**
 * 获取用户列表查询结果
 */
export interface GetUserListResult {
  /**
   * 用户列表
   */
  users: Array<{
    userId: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;

  /**
   * 总记录数
   */
  total: number;

  /**
   * 当前页码
   */
  page: number;

  /**
   * 每页大小
   */
  pageSize: number;

  /**
   * 总页数
   */
  totalPages: number;

  /**
   * 是否有下一页
   */
  hasNext: boolean;

  /**
   * 是否有上一页
   */
  hasPrevious: boolean;
}
