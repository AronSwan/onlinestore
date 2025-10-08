# 功能与API（加强版，来源于 README 与仓库）

特性（README 明确列出）
- 数据类型：Logs、Metrics、Traces、RUM（性能、错误、会话回放）
- 协议与查询：OpenTelemetry（OTLP）、SQL（日志/追踪）、PromQL（指标）
- 可视化：仪表板、报表、告警（18+ 图表类型）
- Pipelines：数据富化、脱敏、归一化，日志到指标的流式处理
- 安装模式：单二进制或 HA 安装
- 存储选项：本地磁盘、S3、MinIO、GCS、Azure Blob
- 高可用与集群：支持
- 动态 Schema 与演进（README）
- 内置认证（README）
- 多语言 UI（11 种语言）
- SBOM：Rust（openobserve.cdx.xml）、JS（web/sbom.json）

HTTP Ingest API（依据 README）
- 写入端点：POST /api/{org}/{stream}/_json
  - Header：Authorization: Bearer {token}
  - Body：JSON 数组（每条为记录）
- OTLP 端点（README 指明支持）：/otlp/v1/logs、/otlp/v1/metrics、/otlp/v1/traces

查询接口
- SQL：用于日志与追踪查询（README）
- PromQL：用于指标查询（README）
- 可视化/告警：通过 UI 配置与查看

多租户与权限
- org/stream：用于数据隔离与组织管理（README 截图展示 Streams/IAM）
- Token：用于 Ingest/查询认证（.env.example 可推断存在相关环境变量项；详见 UI/配置）

版本与许可
- 许可证：AGPL-3.0（LICENSE）
- 安全政策与报告流程：见 SECURITY.md