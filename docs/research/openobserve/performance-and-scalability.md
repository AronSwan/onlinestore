# 性能与可扩展性（加强版，依据 README 与目录）

性能定位（README）
- 目标：高性能、PB 级规模；“10x easier”、约 140x 存储成本降低（与 Elasticsearch 对比示例）
- 无需大量参数调优即可运行

摄取与查询
- 批量写入：HTTP Ingest 支持批量 JSON 记录（POST 数组）
- 协议支持：OTLP（logs/metrics/traces）可利用现有采集链路
- 查询：SQL（日志/追踪）、PromQL（指标）

存储与扩展（README）
- 支持对象存储（S3/MinIO/GCS/Azure Blob），便于容量与成本扩展
- 单二进制到 HA 模式的扩展路径

Benchmarks（仓库存在 benchmarks/ 目录）
- 性能对比与方法示例可参考该目录与 README 中的图示与说明

实践建议（不捏造，实现层面遵循 README）
- 客户端侧进行批量与限流
- 标签与字段设计影响查询效率
- 热/冷数据分流（依据业务划分不同 stream）
- 监控 Ingest 成功率与查询延迟，按需扩容与调优