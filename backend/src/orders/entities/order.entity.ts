// 用途：订单实体定义（TypeORM）
// 依赖文件：order-item.entity.ts, users 模块
// 作者：后端开发团队
// 时间：2025-09-30

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';
// 关联用户实体必须使用已在连接中注册的 users/entities/user.entity（users/entities glob）。
// 不能指向 users/infrastructure/persistence/typeorm/user.entity：该目录为避免同表多实体
// 冲突未在 app.module 注册，指向它会导致 "Entity metadata for Order#user was not found"。
import { User } from '../../users/entities/user.entity';

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column('int', { name: 'user_id' })
  userId: number;

  @Column({ name: 'order_number', unique: true })
  orderNumber: string;

  @Column('decimal', { name: 'total_amount', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'simple-enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({
    name: 'payment_status',
    type: 'simple-enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @OneToMany(() => OrderItem, item => item.order, { cascade: true })
  items: OrderItem[];

  @Column({ name: 'shipping_address', nullable: true })
  shippingAddress?: string;

  @Column({ name: 'recipient_name', nullable: true })
  recipientName?: string;

  @Column({ name: 'recipient_phone', nullable: true })
  recipientPhone?: string;

  @Column({ name: 'payment_method', nullable: true })
  paymentMethod?: string;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'shipped_at', type: 'datetime', nullable: true })
  shippedAt?: Date;

  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt?: Date;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt?: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
