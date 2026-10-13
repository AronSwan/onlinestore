import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderSnapshot } from './entities/order-snapshot.entity';
import { verifyOrderSnapshotChain } from './snapshot/order-snapshot-chain.ts';
import { maskSnapshotPii, maskSnapshotsPii, maskChangesPii } from './snapshot/pii-mask';

/**
 * 订单快照读服务（阶段 3——读侧端点）
 *
 * 职责：
 * - 按 orderId 查快照列表（分页）
 * - 按 orderId+version 查单条快照
 * - 按 orderId 验链（per-order verifyOrderSnapshotChain）
 * - 支付时间线聚合（快照 events + payments 表对齐）
 *
 * 读时脱敏：非 admin 请求→maskSnapshotPii 遮罩 PII 三件。
 * 快照 JSON 解析：snapshot 列存 JSON 文本，读时 parse 为对象。
 */
@Injectable()
export class OrderSnapshotReadService {
  private readonly logger = new Logger(OrderSnapshotReadService.name);

  constructor(
    @InjectRepository(OrderSnapshot)
    private readonly snapshotRepo: Repository<OrderSnapshot>,
  ) {}

  /** 按 orderId 查快照列表（version ASC） */
  async findByOrderId(orderId: number): Promise<Array<Record<string, unknown>>> {
    const rows = await this.snapshotRepo.find({
      where: { orderId },
      order: { version: 'ASC' },
    });
    return rows.map((r) => this.rowToPayload(r));
  }

  /** 按 orderId+version 查单条快照 */
  async findByVersion(orderId: number, version: number): Promise<Record<string, unknown>> {
    const row = await this.snapshotRepo.findOne({ where: { orderId, version } });
    if (!row) {
      throw new NotFoundException(`订单 ${orderId} 的快照版本 ${version} 不存在`);
    }
    return this.rowToPayload(row);
  }

  /** 按 orderId 验链（per-order 隔离） */
  async verifyChain(orderId: number): Promise<{
    valid: boolean;
    length: number;
    headSeq: number;
    headHash: string;
    problems: Array<{ type: string; seq: number | null; detail: string }>;
  }> {
    const rows = await this.snapshotRepo.find({
      where: { orderId },
      order: { version: 'ASC' },
    });
    // P1-E 修因（双盲审 X1+X2+Y1 三席共中）：TypeORM 水合行 snapshot=json 对象、
    // occurredAt=Date，与写侧"回读原生行"（JSON 文本/字符串）算出的哈希字节不同。
    // 验链前强制转回原生字符串形态（同写侧 Date 往返漂移防线）。
    const nativeRows = rows.map((r) => ({
      orderId: r.orderId,
      version: r.version,
      prevHash: r.prevHash,
      recordHash: r.recordHash,
      operatorType: r.operatorType,
      operatorId: r.operatorId,
      correlationId: r.correlationId,
      occurredAt: r.occurredAt instanceof Date ? r.occurredAt.toISOString() : r.occurredAt,
      schemaVersion: r.schemaVersion,
      snapshot: typeof r.snapshot === 'object' && r.snapshot !== null
        ? JSON.stringify(r.snapshot)
        : r.snapshot,
    }));
    const result = verifyOrderSnapshotChain(nativeRows);
    return {
      valid: result.valid,
      length: result.length,
      headSeq: result.headSeq,
      headHash: result.headHash,
      problems: result.problems.map((p) => ({
        type: p.type,
        seq: p.seq ?? null,
        detail: p.detail,
      })),
    };
  }

  /**
   * 支付时间线聚合：快照 events 按 version 排序 + 每条标注 diff 字段
   * 返回 events 数组（时间线视图），非 admin 时 PII 已遮罩
   */
  async getTimeline(
    orderId: number,
    isAdmin: boolean,
  ): Promise<{
    orderId: number;
    totalVersions: number;
    events: Array<{
      version: number;
      occurredAt: string | null;
      operatorType: string;
      operatorId: string | null;
      changes: Record<string, { from: unknown; to: unknown }>;
      snapshot: Record<string, unknown>;
    }>;
  }> {
    const rows = await this.snapshotRepo.find({
      where: { orderId },
      order: { version: 'ASC' },
    });
    const events: Array<{
      version: number;
      occurredAt: string | null;
      operatorType: string;
      operatorId: string | null;
      changes: Record<string, { from: unknown; to: unknown }>;
      snapshot: Record<string, unknown>;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const current = this.rowToPayload(rows[i]);
      const prev = i > 0 ? this.rowToPayload(rows[i - 1]) : null;
      const changes = prev ? this.diffSnapshots(prev, current) : {};
      events.push({
        version: rows[i].version,
        occurredAt: rows[i].occurredAt?.toISOString() ?? null,
        operatorType: rows[i].operatorType,
        operatorId: rows[i].operatorId,
        // P2-F 修因：changes 的 PII from/to 也脱敏（否则从 diff 拿原值）
        changes: maskChangesPii(changes, isAdmin),
        snapshot: maskSnapshotPii(current, isAdmin),
      });
    }

    return {
      orderId,
      totalVersions: rows.length,
      events,
    };
  }

  /** 行→payload（parse snapshot JSON） */
  private rowToPayload(row: OrderSnapshot): Record<string, unknown> {
    let snapshot: Record<string, unknown>;
    try {
      snapshot = typeof row.snapshot === 'string' ? JSON.parse(row.snapshot) : row.snapshot;
    } catch {
      this.logger.warn(`快照 JSON 解析失败: orderId=${row.orderId} version=${row.version}`);
      snapshot = { _parseError: true, raw: row.snapshot };
    }
    return {
      orderId: row.orderId,
      version: row.version,
      prevHash: row.prevHash,
      recordHash: row.recordHash,
      operatorType: row.operatorType,
      operatorId: row.operatorId,
      correlationId: row.correlationId,
      occurredAt: row.occurredAt?.toISOString() ?? null,
      schemaVersion: row.schemaVersion,
      snapshot,
    };
  }

  /** 两版快照 diff（只标变化字段） */
  private diffSnapshots(
    prev: Record<string, unknown>,
    curr: Record<string, unknown>,
  ): Record<string, { from: unknown; to: unknown }> {
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    const prevSnap = prev.snapshot as Record<string, unknown>;
    const currSnap = curr.snapshot as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(prevSnap ?? {}), ...Object.keys(currSnap ?? {})]);
    for (const key of allKeys) {
      const from = prevSnap?.[key];
      const to = currSnap?.[key];
      if (JSON.stringify(from) !== JSON.stringify(to)) {
        changes[key] = { from, to };
      }
    }
    return changes;
  }
}
