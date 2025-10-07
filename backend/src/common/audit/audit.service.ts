import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Request } from 'express';
import { AuditLogEntity } from './entities/audit-log.entity';
import { TracingService } from '../tracing/tracing.service';

export enum AuditAction {
  // 用户操作
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_REGISTER = 'USER_REGISTER',
  USER_UPDATE_PROFILE = 'USER_UPDATE_PROFILE',
  USER_CHANGE_PASSWORD = 'USER_CHANGE_PASSWORD',
  USER_DELETE_ACCOUNT = 'USER_DELETE_ACCOUNT',
  USER_VERIFY_EMAIL = 'USER_VERIFY_EMAIL',
  USER_RESET_PASSWORD = 'USER_RESET_PASSWORD',

  // 产品操作
  PRODUCT_VIEW = 'PRODUCT_VIEW',
  PRODUCT_SEARCH = 'PRODUCT_SEARCH',
  PRODUCT_ADD_TO_CART = 'PRODUCT_ADD_TO_CART',
  PRODUCT_REMOVE_FROM_CART = 'PRODUCT_REMOVE_FROM_CART',
  PRODUCT_ADD_TO_WISHLIST = 'PRODUCT_ADD_TO_WISHLIST',

  // 订单操作
  ORDER_CREATE = 'ORDER_CREATE',
  ORDER_UPDATE = 'ORDER_UPDATE',
  ORDER_CANCEL = 'ORDER_CANCEL',
  ORDER_CONFIRM = 'ORDER_CONFIRM',
  ORDER_SHIP = 'ORDER_SHIP',
  ORDER_DELIVER = 'ORDER_DELIVER',
  ORDER_RETURN = 'ORDER_RETURN',
  ORDER_REFUND = 'ORDER_REFUND',

  // 支付操作
  PAYMENT_INITIATE = 'PAYMENT_INITIATE',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUND = 'PAYMENT_REFUND',
  PAYMENT_CHARGEBACK = 'PAYMENT_CHARGEBACK',

  // 管理员操作
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_USER_MANAGE = 'ADMIN_USER_MANAGE',
  ADMIN_PRODUCT_MANAGE = 'ADMIN_PRODUCT_MANAGE',
  ADMIN_ORDER_MANAGE = 'ADMIN_ORDER_MANAGE',
  ADMIN_SYSTEM_CONFIG = 'ADMIN_SYSTEM_CONFIG',

  // 安全操作
  SECURITY_LOGIN_FAILED = 'SECURITY_LOGIN_FAILED',
  SECURITY_ACCOUNT_LOCKED = 'SECURITY_ACCOUNT_LOCKED',
  SECURITY_SUSPICIOUS_ACTIVITY = 'SECURITY_SUSPICIOUS_ACTIVITY',
  SECURITY_DATA_EXPORT = 'SECURITY_DATA_EXPORT',
  SECURITY_PERMISSION_DENIED = 'SECURITY_PERMISSION_DENIED',

  // 系统操作
  SYSTEM_BACKUP = 'SYSTEM_BACKUP',
  SYSTEM_RESTORE = 'SYSTEM_RESTORE',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

export enum AuditResult {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
  PENDING = 'PENDING',
}

export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface AuditContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  traceId?: string;
  endpoint?: string;
  httpMethod?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  riskScore?: number;
  isSuspicious?: boolean;
  correlationId?: string;
  tags?: string[];
}

export interface AuditLogFilter {
  userId?: string;
  action?: AuditAction | AuditAction[];
  result?: AuditResult | AuditResult[];
  severity?: AuditSeverity | AuditSeverity[];
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  resourceType?: string;
  resourceId?: string;
  isSuspicious?: boolean;
  riskScoreMin?: number;
  riskScoreMax?: number;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface AuditStatistics {
  totalLogs: number;
  actionCounts: Record<string, number>;
  resultCounts: Record<string, number>;
  severityCounts: Record<string, number>;
  topUsers: Array<{ userId: string; count: number }>;
  topIpAddresses: Array<{ ipAddress: string; count: number }>;
  suspiciousActivities: number;
  highRiskActivities: number;
  recentTrends: Array<{
    date: string;
    total: number;
    success: number;
    failed: number;
    suspicious: number;
  }>;
}

/**
 * 增强的审计日志服务
 * 支持完整的业务操作审计、风险评估和统计分析
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private auditLogRepository: Repository<AuditLogEntity>,
    private readonly tracingService: TracingService,
  ) {}

  /**
   * 记录增强的审计日志
   */
  async log(
    action: AuditAction,
    result: AuditResult,
    context: AuditContext,
    description?: string,
    severity: AuditSeverity = AuditSeverity.LOW,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
  ): Promise<AuditLogEntity> {
    return this.tracingService.trace(
      'audit-log-creation',
      async span => {
        span.setAttributes({
          'audit.action': action,
          'audit.result': result,
          'audit.severity': severity,
          'audit.user_id': context.userId || 'anonymous',
          'audit.resource_type': context.resourceType || 'unknown',
        });

        const auditLog = this.auditLogRepository.create({
          // 映射到现有字段
          operation: action,
          module: context.resourceType || 'unknown',
          method: context.httpMethod || 'UNKNOWN',
          url: context.endpoint || '',
          ip: context.ipAddress || '',
          userAgent: context.userAgent || '',
          userId: context.userId,
          userName: context.userEmail,
          requestParams: JSON.stringify(oldValues || {}),
          responseData: JSON.stringify(newValues || {}),
          duration: 0, // 可以从 context.metadata 中获取
          status: result === AuditResult.SUCCESS ? 'SUCCESS' : 'FAILURE',
          errorMessage: result === AuditResult.FAILED ? description : undefined,
          createTime: new Date(),

          // 扩展字段（如果实体支持）
          ...(context.metadata && { metadata: JSON.stringify(context.metadata) }),
          ...(context.traceId && { traceId: context.traceId }),
          ...(context.sessionId && { sessionId: context.sessionId }),
          ...(context.requestId && { requestId: context.requestId }),
        });

        try {
          const savedLog = await this.auditLogRepository.save(auditLog);

          // 计算风险分数
          const riskScore = context.riskScore || this.calculateRiskScore(action, context);
          const isSuspicious = context.isSuspicious || this.isSuspiciousActivity(action, context);

          // 异步处理高风险活动
          if (isSuspicious || riskScore > 70) {
            this.handleHighRiskActivity(savedLog, riskScore, isSuspicious).catch(error => {
              this.logger.error('Failed to handle high risk activity', error);
            });
          }

          span.setAttributes({
            'audit.log_id': savedLog.id,
            'audit.risk_score': riskScore,
            'audit.is_suspicious': isSuspicious,
          });

          return savedLog;
        } catch (error) {
          span.recordException(error);
          this.logger.error('Failed to save audit log', error);
          throw error;
        }
      },
      { 'business.domain': 'audit' },
    );
  }

  /**
   * 从 HTTP 请求创建审计上下文
   */
  createContextFromRequest(
    request: Request,
    additionalContext: Partial<AuditContext> = {},
  ): AuditContext {
    const user = request.user as any;

    return {
      userId: user?.id || user?.sub,
      userEmail: user?.email,
      userRole: user?.role,
      ipAddress: this.extractIpAddress(request),
      userAgent: request.headers['user-agent'],
      requestId: request.headers['x-request-id'] as string,
      sessionId: (request as any).sessionID || 'unknown',
      endpoint: `${request.method} ${request.path}`,
      httpMethod: request.method,
      ...additionalContext,
    };
  }

  /**
   * 查询审计日志（兼容原有接口）
   */
  async findLogs(params: {
    userId?: string;
    module?: string;
    operation?: string;
    startTime?: Date;
    endTime?: Date;
    page?: number;
    limit?: number;
  }) {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

    if (params.userId) {
      queryBuilder.andWhere('audit.userId = :userId', { userId: params.userId });
    }

    if (params.module) {
      queryBuilder.andWhere('audit.module = :module', { module: params.module });
    }

    if (params.operation) {
      queryBuilder.andWhere('audit.operation LIKE :operation', {
        operation: `%${params.operation}%`,
      });
    }

    if (params.startTime) {
      queryBuilder.andWhere('audit.createTime >= :startTime', {
        startTime: params.startTime,
      });
    }

    if (params.endTime) {
      queryBuilder.andWhere('audit.createTime <= :endTime', {
        endTime: params.endTime,
      });
    }

    queryBuilder.orderBy('audit.createTime', 'DESC');

    const page = params.page || 1;
    const limit = params.limit || 20;
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [logs, total] = await queryBuilder.getManyAndCount();

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 增强的查询审计日志
   */
  async findLogsAdvanced(filter: AuditLogFilter): Promise<AuditLogEntity[]> {
    return this.tracingService.trace(
      'audit-logs-query',
      async span => {
        const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

        // 应用过滤条件
        if (filter.userId) {
          queryBuilder.andWhere('audit.userId = :userId', { userId: filter.userId });
        }

        if (filter.action) {
          if (Array.isArray(filter.action)) {
            queryBuilder.andWhere('audit.operation IN (:...actions)', { actions: filter.action });
          } else {
            queryBuilder.andWhere('audit.operation = :action', { action: filter.action });
          }
        }

        if (filter.startDate && filter.endDate) {
          queryBuilder.andWhere('audit.createTime BETWEEN :startDate AND :endDate', {
            startDate: filter.startDate,
            endDate: filter.endDate,
          });
        }

        if (filter.ipAddress) {
          queryBuilder.andWhere('audit.ip = :ipAddress', { ipAddress: filter.ipAddress });
        }

        // 排序和分页
        queryBuilder.orderBy('audit.createTime', 'DESC');

        if (filter.limit) {
          queryBuilder.limit(filter.limit);
        }

        if (filter.offset) {
          queryBuilder.offset(filter.offset);
        }

        const logs = await queryBuilder.getMany();

        span.setAttributes({
          'audit.query.result_count': logs.length,
          'audit.query.has_filters': Object.keys(filter).length > 0,
        });

        return logs;
      },
      { 'business.domain': 'audit' },
    );
  }

  /**
   * 获取审计统计信息
   */
  async getStatistics(startDate: Date, endDate: Date): Promise<AuditStatistics> {
    return this.tracingService.trace(
      'audit-statistics',
      async span => {
        const [totalLogs, actionCounts, resultCounts, topUsers, topIpAddresses, recentTrends] =
          await Promise.all([
            this.getTotalLogsCount(startDate, endDate),
            this.getActionCounts(startDate, endDate),
            this.getResultCounts(startDate, endDate),
            this.getTopUsers(startDate, endDate),
            this.getTopIpAddresses(startDate, endDate),
            this.getRecentTrends(startDate, endDate),
          ]);

        const statistics: AuditStatistics = {
          totalLogs,
          actionCounts,
          resultCounts,
          severityCounts: {}, // 简化版本
          topUsers,
          topIpAddresses,
          suspiciousActivities: 0, // 简化版本
          highRiskActivities: 0, // 简化版本
          recentTrends,
        };

        span.setAttributes({
          'audit.stats.total_logs': totalLogs,
        });

        return statistics;
      },
      { 'business.domain': 'audit' },
    );
  }

  /**
   * 清理过期日志
   */
  async cleanupLogs(daysToKeep: number = 90): Promise<number> {
    return this.tracingService.trace(
      'audit-cleanup',
      async span => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await this.auditLogRepository
          .createQueryBuilder()
          .delete()
          .where('createTime < :cutoffDate', { cutoffDate })
          .execute();

        const deletedCount = result.affected || 0;

        span.setAttributes({
          'audit.cleanup.deleted_count': deletedCount,
        });

        this.logger.log(`Cleaned up ${deletedCount} expired audit logs`);
        return deletedCount;
      },
      { 'business.domain': 'audit' },
    );
  }

  // 私有方法

  private extractIpAddress(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string) ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  private calculateRiskScore(action: AuditAction, context: AuditContext): number {
    let score = 0;

    // 基于操作类型的基础分数
    const actionRiskScores: Record<string, number> = {
      [AuditAction.USER_LOGIN]: 10,
      [AuditAction.USER_LOGOUT]: 5,
      [AuditAction.USER_REGISTER]: 15,
      [AuditAction.USER_CHANGE_PASSWORD]: 25,
      [AuditAction.USER_DELETE_ACCOUNT]: 50,
      [AuditAction.PAYMENT_INITIATE]: 30,
      [AuditAction.PAYMENT_SUCCESS]: 20,
      [AuditAction.PAYMENT_FAILED]: 40,
      [AuditAction.ADMIN_LOGIN]: 40,
      [AuditAction.ADMIN_SYSTEM_CONFIG]: 60,
      [AuditAction.SECURITY_LOGIN_FAILED]: 70,
      [AuditAction.SECURITY_SUSPICIOUS_ACTIVITY]: 90,
      [AuditAction.SECURITY_DATA_EXPORT]: 80,
    };

    score += actionRiskScores[action] || 10;

    // 基于用户角色的调整
    if (context.userRole === 'admin') {
      score += 20;
    } else if (context.userRole === 'guest') {
      score += 10;
    }

    // 基于 IP 地址的调整（简化版本）
    if (context.ipAddress && this.isInternalIp(context.ipAddress)) {
      score -= 10;
    } else {
      score += 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  private isSuspiciousActivity(action: AuditAction, context: AuditContext): boolean {
    // 高风险操作
    const highRiskActions = [
      AuditAction.SECURITY_LOGIN_FAILED,
      AuditAction.SECURITY_SUSPICIOUS_ACTIVITY,
      AuditAction.SECURITY_DATA_EXPORT,
      AuditAction.USER_DELETE_ACCOUNT,
      AuditAction.ADMIN_SYSTEM_CONFIG,
    ];

    if (highRiskActions.includes(action)) {
      return true;
    }

    // 基于风险分数
    const riskScore = this.calculateRiskScore(action, context);
    return riskScore > 70;
  }

  private isInternalIp(ip: string): boolean {
    // 简化的内网 IP 判断
    return (
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.startsWith('172.16.') ||
      ip === '127.0.0.1' ||
      ip === 'localhost'
    );
  }

  private async handleHighRiskActivity(
    auditLog: AuditLogEntity,
    riskScore: number,
    isSuspicious: boolean,
  ): Promise<void> {
    // 这里可以实现高风险活动的处理逻辑
    this.logger.warn(
      `High risk activity detected: ${auditLog.operation} by user ${auditLog.userId}`,
      {
        auditLogId: auditLog.id,
        riskScore,
        isSuspicious,
      },
    );

    // TODO: 实现具体的高风险活动处理逻辑
    // - 发送邮件/短信告警
    // - 调用安全服务 API
    // - 触发自动化安全响应
  }

  // 统计查询方法

  private async getTotalLogsCount(startDate: Date, endDate: Date): Promise<number> {
    return this.auditLogRepository.count({
      where: { createTime: Between(startDate, endDate) },
    });
  }

  private async getActionCounts(startDate: Date, endDate: Date): Promise<Record<string, number>> {
    const results = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.operation', 'action')
      .addSelect('COUNT(*)', 'count')
      .where('audit.createTime BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('audit.operation')
      .getRawMany();

    return results.reduce((acc, { action, count }) => {
      acc[action] = parseInt(count);
      return acc;
    }, {});
  }

  private async getResultCounts(startDate: Date, endDate: Date): Promise<Record<string, number>> {
    const results = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.status', 'result')
      .addSelect('COUNT(*)', 'count')
      .where('audit.createTime BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('audit.status')
      .getRawMany();

    return results.reduce((acc, { result, count }) => {
      acc[result] = parseInt(count);
      return acc;
    }, {});
  }

  private async getTopUsers(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ userId: string; count: number }>> {
    const results = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.userId', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('audit.createTime BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('audit.userId IS NOT NULL')
      .groupBy('audit.userId')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return results.map(({ userId, count }) => ({
      userId,
      count: parseInt(count),
    }));
  }

  private async getTopIpAddresses(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ ipAddress: string; count: number }>> {
    const results = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.ip', 'ipAddress')
      .addSelect('COUNT(*)', 'count')
      .where('audit.createTime BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('audit.ip IS NOT NULL')
      .groupBy('audit.ip')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return results.map(({ ipAddress, count }) => ({
      ipAddress,
      count: parseInt(count),
    }));
  }

  private async getRecentTrends(
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{
      date: string;
      total: number;
      success: number;
      failed: number;
      suspicious: number;
    }>
  > {
    const results = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('DATE(audit.createTime)', 'date')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN audit.status = "SUCCESS" THEN 1 ELSE 0 END)', 'success')
      .addSelect('SUM(CASE WHEN audit.status = "FAILURE" THEN 1 ELSE 0 END)', 'failed')
      .addSelect('0', 'suspicious') // 简化版本
      .where('audit.createTime BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('DATE(audit.createTime)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return results.map(({ date, total, success, failed, suspicious }) => ({
      date,
      total: parseInt(total),
      success: parseInt(success),
      failed: parseInt(failed),
      suspicious: parseInt(suspicious),
    }));
  }
}
