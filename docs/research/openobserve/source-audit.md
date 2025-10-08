# OpenObserve 源码核验报告（基于 d:\onlinestore\openobserve）

本报告基于对本仓库 openobserve 源码的并行检索与交叉验证，目的是将研究文档与真实实现“事实对齐”。以下各条均给出典型文件/模块引用，便于进一步钻取与维护。

## 1. 查询与数据栈（DataFusion/Arrow/Parquet）

- Arrow/DataFusion 广泛存在于搜索链路
  - service/search/mod.rs 与其子模块：大量使用 datafusion:: 与 arrow_schema::（如 service/search/mod.rs，service/search/sql/*.rs，service/search/utils.rs）
  - 示例：openobserve/src/service/search/mod.rs 中明确依赖 datafusion 的分布式执行与优化器；openobserve/src/service/search/sql/schema.rs 使用 datafusion::{arrow::datatypes::Schema, common::TableReference}
- Parquet 作为列式落盘与扫描格式
  - service/search/grpc/wal.rs 与 service/search/grpc/storage.rs：以 Parquet 为扫描源，包含 “wal->parquet->search” 路径与统计日志
  - service/tantivy/mod.rs：存在从 Parquet 批量构造与写入的路径，并确保 Tantivy 与 Parquet 行数对齐

结论：文档中对 “DataFusion + Arrow + Parquet（列式）” 的技术栈描述与实现一致，且查询与索引层均围绕该组合构建。

## 2. 查询执行与分布式协作

- DataFusion 执行计划与分布式执行
  - service/search/super_cluster/{leader.rs,follower.rs}：在 super cluster 模式下对物理计划进行收集（collect）与统计访问（visit_execution_plan）
  - service/search/datafusion/distributed_plan/*：存在 RemoteScan、Streaming Aggs 等分布式执行/编解码实现
- 统计与缓存
  - service/search/cache/*：对 Arrow/计划解析结果进行缓存与文件统计缓存（FileStatisticsCache）

结论：研究文档中对“分布式执行、计划优化、缓存与统计”的论述可落到上述具体模块。

## 3. WAL（预写日志）与冷热数据读取路径

- WAL 基础设施
  - openobserve/src/wal/*：独立 Crate（文件扩展名 .wal、Reader/Writer、基准测试、单元测试）
  - service/search/grpc/wal.rs：提供 “wal->memtable / wal->parquet” 的查询路径，包含文件加锁/释放与快照时间（snapshot_time）控制
- 与 DataFusion 的衔接
  - service/search/datafusion/storage/wal.rs：将 wal:/// 作为 ObjectStore 注册并以 DataFusion 表进行扫描

结论：文档中关于“先查 WAL 热数据，再查对象存储冷数据”的流程与源码实现吻合。

## 4. 存储与对象存储抽象

- object_store 抽象与多后端
  - service/search/datafusion/table_provider/* 与 storage/*：广泛使用 object_store::{ObjectStore, ObjectMeta}
  - service/stream.rs：S3 与本地的存储类型切换常量（"s3" 与 "disk"）
- Tantivy Puffin 封装
  - service/tantivy/puffin_*：以 blob 元数据（BlobMetadata）组织索引文件，结合对象存储元信息进行读写

结论：README/overview 中的 “本地/对象存储、列式存储 + 索引” 描述与实现一致，且对象存储适配在 DataFusion 执行环境中透明使用。

## 5. PromQL 引擎与生态兼容

- PromQL 解析与函数实现
  - service/promql/*：提供语法元素、运算与函数实现（大量注释链接到 Prometheus 源/文档）
- WAL 与 PromQL 搜索
  - service/promql/search/grpc/wal.rs：PromQL 搜索路径中同样会拉取 WAL 数据以满足最近窗口查询

结论：研究文档可将 PromQL 能力与 WAL/对象存储路径的统一执行链路清晰化。

## 6. OTLP Traces（OpenTelemetry）

- OTLP 接入与数据校验
  - service/traces/mod.rs：使用 opentelemetry_proto::tonic；同时提供 gRPC/HTTP JSON 接口（otlp_proto/otlp_json），包含字段校验、局部拒绝（partial_success）与批处理管道挂载
- 与 Pipeline 集成
  - 追踪摄取时会构造可执行管道并批量执行（与日志/指标路径一致的可插拔处理流程）

结论：文档中关于“原生 OTLP 接入 + 数据管道”的叙述与实现一致。

## 7. Pipeline/VRL 富集与脱敏

- Pipeline 管理与校验
  - service/pipeline/mod.rs：保存、更新、版本控制、实时/定时来源、DerivedStream 标记
- VRL/Transform UDF
  - service/search/datafusion/udf/transform_udf.rs：基于预置的“查询函数”注册 VRL 相关 UDF，用于查询期变换/富集
- 运行期错误与自报
  - service/self_reporting/*：汇总 Pipeline 错误、用量上报等

结论：研究文档可将“摄取期/查询期管道”与“VRL UDF”做成清晰示意图。

## 8. 企业版 Super Cluster（特性门控）

- super_cluster 队列与作业
  - src/super_cluster_queue/*：处理多类事件（alerts、dashboards、pipelines、schemas 等），大量引用 o2_enterprise::enterprise::super_cluster::queue
- 搜索协同
  - service/search/super_cluster/*：leader/follower 协作、工作组（WorkGroup）等
- 特性开关
  - 多处以 #[cfg(feature = "enterprise")] 或 get_o2_config().super_cluster.enabled 门控

结论：overview/architecture 提到的“企业级集群/联邦能力”在源码中以特性门控与企业模块注入方式存在，可在文档中进行清晰标注。

## 9. RBAC / OpenFGA 与认证

- RBAC 与 OpenFGA
  - handler 与 service 层存在“role-based”提示与 OpenFGA 初始化/检查（如 handler/http/request/authz/fga.rs，service/users.rs）
- JWT 等基础认证链路位于 handler 层（如 handler/http/auth/jwt.rs）

结论：README 的“JWT + RBAC”表述基本属实，可补充 OpenFGA 集成与条件启用说明。

## 10. 元数据持久化（SQLite / Postgres / MySQL）

- 迁移工具链支持
  - openobserve/src/migration/{file_list.rs,meta.rs}：支持 sqlite/mysql/postgres 的迁移来源与目的
- 应用内表层
  - openobserve/src/infra/src/table/*：大量针对 sqlite 的写入锁注释（get_lock），并对 postgres/sqlite 的差异化建索引/迁移用例

结论：研究文档的“多后端元数据存储支持”可落到 infra/table 与 migration 模块。

---

## 建议对现有研究文档的增强点

1. 在“架构深度分析”加入数据路径剖面图：WAL → Parquet（对象存储）→ DataFusion → UDF/VRL → 聚合/索引合并 → 输出
2. 在“性能与可扩展性”补充：
   - WAL 热路径与快照截取对尾延迟的影响
   - FileStatisticsCache/对象存储列表缓存的命中/回退策略
3. 在“安全与合规”补充：
   - RBAC 与 OpenFGA 的门控条件与回退路径
   - 企业版与社区版的边界（以特性标记）
4. 在“功能与 API”补充：
   - OTLP Traces 接口的错误处理与 partial_success 逻辑
   - PromQL 与 SQL 并存的边界与各自最佳实践

## 参考的关键源码路径（便于进一步复核）

- 查询与执行：openobserve/src/service/search/**
- WAL：openobserve/src/wal/**，openobserve/src/service/search/grpc/wal.rs
- 对象存储与表提供：openobserve/src/service/search/datafusion/table_provider/**
- PromQL：openobserve/src/service/promql/**
- Traces：openobserve/src/service/traces/mod.rs
- Pipeline：openobserve/src/service/pipeline/**
- Tantivy/Puffin：openobserve/src/service/tantivy/**
- Super Cluster（企业）：openobserve/src/super_cluster_queue/**，openobserve/src/service/search/super_cluster/**
- RBAC/OpenFGA：openobserve/src/handler/http/request/authz/fga.rs，openobserve/src/service/users.rs
- 元数据持久化/迁移：openobserve/src/infra/src/table/**，openobserve/src/migration/**

本报告随代码演进持续更新，若发现事实偏差请以源码为准并提交修订。