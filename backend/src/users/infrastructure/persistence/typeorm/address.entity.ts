// 用途：TypeORM地址实体（基础设施层）
// 依赖文件：无
// 作者：后端开发团队
// 时间：2025-09-30

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from './user.entity';

export enum AddressType {
  HOME = 'home',
  WORK = 'work',
  BILLING = 'billing',
  SHIPPING = 'shipping',
}

@Entity('user_addresses')
export class AddressEntity {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: '地址ID' })
  id: number;

  @Column({ type: 'simple-enum', enum: AddressType, default: AddressType.HOME })
  @ApiProperty({ description: '地址类型', enum: AddressType })
  type: AddressType;

  @Column({ default: false })
  @ApiProperty({ description: '是否默认地址' })
  isDefault: boolean;

  @Column()
  @ApiProperty({ description: '收件人姓名' })
  recipientName: string;

  @Column()
  @ApiProperty({ description: '联系电话' })
  phone: string;

  @Column()
  @ApiProperty({ description: '省份/州' })
  province: string;

  @Column()
  @ApiProperty({ description: '城市' })
  city: string;

  @Column()
  @ApiProperty({ description: '区县' })
  district: string;

  @Column()
  @ApiProperty({ description: '详细地址' })
  detail: string;

  @Column({ nullable: true })
  @ApiProperty({ description: '邮政编码' })
  postalCode: string;

  @Column({ default: true })
  @ApiProperty({ description: '是否有效' })
  isActive: boolean;

  @CreateDateColumn()
  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ManyToOne(() => UserEntity, user => user.addresses)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column('int')
  userId: number;
}
