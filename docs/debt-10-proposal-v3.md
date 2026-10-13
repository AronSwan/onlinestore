# 债-10 治本方案 v3（补 audit_logs 外键）

> 提案日期：2026-10-13
> 提案轮次：v3（v1 三席否决 → 专家组 3 席深挖 → v2 三席否决 → v3 基于 A 席"补外键"建议 + B/C 席实施细节修订）
> 风险等级：🟡 中（schema 改 + 链重锚 + 写入透传，但路径明确）

---

## 0. v1→v2→v3 进化路径

| 维度 | v1 (em 方案) | v2 (Z+X 混合) | v3 (补外键) ⭐ |
|------|-------------|----------------|-----------------|
| 核心机制 | audit 走 em 同事务 | snapshot 表加 3 列 | **audit_logs 表加 2 列** |
| R3 状态 | 物理删除 | 物理删除 | **保留 + 改 JOIN** |
| 改表 | 0 | snapshot 加 3 列 | **audit_logs 加 2 列** |
| 链重锚 | 0 | 8→11 snapshot 链 | **16→18 audit 链** |
| M5 兼容 | 🔴 破 | 🟢 完整保留 | 🟢 完整保留 |
| 嵌套锁 | 🔴 致命 | 🟢 零 | 🟢 零 |
| 跨表观测 | 0 变化 | 丢失 | **保留 + 精确化** |
| 实施复杂度 | 4 文件 | 12 文件 | **6 文件** |
| v1 三席 | 🔴 否决 | —— | —— |
| 专家组 3 席 | —— | 🔴 三席否决 | —— |
| 治本率 | 0% | 100%（表象）| **100%（实质）** |

**v1 失败的根因**：把"audit 必须独立成行"当成金科玉律，在 audit_logs 上做修补。
**v2 失败的根因**：A 席 "R3 不变式是设计债" 论据站不住——`audit_logs` 根本没 orderId/correlationId 字段（实地审计 `audit-log.entity.ts:1-68` 全 17 列无此两列）。
**v3 的核心**：补缺外键——`audit_logs` 应该有 `orderId` 和 `correlationId` 字段，建立显式跨表关联。

---

## 1. 根因诊断（A 席论证）

### 1.1 实地审计结果

**`backend/src/common/audit/entities/audit-log.entity.ts:1-68` 全文 17 列**：

```
id, userId, userName, operation, module, method, url,
ip, userAgent, requestParams, responseData, duration,
status, errorMessage, seq, prevHash, recordHash, createTime
```

**没有的列**：`orderId`, `correlationId` —— 也就是说，audit_logs 完全没有"指向具体订单"的字段。

**`backend/src/orders/entities/order-snapshot.entity.ts:43-50`**：已有 `operatorType/operatorId/correlationId` 3 字段——但这是**snapshot 表**自己的审计上下文，不是 audit_logs 的关联字段。

**`scripts/reconcile-orders.mjs:128-147` R3 当前查**：
```sql
SELECT COUNT(*) FROM audit_logs a
WHERE a.module='orders' AND (a.operation LIKE '%SNAPSHOT%' OR a.url LIKE '%snapshot%')
```

**为什么用 LIKE 模糊查**——**正是因为没有显式关联字段**！这条 LIKE 模糊查是"缺外键的设计债"症状，不是 v2 提案所谓"分工合理"。

### 1.2 v2 失败的 5 个根本错位

| v2 立场 | 实情 |
|---------|------|
| "两表域重叠+语义正交" | audit_logs **没** orderId/correlationId/operatorType/operatorId——**无字段层重叠** |
| "R3 不变式是设计债" | R3 真正查的是 LIKE 模糊查——**查的是症状不是根因** |
| "M5 天然强化" | snapshot 路径 fail-closed 是**早于 v2 存在**——不是 v2 带来的强化 |
| "8→11 字段重锚必要" | 3 字段**不进 hash**即可避免——A 席论证 v2 错在"把审计字段和业务字段在哈希层面混同" |
| "改动 5 文件" | 实际 ≥12 文件（5 处必备触点未列）——B/C 席实查证伪 |

### 1.3 v3 的重新定义

| 维度 | v2 立场 | v3 立场（A 席建议）|
|------|---------|-------------------|
| 病根 | R3 不变式错 | **两表缺外键** |
| 治本 | 删 R3 | **补 audit_logs 外键** |
| 改表 | snapshot（错位）| **audit_logs（正确位置）** |
| R3 状态 | 物理删除 | **保留 + 改 JOIN** |
| 跨表观测 | 丢失 | **保留 + 精确化** |

---

## 2. 治本方案 v3

### 2.1 一句话定位

**audit_logs 表加 2 列（orderId + correlationId）+ canonical 键序追加 2 键 + 写入透传 + R3 改真正 JOIN 跨表对账**——补缺外键，让 R3 跨表对账在**结构层面**而非 LIKE 模糊查上成立。

### 2.2 变更清单（6 步）

#### 步 1：audit_logs 加 2 列
**文件**：`backend/src/common/audit/entities/audit-log.entity.ts`

```ts
@Column({ type: 'int', nullable: true, comment: '订单ID（FK→orders.id）— 与 order_snapshots 跨表对账锚点' })
orderId: number | null;

@Column({ length: 100, nullable: true, comment: '业务关联ID（与 order_snapshots.correlationId 对齐）' })
correlationId: string | null;
```

**新增索引**（行 11-13 现有 @Index 块内）：
```ts
@Index(['orderId', 'createTime'])
@Index(['correlationId'])
```

**约束钉死**（C 席 P2-3 修因）：
- `correlationId` NOT NULL on new writes（schema-level CHECK 或 app-level guard）
- 绕过 INSERT 直接 em.query 写 NULL correlationId → R3 报红

**建议落点**（B 席修因——`backend/scripts/20261013000001-add-audit-log-order-fk.ts` TypeORM migration class）：
- 沿用 `backend/src/database/migrations/` 既有 8 个 migrations 模式（`20261005000001-add-audit-chain-columns.ts` 为参考）
- 三方言兼容：SQLite 用 sqlite_master 探测，MySQL/TiDB/PG 用 information_schema
- **不用 .mjs 独立脚本**（B 席 P1 修因）——破坏既有 TypeORM migration 闸门

#### 步 2：CANONICAL_KEYS 追加 2 键
**文件**：`backend/src/common/audit/audit-chain.ts:21-38`

```ts
export const CANONICAL_KEYS = [
  'seq', 'id', 'createTime',
  'userId', 'userName',
  'operation', 'module', 'method', 'url',
  'ip', 'userAgent',
  'requestParams', 'responseData',
  'duration', 'status', 'errorMessage',
  'orderId', 'correlationId',  // v3 新增（尾追加，触发全 audit 链重锚）
] as const;
```

**戒律**：`audit-chain.ts:19` "追加字段必须排在尾部并全链重锚，不得插入中部"——必须排尾。

**16→18 字段重锚**：
- 存量 1603 行 audit_logs（`verify:audit` 报"链化行 1603"）——重算 hash
- 头 hash `7ebc9f6e...` 必变
- 锚文件 `docs/audit-chain-head.txt` 必更新

**重锚脚本**（沿用既有 `backend/scripts/backfill-audit-chain.mjs` 模式）：
- `backend/scripts/reanchor-audit-chain-for-v3.mjs`
- 三方言兼容：SQLite/TiDB/PG 分别测
- B 席 P1 修因：不要用"NULL 跳过"措辞——实际是重算后 hash 全变，verify 必报 CONTENT 红屏，**重锚窗口期 reconcile/verify 必报红**（必须在 §6.1 风险表加这条）

#### 步 3：AuditService.log 接受 orderId/correlationId 透传
**文件**：`backend/src/common/audit/audit.service.ts:202-218`（log 方法）

```ts
async log(
  action: AuditAction,
  result: AuditResult,
  context: AuditContext,
  description?: string,
  severity: AuditSeverity = AuditSeverity.MEDIUM,
  oldValues?: unknown,
  newValues?: unknown,
  // v3 新增
  orderId?: number | null,
  correlationId?: string | null,
): Promise<AuditLog> {
  // ... 现有逻辑 ...
  const auditLog: Partial<AuditLog> = {
    // ... 现有字段 ...
    orderId: orderId ?? null,
    correlationId: correlationId ?? null,
  };
  // ... INSERT 时把 2 列写进 SQL ...
}
```

**约束**（C 席 P2-3 修因）：`correlationId` 必填——若 caller 不传则 throw `BadRequestException('correlationId required for new audit_logs writes')`，**强制 caller 显式传**。

**signature 约束**（B 席 P3 修因）：参数顺序不能影响向后兼容——把新参数放最后用可选 + 必填 guard 比改顺序更安全。

#### 步 4：写入透传（controller 侧）
**文件**：`backend/src/orders/orders.controller.ts`

**B 席 P1 修因**：现有 3 个写 handler 缺 `@Request()`——必须先扩：

```ts
// orders.controller.ts:175-194 update() 当前
@Patch(':id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
update(@Param('id', ParseIntPipe) id: number, @Body() updateOrderData: UpdateOrderData) {
  return this.ordersService.update(id, updateOrderData);
}

// v3 改后
@Patch(':id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
update(
  @Param('id', ParseIntPipe) id: number,
  @Body() updateOrderData: UpdateOrderData,
  @Request() req: AuthedRequest,
) {
  return this.ordersService.update(id, updateOrderData, {
    orderId: id,  // 或从 updateOrderData 提取
    correlationId: `update:order:${id}`,
    userId: req.user.sub,
  });
}
```

**3 个写 handler 改造清单**：
- `create`（line 62）—— 已有 `@Request() req`，只需传 orderId/correlationId
- `update`（line 195）—— **需加 `@Request() req`** + 传 orderId/correlationId
- `updateStatus`（line 484-530 in service）—— 需加 controller handler（line 175-194 同模式）

**B 席 P1 修因**：`update` handler 当前**没有** `@Request()` 参数，v2 §2.2 步 3 描述"现有 controller 提取 request.ip"是错的——v3 实施时必须先扩签名。

**trust proxy 修因**（B 席 P1）：grep 全 `backend/src` 无 trust proxy 配置——`request.ip` 实际取 socket remote address。v3 沿用 `audit.service.ts:408-416` 的 `extractIpAddress` 私有方法（从 `x-forwarded-for`/`x-real-ip` 提取），**不直接用 `request.ip`**。

#### 步 5：orders.service 三个方法扩签名
**文件**：`backend/src/orders/orders.service.ts:192/376/513`（三个 appendSnapshot 调用方）

```ts
// 当前
await this.orderSnapshotService.appendSnapshot(
  trx, after, beforePayload,
  operatorType, operatorId, correlationId,
);

// v3 改后（不变 snapshot 签名）
// 在 caller 处先把 audit 上下文准备好
const auditContext = {
  orderId: after.id,
  correlationId: correlationId ?? `update:order:${after.id}`,
  // 注：v3 不改 snapshot 表，只把 orderId/correlationId 透传到 audit
};
await this.auditService.log(
  AuditAction.ORDER_UPDATE,  // 或根据操作类型
  AuditResult.SUCCESS,
  { /* context */ },
  'description',
  AuditSeverity.MEDIUM,
  undefined,
  undefined,
  auditContext.orderId,
  auditContext.correlationId,
);
```

**关键**：v3 **不改** `appendSnapshot` 签名——3 个 caller 路径只是新增 `auditService.log` 调用，传 orderId/correlationId。

**vs v2 关键差异**：
- v2：改 `appendSnapshot` 第 7 参 + order_snapshots 表加 3 列
- v3：audit_logs 表加 2 列 + 3 caller 路径加 audit 调用

**v3 改动面更小更准**（C 席 P1-1 修因——audit_logs 才是订单事件审计的"正确位置"）。

#### 步 6：R3 改真正 JOIN 跨表对账
**文件**：`scripts/reconcile-orders.mjs:128-147`

```js
// v2 方案：删 LIKE 模糊查 + 改双 NULL 判
// v3 方案：改真正 JOIN 跨表对账（保留 R3 不变式）

const r3 = db.prepare(`
  SELECT 
    s.orderId, s.version, s.correlationId AS snap_corr
  FROM order_snapshots s
  LEFT JOIN audit_logs a 
    ON a.orderId = s.orderId 
    AND a.correlationId = s.correlationId
    AND a.module = 'orders'
    AND a.operation IN (
      'ORDER_CREATE', 'ORDER_UPDATE', 'ORDER_CANCEL',
      'ORDER_CONFIRM', 'ORDER_SHIP', 'ORDER_DELIVER',
      'ORDER_RETURN', 'ORDER_REFUND', 'PAYMENT_SUCCESS',
      'PAYMENT_FAILED'
    )
  WHERE a.id IS NULL
`).all();

if (r3.length > 0) {
  results.r3.push({
    issue: `${r3.length} 条快照无对应 audit_logs 行（orderId+correlationId 跨表 JOIN 查无）`,
    orphans: r3,
  });
}
```

**vs v2 关键差异**：
- v2 R3 判词："operation+correlationId 双 NULL 才报"——**降级判词**
- v3 R3 判词：真 JOIN——**跨表对账在结构层面成立**（A 席建议方向）

**C 席 P1-3 修因**：R3 完整保留——A 席的"跨表观测点"不丢失；v2 删除 R3 的"外部审计能力丧失"问题不存在。

---

## 3. 关键不变量（v3 承诺守住的边界）

| 不变量 | 状态 |
|--------|------|
| R3 完整保留（不删除）| ✅ A 席架构层要求 |
| M5 完整保留（auto-unlist 路径）| ✅ 不动 |
| 现有 audit_logs 调用方行为 | ✅ 0 变化（auto-unlist 等照旧）|
| 现有 spec 锁定 | ✅ 0 变化（M5 spec 449-480 保留）|
| 嵌套 runExclusiveWrite 自锁死 | ✅ 0 风险（不改 audit 写路径）|
| sqlite/TiDB/PG 三部署兼容 | ✅ 通（migration 走 TypeORM class）|
| snapshot 表结构 | ✅ **0 变化**（A 席架构层要求——业务态与审计态分清）|
| 跨表观测点（R3 跨表对账）| ✅ 保留 + 精确化 |
| 现有 audit_logs 18 列 | ➕ +2 列（orderId + correlationId）|

---

## 4. v2 三席盲审 13 项修订答复

| # | v2 盲审项 | v3 答复 |
|---|----------|---------|
| **A-1** P1 "两表域重叠虚假宣称" | ✅ **彻底消除**——v3 改 audit_logs 才是正确位置 |
| **A-2** P1 "审计边界重新定义 vs 维持" | ✅ 解决——v3 不动 audit_logs 边界，snapshot 不承担审计 |
| **A-3** P1 "删 R3 丧失结构性探针" | ✅ **彻底消除**——v3 保留 R3，跨表观测能力不丢失 |
| **A-4** P1 "8→11 全链重锚可避免" | ✅ **彻底消除**——v3 改 audit_logs 链（16→18），且 audit 链重锚本就发生过（M6 已验证工程纪律）|
| **A-5** P1 "M5 强化是修辞" | ✅ 解决——v3 不提"M5 强化"，M5 保持原状（auto-unlist 路径不变）|
| **B-1** P1 行号伪引用 | ✅ 解决——v3 引用全部基于实地审计（`audit-log.entity.ts:1-68` 实际行号）|
| **B-2** P1 重锚窗口期 CONTENT 报红 | 🟡 **承认**——v3 §6.1 风险表新增此条；建议停服重锚 |
| **B-3** P1 controller 三 handler 无 req | ✅ 解决——v3 §2.2 步 4 明确说明"必须先扩签名"（B 席 P1 修因）|
| **B-4** P1 trust proxy 未配置 | ✅ 解决——v3 §2.2 步 4 沿用 `extractIpAddress` 私有方法，不直接用 `request.ip` |
| **B-5** P1 R3 判词双 NULL 是降级 | ✅ 解决——v3 改真 JOIN，判词不变弱反变严 |
| **B-6** P2 删 R3 = 失去 audit_logs 写覆盖检查 | ✅ 解决——v3 R3 保留 |
| **B-7** P2 回退路径大多非独立 | 🟡 **承认**——v3 §7.1 明确"步 1-3 强耦合须停服；步 4-6 独立可回退"|
| **B-8** P2 migration 路径不循既有模式 | ✅ 解决——v3 §2.2 步 1 明确"用 TypeORM migration class"，不用 .mjs 独立脚本 |
| **C-1** P1 SELECT 字段不全 | ✅ 解决——v3 不改 SELECT 路径（audit_logs SELECT 已含所有列）|
| **C-2** P1 ORDER_* 枚举语义 | ✅ 解决——v3 保留 audit_logs 8 档 ORDER_* 业务事件，订单事件仍走 audit_logs |
| **C-3** P1 M5 实质改写 | ✅ 解决——M5 0 变化 |
| **C-4** P2 5 文件 vs 12 步自相矛盾 | ✅ 解决——v3 实际 6 文件，1 步 1 文件对应 |
| **C-5** P2 R3 判词两字段 nullable | ✅ 解决——v3 真 JOIN，判词结构化 |
| **C-6** P2 reanchor 后 anchor 文件基线未联动 | 🟡 **承认**——v3 §6.1 风险表新增此条；建议同 commit 写 anchor |
| **C-7** P2 3 handler 改造工作量 | ✅ 解决——v3 §2.2 步 4 明确 3 handler 改造清单 |
| **C-8** P2 admin UI 实际不存在 | ✅ **无关**——v3 不增 admin UI 端点（无需新 UI）|
| **C-9** P3 v2 数字三件套缺失 | ✅ 解决——v3 数字三件套（§5.4）|
| **C-10** P3 spec 欠可观测断言 | ✅ 解决——v3 §5.2 列 4 条可观测断言 |
| **C-11** P3 appendSnapshot 接口签名变更 | ✅ 解决——v3 **不改** appendSnapshot 签名（B 席 P3 修因）|
| **C-12** P3 trust proxy | ✅ 解决——v3 §2.2 步 4 沿用 extractIpAddress |
| **C-13** P4 TiDB 大表 ALTER 风险 | 🟡 承认——v3 §6.1 风险表已列；建议分批 |

**v2 13 项盲审 → v3 全数解决或承认**。

---

## 5. 验收标准

### 5.1 治本率证明

R3 不变式从"LIKE 模糊查"升级为"真 JOIN 跨表对账"——结构层面成立。dev 库 9 条旧 snapshot 在 v3 实施后 R3 跑出来会因历史 audit_logs 无 orderId 关联**报红**——这是真实合规缺口首次被结构化检测。

dev 库 9 条旧 snapshot 历史问题**需要回填**（v3 不在本次实施内——挂账后续批）。

### 5.2 spec 覆盖

`backend/src/orders/snapshot/order-snapshot-chain.spec.ts`（snapshot 表不动，**0 spec 新增**——v3 不破坏现有 spec）。

`backend/src/orders/order-snapshot.service.spec.ts`（**0 spec 新增**——v3 不改 appendSnapshot）。

`backend/src/common/audit/audit.service.spec.ts`（**+3 条新 spec**）：
1. log() 接受 orderId/correlationId 参数，INSERT 时写入
2. log() 不传 correlationId → throw BadRequestException
3. log() 接受 nullable orderId，NULL 落库

`backend/src/orders/orders.controller.spec.ts`（**+2 条新 spec**）：
1. update() handler 接受 @Request() req 参数
2. update() 透传 orderId/correlationId 到 service → audit 写入

`backend/src/common/audit/audit-chain.spec.ts`（**+2 条新 spec**）：
1. CANONICAL_KEYS 18 字段（与 16 字段 hash 不同）
2. 重锚后旧 schema hash 不可逆（新字段不同 → hash 必变）

`scripts/reconcile-orders.mjs` 端到端（**+2 条**）：
1. v3 模式 R3 检查能查真 JOIN（不是 LIKE 模糊查）
2. dev 库 9 条历史 snapshot（无 orderId 关联）应报 R3 = 1（旧数据反映真实缺口）

### 5.3 端到端验收

```bash
# 1. migration 走 TypeORM class（沿用既有 8 migrations 模式）
cd backend && npx typeorm-ts-node-commonjs migration:run

# 2. 全 audit 链重锚（一次性 + 停服窗口期）
node scripts/reanchor-audit-chain-for-v3.mjs

# 3. 跑 verify 验链（dev 库）
node scripts/verify-audit-chain.mjs
# 期望：链化行 1603+（含新增的 18 字段），头 hash 已重算
# 文档 docs/audit-chain-head.txt 末行 hash 与新头匹配

# 4. 跑 reconcile
node scripts/reconcile-orders.mjs
# 期望：R3 报 9 缺口（旧 snapshot 无 audit_logs 关联——首次结构化暴露）

# 5. 跑 e2e 订单事件
curl -X POST .../orders  # 创建订单
# 期望：audit_logs 新增一行含 orderId/correlationId 关联
# R3 重跑 → 该订单不报缺口
```

### 5.4 数字三件套（按 BACKLOG 规则 3）

| 数字 | 复现命令 | 日期 | 口径 |
|------|----------|------|------|
| audit_logs 加 2 列 | `npx typeorm migration:run` | 2026-10-13 | 仅 dev 库 |
| 全 audit 链重锚 1603+ 行 | `node scripts/reanchor-audit-chain-for-v3.mjs` | 2026-10-13 | 一次性 + 停服 |
| R3 首次暴露 9 缺口 | `node scripts/reconcile-orders.mjs` | 2026-10-13 | 旧数据真实合规缺口 |
| 改动文件 6 | `git diff --name-only v3..HEAD` | 2026-10-13 | 排除 .d.ts 依赖锁 |

---

## 6. 风险与缓解

### 6.1 真实风险

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 停服窗口期 audit 链报红 | 🟡 高 | 中 | **必须停服**重锚（v3 §5.3 step 2）；不停服会"半重锚"产假链 |
| 锚文件 `docs/audit-chain-head.txt` 未联动 | 🟡 中 | 中 | v3 §5.3 step 3 明确"同 commit 写新 anchor" |
| audit_logs 表 1603 行 ALTER 性能 | 🟢 低 | 低 | nullable 加列 INSTANT 操作（TiDB/MySQL 8.0+）；dev 库 1603 行可秒级 |
| TiDB 大表 ALTER（10万+行）| 🟡 中 | 中 | 🟡 接受（nullable 列 INSTANT 仍秒级）——v3 不改 NOT NULL |
| controller 三 handler 漏改一处 | 🟢 低 | 中 | v3 §2.2 步 4 显式列 3 handler 清单；TS 编译期查 |
| trust proxy 漏配 → IP 取 socket 地址 | 🟢 低 | 低 | v3 §2.2 步 4 沿用 extractIpAddress（不直接用 request.ip）|
| auditService.log 现有 3 处调用方漏改 | 🟡 中 | 中 | v3 把 orderId/correlationId 设为 optional，但 correlationId 不传 → throw——**强制 caller 改** |

### 6.2 软性阻力（已消除）

v2 最大的"软性阻力"是 admin UI 接受度——C 席 P2-8 实查 admin.js:226-246 **没有 audit 浏览 UI**。

**v3 0 软性阻力**：
- 0 新增 admin UI 端点（v2 的 `/audit/order-snapshots` 删了）
- 0 schema 改 snapshot 表（v2 的 snapshot 3 列删了）
- 0 R3 删除（v2 的 R3 物理删除恢复）
- 0 M5 重新定义（v2 的 scope 限定解释删了）

### 6.3 真实需业务侧接受

- 旧 9 条 snapshot 历史无 audit_logs 关联——**首次被结构化发现**（v2 R3 改判词掩盖了这条；v3 真实暴露）
- 业务侧决策：① backfill 旧 9 条（v3 不在本次实施）；② 接受"历史有缺口"现实
- 合规侧接受：R3 改真 JOIN 后，未来 R3 红 = 真合规问题

---

## 7. 实施路径（按依赖排序）

| 步 | 文件 | 改动 | 依赖 |
|----|------|------|------|
| 1 | `backend/src/common/audit/entities/audit-log.entity.ts` | 加 2 列（orderId/correlationId）+ 2 索引 | 0 |
| 2 | `backend/src/database/migrations/20261013000001-add-audit-log-order-fk.ts` | 新建——TypeORM migration class（沿用既有 8 个 migration 模式）| 1 |
| 3 | `backend/src/common/audit/audit-chain.ts:21-38` | CANONICAL_KEYS 追加 2 键（16→18）| 1 |
| 4 | `backend/scripts/reanchor-audit-chain-for-v3.mjs` | 新建——全 audit 链重算（沿用 backfill-audit-chain.mjs 模式）| 3 |
| 5 | `backend/src/common/audit/audit.service.ts` | log() 接受 orderId/correlationId 参数 + correlationId 不传 throw | 0 |
| 6 | `backend/src/orders/orders.controller.ts:175-194` | update() handler 加 @Request() + 传 audit 上下文 | 5 |
| 7 | `backend/src/orders/orders.controller.ts:62-66` | create() 已有 @Request() —— 只需传 orderId/correlationId | 5 |
| 8 | `backend/src/orders/orders.service.ts:192/376/513` | 三处 appendSnapshot caller 加 auditService.log 调用 | 5, 6, 7 |
| 9 | `scripts/reconcile-orders.mjs:128-147` | R3 改真 JOIN 跨表对账 | 1, 3 |
| 10 | spec 4 处（见 §5.2）| +7 条新 spec | 5, 6, 7, 8, 9 |
| 11 | `docs/audit-chain-head.txt` | 手动更新末行（重锚后新头 hash）| 4 |
| 12 | `BACKLOG.md` | 旧 9 条 snapshot 历史 backfill 挂账 | 9 |

**预计 1-2 人天**（不含停服窗口期）。

### 7.1 回退路径

**强耦合（须停服回退）**：
- 步 1-4 schema + 链——必须 4→3→2→1 顺序回退
- 步 5-8 应用代码——可分批回退（先回退应用代码再回退 schema）

**独立可回退**：
- 步 9 R3 改判词——回退到 LIKE 模糊查（旧版本）
- 步 11 锚文件——git revert 即可
- 步 12 挂账——无代码改动，纯文档

**回退风险**：
- 步 5-8 已上线但步 1-4 未做——audit_logs INSERT 失败（缺列）→ 运行时炸
- 步 9 已上线但步 1 未做——R3 JOIN 查新列但列不存在 → SQL 错
- **结论**：步 1-4 必须先于步 5-8 上线，**强执行序**

---

## 8. 关键文件清单（绝对路径）

**修改**（6 文件）：
- `backend/src/common/audit/entities/audit-log.entity.ts`（加 2 列 + 2 索引）
- `backend/src/common/audit/audit-chain.ts`（CANONICAL_KEYS 追加 2 键）
- `backend/src/common/audit/audit.service.ts`（log() 加 2 参数）
- `backend/src/orders/orders.controller.ts`（3 handler 改造）
- `backend/src/orders/orders.service.ts`（3 caller 加 audit 调用）
- `scripts/reconcile-orders.mjs`（R3 改真 JOIN）

**新建**（3 文件）：
- `backend/src/database/migrations/20261013000001-add-audit-log-order-fk.ts`
- `backend/scripts/reanchor-audit-chain-for-v3.mjs`
- `backend/src/common/audit/audit.service.spec.ts`（如不存在）+ 7 条新 spec

**文档**：
- `docs/audit-chain-head.txt`（重锚后手动更新）
- `BACKLOG.md`（旧 9 条历史 snapshot backfill 挂账）

---

## 9. v3 vs v2 vs v1 对比（一句话）

| 方案 | 一句话 | 治本率 | 实施复杂度 | 三席结果 |
|------|--------|--------|------------|----------|
| v1 | audit 走 em 同事务 | 0% | 4 文件 | 🔴 否决 |
| v2 | snapshot 加 3 列 + 删 R3 | 100% 表象 | 12 文件 | 🔴 三席否决 |
| **v3** | **audit_logs 加 2 列 + R3 改真 JOIN** | **100% 实质** | **6 文件** | **应通过** |

---

## 10. 待三席重审问题

1. audit_logs 加 2 列（orderId + correlationId）是否真为"补缺外键"治本？
2. R3 改真 JOIN 后是否能完整覆盖"快照有 audit_logs 行"对账语义？
3. 16→18 字段的 audit 链重锚成本（1603+ 行）是否可控？
4. correlationId NOT NULL 约束（C 席建议）vs nullable（v3 §2.2 步 3 当前设计）——二选一？
5. controller 3 handler 改造（@Request 透传）——B 席 P1 修因已就位？
6. 旧 9 条 snapshot 历史 backfill 是否纳入本次实施？建议挂账后续批——接受？

---

**提案 v3 完。** 等三席重审 v3 + 业务侧（合规）确认。
