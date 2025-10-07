import { Injectable } from '@nestjs/common';
import { CartItemAggregate } from '../aggregates/cart-item.aggregate';
import { CartRepository } from '../repositories/cart.repository';

/**
 * 购物车领域服务
 * 基于 CongoMall 的业务逻辑封装
 * 统一了两个版本的服务接口
 */
@Injectable()
export class CartDomainService {
  constructor(private readonly cartRepository?: CartRepository) {}

  /**
   * 验证商品是否可以添加到购物车
   */
  validateAddToCart(
    productId: string,
    productSkuId: string,
    quantity: number,
    maxQuantity: number = 999,
  ): void {
    if (!productId || !productSkuId) {
      throw new Error('商品ID和SKU ID不能为空');
    }

    if (quantity <= 0) {
      throw new Error('商品数量必须大于0');
    }

    if (quantity > maxQuantity) {
      throw new Error(`商品数量不能超过${maxQuantity}`);
    }
  }

  /**
   * 验证购物车商品数量更新
   */
  validateQuantityUpdate(
    currentQuantity: number,
    newQuantity: number,
    maxQuantity: number = 999,
  ): void {
    if (newQuantity <= 0) {
      throw new Error('商品数量必须大于0');
    }

    if (newQuantity > maxQuantity) {
      throw new Error(`商品数量不能超过${maxQuantity}`);
    }
  }

  /**
   * 计算购物车总金额
   */
  calculateCartTotal(cartItems: CartItemAggregate[]): number {
    return cartItems
      .filter(item => item.selectFlag && !item.delFlag)
      .reduce((total, item) => {
        return total + item.productPrice * item.productQuantity;
      }, 0);
  }

  /**
   * 计算购物车商品总数量
   */
  calculateCartItemCount(cartItems: CartItemAggregate[]): number {
    return cartItems
      .filter(item => !item.delFlag)
      .reduce((count, item) => count + item.productQuantity, 0);
  }

  /**
   * 计算选中商品总数量
   */
  calculateSelectedItemCount(cartItems: CartItemAggregate[]): number {
    return cartItems
      .filter(item => item.selectFlag && !item.delFlag)
      .reduce((count, item) => count + item.productQuantity, 0);
  }

  /**
   * 验证购物车商品是否存在
   */
  validateCartItemExists(cartItem: CartItemAggregate | null): void {
    if (!cartItem) {
      throw new Error('购物车商品不存在');
    }

    if (cartItem.delFlag) {
      throw new Error('购物车商品已删除');
    }
  }

  /**
   * 验证用户权限
   */
  validateUserPermission(cartItem: CartItemAggregate, userId: string): void {
    if (cartItem.customerUserId !== userId) {
      throw new Error('无权限操作该购物车商品');
    }
  }

  /**
   * 合并相同商品
   */
  mergeCartItems(
    existingItem: CartItemAggregate,
    newQuantity: number,
    maxQuantity: number = 999,
  ): CartItemAggregate {
    const totalQuantity = existingItem.productQuantity + newQuantity;

    this.validateQuantityUpdate(existingItem.productQuantity, totalQuantity, maxQuantity);

    existingItem.updateQuantity(totalQuantity);
    return existingItem;
  }

  /**
   * 批量选择/取消选择商品
   */
  batchSelectItems(cartItems: CartItemAggregate[], selected: boolean): CartItemAggregate[] {
    return cartItems.map(item => {
      if (!item.delFlag) {
        item.updateSelectFlag(selected);
      }
      return item;
    });
  }

  /**
   * 验证购物车是否为空
   */
  validateCartNotEmpty(cartItems: CartItemAggregate[]): void {
    const activeItems = cartItems.filter(item => !item.delFlag);
    if (activeItems.length === 0) {
      throw new Error('购物车为空');
    }
  }

  /**
   * 验证是否有选中的商品
   */
  validateHasSelectedItems(cartItems: CartItemAggregate[]): void {
    const selectedItems = cartItems.filter(item => item.selectFlag && !item.delFlag);
    if (selectedItems.length === 0) {
      throw new Error('请选择要操作的商品');
    }
  }

  /**
   * 获取购物车摘要信息
   */
  getCartSummary(cartItems: CartItemAggregate[]): {
    totalItems: number;
    selectedItems: number;
    totalAmount: number;
    selectedAmount: number;
    totalValue: number;
    selectedValue: number;
  } {
    const activeItems = cartItems.filter(item => !item.delFlag);
    const selectedItems = activeItems.filter(item => item.selectFlag);

    const totalAmount = this.calculateCartTotal(activeItems);
    const selectedAmount = this.calculateCartTotal(selectedItems);

    return {
      totalItems: this.calculateCartItemCount(cartItems),
      selectedItems: this.calculateSelectedItemCount(cartItems),
      totalAmount,
      selectedAmount,
      totalValue: totalAmount, // 兼容性别名
      selectedValue: selectedAmount, // 兼容性别名
    };
  }

  // ========== 以下是仓储相关的方法，需要注入 CartRepository ==========

  /**
   * 添加商品到购物车（智能合并逻辑）
   */
  async addItemToCart(
    customerUserId: string,
    productId: string,
    productSkuId: string,
    productName: string,
    productBrand: string,
    productPrice: number,
    productQuantity: number,
    productPic: string,
    productAttribute: string,
  ): Promise<CartItemAggregate> {
    if (!this.cartRepository) {
      throw new Error('CartRepository not injected');
    }

    // 检查购物车商品数量限制
    const currentCount = await this.cartRepository.countByUserId(customerUserId);
    if (currentCount >= 500) {
      throw new Error('购物车最多添加500件商品');
    }

    // 检查是否已存在相同商品
    const existingItem = await this.cartRepository.findByUserIdAndSkuId(
      customerUserId,
      productSkuId,
    );

    if (existingItem) {
      // 合并数量
      existingItem.mergeQuantity(productQuantity);
      await this.cartRepository.save(existingItem);
      return existingItem;
    } else {
      // 创建新商品
      const newItem = CartItemAggregate.create(
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
      await this.cartRepository.save(newItem);
      return newItem;
    }
  }

  /**
   * 批量更新选中状态
   */
  async updateAllSelectFlag(customerUserId: string, selectFlag: boolean): Promise<void> {
    if (!this.cartRepository) {
      throw new Error('CartRepository not injected');
    }
    await this.cartRepository.updateAllSelectFlag(customerUserId, selectFlag);
  }

  /**
   * 清空选中商品
   */
  async clearSelectedItems(customerUserId: string): Promise<void> {
    if (!this.cartRepository) {
      throw new Error('CartRepository not injected');
    }
    await this.cartRepository.removeSelectedByUserId(customerUserId);
  }

  /**
   * 验证购物车商品库存（集成商品服务）
   */
  async validateCartItemsStock(customerUserId: string): Promise<{
    valid: boolean;
    invalidItems: string[];
  }> {
    if (!this.cartRepository) {
      throw new Error('CartRepository not injected');
    }

    const selectedItems = await this.cartRepository.findSelectedByUserId(customerUserId);
    const invalidItems: string[] = [];

    // TODO: 集成商品服务验证库存
    // for (const item of selectedItems) {
    //   const stockAvailable = await this.productService.checkStock(item.productSkuId, item.productQuantity);
    //   if (!stockAvailable) {
    //     invalidItems.push(item.productSkuId);
    //   }
    // }

    return {
      valid: invalidItems.length === 0,
      invalidItems,
    };
  }

  /**
   * 计算购物车优惠（集成优惠券服务）
   */
  async calculateDiscount(customerUserId: string): Promise<{
    originalTotal: number;
    discountAmount: number;
    finalTotal: number;
  }> {
    if (!this.cartRepository) {
      throw new Error('CartRepository not injected');
    }

    const originalTotal = await this.cartRepository.getSelectedTotalValue(customerUserId);

    // TODO: 集成优惠券服务计算折扣
    const discountAmount = 0;

    return {
      originalTotal,
      discountAmount,
      finalTotal: originalTotal - discountAmount,
    };
  }
}
