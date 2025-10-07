# 分布式追踪系统使用指南

## 概述

本项目集成了基于 OpenTelemetry 的分布式追踪系统，支持 Jaeger 和 Zipkin 作为追踪后端。分布式追踪可以帮助我们：

- 跟踪请求在微服务间的完整调用链路
- 识别性能瓶颈和延迟问题
- 监控系统健康状态和错误率
- 分析业务流程的执行情况

## 快速开始

### 1. 环境配置

复制环境变量配置文件：
```bash
cp .env.tracing.example .env.local
```

根据需要修改配置，开发环境推荐配置：
```env
TRACING_ENABLED=true
CONSOLE_TRACING=true
JAEGER_ENABLED=true
TRACE_SAMPLING_RATIO=0.1
```

### 2. 启动追踪基础设施

使用 Docker Compose 启动 Jaeger：
```bash
# 启动 Jaeger
docker-compose -f docker-compose.tracing.yml up -d jaeger

# 启动完整监控栈（包括 Prometheus 和 Grafana）
docker-compose -f docker-compose.tracing.yml --profile monitoring up -d

# 启动 Zipkin（可选）
docker-compose -f docker-compose.tracing.yml --profile zipkin up -d zipkin
```

### 3. 访问追踪 UI

- **Jaeger UI**: http://localhost:16686
- **Zipkin UI**: http://localhost:9411 (如果启用)
- **Grafana**: http://localhost:3000 (admin/admin123)
- **Prometheus**: http://localhost:9090

### 4. 启动应用

```bash
npm run start:dev
```

## 使用方法

### 自动追踪

系统会自动追踪以下操作：
- HTTP 请求和响应
- 数据库查询（MySQL）
- Redis 操作
- 外部 HTTP 调用

### 手动追踪

#### 1. 使用装饰器

```typescript
import { Trace, TraceDatabase, TraceHttp } from '../common/tracing/tracing.config';

@Injectable()
export class UserService {
  
  @Trace('user-creation')
  async createUser(userData: CreateUserDto): Promise<User> {
    // 业务逻辑
  }

  @TraceDatabase('users')
  async findUserById(id: string): Promise<User> {
    // 数据库操作
  }

  @TraceHttp('external-api-call')
  async callExternalApi(): Promise<any> {
    // 外部 API 调用
  }
}
```

#### 2. 使用 TracingService

```typescript
import { TracingService } from '../common/tracing/tracing.service';

@Injectable()
export class OrderService {
  constructor(private readonly tracingService: TracingService) {}

  async processOrder(orderData: CreateOrderDto): Promise<Order> {
    return this.tracingService.trace(
      'process-order',
      async (span) => {
        span.setAttributes({
          'order.user_id': orderData.userId,
          'order.total_amount': orderData.totalAmount,
        });

        // 创建子 Span
        const paymentSpan = this.tracingService.createChildSpan(
          'process-payment',
          span,
          { 'payment.method': orderData.paymentMethod }
        );

        await this.tracingService.withSpan(paymentSpan, async () => {
          // 支付处理逻辑
        });

        return order;
      },
      { 'business.domain': 'order' }
    );
  }
}
```

#### 3. 批量追踪

```typescript
async processBatchOrders(orders: CreateOrderDto[]): Promise<Order[]> {
  const operations = orders.map((orderData, index) => ({
    name: `process-order-${index}`,
    fn: async (span) => {
      span.setAttributes({
        'batch.index': index,
        'order.id': orderData.id,
      });
      return this.processOrder(orderData);
    },
    attributes: { 'batch.operation': 'order-processing' },
  }));

  return this.tracingService.traceBatch(operations);
}
```

### 错误追踪

系统会自动捕获和追踪异常：

```typescript
async riskyOperation(): Promise<any> {
  return this.tracingService.trace(
    'risky-operation',
    async (span) => {
      try {
        // 可能出错的操作
        return await this.doSomethingRisky();
      } catch (error) {
        // 错误会自动记录到 span
        span.setAttributes({
          'error.handled': true,
          'error.recovery_attempted': true,
        });
        throw error;
      }
    }
  );
}
```

## 追踪数据分析

### 1. 性能分析

在 Jaeger UI 中可以：
- 查看请求的完整调用链
- 分析各个服务的响应时间
- 识别性能瓶颈
- 对比不同时间段的性能表现

### 2. 错误分析

- 查看错误发生的完整上下文
- 分析错误传播路径
- 统计错误率和错误类型
- 关联错误与特定的业务操作

### 3. 业务分析

通过自定义属性可以分析：
- 用户行为模式
- 业务流程执行情况
- 功能使用频率
- 转化率分析

## API 接口

系统提供了追踪管理的 API 接口：

### 获取追踪统计
```http
GET /api/tracing/stats
Authorization: Bearer <admin-token>
```

### 获取系统健康状态
```http
GET /api/tracing/health
Authorization: Bearer <admin-token>
```

### 创建测试追踪
```http
POST /api/tracing/test?operation=test-operation
Authorization: Bearer <admin-token>
```

### 批量测试追踪
```http
POST /api/tracing/test/batch?count=5
Authorization: Bearer <admin-token>
```

## 最佳实践

### 1. Span 命名

- 使用描述性的名称：`HTTP GET /api/users/{id}` 而不是 `getUserById`
- 包含操作类型：`DB SELECT users`, `HTTP POST`, `Business process-order`
- 保持一致的命名规范

### 2. 属性设置

```typescript
span.setAttributes({
  // 业务属性
  'user.id': userId,
  'order.total': orderTotal,
  'product.category': category,
  
  // 技术属性
  'db.table': 'users',
  'http.method': 'POST',
  'cache.hit': true,
  
  // 性能属性
  'operation.duration_ms': duration,
  'batch.size': items.length,
});
```

### 3. 采样策略

- **开发环境**: 100% 采样 (`TRACE_SAMPLING_RATIO=1.0`)
- **测试环境**: 50% 采样 (`TRACE_SAMPLING_RATIO=0.5`)
- **生产环境**: 1-10% 采样 (`TRACE_SAMPLING_RATIO=0.01-0.1`)

### 4. 敏感数据处理

避免在追踪中记录敏感信息：
```typescript
// ❌ 错误做法
span.setAttributes({
  'user.password': password,
  'payment.card_number': cardNumber,
});

// ✅ 正确做法
span.setAttributes({
  'user.id': userId,
  'payment.method': 'credit_card',
  'payment.last_four': cardNumber.slice(-4),
});
```

## 故障排除

### 1. 追踪数据未显示

检查配置：
```bash
# 检查环境变量
echo $TRACING_ENABLED
echo $JAEGER_ENABLED

# 检查 Jaeger 服务状态
docker-compose -f docker-compose.tracing.yml ps jaeger

# 查看应用日志
npm run start:dev
```

### 2. 性能影响

如果追踪影响性能：
- 降低采样率
- 禁用详细的属性记录
- 使用批量导出器
- 检查网络延迟

### 3. 存储空间

Jaeger 数据清理：
```bash
# 设置数据保留期（默认 72 小时）
docker run --rm jaegertracing/jaeger-es-cleaner:latest \
  --es.server-urls=http://elasticsearch:9200 \
  --es.index-prefix=jaeger \
  --rollover.max-age=72h
```

## 监控和告警

### 1. 关键指标

- 追踪覆盖率
- 平均响应时间
- 错误率
- 服务依赖关系

### 2. 告警规则

在 Prometheus 中配置告警：
```yaml
groups:
  - name: tracing
    rules:
      - alert: HighErrorRate
        expr: rate(traces_total{status="error"}[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          
      - alert: SlowRequests
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "95th percentile latency is above 2 seconds"
```

## 扩展和集成

### 1. 自定义导出器

```typescript
import { SpanExporter } from '@opentelemetry/sdk-trace-base';

export class CustomSpanExporter implements SpanExporter {
  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    // 自定义导出逻辑
  }
}
```

### 2. 与日志系统集成

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class TracingLogger extends Logger {
  log(message: string, context?: string) {
    const traceContext = this.tracingService.getCurrentTraceContext();
    super.log(`[${traceContext?.traceId}] ${message}`, context);
  }
}
```

### 3. 与监控系统集成

- **Prometheus**: 指标收集和告警
- **Grafana**: 可视化仪表板
- **ELK Stack**: 日志聚合和分析
- **APM 工具**: New Relic, Datadog 等

## 参考资源

- [OpenTelemetry 官方文档](https://opentelemetry.io/docs/)
- [Jaeger 文档](https://www.jaegertracing.io/docs/)
- [Zipkin 文档](https://zipkin.io/pages/quickstart.html)
- [分布式追踪最佳实践](https://opentelemetry.io/docs/best-practices/)