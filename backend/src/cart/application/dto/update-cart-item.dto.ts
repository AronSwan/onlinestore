import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 更新购物车商品 DTO
 */
export class UpdateCartItemDto {
  @ApiProperty({ description: '商品 SKU ID', example: 'sku_123456' })
  @IsString()
  productSkuId: string;

  @ApiProperty({ description: '商品数量', example: 2, minimum: 1, maximum: 999, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(999)
  productQuantity?: number;

  @ApiProperty({ description: '是否选中', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  selectFlag?: boolean;
}
