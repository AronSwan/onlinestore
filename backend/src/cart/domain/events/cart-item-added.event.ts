import { IEvent } from '@nestjs/cqrs';

/**
 * 购物车商品添加事件
 */
export class CartItemAddedEvent implements IEvent {
  constructor(
    public readonly cartItemId: string,
    public readonly customerUserId: string,
    public readonly productSkuId: string,
    public readonly quantity: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}

/**
 * 购物车商品更新事件
 */
export class CartItemUpdatedEvent implements IEvent {
  constructor(
    public readonly cartItemId: string,
    public readonly customerUserId: string,
    public readonly productSkuId: string,
    public readonly oldQuantity: number,
    public readonly newQuantity: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}

/**
 * 购物车商品移除事件
 */
export class CartItemRemovedEvent implements IEvent {
  constructor(
    public readonly cartItemId: string,
    public readonly customerUserId: string,
    public readonly productSkuId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
