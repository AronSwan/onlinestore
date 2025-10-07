/**
 * 购物车商品移除事件
 */
export class CartItemRemovedEvent {
  constructor(
    public readonly cartItemId: string,
    public readonly userId: string,
    public readonly productSkuId: string,
    public readonly removedAt: Date,
  ) {}
}
