// 用途：客户管理服务，提供高级客户管理功能
// 依赖文件：user.entity.ts, address.entity.ts, customer-profile.entity.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:35:00

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { UserEntity } from '../../infrastructure/persistence/typeorm/user.entity';
import {
  AddressEntity,
  AddressType,
} from '../../infrastructure/persistence/typeorm/address.entity';
import {
  CustomerProfileEntity,
  CustomerLevel,
} from '../../infrastructure/persistence/typeorm/customer-profile.entity';
import { MonitoringService } from '../../../monitoring/monitoring.service';

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersToday: number;
  newCustomersThisWeek: number;
  customersByLevel: Record<CustomerLevel, number>;
  averageOrderValue: number;
  retentionRate: number;
}

export interface CustomerSearchOptions {
  page: number;
  limit: number;
  search?: string;
  level?: CustomerLevel;
  minSpent?: number;
  maxSpent?: number;
  minOrders?: number;
  maxOrders?: number;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
}

@Injectable()
export class CustomerManagementService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(AddressEntity)
    private readonly addressRepository: Repository<AddressEntity>,
    @InjectRepository(CustomerProfileEntity)
    private readonly profileRepository: Repository<CustomerProfileEntity>,
    private readonly monitoring: MonitoringService,
  ) {}

  /**
   * 获取客户统计信息
   */
  async getCustomerStats(): Promise<CustomerStats> {
    const startDb = process.hrtime.bigint();

    const totalCustomers = await this.userRepository.count();
    const activeCustomers = await this.userRepository.count({
      where: { isActive: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newCustomersToday = await this.userRepository.count({
      where: { createdAt: MoreThanOrEqual(today) },
    });

    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const newCustomersThisWeek = await this.userRepository.count({
      where: { createdAt: MoreThanOrEqual(weekAgo) },
    });

    // 按等级统计客户
    const customersByLevel = await this.profileRepository
      .createQueryBuilder('profile')
      .select('profile.level', 'level')
      .addSelect('COUNT(*)', 'count')
      .groupBy('profile.level')
      .getRawMany();

    const levelStats: Record<CustomerLevel, number> = Object.values(CustomerLevel).reduce(
      (acc, level) => {
        acc[level] = 0;
        return acc;
      },
      {} as Record<CustomerLevel, number>,
    );

    customersByLevel.forEach(stat => {
      const level = stat.level as CustomerLevel;
      levelStats[level] = parseInt(stat.count);
    });

    // 计算平均订单价值
    const avgResult = await this.profileRepository
      .createQueryBuilder('profile')
      .select('AVG(profile.totalSpent / NULLIF(profile.orderCount, 0))', 'avgValue')
      .where('profile.orderCount > 0')
      .getRawOne();

    const averageOrderValue = avgResult?.avgValue || 0;

    // 计算留存率（30天内有购买行为的客户）
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const retainedCustomers = await this.profileRepository.count({
      where: { lastPurchaseAt: MoreThanOrEqual(thirtyDaysAgo) },
    });

    const retentionRate = totalCustomers > 0 ? (retainedCustomers / totalCustomers) * 100 : 0;

    const endDb = process.hrtime.bigint();
    this.monitoring.observeDbQuery('stats', 'customers', Number(endDb - startDb) / 1_000_000_000);

    return {
      totalCustomers,
      activeCustomers,
      newCustomersToday,
      newCustomersThisWeek,
      customersByLevel: levelStats,
      averageOrderValue,
      retentionRate,
    };
  }

  /**
   * 高级客户搜索
   */
  async searchCustomers(
    options: CustomerSearchOptions,
  ): Promise<{ customers: UserEntity[]; total: number }> {
    const {
      page,
      limit,
      search,
      level,
      minSpent,
      maxSpent,
      minOrders,
      maxOrders,
      startDate,
      endDate,
      tags,
    } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.customerProfile', 'profile')
      .leftJoinAndSelect('user.addresses', 'addresses')
      .where('user.isActive = :isActive', { isActive: true });

    // 搜索条件
    if (search) {
      queryBuilder.andWhere(
        '(user.username LIKE :search OR user.email LIKE :search OR user.fullName LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (level) {
      queryBuilder.andWhere('profile.level = :level', { level });
    }

    if (minSpent !== undefined) {
      queryBuilder.andWhere('profile.totalSpent >= :minSpent', { minSpent });
    }

    if (maxSpent !== undefined) {
      queryBuilder.andWhere('profile.totalSpent <= :maxSpent', { maxSpent });
    }

    if (minOrders !== undefined) {
      queryBuilder.andWhere('profile.orderCount >= :minOrders', { minOrders });
    }

    if (maxOrders !== undefined) {
      queryBuilder.andWhere('profile.orderCount <= :maxOrders', { maxOrders });
    }

    if (startDate) {
      queryBuilder.andWhere('user.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('user.createdAt <= :endDate', { endDate });
    }

    if (tags && tags.length > 0) {
      // 简单的标签搜索（JSON字段包含）
      tags.forEach((tag, index) => {
        queryBuilder.andWhere(`profile.tags LIKE :tag${index}`, { [`tag${index}`]: `%${tag}%` });
      });
    }

    const startDb = process.hrtime.bigint();
    const [customers, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('profile.totalSpent', 'DESC')
      .getManyAndCount();
    const endDb = process.hrtime.bigint();
    this.monitoring.observeDbQuery('search', 'customers', Number(endDb - startDb) / 1_000_000_000);

    return { customers, total };
  }

  /**
   * 获取客户完整信息
   */
  async getCustomerDetails(userId: number): Promise<UserEntity> {
    const startDb = process.hrtime.bigint();
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['customerProfile', 'addresses', 'orders'],
    });
    const endDb = process.hrtime.bigint();
    this.monitoring.observeDbQuery('detail', 'customers', Number(endDb - startDb) / 1_000_000_000);

    if (!user) {
      throw new NotFoundException('客户不存在');
    }

    return user;
  }

  /**
   * 更新客户等级
   */
  async updateCustomerLevel(userId: number, level: CustomerLevel): Promise<CustomerProfileEntity> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('客户档案不存在');
    }

    profile.level = level;
    return await this.profileRepository.save(profile);
  }

  /**
   * 添加客户标签
   */
  async addCustomerTag(userId: number, tag: string): Promise<CustomerProfileEntity> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('客户档案不存在');
    }

    let tags: string[] = [];
    if (profile.tags) {
      tags = profile.tags;
    }

    if (!tags.includes(tag)) {
      tags.push(tag);
      profile.tags = tags;
      return await this.profileRepository.save(profile);
    }

    return profile;
  }

  /**
   * 管理客户地址
   */
  async addAddress(userId: number, addressData: Partial<AddressEntity>): Promise<AddressEntity> {
    const address = this.addressRepository.create({
      ...addressData,
      userId,
    });

    // 如果是第一个地址，设为默认地址
    const existingAddresses = await this.addressRepository.count({
      where: { userId },
    });

    if (existingAddresses === 0) {
      address.isDefault = true;
    }

    return await this.addressRepository.save(address);
  }

  /**
   * 设置默认地址
   */
  async setDefaultAddress(userId: number, addressId: number): Promise<void> {
    // 先取消所有默认地址
    await this.addressRepository.update({ userId }, { isDefault: false });

    // 设置新的默认地址
    await this.addressRepository.update({ id: addressId, userId }, { isDefault: true });
  }

  /**
   * 获取客户购买行为分析
   */
  async getCustomerBehavior(userId: number) {
    const profile = await this.profileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('客户档案不存在');
    }

    return {
      totalSpent: profile.totalSpent,
      orderCount: profile.totalOrders,
      averageOrderValue: profile.totalOrders > 0 ? profile.totalSpent / profile.totalOrders : 0,
      lastPurchaseAt: profile.lastPurchaseAt,
      purchaseFrequency: this.calculatePurchaseFrequency(profile),
      customerValue: this.calculateCustomerValue(profile),
    };
  }

  private calculatePurchaseFrequency(profile: CustomerProfileEntity): string {
    if (!profile.firstPurchaseAt || !profile.lastPurchaseAt || profile.totalOrders <= 1) {
      return '新客户';
    }

    const daysSinceFirstPurchase = Math.floor(
      (profile.lastPurchaseAt.getTime() - profile.firstPurchaseAt.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const frequency = daysSinceFirstPurchase / (profile.totalOrders - 1);

    if (frequency <= 7) return '高频购买';
    if (frequency <= 30) return '中频购买';
    return '低频购买';
  }

  private calculateCustomerValue(profile: CustomerProfileEntity): string {
    const avgValue = profile.totalOrders > 0 ? profile.totalSpent / profile.totalOrders : 0;

    if (profile.totalSpent > 10000 || avgValue > 1000) return '高价值客户';
    if (profile.totalSpent > 1000 || avgValue > 100) return '中价值客户';
    return '普通客户';
  }
}
