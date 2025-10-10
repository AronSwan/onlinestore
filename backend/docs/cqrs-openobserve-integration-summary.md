# CQRS OpenObserve 集成总结

## 概述

本文档总结了 CQRS 模块与 OpenObserve 的集成工作，包括紧急修复、可观测性集成、性能优化和监控告警。

## 完成的工作

### 阶段一：紧急修复

1. **修复 TanStack Query 关键问题**
   - 修复了缓存过期时间的计算问题
   - 改进了重试逻辑，使用 p-retry 库
   - 添加了资源清理机制

2. **修复依赖注入问题**
   - 修复了 CQRS 模块中的依赖注入问题
   - 正确配置了可选参数的顺序
   - 添加了模块配置提供者

3. **修复导出和配置问题**
   - 更新了导出路径，移除了 .js 扩展名
   - 修复了 Jest 配置，支持更严格的测试环境

### 阶段二：OpenObserve 集成

1. **创建环境变量配置**
   - 实现了 `CqrsOpenObserveConfig` 配置类
   - 支持环境变量配置所有 OpenObserve 相关参数
   - 提供了合理的默认值

2. **实现结构化日志服务**
   - 创建了 `CqrsLoggingService`，专门处理 CQRS 日志
   - 支持命令、查询和事件的日志记录
   - 集成了追踪上下文信息

3. **实现指标收集服务**
   - 创建了 `CqrsMetricsService`，收集 CQRS 相关指标
   - 支持计数器、直方图和运行时指标
   - 实现了批量刷新机制

4. **实现分布式追踪服务**
   - 创建了 `CqrsTracingService`，处理分布式追踪
   - 支持 Span 创建、属性设置和事件记录
   - 集成了 OpenTelemetry API

5. **更新总线实现以集成可观测性**
   - 更新了命令总线，集成日志、指标和追踪
   - 更新了查询总线，集成可观测性服务
   - 更新了事件总线，添加完整的可观测性支持

### 阶段三：性能优化

1. **实现 SWR 和并发去重**
   - 创建了 `SWRService`，支持 Stale-While-Revalidate 模式
   - 实现了并发查询去重，避免重复请求
   - 添加了后台刷新机制

2. **更新查询总线以集成 SWR**
   - 更新了查询总线，集成 SWR 服务
   - 支持配置 SWR 参数（TTL、staleTime 等）
   - 保持了向后兼容性

### 阶段四：监控与告警

1. **创建 OpenObserve 初始化脚本**
   - 创建了 `init-cqrs-streams.ts`，初始化 CQRS 相关流
   - 支持创建告警规则
   - 支持创建监控仪表板

2. **创建测试脚本**
   - 创建了 `test-cqrs-integration.ts`，测试集成功能
   - 支持测试日志、指标和追踪数据的采集
   - 支持查询测试数据验证功能

## 技术架构

### 服务层

```
CqrsLoggingService -> BusinessLoggerService -> OpenObserve
CqrsMetricsService -> OpenObserveTransport -> OpenObserve
CqrsTracingService -> OpenTelemetry API -> OpenObserve
SWRService -> IQueryCache -> OpenObserve
```

### 总线层

```
CommandBus -> CqrsLoggingService, CqrsMetricsService, CqrsTracingService
QueryBus -> CqrsLoggingService, CqrsMetricsService, CqrsTracingService, SWRService
EventBus -> CqrsLoggingService, CqrsMetricsService, CqrsTracingService
```

### 配置层

```
CqrsOpenObserveConfig -> Environment Variables
```

## 使用指南

### 环境变量配置

```bash
# OpenObserve 配置
OPENOBSERVE_URL=http://localhost:5080
OPENOBSERVE_ORGANIZATION=default
OPENOBSERVE_TOKEN=your-token

# CQRS 流配置
CQRS_STREAM_COMMANDS=cqrs-commands
CQRS_STREAM_QUERIES=cqrs-queries
CQRS_STREAM_EVENTS=cqrs-events
CQRS_STREAM_METRICS=cqrs-metrics
CQRS_STREAM_TRACES=traces

# 性能配置
OPENOBSERVE_BATCH_SIZE=100
OPENOBSERVE_FLUSH_INTERVAL=5000
OPENOBSERVE_MAX_RETRIES=3
OPENOBSERVE_TIMEOUT=10000

# 追踪配置
OPENOBSERVE_TRACING_ENABLED=true
OPENOBSERVE_TRACING_SAMPLING_RATE=0.1
```

### 初始化 OpenObserve

```bash
# 运行初始化脚本
npx ts-node scripts/openobserve/init-cqrs-streams.ts
```

### 测试集成

```bash
# 运行测试脚本
npx ts-node scripts/openobserve/test-cqrs-integration.ts
```

### 使用 CQRS 模块

```typescript
// 在模块中导入
import { CqrsModule } from './src/cqrs';

// 配置模块
@Module({
  imports: [
    CqrsModule.forRoot({
      enableCommandBus: true,
      enableQueryBus: true,
      enableEventBus: true,
    }),
  ],
})
export class AppModule {}
```

## 性能优化

### SWR (Stale-While-Revalidate)

- 支持缓存过期时间配置
- 支持后台刷新
- 支持并发查询去重

### 指标收集

- 批量发送指标，减少网络开销
- 自动刷新机制，避免数据丢失
- 支持运行时指标收集

### 日志记录

- 结构化日志格式，便于查询和分析
- 集成追踪上下文，支持分布式追踪
- 支持不同日志级别

## 监控与告警

### 告警规则

- 命令错误率告警（> 1%）
- 命令 P95 延迟告警（> 500ms）
- 查询 P95 延迟告警（> 300ms）
- 查询缓存命中率告警（< 50%）
- 事件死信队列告警（> 0）

### 仪表板

- 命令执行趋势仪表板
- 查询执行趋势仪表板
- 事件处理趋势仪表板

## 故障排除

### 常见问题

1. **OpenObserve 连接失败**
   - 检查环境变量配置
   - 确认 OpenObserve 服务运行正常
   - 检查网络连接

2. **指标数据未显示**
   - 确认指标流已创建
   - 检查指标名称格式
   - 确认时间范围设置

3. **追踪数据缺失**
   - 确认追踪配置已启用
   - 检查采样率设置
   - 确认追踪流已创建

### 日志级别

- DEBUG: 详细的调试信息
- INFO: 一般信息
- WARN: 警告信息
- ERROR: 错误信息

## 后续改进

1. **增强告警规则**
   - 添加更多自定义告警规则
   - 支持动态告警阈值
   - 支持告警通知渠道

2. **性能优化**
   - 优化指标收集性能
   - 优化日志格式
   - 优化追踪采样策略

3. **扩展功能**
   - 支持更多缓存策略
   - 支持更复杂的查询优化
   - 支持更多数据导出格式

## 结论

通过本次集成，CQRS 模块现在具备了完整的可观测性能力，包括日志、指标和追踪。同时，通过 SWR 和并发去重，查询性能得到了显著提升。监控告警机制确保了系统的稳定性和可靠性。

这些改进为系统提供了强大的监控和故障排查能力，有助于及时发现和解决问题，提高系统的可用性和用户体验。