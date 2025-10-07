import { Injectable } from '@nestjs/common';
import { CartItemAggregate } from './aggregates/cart-item.aggregate';
import { CartRepository } from './repositories/cart.repository';

/**
 * 购物车领域服务 - 参考 CongoMall 业务逻辑设计
 *
 * 领域服务职责：
 * 1. 实现跨聚合根的业务逻辑
 * 2. 封装复杂的业务规则
 * 3. 协调多个聚合根的交互
 */
@Injectable()
export class CartDomainService {
  constructor(private readonly cartRepository: CartRepository) {}

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
    await this.cartRepository.updateAllSelectFlag(customerUserId, selectFlag);
  }

  /**
   * 清空选中商品
   */
  async clearSelectedItems(customerUserId: string): Promise<void> {
    await this.cartRepository.removeSelectedByUserId(customerUserId);
  }

  /**
   * 获取购物车摘要信息
   */
  async getCartSummary(customerUserId: string): Promise<{
    totalItems: number;
    selectedItems: number;
    totalValue: number;
    selectedValue: number;
  }> {
    const [totalItems, selectedItems, totalValue, selectedValue] = await Promise.all([
      this.cartRepository.countByUserId(customerUserId),
      this.cartRepository.countSelectedByUserId(customerUserId),
      this.cartRepository.getTotalValue(customerUserId),
      this.cartRepository.getSelectedTotalValue(customerUserId),
    ]);

    return {
      totalItems,
      selectedItems,
      totalValue,
      selectedValue,
    };
  }

  /**
   * 验证购物车商品库存（集成商品服务）
   */
  async validateCartItemsStock(customerUserId: string): Promise<{
    valid: boolean;
    invalidItems: string[];
  }> {
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
