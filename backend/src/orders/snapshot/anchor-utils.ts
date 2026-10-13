/**
 * 锚文件解析与真伪检查（阶段 3 前置修因——双盲#4 抽公共）
 *
 * 仓根 scripts/verify-{audit,orders}-chain.mjs 双端读 anchor 文件
 * 的代码原状 70% 重复：本模块抽其全部可测纯函数+CRLF/行尾白规范
 * 化+列拆+hash 格式断言+corruption 检测为一份参考实现。引用端仅 import
 * 五件纯函数（splitCrLfRows/parseAnchorLine/forestHashOf/detectAnchorCorruption/
 * formatAnchorHeader），无 process.exit/process.stdio 直依赖——便于 unit test
 * 与后续真库 spec 复用（场库 #6 audit 兼用锚 = 同套解析统一形态）。
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const HASH_RE = /^[0-9a-f]{64}$/;

/** 拆 anchor 文件为干净行：CRLF/LF/CR 一并支持 + 去行尾空白（防 CRLF 残留 \r 污染行内内容） */
export function splitCrLfRows(text) {
  return text.split(/\r?\n/).map((l) => l.replace(/\s+$/, ''));
}

/** 单行解析为 { stamped, seq, hash } —— P2-L 修因：先 trim 再 split（防前导空白字段错位） */
export function parseAnchorLine(line, fieldNames = ['stamped', 'seq', 'hash']) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < fieldNames.length) return null;
  const out = {};
  for (let i = 0; i < fieldNames.length; i++) out[fieldNames[i]] = parts[i];
  return out;
}

/** 校验 hash 字段格式（64 hex）—— anchor 行 hash 列必为合法 SHA-256 hex；不合法=锚文件被改 */
export function isValidAnchorHash(h) {
  return typeof h === 'string' && HASH_RE.test(h);
}

/** 森林摘要=各单链头 (orderId, headSeq, headHash) 按 orderId 排序拼接 SHA256 */
export function forestHashOf(perOrder) {
  return createHash('sha256')
    .update(perOrder.map((o) => `${o.orderId}:${o.headSeq}:${o.headHash}`).join('|'))
    .digest('hex');
}

/**
 * 锚 corruption 体检（P2-J 修因：同 hash 多行=合法幂等再锚定，不判篡改）
 * 真正的篡改=同行不同 hash（同 seq/时间戳但 hash 被改写）或非法 hash 格式。
 * 返回 { corrupted, duplicate }——duplicate 仅在"不同时间戳同 hash"之外的
 * 非法重复（如同行被改写出两个不同 hash）时给出。
 */
export function detectAnchorCorruption(lines) {
  const parsed = lines.map((l) => parseAnchorLine(l)).filter(Boolean);
  // 同 timestamp+seq 出现两个不同 hash = 锚行被改写
  const seen = new Map();
  for (const p of parsed) {
    const key = `${p.stamped}:${p.seq}`;
    const existing = seen.get(key);
    if (existing !== undefined && existing !== p.hash) {
      return { corrupted: true, duplicate: p.hash };
    }
    seen.set(key, p.hash);
    // hash 格式非法也是篡改信号
    if (!isValidAnchorHash(p.hash)) {
      return { corrupted: true, duplicate: p.hash };
    }
  }
  return { corrupted: false };
}

/** 标准 orders 锚文件首锚头部（P2-K 修因：命令参数化，不再写死 npm run verify） */
export function formatAnchorHeader({ domain, singleSuffix = '单', command = 'npm run verify -- --anchor' }) {
  return (
    `# ${domain} git 锚——每行钉住一版森林摘要（UTC时间 ${singleSuffix}数 头森林hash SHA256）\n` +
    '# 追加式：只增不改；改历史行=锚不符（verify exit 2）。\n' +
    `# 由 ${command} 生成；commit 由人工执行。\n` +
    `# 森林摘要=各单链头 (orderId, headSeq, headHash) 按 orderId 排序后拼接 SHA256。\n` +
    '\n'
  );
}

/** 读 anchor 文件为已过滤/规范化行数组（空行与 # 注释行剔除） */
export function readAnchorFile(filePath) {
  return splitCrLfRows(readFileSync(filePath, 'utf-8'))
    .filter((l) => l && !l.startsWith('#'));
}
