# 支付模块

重写的支付模块，整合了 gopay 并预留了 USDT 支付功能。

## 功能特性

### 传统支付方式
- 支付宝 (Alipay)
- 微信支付 (WeChat Pay)
- 银联支付 (UnionPay)
- 信用卡支付
- 银行转账

### 加密货币支付
- USDT (TRC20/ERC20/BEP20)
- Bitcoin (BTC)
- Ethereum (ETH)

### 核心功能
- 策略模式支持多种支付方式
- 幂等性支持，防止重复支付
- 签名验证，确保回调安全
- 事务支持，保证数据一致性
- 异步事件发布
- 支付状态同步
- 退款功能
- 完整的错误处理

## 架构设计

```
payment/
├── entities/           # 数据实体
├── dto/               # 数据传输对象
├── strategies/        # 支付策略
├── gateways/          # 支付网关服务
├── config/            # 配置文件
├── microservices/     # 微服务
│   └── gopay-service/ # Go 微服务
└── docker-compose.yml # 容器编排
```

## 快速开始

### 1. 环境配置

复制环境变量文件：
```bash
cp .env.example .env
```

配置支付参数：
- 支付宝 App ID、私钥、公钥
- 微信支付 App ID、商户号、API密钥
- 加密货币网关配置

### 2. 启动微服务

启动 Gopay 微服务：
```bash
cd microservices/gopay-service
go mod tidy
go run main.go
```

或使用 Docker：
```bash
docker-compose up -d
```

### 3. 使用示例

#### 创建支付订单

```typescript
const payment = await paymentService.createPayment({
  orderId: 'ORDER_123',
  userId: 1,
  amount: 100.00,
  currency: 'CNY',
  method: PaymentMethod.ALIPAY,
  returnUrl: 'https://your-site.com/payment/return',
  notifyUrl: 'https://your-site.com/payment/notify',
  expireMinutes: 30,
});
```

#### 查询支付状态

```typescript
const status = await paymentService.getPaymentStatus('PAY_123456');
```

#### 处理支付回调

```typescript
const result = await paymentService.handlePaymentCallback(
  PaymentMethod.ALIPAY,
  callbackData
);
```

## API 接口

### 创建支付
- **POST** `/payment/create`
- 需要认证
- 支持幂等性（通过 `x-idempotency-key` 头）

### 查询支付状态
- **GET** `/payment/status/:paymentId`

### 支付回调
- **POST** `/payment/callback/:method`
- 自动验证签名

### 发起退款
- **POST** `/payment/refund`
- 需要认证

### 获取支付方式
- **GET** `/payment/methods`

## 安全特性

1. **签名验证**：所有回调都进行签名验证
2. **幂等性**：防止重复支付
3. **时间安全比较**：防止时序攻击
4. **IP白名单**：可配置回调IP白名单
5. **HTTPS强制**：生产环境强制HTTPS

## 监控和日志

- 完整的支付流程日志
- 支付事件发布到消息队列
- 支付状态变更通知
- 错误和异常监控

## 扩展支持

### 添加新的支付方式

1. 在 `PaymentMethod` 枚举中添加新方式
2. 创建对应的策略类
3. 在模块中注册策略
4. 配置相关参数

### 添加新的加密货币

1. 扩展 `CryptoStrategy`
2. 添加对应的网络配置
3. 实现区块链交易验证

## 部署说明

### 开发环境
```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f gopay-service
```

### 生产环境
1. 配置真实的支付参数
2. 设置 HTTPS 证书
3. 配置负载均衡
4. 设置监控和告警

## 注意事项

1. **沙箱环境**：开发时使用沙箱环境
2. **密钥安全**：生产环境密钥需要安全存储
3. **回调验证**：必须验证所有回调签名
4. **金额精度**：注意不同支付方式的金额精度
5. **超时处理**：合理设置各种超时时间

## 故障排除

### 常见问题

1. **签名验证失败**
   - 检查密钥配置
   - 确认签名算法
   - 验证时间戳

2. **回调超时**
   - 检查网络连接
   - 确认回调URL可访问
   - 增加超时时间

3. **支付状态不同步**
   - 检查第三方API状态
   - 手动触发状态同步
   - 查看错误日志

## 技术栈

- **后端框架**：NestJS + TypeScript
- **数据库**：TypeORM + PostgreSQL/MySQL
- **消息队列**：Redpanda/Kafka
- **微服务**：Go + Gin
- **支付SDK**：gopay
- **容器化**：Docker + Docker Compose