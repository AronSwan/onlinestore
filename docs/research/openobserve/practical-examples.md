# 实践示例（加强版，基于 README 与本项目集成场景）

HTTP Ingest（JSON 批量）
- 端点：POST /api/{org}/{stream}/_json
- Header：Authorization: Bearer {token}
- 建议批量大小与重试策略，详见 usage-and-integration.md

OTLP（Traces/Metrics/Logs）
- 端点：/otlp/v1/traces、/otlp/v1/metrics、/otlp/v1/logs
- 与 OpenTelemetry SDK 集成（Node 示例见 usage-and-integration.md）

Pipelines（README）
- 在摄取时做脱敏与富化，将日志转为聚合指标（示例见 usage-and-integration.md 的伪配置）

仪表与告警（README 提供 UI/Alerts 截图）
- 按 stream 构建仪表，监控 unknown 比例、超时率、域热点等
- 告警规则与通知渠道通过 UI 配置；参考 README 中 Alerts 截图