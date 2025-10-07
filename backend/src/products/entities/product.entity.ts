// 用途：产品实体类，定义商品数据模型
// 依赖文件：category.entity.ts, product-image.entity.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:22:30

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  VersionColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Category } from './category.entity';
import { ProductImage } from './product-image.entity';

@Entity('products')
@Index(['name'])
@Index(['price'])
@Index(['stock'])
@Index(['isActive', 'createdAt'])
export class Product {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: '产品ID' })
  id: number;

  @Column('varchar', { length: 255 })
  @ApiProperty({ description: '产品名称' })
  name: string;

  @Column('text')
  @ApiProperty({ description: '产品描述' })
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  @ApiProperty({ description: '产品价格' })
  price: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @ApiProperty({ description: '原价' })
  originalPrice: number;

  @Column({ default: 0 })
  @ApiProperty({ description: '库存数量' })
  stock: number;

  @Column({ default: 0 })
  @ApiProperty({ description: '销量' })
  sales: number;

  @Column({ default: true })
  @ApiProperty({ description: '是否上架' })
  isActive: boolean;

  @Column({ default: 0 })
  @ApiProperty({ description: '浏览量' })
  views: number;

  @Column({ default: 0 })
  @ApiProperty({ description: '收藏数' })
  favorites: number;

  @Column({ nullable: true })
  @ApiProperty({ description: '主图URL' })
  mainImage: string;

  @Column('simple-array', { nullable: true })
  @ApiProperty({ description: '产品标签' })
  tags: string[];

  @Column('json', { nullable: true })
  @ApiProperty({ description: '产品规格' })
  specifications: Record<string, any>;

  @ManyToOne(() => Category, category => category.products)
  @ApiProperty({ description: '产品分类' })
  category: Category;

  @OneToMany(() => ProductImage, image => image.product)
  @ApiProperty({ description: '产品图片' })
  images: ProductImage[];

  @CreateDateColumn()
  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @Column({ nullable: true })
  @ApiProperty({ description: '上架时间' })
  publishedAt: Date;

  @VersionColumn()
  @ApiProperty({ description: '乐观锁版本' })
  version: number;
}
