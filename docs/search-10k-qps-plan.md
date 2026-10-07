# 搜索规模化路线方案 v3

> 2026-10-07 · v1 四席研究→两路盲审大修（v2）→双盲复审四席小修（本版）。
> 定位（v2 裁决维持）：主体=P0 就绪段+三件不可逆（附执行设计与验收）+P1；P2+ 为触发判据附录。
> 复审结论（X1'修复验证/X2'新面/Y1'降维适度/Y2'开工可执行）：v1 的 15 项发现全部真修零残留、现状描述经核实全部为真；但 v2 执行层新伤 2×P0+若干——本版逐项修正。**复审拆解的工时/验收表（Y2'席）作为施工依据：P0+2-1+2-2 合计 7-11 个工作日；今天可直接开工的=快照与 prom 端点两件。**

## 一、P0 就绪段（v2 改"业务验证"为"就绪"——Y1'：仪表安装不验证业务，名实相符）

技术侧三件如下；业务侧（获客/扩 SKU）零覆盖如实声明。**死区收束条款（Y1' 补）**：埋点上线后 **30 天无 P1 信号（零有效流量）即触发方案重审**——或投入业务侧（获客/内容）或项目降级归档，技术侧不再空转等待。

### P0-1 查询埋点（v3 修正挂点——Y2' P0：v2 锚的路由零流量）
- **挂点改锚**：`search.controller.ts:69`（/api/search）**前端零调用，弃**。真实用户路径=index → enhanced-search-component → `/api/products/search`（products.controller:278 → products.service:309 search()）——**埋点挂 products.controller 该链路**，latencyMs 在 controller 入口/出口包夹。
- 存储表 `search_query_log`（归一词/userId 可空/resultCount/latencyMs/created_at+索引）；**migration 用时间戳命名跟现仓惯例**（最新 20261005000001；dev 态 synchronize=isDev 自动建表，迁移文件为 prod 态准备——v2 的"0011"编号作废）。
- 归一词：后端先做小写+trim（现仓已有，popular-search.service:88）；同义词折叠**双份维护裁决**：暂不做（前端 SYNONYM_GROUPS 仅 1 组 4 词，为它建跨端共享层不值——记 BACKLOG 待词表长大后建单一定义源 API）。
- **写路径前置（两席共中补）**：先配 SQLite `journal_mode=WAL`+`busy_timeout`（现仓零配置，默认回滚日志=每 INSERT 独占锁阻塞全部读）；INSERT 改异步 fire-and-forget（不 await，失败仅计数）；表保留策略：90 天滚动删除。
- top-N 小时聚合：@nestjs/schedule（依赖已在）每小时聚合，幂等（重跑按小时键覆盖）。
- **验收**：浏览器实搜一次 → 当日表新增 1 行且 latencyMs>0；并发 20 路搜索压 30s 无 SQLITE_BUSY。

### P0-2 SQLite 每日快照
- `scripts/backup-sqlite.mjs`：`VACUUM INTO` 时间戳副本；**DB 路径解析**：以 backend/ 为 cwd 基准取 backend/data/ 库（仓内两个 dev 库，root/data/ 是空壳 284KB——备份正确的那个）；目标已存在时报错处理；14 份滚动（gitignore backups/ 已通配，零工）。
- 任务计划：`schtasks /Create /SC DAILY /ST 03:00 /TN reich-sqlite-backup /TR "node C:\...\backup-sqlite.mjs"`（注册命令入脚本注释）；失败告警=备份文件 mtime 检查并入 P0-3 面板。
- **验收**：手动跑一次产出快照且 `sqlite3 快照 ".tables"` 表数与源一致；schtasks /Query 可见。

### P0-3 观测最小集
- prom-client（框架无关，NestJS 11 兼容）；**收编设计（X2' 补）**：现状三套指标栈（MetricsInterceptor+JSON 端点/src/middleware/metrics.js/common-monitoring）——新 prom 中间件上线后**旧栈拆除**（不留双轨口径）；route 标签用 route-label.interceptor.ts 现成件（防 URL 基数爆炸）。
- `/api/metrics` 输出 Prometheus 文本；compose prometheus.yml 修正（抓取路径+meili job 补齐——现文件双错：路径 /metrics vs 实际 /api/metrics、格式 JSON）；grafana 三面板（P99/QPS/错误率）。
- **限流分路由（数字修正——X1'：实际生效 100 次/60s 非 300，.env 覆盖了代码默认）**：搜索路由放宽至 6000/60s（=100 QPS，足以产生有效信号）；管理路由**加严**（现状与全局同限，无严限可保持——加严到 100/60s 需显式配置）；app.module 与 app-minimal.module **双模块各挂一份 ThrottlerGuard，改动须双写**。
- 与埋点**同批上线**（放宽无记录=纯窗口）。
- **验收**：curl /api/metrics 含 request_duration_ms_bucket；Prometheus targets 页 UP；压测越限 429 计数入指标。

## 二、三件不可逆动作（v3 修正）

### 2-1 多语言 schema
- 六列（name_en/ja/ko+description_en/ja/ko）结论保留；**否决 JSON 的理由改写（X2'：原理由技术性错误——Meili 支持点号路径嵌套字段进 searchableAttributes，SQLite 有 json_extract）**，真实取舍=六列直查最简+SQL 索引/过滤直接可用，无跨函数层。
- **索引同步面完整清单（三席复核后定为 5+2 处——v2 的"三处"作废）**：①products.service.ts:996 indexProductToSearch（**字段映射源头，漏改则新列根本流不到引擎层**）②meilisearch.service.ts:231 transform③zincsearch.service.ts:314 transform④reindex-meili.mjs⑤reindex-zinc.mjs（另 backend/scripts/reindex-meili.mjs 副本）⑥⑦两处语义输入拼装（products.service:1014 与 reindex 脚本的 `${name} ${description}`——**多语拼接口径需决策**：推荐先只拼接主语言中文，英文列留 P1 查询端 locale 路由时再入向量，避免混合语料降质）。
- **与 2-2 的咬合（两席共中）**：两动作互改对方输入——**顺序定为先 2-2 锁模型后 2-1 加列**（锁模型评测集标注于纯中文语料，结果可比；加列后向量输入若变，排在锁型之后重灌一次即可，不返工评测）。
- 验收：六列灌入后 Meili 文档含新键；grep 新键名在 5 文件同步出现；en 查询命中含英文文案 SKU。

### 2-2 embedding 模型锁定（v3 修正：二模型+时延维度）
- **模型清单修正（两席实锤：0.3B 幻影）**：Qwen3-Embedding 系列只有 0.6B/4B/8B——"0.3B 中文检索版（ritieve_zh_v1）"系上轮盲审把表列名 retrieval_zh 误读为模型名，76.97 数字不在官方表任何行列，**作废**。实测候选=**二模型**：Qwen3-Embedding-0.6B（多语 1024 维）vs gte-multilingual-base（多语 ~0.3B 768 维弹性维）——对照现役 bge-small-zh（纯中文基线）。
- **实测维度补齐（X2' P0：时延缺失）**：质量分（语义组+跨语言组，评测集需从零构建——现 benchmark-engines.mjs 只测引擎不测模型，**评测集构建是 1-2 天子任务含标注**）+**推理时延分**（CPU 每条 ms——0.6B 参数量 25 倍于现役，查询侧若落入 200-600ms 将撞自家 P1 触发线 P99>200ms，**时延不过关直接否决该模型，无论质量分多高**）。
- **已知风险前置（X1'）**：onnx-community/Qwen3-0.6B-ONNX 有 CPU 开箱不工作的公开 issue——第一步备好替代路径（自转 ONNX/optimum 导出/TEI Docker 短路）。
- **参数化前置**：维度硬编码 3 处（embedding.service:48 的 512/meilisearch.service:278 的 embedders dimensions/reindex 脚本内 512+模型路径）改环境变量驱动；**重灌脚本补 delete 步骤**（Meili 换 embedders 维度要求先清空文档，现脚本纯 upsert——X2' 实锤"脚本现成"言过其实）。
- 锁定登记：模型名+维度+指令前缀+灌库日期入 BACKLOG。
- 验收：二模型×（质量分+时延分）对比表落盘 BACKLOG；锁定行可查；语义检索 A/B 抽查通过。

## 三、P1 段（触发后再展开施工细案——Y1'：v2"完整保留"名不副实，本版改口径）

触发信号：埋点连续 7 天 P99>200ms / CPU>60% / SQLite 写争用（注意观察者效应：埋点写本身贡献写争用——判定时看搜索读延迟而非埋点表）。方向：ECS×2+云 SLB；**Meili 自建→云托管**（Meilisearch Cloud $20-204/月起，迁移=索引重灌+网络从 localhost 变公网 RTT 入账+密钥管理；reindex 脚本硬编码 127.0.0.1:7700 需参数化）；SQLite→RDS（PG/MySQL 待 P0 期定，**六阶段方法论骨架保留**：pgloader data-only 空库演练坑/SQLite 无 CDC 须自研增量/灰度切读→维护窗切写——对两选项均适用）；Redis 2GB。**现仓 Meili↔Zinc 自动互备（search-manager 健康监控切换）在 P1 的去留：Zinc 退役或转内网兜底，触发时裁决**。

## 四、P2+ 触发判据附录（数字为盲审修正值）
（同 v2：缓存期望 50-67%/削减 2-3 倍为期望档；GPU 每卡 420-830 emb/s@50token；人力为云成本 4-30 倍；API 溢出 ~167 QPS 不可作降级依赖；P4=Amazon 级触发即另立专项。）

## 五、负面项与未决项（v3 汇总）
1. gte-multilingual-base 的 transformers.js 加载有"unknown model class"告警（可用但需验证）；Qwen3-0.6B ONNX CPU issue 及替代路径（2-2 已前置）。
2. Meilisearch "Enterprise" 公开渠道存在性待证（P2 触发时商务询价）。
3. 全部 QPS/延迟为公开基准或经验量级；本业务实测依赖 P0 埋点闭环。
4. 业务侧（获客/内容生产——Y1：为同期云成本 20-100 倍的必要投入/合规/跨境带宽）零覆盖。
5. 现仓热门搜索对前端输出的是模拟数据（getSearchCounters 自注）——P0-1 埋点上线后此假数据源顺带退役。
6. 双 dev 库（backend/data 与 root/data）待收口——P0-2 备份正确的那个，root 空壳记 BACKLOG 清理。

## 修订记录
- v1：四席研究合并稿。盲审不通过（15 项发现：数字错配×4/依据不成立×2/商业不可达/死区/零设施×2 等）。
- v2：降维重写。复审：15/15 真修零残留、现状描述全真；但执行层新伤（埋点挂点锚零流量路由/幻影模型 0.3B/验收全缺/2-2 体量错标/同步点又数错/0011 幻影编号/WAL 缺失/2-1×2-2 不咬合/JSON 否决理由技术错/时延维度缺失）。
- v3：小修——挂点改锚真实链路/二模型+时延维度/5+2 同步点/时间戳迁移命名/WAL+异步写前置/两动作咬合定序（先锁模型后加列）/JSON 理由改写/死区收束条款/限流实际值 100-6000/P1 口径改"触发后研"并留六阶段骨架/重灌补 delete/双模块双写警示。
