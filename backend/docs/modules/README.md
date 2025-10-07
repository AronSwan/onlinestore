---
title: "模块索引"
description: "后端服务各模块的详细文档索引"
version: "1.0.0"
owner: "Backend Team"
lastUpdated: "2025-01-26"
targetRole: ["developer"]
status: "active"
tags: ["modules", "architecture", "backend"]
---

# 🧩 模块索引

> 后端服务各模块的详细文档与快速导航

## 📋 模块概览

| 模块 | 状态 | 负责人 | 最后更新 | 测试覆盖率 | 文档完整度 |
|------|------|--------|----------|------------|------------|
| [认证模块](#auth) | 🟢 Active | Backend Team | 2025-01-26 | 85% | ✅ 完整 |
| [用户模块](#users) | 🟢 Active | Backend Team | 2025-01-26 | 80% | ✅ 完整 |
| [产品模块](#products) | 🟢 Active | Backend Team | 2025-01-26 | 75% | ⚠️ 部分 |
| [订单模块](#orders) | 🟢 Active | Backend Team | 2025-01-26 | 70% | ⚠️ 部分 |
| [购物车模块](#cart) | 🟢 Active | Backend Team | 2025-01-26 | 85% | ✅ 完整 |
| [支付模块](#payment) | 🟢 Active | Backend Team | 2025-01-26 | 60% | ❌ 缺失 |
| [地址模块](#address) | 🟢 Active | Backend Team | 2025-01-26 | 90% | ✅ 完整 |
| [缓存模块](#cache) | 🟢 Active | Backend Team | 2025-01-26 | 95% | ✅ 完整 |
| [Redis模块](#redis) | 🟢 Active | Backend Team | 2025-01-26 | 90% | ✅ 完整 |
| [消息模块](#messaging) | 🟢 Active | Backend Team | 2025-01-26 | 70% | ⚠️ 部分 |
| [网关模块](#gateway) | 🟢 Active | Backend Team | 2025-01-26 | 80% | ⚠️ 部分 |
| [健康检查](#health) | 🟢 Active | Backend Team | 2025-01-26 | 100% | ✅ 完整 |

---

## 🔐 认证模块 {#auth}

**路径**: `backend/src/auth/`  
**目的**: 处理用户认证、授权、JWT 令牌管理  
**关键接口**: `/auth/login`, `/auth/register`, `/auth/refresh`

### 📚 相关文档
- [JWT 最佳实践](../JWT_BEST_PRACTICES.md)
- [JWT 安全配置](../JWT_SECURITY_CONFIG.md)
- [密钥管理指南](../KEY_MANAGEMENT_GUIDE.md)

### 🔧 关键组件
- `AuthService`: 核心认证逻辑
- `JwtStrategy`: JWT 策略实现
- `AuthGuard`: 路由守卫
- `AuthController`: 认证接口控制器

### 🧪 测试入口
- 单元测试: `auth.service.spec.ts`
- 集成测试: `auth.controller.spec.ts`
- E2E测试: `test/auth.e2e-spec.ts`

### 🚨 故障排查
- **JWT 过期**: 检查 `JWT_EXPIRES_IN` 配置
- **认证失败**: 查看 `auth.log` 日志
- **性能问题**: 监控 Redis 连接状态

---

## 👥 用户模块 {#users}

**路径**: `backend/src/users/`  
**目的**: 用户信息管理、个人资料、权限控制  
**关键接口**: `/users/profile`, `/users/update`, `/users/delete`

### 📚 相关文档
- [用户数据模型](../database/user-schema.md)
- [隐私保护策略](../security/privacy-policy.md)

### 🔧 关键组件
- `UsersService`: 用户业务逻辑
- `UserEntity`: 用户数据实体
- `UsersController`: 用户接口控制器

---

## 🛍️ 产品模块 {#products}

**路径**: `backend/src/products/`  
**目的**: 商品信息管理、库存控制、分类管理  
**关键接口**: `/products`, `/products/:id`, `/products/search`

### 📚 相关文档
- [产品搜索优化](../搜索功能优化建议报告.md)
- [库存管理策略](../inventory-management.md)

### 🔧 关键组件
- `ProductsService`: 产品业务逻辑
- `ProductEntity`: 产品数据实体
- `ProductsController`: 产品接口控制器

---

## 📦 订单模块 {#orders}

**路径**: `backend/src/orders/`  
**目的**: 订单生命周期管理、状态跟踪、订单历史  
**关键接口**: `/orders`, `/orders/:id`, `/orders/status`

### 🔧 关键组件
- `OrdersService`: 订单业务逻辑
- `OrderEntity`: 订单数据实体
- `OrdersController`: 订单接口控制器

---

## 🛒 购物车模块 {#cart}

**路径**: `backend/src/cart/`  
**目的**: 购物车管理、商品添加删除、价格计算  
**关键接口**: `/cart`, `/cart/add`, `/cart/remove`

### 🔧 关键组件
- `CartService`: 购物车业务逻辑
- `CartEntity`: 购物车数据实体
- `CartController`: 购物车接口控制器

---

## 💳 支付模块 {#payment}

**路径**: `backend/src/payment/`  
**目的**: 支付处理、第三方支付集成、交易记录  
**关键接口**: `/payment/process`, `/payment/callback`

### ⚠️ 文档状态
**状态**: 文档缺失  
**优先级**: 高  
**建议**: 需要补充支付流程、安全策略、第三方集成文档

---

## 📍 地址模块 {#address}

**路径**: `backend/src/address/`  
**目的**: 用户地址管理、地址验证、默认地址设置  
**关键接口**: `/address`, `/address/default`

### 🔧 关键组件
- `AddressService`: 地址业务逻辑
- `AddressEntity`: 地址数据实体
- `AddressController`: 地址接口控制器

---

## 🗄️ 缓存模块 {#cache}

**路径**: `backend/src/cache/`  
**目的**: 缓存策略实现、性能优化、数据一致性  

### 📚 相关文档
- [缓存系统架构](../CACHE_SYSTEM.md)
- [缓存配置指南](../CACHE_CONFIGURATION_GUIDE.md)

---

## 🔴 Redis模块 {#redis}

**路径**: `backend/src/redis/`  
**目的**: Redis 连接管理、集群配置、健康检查  

### 🔧 关键组件
- `RedisHealthService`: Redis 健康检查
- `RedisConfigService`: Redis 配置管理

---

## 📨 消息模块 {#messaging}

**路径**: `backend/src/messaging/`  
**目的**: 消息队列、事件驱动、异步处理  

### 📚 相关文档
- [消息队列监控](../MESSAGE_QUEUE_MONITORING.md)

---

## 🌐 网关模块 {#gateway}

**路径**: `backend/src/gateway/`  
**目的**: API 网关、路由管理、限流熔断  

### 📚 相关文档
- [熔断器系统](../CIRCUIT_BREAKER.md)
- [限流系统](../RATE_LIMITER_SYSTEM.md)

---

## ❤️ 健康检查 {#health}

**路径**: `backend/src/health/`  
**目的**: 服务健康状态监控、依赖检查、存活探针  

### 📚 相关文档
- [健康检查配置](../HEALTH_CHECK.md)
- [监控告警系统](../MONITORING_ALERTING_SYSTEM.md)

---

## 🔗 快速链接

### 开发相关
- [架构文档](../ARCHITECTURE_DOCUMENTATION.md)
- [API 文档](../API_DOCUMENTATION.md)
- [开发者指南](../DEVELOPER_GUIDE.md)

### 运维相关
- [部署指南](../DEPLOYMENT_GUIDE.md)
- [故障排查](../TROUBLESHOOTING_GUIDE.md)
- [性能调优](../PERFORMANCE_TUNING_GUIDE.md)

### 质量保证
- [测试覆盖率报告](../quality/TEST_COVERAGE_REPORT.md)
- [代码质量报告](../quality/CODE_QUALITY_REPORT.md)

---

**文档维护**: 如有模块文档缺失或需要更新，请联系 Backend Team 或提交 Issue。
