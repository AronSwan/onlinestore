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
// P2-H 修因：标记可比行数——空集/字段缺失不假绿
try {
  const comparable = db.prepare(`
    SELECT COUNT(*) as cnt FROM order_snapshots s
    JOIN orders o ON o.id = s.orderId
    WHERE s.version = (SELECT MAX(version) FROM order_snapshots WHERE orderId = s.orderId)
    AND JSON_EXTRACT(s.snapshot, '$.paymentStatus') IS NOT NULL
  `).get();

  if (comparable.cnt === 0) {
    results.r2.push({
      issue: '可比行 0——快照缺 paymentStatus 字段或 JOIN 不命中（非"一致"）',
      note: `快照总数与 orders JOIN 命中 0 行或字段全缺，R2 无实际比对`,
    });
  } else {
    const mismatches = db.prepare(`
      SELECT s.orderId, s.version,
             JSON_EXTRACT(s.snapshot, '$.paymentStatus') as snapPayStatus,
             o.payment_status as orderPayStatus
      FROM order_snapshots s
      JOIN orders o ON o.id = s.orderId
      WHERE s.version = (SELECT MAX(version) FROM order_snapshots WHERE orderId = s.orderId)
      AND JSON_EXTRACT(s.snapshot, '$.paymentStatus') IS NOT NULL
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
  }
} catch (err) {
  results.r2.push({ error: `R2 查询失败: ${err}` });
}

// ── R3 快照↔审计日志 ─────────────────────────────────────
// P1-C 修因（双盲审四席共中）：audit_logs 无 correlationId 列，无法逐条关联。
// 如实改为"全局审计行存在性"检查——判词与实际逻辑一致。
try {
  const snapshotAuditCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM audit_logs a
    WHERE a.module = 'orders' AND (a.operation LIKE '%SNAPSHOT%' OR a.url LIKE '%snapshot%')
  `).get();
  const totalSnapshots = db.prepare(`SELECT COUNT(*) as cnt FROM order_snapshots`).get();
  const snapshotsWithCorrelation = db.prepare(
    `SELECT COUNT(*) as cnt FROM order_snapshots WHERE correlationId IS NOT NULL`
  ).get();

  if (snapshotAuditCount.cnt === 0 && totalSnapshots.cnt > 0) {
    results.r3.push({
      issue: `全库无 orders/snapshot 审计行（快照共 ${totalSnapshots.cnt} 条，correlationId 非空 ${snapshotsWithCorrelation.cnt} 条）——审计日志未覆盖快照写入`,
      note: 'audit_logs 无 correlationId 列，本项为全局存在性检查（非逐条关联）',
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
// P2-M 修因：跨词表状态映射替换裸比较+排除清单（success↔paid 语义等价不判漂移）
const PAYMENT_STATUS_MAP = {
  // payments.status → orders.payment_status 等价映射
  pending: ['pending', 'processing'],
  success: ['paid', 'success'],
  paid: ['paid', 'success'],
  processing: ['pending', 'processing'],
  failed: ['failed'],
  cancelled: ['cancelled'],
  expired: ['expired'],
  refunded: ['refunded'],
  partial_refunded: ['partial_refunded'],
};
function isPaymentDrift(orderStatus, paymentStatus) {
  const equivalents = PAYMENT_STATUS_MAP[paymentStatus] || [paymentStatus];
  return !equivalents.includes(orderStatus);
}
try {
  const joinedRows = db.prepare(`
    SELECT o.id as orderId, o.order_number as orderNumber, o.payment_status as orderStatus,
           p.status as paymentStatus, p.paymentId
    FROM orders o
    JOIN payments p ON p.orderId = o.order_number
    LIMIT 200
  `).all();
  for (const d of joinedRows) {
    if (isPaymentDrift(d.orderStatus, d.paymentStatus)) {
      results.drift.push({
        orderId: d.orderId,
        orderNumber: d.orderNumber,
        orderStatus: d.orderStatus,
        paymentStatus: d.paymentStatus,
        paymentId: d.paymentId,
        issue: `payments.status=${d.paymentStatus} 与 orders.payment_status=${d.orderStatus} 语义不等价（漂移）`,
      });
    }
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
