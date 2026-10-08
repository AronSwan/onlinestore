import { Injectable } from '@nestjs/common';
import { CartItemAggregate } from '../aggregates/cart-item.aggregate';
import { CartRepository } from '../repositories/cart.repository';

/** 购物车上限业务错误（application 层转 400，非服务器故障） */
export class CartLimitExceededError extends Error {}

/**
 * 购物车领域服务
 *
 * 精简版（2026-10-08 复杂度清理批）：原 330 行 18 个方法中 13 个零外部引用
 * （validate 全家 8 个、calc 家族被 getCartSummary 内联、merge/batchSelect/
 * stock/discount 均为 TODO 仪式件）。保留 4 个活方法。
 */
@Injectable()
export class CartDomainService {
  constructor(private readonly cartRepository?: CartRepository) {}

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
    const sum = (items: CartItemAggregate[]) =>
      items.reduce((total, item) => total + item.productPrice * item.productQuantity, 0);
    // 件数口径=Σqty（原 calculateCartItemCount/SelectedItemCount 语义，A2 席实测
    // summary.totalItems=18 对 3 条目——保持不变）
    const countQty = (items: CartItemAggregate[]) =>
      items.reduce((count, item) => count + item.productQuantity, 0);

    const totalAmount = sum(activeItems);
    const selectedAmount = sum(selectedItems);

    return {
      totalItems: countQty(cartItems),
      selectedItems: countQty(selectedItems),
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
      // 双盲C1席：业务上限拒绝此前落 500(裸Error)与服务器故障不可区分——
      // 专用错误类型交 application 层转 4xx
      throw new CartLimitExceededError('购物车最多添加500件商品');
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
    }

    // P1 修复(2026-10-08 双盲四席实证)：软删行仍占用 (uid,sku) 唯一索引——
    // 直接 INSERT 撞键 500，删后重加同 SKU 永久死区。命中软删行则原地复活
    // （aggregateToEntity save 时 delFlag 恒写 false），量取本次新增值
    // （删除语义=旧量已弃），商品信息同步刷新。
    const softDeleted = await this.cartRepository.findByUserIdAndSkuIdAnyState(
      customerUserId,
      productSkuId,
    );
    if (softDeleted) {
      // productId 是只读标识——软删行复活不换商品标识，仅刷新可变信息
      softDeleted.productName = productName;
      softDeleted.productBrand = productBrand;
      softDeleted.productPrice = productPrice;
      softDeleted.productQuantity = productQuantity;
      softDeleted.productPic = productPic;
      softDeleted.productAttribute = productAttribute;
      softDeleted.selectFlag = true;
      softDeleted.updatedAt = new Date();
      await this.cartRepository.save(softDeleted);
      return softDeleted;
    }

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
}
