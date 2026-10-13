// 用途：订单快照每单哈希链纯函数核——canonical 键序/链校验（订单快照批阶段 1）。
// 单源纪律：与 audit-chain.ts 同族但键序独立——audit 链核已泛化 keys 参数（本批），
// 本文件定义订单快照自己的 canonical 键序并复用泛化后的哈希/校验函数。
// 运行形态约束：同 audit-chain.ts（node --experimental-strip-types 双端加载，
// 不用装饰器/枚举/参数属性）。本文件居 orders/snapshot/ 子目录——自带
// package.json {"type":"module"} ESM 标记（脚本裸加载通道=verify:orders 用），
// nest-cli.json assets 排除条款同步（标记不进 dist——dist 为 CJS，标记漏进=毒化）。
// 加载通道修复史：F2（自洽席A）——原居 orders/ 无标记=脚本 SyntaxError，
// 挪子目录立标记=双端通（jest 经 transform 不受影响，tsc moduleResolution
// node 不看 type 字段）。
// 哈希覆盖面决策（v4.1 #24×#25 交互定案）：snapshot JSON 整列入哈希——
// 快照永不改写（#25 读时脱敏使 PII 不可变），哈希覆盖无害且更强；
// changedFields 系派生缓存不入哈希（diff 端点以相邻快照推导为准，#5）。
import {
  canonicalizeRow,
  computeRecordHash,
  verifyChain,
  ZERO_HASH,
  type ChainProblem,
  type ChainVerificationResult,
} from '../../common/audit/audit-chain.ts'; // .ts 扩展名=Node 裸加载需(rewriteRelativeImportExtensions 使编译产物重写为 .js)

export { ZERO_HASH };
export type { ChainProblem, ChainVerificationResult };

/**
 * 订单快照 canonical 定键序（8 字段）。
 * 键序即哈希输入的一部分——追加字段必须排在尾部并全链重锚，不得插入中部。
 */
export const ORDER_SNAPSHOT_CANONICAL_KEYS = [
  'version',
  'orderId',
  'operatorType',
  'operatorId',
  'correlationId',
  'occurredAt',
  'schemaVersion',
  'snapshot',
] as const;

/**
 * 单版快照哈希 = SHA-256(`${prevHash}\n${canonical}`)（与 audit 链同算法不同键序）。
 * version 用参数值（写侧 INSERT 回读时 DB 里链列还是 NULL）。
 */
export function computeSnapshotRecordHash(
  prevHash: string,
  version: number,
  row: Record<string, unknown>,
): string {
  return computeRecordHash(prevHash, version, row, ORDER_SNAPSHOT_CANONICAL_KEYS);
}

/**
 * 每单独立链校验——FORK 判在多单场景下需 per-orderId 隔离（每单链头
 * 唯一性只在本单内成立，跨单不共享 prevHashOwner）。策略：按 orderId
 * 分组后**逐单**调泛化 verifyChain——每单独立的 prevHashOwner 实例
 * 自动隔离（FORK 不再误报为多单共零），但保留全六判型语义。
 * 顺带返"单森林头"=各单 head 中 seq 最大者（v1 genesis 头=ZERO 不抢）。
 */
export function verifyOrderSnapshotChain(
  rows: ReadonlyArray<Record<string, unknown>>,
): ChainVerificationResult {
  const byOrder = new Map<number | string, Array<Record<string, unknown>>>();
  for (const r of rows) {
    const k = (r as { orderId?: number | string }).orderId;
    if (k == null) continue;
    let bucket = byOrder.get(k);
    if (!bucket) {
      bucket = [];
      byOrder.set(k, bucket);
    }
    bucket.push(r);
  }
  let valid = true;
  let length = 0;
  let headHash = ZERO_HASH;
  let headSeq = 0;
  const problems: ChainProblem[] = [];
  for (const [, group] of byOrder) {
    const r = verifyChain(
      group.map((row) => ({ ...row, seq: row.version })),
      ORDER_SNAPSHOT_CANONICAL_KEYS,
    );
    if (!r.valid) valid = false;
    length += r.length;
    if (r.headSeq > headSeq) {
      headHash = r.headHash;
      headSeq = r.headSeq;
    }
    problems.push(...r.problems);
  }
  return { valid, length, headHash, headSeq, problems };
}

/** 供写侧构造 canonical 行（测试/对账用） */
export function canonicalizeSnapshotRow(row: Record<string, unknown>) {
  return canonicalizeRow(row, ORDER_SNAPSHOT_CANONICAL_KEYS);
}
