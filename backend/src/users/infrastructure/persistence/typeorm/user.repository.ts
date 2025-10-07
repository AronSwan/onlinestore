// 用途：TypeORM用户仓储实现
// 依赖文件：user.repository.interface.ts, user.entity.ts
// 作者：后端开发团队
// 时间：2025-09-30

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { UserAggregate } from '../../../domain/aggregates/user.aggregate';
import { UserRepository } from '../../../domain/repositories/user.repository.interface';
import { UserId } from '../../../domain/value-objects/user-id.value-object';
import { UserEntity } from './user.entity';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  /**
   * 根据ID查找用户
   */
  async findById(id: UserId): Promise<UserAggregate | null> {
    const userEntity = await this.userRepository.findOne({
      where: { id: id.value },
    });

    if (!userEntity) {
      return null;
    }

    return this.toDomain(userEntity);
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<UserAggregate | null> {
    const userEntity = await this.userRepository.findOne({
      where: { email },
    });

    if (!userEntity) {
      return null;
    }

    return this.toDomain(userEntity);
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string): Promise<UserAggregate | null> {
    const userEntity = await this.userRepository.findOne({
      where: { username },
    });

    if (!userEntity) {
      return null;
    }

    return this.toDomain(userEntity);
  }

  /**
   * 保存用户
   */
  async save(user: UserAggregate): Promise<void> {
    const userEntity = this.toPersistence(user);

    if (user.getId().value === 0) {
      // 新用户
      const savedEntity = await this.userRepository.save(userEntity);
      // 更新聚合根的ID
      user['id'] = UserId.create(savedEntity.id);
    } else {
      // 更新现有用户
      await this.userRepository.update(user.getId().value, userEntity);
    }
  }

  /**
   * 删除用户
   */
  async delete(user: UserAggregate): Promise<void> {
    await this.userRepository.delete(user.getId().value);
  }

  /**
   * 检查邮箱是否已存在
   */
  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.userRepository.count({
      where: { email },
    });
    return count > 0;
  }

  /**
   * 检查用户名是否已存在
   */
  async existsByUsername(username: string): Promise<boolean> {
    const count = await this.userRepository.count({
      where: { username },
    });
    return count > 0;
  }

  /**
   * 获取用户统计信息
   */
  async getStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
  }> {
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({
      where: { isActive: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newUsersToday = await this.userRepository
      .createQueryBuilder('user')
      .where('user.createdAt >= :today', { today })
      .getCount();

    return {
      totalUsers,
      activeUsers,
      newUsersToday,
    };
  }

  /**
   * 分页查询用户列表
   */
  async findAll(options: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ users: UserAggregate[]; total: number }> {
    const { page, limit, search } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.where('user.username LIKE :search OR user.email LIKE :search', {
        search: `%${search}%`,
      });
    }

    const [userEntities, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();

    const users = userEntities.map(entity => this.toDomain(entity));

    return { users, total };
  }

  /**
   * 将领域对象转换为持久化对象
   */
  private toPersistence(user: UserAggregate): UserEntity {
    const entity = new UserEntity();

    if (user.getId().value !== 0) {
      entity.id = user.getId().value;
    }

    entity.email = user.getEmail();
    entity.username = user.getUsername();
    entity.avatar = user.getAvatar() || '';
    entity.phone = user.getPhone() || '';
    entity.isActive = user.isActive();
    entity.password = user['security'].getPasswordHash();
    entity.loginCount = user.getLoginStats().loginCount;
    entity.lastLoginAt = user.getLoginStats().lastLogin || new Date(0);
    entity.createdAt = user.getCreatedAt();
    entity.updatedAt = user.getUpdatedAt();

    return entity;
  }

  /**
   * 将持久化对象转换为领域对象
   */
  private toDomain(entity: UserEntity): UserAggregate {
    return UserAggregate.reconstitute(
      entity.id,
      entity.email,
      entity.username,
      entity.password,
      entity.isActive,
      entity.avatar,
      entity.phone,
      entity.loginCount,
      entity.lastLoginAt,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
