import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 更新购物车商品 DTO
 */
export class UpdateCartItemDto {
  // 挂账#3 接线修复(2026-10-08)：定位职责归路径参数 :cartItemId，skuId 改可选
  // 兼容字段（原必填导致只改数量的合法请求被 400 拒——curl 实证）
  @ApiProperty({ description: '商品 SKU ID（可选，定位以路径 :cartItemId 为准）', example: 'sku_123456', required: false })
  @IsOptional()
  @IsString()
  productSkuId?: string;

  @ApiProperty({ description: '商品数量', example: 2, minimum: 1, maximum: 999, required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 }) // 双盲C1席：原可落库 1.5 致 summary 4.5
  @Min(1)
  @Max(999)
  productQuantity?: number;

  @ApiProperty({ description: '是否选中', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  selectFlag?: boolean;
}
