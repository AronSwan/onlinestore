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

/** 单行解析为 { stamped, seq, hash } —— 形态= 守护 anchor 行 schema 落地 */
export function parseAnchorLine(line, fieldNames = ['stamped', 'seq', 'hash']) {
  const parts = line.split(/\s+/);
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

/** 锚 corruption 体检：历史行若有重复 forestHash = 锚文件被改写（双盲#4 抽）；返回 { corrupted, duplicate } */
export function detectAnchorCorruption(lines) {
  const hashes = lines.map((l) => l.split(/\s+/)[2]).filter(Boolean);
  const dup = hashes.find((h, i) => hashes.indexOf(h) !== i);
  if (!dup) return { corrupted: false };
  return { corrupted: true, duplicate: dup };
}

/** 标准 orders 锚文件首锚头部：与 audit-chain-head.txt 端 258-269 同步形态 */
export function formatAnchorHeader({ domain, singleSuffix = '单' }) {
  return (
    `# ${domain} git 锚——每行钉住一版森林摘要（UTC时间 ${singleSuffix}数 头森林hash SHA256）\n` +
    '# 追加式：只增不改；改历史行=锚不符（verify exit 2）。\n' +
    '# 由 npm run verify -- --anchor 生成；commit 由人工执行。\n' +
    `# 森林摘要=各单链头 (orderId, headSeq, headHash) 按 orderId 排序后拼接 SHA256。\n` +
    '\n'
  );
}

/** 读 anchor 文件为已过滤/规范化行数组（空行与 # 注释行剔除） */
export function readAnchorFile(filePath) {
  return splitCrLfRows(readFileSync(filePath, 'utf-8'))
    .filter((l) => l && !l.startsWith('#'));
}
