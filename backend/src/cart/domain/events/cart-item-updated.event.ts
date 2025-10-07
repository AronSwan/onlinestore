/**
 * 购物车商品更新事件
 */
export class CartItemUpdatedEvent {
  constructor(
    public readonly cartItemId: string,
    public readonly userId: string,
    public readonly productSkuId: string,
    public readonly oldQuantity: number,
    public readonly newQuantity: number,
    public readonly updatedAt: Date,
  ) {}
}
