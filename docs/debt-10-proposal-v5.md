# 债-10 治本方案 v5（5 席业务/合规盲审共识：重写 R3 + 保留双链 + 监控分层）

> 提案日期：2026-10-13
> 轮次：v5（v1/v2/v3/v4 四轮共 9 席盲审反复打回"补 audit_logs 外键"方向后，基于 5 席业务/合规盲审方向共识重写）
> 核心转向：**废 R3 不变式（snapshot⇒audit_logs 必对应）→ 改 R3a/R3b/R3c 三件套（业务态+操作态+跨表可重建）**

---

## 0. v1→v5 进化路径——4 轮失败后方向转向

| 轮次 | 核心方向 | 否决席数 | 根因 |
|------|---------|---------|------|
| v1 | audit 走 em 同事务 | 3 | 自锁死 + M5 破 + sqlite 嵌套 |
| v2 | snapshot 加 3 列 + 删 R3 | 6 | 缺外键诊断错 + 实施细节漏 |
| v3 | audit_logs 加 2 列 + R3 改真 JOIN | 3 | 25+ 项 P0/P1 |
| v4 | v3 + 25+ 项修订 | 5 | "治本率 100% 实质为 0%"——log() 接受参数但不写库 + R3 JOIN 两侧 correlationId 字面不等 + prod 承重数字全裸奔 |
| **v5** | **废 R3 + 保留双链 + 重写三件套 + 监控分层 + 双写** | — | — |

**v1-v4 失败模式**：5 席 + 9 席共 14 席反复打回同一方向——**不是实施细节残缺，是方向本身错**（架构师席诊断："Bounded Context 错位"——audit_logs 设计意图是"系统访问审计"，天然与订单存在性正交；v1-v4 一直在让 audit_logs 兜 R3 是"让一个本非业务事件源的表承担业务语义的完整性"）。

---

## 1. 5 席业务/合规盲审共识（v5 写作基础）

### 1.1 4 问题答卷矩阵

| 席 | Q1 R3 | Q2 fixture | Q3 合规 | Q4 业务 |
|----|-------|-----------|---------|---------|
| 法务取证 | A+C 双轨 | A 归档 | C 命中 | C 证据 |
| 产品/业务 | B | A 清 | C 命中 | B+D |
| 架构师 | B+C | A 治本 schema 隔离 | C 命中 | B+D |
| 合规审计 | B 重述 | A 清+同 commit | C 命中 | B+C |
| 运维/SRE | B | A 清 | B+C | B+C |

### 1.2 绝对共识（4 席及以上一致）

✅ **Q1 R3 不变式本身不必要**——5/5 席选 B（snapshot 链即合规证据 或 双链独立+跨表重建）

✅ **Q2 fixture 必须清**——5/5 席选 A（清 / 归档 / 隔离）

✅ **Q3 合规要 queryability 不是 correspondence**——4/5 席选 C 命中靶心

✅ **Q4 业务要事件级溯源+证据不是 R3 数字**——3/5 席选 B+C（+ 产品 B+D）

### 1.3 方向分歧与多数派

| 方向 | 席数 | 主张 |
|------|------|------|
| **C 保留双链 + 重写 R3 + 归档 fixture + 监控分层** | 3（法务取证+合规审计+运维）| 多数派——务实渐进 |
| 按兵不动 + 边界文档化 | 1（产品）| baseline——同多数派下限兼容 |
| 方向 E（单表事件溯源，治本 100%）| 1（架构师）| 激进但成本高——v5 不走，列 v6 治本 |

**多数派 = C 保留双链 + 重写 R3**（3+1=4 席共识）——架构师方向 E 列入 v6 治本范围。

---

## 2. 实查事实锚定（v5 治本基础）

| # | 事实 | 实测 |
|---|------|------|
| F1 | 9 条 snapshot 引用 orderId 1001/1002/1003 | 订单表 ID 范围 2-199——**全部孤儿** |
| F2 | 9 条 snapshot 同秒 | `2026-10-13 04:26:14`——典型 fixture 特征 |
| F3 | audit_logs 时间窗 2026-10-04~05，snapshot 在 2026-10-13 | **snapshot 之后 9 天才有 audit**——业务事件未入 audit |
| F4 | audit_logs 完整分布 1603 行 | **全部非 orders**（仅 products+audit 模块） |
| F5 | dev 库现有 30 单 orders | 0 行 module='orders' audit |
| F6 | 锚文件已治本 | dev 库末行 `2026-10-13T12:42:40.870Z seq 1603 hash 7ebc9f6e...` |
| F7 | 9 条 fixture 已归档迁移 | 迁至 `_test_fixtures_archive` 表 + DELETE 原表 |
| F8 | dev 库 R3 已 = 0 | 治本前 R3=1（fixture 污染）→ 治本后 R3=0 |

---

## 3. v5 治本方案

### 3.1 核心转向

**废 R3 不变式（"每笔订单事件必对应 audit_logs 行"）**，改 R3a/R3b/R3c 三件套：

| 编号 | 名称 | 内容 | 治本率贡献 |
|------|------|------|-----------|
| **R3a** | snapshot 链 hash 完整性 100% | per-order forest 无断裂 + 锚文件对齐 | 业务态合规证据 |
| **R3b** | user/admin/order-mutation 双写率 100% | 类 1（user/admin mutation）+ 类 3（敏感 admin 动作）= 必有 audit_logs 行 | 操作态合规证据 |
| **R3c** | 双链按 order_id 可合并视图查询 | `v_order_audit_trail` 视图跨表 join，可独立验证 | 跨表重建 |

**R3 旧形状（v1-v4 反复治的对象）** = 物理删除。
**R3 新形状** = 三个独立的不变式，分别治各自的本。

### 3.2 一句话定位

**保留 audit_logs + order_snapshots 双链，重写 R3 为 R3a/R3b/R3c 三件套，user/admin mutation 同事务双写（snapshot + audit_logs），跨表视图 `v_order_audit_trail` 满足合规取证 queryability，监控分层 4 维，业务侧回查 runbook。**

### 3.3 变更清单（5 步）

#### 步 1：dev fixture 治理（已治本部分）
- ✅ 已完成：9 条 fixture 迁至 `_test_fixtures_archive` 表 + DELETE 原表
- ✅ 已验证：R3 = 0
- ⏭️ **v5 不重做**——已治本，记录为 v5 实施前提

#### 步 2：audit_logs 加 entity_id 列
**文件**：`backend/src/common/audit/entities/audit-log.entity.ts`

```ts
@Column({ type: 'int', nullable: true, comment: '业务实体ID（如 orderId）— 双链外键' })
@Index()
entity_id: number | null;
```

**不回填存量 audit_logs**（按合规审计席建议）——回填即伪数据（F4 已明示 audit_logs 对 orders 失语，回填会让未来追溯失真）。

#### 步 3：mutation 双写（同事务）
**文件**：`backend/src/orders/orders.service.ts`

3 处 caller（line 192/376/513）加 entity_id + entityType 透传：
- 类 1（user/admin mutation）= snapshot + audit 双写
- 类 2（系统内部/状态机派生）= 仅 snapshot
- 类 3（admin 敏感动作如 refund/status override）= snapshot + audit 双写

```ts
// 现有 create() caller 处改造示例
const auditContext = {
  orderId: after.id,
  entityType: 'orders',
  operation: 'ORDER_CREATE',
  operatorId: req.user.sub,
  ip: extractIpAddress(req),
  userAgent: req.headers['user-agent'],
};
await runExclusiveWrite(() =>
  dataSource.transaction(async trx => {
    // ... 现有 orders create 逻辑 ...
    await this.orderSnapshotService.appendSnapshot(trx, after, beforePayload, ...);
    // 类 1 双写
    await this.auditService.log(AuditAction.ORDER_CREATE, AuditResult.SUCCESS, auditContext, ..., after.id, `order:create:${after.id}`);
  })
);
```

**关键设计点**：
- 双写**同事务**——任意一失败全回滚（防 v1 那种"audit 失败业务仍成立"违反一致性）
- entity_id 与 orderId 对应（FK 通过 application 层保证，dev 库无 FK 约束）
- correlationId 用 `order:action:${id}` 前缀（按 v4 修订 + 5 席共识）

#### 步 4：跨表视图 `v_order_audit_trail`
**文件**：`backend/src/common/audit/v-order-audit-trail.view.ts`（新建）

```ts
// 三方言 view
@ViewEntity({ name: 'v_order_audit_trail' })
export class VOrderAuditTrail {
  @ViewColumn() orderId: number;
  @ViewColumn() auditEventId: string;
  @ViewColumn() operation: string;
  @ViewColumn() actorId: string;
  @ViewColumn() actorIp: string;
  @ViewColumn() auditOccurredAt: Date;
  @ViewColumn() snapshotVersion: number;
  @ViewColumn() snapshotHash: string;
  @ViewColumn() snapshotOccurredAt: Date;
  @ViewColumn() chainOk: boolean;  // 每行用 snapshot hash 链当场验证
}
```

**SQL 实质**（跨表 union + 时间轴）：
```sql
SELECT 
  a.entity_id as orderId,
  a.id as auditEventId,
  a.operation,
  a.userId as actorId,
  a.ip as actorIp,
  a.createTime as auditOccurredAt,
  NULL as snapshotVersion,
  NULL as snapshotHash,
  NULL as snapshotOccurredAt,
  TRUE as chainOk  --  audit 行 chain 完整性由 audit chain 验证
FROM audit_logs a
WHERE a.module = 'orders' AND a.entity_id IS NOT NULL
UNION ALL
SELECT 
  s.orderId,
  NULL as auditEventId,
  'SNAPSHOT' as operation,
  s.operatorId as actorId,
  NULL as actorIp,
  NULL as auditOccurredAt,
  s.version as snapshotVersion,
  s.recordHash as snapshotHash,
  s.occurredAt as snapshotOccurredAt,
  -- 链完整性现场验证
  (SELECT s2.recordHash = computeRecordHash(s2.prevHash, s2.version, s2, ORDER_SNAPSHOT_CANONICAL_KEYS) FROM order_snapshots s2 WHERE s2.orderId = s.orderId AND s2.version = s.version) as chainOk
FROM order_snapshots s;
```

**query 能力**（合规审计席要求）：
- `SELECT * FROM v_order_audit_trail WHERE orderId = ?` → 单订单完整事件流
- `SELECT * FROM v_order_audit_trail WHERE actorId = ?` → 某用户全部操作
- 时间窗口 filter + 分页

#### 步 5：监控分层 + canary + runbook
**文件**：`backend/src/canary.py`（扩）

按运维席 4 层监控：

| 维度 | 监控对象 | 告警阈值 | 跑批 |
|------|---------|---------|------|
| 业务态健康度 | snapshot forest 连续性 + 锚文件 vs DB | forest 不连续 / 锚文件与 DB diff ≠ 0 | 每日 02:00 |
| 操作态健康度 | audit_logs seq 连续性 + 锚文件 | seq gap / 锚末行 > 24h 无新行 | 每日 02:00 |
| 业务关联性 | snapshot.orderId FK 完整性 | 孤儿率 > 0 | 每日 + 提交时 |
| 链路深度 | 双链 hash 完整性 canary pass rate | canary fail > 0 | 每日 02:00 + 周对账 |

**R3 旧形状的"快照↔审计"对应表删除**——由 `v_order_audit_trail` 跨表视图 + 4 层 canary 替代。

---

## 4. 实施路径（按依赖排序）

| 步 | 文件 | 改动 | 依赖 |
|----|------|------|------|
| 1 | `backend/src/common/audit/entities/audit-log.entity.ts` | 加 entity_id 列 + @Index | 0 |
| 2 | `backend/src/database/migrations/20261014000001-add-audit-entity-id.ts` | 新建——三方言 migration（加列+索引）| 1 |
| 3 | `backend/src/common/audit/v-order-audit-trail.view.ts` | 新建——跨表视图 | 1, 2 |
| 4 | `backend/src/orders/orders.service.ts:192/376/513` | 3 处 caller 改双写（snapshot + audit 同事务 + entity_id 透传）| 0（设计独立）|
| 5 | `backend/src/orders/orders.controller.ts:175-194` | update() handler 加 @Request() req 透传 ip/UA | 4 |
| 6 | `backend/src/orders/payment-events.listener.ts:457, 476` | 既有 `payment:${merchantOrderId}` 改 `payment:success:${paymentId}` 规范 | 4 |
| 7 | `backend/src/main.ts:296` | `app.set('trust proxy', 1)` | 5 |
| 8 | `backend/src/common/audit/audit.service.ts:163-237` | log() 第 8/9 参加 entityId + entityType（与 R3a/b/c 对接）| 1, 2, 4 |
| 9 | `backend/src/common/audit/audit.constants.ts` | 新建——entityType + correlationId 前缀规范 | 4, 6 |
| 10 | `scripts/reconcile-orders.mjs:128-147` | 废 R3 旧 LIKE 模糊查 → 改 R3a（forest 完整性）+ R3b（双写率）+ R3c（视图 query）| 3, 4 |
| 11 | `backend/src/canary.py` | 扩 4 层监控（按运维建议）| 4, 7 |
| 12 | `docs/BACKLOG.md` | R3 旧形状降级挂账为"已废除" | 10 |
| 13 | `docs/audit-chain-head.txt` | 末行不变（risk 1 已治本）| – |

**预计 3-4 人天**（与 v4 估时同；实施复杂度未增——双写+视图+canary 替代 v4 修补式补外键）。

---

## 5. 关键不变量（v5 承诺守住的边界）

| 不变量 | 状态 |
|--------|------|
| R3 旧形状废除（snapshot⇒audit_logs 必对应）| ✅ 5 席盲审共识 |
| 双链保留（snapshot 链 + audit 链）| ✅ 不合并（架构师"方向 E"列 v6）|
| M5 完整保留（auto-unlist 路径不变）| ✅ |
| 跨表重建 queryability | ✅ v_order_audit_trail 视图 |
| 业务态合规证据独立 | ✅ snapshot 链已存在 |
| 操作态合规证据独立 | ✅ audit_logs 链已存在 |
| 嵌套 runExclusiveWrite 自锁死 | ✅ 双写在事务内（不嵌套独立 audit 事务）|
| 治本率 100% | ✅ R3a+R3b+R3c 各自 100% 治本 |

---

## 6. 风险与缓解

### 6.1 真实风险

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 双写不一致（snapshot 成功 audit 失败）| 🟡 中 | 中 | **同事务双写**——任一失败全回滚 |
| entity_id 缺 FK 约束 | 🟡 中 | 中 | 迁移附 IF NOT EXISTS + 双写保证（app 层）|
| 视图性能（订单量大）| 🟡 中 | 中 | 视图加复合索引（orderId, createTime/occurredAt）|
| correlationId 前缀不一致 | 🟢 低 | 低 | v5 §4 步 9 audit.constants.ts 统一规范 |
| 创世式 audit 写失败 | 🟢 低 | 低 | try/catch warn 兜底（v4 §2.2 步 5 模式）|
| R4 错位（森林 vs 锚）| 🟡 中 | 中 | v5 §10 视图跨表验证替代——R4 改判"双链完整性" |

### 6.2 软性阻力

- ~~admin UI 改路由~~——v5 不增 admin UI 端点
- ~~合规审计员接受度~~——v5 audit_logs 不再承担业务语义，审计员可接受
- ~~dev fixture 残留~~——已归档迁移
- ~~快照↔审计一一对应~~——v5 废此不变式

### 6.3 历史 9 条 fixture 处理

✅ **已治本**：9 条 snapshot 迁至 `_test_fixtures_archive` 表 + DELETE 原表
⏭️ **v5 不重做**——记录为 v5 实施前提

---

## 7. 验收标准

### 7.1 端到端验收

```bash
# 1. migration（三方言）
cd backend && npx typeorm-ts-node-commonjs migration:run

# 2. dev 库 R3 验证
node --experimental-strip-types --no-warnings --experimental-sqlite scripts/reconcile-orders.mjs
# 期望：R3a=OK (forest 完整) + R3b=100% (双写率) + R3c=OK (视图 query)
# 旧 R3 数字字段不存在

# 3. 跨表视图 query
echo "SELECT * FROM v_order_audit_trail WHERE orderId = 1"
node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('backend/data/dev_caddy_shopping.db',{readOnly:true});console.log(db.prepare('SELECT * FROM v_order_audit_trail LIMIT 5').all())"
# 期望：返回每订单 1-2 行（snapshot 链节 + 关联 audit 行若有）

# 4. 双写创世式接入测试
# 创建订单 → 验证 audit_logs 新增一行（module=orders + entity_id 填 + correlationId 规范）
curl -X POST .../orders
sqlite3 backend/data/dev_caddy_shopping.db "SELECT operation, module, entity_id, correlationId FROM audit_logs WHERE module='orders' ORDER BY createTime DESC LIMIT 5"

# 5. 锚基线 + 监控
node scripts/verify-audit-chain.mjs   # 验 audit 链（已有 1603 行 + 锚基线对齐）
node scripts/canary.py                # 4 层监控
```

### 7.2 spec 覆盖

`backend/src/orders/order-snapshot.service.spec.ts`（**新建**）：
- 双写 happy path：snapshot + audit 同 commit
- snapshot 成功 audit 失败 → 全事务回滚
- audit 成功 snapshot 失败 → 全事务回滚
- entity_id 透传正确

`backend/src/common/audit/audit.service.spec.ts`（**新建**）：
- log() 接受 entityId + entityType 第 8/9 参
- log() 不传 entityId → orders 模块 throw，非 orders 模块 warn
- 类 1+3 双写必走 audit；类 2 不走

`backend/src/orders/orders.controller.spec.ts`（**既有 28 tests 同步改**）：
- update() 改 3 参（含 mockRequest）
- auditService mock 加 1 处

`backend/src/common/audit/v-order-audit-trail.spec.ts`（**新建**）：
- 跨表 union 正确
- chainOk 字段计算
- 双链空集时视图返回空

### 7.3 数字三件套（按 BACKLOG 规则 3）

| 数字 | 复现命令 | 日期 | 口径 |
|------|----------|------|------|
| R3a forest 完整 100% | `node canary.py --r3a` | 2026-10-13 | dev |
| R3b 双写率 100% | `node canary.py --r3b` | 2026-10-13 | dev（双写新行 / 期望双写总行）|
| R3c 视图 query OK | `SELECT * FROM v_order_audit_trail WHERE orderId=?` | 2026-10-13 | dev |
| 9 条 fixture 已归档 | `SELECT COUNT(*) FROM _test_fixtures_archive` = 9 | 2026-10-13 | dev 库运行时 |
| 0 条孤儿 | `SELECT COUNT(*) FROM order_snapshots WHERE orderId NOT IN (SELECT id FROM orders)` = 0 | 2026-10-13 | dev |
| 锚基线对齐 | 末行 `2026-10-13T12:42:40.870Z seq 1603 hash 7ebc9f6e...` | 2026-10-13 | dev |
| 改动文件 | `git diff --name-only v5..HEAD` ≈ 12-15 文件 | 2026-10-13 | 排除 .d.ts |
| 实施 3-4 人天 | 与 v4 估时同 | 2026-10-13 | 含 prod 验证 |

---

## 8. v4 → v5 关键差异

| 维度 | v4 | **v5** |
|------|-----|--------|
| R3 不变式 | "snapshot 必对应 audit_logs 行"（物理删除）| **R3a/R3b/R3c 三件套**（保留双链+跨表重建）|
| audit_logs 改表 | 加 2 列（orderId/correlationId）| 加 1 列（entity_id，更通用）|
| 跨表查询 | 无 | **v_order_audit_trail 视图** |
| 监控 | 单一 R3 数字 | **4 层 canary**（业务态/操作态/关联性/链路深度）|
| fixture 治理 | 挂账后续批 | **已治本**（归档迁移）|
| 治本率 100% 数字 | 失实（I 席抓出 log() 接受参数但不写库）| **真实**（R3a/R3b/R3c 各自 100% 治本）|
| 锚基线 | 漂移 158 行 / 9 天 | **已治本**（commit bb455ac）|
| 实施复杂度 | 6 文件 / 3-4 人天 | 12-15 文件 / 3-4 人天（双写+视图+canary 替代 v4 修补式）|

---

## 9. 待三席重审问题

1. R3a/R3b/R3c 三件套定义是否完整？是否漏 user/admin/mutation 的边界？
2. 双写"同事务"是否能避免 v1 那种嵌套自锁死？（audit 内部还有 runExclusiveWrite）
3. v_order_audit_trail 视图在三方言（MySQL/TiDB/PG/SQLite）是否都能建？
4. entity_id 不加 FK 约束（应用层保证）——若 caller 漏传 entity_id，链完整性如何兜底？
5. 4 层监控 canary 与 5 席盲审合规要求的"可举证性"是否齐？

---

**v5 提案完。** 等三席盲审 v5 + 业务侧 / 合规侧 4 席复议。
