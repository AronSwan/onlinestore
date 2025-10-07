# 缓存系统文档

## 概述

本系统实现了一个高性能、多级缓存架构，支持Redis分布式缓存和本地内存缓存，提供灵活的缓存策略和自动化的缓存管理功能。

## 核心特性

### 🚀 多级缓存架构
- **L1缓存**: 本地内存缓存，提供最快的数据访问
- **L2缓存**: Redis分布式缓存，支持集群和持久化
- **智能路由**: 根据策略自动选择最优缓存层级

### 🎯 缓存策略
- **MEMORY_ONLY**: 仅使用内存缓存
- **REDIS_ONLY**: 仅使用Redis缓存
- **MEMORY_FIRST**: 内存优先，Redis作为备份
- **REDIS_FIRST**: Redis优先，内存作为热点缓存
- **WRITE_THROUGH**: 同时写入两级缓存
- **WRITE_BEHIND**: 异步写入Redis
- **WRITE_AROUND**: 绕过内存缓存直写Redis

### 🔧 自动化管理
- **装饰器支持**: 通过注解自动处理缓存逻辑
- **拦截器集成**: 全局和方法级缓存拦截
- **健康检查**: 自动监控缓存服务状态
- **性能监控**: 实时统计缓存命中率和延迟

## 快速开始

### 1. 环境配置

复制环境变量配置文件：
```bash
cp .env.cache.example .env.cache
```

配置Redis连接：
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```

### 2. 模块集成

在应用模块中导入缓存模块：

```typescript
import { Module } from '@nestjs/common';
import { CacheModule } from './common/cache/cache.module';

@Module({
  imports: [
    CacheModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
        keyPrefix: 'myapp:'
      },
      memory: {
        maxSize: 1000,
        maxMemoryMB: 100
      },
      global: {
        enableGlobalInterceptor: true,
        defaultTtl: 300
      }
    })
  ]
})
export class AppModule {}
```

### 3. 基本使用

#### 装饰器方式

```typescript
import { Injectable } from '@nestjs/common';
import { Cache, CacheEvict, CachePut } from './common/decorators/cache.decorator';

@Injectable()
export class UserService {
  @Cache({
    key: 'user:${args[0]}',
    ttl: 1800,
    strategy: 'MEMORY_FIRST'
  })
  async findById(id: string) {
    // 方法执行结果会自动缓存
    return await this.userRepository.findById(id);
  }

  @CacheEvict({
    key: 'user:${args[0].id}',
    allEntries: false
  })
  async updateUser(user: User) {
    // 更新后自动清除缓存
    return await this.userRepository.save(user);
  }

  @CachePut({
    key: 'user:${result.id}',
    ttl: 1800
  })
  async createUser(userData: CreateUserDto) {
    // 创建后自动缓存结果
    return await this.userRepository.create(userData);
  }
}
```

#### 服务方式

```typescript
import { Injectable } from '@nestjs/common';
import { RedisCacheService } from './common/cache/redis-cache.service';
import { MemoryCacheService } from './common/cache/memory-cache.service';

@Injectable()
export class ProductService {
  constructor(
    private readonly redisCache: RedisCacheService,
    private readonly memoryCache: MemoryCacheService
  ) {}

  async getProduct(id: string) {
    const cacheKey = `product:${id}`;
    
    // 先检查内存缓存
    let product = this.memoryCache.get(cacheKey);
    if (product) {
      return product;
    }
    
    // 再检查Redis缓存
    product = await this.redisCache.get(cacheKey);
    if (product) {
      // 回写到内存缓存
      this.memoryCache.set(cacheKey, product, 300000);
      return product;
    }
    
    // 从数据库获取
    product = await this.productRepository.findById(id);
    
    // 缓存到两级缓存
    await this.redisCache.set(cacheKey, product, { ttl: 3600 });
    this.memoryCache.set(cacheKey, product, 300000);
    
    return product;
  }
}
```

## 缓存装饰器

### @Cache - 缓存方法结果

```typescript
@Cache({
  key: 'user:${args[0]}',           // 缓存键模板
  ttl: 1800,                       // 过期时间（秒）
  strategy: 'MEMORY_FIRST',        // 缓存策略
  prefix: 'api',                   // 键前缀
  condition: (args) => args[0] > 0, // 缓存条件
  unless: (result) => !result,     // 排除条件
  timeout: 5000,                   // 操作超时
  retries: 3,                      // 重试次数
  serialize: true,                 // 序列化
  compress: false,                 // 压缩
  trace: true                      // 链路追踪
})
async findUser(id: number) {
  return await this.userRepository.findById(id);
}
```

### @CacheEvict - 清除缓存

```typescript
@CacheEvict({
  key: 'user:${args[0]}',          // 要清除的缓存键
  allEntries: false,               // 是否清除所有条目
  beforeInvocation: false,         // 是否在方法执行前清除
  pattern: 'user:*'                // 清除模式
})
async deleteUser(id: number) {
  return await this.userRepository.delete(id);
}
```

### @CachePut - 更新缓存

```typescript
@CachePut({
  key: 'user:${result.id}',        // 缓存键（支持结果变量）
  ttl: 1800,                       // 过期时间
  strategy: 'WRITE_THROUGH'        // 写入策略
})
async updateUser(user: User) {
  return await this.userRepository.save(user);
}
```

### 专用装饰器

```typescript
// 用户相关
@UserCache({ ttl: 1800 })
@UserQuery({ strategy: 'MEMORY_FIRST' })

// 产品相关
@ProductCache({ ttl: 3600 })
@ProductQuery({ strategy: 'REDIS_FIRST' })

// 订单相关
@OrderCache({ ttl: 900 })
@OrderQuery({ strategy: 'WRITE_THROUGH' })

// 配置相关
@ConfigCache({ ttl: 7200 })
@ConfigQuery({ strategy: 'MEMORY_ONLY' })

// 统计相关
@StatsCache({ ttl: 300 })
@StatsQuery({ strategy: 'REDIS_ONLY' })

// 搜索相关
@SearchCache({ ttl: 600 })
@SearchQuery({ strategy: 'MEMORY_FIRST' })

// 会话相关
@SessionCache({ ttl: 1800 })
@SessionQuery({ strategy: 'REDIS_ONLY' })

// 权限相关
@PermissionCache({ ttl: 3600 })
@PermissionQuery({ strategy: 'MEMORY_FIRST' })
```

### 缓存模式装饰器

```typescript
// 时间模式
@ShortCache()      // 5分钟
@MediumCache()     // 30分钟
@LongCache()       // 2小时
@PermanentCache()  // 24小时

// 频率模式
@HighFrequencyCache()  // 高频访问
@LowFrequencyCache()   // 低频访问

// 访问模式
@ReadOnlyCache()       // 只读缓存
@WriteThrough()        // 写穿透
@Conditional()         // 条件缓存
@Parameterized()       // 参数化缓存

// 业务模式
@PaginationCache()     // 分页缓存
@AggregationCache()    // 聚合缓存
@RealtimeCache()       // 实时缓存
```

## 缓存策略详解

### 1. MEMORY_ONLY
仅使用本地内存缓存，适用于：
- 小数据量
- 高频访问
- 单实例应用

```typescript
@Cache({
  strategy: CacheStrategy.MEMORY_ONLY,
  ttl: 300
})
```

### 2. REDIS_ONLY
仅使用Redis缓存，适用于：
- 大数据量
- 分布式应用
- 需要持久化

```typescript
@Cache({
  strategy: CacheStrategy.REDIS_ONLY,
  ttl: 3600
})
```

### 3. MEMORY_FIRST
内存优先策略，适用于：
- 热点数据
- 读多写少
- 性能敏感

```typescript
@Cache({
  strategy: CacheStrategy.MEMORY_FIRST,
  ttl: 1800
})
```

### 4. REDIS_FIRST
Redis优先策略，适用于：
- 共享数据
- 一致性要求高
- 分布式场景

```typescript
@Cache({
  strategy: CacheStrategy.REDIS_FIRST,
  ttl: 3600
})
```

### 5. WRITE_THROUGH
写穿透策略，适用于：
- 强一致性
- 读写均衡
- 数据重要性高

```typescript
@Cache({
  strategy: CacheStrategy.WRITE_THROUGH,
  ttl: 1800
})
```

### 6. WRITE_BEHIND
写回策略，适用于：
- 写入密集
- 可接受延迟
- 性能优先

```typescript
@Cache({
  strategy: CacheStrategy.WRITE_BEHIND,
  ttl: 900
})
```

### 7. WRITE_AROUND
写绕过策略，适用于：
- 写多读少
- 避免缓存污染
- 大批量写入

```typescript
@Cache({
  strategy: CacheStrategy.WRITE_AROUND,
  ttl: 3600
})
```

## API接口

### RedisCacheService

```typescript
// 基本操作
await redisCache.get(key);
await redisCache.set(key, value, { ttl: 3600 });
await redisCache.delete(key);
await redisCache.exists(key);

// 过期控制
await redisCache.expire(key, ttl);
await redisCache.ttl(key);

// 数值操作
await redisCache.increment(key, delta);
await redisCache.decrement(key, delta);

// 批量操作
await redisCache.mget([key1, key2, key3]);
await redisCache.mset({ key1: value1, key2: value2 });
await redisCache.mdel([key1, key2, key3]);

// 模式操作
await redisCache.deleteByPattern('user:*');

// 管理操作
await redisCache.flush();
await redisCache.getStats();
await redisCache.getHealth();
```

### MemoryCacheService

```typescript
// 基本操作
memoryCache.get(key);
memoryCache.set(key, value, ttl);
memoryCache.delete(key);
memoryCache.has(key);

// 信息查询
memoryCache.size();
memoryCache.keys();

// 批量操作
memoryCache.mget([key1, key2, key3]);
memoryCache.mset({ key1: value1, key2: value2 });
memoryCache.mdel([key1, key2, key3]);

// 管理操作
memoryCache.clear();
memoryCache.getStats();
memoryCache.getHealth();
```

## 监控和指标

### 缓存统计

```typescript
// 获取Redis统计
const redisStats = await redisCache.getStats();
console.log(`Redis命中率: ${redisStats.hitRate}%`);
console.log(`Redis操作数: ${redisStats.operations}`);

// 获取内存缓存统计
const memoryStats = memoryCache.getStats();
console.log(`内存缓存大小: ${memoryStats.size}`);
console.log(`内存使用量: ${memoryStats.memoryUsage}`);
```

### 健康检查

```typescript
// 检查Redis健康状态
const redisHealth = await redisCache.getHealth();
if (redisHealth.status === 'healthy') {
  console.log('Redis缓存正常');
}

// 检查内存缓存健康状态
const memoryHealth = memoryCache.getHealth();
if (memoryHealth.status === 'healthy') {
  console.log('内存缓存正常');
}
```

### 性能监控

系统自动收集以下指标：
- 缓存命中率
- 平均响应时间
- 操作QPS
- 内存使用量
- 错误率
- 连接状态

## 最佳实践

### 1. 缓存键设计

```typescript
// 好的键设计
const userKey = `user:${userId}`;
const productKey = `product:${productId}:${version}`;
const searchKey = `search:${query}:${page}:${size}`;

// 避免的键设计
const badKey = `user_data_${userId}_with_profile_and_settings`;
```

### 2. TTL设置

```typescript
// 根据数据特性设置TTL
const USER_PROFILE_TTL = 1800;    // 30分钟
const PRODUCT_INFO_TTL = 3600;    // 1小时
const CONFIG_DATA_TTL = 7200;     // 2小时
const STATS_DATA_TTL = 300;       // 5分钟
```

### 3. 缓存预热

```typescript
@Injectable()
export class CacheWarmupService {
  async warmupUserCache() {
    const activeUsers = await this.userService.getActiveUsers();
    for (const user of activeUsers) {
      await this.userService.findById(user.id); // 触发缓存
    }
  }
}
```

### 4. 缓存降级

```typescript
@Cache({
  key: 'product:${args[0]}',
  fallback: true,
  timeout: 5000
})
async getProduct(id: string) {
  try {
    return await this.productRepository.findById(id);
  } catch (error) {
    // 返回缓存的过期数据作为降级
    return await this.getCachedProduct(id);
  }
}
```

### 5. 批量操作优化

```typescript
async getMultipleUsers(ids: string[]) {
  // 批量检查缓存
  const cached = await this.redisCache.mget(
    ids.map(id => `user:${id}`)
  );
  
  // 找出未缓存的ID
  const uncachedIds = ids.filter((id, index) => !cached[index]);
  
  // 批量查询未缓存的数据
  if (uncachedIds.length > 0) {
    const users = await this.userRepository.findByIds(uncachedIds);
    
    // 批量缓存新数据
    const cacheData = {};
    users.forEach(user => {
      cacheData[`user:${user.id}`] = user;
    });
    await this.redisCache.mset(cacheData);
  }
}
```

## 故障排除

### 常见问题

1. **缓存穿透**
   - 现象：大量请求查询不存在的数据
   - 解决：缓存空值或使用布隆过滤器

2. **缓存雪崩**
   - 现象：大量缓存同时过期
   - 解决：设置随机TTL，使用熔断器

3. **缓存击穿**
   - 现象：热点数据过期时大量请求穿透
   - 解决：使用互斥锁或永不过期策略

4. **内存泄漏**
   - 现象：内存缓存持续增长
   - 解决：检查TTL设置，启用LRU清理

### 调试工具

```typescript
// 启用调试日志
process.env.CACHE_DEBUG_MODE = 'true';
process.env.CACHE_VERBOSE_LOGGING = 'true';

// 查看缓存状态
const stats = await redisCache.getStats();
console.log('缓存统计:', stats);

// 检查特定键
const exists = await redisCache.exists('user:123');
const ttl = await redisCache.ttl('user:123');
console.log(`键存在: ${exists}, TTL: ${ttl}`);
```

## 相关文档

- [Redis配置指南](./REDIS_CONFIG.md)
- [性能优化指南](./PERFORMANCE_OPTIMIZATION.md)
- [监控告警配置](./MONITORING_SETUP.md)
- [故障排除手册](./TROUBLESHOOTING_GUIDE.md)

## 支持

如有问题或建议，请联系：
- 技术支持：tech-support@company.com
- 文档反馈：docs@company.com
- 问题报告：[GitHub Issues](https://github.com/company/project/issues)