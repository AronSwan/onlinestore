/**
 * 订单链森林摘要（阶段 4+ 整改批——P2-E 修因共享函数）
 *
 * verify-orders-chain.mjs 与 reconcile-orders.mjs 双端都有"按 orderId 分组 →
 * per-order verifyOrderSnapshotChain → 提 headSeq/headHash → 排序 → forestHashOf"
 * 的 30+ 行同源逻辑。抽此处为一份参考实现，双端共用。
 *
 * 输入行 = node:sqlite 原生行（snapshot 字段是 JSON 字符串），与 verifyChain 的
 * canonicalValue 期望一致。TypeORM 水合行调用方需先转原生（参考
 * order-snapshot-read.service.ts:62-75 的 nativeRows.map 模式）。
 */
import { verifyOrderSnapshotChain } from './order-snapshot-chain.ts';
import { forestHashOf } from './anchor-utils.ts';

export interface NativeRow extends Record<string, unknown> {
  orderId: number;
  version: number;
  prevHash: string | null;
  recordHash: string | null;
  operatorType: string;
  operatorId: string | null;
  correlationId: string | null;
  occurredAt: string | null;
  schemaVersion: number;
  snapshot: string;
}

export interface ForestEntry {
  orderId: number;
  valid: boolean;
  length: number;
  headSeq: number;
  headHash: string;
  problemTypes: string[];
}

export interface ForestResult {
  perOrder: ForestEntry[];
  forestHash: string;
}

/**
 * 按 orderId 分组+逐单验链+森林哈希
 * @param rows node:sqlite 原生行（含 orderId/version/prevHash/recordHash/.../snapshot）
 * @returns perOrder 数组（按 orderId 排序）+ forestHash
 */
export function buildForestFromRows(rows: NativeRow[]): ForestResult {
  const byOrder = new Map<number, NativeRow[]>();
  for (const r of rows) {
    if (!byOrder.has(r.orderId)) byOrder.set(r.orderId, []);
    byOrder.get(r.orderId)!.push(r);
  }
  const perOrder: ForestEntry[] = [];
  for (const [orderId, orderRows] of byOrder) {
    const result = verifyOrderSnapshotChain(orderRows);
    perOrder.push({
      orderId,
      valid: result.valid,
      length: result.length,
      headSeq: result.headSeq,
      headHash: result.headHash,
      problemTypes: [...new Set(result.problems.map((p) => p.type))],
    });
  }
  perOrder.sort((a, b) => a.orderId - b.orderId);
  return { perOrder, forestHash: forestHashOf(perOrder) };
}
