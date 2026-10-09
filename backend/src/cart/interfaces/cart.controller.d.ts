import { CartApplicationService } from '../application/cart-application.service';
import { AddCartItemDto } from '../application/dto/add-cart-item.dto';
import { UpdateCartItemDto } from '../application/dto/update-cart-item.dto';
import { CartItemResponseDto } from '../application/dto/cart-item-response.dto';
import { CartSummaryResponseDto } from '../application/dto/cart-summary-response.dto';
import { PagedCartResponseDto } from '../application/dto/paged-cart-response.dto';
export declare class CartController {
    private readonly cartApplicationService;
    constructor(cartApplicationService: CartApplicationService);
    getCartItems(customerUserId: string, page: number, limit: number): Promise<PagedCartResponseDto>;
    getSelectedCartItems(customerUserId: string): Promise<CartItemResponseDto[]>;
    addCartItem(customerUserId: string, addCartItemDto: AddCartItemDto): Promise<CartItemResponseDto>;
    updateCartItem(customerUserId: string, cartItemId: string, updateCartItemDto: UpdateCartItemDto): Promise<void>;
    updateAllSelectFlag(customerUserId: string, selectFlag: boolean): Promise<void>;
    removeCartItem(customerUserId: string, cartItemId: string): Promise<void>;
    removeCartItems(customerUserId: string, cartItemIds: string[]): Promise<void>;
    clearSelectedItems(customerUserId: string): Promise<void>;
    getCartSummary(customerUserId: string): Promise<CartSummaryResponseDto>;
    getCartItemCount(customerUserId: string): Promise<number>;
}
