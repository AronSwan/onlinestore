# CQRS改进计划与OpenObserve集成方案

## 概述
本文档在研读 OpenObserve 资料基础上，给出将 OpenObserve 有序融入 CQRS 改进计划的落地方案。目标是建立“日志-指标-追踪”三位一体的可观测性体系，提升 CQRS 的可靠性、性能与可维护性。

## OpenObserve 对 CQRS 的价值
- 多数据类型支持：日志、指标、追踪、RUM 全覆盖
- 高性能与低成本：百万级摄取、亚秒级查询、列式存储高压缩
- 强查询可视化：同时支持 SQL 与 PromQL，仪表板丰富
- 云原生与易部署：Docker/K8s 友好，HA 与对象存储支持

## 统一数据通道与流命名
建议按领域分流，便于查询与治理：
- logs：cqrs-commands、cqrs-queries、cqrs-events
- metrics：cqrs-metrics
- traces：traces（OTLP）
说明：
- HTTP Ingest：POST {BASE}/api/{org}/{stream}/_json，Header: Authorization: Bearer {token}
- OTLP：{BASE}/otlp/v1/{logs|metrics|traces}，携带同一 Token

## 结构化日志规范（命令/查询/事件）
统一公共字段
- timestamp（UTC ISO8601）、env、service、version、source（apiserver/worker）
- traceId、spanId、requestId、tenant、userId

命令日志（CQRSCommandLog）
- type、id、status(start/success/error)、duration_ms、retry_count、error_code、payload_size、handler

查询日志（CQRSQueryLog）
- type、cache_key、cache_hit(true/false)、stale(true/false)、duration_ms、result_size、handler

事件日志（CQRS 事件）
- type、status(published/handled/error)、subscriber、duration_ms、dlq(bool)

示例（命令执行记录）
```typescript
// 统一使用 BusinessLoggerService 写入 cqrs-commands
businessLogger.log({
  timestamp: new Date().toISOString(),
  level: 'INFO',
  service: 'backend',
  source: 'apiserver',
  traceId, spanId, requestId, tenant, userId,
  type: command.constructor.name,
  id: commandId,
  status: 'start',
  handler: handlerName,
});
```

## 指标模型与命名
建议使用“计数器 + 直方图”结合，维度标签统一：{type, handler, status}
- 命令
  - cqrs_command_total{type,status}
  - cqrs_command_duration_ms{type,handler} histogram
  - cqrs_command_retry_total{type}
- 查询
  - cqrs_query_total{type,cache_hit}
  - cqrs_query_duration_ms{type,handler} histogram
  - cqrs_query_cache_hit_ratio{type}
- 事件
  - cqrs_event_published_total{type}
  - cqrs_event_handle_total{type,status}
  - cqrs_event_dlq_total{type}
- 运行时
  - cqrs_inflight_operations{kind}
  - cqrs_background_refresh_active{type}

指标上报建议
- 使用 HTTP Ingest 统一上报到 cqrs-metrics，或直接用 OTLP Metrics
- 高频直方图选择合适桶（如 p50/p95/p99 关注区间）

## 告警规则与阈值
建议在 OpenObserve 配置以下 CQRS 专用告警：
- 性能退化
  - p95 cqrs_query_duration_ms > 300ms 持续10m（high）
  - p95 cqrs_command_duration_ms > 500ms 持续10m（high）
- 错误率
  - cqrs_command_total{status="error"} / cqrs_command_total > 1% 持续5m（critical）
  - cqrs_event_dlq_total{type} > 0（critical，立即）
- 缓存异常
  - cqrs_query_cache_hit_ratio < 50% 持续15m（medium）

## 分布式追踪接入要点（OTLP）
- 在 CommandBus/QueryBus/事件处理创建 span，命名：command.{Type} / query.{Type} / event.{Type}
- 常用 attributes：
  - 命令：command.id、type、handler、retry_count
  - 查询：query.type、cache_hit、cache_key、handler
  - 事件：event.type、subscriber、status
- 错误：recordException 并设置 status=ERROR；日志带 traceId/spanId 与追踪关联

示例（QueryBus 执行）
```typescript
const span = tracer.startSpan(`query.${query.constructor.name}`, {
  attributes: {
    'service.name': 'backend',
    'query.type': query.constructor.name,
  },
});
try {
  const result = await handler.execute(query);
  span.setAttributes({
    'query.success': true,
    'query.duration_ms': Date.now() - start,
  });
} catch (err) {
  span.recordException(err);
  span.setAttributes({ 'query.success': false });
  throw err;
} finally {
  span.end();
}
```

## Pipeline（VRL）脱敏与富化
- 在 Ingest Pipeline 做 PII 脱敏（邮箱/手机号局部掩码）
- 统一时间戳与标签：timestamp、env、service、region
- 将错误日志转换为可聚合指标（metric_name/metric_value），便于 PromQL 与仪表盘

示例（伪示例）
```
if (.user_email) {
  .user_email_masked = replace(.user_email, /(.).+(@.+)/, "$1***$2")
}
if (.status == "error") {
  .metric_name = "cqrs_error_count"
  .metric_value = 1
}
```

## TanStack Query 集成优化（服务端视角）
- SWR 与 in-flight 去重：后台刷新需可清理（按 queryKey 保存 interval，invalidate/reset 时 clearInterval）
- 重试：采用 p-retry，避免递归 setTimeout 漂移；指数退避 + 抖动
- 缓存 0 值：cacheTime=0 应表示“禁用缓存”，不要用 (cacheTime || default) 覆盖
- 失效语义：服务端缓存失效与 queryKey 解耦，使用显式领域键或 type 参数

## 中间件与日志/指标统一
- 替换 console.log 为 Nest Logger；在中间件链统一采集日志与指标
- 典型中间件：
  - LoggingMiddleware：开始/结束/错误统一结构化日志
  - MetricsMiddleware：时长直方图/计数器（status 标签）
  - ValidationMiddleware：输入验证失败短路
- 顺序与短路：确保异常短路与上下文透传（trace/span、租户）

## 仪表板与查询（建议可视化项）
- 命令监控：执行趋势、成功率、时长分布、Top 慢命令/Handler
- 查询性能：响应时间趋势、缓存命中率、类型对比、热门查询
- 事件处理：发布速率、处理延迟、成功率、DLQ 计数
- SQL 示例（最近15分钟缓存命中率）
```sql
SELECT type,
  SUM(CASE WHEN cache_hit = true THEN 1 ELSE 0 END) / COUNT(*) AS hit_ratio
FROM "cqrs-queries"
WHERE timestamp >= NOW() - INTERVAL 15 MINUTE
GROUP BY type
ORDER BY hit_ratio DESC;
```

## 性能与可靠性建议
- 批量与并发：HTTP Ingest 批大小 100–1000/批，5 并发起步；超时 5–10s
- 重试策略：指数退避 + 抖动；限制最大重试次数
- 写入隔离：高噪声来源单独 stream，避免影响核心查询
- 资源治理：缓存/去重结构需有清理策略（LRU/TTL）

## 安全与合规
- Token 管理：环境变量与密钥管理，避免明文入库
- 传输安全：生产启用 HTTPS，入口限流与鉴权
- 脱敏与保留：Pipeline 强制脱敏；按合规设置保留与删除流程

## 技术实施方案
配置接口（示例）
```typescript
export interface CQRSOpenObserveConfig {
  enable: boolean;
  baseUrl: string;
  org: string;
  token: string;
  streams: {
    commands: string;
    queries: string;
    events: string;
    metrics: string;
    traces: string;
  };
  performance: {
    batchSize: number;
    flushInterval: number;
    maxRetries: number;
    timeout: number;
  };
  tracing: {
    enabled: boolean;
    samplingRate: number;
  };
  alerts: {
    enabled: boolean;
    evaluationInterval: number;
  };
}
```

### 环境变量约定（与仓库统一）
- OPENOBSERVE_URL：OpenObserve 基础地址（例：https://o2.example.com 或 http://localhost:5080）
- OPENOBSERVE_ORGANIZATION：组织名（例：default）
- OPENOBSERVE_TOKEN：访问令牌（建议通过环境变量+密钥管理）
- CQRS_STREAM_COMMANDS：cqrs-commands
- CQRS_STREAM_QUERIES：cqrs-queries
- CQRS_STREAM_EVENTS：cqrs-events
- CQRS_STREAM_METRICS：cqrs-metrics
- CQRS_STREAM_TRACES：traces
- OTLP_LOGS_ENDPOINT：{OPENOBSERVE_URL}/otlp/v1/logs
- OTLP_METRICS_ENDPOINT：{OPENOBSERVE_URL}/otlp/v1/metrics
- OTLP_TRACES_ENDPOINT：{OPENOBSERVE_URL}/otlp/v1/traces

回退映射适配（避免历史变体造成失败）
- OPENOBSERVE_URL ||= OPENOBSERVE_BASE_URL
- OPENOBSERVE_ORGANIZATION ||= OPENOBSERVE_ORG

Windows PowerShell 示例（本地开发）
```powershell
$env:OPENOBSERVE_URL = "http://localhost:5080"
$env:OPENOBSERVE_ORGANIZATION = "default"
$env:OPENOBSERVE_TOKEN = "REDACTED"
$env:CQRS_STREAM_COMMANDS = "cqrs-commands"
$env:CQRS_STREAM_QUERIES = "cqrs-queries"
$env:CQRS_STREAM_EVENTS = "cqrs-events"
$env:CQRS_STREAM_METRICS = "cqrs-metrics"
$env:CQRS_STREAM_TRACES = "traces"
$env:OTLP_TRACES_ENDPOINT = "$env:OPENOBSERVE_URL/otlp/v1/traces"
```

部署（Docker Compose）
```yaml
version: '3.8'
services:
  openobserve:
    image: public.ecr.aws/zinclabs/openobserve:latest
    ports: ["5080:5080"]
    environment:
      - ZO_ROOT_USER_EMAIL=admin@example.com
      - ZO_ROOT_USER_PASSWORD=Complexpass#123
      - ZO_DATA_DIR=/data
    volumes:
      - ./data:/data
    restart: unless-stopped
```

初始化脚本（创建CQRS Streams，并使用统一环境变量）
```typescript
async function createStream(name: string, type: 'logs'|'metrics'|'traces') {
  const base = process.env.OPENOBSERVE_URL || process.env.OPENOBSERVE_BASE_URL;
  const org = process.env.OPENOBSERVE_ORGANIZATION || process.env.OPENOBSERVE_ORG || 'default';
  const token = process.env.OPENOBSERVE_TOKEN;
  if (!base || !org || !token) throw new Error('Missing OPENOBSERVE_URL/ORGANIZATION/TOKEN');

  const res = await fetch(`${base}/api/${org}/streams`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, stream_type: type }),
  });
  if (!res.ok) throw new Error(`Create stream failed: ${name} ${res.status}`);
}

async function initCQRSStreams() {
  const streams = [
    { name: 'cqrs-commands', type: 'logs' },
    { name: 'cqrs-queries', type: 'logs' },
    { name: 'cqrs-events', type: 'logs' },
    { name: 'cqrs-metrics', type: 'metrics' },
    { name: 'traces', type: 'traces' },
  ] as const;
  for (const s of streams) await createStream(s.name, s.type);
}
```

## 实施计划与优先级
阶段与交付
1. 第1周：基础结构化日志（命令/查询/事件），Streams 配置与采集验证
2. 第2周：错误聚合与基础告警规则，统一日志中间件
3. 第3周：性能指标（计数器/直方图），仪表板初版
4. 第4周：OTLP 追踪接入与链路关联，SWR/去重与后台刷新治理
5. 第5周：Pipeline 脱敏与富化、性能与成本优化（采样、保留策略）

优先级
- 高：结构化日志、错误追踪与告警
- 中：性能指标与仪表板
- 低：高级分析与智能告警

## 风险评估与缓解
- 性能影响：统一异步批量发送、限制并发与重试
- 数据丢失：本地缓冲、断点续传、失败告警
- 复杂度提升：完善文档与自动化部署，设验收检查表

## 成功指标
- 日志完整性：核心 CQRS 操作 100% 采集
- 性能指标：查询 p95 < 300ms、命令 p95 < 500ms
- 告警有效性：关键故障告警命中率 > 95%
- 可视化覆盖：三类仪表板可用，支持按 type/handler 钻取

## 验收标准与检查清单
为确保落地效果可度量、可验收，建议引入以下标准与检查项：

- 日志采集完整性
  - 核心 CQRS 操作（命令/查询/事件）日志覆盖率 100%
  - 统一字段存在：timestamp、env、service、version、traceId、spanId、requestId、type、handler
  - 关键事件状态字段：命令 status(start/success/error)、查询 cache_hit/stale、事件 status 与 subscriber
- 指标与性能
  - 查询 p95 <= 300ms（最近 24h），命令 p95 <= 500ms（最近 24h）
  - 缓存命中率 >= 60%（可按类型分组查看）
  - 背景刷新与 in-flight 去重启用并生效（有统计）
- 告警有效性
  - 关键告警命中率 >= 95%，误报率可控（< 5%）
  - DLQ 事件触发即告警（critical）
- 追踪覆盖
  - command.*, query.*, event.* 三类 span 覆盖率 >= 90%
  - 异常记录 recordException，日志携带 traceId/spanId 与追踪关联
- 安全与合规
  - Pipeline 脱敏规则生效（邮箱/手机号掩码）
  - Token 不落盘明文；生产环境启用 HTTPS
- 可视化
  - 三类仪表板可用：命令/查询/事件；支持 type/handler 维度钻取
  - 提供近 15m/1h/24h 预设视图

检查清单（每次发布或周检）
- [ ] Streams 存在：cqrs-commands/cqrs-queries/cqrs-events/cqrs-metrics/traces
- [ ] 采集脚本/SDK 配置为统一环境变量（见下节）
- [ ] 仪表板加载无错误，视图数据刷新正常
- [ ] 告警规则启用，最近 7 天有告警事件与处置记录
- [ ] 追踪链路覆盖与错误关联抽样检查（至少 20 条）
- [ ] Pipeline 脱敏规则抽样检查（至少 50 条日志）

## 环境变量适配器使用说明
为避免环境变量命名差异导致的配置漂移，推荐使用仓库统一的适配器：

- Node/CJS 适配器（示例路径）：scripts/openobserve/env-adapter.js
  - 字段：OPENOBSERVE_URL、OPENOBSERVE_ORGANIZATION、OPENOBSERVE_TOKEN、OPENOBSERVE_ENABLED
  - 回退映射：OPENOBSERVE_URL ||= OPENOBSERVE_BASE_URL；OPENOBSERVE_ORGANIZATION ||= OPENOBSERVE_ORG
  - 用法：
    \`\`\`javascript
    const { OPENOBSERVE_URL, OPENOBSERVE_ORGANIZATION, OPENOBSERVE_TOKEN } =
      require('../../scripts/openobserve/env-adapter');
    const baseUrl = OPENOBSERVE_URL.replace(/\/+$/, '');
    \`\`\`
- TS 版本适配器亦可使用（如需在 Nest 代码内直接引入）

将所有与 OpenObserve 交互的脚本/服务统一改为引入适配器常量，不再直接读 process.env.*，以提升一致性与可维护性。

## 仪表板与告警简表
为便于运维快速核对，建议在 OpenObserve 中建立以下看板与告警规则（与本文档阈值一致）：

- 命令监控仪表板
  - 视图：命令执行趋势、成功率、时长直方图、Top 慢命令/Handler
  - 告警：
    - p95 cqrs_command_duration_ms > 500ms 持续 10m（high）
    - cqrs_command_total{status="error"} / cqrs_command_total > 1% 持续 5m（critical）

- 查询性能仪表板
  - 视图：响应时间趋势、缓存命中率、热门查询、类型对比
  - 关键查询（示例，最近15分钟命中率）：
    ```
    SELECT type,
      SUM(CASE WHEN cache_hit = true THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS hit_ratio
    FROM "cqrs-queries"
    WHERE timestamp >= NOW() - INTERVAL 15 MINUTE
    GROUP BY type
    ORDER BY hit_ratio DESC;
    ```
  - 告警：
    - p95 cqrs_query_duration_ms > 300ms 持续 10m（high）
    - cqrs_query_cache_hit_ratio < 50% 持续 15m（medium）

- 事件处理仪表板
  - 视图：发布速率、处理延迟、成功率、DLQ 计数
  - 告警：
    - cqrs_event_dlq_total{type} > 0（critical，即时）

- 运行时与后台刷新监控
  - 视图：cqrs_inflight_operations{kind}、cqrs_background_refresh_active{type}
  - 用途：观察 in-flight 去重与 SWR 后台刷新是否稳定

备注：
- 视图需支持近 15m/1h/24h 预设窗口
- 维度标签统一：{type, handler, status}

## 故障排除（FAQ）
常见问题与排查步骤：

1) OpenObserve 连接失败或 401/403
- 检查 OPENOBSERVE_URL / OPENOBSERVE_ORGANIZATION / OPENOBSERVE_TOKEN 是否正确
- 统一使用适配器（scripts/openobserve/env-adapter），避免直接读 process.env 导致漂移
- 本地开发：规范化 URL（如 `OPENOBSERVE_URL.replace(/\/+$/, '')`）

2) 缓存行为异常（命中率骤降或无法关闭缓存）
- 确认 cacheTime=0 严格禁用缓存，不得被默认值覆盖
- 检查 SWR：过期返回旧值并后台刷新是否生效；invalidate/reset 是否清理定时器
- 检查 in-flight 去重：同 key 并发是否复用 Promise，避免击穿

3) TanStack 集成重试/取消无效
- 使用 p-retry（指数退避+抖动），避免递归 setTimeout
- 传递 AbortSignal 支持取消；mutationFn 接收 variables

4) 处理器注册冲突或缺失
- 命令/查询：重复注册策略明确（报错或覆盖+告警）
- 事件：允许多订阅；subscriber 记录在日志字段
- 自动发现：装饰器与元数据正确；onModuleInit 尊重 autoDiscoverHandlers

5) 可观测性数据缺失或字段不完整
- 日志：统一结构化字段（service, version, env, bus, type, handler, cache_key, cache_hit, retries, duration_ms, error_code）
- 指标：直方图桶合理；仪表板可查看 p50/p95/p99
- 追踪：command.*, query.*, event.* 三类 span 覆盖；错误 recordException 并与日志 traceId/spanId 关联

6) OTLP 链路不通或数据不可见
- 端点：{OPENOBSERVE_URL}/otlp/v1/{logs|metrics|traces} 可达
- 头部：Authorization: Bearer {token}；网络与 HTTPS 配置正确
- 采样率：生产环境适度降低；先在开发环境验证链路

7) 定时器泄漏或后台刷新异常
- 在 invalidate/reset 时清理对应定时器；模块销毁 onModuleDestroy 清理全部
- 后台刷新添加错误日志与重试，避免无声失败

参考：
- 看板与告警清单需登记在运维台账并定期演练
- 所有脚本/服务统一从适配器读取环境常量，减少配置漂移

## 发布与回滚流程简表
- 发布前检查
  - 环境变量与 Streams/OTLP 端点一致性；令牌权限与采集速率配置
  - 仪表板/告警联通性测试；Pipeline 脱敏规则生效验证
- 发布流程（建议）
  - 金丝雀流量递增（5%→25%→50%→100%）；每步观察 15–30 分钟
  - 关键指标与告警监控：p95 时长、错误率、缓存命中率、DLQ
  - 达成文档阈值后再扩大流量
- 回滚触发（示例阈值）
  - p95 查询 > 300ms/命令 > 500ms 持续 10m
  - 错误率 > 1% 持续 5m 或 写入失败/OTLP中断
- 回滚步骤
  - 切回上一版本；下调采样/批量；暂停高噪声流
  - 清理后台刷新与队列；恢复关键流的稳定采集
  - 记录事件并进入排障与复盘
- 发布后复盘
  - 问题清单与修复；阈值与策略调整；文档与脚本更新

## RACI职责表
- 研发（R）：集成实现、埋点与测试、发布/回滚脚本
- 测试（A）：验收与演练、告警与性能评估、回归流程
- 运维（C）：部署与监控、容量与成本治理、故障处理
- 产品/负责人（I）：窗口与风险、变更通告、复盘与决策

## 快速核对清单（一页）
- 环境与端点
  - OPENOBSERVE_URL/ORGANIZATION/TOKEN 与 OTLP_* 端点已配置且连通
  - Streams 存在且可写：cqrs-commands/cqrs-queries/cqrs-events/cqrs-metrics/traces
- 采集与语义
  - 日志字段统一，指标命名与标签一致，追踪 span 命名规范
  - 查询缓存与失效语义明确，后台刷新与去重可控且可清理
- 可视化与告警
  - 仪表板加载与钻取正常；SQL/PromQL 查询无错误
  - 告警规则启用：p95 时长、错误率、DLQ、命中率；通知通道畅通
- Pipeline 与安全
  - 脱敏与富化规则生效，速率/采样与保留策略符合成本目标
  - Token 与权限、HTTPS、入口限流与鉴权已验证
- 发布门禁
  - 金丝雀观察通过：关键阈值达标（p95、错误率、命中率）
  - 无 DLQ 新增与写入失败；OTLP 稳定
  - 发布/回滚脚本与演练记录齐备
## 总结
通过“统一数据通道 + 结构化日志 + 指标/告警 + OTLP 追踪 + Pipeline 脱敏”的组合拳，将 CQRS 的可观测性落地到工程实践，显著提升问题定位效率与性能治理能力，同时控制存储与运维成本，助力系统稳定演进。