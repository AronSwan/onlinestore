// 用途：客户档案实体类，扩展客户管理功能
// 依赖文件：user.entity.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:32:00

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../entities/user.entity';

export enum CustomerLevel {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
}

@Entity('customer_profiles')
export class CustomerProfile {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: '档案ID' })
  id: number;

  @OneToOne(() => User, user => user.customerProfile)
  @JoinColumn({ name: 'user_id' })
  @ApiProperty({ description: '关联用户' })
  user: User;

  @Column()
  @ApiProperty({ description: '用户ID' })
  userId: number;

  @Column({ type: 'simple-enum', enum: CustomerLevel, default: CustomerLevel.BRONZE })
  @ApiProperty({ description: '客户等级', enum: CustomerLevel })
  level: CustomerLevel;

  @Column({ default: 0 })
  @ApiProperty({ description: '积分余额' })
  points: number;

  @Column({ default: 0 })
  @ApiProperty({ description: '总消费金额' })
  totalSpent: number;

  @Column({ default: 0 })
  @ApiProperty({ description: '订单总数' })
  orderCount: number;

  @Column({ default: 0 })
  @ApiProperty({ description: '退货次数' })
  returnCount: number;

  @Column({ default: 0 })
  @ApiProperty({ description: '评价次数' })
  reviewCount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  @ApiProperty({ description: '平均评分' })
  averageRating: string;

  @Column({ nullable: true })
  @ApiProperty({ description: '首次购买时间' })
  firstPurchaseAt: Date;

  @Column({ nullable: true })
  @ApiProperty({ description: '最近购买时间' })
  lastPurchaseAt: Date;

  @Column({ default: 0 })
  @ApiProperty({ description: '连续登录天数' })
  consecutiveLoginDays: number;

  @Column({ nullable: true })
  @ApiProperty({ description: '客户标签（JSON格式）' })
  tags: string;

  @Column({ nullable: true })
  @ApiProperty({ description: '备注信息' })
  notes: string;

  @CreateDateColumn()
  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}
