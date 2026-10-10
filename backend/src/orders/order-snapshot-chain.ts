// 用途：订单快照每单哈希链纯函数核——canonical 键序/链校验（订单快照批阶段 1）。
// 单源纪律：与 audit-chain.ts 同族但键序独立——audit 链核已泛化 keys 参数（本批），
// 本文件定义订单快照自己的 canonical 键序并复用泛化后的哈希/校验函数。
// 运行形态约束：同 audit-chain.ts（node --experimental-strip-types 双端加载，
// 不用装饰器/枚举/参数属性）——本文件放 orders/ 而非 common/audit/，
// 因其 ESM 标记目录排他（进 common/audit/ 会要求改 nest-cli 排除条款）。
// 哈希覆盖面决策（v4.1 #24×#25 交互定案）：snapshot JSON 整列入哈希——
// 快照永不改写（#25 读时脱敏使 PII 不可变），哈希覆盖无害且更强；
// changedFields 系派生缓存不入哈希（diff 端点以相邻快照推导为准，#5）。
import {
  canonicalizeRow,
  computeRecordHash,
  verifyChain,
  ZERO_HASH,
  type ChainVerificationResult,
} from '../common/audit/audit-chain';

export { ZERO_HASH };
export type { ChainVerificationResult };

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
 * 每单独立链校验——把订单快照行映射为通用链核形状（version→seq）后复用
 * verifyChain（UNCHAINED/GAP/DUPLICATE/BREAK/CONTENT/FORK 六判型全继承）。
 * rows 须为同一 orderId 的全部快照（原生行，含 NULL 链列的未链化行）。
 */
export function verifyOrderSnapshotChain(
  rows: ReadonlyArray<Record<string, unknown>>,
): ChainVerificationResult {
  return verifyChain(
    rows.map(row => ({ ...row, seq: row.version })),
    ORDER_SNAPSHOT_CANONICAL_KEYS,
  );
}

/** 供写侧构造 canonical 行（测试/对账用） */
export function canonicalizeSnapshotRow(row: Record<string, unknown>) {
  return canonicalizeRow(row, ORDER_SNAPSHOT_CANONICAL_KEYS);
}
