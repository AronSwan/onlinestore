# 债-10 架构改进方案 v4（修订稿）

> 日期：2026-10-14
> 前版：v3（commit a3e3d76）——三审 2 P0 + 13 P1；本版逐项响应（映射见 §1：2 行 P0 + 13 行 P1，派生：§1 两表行数合计 15）
> 性质：修订稿——未立项；四送审轮
> 计数纪律：本稿承重计数按"生成端机械派生"方法产生（派生命令随计数就地标注）——立法草案 `ZCodeProject/manuals/counting-derivation-and-review-mandate-draft.md` 条款一虽未批准，作为工作方法先行适用

---

## 0. 修订说明

1. **P0 工单展开**（三审 2 P0）：旧迁移 TiDB 雷修复 + TiDB 通路四堵墙逐项（§4.0）
2. **计数族机械重派**：8→7 / 三→四不变式 / 37→38 / §0 变更清单全量重做（派生命令随标注）
3. **T9 规格补齐**（三审逻辑路三句 + 实操路配套）：FAILED 语义收窄 / 守卫读源切换 / 回填条件转换 + 扫描锁纪律 + queryRefundStatus 前提 + 双轨切换
4. **引证修正**：Stripe 腿删除（未锚）/ EDPB 泛化口论证重构（删除自相矛盾用法）/ P0-18 引号去除 / tryClaim 标域内改写 / C10 毒丸语义修正
5. **验收门修正**：判据 2① SQL 谓词归位 + 新增 2③ 类 1 误走腿检查 + 判据 1 拆分 + 判据 6 执行件指名

---

## 1. 三审响应映射

### 1.1 两项 P0

| P0 | v4 响应 |
|----|---------|
| 旧迁移 TiDB 雷本体未修 | §4.0 P0-a 工单（含大小写前提与吞错日志）|
| TiDB 通路四堵墙 / P0 行无工单 | §4.0 P0-a~d 四子项 + 验收判据 |

### 1.2 十三项 P1（去重后；派生：三审六路总判行合并计数）

| # | 缺陷 | v4 响应 |
|---|------|---------|
| 1 | 计数族（8≠7/三≠4/37≠38/commit 10≠8）| 全稿机械重派（各计数带派生标注）|
| 2 | §3.9 DDL sqlite 语法错 | §3.9 重写（删 MySQL 专有子句 + 双方言注 + attempts/lastError 补列）|
| 3 | 判据 2① SQL ON/WHERE 错置 | §4.2 判据 2① 重写 + 新增 2③ |
| 4 | T9 FAILED 语义过载（歧义→误释放配额→超额退款）| §2 T9 规格 a |
| 5 | 守卫读源双源分立 | §2 T9 规格 b |
| 6 | 回查能力不存在 + 回填重复事件 | §2 T9 规格 c/d + §6.1 前提标注 |
| 7 | T5 与 §3.1 读法 A 矛盾 | §2 T5 重写 |
| 8 | T9 Stripe 腿零锚 | §5 删除（裁决两足已立）|
| 9 | 反过拟合未制度化 | 立法草案已立（待批）；任务书适用 |
| 10 | 计数无通则 | 同上（草案条款一）|
| 11 | GDPR 法条配错对象 | §2 T3/T4 双句改引 + 假名化定性入负面项 |
| 12 | "dev 无存量"为假 + 双轨零交代 | §3.9 修正 + §2 T9 规格 e |
| 13 | 排产件隐身（seed 脚本/R2 扩展/refunds entity）| §4.1 补行 |

---

## 2. 协商记录（v4 增量）

**T5（重写——三审 L3-05）**：v3 的"切换类 2 为同事务是实施期可逆决策"废止（与 §3.1 读法 A 已裁状态矛盾）。现记录：分歧已由 §3.1 归结——类 2 存储侧同事务 fail-closed（B 员教义忠实版），三分类内核重述为**链化时机区分**（INLINE 即时 / PENDING 延迟）而非 fail 语义区分。原分歧（B 员二分命名 vs v5 三分类）在重述下消解。
来源：【三审逻辑路 L3-05 + 执笔人重写】

**T3/T4（补件）**：
- D 员 Q4 并陈（此前两轮缺失）：快照 PII 留存硬边界（Art 30 记录须写明 erasure 时限）——b 变体明文区直接承接此义务
- GDPR 双句改引（三审 #8）：链不含明文的合规驱动 = **Art 17 / Art 5(1)(e)**（删除权/存储限制——不可变结构×PII 冲突的正面解）；白名单投影 = **Art 5(1)(c)/25(1)**（D 员 Q3 原域）
- 负面项（E 员卷宗现成定性，对 b 偏不利）：WP216 将 keyed-hash 列入**假名化**技术——假名化数据仍是个人数据，b 变体的 HMAC 锚不使链出 GDPR 域（erasure 义务不因哈希化消失，只是可交付性改善）
- EDPB 泛化口（"could prove useful for any blockchain"）不再用作支撑（三审学术路：该口适用域按 EDPB 自身定义同样不含单库链——用它保留 EDPB 参考价值与用定义降级 EDPB 自相矛盾）；"迁移方向保守"论证独立保留
- 被废止面带锚：v2 "EDPB 首选逐字背书"（原锚 research-E【13】§5.2 句）

**T9（规格补齐——三审逻辑路 L3-01/02/03/04 + 实操路）**：
a. **FAILED 语义收窄**：歧义类错误（网关超时/连接断/5xx/回查不决）**不得落 FAILED**——留 PENDING_GATEWAY 交扫描裁决；FAILED 仅收网关明确拒绝。依据：现行适配器 `!result.success` 一律 throw（strategy-gateway.adapter.ts:128-131）使超时与拒绝不可区分，而 FAILED 被守卫排除出保留额（payment-order.aggregate.ts:222-223 filter!==FAILED）——误判即释放配额→重复退款→超额。本仓退款状态机系 T9 首创（markAsSucceeded/markAsFailed 零调用方），失败语义为最大盲区。
b. **守卫读源切换**：累计占额读源从聚合内存 refunds（hydrate 自 metadata）改为 payment_refunds 表；PENDING_GATEWAY **计入保留额**（否则两笔并发 intent 双过守卫）。仓内先例注释自证失明失效模式（W-3 批修复"守卫因数据失明形同虚设"）。
c. **回填条件转换**：扫描回填与在途事务 2 竞争——`UPDATE payment_refunds SET status=... WHERE id=? AND status='PENDING_GATEWAY'`，仅转换胜者（affected=1）插对应事件行；payment_refunds 扫描腿与 domain_events 腿各自 tryClaim。
d. **扫描锁纪律**：网关查询在互斥**外**、回填写短互斥**内**（朴素套 drain 形状=互斥内网络往返=复现 T9 立项理由）。
e. **双轨切换**：P1 建表→P2 切写期间旧 metadata.refunds 路径仍在产数据——切换日读写**同切**（守卫/仓储/事件三处同一 commit）；过渡期对账腿（两源行数+金额和比对）入 P2；dev 库实测 1 行存量（PAY_MV0V2RBY_8N10U4_D579BAF6，PENDING 0.05，W-3 探针残留——派生：sqlite 直查 payments.metadata LIKE '%refunds%'）切换时随迁移脚本转表。
f. **REFUND_CONFIRMED 不触发订单链**（现状同构：payment-events.listener 仅监听 succeeded/failed，refund.created 零监听）——显式声明不裁决。
来源：【三审逻辑路+实操路实证 + 执笔人成文】

---

## 3. 架构（v3 结构不变处不重述；修订 ▲▲）

### 3.4 异步腿（▲▲ 计数修正：四不变式）

标题修正：**四不变式**（0/1/2/3——派生：§3.4 编号清单长度 4；v3"三不变式"系 F-02 三要素+graft 的不变式 0 后未重派）。
tryClaim 示例标注：**域内改写**（F 员 C11 原文为 `status IN (PUBLISHED, RESUBMITTED)`，本仓词表映射后呈现）。
C10 毒丸括注修正：实文语义为"started but did not finish (neither error nor success)"——**未完成态检测**（毒丸=卡在处理中的行），"提前死信避免占满重试上限"为本仓推断（标注：推断）。

### 3.9 payment_refunds（▲▲ 重写 DDL）

```sql
-- 双方言：sqlite (dev) 与 MySQL/TiDB (prod) 通用；
-- updatedAt 由 entity @UpdateDateColumn 维护（payment.entity.ts:127 先例）——不用 ON UPDATE 子句（MySQL 专有，sqlite 语法错——三审三路实测）
CREATE TABLE payment_refunds (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,  -- TiDB: BIGINT AUTO_INCREMENT PRIMARY KEY
  paymentOrderId  VARCHAR(64) NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  currency        VARCHAR(8)  NOT NULL,
  reason          VARCHAR(255),
  status          VARCHAR(24) NOT NULL,  -- PENDING_GATEWAY / CONFIRMED / FAILED
  gatewayRefundId VARCHAR(128),
  attempts        INTEGER NOT NULL DEFAULT 0,   -- ▲▲ 补：与 domain_events 腿对称（扫描退避依据）
  lastError       TEXT,                         -- ▲▲ 补：同上
  createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt       TIMESTAMP                     -- entity 层维护
);
CREATE INDEX idx_payment_refunds_status ON payment_refunds(status, createdAt);
```
13 席 P0-18 转述修正（去引号）：13 席 P0-18 判"退款场景完全失语——createRefund 路径零 audit/snapshot"（13-seats:68）；退款落 metadata JSON 无结构化系本仓实证（typeorm-payment-order.repository.ts:22-30 注释），非 13 席原文。
P1 交付行修正："payment_refunds **entity+迁移**"（与 domain_events 行对称——dev 走 synchronize 真源=entity）。

### 3.2 注（▲▲ 探测配方大小写钉死）

新迁移方言判定：先 `version.toLowerCase()` 再 `includes('tidb') || includes('mysql') || includes('mariadb')`——**小写前提成文**（仓内先例先 lower 再判；直接判 'TiDB' 对小写串永不命中=静默失效——三审数据路 P3）。

---

## 4. 迁移路径与验收

### 4.0 ▲▲ P0 前置工单（四子项——三审两项 P0 的展开）

| 子项 | 工单 | 验收 |
|------|------|------|
| P0-a | **旧迁移探测修复**：`20261011000001:27` 判定式加 `\|\| v.includes('tidb')`（该文件 :26 已 toLowerCase，配小写）；同点为 `.catch(()=>[])` 补探测失败日志（反吞错——三审反过拟合 B）| 单测：版本串 '8.0.11-tidb-v7.5.1' 命中 MySQL 分支 |
| P0-b | **挂载路径选边**：3 行 tidb→mysql 映射并入 app.module.ts:40 factory（**非**挂 DatabaseModule——其通配全量实体 glob 会整体更换实体注册集，Blocker 1 先例）——执笔人裁决，理由=注册集不变原则 | DB_TYPE=tidb 启动无 MissingDriverError |
| P0-c | CLI 迁移入口 `typeorm.config.ts:7` 联合类型加 'tidb'（同映射）| migration:run 对 TiDB 串连接可执行 |
| P0-d | db-utils 分叉验证（type 经映射后 TiDB 走 mysql 分支）| queryRunnerUsesForUpdate=true 冒烟 |

P0 整体验收：**TiDB 串连接 migration:run 全链通过（含修复后旧迁移）**——即 §4.2 判据 1 的真腿前置。

### 4.1 阶段表（▲▲ 补排产行）

| 阶段 | 内容 | 依赖 |
|------|------|------|
| P0 | §4.0 四子项 | 无 |
| P1 | domain_events entity+迁移 + payment_refunds **entity+迁移** + dev 静态 HMAC key（env 名统一 `DOMAIN_EVENTS_HMAC_KEY`——写读验三处同源）+ 白名单投影函数 + verify-domain-chain.mjs + **verify:domain npm script**（package.json 照 verify:audit 先例）+ 类 1 接管 W1-W3 + 类 2 腿 | P0 |
| P1 验收 | §4.2 | — |
| P2 | **7 条**事务底座路径（W4-W6/W8-W11——派生：枚举 W4,W5,W6,W8,W9,W10,W11 共 7）+ W12 intent 两步（T9，含 queryRefundStatus 接口方法+4 策略实现）+ 全路径事件覆盖 + 退款双轨切换（T9-e）+ 过渡期对账腿 | P1 验收 |
| P3 | 旧链冻结（五写点+终锚+**seed-domain-event.mjs**）+ 快照链列停用 + R1'/R3'/R3''/R4 + **R2 扩展（PENDING_GATEWAY 可见）** + W4 e2e 面 + W6 actor 穿层 | P2 |
| P4 | erasure 成文 | P2 + §6.1-1 |

（v3 §4.1 "8 条"废止——枚举实为 7；W12 已单列 intent 类。）

### 4.2 P1 验收门（▲▲ 修正）

1. **判据 1（拆分）**：1a 探测修复——stub 版本串 '8.0.11-tidb-v…' 经迁移类判定命中 MySQL 分支（单测可验）；1b DDL 真跑——TiDB 串连接（TiDB Cloud 免费档或 podman 容器）migration:run 全链过（**不含**"MySQL 兼容库"替代——v3 逃生口删除）
2. 覆盖三 SQL：① `SELECT COUNT(*) FROM orders o LEFT JOIN domain_events e ON e.aggregateId=o.id AND e.aggregateType='order' WHERE o.createdAt > :cutover AND e.id IS NULL` = 0（**cutover 谓词在 WHERE**——v3 ON 子句错置废止）；② `relayState='INLINE' AND seq IS NULL` = 0；③ **新增**：类 1 事件集误走腿检查 `SELECT COUNT(*) FROM domain_events WHERE eventType IN ('ORDER_CREATED','ORDER_UPDATED','PAYMENT_SUCCEEDED','REFUND_INTENT_CREATED') AND relayState != 'INLINE'` = 0（类 1 集非白名单全列——实施期按白名单枚举表生成）
3. 死信演练：env 闸语义改**"对 attempts ≤ N 的行强制失败"**（v3"第 N 批"进程内计数重启归零 flaky——三审实操 P2-1）→ attempts 达 5 → DEAD + 告警可查
4. 白名单烟测（双字段 LIKE，同 v3）
5. 链验证：verify-domain-chain.mjs（relayState='INLINE' 过滤 + 行级 schemaVersion 分版本键序重算）0 断点
6. R3'' HMAC 重算腿：**执行件指名——verify 脚本层面**（node:crypto createHmac；照 verify-audit-chain.mjs 动态 import 单源模式），与写侧同读 `DOMAIN_EVENTS_HMAC_KEY`；dev 库 = 0 绿

---

## 5. 引证修正（▲▲）

| v3 项 | v4 处置 |
|-------|---------|
| T9 "Stripe authorize-then-capture 业界同构" | **删除**——六员底稿 grep 零锚（三审学术路 P1），执笔人外部知识未锚不得承重；T9 依据= B 员卡2 单资源原则（载重句两轮活页验逐字）+ W9 同构两足，已立 |
| "本版零新增外部引证" | 加口径：来源口径（无新外部源）为真；**实例口径**含 EDPB §1/§2 两句新引文（两轮活页验逐字）——v3 表述缺限定 |
| EDPB 泛化口 | 不再用作论证（§2 T3/T4）——避免与定义论证同尺互斥 |
| P0-18 引号 | 去除，改间接转述+本仓实证锚（§3.9）|
| tryClaim / C10 毒丸 | §3.4 标注（域内改写 / 未完成态语义+推断标）|

---

## 6. 未决与免责

### 6.1 技术未决（v3 的 9 项保留 + ▲▲ 更新 2 项；派生：本节编号清单）
1-7 同 v3（HMAC key 管理/双主体 DEK/备份盲区/定时外锚/告警通道/量级实测/W8-W11 核查并入 P2）
8. 触发风暴合并参数（同 v3）
9. **queryRefundStatus 网关侧支持——升级为 T9 成立前提**（三审：接口 7 方法无此方法；若某策略网关确无退款查询能力，该策略的 T9 降级为人工对账兜底——降级路径随文）
10. ▲ PENDING_GATEWAY 超时阈值（须 > 网关最大在途时延）

### 6.2 程序未决（3 项同 v3）

### 6.3 历史命中率（▲▲ 更新）
| 项 | 命中率 |
|----|--------|
| 文档层（v1-v5 汇总 + 方案 v1/v2/v3）| **8 轮 0 过**（v3 三审 2 P0 + 13 P1——派生：本表行枚举）|
| 架构裁决层 | T9/b 变体/分腿经三轮推演零推翻（轮次口径：v2 复审+v3 三审两轮方案评审 + v1 评审一轮=三轮）|
| E/F 引证 | 目标句累计 **24 处全一致**（卡口径 21/35——派生：学术路两轮归档目标清单 ∪；未验 14 卡对正文零承重——学术路三审复现）|
| v4 新增引证 | 0（来源口径；实例口径含本稿转引的三审报告句）|

E 员材料边界声明：精读清单 18 项之外另有条目级核真 5 篇 + 线索级 4 条（research-E:154/:158）——均不入本稿证据链。

### 6.4 免责
本稿未立项、无工期、无治本率数字；T9 规格四句（a-d）为执笔人成文（依据=三审实证）；v3 三审的 12 P2/12 P3 未全修（高价值项已并入 v4——取舍判据：影响 P0-P2 可执行性或承重计数者修，纯文档美化者缓）。

---

## 7. 下一步中性选项

| 选项 | 立场（用户填）|
|------|--------------|
| α | 四送审：评审席对 v4 复审 |
| β | 立项（补 13 席六问后按 §4 实施）|
| γ | 立法草案生效裁决（另行拍板 α/β/γ/δ）|
| δ | 用户自定义 |
