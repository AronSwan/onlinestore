import { AggregateRoot } from '@nestjs/cqrs';
import { CartItemAddedEvent } from '../events/cart-item-added.event';
import { CartItemUpdatedEvent } from '../events/cart-item-updated.event';
import { CartItemRemovedEvent } from '../events/cart-item-removed.event';

/**
 * 购物车商品聚合根 - 参考 CongoMall CartItem 设计
 *
 * 聚合根职责：
 * 1. 封装业务规则和不变性约束
 * 2. 发布领域事件
 * 3. 维护数据一致性
 */
export class CartItemAggregate extends AggregateRoot {
  constructor(
    public readonly id: string,
    public readonly customerUserId: string,
    public readonly productId: string,
    public readonly productSkuId: string,
    public productName: string,
    public productBrand: string,
    public productPrice: number,
    public productQuantity: number,
    public productPic: string,
    public productAttribute: string,
    public selectFlag: boolean = true,
    public delFlag: boolean = false,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {
    super();
  }

  // 兼容性属性 - 为了与仓储实现保持一致
  get userId(): string {
    return this.customerUserId;
  }

  // Getter 方法
  getId(): string {
    return this.id;
  }
  getUserId(): string {
    return this.customerUserId;
  }
  getProductId(): string {
    return this.productId;
  }
  getProductSkuId(): string {
    return this.productSkuId;
  }
  getProductName(): string {
    return this.productName;
  }
  getProductBrand(): string {
    return this.productBrand;
  }
  getProductPrice(): number {
    return this.productPrice;
  }
  getProductQuantity(): number {
    return this.productQuantity;
  }
  getProductPic(): string {
    return this.productPic;
  }
  getProductAttribute(): string {
    return this.productAttribute;
  }
  getSelectFlag(): boolean {
    return this.selectFlag;
  }

  setSelectFlag(selectFlag: boolean): void {
    this.selectFlag = selectFlag;
  }
  getDelFlag(): boolean {
    return this.delFlag;
  }
  getCreatedAt(): Date {
    return this.createdAt;
  }
  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // 更新方法
  updateQuantity(newQuantity: number): void {
    if (newQuantity <= 0) {
      throw new Error('商品数量必须大于0');
    }
    if (newQuantity > 999) {
      throw new Error('单个商品数量不能超过999');
    }

    const oldQuantity = this.productQuantity;
    this.productQuantity = newQuantity;
    this.updatedAt = new Date();

    this.apply(
      new CartItemUpdatedEvent(
        this.id,
        this.customerUserId,
        this.productSkuId,
        oldQuantity,
        newQuantity,
        new Date(),
      ),
    );
  }

  updateSelectFlag(selected: boolean): void {
    this.selectFlag = selected;
    this.updatedAt = new Date();
  }

  /**
   * 添加商品到购物车
   */
  static create(
    customerUserId: string,
    productId: string,
    productSkuId: string,
    productName: string,
    productBrand: string,
    productPrice: number,
    productQuantity: number,
    productPic: string,
    productAttribute: string,
  ): CartItemAggregate {
    const cartItem = new CartItemAggregate(
      this.generateId(),
      customerUserId,
      productId,
      productSkuId,
      productName,
      productBrand,
      productPrice,
      productQuantity,
      productPic,
      productAttribute,
    );

    cartItem.apply(
      new CartItemAddedEvent(cartItem.id, customerUserId, productSkuId, productQuantity),
    );
    return cartItem;
  }

  /**
   * 切换选中状态
   */
  toggleSelect(): void {
    this.selectFlag = !this.selectFlag;
    this.updatedAt = new Date();
  }

  /**
   * 合并相同商品（数量累加）
   */
  mergeQuantity(additionalQuantity: number): void {
    const newQuantity = this.productQuantity + additionalQuantity;
    if (newQuantity > 999) {
      throw new Error('合并后数量超过限制');
    }
    this.updateQuantity(newQuantity);
  }

  /**
   * 移除商品
   */
  remove(): void {
    this.apply(
      new CartItemRemovedEvent(this.id, this.customerUserId, this.productSkuId, new Date()),
    );
  }

  /**
   * 计算商品总价
   */
  getTotalPrice(): number {
    return this.productPrice * this.productQuantity;
  }

  /**
   * 验证商品数据完整性
   */
  validate(): boolean {
    return !!(
      this.customerUserId &&
      this.productId &&
      this.productSkuId &&
      this.productName &&
      this.productPrice > 0 &&
      this.productQuantity > 0
    );
  }

  private static generateId(): string {
    return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
