/**
 * 用户数据库实体，基于PrestaShop数据模型设计
 * 定义用户表结构和字段约束
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['firstName', 'lastName'])
@Index(['country', 'city'])
@Index(['createdAt'])
@Index(['lastLoginAt'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  firstName: string;

  @Column({ type: 'varchar', length: 255 })
  lastName: string;

  @Column({ type: 'varchar', length: 255 })
  hashedPassword: string;

  @Column({ type: 'date', nullable: true, default: '0000-00-00' })
  birthday: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postalCode: string;

  @Column({ type: 'boolean', default: false })
  newsletterSubscription: boolean;

  @Column({ type: 'boolean', default: false })
  marketingEmails: boolean;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  preferredLanguage: string;

  @Column({ type: 'varchar', length: 50, default: 'UTC' })
  timezone: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * 获取用户全名
   */
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
}
