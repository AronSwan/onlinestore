// 用途：创建产品数据传输对象
// 依赖文件：product.entity.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:40:00

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max, IsArray } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ description: '产品名称', example: '高端智能手机' })
  @IsString()
  name: string;

  @ApiProperty({ description: '产品描述', example: '最新款高端智能手机，配备顶级摄像头' })
  @IsString()
  description: string;

  @ApiProperty({ description: '产品价格', example: 2999.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: '原价', required: false, example: 3499.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @ApiProperty({ description: '库存数量', example: 100 })
  @IsNumber()
  @Min(0)
  stock: number;

  // M1-B2(2026-10-04)：categoryId 改可选——分类种子已灌库（scripts/seed-categories.sql），
  // 但不应再让"未传分类"成为创建商品的硬阻塞；传了但不存在仍由 service 抛 404。
  @ApiProperty({ description: '产品分类ID', required: false, example: 1 })
  @IsOptional()
  @IsNumber()
  categoryId?: number;

  // M1-B1(2026-10-04)：对齐实体——brand 字段已删除（products 表无此列，grep 全仓无消费方）；
  // 补上实体已有但 DTO 缺失的 mainImage/tags（forbidNonWhitelisted 下传了即 400）。
  @ApiProperty({ description: '主图URL', required: false, example: '/images/products/p1.jpg' })
  @IsOptional()
  @IsString()
  mainImage?: string;

  // tags 实体为 simple-array（逗号串存储），TypeORM 自动完成 string[] ↔ 逗号串转换，直接收数组
  @ApiProperty({ description: '产品标签', type: [String], required: false, example: ['新品', '热销'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: '产品图片URL数组', type: [String], required: false })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiProperty({ description: '产品规格', type: Object, required: false })
  @IsOptional()
  specifications?: Record<string, any>;

  @ApiProperty({ description: '是否上架', default: true })
  @IsOptional()
  isActive?: boolean;
}
