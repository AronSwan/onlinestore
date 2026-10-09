import { Repository } from 'typeorm';
import { CartRepository } from '../../domain/repositories/cart.repository';
import { CartItemAggregate } from '../../domain/aggregates/cart-item.aggregate';
import { CartItemEntity } from '../entities/cart-item.entity';
export declare class CartRepositoryImpl extends CartRepository {
    private readonly cartItemRepository;
    constructor(cartItemRepository: Repository<CartItemEntity>);
    findByUserId(userId: string): Promise<CartItemAggregate[]>;
    findByUserIdAndSkuId(userId: string, productSkuId: string): Promise<CartItemAggregate | null>;
    findByUserIdAndItemId(userId: string, cartItemId: string): Promise<CartItemAggregate | null>;
    findByUserIdAndSkuIdAnyState(userId: string, productSkuId: string): Promise<CartItemAggregate | null>;
    save(cartItem: CartItemAggregate): Promise<void>;
    remove(cartItemId: string): Promise<void>;
    removeByUserIdAndSkuIds(userId: string, productSkuIds: string[]): Promise<void>;
    clearByUserId(userId: string): Promise<void>;
    countByUserId(userId: string): Promise<number>;
    findSelectedByUserId(userId: string): Promise<CartItemAggregate[]>;
    findByUserIdWithPagination(userId: string, page: number, limit: number): Promise<{
        items: CartItemAggregate[];
        total: number;
    }>;
    removeBatch(userId: string, cartItemIds: string[]): Promise<void>;
    updateAllSelectFlag(userId: string, selectFlag: boolean): Promise<void>;
    removeSelectedByUserId(userId: string): Promise<void>;
    countSelectedByUserId(userId: string): Promise<number>;
    getTotalValue(userId: string): Promise<number>;
    getSelectedTotalValue(userId: string): Promise<number>;
    private entityToAggregate;
    private aggregateToEntity;
}
