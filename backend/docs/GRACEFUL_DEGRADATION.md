# 优雅降级系统 (Graceful Degradation)

## 概述

优雅降级系统是一个自动化的服务保护机制，在系统负载过高或出现故障时，通过逐步禁用非核心功能来保证核心业务的正常运行。系统支持多级降级策略，确保在各种压力情况下都能提供稳定的服务。

## 核心特性

- **多级降级策略**: 支持5个降级级别，从正常到紧急状态
- **自动监控**: 实时监控系统指标，自动触发降级
- **服务分类**: 按重要性对服务进行分类管理
- **智能恢复**: 系统状况改善时自动恢复服务
- **API管理**: 提供完整的API接口进行手动控制
- **分布式追踪**: 集成追踪系统，记录所有降级操作

## 快速开始

### 1. 环境配置

在 `.env` 文件中添加降级相关配置：

```bash
# 降级系统配置
DEGRADATION_ENABLED=true
DEGRADATION_DEFAULT_LEVEL=0
DEGRADATION_AUTO_RECOVERY=true
DEGRADATION_METRICS_INTERVAL=30000

# 降级阈值配置
DEGRADATION_CPU_THRESHOLD=80
DEGRADATION_MEMORY_THRESHOLD=85
DEGRADATION_RESPONSE_TIME_THRESHOLD=5000
DEGRADATION_ERROR_RATE_THRESHOLD=10
```

### 2. 应用启动

系统启动时会自动初始化降级模块：

```bash
npm run start:dev
```

### 3. 检查降级状态

```bash
curl http://localhost:3000/api/degradation/status
```

## 降级级别

### 级别定义

| 级别 | 名称 | 描述 | 影响范围 |
|------|------|------|----------|
| 0 | NORMAL | 正常状态 | 所有服务可用 |
| 1 | LIGHT | 轻度降级 | 分析、推荐服务受限 |
| 2 | MODERATE | 中度降级 | 搜索、通知服务简化 |
| 3 | HEAVY | 重度降级 | 仅保留重要功能 |
| 4 | EMERGENCY | 紧急降级 | 仅保留核心业务 |

### 服务分类

| 服务类型 | 重要性 | 降级级别 | 降级策略 |
|----------|--------|----------|----------|
| CORE | 最高 | 始终可用 | 无降级 |
| BUSINESS | 高 | EMERGENCY时降级 | 返回错误 |
| ENHANCEMENT | 中 | HEAVY时降级 | 禁用功能 |
| SEARCH | 中 | MODERATE时降级 | 简化搜索 |
| NOTIFICATION | 中 | MODERATE时降级 | 批量处理 |
| RECOMMENDATION | 低 | LIGHT时降级 | 使用缓存 |
| ANALYTICS | 低 | LIGHT时降级 | 禁用实时分析 |

## 使用方法

### 1. 自动降级

系统会根据预设规则自动触发降级：

```typescript
// 系统会自动监控这些指标
const metrics = {
  cpuUsage: 85,        // CPU使用率超过80%触发轻度降级
  memoryUsage: 90,     // 内存使用率超过85%触发中度降级
  responseTime: 6000,  // 响应时间超过5秒触发中度降级
  errorRate: 15,       // 错误率超过10%触发重度降级
  queueLength: 1200    // 队列长度超过1000触发中度降级
};
```

### 2. 手动降级

通过API手动设置降级级别：

```bash
# 设置为轻度降级
curl -X POST http://localhost:3000/api/degradation/level \
  -H "Content-Type: application/json" \
  -d '{"level": 1, "reason": "预防性降级"}'

# 恢复到正常状态
curl -X POST http://localhost:3000/api/degradation/recover \
  -H "Content-Type: application/json" \
  -d '{"reason": "问题已解决"}'
```

### 3. 使用装饰器

在代码中使用降级装饰器：

```typescript
import { 
  Degradable, 
  AnalyticsService, 
  RecommendationService,
  CoreService 
} from '@/common/decorators/degradable.decorator';

@Injectable()
export class ProductService {
  
  @CoreService()
  async getProduct(id: string) {
    // 核心服务，始终可用
    return this.productRepository.findById(id);
  }

  @AnalyticsService()
  async trackProductView(productId: string) {
    // 分析服务，轻度降级时禁用
    return this.analyticsService.track('product_view', { productId });
  }

  @RecommendationService([])
  async getRecommendations(userId: string) {
    // 推荐服务，降级时返回空数组
    return this.recommendationEngine.getRecommendations(userId);
  }

  @Degradable({
    serviceType: ServiceType.ENHANCEMENT,
    fallbackValue: { message: '功能暂时不可用' }
  })
  async getProductReviews(productId: string) {
    // 增强服务，重度降级时返回fallback值
    return this.reviewService.getReviews(productId);
  }
}
```

### 4. 检查服务可用性

```typescript
@Injectable()
export class SomeService {
  constructor(
    private readonly degradationService: DegradationService
  ) {}

  async someMethod() {
    // 检查推荐服务是否可用
    if (this.degradationService.isServiceAvailable(ServiceType.RECOMMENDATION)) {
      return this.getPersonalizedRecommendations();
    } else {
      return this.getDefaultRecommendations();
    }
  }
}
```

## API 接口

### 获取降级状态

```http
GET /api/degradation/status
```

响应：
```json
{
  "status": 200,
  "data": {
    "currentLevel": 1,
    "currentLevelName": "LIGHT",
    "activeStrategies": [
      {
        "serviceType": "analytics",
        "description": "禁用实时分析功能",
        "fallbackAction": "disable_real_time_analytics",
        "priority": 1
      }
    ],
    "recentHistory": [...],
    "timestamp": "2024-01-26T10:30:00.000Z"
  }
}
```

### 设置降级级别

```http
POST /api/degradation/level
Content-Type: application/json

{
  "level": 2,
  "reason": "预防性降级"
}
```

### 检查服务可用性

```http
GET /api/degradation/service/recommendation/availability
```

### 获取系统指标

```http
GET /api/degradation/metrics?limit=20
```

### 更新系统指标

```http
PUT /api/degradation/metrics
Content-Type: application/json

{
  "cpuUsage": 75,
  "memoryUsage": 80,
  "responseTime": 1200,
  "errorRate": 2.5
}
```

### 获取降级历史

```http
GET /api/degradation/history?limit=10
```

### 健康检查

```http
GET /api/degradation/health
```

## 监控和告警

### 关键指标

系统监控以下关键指标：

1. **系统资源**
   - CPU使用率
   - 内存使用率
   - 磁盘I/O

2. **应用性能**
   - 响应时间
   - 错误率
   - 活跃连接数
   - 队列长度

3. **降级状态**
   - 当前降级级别
   - 活跃策略数量
   - 降级持续时间

### Prometheus 指标

```prometheus
# 当前降级级别
degradation_current_level{instance="app-1"} 1

# 活跃策略数量
degradation_active_strategies{instance="app-1"} 2

# 服务可用性
degradation_service_available{service_type="recommendation",instance="app-1"} 0

# 降级触发次数
degradation_triggers_total{rule="high_cpu_usage",instance="app-1"} 5

# 系统指标
system_cpu_usage{instance="app-1"} 85.5
system_memory_usage{instance="app-1"} 78.2
system_response_time{instance="app-1"} 1250
system_error_rate{instance="app-1"} 3.2
```

### 告警规则

```yaml
groups:
  - name: degradation.rules
    rules:
      - alert: SystemDegraded
        expr: degradation_current_level > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "系统已进入降级状态"
          description: "当前降级级别: {{ $value }}"

      - alert: EmergencyDegradation
        expr: degradation_current_level >= 4
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "系统进入紧急降级状态"
          description: "系统仅保留核心功能"

      - alert: HighSystemLoad
        expr: system_cpu_usage > 90 or system_memory_usage > 95
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "系统负载过高"
          description: "CPU: {{ $labels.cpu }}%, Memory: {{ $labels.memory }}%"
```

## 配置选项

### 降级规则配置

```typescript
// 在 DegradationService 中配置规则
const rules: DegradationRule[] = [
  {
    id: 'high_cpu_usage',
    name: '高CPU使用率',
    condition: 'cpuUsage > 80',
    targetLevel: DegradationLevel.LIGHT,
    enabled: true,
    priority: 1,
    cooldownMs: 60000, // 1分钟冷却
  },
  // ... 更多规则
];
```

### 降级策略配置

```typescript
// 自定义降级策略
const strategies: DegradationStrategy[] = [
  {
    level: DegradationLevel.LIGHT,
    serviceType: ServiceType.ANALYTICS,
    enabled: true,
    fallbackAction: 'disable_real_time_analytics',
    description: '禁用实时分析功能',
    priority: 1,
  },
  // ... 更多策略
];
```

## 最佳实践

### 1. 服务设计

- **核心服务识别**: 明确哪些是核心业务功能
- **优雅降级**: 为非核心功能提供合理的降级方案
- **状态无关**: 降级逻辑应该是无状态的
- **快速恢复**: 设计快速恢复机制

### 2. 监控配置

- **合理阈值**: 根据业务特点设置合理的降级阈值
- **多维监控**: 监控多个维度的系统指标
- **及时告警**: 配置及时的告警通知
- **历史分析**: 定期分析降级历史数据

### 3. 测试验证

- **压力测试**: 定期进行压力测试验证降级效果
- **故障演练**: 模拟各种故障场景
- **恢复测试**: 验证自动恢复机制
- **用户体验**: 确保降级不影响核心用户体验

### 4. 运维管理

- **文档维护**: 保持降级策略文档的更新
- **团队培训**: 确保团队了解降级机制
- **应急预案**: 制定详细的应急处理预案
- **定期回顾**: 定期回顾和优化降级策略

## 故障排除

### 常见问题

1. **降级未触发**
   - 检查监控指标是否正确上报
   - 验证降级规则配置
   - 查看系统日志

2. **误触发降级**
   - 调整降级阈值
   - 增加冷却时间
   - 优化监控指标

3. **恢复缓慢**
   - 检查恢复条件设置
   - 验证系统指标稳定性
   - 调整恢复策略

4. **服务不可用**
   - 检查服务分类配置
   - 验证装饰器使用
   - 查看拦截器日志

### 调试工具

```bash
# 查看当前状态
curl http://localhost:3000/api/degradation/status

# 查看系统指标
curl http://localhost:3000/api/degradation/metrics

# 查看降级历史
curl http://localhost:3000/api/degradation/history

# 健康检查
curl http://localhost:3000/api/degradation/health
```

## 相关文档

- [分布式追踪系统](./DISTRIBUTED_TRACING.md)
- [审计日志系统](./AUDIT_LOGGING.md)
- [熔断器模式](./CIRCUIT_BREAKER.md)
- [系统监控](./MONITORING_ALERTING_SYSTEM.md)

## 支持

如有问题或建议，请联系：
- 技术支持: tech-support@company.com
- 文档反馈: docs@company.com