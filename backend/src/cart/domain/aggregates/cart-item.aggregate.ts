/**
 * 购物车商品聚合根
 *
 * 精简版（2026-10-08 复杂度清理批）：原 202 行——CQRS 事件发布（apply）全仓
 * 零 handler、15 个 getter 与 public 字段重复、remove()/toggleSelect()/
 * updateSelectFlag() 与 setSelectFlag() 多重同义无人调——均删。保留业务
 * 规则（数量边界/合并/验证）与复活所需的可变字段。
 */
export class CartItemAggregate {
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
  ) {}

  // 兼容性属性 - 为了与仓储实现保持一致
  get userId(): string {
    return this.customerUserId;
  }

  // 更新方法
  updateQuantity(newQuantity: number): void {
    if (newQuantity <= 0) {
      throw new Error('商品数量必须大于0');
    }
    if (newQuantity > 999) {
      throw new Error('单个商品数量不能超过999');
    }
    this.productQuantity = newQuantity;
    this.updatedAt = new Date();
  }

  setSelectFlag(selectFlag: boolean): void {
    this.selectFlag = selectFlag;
  }

  /**
   * 合并相同商品（数量累加）
   */
  mergeQuantity(additionalQuantity: number): void {
    const newQuantity = this.productQuantity + additionalQuantity;
    if (newQuantity > 999) {
      throw new Error('单个商品数量不能超过999');
    }
    this.productQuantity = newQuantity;
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
    return new CartItemAggregate(
      CartItemAggregate.generateId(),
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
