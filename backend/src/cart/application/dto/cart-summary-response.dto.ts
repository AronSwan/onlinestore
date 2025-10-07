import { ApiProperty } from '@nestjs/swagger';

/**
 * 购物车摘要响应 DTO
 */
export class CartSummaryResponseDto {
  @ApiProperty({ description: '购物车总商品数量', example: 5 })
  totalItems: number;

  @ApiProperty({ description: '选中商品数量', example: 3 })
  selectedItems: number;

  @ApiProperty({ description: '购物车总价值', example: 8999.97 })
  totalValue: number;

  @ApiProperty({ description: '选中商品总价值', example: 5999.98 })
  selectedValue: number;

  constructor(
    totalItems: number,
    selectedItems: number,
    totalValue: number,
    selectedValue: number,
  ) {
    this.totalItems = totalItems;
    this.selectedItems = selectedItems;
    this.totalValue = totalValue;
    this.selectedValue = selectedValue;
  }
}
