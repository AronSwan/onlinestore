# 使用与集成（强化版）

目标
- 提供可直接复制并落地的接入方案：HTTP Ingest、OTLP（日志/指标/追踪）、代理/采集器（Fluent Bit/Vector）。
- 明确 org/stream 初始化、字段规范、Pipeline（VRL）脱敏与富化、查询与告警。
- 结合本项目的 Nest/Node 场景，给出生产实践参数与常见坑位。

一、准备与初始化
1) 启动 OpenObserve（单机）
```bash
docker run -d \
  --name openobserve \
  -v $PWD/data:/data \
  -p 5080:5080 \
  -e ZO_ROOT_USER_EMAIL="root@example.com" \
  -e ZO_ROOT_USER_PASSWORD="Complexpass#123" \
  public.ecr.aws/zinclabs/openobserve:latest
```
- HA 部署：参见官方文档，结合对象存储（S3/MinIO/GCS/Azure）与副本配置。

2) 创建组织与流（org/stream）
- 登录 Web 控制台，用 root 账户创建组织（org），再创建数据流（stream），生成 Ingest Token。
- 示例约定：org=default，stream=email_verification（邮箱验证数据）。

3) 确认 Ingest 端点与 Token
- 端口默认 5080。
- HTTP Ingest：POST {BASE}/api/{org}/{stream}/_json
- Header：Authorization: Bearer {token}

二、HTTP Ingest（应用直写）
- Node/Nest 客户端示例（axios）
```ts
import axios from 'axios';

export async function ooIngest(records: Record<string, any>[]) {
  const base = process.env.OO_BASE_URL || 'http://openobserve:5080';
  const org = process.env.OO_ORG || 'default';
  const stream = process.env.OO_STREAM || 'email_verification';
  const token = process.env.OO_TOKEN || '';
  const url = `${base}/api/${org}/${stream}/_json`;
  await axios.post(url, records, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 5000,
  });
}
```
- 批量建议
  - 批大小：100–1000/批，观察延迟与成功率后调整。
  - 重试与退避：指数退避 + 抖动；限制最大重试，避免雪崩。
  - 超时：5–10s；根据网络与服务负载调优。

三、OTLP 接入（OpenTelemetry）
- 支持 Logs/Metrics/Traces，适配已有 OTLP 链路。
- Node（Trace）示例：
```ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const exporter = new OTLPTraceExporter({
  url: `${process.env.OO_BASE_URL || 'http://openobserve:5080'}/otlp/v1/traces`,
  headers: { Authorization: `Bearer ${process.env.OO_TOKEN || ''}` },
});
const sdk = new NodeSDK({ traceExporter: exporter });
sdk.start();
```
- Logs/Metrics：分别指向 /otlp/v1/logs 与 /otlp/v1/metrics；携带 Token。

四、采集器接入
1) Fluent Bit（HTTP 输出到 OpenObserve）
```
[OUTPUT]
    Name            http
    Match           *
    Host            openobserve
    Port            5080
    URI             /api/default/app_logs/_json
    Format          json
    Header          Authorization Bearer YOUR_TOKEN
    Json_date_key   timestamp
    Json_date_format iso8601
```
- 配合 Filter 做字段映射与裁剪；保证 timestamp 为 ISO8601。

2) Vector（http sink）
```
[sinks.o2]
type = "http"
inputs = ["app_logs"]
encoding.codec = "json"
endpoint = "http://openobserve:5080/api/default/app_logs/_json"
request.headers.Authorization = "Bearer YOUR_TOKEN"
```

五、字段与数据模型规范（提升查询/可视化）
- 必选字段：
  - timestamp：ISO8601（UTC）；
  - source：数据来源，如 "apiserver"/"worker"；
  - kind：类别，如 "verify_result"/"verify_error"/"metric"；
- 业务字段（邮箱验证）：
  - email、domain、reachable（yes/no/unknown）、latency_ms、has_mx_records、error_code；
- 标签维度：
  - env、service、region 用于聚合与过滤；
- 命名建议：
  - 跨服务统一字段命名；避免多义与重复；高基数字段谨慎存入。

六、Pipeline（VRL）脱敏与富化
- 目的：在 Ingest 时流水线处理日志，统一结构、脱敏 PII、转换指标。
- 示例（伪示例，以官方管道配置为准）：
```
# 掩码邮箱本地部分、抽取域名、失败计数化
if (.email) {
  .email_masked = replace(.email, /(.).+(@.+)/, "$1***$2")
  .domain = parse_regex!(.email, /@(?<d>.+)$/).d
}
if (.kind == "verify_result" && .reachable == "no") {
  .metric_name = "verify_no_count"
  .metric_value = 1
}
```
- 建议：在 Pipeline 中做 PII 脱敏；错误/成功转为可聚合指标（便于 PromQL/仪表）。

七、查询与可视化（SQL/PromQL）
- SQL（日志/追踪）示例
  - 最近 5 分钟 unknown 比例：
```sql
SELECT
  COUNT_IF(reachable = 'unknown') / COUNT(*) AS unknown_ratio
FROM email_verification
WHERE timestamp >= NOW() - INTERVAL 5 MINUTE;
```
  - 域热点错误：
```sql
SELECT domain, COUNT(*) AS error_count
FROM email_verification
WHERE kind='verify_error' AND timestamp >= NOW() - INTERVAL 15 MINUTE
GROUP BY domain
ORDER BY error_count DESC
LIMIT 10;
```
- PromQL（指标）
  - 若通过 Pipeline/应用上报为时序指标：
```
unknown_ratio{stream="email_verification",service="apiserver"}
```
- 可视化：在 UI 创建仪表板，配置图表与查询；按 org/stream 切换。

八、告警落地
1) 规则样例
- unknown_ratio > 0.3（5分钟窗口）
- timeout_rate > 0.1（基于错误计数与总请求）
- 某域 error_count 环比激增（倍增阈值）
2) 通知渠道
- 邮件、Slack、Webhook；结合运维流程。
3) 基线与抑制
- 初始基线观察；对噪声域名设置抑制或单独 stream。

九、与本项目集成（Nest/Node）
- 在 EmailVerifierService/Worker 中统一调用 ooIngest，上报成功/错误与延迟。
- 字段统一：timestamp/source/kind/email/domain/reachable/latency_ms/error_code。
- 将批量任务（Bull）生命周期（开始/结束/总量/耗时）上报做容量评估。
- 结合 api-practice.md 网关限流与鉴权，确保 Ingest 通道健康与告警。

十、性能与可靠性建议
- 批量与并发：从 100/批、5 并发起步；观察 Ingest 成功率/延迟后提升。
- 重试：指数退避 + 抖动；最大重试/总体超时控制。
- 压缩/编码：若支持压缩，评估带宽下降 vs CPU开销。
- 写入隔离：高噪声来源单独 stream，避免影响核心查询。

十一、安全与合规
- Token 管理：通过环境变量/密钥管理；避免明文写入仓库。
- 脱敏：邮箱掩码；错误日志避免敏感信息。
- 保留策略：按合规设定保留期与删除流程。
- 传输安全：生产启用 HTTPS；入口访问控制与速率限制。

十二、常见问题与坑位
- Ingest 失败：检查 Token、org/stream 名称、时间戳格式。
- 时间偏移：统一 UTC 时间；校时与时区一致。
- 查询缓慢：优化字段与标签、减少高基数字段、分流高噪声数据。
- 指标/日志分离：高频指标独立 stream，降低互扰。

附：环境变量建议
```
OO_BASE_URL=http://openobserve:5080
OO_ORG=default
OO_STREAM=email_verification
OO_TOKEN=YOUR_OPENOBSERVE_TOKEN
```

参考
- 官方 README 与文档（features、quickstart、HA 部署、Pipelines）
- 项目内 nest-integration-examples.md 的客户端示例与字段规范