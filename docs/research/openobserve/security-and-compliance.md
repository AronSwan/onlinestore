# 安全与合规（加强版，依据 SECURITY.md 与 README）

安全政策（SECURITY.md）
- 报告安全问题的渠道与流程（请参阅仓库 SECURITY.md）
- 负责任披露与修复策略

认证与访问（README）
- 内置认证：配置 root 用户并通过 UI/Token 管理访问
- 多租户：org/stream 用于数据隔离与权限域

传输与网络
- 生产建议使用 HTTPS（反向代理或负载均衡器启用 TLS）
- Ingest 与查询端口（默认 5080）需受控访问

数据与隐私
- 避免在可观测性数据中写入敏感信息（PII、凭据）
- 可通过 Pipelines 做脱敏与归一化（README）

合规
- 数据保留与删除策略依托存储后端与平台配置
- 审计与 RBAC/SSO：仓库展示 IAM/SSO/RBAC 截图；具体开源与商用版本特性差异以官方文档与许可为准