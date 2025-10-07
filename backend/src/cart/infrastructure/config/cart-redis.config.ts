import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 购物车 Redis 配置
 * 基于 CongoMall 的分布式锁和缓存策略
 */
@Injectable()
export class CartRedisConfig {
  constructor(private readonly configService: ConfigService) {}

  /**
   * 获取购物车锁的 Redis 配置
   */
  getLockConfig() {
    return {
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('CART_REDIS_DB', 1),
      keyPrefix: 'cart:lock:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    };
  }

  /**
   * 获取购物车缓存的 Redis 配置
   */
  getCacheConfig() {
    return {
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('CART_CACHE_REDIS_DB', 2),
      keyPrefix: 'cart:cache:',
      ttl: this.configService.get('CART_CACHE_TTL', 3600), // 1小时
    };
  }

  /**
   * 购物车锁的超时配置
   */
  getLockTimeout() {
    return {
      lockTimeout: this.configService.get('CART_LOCK_TIMEOUT', 30000), // 30秒
      retryDelay: this.configService.get('CART_LOCK_RETRY_DELAY', 100), // 100ms
      retryCount: this.configService.get('CART_LOCK_RETRY_COUNT', 10),
    };
  }

  /**
   * 购物车缓存键生成器
   */
  static generateCacheKey(userId: string, type: 'items' | 'count' | 'total' = 'items'): string {
    return `cart:cache:${type}:${userId}`;
  }

  /**
   * 购物车锁键生成器
   */
  static generateLockKey(userId: string, productSkuId?: string): string {
    const baseKey = `cart:lock:${userId}`;
    return productSkuId ? `${baseKey}:${productSkuId}` : baseKey;
  }

  /**
   * 获取缓存策略配置
   */
  getCacheStrategy(): {
    strategy: 'write-through' | 'write-behind' | 'cache-aside';
    enableCompression: boolean;
    compressionThreshold: number;
  } {
    return {
      strategy: this.configService.get<'write-through' | 'write-behind' | 'cache-aside'>(
        'CART_CACHE_STRATEGY',
        'cache-aside',
      ),
      enableCompression: this.configService.get<boolean>('CART_CACHE_COMPRESSION', false),
      compressionThreshold: this.configService.get<number>(
        'CART_CACHE_COMPRESSION_THRESHOLD',
        1024,
      ),
    };
  }
}
