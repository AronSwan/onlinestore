// 用途：分类实体类，定义商品分类数据模型
// 依赖文件：product.entity.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:23:00

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  Tree,
  TreeChildren,
  TreeParent,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Product } from './product.entity';

@Entity('categories')
@Tree('nested-set')
@Index(['name'])
@Index(['slug'])
export class Category {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: '分类ID' })
  id: number;

  @Column('varchar', { length: 255 })
  @ApiProperty({ description: '分类名称' })
  name: string;

  @Column({ unique: true })
  @ApiProperty({ description: '分类别名' })
  slug: string;

  @Column({ nullable: true })
  @ApiProperty({ description: '分类描述' })
  description: string;

  @Column({ nullable: true })
  @ApiProperty({ description: '分类图标' })
  icon: string;

  @Column({ default: true })
  @ApiProperty({ description: '是否启用' })
  isActive: boolean;

  @Column({ default: 0 })
  @ApiProperty({ description: '排序权重' })
  sortOrder: number;

  @TreeChildren()
  @ApiProperty({ description: '子分类' })
  children: Category[];

  @TreeParent()
  @ApiProperty({ description: '父分类' })
  parent: Category;

  @OneToMany(() => Product, product => product.category)
  @ApiProperty({ description: '分类下的产品' })
  products: Product[];

  @CreateDateColumn()
  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}
