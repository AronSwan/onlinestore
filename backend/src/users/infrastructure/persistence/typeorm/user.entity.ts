// 用途：TypeORM用户实体（基础设施层）
// 依赖文件：无
// 作者：后端开发团队
// 时间：2025-09-30

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
// import { Order } from '../../../orders/entities/order.entity';
// import { UserRoleEntity } from '../../../auth/rbac/entities/user-role.entity';
import { AddressEntity } from './address.entity';
import { CustomerProfileEntity } from './customer-profile.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: '用户ID' })
  id: number;

  @Column({ unique: true })
  @Index()
  @ApiProperty({ description: '邮箱地址' })
  email: string;

  @Column()
  @ApiProperty({ description: '密码（加密后）' })
  password: string;

  @Column({ unique: true })
  @Index()
  @ApiProperty({ description: '用户名' })
  username: string;

  @Column({ type: 'simple-enum', enum: UserRole, default: UserRole.USER })
  @ApiProperty({ description: '用户角色', enum: UserRole })
  role: UserRole;

  @Column({ default: true })
  @ApiProperty({ description: '是否激活' })
  isActive: boolean;

  @Column({ nullable: true })
  @ApiProperty({ description: '头像URL' })
  avatar: string;

  @Column({ nullable: true })
  @ApiProperty({ description: '电话号码' })
  phone: string;

  @Column({ nullable: true })
  @ApiProperty({ description: 'Casdoor用户ID', required: false })
  casdoorId: string;

  @CreateDateColumn()
  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @Column({ nullable: true })
  @ApiProperty({ description: '最后登录时间' })
  lastLoginAt: Date;

  @Column({ default: 0 })
  @ApiProperty({ description: '登录次数' })
  loginCount: number;

  @Column({ default: 0 })
  @ApiProperty({ description: '登录失败次数' })
  failedLoginAttempts: number;

  @Column({ nullable: true })
  @ApiProperty({ description: '最后登录失败时间' })
  lastFailedLoginAt: Date;

  @Column({ nullable: true })
  @ApiProperty({ description: '账户锁定截止时间' })
  accountLockedUntil: Date;

  // @OneToMany(() => Order, order => (order as any).user)
  // @ApiProperty({ description: '用户订单' })
  // orders: Order[];

  // @OneToMany(() => UserRoleEntity, userRole => (userRole as any).user)
  // @ApiProperty({ description: '用户角色关联' })
  // userRoles: UserRoleEntity[];

  @OneToMany(() => AddressEntity, address => address.user)
  @ApiProperty({ description: '用户地址列表' })
  addresses: AddressEntity[];

  @OneToOne(() => CustomerProfileEntity, profile => profile.user, { cascade: true })
  @JoinColumn({ name: 'customerProfileId' })
  @ApiProperty({ description: '客户档案' })
  customerProfile: CustomerProfileEntity;
}
