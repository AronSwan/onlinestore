# ⚡ 现实可行的两级缓存策略

> **简化缓存策略为现实可行的两级缓存** - 先内存 + Redis 两层，明确失效/预热/一致性策略，避免把数据库当"L3缓存"  
> **更新时间**: 2025-10-02  
> **适用范围**: 所有缓存相关功能实现

---

## 🎯 缓存策略优化概述

### 当前问题分析
原计划中的多级缓存(L1/L2/L3)可能带来的问题：
- 过度设计，增加系统复杂度
- L3缓存(数据库)概念混淆，不符合缓存本质
- 缓存一致性策略复杂，难以维护
- ROI不明确，投入产出比低

### 优化实施方案
采用简化的两级缓存策略：
1. **L1缓存(内存)**：最快访问，容量小，存储热点数据
2. **L2缓存(Redis)**：较快访问，容量大，存储常用数据
3. **明确的失效策略**：基于TTL和标签化的失效机制
4. **事件驱动一致性**：通过领域事件保证缓存一致性

---

## 📋 两级缓存架构设计

### 缓存层次结构
```typescript
// 缓存层次定义
export enum CacheLevel {
  L1 = 'L1', // 内存缓存
  L2 = 'L2'  // Redis缓存
}

export interface CacheEntry<T> {
  data: T;
  ttl: number; // 生存时间(秒)
  tags: string[]; // 缓存标签
  createdAt: Date;
  accessedAt: Date;
  accessCount: number;
}

// 缓存配置接口
export interface CacheConfig {
  // L1缓存配置
  l1: {
    maxSize: number; // 最大条目数
    ttl: number; // 默认TTL(秒)
    cleanupInterval: number; // 清理间隔(秒)
  };
  
  // L2缓存配置
  l2: {
    ttl: number; // 默认TTL(秒)
    keyPrefix: string; // 键前缀
    maxRetries: number; // 最大重试次数
    retryDelay: number; // 重试延迟(毫秒)
  };
  
  // 缓存策略配置
  strategy: {
    writeThrough: boolean; // 写入策略
    writeBehind: boolean; // 写回策略
    refreshAhead: boolean; // 预刷新策略
  };
}
```

### 两级缓存服务实现
```typescript
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class TwoLevelCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(TwoLevelCacheService.name);
  private readonly l1Cache = new Map<string, CacheEntry<any>>();
  private readonly l1AccessOrder = new Map<string, Date>(); // LRU访问顺序
  private cleanupTimer: NodeJS.Timeout;
  
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly configService: ConfigService
  ) {
    // 启动L1缓存清理定时器
    this.startCleanupTimer();
  }

  /**
   * 获取缓存数据
   * @param key 缓存键
   * @returns 缓存数据或null
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // 1. 先从L1缓存获取
      let result = await this.getFromL1<T>(key);
      if (result !== null) {
        this.logger.debug(`Cache hit (L1): ${key}`);
        return result;
      }

      // 2. 从L2缓存获取
      result = await this.getFromL2<T>(key);
      if (result !== null) {
        this.logger.debug(`Cache hit (L2): ${key}`);
        
        // 3. 回填L1缓存
        await this.setToL1(key, result, this.getL1TTL(key));
        return result;
      }

      this.logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}`, { error: error.message });
      return null;
    }
  }

  /**
   * 设置缓存数据
   * @param key 缓存键
   * @param data 缓存数据
   * @param ttl 生存时间(秒)
   * @param tags 缓存标签
   */
  async set<T>(key: string, data: T, ttl?: number, tags: string[] = []): Promise<void> {
    try {
      const l1TTL = ttl || this.getL1TTL(key);
      const l2TTL = ttl || this.getL2TTL(key);

      // 1. 设置L1缓存
      await this.setToL1(key, data, l1TTL, tags);

      // 2. 设置L2缓存
      await this.setToL2(key, data, l2TTL, tags);

      this.logger.debug(`Cache set: ${key} (L1: ${l1TTL}s, L2: ${l2TTL}s)`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}`, { error: error.message });
    }
  }

  /**
   * 删除缓存数据
   * @param key 缓存键
   */
  async delete(key: string): Promise<void> {
    try {
      // 1. 从L1缓存删除
      this.l1Cache.delete(key);
      this.l1AccessOrder.delete(key);

      // 2. 从L2缓存删除
      await this.redis.del(this.getL2Key(key));

      this.logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}`, { error: error.message });
    }
  }

  /**
   * 通过标签失效缓存
   * @param tags 缓存标签
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      // 1. 失效L1缓存
      await this.invalidateL1ByTags(tags);

      // 2. 失效L2缓存
      await this.invalidateL2ByTags(tags);

      this.logger.debug(`Cache invalidated by tags: ${tags.join(', ')}`);
    } catch (error) {
      this.logger.error(`Cache invalidate by tags error`, { 
        tags, 
        error: error.message 
      });
    }
  }

  /**
   * 预热缓存
   * @param keys 缓存键数组
   * @param dataLoader 数据加载函数
   */
  async warmup<T>(
    keys: string[], 
    dataLoader: (key: string) => Promise<T>
  ): Promise<void> {
    try {
      const batchSize = 10; // 批量大小
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        
        // 并行加载批量数据
        const promises = batch.map(async (key) => {
          // 检查是否已存在
          if (await this.get(key) !== null) {
            return;
          }
          
          try {
            const data = await dataLoader(key);
            await this.set(key, data);
          } catch (error) {
            this.logger.error(`Failed to warmup cache for key ${key}`, { 
              error: error.message 
            });
          }
        });
        
        await Promise.all(promises);
      }
      
      this.logger.debug(`Cache warmup completed: ${keys.length} keys`);
    } catch (error) {
      this.logger.error(`Cache warmup error`, { error: error.message });
    }
  }

  /**
   * 刷新缓存
   * @param key 缓存键
   * @param dataLoader 数据加载函数
   */
  async refresh<T>(
    key: string, 
    dataLoader: (key: string) => Promise<T>
  ): Promise<T | null> {
    try {
      // 1. 从数据源加载最新数据
      const data = await dataLoader(key);
      
      // 2. 更新缓存
      await this.set(key, data);
      
      this.logger.debug(`Cache refreshed: ${key}`);
      return data;
    } catch (error) {
      this.logger.error(`Cache refresh error for key ${key}`, { 
        error: error.message 
      });
      return null;
    }
  }

  // L1缓存私有方法

  private async getFromL1<T>(key: string): Promise<T | null> {
    const entry = this.l1Cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // 检查是否过期
    if (this.isExpired(entry)) {
      this.l1Cache.delete(key);
      this.l1AccessOrder.delete(key);
      return null;
    }
    
    // 更新访问信息
    entry.accessedAt = new Date();
    entry.accessCount++;
    this.l1AccessOrder.set(key, new Date());
    
    return entry.data as T;
  }

  private async setToL1<T>(
    key: string, 
    data: T, 
    ttl: number, 
    tags: string[] = []
  ): Promise<void> {
    // 检查L1缓存容量
    if (this.l1Cache.size >= this.getL1MaxSize()) {
      await this.evictLRUFromL1();
    }
    
    const entry: CacheEntry<T> = {
      data,
      ttl,
      tags,
      createdAt: new Date(),
      accessedAt: new Date(),
      accessCount: 1
    };
    
    this.l1Cache.set(key, entry);
    this.l1AccessOrder.set(key, new Date());
  }

  private async evictLRUFromL1(): Promise<void> {
    // 找到最久未访问的键
    let oldestKey: string | null = null;
    let oldestTime = new Date();
    
    for (const [key, time] of this.l1AccessOrder.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.l1Cache.delete(oldestKey);
      this.l1AccessOrder.delete(oldestKey);
      this.logger.debug(`L1 cache evicted (LRU): ${oldestKey}`);
    }
  }

  private async invalidateL1ByTags(tags: string[]): Promise<void> {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.l1Cache.entries()) {
      // 检查是否有匹配的标签
      const hasMatchingTag = tags.some(tag => entry.tags.includes(tag));
      
      if (hasMatchingTag) {
        keysToDelete.push(key);
      }
    }
    
    // 删除匹配的键
    for (const key of keysToDelete) {
      this.l1Cache.delete(key);
      this.l1AccessOrder.delete(key);
    }
    
    this.logger.debug(`L1 cache invalidated by tags: ${keysToDelete.length} keys`);
  }

  private startCleanupTimer(): void {
    const interval = this.getCleanupInterval();
    
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredL1Entries();
    }, interval * 1000);
  }

  private cleanupExpiredL1Entries(): void {
    const now = new Date();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.l1Cache.entries()) {
      if (this.isExpired(entry, now)) {
        keysToDelete.push(key);
      }
    }
    
    // 删除过期的条目
    for (const key of keysToDelete) {
      this.l1Cache.delete(key);
      this.l1AccessOrder.delete(key);
    }
    
    if (keysToDelete.length > 0) {
      this.logger.debug(`L1 cache cleanup: ${keysToDelete.length} expired entries`);
    }
  }

  private isExpired(entry: CacheEntry<any>, now: Date = new Date()): boolean {
    const expirationTime = new Date(entry.createdAt.getTime() + entry.ttl * 1000);
    return now > expirationTime;
  }

  // L2缓存私有方法

  private async getFromL2<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(this.getL2Key(key));
      
      if (!value) {
        return null;
      }
      
      const entry = JSON.parse(value) as CacheEntry<T>;
      
      // 检查是否过期
      if (this.isExpired(entry)) {
        await this.redis.del(this.getL2Key(key));
        return null;
      }
      
      return entry.data;
    } catch (error) {
      this.logger.error(`L2 cache get error for key ${key}`, { 
        error: error.message 
      });
      return null;
    }
  }

  private async setToL2<T>(
    key: string, 
    data: T, 
    ttl: number, 
    tags: string[] = []
  ): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        ttl,
        tags,
        createdAt: new Date(),
        accessedAt: new Date(),
        accessCount: 1
      };
      
      const value = JSON.stringify(entry);
      const redisKey = this.getL2Key(key);
      
      await this.redis.setex(redisKey, ttl, value);
    } catch (error) {
      this.logger.error(`L2 cache set error for key ${key}`, { 
        error: error.message 
      });
    }
  }

  private async invalidateL2ByTags(tags: string[]): Promise<void> {
    try {
      // 获取所有匹配的键
      const pattern = `${this.getL2KeyPrefix()}*`;
      const keys = await this.redis.keys(pattern);
      
      const keysToDelete: string[] = [];
      
      for (const key of keys) {
        try {
          const value = await this.redis.get(key);
          
          if (!value) {
            continue;
          }
          
          const entry = JSON.parse(value) as CacheEntry<any>;
          
          // 检查是否有匹配的标签
          const hasMatchingTag = tags.some(tag => entry.tags.includes(tag));
          
          if (hasMatchingTag) {
            keysToDelete.push(key);
          }
        } catch (error) {
          this.logger.error(`Error processing L2 key ${key}`, { 
            error: error.message 
          });
        }
      }
      
      // 删除匹配的键
      if (keysToDelete.length > 0) {
        await this.redis.del(...keysToDelete);
        this.logger.debug(`L2 cache invalidated by tags: ${keysToDelete.length} keys`);
      }
    } catch (error) {
      this.logger.error(`L2 cache invalidate by tags error`, { 
        tags, 
        error: error.message 
      });
    }
  }

  // 配置和工具方法

  private getL1TTL(key: string): number {
    // 可以根据键的模式返回不同的TTL
    if (key.startsWith('product:')) {
      return 300; // 5分钟
    } else if (key.startsWith('user:')) {
      return 600; // 10分钟
    } else {
      return this.configService.get<number>('CACHE_L1_DEFAULT_TTL', 300);
    }
  }

  private getL2TTL(key: string): number {
    // 可以根据键的模式返回不同的TTL
    if (key.startsWith('product:')) {
      return 1800; // 30分钟
    } else if (key.startsWith('user:')) {
      return 3600; // 1小时
    } else {
      return this.configService.get<number>('CACHE_L2_DEFAULT_TTL', 1800);
    }
  }

  private getL1MaxSize(): number {
    return this.configService.get<number>('CACHE_L1_MAX_SIZE', 1000);
  }

  private getCleanupInterval(): number {
    return this.configService.get<number>('CACHE_L1_CLEANUP_INTERVAL', 60);
  }

  private getL2Key(key: string): string {
    const prefix = this.getL2KeyPrefix();
    return `${prefix}${key}`;
  }

  private getL2KeyPrefix(): string {
    return this.configService.get<string>('CACHE_L2_KEY_PREFIX', 'cache:');
  }

  onModuleDestroy() {
    // 清理定时器
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}
```

---

## 🔄 缓存一致性策略

### 事件驱动缓存失效
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TwoLevelCacheService } from './two-level-cache.service';

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(
    private readonly cacheService: TwoLevelCacheService
  ) {}

  /**
   * 监听产品更新事件，失效相关缓存
   */
  @OnEvent('product.updated')
  async handleProductUpdated(event: ProductUpdatedEvent): Promise<void> {
    try {
      // 失效产品详情缓存
      await this.cacheService.delete(`product:${event.productId}`);
      
      // 失效产品列表缓存
      await this.cacheService.invalidateByTags(['product-list']);
      
      // 失效相关分类缓存
      if (event.categoryId) {
        await this.cacheService.invalidateByTags([`category:${event.categoryId}`]);
      }
      
      this.logger.debug(`Product cache invalidated: ${event.productId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate product cache`, {
        productId: event.productId,
        error: error.message
      });
    }
  }

  /**
   * 监听用户更新事件，失效相关缓存
   */
  @OnEvent('user.updated')
  async handleUserUpdated(event: UserUpdatedEvent): Promise<void> {
    try {
      // 失效用户详情缓存
      await this.cacheService.delete(`user:${event.userId}`);
      
      // 失效用户订单列表缓存
      await this.cacheService.invalidateByTags([`user-orders:${event.userId}`]);
      
      this.logger.debug(`User cache invalidated: ${event.userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate user cache`, {
        userId: event.userId,
        error: error.message
      });
    }
  }

  /**
   * 监听订单状态变更事件，失效相关缓存
   */
  @OnEvent('order.status.changed')
  async handleOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    try {
      // 失效订单详情缓存
      await this.cacheService.delete(`order:${event.orderId}`);
      
      // 失效用户订单列表缓存
      await this.cacheService.invalidateByTags([`user-orders:${event.userId}`]);
      
      // 失效订单统计缓存
      await this.cacheService.invalidateByTags(['order-statistics']);
      
      this.logger.debug(`Order cache invalidated: ${event.orderId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate order cache`, {
        orderId: event.orderId,
        error: error.message
      });
    }
  }
}

// 事件定义
export interface ProductUpdatedEvent {
  productId: string;
  categoryId?: string;
  timestamp: Date;
}

export interface UserUpdatedEvent {
  userId: string;
  timestamp: Date;
}

export interface OrderStatusChangedEvent {
  orderId: string;
  userId: string;
  oldStatus: string;
  newStatus: string;
  timestamp: Date;
}
```

### 缓存预热策略
```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TwoLevelCacheService } from './two-level-cache.service';
import { ProductService } from '../product/product.service';
import { UserService } from '../user/user.service';

@Injectable()
export class CacheWarmupService implements OnModuleInit {
  private readonly logger = new Logger(CacheWarmupService.name);

  constructor(
    private readonly cacheService: TwoLevelCacheService,
    private readonly productService: ProductService,
    private readonly userService: UserService
  ) {}

  /**
   * 模块初始化时执行预热
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Starting cache warmup...');
    
    try {
      // 预热热门产品
      await this.warmupPopularProducts();
      
      // 预热活跃用户
      await this.warmupActiveUsers();
      
      this.logger.log('Cache warmup completed');
    } catch (error) {
      this.logger.error('Cache warmup failed', { error: error.message });
    }
  }

  /**
   * 每天凌晨2点执行缓存预热
   */
  @Cron('0 0 2 * * *')
  async scheduleWarmup(): Promise<void> {
    this.logger.log('Starting scheduled cache warmup...');
    
    try {
      // 预热热门产品
      await this.warmupPopularProducts();
      
      // 预热活跃用户
      await this.warmupActiveUsers();
      
      // 预热产品分类
      await this.warmupProductCategories();
      
      this.logger.log('Scheduled cache warmup completed');
    } catch (error) {
      this.logger.error('Scheduled cache warmup failed', { error: error.message });
    }
  }

  /**
   * 预热热门产品
   */
  private async warmupPopularProducts(): Promise<void> {
    try {
      // 获取热门产品ID列表
      const popularProductIds = await this.productService.getPopularProductIds(50);
      
      // 预热产品详情
      await this.cacheService.warmup(
        popularProductIds.map(id => `product:${id}`),
        async (key) => {
          const productId = key.replace('product:', '');
          return this.productService.getProductById(productId);
        }
      );
      
      this.logger.debug(`Warmed up ${popularProductIds.length} popular products`);
    } catch (error) {
      this.logger.error('Failed to warm up popular products', { error: error.message });
    }
  }

  /**
   * 预热活跃用户
   */
  private async warmupActiveUsers(): Promise<void> {
    try {
      // 获取活跃用户ID列表
      const activeUserIds = await this.userService.getActiveUserIds(100);
      
      // 预热用户详情
      await this.cacheService.warmup(
        activeUserIds.map(id => `user:${id}`),
        async (key) => {
          const userId = key.replace('user:', '');
          return this.userService.getUserById(userId);
        }
      );
      
      this.logger.debug(`Warmed up ${activeUserIds.length} active users`);
    } catch (error) {
      this.logger.error('Failed to warm up active users', { error: error.message });
    }
  }

  /**
   * 预热产品分类
   */
  private async warmupProductCategories(): Promise<void> {
    try {
      // 获取所有分类
      const categories = await this.productService.getAllCategories();
      
      // 预热分类详情
      await this.cacheService.warmup(
        categories.map(category => `category:${category.id}`),
        async (key) => {
          const categoryId = key.replace('category:', '');
          return this.productService.getCategoryById(categoryId);
        }
      );
      
      this.logger.debug(`Warmed up ${categories.length} product categories`);
    } catch (error) {
      this.logger.error('Failed to warm up product categories', { error: error.message });
    }
  }

  /**
   * 手动预热指定缓存
   */
  async warmupCacheByPattern(pattern: string): Promise<void> {
    try {
      let keys: string[] = [];
      let dataLoader: (key: string) => Promise<any>;
      
      // 根据模式确定键和数据加载器
      if (pattern.startsWith('product:')) {
        const productIds = await this.productService.getProductIds();
        keys = productIds.map(id => `product:${id}`);
        dataLoader = async (key) => {
          const productId = key.replace('product:', '');
          return this.productService.getProductById(productId);
        };
      } else if (pattern.startsWith('user:')) {
        const userIds = await this.userService.getUserIds();
        keys = userIds.map(id => `user:${id}`);
        dataLoader = async (key) => {
          const userId = key.replace('user:', '');
          return this.userService.getUserById(userId);
        };
      } else {
        throw new Error(`Unsupported cache pattern: ${pattern}`);
      }
      
      // 执行预热
      await this.cacheService.warmup(keys, dataLoader);
      
      this.logger.debug(`Warmed up cache by pattern: ${pattern} (${keys.length} keys)`);
    } catch (error) {
      this.logger.error(`Failed to warm up cache by pattern: ${pattern}`, { 
        error: error.message 
      });
    }
  }
}
```

---

## 📊 缓存监控与分析

### 缓存性能监控
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TwoLevelCacheService } from './two-level-cache.service';

interface CacheMetrics {
  timestamp: Date;
  l1: {
    size: number;
    hitRate: number;
    missRate: number;
    evictionRate: number;
  };
  l2: {
    hitRate: number;
    missRate: number;
    memoryUsage: number;
    keyCount: number;
  };
  overall: {
    hitRate: number;
    missRate: number;
    averageResponseTime: number;
  };
}

@Injectable()
export class CacheMonitoringService {
  private readonly logger = new Logger(CacheMonitoringService.name);
  private metrics: CacheMetrics[] = [];
  private l1Hits = 0;
  private l1Misses = 0;
  private l2Hits = 0;
  private l2Misses = 0;
  private totalResponseTime = 0;
  private requestCount = 0;

  constructor(
    private readonly cacheService: TwoLevelCacheService
  ) {}

  /**
   * 记录缓存命中
   */
  recordHit(level: 'L1' | 'L2', responseTime: number): void {
    if (level === 'L1') {
      this.l1Hits++;
    } else {
      this.l2Hits++;
    }
    
    this.totalResponseTime += responseTime;
    this.requestCount++;
  }

  /**
   * 记录缓存未命中
   */
  recordMiss(level: 'L1' | 'L2'): void {
    if (level === 'L1') {
      this.l1Misses++;
    } else {
      this.l2Misses++;
    }
    
    this.requestCount++;
  }

  /**
   * 每分钟收集缓存指标
   */
  @Cron('0 * * * * *')
  async collectMetrics(): Promise<void> {
    try {
      const timestamp = new Date();
      
      // 计算L1指标
      const l1Total = this.l1Hits + this.l1Misses;
      const l1HitRate = l1Total > 0 ? (this.l1Hits / l1Total) * 100 : 0;
      const l1MissRate = l1Total > 0 ? (this.l1Misses / l1Total) * 100 : 0;
      
      // 计算L2指标
      const l2Total = this.l2Hits + this.l2Misses;
      const l2HitRate = l2Total > 0 ? (this.l2Hits / l2Total) * 100 : 0;
      const l2MissRate = l2Total > 0 ? (this.l2Misses / l2Total) * 100 : 0;
      
      // 计算总体指标
      const totalHits = this.l1Hits + this.l2Hits;
      const totalMisses = this.l1Misses + this.l2Misses;
      const totalRequests = totalHits + totalMisses;
      const overallHitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
      const overallMissRate = totalRequests > 0 ? (totalMisses / totalRequests) * 100 : 0;
      const averageResponseTime = this.requestCount > 0 
        ? this.totalResponseTime / this.requestCount 
        : 0;
      
      // 获取L2缓存信息
      const l2Info = await this.getL2CacheInfo();
      
      // 创建指标对象
      const metrics: CacheMetrics = {
        timestamp,
        l1: {
          size: await this.getL1CacheSize(),
          hitRate: parseFloat(l1HitRate.toFixed(2)),
          missRate: parseFloat(l1MissRate.toFixed(2)),
          evictionRate: await this.getL1EvictionRate()
        },
        l2: {
          hitRate: parseFloat(l2HitRate.toFixed(2)),
          missRate: parseFloat(l2MissRate.toFixed(2)),
          memoryUsage: l2Info.memoryUsage,
          keyCount: l2Info.keyCount
        },
        overall: {
          hitRate: parseFloat(overallHitRate.toFixed(2)),
          missRate: parseFloat(overallMissRate.toFixed(2)),
          averageResponseTime: parseFloat(averageResponseTime.toFixed(2))
        }
      };
      
      // 存储指标
      this.metrics.push(metrics);
      
      // 保持最近24小时的指标
      const oneHourAgo = new Date(timestamp.getTime() - 60 * 60 * 1000);
      this.metrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
      
      // 重置计数器
      this.resetCounters();
      
      // 记录指标
      this.logger.debug('Cache metrics collected', {
        l1HitRate: metrics.l1.hitRate,
        l2HitRate: metrics.l2.hitRate,
        overallHitRate: metrics.overall.hitRate,
        averageResponseTime: metrics.overall.averageResponseTime
      });
      
      // 检查告警条件
      await this.checkAlerts(metrics);
    } catch (error) {
      this.logger.error('Failed to collect cache metrics', { error: error.message });
    }
  }

  /**
   * 获取缓存指标报告
   */
  async getMetricsReport(hours: number = 1): Promise<any> {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);
      
      // 过滤指定时间范围内的指标
      const filteredMetrics = this.metrics.filter(
        m => m.timestamp >= startTime && m.timestamp <= endTime
      );
      
      if (filteredMetrics.length === 0) {
        return {
          period: { startTime, endTime, hours },
          message: 'No metrics available for the specified period'
        };
      }
      
      // 计算平均指标
      const avgMetrics = this.calculateAverageMetrics(filteredMetrics);
      
      // 计算趋势
      const trends = this.calculateTrends(filteredMetrics);
      
      return {
        period: { startTime, endTime, hours },
        summary: avgMetrics,
        trends,
        dataPoints: filteredMetrics.length
      };
    } catch (error) {
      this.logger.error('Failed to generate metrics report', { error: error.message });
      throw error;
    }
  }

  private async getL1CacheSize(): Promise<number> {
    // 实现获取L1缓存大小的逻辑
    return 0; // 占位符
  }

  private async getL1EvictionRate(): Promise<number> {
    // 实现获取L1缓存驱逐率的逻辑
    return 0; // 占位符
  }

  private async getL2CacheInfo(): Promise<{ memoryUsage: number; keyCount: number }> {
    try {
      // 获取Redis信息
      const info = await this.cacheService.getRedisInfo();
      
      // 解析内存使用量
      const memoryUsage = this.parseMemoryUsage(info);
      
      // 获取键数量
      const keyCount = this.parseKeyCount(info);
      
      return { memoryUsage, keyCount };
    } catch (error) {
      this.logger.error('Failed to get L2 cache info', { error: error.message });
      return { memoryUsage: 0, keyCount: 0 };
    }
  }

  private parseMemoryUsage(info: string): number {
    // 解析Redis信息中的内存使用量
    const match = info.match(/used_memory:(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  private parseKeyCount(info: string): number {
    // 解析Redis信息中的键数量
    const match = info.match(/db\d+:keys=(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  private calculateAverageMetrics(metrics: CacheMetrics[]): CacheMetrics {
    const total = metrics.length;
    
    return {
      timestamp: new Date(),
      l1: {
        size: metrics.reduce((sum, m) => sum + m.l1.size, 0) / total,
        hitRate: metrics.reduce((sum, m) => sum + m.l1.hitRate, 0) / total,
        missRate: metrics.reduce((sum, m) => sum + m.l1.missRate, 0) / total,
        evictionRate: metrics.reduce((sum, m) => sum + m.l1.evictionRate, 0) / total
      },
      l2: {
        hitRate: metrics.reduce((sum, m) => sum + m.l2.hitRate, 0) / total,
        missRate: metrics.reduce((sum, m) => sum + m.l2.missRate, 0) / total,
        memoryUsage: metrics.reduce((sum, m) => sum + m.l2.memoryUsage, 0) / total,
        keyCount: metrics.reduce((sum, m) => sum + m.l2.keyCount, 0) / total
      },
      overall: {
        hitRate: metrics.reduce((sum, m) => sum + m.overall.hitRate, 0) / total,
        missRate: metrics.reduce((sum, m) => sum + m.overall.missRate, 0) / total,
        averageResponseTime: metrics.reduce((sum, m) => sum + m.overall.averageResponseTime, 0) / total
      }
    };
  }

  private calculateTrends(metrics: CacheMetrics[]): any {
    if (metrics.length < 2) {
      return { message: 'Insufficient data for trend analysis' };
    }
    
    const first = metrics[0];
    const last = metrics[metrics.length - 1];
    
    return {
      l1HitRate: this.calculateTrend(first.l1.hitRate, last.l1.hitRate),
      l2HitRate: this.calculateTrend(first.l2.hitRate, last.l2.hitRate),
      overallHitRate: this.calculateTrend(first.overall.hitRate, last.overall.hitRate),
      averageResponseTime: this.calculateTrend(first.overall.averageResponseTime, last.overall.averageResponseTime)
    };
  }

  private calculateTrend(first: number, last: number): { direction: 'up' | 'down' | 'stable'; change: number } {
    const change = last - first;
    const threshold = 5; // 5%阈值
    
    if (Math.abs(change) < threshold) {
      return { direction: 'stable', change };
    }
    
    return {
      direction: change > 0 ? 'up' : 'down',
      change
    };
  }

  private resetCounters(): void {
    this.l1Hits = 0;
    this.l1Misses = 0;
    this.l2Hits = 0;
    this.l2Misses = 0;
    this.totalResponseTime = 0;
    this.requestCount = 0;
  }

  private async checkAlerts(metrics: CacheMetrics): Promise<void> {
    // 检查L1命中率告警
    if (metrics.l1.hitRate < 70) {
      this.logger.warn(`L1 cache hit rate is low: ${metrics.l1.hitRate}%`);
    }
    
    // 检查L2命中率告警
    if (metrics.l2.hitRate < 80) {
      this.logger.warn(`L2 cache hit rate is low: ${metrics.l2.hitRate}%`);
    }
    
    // 检查总体命中率告警
    if (metrics.overall.hitRate < 85) {
      this.logger.warn(`Overall cache hit rate is low: ${metrics.overall.hitRate}%`);
    }
    
    // 检查响应时间告警
    if (metrics.overall.averageResponseTime > 100) {
      this.logger.warn(`Cache average response time is high: ${metrics.overall.averageResponseTime}ms`);
    }
    
    // 检查L2内存使用告警
    if (metrics.l2.memoryUsage > 500 * 1024 * 1024) { // 500MB
      this.logger.warn(`L2 cache memory usage is high: ${metrics.l2.memoryUsage} bytes`);
    }
  }
}
```

---

## 📝 使用说明

### 缓存使用原则
1. **适度缓存**：只缓存频繁访问且相对稳定的数据
2. **合理TTL**：根据数据更新频率设置合理的过期时间
3. **标签管理**：使用标签有效管理缓存失效
4. **监控优化**：持续监控缓存性能，优化缓存策略

### 缓存一致性原则
1. **事件驱动**：通过领域事件驱动缓存失效
2. **最终一致性**：接受短期不一致，保证最终一致性
3. **优先级失效**：重要数据变更立即失效缓存
4. **批量失效**：使用标签批量失效相关缓存

### 缓存预热原则
1. **热点优先**：优先预热热点数据
2. **低峰执行**：在系统低峰期执行预热
3. **增量预热**：支持增量预热，避免全量预热
4. **失败容错**：预热失败不影响系统正常运行

---

## 📞 联系信息

### 缓存团队
- **缓存架构师**：缓存架构设计和技术决策
- **高级开发工程师**：缓存功能实现和性能优化
- **运维工程师**：缓存基础设施运维和监控
- **性能工程师**：缓存性能分析和优化

### 技术支持
- **架构问题**：联系缓存架构师
- **实现问题**：联系高级开发工程师
- **运维问题**：联系运维工程师
- **性能问题**：联系性能工程师

---

**版本**: v1.0.0  
**创建时间**: 2025-10-02  
**下次评估**: 2025-11-02  
**维护周期**: 每月评估更新