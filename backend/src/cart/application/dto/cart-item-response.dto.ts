import { ApiProperty } from '@nestjs/swagger';

/**
 * 购物车商品响应 DTO
 */
export class CartItemResponseDto {
  @ApiProperty({ description: '购物车商品ID', example: 'cart_1234567890_abc123' })
  id: string;

  @ApiProperty({ description: '商品 SPU ID', example: 'prod_123456' })
  productId: string;

  @ApiProperty({ description: '商品 SKU ID', example: 'sku_123456' })
  productSkuId: string;

  @ApiProperty({ description: '商品名称', example: 'Reich 经典手袋' })
  productName: string;

  @ApiProperty({ description: '商品品牌', example: 'Reich' })
  productBrand: string;

  @ApiProperty({ description: '商品价格', example: 2999.99 })
  productPrice: number;

  @ApiProperty({ description: '商品数量', example: 1 })
  productQuantity: number;

  @ApiProperty({ description: '商品图片URL', example: '/images/products/bag-001.jpg' })
  productPic: string;

  @ApiProperty({ description: '商品规格属性', example: '{"color":"黑色","size":"中号"}' })
  productAttribute: string;

  @ApiProperty({ description: '是否选中', example: true })
  selectFlag: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiProperty({ description: '商品总价', example: 2999.99 })
  totalPrice: number;

  constructor(
    id: string,
    productId: string,
    productSkuId: string,
    productName: string,
    productBrand: string,
    productPrice: number,
    productQuantity: number,
    productPic: string,
    productAttribute: string,
    selectFlag: boolean,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this.productId = productId;
    this.productSkuId = productSkuId;
    this.productName = productName;
    this.productBrand = productBrand;
    this.productPrice = productPrice;
    this.productQuantity = productQuantity;
    this.productPic = productPic;
    this.productAttribute = productAttribute;
    this.selectFlag = selectFlag;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.totalPrice = productPrice * productQuantity;
  }
}
