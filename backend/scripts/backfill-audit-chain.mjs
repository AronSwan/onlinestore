#!/usr/bin/env node
// 用途：M6 存量 audit_logs genesis 重锚（backfill 哈希链）。
// 运行（后端停机或低负载时，仓库 backend/ 目录下）：
//   node --experimental-strip-types --no-warnings --experimental-sqlite scripts/backfill-audit-chain.mjs
//   node --experimental-strip-types --no-warnings --experimental-sqlite scripts/backfill-audit-chain.mjs --db ./data/xxx.db
// 规则（设计十决策 #1/#10）：
//   - 按 createTime ASC, id ASC 定序赋 seq（1..N），从 64 零串起全链重算（否决尾部续链=豁免特判）
//   - 幂等：重跑对同一数据集重算出同一链，exit 0
//   - 全程单事务（BEGIN/COMMIT），中途失败回滚不留半链
//   - 跑完立即提示 --anchor 创世锚 + 人工 git commit
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_DB = path.join(BACKEND_ROOT, 'data', 'dev_caddy_shopping.db');

const argv = process.argv.slice(2);
const i = argv.indexOf('--db');
const dbPath = i !== -1 && argv[i + 1] ? path.resolve(argv[i + 1]) : DEFAULT_DB;

const chain = await import(
  pathToFileURL(path.join(BACKEND_ROOT, 'src', 'common', 'audit', 'audit-chain.ts')).href
);
const { ZERO_HASH, computeRecordHash, verifyChain } = chain;

if (!existsSync(dbPath)) {
  console.error(`\x1b[31m环境错：数据库文件不存在 ${dbPath}\x1b[0m`);
  process.exit(3);
}

let db;
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    db = new DatabaseSync(dbPath);
    break;
  } catch (err) {
    if (attempt === 3) {
      console.error(`\x1b[31m环境错：打开数据库失败（3 次重试后放弃）——${err}\x1b[0m`);
      process.exit(3);
    }
    await new Promise(r => setTimeout(r, 200));
  }
}

try {
  const rows = db.prepare(
    `SELECT id, seq, prevHash, recordHash, createTime, userId, userName, operation,
            module, method, url, ip, userAgent, requestParams, responseData,
            duration, status, errorMessage
     FROM audit_logs ORDER BY createTime ASC, id ASC`,
  ).all();

  if (rows.length === 0) {
    console.log('audit_logs 为空——无需重锚，新写入将从 seq=1 起链。');
    db.close();
    process.exit(0);
  }

  const before = verifyChain(rows);
  console.log(`重锚开始：${rows.length} 行（重锚前链化行 ${before.length}，问题 ${before.problems.length} 处）`);

  const resetStmt = db.prepare(`UPDATE audit_logs SET seq = NULL, prevHash = NULL, recordHash = NULL`);
  const anchorStmt = db.prepare(
    `UPDATE audit_logs SET seq = ?, prevHash = ?, recordHash = ? WHERE id = ?`,
  );

  db.exec('BEGIN');
  try {
    resetStmt.run();
    let prevHash = ZERO_HASH;
    let seq = 0;
    for (const row of rows) {
      seq += 1;
      const recordHash = computeRecordHash(prevHash, seq, row);
      anchorStmt.run(seq, prevHash, recordHash, row.id);
      prevHash = recordHash;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error(`\x1b[31m重锚失败已回滚（不留半链）——${err}\x1b[0m`);
    db.close();
    process.exit(1);
  }

  // 回读复验（单遍）
  const reread = db.prepare(
    `SELECT id, seq, prevHash, recordHash, createTime, userId, userName, operation,
            module, method, url, ip, userAgent, requestParams, responseData,
            duration, status, errorMessage FROM audit_logs`,
  ).all();
  const after = verifyChain(reread);
  db.close();

  if (!after.valid) {
    console.error(`\x1b[31m重锚后复验失败（${after.problems.length} 处）——首笔：${JSON.stringify(after.problems[0])}\x1b[0m`);
    process.exit(1);
  }
  console.log(`重锚完成：${after.length} 行成链，头 seq=${after.headSeq} hash=${after.headHash}`);
  console.log(`复验通过（verifyChain valid=true）。`);
  console.log(`下一步（创世锚，立即执行）：`);
  console.log(`  cd .. && npm run verify:audit -- --anchor`);
  console.log(`  git add docs/audit-chain-head.txt`);
  console.log(`  git commit -m "chore(audit): 创世锚定台账链头 seq=${after.headSeq} ${after.headHash.slice(0, 8)}"`);
  process.exit(0);
} catch (err) {
  console.error(`\x1b[31m环境错：${err}\x1b[0m`);
  try { db.close(); } catch { /* 已关 */ }
  process.exit(3);
}
