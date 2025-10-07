// 用途：用户实体类，定义用户数据模型
// 依赖文件：无
// 作者：后端开发团队
// 时间：2025-09-26 18:21:00

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Order } from '../../orders/entities/order.entity';
import { UserRoleEntity } from '../../auth/rbac/entities/user-role.entity';
import { Address } from '../domain/entities/address.entity';
import { CustomerProfile } from '../domain/entities/customer-profile.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: '用户ID' })
  id: number;

  @Column({ unique: true })
  @Index()
  @ApiProperty({ description: '邮箱地址' })
  email: string;

  @Column('varchar', { length: 255 })
  @Exclude()
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

  @OneToMany(() => Order, order => (order as any).user)
  @ApiProperty({ description: '用户订单' })
  orders: Order[];

  @OneToMany(() => UserRoleEntity, userRole => userRole.user)
  @ApiProperty({ description: '用户角色关联' })
  userRoles: UserRoleEntity[];

  @OneToMany(() => Address, address => address.user)
  @ApiProperty({ description: '用户地址列表' })
  addresses: Address[];

  @OneToOne(() => CustomerProfile, profile => profile.user)
  @ApiProperty({ description: '客户档案' })
  customerProfile: CustomerProfile;
}
