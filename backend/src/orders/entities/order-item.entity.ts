// 用途：订单项实体，表示订单中的单个商品项
// 依赖文件：order.entity.ts, product.entity.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:45:00

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('order_items')
export class OrderItem {
  @ApiProperty({ description: '订单项ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '订单ID' })
  @Column('int')
  orderId: number;

  @ApiProperty({ description: '产品ID' })
  @Column('int')
  productId: number;

  @ApiProperty({ description: '产品数量' })
  @Column('int')
  quantity: number;

  @ApiProperty({ description: '产品单价' })
  @Column('decimal', { precision: 10, scale: 2 })
  unitPrice: number;

  @ApiProperty({ description: '订单项总价' })
  @Column('decimal', { precision: 10, scale: 2 })
  totalPrice: number;

  @ApiProperty({ description: '产品快照信息' })
  @Column('json')
  productSnapshot: {
    name: string;
    image: string;
    specifications: Record<string, any>;
  };

  @ApiProperty({ description: '关联的订单' })
  @ManyToOne(() => Order, order => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ApiProperty({ description: '关联的产品' })
  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'productId' })
  product: Product;
}
