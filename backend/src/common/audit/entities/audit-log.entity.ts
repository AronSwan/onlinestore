import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * 审计日志实体
 * M6(2026-10-05)：追加哈希链三列（seq/prevHash/recordHash）+ seq 唯一索引。
 * 三列 nullable——存量行待 backfill 重锚（backend/scripts/backfill-audit-chain.mjs），
 * 新写入由 AuditService.log 事务内链化；唯一索引是并发双写同 seq 的最后防线
 * （约束冲突整笔回滚，绝不留分叉）。
 */
@Entity('audit_logs')
@Index(['userId', 'createTime'])
@Index(['module', 'createTime'])
@Index('idx_audit_logs_seq_unique', ['seq'], { unique: true })
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, nullable: true, comment: '用户ID' })
  userId: string;

  @Column({ length: 100, nullable: true, comment: '用户名' })
  userName: string;

  @Column({ length: 100, comment: '操作名称' })
  operation: string;

  @Column({ length: 50, comment: '模块名称' })
  module: string;

  @Column({ length: 10, comment: '请求方法' })
  method: string;

  @Column({ length: 500, comment: '请求URL' })
  url: string;

  @Column({ length: 50, comment: '客户端IP' })
  ip: string;

  @Column({ length: 500, nullable: true, comment: '用户代理' })
  userAgent: string;

  @Column({ type: 'text', nullable: true, comment: '请求参数' })
  requestParams: string;

  @Column({ type: 'text', nullable: true, comment: '响应数据' })
  responseData: string;

  @Column({ type: 'int', comment: '执行时长(ms)' })
  duration: number;

  @Column({ length: 20, comment: '执行状态：SUCCESS/FAILURE' })
  status: string;

  @Column({ type: 'text', nullable: true, comment: '错误信息' })
  errorMessage: string;

  @Column({ type: 'int', nullable: true, comment: '链序号（哈希链定位，从 1 连续递增）' })
  seq: number;

  @Column({ length: 64, nullable: true, comment: '链前驱哈希（创世行固定 64 个 0）' })
  prevHash: string;

  @Column({ length: 64, nullable: true, comment: '链记录哈希（canonical SHA-256，见 common/audit/audit-chain.ts）' })
  recordHash: string;

  @CreateDateColumn({ comment: '创建时间' })
  createTime: Date;
}
