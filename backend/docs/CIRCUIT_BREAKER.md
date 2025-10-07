# 熔断器系统文档

## 概述

熔断器（Circuit Breaker）是一种用于防止系统级联故障的设计模式。当检测到某个服务或组件出现故障时，熔断器会自动"断开"对该服务的调用，防止故障传播到整个系统，并提供快速失败机制。

### 核心特性

- **自动故障检测**：基于失败率和响应时间自动检测服务故障
- **三种状态管理**：CLOSED（正常）、OPEN（熔断）、HALF_OPEN（半开）
- **智能恢复机制**：自动尝试恢复并验证服务健康状态
- **多维度监控**：失败率、慢调用率、调用统计等
- **灵活配置**：支持不同服务类型的个性化配置
- **实时监控**：提供详细的状态监控和统计信息
- **分布式追踪**：集成链路追踪，便于问题定位

## 快速开始

### 1. 环境配置

复制配置文件模板：
```bash
cp .env.circuit-breaker.example .env.circuit-breaker
```

基础配置：
```env
# 启用熔断器
CIRCUIT_BREAKER_ENABLED=true

# 默认配置
CIRCUIT_BREAKER_DEFAULT_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_DEFAULT_SUCCESS_THRESHOLD=3
CIRCUIT_BREAKER_DEFAULT_TIMEOUT=60000
```

### 2. 应用启动

熔断器模块会自动加载并初始化：
```bash
npm run start
```

### 3. 状态检查

检查熔断器系统状态：
```bash
curl http://localhost:3000/api/circuit-breaker/health
```

## 熔断器状态

### 状态类型

1. **CLOSED（关闭/正常）**
   - 正常处理请求
   - 监控失败率和响应时间
   - 达到阈值时转为OPEN状态

2. **OPEN（打开/熔断）**
   - 拒绝所有请求，快速失败
   - 返回预设的fallback响应
   - 超时后转为HALF_OPEN状态

3. **HALF_OPEN（半开/试探）**
   - 允许少量请求通过
   - 根据结果决定恢复或继续熔断
   - 成功则转为CLOSED，失败则转为OPEN

### 状态转换条件

```typescript
// CLOSED -> OPEN
if (failureRate >= failureThreshold || slowCallRate >= slowCallRateThreshold) {
  state = OPEN;
}

// OPEN -> HALF_OPEN
if (currentTime - lastFailureTime >= timeout) {
  state = HALF_OPEN;
}

// HALF_OPEN -> CLOSED/OPEN
if (successCount >= successThreshold) {
  state = CLOSED;
} else if (failureCount > 0) {
  state = OPEN;
}
```

## 使用方法

### 1. 装饰器方式（推荐）

#### 基础使用
```typescript
import { CircuitBreaker } from '../common/decorators/circuit-breaker.decorator';

@Injectable()
export class UserService {
  @CircuitBreaker({
    name: 'user-service-get-user',
    fallbackValue: { id: 0, name: 'Unknown User' }
  })
  async getUser(id: number): Promise<User> {
    // 可能失败的操作
    return await this.userRepository.findOne(id);
  }
}
```

#### 专用装饰器
```typescript
import { 
  DatabaseCircuitBreaker,
  ExternalApiCircuitBreaker,
  CacheCircuitBreaker 
} from '../common/decorators/circuit-breaker.decorator';

@Injectable()
export class ProductService {
  @DatabaseCircuitBreaker('product-db-query')
  async findProduct(id: number): Promise<Product> {
    return await this.productRepository.findOne(id);
  }

  @ExternalApiCircuitBreaker('external-price-api')
  async getExternalPrice(productId: number): Promise<number> {
    return await this.externalPriceService.getPrice(productId);
  }

  @CacheCircuitBreaker('product-cache')
  async getCachedProduct(id: number): Promise<Product> {
    return await this.cacheService.get(`product:${id}`);
  }
}
```

### 2. 服务方式

```typescript
import { CircuitBreakerService } from '../common/circuit-breaker/circuit-breaker.service';

@Injectable()
export class OrderService {
  constructor(
    private readonly circuitBreakerService: CircuitBreakerService
  ) {}

  async processPayment(orderId: string, amount: number): Promise<PaymentResult> {
    return await this.circuitBreakerService.execute(
      'payment-service',
      async () => {
        return await this.paymentService.charge(orderId, amount);
      },
      {
        fallbackValue: { success: false, error: 'Payment service unavailable' }
      }
    );
  }
}
```

### 3. 全局拦截器

自动应用于所有HTTP请求：
```typescript
// 在app.module.ts中已自动配置
providers: [
  {
    provide: APP_INTERCEPTOR,
    useClass: GlobalCircuitBreakerInterceptor,
  },
]
```

## API接口

### 获取所有熔断器状态
```http
GET /api/circuit-breaker/status
```

响应示例：
```json
{
  "summary": {
    "total": 10,
    "closed": 8,
    "open": 1,
    "halfOpen": 1
  },
  "circuitBreakers": [
    {
      "name": "user-service",
      "state": "CLOSED",
      "stats": {
        "totalCalls": 1000,
        "successCalls": 950,
        "failureCalls": 50,
        "failureRate": 5.0,
        "averageResponseTime": 120
      }
    }
  ]
}
```

### 获取特定熔断器状态
```http
GET /api/circuit-breaker/status/:name
```

### 手动控制熔断器
```http
POST /api/circuit-breaker/:name/open
POST /api/circuit-breaker/:name/close
```

### 清除历史数据
```http
DELETE /api/circuit-breaker/:name/history
```

### 系统健康检查
```http
GET /api/circuit-breaker/health
```

### 统计信息
```http
GET /api/circuit-breaker/statistics
```

## 监控和告警

### 关键指标

1. **状态指标**
   - 熔断器总数
   - 各状态熔断器数量
   - 状态变化频率

2. **性能指标**
   - 总调用次数
   - 成功/失败次数
   - 失败率
   - 平均响应时间
   - 慢调用率

3. **健康指标**
   - 系统健康评分
   - 打开的熔断器数量
   - 恢复成功率

### Prometheus指标

```prometheus
# 熔断器状态
circuit_breaker_state{name="user-service"} 0  # 0=CLOSED, 1=OPEN, 2=HALF_OPEN

# 调用统计
circuit_breaker_calls_total{name="user-service", result="success"} 950
circuit_breaker_calls_total{name="user-service", result="failure"} 50

# 响应时间
circuit_breaker_response_time_seconds{name="user-service", quantile="0.5"} 0.12
circuit_breaker_response_time_seconds{name="user-service", quantile="0.95"} 0.25

# 失败率
circuit_breaker_failure_rate{name="user-service"} 0.05
```

### 告警规则

```yaml
groups:
  - name: circuit_breaker
    rules:
      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "熔断器 {{ $labels.name }} 已打开"
          
      - alert: HighFailureRate
        expr: circuit_breaker_failure_rate > 0.8
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "熔断器 {{ $labels.name }} 失败率过高"
          
      - alert: TooManyOpenCircuitBreakers
        expr: count(circuit_breaker_state > 0) > 3
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "过多熔断器处于打开状态"
```

## 配置选项

### 全局默认配置

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;        // 失败阈值（次数）
  successThreshold: number;        // 成功阈值（次数）
  timeout: number;                 // 超时时间（毫秒）
  monitoringPeriod: number;        // 监控周期（毫秒）
  minimumCalls: number;            // 最小调用次数
  slowCallThreshold: number;       // 慢调用阈值（毫秒）
  slowCallRateThreshold: number;   // 慢调用率阈值（百分比）
}
```

### 服务特定配置

```env
# 数据库熔断器
CIRCUIT_BREAKER_DATABASE_FAILURE_THRESHOLD=3
CIRCUIT_BREAKER_DATABASE_TIMEOUT=30000

# 外部API熔断器
CIRCUIT_BREAKER_EXTERNAL_API_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_EXTERNAL_API_TIMEOUT=60000

# 缓存熔断器
CIRCUIT_BREAKER_CACHE_FAILURE_THRESHOLD=3
CIRCUIT_BREAKER_CACHE_TIMEOUT=15000
```

## 最佳实践

### 1. 服务设计

- **合理设置阈值**：根据服务特性设置合适的失败阈值
- **提供fallback**：为所有关键操作提供降级方案
- **避免级联**：防止熔断器之间的级联触发
- **监控关键路径**：重点监控核心业务流程

### 2. 监控策略

- **实时监控**：监控熔断器状态变化
- **趋势分析**：分析失败率和响应时间趋势
- **告警设置**：设置合理的告警阈值
- **定期回顾**：定期回顾和调整配置

### 3. 测试策略

- **故障注入**：模拟各种故障场景
- **压力测试**：验证高负载下的表现
- **恢复测试**：验证自动恢复机制
- **端到端测试**：验证整体系统行为

### 4. 运维管理

- **配置管理**：统一管理熔断器配置
- **版本控制**：跟踪配置变更历史
- **文档维护**：保持文档和配置同步
- **团队培训**：确保团队理解熔断器原理

## 故障排除

### 常见问题

1. **熔断器频繁打开**
   - 检查失败阈值设置是否过低
   - 分析底层服务健康状况
   - 检查网络连接稳定性

2. **恢复时间过长**
   - 调整超时时间设置
   - 检查成功阈值配置
   - 验证服务恢复能力

3. **性能影响**
   - 检查监控周期设置
   - 优化统计数据存储
   - 考虑异步处理

### 调试工具

```typescript
// 启用调试日志
CIRCUIT_BREAKER_LOG_LEVEL=debug

// 查看详细状态
GET /api/circuit-breaker/status/:name?detailed=true

// 测试熔断器
POST /api/circuit-breaker/:name/test
```

## 相关文档

- [优雅降级系统](./GRACEFUL_DEGRADATION.md)
- [分布式追踪](./DISTRIBUTED_TRACING.md)
- [监控告警](./MONITORING_ALERTING_SYSTEM.md)
- [性能优化](./MONITORING_PERFORMANCE_REPORT.md)

## 支持

如有问题或建议，请联系：
- 技术支持：tech-support@company.com
- 文档反馈：docs@company.com
- 紧急联系：on-call@company.com