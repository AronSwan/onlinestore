# Caddy Style Shopping Backend

基于 CongoMall 设计的购物网站后端服务，采用 DDD（领域驱动设计）四层架构。

## 🏗️ 架构设计

### DDD 四层架构

```
├── interfaces/          # 接口层 - REST API 控制器
├── application/         # 应用层 - 业务编排和事务管理
├── domain/             # 领域层 - 核心业务逻辑
│   ├── aggregates/     # 聚合根
│   ├── events/         # 领域事件
│   ├── repositories/   # 仓储接口
│   └── services/       # 领域服务
└── infrastructure/     # 基础设施层 - 数据持久化和外部服务
    ├── entities/       # 数据库实体
    ├── repositories/   # 仓储实现
    ├── services/       # 基础设施服务
    ├── config/         # 配置
    └── migrations/     # 数据库迁移
```

## 🛒 购物车模块特性

### 核心功能
- ✅ 添加商品到购物车
- ✅ 更新商品数量
- ✅ 删除购物车商品
- ✅ 批量选择/取消选择
- ✅ 清空购物车
- ✅ 购物车统计（数量、金额）

### 技术特性
- 🔒 **分布式锁**：基于 Redis 的分布式锁，防止并发操作冲突
- 🚀 **缓存策略**：多层缓存提升性能
- 📊 **分片支持**：支持 ShardingSphere 数据库分片
- 🎯 **事件驱动**：CQRS 事件驱动架构
- 🛡️ **类型安全**：完整的 TypeScript 类型定义
- 📝 **API 文档**：Swagger/OpenAPI 自动生成文档

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- MySQL >= 8.0
- Redis >= 6.0

### 安装依赖
```bash
cd backend
npm install
```

### 环境配置
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库和 Redis 连接信息
```

### 数据库初始化
```bash
# 执行数据库迁移
mysql -u root -p < src/cart/infrastructure/migrations/001-create-cart-items.sql
```

### 启动服务
```bash
# 开发模式
npm run start:dev

# 生产模式
npm run build
npm run start:prod
```

### API 文档
启动服务后访问：http://localhost:3000/api/docs

## 📊 数据库设计

### 购物车表结构
```sql
CREATE TABLE cart_items (
    id VARCHAR(50) PRIMARY KEY,
    customer_user_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    product_sku_id VARCHAR(50) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    product_brand VARCHAR(100) NOT NULL,
    product_price DECIMAL(10,2) NOT NULL,
    product_quantity INT NOT NULL,
    product_pic VARCHAR(500) NOT NULL,
    product_attribute TEXT,
    select_flag BOOLEAN DEFAULT TRUE,
    del_flag BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 索引设计
- 唯一索引：`(customer_user_id, product_sku_id)`
- 查询索引：`(customer_user_id, select_flag)`
- 时间索引：`(created_at)`

## 🔧 配置说明

### Redis 配置
```typescript
// 分布式锁配置
CART_REDIS_DB=1
CART_LOCK_TIMEOUT=30000
CART_LOCK_RETRY_DELAY=100
CART_LOCK_RETRY_COUNT=10

// 缓存配置
CART_CACHE_REDIS_DB=2
CART_CACHE_TTL=3600
```

### 分片配置
```typescript
// ShardingSphere 分片配置
SHARDING_ENABLED=false
SHARDING_DATABASES=2
SHARDING_TABLES=4
```

## 🧪 测试

```bash
# 单元测试
npm run test

# 集成测试
npm run test:e2e

# 测试覆盖率
npm run test:cov
```

## 📈 性能优化

### 缓存策略
1. **L1 缓存**：应用内存缓存
2. **L2 缓存**：Redis 分布式缓存
3. **数据库**：MySQL 持久化存储

### 分布式锁
- 基于 Redis 的分布式锁
- 支持锁超时和重试机制
- 防止购物车并发操作冲突

### 数据库优化
- 复合索引优化查询性能
- 软删除避免数据丢失
- 分片支持水平扩展

## 🔍 监控和日志

### 健康检查
- 数据库连接状态
- Redis 连接状态
- 应用服务状态

### 日志记录
- 结构化日志输出
- 错误追踪和告警
- 性能指标监控

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License