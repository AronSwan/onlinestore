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

  @ApiProperty({ description: '产品分类ID', example: 1 })
  @IsNumber()
  categoryId: number;

  @ApiProperty({ description: '产品品牌', example: 'Apple' })
  @IsString()
  brand: string;

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
