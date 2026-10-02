/**
 * TypeORM增强用户仓储实现，基于PrestaShop仓储模式
 * 实现用户数据访问逻辑
 *
 * 整改（Blocker 1，2026-10-02）：原实现注入 users/infrastructure/entities/user.entity
 * （@PrimaryGeneratedColumn('uuid')），与认证链路使用的 users/entities/user.entity
 * （@PrimaryGeneratedColumn() 自增 int）同为 @Entity('users') 双注册，导致 SQLite
 * synchronize 建出的 users 表 id 为 varchar NOT NULL，自增 INSERT（register）失败 500。
 * uuid 实体已从 TypeORM 连接中摘除（见 app.module.ts），本仓储统一改用规范 User 实体。
 *
 * 规范 User 实体没有 firstName/lastName/birthday/address/country/city/emailVerified/
 * marketingEmails 等列，字段映射约定：
 *   - username 作为展示名（映射到领域 firstName；LastName 值对象拒绝空串，用 '-' 占位）
 *   - password 列存 bcrypt 哈希（原 uuid 实体的 hashedPassword 列）
 *   - 领域对象生成的 uuid id 落库时丢弃，由自增主键生成（save 返回后回填真实 id）
 *   - 无对应列的查询（国家/生日区间/营销订阅/未验证邮箱）返回空结果，不做伪查询
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository, SelectQueryBuilder } from 'typeorm';
import { EnhancedUsersRepository } from './enhanced-users.repository';
import { EnhancedUser } from '../../domain/entities/enhanced-user.entity';
import {
  SearchUsersQuery,
  SearchUsersResult,
  UserSearchItem,
} from '../../application/queries/search-users.query';
import { User, UserRole } from '../../entities/user.entity';

/** 允许排序的列（仅限规范 User 实体上真实存在的列，防注入/防引用不存在列） */
const SORTABLE_COLUMNS: readonly string[] = [
  'id',
  'email',
  'username',
  'isActive',
  'createdAt',
  'updatedAt',
  'lastLoginAt',
];

@Injectable()
export class TypeOrmEnhancedUsersRepository implements EnhancedUsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 领域层 id 为字符串，规范实体主键为自增 int；非正整数 id 一律视为不存在
   */
  private toNumericId(id: string): number | null {
    const parsed = Number(id);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  async findById(id: string): Promise<EnhancedUser | null> {
    const numericId = this.toNumericId(id);
    if (numericId === null) {
      return null;
    }
    const user = await this.userRepository.findOne({ where: { id: numericId } });
    return user ? this.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<EnhancedUser | null> {
    const user = await this.userRepository.findOne({
      where: [{ email }, { email: (email || '').toLowerCase() }],
    });
    return user ? this.toDomain(user) : null;
  }

  async save(user: EnhancedUser): Promise<EnhancedUser> {
    const persistence = user.toPersistence();
    const entity = this.userRepository.create({
      email: persistence.email,
      // username 唯一约束：取 email 本身保证与唯一 email 一一对应，不产生额外冲突面
      username: persistence.email,
      password: persistence.hashedPassword,
      role: UserRole.USER,
      isActive: persistence.isActive ?? true,
      phone: persistence.phone,
      createdAt: persistence.createdAt ?? new Date(),
      updatedAt: persistence.updatedAt ?? new Date(),
      lastLoginAt: persistence.lastLoginAt,
    });

    // 领域对象生成的是 uuid id；规范实体为自增 int，仅当为有效数字时才保留（更新场景），
    // 新建时不带 id 由数据库生成
    const numericId = this.toNumericId(persistence.id);
    if (numericId !== null) {
      entity.id = numericId;
    }

    const savedEntity = await this.userRepository.save(entity);
    return this.toDomain(savedEntity);
  }

  async update(id: string, updateData: Partial<any>): Promise<void> {
    const numericId = this.toNumericId(id);
    if (numericId === null) {
      return; // 规范实体为 int 主键，非数字 id 无对应行
    }

    // 仅映射规范 User 实体上存在的列；firstName 映射到 username，其余列（lastName/
    // birthday/address 等）在规范实体上不存在，忽略
    const payload: Record<string, unknown> = { updatedAt: new Date() };
    if (updateData.email !== undefined) {
      payload.email = updateData.email;
    }
    if (updateData.hashedPassword !== undefined) {
      payload.password = updateData.hashedPassword;
    }
    if (updateData.firstName !== undefined) {
      payload.username = String(updateData.firstName);
    }
    if (updateData.phone !== undefined) {
      payload.phone = updateData.phone;
    }
    if (updateData.isActive !== undefined) {
      payload.isActive = updateData.isActive;
    }

    await this.userRepository.update(numericId, payload);
  }

  async delete(id: string): Promise<void> {
    const numericId = this.toNumericId(id);
    if (numericId === null) {
      return;
    }
    await this.userRepository.delete(numericId);
  }

  async search(query: SearchUsersQuery): Promise<SearchUsersResult> {
    const queryBuilder = this.createSearchQueryBuilder(query);

    // 获取总数
    const total = await queryBuilder.getCount();

    // 排序列必须在规范实体上真实存在
    const sortBy = SORTABLE_COLUMNS.includes(query.sortBy) ? query.sortBy : 'createdAt';
    const sortDirection = query.sortDirection?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // 应用分页和排序
    const users = await queryBuilder
      .orderBy(`user.${sortBy}`, sortDirection as 'ASC' | 'DESC')
      .skip(query.getOffset())
      .take(query.limit)
      .getMany();

    // 转换为搜索结果格式
    const userItems: UserSearchItem[] = users.map(user => ({
      id: String(user.id),
      email: user.email,
      firstName: user.username,
      lastName: '',
      isActive: user.isActive,
      // 规范实体无邮箱验证状态列；能进入 users 表即视为已注册用户
      emailVerified: true,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    }));

    const totalPages = Math.ceil(total / (query.limit || 20));
    const currentPage = query.page || 1;

    return {
      users: userItems,
      total,
      page: currentPage,
      limit: query.limit || 20,
      totalPages,
    };
  }

  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email });

    const excludeId = excludeUserId !== undefined ? this.toNumericId(excludeUserId) : null;
    if (excludeId !== null) {
      queryBuilder.andWhere('user.id != :excludeId', { excludeId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  async count(): Promise<number> {
    return await this.userRepository.count();
  }

  async countActive(): Promise<number> {
    return await this.userRepository.count({ where: { isActive: true } });
  }

  async bulkUpdateStatus(userIds: string[], isActive: boolean): Promise<void> {
    const numericIds = (userIds || [])
      .map(id => this.toNumericId(id))
      .filter((value): value is number => value !== null);

    if (numericIds.length === 0) {
      return;
    }

    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ isActive, updatedAt: new Date() })
      .whereInIds(numericIds)
      .execute();
  }

  async findRecentlyRegistered(limit: number): Promise<EnhancedUser[]> {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return users.map(user => this.toDomain(user));
  }

  async findRecentlyLoggedIn(limit: number): Promise<EnhancedUser[]> {
    const users = await this.userRepository.find({
      where: { lastLoginAt: Not(IsNull()) },
      order: { lastLoginAt: 'DESC' },
      take: limit,
    });
    return users.map(user => this.toDomain(user));
  }

  async findByCountry(_country: string, _limit?: number): Promise<EnhancedUser[]> {
    // 规范 User 实体没有 country 列（原 uuid 实体专属），返回空结果
    return [];
  }

  async findByBirthdayRange(_startDate: Date, _endDate: Date): Promise<EnhancedUser[]> {
    // 规范 User 实体没有 birthday 列（原 uuid 实体专属），返回空结果
    return [];
  }

  async findMarketingSubscribers(): Promise<EnhancedUser[]> {
    // 规范 User 实体没有 marketingEmails/emailVerified 列（原 uuid 实体专属），返回空结果
    return [];
  }

  async findUnverifiedUsers(_olderThanDays?: number): Promise<EnhancedUser[]> {
    // 规范 User 实体没有 emailVerified 列（原 uuid 实体专属），返回空结果
    return [];
  }

  /**
   * 创建搜索查询构建器（仅使用规范 User 实体上存在的列）
   */
  private createSearchQueryBuilder(query: SearchUsersQuery): SelectQueryBuilder<User> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // 全文搜索：username/email LIKE（原实现搜索 firstName/lastName/email）
    if (query.searchTerm) {
      queryBuilder.where(
        '(LOWER(user.username) LIKE LOWER(:searchTerm) OR LOWER(user.email) LIKE LOWER(:searchTerm))',
        { searchTerm: `%${query.searchTerm}%` },
      );
    }

    // 应用过滤器：emailVerified/country/city 无对应列，忽略
    if (query.isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive: query.isActive });
    }
    if (query.createdAfter) {
      queryBuilder.andWhere('user.createdAt >= :createdAfter', {
        createdAfter: query.createdAfter,
      });
    }
    if (query.createdBefore) {
      queryBuilder.andWhere('user.createdAt <= :createdBefore', {
        createdBefore: query.createdBefore,
      });
    }

    return queryBuilder;
  }

  /**
   * 将规范实体转换为领域对象
   */
  private toDomain(entity: User): EnhancedUser {
    return EnhancedUser.fromPersistence({
      id: String(entity.id),
      email: entity.email,
      // 规范实体以 username 作展示名；LastName 值对象拒绝空串，用 '-' 占位
      firstName: entity.username || entity.email.split('@')[0],
      lastName: '-',
      birthday: '0000-00-00',
      hashedPassword: entity.password,
      phone: entity.phone,
      address: undefined,
      preferences: {
        newsletterSubscription: false,
        marketingEmails: false,
        preferredLanguage: 'en',
        timezone: 'UTC',
      },
      isActive: entity.isActive,
      emailVerified: true,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      lastLoginAt: entity.lastLoginAt,
    });
  }
}
