---
title: "API 文档示例和说明"
description: "后端系统的完整API接口说明，包括请求格式、响应格式、错误码和示例"
owner: "Backend Team <backend@company.com>"
lastUpdated: "2025-01-26"
version: "1.2.0"
status: "active"
category: "api"
tags: ["api", "rest", "documentation", "swagger", "openapi"]
audience: ["developer", "frontend", "qa"]
priority: "high"
reviewCycle: "weekly"
---

# API 文档示例和说明

## 📋 概述

本文档提供后端系统的完整API接口说明，包括请求格式、响应格式、错误码和示例。

## 🔑 认证和授权

### JWT认证
所有需要认证的接口都需要在请求头中包含Bearer Token：

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 权限角色
- `USER`: 普通用户权限
- `ADMIN`: 管理员权限
- `SUPER_ADMIN`: 超级管理员权限

## 🚦 API 版本管理

### 版本策略
- **当前版本**: v1
- **版本格式**: `/api/v{version}/resource`
- **向后兼容**: 保证同一主版本内的向后兼容性
- **废弃通知**: 新版本发布后，旧版本至少维护6个月

### 版本指定方式
```http
# 1. URL路径（推荐）
GET /api/v1/products

# 2. Accept头
GET /api/products
Accept: application/vnd.api+json;version=1

# 3. 自定义头
GET /api/products
API-Version: 1
```

## ⚡ 速率限制 (Rate Limiting)

### 限制策略
- **未认证用户**: 100 请求/小时
- **认证用户**: 1000 请求/小时  
- **管理员**: 5000 请求/小时

### 响应头
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 3600
```

### 超限响应
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "API rate limit exceeded",
    "details": {
      "limit": 1000,
      "window": 3600,
      "retryAfter": 1800
    }
  },
  "timestamp": "2025-01-26T10:00:00Z",
  "requestId": "req_123456789"
}
```

## 🔄 幂等性

### 幂等性键
对于 POST、PUT、PATCH 请求，可使用 `Idempotency-Key` 头确保操作幂等：

```http
POST /api/orders
Idempotency-Key: order_20250126_user123_001
Content-Type: application/json

{
  "items": [...]
}
```

### 幂等性规则
- **GET, HEAD, OPTIONS**: 天然幂等
- **PUT, DELETE**: 设计为幂等
- **POST, PATCH**: 通过 `Idempotency-Key` 实现幂等
- **键格式**: 建议使用 UUID 或业务相关的唯一标识
- **有效期**: 幂等性键24小时内有效

## ❌ 错误处理

### 标准错误响应格式
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "field": "specific error details",
      "validation": ["field1 is required", "field2 must be valid email"]
    }
  },
  "timestamp": "2025-01-26T10:00:00Z",
  "requestId": "req_123456789",
  "path": "/api/v1/products"
}
```

### HTTP 状态码
| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | 请求成功 |
| 201 | Created | 资源创建成功 |
| 204 | No Content | 删除成功或无内容返回 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证 |
| 403 | Forbidden | 无权限 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突 |
| 422 | Unprocessable Entity | 验证失败 |
| 429 | Too Many Requests | 速率限制 |
| 500 | Internal Server Error | 服务器内部错误 |

### 错误码表
| 错误码 | HTTP状态 | 描述 |
|--------|----------|------|
| `VALIDATION_ERROR` | 422 | 请求数据验证失败 |
| `UNAUTHORIZED` | 401 | 认证失败或token无效 |
| `FORBIDDEN` | 403 | 权限不足 |
| `RESOURCE_NOT_FOUND` | 404 | 请求的资源不存在 |
| `RESOURCE_CONFLICT` | 409 | 资源状态冲突 |
| `RATE_LIMIT_EXCEEDED` | 429 | 超出API调用频率限制 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `SERVICE_UNAVAILABLE` | 503 | 服务暂时不可用 |
| `DUPLICATE_RESOURCE` | 409 | 资源已存在 |
| `INVALID_OPERATION` | 400 | 无效操作 |

### 验证错误示例
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "validation": [
        {
          "field": "email",
          "message": "Email format is invalid",
          "value": "invalid-email"
        },
        {
          "field": "password",
          "message": "Password must be at least 8 characters",
          "value": "***"
        }
      ]
    }
  },
  "timestamp": "2025-01-26T10:00:00Z",
  "requestId": "req_123456789"
}
```

## 📦 商品管理API

### 获取商品列表
```http
GET /api/products
```

**查询参数：**
- `page` (可选): 页码，默认1
- `limit` (可选): 每页数量，默认20
- `category` (可选): 分类筛选
- `search` (可选): 关键词搜索
- `sort` (可选): 排序字段（price, name, created_at）
- `order` (可选): 排序方向（asc, desc）

**响应示例：**
```json
{
  "status": "success",
  "data": {
    "products": [
      {
        "id": 1,
        "name": "Gucci 经典T恤",
        "price": 2999.00,
        "originalPrice": 3999.00,
        "stock": 50,
        "category": "clothing",
        "images": ["/images/products/tshirt-1.jpg"],
        "description": "经典设计，舒适面料",
        "createdAt": "2025-09-30T10:00:00Z",
        "updatedAt": "2025-09-30T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

### 获取商品详情
```http
GET /api/products/:id
```

**响应示例：**
```json
{
  "status": "success",
  "data": {
    "product": {
      "id": 1,
      "name": "Gucci 经典T恤",
      "price": 2999.00,
      "originalPrice": 3999.00,
      "stock": 50,
      "category": "clothing",
      "images": ["/images/products/tshirt-1.jpg", "/images/products/tshirt-2.jpg"],
      "description": "经典设计，舒适面料",
      "specifications": {
        "material": "棉100%",
        "size": ["S", "M", "L", "XL"],
        "color": ["黑色", "白色", "红色"]
      },
      "createdAt": "2025-09-30T10:00:00Z",
      "updatedAt": "2025-09-30T10:00:00Z"
    }
  }
}
```

### 创建商品（管理员）
```http
POST /api/products
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体：**
```json
{
  "name": "新款Gucci卫衣",
  "price": 3999.00,
  "originalPrice": 4999.00,
  "stock": 100,
  "category": "clothing",
  "description": "新款设计，舒适保暖",
  "specifications": {
    "material": "棉80%，聚酯纤维20%",
    "size": ["S", "M", "L", "XL"],
    "color": ["黑色", "灰色"]
  }
}
```

## 🛒 购物车API

### 添加商品到购物车
```http
POST /api/cart/items
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体：**
```json
{
  "productId": 1,
  "quantity": 2,
  "selectedSize": "M",
  "selectedColor": "黑色"
}
```

### 获取购物车
```http
GET /api/cart
Authorization: Bearer {token}
```

**响应示例：**
```json
{
  "status": "success",
  "data": {
    "cart": {
      "id": 123,
      "userId": 456,
      "items": [
        {
          "id": 789,
          "productId": 1,
          "productName": "Gucci 经典T恤",
          "price": 2999.00,
          "quantity": 2,
          "selectedSize": "M",
          "selectedColor": "黑色",
          "image": "/images/products/tshirt-1.jpg",
          "subtotal": 5998.00
        }
      ],
      "totalQuantity": 2,
      "totalAmount": 5998.00
    }
  }
}
```

## 📋 订单API

### 创建订单
```http
POST /api/orders
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体：**
```json
{
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "selectedSize": "M",
      "selectedColor": "黑色"
    }
  ],
  "shippingAddress": {
    "recipient": "张三",
    "phone": "13800138000",
    "province": "北京市",
    "city": "北京市",
    "district": "朝阳区",
    "detail": "某某街道123号",
    "postalCode": "100000"
  },
  "paymentMethod": "alipay"
}
```

### 获取订单列表
```http
GET /api/orders
Authorization: Bearer {token}
```

**查询参数：**
- `page` (可选): 页码，默认1
- `limit` (可选): 每页数量，默认10
- `status` (可选): 订单状态筛选

### 获取订单详情
```http
GET /api/orders/:id
Authorization: Bearer {token}
```

## 👤 用户管理API

### 用户注册
```http
POST /api/auth/register
Content-Type: application/json
```

**请求体：**
```json
{
  "username": "zhangsan",
  "email": "zhangsan@example.com",
  "password": "securePassword123",
  "phone": "13800138000"
}
```

### 用户登录
```http
POST /api/auth/login
Content-Type: application/json
```

**请求体：**
```json
{
  "email": "zhangsan@example.com",
  "password": "securePassword123"
}
```

**响应示例：**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 456,
      "username": "zhangsan",
      "email": "zhangsan@example.com",
      "role": "USER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400
  }
}
```

### 获取用户信息
```http
GET /api/users/profile
Authorization: Bearer {token}
```

## ⚡ 缓存API

### 清除商品缓存
```http
DELETE /api/cache/products/:id
Authorization: Bearer {token}
```

### 获取缓存统计
```http
GET /api/cache/stats
Authorization: Bearer {token}
```

## 🔧 系统管理API

### 健康检查
```http
GET /health
```

**响应示例：**
```json
{
  "status": "ok",
  "timestamp": "2025-09-30T11:00:00Z",
  "uptime": 86400,
  "memory": {
    "used": 256,
    "total": 1024,
    "percentage": 25
  },
  "database": {
    "status": "connected",
    "latency": 15
  },
  "redis": {
    "status": "connected",
    "latency": 2
  }
}
```

### 系统指标
```http
GET /metrics
Authorization: Bearer {token}
```

## 🚨 错误处理

### 错误响应格式

所有API错误都遵循统一的响应格式：

```json
{
  "status": "error",
  "code": 1001,
  "message": "参数验证失败",
  "errors": [
    {
      "field": "email",
      "message": "邮箱格式不正确",
      "value": "invalid-email"
    }
  ],
  "timestamp": "2025-01-26T10:30:00Z",
  "requestId": "req_123456789",
  "path": "/api/auth/login"
}
```

### 错误码分类

#### 1xxx - 通用错误
| 错误码 | 描述 | 示例场景 | 解决方案 |
|--------|------|----------|----------|
| 1001 | 参数验证失败 | 必填字段缺失、格式错误 | 检查请求参数格式和必填字段 |
| 1002 | 资源不存在 | 查询不存在的商品ID | 确认资源ID是否正确 |
| 1003 | 权限不足 | 普通用户访问管理员接口 | 检查用户权限和角色 |
| 1004 | 请求频率过高 | 超出API限流阈值 | 降低请求频率或联系管理员 |

#### 2xxx - 认证错误
| 错误码 | 描述 | 示例场景 | 解决方案 |
|--------|------|----------|----------|
| 2001 | 未授权访问 | 未提供认证Token | 在请求头添加Authorization |
| 2002 | Token已过期 | JWT Token超过有效期 | 重新登录获取新Token |
| 2003 | Token无效 | Token格式错误或被篡改 | 使用有效的Token |
| 2004 | 账户被锁定 | 多次登录失败导致锁定 | 联系管理员解锁或等待解锁 |

#### 3xxx - 业务错误
| 错误码 | 描述 | 示例场景 | 解决方案 |
|--------|------|----------|----------|
| 3001 | 库存不足 | 购买数量超过可用库存 | 减少购买数量或选择其他商品 |
| 3002 | 订单状态错误 | 尝试取消已发货订单 | 检查订单当前状态 |
| 3003 | 支付失败 | 银行卡余额不足 | 检查支付方式或余额 |
| 3004 | 购物车为空 | 空购物车尝试结算 | 先添加商品到购物车 |

#### 5xxx - 系统错误
| 错误码 | 描述 | 示例场景 | 解决方案 |
|--------|------|----------|----------|
| 5001 | 系统繁忙 | 服务器负载过高 | 稍后重试或联系技术支持 |
| 5002 | 数据库错误 | 数据库连接失败 | 联系技术支持 |
| 5003 | 外部服务错误 | 支付网关不可用 | 稍后重试或使用其他支付方式 |

### 错误处理示例

#### 参数验证错误
```json
{
  "status": "error",
  "code": 1001,
  "message": "参数验证失败",
  "errors": [
    {
      "field": "email",
      "message": "邮箱格式不正确",
      "value": "invalid-email"
    },
    {
      "field": "password",
      "message": "密码长度至少8位",
      "value": "***"
    }
  ],
  "timestamp": "2025-01-26T10:30:00Z",
  "requestId": "req_123456789",
  "path": "/api/auth/register"
}
```

#### 认证失败错误
```json
{
  "status": "error",
  "code": 2002,
  "message": "Token已过期",
  "errors": [],
  "timestamp": "2025-01-26T10:30:00Z",
  "requestId": "req_987654321",
  "path": "/api/users/profile",
  "details": {
    "expiredAt": "2025-01-26T09:30:00Z",
    "suggestion": "请重新登录获取新的访问令牌"
  }
}
```

#### 业务逻辑错误
```json
{
  "status": "error",
  "code": 3001,
  "message": "库存不足",
  "errors": [],
  "timestamp": "2025-01-26T10:30:00Z",
  "requestId": "req_555666777",
  "path": "/api/cart/items",
  "details": {
    "productId": 123,
    "requestedQuantity": 5,
    "availableStock": 2,
    "suggestion": "当前库存仅剩2件，请调整购买数量"
  }
}
```

#### 系统错误
```json
{
  "status": "error",
  "code": 5001,
  "message": "系统繁忙，请稍后重试",
  "errors": [],
  "timestamp": "2025-01-26T10:30:00Z",
  "requestId": "req_111222333",
  "path": "/api/orders",
  "details": {
    "retryAfter": 30,
    "suggestion": "系统正在处理大量请求，建议30秒后重试"
  }
}
```

### 客户端错误处理最佳实践

#### JavaScript错误处理
```javascript
async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
        ...options.headers
      }
    });

    const result = await response.json();

    if (result.status === 'error') {
      // 根据错误码进行不同处理
      switch (result.code) {
        case 2002: // Token过期
          await refreshToken();
          return apiRequest(url, options); // 重试
        case 1004: // 请求频率过高
          await delay(result.details?.retryAfter * 1000 || 5000);
          return apiRequest(url, options); // 延迟重试
        case 5001: // 系统繁忙
          throw new RetryableError(result.message, result.details?.retryAfter);
        default:
          throw new APIError(result.message, result.code, result.errors);
      }
    }

    return result.data;
  } catch (error) {
    if (error instanceof APIError) {
      // 显示用户友好的错误信息
      showErrorMessage(error.message);
    } else {
      // 网络错误等
      showErrorMessage('网络连接失败，请检查网络设置');
    }
    throw error;
  }
}

// 自定义错误类
class APIError extends Error {
  constructor(message, code, errors = []) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.errors = errors;
  }
}

class RetryableError extends Error {
  constructor(message, retryAfter = 5) {
    super(message);
    this.name = 'RetryableError';
    this.retryAfter = retryAfter;
  }
}
```

#### 表单验证错误处理
```javascript
function handleValidationErrors(errors) {
  // 清除之前的错误提示
  clearValidationErrors();
  
  errors.forEach(error => {
    const field = document.querySelector(`[name="${error.field}"]`);
    if (field) {
      // 添加错误样式
      field.classList.add('error');
      
      // 显示错误信息
      const errorElement = document.createElement('div');
      errorElement.className = 'error-message';
      errorElement.textContent = error.message;
      field.parentNode.appendChild(errorElement);
    }
  });
}
```

### HTTP状态码
- `200`: 请求成功
- `201`: 创建成功
- `400`: 请求参数错误
- `401`: 未授权
- `403`: 权限不足
- `404`: 资源不存在
- `409`: 资源冲突
- `422`: 验证失败
- `429`: 请求过于频繁
- `500`: 服务器内部错误

### 业务错误码
- `1001`: 用户不存在
- `1002`: 密码错误
- `1003`: 邮箱已存在
- `2001`: 商品不存在
- `2002`: 库存不足
- `3001`: 订单不存在
- `3002`: 订单状态不允许操作
- `4001`: 支付失败
- `5001`: 系统繁忙

## 📝 使用示例

### JavaScript示例
```javascript
// 获取商品列表
async function getProducts(page = 1, limit = 20) {
  const response = await fetch(`/api/products?page=${page}&limit=${limit}`);
  const result = await response.json();
  
  if (result.status === 'success') {
    return result.data.products;
  } else {
    throw new Error(result.message);
  }
}

// 用户登录
async function login(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  const result = await response.json();
  
  if (result.status === 'success') {
    localStorage.setItem('token', result.data.token);
    return result.data.user;
  } else {
    throw new Error(result.message);
  }
}
```

### cURL示例
```bash
# 获取商品列表
curl -X GET "http://localhost:3000/api/products?page=1&limit=20"

# 用户登录
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# 带认证的请求
curl -X GET "http://localhost:3000/api/users/profile" \
  -H "Authorization: Bearer {token}"
```

## 🔄 版本控制

当前API版本：v1

版本更新将通过HTTP头信息通知：
```http
API-Version: 1.0.0
Deprecation: 2025-12-31
Sunset: 2026-03-31
```

---

**最后更新**: 2025-09-30  
**API版本**: v1.0.0