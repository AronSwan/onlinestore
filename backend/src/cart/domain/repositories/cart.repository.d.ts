import { CartItemAggregate } from '../aggregates/cart-item.aggregate';
export declare abstract class CartRepository {
    abstract findByUserId(userId: string): Promise<CartItemAggregate[]>;
    abstract findByUserIdAndSkuId(userId: string, productSkuId: string): Promise<CartItemAggregate | null>;
    abstract findByUserIdAndItemId(userId: string, cartItemId: string): Promise<CartItemAggregate | null>;
    abstract findByUserIdAndSkuIdAnyState(userId: string, productSkuId: string): Promise<CartItemAggregate | null>;
    abstract save(cartItem: CartItemAggregate): Promise<void>;
    abstract remove(cartItemId: string): Promise<void>;
    abstract removeByUserIdAndSkuIds(userId: string, productSkuIds: string[]): Promise<void>;
    abstract clearByUserId(userId: string): Promise<void>;
    abstract countByUserId(userId: string): Promise<number>;
    abstract findSelectedByUserId(userId: string): Promise<CartItemAggregate[]>;
    abstract findByUserIdWithPagination(userId: string, page: number, limit: number): Promise<{
        items: CartItemAggregate[];
        total: number;
    }>;
    abstract removeBatch(userId: string, cartItemIds: string[]): Promise<void>;
    abstract updateAllSelectFlag(userId: string, selectFlag: boolean): Promise<void>;
    abstract removeSelectedByUserId(userId: string): Promise<void>;
    abstract countSelectedByUserId(userId: string): Promise<number>;
    abstract getTotalValue(userId: string): Promise<number>;
    abstract getSelectedTotalValue(userId: string): Promise<number>;
}
