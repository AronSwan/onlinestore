import { Injectable } from '@nestjs/common';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitService {
  private rateLimitStore = new Map<string, RateLimitRecord>();

  // 默认限制：每分钟100次请求
  private readonly DEFAULT_LIMIT = 100;
  private readonly DEFAULT_WINDOW = 60 * 1000; // 1分钟

  /**
   * 检查速率限制
   */
  async checkRateLimit(
    clientIp: string,
    endpoint: string,
    limit: number = this.DEFAULT_LIMIT,
    windowMs: number = this.DEFAULT_WINDOW,
  ): Promise<boolean> {
    const key = `${clientIp}:${endpoint}`;
    const now = Date.now();

    const record = this.rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      // 创建新记录或重置过期记录
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (record.count >= limit) {
      return false; // 超出限制
    }

    // 增加计数
    record.count++;
    this.rateLimitStore.set(key, record);

    return true;
  }

  /**
   * 获取剩余请求次数
   */
  async getRemainingRequests(
    clientIp: string,
    endpoint: string,
    limit: number = this.DEFAULT_LIMIT,
  ): Promise<number> {
    const key = `${clientIp}:${endpoint}`;
    const record = this.rateLimitStore.get(key);

    if (!record || Date.now() > record.resetTime) {
      return limit;
    }

    return Math.max(0, limit - record.count);
  }

  /**
   * 清理过期记录
   */
  async cleanupExpiredRecords(): Promise<void> {
    const now = Date.now();
    for (const [key, record] of this.rateLimitStore.entries()) {
      if (now > record.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * 获取速率限制统计
   */
  async getRateLimitStats(): Promise<{
    totalKeys: number;
    activeKeys: number;
    topConsumers: Array<{ key: string; count: number }>;
  }> {
    const now = Date.now();
    const activeRecords: Array<{ key: string; count: number }> = [];

    for (const [key, record] of this.rateLimitStore.entries()) {
      if (now <= record.resetTime) {
        activeRecords.push({ key, count: record.count });
      }
    }

    // 按使用量排序
    activeRecords.sort((a, b) => b.count - a.count);

    return {
      totalKeys: this.rateLimitStore.size,
      activeKeys: activeRecords.length,
      topConsumers: activeRecords.slice(0, 10),
    };
  }
}
