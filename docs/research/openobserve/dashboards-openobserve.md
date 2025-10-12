# OpenObserve 仪表与查询卡片指南

目标
- 提供可直接复制的 OpenObserve 原生仪表配置与查询卡片，快速落地常见观测场景
- 适配本项目 Email Verification 业务的关键指标：unknown_ratio、timeout_rate、top domain errors、latency p95、OO 健康

基础说明
- 入口：OpenObserve 控制台 → Dashboards → New Dashboard → Add Panel
- 数据源选择：根据需要选择 Logs 或 Metrics
- 时间范围：建议默认 now-1h（可根据需要调整）
- 保存：可将查询保存为 Saved Query 或直接作为面板加入仪表

推荐仪表布局（12 列网格）
- 第1行（指标速览，stat 面板）
  - Unknown Ratio (w=6, h=4)
  - Timeout Rate (w=6, h=4)
- 第2行（问题定位）
  - Top Domain Errors (table, w=12, h=8)
- 第3行（性能趋势）
  - Latency p95 (timeseries, w=12, h=8)
- 第4行（系统健康）
  - OO Health (stat, w=4, h=4)，剩余空间可放置 ingest 成功率、错误率等

PromQL 查询示例
- Unknown Ratio（过去5分钟）
  sum(rate(verify_unknown_count{stream="email_verification"}[5m]))
  /
  sum(rate(verify_total_count{stream="email_verification"}[5m]))

- Timeout Rate（过去10分钟）
  sum(rate(verify_timeout_count{stream="email_verification"}[10m]))
  /
  sum(rate(verify_total_count{stream="email_verification"}[10m]))

- Top Domain Errors（15分钟 Top10）
  topk(10, sum by (domain) (increase(domain_error_count{stream="email_verification"}[15m])))

- Latency p95（过去5分钟）
  histogram_quantile(0.95, sum by (le) (rate(verify_latency_bucket{stream="email_verification"}[5m])))

- OpenObserve 健康
  max(openobserve_up)

可选变量（提升交互性）
- 变量 domain（用于筛选域名）
  - 在面板查询中添加 {domain="$domain"} 过滤
- 变量 window（用于调整时间窗口）
  - 将 [5m]/[10m]/[15m] 替换为 [$window] 统一控制

日志查询（SQL 模式）常用片段
- 最近1小时错误日志 Top N 域名
  SELECT domain, COUNT(*) AS error_count
  FROM email_verification
  WHERE timestamp >= now() - INTERVAL '1 hour'
    AND level = 'error'
  GROUP BY domain
  ORDER BY error_count DESC
  LIMIT 10;

- 最近1小时 unknown 比例
  SELECT
    (COUNT_IF(result = 'unknown')::float / NULLIF(COUNT(*), 0)) AS unknown_ratio
  FROM email_verification
  WHERE timestamp >= now() - INTERVAL '1 hour';

落地步骤（建议）
1) 新建仪表并添加上述面板，按布局建议摆放
2) 用 Saved Query 保存常用 SQL/PromQL 查询
3) 验证时间范围（默认 now-1h）和变量是否生效
4) 联动告警：将 unknown_ratio、timeout_rate 与阈值匹配的规则接入通知渠道
5) 文档化：将仪表名称、面板说明与关键查询记录到项目文档，便于交接与巡检

注意事项
- 指标命名需与实际 ingest 的 metric 名称一致；如命名不同，请调整查询中的指标名
- 高基数标签（如 email 级）尽量不要直接入指标，用 pipeline 先做聚合或抽取域名
- 若面板无数据，先验证数据源是否有目标指标/日志，确认时间范围覆盖

Saved Query 示例与校验
- 示例文件（占位，可复制调整）：
  - docs/research/openobserve/saved-queries/overview-unknown_ratio-5m-v1.json
  - docs/research/openobserve/saved-queries/diagnose-top_domain_errors-15m-v1.json
  - docs/research/openobserve/saved-queries/perf-latency_p95-5m-v1.json
- 本地校验（命名规范与必填字段）：
  - Node 运行：node scripts/openobserve/lint-saved-queries.mjs
  - 通过则输出 "[lint] success"，否则列出具体文件与问题

保存查询（Saved Query）命名规范与共享策略
- 命名规范（建议）
  - 格式：{域/业务}/{org}/{stream}/{用途}-{指标或查询要点}-{窗口或过滤}-{版本}
  - 示例：
    - email-verification/default/email_verification/overview-unknown_ratio-5m-v1
    - email-verification/default/email_verification/diagnose-top_domain_errors-15m-v2
    - email-verification/default/email_verification/perf-latency_p95-5m-v3
  - 关键词顺序统一：用途 → 指标/要点 → 时间窗口/过滤 → 版本号
  - 大小写与分隔：统一使用小写和下划线/短横线；避免空格与特殊字符
- 标签与描述
  - 标签：env、service、region、owner、severity 等，提升检索效率
  - 描述：明确输入/输出字段、主要过滤条件、适用场景与边界
- 所有权与评审
  - Owner：明确负责人（团队/个人），在描述中注明
  - 变更评审：重大查询调整需走评审（PR/文档记录），更新版本号
- 生命周期
  - 淘汰策略：不再使用的查询标注 deprecated 并在一段时间后移除
  - 兼容：若有向下兼容需求，保留上一版本并在描述中标注替代关系
- 共享策略
  - 使用团队共享空间/组织共享，将核心查询置顶
  - 链接分享：统一存档到团队文档（含截图/查询 JSON），便于演练与接手

跨流查询（Cross-Stream）示例
- 说明：仅允许白名单字段参与关联；避免高基数字段 JOIN；窗口化查询控制扫描范围
- SQL 示例（按业务需要调整字段与别名）
```sql
-- 最近1小时，按 email_hash 将验证日志与错误日志进行关联，查看同一 email 最近的错误与结果
SELECT
  p.timestamp,
  p.email_hash,
  p.reachable,
  e.error_code,
  e.message
FROM email_verification AS p
LEFT JOIN email_verification_errors AS e
  ON p.email_hash = e.email_hash
WHERE p.timestamp >= NOW() - INTERVAL 1 HOUR
ORDER BY p.timestamp DESC
LIMIT 1000;
```
- 关联域名错误与验证结果（按 domain 关联）
```sql
SELECT
  p.timestamp,
  p.domain,
  p.reachable,
  e.error_count
FROM email_verification AS p
LEFT JOIN (
  SELECT domain, COUNT(*) AS error_count
  FROM email_verification
  WHERE kind = 'verify_error' AND timestamp >= NOW() - INTERVAL 1 HOUR
  GROUP BY domain
) AS e
  ON p.domain = e.domain
WHERE p.timestamp >= NOW() - INTERVAL 1 HOUR
ORDER BY e.error_count DESC, p.timestamp DESC
LIMIT 1000;
```
- 注意：
  - 在服务端（Query Builder）层面做字段白名单校验与转义，防止注入
  - 控制 limit 与时间窗口，避免大范围扫描
  - 有条件则优先以预聚合/派生 stream 替代重复 JOIN

Saved Query 导入/导出（OpenObserve 原生）
- 导出
  1) 打开 Saved Queries → 选择目标查询
  2) 点击 Export/Download（若 UI 提供导出 JSON/复制查询）
  3) 将 JSON 存档到 docs/research/openobserve/saved-queries/{用途}-{指标}-{窗口}.json
- 导入
  1) 打开 Saved Queries → New/Import
  2) 粘贴保存的查询（SQL/PromQL 或 JSON），完善名称/标签/描述
  3) 保存并测试：选定时间范围、查看结果数量与耗时
- JSON 片段（示例，占位，按实际 UI 导出为准）
```json
{
  "name": "email-verification/default/email_verification/overview-unknown_ratio-5m-v1",
  "type": "promql",
  "query": "sum(rate(verify_unknown_count{stream=\\\"email_verification\\\"}[5m]))/sum(rate(verify_total_count{stream=\\\"email_verification\\\"}[5m]))",
  "labels": ["env:prod", "service:apiserver", "owner:team-email"],
  "description": "过去5分钟 unknown_ratio 观测查询（仪表速览卡片）",
  "timeRange": "now-1h"
}
```
- 团队协作建议
  - 建立 saved-queries 目录进行版本管理；PR 审核更新
  - 在仪表中引用 Saved Query，降低重复配置成本
  - 结合告警规则，复用相同查询语义，保证口径一致