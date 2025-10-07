---
title: "健康检查系统文档"
description: "提供全面的应用程序和依赖服务健康监控功能，支持多种检查类型、实时监控、告警通知和Prometheus指标集成"
owner: "Backend Team <backend@company.com>"
lastUpdated: "2025-01-26"
version: "2.1.0"
status: "active"
category: "monitoring"
tags: ["health-check", "monitoring", "kubernetes", "prometheus", "alerting"]
audience: ["developer", "ops"]
priority: "high"
reviewCycle: "monthly"
---

# 健康检查系统文档

## 概述

健康检查系统提供了全面的应用程序和依赖服务健康监控功能，支持多种检查类型、实时监控、告警通知和Prometheus指标集成。

## 核心特性

### 1. 多类型健康检查
- **存活检查 (Liveness)**: 检查应用程序是否正在运行
- **就绪检查 (Readiness)**: 检查应用程序是否准备好接收流量
- **启动检查 (Startup)**: 检查应用程序是否已完成启动
- **依赖检查 (Dependency)**: 检查外部依赖服务的健康状态
- **自定义检查 (Custom)**: 支持自定义业务逻辑检查

### 2. 依赖服务监控
- **数据库连接**: 检查数据库连接状态和查询性能
- **Redis缓存**: 检查Redis连接、内存使用和读写性能
- **外部API**: 检查外部API的可用性和响应时间
- **消息队列**: 检查消息队列连接和队列状态
- **文件系统**: 检查文件系统访问权限和磁盘空间

### 3. 监控和告警
- **实时监控**: 定期执行健康检查并收集指标
- **Prometheus集成**: 导出标准Prometheus指标
- **多渠道告警**: 支持Webhook、邮件、Slack等告警方式
- **告警阈值**: 可配置的告警触发条件

## 快速开始

### 1. 环境配置

创建 `.env` 文件并配置健康检查相关环境变量：

```bash
# 健康检查基础配置
HEALTH_CHECK_INTERVAL=30000
HEALTH_SYSTEM_CHECK_INTERVAL=60000
HEALTH_ENABLE_FILE_WATCHER=true

# 监控配置
HEALTH_MONITORING_ENABLED=true
HEALTH_METRICS_ENDPOINT=/metrics
HEALTH_ALERT_WEBHOOK=https://your-webhook-url.com/alerts

# 数据库健康检查
HEALTH_DB_CHECK_ENABLED=true
HEALTH_DB_TIMEOUT=5000
HEALTH_DB_QUERY=SELECT 1

# Redis健康检查
HEALTH_REDIS_CHECK_ENABLED=true
HEALTH_REDIS_TIMEOUT=3000
HEALTH_REDIS_MEMORY_THRESHOLD=0.8

# 外部API健康检查
HEALTH_EXTERNAL_APIS=[{"name":"payment-api","url":"https://api.payment.com/health","method":"GET","timeout":5000,"expectedStatus":[200],"critical":true}]

# 告警配置
HEALTH_ALERTS_ENABLED=true
HEALTH_CRITICAL_FAILURES_THRESHOLD=3
HEALTH_CONSECUTIVE_FAILURES_THRESHOLD=5
HEALTH_RESPONSE_TIME_THRESHOLD=5000

# 邮件告警配置
HEALTH_EMAIL_ALERTS_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
HEALTH_EMAIL_FROM=health@yourapp.com
HEALTH_EMAIL_TO=admin@yourapp.com,ops@yourapp.com

# Slack告警配置
HEALTH_SLACK_ALERTS_ENABLED=false
HEALTH_SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
HEALTH_SLACK_CHANNEL=#alerts
```

### 2. 模块集成

在主应用模块中集成健康检查模块：

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HealthModule, HealthConfigFactory } from './common/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // 同步配置
    HealthModule.forRoot({
      global: true,
      enableController: true,
      enableDependencyCheckers: true,
      config: HealthConfigFactory.createDefaultConfig(),
    }),
    
    // 或异步配置
    HealthModule.forRootAsync({
      global: true,
      enableController: true,
      enableDependencyCheckers: true,
      useFactory: (configService: ConfigService) => 
        HealthConfigFactory.createFromEnvironment(configService),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### 3. 基本使用

健康检查模块会自动注册以下端点：

```bash
# 综合健康检查
GET /health

# Kubernetes探针端点
GET /health/liveness    # 存活检查
GET /health/readiness   # 就绪检查
GET /health/startup     # 启动检查

# 依赖服务检查
GET /health/dependencies

# 特定类型检查
GET /health/type/liveness
GET /health/type/readiness
GET /health/type/dependency

# 执行特定检查
POST /health/check/database
POST /health/check/redis

# 监控和统计
GET /health/stats
GET /health/debug

# Prometheus指标
GET /metrics
```

## 使用指南

### 1. HealthCheckService

健康检查服务是核心组件，提供了健康检查的主要功能：

```typescript
import { Injectable } from '@nestjs/common';
import { HealthCheckService, HealthCheckType, HealthStatus } from './common/health/health-check.service';

@Injectable()
export class MyService {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  async checkApplicationHealth() {
    // 获取系统整体健康状态
    const systemHealth = await this.healthCheckService.getSystemHealth();
    console.log('System Status:', systemHealth.status);
    
    // 获取特定类型的健康检查结果
    const livenessChecks = await this.healthCheckService.getHealthByType(HealthCheckType.LIVENESS);
    
    // 执行特定的健康检查
    const dbCheck = await this.healthCheckService.executeCheck('database');
    
    // 获取健康检查统计
    const stats = this.healthCheckService.getHealthStats();
    
    return {
      systemHealth,
      livenessChecks,
      dbCheck,
      stats,
    };
  }

  // 注册自定义健康检查器
  registerCustomChecker() {
    this.healthCheckService.registerChecker({
      name: 'custom-business-logic',
      type: HealthCheckType.CUSTOM,
      severity: 'medium',
      timeout: 5000,
      enabled: true,
      check: async () => {
        // 自定义检查逻辑
        const isHealthy = await this.checkBusinessLogic();
        
        return {
          name: 'custom-business-logic',
          type: HealthCheckType.CUSTOM,
          status: isHealthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
          message: isHealthy ? 'Business logic is working' : 'Business logic failed',
          timestamp: new Date(),
          responseTime: 100,
          severity: 'medium',
          metadata: {
            customData: 'some-value',
          },
        };
      },
    });
  }

  private async checkBusinessLogic(): Promise<boolean> {
    // 实现你的业务逻辑检查
    return true;
  }
}
```

### 2. DependencyCheckersService

依赖检查服务提供了常见依赖服务的健康检查：

```typescript
import { Injectable } from '@nestjs/common';
import { DependencyCheckersService } from './common/health/dependency-checkers.service';

@Injectable()
export class MyService {
  constructor(private readonly dependencyCheckersService: DependencyCheckersService) {}

  async setupDependencyChecks() {
    // 添加外部API检查器
    this.dependencyCheckersService.addExternalApiChecker({
      name: 'payment-gateway',
      url: 'https://api.payment.com/health',
      method: 'GET',
      timeout: 5000,
      expectedStatus: [200, 201],
      headers: {
        'Authorization': 'Bearer token',
        'Content-Type': 'application/json',
      },
      critical: true,
    });

    // 获取所有依赖状态
    const dependencyStatus = await this.dependencyCheckersService.getDependencyStatus();
    
    return dependencyStatus;
  }

  async removeDependencyChecker() {
    // 移除外部API检查器
    this.dependencyCheckersService.removeExternalApiChecker('payment-gateway');
  }
}
```

### 3. HealthMonitoringService

监控服务提供了指标收集和告警功能：

```typescript
import { Injectable } from '@nestjs/common';
import { HealthMonitoringService } from './common/health/monitoring.service';

@Injectable()
export class MyService {
  constructor(private readonly monitoringService: HealthMonitoringService) {}

  async getMonitoringData() {
    // 获取Prometheus指标
    const prometheusMetrics = this.monitoringService.getPrometheusMetrics();
    
    // 获取监控统计
    const stats = this.monitoringService.getMonitoringStats();
    
    // 获取告警历史
    const alertHistory = this.monitoringService.getAlertHistory();
    
    // 获取特定检查器的告警历史
    const dbAlerts = this.monitoringService.getAlertHistory('database');
    
    // 获取失败计数
    const failureCount = this.monitoringService.getFailureCount('redis');
    
    return {
      prometheusMetrics,
      stats,
      alertHistory,
      dbAlerts,
      failureCount,
    };
  }

  async resetMonitoring() {
    // 重置失败计数
    this.monitoringService.resetFailureCount('database');
    
    // 重置所有失败计数
    this.monitoringService.resetFailureCount();
  }
}
```

## 配置详解

### 1. 健康检查配置

```typescript
// 健康检查模块配置
const healthConfig = {
  checkInterval: 30000,              // 检查间隔（毫秒）
  systemCheckInterval: 60000,        // 系统检查间隔（毫秒）
  enableFileWatcher: true,           // 启用文件监控
  
  monitoring: {
    enabled: true,                   // 启用监控
    metricsEndpoint: '/metrics',     // 指标端点
    alertWebhook: 'webhook-url',     // 告警Webhook
  },
  
  dependencies: {
    database: {
      enabled: true,                 // 启用数据库检查
      timeout: 5000,                 // 超时时间
      query: 'SELECT 1',             // 检查查询
    },
    redis: {
      enabled: true,                 // 启用Redis检查
      timeout: 3000,                 // 超时时间
      memoryThreshold: 0.8,          // 内存阈值
    },
    externalApis: [                  // 外部API配置
      {
        name: 'payment-api',
        url: 'https://api.payment.com/health',
        method: 'GET',
        timeout: 5000,
        expectedStatus: [200],
        critical: true,
      },
    ],
    messageQueue: {
      enabled: false,                // 启用消息队列检查
      timeout: 5000,                 // 超时时间
    },
    fileSystem: {
      enabled: true,                 // 启用文件系统检查
      paths: ['./uploads', './logs'], // 检查路径
    },
  },
};
```

### 2. 告警配置

```typescript
// 告警配置
const alertConfig = {
  enabled: true,                     // 启用告警
  
  webhookUrl: 'webhook-url',         // Webhook URL
  
  emailConfig: {
    enabled: false,                  // 启用邮件告警
    smtp: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'user@gmail.com',
        pass: 'password',
      },
    },
    from: 'health@app.com',
    to: ['admin@app.com'],
  },
  
  slackConfig: {
    enabled: false,                  // 启用Slack告警
    webhookUrl: 'slack-webhook-url',
    channel: '#alerts',
  },
  
  thresholds: {
    criticalFailures: 3,             // 关键失败阈值
    consecutiveFailures: 5,          // 连续失败阈值
    responseTimeMs: 5000,            // 响应时间阈值
  },
};
```

## 最佳实践

### 1. 健康检查设计

```typescript
// 良好的健康检查设计
class GoodHealthChecker {
  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // 1. 快速检查 - 避免长时间运行的操作
      const isConnected = await this.quickConnectionCheck();
      
      // 2. 轻量级验证 - 避免复杂的业务逻辑
      const isResponsive = await this.lightweightValidation();
      
      // 3. 提供有用的错误信息
      if (!isConnected) {
        return {
          name: 'database',
          status: HealthStatus.UNHEALTHY,
          message: 'Database connection failed',
          responseTime: Date.now() - startTime,
          // 包含调试信息
          metadata: {
            connectionPool: this.getConnectionPoolStatus(),
            lastError: this.getLastError(),
          },
        };
      }
      
      return {
        name: 'database',
        status: HealthStatus.HEALTHY,
        message: 'Database is healthy',
        responseTime: Date.now() - startTime,
      };
      
    } catch (error) {
      return {
        name: 'database',
        status: HealthStatus.UNKNOWN,
        message: `Health check failed: ${error.message}`,
        responseTime: Date.now() - startTime,
        metadata: { error: error.stack },
      };
    }
  }
}
```

### 2. 错误处理

```typescript
// 健壮的错误处理
@Injectable()
export class RobustHealthService {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  async performHealthCheck() {
    try {
      const result = await this.healthCheckService.getSystemHealth();
      
      // 根据健康状态采取不同行动
      switch (result.status) {
        case HealthStatus.HEALTHY:
          this.logger.log('System is healthy');
          break;
          
        case HealthStatus.DEGRADED:
          this.logger.warn('System is degraded', result);
          // 可能需要降级某些功能
          await this.enableDegradedMode();
          break;
          
        case HealthStatus.UNHEALTHY:
          this.logger.error('System is unhealthy', result);
          // 可能需要停止接收新请求
          await this.enableMaintenanceMode();
          break;
          
        default:
          this.logger.error('Unknown health status', result);
      }
      
      return result;
      
    } catch (error) {
      this.logger.error('Health check failed', error);
      
      // 返回默认的不健康状态
      return {
        status: HealthStatus.UNKNOWN,
        timestamp: new Date(),
        message: 'Health check system failure',
        error: error.message,
      };
    }
  }
}
```

### 3. 性能优化

```typescript
// 性能优化的健康检查
@Injectable()
export class OptimizedHealthService {
  private readonly cache = new Map<string, { result: HealthCheckResult; expiry: number }>();
  private readonly cacheTTL = 30000; // 30秒缓存

  async getCachedHealthCheck(checkerName: string): Promise<HealthCheckResult> {
    const cached = this.cache.get(checkerName);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.result;
    }
    
    // 执行健康检查
    const result = await this.healthCheckService.executeCheck(checkerName);
    
    // 缓存结果
    this.cache.set(checkerName, {
      result,
      expiry: Date.now() + this.cacheTTL,
    });
    
    return result;
  }

  // 并行执行多个检查
  async getParallelHealthChecks(checkerNames: string[]): Promise<HealthCheckResult[]> {
    const promises = checkerNames.map(name => 
      this.getCachedHealthCheck(name).catch(error => ({
        name,
        status: HealthStatus.UNKNOWN,
        message: `Check failed: ${error.message}`,
        timestamp: new Date(),
      }))
    );
    
    return Promise.all(promises);
  }
}
```

## 监控和告警

### 1. Prometheus指标

系统自动导出以下Prometheus指标：

```prometheus
# 健康检查总数
health_check_total{checker="database",type="dependency"} 150

# 健康检查持续时间
health_check_duration_seconds{checker="database"} 0.025

# 健康检查状态 (1=健康, 0=不健康)
health_check_status{checker="database",status="healthy"} 1

# 健康检查失败总数
health_check_failures_total{checker="redis",status="unhealthy"} 3

# 系统运行时间
health_system_uptime_seconds 86400

# 告警总数
health_alerts_total{type="critical",checker="database"} 1
```

### 2. 告警配置示例

```yaml
# Prometheus告警规则示例
groups:
  - name: health_checks
    rules:
      - alert: HealthCheckFailed
        expr: health_check_status == 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Health check {{ $labels.checker }} failed"
          description: "Health check {{ $labels.checker }} has been failing for more than 1 minute"

      - alert: HealthCheckCriticalFailed
        expr: health_check_status{severity="critical"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Critical health check {{ $labels.checker }} failed"
          description: "Critical health check {{ $labels.checker }} has failed"

      - alert: HighHealthCheckLatency
        expr: health_check_duration_seconds > 5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High health check latency for {{ $labels.checker }}"
          description: "Health check {{ $labels.checker }} is taking more than 5 seconds"
```

## 故障排除

### 1. 常见问题

**问题**: 健康检查超时
```typescript
// 解决方案：调整超时配置
const config = {
  dependencies: {
    database: {
      timeout: 10000, // 增加超时时间
    },
  },
};
```

**问题**: 频繁的误报告警
```typescript
// 解决方案：调整告警阈值
const alertConfig = {
  thresholds: {
    consecutiveFailures: 10, // 增加连续失败阈值
    criticalFailures: 5,     // 增加关键失败阈值
  },
};
```

**问题**: 健康检查影响性能
```typescript
// 解决方案：启用缓存和优化检查间隔
const config = {
  checkInterval: 60000,      // 增加检查间隔
  systemCheckInterval: 300000, // 增加系统检查间隔
};
```

### 2. 调试工具

```typescript
// 使用调试端点
@Controller('debug')
export class DebugController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  @Get('health')
  async getHealthDebugInfo() {
    return {
      systemHealth: await this.healthCheckService.getSystemHealth(),
      stats: this.healthCheckService.getHealthStats(),
      checkers: this.healthCheckService.getRegisteredCheckers(),
    };
  }
}
```

## API参考

### HealthCheckService

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `getSystemHealth()` | 获取系统整体健康状态 | 无 | `Promise<SystemHealth>` |
| `executeCheck(name)` | 执行特定健康检查 | `name: string` | `Promise<HealthCheckResult>` |
| `getHealthByType(type)` | 获取特定类型的健康检查结果 | `type: HealthCheckType` | `Promise<HealthCheckResult[]>` |
| `registerChecker(checker)` | 注册健康检查器 | `checker: HealthChecker` | `void` |
| `unregisterChecker(name)` | 注销健康检查器 | `name: string` | `void` |
| `setCheckerEnabled(name, enabled)` | 启用/禁用检查器 | `name: string, enabled: boolean` | `void` |
| `getHealthStats(checker?)` | 获取健康检查统计 | `checker?: string` | `HealthCheckStats \| Map<string, HealthCheckStats>` |

### DependencyCheckersService

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `getDependencyStatus()` | 获取所有依赖状态 | 无 | `Promise<HealthCheckResult[]>` |
| `addExternalApiChecker(config)` | 添加外部API检查器 | `config: ExternalApiConfig` | `void` |
| `removeExternalApiChecker(name)` | 移除外部API检查器 | `name: string` | `void` |

### HealthMonitoringService

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `getPrometheusMetrics()` | 获取Prometheus指标 | 无 | `string` |
| `getMonitoringStats()` | 获取监控统计 | 无 | `MonitoringStats` |
| `getAlertHistory(checker?)` | 获取告警历史 | `checker?: string` | `AlertEvent[]` |
| `getFailureCount(checker?)` | 获取失败计数 | `checker?: string` | `Map<string, number> \| number` |
| `resetFailureCount(checker?)` | 重置失败计数 | `checker?: string` | `void` |

## 代码示例

### 完整的控制器集成示例

```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { 
  HealthCheckService, 
  DependencyCheckersService,
  HealthMonitoringService 
} from './common/health';

@Controller('api')
export class ApiController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly dependencyCheckersService: DependencyCheckersService,
    private readonly monitoringService: HealthMonitoringService,
  ) {}

  @Get('status')
  async getApiStatus() {
    const systemHealth = await this.healthCheckService.getSystemHealth();
    const dependencies = await this.dependencyCheckersService.getDependencyStatus();
    const stats = this.monitoringService.getMonitoringStats();
    
    return {
      status: systemHealth.status,
      timestamp: new Date(),
      uptime: stats.uptime,
      dependencies: dependencies.map(dep => ({
        name: dep.name,
        status: dep.status,
        responseTime: dep.responseTime,
      })),
      summary: {
        totalChecks: stats.totalChecks,
        healthyChecks: stats.healthyChecks,
        unhealthyChecks: stats.unhealthyChecks,
      },
    };
  }

  @Post('maintenance')
  async enableMaintenanceMode(@Body() body: { enabled: boolean }) {
    // 在维护模式下禁用某些健康检查
    if (body.enabled) {
      this.healthCheckService.setCheckerEnabled('external-api', false);
    } else {
      this.healthCheckService.setCheckerEnabled('external-api', true);
    }
    
    return { message: `Maintenance mode ${body.enabled ? 'enabled' : 'disabled'}` };
  }
}
```

这个健康检查系统提供了全面的监控和告警功能，可以帮助你及时发现和解决系统问题，确保应用程序的高可用性。