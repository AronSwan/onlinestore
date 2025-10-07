// 用途：TypeORM客户档案实体（基础设施层）
// 依赖文件：无
// 作者：后端开发团队
// 时间：2025-09-30

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
import { UserEntity } from './user.entity';

export enum CustomerLevel {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
}

@Entity('customer_profiles')
export class CustomerProfileEntity {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: '客户档案ID' })
  id: number;

  @Column({ type: 'simple-enum', enum: CustomerLevel, default: CustomerLevel.BRONZE })
  @ApiProperty({ description: '客户等级', enum: CustomerLevel })
  level: CustomerLevel;

  @Column({ default: 0 })
  @ApiProperty({ description: '积分余额' })
  points: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  @ApiProperty({ description: '总消费金额' })
  totalSpent: number;

  @Column({ default: 0 })
  @ApiProperty({ description: '订单总数' })
  totalOrders: number;

  @Column({ default: 0 })
  @ApiProperty({ description: '成功订单数' })
  successfulOrders: number;

  @Column({ default: 0 })
  @ApiProperty({ description: '退货订单数' })
  returnedOrders: number;

  @Column({ nullable: true })
  @ApiProperty({ description: '首次购买时间' })
  firstPurchaseAt: Date;

  @Column({ nullable: true })
  @ApiProperty({ description: '最后购买时间' })
  lastPurchaseAt: Date;

  @Column({ default: 0 })
  @ApiProperty({ description: '累计登录天数' })
  loginDays: number;

  @Column({ nullable: true })
  @ApiProperty({ description: '最近登录时间' })
  lastLoginAt: Date;

  @Column({ type: 'simple-array', nullable: true })
  @ApiProperty({ description: '客户标签' })
  tags: string[];

  @Column({ type: 'simple-json', nullable: true })
  @ApiProperty({ description: '偏好设置' })
  preferences: Record<string, any>;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  @ApiProperty({ description: '平均评分' })
  averageRating: string;

  @Column({ default: 0 })
  @ApiProperty({ description: '评论总数' })
  reviewCount: number;

  @Column({ default: 0 })
  @ApiProperty({ description: '收藏商品数' })
  favoriteCount: number;

  @Column({ default: 0 })
  @ApiProperty({ description: '购物车商品数' })
  cartItemCount: number;

  @CreateDateColumn()
  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @OneToOne(() => UserEntity, user => user.customerProfile)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ unique: true })
  userId: number;
}
