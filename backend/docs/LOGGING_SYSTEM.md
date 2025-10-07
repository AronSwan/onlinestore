---
title: "日志系统文档"
description: "全面的企业级日志解决方案，提供结构化日志记录、分布式追踪、日志聚合和实时分析功能"
owner: "Backend Team <backend@company.com>"
lastUpdated: "2025-01-26"
version: "2.0.0"
status: "active"
category: "monitoring"
tags: ["logging", "tracing", "elasticsearch", "kibana", "opentelemetry"]
audience: ["developer", "ops", "security"]
priority: "high"
reviewCycle: "monthly"
---

# 日志系统文档 (Logging System Documentation)

## 概述

本日志系统是一个全面的企业级日志解决方案，提供结构化日志记录、分布式追踪、日志聚合和实时分析功能。系统支持多种输出目标、高性能处理和强大的安全特性。

## 核心特性

### 🔍 结构化日志
- **多级别日志**: ERROR, WARN, INFO, HTTP, VERBOSE, DEBUG, SILLY
- **结构化格式**: JSON、简单文本、组合格式
- **上下文感知**: 自动注入请求ID、用户ID、会话ID等
- **性能监控**: 响应时间、数据库查询、缓存操作追踪

### 🌐 分布式追踪
- **OpenTelemetry集成**: 标准化的追踪协议
- **Jaeger支持**: 可视化追踪分析
- **OTLP导出**: 支持多种追踪后端
- **自动仪表化**: HTTP、数据库、缓存等自动追踪

### 📊 日志聚合
- **Elasticsearch集成**: 高性能搜索和分析
- **Kibana仪表板**: 可视化日志分析
- **实时索引**: 支持实时日志搜索
- **数据生命周期管理**: 自动归档和清理

### 🔒 安全特性
- **数据脱敏**: 自动识别和隐藏敏感信息
- **加密存储**: 支持日志数据加密
- **访问控制**: 基于角色的日志访问权限
- **审计追踪**: 完整的操作审计记录

## 快速开始

### 1. 环境配置

复制环境配置文件：
```bash
cp .env.logging.example .env.logging
```

基础配置：
```env
# 基础日志配置
LOG_LEVEL=info
LOG_FORMAT=json
LOG_CONSOLE_ENABLED=true
LOG_FILE_ENABLED=true

# 分布式追踪
TRACING_ENABLED=true
TRACING_SERVICE_NAME=shopping-backend
TRACING_JAEGER_ENABLED=true

# 日志聚合
LOG_AGGREGATION_ENABLED=true
LOG_AGGREGATION_ES_ENABLED=true
```

### 2. 模块集成

#### 同步配置
```typescript
import { LoggingModule } from './common/logging/logging.module';

@Module({
  imports: [
    LoggingModule.forRoot({
      isGlobal: true,
      logging: {
        level: 'info',
        format: 'json',
        console: { enabled: true },
        file: { enabled: true, dirname: './logs' },
      },
      tracing: {
        enabled: true,
        serviceName: 'shopping-backend',
        jaeger: { enabled: true },
      },
      aggregation: {
        enabled: true,
        elasticsearch: { enabled: true },
      },
    }),
  ],
})
export class AppModule {}
```

#### 异步配置
```typescript
@Module({
  imports: [
    LoggingModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        logging: {
          level: configService.get('LOG_LEVEL', 'info'),
          console: {
            enabled: configService.get('LOG_CONSOLE_ENABLED', true),
          },
        },
        tracing: {
          enabled: configService.get('TRACING_ENABLED', true),
          serviceName: configService.get('TRACING_SERVICE_NAME'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## 使用指南

### LoggingService 使用

#### 基础日志记录
```typescript
import { LoggingService } from './common/logging/logging.service';

@Injectable()
export class UserService {
  constructor(private loggingService: LoggingService) {}

  async createUser(userData: CreateUserDto): Promise<User> {
    // 信息日志
    this.loggingService.info('Creating new user', {
      operation: 'createUser',
      userId: userData.email,
    });

    try {
      const user = await this.userRepository.save(userData);
      
      // 成功日志
      this.loggingService.info('User created successfully', {
        operation: 'createUser',
        userId: user.id,
        email: user.email,
      });

      return user;
    } catch (error) {
      // 错误日志
      this.loggingService.error('Failed to create user', error, {
        operation: 'createUser',
        userData: this.loggingService.sanitizeData(userData),
      });
      throw error;
    }
  }
}
```

#### 结构化日志记录
```typescript
// HTTP请求日志
this.loggingService.logRequest({
  method: 'POST',
  url: '/api/users',
  statusCode: 201,
  responseTime: 150,
  userAgent: 'Mozilla/5.0...',
  ip: '192.168.1.1',
});

// 数据库操作日志
this.loggingService.logDatabaseQuery({
  query: 'SELECT * FROM users WHERE id = ?',
  parameters: [userId],
  duration: 25,
  rowCount: 1,
});

// 缓存操作日志
this.loggingService.logCacheOperation({
  operation: 'get',
  key: 'user:123',
  hit: true,
  duration: 2,
});

// 外部API调用日志
this.loggingService.logExternalApiCall({
  service: 'payment-gateway',
  method: 'POST',
  url: 'https://api.payment.com/charge',
  statusCode: 200,
  duration: 500,
});

// 业务事件日志
this.loggingService.logBusinessEvent({
  event: 'order_placed',
  orderId: 'ORD-123',
  userId: 'user-456',
  amount: 99.99,
  currency: 'USD',
});

// 安全事件日志
this.loggingService.logSecurityEvent({
  event: 'login_attempt',
  userId: 'user-123',
  ip: '192.168.1.1',
  success: true,
  userAgent: 'Mozilla/5.0...',
});

// 性能指标日志
this.loggingService.logPerformanceMetric({
  metric: 'response_time',
  value: 150,
  unit: 'ms',
  endpoint: '/api/users',
  method: 'GET',
});
```

### TracingService 使用

#### 创建和管理Span
```typescript
import { TracingService } from './common/tracing/tracing.service';

@Injectable()
export class OrderService {
  constructor(private tracingService: TracingService) {}

  async processOrder(orderData: CreateOrderDto): Promise<Order> {
    // 创建主要操作span
    const span = this.tracingService.createSpan('process_order', {
      'order.id': orderData.id,
      'order.amount': orderData.amount,
      'user.id': orderData.userId,
    });

    try {
      // 验证订单
      await this.tracingService.withSpan('validate_order', async () => {
        await this.validateOrder(orderData);
      });

      // 处理支付
      const paymentResult = await this.tracingService.withSpan('process_payment', async () => {
        return await this.paymentService.processPayment(orderData.payment);
      });

      // 创建订单
      const order = await this.tracingService.withSpan('create_order', async () => {
        return await this.orderRepository.save(orderData);
      });

      span.setAttributes({
        'order.status': 'completed',
        'payment.id': paymentResult.id,
      });

      return order;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  }
}
```

#### 追踪HTTP请求
```typescript
// 在控制器中使用
@Controller('orders')
export class OrderController {
  constructor(
    private orderService: OrderService,
    private tracingService: TracingService,
  ) {}

  @Post()
  async createOrder(@Body() orderData: CreateOrderDto, @Req() req: Request) {
    // 创建HTTP span
    const span = this.tracingService.createHttpSpan({
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    try {
      const order = await this.orderService.processOrder(orderData);
      
      span.setAttributes({
        'http.status_code': 201,
        'order.id': order.id,
      });

      return order;
    } catch (error) {
      span.recordException(error);
      span.setAttributes({
        'http.status_code': 500,
        'error.name': error.name,
      });
      throw error;
    } finally {
      span.end();
    }
  }
}
```

### LogAggregationService 使用

#### 搜索日志
```typescript
import { LogAggregationService, SearchQuery } from './common/logging/log-aggregation.service';

@Injectable()
export class LogAnalyticsService {
  constructor(private logAggregationService: LogAggregationService) {}

  async searchErrorLogs(timeRange: { from: string; to: string }) {
    const query: SearchQuery = {
      query: 'level:error',
      timeRange,
      sort: [{ field: '@timestamp', order: 'desc' }],
      size: 100,
    };

    return await this.logAggregationService.searchLogs(query);
  }

  async searchUserActivity(userId: string) {
    const query: SearchQuery = {
      filters: { 'context.userId': userId },
      timeRange: {
        from: 'now-24h',
        to: 'now',
      },
      aggregations: {
        activity_by_hour: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: '1h',
          },
        },
      },
    };

    return await this.logAggregationService.searchLogs(query);
  }

  async getLogAnalytics() {
    return await this.logAggregationService.getLogAnalytics({
      from: 'now-7d',
      to: 'now',
    });
  }
}
```

## 配置详解

### 日志级别配置
```typescript
// 日志级别优先级（从高到低）
enum LogLevel {
  ERROR = 'error',    // 错误信息
  WARN = 'warn',      // 警告信息
  INFO = 'info',      // 一般信息
  HTTP = 'http',      // HTTP请求信息
  VERBOSE = 'verbose', // 详细信息
  DEBUG = 'debug',    // 调试信息
  SILLY = 'silly',    // 最详细信息
}
```

### 输出目标配置

#### 控制台输出
```typescript
console: {
  enabled: true,
  level: 'info',
  colorize: true,
  timestamp: true,
  format: 'simple', // 'simple' | 'json' | 'combined'
}
```

#### 文件输出
```typescript
file: {
  enabled: true,
  level: 'info',
  filename: 'application.log',
  dirname: './logs',
  maxSize: '20m',
  maxFiles: '14d',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
}
```

#### Elasticsearch输出
```typescript
elasticsearch: {
  enabled: true,
  level: 'info',
  clientOpts: {
    nodes: ['http://localhost:9200'],
    username: 'elastic',
    password: 'password',
  },
  index: 'logs',
  indexPrefix: 'app-logs',
  flushInterval: 2000,
}
```

### 追踪配置

#### Jaeger配置
```typescript
jaeger: {
  enabled: true,
  endpoint: 'http://localhost:14268/api/traces',
  agentHost: 'localhost',
  agentPort: 6832,
}
```

#### 采样配置
```typescript
sampling: {
  type: 'traceid_ratio', // 'always_on' | 'always_off' | 'traceid_ratio' | 'parent_based'
  ratio: 0.1, // 10%采样率
}
```

### 安全配置

#### 数据脱敏
```typescript
security: {
  sanitization: {
    enabled: true,
    fields: ['password', 'token', 'secret', 'creditCard'],
    replacement: '[REDACTED]',
    patterns: [
      {
        pattern: '\\b\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b',
        replacement: '[CREDIT_CARD]',
        flags: 'g',
      },
    ],
  },
  masking: {
    enabled: true,
    fields: ['email', 'phone'],
    maskChar: '*',
    showFirst: 2,
    showLast: 2,
  },
}
```

## 最佳实践

### 1. 日志设计原则

#### 结构化日志
```typescript
// ✅ 好的做法
this.loggingService.info('User login successful', {
  operation: 'user_login',
  userId: user.id,
  email: user.email,
  ip: request.ip,
  userAgent: request.headers['user-agent'],
  duration: Date.now() - startTime,
});

// ❌ 避免的做法
this.loggingService.info(`User ${user.email} logged in from ${request.ip}`);
```

#### 上下文信息
```typescript
// ✅ 包含足够的上下文
this.loggingService.error('Database connection failed', error, {
  operation: 'database_connect',
  database: 'users',
  host: 'localhost',
  port: 5432,
  retryAttempt: 3,
  maxRetries: 5,
});
```

#### 性能考虑
```typescript
// ✅ 使用条件日志记录
if (this.loggingService.isDebugEnabled()) {
  this.loggingService.debug('Detailed debug info', {
    complexObject: this.generateComplexDebugInfo(),
  });
}

// ✅ 异步日志记录
this.loggingService.info('Operation completed', context, { async: true });
```

### 2. 错误处理

#### 错误日志记录
```typescript
try {
  await this.processPayment(paymentData);
} catch (error) {
  this.loggingService.error('Payment processing failed', error, {
    operation: 'process_payment',
    paymentId: paymentData.id,
    amount: paymentData.amount,
    currency: paymentData.currency,
    provider: paymentData.provider,
    // 不记录敏感的支付信息
    sanitizedData: this.loggingService.sanitizeData(paymentData),
  });
  
  // 重新抛出错误
  throw new PaymentProcessingException('Payment failed', error);
}
```

#### 错误分类
```typescript
// 业务错误
this.loggingService.warn('Invalid user input', {
  operation: 'validate_input',
  field: 'email',
  value: email,
  reason: 'invalid_format',
});

// 系统错误
this.loggingService.error('External service unavailable', error, {
  operation: 'external_api_call',
  service: 'payment_gateway',
  endpoint: '/api/charge',
  statusCode: 503,
});

// 安全错误
this.loggingService.error('Unauthorized access attempt', {
  operation: 'security_check',
  userId: userId,
  resource: '/admin/users',
  ip: request.ip,
  reason: 'insufficient_permissions',
});
```

### 3. 性能监控

#### 响应时间追踪
```typescript
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(private loggingService: LoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        
        this.loggingService.logPerformanceMetric({
          metric: 'response_time',
          value: duration,
          unit: 'ms',
          endpoint: request.url,
          method: request.method,
          statusCode: context.switchToHttp().getResponse().statusCode,
        });

        // 慢查询警告
        if (duration > 1000) {
          this.loggingService.warn('Slow response detected', {
            operation: 'http_request',
            endpoint: request.url,
            method: request.method,
            duration,
            threshold: 1000,
          });
        }
      }),
    );
  }
}
```

### 4. 分布式追踪

#### 跨服务追踪
```typescript
// 在HTTP客户端中传播追踪上下文
async callExternalService(data: any): Promise<any> {
  const headers = {};
  
  // 注入追踪头
  this.tracingService.injectTraceToHeaders(headers);
  
  return await this.httpService.post('/api/external', data, {
    headers,
  }).toPromise();
}

// 在接收端提取追踪上下文
@Injectable()
export class TracingMiddleware implements NestMiddleware {
  constructor(private tracingService: TracingService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // 提取追踪上下文
    const traceContext = this.tracingService.extractTraceFromHeaders(req.headers);
    
    if (traceContext) {
      // 设置当前追踪上下文
      this.tracingService.setCurrentContext(traceContext);
    }

    next();
  }
}
```

## 监控和告警

### 1. 日志监控指标

#### 关键指标
- **错误率**: 错误日志占总日志的比例
- **响应时间**: API响应时间分布
- **吞吐量**: 每秒处理的请求数
- **错误趋势**: 错误数量的时间趋势

#### 监控配置
```typescript
// 在应用启动时设置监控
@Injectable()
export class MonitoringService {
  constructor(
    private loggingService: LoggingService,
    private logAggregationService: LogAggregationService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkErrorRate() {
    const analytics = await this.logAggregationService.getLogAnalytics({
      from: 'now-5m',
      to: 'now',
    });

    if (analytics.performanceMetrics.errorRate > 0.05) {
      this.loggingService.error('High error rate detected', {
        operation: 'monitoring_check',
        errorRate: analytics.performanceMetrics.errorRate,
        threshold: 0.05,
        timeWindow: '5m',
      });
    }
  }
}
```

### 2. 告警规则

#### 错误率告警
```yaml
alert_rules:
  - name: "High Error Rate"
    condition: "error_rate > 0.05"
    window: "5m"
    severity: "critical"
    
  - name: "Slow Response Time"
    condition: "p95_response_time > 1000"
    window: "5m"
    severity: "warning"
    
  - name: "High Memory Usage"
    condition: "memory_usage > 0.9"
    window: "1m"
    severity: "critical"
```

## 故障排除

### 1. 常见问题

#### Elasticsearch连接问题
```bash
# 检查Elasticsearch状态
curl -X GET "localhost:9200/_cluster/health"

# 检查索引状态
curl -X GET "localhost:9200/logs-*/_stats"
```

#### 日志文件权限问题
```bash
# 检查日志目录权限
ls -la ./logs/

# 修复权限
chmod 755 ./logs/
chown -R app:app ./logs/
```

#### 内存使用过高
```typescript
// 启用日志采样
LOG_PERFORMANCE_SAMPLING_ENABLED=true
LOG_PERFORMANCE_SAMPLING_RATE=0.1

// 减少日志级别
LOG_LEVEL=warn

// 启用压缩
LOG_PERFORMANCE_COMPRESSION=true
```

### 2. 性能优化

#### 批量处理
```typescript
// 启用批量日志处理
LOG_BATCH_ENABLED=true
LOG_BATCH_SIZE=100
LOG_BATCH_TIMEOUT=5000
```

#### 异步处理
```typescript
// 启用异步日志记录
LOG_PERFORMANCE_ASYNC_LOGGING=true
LOG_PERFORMANCE_BUFFER_SIZE=1000
```

#### 缓存优化
```typescript
// 启用日志缓存
LOG_CACHE_ENABLED=true
LOG_CACHE_TTL=300000
LOG_CACHE_MAX_SIZE=1000
```

## API参考

### LoggingService

#### 基础方法
```typescript
// 日志记录方法
error(message: string, error?: any, context?: any): void
warn(message: string, context?: any): void
info(message: string, context?: any): void
debug(message: string, context?: any): void

// 结构化日志方法
logRequest(requestInfo: HttpRequestInfo): void
logDatabaseQuery(queryInfo: DatabaseQueryInfo): void
logCacheOperation(cacheInfo: CacheOperationInfo): void
logExternalApiCall(apiInfo: ExternalApiCallInfo): void
logBusinessEvent(eventInfo: BusinessEventInfo): void
logSecurityEvent(securityInfo: SecurityEventInfo): void
logPerformanceMetric(metricInfo: PerformanceMetricInfo): void

// 工具方法
sanitizeData(data: any, fields?: string[]): any
isDebugEnabled(): boolean
getStats(): LogStats
healthCheck(): Promise<HealthStatus>
```

### TracingService

#### Span管理
```typescript
// Span创建和管理
createSpan(name: string, attributes?: any): Span
withSpan<T>(name: string, fn: () => Promise<T>): Promise<T>
trace<T>(name: string, fn: () => T, attributes?: any): T

// 上下文管理
getCurrentContext(): TraceContext
getCurrentSpan(): Span
getTraceId(): string
getSpanId(): string

// 追踪传播
extractTraceFromHeaders(headers: any): TraceContext
injectTraceToHeaders(headers: any): void
```

### LogAggregationService

#### 搜索和分析
```typescript
// 日志搜索
searchLogs(query: SearchQuery): Promise<SearchResult>
getLogAnalytics(timeRange?: TimeRange): Promise<LogAnalytics>

// 配置和状态
getConfig(): LogAggregationConfig
healthCheck(): Promise<HealthStatus>
```

## 示例和模板

### 1. 控制器日志模板
```typescript
@Controller('users')
export class UserController {
  constructor(
    private userService: UserService,
    private loggingService: LoggingService,
  ) {}

  @Post()
  async createUser(@Body() userData: CreateUserDto, @Req() req: Request) {
    const startTime = Date.now();
    const correlationId = this.loggingService.generateCorrelationId();

    this.loggingService.info('User creation request received', {
      operation: 'create_user',
      correlationId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    try {
      const user = await this.userService.createUser(userData);
      
      this.loggingService.info('User created successfully', {
        operation: 'create_user',
        correlationId,
        userId: user.id,
        duration: Date.now() - startTime,
      });

      return user;
    } catch (error) {
      this.loggingService.error('User creation failed', error, {
        operation: 'create_user',
        correlationId,
        userData: this.loggingService.sanitizeData(userData),
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }
}
```

### 2. 服务日志模板
```typescript
@Injectable()
export class PaymentService {
  constructor(private loggingService: LoggingService) {}

  async processPayment(paymentData: PaymentDto): Promise<PaymentResult> {
    const timer = this.loggingService.startTimer();

    this.loggingService.info('Processing payment', {
      operation: 'process_payment',
      paymentId: paymentData.id,
      amount: paymentData.amount,
      currency: paymentData.currency,
    });

    try {
      // 验证支付数据
      await this.validatePayment(paymentData);
      
      // 调用支付网关
      const result = await this.callPaymentGateway(paymentData);
      
      // 记录成功
      this.loggingService.info('Payment processed successfully', {
        operation: 'process_payment',
        paymentId: paymentData.id,
        transactionId: result.transactionId,
        duration: timer.end(),
      });

      return result;
    } catch (error) {
      this.loggingService.error('Payment processing failed', error, {
        operation: 'process_payment',
        paymentId: paymentData.id,
        duration: timer.end(),
        errorCode: error.code,
      });
      throw error;
    }
  }
}
```

### 3. 中间件日志模板
```typescript
@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private loggingService: LoggingService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const correlationId = req.headers['x-correlation-id'] || 
                         this.loggingService.generateCorrelationId();

    // 设置响应头
    res.setHeader('x-correlation-id', correlationId);

    // 记录请求开始
    this.loggingService.info('HTTP request started', {
      operation: 'http_request',
      correlationId,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // 监听响应结束
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      this.loggingService.logRequest({
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime: duration,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        correlationId,
      });

      // 慢请求警告
      if (duration > 1000) {
        this.loggingService.warn('Slow request detected', {
          operation: 'http_request',
          correlationId,
          method: req.method,
          url: req.url,
          duration,
          threshold: 1000,
        });
      }
    });

    next();
  }
}
```

这个日志系统提供了完整的企业级日志解决方案，支持结构化日志、分布式追踪、实时聚合和强大的安全特性。通过合理的配置和使用，可以大大提升应用的可观测性和故障排除能力。

## 📁 日志留存策略

### 留存周期定义

#### 生产环境留存策略
| 日志类型 | 热存储期 | 温存储期 | 冷存储期 | 总保留期 | 存储介质 |
|----------|----------|----------|----------|----------|----------|
| **应用日志** | 7天 | 30天 | 335天 | 1年 | SSD → HDD → 对象存储 |
| **访问日志** | 3天 | 14天 | 348天 | 1年 | SSD → HDD → 对象存储 |
| **错误日志** | 30天 | 90天 | 245天 | 1年 | SSD → SSD → 对象存储 |
| **安全日志** | 90天 | 180天 | 1095天 | 3年 | SSD → SSD → 对象存储 |
| **审计日志** | 180天 | 365天 | 1825天 | 7年 | SSD → SSD → 对象存储 |
| **性能指标** | 1天 | 7天 | 357天 | 1年 | 内存 → SSD → 对象存储 |
| **调试日志** | 1天 | 0天 | 0天 | 1天 | SSD |

#### 开发/测试环境留存策略
| 日志类型 | 保留期 | 存储介质 | 备注 |
|----------|--------|----------|------|
| **应用日志** | 7天 | SSD | 开发调试用 |
| **访问日志** | 3天 | SSD | 性能测试用 |
| **错误日志** | 14天 | SSD | 问题排查用 |
| **安全日志** | 30天 | SSD | 安全测试用 |
| **调试日志** | 1天 | SSD | 实时调试用 |

### 自动化清理配置

#### Elasticsearch 索引生命周期管理
```json
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "10GB",
            "max_age": "1d"
          },
          "set_priority": {
            "priority": 100
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "allocate": {
            "number_of_replicas": 0
          },
          "forcemerge": {
            "max_num_segments": 1
          },
          "set_priority": {
            "priority": 50
          }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "allocate": {
            "number_of_replicas": 0,
            "include": {
              "box_type": "cold"
            }
          },
          "set_priority": {
            "priority": 0
          }
        }
      },
      "delete": {
        "min_age": "365d"
      }
    }
  }
}
```

#### 日志轮转配置
```yaml
# logrotate.conf
/var/log/app/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 0644 app app
    postrotate
        systemctl reload app-service
    endscript
}

/var/log/app/security/*.log {
    daily
    missingok
    rotate 90
    compress
    delaycompress
    notifempty
    create 0600 app app
}
```

## 🔒 敏感信息管理

### 敏感信息分类清单

#### 🔴 高敏感信息 (严禁记录)
- **认证凭据**: 密码、API密钥、JWT令牌、OAuth令牌
- **加密密钥**: 对称密钥、私钥、证书私钥
- **个人隐私**: 身份证号、护照号、银行卡号、手机号完整号码
- **支付信息**: 信用卡号、CVV、银行账户信息
- **生物特征**: 指纹、人脸特征、声纹数据

#### 🟡 中敏感信息 (脱敏记录)
- **用户标识**: 用户ID、邮箱地址、用户名
- **业务数据**: 订单金额、商品价格、交易流水
- **系统信息**: 内网IP、服务器名称、数据库连接串
- **第三方数据**: 外部API响应、合作伙伴信息

#### 🟢 低敏感信息 (可记录)
- **公开信息**: 商品名称、分类信息、公开配置
- **统计数据**: 访问量、错误计数、性能指标
- **系统状态**: 服务状态、健康检查结果

### 数据脱敏规则

#### 脱敏策略配置
```typescript
// 敏感信息脱敏配置
export const SENSITIVE_DATA_RULES = {
  // 邮箱脱敏: user@example.com → u***@e***.com
  email: {
    pattern: /^([^@]{1,2})[^@]*@([^.]{1,2})[^.]*\.(.*)/,
    replacement: '$1***@$2***.$3'
  },
  
  // 手机号脱敏: 13812345678 → 138****5678
  phone: {
    pattern: /^(\d{3})\d{4}(\d{4})$/,
    replacement: '$1****$2'
  },
  
  // 身份证脱敏: 110101199001011234 → 110101****1234
  idCard: {
    pattern: /^(\d{6})\d{8}(\d{4})$/,
    replacement: '$1****$2'
  },
  
  // 银行卡脱敏: 6222021234567890 → 6222****7890
  bankCard: {
    pattern: /^(\d{4})\d{8,12}(\d{4})$/,
    replacement: '$1****$2'
  },
  
  // IP地址脱敏: 192.168.1.100 → 192.168.*.*
  ipAddress: {
    pattern: /^(\d+\.\d+)\.\d+\.\d+$/,
    replacement: '$1.*.*'
  }
};

// 自动脱敏中间件
export class DataMaskingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => this.maskSensitiveData(data))
    );
  }

  private maskSensitiveData(data: any): any {
    if (typeof data === 'string') {
      return this.applyMaskingRules(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.maskSensitiveData(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const masked = {};
      for (const [key, value] of Object.entries(data)) {
        if (this.isSensitiveField(key)) {
          masked[key] = this.maskValue(key, value);
        } else {
          masked[key] = this.maskSensitiveData(value);
        }
      }
      return masked;
    }
    
    return data;
  }
}
```

### 日志安全检查

#### 敏感信息检测器
```typescript
export class SensitiveDataDetector {
  private static readonly PATTERNS = {
    creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    jwt: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g,
    apiKey: /[A-Za-z0-9]{32,}/g,
  };

  static detectSensitiveData(text: string): SensitiveDataMatch[] {
    const matches: SensitiveDataMatch[] = [];
    
    for (const [type, pattern] of Object.entries(this.PATTERNS)) {
      const found = text.match(pattern);
      if (found) {
        matches.push({
          type,
          matches: found,
          severity: this.getSeverity(type)
        });
      }
    }
    
    return matches;
  }
}
```

## 📊 事件分类与标准化

### 事件分类体系

#### 业务事件 (Business Events)
```typescript
export enum BusinessEventType {
  // 用户相关
  USER_REGISTERED = 'user.registered',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_PROFILE_UPDATED = 'user.profile_updated',
  
  // 订单相关
  ORDER_CREATED = 'order.created',
  ORDER_PAID = 'order.paid',
  ORDER_SHIPPED = 'order.shipped',
  ORDER_DELIVERED = 'order.delivered',
  ORDER_CANCELLED = 'order.cancelled',
  
  // 商品相关
  PRODUCT_VIEWED = 'product.viewed',
  PRODUCT_ADDED_TO_CART = 'product.added_to_cart',
  PRODUCT_REMOVED_FROM_CART = 'product.removed_from_cart',
  PRODUCT_PURCHASED = 'product.purchased',
  
  // 支付相关
  PAYMENT_INITIATED = 'payment.initiated',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',
}
```

#### 系统事件 (System Events)
```typescript
export enum SystemEventType {
  // 应用生命周期
  APPLICATION_STARTED = 'system.application_started',
  APPLICATION_STOPPED = 'system.application_stopped',
  APPLICATION_HEALTH_CHECK = 'system.health_check',
  
  // 数据库事件
  DATABASE_CONNECTED = 'system.database_connected',
  DATABASE_DISCONNECTED = 'system.database_disconnected',
  DATABASE_QUERY_SLOW = 'system.database_query_slow',
  
  // 缓存事件
  CACHE_HIT = 'system.cache_hit',
  CACHE_MISS = 'system.cache_miss',
  CACHE_EVICTION = 'system.cache_eviction',
  
  // 外部服务
  EXTERNAL_API_CALL = 'system.external_api_call',
  EXTERNAL_API_TIMEOUT = 'system.external_api_timeout',
  EXTERNAL_API_ERROR = 'system.external_api_error',
}
```

#### 安全事件 (Security Events)
```typescript
export enum SecurityEventType {
  // 认证事件
  AUTH_LOGIN_SUCCESS = 'security.auth_login_success',
  AUTH_LOGIN_FAILED = 'security.auth_login_failed',
  AUTH_TOKEN_EXPIRED = 'security.auth_token_expired',
  AUTH_TOKEN_INVALID = 'security.auth_token_invalid',
  
  // 授权事件
  ACCESS_GRANTED = 'security.access_granted',
  ACCESS_DENIED = 'security.access_denied',
  PRIVILEGE_ESCALATION = 'security.privilege_escalation',
  
  // 安全威胁
  SUSPICIOUS_ACTIVITY = 'security.suspicious_activity',
  BRUTE_FORCE_ATTEMPT = 'security.brute_force_attempt',
  SQL_INJECTION_ATTEMPT = 'security.sql_injection_attempt',
  XSS_ATTEMPT = 'security.xss_attempt',
  
  // 数据保护
  DATA_ACCESS = 'security.data_access',
  DATA_MODIFICATION = 'security.data_modification',
  DATA_EXPORT = 'security.data_export',
  SENSITIVE_DATA_EXPOSURE = 'security.sensitive_data_exposure',
}
```

### 事件标准化格式

#### 通用事件结构
```typescript
export interface StandardEvent {
  // 基础信息
  eventId: string;           // 事件唯一标识
  eventType: string;         // 事件类型
  eventCategory: EventCategory; // 事件分类
  timestamp: Date;           // 事件时间
  
  // 上下文信息
  correlationId?: string;    // 关联ID
  sessionId?: string;        // 会话ID
  userId?: string;           // 用户ID
  traceId?: string;          // 追踪ID
  
  // 事件数据
  data: Record<string, any>; // 事件具体数据
  metadata: EventMetadata;   // 事件元数据
  
  // 安全信息
  source: EventSource;       // 事件来源
  severity: EventSeverity;   // 事件严重程度
  tags: string[];           // 事件标签
}

export interface EventMetadata {
  version: string;           // 事件格式版本
  schema: string;           // 事件模式
  producer: string;         // 事件生产者
  environment: string;      // 运行环境
  region?: string;          // 地理区域
}

export interface EventSource {
  service: string;          // 服务名称
  component: string;        // 组件名称
  instance: string;         // 实例标识
  ip: string;              // IP地址
  userAgent?: string;       // 用户代理
}
```

### 事件治理规范

#### 事件命名规范
- **格式**: `{domain}.{action}[.{result}]`
- **示例**: 
  - `user.login.success`
  - `order.payment.failed`
  - `system.database.connection_lost`

#### 事件数据规范
```typescript
// 事件数据验证器
export class EventValidator {
  static validateBusinessEvent(event: StandardEvent): ValidationResult {
    const errors: string[] = [];
    
    // 必填字段检查
    if (!event.eventId) errors.push('eventId is required');
    if (!event.eventType) errors.push('eventType is required');
    if (!event.timestamp) errors.push('timestamp is required');
    
    // 格式检查
    if (event.eventId && !this.isValidUUID(event.eventId)) {
      errors.push('eventId must be a valid UUID');
    }
    
    // 敏感信息检查
    const sensitiveData = SensitiveDataDetector.detectSensitiveData(
      JSON.stringify(event.data)
    );
    if (sensitiveData.length > 0) {
      errors.push(`Sensitive data detected: ${sensitiveData.map(s => s.type).join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
```

这套完整的日志管理体系确保了数据的合规性、安全性和可追溯性，为企业级应用提供了坚实的日志基础设施。