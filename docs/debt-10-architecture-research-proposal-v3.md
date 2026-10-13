# 债-10 架构改进方案 v3（修订稿）

> 日期：2026-10-14
> 前版：v2（commit 70e8fc2）——复审 6 路 0 P0 + 12 P1；本版修 12 P1 全部 + 高价值 P2 若干
> 性质：修订稿——仍未立项；三送审轮（学术路引证抽验延续）
> 评审/调研底座：6 员调研 + v1/v2 两轮 12 路评审（37 份归档 `docs/debt-10-archive/audit-outputs/`）

---

## 0. 修订说明

v2 复审核心结论：0 P0（v1 四 P0 全消除）、12 P1。本版变更：
1. **T9 新裁决：W12 退款 intent 两步模式**（v2 唯一架构级遗留）——含 `payment_refunds` 独立表配套
2. **T3/T4 EDPB 足重定位**——EDPB 不直接适用于单库哈希链（学术路裁决），降为同构参考
3. 成文级 10 项全修（类 2 INSERT 时机 / 明文区 HMAC 重算腿 / 验收门修正 / HMAC key gate / 嵌套契约 / TiDB 检测 / 计数 / 公式统一 / T5 标注 / 归档已修）
4. 高价值 P2 顺手修：DDL 列名改 camelCase（消灭映射层）/ 过渡期动态口径 / 演进规则验证侧 / 防抖出处错误 / 兜底间隔角色 / 异步腿三不变式 / id 排除通则

---

## 1. v2 复审 12 P1 响应映射

| # | v2 缺陷 | v3 响应 |
|---|---------|---------|
| 1 | 类 2 PENDING INSERT 时机缺位 | §3.1 图补 INSERT 步 + §3.4 不变式 0 |
| 2 | 明文区在线完整性零机制 | §3.8 R3'' HMAC 重算腿 |
| 3 | 验收门三处失配 | §4.2 重写（判据 2 双 SQL / DEAD 豁免 / 验链脚本排产）|
| 4 | HMAC key 未 gate | §4.1 P1 依赖补"dev 静态 key+轮换禁令" |
| 5 | W9/W10 嵌套契约未写 | §3.1 API 契约行 |
| 6 | TiDB 方言检测失灵 | §3.2 注（检测含 'TiDB' 子串）|
| 7 | 9≠8 计数 | 全文改 8（§1.2/§3.7/§4.1）|
| 8 | recordHash 公式与键表打架 | §3.3 公式改前缀式（键表为权威）|
| 9 | T5 标注缺件 | §2 T5 补理由+分歧保留 |
| 10 | 71 项评审未归档 | **已修**（commit b0310ac，12 份入库）|
| 11 | W12 网关横跨 | §2 T9 裁决 + §3.9 |
| 12 | EDPB 语境迁移 | §2 T3/T4 重定位 |

---

## 2. 协商记录（v3 增补与修订）

**T3/T4（修订）——EDPB 足重定位**
- 学术路裁决：EDPB 02/2025 v2.0 §1 定义 blockchain 为 "a technology that implements a distributed and consistent database without centralised management"；§2 明文 "Blockchains generated and controlled by and for a single entity are out of scope for part of these guidelines"——本仓单库单写者哈希链**不在其 blockchain 定义内**。
- **重定位**：b 变体支撑重排——主动足 = Fabric PDC（工业同构，arXiv:2105.14818 设计出处）+ QLDB redaction（代数同构：data 位→dataHash、链不动）；合规依据回归 GDPR Art. 5(1)(c)/25(1) 本身（D 员 Q3 裁决）；EDPB 降为**同构参考**（迁移方向保守——把对更严苛分布式场景的建议用于更轻单库场景，不扩大义务；EDPB 自留 "could prove useful for any blockchain" 泛化口）
- 来源：【学术路 P1-B 裁决 + 执笔人重排；v2 的"EDPB 首选逐字背书"表述废止】

**T5（补件）**
- 裁决维持三分类；补理由：类 2 事件（系统派生，如 PRODUCT_AUTO_UNLIST）挂进订单事务则审计 INSERT 失败将回滚已成立的订单——可用性代价无 D 员 Q2 依据支撑（四标准零明文要求 fail-closed）；v5 三分类按适用域区分 fail 语义的内核因此保留。
- 分歧保留：B 员原文主张"存储/送达"二分命名且存储侧不分事件类——若按 B 员教义，类 2 也应同事务 fail-closed（接受回滚代价换覆盖绝对性）。此分歧未消解，随裁决带入实施（切换类 2 为同事务是实施期可逆决策）。

**T9（新增）——W12 退款 intent 两步模式**
- C 员实证：`createRefund`（payment-application.service.ts:371-449）域守卫（:394-409）与 save（:425）之间夹 `gateway.createRefund`（:413，外部网络往返）——事务化两难：包进互斥=回调延迟期间全库写排队（实操路 P1）；不包=无事务底座。
- **裁决**：intent 两步——
  ```
  事务 1 [mutex]：域守卫 → INSERT payment_refunds（status='PENDING_GATEWAY'）
                  → INSERT domain_events（REFUND_INTENT_CREATED，类 1 同事务链化）
  COMMIT → gateway.createRefund（锁外，网络）
  事务 2 [mutex]：成功 → refund.status='CONFIRMED' + payments 更新
                       + domain_events（REFUND_CONFIRMED，类 1）
                  失败 → refund.status='FAILED' + lastError
                       + domain_events（REFUND_FAILED，类 1）
  崩溃恢复：兜底扫描 PENDING_GATEWAY 超时行（复用异步腿轮询基建）→ 网关查询幂等回填
  ```
- 来源：【B 员卡2 单资源原则推论（外部资源不进本地事务）+ W9 回调侧同构（网关在外/互斥包落库）+ Stripe authorize-then-capture 业界同构；执笔人裁决】
- 代价（诚实列）：①引入中间态 PENDING_GATEWAY——需超时兜底扫描+对账 R2 扩展（中间态可见）②域守卫流语义从"一步拒绝"变"两步落痕拒绝"（失败也留 intent+事件——审计上是增强）③配套新表 `payment_refunds`（§3.9——同时是 13 席 P0-18"退款落 metadata JSON 无结构化"的深层修复）

---

## 3. 架构方案（修订处标注 ▲）

### 3.1 写路径总设计（分腿）▲ 修订

```
类 1/3（user/admin/敏感 mutation）：
  业务事务 [runExclusiveWrite] BEGIN
    → 业务写
    → 读链头（谓词：WHERE seq IS NOT NULL ORDER BY seq DESC LIMIT 1）
    → seq=prev+1；recordHash=SHA256(prevHash‖canonical)（§3.3）
    → INSERT domain_events（含链列，一步完成，relay_state='INLINE'）
  COMMIT——无 UNCHAINED 窗口；链化失败=业务回滚（fail-closed）

类 2（系统派生）：
  业务事务 [runExclusiveWrite] BEGIN
    → 业务写
    → INSERT domain_events（relay_state='PENDING'，链列全 NULL）▲ 补
  COMMIT——存储侧同事务 fail-closed（B 员分层教义忠实版）
  → EventEmitter2 fire-and-forget → 异步腿 drain：读 PENDING 行 → 补链列+翻 INLINE
    失败重试+死信+告警（送达侧 fail-open）
```

**API 契约（▲ 新增，W9/W10 嵌套契约——v5 死因复发面封死）**：事件写函数**必须**接受调用方 EntityManager（骑调用方事务）、**禁止**自获 runExclusiveWrite、**禁止**自开事务。类 1 与类 2 的 INSERT 共用此契约；异步腿 drain 的补链事务是顶层排队者（非嵌套）。

### 3.2 domain_events DDL（▲ 列名改 camelCase——消灭 canonical 映射层）

```sql
-- sqlite (dev)；MySQL/TiDB (prod) 分支注见下
CREATE TABLE domain_events (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,  -- TiDB: BIGINT AUTO_INCREMENT PRIMARY KEY
  schemaVersion INTEGER NOT NULL DEFAULT 1,
  eventType      VARCHAR(64)  NOT NULL,
  aggregateType  VARCHAR(32)  NOT NULL,
  aggregateId    VARCHAR(64)  NOT NULL,
  correlationId  VARCHAR(128),
  actorType      VARCHAR(16)  NOT NULL,
  actorId        VARCHAR(64),
  occurredAt     CHAR(19)     NOT NULL,   -- 应用生成 ISO 串（DB 生成值禁入 canonical）
  payloadHash    CHAR(64)     NOT NULL,   -- HMAC-SHA256(payload, 表级 key)
  payload        TEXT,                   -- 白名单投影后 JSON（可删区）
  relayState     VARCHAR(16)  NOT NULL DEFAULT 'INLINE',
  attempts       INTEGER      NOT NULL DEFAULT 0,
  lastError      TEXT,
  seq            BIGINT,                 -- PENDING 行 NULL；INLINE 行一步写入
  prevHash       CHAR(64),
  recordHash     CHAR(64),
  createdAt      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_domain_events_seq ON domain_events(seq);
CREATE INDEX idx_domain_events_relay ON domain_events(relayState, id);
CREATE INDEX idx_domain_events_agg ON domain_events(aggregateType, aggregateId, id);
```
▲ 修订注：①列名 camelCase 对齐 canonical 键名与仓内两条既有链（audit_logs/order_snapshots 均 camelCase）——链核按键名直读 row 无映射层（实操路 P2-d 修复）②**方言探测修复**：新迁移的 MySQL 系判定须为 `version.includes('TiDB') || version.includes('mysql') || version.includes('mariadb')`——仓内先例（20261011000001）只判后两者，对真 TiDB（版本串 `8.0.11-TiDB-v…`）误走 sqlite 分支（实操/数据路共抓）③**排除通则成文**：DB 生成值（id/createdAt）一律不入 canonical（逻辑路 F-09——老链 canonical 含 id 是一步写不能照抄的另一半理由）④dev 走 TypeORM synchronize=true 自动建表——本 DDL 是 prod 工件，dev 真源 = 新 entity 文件（与 DDL 逐项对齐纪律同先例）。

**白名单投影**：应用层函数（事件写 API 内嵌强制——两条写腿共用同一入口函数，schema 层无强制力）；字段白名单必要集 = PCI 10.2.2 六要素+资源标识（D 员）；枚举表按 eventType 在实施期定（P1 交付件）。落点：`backend/src/domain-events/`。

### 3.3 canonical 键序（11 键冻结）与哈希公式 ▲ 统一

```
CANONICAL_KEYS = ['schemaVersion','eventType','aggregateType','aggregateId',
  'correlationId','actorType','actorId','occurredAt','payloadHash','seq','prevHash']

recordHash = SHA256(prevHash ‖ '\n' ‖ canonicalString(row))   // ▲ 前缀式——与现行
  // audit-chain.ts:94-95 同族（verify 基建可复用）；canonical 第 9 键已是 payloadHash，
  // 不另拼（v2 §3.1 公式作废——键表为唯一权威）
```
演进规则 + **验证侧闭环（▲ 补，逻辑路 F-08）**：verify 按**行级 schemaVersion 分版本键序**重算——键追加只影响新版本行，旧行按旧键序验，全链 CONTENT 断裂与重锚压力不复现。

### 3.4 类 2 异步腿（参数表 + 三不变式）▲ 补

**不变式（▲ 成文，逻辑路 F-02）**：
0. 类 2 行由业务事务同事务 INSERT（relayState='PENDING'，链列 NULL）——异步腿只补链列+翻 INLINE（读法 A 钉死；读法 B"commit 后才插行"= 崩溃丢事件且重试无物可重试——禁止）
1. 链头读谓词排除 `seq IS NULL` 行（W7 先例）
2. 禁止 INSERT 时预分配 seq——补链时点链头+1（正确算法下 PENDING 行不撞唯一索引；代价：类 2 链序=补链序≠发生序，时间线消费方按 occurredAt 排序）
3. 多实例行认领 = 条件 UPDATE tryClaim 模式（F 员 C11 示范：`UPDATE ... WHERE id=:id AND relayState IN ('PENDING','RESUBMITTED')`）——单实例 dev 不需，prod 多实例启用

| 参数 | 取值 | 出处/性质 |
|------|------|----------|
| 即时触发 | COMMIT 后 EventEmitter2 → drain | F 员 C16 + C 员 W13 先例；**触发风暴合并批处理为待解风险**（F 员 R2 风险行原文——v2 误作机制出处，▲ 改正）——参数实施期定 |
| 兜底轮询间隔 | dev 1min / prod 5min | F 员 C16 原文区间（"once every 1 or 5 minutes"）——▲ 修正 v2 的角色错位（1s/5s 是主轮询区间，兜底应放宽）|
| 批大小 | 50 | 区间 5-100 内选点（推断）|
| 重试 | 5 次上限 / 毒丸线 3（毒丸=同行连续 3 次失败提前死信，避免毒丸占满 5 次）| F 员 C10 |
| 退避 | 2^n 上限 60s | 推断 |
| 死信 | relayState='DEAD' + attempts + lastError | F 员 C13 |
| 告警 | 现行 logger→OpenObserve | 推断；通道升级列 §6 |

### 3.5 双链处置（窄/宽/▲ 动态三口径）

| 口径 | 交付 |
|------|------|
| 窄（audit 链零业务消费）| 治愈——domain_events 消费方：R3'/R3'' 对账 / 外锚 / 时间线（▲ 修订：时间线查询与定时外锚列为**终态构件**，非 P1 交付——v2 F-13 修正）|
| 宽（活跃哈希链数量）| 终态 2→1；**过渡态 P1→P3 期间 = 3**（audit_logs 仍写至 P3 冻结、快照链列 P3 停用）——▲ 补（逻辑路 F-06）|

### 3.6 旧链冻结五写点（同 v2，实测锚不变）
products.controller.ts:174（:211/:539/:562）/ orders.service.ts:218 / audit.controller.ts:387-420（POST /audit/test 停用：**删除路由**（▲ 指明）——dev 测试改走新脚本 `scripts/seed-domain-event.mjs`（▲ 新增排产件））/ audit.controller.ts:318 / 终锚 procedure（verify-audit-chain.mjs --anchor + 头注 `# 冻结于 <ts> seq <n>`——# 行不破坏锚解析器；执行人=协调者，时点=P3 内五写点全改后）。

### 3.7 W1-W13 覆盖表（同 v2 内容——**8 条**事务底座路径 ▲ 修正计数）

| 路径 | v3 处置 |
|------|---------|
| W1-W3 订单 | 类 1 同事务；M5→类 2 腿 |
| W4 删单 | 软删（CANCELLED）+ 类 1 事件 + R1' 反向；**e2e 面注记**（▲ P3 列）|
| W5/W6/W8/W9/W10/W11 | 事务底座改造（mutex 内 BEGIN→业务+事件→COMMIT）；**W6 actor 上下文穿层**（controller→service 传 actor 对象——▲ 实施任务注记）；W9/W10 遵 §3.1 API 契约 |
| W7 旧审计写 | 冻结（§3.6）|
| W12 退款 | **intent 两步（T9）**——非"事务底座改造"类 |
| W13 监听器 | 不变（复用 W2）|

### 3.8 对账（▲ 增 R3''）

- R1'（双向）：切换后订单 100% 有 genesis 事件 + 无孤儿快照
- R2：快照↔支付状态；**▲ 扩展**：PENDING_GATEWAY 中间态可见（T9 配套）
- R3'（逐条）：events JOIN orders/snapshots（aggregateType/aggregateId）
- **R3''（▲ 新增，逻辑路 F-03）**：明文区在线完整性——`SELECT COUNT(*) FROM domain_events WHERE relayState != 'DEAD' AND payload IS NOT NULL AND HMAC(payload) != payloadHash`（=0 绿）——攻击者改 payload 不动 payloadHash 时链全绿的缺口封死；兼验白名单投影未被绕过。关联未决：key 轮换会使旧行 HMAC 失效（§6.1）
- R4：链头→git 外锚

### 3.9 ▲ 新增 payment_refunds 表（T9 配套）

```sql
CREATE TABLE payment_refunds (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  paymentOrderId  VARCHAR(64) NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  currency        VARCHAR(8)  NOT NULL,
  reason          VARCHAR(255),
  status          VARCHAR(24) NOT NULL,  -- PENDING_GATEWAY/CONFIRMED/FAILED
  gatewayRefundId VARCHAR(128),
  lastError       TEXT,
  createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE INDEX idx_payment_refunds_status ON payment_refunds(status, createdAt);
```
（13 席 P0-18"退款落 metadata JSON 无结构化"的深层修复；迁移时存量 metadata.refunds 数组回填——生产切换时另定，dev 无存量。）

---

## 4. 迁移路径与验收（▲ 修订）

### 4.1 阶段表

| 阶段 | 内容 | 依赖 |
|------|------|------|
| P0 | DatabaseModule 挂载修复（TiDB 冒烟——**含方言探测修复验证**）| 无 |
| P1 | domain_events entity+迁移（camelCase/探测修复）+ payment_refunds 表 + **dev 静态 HMAC key（轮换禁令成文）** ▲ + 白名单投影函数 + 验链脚本（新写 verify-domain-chain.mjs，按 INLINE 过滤+行级 schemaVersion 分版本重算）▲ 排产 + 类 1 接管 W1-W3 + 类 2 腿上线 | C 员事实卡 |
| P1 验收 | §4.2 六判据 ▲ | — |
| P2 | 8 条事务底座路径（W4-W6/W8-W11）+ W12 intent 两步（T9）+ 全路径事件覆盖 | P1 验收 |
| P3 | 旧链冻结（五写点+终锚）+ 快照链列停用 + R1'/R3'/R3''/R4 + W4 e2e 面 + W6 actor 穿层 | P2 |
| P4 | erasure 成文（Art 30：payload 明文区留存时限 + HMAC key 指纹外锚）| P2 + §6.1-1 key 设计 |

### 4.2 P1 验收门（▲ 六判据重写）

1. 表迁移双方言跑通：sqlite + **真 TiDB 或版本串含 TiDB 的连接**（▲ 收紧 v2 的"MySQL 兼容库"逃生口——方言探测修复必须对 TiDB 串验证）
2. 覆盖双 SQL：①切换后订单 100% 有 genesis 事件（`orders o LEFT JOIN domain_events e ON e.aggregateId=o.id AND e.aggregateType='order' AND o.createdAt>cutover WHERE e.id IS NULL` = 0）②INLINE 行 seq 非空（`relayState='INLINE' AND seq IS NULL` = 0）
3. 死信演练：注入方式=env 闸 `DOMAIN_EVENTS_FORCE_FAIL=N`（▲ 指明——worker 读此环境变量对第 N 批强制失败）→ attempts 达 5 → relayState='DEAD' + 告警记录可查
4. 白名单烟测：`payload LIKE '%buyerLogonId%' OR payload LIKE '%sellerEmail%'` = 0（▲ 扩双字段；仍为烟测非证明——白名单枚举表评审在实施期）
5. 链验证：verify-domain-chain.mjs 全链 0 断点（**按 relayState='INLINE' 过滤——PENDING 瞬态与 DEAD 永久行豁免**，▲ 判据 3/5 互斥解除；行级 schemaVersion 分版本重算）
6. **▲ 新增** R3'' HMAC 重算腿在 dev 库跑通（=0 绿——白名单投影+key 接线联证）

---

## 5. 引证修订（v3）

- **EDPB 足重定位**（§2 T3/T4）——v2 "EDPB 首选逐字背书"废止；学术路提供的定义/范围条款原文（"without centralised management" / "single entity are out of scope for part of these guidelines"）入协商记录
- 防抖合并出处改正（F 员 R2 风险行，非 C16 机制）
- 兜底间隔出处改正（C16 原文 1-5min）
- E 员卡【8】QLDB 引文块的混入转述段（学术路 P1-A）——本稿只引已验主句（"permanently delete...journal storage"），转述段不引
- E【4】GCP"24 小时调度"数字失真（学术路 P2-C：现页 30 天+45 天）——不引
- 计数勘误：E 员精读清单 18 项（v2 枚举漏 AWS 停服清单）；F 员实锚 17 条（C9 缺号——F 员自报 18 与存档不符，以存档 17 为准）

---

## 6. 未决与免责

### 6.1 技术未决（v2 的 7 项 + ▲ 增 2）
1. HMAC key 管理（生成/存储/轮换/销毁+指纹外锚格式）——P1 用 dev 静态 key+轮换禁令过渡 ▲；**key 轮换与 R3'' 的相互作用**（旧行 HMAC 失效）▲ 新增
2. 双主体行 per-subject DEK（Red Badger 升级路径）
3. b 裁决备份副本残余风险（NIST 盲区同源）
4. 定时外锚机制（容器写 git=决策 #7 禁止）
5. 告警通道升级
6. 事件量级实测（Crosby-Wallach 判据；链→Merkle 升格触发条件）
7. W8/W11 mutex 必要性核查（并入 P2 底座改造时裁决）
8. ▲ 触发风暴合并批处理参数（F 员 R2 风险）
9. ▲ PENDING_GATEWAY 超时阈值与网关幂等回查的网关侧支持（T9 配套）

### 6.2 程序未决
10. 13 席 §8.4 v6 立项六问（未答——转实施前必补）
11. 10.3.3 封存链全量导出外发
12. 生产切换存量回补口径

### 6.3 历史命中率
| 项 | 命中率 |
|----|--------|
| 文档层（v1-v5 汇总 + 方案 v1/v2）| 7 轮 0 过（v2 复审 0 P0 但 12 P1 未清）|
| 方向（outbox/单一真源/分腿/b 变体）| 三轮评审 0 否定；b 变体经学术路 EDPB 足降级后仍有 Fabric/QLDB 双足 |
| v3 新增引证 | 0（本版未新增外部引证——只重定位/修正 v2 已有）|

### 6.4 免责
本稿未立项、无工期、无治本率数字；T9/T5 为执笔人裁决（分歧保留随文）；v2 复审的 15 P2/18 P3 未全修（本版只修高价值项——其余随实施期吸收或下轮清理）。

---

## 7. 下一步中性选项

| 选项 | 立场（用户填）|
|------|--------------|
| α | 三送审：评审席对 v3 复审 |
| β | 立项（补 13 席六问后按 §4 实施）|
| γ | 未决项专项（HMAC key 管理设计）|
| δ | 用户自定义 |
