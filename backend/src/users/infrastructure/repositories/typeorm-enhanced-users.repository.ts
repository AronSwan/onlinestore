/**
 * TypeORM增强用户仓储实现，基于PrestaShop仓储模式
 * 实现用户数据访问逻辑
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { EnhancedUsersRepository } from './enhanced-users.repository';
import { EnhancedUser } from '../../domain/entities/enhanced-user.entity';
import {
  SearchUsersQuery,
  SearchUsersResult,
  UserSearchItem,
} from '../../application/queries/search-users.query';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class TypeOrmEnhancedUsersRepository implements EnhancedUsersRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<EnhancedUser | null> {
    const userEntity = await this.userRepository.findOne({ where: { id } });
    return userEntity ? this.toDomain(userEntity) : null;
  }

  async findByEmail(email: string): Promise<EnhancedUser | null> {
    const userEntity = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
    return userEntity ? this.toDomain(userEntity) : null;
  }

  async save(user: EnhancedUser): Promise<EnhancedUser> {
    const userEntity = this.toEntity(user);
    const savedEntity = await this.userRepository.save(userEntity);
    return this.toDomain(savedEntity);
  }

  async update(id: string, updateData: Partial<any>): Promise<void> {
    await this.userRepository.update(id, {
      ...updateData,
      updatedAt: new Date(),
    });
  }

  async delete(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }

  async search(query: SearchUsersQuery): Promise<SearchUsersResult> {
    const queryBuilder = this.createSearchQueryBuilder(query);

    // 获取总数
    const total = await queryBuilder.getCount();

    // 应用分页和排序
    const users = await queryBuilder
      .orderBy(`user.${query.sortBy}`, query.sortDirection?.toUpperCase() as 'ASC' | 'DESC')
      .skip(query.getOffset())
      .take(query.limit)
      .getMany();

    // 转换为搜索结果格式
    const userItems: UserSearchItem[] = users.map(user => ({
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
        country: user.country,
        city: user.city,
      },
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

    if (excludeUserId) {
      queryBuilder.andWhere('user.id != :excludeUserId', { excludeUserId });
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
    await this.userRepository
      .createQueryBuilder()
      .update(UserEntity)
      .set({ isActive, updatedAt: new Date() })
      .whereInIds(userIds)
      .execute();
  }

  async findRecentlyRegistered(limit: number): Promise<EnhancedUser[]> {
    const entities = await this.userRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return entities.map(entity => this.toDomain(entity));
  }

  async findRecentlyLoggedIn(limit: number): Promise<EnhancedUser[]> {
    const entities = await this.userRepository.find({
      where: { lastLoginAt: { $ne: null } },
      order: { lastLoginAt: 'DESC' },
      take: limit,
    } as any);
    return entities.map(entity => this.toDomain(entity));
  }

  async findByCountry(country: string, limit?: number): Promise<EnhancedUser[]> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.country = :country', { country });

    if (limit) {
      queryBuilder.take(limit);
    }

    const entities = await queryBuilder.getMany();
    return entities.map(entity => this.toDomain(entity));
  }

  async findByBirthdayRange(startDate: Date, endDate: Date): Promise<EnhancedUser[]> {
    const entities = await this.userRepository
      .createQueryBuilder('user')
      .where('user.birthday BETWEEN :startDate AND :endDate', {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      })
      .andWhere('user.birthday != :emptyBirthday', { emptyBirthday: '0000-00-00' })
      .getMany();

    return entities.map(entity => this.toDomain(entity));
  }

  async findMarketingSubscribers(): Promise<EnhancedUser[]> {
    const entities = await this.userRepository.find({
      where: {
        marketingEmails: true,
        isActive: true,
        emailVerified: true,
      },
    });
    return entities.map(entity => this.toDomain(entity));
  }

  async findUnverifiedUsers(olderThanDays?: number): Promise<EnhancedUser[]> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.emailVerified = :verified', { verified: false });

    if (olderThanDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      queryBuilder.andWhere('user.createdAt < :cutoffDate', { cutoffDate });
    }

    const entities = await queryBuilder.getMany();
    return entities.map(entity => this.toDomain(entity));
  }

  /**
   * 创建搜索查询构建器
   */
  private createSearchQueryBuilder(query: SearchUsersQuery): SelectQueryBuilder<UserEntity> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // 全文搜索
    if (query.searchTerm) {
      queryBuilder.where(
        '(LOWER(user.firstName) LIKE LOWER(:searchTerm) OR LOWER(user.lastName) LIKE LOWER(:searchTerm) OR LOWER(user.email) LIKE LOWER(:searchTerm))',
        { searchTerm: `%${query.searchTerm}%` },
      );
    }

    // 应用过滤器
    const filters = query.getFilters();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'createdAfter') {
          queryBuilder.andWhere('user.createdAt >= :createdAfter', { createdAfter: value });
        } else if (key === 'createdBefore') {
          queryBuilder.andWhere('user.createdAt <= :createdBefore', { createdBefore: value });
        } else if (typeof value === 'string') {
          queryBuilder.andWhere(`LOWER(user.${key}) LIKE LOWER(:${key})`, { [key]: `%${value}%` });
        } else {
          queryBuilder.andWhere(`user.${key} = :${key}`, { [key]: value });
        }
      }
    });

    return queryBuilder;
  }

  /**
   * 将实体转换为领域对象
   */
  private toDomain(entity: UserEntity): EnhancedUser {
    return EnhancedUser.fromPersistence({
      id: entity.id,
      email: entity.email,
      firstName: entity.firstName,
      lastName: entity.lastName,
      birthday: entity.birthday,
      hashedPassword: entity.hashedPassword,
      phone: entity.phone,
      address: {
        street: entity.address,
        city: entity.city,
        country: entity.country,
        postalCode: entity.postalCode,
      },
      preferences: {
        newsletterSubscription: entity.newsletterSubscription,
        marketingEmails: entity.marketingEmails,
        preferredLanguage: entity.preferredLanguage,
        timezone: entity.timezone,
      },
      isActive: entity.isActive,
      emailVerified: entity.emailVerified,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      lastLoginAt: entity.lastLoginAt,
    });
  }

  /**
   * 将领域对象转换为实体
   */
  private toEntity(user: EnhancedUser): UserEntity {
    const persistence = user.toPersistence();
    const entity = new UserEntity();

    Object.assign(entity, {
      id: persistence.id,
      email: persistence.email,
      firstName: persistence.firstName,
      lastName: persistence.lastName,
      birthday: persistence.birthday,
      hashedPassword: persistence.hashedPassword,
      phone: persistence.phone,
      address: persistence.address?.street,
      city: persistence.address?.city,
      country: persistence.address?.country,
      postalCode: persistence.address?.postalCode,
      newsletterSubscription: persistence.preferences?.newsletterSubscription,
      marketingEmails: persistence.preferences?.marketingEmails,
      preferredLanguage: persistence.preferences?.preferredLanguage,
      timezone: persistence.preferences?.timezone,
      isActive: persistence.isActive,
      emailVerified: persistence.emailVerified,
      createdAt: persistence.createdAt,
      updatedAt: persistence.updatedAt,
      lastLoginAt: persistence.lastLoginAt,
    });

    return entity;
  }
}
