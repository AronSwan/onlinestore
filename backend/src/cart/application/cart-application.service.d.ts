import { CartDomainService } from '../domain/services/cart-domain.service';
import { CartRepository } from '../domain/repositories/cart.repository';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItemResponseDto } from './dto/cart-item-response.dto';
import { CartSummaryResponseDto } from './dto/cart-summary-response.dto';
import { PagedCartResponseDto } from './dto/paged-cart-response.dto';
export declare class CartApplicationService {
    private readonly cartDomainService;
    private readonly cartRepository;
    private readonly logger;
    constructor(cartDomainService: CartDomainService, cartRepository: CartRepository);
    getCartItems(customerUserId: string, page?: number, limit?: number): Promise<PagedCartResponseDto>;
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
