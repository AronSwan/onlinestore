# 功能与API

核心功能
- 数据摄取（Ingest）：HTTP JSON、OTLP（指标/追踪）、兼容多种收集器。
- 查询与可视化：对日志与指标进行过滤、聚合、看板展示。
- 告警：基于查询规则与阈值生成告警。
- 多租户：org/stream 管理，Token 控制访问。
- 成本优化：面向高吞吐与低存储成本的实现。

关键 API（以 HTTP Ingest 为例）
- 写入：
  - POST /api/{org}/{stream}/_json
    - Header: Authorization: Bearer {token}
    - Body: JSON 数组，每条为结构化记录（包含 timestamp/labels/value 等）
- 查询：
  - 平台提供查询 UI 与 API（通常支持过滤、时间范围、聚合）；具体语法请参考官方文档。
- 管理：
  - org 与 stream 的创建、Token 管理接口；用于多租户数据隔离与权限控制。

数据字段建议（实践）
- 通用字段：timestamp、source、kind、service、env、level
- 业务字段：email、domain、reachable、latency_ms、error_code 等
- 标签/维度：用于聚合与筛选（如按域/服务/环境）