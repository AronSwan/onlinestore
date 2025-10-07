# TiDB 支付功能集成指南

## 🎯 TiDB 配置状态

### ✅ 已完成配置
- **数据库类型**: TiDB (兼容 MySQL 协议)
- **默认端口**: 4000 (TiDB 标准端口)
- **连接池优化**: 针对 TiDB 分布式特性优化
- **事务隔离级别**: READ COMMITTED
- **支付实体**: 已包含在数据库模块中

### 🔧 TiDB 特定优化
```typescript
// database.module.ts 中的 TiDB 优化配置
extra: {
  supportBigNumbers: true,
  transactionIsolation: 'READ COMMITTED',
  multipleStatements: true,
  ssl: process.env.DB_SSL === 'true',
  connectionLimit: configuration.database.poolSize,
  // TiDB 分布式事务优化
  retryDelay: 200,
  maxRetries: 3,
}
```

## 📊 支付表结构 (TiDB 优化)

### 主要字段
- `paymentId`: 唯一支付标识 (varchar(64))
- `amount`: 支付金额 (decimal(18,8)) - 支持高精度
- `method`: 支付方式 (enum) - 包含传统和加密货币
- `status`: 支付状态 (enum) - 完整状态流转
- `metadata`: 扩展信息 (json) - TiDB 原生 JSON 支持

### TiDB 索引优化
```sql
-- 核心业务索引
UNIQUE KEY `uk_payment_id` (`paymentId`)
KEY `idx_order_id` (`orderId`)
KEY `idx_user_id` (`userId`)
KEY `idx_status` (`status`)
KEY `idx_status_created` (`status`, `createdAt`)
```

## 🚀 快速启动

### 1. 环境变量配置
```bash
# TiDB 连接配置
DB_TYPE=tidb
DB_HOST=your-tidb-host
DB_PORT=4000
DB_USERNAME=root
DB_PASSWORD=your-password
DB_NAME=shopping_site
DB_SSL=false

# 连接池配置 (TiDB 推荐)
DB_POOL_SIZE=200
DB_ACQUIRE_TIMEOUT=60000
DB_CONNECTION_TIMEOUT=60000
```

### 2. 初始化数据库
```bash
# 执行 TiDB 初始化脚本
mysql -h your-tidb-host -P 4000 -u root -p < tidb-payment-init.sql
```

### 3. 启动应用
```bash
cd backend
npm run start:dev
```

## 💡 TiDB 支付优势

### 分布式特性
- **水平扩展**: 支持大规模支付并发
- **强一致性**: 确保支付数据准确性
- **高可用性**: 多副本保障服务稳定

### 性能优化
- **批量支付处理**: 利用 TiDB 批量写入优势
- **实时分析**: 支持 OLTP + OLAP 混合负载
- **弹性扩容**: 根据支付量自动调整资源

## 🔍 监控和维护

### TiDB Dashboard
- 访问 TiDB Dashboard 监控支付表性能
- 查看慢查询和热点数据
- 监控集群健康状态

### 支付数据分析
```sql
-- 支付统计查询 (TiDB 优化)
SELECT 
  DATE(createdAt) as date,
  method,
  COUNT(*) as count,
  SUM(amount) as total
FROM payments 
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(createdAt), method;
```

## ⚠️ 注意事项

1. **字符集**: 使用 utf8mb4 支持完整 Unicode
2. **时区**: 配置为 +08:00 (中国时区)
3. **JSON 字段**: 利用 TiDB 原生 JSON 支持存储元数据
4. **索引策略**: 根据查询模式优化索引设计

## 🎉 集成完成

支付功能已完全适配 TiDB，具备：
- ✅ 高性能分布式支付处理
- ✅ 强一致性事务保障
- ✅ 水平扩展能力
- ✅ 实时数据分析支持