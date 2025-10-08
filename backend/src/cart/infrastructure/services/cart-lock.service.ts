import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRedisClient, RedisLike } from '../../../common/redis/redis-utils';
import { CartRedisConfig } from '../config/cart-redis.config';

/**
 * 购物车分布式锁服务
 * 提供基于Redis的分布式锁功能，支持重试机制和锁超时
 */
@Injectable()
export class CartLockService implements OnModuleDestroy {
  private readonly logger = new Logger(CartLockService.name);
  private readonly redis: RedisLike;
  private readonly lockTimeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly cartRedisConfig: CartRedisConfig,
  ) {
    this.redis = createRedisClient(this.configService, this.cartRedisConfig.getLockConfig());
    const timeoutConfig = this.cartRedisConfig.getLockTimeout();
    this.lockTimeout = timeoutConfig.lockTimeout;
    this.maxRetries = timeoutConfig.retryCount;
    this.retryDelay = timeoutConfig.retryDelay;
  }

  /**
   * 获取分布式锁（带重试机制）
   * @param lockKey 锁键
   * @param requestId 请求ID，用于标识锁的所有者
   * @param expireTime 锁过期时间（毫秒）
   * @returns 是否成功获取锁
   */
  async tryLockWithRetry(
    lockKey: string,
    requestId: string,
    expireTime: number = this.lockTimeout,
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const acquired = await this.tryLock(lockKey, requestId, expireTime);

      if (acquired) {
        this.logger.debug(`获取锁成功: ${lockKey}, 尝试次数: ${attempt}, requestId: ${requestId}`);
        return true;
      }

      if (attempt < this.maxRetries) {
        this.logger.debug(
          `获取锁失败，等待重试: ${lockKey}, 尝试次数: ${attempt}, requestId: ${requestId}`,
        );
        await this.sleep(this.retryDelay);
      }
    }

    this.logger.warn(`获取锁失败，达到最大重试次数: ${lockKey}, requestId: ${requestId}`);
    return false;
  }

  /**
   * 尝试获取分布式锁
   * @param lockKey 锁键
   * @param requestId 请求ID
   * @param expireTime 锁过期时间（毫秒）
   * @returns 是否成功获取锁
   */
  private async tryLock(lockKey: string, requestId: string, expireTime: number): Promise<boolean> {
    try {
      const result = await this.redis.set(lockKey, requestId, 'PX', expireTime, 'NX');

      return result === 'OK';
    } catch (error) {
      this.logger.error(`获取锁异常: ${lockKey}`, error);
      return false;
    }
  }

  /**
   * 释放分布式锁
   * @param lockKey 锁键
   * @param requestId 请求ID
   * @returns 是否成功释放锁
   */
  async releaseLock(lockKey: string, requestId: string): Promise<boolean> {
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = (await this.redis.eval(luaScript, 1, lockKey, requestId)) as number;
      const success = result === 1;

      if (success) {
        this.logger.debug(`释放锁成功: ${lockKey}, requestId: ${requestId}`);
      } else {
        this.logger.debug(`释放锁失败: ${lockKey}, requestId: ${requestId}`);
      }

      return success;
    } catch (error) {
      this.logger.error(`释放锁异常: ${lockKey}`, error);
      return false;
    }
  }

  /**
   * 执行带锁的操作
   * @param lockKey 锁键
   * @param operation 要执行的操作
   * @param expireTime 锁过期时间（毫秒）
   * @returns 操作结果
   */
  async executeWithLock<T>(
    lockKey: string,
    operation: () => Promise<T>,
    expireTime: number = this.lockTimeout,
  ): Promise<T> {
    const requestId = this.generateRequestId();
    const lockAcquired = await this.tryLockWithRetry(lockKey, requestId, expireTime);

    if (!lockAcquired) {
      throw new Error(`无法获取锁: ${lockKey}`);
    }

    try {
      return await operation();
    } finally {
      await this.releaseLock(lockKey, requestId);
    }
  }

  /**
   * 生成请求ID
   * @returns 唯一的请求ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 睡眠指定时间
   * @param ms 睡眠时间（毫秒）
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 模块销毁时断开Redis连接
   */
  async onModuleDestroy() {
    await this.redis.disconnect();
  }
}
