# 搜索规模化路线方案 v2

> 2026-10-07 · v1 四席研究+两路盲审（X1 容量数学/X2 选型依据/Y1 成本务实/Y2 落地可操作）后大修。
> **v2 定位变更（盲审裁决）**：v1 精算于 10k QPS 终态——盲审实证该量级为 Amazon 级平台主搜（日均 1.7-2.9 亿查询），比全球最大家具电商 Wayfair（峰值估算 300-1k QPS）高一个数量级，对 6 SKU 演示态为 5-8 个数量级跃迁且 demo→P1 之间是商业化生死段。v2 降维：**主体=当下可执行的 P0 段+三件不可逆动作（各附落地设计）；P1 完整保留；P2 以上压缩为触发判据附录**（数字已按盲审复核值修正，触发后再研细案）。

## 一、P0 业务验证段（新增——v1 的冷启动死区补齐）

**目标**：从 6 SKU 演示态到 P1 触发点之间的业务+技术就绪段。技术侧三件（与"不可逆三件"合并为施工单）；业务侧（获客/扩 SKU/渠道）超出本方案范围，如实标注：**本方案只解决技术侧，业务侧零覆盖**。

### P0-1 查询埋点（落地设计——修正 v1"有理无路"）
- **挂点**：`search.controller.ts:69` 现有 recordSearch 调用保留；**存储改造**：新 SQLite 表 `search_query_log`（query 归一词/userId 可空/resultCount/latencyMs/created_at+索引），写入直插（放弃现有内存 CacheManager 路径——重启即失，盲审 Y2 P1 实锤）；计数另走异步聚合（top-N 小时表）。
- **字段表**（本周可执行）：归一词=小写+trim+同义词折叠（复用前端 expandQuery 同表）；latencyMs 取 controller 入口-出口差。
- **Windows→云迁移时的日志连续性**：迁移日之前 SQLite 表随库走（pgloader data-only），**埋点先于迁移上线**（不可逆决策 #1 的双向含义）。

### P0-2 SQLite 每日快照（落地设计——v1 宣称的设施本不存在）
- 新 `scripts/backup-sqlite.mjs`：`VACUUM INTO` 带 时间戳副本 → `backend/backups/`（gitignore）；Windows 任务计划程序每日 03:00；保留 14 份滚动。
- P1 迁 PG 后本脚本退役（RDS 自动备份接管）。

### P0-3 观测最小集（v1 的隐藏前置，补为显式条目）
- 后端引入 prom-client（**现状零依赖，Y2 实锤**）：HTTP 中间件打 request_duration_ms 直方图（标签：route/status）+ process 指标；`/api/metrics` 输出 Prometheus 文本（**修正现状 JSON 输出+compose 抓取路径双错**）。
- compose 修 prometheus.yml：抓取路径改 `/api/metrics`、格式期望对齐；**补 meili job**（meili_exporter 或 /health 存活探针起步）；grafana 面板三张（P99 延迟/QPS/错误率）。
- 全局限流阀调整：`ThrottlerGuard` 默认 300 次/60s（均值 5 QPS）**与流量触发信号自锁**——P0 内改为分路由限流（搜索路由放宽至可产生有效信号的档位，管理路由保持严限）。

## 二、三件不可逆动作（附执行设计——修正 v1 无落地路径）

### 2-1 多语言 schema（SKU 上量前）
- **字段形态裁决**：products 表加 `name_en/name_ja/name_ko`、`description_en/ja/ko` 六列（**四列 JSON 方案否决**——Meili searchableAttributes 与 SQL 查询都无法直接用 JSON 键，四列直查最简）。
- 改动面清单：entity+migration 0011+DTO 校验+三处索引同步（meilisearch.service transform/reindex-meili.mjs/reindex-zinc.mjs——v1 只说"两处"，实测三处）+Meili searchableAttributes 加六列+查询端 locale 参数（先只索引侧，查询端 locale 路由留 P1——6 SKU 期无英文买家）。
- **内容生产成本如实入账**（Y1 账外项）：多语言文案+家具摄影 ¥600-5,000/SKU——这是 schema 的真实填充成本，属业务预算非技术预算。

### 2-2 embedding 模型锁定（同口径数字修正——X2 P0-1）
- **修正后的对比**（同榜同列，Qwen 官方 README）：多语均值 Qwen3-0.6B 64.33 vs BGE-M3 59.56（+4.77）；多语检索 64.64 vs 54.60（+10.04）；中文检索 Qwen3-0.6B 71.03。**新发现**：0.3B 中文检索版（ritieve_zh_v1）检索分 76.97 高于 0.6B；gte-multilingual-base（0.3B 多语）为半尺寸替代项。"MRL 独有"修正为"MRL 与 gte/OpenAI/Jina 同类能力并存"。
- **锁定决策改判**：v1 定 Qwen3-0.6B 依据跨榜错配不成立。**6 SKU 窗口期的正确动作=三模型实测**（0.6B 多语/0.3B 中文检索版/gte-multilingual-base，各跑本仓 benchmark 扩展的语义组+跨语言组），**按实测锁型**——盲审把"锁什么"从信仰变成了实验题。
- 执行清单：模型下载（onnx-community 仓）→benchmark 三组跑分→维度/前缀/版本号写入 `embedding.service` 配置→重灌索引（脚本现成）→A/B 验证→**锁定登记**（模型名+维度+指令前缀+灌库日期入 BACKLOG，此即"锁定"的操作定义）。

### 2-3 查询埋点 → 见 P0-1（合并）

## 三、P1 段（≤100 QPS，数字经盲审修正后保留）

- 触发信号：埋点数据连续 7 天 P99>200ms / CPU>60% / SQLite 写争用。
- 动作：ECS×2+云 SLB；NestJS×2；**Meili 自建改托管**（Y1 复核：Meilisearch Cloud $20-204/月 P1 阶段 TCO 低于自建且消灭复制负债——v1"自建"判被推翻）；SQLite→RDS **PG 或 MySQL 待 P0 期用 CDC 生态与团队技能面实测后定**（X2：v1 的 PG 零依据；两者对方案所需能力对等，不预锁）；Redis 2GB（结果+向量缓存）。
- **宿主迁移第零步**（X2+Y2 共中补齐）：Windows→云 Linux 迁移清单——数据（SQLite 文件随迁）、服务（Meili exe→云容器版，索引重灌脚本现成）、域名/DNS/TLS（nginx 终结）、埋点日志连续性（2-1 已排）。**迁移本身一周内可完成，但应在埋点上线后**（决策 #1 双向含义）。

## 四、P2+ 触发判据附录（压缩为一页——细案触发后再研）

| 阶段 | 触发信号（埋点可测） | 方向（数字为盲审修正后的量级参考） |
|---|---|---|
| P2 ≤1k QPS | 缓存命中<40% 且 P99 超限；Meili CPU>70% | Meili 副本化（托管 Enterprise 询价 vs 自建双写——触发时算 TCO）；embedding 切 GPU（**每卡现实吞吐 420-830 emb/s@50token，X1 修正值**；TEI 为基线，vLLM 短序列性能待自测——v1 所引 2.4x 系 Arctic 插件数字，plain vLLM 方向相反）；降级开关建好并演练 |
| P3 ≤5k QPS | 副本 4+ 仍不达标/需灰度 | ES/OpenSearch 云托管评估；K8s；GPU 池扩容（**API 溢出通道上限仅 ~167 QPS（Tier 5 RPM 逐查询口径），不可作为降级依赖**——X1 修正） |
| P4 ≤10k QPS | P99>100ms 常态 | **该量级=Amazon 级平台主搜（Y1 实证），届时业务形态已非本方案可预设计**——判据表到此为止，触发即另立专项 |

**容量数字修正汇总**（X1 复核值替换 v1）：缓存期望 50-67%（TTL 5-30s；80% 需分钟级 TTL 且新查询占比若为文献口径 20-25% 则天花板 75-80%——"15% 新查询"出处未获证实已撤）；削减 2-3 倍为期望档、5-7 倍为乐观档；Meili 单实例 300-1k QPS（16 核+容错+过滤，bench 自测为准）；人力为云成本 4-30 倍（按配置表×市场全成本）。

## 五、负面项与未决项（v2 汇总）

1. 0.3B 检索版/gte-multilingual 的商用许可与多语言实测未验（2-2 实验将覆盖）。
2. Meilisearch "Enterprise Edition" 公开渠道存在性待证（X1）——P2 触发时以商务询价为准，若不存在则副本化只剩自建双写或迁 ES 两路。
3. 全部 QPS/延迟仍为公开基准或经验量级，本业务实测依赖 P0 埋点闭环。
4. 业务侧（获客/内容生产/合规/跨境带宽——Y1 三大账外项）本方案零覆盖，其中内容生产为同期云成本 20-100 倍的必要投入。
5. v1 四席原始报告（含 50+ 来源清单）存于会话记录；本 v2 承重数字的来源为盲审四席报告的复核值（其来源见各席报告文末）。

## 修订记录
- v1（2026-10-07 早）：四席研究合并稿。**盲审不通过**：X1 四项承重数字推翻（GPU 锚点三重错配/缓存乐观行越自设天花板/人力倍数矛盾/API 溢出未核算）+X2 两项依据不成立（模型终裁跨榜错配/vLLM 排除方向引反）+Y1 两项 P0（目标量级商业不可达/冷启动死区）+Y2 两项 P0（触发信号零设施/快照不存在）+共中三项（终态矛盾/Windows 第零步/人力账）。
- v2（2026-10-07）：降维重写——P0 段新增/三件不可逆附执行设计/数字全替换/P2+ 压缩为判据附录。
