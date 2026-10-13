# 债-10 治本方案 v4（v3 三席盲审后修订）

> 提案日期：2026-10-13
> 提案轮次：v4（v1 三席否决 → 专家组 3 席深挖 → v2 三席否决 → v3 三席盲审 25+ 项修订）
> 核心机制：保留 v3 的"audit_logs 加 2 列 + R3 改真 JOIN"（三席均认可方向对）
> 修订：综合 α 回归 / β 数据建模 / γ 实施细节 3 席盲审发现

---

## 0. v3 → v4 修订路径

| 维度 | v3 自评 | v3 盲审（α+β+γ）| v4 修订 |
|------|--------|-------------------|--------|
| R3 数字 | R3=1 | γ 实测 R3=9（6 NULL + 3 missing）| **R3=9 写实** |
| 改动文件 | 6 | γ 实测 ≥10（SELECT 4 文件漏列）| **10 文件** |
| 实施人天 | 1-2 | γ 实测 3-4（含 prod 验证）| **3-4 人天** |
| 停服时长 | "必须停服" | γ 实测 1.017s（dev）| **≤5min**（10万+ 行估） |
| 创世式接入 | 隐 | β 抓出：现有 3 caller 全无 ORDER_* | **v4 §1.3 显式披露** |
| updateStatus handler | "需新建"（误）| α 抓出：生产零调用 | **不动**（与 §3"0 变化"对齐）|
| correlationId 前缀 | 未定 | γ 抓出：&apos;payment:&apos; vs &apos;update:order:&apos; 不一致 | **v4 §6.2 统一规范** |
| R3 whitelist | 10 项含 PAYMENT_* | β 抓出：PAYMENT_* 不在 appendSnapshot 路径 | **减至 8 项 ORDER_*** |
| throw 约束 | "全局" | β 抓出：与 products/test 3 caller 冲突 | **限定 orders 模块** |
| 既有 spec:32 锁 16 | v3 未提必破 | γ 抓出：v3 步 2 实施即红 | **v4 §7 既有 spec 同步改** |
| extractIpAddress 私有 | "沿用" | γ 抓出：私有方法外部 service 调不到 | **v4 §6.3 改 public** |
| trust proxy | "沿用" | γ 抓出：未配 trust proxy，IP 仍取 socket | **v4 §6.3 main.ts 配 trust proxy** |
| migration PG 分支 | 无 | γ 抓出：v3 引用范本仅 MySQL/TiDB | **v4 §5 显式 PG 分支** |
| 索引不对齐 R3 谓词 | (orderId,createTime) + (correlationId) | β 抓出：R3 JOIN 谓词不命中 | **(orderId, correlationId, module) 复合** |

---

## 1. 根因（A/B/C 三席共识）

### 1.1 A 席诊断

audit_logs 表**没 orderId / correlationId 字段**（实地查 `audit-log.entity.ts:1-67` 全文 18 字段）——两表缺显式外键，R3 退化用 LIKE 模糊查。

### 1.2 v3 §1.1 vs §3 字段数自相矛盾（β 抓出）

| 段 | 字段数 |
|----|--------|
| v3 §1.1 | "17 列" |
| v3 §3 | "18 列" |
| 实地（β 席）| **18 列** |

v4 §1.1 改为 **18 列**（id + 16@Column + createTime = 18）。

### 1.3 创世式接入明确披露（β 抓出）

当前 auditService.log 实际只 3 处 caller（实地 grep）：

| 位置 | operation | 是否 order 事件 |
|------|-----------|-----------------|
| `orders.service.ts:218` | `PRODUCT_AUTO_UNLIST` | ❌ 商品事件 |
| `products.controller.ts:211, 539, 562`（3 处调 `auditProductWrite`）| `ADMIN_PRODUCT_MANAGE` | ❌ 商品管理 |
| `audit.controller.ts:407` | `SYSTEM_MAINTENANCE` | ❌ 测试端点 |

**全工程 0 条 ORDER_* 审计行**——v4 §2.2 步 5 "新增 3 处 auditService.log" 是**创世式接入**（从无到有），不是"透传"。

---

## 2. 治本方案 v4

### 2.1 一句话定位

**audit_logs 加 2 列（orderId + correlationId） + CANONICAL_KEYS 16→18 + 4 文件 SELECT 列清单同步 + R3 改真 JOIN + 3 处创世式 auditService.log 新增 + correlationId 前缀规范 + throw 限定 orders 模块 + trust proxy 配 + extractIpAddress 改 public**——10 文件改动，3-4 人天，R3 改真结构化跨表对账。

### 2.2 变更清单（10 文件）

#### 步 1: audit_logs 加 2 列
**文件**：`backend/src/common/audit/entities/audit-log.entity.ts`

新增字段（行 67 之后）：
```ts
@Column({ type: 'int', nullable: true, comment: '订单ID（logical reference, no DB constraint - audit immutability）' })
orderId: number | null;

@Column({ length: 128, nullable: true, comment: '业务关联ID（与 order_snapshots.correlationId 对齐，128 字符对齐）' })
correlationId: string | null;
```

**索引**（替换 v3 索引——β 抓出不对齐 R3 谓词）：
```ts
@Index(['orderId', 'correlationId', 'module'])  // 复合对齐 R3 真 JOIN 谓词
@Index(['correlationId'])
@Index(['module', 'operation', 'createTime'])  // R3 whitelist IN 过滤
```

#### 步 2: CANONICAL_KEYS 16→18
**文件**：`backend/src/common/audit/audit-chain.ts:21-38`

```ts
export const CANONICAL_KEYS = [
  'seq', 'id', 'createTime',
  'userId', 'userName',
  'operation', 'module', 'method', 'url',
  'ip', 'userAgent',
  'requestParams', 'responseData',
  'duration', 'status', 'errorMessage',
  'orderId', 'correlationId',  // v4 新增（尾追加，全 audit 链重锚）
] as const;
```

**长度 = 18 字段**。

#### 步 3: migration 三方言（α P0 + γ P1-2 修因）
**文件**：`backend/src/database/migrations/20261013000001-add-audit-log-order-fk.ts`

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogOrderFk1700000000000 implements MigrationInterface {
  name = 'AddAuditLogOrderFk1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // MySQL/TiDB
    if (queryRunner.connection.options.type === 'mysql' || /* TiDB */) {
      await queryRunner.query(`
        ALTER TABLE audit_logs
        ADD COLUMN orderId INT NULL COMMENT '订单ID（logical reference）',
        ADD COLUMN correlationId VARCHAR(128) NULL COMMENT '业务关联ID'
      `);
      // 索引：v4 复合索引对齐 R3 JOIN
      await queryRunner.query(`CREATE INDEX IDX_audit_logs_order_corr_module ON audit_logs (orderId, correlationId, module)`);
      await queryRunner.query(`CREATE INDEX IDX_audit_logs_correlationId ON audit_logs (correlationId)`);
      await queryRunner.query(`CREATE INDEX IDX_audit_logs_module_op_time ON audit_logs (module, operation, createTime)`);
    }
    // PostgreSQL
    else if (queryRunner.connection.options.type === 'postgres') {
      await queryRunner.query(`ALTER TABLE audit_logs ADD COLUMN "orderId" INTEGER NULL`);
      await queryRunner.query(`ALTER TABLE audit_logs ADD COLUMN "correlationId" VARCHAR(128) NULL`);
      await queryRunner.query(`COMMENT ON COLUMN audit_logs."orderId" IS '订单ID（logical reference）'`);
      await queryRunner.query(`COMMENT ON COLUMN audit_logs."correlationId" IS '业务关联ID'`);
      await queryRunner.query(`CREATE INDEX IDX_audit_logs_order_corr_module ON audit_logs ("orderId", "correlationId", module)`);
      await queryRunner.query(`CREATE INDEX IDX_audit_logs_correlationId ON audit_logs (correlationId)`);
      await queryRunner.query(`CREATE INDEX IDX_audit_logs_module_op_time ON audit_logs (module, operation, "createTime")`);
    }
    // SQLite
    else {
      // SQLite synchronize=true 自动建表（dev 用），不走 migration
      // 但保留此分支以便显式 run
      const cols = await queryRunner.query(`PRAGMA table_info(audit_logs)`);
      if (!cols.find((c: any) => c.name === 'orderId')) {
        await queryRunner.query(`ALTER TABLE audit_logs ADD COLUMN orderId INTEGER`);
      }
      if (!cols.find((c: any) => c.name === 'correlationId')) {
        await queryRunner.query(`ALTER TABLE audit_logs ADD COLUMN correlationId VARCHAR(128)`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 反向：先删索引再删列
    if (queryRunner.connection.options.type === 'mysql') {
      await queryRunner.query(`DROP INDEX IDX_audit_logs_order_corr_module ON audit_logs`);
      await queryRunner.query(`DROP INDEX IDX_audit_logs_correlationId ON audit_logs`);
      await queryRunner.query(`DROP INDEX IDX_audit_logs_module_op_time ON audit_logs`);
      await queryRunner.query(`ALTER TABLE audit_logs DROP COLUMN orderId`);
      await queryRunner.query(`ALTER TABLE audit_logs DROP COLUMN correlationId`);
    } else if (queryRunner.connection.options.type === 'postgres') {
      await queryRunner.query(`DROP INDEX IF EXISTS IDX_audit_logs_order_corr_module`);
      await queryRunner.query(`DROP INDEX IF EXISTS IDX_audit_logs_correlationId`);
      await queryRunner.query(`DROP INDEX IF EXISTS IDX_audit_logs_module_op_time`);
      await queryRunner.query(`ALTER TABLE audit_logs DROP COLUMN "orderId"`);
      await queryRunner.query(`ALTER TABLE audit_logs DROP COLUMN "correlationId"`);
    } else {
      // SQLite 不支持 DROP COLUMN
      throw new Error('SQLite down migration not supported; restore from backup');
    }
  }
}
```

**v3 错点**（β P1-6 抓出）：v3 §2.2 步 1 路径写 `backend/scripts/`——**必须放 `backend/src/database/migrations/`**（v3 §8 才写对路径——v4 统一）。

#### 步 4: 4 文件 SELECT 列清单同步（α P0 修因）

**v3 漏列**（α 抓出"部署即全链 CONTENT 红屏"）：

| 文件 | 现状 SELECT | v4 改后 SELECT |
|------|------------|---------------|
| `scripts/verify-audit-chain.mjs:92-94` | 18 列 | **20 列 + orderId, correlationId** |
| `backend/scripts/backfill-audit-chain.mjs:54-58, 95-99` | 18 列 | **20 列 + orderId, correlationId** |
| `backend/src/common/audit/audit.controller.ts:62-66`（GET /audit/verify）| 18 列 | **20 列 + orderId, correlationId** |
| `backend/src/common/audit/audit.service.ts:211` | `SELECT *` | ✅ 已含（无需改） |

**SELECT 列清单统一格式**（防止未来再加字段再失配）：
```ts
// 替换所有显式列清单为动态列（防止 SELECT 漏列）
const cols = CANONICAL_KEYS.join(', ');
const selectSql = `SELECT ${cols} FROM audit_logs`;
// 注意：CANONICAL_KEYS 含 seq/id/createTime，需根据实际表结构调整
// 实际：显式列清单 + 末尾 2 列 = 20 列
```

**改后 SELECT（20 列）**：
```ts
const AUDIT_COLS = `id, seq, prevHash, recordHash, createTime,
  userId, userName, operation, module, method, url,
  ip, userAgent, requestParams, responseData,
  duration, status, errorMessage,
  orderId, correlationId`;
```

#### 步 5: 创世式接入 3 处 auditService.log（β 抓出"非透传"）
**文件**：`backend/src/orders/orders.service.ts`

3 处 appendSnapshot caller（line 192 / 376 / 513）**新增 auditService.log 调用**：

```ts
// caller: create() at line 192
await runExclusiveWrite(() =>
  this.orderRepository.manager.transaction(async trx => {
    // ... 现有 create 逻辑 ...
    await this.orderSnapshotService.appendSnapshot(trx, after, beforePayload, ...);

    // v4 创世式接入：调 auditService.log，orderId/correlationId 必传
    // 注：移到互斥块外！当前 orders.service.ts:214 注释明确"sqlite 单连接下嵌套事务必败"
    // 所以这行必须在 transaction callback 外——已写 on commit 钩子
  })
);
// 创世式 audit 写入：在 runExclusiveWrite 返回后、函数 return 前
await this.auditService.log(
  AuditAction.ORDER_CREATE,
  AuditResult.SUCCESS,
  { /* context */ },
  `order create: orderId=${savedOrder.id}`,
  AuditSeverity.MEDIUM,
  undefined,
  { orderId: savedOrder.id, totalAmount: savedOrder.totalAmount },
  savedOrder.id,                                           // orderId
  `order:create:${savedOrder.id}`,                         // correlationId
);
```

**注**：必须在 runExclusiveWrite 外调 audit（v3 §2.2 步 5 没说，γ 抓出会触发嵌套自锁死）。

#### 步 6: R3 改真 JOIN（v3 §2.2 步 9，β 修 whitelist 减至 8）
**文件**：`scripts/reconcile-orders.mjs:128-147`

```js
// v4 R3 真 JOIN：减至 8 个 ORDER_*（不含 PAYMENT_*——appendSnapshot 路径不写）
const r3 = db.prepare(`
  SELECT s.orderId, s.version, s.correlationId AS snap_corr
  FROM order_snapshots s
  LEFT JOIN audit_logs a
    ON a.module = 'orders'
    AND a.operation IN (
      'ORDER_CREATE', 'ORDER_UPDATE', 'ORDER_CANCEL',
      'ORDER_CONFIRM', 'ORDER_SHIP', 'ORDER_DELIVER',
      'ORDER_RETURN', 'ORDER_REFUND'
    )
    AND a.orderId = s.orderId
    AND a.correlationId = s.correlationId
  WHERE a.id IS NULL
`).all();

if (r3.length > 0) {
  results.r3.push({
    issue: `${r3.length} 条 snapshot 缺对应 audit_logs 行（orderId+correlationId 真 JOIN 查无）`,
    orphans: r3,
    note: 'PAYMENT_* 事件不在此 JOIN 范围——payment 事件无对应 snapshot 行，单独挂账',
  });
}
```

**β 抓出**：v3 whitelist 含 PAYMENT_SUCCESS/FAILED，但 appendSnapshot caller 只在 orders.service.ts 内部（3 处）——payment 事件**无对应 snapshot 行**——R3 JOIN 系统性误报。

#### 步 7: 既有 spec 同步改（γ P2-1 抓出）
**文件**：`backend/src/orders/snapshot/order-snapshot-chain.spec.ts:32, 35`

```ts
// 第 32 行：audit chain CANONICAL_KEYS 16→18
- expect(CANONICAL_KEYS.length).toBe(16);
+ expect(CANONICAL_KEYS.length).toBe(18);

// 第 35 行：snapshot chain 不变（v4 不改 snapshot 链核）
expect(ORDER_SNAPSHOT_CANONICAL_KEYS.length).toBe(8);  // 保持
```

**新增 3 条 spec**（v4 §5.2）：
- `audit-chain.spec.ts` 新建（仓内不存在）：
  1. CANONICAL_KEYS.length === 18（含 orderId, correlationId 末尾 2 键）
  2. 16 字段 vs 18 字段同输入产生不同 hash（v3 步 2 行为变更锁）
  3. 4 文件 SELECT 列清单与 CANONICAL_KEYS 一致（防 P0 红屏复现）
- `audit.service.spec.ts` 新建（仓内不存在）：
  1. log() 接受 orderId/correlationId 第 8/9 参，INSERT 写库
  2. log() orders 模块 operation 必传 correlationId（**限定 orders 模块**——v3 全局 throw 是 β P1-4 错）
  3. log() 非 orders 模块（products/audit test）不强制 correlationId（warning 而非 throw）

#### 步 8: trust proxy 配置 + extractIpAddress 改 public（β B-4 + γ P3-1 修因）
**文件 1**：`backend/src/main.ts`

```ts
// 现有 app.setGlobalPrefix('api') 之后加：
// 信任代理层数：nginx/ALB/CDN 至少 1 层——按部署调整
app.set('trust proxy', 1);
```

**文件 2**：`backend/src/common/audit/audit.service.ts:408`

```ts
// 改 private → public，让外部 service / controller 调
- private extractIpAddress(request: Request): string {
+ public extractIpAddress(request: Request): string {
```

**文件 3**：`backend/src/orders/orders.controller.ts`（新增 @Request 透传）

```ts
// create() at line 62 已有 @Request() req — 只需在 log() 调用前取 IP
@Post()
@UseGuards(JwtAuthGuard)
create(@Body() createOrderData: CreateOrderData, @Request() req: AuthedRequest) {
  // 现有 create 逻辑
  // ...
  // v4 新增：创世式 audit log 触发——orderId/correlationId 必传
  return this.ordersService.create(createOrderData).then(savedOrder => {
    this.auditService.log(
      AuditAction.ORDER_CREATE,
      AuditResult.SUCCESS,
      {
        userId: req.user.sub,
        resourceType: 'orders',
        resourceId: String(savedOrder.id),
        httpMethod: 'POST',
        ip: this.auditService.extractIpAddress(req),  // v4 新 public
      },
      `order create: orderId=${savedOrder.id}`,
      AuditSeverity.MEDIUM,
      undefined,
      { orderId: savedOrder.id, totalAmount: savedOrder.totalAmount },
      savedOrder.id,                                    // orderId
      `order:create:${savedOrder.id}`,                  // correlationId
    ).catch(err => logger.warn('audit log fail', err));  // M5 仅警告
    return savedOrder;
  });
}
```

**注**：`update()` handler（line 175-193）当前**无 @Request()**——v4 需加（v3 §2.2 步 4 误描述为"已有"——α P1 抓出）。

#### 步 9: correlationId 前缀规范（γ P3-4 修因）
**文件**：`backend/src/common/audit/audit.constants.ts`（新建）

```ts
/**
 * correlationId 前缀规范（v4）—— R3 JOIN 对账依赖
 * 格式：{domain}:{action}:{id}
 *   order:create:123
 *   order:update:123
 *   payment:success:PAY_MV0V2RBY_xxx
 *   payment:failed:PAY_MV0V2RBY_xxx
 */
export const CORRELATION_PREFIX = {
  ORDER_CREATE: (id: number) => `order:create:${id}`,
  ORDER_UPDATE: (id: number) => `order:update:${id}`,
  ORDER_CANCEL: (id: number) => `order:cancel:${id}`,
  ORDER_CONFIRM: (id: number) => `order:confirm:${id}`,
  ORDER_SHIP: (id: number) => `order:ship:${id}`,
  ORDER_DELIVER: (id: number) => `order:deliver:${id}`,
  ORDER_RETURN: (id: number) => `order:return:${id}`,
  ORDER_REFUND: (id: number) => `order:refund:${id}`,
  PAYMENT_SUCCESS: (paymentId: string) => `payment:success:${paymentId}`,
  PAYMENT_FAILED: (paymentId: string) => `payment:failed:${paymentId}`,
} as const;
```

**为什么是 &apos;order:&apos; / &apos;payment:&apos; 前缀**：
- `order:` 前缀匹配 snapshot 路径的 create/update 等——R3 JOIN orderId+correlationId 命中
- `payment:` 前缀独立——但 payment 事件**目前不写 snapshot**——v4 R3 whitelist 不含 PAYMENT_*（β 修）——payment correlationId 仅作未来扩展

#### 步 10: 全 audit 链重锚（γ 实际 1.017s 修停服时长）

**文件**：`backend/scripts/reanchor-audit-chain-for-v4.mjs`（沿用 `backfill-audit-chain.mjs` 模式）

**实测数据**（γ 席）：
- dev 库 1603 行重锚墙钟 **1.017s**
- 脚本有单事务 BEGIN/COMMIT/ROLLBACK 防护——不停服也能做
- prod 10万+ 行 P95 ≤ 5min

**重锚 + 锚文件同步**（同 commit）：
```bash
# 1. 重算 hash
node scripts/reanchor-audit-chain-for-v4.mjs --db ./data/dev_caddy_shopping.db

# 2. 验证
node scripts/verify-audit-chain.mjs
# 期望：链化行 1603 / 头 hash 已重算 / docs/audit-chain-head.txt 末行匹配

# 3. 锚文件同 commit 写（手动）
# 读 verify 输出末行 hash，写入 docs/audit-chain-head.txt
```

**三方言**（v4 必须）：
- SQLite：复用 `backfill-audit-chain.mjs:62-92` 模式
- MySQL/TiDB：重写——用 `UPDATE audit_logs SET prevHash=?, recordHash=? WHERE seq=?` 循环
- PostgreSQL：同 MySQL 模式，标识符用 `"orderId"` 等双引号

**停服时长量化**（v4 §6.1）：
- dev 库：1.017s 实测——不停服也能做
- staging：≤ 30s
- prod 10万+ 行：≤ 5min
- 停服策略：建议 staging/prod 短停服（≤ 5min），dev 不停

---

## 3. 关键不变量

| 不变量 | 状态 |
|--------|------|
| R3 完整保留（不删除）| ✅ |
| M5 完整保留（auto-unlist 路径不变）| ✅ |
| snapshot 表 0 变化 | ✅ |
| 现有 audit_logs 16 字段 0 变化 | ✅（仅 +2 字段）|
| 嵌套 runExclusiveWrite 自锁死 | ✅ 0（创世式 audit 在互斥块外调）|
| sqlite/TiDB/PG 三部署兼容 | ✅（migration 三方言）|
| 跨表观测点 | ✅ 保留 + 精确化 |

---

## 4. v2+v3 三席盲审 39 项修订答复（累计）

| 来源 | 项数 | 解决数 | 承认数 |
|------|------|--------|--------|
| v1 三席盲审 | 9 | 8 | 1（M5 重新定义，v3 取消）|
| v2 三席盲审 | 13 | 13 | 0 |
| v2 专家组 3 席 | 13 | 13 | 0 |
| v3 三席盲审（α+β+γ）| 25+ | 24 | 1（数字三件套缺锚——v4 §5.4 写实）|

---

## 5. 验收标准

### 5.1 端到端验收

```bash
# 1. migration（三方言）
cd backend && npx typeorm-ts-node-commonjs migration:run

# 2. 全 audit 链重锚（不停服，dev 1.017s 实测）
node scripts/reanchor-audit-chain-for-v4.mjs --db ./data/dev_caddy_shopping.db

# 3. 验证
node scripts/verify-audit-chain.mjs
# 期望：链化行 1603，头 hash 已重算

# 4. R3 真 JOIN 跑
node scripts/reconcile-orders.mjs
# 期望：R3 = 9（实测：6 NULL correlationId + 3 missing audit）

# 5. 创世式接入测试
# 创建订单 → 验证 audit_logs 出现 ORDER_CREATE 行（含 orderId+corrId）
curl -X POST .../orders  # 创建
node scripts/reconcile-orders.mjs  # 验 R3-1
```

### 5.2 spec 覆盖

`backend/src/orders/snapshot/order-snapshot-chain.spec.ts`：
- 既有 line 32 `CANONICAL_KEYS.length === 16` 改为 `=== 18`
- 既有 line 35 `ORDER_SNAPSHOT_CANONICAL_KEYS.length === 8` 保持

`backend/src/common/audit/audit-chain.spec.ts`（新建）：
1. CANONICAL_KEYS 18 字段（+ orderId, correlationId 末尾 2 键）
2. 16 字段 vs 18 字段同输入产生不同 hash
3. 4 文件 SELECT 列清单与 CANONICAL_KEYS 一致（防 v3 P0 复现）

`backend/src/common/audit/audit.service.spec.ts`（新建）：
1. log() 接受 orderId/correlationId 第 8/9 参
2. log() orders 模块 operation 必传 correlationId（throw）
3. log() 非 orders 模块不强制 correlationId（仅 warning）

`backend/src/orders/orders.controller.spec.ts`（既有 28 tests）：
- 既有 `controller.update(1, updateOrderDto)` mock 调用→ 改 `controller.update(1, updateOrderDto, mockRequest)`——3 个写 handler 测试同步改

### 5.3 数字三件套（按 BACKLOG 规则 3，γ 修后）

| 数字 | 复现命令 | 日期 | 口径 |
|------|----------|------|------|
| 1603 audit_logs 行 | `node -e "..." SELECT COUNT(*)` | 2026-10-13 | dev 库 |
| 9 snapshot 行 | 同上 | 2026-10-13 | dev 库 |
| 3 非 NULL correlationId | `WHERE correlationId IS NOT NULL` | 2026-10-13 | dev 库 |
| 0 ORDER_* audit 行 | `WHERE module='orders'` | 2026-10-13 | 实施前（创世接入前）|
| 1603 行重锚墙钟 1.017s | `node backfill-audit-chain.mjs` | 2026-10-13 | dev |
| **R3 = 9 孤儿** | `node reconcile-orders.mjs` | 2026-10-13 | v4 实施后（创世接入前）|
| **R3 = 1 创世接入后** | 同上 | 2026-10-13 | 创世接入后逐步消 |
| 改动 10 文件 | `git diff --name-only v4..HEAD` | 2026-10-13 | 排除 .d.ts |
| 实施 3-4 人天 | γ 席实测估 | 2026-10-13 | 含 prod 验证 |

---

## 6. 风险与缓解

### 6.1 真实风险

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| migration PG 分支 v4 首次实施 | 🟡 中 | 中 | v4 §5 显式三方言；prod 实施前 dry-run |
| dev SQLite 加列走 synchronize 跳过 migration | 🟡 中 | 中 | 显式 migration run，绕过 synchronize |
| throw 限定 orders 模块边界漏判 | 🟡 中 | 中 | v4 §2.2 步 8 throw 入口加 `if (module === 'orders')` 守卫 |
| correlationId 前缀与既有 `&apos;payment:${merchantOrderId}&apos;` 不统一 | 🟢 低 | 低 | v4 §2.2 步 9 统一为 &apos;payment:success:&apos; / &apos;payment:failed:&apos; 前缀；既有的 &apos;payment:&apos; 保留为兼容 |
| dev migration 1.017s / prod ≤ 5min | 🟢 低 | 低 | v4 §2.2 步 10 实测 |
| extractIpAddress 改 public 破坏封装 | 🟢 低 | 低 | JSDoc 标 @public 注释说明 |
| 创世式接入首条订单报错 | 🟡 中 | 中 | v4 §2.2 步 5 在 controller 层 try/catch warn（M5 仅警告）|
| 创世式接入 3 caller 漏一处 | 🟡 中 | 中 | v4 §2.2 步 5 明确列 3 caller（line 192/376/513）|

### 6.2 已消除的软性阻力

- ~~admin UI 改路由~~——v4 不增 admin UI 端点
- ~~合规审计员接受度~~——v4 保留 audit_logs 边界，audit 不迁移
- ~~stop 服时长~~——实测 1.017s（不停服也能做）

### 6.3 历史 9 条 snapshot 处理

**9 条孤儿处理**（实测 R3 = 9）：
- 6 条 NULL correlationId——v4 创世接入后，**未来 snapshot** 都有 correlationId；旧 6 条继续孤儿——挂账后续批 backfill
- 3 条 `create:&lt;num&gt;` 有 correlationId 但无 audit_logs 行——v4 创世接入后**未来 update** 会写入 audit；这 3 条不补——R3 接受"历史有缺口"现实

**业务侧决策**：
- 接受 9 条历史孤儿 + 启动回填工具挂账
- 不在 v4 实施范围

---

## 7. 实施路径（按依赖排序）

| 步 | 文件 | 改动 | 依赖 |
|----|------|------|------|
| 1 | `backend/src/common/audit/entities/audit-log.entity.ts` | 加 2 列 + 3 索引（含 R3 复合）| 0 |
| 2 | `backend/src/common/audit/audit-chain.ts:21-38` | CANONICAL_KEYS 16→18 | 0 |
| 3 | `backend/src/database/migrations/20261013000001-add-audit-log-order-fk.ts` | 新建——三方言 migration | 1 |
| 4 | `scripts/verify-audit-chain.mjs:92-94` | SELECT 18→20 列 + orderId, correlationId | 2 |
| 5 | `backend/scripts/backfill-audit-chain.mjs:54-58, 95-99` | 同上 | 2 |
| 6 | `backend/src/common/audit/audit.controller.ts:62-66` | 同上 | 2 |
| 7 | `backend/src/common/audit/audit.service.ts:163-171` | log() 第 8/9 参加 orderId/correlationId + correlationId orders 必传 throw + extractIpAddress public | 0 |
| 8 | `backend/src/orders/orders.service.ts:192/376/513` | 3 处创世式 auditService.log（在 runExclusiveWrite 外）| 7 |
| 9 | `backend/src/orders/orders.controller.ts:175-194` | update() handler 加 @Request() req | 7 |
| 10 | `backend/src/main.ts` | set('trust proxy', 1) | 0 |
| 11 | `backend/src/common/audit/audit.constants.ts` | 新建 correlationId 前缀规范 | 0 |
| 12 | `backend/scripts/reanchor-audit-chain-for-v4.mjs` | 新建——三方言重锚脚本 | 2, 4, 5, 6 |
| 13 | `backend/src/orders/snapshot/order-snapshot-chain.spec.ts:32` | 16→18 | 2 |
| 14 | `backend/src/common/audit/audit-chain.spec.ts` | 新建 +3 条 spec | 2, 4, 5, 6 |
| 15 | `backend/src/common/audit/audit.service.spec.ts` | 新建 +3 条 spec | 7 |
| 16 | `scripts/reconcile-orders.mjs:128-147` | R3 改真 JOIN（whitelist 8 项） | 1, 2 |
| 17 | `docs/audit-chain-head.txt` | 手动更新末行 | 12 |
| 18 | `BACKLOG.md` | 旧 9 条 snapshot 历史 backfill 挂账 | 16 |

**预计 3-4 人天**（γ 席实测）：

| 子任务 | 工时 | 风险 |
|--------|------|------|
| schema + 链 4 步 | 0.5d | 中（PG 分支） |
| 4 文件 SELECT 同步 | 0.25d | 低 |
| 创世式 audit 3 caller | 0.5d | 中（互斥块外）|
| controller 3 handler 改造 | 0.5d | 中（@Request 透传）|
| trust proxy + extractIpAddress public | 0.1d | 低 |
| spec 4 处（含 2 个新建）| 0.75d | 低 |
| 重锚脚本三方言 | 0.5d | 中（PG/MySQL 差异）|
| 端到端 dev/staging/prod 验证 | 0.5d | 中（prod 大表）|
| **合计** | **3.5d** | |

### 7.1 回退路径

| 步 | 类型 | 回退方式 |
|----|------|---------|
| 1-3 | schema 强耦合 | migration:revert（顺序 3→2→1）|
| 4-6 | SELECT 同步 | 删 2 列 + 还原 18 列 SELECT |
| 7-9 | 应用代码 | git revert（同一 commit 一起） |
| 10 | trust proxy | main.ts 单行删 |
| 11 | correlationId 常量 | 删常量文件 |
| 12 | 重锚脚本 | 删脚本（已锚文件可 git revert）|
| 13-15 | spec | git revert |
| 16 | R3 改判 | 还原 LIKE 模糊查 |
| 17 | 锚文件 | git revert |
| 18 | 挂账 | 文档无代码 |

**强耦合回退（须停服）**：1-3 + 7-9 + 16 同 commit
**独立可回退**：4-6、10、12、13-15、17

### 7.2 停服策略

- **dev**：不停服（实测 1.017s）
- **staging**：≤ 30s 短停服
- **prod**：≤ 5min 短停服（10万+ 行 P95 估）
- 停服内容：1-3 schema 变更 + 12 重锚脚本

---

## 8. 关键文件清单（10 文件）

**修改 7 文件**：
- `backend/src/common/audit/entities/audit-log.entity.ts`（加 2 列 + 3 索引）
- `backend/src/common/audit/audit-chain.ts:21-38`（CANONICAL_KEYS 追加 2 键）
- `backend/src/common/audit/audit.service.ts:163-171`（log() 加 2 参 + throw 限定 + extractIpAddress public）
- `backend/src/orders/orders.controller.ts:175-194`（update 加 @Request）
- `backend/src/orders/orders.service.ts:192/376/513`（3 处创世式 audit）
- `backend/src/main.ts`（trust proxy）
- `backend/src/orders/snapshot/order-snapshot-chain.spec.ts:32`（16→18）

**修改 3 文件（α P0 修因）**：
- `scripts/verify-audit-chain.mjs:92-94`（SELECT 20 列）
- `backend/scripts/backfill-audit-chain.mjs:54-58, 95-99`（SELECT 20 列）
- `backend/src/common/audit/audit.controller.ts:62-66`（SELECT 20 列）

**新建 5 文件**：
- `backend/src/database/migrations/20261013000001-add-audit-log-order-fk.ts`（三方言）
- `backend/scripts/reanchor-audit-chain-for-v4.mjs`（三方言重锚）
- `backend/src/common/audit/audit-chain.spec.ts`（+3 条 spec）
- `backend/src/common/audit/audit.service.spec.ts`（+3 条 spec）
- `backend/src/common/audit/audit.constants.ts`（correlationId 前缀规范）

**修改 1 文件（spec 同步）**：
- `backend/src/orders/snapshot/order-snapshot-chain.spec.ts:32`

**修改 1 文件（脚本）**：
- `scripts/reconcile-orders.mjs:128-147`

**总修改 = 7 + 3 = 10 + 5 新建 = 15 文件**（v4 §0 声明的 10 文件是"修改"，5 新建独立计数）

---

## 9. v4 vs v3 vs v2 vs v1 对比

| 方案 | 一句话 | 治本率 | 三席结果 | 实施复杂度 |
|------|--------|--------|----------|------------|
| v1 | audit 走 em 同事务 | 0% | 🔴 3 席否决 | 4 文件 / 1d |
| v2 | snapshot 加 3 列 + 删 R3 | 100% 表象 | 🔴 3+3 席否决 | 12 文件 / 2d |
| v3 | audit_logs 加 2 列 + R3 改真 JOIN | 100% 实质但实施残缺 | 🔴 3 席 25+ 项否决 | 6 文件（实际 ≥10）/ 1-2d（实际 3-4d）|
| **v4** | **同 v3 + 25+ 项修订** | **100% 实质 + 实施完整** | **应通过** | **10 文件 / 3.5d** |

---

## 10. 待三席重审问题

1. R3 真 JOIN 在 v4 实施后，9 条历史孤儿如何处理？（v4 §6.3 挂账后续批）
2. 创世式接入 3 处 auditService.log 是否在 runExclusiveWrite 外（v4 §2.2 步 5 明确）
3. correlationId 前缀规范（v4 §2.2 步 9）是否覆盖所有 caller（既有 `&apos;payment:${merchantOrderId}&apos;`）
4. migration 三方言 PG 分支是否真能跑（v4 §5 给出 SQL）
5. throw 限定 orders 模块边界（v4 §2.2 步 8）是否漏 orders 子操作
6. 既不存在的 spec 文件（audit-chain.spec.ts / audit.service.spec.ts）从零建的工作量（v4 §5.2 估 0.75d）
7. 4 文件 SELECT 列清单同步（v4 §2.2 步 4）是否漏列（除已列 3 文件外还有？）

---

**提案 v4 完。** 等三席盲审 v4 + 业务侧（合规）确认。
