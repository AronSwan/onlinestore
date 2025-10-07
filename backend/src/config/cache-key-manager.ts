// 用途：统一缓存键管理，简化缓存策略
// 依赖文件：unified-master.config.ts
// 作者：后端开发团队
// 时间：2025-06-17 11:20:00

import { createMasterConfiguration } from './unified-master.config';

// Create configuration instance
const masterConfig = createMasterConfiguration();

export class CacheKeyManager {
  private static readonly PREFIX = 'caddy-shopping';
  private static readonly SEPARATOR = ':';
  private static readonly VERSION = 'v1';

  /**
   * 生成统一格式的缓存键
   */
  static generateKey(
    module: string,
    resource: string,
    identifier?: string,
    params?: Record<string, string | number>,
  ): string {
    const parts = [this.PREFIX, masterConfig.app.env, module, resource, identifier].filter(Boolean);

    let key = parts.join(this.SEPARATOR);

    // 添加参数哈希（如果有）
    if (params && Object.keys(params).length > 0) {
      const paramString = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('&');

      const paramHash = this.simpleHash(paramString);
      key += this.SEPARATOR + paramHash;
    }

    return key + this.SEPARATOR + this.VERSION;
  }

  /**
   * 产品相关缓存键
   */
  static product = {
    // 单个产品
    byId: (productId: string) => this.generateKey('products', 'byId', productId),

    // 产品列表
    list: (filters?: { category?: string; page?: number; limit?: number }) =>
      this.generateKey('products', 'list', undefined, filters),

    // 产品分类
    categories: () => this.generateKey('products', 'categories'),

    // 热门产品
    popular: (limit = 10) => this.generateKey('products', 'popular', undefined, { limit }),
  };

  /**
   * 订单相关缓存键
   */
  static order = {
    // 单个订单
    byId: (orderId: string) => this.generateKey('orders', 'byId', orderId),

    // 用户订单列表
    byUser: (userId: string, filters?: { status?: string; page?: number }) =>
      this.generateKey('orders', 'byUser', userId, filters),

    // 订单统计
    statistics: (timeRange?: { start: string; end: string }) =>
      this.generateKey('orders', 'statistics', undefined, timeRange),
  };

  /**
   * 用户相关缓存键
   */
  static user = {
    // 用户信息
    profile: (userId: string) => this.generateKey('users', 'profile', userId),

    // 用户购物车
    cart: (userId: string) => this.generateKey('users', 'cart', userId),

    // 用户地址
    addresses: (userId: string) => this.generateKey('users', 'addresses', userId),
  };

  /**
   * 缓存键工具方法
   */
  static utils = {
    /**
     * 从缓存键解析信息
     */
    parseKey: (key: string) => {
      const parts = key.split(this.SEPARATOR);
      return {
        prefix: parts[0],
        environment: parts[1],
        module: parts[2],
        resource: parts[3],
        identifier: parts[4],
        version: parts[parts.length - 1],
      };
    },

    /**
     * 检查缓存键是否过期（基于TTL）
     */
    isExpired: (key: string, ttl: number, createdAt: number): boolean => {
      return Date.now() - createdAt > ttl;
    },

    /**
     * 生成缓存键模式（用于批量删除）
     */
    pattern: (module?: string, resource?: string) => {
      const parts = [this.PREFIX, masterConfig.app.env, module, resource]
        .filter(Boolean)
        .join(this.SEPARATOR);

      return parts + this.SEPARATOR + '*';
    },

    /**
     * 批量删除相关缓存
     */
    invalidateRelated: (pattern: string): string[] => {
      // 返回匹配的缓存键列表（模拟）
      console.log(`批量删除缓存: ${pattern}`);
      return [];
    },
  };

  /**
   * 缓存配置
   */
  static config = {
    // 默认TTL配置（毫秒）
    defaultTTL: 300000, // 5分钟

    // 模块特定TTL
    TTL: {
      products: {
        byId: 600000, // 10分钟
        list: 300000, // 5分钟
        categories: 1800000, // 30分钟
      },
      orders: {
        byId: 900000, // 15分钟
        byUser: 300000, // 5分钟
        statistics: 60000, // 1分钟
      },
      users: {
        profile: 1200000, // 20分钟
        cart: 180000, // 3分钟（购物车频繁更新）
        addresses: 3600000, // 1小时
      },
    },

    // 缓存策略
    strategies: {
      // 写穿透
      writeThrough: true,

      // 读穿透
      readThrough: true,

      // 缓存降级
      fallback: true,

      // 批量操作
      batchOperations: true,
    },
  };

  /**
   * 私有方法：简单哈希函数
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 生成配置报告
   */
  static generateCacheReport(): string {
    let report = '📊 缓存键管理配置报告\n\n';

    report += '🔑 缓存键格式:\n';
    report += `  - 前缀: ${this.PREFIX}\n`;
    report += `  - 环境: ${masterConfig.app.env}\n`;
    report += `  - 版本: ${this.VERSION}\n`;
    report += `  - 分隔符: ${this.SEPARATOR}\n\n`;

    report += '⏱️  TTL配置:\n';
    Object.entries(this.config.TTL).forEach(([module, ttlConfig]) => {
      report += `  - ${module}:\n`;
      Object.entries(ttlConfig).forEach(([resource, ttl]) => {
        report += `    * ${resource}: ${ttl / 60000}分钟\n`;
      });
    });

    report += '\n💡 使用示例:\n';
    report += `  - 产品缓存: ${this.product.byId('123')}\n`;
    report += `  - 订单列表: ${this.order.byUser('user-456', { page: 1 })}\n`;
    report += `  - 用户购物车: ${this.user.cart('user-789')}\n`;

    return report;
  }
}
