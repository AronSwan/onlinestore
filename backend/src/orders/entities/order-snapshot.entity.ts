import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

/**
 * 订单快照操作者类型（六档——v4.1 #28 backfill 为第六档）
 */
export enum SnapshotOperatorType {
  USER = 'user',
  ADMIN = 'admin',
  SYSTEM_LISTENER = 'system_listener',
  AUTO_JOB = 'auto_job',
  GATEWAY_CALLBACK = 'gateway_callback',
  BACKFILL = 'backfill',
}

/**
 * 订单快照实体（订单快照批阶段 1，方案 v4.1）
 *
 * 设计要点（docs/order-snapshot-research.md §v4.1）：
 * - 复合主键 (orderId, version)——version 即每单链序号（seq≡version 合一，#3）
 * - 只增不改：本实体无 update 路径，仓储一律 INSERT 语义（禁 save()——
 *   探针实证 save() 撞复合主键静默变 UPDATE，TiDB 409 兜底永不触发，#26）
 * - snapshot JSON 全量（含 items+收货三件+schemaVersion+_genesis 标记）；
 *   收货三件纪律：进快照（还原保真）+ 进哈希（快照永不改写——#25 读时脱敏
 *   使 PII 不可变，哈希覆盖无害）+ 读时脱敏（出口层遮罩）
 * - changedFields 系派生缓存不作哈希源（diff 端点以相邻快照推导为准，#5）
 * - occurredAt=UTC（展示用，排序只认 version——Stripe 同秒事件教训 #4）
 */
@Entity('order_snapshots')
@Index('idx_order_snapshots_operator_time', ['operatorType', 'occurredAt'])
export class OrderSnapshot {
  @PrimaryColumn('int')
  orderId: number;

  @PrimaryColumn('int')
  version: number;

  @Column('json')
  snapshot: Record<string, unknown>;

  @Column('json', { nullable: true })
  changedFields: Array<{ field: string; from: unknown; to: unknown }> | null;

  @Column({ type: 'varchar', length: 32 })
  operatorType: SnapshotOperatorType;

  @Column({ type: 'varchar', length: 64, nullable: true })
  operatorId: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  correlationId: string | null;

  @Column({ type: 'datetime' })
  occurredAt: Date;

  @Column({ type: 'int', default: 1 })
  schemaVersion: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  prevHash: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  recordHash: string | null;
}
