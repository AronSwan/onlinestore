# 安全监控系统使用指南

## 概述

安全监控系统是一个实时监控和管理安全漏洞的综合解决方案，它从结构化的漏洞数据文件中获取信息，并通过Web仪表板提供直观的可视化界面。

## 系统架构

### 后端组件

1. **SecurityMonitoringService** (`src/common/monitoring/security-monitoring.service.ts`)
   - 负责从漏洞数据文件读取和处理漏洞信息
   - 提供缓存机制以提高性能
   - 定时刷新数据以确保信息及时更新

2. **SecurityMonitoringController** (`src/common/monitoring/security-monitoring.controller.ts`)
   - 提供RESTful API接口
   - 支持获取统计数据、趋势数据、热力图数据等
   - 支持更新漏洞状态和导出报告

3. **SecurityMonitoringModule** (`src/common/monitoring/security-monitoring.module.ts`)
   - 组织服务和控制器
   - 管理依赖关系

### 前端组件

1. **安全仪表板** (`docs/security-dashboard.html`)
   - 提供交互式可视化界面
   - 实时显示漏洞统计、趋势和分布
   - 支持漏洞状态更新和报告导出

### 数据源

1. **漏洞数据文件** (`data/security-vulnerabilities.json`)
   - 结构化存储漏洞信息
   - 包含漏洞详情、状态、负责人等信息
   - 支持手动更新和自动化更新

## API接口

### 获取仪表板数据

```
GET /api/security/dashboard
```

返回完整的仪表板数据，包括统计信息、趋势数据、热力图数据和漏洞列表。

### 获取漏洞统计

```
GET /api/security/stats
```

返回按严重度和状态分类的漏洞统计信息。

### 获取漏洞趋势

```
GET /api/security/trend?days=30
```

返回指定天数内的漏洞趋势数据。

### 获取系统风险热力图

```
GET /api/security/heatmap
```

返回各系统的风险分布数据，用于生成热力图。

### 更新漏洞状态

```
GET /api/security/update-status?id=VULN-001&status=已完成
```

更新指定漏洞的状态。

### 导出安全报告

```
GET /api/security/export
```

导出完整的安全报告为JSON文件。

### 健康检查

```
GET /api/security/health
```

检查安全监控系统的运行状态。

## 数据格式

### 漏洞数据结构

```json
{
  "id": "VULN-001",
  "title": "漏洞标题",
  "ruleId": "规则ID",
  "cvss": 7.5,
  "severity": "高",
  "status": "待修复",
  "owner": "负责人",
  "firstFound": "2025-10-02",
  "slaThreshold": "72小时",
  "escalationStatus": "正常",
  "targetDate": "2025-10-05",
  "relatedCommit": "#PR123",
  "relatedTicket": "#TICKET456",
  "priority": "高",
  "businessImpact": "业务影响描述",
  "falsePositive": false,
  "evidenceLinks": [
    {
      "type": "日志",
      "url": "logs/jwt.log",
      "description": "认证日志"
    }
  ]
}
```

## 使用流程

### 1. 更新漏洞数据

1. 手动编辑 `data/security-vulnerabilities.json` 文件
2. 或通过安全扫描工具自动更新文件
3. 系统会自动检测文件变化并更新缓存

### 2. 查看仪表板

1. 打开 `docs/security-dashboard.html` 文件
2. 仪表板会自动从后端API获取最新数据
3. 可以查看漏洞统计、趋势图表和热力图

### 3. 管理漏洞状态

1. 在仪表板中点击漏洞详情
2. 可以查看漏洞的完整信息
3. 通过API更新漏洞状态（需要后端支持）

### 4. 导出报告

1. 点击仪表板中的"导出报告"按钮
2. 系统会生成包含所有漏洞信息的JSON报告
3. 报告可用于审计和存档

## 配置选项

### 环境变量

- `SECURITY_MONITORING_ENABLED`: 启用/禁用安全监控（默认: true）
- `SECURITY_VULNERABILITIES_PATH`: 漏洞数据文件路径（默认: data/security-vulnerabilities.json）
- `SECURITY_CACHE_PREFIX`: 缓存键前缀（默认: security:）
- `SECURITY_CACHE_TTL`: 缓存生存时间，秒（默认: 300）
- `SECURITY_REFRESH_INTERVAL`: 数据刷新间隔，秒（默认: 60）
- `SECURITY_TREND_DAYS`: 趋势分析天数（默认: 30）

### 缓存配置

系统使用Redis缓存来提高性能，缓存配置通过 `RedisCacheService` 管理。

## 集成指南

### 1. 添加到应用模块

```typescript
import { SecurityMonitoringModule } from './common/monitoring/security-monitoring.module';

@Module({
  imports: [
    // ...其他模块
    SecurityMonitoringModule
  ],
  // ...
})
export class AppModule {}
```

### 2. 配置环境变量

在 `.env` 文件中添加相关配置：

```
SECURITY_MONITORING_ENABLED=true
SECURITY_VULNERABILITIES_PATH=data/security-vulnerabilities.json
SECURITY_CACHE_TTL=300
```

### 3. 确保漏洞数据文件存在

确保 `data/security-vulnerabilities.json` 文件存在且格式正确。

## 故障排除

### 常见问题

1. **仪表板显示"无法获取安全数据"**
   - 检查后端服务是否正常运行
   - 确认API端点是否可访问
   - 检查漏洞数据文件是否存在

2. **数据更新不及时**
   - 检查缓存TTL设置
   - 确认文件权限是否正确
   - 查看后端日志是否有错误

3. **图表显示异常**
   - 检查数据格式是否正确
   - 确认浏览器控制台是否有JavaScript错误
   - 验证Chart.js和D3.js库是否正确加载

### 日志查看

查看后端日志以获取详细错误信息：

```bash
# 如果使用Docker
docker logs <container_name>

# 如果直接运行
npm run start:dev
```

## 性能优化

1. **缓存策略**
   - 合理设置缓存TTL
   - 使用Redis集群提高可用性

2. **数据更新**
   - 避免频繁更新漏洞数据文件
   - 使用批量更新操作

3. **前端优化**
   - 启用浏览器缓存
   - 使用CDN加载外部库

## 安全考虑

1. **访问控制**
   - 实施适当的身份验证和授权
   - 限制API访问频率

2. **数据保护**
   - 敏感信息脱敏处理
   - 使用HTTPS传输数据

3. **审计日志**
   - 记录所有数据访问和修改操作
   - 定期审查日志

## 扩展功能

### 可能的增强

1. **实时通知**
   - 漏洞状态变更时发送通知
   - 集成邮件或Slack通知

2. **自动化修复**
   - 集成CI/CD流程
   - 自动创建修复任务

3. **高级分析**
   - 漏洞修复时间预测
   - 风险评估模型

4. **多租户支持**
   - 支持多个项目或团队
   - 数据隔离和权限管理

## 联系方式

如有问题或建议，请联系安全团队：
- 邮箱: security@example.com
- 内部工单系统: #security-team