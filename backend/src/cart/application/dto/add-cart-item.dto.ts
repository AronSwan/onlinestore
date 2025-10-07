import { IsString, IsNumber, IsPositive, IsOptional, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 添加购物车商品 DTO
 */
export class AddCartItemDto {
  @ApiProperty({ description: '商品 SPU ID', example: 'prod_123456' })
  @IsString()
  @MaxLength(50)
  productId: string;

  @ApiProperty({ description: '商品 SKU ID', example: 'sku_123456' })
  @IsString()
  @MaxLength(50)
  productSkuId: string;

  @ApiProperty({ description: '商品名称', example: 'Reich 经典手袋' })
  @IsString()
  @MaxLength(200)
  productName: string;

  @ApiProperty({ description: '商品品牌', example: 'Reich' })
  @IsString()
  @MaxLength(100)
  productBrand: string;

  @ApiProperty({ description: '商品价格', example: 2999.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  productPrice: number;

  @ApiProperty({ description: '商品数量', example: 1, minimum: 1, maximum: 999 })
  @IsNumber()
  @Min(1)
  @Max(999)
  productQuantity: number;

  @ApiProperty({ description: '商品图片URL', example: '/images/products/bag-001.jpg' })
  @IsString()
  @MaxLength(500)
  productPic: string;

  @ApiProperty({
    description: '商品规格属性 JSON',
    example: '{"color":"黑色","size":"中号","material":"真皮"}',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  productAttribute?: string;
}
