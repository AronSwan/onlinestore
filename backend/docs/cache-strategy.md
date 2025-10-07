# 缓存策略规范

## 概述
本文档定义了后端系统的缓存使用规范，确保缓存策略的一致性和可维护性。

## 缓存键命名规范

### 格式
```
{prefix}:{module}:{resource}:{id}
```

### 示例
- 产品详情：`caddy_shopping:products:detail:123`
- 用户信息：`caddy_shopping:users:profile:456`
- 订单列表：`caddy_shopping:orders:list:page_1_limit_10`

## TTL配置标准

| 缓存类型 | TTL | 说明 |
|---------|-----|------|
| 产品详情 | 300秒 (5分钟) | 产品信息变化较慢 |
| 产品列表 | 30秒 | 列表数据变化较快 |
| 用户信息 | 1800秒 (30分钟) | 用户信息相对稳定 |
| 订单信息 | 600秒 (10分钟) | 订单状态可能变化 |
| 热门产品 | 600秒 (10分钟) | 热门榜单数据 |

## 缓存使用指南

### 1. 统一使用CacheService
所有缓存操作必须通过`CacheService`进行，禁止直接使用底层缓存库。

```typescript
// ✅ 正确用法
const product = await this.cacheService.get('products', 'detail', productId);

// ❌ 错误用法
const product = await this.cacheManager.get(`product:${productId}`);
```

### 2. 缓存预热策略
- 系统启动时预热热门数据
- 定时任务更新缓存数据
- 数据库变更时同步更新缓存

### 3. 缓存失效策略
- 写操作时主动失效相关缓存
- 设置合理的TTL避免数据过期
- 使用版本控制处理缓存穿透

## 性能监控指标

### 缓存命中率
- `cache_hit_total` - 缓存命中次数
- `cache_miss_total` - 缓存未命中次数
- `cache_hit_ratio` - 缓存命中率

### 缓存操作耗时
- `cache_get_duration_seconds` - 获取缓存耗时
- `cache_set_duration_seconds` - 设置缓存耗时

## 最佳实践

### 1. 缓存穿透防护
```typescript
// 使用空值缓存防止缓存穿透
async getProduct(id: number) {
  const cached = await this.cacheService.get('products', 'detail', id);
  if (cached === null) {
    return null; // 明确的空值缓存
  }
  if (!cached) {
    const product = await this.productRepository.findOne(id);
    await this.cacheService.set('products', 'detail', id, product || null, 300);
    return product;
  }
  return cached;
}
```

### 2. 缓存雪崩防护
```typescript
// 为缓存键添加随机TTL偏移
private getTtlWithJitter(baseTtl: number): number {
  const jitter = Math.random() * 60; // 0-60秒随机偏移
  return baseTtl + jitter;
}
```

### 3. 批量操作优化
```typescript
// 批量获取缓存数据
async getProductsByIds(ids: number[]) {
  const promises = ids.map(id => 
    this.cacheService.get('products', 'detail', id)
  );
  return Promise.all(promises);
}
```

## 环境配置

### 开发环境
- 缓存TTL较短，便于调试
- 启用详细的缓存日志

### 生产环境  
- 较长的缓存TTL，提高性能
- 禁用详细日志，减少I/O开销
- 启用压缩减少内存占用

## 故障处理

### 缓存服务不可用
- 降级到数据库直接查询
- 记录降级事件用于监控
- 自动重试机制

### 数据一致性
- 使用事务保证缓存和数据库一致性
- 实现延迟双删策略
- 设置合理的重试机制