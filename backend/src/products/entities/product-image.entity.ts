// 用途：产品图片实体类，定义产品图片数据模型
// 依赖文件：product.entity.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:30:00

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Product } from './product.entity';

@Entity('product_images')
export class ProductImage {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: '图片ID' })
  id: number;

  @ManyToOne(() => Product, product => product.images)
  @ApiProperty({ description: '关联产品' })
  product: Product;

  @Column()
  @ApiProperty({ description: '产品ID' })
  productId: number;

  @Column()
  @ApiProperty({ description: '图片URL' })
  url: string;

  @Column({ nullable: true })
  @ApiProperty({ description: '图片标题' })
  title: string;

  @Column({ nullable: true })
  @ApiProperty({ description: '图片描述' })
  description: string;

  @Column({ default: 0 })
  @ApiProperty({ description: '排序权重' })
  sortOrder: number;

  @Column({ default: true })
  @ApiProperty({ description: '是否启用' })
  isActive: boolean;

  @CreateDateColumn()
  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}
