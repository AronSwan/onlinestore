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

# 静默模式测试
npm run test --silent

# 并行测试
npm run test:parallel

# 集成测试
npm run test:e2e

# 测试覆盖率
npm run test:cov

# 验证测试运行器
npm run test:validate
```

### 测试运行器特性

- **严格参数验证**：不认识的参数会导致错误退出，避免参数被忽略
- **智能并行执行**：根据系统资源自动调整并行度
- **静默模式**：减少输出信息，适合CI/CD环境
- **性能监控**：提供详细的测试执行性能报告

### 参数限制

- `--watch` 和 `--parallel` 参数不能同时使用
- `--watch` 和 `--coverage` 参数不能同时使用
- 使用 `npm run test --help` 查看完整参数列表

## 🧰 质量度量（Typed Mock 采纳）

- 本地度量：`npm run metrics:typed-mock`
- 报告文件：`backend/test-results/adoption-report.json`
- 关键指标：采纳率（`adopted/total`）、模块分解、未替换的 `jest.fn()` 出现次数
- CI 展示：查看工作流 `typed-mock-adoption.yml` 的 Step Summary 与工件 `typed-mock-adoption-report`
- 详细说明与重构指南：见 `docs/quality/typed-mock-adoption.md`

## 🧩 类型检查常见问题（Logging 模块）

- 联合类型返回值的断言：避免直接访问 `result.data`，使用安全检查进行类型收窄，例如：
  - `expect('data' in result && result.data).toBeDefined()`
  - `expect('data' in result && Array.isArray(result.data)).toBe(true)`
- 测试匹配器用法：目前测试代码仍可使用现有的全局匹配器别名（如 `stringContaining`、`arrayContaining`）。若希望更贴近官方习惯，建议逐步改为 `expect.stringContaining(...)`、`expect.arrayContaining(...)` 等形式。
- tsconfig.strict.json include：若 Logging 模块存在跨目录依赖（例如 `../interfaces/*`、`../common/helpers/*`），请将对应路径加入 `backend/src/logging/tsconfig.strict.json` 的 `include` 字段。当前已包含：
  - `../interfaces/**/*.ts`
  - `../common/helpers/**/*.ts`
  若后续出现新依赖（如其他 `../common/*` 子目录），请按需补充。
- 运行类型检查：使用 `npm run -s typecheck:logging` 验证更改是否通过严格类型检查。

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