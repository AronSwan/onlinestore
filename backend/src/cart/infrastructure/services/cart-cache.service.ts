import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRedisClient, RedisLike } from '../../../common/redis/redis-utils';
import { CartRedisConfig } from '../config/cart-redis.config';
import { CartItemAggregate } from '../../domain/aggregates/cart-item.aggregate';

/**
 * 购物车缓存服务
 * 基于 CongoMall 的 Redis 缓存策略
 */
@Injectable()
export class CartCacheService {
  private readonly logger = new Logger(CartCacheService.name);
  private readonly redis: RedisLike;
  private readonly ttl: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly cartRedisConfig: CartRedisConfig,
  ) {
    const cacheConfig = this.cartRedisConfig.getCacheConfig();
    this.redis = createRedisClient(this.configService, cacheConfig);
    this.ttl = cacheConfig.ttl;
  }

  /**
   * 缓存用户购物车商品列表
   */
  async cacheCartItems(userId: string, items: CartItemAggregate[]): Promise<void> {
    try {
      const cacheKey = CartRedisConfig.generateCacheKey(userId, 'items');
      const cacheData = items.map(item => ({
        id: item.id,
        userId: item.customerUserId,
        productId: item.productId,
        productSkuId: item.productSkuId,
        productName: item.productName,
        productBrand: item.productBrand,
        productPrice: item.productPrice,
        productQuantity: item.productQuantity,
        productPic: item.productPic,
        productAttribute: item.productAttribute,
        selectFlag: item.selectFlag,
        delFlag: item.delFlag,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      await this.redis.setex(cacheKey, this.ttl, JSON.stringify(cacheData));
      this.logger.debug(`缓存购物车商品列表: ${userId}, 商品数量: ${items.length}`);
    } catch (error) {
      this.logger.error(`缓存购物车商品列表失败: ${userId}`, error);
    }
  }

  /**
   * 获取缓存的购物车商品列表
   */
  async getCachedCartItems(userId: string): Promise<CartItemAggregate[] | null> {
    try {
      const cacheKey = CartRedisConfig.generateCacheKey(userId, 'items');
      const cacheData = await this.redis.get(cacheKey);

      if (!cacheData) {
        return null;
      }

      const items = JSON.parse(cacheData);
      return items.map(
        (item: any) =>
          new CartItemAggregate(
            item.id,
            item.userId,
            item.productId,
            item.productSkuId,
            item.productName,
            item.productBrand,
            item.productPrice,
            item.productQuantity,
            item.productPic,
            item.productAttribute,
            item.selectFlag,
            item.delFlag,
            new Date(item.createdAt),
            new Date(item.updatedAt),
          ),
      );
    } catch (error) {
      this.logger.error(`获取缓存购物车商品列表失败: ${userId}`, error);
      return null;
    }
  }

  /**
   * 缓存购物车商品数量
   */
  async cacheCartCount(userId: string, count: number): Promise<void> {
    try {
      const cacheKey = CartRedisConfig.generateCacheKey(userId, 'count');
      await this.redis.setex(cacheKey, this.ttl, count.toString());
      this.logger.debug(`缓存购物车商品数量: ${userId}, 数量: ${count}`);
    } catch (error) {
      this.logger.error(`缓存购物车商品数量失败: ${userId}`, error);
    }
  }

  /**
   * 获取缓存的购物车商品数量
   */
  async getCachedCartCount(userId: string): Promise<number | null> {
    try {
      const cacheKey = CartRedisConfig.generateCacheKey(userId, 'count');
      const count = await this.redis.get(cacheKey);
      return count ? parseInt(count, 10) : null;
    } catch (error) {
      this.logger.error(`获取缓存购物车商品数量失败: ${userId}`, error);
      return null;
    }
  }

  /**
   * 缓存购物车总金额
   */
  async cacheCartTotal(userId: string, total: number): Promise<void> {
    try {
      const cacheKey = CartRedisConfig.generateCacheKey(userId, 'total');
      await this.redis.setex(cacheKey, this.ttl, total.toString());
      this.logger.debug(`缓存购物车总金额: ${userId}, 金额: ${total}`);
    } catch (error) {
      this.logger.error(`缓存购物车总金额失败: ${userId}`, error);
    }
  }

  /**
   * 获取缓存的购物车总金额
   */
  async getCachedCartTotal(userId: string): Promise<number | null> {
    try {
      const cacheKey = CartRedisConfig.generateCacheKey(userId, 'total');
      const total = await this.redis.get(cacheKey);
      return total ? parseFloat(total) : null;
    } catch (error) {
      this.logger.error(`获取缓存购物车总金额失败: ${userId}`, error);
      return null;
    }
  }

  /**
   * 清除用户购物车缓存
   */
  async clearCartCache(userId: string): Promise<void> {
    try {
      const keys = [
        CartRedisConfig.generateCacheKey(userId, 'items'),
        CartRedisConfig.generateCacheKey(userId, 'count'),
        CartRedisConfig.generateCacheKey(userId, 'total'),
      ];

      await this.redis.del(...keys);
      this.logger.debug(`清除购物车缓存: ${userId}`);
    } catch (error) {
      this.logger.error(`清除购物车缓存失败: ${userId}`, error);
    }
  }

  /**
   * 批量清除购物车缓存
   */
  async clearCartCacheBatch(userIds: string[]): Promise<void> {
    try {
      const keys: string[] = [];
      userIds.forEach(userId => {
        keys.push(
          CartRedisConfig.generateCacheKey(userId, 'items'),
          CartRedisConfig.generateCacheKey(userId, 'count'),
          CartRedisConfig.generateCacheKey(userId, 'total'),
        );
      });

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`批量清除购物车缓存: ${userIds.length} 个用户`);
      }
    } catch (error) {
      this.logger.error(`批量清除购物车缓存失败`, error);
    }
  }

  async onModuleDestroy() {
    await this.redis.disconnect();
  }
}
