# 微服务设计模式

## 📋 概述
本文档介绍在 Caddy Style Shopping 项目中使用的微服务架构模式和最佳实践。

## 🏗️ 服务拆分策略

### 按业务能力拆分
```typescript
// 用户服务
@Service('user-service')
export class UserService {
  // 用户管理相关业务逻辑
}

// 订单服务  
@Service('order-service')
export class OrderService {
  // 订单管理相关业务逻辑
}

// 支付服务
@Service('payment-service')
export class PaymentService {
  // 支付处理相关业务逻辑
}
```

### 按子域拆分
```typescript
// 核心子域 - 订单处理
@Service('order-core-service')
export class OrderCoreService {
  // 核心订单业务逻辑
}

// 支撑子域 - 通知服务
@Service('notification-support-service')
export class NotificationSupportService {
  // 支撑性通知功能
}

// 通用子域 - 认证服务
@Service('auth-common-service')
export class AuthCommonService {
  // 通用认证功能
}
```

## 🔄 服务通信模式

### 同步通信 - REST API
```typescript
// 订单服务调用用户服务
@Injectable()
export class OrderService {
  constructor(
    @Inject(HttpService) private readonly httpService: HttpService
  ) {}

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    // 调用用户服务验证用户
    const user = await this.httpService.get(
      `http://user-service/api/users/${createOrderDto.userId}`
    ).toPromise();

    if (!user) {
      throw new Error('User not found');
    }

    // 创建订单逻辑
    return this.orderRepository.create(createOrderDto);
  }
}
```

### 异步通信 - 消息队列
```typescript
// 使用消息队列进行服务间通信
@Injectable()
export class OrderCreatedPublisher {
  constructor(private readonly messageQueue: MessageQueue) {}

  async publish(order: Order): Promise<void> {
    await this.messageQueue.publish('order.created', {
      orderId: order.id,
      userId: order.userId,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt
    });
  }
}

// 事件消费者
@Injectable()
export class InventoryUpdateConsumer {
  constructor(private readonly inventoryService: InventoryService) {}

  @MessagePattern('order.created')
  async handleOrderCreated(data: OrderCreatedEvent): Promise<void> {
    // 更新库存
    await this.inventoryService.reserveItems(data.orderId);
  }
}
```

## 🔒 服务发现与负载均衡

### 服务注册
```typescript
// 服务自动注册
@Module({
  imports: [
    ConsulModule.forRoot({
      host: 'localhost',
      port: 8500
    })
  ]
})
export class AppModule implements OnModuleInit {
  constructor(private readonly consul: Consul) {}

  async onModuleInit() {
    // 注册服务到 Consul
    await this.consul.agent.service.register({
      name: 'user-service',
      address: 'localhost',
      port: 3000,
      check: {
        http: 'http://localhost:3000/health',
        interval: '10s'
      }
    });
  }
}
```

### 服务发现
```typescript
// 动态服务发现
@Injectable()
export class ServiceDiscovery {
  constructor(private readonly consul: Consul) {}

  async resolveService(serviceName: string): Promise<ServiceInstance[]> {
    return this.consul.health.service(serviceName);
  }

  async getHealthyInstance(serviceName: string): Promise<ServiceInstance> {
    const instances = await this.resolveService(serviceName);
    const healthyInstances = instances.filter(instance => 
      instance.Checks.every(check => check.Status === 'passing')
    );
    
    // 简单的轮询负载均衡
    return healthyInstances[Math.floor(Math.random() * healthyInstances.length)];
  }
}
```

## 📊 数据管理模式

### 数据库 per 服务
```typescript
// 每个服务有自己的数据库
@Entity()
export class User {
  // 用户服务专用数据模型
}

@Entity()
export class Order {
  // 订单服务专用数据模型
}

// 服务间通过 API 共享数据，不直接访问对方数据库
```

### 事件溯源
```typescript
// 使用事件溯源记录状态变化
@Entity()
export class OrderEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderId: string;

  @Column()
  eventType: string;

  @Column('json')
  eventData: any;

  @Column()
  timestamp: Date;

  @Column()
  version: number;
}

// 通过重放事件重建状态
async function rebuildOrderState(orderId: string): Promise<Order> {
  const events = await eventStore.getEvents(orderId);
  const order = new Order();
  
  for (const event of events) {
    order.apply(event);
  }
  
  return order;
}
```

## 🛡️ 容错模式

### 断路器模式
```typescript
// 使用断路器防止级联故障
@Injectable()
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private readonly failureThreshold = 5;
  private readonly timeout = 30000;

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      setTimeout(() => {
        this.state = 'HALF_OPEN';
      }, this.timeout);
    }
  }
}
```

### 重试模式
```typescript
// 自动重试失败的操作
@Injectable()
export class RetryPolicy {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        await this.delay(delay * Math.pow(2, attempt - 1));
      }
    }
    throw new Error('Max retries exceeded');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## 📚 学习资源
- [微服务模式](https://microservices.io/patterns/)
- [构建微服务](https://www.amazon.com/Building-Microservices-Sam-Newman/dp/1491950358)
- [微服务设计](https://www.amazon.com/Microservice-Patterns-examples-Chris-Richardson/dp/1617294543)

*最后更新: 2025年10月5日*