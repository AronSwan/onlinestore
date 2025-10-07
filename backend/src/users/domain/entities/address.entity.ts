// 用途：用户地址实体类，管理用户配送地址
// 依赖文件：user.entity.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:30:00

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
import { UserEntity } from '../../infrastructure/persistence/typeorm/user.entity';

export enum AddressType {
  SHIPPING = 'shipping',
  BILLING = 'billing',
  BOTH = 'both',
}

@Entity('user_addresses')
export class Address {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: '地址ID' })
  id: number;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  @ApiProperty({ description: '所属用户' })
  user: UserEntity;

  @Column()
  @ApiProperty({ description: '用户ID' })
  userId: number;

  @Column({ type: 'simple-enum', enum: AddressType, default: AddressType.BOTH })
  @ApiProperty({ description: '地址类型', enum: AddressType })
  type: AddressType;

  @Column({ default: false })
  @ApiProperty({ description: '是否默认地址' })
  isDefault: boolean;

  @Column()
  @ApiProperty({ description: '收货人姓名' })
  recipientName: string;

  @Column()
  @ApiProperty({ description: '联系电话' })
  phone: string;

  @Column()
  @ApiProperty({ description: '省份' })
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

  @CreateDateColumn()
  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}
