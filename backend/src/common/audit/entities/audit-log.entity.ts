import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * 审计日志实体
 */
@Entity('audit_logs')
@Index(['userId', 'createTime'])
@Index(['module', 'createTime'])
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

  @CreateDateColumn({ comment: '创建时间' })
  createTime: Date;
}
