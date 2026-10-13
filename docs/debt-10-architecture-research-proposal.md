# 债-10 架构改进方案（方案调研组协商稿）

> 日期：2026-10-14
> 产出：方案调研组 4 员协商（架构现状深读 C / 学术前沿 A / 工程前沿 B / 治理合规 D）
> 方法：带着 3 个已实证 P0 系统根因（6 路独立审核代码实测相符）→ 精读文献（学术 12 卡 + 工程 22 卡 + 合规 24 引文，检索日期 2026-10-14，arXiv ID 全部 export API 核真）→ 协商方案
> 地位：调研组协商稿——**未经评审，未立项，不含实施承诺**

---

## 0. 一句话方案

**以 Transactional Outbox 为骨架：新建单一事件真源表（随业务事务同 INSERT，存储内带 fail-closed），链化/锚定移到事务外中继（送达外带 fail-open + 重试 + 对账兜底），旧双链冻结封存开新纪元——三个 P0 根因在结构上同时消失，且每个构件都有文献与业界先例背书。**

---

## 1. 三根因 × 四员证据 × 方案映射

| 根因（实测锚） | A 学术裁决 | B 工程裁决 | D 合规裁决 | 方案响应 |
|---|---|---|---|---|
| **R1 双链冗余**（audit_logs 1603 行 0 行 orders 消费；order_snapshots 0 行空森林）| CT "single, ever-growing, append-only Merkle Tree"（RFC 6962 §3）；QLDB "exactly one journal"；双链并行无先例；纯哈希链仅低事件量可行（Crosby & Wallach USENIX Sec'09）| Fowler：审计=事件流投影（"easy to serialize the events to make an Audit Log"）；主流电商（Stripe/Saleor/Medusa）全是单事件列表+状态派生 | Q5：双链合一本体无合规要求；附带 10.3.3 外发硬边界 | **单一事件真源表**（新纪元）；旧 audit_logs 冻结封存（不重锚不迁移）；order_snapshots 保留为业务投影（状态时间线）|
| **R2 同事务双写自锁**（db-write-mutex.ts:26 禁嵌套 × audit.service.ts:202 自带互斥+事务）| 文献无任何系统在业务事务内同步调用第二个自带互斥与事务的服务；Oracle/Azure 由引擎在插入事务内算哈希（构造性原子）| Debezium 单资源原则："By only modifying a single resource - the source service's own database - it avoids any potential inconsistencies"；本仓病灶=把 outbox 存储半边做成了第二事务 | （工程问题，合规无介入）| **事件行随业务事务同 INSERT**（无第二 BEGIN、无嵌套）；链化移到事务外中继——自锁从结构消失 |
| **R3 fail-open/closed 同函数并存**（orders.service.ts:215-244 M5 vs v5 提案步 3）| Hicks SoK：操作者 "editorial control"（选择性排除事件）是日志透明性典型威胁——fail-open 审计=把编辑权留给运行时错误；出路仅两条：引擎内一体或业务外异步 | 业界主流分层：**存储内带 fail-closed + 送达外带 fail-open**（Stripe 3 天指数退避 / CT 24h MMD / Debezium at-least-once+幂等+对账）| Q1 异步化无要求（站得住）；Q2 fail-open 无明文禁止，**但现状纯 warn 无补写踩 10.2.1 覆盖义务**——补写队列是兑现手段非可选 | 存储层 fail-closed（事件行与业务原子）+ 中继层 fail-open（重试+死信+告警+对账）——同函数矛盾消失，两层各归其位 |

## 2. 附带病根（C 员实证的负空间事实）同样被方案覆盖

| 病根（实测锚） | 方案响应 |
|---|---|
| W12 退款路径 0 audit/0 snapshot/0 mutex（payment-application.service.ts:371-449）| 事件行随退款事务同 INSERT（覆盖义务兑现）|
| W4 订单删除无 mutex/事务/快照/审计 + 留孤儿快照（orders.service.ts:532-539）| 改软删（status=CANCELLED 路径）+ 事件行；R1 对账补孤儿快照反向检查 |
| 无 AuditInterceptor（从未注册）| 不补拦截器——事件行在 service 事务内写（比拦截器层更靠近事务边界）|
| audit_logs 无 correlationId/entity_id（R3 只能全局存在性检查）| 新事件表原生带 (aggregateType, aggregateId, correlationId) 三元组（Oracle chain_id 同构）——R3 改为可 JOIN 逐条对账 |
| C5 canonical 键序冻结（加列=全链重锚，已发生 2 次）| 新表新纪元（A 员路线③）：schemaVersion 字段开局内置；**旧表永不加列永不重锚** |
| W8 支付单创建/W11 支付关闭无 mutex | 顺带纳入 runExclusiveWrite 或验证单语句 autocommit 安全性 |
| DatabaseModule（tidb→mysql 映射）从未挂载 | 生产化前置项（与本方案正交但必须修）|

## 3. 目标架构（写路径改造前后）

**改造前（现状病灶链）**：
```
订单事务 [mutex] BEGIN → 业务写 → appendSnapshot（同事务）
                       COMMIT
                       ↓（互斥块外）
                       auditService.log() [自己的 mutex + 自己的事务]  ← 第二事务=嵌套即死锁
                       失败 → logger.warn（永久缺失）                   ← fail-open 无兜底
```

**改造后（outbox 化）**：
```
业务事务 [mutex] BEGIN → 业务写 → appendSnapshot（保留，同事务，业务投影）
                        → INSERT event_outbox 行（无链列，同事务）    ← 存储内带 fail-closed
                        COMMIT（原子：业务成功 ⇒ 事件必然存在）
                        ↓（互斥块外，事件总线照旧 fire-and-forget）
中继（进程内定时/事件驱动）：
  读未链化 outbox 行 → 算 seq/prevHash/recordHash → 同中继事务补链列    ← 送达外带 fail-open
  失败 → 重试 + 死信 + 告警（10.7.2 检测告警义务）
锚定（定时/手动）：
  链头摘要 → git 外锚（复用现有 anchor 机制）                          ← digest 外置（QLDB/Azure 教益）
对账（复用 R1-R4 改造）：
  R3' = events JOIN orders/snapshots 逐条（有 correlationId 了）
```

**关键设计裁决（协商一致）**：

1. **新表不叫 audit_logs**——`domain_events`（或 order_events + 通用 aggregateType 列）：语义上是领域事件真源，审计是它的一个投影（Fowler 卡6）；避免旧表 1603 行历史包袱与 C5 canonical 冻结冲突。旧 audit_logs **冻结封存**：停写、锚定当前头、归档声明——永不重锚（QLDB redaction/CT 新纪元教益）。
2. **链式哈希保留但降级为"中继侧完整性层"**——事件量级（日订单 <万）在 Crosby-Wallach 判定的"低事件量可行"域内；真正的防篡改锚点在**外置 digest**（git 锚，已有机制）而非链本身；未来量升或需要 O(log n) 包含证明时，中继侧换 Merkle **不动存储层**（这正是链化放中继侧的红利）。
3. **order_snapshots 不动**——它已经是同事务 fail-closed 且是业务消费体（时间线/对账），主流电商同构（Stripe snapshot 事件/Medusa version）。它的链列同样可择机降级（投影不需要链——真源链已在 events），但这是**可分离的后续项**，不与本方案绑定。
4. **事件总线（EventEmitter2 fire-and-forget）保留照旧**——outbox 中继与进程内事件总线是两回事：前者保"记录必达"，后者保"订阅方解耦"（W13 先例已验证）。中继本身可用轮询（dev/prod 全兼容，TiDB 无 SKIP LOCKED 约束下的稳妥选择）。
5. **PII 与留存（D 员硬边界，必须随方案落地）**：
   - 事件行字段**白名单投影**（PCI 10.2.2 六要素 + 资源标识为必要集），接线既有 log-sanitizer（存在但未接线）——不落 requestParams/responseData 原文（纠偏：DTO 实勘无卡号字段，但 buyerLogonId/sellerEmail/钱包地址是 GDPR 个人数据）
   - **erasure 时限入处理记录**（GDPR Art. 30(1)"envisaged time limits for erasure"）——事件表分层：热区（在线）/冷区（可脱敏归档）；快照 PII 同样定书面期限
6. **重锚禁令成文**——新纪元制：schemaVersion 开局内置，演进只追加新纪元+跨纪元一致性证明（CT 教益），任何"改 canonical 全表重算"按 D 员 Q6 裁决=运营方架空 10.3.4。

## 4. 迁移路径（协商稿，未排期）

| 阶段 | 内容 | 依赖 |
|------|------|------|
| P0 前置 | DatabaseModule 挂载修复（TiDB 接线）；W8/W11 mutex 核查 | 无 |
| P1 | `domain_events` 表 + 中继（轮询）+ 外锚；**只接管新写**（订单/商品/退款路径挂 INSERT）| C 员事实卡 |
| P2 | 旧 audit_logs 冻结封存（锚定声明 + BACKLOG 挂账）；LogSanitizer 接线 + 白名单投影 | P1 验收 |
| P3 | R3' 对账改造（events JOIN）；W4 软删 + R1 反向孤儿检查；退款事件补全 | P1 |
| P4 | erasure 时限成文（Art 30 记录）；快照链列降级评估（可分离项）| P2 |
| 验收 | R1'（双向）/R2/R3'（逐条）/R4（外锚）+ 中继死信告警演练（10.7.2）| 全部 |

## 5. 备选方案为何落选（协商记录）

| 备选 | 落选理由 | 证据 |
|------|---------|------|
| 单表事件溯源（原方向 E）| retrofit 成本最高（"very hard to retrofit"—Fowler）；主流电商订单域无一线公开采用；schema 演进是一等难题（Overeem arXiv:2104.01146）| B 卡6/卡11 |
| SQL:2011 system-versioned tables | **双方言双断路**：sqlite 无此特性、PG 未入核心（"Work to add...is ongoing"）、MySQL/TiDB 无 | B 卡8/卡22 |
| 2PC/XA | TiDB "uses a two-phase commit internally, but this is not exposed via an SQL interface"；microservices.io "not viable" | B 卡22/卡1 |
| DB 原生 ledger 表（Oracle/Azure 式）| sqlite/TiDB 均无原生 ledger；但"引擎算哈希"思想被吸收进中继侧 | A 卡4/卡5 |
| 维持双链修补（v5 路线）| 双链并行文献无先例；同事务双写死锁不可修（结构性的）；第 3 次重锚必发生（C5）| A 节1/节2、C 员根因映射 |

## 6. 引证索引

- **学术 12 卡**：RFC 6962 / Crosby & Wallach USENIX Sec'09 / QLDB 文档 / Oracle DBMS_BLOCKCHAIN_TABLE / Azure SQL Ledger / immudb / Hicks SoK arXiv:2305.01378 / GlassDB arXiv:2207.00944 / Spitz arXiv:2008.09268 / Fabric arXiv:1801.10228 / Overeem arXiv:2104.01146 / Kulkarni & Michels SIGMOD Rec 2012（DOI 10.1145/2380776.2380786）——每卡带逐字引文+ID+检索日期 2026-10-14，arXiv 全经 export API 核真（0 丢弃）；4 条未获原文标"仅线索"
- **工程 22 卡**：microservices.io outbox / Debezium 博客+文档×4 / Fowler ES / SQL Server temporal / PG wiki / sqlite WAL+BEGIN CONCURRENT+busy_timeout / Cloudflare CT-Nimbus / S3 Object Lock / Stripe webhooks+Event×2 / Sequin / Shopify CDC / Medusa×2 / Saleor / Harness audit logs / TiDB 兼容性——逐字引文+URL+检索日期
- **合规 24 引文**：PCI DSS v4.0.1 官方 PDF 13 条（一手）/ GDPR 6 条（准一手镜像）/ SOX 2 / SOC 2 2 / NIST 1；**纠错 1 处：先前卷宗所引"10.4.1.2"在 v4.0.1 不存在，防改写真身=Req 10.3/10.3.2**（此错曾在 13 席 P0-7 与 v2 §1.2 流传，D 员实证纠正）
- 全部调研员原文输出在会话 agent 目录（4 份），可归档备查

## 7. 免责与未决

- 本方案是**调研组协商稿**：未经评审席盲审、未立项、无工期承诺、无治本率数字（按呈报纪律：无锚数字不出门）
- PCI 适用性本身未确证（取决于系统是否碰卡数据——DTO 实勘无 PAN/CVV，但 rawData `Record<string,any>` 透传未验证，须 P2 白名单落实时一并裁决）
- 事件量级判断（"低事件量"域）基于 dev 库 30 单现状推断，生产量级待证
- SOC 2/NIST 引文为二手转引；BSI TR-03151 re-anchoring 细节未逐字验证（标注存疑）
- order_snapshots 链列降级、Merkle 化时机为**可分离后续项**，不构成本方案前置
