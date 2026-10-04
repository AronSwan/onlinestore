// 用途：创建产品数据传输对象
// 依赖文件：product.entity.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:40:00
// P1-4(双盲审 2026-10-05)：服务端 sanity 补齐——原实现仅前端 gates sanityCheck
// 把关（信任边界错位：空名/price=0/stock=1.5/originalPrice<price 全 201 入库）。
// UpdateProductDto 经 PartialType 全量继承（含跨字段约束与各项长度/类型装饰器）。

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsNumber,
  IsOptional,
  Min,
  IsInt,
  IsArray,
  IsObject,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * P1-4：划线原价不得低于现价（跨字段约束——@ValidateIf 只能控执行条件、
 * 无法比对另一字段，故用 class-validator 自定义约束；仅当两值均为数字时生效，
 * originalPrice 本身可选，与前端 gates sanityCheck 的 original_below_price 同判）。
 */
@ValidatorConstraint({ name: 'originalPriceNotBelowPrice', async: false })
class OriginalPriceNotBelowPriceConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const price = (args.object as Record<string, unknown>).price;
    if (typeof price !== 'number' || typeof value !== 'number') return true;
    return value >= price;
  }

  defaultMessage(): string {
    return '划线原价 originalPrice 不能低于现价 price';
  }
}

export class CreateProductDto {
  @ApiProperty({ description: '产品名称', example: '高端智能手机' })
  @IsString()
  @IsNotEmpty({ message: '产品名称不能为空' })
  @MaxLength(200, { message: '产品名称不能超过 200 字符' })
  name: string;

  @ApiProperty({ description: '产品描述', example: '最新款高端智能手机' })
  @IsString()
  description: string;

  @ApiProperty({ description: '产品价格', example: 2999.99 })
  @IsNumber()
  @Min(0.01, { message: '产品价格必须大于 0' })
  price: number;

  @ApiProperty({ description: '原价', required: false, example: 3499.99 })
  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: '原价必须大于 0' })
  @Validate(OriginalPriceNotBelowPriceConstraint)
  originalPrice?: number;

  @ApiProperty({ description: '库存数量', example: 100 })
  @IsInt({ message: '库存数量必须是整数' })
  @Min(0, { message: '库存数量不能为负数' })
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
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ description: '产品规格', type: Object, required: false })
  @IsOptional()
  @IsObject({ message: '产品规格必须是对象' })
  specifications?: Record<string, any>;

  @ApiProperty({ description: '是否上架', default: true })
  @IsOptional()
  isActive?: boolean;
}
