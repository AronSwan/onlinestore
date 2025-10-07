import { ApiProperty } from '@nestjs/swagger';
import { CartItemResponseDto } from './cart-item-response.dto';

/**
 * 分页购物车响应 DTO
 */
export class PagedCartResponseDto {
  @ApiProperty({ description: '购物车商品列表', type: [CartItemResponseDto] })
  items: CartItemResponseDto[];

  @ApiProperty({ description: '总数量', example: 25 })
  total: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页数量', example: 20 })
  limit: number;

  @ApiProperty({ description: '总页数', example: 2 })
  totalPages: number;

  @ApiProperty({ description: '是否有下一页', example: true })
  hasNext: boolean;

  @ApiProperty({ description: '是否有上一页', example: false })
  hasPrev: boolean;

  constructor(items: CartItemResponseDto[], total: number, page: number, limit: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
    this.hasNext = page < this.totalPages;
    this.hasPrev = page > 1;
  }
}
