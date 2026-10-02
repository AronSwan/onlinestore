# Redpanda 流处理集成指南

## 概述

本项目集成了 Redpanda（兼容 Kafka）作为高性能消息队列系统，用于处理高并发场景下的异步事件和流处理任务。

## 核心功能

### 🔄 事件驱动架构
- **订单事件**: 订单创建、状态更新、支付完成等
- **产品事件**: 库存变更、价格更新、浏览量统计等
- **用户事件**: 登录、注册、行为分析等

### 🚀 性能优势
- **低延迟**: Redpanda 提供亚毫秒级延迟
- **高吞吐**: 支持每秒百万级消息处理
- **水平扩展**: 轻松扩展集群规模

## 快速开始

### 1. 安装 Redpanda

```bash
# 使用Kubernetes部署Redpanda
kubectl apply -f k8s/redpanda/
kubectl apply -f k8s/redpanda-cluster/
```

### 2. 配置环境变量

在 `.env` 文件中添加 Redpanda 配置：

```env
# Redpanda/Kafka 配置
REDPANDA_BROKERS=localhost:9092
REDPANDA_CLIENT_ID=caddy-shopping-backend
REDPANDA_CONSUMER_GROUP_ID=caddy-shopping-consumers
REDPANDA_SESSION_TIMEOUT=30000
REDPANDA_REBALANCE_TIMEOUT=60000
REDPANDA_HEARTBEAT_INTERVAL=3000
REDPANDA_ALLOW_AUTO_TOPIC_CREATION=true
```

### 3. 启动应用

```bash
cd backend
npm install
npm run start:dev
```

## 核心服务

### RedpandaService
主要的消息队列服务，提供生产者和消费者功能。

```typescript
// 发送消息
await this.redpandaService.sendMessage('orders', orderEvent);

// 批量发送
await this.redpandaService.sendBatch('products', productEvents);
```

### OrderEventsService
处理订单相关的事件：

```typescript
// 订单创建事件
await this.orderEventsService.publishOrderCreated(order);

// 订单状态更新
await this.orderEventsService.publishOrderStatusUpdated(orderId, newStatus);
```

### ProductEventsService
处理产品相关的事件：

```typescript
// 库存变更事件
await this.productEventsService.publishStockUpdated(productId, newStock);

// 价格更新事件
await this.productEventsService.publishPriceUpdated(productId, newPrice);
```

## 事件类型

### 订单事件
- `order.created` - 订单创建
- `order.updated` - 订单更新
- `order.paid` - 订单支付完成
- `order.shipped` - 订单发货
- `order.completed` - 订单完成

### 产品事件
- `product.created` - 产品创建
- `product.updated` - 产品更新
- `product.stock.updated` - 库存变更
- `product.price.updated` - 价格更新
- `product.viewed` - 产品浏览

### 用户事件
- `user.registered` - 用户注册
- `user.logged_in` - 用户登录
- `user.profile.updated` - 资料更新

## 消费者示例

### 实时库存更新消费者

```typescript
@Injectable()
export class StockUpdateConsumer {
  constructor(
    private readonly productsService: ProductsService,
    private readonly redpandaService: RedpandaService,
  ) {}

  async onModuleInit() {
    await this.redpandaService.subscribe(
      'stock-updates',
      'stock-consumer-group',
      this.handleStockUpdate.bind(this),
    );
  }

  private async handleStockUpdate(message: any) {
    const { productId, newStock } = message;
    await this.productsService.updateStock(productId, newStock);
  }
}
```

### 订单分析消费者

```typescript
@Injectable()
export class OrderAnalyticsConsumer {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly redpandaService: RedpandaService,
  ) {}

  async onModuleInit() {
    await this.redpandaService.subscribe(
      'order-analytics',
      'analytics-consumer-group',
      this.handleOrderEvent.bind(this),
    );
  }

  private async handleOrderEvent(message: any) {
    await this.analyticsService.recordOrderEvent(message);
  }
}
```

## 监控和调试

### 查看主题状态

```bash
# 使用kubectl访问Redpanda Pod
kubectl exec -it redpanda-pod -- rpk topic list
kubectl exec -it redpanda-pod -- rpk topic describe orders
```

### 监控消息流

```bash
# 实时消费消息
kubectl exec -it redpanda-pod -- rpk topic consume orders --offset earliest
```

### 健康检查

应用提供 Redpanda 健康检查端点：
- `GET /health/redpanda` - Redpanda 连接状态

## 性能优化

### 批量处理
```typescript
// 批量发送消息提高吞吐量
const messages = orders.map(order => ({
  value: JSON.stringify(order),
  key: order.id,
}));
await this.redpandaService.sendBatch('orders', messages);
```

### 压缩配置
```typescript
// 启用消息压缩
await this.redpandaService.sendMessage('orders', event, {
  compression: CompressionTypes.GZIP,
});
```

### 分区策略
```typescript
// 使用订单ID进行分区，确保相同订单的消息顺序
await this.redpandaService.sendMessage('orders', event, {
  partition: this.getPartition(order.id),
});
```

## 故障排除

### 常见问题

1. **连接失败**
   - 检查 Redpanda 服务是否运行
   - 验证 broker 地址配置
   - 检查网络连接

2. **消息丢失**
   - 确认 `acks` 配置为 'all'
   - 检查重试机制
   - 验证消费者偏移量管理

3. **性能问题**
   - 调整批量大小
   - 优化分区策略
   - 启用消息压缩

## 生产环境部署

### 集群配置
```yaml
# k8s/redpanda-cluster.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redpanda-cluster
spec:
  serviceName: redpanda
  replicas: 3
  selector:
    matchLabels:
      app: redpanda
  template:
    metadata:
      labels:
        app: redpanda
    spec:
      containers:
      - name: redpanda
        image: public.ecr.aws/redpandadata/redpanda:latest
        command:
          - redpanda
          - start
          - --kafka-addr
          - PLAINTEXT://0.0.0.0:29092,OUTSIDE://0.0.0.0:9092
        ports:
        - containerPort: 9092
          name: kafka
        - containerPort: 9644
          name: admin
```

## 相关链接

- [Redpanda 官方文档](https://docs.redpanda.com/)
- [KafkaJS 文档](https://kafka.js.org/)
- [NestJS 微服务](https://docs.nestjs.com/microservices/basics)