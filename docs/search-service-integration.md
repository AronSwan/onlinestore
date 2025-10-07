# 搜索服务集成文档

## 概述
已成功实现MeiliSearch和ZincSearch的集成，支持故障转移机制。当MeiliSearch不可用时，系统会自动降级到ZincSearch。

## 架构设计

### 核心组件

1. **SearchStrategy接口** (`search-strategy.interface.ts`)
   - 定义统一的搜索服务接口
   - 包含搜索、索引、删除、健康检查等核心方法

2. **MeiliSearch服务** (`meilisearch.service.ts`)
   - 使用HTTP API实现MeiliSearch客户端
   - 支持全文搜索、产品索引、健康检查
   - 包含索引设置初始化功能

3. **ZincSearch服务** (`zincsearch.service.ts`)
   - 使用HTTP API实现ZincSearch客户端
   - 作为备用搜索引擎
   - 支持批量索引和搜索过滤

4. **搜索管理器** (`search-manager.service.ts`)
   - 实现故障转移机制
   - 自动健康检查和引擎切换
   - 支持手动切换搜索引擎

### 故障转移流程

1. **初始化阶段**：优先检查MeiliSearch健康状态
2. **运行阶段**：定期健康检查（默认30秒间隔）
3. **故障检测**：当前引擎不可用时自动切换到备用引擎
4. **恢复检测**：备用引擎运行时定期检查主引擎是否恢复

## 配置说明

### 环境变量配置

```env
# 搜索服务配置
SEARCH_ENGINE_PRIMARY=meilisearch
SEARCH_ENGINE_FALLBACK=zincsearch
SEARCH_HEALTH_CHECK_INTERVAL=30000

# MeiliSearch配置
MEILI_SEARCH_URL=http://localhost:7700
MEILI_SEARCH_API_KEY=your-meilisearch-master-key-here

# ZincSearch配置
ZINC_SEARCH_URL=http://localhost:4080
ZINC_SEARCH_USERNAME=admin
ZINC_SEARCH_PASSWORD=Complexpass#123
```

### 配置结构

```typescript
interface SearchConfig {
  primaryEngine: string;
  fallbackEngine: string;
  healthCheckInterval: number;
  meilisearch: {
    host: string;
    apiKey: string;
  };
  zincsearch: {
    host: string;
    username: string;
    password: string;
  };
}
```

## 使用方法

### 在产品服务中使用搜索

```typescript
// 搜索产品
const result = await this.searchManager.search('关键词', {
  filters: { categoryId: 1, minPrice: 100 },
  page: 1,
  limit: 20
});

// 索引产品
await this.searchManager.indexProduct(productData);

// 批量索引
await this.searchManager.indexProducts(products);

// 删除索引
await this.searchManager.deleteProduct(productId);
```

### 获取搜索引擎状态

```typescript
const status = await this.searchManager.getStatus();
```

## 部署配置

### Kubernetes部署

已创建Kubernetes配置：
- `k8s/search/meilisearch-deployment.yaml`
- `k8s/search/zincsearch-deployment.yaml`
- `k8s/search/search-services.yaml`

## 监控和日志

- 详细的日志记录搜索操作和故障转移事件
- 健康检查监控搜索引擎可用性
- 错误处理和异常恢复机制

## 性能优化

1. **缓存策略**：搜索结果缓存减少数据库查询
2. **批量操作**：支持批量索引提高效率
3. **异步处理**：索引操作异步执行不影响主流程
4. **连接池**：HTTP客户端连接复用

## 故障恢复

1. **自动重试**：搜索失败时自动重试备用引擎
2. **优雅降级**：搜索引擎不可用时回退到数据库搜索
3. **状态恢复**：主引擎恢复后自动切换回

## 测试建议

1. **单元测试**：测试各个搜索服务的功能
2. **集成测试**：测试故障转移机制
3. **性能测试**：测试搜索性能和并发处理能力
4. **故障测试**：模拟搜索引擎故障验证恢复机制

## 后续优化方向

1. 添加搜索结果的缓存机制
2. 实现搜索分析的监控面板
3. 支持更多搜索引擎集成
4. 优化搜索算法的相关性排序