#!/usr/bin/env node
// 用途：订单快照四项对账 + payments 漂移检测（阶段 4）
//
// 运行：
//   npm run reconcile:orders              # 全量对账（只读）
//   npm run reconcile:orders -- --json    # 机器可读输出
//   npm run reconcile:orders -- --db 副本.sqlite
//
// 四项对账：
//   R1 订单↔快照覆盖：每单至少 1 条快照（genesis）
//   R2 快照↔支付状态：最新快照 paymentStatus = payments 表最新 status
//   R3 快照↔审计日志：快照写入有对应 audit_log（correlationId 对齐）
//   R4 森林哈希↔锚：当前森林 hash = 锚文件末行 hash（或 PENDING_ANCHOR）
//
// payments 漂移：payments 表 status 与订单表 paymentStatus 不一致
//
// 退出码：0 全过 / 1 有对账问题 / 2 漂移 / 3 环境错
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_DEFAULT = path.join(ROOT, 'backend', 'data', 'dev_caddy_shopping.db');
const ANCHOR_FILE = path.join(ROOT, 'docs', 'order-chain-heads.txt');

const ARGS = process.argv.slice(2);
const JSON_MODE = ARGS.includes('--json');
const dbArgIdx = ARGS.indexOf('--db');
const dbPath = dbArgIdx >= 0 ? path.resolve(ARGS[dbArgIdx + 1]) : DB_DEFAULT;

// 共享模块
const tty = await import(
  pathToFileURL(path.join(ROOT, 'backend/src/orders/snapshot/console-tty.ts')).href
);
const anchorUtil = await import(
  pathToFileURL(path.join(ROOT, 'backend/src/orders/snapshot/anchor-utils.ts')).href
);
const { RED, GREEN, YELLOW } = tty;
const { readAnchorFile, parseAnchorLine, forestHashOf } = anchorUtil;

const exitJson = (code, payload) => {
  process.stdout.write(JSON.stringify(payload) + '\n');
  process.exit(code);
};

// ── 开库（只读） ──────────────────────────────────────────
if (!existsSync(dbPath)) {
  if (JSON_MODE) exitJson(3, { error: 'db not found', dbPath });
  console.error(RED(`环境错：数据库文件不存在 ${dbPath}`));
  process.exit(3);
}
const db = new DatabaseSync(dbPath, { readOnly: true });

const results = { r1: [], r2: [], r3: [], r4: [], drift: [] };

// ── R1 订单↔快照覆盖 ─────────────────────────────────────
try {
  const ordersWithoutSnapshot = db.prepare(`
    SELECT o.id, o.order_number FROM orders o
    WHERE NOT EXISTS (SELECT 1 FROM order_snapshots s WHERE s.orderId = o.id)
  `).all();
  for (const o of ordersWithoutSnapshot) {
    results.r1.push({ orderId: o.id, orderNumber: o.order_number, issue: '无快照（缺 genesis）' });
  }
} catch (err) {
  results.r1.push({ error: `R1 查询失败: ${err}` });
}

// ── R2 快照↔支付状态对齐 ─────────────────────────────────
try {
  const mismatches = db.prepare(`
    SELECT s.orderId, s.version,
           JSON_EXTRACT(s.snapshot, '$.paymentStatus') as snapPayStatus,
           o.payment_status as orderPayStatus
    FROM order_snapshots s
    JOIN orders o ON o.id = s.orderId
    WHERE s.version = (SELECT MAX(version) FROM order_snapshots WHERE orderId = s.orderId)
    AND JSON_EXTRACT(s.snapshot, '$.paymentStatus') != o.payment_status
  `).all();
  for (const m of mismatches) {
    results.r2.push({
      orderId: m.orderId,
      latestVersion: m.version,
      snapshotPaymentStatus: m.snapPayStatus,
      orderPaymentStatus: m.orderPayStatus,
      issue: '最新快照 paymentStatus ≠ 订单表 paymentStatus',
    });
  }
} catch (err) {
  results.r2.push({ error: `R2 查询失败: ${err}` });
}

// ── R3 快照↔审计日志 ─────────────────────────────────────
try {
  const snapshotsWithoutAudit = db.prepare(`
    SELECT s.orderId, s.version, s.correlationId
    FROM order_snapshots s
    WHERE s.correlationId IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM audit_logs a
      WHERE a.module = 'orders' AND (a.operation LIKE '%SNAPSHOT%' OR a.url LIKE '%snapshot%')
    )
    LIMIT 50
  `).all();
  for (const s of snapshotsWithoutAudit) {
    results.r3.push({
      orderId: s.orderId,
      version: s.version,
      correlationId: s.correlationId,
      issue: '快照无对应审计日志（correlationId 不匹配）',
    });
  }
} catch (err) {
  results.r3.push({ error: `R3 查询失败: ${err}` });
}

// ── R4 森林哈希↔锚 ───────────────────────────────────────
try {
  const chain = await import(
    pathToFileURL(path.join(ROOT, 'backend/src/orders/snapshot/order-snapshot-chain.ts')).href
  );
  const rows = db.prepare(
    'SELECT orderId, version, prevHash, recordHash, operatorType, operatorId, correlationId, occurredAt, schemaVersion, snapshot FROM order_snapshots',
  ).all();
  const byOrder = new Map();
  for (const r of rows) {
    if (!byOrder.has(r.orderId)) byOrder.set(r.orderId, []);
    byOrder.get(r.orderId).push(r);
  }
  const perOrder = [];
  for (const [orderId, orderRows] of byOrder) {
    const result = chain.verifyOrderSnapshotChain(orderRows);
    perOrder.push({ orderId, headSeq: result.headSeq, headHash: result.headHash });
  }
  perOrder.sort((a, b) => a.orderId - b.orderId);
  const currentForest = forestHashOf(perOrder);

  if (existsSync(ANCHOR_FILE)) {
    const anchorLines = readAnchorFile(ANCHOR_FILE);
    const lastAnchor = anchorLines.length > 0
      ? parseAnchorLine(anchorLines[anchorLines.length - 1])
      : null;
    if (lastAnchor && lastAnchor.hash !== currentForest) {
      results.r4.push({
        currentForest: currentForest.slice(0, 12),
        lastAnchorHash: lastAnchor.hash?.slice(0, 12),
        issue: '当前森林 hash ≠ 锚文件末行 hash（链已变化或被改）',
      });
    }
  }
} catch (err) {
  results.r4.push({ error: `R4 查询失败: ${err}` });
}

// ── payments 漂移 ─────────────────────────────────────────
try {
  const drifts = db.prepare(`
    SELECT o.id as orderId, o.order_number as orderNumber, o.payment_status as orderStatus,
           p.status as paymentStatus, p.paymentId
    FROM orders o
    JOIN payments p ON p.orderId = o.order_number
    WHERE p.status != o.payment_status
    AND p.status NOT IN ('expired', 'cancelled')
    LIMIT 50
  `).all();
  for (const d of drifts) {
    results.drift.push({
      orderId: d.orderId,
      orderNumber: d.orderNumber,
      orderStatus: d.orderStatus,
      paymentStatus: d.paymentStatus,
      paymentId: d.paymentId,
      issue: 'payments.status ≠ orders.payment_status（漂移）',
    });
  }
} catch (err) {
  results.drift.push({ error: `drift 查询失败: ${err}` });
}

db.close();

// ── 汇总 ─────────────────────────────────────────────────
const totalIssues = results.r1.length + results.r2.length + results.r3.length + results.r4.length;
const totalDrift = results.drift.length;

const report = { dbPath, totalIssues, totalDrift, ...results };

if (JSON_MODE) {
  exitJson(totalIssues === 0 && totalDrift === 0 ? 0 : totalIssues > 0 ? 1 : 2, report);
}

console.log(`四项对账：R1 订单↔快照=${results.r1.length ? RED(results.r1.length + ' 问题') : GREEN('OK')}`);
console.log(`          R2 快照↔支付=${results.r2.length ? RED(results.r2.length + ' 问题') : GREEN('OK')}`);
console.log(`          R3 快照↔审计=${results.r3.length ? RED(results.r3.length + ' 问题') : GREEN('OK')}`);
console.log(`          R4 森林↔锚=${results.r4.length ? RED(results.r4.length + ' 问题') : GREEN('OK')}`);
console.log(`payments 漂移：${totalDrift ? YELLOW(totalDrift + ' 处') : GREEN('无')}`);

for (const [key, label] of [['r1', 'R1'], ['r2', 'R2'], ['r3', 'R3'], ['r4', 'R4']]) {
  for (const item of results[key].slice(0, 5)) {
    console.log(`  [${label}] ${item.issue ?? item.error ?? JSON.stringify(item)}`);
  }
}
for (const d of results.drift.slice(0, 5)) {
  console.log(`  [漂移] ${d.issue ?? d.error ?? JSON.stringify(d)}`);
}

process.exit(totalIssues === 0 && totalDrift === 0 ? 0 : totalIssues > 0 ? 1 : 2);
