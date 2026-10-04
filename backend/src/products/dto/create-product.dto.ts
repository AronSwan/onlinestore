// 用途：创建产品数据传输对象
// 依赖文件：product.entity.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:40:00
// P1-4(双盲审 2026-10-05)：服务端 sanity 补齐——原实现仅前端 gates sanityCheck
// 把关（信任边界错位：空名/price=0/stock=1.5/originalPrice<price 全 201 入库）。
// UpdateProductDto 经 PartialType 全量继承（含跨字段约束与各项长度/类型装饰器）。
// R4(二次修复 2026-10-05)：name 整形（trim+全空格拒+换行拒）与 description
// 上限 2000——PATCH 单值倒挂的跨字段缺口由 service 层合并视图补（R1）。

import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
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
  Matches,
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
  // R4（P2·二次修复 2026-10-05，清单 4）：name/description 服务端整形。
  // name：@Transform 先 trim 再校验——全空格名在 IsNotEmpty 处拒绝（此前
  // "     " 非空串直通入库）；trim 由全局 ValidationPipe(transform:true)
  // 的 plainToInstance 落形，controller/service 拿到的即整形后值。
  // 换行评估结论=拒绝：商品名含换行不合理（列表/卡片渲染错位、搜索串污染），
  // trim 不除内部 \n，故加 @Matches 排除 \n/\r。UpdateProductDto 经
  // PartialType 全量继承（含 @Transform 与全部校验器）。
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ApiProperty({ description: '产品名称', example: '高端智能手机' })
  @IsString()
  @IsNotEmpty({ message: '产品名称不能为空' })
  @MaxLength(200, { message: '产品名称不能超过 200 字符' })
  @Matches(/^[^\n\r]*$/, { message: '名称不能包含换行' })
  name: string;

  // R4：description 上限 2000——关掉 Y1 实测的 CPU 放大面（64KB 描述使闸的
  // 词表匹配耗时 33.5ms，超长载荷线性放大）。仍必填：products.description
  // 列 NOT NULL 无默认值，缺省放行会把失败面从 400 挪到 DB 500（与
  // @IsOptional 的任务书字面写法有偏差，见二次修复汇报的已知限制段）。
  @ApiProperty({ description: '产品描述', example: '最新款高端智能手机' })
  @IsString()
  @MaxLength(2000, { message: '产品描述不能超过 2000 字符' })
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
