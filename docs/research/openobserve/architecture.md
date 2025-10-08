# 架构与源码结构（加强版，基于仓库）

代码结构与技术栈（来自仓库根目录）
- 后端：Rust（Cargo.toml、src/ 目录）
- 前端：web/（JavaScript，含 sbom.json）
- 部署与工具：deploy/（部署相关）、benchmarks/（基准）、tests/、.env.example（环境变量样例）

核心组件（依据 README 与目录）
- Ingest/API：提供 HTTP/OTLP 摄取接口，支持 logs/metrics/traces 与 RUM
- 查询与可视化：内置 UI（web/），支持 SQL 与 PromQL
- 多租户与认证：org/stream 模型、内置认证与 Token（README）
- 存储后端：支持本地磁盘与对象存储（S3、MinIO、GCS、Azure Blob）（README）
- Pipelines：对数据进行富化、脱敏、归一化（README）
- HA/集群：支持单二进制或高可用安装（README）

数据路径
1) 客户端或代理（Fluent Bit/Vector/OTLP/HTTP）发往 Ingest 端点（携带 org/stream/token）
2) 服务端解析并存储（Rust 实现，细节参考 src/）
3) 查询端通过 UI 或 API 执行 SQL/PromQL，生成仪表与告警
4) 管理平面进行 org/stream 与 Token 管理（README 中的 UI 截图）