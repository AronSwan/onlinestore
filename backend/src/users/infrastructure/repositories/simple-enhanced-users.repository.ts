/**
 * 简化版增强用户仓储实现
 * 避免装饰器兼容性问题
 */

import { EnhancedUsersRepository } from './enhanced-users.repository';
import { EnhancedUser } from '../../domain/entities/enhanced-user.entity';
import {
  SearchUsersQuery,
  SearchUsersResult,
  UserSearchItem,
} from '../../application/queries/search-users.query';

export class SimpleEnhancedUsersRepository implements EnhancedUsersRepository {
  private users: Map<string, any> = new Map();

  constructor() {
    // 初始化一些测试数据
    this.initializeTestData();
  }

  async findById(id: string): Promise<EnhancedUser | null> {
    const userData = this.users.get(id);
    return userData ? this.toDomain(userData) : null;
  }

  async findByEmail(email: string): Promise<EnhancedUser | null> {
    const entries = Array.from(this.users.entries());
    for (const [id, userData] of entries) {
      if (userData.email.toLowerCase() === email.toLowerCase()) {
        return this.toDomain(userData);
      }
    }
    return null;
  }

  async save(user: EnhancedUser): Promise<EnhancedUser> {
    const persistence = user.toPersistence();
    this.users.set(persistence.id, {
      ...persistence,
      updatedAt: new Date(),
    });
    return user;
  }

  async update(id: string, updateData: Partial<any>): Promise<void> {
    const existingUser = this.users.get(id);
    if (existingUser) {
      this.users.set(id, {
        ...existingUser,
        ...updateData,
        updatedAt: new Date(),
      });
    }
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id);
  }

  async search(query: SearchUsersQuery): Promise<SearchUsersResult> {
    let filteredUsers = Array.from(this.users.values());

    // 应用搜索条件
    if (query.searchTerm) {
      const searchTerm = query.searchTerm.toLowerCase();
      filteredUsers = filteredUsers.filter(
        user =>
          user.firstName.toLowerCase().includes(searchTerm) ||
          user.lastName.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm),
      );
    }

    // 应用过滤器
    const filters = query.getFilters();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        filteredUsers = filteredUsers.filter(user => {
          if (key === 'createdAfter') {
            return new Date(user.createdAt) >= new Date(value);
          } else if (key === 'createdBefore') {
            return new Date(user.createdAt) <= new Date(value);
          } else {
            return user[key] === value;
          }
        });
      }
    });

    // 排序
    const sortOptions = query.getSortOptions();
    filteredUsers.sort((a, b) => {
      const aValue = a[sortOptions.field];
      const bValue = b[sortOptions.field];

      if (sortOptions.direction === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    // 分页
    const total = filteredUsers.length;
    const offset = query.getOffset();
    const paginatedUsers = filteredUsers.slice(offset, offset + query.limit);

    // 转换为搜索结果格式
    const userItems: UserSearchItem[] = paginatedUsers.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      address: {
        country: user.address?.country,
        city: user.address?.city,
      },
    }));

    const totalPages = Math.ceil(total / query.limit);

    return {
      users: userItems,
      total,
      page: query.page,
      limit: query.limit,
      totalPages,
    };
  }

  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const entries = Array.from(this.users.entries());
    for (const [id, userData] of entries) {
      if (userData.email.toLowerCase() === email.toLowerCase() && id !== excludeUserId) {
        return true;
      }
    }
    return false;
  }

  async count(): Promise<number> {
    return this.users.size;
  }

  async countActive(): Promise<number> {
    return Array.from(this.users.values()).filter(user => user.isActive).length;
  }

  async bulkUpdateStatus(userIds: string[], isActive: boolean): Promise<void> {
    userIds.forEach(id => {
      const user = this.users.get(id);
      if (user) {
        this.users.set(id, {
          ...user,
          isActive,
          updatedAt: new Date(),
        });
      }
    });
  }

  async findRecentlyRegistered(limit: number): Promise<EnhancedUser[]> {
    const sortedUsers = Array.from(this.users.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return sortedUsers.map(user => this.toDomain(user));
  }

  async findRecentlyLoggedIn(limit: number): Promise<EnhancedUser[]> {
    const sortedUsers = Array.from(this.users.values())
      .filter(user => user.lastLoginAt)
      .sort((a, b) => new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime())
      .slice(0, limit);

    return sortedUsers.map(user => this.toDomain(user));
  }

  async findByCountry(country: string, limit?: number): Promise<EnhancedUser[]> {
    let filteredUsers = Array.from(this.users.values()).filter(
      user => user.address?.country === country,
    );

    if (limit) {
      filteredUsers = filteredUsers.slice(0, limit);
    }

    return filteredUsers.map(user => this.toDomain(user));
  }

  async findByBirthdayRange(startDate: Date, endDate: Date): Promise<EnhancedUser[]> {
    const filteredUsers = Array.from(this.users.values()).filter(user => {
      if (!user.birthday || user.birthday === '0000-00-00') return false;
      const userBirthday = new Date(user.birthday);
      return userBirthday >= startDate && userBirthday <= endDate;
    });

    return filteredUsers.map(user => this.toDomain(user));
  }

  async findMarketingSubscribers(): Promise<EnhancedUser[]> {
    const filteredUsers = Array.from(this.users.values()).filter(
      user => user.preferences?.marketingEmails && user.isActive && user.emailVerified,
    );

    return filteredUsers.map(user => this.toDomain(user));
  }

  async findUnverifiedUsers(olderThanDays?: number): Promise<EnhancedUser[]> {
    let filteredUsers = Array.from(this.users.values()).filter(user => !user.emailVerified);

    if (olderThanDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      filteredUsers = filteredUsers.filter(user => new Date(user.createdAt) < cutoffDate);
    }

    return filteredUsers.map(user => this.toDomain(user));
  }

  /**
   * 将持久化数据转换为领域对象
   */
  private toDomain(userData: any): EnhancedUser {
    return EnhancedUser.fromPersistence(userData);
  }

  /**
   * 初始化测试数据
   */
  private initializeTestData(): void {
    const testUsers = [
      {
        id: '1',
        email: 'zhang.san@example.com',
        firstName: '张',
        lastName: '三',
        birthday: '1990-01-01',
        hashedPassword: '$2b$10$hashedpassword1',
        phone: '13800138001',
        address: {
          street: '北京市朝阳区',
          city: '北京',
          country: 'CN',
          postalCode: '100000',
        },
        preferences: {
          newsletterSubscription: true,
          marketingEmails: true,
          preferredLanguage: 'zh-CN',
          timezone: 'Asia/Shanghai',
        },
        isActive: true,
        emailVerified: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-12-01'),
      },
      {
        id: '2',
        email: 'li.si@example.com',
        firstName: '李',
        lastName: '四',
        birthday: '1985-05-15',
        hashedPassword: '$2b$10$hashedpassword2',
        phone: '13800138002',
        address: {
          street: '上海市浦东新区',
          city: '上海',
          country: 'CN',
          postalCode: '200000',
        },
        preferences: {
          newsletterSubscription: false,
          marketingEmails: false,
          preferredLanguage: 'zh-CN',
          timezone: 'Asia/Shanghai',
        },
        isActive: true,
        emailVerified: false,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
        lastLoginAt: null,
      },
    ];

    testUsers.forEach(user => {
      this.users.set(user.id, user);
    });
  }
}
