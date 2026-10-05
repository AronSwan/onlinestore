// 用途：更新产品数据传输对象
// 依赖文件：product.entity.ts, create-product.dto.ts
// 作者：后端开发团队
// 时间：2025-09-26 18:40:00
// P1-4(双盲审 2026-10-05)：PartialType 全量继承 CreateProductDto 的服务端 sanity
// 装饰器（name 非空+≤200 / price>0 / stock 整数≥0 / originalPrice≥price 跨字段
// 约束 / specifications 对象形状）——PATCH 部分字段时只校验所传字段。

import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { CreateProductDto, nullToUndefined } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  // 四修 P2：isActive 的 null→undefined 在本类显式重申（CreateProductDto 的
  // @Transform 经原型链继承对 PartialType 生效，但本字段被子类重声明——
  // 装饰器就地重挂，不依赖继承细节）。NOT NULL 列的 500 面，同 price/stock。
  @Transform(nullToUndefined)
  @ApiProperty({ description: '是否上架', required: false })
  @IsOptional()
  isActive?: boolean;
}
