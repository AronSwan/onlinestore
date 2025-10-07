# 🔍 审计日志系统 (Audit Logging System)

## 📋 概述

审计日志系统是一个全面的企业级审计解决方案，用于记录、监控和分析系统中的所有关键操作。该系统提供完整的审计链，支持合规性要求，并具备强大的安全监控能力。

## 🚀 快速开始

### 1. 环境配置

复制配置文件模板：
```bash
cp .env.audit.example .env.audit
```

编辑配置文件，根据需要调整设置：
```bash
# 基础配置
AUDIT_ENABLED=true
AUDIT_LOG_LEVEL=medium
AUDIT_RETENTION_DAYS=90

# 风险评估
AUDIT_RISK_ASSESSMENT=true
AUDIT_HIGH_RISK_THRESHOLD=8
```

### 2. 数据库迁移

审计日志实体会自动创建表结构（开发环境下）：
```sql
-- 审计日志表结构
CREATE TABLE audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  result ENUM('SUCCESS', 'FAILURE', 'PARTIAL') NOT NULL,
  severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
  description TEXT,
  -- 用户信息
  user_id VARCHAR(36),
  user_email VARCHAR(255),
  user_role VARCHAR(50),
  -- 请求信息
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_id VARCHAR(36),
  trace_id VARCHAR(32),
  session_id VARCHAR(36),
  -- 业务信息
  resource_type VARCHAR(50),
  resource_id VARCHAR(36),
  old_values JSON,
  new_values JSON,
  metadata JSON,
  -- 技术信息
  endpoint VARCHAR(255),
  http_method VARCHAR(10),
  response_code INT,
  execution_time_ms INT,
  error_message TEXT,
  error_stack TEXT,
  -- 地理信息
  country VARCHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),
  -- 风险评估
  risk_score INT DEFAULT 0,
  is_suspicious BOOLEAN DEFAULT FALSE,
  is_high_risk BOOLEAN DEFAULT FALSE,
  -- 时间戳
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- 数据保留
  retention_date DATE,
  -- 关联信息
  correlation_id VARCHAR(36),
  parent_audit_id VARCHAR(36)
);
```

### 3. 启动应用

审计模块会自动集成到应用中，无需额外配置。

## 📖 使用方法

### 自动审计

系统会自动记录以下操作：

1. **HTTP 请求**：通过 `AuditInterceptor` 自动记录所有 HTTP 请求
2. **用户操作**：登录、注册、密码修改等
3. **业务操作**：订单创建、支付处理、产品管理等
4. **管理操作**：用户管理、权限变更、系统配置等
5. **安全事件**：登录失败、权限拒绝、可疑活动等

### 手动审计

在业务代码中手动记录审计日志：

```typescript
import { AuditService, AuditAction, AuditResult, AuditSeverity } from '@/common/audit/audit.service';

@Injectable()
export class OrderService {
  constructor(private readonly auditService: AuditService) {}

  async createOrder(orderData: CreateOrderDto, user: User, request: Request) {
    try {
      // 创建订单
      const order = await this.orderRepository.save(orderData);

      // 记录审计日志
      await this.auditService.log(
        AuditAction.ORDER_CREATE,
        AuditResult.SUCCESS,
        {
          userId: user.id,
          userEmail: user.email,
          userRole: user.role,
          ipAddress: request.ip,
          userAgent: request.get('User-Agent'),
          resourceType: 'order',
          resourceId: order.id,
          newValues: order,
          metadata: {
            orderAmount: order.totalAmount,
            paymentMethod: order.paymentMethod,
          },
        },
        `订单创建成功: ${order.id}`,
        AuditSeverity.MEDIUM,
      );

      return order;
    } catch (error) {
      // 记录失败日志
      await this.auditService.log(
        AuditAction.ORDER_CREATE,
        AuditResult.FAILURE,
        {
          userId: user.id,
          userEmail: user.email,
          ipAddress: request.ip,
          errorMessage: error.message,
        },
        `订单创建失败: ${error.message}`,
        AuditSeverity.HIGH,
      );
      throw error;
    }
  }
}
```

### 使用装饰器

使用 `@Audit` 装饰器自动记录方法调用：

```typescript
import { Audit } from '@/common/audit/decorators/audit.decorator';

@Injectable()
export class UserService {
  @Audit({
    action: AuditAction.USER_UPDATE,
    resourceType: 'user',
    severity: AuditSeverity.MEDIUM,
  })
  async updateUser(userId: string, updateData: UpdateUserDto) {
    // 方法实现
    return this.userRepository.update(userId, updateData);
  }
}
```

## 🔍 查询和分析

### API 端点

#### 1. 查询审计日志
```http
GET /audit/logs?userId=123&module=order&startTime=2024-01-01&endTime=2024-01-31&page=1&limit=20
```

#### 2. 高级查询
```http
POST /audit/logs/search
Content-Type: application/json

{
  "action": ["ORDER_CREATE", "ORDER_UPDATE"],
  "result": "SUCCESS",
  "severity": ["MEDIUM", "HIGH"],
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z",
  "userId": "user-123",
  "ipAddress": "192.168.1.100",
  "isHighRisk": false,
  "limit": 100
}
```

#### 3. 获取统计信息
```http
GET /audit/statistics?startDate=2024-01-01&endDate=2024-01-31
```

响应示例：
```json
{
  "totalLogs": 15420,
  "actionCounts": {
    "USER_LOGIN": 3240,
    "ORDER_CREATE": 1850,
    "PRODUCT_VIEW": 8920,
    "PAYMENT_PROCESS": 1410
  },
  "resultCounts": {
    "SUCCESS": 14890,
    "FAILURE": 480,
    "PARTIAL": 50
  },
  "severityCounts": {
    "LOW": 8920,
    "MEDIUM": 5100,
    "HIGH": 1200,
    "CRITICAL": 200
  },
  "topUsers": [
    { "userId": "user-123", "count": 245 },
    { "userId": "user-456", "count": 189 }
  ],
  "topIps": [
    { "ip": "192.168.1.100", "count": 156 },
    { "ip": "10.0.0.50", "count": 134 }
  ],
  "suspiciousActivities": 23,
  "highRiskActivities": 8,
  "recentTrends": [
    { "date": "2024-01-30", "count": 520 },
    { "date": "2024-01-31", "count": 485 }
  ]
}
```

#### 4. 获取用户活动统计
```http
GET /audit/users/user-123/activity?days=30
```

#### 5. 获取安全事件统计
```http
GET /audit/security/events?days=7
```

#### 6. 获取审计概览
```http
GET /audit/overview
```

#### 7. 获取健康状态
```http
GET /audit/health
```

### 数据分析

#### 性能分析
```typescript
// 查询慢操作
const slowOperations = await auditService.findLogsAdvanced({
  executionTimeMs: { $gte: 5000 }, // 超过 5 秒的操作
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 最近 24 小时
  limit: 100,
});
```

#### 错误分析
```typescript
// 查询错误操作
const errorOperations = await auditService.findLogsAdvanced({
  result: AuditResult.FAILURE,
  severity: [AuditSeverity.HIGH, AuditSeverity.CRITICAL],
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 最近 7 天
});
```

#### 安全分析
```typescript
// 查询可疑活动
const suspiciousActivities = await auditService.findLogsAdvanced({
  isSuspicious: true,
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
});

// 查询高风险活动
const highRiskActivities = await auditService.findLogsAdvanced({
  isHighRisk: true,
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
});
```

## 🛡️ 安全特性

### 风险评估

系统会自动评估每个操作的风险等级：

1. **低风险 (0-3)**：常规操作，如查看产品、浏览页面
2. **中风险 (4-6)**：业务操作，如下单、修改资料
3. **高风险 (7-8)**：敏感操作，如支付、删除数据
4. **极高风险 (9-10)**：管理操作，如权限变更、系统配置

### 可疑活动检测

系统会自动检测以下可疑活动：

- 短时间内大量失败登录
- 异常地理位置访问
- 非工作时间的管理操作
- 大量数据导出
- 异常的 API 调用模式

### 高风险活动处理

当检测到高风险活动时，系统会：

1. 自动标记为高风险
2. 发送实时通知
3. 记录详细上下文
4. 触发额外的安全检查

## 📊 监控和告警

### 关键指标

- **审计日志总量**：系统活跃度指标
- **错误率**：系统健康度指标
- **可疑活动数量**：安全风险指标
- **高风险活动数量**：严重安全事件指标
- **平均响应时间**：性能指标

### Prometheus 指标

```prometheus
# 审计日志总数
audit_logs_total{action="ORDER_CREATE",result="SUCCESS"} 1234

# 审计日志错误率
audit_logs_error_rate{module="payment"} 0.05

# 可疑活动数量
audit_suspicious_activities_total 23

# 高风险活动数量
audit_high_risk_activities_total 8

# 审计日志处理延迟
audit_log_processing_duration_seconds{quantile="0.95"} 0.1
```

### 告警规则

```yaml
groups:
  - name: audit_alerts
    rules:
      - alert: HighAuditErrorRate
        expr: audit_logs_error_rate > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "审计日志错误率过高"
          description: "审计日志错误率超过 10%，当前值: {{ $value }}"

      - alert: SuspiciousActivitySpike
        expr: increase(audit_suspicious_activities_total[1h]) > 50
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "可疑活动激增"
          description: "过去 1 小时内可疑活动增加了 {{ $value }} 次"

      - alert: HighRiskActivity
        expr: increase(audit_high_risk_activities_total[5m]) > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "检测到高风险活动"
          description: "过去 5 分钟内检测到 {{ $value }} 次高风险活动"
```

## 🔧 配置选项

### 基础配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `AUDIT_ENABLED` | `true` | 是否启用审计日志 |
| `AUDIT_LOG_LEVEL` | `medium` | 审计日志级别 |
| `AUDIT_RETENTION_DAYS` | `90` | 日志保留天数 |
| `AUDIT_CLEANUP_INTERVAL_HOURS` | `24` | 清理间隔（小时） |

### 风险评估配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `AUDIT_RISK_ASSESSMENT` | `true` | 是否启用风险评估 |
| `AUDIT_HIGH_RISK_THRESHOLD` | `8` | 高风险阈值 |
| `AUDIT_SUSPICIOUS_DETECTION` | `true` | 是否启用可疑活动检测 |
| `AUDIT_GEO_LOCATION` | `true` | 是否启用地理位置检测 |

### 性能配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `AUDIT_BATCH_SIZE` | `100` | 批量写入大小 |
| `AUDIT_WRITE_INTERVAL_MS` | `5000` | 写入间隔（毫秒） |
| `AUDIT_ASYNC_PROCESSING` | `true` | 是否异步处理 |
| `AUDIT_CACHE_SIZE` | `1000` | 缓存大小 |

## 🔄 数据管理

### 数据保留策略

1. **自动清理**：系统会定期清理过期的审计日志
2. **归档策略**：重要日志可以归档到长期存储
3. **压缩存储**：历史数据可以压缩存储以节省空间

### 数据导出

支持多种格式的数据导出：

```typescript
// 导出为 JSON
const jsonData = await auditService.exportLogs({
  format: 'json',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
});

// 导出为 CSV
const csvData = await auditService.exportLogs({
  format: 'csv',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
});
```

### 数据备份

```bash
# 备份审计日志表
mysqldump -u username -p database_name audit_logs > audit_logs_backup.sql

# 恢复审计日志表
mysql -u username -p database_name < audit_logs_backup.sql
```

## 🧪 测试

### 单元测试

```typescript
describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AuditService],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should create audit log', async () => {
    const auditLog = await service.log(
      AuditAction.USER_LOGIN,
      AuditResult.SUCCESS,
      { userId: 'test-user' },
      'Test login',
      AuditSeverity.LOW,
    );

    expect(auditLog).toBeDefined();
    expect(auditLog.action).toBe(AuditAction.USER_LOGIN);
  });
});
```

### 集成测试

```typescript
describe('Audit Integration', () => {
  it('should automatically log HTTP requests', async () => {
    const response = await request(app.getHttpServer())
      .post('/orders')
      .send({ productId: '123', quantity: 1 })
      .expect(201);

    // 验证审计日志是否创建
    const auditLogs = await auditService.findLogs({
      action: AuditAction.ORDER_CREATE,
      limit: 1,
    });

    expect(auditLogs.length).toBe(1);
  });
});
```

### 性能测试

```typescript
describe('Audit Performance', () => {
  it('should handle high volume logging', async () => {
    const startTime = Date.now();
    
    const promises = Array.from({ length: 1000 }, (_, i) =>
      auditService.log(
        AuditAction.PRODUCT_VIEW,
        AuditResult.SUCCESS,
        { userId: `user-${i}` },
        `Product view ${i}`,
        AuditSeverity.LOW,
      )
    );

    await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(5000); // 应在 5 秒内完成
  });
});
```

## 🚨 故障排除

### 常见问题

#### 1. 审计日志未记录

**可能原因**：
- 审计功能未启用
- 拦截器未正确配置
- 数据库连接问题

**解决方案**：
```bash
# 检查配置
echo $AUDIT_ENABLED

# 检查数据库连接
npm run typeorm:show

# 检查日志
tail -f logs/application.log | grep audit
```

#### 2. 性能问题

**可能原因**：
- 批量写入配置不当
- 数据库索引缺失
- 同步处理导致阻塞

**解决方案**：
```sql
-- 添加索引
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_create_time ON audit_logs(create_time);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

#### 3. 存储空间不足

**解决方案**：
```bash
# 手动清理过期日志
curl -X POST http://localhost:3000/audit/cleanup?days=30

# 压缩历史数据
mysqldump --single-transaction --routines --triggers database_name audit_logs | gzip > audit_logs_archive.sql.gz
```

### 调试模式

启用调试模式获取详细日志：

```bash
export AUDIT_DEBUG_MODE=true
export LOG_LEVEL=debug
```

## 📈 最佳实践

### 1. 审计策略

- **关键操作必审**：所有涉及数据变更的操作
- **安全事件必审**：登录、权限变更、敏感数据访问
- **性能平衡**：避免过度审计影响性能

### 2. 数据分类

- **敏感数据**：用户密码、支付信息等不记录明文
- **业务数据**：订单、产品等记录关键字段
- **系统数据**：配置、日志等记录变更内容

### 3. 存储优化

- **分区表**：按时间分区提高查询性能
- **索引优化**：为常用查询字段建立索引
- **数据压缩**：历史数据压缩存储

### 4. 安全考虑

- **访问控制**：限制审计日志的访问权限
- **数据完整性**：防止审计日志被篡改
- **备份策略**：定期备份审计数据

## 🔗 相关文档

- [分布式追踪系统](./DISTRIBUTED_TRACING.md)
- [错误处理系统](./ERROR_HANDLING.md)
- [安全模块文档](./improvement\MODERN_SECURITY_EXAMPLES.md)
- [日志系统文档](./AUDIT_LOGGING.md)

## 📞 支持

如有问题或建议，请联系：
- 技术支持：tech-support@example.com
- 安全团队：security@example.com
- 开发团队：dev-team@example.com