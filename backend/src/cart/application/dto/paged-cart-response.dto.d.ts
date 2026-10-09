import { CartItemResponseDto } from './cart-item-response.dto';
export declare class PagedCartResponseDto {
    items: CartItemResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    constructor(items: CartItemResponseDto[], total: number, page: number, limit: number);
}
