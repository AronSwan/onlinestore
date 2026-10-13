# 债-10 架构改进方案 v2（修订稿）

> 日期：2026-10-14
> 前版：`debt-10-architecture-research-proposal.md`（v1，commit 958f07d）——经评审席 6 路 71 项发现 + 执笔人自审，**不可用**
> 本版性质：修订稿——已修 v1 的 4 P0 + 16 P1 中 15 项（响应映射见 §1），**仍未经独立评审、未立项**；E/F 两员新引文未独立复验（送审轮由学术路抽验）
> 调研底座：6 员（A 学术 12 卡 / B 工程 22 卡 / C 架构事实卡 / D 合规 24 引文 / E crypto-shredding 18 卡 / F 中继选型 18 卡）——原文 6 份已归档 `docs/debt-10-archive/audit-outputs/research-*.txt`

---

## 0. 修订说明（不设"一句话方案"——评审 P0-2 教训）

v1 的核心缺陷：① 三承诺互斥（保链×禁重锚×erasure）未察觉；② "三根因在结构上同时消失"为无限定承重宣称；③ 五大构件停在命名层。

v2 的核心变更（每项来源见 §2 协商记录）：
1. **互斥三角裁决**：链不含明文（E 员统一前置事实）——recordHash 锚 PII-free canonical + payloadHash=HMAC(payload)
2. **链化分腿**：类 1/3 事件同事务一步链化（无 UNCHAINED 窗口）；类 2 系统派生事件异步腿（重试+死信）
3. **双链处置明确**：快照链列停用（活跃链 2→1），旧 audit_logs 冻结封存
4. **技术前置件补齐**：DDL / canonical 键序 / 中继参数 / 冻结写点清单 / W1-W13 覆盖表 / 验收门定义 / 存量口径

---

## 1. 评审 71 项响应映射（v1 缺陷 → v2 条款）

### 1.1 四项 P0

| v1 缺陷 | v2 响应 |
|---------|---------|
| P0-1 三承诺互斥三角 | §2 T3/T4 联合裁决 + §3.2（链不含明文）+ §6 未决（HMAC key 管理） |
| P0-2 §0 "双链冻结/三根因消失"失真 | §0 改修订说明体；§3.5 活跃链 2→1 的窄/宽口径分列 |
| P0-3 幽灵引文（Hicks 逐字句不存在）| §5.2 换锚为原文实际表述（评审学术路已给换锚材料）|
| P0-4 幽灵引文（Cloudflare CA grace 句不存在且主语相反）| §5.2 删除，换用原文实际 MMD 句 |

### 1.2 十六项 P1（摘要——逐项有响应条款）

| v1 缺陷 | v2 响应 |
|---------|---------|
| domain_events 无 DDL/键序 | §3.2 DDL + §3.3 canonical 键序 |
| 中继零参数 | §3.4 参数表（F 员出处区间）|
| 冻结五写点零清单 | §3.6 |
| PII 时序倒置 | §3.2 白名单投影入 P1 schema（建表即有）|
| autocommit 路径无事务底座 | §3.7 W1-W13 覆盖表（9 条路径标注"先造事务底座"）|
| M5 循环去向 | §2 T5 + §3.4 类 2 异步腿替代 |
| P1 验收门未定义 | §4.2 五项判据 |
| v5 落选"死锁不可修"失准 | §5.1 重写（真因=log() 自带第二事务；修补版 v5 死因为 C5 重锚+零消费）|
| "协商一致"无锚 | 全文改协商记录制（§2，每裁决标注来源/执笔人裁决/分歧保留）|
| 错卡 B 卡11 | §5.1 修正为 A 卡11 |
| "6 路代码实测"双不符 | §5.1 改"三路代码实测"（13 席核实数据/实操两路+调研 C 员）|
| 虚构流传地 | §5.1 删除 |
| "日订单<万"无源 | §5.1 删除，改"量级待实测（开放项）" |
| 背书无历史命中率 | §6.4 命中率表（含本仓 6 轮文档 0 过记录）|
| 无中性选项表 | §7 中性选项（送审/立项/专项）|
| W6/W9/W10 挑报 | §3.7 全 13 路径覆盖表 |

---

## 2. 协商记录（分歧记录制）

> 体例：每个裁决 = 各员立场并陈（带原文锚）→ 裁决 → 来源标注【X 员原文 / 执笔人裁决+理由 / 分歧保留】

**T1 单一真源 vs 快照保留**
- A 员：QLDB "exactly one journal"、日志=真源状态=派生（research-A 卡3/卡6）
- C 员：order_snapshots 已同事务 fail-closed，业务消费在（时间线/R2 对账）（research-C §1.2）
- B 员：主流电商全是快照/变更记录路线（research-B §三）
- **裁决**：domain_events 为唯一链化真源；order_snapshots 保留为**业务投影**（查询性能/R2），其链列停用（新行恒 NULL，旧行保留）
- 来源：【执笔人裁决——理由：A 员完整性立场与 B 员工程惯例的交集=链唯一、表可留；分歧保留：A 员立场更强（快照表可完全派生），保留快照表是查询性能取舍非完整性必需】

**T2 链化时机（v2 最大变更）**
- v1（执笔人）：全中继化——被评审抓 UNCHAINED 空窗（P2-L2）+中继与业务 FIFO 竞争未评估（P1-L1）
- A 员：Oracle/Azure 由引擎在插入事务内算哈希=构造性原子（research-A 卡4/卡5）
- C 员 C6：旧链两步写根因="哈希字节=驱动原生行回读（防 Date 往返漂移）"（research-C §5）
- B 员：outbox 链化外移（research-B §一）
- **裁决**：**分腿**——类 1/3（user/admin/敏感 mutation）事件**同事务一步链化**；类 2（系统派生）事件**异步腿**（fire-and-forget+重试+死信）。一步链化的成立前提：新表 canonical 输入全部为应用侧字符串（occurredAt 应用生成 ISO 字符串，无 DB 生成 Date 字段入 canonical）→ 无回读需求 → C6 两步写根因在新表消除
- 来源：【执笔人裁决——理由：C 员 C6 根因分析 + A 员引擎内一体教益 + B 员分层教益的组合；**此裁决未与 B 员原文碰撞（B 员倾向外移）——分歧保留**：B 员外移方案在多实例高并发下更优，本仓单写者低量级下同事务一步链化的 UNCHAINED 窗口=零，代价更低】

**T3+T4 链拓扑 × erasure（互斥三角联合裁决）**
- E 员统一前置事实：本仓 recordHash（canonical 含明文）与 QLDB/Fabric 可删形态**代数不相容**——先例共同第一步="写入时链就不含明文"（research-E Q3）
- E 员选项空间：a crypto-shredding（工程强/监管打折）/ b 链锚哈希不锚明文（强，EDPB 首选）/ c 分段链（弱-中）/ d 匿名化论证（中）/ e 复合 b+a（强-中）
- EDPB 02/2025 v2.0 §5.2："not advisable to register personal data in those forms on a blockchain. Instead, personal data...should be stored off-chain"（research-E【13】）
- **裁决**：**b 变体**——链锚 = PII-free canonical + payloadHash（HMAC-SHA256(payload, 表级 key)）；payload 明文住事件表可删区（白名单投影后）；表级 HMAC key 先行（per-subject DEK 留 d 论证后升级）
- 来源：【E 员选项空间 + 执笔人裁决——理由：b 的文献支持度最强（Fabric PDC 工业实现+EDPB 首选+QLDB 同型）且工程代价低于 a/e（无密文字段查询问题）；**分歧保留**：a/e 的密码学删除对备份/冷区副本的覆盖更彻底（E 员 NIST 备份盲区警告对 b 同样适用——b 的明文区备份副本是残余风险，靠留存策略控制）】

**T5 fail 语义三分类去留**
- v5 提案：三分类（user/admin mutation fail-closed / 系统派生 fail-open / 敏感 admin fail-closed）
- B 员：业界统一分层=存储 fail-closed+送达 fail-open
- D 员 Q2：四标准均无"审计失败须阻断业务"明文
- **裁决**：三分类保留但重述——类 1/3=同事务链化（存储 fail-closed）；类 2=异步腿（fail-open+重试+死信+告警——D 员 Q2 条件件兑现）
- 来源：【v5 三分类合理内核 + B 员分层 + D 员条件件的合成；执笔人裁决】

**T6 中继形态**
- F 员五路线：R1 纯轮询（强）/ R2 双触发（中-强）/ R3 TiCDC 触发（中，双方言分叉）/ R4 TiCDC 直连（弱，结构性不可行）/ R5 生态件（中，职责错配）
- **裁决**：类 2 异步腿采用 **R2 双触发**（提交后 EventEmitter2 即时 drain + 兜底轮询）——与 T2 分腿设计天然契合（进程内、无新组件）
- 来源：【F 员 R2 路线 + C 员 W13 先例（EventEmitter2 已验证）；F 员已标注 R2 主文献为个人工程博客（权威层级低于 R1）——此弱点随裁决带入】

**T7 旧链处置**
- **裁决**：audit_logs 冻结封存——停写（五写点清单 §3.6）+ 终锚（verify --anchor 追写）+ 封存声明（docs/audit-chain-head.txt 头注 + BACKLOG 挂账）；永不重锚、永不加列
- 来源：【执笔人裁决——A 员新纪元教益；分歧保留：D 员 Q5 的 10.3.3"及时外发到难改介质"要求对封存链的备份外发（git 外锚之外的全量导出）未在 P1-P4 排入，列 §6 未决】

**T8 存量口径**
- C 员实测：30 单 orders / 快照 0 行 / audit_logs 1603 行
- **裁决**：**不回填**。验收口径按"切换时间戳后新写全覆盖"（R1' = createdAt > cutover 的订单 100% 有 genesis 事件行）；存量标记 legacy 区间
- 来源：【执笔人裁决——理由：dev 库 30 单非生产资产；**分歧保留：生产数据切换时的存量回补口径未定（本裁决仅适用 dev）**】

---

## 3. 架构方案 v2

### 3.1 写路径总设计（分腿）

```
类 1/3（user/admin mutation：订单创建/更新/状态、支付、退款、商品变更）：
  业务事务 [runExclusiveWrite] BEGIN
    → 业务写
    → 读链头 (seq, prevHash)            ← 单写者下无竞争（C2/C3 同构于现行 W7）
    → seq=prev+1, recordHash=H(canonical‖payloadHash)
    → INSERT domain_events（含链列，一步完成）
  COMMIT                                ← 无 UNCHAINED 窗口；链化失败=业务回滚（fail-closed）

类 2（系统派生：PRODUCT_AUTO_UNLIST 等）：
  业务事务 COMMIT 后
    → EventEmitter2 fire-and-forget（现行 census⑤ 模式不变）
    → 异步腿 worker：读 relayState=PENDING 行 → 补链列 → 失败重试+死信+告警
                                        ← fail-open+兜底（D 员 Q2 三条件兑现）
```

### 3.2 domain_events DDL（双方言）

```sql
-- sqlite (dev) / MySQL 协议 (TiDB prod) 双分支迁移（仓内先例：20261011000001）
CREATE TABLE domain_events (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,   -- TiDB: BIGINT AUTO_INCREMENT PRIMARY KEY
  schema_version INTEGER NOT NULL DEFAULT 1,
  event_type     VARCHAR(64)  NOT NULL,   -- ORDER_CREATED / ORDER_UPDATED / PAYMENT_SUCCEEDED / REFUND_CREATED / PRODUCT_AUTO_UNLIST / ...
  aggregate_type VARCHAR(32)  NOT NULL,   -- order / payment / refund / product
  aggregate_id   VARCHAR(64)  NOT NULL,
  correlation_id VARCHAR(128),            -- 'payment:<merchantOrderId>' / requestId
  actor_type     VARCHAR(16)  NOT NULL,   -- USER / ADMIN / SYSTEM / SYSTEM_LISTENER
  actor_id       VARCHAR(64),
  occurred_at    CHAR(19)     NOT NULL,   -- 应用生成 'YYYY-MM-DD HH:MM:SS'（不入 DB Date——C6 根因消除）
  payload_hash   CHAR(64)     NOT NULL,   -- HMAC-SHA256(payload, tableKey)——链锚，不含明文
  payload        TEXT,                   -- 白名单投影后的 JSON（可删区——T3/T4 裁决）
  relay_state    VARCHAR(16)  NOT NULL DEFAULT 'INLINE',  -- INLINE / PENDING / DEAD
  attempts       INTEGER      NOT NULL DEFAULT 0,
  last_error     TEXT,
  seq            BIGINT,                 -- 链列（PENDING 行 NULL；INLINE 行一步写入）
  prev_hash      CHAR(64),
  record_hash    CHAR(64),
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP   -- DB 生成，不入 canonical
);
CREATE UNIQUE INDEX idx_domain_events_seq ON domain_events(seq);
CREATE INDEX idx_domain_events_relay ON domain_events(relay_state, id);  -- 异步腿扫描谓词
CREATE INDEX idx_domain_events_agg ON domain_events(aggregate_type, aggregate_id, id);
```

**白名单投影（P1 schema 的组成部分——评审 P1-L6 修正：建表即有）**：payload 落库前经投影函数——字段白名单（D 员 PCI 10.2.2 六要素+资源标识为必要集）+ 既有 log-sanitizer 黑名单掩码兜底；buyerLogonId/sellerEmail/钱包地址不进 payload（进 keyed 索引字段的需求留 §6 未决）。

### 3.3 canonical 键序（开局冻结——C5 教训的兑现）

```
CANONICAL_KEYS = [
  'schemaVersion', 'eventType', 'aggregateType', 'aggregateId',
  'correlationId', 'actorType', 'actorId', 'occurredAt',
  'payloadHash', 'seq', 'prevHash'
]  // 11 键。不含 payload 明文、createdAt、relayState/attempts/lastError（中继元数据）
```
演进规则：只允许追加键至尾部+schemaVersion 递增（新纪元，A 员路线③）；插入中部或改语义=重锚=禁止（D 员 Q6）。

### 3.4 类 2 异步腿参数（F 员出处区间；推断项明标）

| 参数 | 取值 | 出处/性质 |
|------|------|----------|
| 即时触发 | 业务事务 COMMIT 后 EventEmitter2 → 防抖合并 drain | F 员 C16（JIT 原文）+ C 员 W13 先例 |
| 兜底轮询间隔 | dev 1s / prod 5s | F 员区间 500ms-5s 内选点（**推断**）|
| 批大小 | 50 | F 员区间 5-100 内选点（**推断**）|
| 重试上限 | 5 次 / 毒丸线 3 | F 员 C10（TRX_MAX_ATTEMPTS=5/POISONOUS=3）|
| 退避 | 2^n，上限 60s | F 员 C12"retried with backoff"（系数**推断**）|
| 死信 | relay_state=DEAD + attempts + last_error | F 员 C13 |
| 告警通道 | 现行 logger→OpenObserve | **推断**；D 员"通道弱"缺口列 §6 未决 |

### 3.5 双链处置（窄/宽口径分列——评审 P0-2 修正）

| 口径 | v2 交付 |
|------|--------|
| 窄（audit 链零业务消费）| **治愈**——domain_events 有三个消费方：R3' 对账 / 外锚 / 时间线查询 |
| 宽（活跃哈希链数量）| **2→1**——audit_logs 冻结（停写）；order_snapshots 链列停用（新行恒 NULL，旧行保留）；唯一活跃链=domain_events |

### 3.6 旧链冻结五写点清单（评审 F4 修正）

| # | 写点 | 锚 | 处置 |
|---|------|-----|------|
| 1 | auditProductWrite | products.controller.ts:174（调用 :211/:539/:562）| 改写 domain_events（类 1，商品路径事务化）|
| 2 | M5 审计循环 | orders.service.ts:218 | 改类 2 异步腿 |
| 3 | POST /audit/test | audit.controller.ts:387-420 | 停用（管理员测试入口改走 dev 脚本）|
| 4 | POST /audit/cleanup | audit.controller.ts:318 | 已是诚实 no-op，保留 |
| 5 | AuditService.log 其余生产调用 | 全仓 grep=上述 3 文件 | 随 1-3 全改后 log() 无生产调用方=停写达成 |

终锚 procedure：`verify-audit-chain.mjs --anchor` 追写 docs/audit-chain-head.txt + 封存声明（BACKLOG 挂账行 + 头注"冻结于 <ts>, seq <n>"）。

### 3.7 W1-W13 全路径覆盖表（评审 P1-4/W6-W13 挑报修正）

| 路径 | 现状（C 员锚）| v2 处置 |
|------|--------------|---------|
| W1 订单创建 | 事务+快照同事务，M5 锁外 | 类 1 事件同事务；M5→类 2 腿 |
| W2 订单更新 | 事务+快照 | 类 1 同事务 |
| W3 updateStatus | 生产零调用 | 类 1 同事务（随 W2 结构）|
| W4 订单删除 | **裸删无任何覆盖** | 改软删（status=CANCELLED）+ 类 1 事件 + R1' 反向孤儿检查 |
| W5 商品更新 | mutex 包两段 autocommit | **事务底座改造**：mutex 内 BEGIN→业务+事件→COMMIT |
| W6 商品建删+控制器审计 | 单语句 autocommit+事后审计 | **事务底座改造**同 W5；控制器事后审计改类 1（入事务）|
| W7 旧审计写 | log() 自带 mutex+事务 | **冻结**（§3.6）|
| W8 支付单创建 | 无 mutex 单语句 | **事务底座改造**（mutex+BEGIN+事件）|
| W9 支付回调 | mutex 包写段（无显式 BEGIN）| mutex 内加 BEGIN+事件（类 1）|
| W10 支付同步 | 同 W9 | 同 W9 |
| W11 支付关闭 | 无 mutex | **事务底座改造**同 W8 |
| W12 退款 | **0 audit/0 snapshot/0 mutex** | **事务底座改造**+类 1 事件（修复零覆盖）|
| W13 支付→订单监听 | 事件锁外 emit+重入队 | 不变（复用 W2）|

**9 条"先造事务底座"路径**（W4-W6/W8-W12）：v1 隐藏的工作量在此显式列出——每条 = runExclusiveWrite 包显式事务 + 事件行同事务。

### 3.8 对账改造

- R1'（双向）：每单（createdAt>cutover）≥1 条 genesis 事件 + 无孤儿快照
- R2：不变（快照↔支付状态）
- R3'（逐条）：events JOIN orders/snapshots ON (aggregateType='order', aggregateId)——correlation_id 可追溯支付/退款链
- R4：domain_events 链头 → git 外锚（复用 anchor 机制；"定时外锚"机制缺口列 §6）

---

## 4. 迁移路径 v2

### 4.1 阶段表（PII 前置——评审 P1-L6 修正）

| 阶段 | 内容 | 依赖 |
|------|------|------|
| P0 前置 | DatabaseModule 挂载修复（TiDB 接线冒烟）；W8/W11 mutex 核查（并入 P1 事务底座，**不单独成行**——评审 P2-6 修正）| 无 |
| P1 | 表迁移（双方言）+ **白名单投影函数**（建表即有）+ 类 1 接管订单路径（W1/W2/W3）+ 类 2 腿上线 | C 员事实卡 |
| P1 验收 | §4.2 五判据 | — |
| P2 | 事务底座改造 9 路径（W4-W6/W8-W12）+ 全路径事件覆盖 | P1 验收 |
| P3 | 旧链冻结（五写点+终锚+封存声明）+ 快照链列停用 + R1'/R3'/R4 对账改造 | P2 |
| P4 | erasure 成文（Art 30 记录：payload 明文区留存时限+HMAC key 指纹外锚）| P2 |

（快照链列降级已从"可分离 P4"改为 P3 方案内动作——评审 P1-L5"可分离项被验收绑架"修正：验收行不再依赖任何可分离项）

### 4.2 P1 验收门（五判据——评审 F9/P1-L5 修正）

1. 表迁移 sqlite+TiDB（或 MySQL 兼容库）双方言跑通（迁移脚本 dry-run 实证）
2. W1/W2 订单事件 INLINE 率 100%（SQL：`SELECT COUNT(*) FROM domain_events WHERE relay_state='INLINE' AND seq IS NULL` = 0）
3. 类 2 死信演练：注入失败→attempts 达 5→relay_state=DEAD+告警记录可查
4. 白名单生效：`SELECT COUNT(*) FROM domain_events WHERE payload LIKE '%buyerLogonId%'` = 0（切换后窗口）
5. 链验证：verify 脚本对 domain_events 全链 0 断点

---

## 5. 引证修订（v1 §5/§6 的错误处置）

### 5.1 更正

| v1 错误 | 更正 |
|---------|------|
| "B 卡6/卡11"（Overeem）| **A 卡11**（B 卡11=sqlite busy_timeout）|
| "6 路独立审核代码实测相符" | 三路代码实测：13 席核实的数据/实操两路+调研 C 员 |
| "此错曾在 13 席 P0-7 与 v2 §1.2 流传" | **删除**（虚构——10.4.1.2 出自调研任务书，D 员已纠）|
| "日订单<万" | **删除**——量级待实测，Crosby-Wallach 判据适用性为开放项 |
| v5 落选"死锁不可修（结构性）" | 重写：v5 死锁真因=log() 自带第二互斥与事务（db-write-mutex.ts:26 × audit.service.ts:202）；修补版 v5 理论可修（改 log() 接受调用方事务），实际死因为 C5（加列=第 3 次重锚）+零消费冗余+三分类语义矛盾未解 |

### 5.2 幽灵引文处置（评审 P0-3/P0-4）

| 幽灵句 | 处置 |
|--------|------|
| Hicks "The operator could use editorial control to exclude specific events..."（原文不存在）| 换锚为原文实际表述：Table I "Control over logging (EC. IE)"（威胁行）+ §IV-B "...the ability of a malicious system operator...that attempts to compromise what makes it to the log in the first place"（arXiv:2305.01378 v3，评审学术路核验材料）|
| Cloudflare "the certificate authority is allowed a 24 hour grace period"（原文不存在且主语相反）| 换锚为原文实际句："it must be incorporated into the list within a pre-set grace period called a maximum merge delay (MMD), which is usually 24 hours"（blog.cloudflare.com，评审学术路核验材料）|

### 5.3 新增引证（E/F 员，未独立复验——送审轮抽验）

E 员 18 卡（EDPB 02/2025 v2.0 / NIST SP 800-88r2 / QLDB 存档×2 / Fabric PDC+TSC / arXiv 2105.14818・2210.04541・1907.07099 / Perlman / AWS+GCP KMS / WP216 / Red Badger×2 / AEPD / CNIL）；F 员 18 条（TiCDC×4 / litestream×2 / microservices.io 子页 / Debezium / AWS PG / Confluent / JIT 博客 / OneUptime / 生态件 README×4 / SQLite session）。**本稿对 E/F 引文零二次核验——按本仓纪律，送审轮学术路必须抽验**（v1 教训：A 员两处幽灵引文正是评审轮抓出）。

---

## 6. 未决与免责（诚实列全）

### 6.1 技术未决
1. HMAC key 管理（生成/存储/轮换/销毁流程；指纹外锚格式）——d 匿名化论证的前置
2. 双主体行（buyerLogonId+sellerEmail 同行）的 per-subject 处理——现按表级 HMAC（E 员 Red Badger 多主体 DEK 为升级路径）
3. b 裁决的残余风险：payload 明文区的**备份副本**不受链保护也不受删键覆盖（NIST 备份盲区同源警告）——留存策略控制，未闭环
4. "定时外锚"机制（容器化后端写 git 工作区=设计决策 #7 禁止形态）——锚定节奏与执行主体未定
5. 告警通道升级（D 员：30 天滚动应用日志作 10.7.2 证据链偏弱）
6. W8/W11 单语句 autocommit 的 mutex 必要性核查（并入 P1 事务底座时一并裁决）
7. 事件量级实测（Crosby-Wallach 判据适用性；链→Merkle 的升格触发条件）

### 6.2 程序未决
8. 13 席 §8.4 v6 立项六问（批名/责任人/工期/日期/触发/关系）——本稿仍未答（评审 P2-L3：转实施前必须补）
9. 10.3.3 封存链全量导出外发（T7 分歧保留项）
10. 生产切换时存量回补口径（T8 仅适用 dev）

### 6.3 历史命中率（呈报纪律②）

| 项 | 命中率 |
|----|--------|
| 本仓文档层（v1-v5 汇总+本方案 v1）| **6 轮 0 过**（评审 71 项为第 6 轮）|
| 方向本身（outbox/单一真源/分层 fail）| 评审 6 路 0 否定——但"方向未否定"≠"方案可行"，成熟度判据见 §4.2 |
| E/F 新引文 | 0 次独立复验 |

### 6.4 免责
- 本稿为修订稿：未经独立评审、未立项、无工期承诺、无治本率数字
- PCI 适用性仍未确证（条件式结论沿袭 D 员）
- T2 分腿设计为执笔人裁决（未与 B 员原文碰撞）；T3/T4 的 b 变体在 a/e 选项上有分歧保留——见 §2

---

## 7. 下一步中性选项

| 选项 | 立场（用户填）|
|------|--------------|
| α | 送审：评审席对 v2 复审（含 E/F 引文抽验——学术路必到）|
| β | 立项：按 §4 迁移路径实施（补 13 席六问后）|
| γ | 对 §6.1 未决项再专项（HMAC key 管理设计）|
| δ | 用户自定义 |
