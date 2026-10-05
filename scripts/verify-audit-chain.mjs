#!/usr/bin/env node
// 用途：M6 台账哈希链离线校验（只读打开 SQLite 库或仓外副本）+ git 锚比对/追加。
// 运行：npm run verify:audit            # 校验默认 dev 库（backend/data/dev_caddy_shopping.db）
//       npm run verify:audit -- --db 副本.sqlite   # 校验指定库（篡改复现请在副本上做，真库不碰）
//       npm run verify:audit -- --anchor           # 全链校验通过后把链头追加进 docs/audit-chain-head.txt
// 退出码：0 完整（含"待锚定 N 行"正常态）/ 1 链问题 / 2 锚不符 / 3 环境错。
// 锚定纪律：--anchor 只改工作区文件并打印 git 命令，commit 由人工执行（CI 自动挂账
// 是可选演进，不静默）。链核单源：动态 import backend/src/common/audit/audit-chain.ts，
// 与写侧/AuditController 校验端点同一字节（需 --experimental-strip-types，npm script 已带）。
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_DB = path.join(ROOT, 'backend', 'data', 'dev_caddy_shopping.db');
const ANCHOR_FILE = path.join(ROOT, 'docs', 'audit-chain-head.txt');

// ── 参数 ────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1;
};
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && i + 1 < argv.length ? argv[i + 1] : null;
};
const dbPath = opt('db') || DEFAULT_DB;
const ANCHOR_MODE = flag('anchor');
const JSON_MODE = flag('json');
const TTY = process.stdout.isTTY;
const RED = (s) => (TTY ? `\x1b[31m${s}\x1b[0m` : s);
const GREEN = (s) => (TTY ? `\x1b[32m${s}\x1b[0m` : s);
const YELLOW = (s) => (TTY ? `\x1b[33m${s}\x1b[0m` : s);

const exitJson = (code, payload) => {
  process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  process.exit(code);
};

// ── 链核单源加载 ────────────────────────────────────────────
let chain;
try {
  chain = await import(pathToFileURL(path.join(ROOT, 'backend', 'src', 'common', 'audit', 'audit-chain.ts')).href);
} catch (err) {
  if (JSON_MODE) exitJson(3, { error: 'audit-chain.ts 加载失败', detail: String(err) });
  console.error(RED(`环境错：无法加载链核 audit-chain.ts——${err}`));
  process.exit(3);
}

// ── 开库（readOnly + 3×200ms 重试） ─────────────────────────
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
    await new Promise(r => setTimeout(r, 200));
  }
}

// ── 读原生行 + 全链校验（单遍 O(n)） ────────────────────────
let rows;
let verify;
try {
  const select = db.prepare(
    `SELECT id, seq, prevHash, recordHash, createTime, userId, userName, operation,
            module, method, url, ip, userAgent, requestParams, responseData,
            duration, status, errorMessage FROM audit_logs`,
  );
  rows = select.all();
  verify = chain.verifyChain(rows);
} catch (err) {
  if (JSON_MODE) exitJson(3, { error: 'query failed', detail: String(err) });
  console.error(RED(`环境错：读取 audit_logs 失败（表缺失/文件损坏？）——${err}`));
  db.close();
  process.exit(3);
}
db.close();

const reportProblems = () => {
  console.log(RED(`链问题 ${verify.problems.length} 处：`));
  for (const p of verify.problems.slice(0, 10)) {
    console.log(RED(`  [${p.type}] seq=${p.seq ?? '-'} id=${p.id ?? '-'} ${p.detail}`));
  }
  if (verify.problems.length > 10) {
    console.log(RED(`  …其余 ${verify.problems.length - 10} 处从略（共 ${verify.problems.length} 处）`));
  }
};

if (!verify.valid) {
  if (JSON_MODE) exitJson(1, { ...verify, dbPath });
  console.log(RED(`台账链在第 ${verify.problems.find(p => p.seq !== null)?.seq ?? '?'} 条断裂——绕过管理页直接改过库。跑 npm run verify:audit 看逐行报告。`));
  console.log(`链化行 ${verify.length}，头 seq=${verify.headSeq} hash=${verify.headHash}`);
  reportProblems();
  process.exit(1);
}

// ── 链完整：锚比对三分支 ────────────────────────────────────
const readAnchorLines = () => {
  if (!existsSync(ANCHOR_FILE)) return [];
  return readFileSync(ANCHOR_FILE, 'utf8')
    .split(/\r?\n/)
    .filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => {
      const parts = l.trim().split(/\s+/); // 每行：UTC时间 seq hash
      return { stamped: parts[0], seq: Number(parts[1]), hash: parts[2] };
    })
    .filter(a => Number.isInteger(a.seq) && /^[0-9a-f]{64}$/.test(a.hash || ''));
};

const anchorLines = readAnchorLines();
const lastAnchor = anchorLines[anchorLines.length - 1] || null;

const anchorState = () => {
  if (!lastAnchor) return 'NO_ANCHOR_FILE';
  if (lastAnchor.seq === verify.headSeq && lastAnchor.hash === verify.headHash) return 'ANCHORED';
  if (lastAnchor.seq <= verify.headSeq) {
    const rowAtAnchor = rows.find(r => Number(r.seq) === lastAnchor.seq);
    if (rowAtAnchor && String(rowAtAnchor.recordHash) === lastAnchor.hash) {
      return 'PENDING_ANCHOR';
    }
  }
  return 'MISMATCH';
};

const state = anchorState();

if (JSON_MODE) {
  exitJson(0, {
    ...verify,
    dbPath,
    anchor: { file: ANCHOR_FILE, state, lastAnchor },
  });
}

console.log(GREEN(`台账链完整：${verify.length} 条记录首尾相扣，头哈希 ${verify.headHash.slice(0, 8)}…。git 锚比对请跑 npm run verify:audit。`));
console.log(`库：${dbPath} · 链化行 ${verify.length} · 头 seq=${verify.headSeq} hash=${verify.headHash}`);

if (ANCHOR_MODE) {
  if (state === 'ANCHORED') {
    console.log(YELLOW(`锚文件已是该链头（seq=${lastAnchor.seq}），跳过追加=幂等。`));
    process.exit(0);
  }
  const stamped = new Date().toISOString();
  const line = `${stamped} ${verify.headSeq} ${verify.headHash}`;
  // 首次锚定补注释头（设计 #4：`# 注释头` + 每行 `UTC时间 seq hash`）
  if (!existsSync(ANCHOR_FILE)) {
    writeFileSync(
      ANCHOR_FILE,
      [
        '# 台账哈希链 git 锚——每行钉住一个链头（UTC时间 seq recordHash）。',
        '# 追加式：只增不改；改历史行=锚不符（verify exit 2）。',
        '# 由 npm run verify:audit -- --anchor 生成；commit 由人工执行。',
        '',
      ].join('\n'),
      'utf8',
    );
  }
  appendFileSync(ANCHOR_FILE, `${line}\n`, 'utf8');
  console.log(GREEN(`已追加创世/续锚行到 docs/audit-chain-head.txt：`));
  console.log(`  ${line}`);
  console.log(`锚定需要 commit 才对外生效——请人工执行（本脚本不代跑 git）：`);
  console.log(`  git add docs/audit-chain-head.txt`);
  console.log(`  git commit -m "chore(audit): 锚定台账链头 seq=${verify.headSeq} ${verify.headHash.slice(0, 8)}"`);
  process.exit(0);
}

switch (state) {
  case 'ANCHORED':
    console.log(GREEN(`锚比对：已锚定（docs/audit-chain-head.txt 末行 = 当前链头 seq=${verify.headSeq}）。`));
    break;
  case 'PENDING_ANCHOR': {
    const pending = verify.headSeq - lastAnchor.seq;
    console.log(YELLOW(`锚比对：锚定在 seq=${lastAnchor.seq}，其后新增 ${pending} 行待锚定（正常态）。`));
    console.log(YELLOW(`需要钉住新链头时跑：npm run verify:audit -- --anchor`));
    break;
  }
  case 'NO_ANCHOR_FILE':
    console.log(YELLOW(`锚比对：docs/audit-chain-head.txt 尚不存在——链完整但未锚定。钉住链头跑：npm run verify:audit -- --anchor`));
    break;
  default:
    console.error(RED(`锚不符：docs/audit-chain-head.txt 末行 seq=${lastAnchor.seq} hash=${lastAnchor.hash.slice(0, 8)}… 与库中该行不符——锚或库被动过。`));
    process.exit(2);
}

process.exit(0);
