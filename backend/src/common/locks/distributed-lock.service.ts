import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { randomBytes } from 'crypto';

/**
 * 分布式锁选项
 */
export interface DistributedLockOptions {
  /**
   * 锁的键名
   */
  key: string;

  /**
   * 锁的超时时间（毫秒）
   */
  ttl?: number;

  /**
   * 获取锁的重试间隔（毫秒）
   */
  retryInterval?: number;

  /**
   * 获取锁的最大重试次数
   */
  maxRetries?: number;

  /**
   * 锁的自动续期间隔（毫秒）
   */
  autoRenewalInterval?: number;
}

/**
 * 分布式锁实例
 */
export interface DistributedLock {
  /**
   * 锁的键名
   */
  key: string;

  /**
   * 锁的唯一标识
   */
  identifier: string;

  /**
   * 锁的过期时间
   */
  expiresAt: number;

  /**
   * 释放锁
   */
  release(): Promise<boolean>;

  /**
   * 延长锁的过期时间
   */
  extend(ttl: number): Promise<boolean>;

  /**
   * 检查锁是否仍然有效
   */
  isValid(): Promise<boolean>;
}

/**
 * 基于Redis的分布式锁实现
 */
@Injectable()
export class DistributedLockService implements OnModuleDestroy {
  private readonly logger = new Logger(DistributedLockService.name);
  private readonly redis: Redis;
  private readonly locks = new Map<string, { interval: NodeJS.Timeout; lock: any }>();

  constructor(
    private readonly redisOptions: {
      host: string;
      port: number;
      password?: string;
      db?: number;
    },
  ) {
    this.redis = new Redis(redisOptions);
    this.redis.on('error', error => {
      this.logger.error('Redis connection error:', error);
    });
  }

  /**
   * 获取分布式锁
   */
  async acquireLock(options: DistributedLockOptions): Promise<DistributedLock> {
    const {
      key,
      ttl = 30000, // 默认30秒
      retryInterval = 100, // 默认100毫秒
      maxRetries = 30, // 默认重试30次
      autoRenewalInterval = ttl * 0.6, // 默认在60%时间后续期
    } = options;

    const identifier = this.generateIdentifier();
    const expiresAt = Date.now() + ttl;

    this.logger.debug(`Attempting to acquire lock: ${key}`);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 使用SET命令的NX和PX选项实现原子性的获取锁
        const result = await this.redis.set(
          key,
          identifier,
          'PX', // 设置过期时间（毫秒）
          ttl,
          'NX', // 只在键不存在时设置
        );

        if (result === 'OK') {
          this.logger.debug(`Successfully acquired lock: ${key}`);

          // 创建锁实例
          const lock = this.createLockInstance(key, identifier, expiresAt);

          // 如果需要自动续期
          if (autoRenewalInterval > 0) {
            this.setupAutoRenewal(key, identifier, ttl, autoRenewalInterval, lock);
          }

          return lock;
        }

        // 如果获取失败，等待重试
        if (attempt < maxRetries) {
          await this.sleep(retryInterval);
        }
      } catch (error) {
        this.logger.error(`Error acquiring lock ${key}:`, error);

        // 如果是最后一次尝试，抛出错误
        if (attempt === maxRetries) {
          throw new Error(
            `Failed to acquire lock ${key} after ${maxRetries} attempts: ${error.message}`,
          );
        }

        // 等待重试
        await this.sleep(retryInterval);
      }
    }

    throw new Error(`Failed to acquire lock ${key} after ${maxRetries} attempts`);
  }

  /**
   * 创建锁实例
   */
  private createLockInstance(key: string, identifier: string, expiresAt: number): DistributedLock {
    return {
      key,
      identifier,
      expiresAt,

      async release(): Promise<boolean> {
        try {
          // 使用Lua脚本确保原子性的释放锁
          const luaScript = `
            if redis.call("GET", KEYS[1]) == ARGV[1] then
              return redis.call("DEL", KEYS[1])
            else
              return 0
            end
          `;

          const result = await this.redis.eval(luaScript, 1, key, identifier);
          const released = result === 1;

          if (released) {
            // 清理自动续期
            this.clearAutoRenewal(key);
          }

          return released;
        } catch (error) {
          throw new Error(`Failed to release lock ${key}: ${error.message}`);
        }
      },

      async extend(ttl: number): Promise<boolean> {
        try {
          // 使用Lua脚本确保原子性的延长锁
          const luaScript = `
            if redis.call("GET", KEYS[1]) == ARGV[1] then
              return redis.call("PEXPIRE", KEYS[1], ARGV[2])
            else
              return 0
            end
          `;

          const result = await this.redis.eval(luaScript, 1, key, identifier, ttl.toString());
          const extended = result === 1;

          if (extended) {
            // 更新过期时间
            this.expiresAt = Date.now() + ttl;
          }

          return extended;
        } catch (error) {
          throw new Error(`Failed to extend lock ${key}: ${error.message}`);
        }
      },

      async isValid(): Promise<boolean> {
        try {
          const currentValue = await this.redis.get(key);
          return currentValue === identifier;
        } catch (error) {
          throw new Error(`Failed to check lock validity ${key}: ${error.message}`);
        }
      },
    };
  }

  /**
   * 设置自动续期
   */
  private setupAutoRenewal(
    key: string,
    identifier: string,
    ttl: number,
    interval: number,
    lock: DistributedLock,
  ): void {
    const renewalInterval = setInterval(async () => {
      try {
        const extended = await lock.extend(ttl);
        if (extended) {
          this.logger.debug(`Successfully renewed lock: ${key}`);
        } else {
          this.logger.warn(`Failed to renew lock: ${key}, clearing auto-renewal`);
          this.clearAutoRenewal(key);
        }
      } catch (error) {
        this.logger.error(`Error renewing lock ${key}:`, error);
        // 如果续期失败，清理自动续期
        this.clearAutoRenewal(key);
      }
    }, interval);

    // 存储续期信息以便清理
    this.locks.set(key, { interval: renewalInterval, lock });
  }

  /**
   * 清理自动续期
   */
  private clearAutoRenewal(key: string): void {
    const renewalInfo = this.locks.get(key);
    if (renewalInfo) {
      clearInterval(renewalInfo.interval);
      this.locks.delete(key);
    }
  }

  /**
   * 生成唯一标识
   */
  private generateIdentifier(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 创建读写锁
   */
  async createReadWriteLock(keyPrefix: string): Promise<{
    readLock: () => Promise<DistributedLock>;
    writeLock: () => Promise<DistributedLock>;
  }> {
    const readLockKey = `${keyPrefix}:read`;
    const writeLockKey = `${keyPrefix}:write`;
    const readCountKey = `${keyPrefix}:read_count`;

    return {
      readLock: async () => {
        const readIdentifier = this.generateIdentifier();
        const readLock = await this.acquireLock({
          key: readLockKey,
          ttl: 30000,
          retryInterval: 100,
          maxRetries: 30,
        });

        // 增加读计数
        await this.redis.incr(readCountKey);
        await this.redis.expire(readCountKey, 30);

        // 创建扩展的读锁实例
        return {
          ...readLock,
          async release(): Promise<boolean> {
            const released = await readLock.release();

            if (released) {
              // 减少读计数
              const count = await this.redis.decr(readCountKey);
              if (count <= 0) {
                await this.redis.del(readCountKey);
              }
            }

            return released;
          },
        };
      },

      writeLock: async () => {
        // 检查是否有活跃的读锁
        const readCount = await this.redis.get(readCountKey);
        if (readCount && parseInt(readCount, 10) > 0) {
          throw new Error('Cannot acquire write lock while read locks are active');
        }

        return this.acquireLock({
          key: writeLockKey,
          ttl: 30000,
          retryInterval: 100,
          maxRetries: 30,
        });
      },
    };
  }

  /**
   * 获取锁状态
   */
  async getLockStatus(key: string): Promise<{
    exists: boolean;
    ttl?: number;
    identifier?: string;
  }> {
    try {
      const exists = await this.redis.exists(key);
      if (!exists) {
        return { exists: false };
      }

      const identifier = await this.redis.get(key);
      const ttl = await this.redis.pttl(key);

      return {
        exists: true,
        ttl: ttl > 0 ? ttl : undefined,
        identifier: identifier || undefined,
      };
    } catch (error) {
      throw new Error(`Failed to get lock status ${key}: ${error.message}`);
    }
  }

  /**
   * 强制释放锁（管理员功能）
   */
  async forceReleaseLock(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      const released = result === 1;

      if (released) {
        this.clearAutoRenewal(key);
      }

      return released;
    } catch (error) {
      throw new Error(`Failed to force release lock ${key}: ${error.message}`);
    }
  }

  /**
   * 清理所有锁和续期
   */
  async cleanup(): Promise<void> {
    // 清理所有自动续期
    for (const [key, renewalInfo] of this.locks.entries()) {
      clearInterval(renewalInfo.interval);
      try {
        await renewalInfo.lock.release();
      } catch (error) {
        this.logger.error(`Error releasing lock ${key} during cleanup:`, error);
      }
    }
    this.locks.clear();
  }

  /**
   * 模块销毁时的清理
   */
  async onModuleDestroy(): Promise<void> {
    await this.cleanup();
    await this.redis.quit();
  }
}
