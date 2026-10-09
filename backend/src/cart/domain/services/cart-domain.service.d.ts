import { CartItemAggregate } from '../aggregates/cart-item.aggregate';
import { CartRepository } from '../repositories/cart.repository';
export declare class CartLimitExceededError extends Error {
}
export declare class CartDomainService {
    private readonly cartRepository?;
    constructor(cartRepository?: CartRepository | undefined);
    getCartSummary(cartItems: CartItemAggregate[]): {
        totalItems: number;
        selectedItems: number;
        totalAmount: number;
        selectedAmount: number;
        totalValue: number;
        selectedValue: number;
    };
    addItemToCart(customerUserId: string, productId: string, productSkuId: string, productName: string, productBrand: string, productPrice: number, productQuantity: number, productPic: string, productAttribute: string): Promise<CartItemAggregate>;
    updateAllSelectFlag(customerUserId: string, selectFlag: boolean): Promise<void>;
    clearSelectedItems(customerUserId: string): Promise<void>;
}
