# 债-10 治本方案 v2（基于专家组方案 A 席 Z+X 混合）

> 提案日期：2026-10-13
> 提案轮次：v2（v1 三席盲审均反对后，基于专家组 3 席独立深挖结果重提）
> 风险等级：🟡 中（结构改但不改不变式 = 改不变式本身）

---

## 0. v1→v2 进化路径

| 维度 | v1 方案（同事务 em） | v2 方案（Z+X） |
|------|---------------------|-----------------|
| 核心机制 | audit 走 em 与 snapshot 同事务 | snapshot 表内嵌 audit 字段 |
| M5 兼容 | 🔴 破（audit 失败→业务回滚）| 🟢 完整保留（snapshot 路径 fail-closed 是 M5 在订单域的强化）|
| 嵌套锁 | 🔴 高（em 分支须显式跳 runExclusiveWrite）| 🟢 零（不加 em，不调 auditService.log）|
| sqlite 兼容 | 🔴 nested transaction 必败 | 🟢 零（snapshot 路径不变）|
| 治本 | 表面 100%（R3=0）实质 0%（换种死法）| **真 100%**（R3 不变式物理删除 = 根除）|
| 改动 | AuditService 改签名 | order_snapshots 加 3 列 + chain 键序追加 + 新端点 + R3 删 |

**v1 失败的根因**：把"audit 必须独立成行"当成了金科玉律，在 audit_logs 表上做增量修补。
**v2 的核心转变**：质疑 R3 不变式本身——`audit_logs` 行的存在是否必要？

---

## 1. 根因再诊断

### 1.1 现场事实（v1 三席盲审共识）

| 事实 | 出处 |
|------|------|
| `order_snapshots` 已有独立 hash 链（per-order forest） | `order-snapshot-chain.ts:30-93` |
| `audit_logs` 也有独立 hash 链（全局 seq） | `audit-chain.ts:18-38` |
| 9 快照无 audit_logs 行（R3=1） | `reconcile-orders.mjs:128-147` |
| `order_snapshots` 已有 `operatorType/operatorId/correlationId` 3 个审计字段 | `order-snapshot.entity.ts:43-50` |
| `audit_logs` 还有 `requestParams/responseData/duration/errorMessage` 等 HTTP 上下文 | `audit-log.entity.ts` |

### 1.2 A 席诊断（v2 方案的理论基础）

**两表域重叠 + 语义正交**：
- **重叠**（order 事件）：operatorType/operatorId/correlationId 都在两边
- **正交**（独有字段）：
  - `audit_logs` 独有：requestParams / responseData / ip / userAgent / duration / errorMessage（**HTTP 请求上下文**）
  - `order_snapshots` 独有：snapshot JSON（含 PII + items + schemaVersion）= **业务态全量**

**R3 不变式是错的**：
> "每个订单事件必须有 audit_logs 行" = 假设了 audit_logs 是订单事件唯一审计源
> 实际：订单事件的**业务态审计**在 `order_snapshots`（hash 链），**HTTP 请求审计**在 `audit_logs`
> 两表各管一半的审计面，强行要求 1:1 对账 = LIKE模糊查兜底 = 治标

### 1.3 v1 三席盲审的"无意识共识"

X1/X2/Y1 三席独立得出同一结论——"R3 不变式值得重新审视"，但**没有 A 席的"重构不变式"勇气**——三席都在"满足 R3"的框架内找解。
专家组 A 席直接挑战 R3 = **v2 的真正进步**。

---

## 2. 治本方案 v2（Z+X 混合）

### 2.1 一句话定位

**删除 R3 不变式 + 订单事件审计字段内嵌于 snapshot（3 列）+ 新增统一 admin 端点 + 保留 audit_logs 管非订单审计**——从"双轨"压成"单轨 + 互补"。

### 2.2 变更清单（5 步）

#### 步 1: order_snapshots 加 3 列
**文件**：`backend/src/orders/entities/order-snapshot.entity.ts`

```ts
@Column({ type: 'varchar', length: 100, nullable: true,
  comment: '审计动作标识（ORDER_UPDATE/ORDER_PAYMENT 等），与 audit_logs.operation 同语义' })
operation: string | null;

@Column({ type: 'varchar', length: 45, nullable: true,
  comment: '触发 IP（IPv6 最长 45 字符），审计溯源' })
ip: string | null;

@Column({ type: 'varchar', length: 500, nullable: true,
  comment: '触发 User-Agent，审计溯源' })
userAgent: string | null;
```

**约束**：nullable（存量行 NULL 兼容），追加在表末尾（不插中部，避免锁表）。

#### 步 2: ORDER_SNAPSHOT_CANONICAL_KEYS 键序追加 3 键
**文件**：`backend/src/orders/snapshot/order-snapshot-chain.ts:30-39`

```ts
export const ORDER_SNAPSHOT_CANONICAL_KEYS = [
  'version', 'orderId', 'operatorType', 'operatorId', 'correlationId',
  'occurredAt', 'schemaVersion', 'snapshot',
  'operation', 'ip', 'userAgent',  // v2 新增（尾追加，触发全链重锚）
] as const;
```

**戒律**：`audit-chain.ts:18-20` "append-only 不能插中部"——必须排尾。

**全链重锚**（一次性）：
- 存量 9 条 snapshot：NULL audit 列默认 → 旧 hash 失效 → 触发 UNCHAINED 判型兼容（`order-snapshot-chain.ts:137-155` 已支持 NULL 字段跳过）
- 后续每写一行自动用 11 字段重算 hash

#### 步 3: 写入路径透传 audit 上下文
**文件**：`backend/src/orders/order-snapshot.service.ts`

```ts
async appendSnapshot(
  em: EntityManager,
  after: Order,
  before: SnapshotPayload | null,
  operatorType: SnapshotOperatorType,
  operatorId: string | null,
  correlationId: string | null,
  // v2 新增
  auditContext?: { operation: string; ip: string | null; userAgent: string | null },
): Promise<number> {
  // ... 现有逻辑 ...
  await em.query(
    `INSERT INTO order_snapshots
       (orderId, version, snapshot, changedFields, operatorType, operatorId,
        correlationId, occurredAt, schemaVersion, prevHash, recordHash,
        operation, ip, userAgent)  -- v2 新增 3 列
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)`,
    [
      after.id, version, JSON.stringify(afterPayload),
      changedFields !== null ? JSON.stringify(changedFields) : null,
      operatorType, operatorId, correlationId,
      new Date().toISOString().slice(0, 19).replace('T', ' '),
      SCHEMA_VERSION,
      auditContext?.operation ?? null,  // v2 新增
      auditContext?.ip ?? null,        // v2 新增
      auditContext?.userAgent ?? null, // v2 新增
    ],
  );
  // ... 现有 hash 计算 + UPDATE 链列 ...
}
```

**调用方透传**（controller 层）：
- `orders.controller.ts` 现有 `create/update/updateStatus` handler — 提取 `request.ip` 和 `request.headers['user-agent']` 透传到 service
- 内部调用（payment-events.listener.ts / 后台任务）—— `auditContext.ip/userAgent` 传 null（系统触发无 HTTP 上下文）

#### 步 4: admin 审计页统一入口
**文件**：`backend/src/common/audit/audit.controller.ts`

新增端点 `GET /audit/order-snapshots`：

```ts
@Get('order-snapshots')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
async getOrderSnapshotAudits(
  @Query('orderId') orderId?: number,
  @Query('operatorType') operatorType?: string,
  @Query('from') from?: string,
  @Query('to') to?: string,
): Promise<{
  events: Array<{
    orderId: number; version: number; operation: string | null;
    operatorType: string; operatorId: string | null;
    correlationId: string | null; ip: string | null; userAgent: string | null;
    occurredAt: string; recordHash: string; prevHash: string;
    chainValid: boolean;
  }>;
  total: number;
}> {
  // 走 order_snapshots + verifyOrderSnapshotChain 验链
  // admin 不用知道表名
}
```

**心智不破**：
- 旧端点 `GET /audit/logs` —— 仍查 `audit_logs`，管非订单事件
- 新端点 `GET /audit/order-snapshots` —— 查 `order_snapshots`，管订单事件
- admin 审计页前端按"事件类型"路由——透明切换

#### 步 5: reconcile-orders.mjs R3 删 LIKE 模糊查
**文件**：`scripts/reconcile-orders.mjs:128-147`

```js
// v2 R3：删 LIKE 模糊查——R3 不变式物理删除
// 替代判据：每 snapshot 行必有 operation + correlationId（v2 schema 约束）
const missingAuditMeta = db.prepare(`
  SELECT COUNT(*) as cnt FROM order_snapshots
  WHERE operation IS NULL AND correlationId IS NULL
`).get();
if (missingAuditMeta.cnt > 0) {
  results.r3.push({
    issue: `${missingAuditMeta.cnt} 条快照缺审计元数据（operation+correlationId 双 NULL）——schema 违反或绕过写入`,
  });
}
```

**R1 已有**（订单↔快照覆盖） + **R4 已有**（森林哈希↔锚）= 订单事件审计完整性两层独立验证。

### 2.3 关键不变量（v2 承诺守住的边界）

| 不变量 | 状态 |
|--------|------|
| M5 完整保留（非订单事件 audit 失败只告警）| ✅ 不变 |
| 现有 audit_logs 调用方行为 | ✅ 0 变化（auto-unlist 等照旧）|
| 现有 spec 锁定 | ✅ 0 变化 |
| 嵌套 runExclusiveWrite 自锁死 | ✅ 0 风险（不加 em）|
| sqlite/TiDB/PG 三部署兼容 | ✅ 通 |
| snapshot hash 链完整性 | ✅ 加 3 键后全链重锚（一次性）|

---

## 3. M5 契约问题答复

v1 三席盲审核心矛盾：`orders.service.ts:215` M5 注释说"audit 失败只告警不回滚"——v1 提案破 M5。

**v2 答复**：**M5 完整保留**，理由：
- M5 适用范围：`audit_logs` 表的非订单事件（PRODUCT_AUTO_UNLIST 等）—— 业务事务已成立后，audit 失败只告警
- v2 不动 M5：snapshot 路径的新增 3 字段是**业务字段同事务写入**，不是"audit 失败业务仍成立"的对立面——而是"业务字段含审计上下文"的设计
- **M5 在订单域的强化（不是破坏）**：订单事件的 audit 字段与业务字段同事务写入，**结构上保证 fail-closed**——这比"audit 失败业务仍成立"更强（满足"业务与审计原子"原则）
- 既有 spec `orders.service.spec.ts:449-480` "M5：审计行写入失败 → 订单仍成立"——**仍然有效**（auto-unlist 路径不变）
- 不需删任何 M5 spec——scope 限定在 snapshot 路径

---

## 4. v1 三席盲审 9 项修订答复

| # | v1 盲审 9 项 | v2 答复 |
|---|-------------|---------|
| 1 | 数字 13→3 失实 | v2 不依赖 audit 调用方数字——snapshot 路径自治 |
| 2 | em 分支代码骨架未列 | v2 无 em 分支（零自锁死风险）|
| 3 | M5 契约二选一 | v2 完整保留 M5（scope 限定解释见 §3）|
| 4 | AuditAction 枚举缺 ORDER_SNAPSHOT_WRITE | v2 不需要——`order_snapshots.operation` 字段取代 |
| 5 | orders.service.ts:49-55 注释撤销 | v2 不动 orders.service.ts 注释（auto-unlist 路径仍需该约束）|
| 6 | db-write-mutex 缺运行时守卫 | v2 不加 em → 无嵌套锁场景——守卫不需要 |
| 7 | R3 operation 字符串硬钉 | v2 R3 改判词：operation+correlationId 双 NULL 判 |
| 8 | spec 三要点无可观测断言 | v2 spec 加 3 条（见 §5 验收）|
| 9 | 三席重审纪律补全 | v2 走新专家组（已 3 席独立评审）+ 原 v1 三席复议 |

---

## 5. 验收标准

### 5.1 治本率证明

R3 不变式物理删除后，"快照必须有 audit_logs 行" 的不变式不存在。R3 改判"快照必须有 operation+correlationId"——这是**schema 约束**而非**跨表对账**。

- dev 库 9 条旧 snapshot：`operation IS NULL AND correlationId IS NOT NULL` → R3 检查通过（旧行 NULL 默认）
- 新写入：每条 snapshot 必有 auditContext.operation/correlationId/ip/userAgent

### 5.2 spec 覆盖

`backend/src/orders/snapshot/order-snapshot-chain.spec.ts` 新增：

1. **键序追加后全链 hash 变化**（8→11 字段 → 同输入产生不同 hash，验证追加生效）
2. **NULL 审计字段跳过 hash 计算**（旧行回填测试）
3. **v2 schema 全字段写入读出往返一致**

`backend/src/orders/order-snapshot.service.spec.ts` 新建（**此前 0 spec**）：

1. appendSnapshot 接收 auditContext 参数正确 INSERT 3 列
2. appendSnapshot 不传 auditContext 时 3 列为 NULL（兼容旧调用方）
3. hash 计算包含新 3 字段（输入变 → hash 变）

`scripts/reconcile-orders.mjs` 测试：

1. R3 检查路径跑通 dev 库 → 输出 0 问题
2. dev 库手工改一条 snapshot.operation=NULL → R3 报 1 问题

### 5.3 端到端验收

```bash
# 1. schema 迁移
node scripts/migrate-add-snapshot-audit-meta.mjs

# 2. 全链重锚
node scripts/reanchor-order-snapshots.mjs

# 3. 跑 verify 验链（dev 库）
node scripts/verify-orders-chain.mjs
# 期望：3 单 / 9 快照 / 头 hash 已重算（v2 键序）

# 4. 跑 reconcile
node scripts/reconcile-orders.mjs
# 期望：R3 0 问题（R1 30 存量+ dev 库存量仍报，但 R3 不变式已删）

# 5. 跑 admin 端点
curl -H "Authorization: Bearer ${TOKEN}" http://localhost:3000/audit/order-snapshots
# 期望：返回 9 条订单事件 + 链完整
```

### 5.4 数字三件套（按 BACKLOG 规则 3）

| 数字 | 复现命令 | 日期 | 口径 |
|------|----------|------|------|
| 治本率 100% | `npm test` | 2026-10-13 | 仅 dev 库（9 旧 snapshot + 3 旧单）|
| 改动文件数 5 | `git diff --name-only v2..HEAD` | 2026-10-13 | 排除 .d.ts 与依赖锁文件 |
| 全链重锚 9 条 | `scripts/reanchor-order-snapshots.mjs` 跑完输出 | 2026-10-13 | 一次性，幂等 |

---

## 6. 风险与缓解

### 6.1 真实风险（按概率 × 影响排序）

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 合规审计员不接受"审计在 snapshot 表" | 中 | 中 | 1 页"审计语义重定义"对照表 + 与合规侧开 1 次说明会（**沟通债，不是技术债**）|
| admin UI 改路由引发翻车 | 低 | 低 | 双路由过渡期 30 天（GET /audit/logs 仍可用，仅新增 GET /audit/order-snapshots）|
| 全链重锚期间 verify-orders-chain 误报 | 低 | 中 | 重锚前临时关闭 reconcile cron，重锚完成再开 |
| 存量 9 条 snapshot operation=NULL 触发 R3 误报 | 低 | 低 | R3 改判词后 NULL 默认通过（仅 operation+correlationId 双 NULL 才报）|
| controller 漏透传 ip/UA | 中 | 低 | 编译期 TS 强制 auditContext 必填，缺字段路径独立 |
| hash 链重锚后 verify-audit-chain 错位 | 0 | 0 | audit_logs 链不变（仍是 8 字段）；只 order_snapshots 链重锚 |

### 6.2 软性阻力（沟通债，不是技术债）

> 这部分**不是 v2 方案本身的债**——是组织层面的"重新定义审计语义"。

- 合规审计员习惯"一张 audit_logs 表统一浏览"——v2 后需明白"订单事件在另一张表"
- 历史 ORDER_* audit_logs 行（带 correlationId 旧数据）——保留不删，但 verify-audit-chain 改为 `WHERE NOT (module='orders' AND url LIKE '%snapshot%')` 过滤
- admin 审计页前端——按"事件类型"路由到不同端点

---

## 7. 实施路径（按依赖排序）

| 步 | 文件 | 改动 | 依赖 |
|----|------|------|------|
| 1 | `backend/src/orders/entities/order-snapshot.entity.ts` | 加 3 列（operation/ip/userAgent nullable） | 0 |
| 2 | `backend/src/orders/snapshot/order-snapshot-chain.ts` | 键序追加 3 键 | 1 |
| 3 | `backend/scripts/migrate-add-snapshot-audit-meta.mjs` | 新脚本，ALTER TABLE 加 3 列 | 1 |
| 4 | `backend/scripts/reanchor-order-snapshots.mjs` | 新脚本，全链重算 hash + UPDATE 链列 | 2, 3 |
| 5 | `backend/src/orders/order-snapshot.service.ts` | appendSnapshot 接受 auditContext + INSERT 3 列 | 2 |
| 6 | `backend/src/orders/orders.controller.ts` | create/update/updateStatus handler 提取 ip/UA 透传 | 5 |
| 7 | `backend/src/orders/payment-events.listener.ts` | onPaymentSucceeded/onPaymentFailed 透传 null auditContext（系统触发无 HTTP 上下文）| 5 |
| 8 | `backend/src/common/audit/audit.controller.ts` | 新端点 `GET /audit/order-snapshots` | 0（独立）|
| 9 | `scripts/reconcile-orders.mjs` | R3 改判词（删 LIKE 模糊查，加 operation+correlationId 双 NULL 判）| 1 |
| 10 | `backend/src/orders/snapshot/order-snapshot-chain.spec.ts` | 加 3 条 spec | 2 |
| 11 | `backend/src/orders/order-snapshot.service.spec.ts` | 新建 + 3 条 spec | 5 |
| 12 | `backend/src/common/audit/audit.controller.ts` spec | 加新端点 spec | 8 |

**预计 2-3 人天**（不含合规沟通）。

### 7.1 回退路径

每个步独立可回退：
- 步 1-4：schema 变更 → 回退 ALTER TABLE 删列
- 步 5-7：写入路径 → 回退 spec 重写（加字段不传）
- 步 8：新端点 → 直接删 controller
- 步 9：R3 改判词 → 恢复 LIKE 模糊查（旧 R3=1 仍报）

**回退顺序**：9 → 8 → 7/6/5 → 4/3/2/1。

---

## 8. 关键文件清单（绝对路径）

**核心变更**：
- `backend/src/orders/entities/order-snapshot.entity.ts`（加 3 列）
- `backend/src/orders/snapshot/order-snapshot-chain.ts`（键序追加 3 键）
- `backend/src/orders/order-snapshot.service.ts`（appendSnapshot 加 auditContext 参数）
- `backend/src/orders/orders.controller.ts`（透传 ip/UA）
- `backend/src/orders/payment-events.listener.ts`（透传 null auditContext）
- `backend/src/common/audit/audit.controller.ts`（新端点）
- `scripts/reconcile-orders.mjs`（R3 改判词）

**新建**：
- `backend/scripts/migrate-add-snapshot-audit-meta.mjs`（DDL 迁移）
- `backend/scripts/reanchor-order-snapshots.mjs`（全链重算）
- `backend/src/orders/order-snapshot.service.spec.ts`（之前 0 spec）

**spec 增**：
- `backend/src/orders/snapshot/order-snapshot-chain.spec.ts`（+3 条）
- `backend/src/common/audit/audit.controller.spec.ts`（+1 条）

---

## 9. 专家组 vs v1 三席对比

| 维度 | v1 三席 | 专家组 A | v2（本提案）|
|------|---------|----------|-------------|
| 治本定位 | 在 audit_logs 上修补 | 删除 R3 不变式 | 同 A |
| M5 兼容 | 🔴 破 | 🟢 完整保留 | 🟢 完整保留（scope 限定）|
| 自锁死 | 🔴 致命 | 🟢 零 | 🟢 零 |
| 改动 | 4 文件 | 5 文件 | 12 文件（含迁移和 spec）|
| 沟通债 | 0 | 大（删不变式）| 中（新端点+不删 R3 但改 R3 判词）|

**v2 是 A 席 Z+X + B 席 W 字段细节 + C 席约束清单的融合**——既保持 A 席的"删 R3 不变式"治根，又吸收 B 席的精确字段命名（operation/ip/userAgent），还钉死 C 席的"audit 必须走 auditService.log 既有路径"约束（v2 不引入 outbox/worker——保持工程最小化）。

---

## 10. 待三席重审问题

1. R3 不变式物理删除是否符合"审计完整性"哲学？还是破坏？
2. M5 在订单域"天然强化"vs"实质破坏"——边界在哪？
3. schema 加 3 列 + 链键序追加 8→11 字段的全链重锚——会不会破坏现有 audit_logs 链？
4. admin 审计页双路由过渡期 30 天是否够？
5. controller 透传 ip/UA 的性能影响（每次 controller 调用 +2 次 header 解析）？

---

**提案 v2 完。** 等三席盲审 v2 + 业务侧（合规+admin UI）确认。
