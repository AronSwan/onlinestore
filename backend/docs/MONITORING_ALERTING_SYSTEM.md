# 监控和告警系统

## 概述

本系统提供了全面的监控和告警功能，包括系统指标收集、应用性能监控、实时告警、多渠道通知等特性。

## 核心特性

### 🔍 监控功能
- **系统指标**: CPU、内存、磁盘、网络使用率
- **应用指标**: HTTP请求、响应时间、错误率、吞吐量
- **业务指标**: 订单、支付、用户注册等业务数据
- **自定义指标**: 支持自定义业务指标收集
- **健康检查**: 服务和依赖健康状态检查

### 🚨 告警功能
- **多级告警**: INFO、WARNING、ERROR、CRITICAL
- **智能规则**: 基于阈值、持续时间的告警规则
- **多渠道通知**: 邮件、Slack、Webhook、短信
- **告警抑制**: 防止告警风暴
- **自动恢复**: 告警自动解决通知

### 📊 集成支持
- **Prometheus**: 指标导出和存储
- **Grafana**: 可视化仪表板
- **Elasticsearch**: 日志聚合和搜索
- **Jaeger**: 分布式链路追踪

## 快速开始

### 1. 环境配置

复制环境配置文件：
```bash
cp .env.monitoring.example .env.monitoring
```

配置基本参数：
```env
# 启用监控
MONITORING_ENABLED=true
ALERTING_ENABLED=true

# Redis配置
MONITORING_REDIS_HOST=localhost
MONITORING_REDIS_PORT=6379

# 邮件告警
ALERT_EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_USER=alerts@yourcompany.com
SMTP_PASS=your_password
ALERT_EMAIL_TO=admin@yourcompany.com
```

### 2. 模块集成

在应用模块中导入：
```typescript
import { MonitoringModule } from './common/monitoring/monitoring.module';

@Module({
  imports: [
    MonitoringModule.forRoot({
      monitoring: {
        enabled: true,
        metricsInterval: 30,
        enableSystemMetrics: true,
        enableApplicationMetrics: true,
        prometheus: {
          enabled: true,
          endpoint: '/metrics',
          port: 9090
        }
      },
      alerting: {
        enabled: true,
        checkInterval: 60,
        defaultRules: true,
        notifications: {
          email: {
            enabled: true,
            smtp: {
              host: 'smtp.gmail.com',
              port: 587,
              auth: {
                user: 'alerts@yourcompany.com',
                pass: 'your_password'
              }
            },
            from: 'alerts@yourcompany.com',
            to: ['admin@yourcompany.com']
          },
          slack: {
            enabled: true,
            webhookUrl: 'https://hooks.slack.com/services/...',
            channel: '#alerts'
          }
        }
      }
    })
  ]
})
export class AppModule {}
```

### 3. 异步配置

```typescript
MonitoringModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    monitoring: {
      enabled: configService.get('MONITORING_ENABLED', true),
      metricsInterval: configService.get('MONITORING_METRICS_INTERVAL', 30),
      prometheus: {
        enabled: configService.get('PROMETHEUS_ENABLED', true),
        endpoint: configService.get('PROMETHEUS_ENDPOINT', '/metrics')
      }
    },
    alerting: {
      enabled: configService.get('ALERTING_ENABLED', true),
      checkInterval: configService.get('ALERTING_CHECK_INTERVAL', 60),
      notifications: {
        email: {
          enabled: configService.get('ALERT_EMAIL_ENABLED', false),
          smtp: {
            host: configService.get('SMTP_HOST'),
            port: configService.get('SMTP_PORT', 587),
            auth: {
              user: configService.get('SMTP_USER'),
              pass: configService.get('SMTP_PASS')
            }
          }
        }
      }
    }
  }),
  inject: [ConfigService]
})
```

## 使用指南

### 监控服务

#### 基本使用

```typescript
import { MonitoringService } from './common/monitoring/monitoring.service';

@Injectable()
export class UserService {
  constructor(private readonly monitoringService: MonitoringService) {}

  async createUser(userData: any) {
    // 记录业务指标
    this.monitoringService.incrementCounter('user_registrations_total', {
      source: 'web',
      plan: userData.plan
    });

    // 记录执行时间
    const timer = this.monitoringService.startTimer('user_creation_duration');
    
    try {
      const user = await this.userRepository.save(userData);
      
      // 记录成功
      this.monitoringService.incrementCounter('user_creation_success_total');
      
      return user;
    } catch (error) {
      // 记录错误
      this.monitoringService.incrementCounter('user_creation_error_total', {
        error_type: error.constructor.name
      });
      throw error;
    } finally {
      timer.end();
    }
  }
}
```

#### 自定义指标

```typescript
// 计数器
this.monitoringService.incrementCounter('api_requests_total', {
  method: 'GET',
  endpoint: '/users',
  status: '200'
});

// 直方图（响应时间）
this.monitoringService.observeHistogram('http_request_duration_seconds', 0.123, {
  method: 'POST',
  endpoint: '/orders'
});

// 仪表盘（当前值）
this.monitoringService.setGauge('active_connections', 42);

// 摘要（分位数）
this.monitoringService.observeSummary('request_size_bytes', 1024);
```

#### 健康检查

```typescript
// 添加健康检查
this.monitoringService.addHealthCheck('database', async () => {
  try {
    await this.dataSource.query('SELECT 1');
    return { status: 'healthy', details: 'Database connection OK' };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      details: `Database error: ${error.message}` 
    };
  }
});

// 获取健康状态
const health = await this.monitoringService.getHealthStatus();
console.log(health);
// {
//   status: 'healthy',
//   checks: {
//     database: { status: 'healthy', details: 'Database connection OK' },
//     redis: { status: 'healthy', details: 'Redis connection OK' }
//   }
// }
```

### 告警服务

#### 基本使用

```typescript
import { AlertingService } from './common/alerting/alerting.service';

@Injectable()
export class OrderService {
  constructor(private readonly alertingService: AlertingService) {}

  async processPayment(orderId: string) {
    try {
      await this.paymentGateway.charge(orderId);
    } catch (error) {
      // 触发告警检查
      await this.alertingService.checkAlerts({
        payment_failures: await this.getPaymentFailureCount(),
        error_rate: await this.getErrorRate()
      });
      
      throw error;
    }
  }
}
```

#### 自定义告警规则

```typescript
// 添加告警规则
this.alertingService.addRule({
  id: 'high_order_failure_rate',
  name: 'High Order Failure Rate',
  description: 'Order failure rate is above 5%',
  type: AlertType.BUSINESS,
  level: AlertLevel.ERROR,
  condition: 'order_failure_rate > threshold',
  threshold: 5,
  duration: 300, // 5分钟
  enabled: true,
  tags: ['business', 'orders'],
  actions: [
    { type: 'email', config: {}, enabled: true },
    { type: 'slack', config: {}, enabled: true }
  ]
});

// 更新规则
this.alertingService.updateRule('high_order_failure_rate', {
  threshold: 3,
  level: AlertLevel.WARNING
});

// 删除规则
this.alertingService.deleteRule('high_order_failure_rate');
```

#### 告警抑制

```typescript
// 抑制特定告警
this.alertingService.suppressAlert('alert_id_123');

// 获取活跃告警
const activeAlerts = this.alertingService.getActiveAlerts();

// 获取告警统计
const stats = this.alertingService.getStats();
console.log(stats);
// {
//   total: 150,
//   active: 3,
//   resolved: 145,
//   suppressed: 2,
//   byLevel: { warning: 100, error: 40, critical: 10 },
//   byType: { system: 80, application: 50, security: 20 }
// }
```

## 告警规则

### 默认规则

系统提供以下默认告警规则：

#### 系统告警
- **高CPU使用率**: CPU > 80%，持续5分钟
- **高内存使用率**: 内存 > 85%，持续5分钟
- **磁盘空间不足**: 磁盘使用率 > 90%，持续5分钟

#### 应用告警
- **高错误率**: HTTP错误率 > 5%，持续3分钟
- **慢响应**: 平均响应时间 > 1秒，持续5分钟
- **数据库连接**: 连接数 > 80%，持续3分钟

#### 安全告警
- **登录失败**: 失败次数 > 10次，持续1分钟
- **可疑IP**: 单IP请求 > 1000次/分钟
- **权限违规**: 未授权访问 > 5次，持续1分钟

#### 业务告警
- **订单失败**: 订单失败率 > 3%，持续5分钟
- **支付失败**: 支付失败率 > 2%，持续3分钟
- **用户注册异常**: 注册失败率 > 10%，持续5分钟

### 自定义规则格式

```typescript
interface AlertRule {
  id: string;                    // 唯一标识
  name: string;                  // 规则名称
  description: string;           // 描述
  type: AlertType;              // 类型：system/application/security/performance/business
  level: AlertLevel;            // 级别：info/warning/error/critical
  condition: string;            // 条件表达式
  threshold: number;            // 阈值
  duration: number;             // 持续时间（秒）
  enabled: boolean;             // 是否启用
  tags: string[];              // 标签
  actions: AlertAction[];       // 告警动作
}
```

## 通知渠道

### 邮件通知

```env
# 邮件配置
ALERT_EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=alerts@yourcompany.com
SMTP_PASS=your_app_password
ALERT_EMAIL_FROM=alerts@yourcompany.com
ALERT_EMAIL_TO=admin@yourcompany.com,devops@yourcompany.com
```

邮件模板支持变量：
- `{{title}}`: 告警标题
- `{{description}}`: 告警描述
- `{{level}}`: 告警级别
- `{{type}}`: 告警类型
- `{{value}}`: 当前值
- `{{threshold}}`: 阈值
- `{{timestamp}}`: 时间戳

### Slack通知

```env
# Slack配置
ALERT_SLACK_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SLACK_CHANNEL=#alerts
SLACK_USERNAME=AlertBot
SLACK_ICON=:warning:
```

Slack消息格式：
```json
{
  "channel": "#alerts",
  "username": "AlertBot",
  "icon_emoji": ":warning:",
  "attachments": [
    {
      "color": "danger",
      "title": "High CPU Usage",
      "text": "CPU usage is above threshold",
      "fields": [
        {"title": "Level", "value": "ERROR", "short": true},
        {"title": "Value", "value": "85%", "short": true}
      ]
    }
  ]
}
```

### Webhook通知

```env
# Webhook配置
ALERT_WEBHOOK_ENABLED=true
WEBHOOK_URL=https://your-webhook-endpoint.com/alerts
WEBHOOK_METHOD=POST
WEBHOOK_HEADERS={"Content-Type":"application/json","Authorization":"Bearer token"}
WEBHOOK_TIMEOUT=5000
```

Webhook负载：
```json
{
  "id": "alert_123",
  "title": "High CPU Usage",
  "description": "CPU usage is above threshold",
  "level": "error",
  "type": "system",
  "value": 85,
  "threshold": 80,
  "timestamp": "2024-01-26T10:30:00Z",
  "tags": ["system", "cpu"],
  "metadata": {
    "hostname": "web-server-01",
    "service": "api"
  }
}
```

### 短信通知

```env
# 短信配置
ALERT_SMS_ENABLED=true
SMS_PROVIDER=twilio
SMS_API_KEY=your_api_key
SMS_FROM=+1234567890
SMS_TO=+1234567890,+0987654321
```

## 监控指标

### HTTP指标

- `http_requests_total`: HTTP请求总数
- `http_request_duration_seconds`: HTTP请求持续时间
- `http_request_size_bytes`: HTTP请求大小
- `http_response_size_bytes`: HTTP响应大小

### 系统指标

- `system_cpu_usage_percent`: CPU使用率
- `system_memory_usage_percent`: 内存使用率
- `system_disk_usage_percent`: 磁盘使用率
- `system_network_bytes_total`: 网络流量

### 应用指标

- `app_active_connections`: 活跃连接数
- `app_database_connections`: 数据库连接数
- `app_cache_hit_rate`: 缓存命中率
- `app_queue_size`: 队列大小

### 业务指标

- `business_orders_total`: 订单总数
- `business_payments_total`: 支付总数
- `business_users_registered_total`: 用户注册总数
- `business_revenue_total`: 收入总额

## Prometheus集成

### 配置

```env
PROMETHEUS_ENABLED=true
PROMETHEUS_ENDPOINT=/metrics
PROMETHEUS_PORT=9090
PROMETHEUS_PUSH_GATEWAY=http://localhost:9091
```

### 指标导出

访问 `http://localhost:3000/metrics` 获取Prometheus格式的指标：

```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",endpoint="/users",status="200"} 1234

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="POST",endpoint="/orders",le="0.1"} 100
http_request_duration_seconds_bucket{method="POST",endpoint="/orders",le="0.5"} 200
http_request_duration_seconds_sum{method="POST",endpoint="/orders"} 45.67
http_request_duration_seconds_count{method="POST",endpoint="/orders"} 250
```

### Grafana仪表板

推荐的Grafana面板：

1. **系统概览**
   - CPU使用率时间序列
   - 内存使用率时间序列
   - 磁盘使用率仪表盘
   - 网络流量图表

2. **应用性能**
   - HTTP请求率
   - 响应时间分布
   - 错误率趋势
   - 吞吐量统计

3. **业务指标**
   - 订单趋势
   - 支付成功率
   - 用户注册趋势
   - 收入统计

## 最佳实践

### 指标设计

1. **命名规范**
   ```typescript
   // 好的命名
   'http_requests_total'
   'database_connections_active'
   'cache_hit_rate_percent'
   
   // 避免的命名
   'requests'
   'db_conn'
   'cache_hits'
   ```

2. **标签使用**
   ```typescript
   // 合理的标签
   this.monitoringService.incrementCounter('http_requests_total', {
     method: 'GET',
     endpoint: '/users',
     status: '200'
   });
   
   // 避免高基数标签
   // 不要使用用户ID、订单ID等作为标签
   ```

3. **指标类型选择**
   - **Counter**: 单调递增的计数（请求数、错误数）
   - **Gauge**: 可增可减的值（内存使用、连接数）
   - **Histogram**: 分布统计（响应时间、请求大小）
   - **Summary**: 分位数统计（延迟分位数）

### 告警策略

1. **告警级别**
   - **INFO**: 信息性告警，无需立即处理
   - **WARNING**: 需要关注，可能影响性能
   - **ERROR**: 需要处理，影响功能
   - **CRITICAL**: 紧急处理，服务中断

2. **阈值设置**
   ```typescript
   // 基于历史数据设置合理阈值
   const cpuThreshold = historicalAverage + 2 * standardDeviation;
   
   // 考虑业务特性
   const errorRateThreshold = businessCritical ? 1 : 5; // 百分比
   ```

3. **告警抑制**
   ```typescript
   // 避免告警风暴
   if (lastAlertTime && Date.now() - lastAlertTime < 300000) {
     return; // 5分钟内不重复告警
   }
   ```

### 性能优化

1. **批量处理**
   ```typescript
   // 批量发送指标
   const metrics = [];
   metrics.push({ name: 'counter1', value: 1 });
   metrics.push({ name: 'counter2', value: 2 });
   await this.monitoringService.sendBatch(metrics);
   ```

2. **异步处理**
   ```typescript
   // 异步发送告警
   this.alertingService.checkAlerts(metrics).catch(error => {
     this.logger.error('Failed to check alerts', error);
   });
   ```

3. **缓存策略**
   ```typescript
   // 缓存计算结果
   const cacheKey = `metrics:${endpoint}:${timeWindow}`;
   let result = await this.cache.get(cacheKey);
   if (!result) {
     result = await this.calculateMetrics(endpoint, timeWindow);
     await this.cache.set(cacheKey, result, 60); // 缓存1分钟
   }
   ```

## 故障排除

### 常见问题

1. **指标丢失**
   - 检查Redis连接
   - 验证指标名称格式
   - 确认服务启动顺序

2. **告警不触发**
   - 检查告警规则配置
   - 验证阈值设置
   - 确认通知渠道配置

3. **性能问题**
   - 减少指标频率
   - 启用批量处理
   - 优化标签使用

### 调试模式

```env
# 启用调试
DEBUG_MONITORING=true
DEBUG_ALERTS=true
VERBOSE_LOGGING=true
```

### 日志分析

```bash
# 查看监控日志
tail -f logs/monitoring.log

# 过滤告警日志
grep "Alert triggered" logs/monitoring.log

# 分析性能指标
grep "metrics collected" logs/monitoring.log | tail -100
```

## API参考

### MonitoringService

```typescript
class MonitoringService {
  // 计数器
  incrementCounter(name: string, labels?: Record<string, string>, value?: number): void
  
  // 仪表盘
  setGauge(name: string, value: number, labels?: Record<string, string>): void
  
  // 直方图
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void
  
  // 摘要
  observeSummary(name: string, value: number, labels?: Record<string, string>): void
  
  // 计时器
  startTimer(name: string, labels?: Record<string, string>): Timer
  
  // 健康检查
  addHealthCheck(name: string, check: HealthCheckFunction): void
  getHealthStatus(): Promise<HealthStatus>
  
  // 指标获取
  getMetrics(): Promise<Metric[]>
  getPrometheusMetrics(): Promise<string>
  
  // 统计信息
  getStats(): Promise<any>
}
```

### AlertingService

```typescript
class AlertingService {
  // 告警检查
  checkAlerts(metrics: Record<string, number>): Promise<void>
  
  // 规则管理
  addRule(rule: AlertRule): void
  updateRule(ruleId: string, updates: Partial<AlertRule>): void
  deleteRule(ruleId: string): void
  
  // 告警管理
  getActiveAlerts(): AlertEvent[]
  suppressAlert(alertId: string): void
  
  // 统计信息
  getStats(): AlertStats
}
```

## 扩展开发

### 自定义指标收集器

```typescript
@Injectable()
export class CustomMetricsCollector {
  constructor(private readonly monitoringService: MonitoringService) {}
  
  @Cron(CronExpression.EVERY_MINUTE)
  async collectBusinessMetrics() {
    // 收集订单指标
    const orderCount = await this.orderService.getOrderCount();
    this.monitoringService.setGauge('business_orders_pending', orderCount);
    
    // 收集用户指标
    const activeUsers = await this.userService.getActiveUserCount();
    this.monitoringService.setGauge('business_users_active', activeUsers);
  }
}
```

### 自定义告警规则

```typescript
@Injectable()
export class CustomAlertRules {
  constructor(private readonly alertingService: AlertingService) {}
  
  onModuleInit() {
    // 添加业务告警规则
    this.alertingService.addRule({
      id: 'low_inventory',
      name: 'Low Inventory Alert',
      description: 'Product inventory is below minimum threshold',
      type: AlertType.BUSINESS,
      level: AlertLevel.WARNING,
      condition: 'inventory_count < threshold',
      threshold: 10,
      duration: 300,
      enabled: true,
      tags: ['business', 'inventory'],
      actions: [
        { type: 'email', config: {}, enabled: true }
      ]
    });
  }
}
```

### 自定义通知渠道

```typescript
@Injectable()
export class CustomNotificationChannel {
  async sendNotification(alert: AlertEvent) {
    // 实现自定义通知逻辑
    // 例如：企业微信、钉钉、Teams等
    
    const message = {
      title: alert.title,
      content: alert.description,
      level: alert.level,
      timestamp: alert.timestamp
    };
    
    await this.sendToCustomChannel(message);
  }
}
```

通过这个监控和告警系统，您可以全面监控应用的健康状态，及时发现和处理问题，确保系统的稳定运行。