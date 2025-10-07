import { Injectable, Logger } from '@nestjs/common';
import { CartDomainService } from '../domain/services/cart-domain.service';
import { CartRepository } from '../domain/repositories/cart.repository';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItemResponseDto } from './dto/cart-item-response.dto';
import { CartSummaryResponseDto } from './dto/cart-summary-response.dto';
import { PagedCartResponseDto } from './dto/paged-cart-response.dto';

/**
 * 购物车应用服务 - 参考 CongoMall CartItemServiceImpl 设计
 *
 * 应用服务职责：
 * 1. 协调领域服务和基础设施
 * 2. 处理事务边界
 * 3. 转换 DTO 和领域对象
 * 4. 实现用例场景
 */
@Injectable()
export class CartApplicationService {
  private readonly logger = new Logger(CartApplicationService.name);

  constructor(
    private readonly cartDomainService: CartDomainService,
    private readonly cartRepository: CartRepository,
  ) {}

  /**
   * 分页查询购物车商品
   */
  async getCartItems(
    customerUserId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PagedCartResponseDto> {
    try {
      const { items, total } = await this.cartRepository.findByUserIdWithPagination(
        customerUserId,
        page,
        limit,
      );

      const cartItems = items.map(
        item =>
          new CartItemResponseDto(
            item.id,
            item.productId,
            item.productSkuId,
            item.productName,
            item.productBrand,
            item.productPrice,
            item.productQuantity,
            item.productPic,
            item.productAttribute,
            item.selectFlag,
            item.createdAt,
            item.updatedAt,
          ),
      );

      return new PagedCartResponseDto(cartItems, total, page, limit);
    } catch (error) {
      this.logger.error(`获取购物车商品失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 查询用户选中的购物车商品
   */
  async getSelectedCartItems(customerUserId: string): Promise<CartItemResponseDto[]> {
    try {
      const items = await this.cartRepository.findSelectedByUserId(customerUserId);

      return items.map(
        item =>
          new CartItemResponseDto(
            item.id,
            item.productId,
            item.productSkuId,
            item.productName,
            item.productBrand,
            item.productPrice,
            item.productQuantity,
            item.productPic,
            item.productAttribute,
            item.selectFlag,
            item.createdAt,
            item.updatedAt,
          ),
      );
    } catch (error) {
      this.logger.error(`获取选中购物车商品失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 添加商品到购物车
   */
  async addCartItem(
    customerUserId: string,
    addCartItemDto: AddCartItemDto,
  ): Promise<CartItemResponseDto> {
    try {
      const cartItem = await this.cartDomainService.addItemToCart(
        customerUserId,
        addCartItemDto.productId,
        addCartItemDto.productSkuId,
        addCartItemDto.productName,
        addCartItemDto.productBrand,
        addCartItemDto.productPrice,
        addCartItemDto.productQuantity,
        addCartItemDto.productPic,
        addCartItemDto.productAttribute || '',
      );

      this.logger.log(`用户 ${customerUserId} 添加商品 ${addCartItemDto.productSkuId} 到购物车`);

      return new CartItemResponseDto(
        cartItem.id,
        cartItem.productId,
        cartItem.productSkuId,
        cartItem.productName,
        cartItem.productBrand,
        cartItem.productPrice,
        cartItem.productQuantity,
        cartItem.productPic,
        cartItem.productAttribute,
        cartItem.selectFlag,
        cartItem.createdAt,
        cartItem.updatedAt,
      );
    } catch (error) {
      this.logger.error(`添加购物车商品失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 更新购物车商品
   */
  async updateCartItem(
    customerUserId: string,
    cartItemId: string,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<void> {
    try {
      const cartItem = await this.cartRepository.findByUserIdAndSkuId(
        customerUserId,
        updateCartItemDto.productSkuId,
      );
      if (!cartItem) {
        throw new Error('购物车商品不存在');
      }

      if (updateCartItemDto.productQuantity !== undefined) {
        cartItem.updateQuantity(updateCartItemDto.productQuantity);
      }

      if (updateCartItemDto.selectFlag !== undefined) {
        cartItem.setSelectFlag(updateCartItemDto.selectFlag);
      }

      await this.cartRepository.save(cartItem);
      this.logger.log(`用户 ${customerUserId} 更新购物车商品 ${cartItemId}`);
    } catch (error) {
      this.logger.error(`更新购物车商品失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 批量更新选中状态
   */
  async updateAllSelectFlag(customerUserId: string, selectFlag: boolean): Promise<void> {
    try {
      await this.cartDomainService.updateAllSelectFlag(customerUserId, selectFlag);
      this.logger.log(`用户 ${customerUserId} 批量更新选中状态: ${selectFlag}`);
    } catch (error) {
      this.logger.error(`批量更新选中状态失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 删除购物车商品
   */
  async removeCartItem(customerUserId: string, cartItemId: string): Promise<void> {
    try {
      const cartItem = await this.cartRepository.findByUserIdAndSkuId(customerUserId, cartItemId);
      if (cartItem) {
        await this.cartRepository.remove(cartItem.id);
      }
      this.logger.log(`用户 ${customerUserId} 删除购物车商品 ${cartItemId}`);
    } catch (error) {
      this.logger.error(`删除购物车商品失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 批量删除购物车商品
   */
  async removeCartItems(customerUserId: string, cartItemIds: string[]): Promise<void> {
    try {
      await this.cartRepository.removeBatch(cartItemIds);
      this.logger.log(`用户 ${customerUserId} 批量删除购物车商品: ${cartItemIds.join(', ')}`);
    } catch (error) {
      this.logger.error(`批量删除购物车商品失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 清空选中商品
   */
  async clearSelectedItems(customerUserId: string): Promise<void> {
    try {
      await this.cartDomainService.clearSelectedItems(customerUserId);
      this.logger.log(`用户 ${customerUserId} 清空选中商品`);
    } catch (error) {
      this.logger.error(`清空选中商品失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取购物车摘要
   */
  async getCartSummary(customerUserId: string): Promise<CartSummaryResponseDto> {
    try {
      // 先获取用户的购物车商品
      const cartItems = await this.cartRepository.findByUserId(customerUserId);
      const summary = this.cartDomainService.getCartSummary(cartItems);

      return new CartSummaryResponseDto(
        summary.totalItems,
        summary.selectedItems,
        summary.totalValue,
        summary.selectedValue,
      );
    } catch (error) {
      this.logger.error(`获取购物车摘要失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 统计用户购物车商品数量
   */
  async getCartItemCount(customerUserId: string): Promise<number> {
    try {
      return await this.cartRepository.countByUserId(customerUserId);
    } catch (error) {
      this.logger.error(`统计购物车商品数量失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
