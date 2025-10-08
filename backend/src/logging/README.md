# OpenObserve日志模块

本模块提供了完整的电商网站日志收集和分析功能，包括业务日志记录、用户行为追踪和日志分析。

## 功能概述

### 1. 业务日志服务 (BusinessLoggerService)
负责记录各种业务事件日志，包括：
- 用户操作日志
- 订单处理日志
- 支付交易日志
- 库存管理日志
- 系统事件日志

### 2. 用户行为追踪服务 (UserBehaviorTracker)
负责追踪用户在网站上的行为，包括：
- 页面访问记录
- 商品浏览记录
- 搜索行为记录
- 购物车操作记录
- 结账和购买行为记录

### 3. 日志分析服务 (LogAnalyticsService)
提供日志数据的查询和分析功能，包括：
- 日志统计查询
- 用户行为分析
- 异常日志模式检测
- 热门页面分析
- 转化漏斗分析

## 安装和配置

### 1. 导入模块

```typescript
import { LoggingModule } from './logging/logging.module';

@Module({
  imports: [
    LoggingModule,
    // 其他模块...
  ],
})
export class AppModule {}
```

### 2. 环境变量配置

```bash
# OpenObserve基础配置
OPENOBSERVE_URL=http://localhost:5080
OPENOBSERVE_ORGANIZATION=default
OPENOBSERVE_TOKEN=your-openobserve-token

# 数据流配置
OPENOBSERVE_STREAM_APPLICATION_LOGS=application-logs
OPENOBSERVE_STREAM_BUSINESS_EVENTS=business-events
OPENOBSERVE_STREAM_USER_BEHAVIOR=user-behavior

# 性能配置
OPENOBSERVE_BATCH_SIZE=100
OPENOBSERVE_FLUSH_INTERVAL=5000
OPENOBSERVE_MAX_RETRIES=3
OPENOBSERVE_TIMEOUT=30000

# 追踪配置
OPENOBSERVE_TRACING_ENABLED=true
OPENOBSERVE_TRACING_SAMPLING_RATE=0.1
```

## 使用示例

### 1. 业务日志记录

```typescript
import { BusinessLoggerService } from './logging/business-logger.service';

@Injectable()
export class OrderService {
  constructor(
    private readonly businessLoggerService: BusinessLoggerService,
  ) {}

  async createOrder(orderData: any): Promise<Order> {
    try {
      // 创建订单逻辑
      const order = await this.orderRepository.create(orderData);
      
      // 记录订单创建日志
      this.businessLoggerService.logOrderEvent(
        order.id,
        'ORDER_CREATED',
        {
          userId: order.userId,
          totalAmount: order.totalAmount,
          items: order.items.length,
        }
      );
      
      return order;
    } catch (error) {
      // 记录错误日志
      this.businessLoggerService.logError(error, {
        action: 'CREATE_ORDER',
        userId: orderData.userId,
      });
      
      throw error;
    }
  }
}
```

### 2. 用户行为追踪

```typescript
import { UserBehaviorTracker } from './logging/user-behavior-tracker.service';

@Controller('products')
export class ProductController {
  constructor(
    private readonly userBehaviorTracker: UserBehaviorTracker,
  ) {}

  @Get(':id')
  async getProduct(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<Product> {
    // 获取产品逻辑
    const product = await this.productService.findById(id);
    
    // 追踪商品浏览行为
    const sessionId = this.extractSessionId(req);
    const userId = this.extractUserId(req);
    
    this.userBehaviorTracker.trackProductView(
      sessionId,
      id,
      userId,
      req
    );
    
    return product;
  }
  
  private extractSessionId(req: Request): string {
    return req.cookies?.sessionId || req.headers['x-session-id'] || '';
  }
  
  private extractUserId(req: Request): string {
    return req.user?.id || '';
  }
}
```

### 3. 日志分析

```typescript
import { LogAnalyticsService } from './logging/log-analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly logAnalyticsService: LogAnalyticsService,
  ) {}

  @Get('dashboard')
  async getDashboardData(
    @Query('start') start: string,
    @Query('end') end: string,
  ): Promise<any> {
    const timeRange = { start, end };
    
    // 获取日志统计
    const logStats = await this.logAnalyticsService.getLogStats(timeRange);
    
    // 获取用户行为分析
    const userBehaviorAnalytics = await this.logAnalyticsService.getUserBehaviorAnalytics(timeRange);
    
    // 获取热门页面
    const popularPages = await this.logAnalyticsService.getPopularPages(timeRange, 10);
    
    // 获取转化漏斗
    const conversionFunnel = await this.logAnalyticsService.getConversionFunnel(timeRange);
    
    // 检测异常模式
    const anomalies = await this.logAnalyticsService.detectAnomalousPatterns(timeRange);
    
    return {
      logStats,
      userBehaviorAnalytics,
      popularPages,
      conversionFunnel,
      anomalies,
    };
  }
}
```

## API接口

### 业务日志接口

- `POST /api/logging/user-action` - 记录用户操作日志
- `POST /api/logging/order-event` - 记录订单事件日志
- `POST /api/logging/payment-event` - 记录支付事件日志
- `POST /api/logging/inventory-event` - 记录库存事件日志

### 用户行为追踪接口

- `POST /api/logging/page-view` - 记录页面访问
- `POST /api/logging/product-view` - 记录商品浏览
- `POST /api/logging/search` - 记录搜索行为
- `POST /api/logging/cart-operation` - 记录购物车操作
- `POST /api/logging/checkout` - 记录结账行为
- `POST /api/logging/purchase` - 记录购买行为

### 日志分析接口

- `GET /api/logging/stats` - 获取日志统计
- `GET /api/logging/user-behavior-analytics` - 获取用户行为分析
- `GET /api/logging/anomaly-detection` - 检测异常日志模式
- `GET /api/logging/popular-pages` - 获取热门页面
- `GET /api/logging/conversion-funnel` - 获取转化漏斗

### 工具接口

- `POST /api/logging/flush` - 强制刷新日志缓冲区

## 数据模型

### 业务日志条目 (BusinessLogEntry)

```typescript
interface BusinessLogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  service: string;
  category: 'USER' | 'ORDER' | 'PAYMENT' | 'INVENTORY' | 'SYSTEM';
  action: string;
  message: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  tags?: Record<string, any>;
  metadata?: Record<string, any>;
  businessContext?: {
    orderId?: string;
    productId?: string;
    cartId?: string;
    paymentId?: string;
    amount?: number;
    currency?: string;
    status?: string;
  };
}
```

### 用户行为日志 (UserBehaviorLog)

```typescript
interface UserBehaviorLog {
  timestamp: string;
  userId?: string;
  sessionId: string;
  eventType: 'PAGE_VIEW' | 'PRODUCT_VIEW' | 'SEARCH' | 'CART_ADD' | 'CART_REMOVE' | 'CHECKOUT' | 'PURCHASE';
  eventData: {
    page?: string;
    productId?: string;
    searchQuery?: string;
    categoryId?: string;
    cartId?: string;
    orderId?: string;
    price?: number;
    quantity?: number;
    totalAmount?: number;
  };
  deviceInfo?: {
    userAgent: string;
    ip: string;
    platform: string;
    screenResolution?: string;
  };
  referrer?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}
```

## 最佳实践

### 1. 日志记录

- 使用适当的日志级别（DEBUG、INFO、WARN、ERROR）
- 包含足够的上下文信息，便于问题排查
- 避免记录敏感信息（如密码、令牌等）
- 使用结构化日志格式，便于查询和分析

### 2. 性能考虑

- 日志记录是异步的，不会阻塞主业务流程
- 使用批量发送机制，减少网络开销
- 设置合理的缓冲区大小和刷新间隔
- 在应用关闭时强制刷新缓冲区

### 3. 错误处理

- 日志记录失败不应影响主业务流程
- 实现重试机制，提高日志发送的可靠性
- 记录日志发送失败的错误，便于排查问题

## 故障排除

### 1. 日志发送失败

- 检查OpenObserve服务是否正常运行
- 验证网络连接和防火墙设置
- 确认认证令牌是否有效
- 检查日志格式是否符合要求

### 2. 性能问题

- 调整批量大小和刷新间隔
- 检查网络延迟和带宽
- 监控内存使用情况
- 考虑使用异步处理

### 3. 数据查询问题

- 验证SQL查询语法
- 检查时间范围格式
- 确认数据流名称是否正确
- 查看OpenObserve日志获取详细错误信息

## 扩展功能

### 1. 自定义日志字段

可以通过扩展接口添加自定义日志字段：

```typescript
interface CustomBusinessLogEntry extends BusinessLogEntry {
  customField?: string;
  anotherCustomField?: number;
}
```

### 2. 自定义事件类型

可以添加自定义事件类型：

```typescript
this.userBehaviorTracker.trackCustomEvent(
  sessionId,
  'CUSTOM_EVENT_TYPE',
  { customData: 'value' },
  userId,
  req
);
```

### 3. 集成其他服务

可以将日志服务与其他服务集成：

```typescript
@Injectable()
export class NotificationService {
  constructor(
    private readonly businessLoggerService: BusinessLoggerService,
  ) {}

  async sendNotification(notification: any): Promise<void> {
    try {
      // 发送通知逻辑
      await this.notificationProvider.send(notification);
      
      // 记录通知发送日志
      this.businessLoggerService.logSystemEvent(
        'NOTIFICATION_SENT',
        'INFO',
        {
          notificationId: notification.id,
          recipient: notification.recipient,
          type: notification.type,
        }
      );
    } catch (error) {
      // 记录通知发送失败日志
      this.businessLoggerService.logError(error, {
        action: 'SEND_NOTIFICATION',
        notificationId: notification.id,
      });
      
      throw error;
    }
  }
}
```

## 总结

本日志模块提供了完整的电商网站日志收集和分析功能，可以帮助您：

1. 全面记录业务事件和用户行为
2. 实时分析日志数据，获取业务洞察
3. 及时发现异常模式，预防问题发生
4. 优化用户体验，提高转化率

通过合理使用这些功能，您可以大大提升系统的可观测性和运维效率。