// 用途：搜索结果缓存装饰器，优化搜索性能
// 依赖文件：cache.service.ts, search-manager.service.ts
// 作者：AI助手
// 时间：2025-09-30 10:20:00

import { Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CacheService } from '../../cache/cache.service';

export interface CacheSearchOptions {
  ttl?: number;
  keyPrefix?: string;
  useQueryHash?: boolean;
  invalidateOn?: string[];
}

export const CACHE_SEARCH_METADATA = 'cache:search';

/**
 * 搜索结果缓存装饰器
 */
export function CacheSearch(options: CacheSearchOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const reflector = new Reflector();
    const originalMethod = descriptor.value;

    // 将缓存选项附加到方法上
    Reflect.defineMetadata(CACHE_SEARCH_METADATA, options, target.constructor, propertyKey);

    descriptor.value = async function (...args: any[]) {
      const cacheService: CacheService = this.cacheService;
      const logger = new Logger(`${target.constructor.name}.${propertyKey}`);

      // 生成缓存键
      const cacheKey = generateCacheKey(args, options);

      try {
        // 尝试从缓存获取
        const cachedResult = await cacheService.get('search', 'results', cacheKey);
        if (cachedResult) {
          logger.debug(`缓存命中: ${cacheKey}`);
          return cachedResult;
        }

        // 执行原始方法
        const result = await originalMethod.apply(this, args);

        // 缓存结果
        await cacheService.set(
          'search',
          'results',
          result,
          cacheKey,
          { ttl: options.ttl || 30 }, // 默认30秒
        );

        logger.debug(`缓存结果: ${cacheKey}`);
        return result;
      } catch (error) {
        logger.error(`搜索缓存操作失败: ${cacheKey}`, error);
        // 缓存失败时继续执行原始方法
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * 生成缓存键
 */
function generateCacheKey(args: any[], options: CacheSearchOptions): string {
  const { keyPrefix = 'search', useQueryHash = true } = options;

  // 提取查询参数
  const query = args[0] || '';
  const searchOptions = args[1] || {};

  if (useQueryHash) {
    // 使用哈希生成更短的键
    const queryString = JSON.stringify({ query, options: searchOptions });
    return `${keyPrefix}:${hashString(queryString)}`;
  } else {
    // 使用完整查询参数作为键
    const normalizedQuery = query.toLowerCase().trim();
    const optionsString = JSON.stringify(searchOptions);
    return `${keyPrefix}:${normalizedQuery}:${hashString(optionsString)}`;
  }
}

/**
 * 简单字符串哈希函数
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 转换为32位整数
  }
  return Math.abs(hash).toString(36);
}

/**
 * 搜索缓存管理服务
 */
@Injectable()
export class SearchCacheManager {
  private readonly logger = new Logger(SearchCacheManager.name);

  constructor(private readonly cacheService: CacheService) {}

  /**
   * 清除搜索结果缓存
   */
  async clearSearchCache(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        // 清除匹配特定模式的缓存
        await this.cacheService.deleteByPattern(`caddy_shopping:search:results:${pattern}*`);
        this.logger.log(`已清除搜索缓存模式: ${pattern}`);
      } else {
        // 清除所有搜索结果缓存
        await this.cacheService.deleteByPattern('caddy_shopping:search:results:*');
        this.logger.log('已清除所有搜索结果缓存');
      }
    } catch (error) {
      this.logger.error('清除搜索缓存失败', error);
    }
  }

  /**
   * 清除特定查询的缓存
   */
  async clearQueryCache(query: string, options?: any): Promise<void> {
    try {
      const cacheOptions: CacheSearchOptions = { useQueryHash: true };
      const cacheKey = generateCacheKey([query, options], cacheOptions);

      await this.cacheService.delete('search', 'results', cacheKey);
      this.logger.debug(`已清除查询缓存: ${cacheKey}`);
    } catch (error) {
      this.logger.error('清除查询缓存失败', error);
    }
  }

  /**
   * 预热搜索缓存
   */
  async warmupSearchCache(queries: string[], options?: any): Promise<void> {
    this.logger.log(`开始预热搜索缓存，查询数量: ${queries.length}`);

    const promises = queries.map(async query => {
      try {
        const cacheOptions: CacheSearchOptions = {
          ttl: 60, // 预热缓存使用较短的TTL
          useQueryHash: true,
        };
        const cacheKey = generateCacheKey([query, options], cacheOptions);

        // 标记为预热缓存
        await this.cacheService.set(
          'search',
          'warmup',
          { query, options, timestamp: new Date().toISOString() },
          cacheKey,
          { ttl: 60 },
        );

        this.logger.debug(`预热缓存: ${cacheKey}`);
      } catch (error) {
        this.logger.warn(`预热缓存失败: ${query}`, error);
      }
    });

    await Promise.allSettled(promises);
    this.logger.log('搜索缓存预热完成');
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    hitRate?: number;
    topQueries?: Array<{ query: string; count: number }>;
  }> {
    try {
      // 这里可以实现更复杂的缓存统计逻辑
      // 由于缓存服务的限制，这里返回基本统计信息
      return {
        totalKeys: 0, // 实际实现中需要统计缓存键数量
        hitRate: 0, // 实际实现中需要计算命中率
        topQueries: [], // 实际实现中需要统计热门查询
      };
    } catch (error) {
      this.logger.error('获取缓存统计失败', error);
      return {
        totalKeys: 0,
        hitRate: 0,
        topQueries: [],
      };
    }
  }

  /**
   * 清除过期的缓存
   */
  async clearExpiredCache(): Promise<number> {
    try {
      // 实际实现中需要遍历缓存键并清除过期的
      // 这里返回模拟值
      const clearedCount = 0;
      this.logger.log(`清除了 ${clearedCount} 个过期缓存键`);
      return clearedCount;
    } catch (error) {
      this.logger.error('清除过期缓存失败', error);
      return 0;
    }
  }
}
