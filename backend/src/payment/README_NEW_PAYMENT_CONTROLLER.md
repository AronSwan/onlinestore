# 新支付控制器 - 基于DDD架构和gopay设计

## 概述

这是一个全新的支付控制器实现，参考了temp_congomall项目的DDD架构设计和gopay库的API设计理念。该实现采用了领域驱动设计(DDD)的分层架构，提供了清晰的代码结构和强大的扩展性。

## 架构特点

### 1. DDD分层架构
- **接口层(Interface Layer)**: 控制器，处理HTTP请求
- **应用层(Application Layer)**: 应用服务，协调领域对象
- **领域层(Domain Layer)**: 聚合根、值对象、领域服务
- **基础设施层(Infrastructure Layer)**: 数据持久化、外部服务

### 2. 核心设计模式
- **聚合根模式**: PaymentOrderAggregate管理支付订单生命周期
- **值对象模式**: Money、PaymentMethod、PaymentOrderId等
- **策略模式**: 支持多种支付网关
- **工厂模式**: PaymentGatewayFactory创建支付网关实例
- **事件驱动**: 领域事件发布和处理

### 3. 支付方式支持
- **传统支付**: 支付宝、微信支付、银联、信用卡
- **加密货币**: USDT(TRC20/ERC20/BEP20)、BTC、ETH
- **扩展性**: 易于添加新的支付方式

## 目录结构

```
src/payment/
├── controllers/                    # 接口层
│   └── payment.controller.ts       # 支付控制器
├── application/                    # 应用层
│   ├── services/                   # 应用服务
│   │   ├── payment-application.service.ts
│   │   └── payment-query.service.ts
│   ├── commands/                   # 命令对象
│   │   ├── create-payment-order.command.ts
│   │   ├── process-payment-callback.command.ts
│   │   └── create-refund.command.ts
│   └── dtos/                       # 数据传输对象
│       ├── create-payment-order.dto.ts
│       ├── payment-callback.dto.ts
│       ├── payment-order-response.dto.ts
│       ├── payment-status-response.dto.ts
│       ├── payment-methods-response.dto.ts
│       ├── refund-payment.dto.ts
│       └── query-payment.dto.ts
├── domain/                         # 领域层
│   ├── aggregates/                 # 聚合根
│   │   └── payment-order.aggregate.ts
│   ├── value-objects/              # 值对象
│   │   ├── payment-method.value-object.ts
│   │   ├── money.value-object.ts
│   │   └── payment-order-id.value-object.ts
│   ├── repositories/               # 仓储接口
│   │   └── payment-order.repository.ts
│   ├── services/                   # 领域服务
│   │   ├── payment-gateway.factory.ts
│   │   └── payment-risk.service.ts
│   └── events/                     # 领域事件
│       ├── payment-order-created.event.ts
│       ├── payment-succeeded.event.ts
│       ├── payment-failed.event.ts
│       └── refund-created.event.ts
├── infrastructure/                 # 基础设施层
│   ├── repositories/               # 仓储实现
│   │   └── mock-payment-order.repository.ts
│   └── health/                     # 健康检查
│       ├── database-health.service.ts
│       ├── redis-health.service.ts
│       └── payment-gateway-health.service.ts
└── payment-new.module.ts           # 模块定义
```

## 主要API接口

### 1. 创建支付订单
```http
POST /api/payment/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "merchantOrderId": "ORDER_20240101_123456",
  "amount": 99.99,
  "currency": "CNY",
  "paymentMethod": "ALIPAY",
  "subject": "商品购买",
  "description": "购买商品的详细描述",
  "notifyUrl": "https://example.com/payment/notify",
  "returnUrl": "https://example.com/payment/return"
}
```

### 2. 查询支付状态
```http
GET /api/payment/orders/{paymentOrderId}
```

### 3. 支付回调处理
```http
POST /api/payment/callbacks/{paymentMethod}
Content-Type: application/json

{
  "outTradeNo": "ORDER_20240101_123456",
  "gatewayOrderId": "2024010122001234567890123456",
  "tradeStatus": "TRADE_SUCCESS",
  "totalAmount": 99.99,
  "receiptAmount": 99.99,
  "gmtPayment": "2024-01-01T12:00:00Z"
}
```

### 4. 发起退款
```http
POST /api/payment/refunds
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentOrderId": "PAY_1234567890ABCDEF",
  "refundAmount": 50.00,
  "currency": "CNY",
  "reason": "用户申请退款"
}
```

### 5. 获取支付方式
```http
GET /api/payment/methods
```

## 核心特性

### 1. 类型安全
- 使用TypeScript提供完整的类型安全
- 值对象确保数据完整性和业务规则
- 强类型的DTO和响应对象

### 2. 安全性
- JWT认证和授权
- 支付回调签名验证
- 风险评估和防护
- 幂等性支持

### 3. 可扩展性
- 策略模式支持多种支付网关
- 事件驱动架构支持系统扩展
- 清晰的分层架构便于维护

### 4. 监控和健康检查
- 完整的健康检查机制
- 结构化日志记录
- 性能监控支持

## 与gopay的对比

### 相似之处
1. **多支付方式支持**: 同样支持支付宝、微信等主流支付方式
2. **统一API设计**: 提供统一的支付接口抽象
3. **回调处理**: 完善的支付回调处理机制
4. **安全验证**: 支付签名验证和安全防护

### 增强功能
1. **DDD架构**: 采用领域驱动设计，代码结构更清晰
2. **事件驱动**: 支持领域事件发布和处理
3. **类型安全**: TypeScript提供完整的类型安全
4. **加密货币支持**: 原生支持USDT、BTC、ETH等加密货币
5. **风险控制**: 内置支付风险评估机制

## 使用示例

### 1. 集成到现有项目
```typescript
// app.module.ts
import { PaymentNewModule } from './payment/payment-new.module';

@Module({
  imports: [
    // ... 其他模块
    PaymentNewModule,
  ],
})
export class AppModule {}
```

### 2. 创建支付订单
```typescript
// 在服务中使用
@Injectable()
export class OrderService {
  constructor(
    private readonly paymentApplicationService: PaymentApplicationService,
  ) {}

  async createPayment(orderData: any) {
    const createPaymentDto = {
      merchantOrderId: orderData.orderId,
      amount: orderData.totalAmount,
      currency: 'CNY',
      paymentMethod: 'ALIPAY',
      subject: orderData.productName,
      description: orderData.description,
    };

    return await this.paymentApplicationService.createPaymentOrder(
      createPaymentDto,
      {
        userId: orderData.userId,
        clientIp: orderData.clientIp,
        userAgent: orderData.userAgent,
      }
    );
  }
}
```

### 3. 处理支付事件
```typescript
// 事件监听器
@Injectable()
export class PaymentEventHandler {
  @OnEvent('payment.succeeded')
  async handlePaymentSucceeded(event: PaymentSucceededEvent) {
    // 处理支付成功事件
    console.log(`支付成功: ${event.paymentOrderId}`);
    
    // 更新订单状态
    // 发送通知
    // 等等...
  }
}
```

## 部署和配置

### 1. 环境变量配置
```env
# 支付配置
PAYMENT_DEFAULT_CURRENCY=CNY
PAYMENT_DEFAULT_EXPIRE_MINUTES=30
PAYMENT_MAX_REFUND_DAYS=30

# 支付宝配置
ALIPAY_APP_ID=your_app_id
ALIPAY_PRIVATE_KEY=your_private_key
ALIPAY_PUBLIC_KEY=alipay_public_key

# 微信支付配置
WECHAT_APP_ID=your_app_id
WECHAT_MCH_ID=your_mch_id
WECHAT_API_KEY=your_api_key
```

### 2. 数据库迁移
```sql
-- 支付订单表
CREATE TABLE payment_orders (
  id VARCHAR(64) PRIMARY KEY,
  merchant_order_id VARCHAR(64) NOT NULL,
  amount DECIMAL(15,6) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_merchant_order_id (merchant_order_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);
```

## 后续开发计划

1. **实际数据库集成**: 替换模拟仓储为真实的数据库实现
2. **真实支付网关集成**: 集成支付宝、微信等真实支付网关
3. **加密货币支付**: 完善USDT、BTC等加密货币支付实现
4. **监控和告警**: 集成Prometheus、Grafana等监控工具
5. **性能优化**: 缓存、批处理等性能优化
6. **测试覆盖**: 完善单元测试和集成测试

## 总结

这个新的支付控制器实现了现代化的DDD架构设计，结合了temp_congomall项目的最佳实践和gopay库的API设计理念。它提供了：

- **清晰的架构**: DDD分层架构，职责分离
- **强大的扩展性**: 支持多种支付方式和网关
- **完善的安全性**: 认证、授权、签名验证
- **优秀的可维护性**: 类型安全、事件驱动
- **现代化的设计**: 符合当前最佳实践

这为构建一个可靠、可扩展的支付系统奠定了坚实的基础。