# 订单快照方案·调研/审核/定稿全卷（2026-10-10~11）

用户令链："电商快照"（澄清=订单数据快照）→ 方案调研组三席（对标先进+结合本地实际）→ 方案 v2 → 方案审核专家组三席（不预设立场严格审核）→ 方案 v4 → 用户裁决（注销=骨架保留+PII 脱敏[A]）+开工令。本卷=施工正身依据。

## 一、方案 v4 定稿（23 条修订全列）

### 表设计
- `order_snapshots` 表：**(order_id, version) 复合聚簇主键**（TiDB 免自增热点+at-time 一次 KV 直达；勿再加冗余唯一索引——主键 autoindex 已唯一）
- 双存：`changed_fields`（diff，写入时算好做**缓存**；diff 端点以相邻快照推导为准+一致性断言）+ `snapshot`（全量 JSON）
- **user 对象不进全量快照**（PII 防放大，只存 operator_id）；items 含既有 productSnapshot
- 快照 schema 定版+**schemaVersion 字段**（防跨版本伪差）
- `operator_type` 五档（user/admin/system_listener/auto_job/gateway_callback——auto_job 当前为预留枚举）+ `operator_id` + `correlation_id`（paymentOrderId/refundId/requestId）+ `occurred_at`（仅展示）
- 哈希链列 seq/prev_hash/record_hash——**seq≡version 合一**（单一编号）

### 收口与写入（五收口）
| 收口 | 谁走它 | 动作 |
|---|---|---|
| create() 事务 | 下单 | 快照 INSERT 入同一 trx（**禁** AuditService.log 式事务后补——崩溃窗口） |
| update() | 管理端 PATCH、支付回写 markPaymentSucceeded/Failed | 改显式事务：互斥内 SELECT before（轻量 findOne，只取守卫字段）→INSERT 快照→UPDATE |
| updateStatus() | 状态端点 | 同上（真绕行点，生产零调用但 spec 用它驱动） |
| delete() | DELETE /orders/:id（文档宣称软删/实为硬删——顺带修此存量不符） | 写终版快照+真软删（CANCELLED+deletedAt） |
| user-deletion 原生 SQL 删单 | 用户注销 | **裁决 A**：订单骨架保留+PII 脱敏事件行（不物理删——3/10/30 年保存期优先，个保法以脱敏满足） |

### 写入纪律（席C 坑A/B + 席B 三.1）
- **禁嵌套互斥**：链写块参数化接收 EntityManager（直接用订单事务的 trx）——不能照抄 AuditService.log（自带 runExclusiveWrite+独立事务=嵌套自锁死）
- **fail-closed**：快照 INSERT 失败=订单更新整体失败（审计完整性优先）；配可观测补偿——支付镜像失败告警（suppressErrors 盲区）
- 事件发布移到互斥块返回后（防回滚幻影事件）
- 事务内零变化检测：跳过 no-op 快照（防支付双发点并发落重复快照）
- version 递增=事务内 SELECT MAX(version)+1；sqlite 靠全局互斥串行；TiDB 加 FOR UPDATE+复合主键冲突兜底（翻译 409 重试）——**FOR UPDATE 在 sqlite 抛 LockNotSupported，dev 靠互斥/生产靠主键冲突+FOR UPDATE 双防线**
- 哈希 canonical 纪律：**算在回读原生行上**（非实体对象——Date 往返漂移坑，audit 先例）+定键序
- 哈希核心泛化：audit-chain.ts 的 computeRecordHash/verifyChain 加 keys 参数（默认 CANONICAL_KEYS 不变）——**必须带"audit 全链重算字节不变"回归护栏**（单源纪律文件）
- 哈希 canonical 键**排除 PII 路径**（姓名/电话/地址）——PII 由访问控制保护；脱敏动作=写一条新 ANONYMIZED 事件行（脱敏成为被审计的显式状态迁移，不炸链）

### 防篡改与校验（四项对账）
- 每单独立哈希链 + **git 森林锚**：docs/order-chain-heads.txt 追加式——全部 (order_id, headSeq, headHash) 按 order_id 排序后 SHA256 汇总成单行锚（无先例新设计件）+当日订单号清单
- `verify:orders [--anchor]` 命令（exit 0/1/2/3 语义对齐 verify:audit；洗锚防护：MISMATCH 拒绝追加）
- 宣称口径：**篡改可检测（tamper-evident）**，禁说"防篡改/不可篡改"；已知边界=git 锚窗口内+未重锚前提下
- **四项一致性校验**：①链 verify ②锚比对 ③正向对账（每活订单有快照且末版==主表现值）④反向对账（每快照链→活订单或终版快照）+**⑤第三域漂移**：payments SUCCEEDED 但订单未镜像的悬账清单
- 最小 read-only verify 并入阶段 1 尾（窗口期纪律从首日生效）

### 查询面
- 五端点：列表（timeline 分页）/指定版本/?at= 时点还原（取 occurred_at≤T 最大 version，**时钟异常以 version 为准**）/diff（内部）/verify（内部）
- 管理跨单视图：operator/时间范围过滤+**分页限量**（audit verify 无界读教训）；越权=owner-or-admin
- 支付时间线并入：**读 payments 表聚合（禁订阅事件——suppressErrors 静默吞坑）**

### 保存期（法条对齐，含引文限定语）
- 自 completedAt 起 ≥3 年（电商法 31 条底线——义务主体为平台经营者，本仓为自律口径）
- 涉税 10 年（税收征管法实施细则 29 条）/会计凭证 30 年档（会计档案管理办法 79 号令——"订单快照=原始凭证"系解释性映射非条文直接规定）
- 买家 PII：法定义务期满后脱敏（个保法 19 条最短必要+47 条删除义务）——脱敏=ANONYMIZED 事件行
- **负面核验**：《消保条例》"网络销售保存三年"条款不存在（国家行政法规库原文核验）——勿引用

### 明确不做（带理由）
Kafka/独立快照服务（四家业界零采用+Outbox 原文场景=跨服务）/ES+CQRS（回放用快照链+replay 达 80% 收益）/数据库触发器（**TiDB 不支持——一票否决**）/TiDB Stale Read 当审计（**默认** GC 窗口 10 分钟，MVCC 受 GC 支配非 append-only）/Merkle 树（无第三方按需验证场景）/上链锚（密钥管理+出金合规，收益零）/TypeORM "同时产两方言"（错误表述——照仓内先例：dev synchronize+MySQL 方言迁移+sqlite backfill 脚本）

### 运维面（席B 缺失面三件）
- 监控：快照写失败率入 MonitoringService+校验红处置流程（谁看/多久跑/红了找谁）
- 回滚预案：快照写错=创世重锚+git 新锚（backfill 先例+洗锚防护），开工前成文
- 性能预算：每次改单新增延迟目标≤x ms（参考仓内 better-sqlite3 串行 15ms/位基线，施工实测复核）

## 二、排期声明（席B 二.6）
- 快照批先于 W-1 刀2/刀3 动 orders.service（同文件冲突）；顺带修 census⑤（orders create 事务内事件外发→移提交后）
- 支付批一（order.status 联动）/退款回写：挂账行加注"必须经 update() 单调用收口"
- 枚举归一批（OrderStatus×2）：与快照同文件低危冲突，文本记档

## 三、三席调研结论摘要（业界对标/防篡改+合规/落地技术）
- **业界**：主流=事件日志表（Shopify/Saleor/Stripe）或版本化快照（Medusa v2）；temporal table/ES 零采用；Stripe 双存先例（data.object+previous_attributes）；排序不可用时间戳（同秒事件实证）；事件 1 年保留（Shopify）/30 天窗口（Stripe）——事件轨≠永久审计库
- **防篡改**：无锚线性链防不了链尾截断/整单删除（RFC 6962/CloudTrail 实证）；git 锚=本仓已验证最小充分方案；本仓等级=SEC 17a-4 audit-trail 级（留痕可审计+链外锚）
- **落地**：TiDB 无 system versioning/触发器/存储过程（官方 Unsupported）；TypeORM subscriber 三坑（无 before 值/QueryBuilder 不触发/无变化不触发）——快照必须 service 收口显式写；Outbox 场景=跨服务，单体同事务更强；sqlite 单写者串行 vs TiDB 乐观并发；(order_id,version) 聚簇主键两库通吃

## 四、三席审核必改项落实对照
席A 4 项（L1 version 递增/L2 漏写检测→四项对账/L3 delete 收口/L4 PII 出哈希面+ANONYMIZED 事件）+席B 10 项（第五收口/第三域漂移/⑥读库/fail-closed 选边/backfill/schemaVersion/canonical 纪律/监控回滚性能三面/排期/双方言表述）+席C 3 前置（verify:audit 通道复活✅阶段0 已修/seq 合一+TiDB 序列化策略✅/delete+双向对账✅）——**全部纳入 v4 上文**

## 五、工期（阶段 0-4 五段，下限和 6.0 天+风险缓冲=6.5-7.5 天）
| 阶段 | 内容 | 工期 |
|---|---|---|
| 0 | tag+verify:audit 通道复活+本卷归档 | 0.5 天 ✅ |
| 1 | 表+实体+哈希核心泛化(带 audit 字节不变回归)+五收口+TOCTOU+存量 30 单 backfill+spec 返工+最小 verify | 2.5-3 天 |
| 2 | 森林锚+verify:orders --anchor+首锚 | 1-1.5 天 |
| 3 | 五端点+管理视图+支付时间线(读库) | 1 天 |
| 4 | 四项对账命令+测试矩阵 22+ 例(篡改/截尾/并发/幂等现场演示) | 1-1.5 天 |

每阶段独立 commit+tag `order-snapshots/stepN` 可回滚；彻底回退=`git reset --hard order-snapshots/start`。

## 出处（调研+审核引用的一手源，全文略——详见会话卷宗）
Shopify BasicEvent/Stripe Events/Medusa Order Versioning/Saleor OrderEvent 官方文档；RFC 6962+Russ Cox；AWS CloudTrail digest；电商法 31 条/税法实施细则 29 条/会计档案办法/个保法 19 条；TiDB 官方（Unsupported features/GC/Stale Read/JSON/聚簇/auto-random）；TypeORM issues #2246/#4947/#717；microservices.io Outbox；arXiv 2609.01931

### 修订计数账（A2 席 P2-2 补——"23 条"构成可对账化）
- v3 核心 13 条（#1-#13：三席调研综合后的首版修订）
- v4 增 10 条（#14-#23：审核席B 十项必改）
- v4.1 增 8 条（#24-#31：双盲 B2 席盲扫采纳）
- **合计 31 条**；此前"23 条"指 v3+v4（13+10），v4.1 后以 31 为准

## 六、v4.1 增补（双盲审 B2 席盲扫采纳，2026-10-11——2 P0+5 P1 全部落方案）

24. **update() 快照构造算法定稿（P0-1）**：事务内**全量 before 读（含 items relations）→UPDATE→全量 after 回读（含 items）**；snapshot=after 回读；changed_fields=**行差**（before 全量 vs after 回读逐字段比——DTO 幽灵字段 shippingCompany/trackingNumber 永不作源）。守卫时间戳判断仍用轻量读（进事务前预读仅作 fast-path，事务内以全量 before 为准）。
25. **历史快照 PII 注销归宿=读时脱敏（P0-2，裁决 A 的实现层定案）**：快照 JSON 永不改写（at-time 保真+链完整）；已脱敏用户的 PII 字段在**五端点出口层遮罩**（含 ?at= 还原）——出口合规+时点保真两全；遮罩由订单关联用户的脱敏标记驱动。
26. **闭口 5 互斥+INSERT 语义（P1-3/4）**：user-deletion 事务接入 runExclusiveWrite（现状裸跑=复现 M3 交叉事务病）；快照链写一律 **INSERT 语义（禁 save()**——探针实证 save() 撞复合主键静默变 UPDATE，TiDB 409 重试兜底永不触发）。
27. **deleted_at 加列入阶段 1（P1-2）**：迁移文件+触发表行 2 义务（migration:show 附卷）；软删查询语义定案——findAll/findByUserId/getStatistics 一律排除 deletedAt 非空行；软删单 status=CANCELLED 与用户取消以 operator_type 区分。
28. **backfill 三定（P1-5）**：operator_type 第六档 **'backfill'**；occurred_at=订单 createdAt（时间线诚实）；snapshot JSON 带 `"_genesis":true` 标记（管理端展示"创世回填"徽标）。
29. **回归护栏载体（P1-1）**：哈希核心泛化的字节不变证明=committed fixture spec（链核函数直测：固定输入行→断言 headHash 常量+行数下限）；本机 dev 库 verify 为辅（headHash 记入施工令）。空库+无锚=exit 0 的 vacuous 窗口在 spec 层堵死。

29a. **护栏断言形态（A1 席 P3-3 补强）**：Node 26 下 require(ESM) **不抛错而是静默返回空命名空间**（实测：模块体执行/赋值落空/keys=[]/ZERO_HASH=undefined——比崩溃更隐蔽）。fixture spec 对链核加载的断言一律按"**绑定非 undefined 且长度/类型正确**"设计，禁用"期待抛错"式断言。另：backfill-audit-chain.mjs 是第二条 strip-types 加载通道（A1 席 P3-1 勘正"仅此一处"——同断同修已验 exit 0），后续通道改动须两处同测。
30. **锚续锚触发器（P2-1）**：每阶段 tag 前必 `verify:orders --anchor`+锚文件随同 commit（阶段 2-4 验收单条目）——audit 锚 158 行/6 天漂移先例不再复制。
31. **查询索引+列型（P3-1/2）**：管理跨单视图加 (operator_type, occurred_at) 二级索引；occurred_at=UTC ISO 字符串（对齐 audit canonical 先例，跨方言比较语义一致）。

**B1 席治理项同步落实**：G1 支付挂账行收口注✅/G2 W-1 排期注✅/G3 census⑤ 回指✅/G4 step0 tag✅/G5 工期计数勘正✅/触发表行 1 措辞改"依赖清单（package.json/lock）变更"（消除字面/语义两读缺口）。
### 快照 JSON 字段清单（A2 席 P2-3 补钉死）
**进快照 JSON**：订单全标量（orderNumber/totalAmount/status/paymentStatus/notes/paymentMethod）+ 收货三件（recipientName/recipientPhone/shippingAddress）+ items 全量（含 productSnapshot）+ schemaVersion + _genesis 标记（backfill 行）。
**不进快照 JSON**：user 对象（只存 operator_id——PII 防放大）。
**收货三件的纪律**：进快照（?at= 时点还原需要）+ **进哈希（snapshot JSON 整列入哈希——双盲审 B1 席 2026-10-11 定案，依据：#25 读时脱敏使快照永不改写→PII 在快照内不可变→哈希覆盖无害且防篡改更强）** + **读时脱敏对象**（#25 出口层遮罩——已脱敏用户的三件在五端点出口一律遮罩）。三层各司其职：还原保真/链完整（含 PII 不可变保护）/出口合规。~~不进哈希 canonical 键~~（#24 原文已由本定案取代——正身回写消除实现偏离）。
**completedAt=交易完成日起算**：系解释性映射（法条原文"自交易完成之日起"，映射到 DELIVERED 时间戳）——非条文直接规定（A2 席 P3-5 标注）。
**TiDB 建表**：复合主键默认 NONCLUSTERED，DDL 须显式 `PRIMARY KEY (order_id, version) CLUSTERED`（A2 席 P3-7——at-time KV 直达收益依赖此点；MySQL/InnoDB 侧不受影响）。
