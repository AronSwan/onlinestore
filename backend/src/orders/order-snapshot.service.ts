import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { OrderSnapshot, SnapshotOperatorType } from './entities/order-snapshot.entity';
import { Order } from './entities/order.entity';
import { computeSnapshotRecordHash, ZERO_HASH } from './order-snapshot-chain';

/**
 * 订单快照写入服务（订单快照批阶段 1，方案 v4.1）
 *
 * 写入纪律（全部来自审核三席裁定，违者按 M3 病立案）：
 * - **同事务**：调用方传 EntityManager（订单事务的 trx）——本服务绝不自开事务、
 *   绝不调 AuditService.log（自带互斥+独立事务=嵌套自锁死，C 坑A）
 * - **INSERT 语义**：一律 em.insert()——禁 save()（探针实证撞复合主键静默变
 *   UPDATE，TiDB 409 兜底永不触发，B2 P1-4）
 * - **fail-closed**：快照写失败=订单更新整体失败（调用方同事务，B 边界1）
 * - **零变化跳过**：before/after 逐字段比零变化则不写快照（防支付双发点
 *   并发落重复快照，C 坑H）
 * - **version 递增**：事务内 SELECT MAX(version)（sqlite 全局互斥下串行；
 *   TiDB 由调用方 FOR UPDATE+复合主键冲突兜底，v4.1 #2）
 * - **哈希输入**：INSERT 后回读原生行（Date 往返漂移防线，audit 先例）再
 *   UPDATE 链列——两步写（先插内容列 NULL 链列，回读算哈希，再补链列）
 */

/** 快照 schema 当前版 */
const SCHEMA_VERSION = 1;

/** 快照 JSON 的字段白名单（v4.1 字段清单——A2 P2-3 钉死） */
interface SnapshotPayload {
  orderNumber: string;
  userId: number;
  totalAmount: string | number;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  notes: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  shippingAddress: string | null;
  createdAt: unknown;
  paidAt: unknown;
  shippedAt: unknown;
  completedAt: unknown;
  items: Array<Record<string, unknown>>;
  schemaVersion: number;
  _genesis?: boolean;
}

@Injectable()
export class OrderSnapshotService {
  private readonly logger = new Logger(OrderSnapshotService.name);

  /**
   * 构造快照 payload（全量 JSON——含 items+收货三件+时间戳）
   * order 实体须带 items relations（调用方保证全量读）
   */
  buildPayload(order: Order, genesis = false): SnapshotPayload {
    return {
      orderNumber: order.orderNumber,
      userId: order.userId,
      totalAmount: order.totalAmount as string | number,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod ?? null,
      notes: order.notes ?? null,
      recipientName: order.recipientName ?? null,
      recipientPhone: order.recipientPhone ?? null,
      shippingAddress: order.shippingAddress ?? null,
      createdAt: (order as { createdAt?: unknown }).createdAt ?? null,
      paidAt: (order as { paidAt?: unknown }).paidAt ?? null,
      shippedAt: (order as { shippedAt?: unknown }).shippedAt ?? null,
      completedAt: (order as { completedAt?: unknown }).completedAt ?? null,
      items: (order.items ?? []).map(item => ({
        productId: (item as { productId?: unknown }).productId,
        quantity: (item as { quantity?: unknown }).quantity,
        unitPrice: (item as { unitPrice?: unknown }).unitPrice,
        totalPrice: (item as { totalPrice?: unknown }).totalPrice,
        productSnapshot: (item as { productSnapshot?: unknown }).productSnapshot ?? null,
      })),
      schemaVersion: SCHEMA_VERSION,
      ...(genesis ? { _genesis: true } : {}),
    };
  }

  /**
   * 计算 changed_fields（行差——before/after 全量 payload 逐顶层字段比）
   * DTO 幽灵字段永不出现在 payload（构造自实体回读，非 updateData）。
   */
  computeChangedFields(
    before: SnapshotPayload,
    after: SnapshotPayload,
  ): Array<{ field: string; from: unknown; to: unknown }> {
    const changes: Array<{ field: string; from: unknown; to: unknown }> = [];
    for (const key of Object.keys(after) as Array<keyof SnapshotPayload>) {
      if (key === 'schemaVersion' || key === '_genesis') continue;
      const b = JSON.stringify(before[key] ?? null);
      const a = JSON.stringify(after[key] ?? null);
      if (a !== b) {
        changes.push({ field: String(key), from: before[key] ?? null, to: after[key] ?? null });
      }
    }
    return changes;
  }

  /**
   * 追加一版快照（在调用方的事务内执行——收口专用，禁独立调用）
   *
   * @param em 订单事务的 EntityManager
   * @param after 变更后的订单实体（含 items relations——调用方事务内全量回读）
   * @param before 变更前的全量 payload（调用方事务内全量读时构造；create 传 null）
   * @param operatorType 操作者类型
   * @param operatorId 操作者标识
   * @param correlationId 触发源关联（paymentOrderId/refundId/requestId）
   * @returns 写入的快照行数（0=零变化跳过）
   */
  async appendSnapshot(
    em: EntityManager,
    after: Order,
    before: SnapshotPayload | null,
    operatorType: SnapshotOperatorType,
    operatorId: string | null,
    correlationId: string | null,
  ): Promise<number> {
    const afterPayload = this.buildPayload(after);

    // 零变化跳过（防支付双发点重复快照——C 坑H）
    if (before && this.computeChangedFields(before, afterPayload).length === 0) {
      return 0;
    }

    // version 递增：事务内 MAX+1（sqlite 全局互斥串行保证；TiDB 靠调用方锁+主键冲突）
    const maxRow = await em.query(
      'SELECT MAX(version) as maxV FROM order_snapshots WHERE orderId = ?',
      [after.id],
    );
    const version = (Number(maxRow?.[0]?.maxV) || 0) + 1;

    // 链前驱：同单上一版哈希（v1 前驱=ZERO_HASH）
    let prevHash = ZERO_HASH;
    if (version > 1) {
      const prevRow = await em.query(
        'SELECT recordHash FROM order_snapshots WHERE orderId = ? AND version = ?',
        [after.id, version - 1],
      );
      prevHash = prevRow?.[0]?.recordHash ?? ZERO_HASH;
    }

    // 两步写（audit 先例）：先插内容列（链列 NULL），回读原生行算哈希，再补链列
    // 原生 SQL INSERT（INSERT 语义铁律+json 列字符串直写——与回读原生行同形）
    await em.query(
      `INSERT INTO order_snapshots
         (orderId, version, snapshot, changedFields, operatorType, operatorId,
          correlationId, occurredAt, schemaVersion, prevHash, recordHash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
      [
        after.id,
        version,
        JSON.stringify(afterPayload),
        before ? JSON.stringify(this.computeChangedFields(before, afterPayload)) : null,
        operatorType,
        operatorId,
        correlationId,
        new Date().toISOString().slice(0, 19).replace('T', ' '),
        SCHEMA_VERSION,
      ],
    );

    // 回读原生行（Date 往返漂移防线——哈希算在驱动原样值上）
    const rawRows = await em.query(
      'SELECT version, orderId, operatorType, operatorId, correlationId, occurredAt, schemaVersion, snapshot FROM order_snapshots WHERE orderId = ? AND version = ?',
      [after.id, version],
    );
    const rawRow = rawRows?.[0];
    if (!rawRow) {
      throw new Error(`快照插入后回读失败(orderId=${after.id}, version=${version})`);
    }

    const recordHash = computeSnapshotRecordHash(prevHash, version, {
      ...rawRow,
      // JSON 列原生行是字符串（sqlite TEXT）——保证 canonical 字节稳定
      snapshot:
        typeof rawRow.snapshot === 'string' ? rawRow.snapshot : JSON.stringify(rawRow.snapshot),
      occurredAt:
        typeof rawRow.occurredAt === 'string' ? rawRow.occurredAt : String(rawRow.occurredAt),
    });

    await em.update(OrderSnapshot, { orderId: after.id, version }, { prevHash, recordHash });

    this.logger.log(
      `订单快照 v${version} 已写入: orderId=${after.id} operator=${operatorType}${correlationId ? ` corr=${correlationId}` : ''}`,
    );
    return 1;
  }
}
