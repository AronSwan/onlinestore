import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CartItemEntity } from './infrastructure/entities/cart-item.entity';
import { RedisCacheService } from '../common/cache/redis-cache.service';
import { MonitoringService } from '../common/monitoring/monitoring.service';
import { CartDomainService } from './domain/services/cart-domain.service';
import { CartRepository } from './domain/repositories/cart.repository';
import { CartRepositoryImpl } from './infrastructure/repositories/cart-repository.impl';

export interface AddToCartDto {
  customerUserId: string;
  productId: string;
  productSkuId: string;
  productName: string;
  productBrand: string;
  productPrice: number;
  productQuantity: number;
  productPic: string;
  productAttribute?: string;
}

export interface UpdateCartDto {
  productQuantity: number;
  selectFlag?: boolean;
}

export interface CartStatistics {
  totalItems: number;
  totalAmount: number;
  selectedItems: number;
  selectedAmount: number;
}

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItemEntity)
    private readonly cartItemRepository: Repository<CartItemEntity>,
    private readonly dataSource: DataSource,
    private readonly cacheService: RedisCacheService,
    private readonly monitoring: MonitoringService,
    private readonly cartDomainService: CartDomainService,
    private readonly cartRepository: CartRepositoryImpl,
  ) {}

  /**
   * 添加商品到购物车
   */
  async addToCart(dto: AddToCartDto): Promise<CartItemEntity> {
    // 检查商品是否已在购物车中
    const existingItem = await this.cartItemRepository.findOne({
      where: {
        customerUserId: dto.customerUserId,
        productSkuId: dto.productSkuId,
        delFlag: false,
      },
    });

    if (existingItem) {
      // 如果商品已存在，更新数量
      const newQuantity = existingItem.productQuantity + dto.productQuantity;
      return this.updateCartItem(existingItem.id, { productQuantity: newQuantity });
    }

    // 创建新的购物车项
    const cartItem = this.cartItemRepository.create({
      ...dto,
      selectFlag: true,
      delFlag: false,
    });

    const saved = await this.cartItemRepository.save(cartItem);

    // 清除缓存
    await this.clearUserCartCache(dto.customerUserId);

    // 记录监控指标
    this.monitoring.recordMetric({
      name: 'cart_item_added',
      type: 'counter' as any,
      value: 1,
      timestamp: Date.now(),
    });

    return saved;
  }

  /**
   * 获取用户购物车列表
   */
  async getUserCart(customerUserId: string): Promise<CartItemEntity[]> {
    const cacheKey = `cart:${customerUserId}`;

    // 尝试从缓存获取
    const cached = await this.cacheService.get<CartItemEntity[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 从数据库获取
    const startDb = process.hrtime.bigint();
    const cartItems = await this.cartItemRepository.find({
      where: {
        customerUserId,
        delFlag: false,
      },
      order: { createdAt: 'DESC' },
    });
    const endDb = process.hrtime.bigint();
    // 记录数据库查询性能
    this.monitoring.recordMetric({
      name: 'db_query_duration',
      type: 'histogram' as any,
      value: Number(endDb - startDb) / 1_000_000_000,
      labels: { table: 'cart', operation: 'list' },
      timestamp: Date.now(),
    });

    // 缓存结果
    await this.cacheService.set(cacheKey, cartItems, { ttl: 300 }); // 5分钟缓存

    return cartItems;
  }

  /**
   * 更新购物车项
   */
  async updateCartItem(id: string, dto: UpdateCartDto): Promise<CartItemEntity> {
    const cartItem = await this.cartItemRepository.findOne({
      where: { id, delFlag: false },
    });

    if (!cartItem) {
      throw new NotFoundException('购物车项不存在');
    }

    await this.cartItemRepository.update(id, dto);

    // 清除缓存
    await this.clearUserCartCache(cartItem.customerUserId);

    const result = await this.cartItemRepository.findOne({ where: { id } });
    if (!result) {
      throw new NotFoundException('更新后找不到购物车项');
    }
    return result;
  }

  /**
   * 删除购物车项
   */
  async removeCartItem(id: string): Promise<void> {
    const cartItem = await this.cartItemRepository.findOne({
      where: { id, delFlag: false },
    });

    if (!cartItem) {
      throw new NotFoundException('购物车项不存在');
    }

    // 软删除
    await this.cartItemRepository.update(id, { delFlag: true });

    // 清除缓存
    await this.clearUserCartCache(cartItem.customerUserId);
  }

  /**
   * 批量选择/取消选择购物车项
   */
  async batchUpdateSelection(
    customerUserId: string,
    itemIds: string[],
    selectFlag: boolean,
  ): Promise<void> {
    // 批量更新需要分别处理每个ID
    for (const itemId of itemIds) {
      await this.cartItemRepository.update(
        {
          customerUserId,
          id: itemId,
          delFlag: false,
        },
        { selectFlag },
      );
    }

    // 清除缓存
    await this.clearUserCartCache(customerUserId);
  }

  /**
   * 清空用户购物车
   */
  async clearCart(customerUserId: string): Promise<void> {
    await this.cartItemRepository.update({ customerUserId, delFlag: false }, { delFlag: true });

    // 清除缓存
    await this.clearUserCartCache(customerUserId);
  }

  /**
   * 获取购物车统计信息
   */
  async getCartStatistics(customerUserId: string): Promise<CartStatistics> {
    const cartItems = await this.getUserCart(customerUserId);

    const totalItems = cartItems.reduce((sum, item) => sum + item.productQuantity, 0);
    const totalAmount = cartItems.reduce(
      (sum, item) => sum + item.productPrice * item.productQuantity,
      0,
    );

    const selectedItems = cartItems
      .filter(item => item.selectFlag)
      .reduce((sum, item) => sum + item.productQuantity, 0);
    const selectedAmount = cartItems
      .filter(item => item.selectFlag)
      .reduce((sum, item) => sum + item.productPrice * item.productQuantity, 0);

    return {
      totalItems,
      totalAmount,
      selectedItems,
      selectedAmount,
    };
  }

  /**
   * 获取选中的购物车项
   */
  async getSelectedCartItems(customerUserId: string): Promise<CartItemEntity[]> {
    const cacheKey = `cart:selected:${customerUserId}`;

    // 尝试从缓存获取
    const cached = await this.cacheService.get<CartItemEntity[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const startDb = process.hrtime.bigint();
    const selectedItems = await this.cartItemRepository.find({
      where: {
        customerUserId,
        selectFlag: true,
        delFlag: false,
      },
      order: { createdAt: 'DESC' },
    });
    const endDb = process.hrtime.bigint();
    // 记录数据库查询性能
    this.monitoring.recordMetric({
      name: 'db_query_duration',
      type: 'histogram' as any,
      value: Number(endDb - startDb) / 1_000_000_000,
      labels: { table: 'cart', operation: 'list_selected' },
      timestamp: Date.now(),
    });

    // 缓存结果
    await this.cacheService.set(cacheKey, selectedItems, { ttl: 300 });

    return selectedItems;
  }

  /**
   * 清除用户购物车缓存
   */
  private async clearUserCartCache(customerUserId: string): Promise<void> {
    const keys = [
      `cart:${customerUserId}`,
      `cart:selected:${customerUserId}`,
      `cart:statistics:${customerUserId}`,
    ];

    for (const key of keys) {
      await this.cacheService.delete(key);
    }
  }

  /**
   * 验证购物车项库存
   */
  async validateCartStock(customerUserId: string): Promise<{
    valid: boolean;
    invalidItems: Array<{
      id: string;
      productName: string;
      requestedQuantity: number;
      availableStock: number;
    }>;
  }> {
    const cartItems = await this.getSelectedCartItems(customerUserId);
    const invalidItems: Array<{
      id: string;
      productName: string;
      requestedQuantity: number;
      availableStock: number;
    }> = [];

    // 这里应该调用产品服务验证库存
    // 简化实现，假设所有商品都有足够库存
    for (const item of cartItems) {
      // 实际实现中需要调用产品服务获取真实库存
      const availableStock = 100; // 模拟库存

      if (item.productQuantity > availableStock) {
        invalidItems.push({
          id: item.id,
          productName: item.productName,
          requestedQuantity: item.productQuantity,
          availableStock,
        });
      }
    }

    return {
      valid: invalidItems.length === 0,
      invalidItems,
    };
  }
}
