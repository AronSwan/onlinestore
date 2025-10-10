// 用途：用户服务，处理用户相关的业务逻辑
// 依赖文件：user.entity.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:21:30

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { MonitoringService } from '../monitoring/monitoring.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly monitoring: MonitoringService,
  ) {}

  /**
   * 创建用户
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // 检查邮箱是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException();
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return await this.userRepository.save(user);
  }

  /**
   * 根据ID查找用户
   */
  async findById(id: number): Promise<User | null> {
    const startDb = process.hrtime.bigint();
    const result = await this.userRepository.findOne({ where: { id } });
    const endDb = process.hrtime.bigint();
    this.monitoring.observeDbQuery('detail', 'users', Number(endDb - startDb) / 1_000_000_000);
    return result;
  }

  /**
   * 根据ID查找用户（控制器使用）
   */
  async findOne(id: number): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | null> {
    const startDb = process.hrtime.bigint();
    const result = await this.userRepository.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'password',
        'username',
        'role',
        'isActive',
        'avatar',
        'phone',
        'createdAt',
      ],
    });
    const endDb = process.hrtime.bigint();
    this.monitoring.observeDbQuery('detail', 'users', Number(endDb - startDb) / 1_000_000_000);
    return result;
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string): Promise<User | null> {
    const startDb = process.hrtime.bigint();
    const result = await this.userRepository.findOne({ where: { username } });
    const endDb = process.hrtime.bigint();
    this.monitoring.observeDbQuery('detail', 'users', Number(endDb - startDb) / 1_000_000_000);
    return result;
  }

  /**
   * 获取所有用户（分页）
   */
  async findAll(options: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ users: User[]; total: number }> {
    const { page, limit, search } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.where('user.username LIKE :search OR user.email LIKE :search', {
        search: `%${search}%`,
      });
    }

    const startDb = process.hrtime.bigint();
    const [users, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();
    const endDb = process.hrtime.bigint();
    this.monitoring.observeDbQuery('list', 'users', Number(endDb - startDb) / 1_000_000_000);

    return { users, total };
  }

  /**
   * 更新用户信息
   */
  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException();
    }

    // 如果更新密码，需要加密
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    await this.userRepository.update(id, updateUserDto);
    return (await this.findById(id))!;
  }

  /**
   * 删除用户
   */
  async delete(id: number): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException();
    }

    await this.userRepository.delete(id);
  }

  /**
   * 删除用户（控制器使用）
   */
  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  /**
   * 更新用户登录信息
   */
  async updateLoginInfo(id: number): Promise<void> {
    await this.userRepository.update(id, {
      lastLoginAt: new Date(),
      loginCount: () => 'login_count + 1',
    });
  }

  /**
   * 检查邮箱是否已存在
   */
  async isEmailExists(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return !!user;
  }

  /**
   * 检查用户名是否已存在
   */
  async isUsernameExists(username: string): Promise<boolean> {
    const user = await this.findByUsername(username);
    return !!user;
  }

  /**
   * 获取用户统计信息
   */
  async getStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
  }> {
    const startDb = process.hrtime.bigint();
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({ where: { isActive: true } });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newUsersToday = await this.userRepository
      .createQueryBuilder('user')
      .where('user.createdAt >= :today', { today })
      .getCount();
    const endDb = process.hrtime.bigint();
    this.monitoring.observeDbQuery('aggregation', 'users', Number(endDb - startDb) / 1_000_000_000);

    return {
      totalUsers,
      activeUsers,
      newUsersToday,
    };
  }

  /**
   * 获取用户统计信息（控制器使用）
   */
  async getUserStats() {
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({
      where: { isActive: true },
    });

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
    };
  }

  /**
   * 验证用户登录
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }
}
