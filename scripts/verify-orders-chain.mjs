#!/usr/bin/env node
// 用途：订单快照链锚定+git 锚生成+每单链校验（订单快照批阶段 2）
//
// 运行：
//   npm run verify:orders            # 全单链自检+对账（不写锚）
//   npm run verify:orders -- --anchor # 链头摘要追加进 docs/order-chain-heads.txt
//   npm run verify:orders -- --db 副本.sqlite   # 校验指定库
//   npm run verify:orders -- --json   # 机器可读输出
//
// 退出码（与 verify:audit 对齐）：
//   0 完整（含"待锚定 N 行"正常态）
//   1 链问题（UNCHAINED/GAP/DUPLICATE_SEQ/BREAK/CONTENT/FORK 六判型任一）
//   2 锚不符（--anchor 模式下同样拒绝追加）
//   3 环境错（db 打不开/链核加载失败/锚文件损坏）
//
// 锚定纪律（与 audit 同源）：
//   --anchor 先验链+对账（不通过则拒追加），通过则按"森林摘要"格式追加一行
//   每行 = "UTC时间 \t 受验单数 \t 各单链头hash拼接SHA256"
//   改历史行=链与锚不符（拒绝追加 exit 2，护栏防"洗白"）
//   commit 由人工执行（CI 自动锚是可选演进，不静默）
//
// 锚文件格式：docs/order-chain-heads.txt
// 森林摘要：每单链头 (orderId, headSeq, headHash) 按 orderId 排序后拼接，
// 整体 SHA256 = 一行锚——单单链锚自检失败即可定位
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_DEFAULT = path.join(ROOT, 'backend', 'data', 'dev_caddy_shopping.db');
const ANCHOR_FILE = path.join(ROOT, 'docs', 'order-chain-heads.txt');

const ARGS = process.argv.slice(2);
const ANCHOR = ARGS.includes('--anchor');
const JSON_MODE = ARGS.includes('--json');
const dbArgIdx = ARGS.indexOf('--db');
const dbPath = dbArgIdx >= 0 ? path.resolve(ARGS[dbArgIdx + 1]) : DB_DEFAULT;

const RED = (s) => `\u001b[31m${s}\u001b[0m`;
const GRN = (s) => `\u001b[32m${s}\u001b[0m`;
const YEL = (s) => `\u001b[33m${s}\u001b[0m`;

function exitJson(code, payload) {
  process.stdout.write(JSON.stringify(payload) + '\n');
  process.exit(code);
}

async function main() {
  // 加载链核（同源——F2 修复确保 strip-types 裸加载通道活）
  let chain;
  try {
    chain = await import(
      pathToFileURL(
        path.join(ROOT, 'backend', 'src', 'orders', 'snapshot', 'order-snapshot-chain.ts'),
      ).href,
    );
  } catch (err) {
    if (JSON_MODE) exitJson(3, { error: 'order-snapshot-chain.ts 加载失败', detail: String(err) });
    console.error(RED(`环境错：无法加载链核 order-snapshot-chain.ts——${err}`));
    process.exit(3);
  }
  if (
    typeof chain.verifyOrderSnapshotChain !== 'function' ||
    !Array.isArray(chain.ORDER_SNAPSHOT_CANONICAL_KEYS) ||
    chain.ORDER_SNAPSHOT_CANONICAL_KEYS.length !== 8
  ) {
    if (JSON_MODE) exitJson(3, { error: 'order-snapshot-chain.ts 绑定不完整(空命名空间?)' });
    console.error(
      RED('环境错：order-snapshot-chain.ts 绑定不完整（ESM 毒化?空命名空间?）——检查子目录 package.json 与 rewriteRelativeImportExtensions'),
    );
    process.exit(3);
  }

  // 开库（readOnly + 重试）
  if (!existsSync(dbPath)) {
    if (JSON_MODE) exitJson(3, { error: 'db not found', dbPath });
    console.error(RED(`环境错：数据库文件不存在 ${dbPath}`));
    process.exit(3);
  }
  let db;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      db = new DatabaseSync(dbPath, { readOnly: true });
      break;
    } catch (err) {
      if (attempt === 3) {
        if (JSON_MODE) exitJson(3, { error: 'open failed', dbPath, detail: String(err) });
        console.error(RED(`环境错：打开数据库失败（第 3 次重试后放弃）——${err}`));
        process.exit(3);
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // 取所有快照行（原生 SQL——避免 ORM 拉 items 等大字段）
  const rawRows = db
    .prepare(
      'SELECT orderId, version, prevHash, recordHash, operatorType, operatorId, correlationId, occurredAt, schemaVersion, snapshot FROM order_snapshots',
    )
    .all();

  // 按 orderId 分组并对账——每单链单独 verifyOrderSnapshotChain
  const byOrder = new Map();
  for (const r of rawRows) {
    if (!byOrder.has(r.orderId)) byOrder.set(r.orderId, []);
    byOrder.get(r.orderId).push(r);
  }

  // 各单链校验结果 + 异常项收集
  const perOrder = [];
  let totalProblems = 0;
  for (const [orderId, rows] of byOrder) {
    const result = chain.verifyOrderSnapshotChain(rows);
    perOrder.push({
      orderId,
      valid: result.valid,
      length: result.length,
      headSeq: result.headSeq,
      headHash: result.headHash,
      problemTypes: [...new Set(result.problems.map((p) => p.type))],
    });
    if (!result.valid) totalProblems += result.problems.length;
  }
  perOrder.sort((a, b) => a.orderId - b.orderId);

  // 森林摘要：按 orderId 排序后拼接 (orderId, headSeq, headHash) → SHA256
  const forestHash = createHash('sha256')
    .update(
      perOrder
        .map((o) => `${o.orderId}:${o.headSeq}:${o.headHash}`)
        .join('|'),
    )
    .digest('hex');

  // 读现有锚（CRLF 兼容 + tab/space 兼容——双盲#4 抓 R1 真护栏破）
  let existingLines = [];
  if (existsSync(ANCHOR_FILE)) {
    existingLines = readFileSync(ANCHOR_FILE, 'utf-8')
      .split(/\r?\n/)
      .map((l) => l.replace(/\s+$/, '')) // 去行尾空白（CRLF/LF/spc 统一）
      .filter((l) => l && !l.startsWith('#'));
  }
  const existingForest = existingLines[existingLines.length - 1]?.split(/\s+/)[2];

  // 报告
  const report = {
    dbPath,
    totalOrders: perOrder.length,
    totalSnapshots: rawRows.length,
    totalProblems,
    forestHash,
    previousForestHash: existingForest,
    perOrder,
  };
  if (JSON_MODE) {
    exitJson(totalProblems === 0 ? 0 : 1, report);
  } else {
    console.log(
      `订单链完整：${perOrder.length} 单 / ${rawRows.length} 条快照 / 头森林hash ${forestHash.slice(0, 8)}…${totalProblems === 0 ? '' : ' / 问题 ' + totalProblems}`,
    );
    if (existingForest) {
      console.log(
        existingForest === forestHash
          ? GRN(`锚比对：与上次锚 ${existingForest.slice(0, 8)}… 一致`)
          : YEL(
              `锚比对：与上次锚 ${existingForest.slice(0, 8)}… 不一致（链已变化——可能为新正常态或被改，需复核）`,
            ),
      );
    }
    if (totalProblems > 0) {
      console.log(RED('链问题：'));
      perOrder
        .filter((o) => !o.valid)
        .forEach((o) => console.log(`  orderId=${o.orderId} 问题类型=${o.problemTypes.join(',')}`));
    }
  }

  // 锚 corruption 体检（R6 双盲#4 抓）：同一行是否出现两个不同的 forestHash？
  // 正常锚=单行单 hash；若历史行被改写/多行被合=同行有重复→ 锚文件被篡改，拒追加 exit 3。
  if (existingLines.length > 1) {
    const hashes = existingLines.map((l) => l.split(/\s+/)[2]).filter(Boolean);
    const dup = hashes.find((h, i) => hashes.indexOf(h) !== i);
    if (dup) {
      const msg = `锚文件被篡改：存在重复 forestHash ${dup.slice(0, 8)}…——拒绝追加。复核后再锚。`;
      if (JSON_MODE) exitJson(3, { error: 'anchor corrupted: duplicate forest hash', duplicate: dup, ...report });
      console.error(RED(msg));
      process.exit(3);
    }
  }

  // 锚追加
  if (ANCHOR) {
    if (totalProblems > 0) {
      const msg = `存在链问题（${totalProblems} 处）——禁止追加锚（防"洗白"已损坏的链）。先修库再验。`;
      if (JSON_MODE) exitJson(2, { error: 'anchor refused: chain has problems', ...report });
      console.error(RED(msg));
      process.exit(2);
    }
    if (existingForest && existingForest !== forestHash) {
      const msg = `森林摘要与上次锚不一致（${existingForest.slice(0, 8)}… vs ${forestHash.slice(0, 8)}…）——拒绝追加（防"洗白"已变化的链）。复核后再锚。`;
      if (JSON_MODE) exitJson(2, { error: 'anchor refused: forest hash mismatch', ...report });
      console.error(RED(msg));
      process.exit(2);
    }
    // R2 双盲#4 抓：空库（0 行）— forestHash = SHA256("") = e3b0c44…，是无效锚。
    // 拒绝接受空森林为首次锚（会让任意 verify 后续必报"链已变化"）。
    if (rawRows.length === 0) {
      const msg = '空库/0 行快照——forestHash=SHA256("")=e3b0c44… 为无效锚，拒绝追加。先生成快照再锚。';
      if (JSON_MODE) exitJson(2, { error: 'anchor refused: empty forest', ...report });
      console.error(RED(msg));
      process.exit(2);
    }
    const ts = new Date().toISOString();
    const line = `${ts}\t${perOrder.length}\t${forestHash}\n`;
    // R8 首次锚写注释头（与 audit-chain-head.txt 端 258-269 同步形态）
    if (!existsSync(ANCHOR_FILE) || readFileSync(ANCHOR_FILE, 'utf-8').trim() === '') {
      const header =
        '# 订单快照链 git 锚——每行钉住一版森林摘要（UTC时间 受验单数 头森林hash SHA256）\n' +
        '# 追加式：只增不改；改历史行=锚不符（verify exit 2）。\n' +
        '# 由 npm run verify:orders -- --anchor 生成；commit 由人工执行。\n' +
        '# 森林摘要=各单链头 (orderId, headSeq, headHash) 按 orderId 排序后拼接 SHA256。\n' +
        '\n';
      writeFileSync(ANCHOR_FILE, header, 'utf-8');
    }
    appendFileSync(ANCHOR_FILE, line, 'utf-8');
    const appendedMsg = `已追加订单链锚: ${ts} 头hash=${forestHash.slice(0, 8)}… (${perOrder.length} 单)`;
    if (JSON_MODE) exitJson(0, { ...report, appended: line.trim() });
    console.log(GRN(appendedMsg));
    // R7 git 单件提示（与 audit 端 line 195-225 同源但减半——双盲#4 抓）
    // 仅判"未 commit"（一种状态）；其他两态（已 commit 未 push / 已 commit 已 push）合并为"已 commit"，避免状态机复杂度超收益
    try {
      const diffQuiet = execFileSync('git', ['diff', '--quiet', ANCHOR_FILE], { cwd: ROOT }).status === 0;
      if (!diffQuiet) {
        console.log(YEL(`\n  ⚠ ${ANCHOR_FILE} 尚未 commit（git status 可见）。请执行：\n  git add ${ANCHOR_FILE} && git commit -m "orders: 锚定 ${perOrder.length} 单订单链头 (${forestHash.slice(0, 8)}...)"`));
      }
    } catch (_) { /* 非 git 环境——跳过 */ }
  } else if (totalProblems === 0) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(RED('未预期错误：' + (err.stack || err.message)));
  process.exit(3);
});
