import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
  DefaultValuePipe,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AuditService,
  AuditAction,
  AuditResult,
  AuditSeverity,
  AuditLogFilter,
  AuditStatistics,
} from './audit.service';
import { AuditLogEntity } from './entities/audit-log.entity';

/**
 * 审计日志控制器
 * 提供审计日志的查询、统计和管理功能
 */
@ApiTags('审计日志')
@Controller('audit')
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * 查询审计日志（兼容原有接口）
   */
  @Get('logs')
  @ApiOperation({ summary: '查询审计日志' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiQuery({ name: 'userId', required: false, description: '用户ID' })
  @ApiQuery({ name: 'module', required: false, description: '模块名称' })
  @ApiQuery({ name: 'operation', required: false, description: '操作类型' })
  @ApiQuery({ name: 'startTime', required: false, description: '开始时间' })
  @ApiQuery({ name: 'endTime', required: false, description: '结束时间' })
  @ApiQuery({ name: 'page', required: false, description: '页码', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', type: Number })
  async findLogs(
    @Query('userId') userId?: string,
    @Query('module') module?: string,
    @Query('operation') operation?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    const params = {
      userId,
      module,
      operation,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      page,
      limit,
    };

    return this.auditService.findLogs(params);
  }

  /**
   * 高级查询审计日志
   */
  @Post('logs/search')
  @ApiOperation({ summary: '高级查询审计日志' })
  @ApiResponse({ status: 200, description: '查询成功', type: [AuditLogEntity] })
  async findLogsAdvanced(@Body(ValidationPipe) filter: AuditLogFilter): Promise<AuditLogEntity[]> {
    return this.auditService.findLogsAdvanced(filter);
  }

  /**
   * 获取审计统计信息
   */
  @Get('statistics')
  @ApiOperation({ summary: '获取审计统计信息' })
  @ApiResponse({ status: 200, description: '统计信息获取成功' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AuditStatistics> {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 默认 30 天前
    const end = endDate ? new Date(endDate) : new Date(); // 默认今天

    return this.auditService.getStatistics(start, end);
  }

  /**
   * 获取审计概览
   */
  @Get('overview')
  @ApiOperation({ summary: '获取审计概览' })
  @ApiResponse({ status: 200, description: '概览信息获取成功' })
  async getOverview() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [todayStats, yesterdayStats, weekStats, monthStats] = await Promise.all([
      this.auditService.getStatistics(today, now),
      this.auditService.getStatistics(yesterday, today),
      this.auditService.getStatistics(thisWeek, now),
      this.auditService.getStatistics(thisMonth, now),
    ]);

    return {
      today: {
        total: todayStats.totalLogs,
        suspicious: todayStats.suspiciousActivities,
        highRisk: todayStats.highRiskActivities,
      },
      yesterday: {
        total: yesterdayStats.totalLogs,
        suspicious: yesterdayStats.suspiciousActivities,
        highRisk: yesterdayStats.highRiskActivities,
      },
      thisWeek: {
        total: weekStats.totalLogs,
        suspicious: weekStats.suspiciousActivities,
        highRisk: weekStats.highRiskActivities,
      },
      thisMonth: {
        total: monthStats.totalLogs,
        suspicious: monthStats.suspiciousActivities,
        highRisk: monthStats.highRiskActivities,
      },
      trends: monthStats.recentTrends,
    };
  }

  /**
   * 获取用户活动统计
   */
  @Get('users/:userId/activity')
  @ApiOperation({ summary: '获取用户活动统计' })
  @ApiResponse({ status: 200, description: '用户活动统计获取成功' })
  async getUserActivity(
    @Query('userId') userId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number = 30,
  ) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const filter: AuditLogFilter = {
      userId,
      startDate,
      endDate,
      limit: 1000,
    };

    const logs = await this.auditService.findLogsAdvanced(filter);

    // 统计用户活动
    const actionCounts = logs.reduce(
      (acc, log) => {
        acc[log.operation] = (acc[log.operation] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const dailyActivity = logs.reduce(
      (acc, log) => {
        const date = log.createTime.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      userId,
      period: { startDate, endDate, days },
      totalActivities: logs.length,
      actionCounts,
      dailyActivity,
      recentActivities: logs.slice(0, 10),
    };
  }

  /**
   * 获取安全事件统计
   */
  @Get('security/events')
  @ApiOperation({ summary: '获取安全事件统计' })
  @ApiResponse({ status: 200, description: '安全事件统计获取成功' })
  async getSecurityEvents(@Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number = 7) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const securityActions = [
      AuditAction.SECURITY_LOGIN_FAILED,
      AuditAction.SECURITY_ACCOUNT_LOCKED,
      AuditAction.SECURITY_SUSPICIOUS_ACTIVITY,
      AuditAction.SECURITY_DATA_EXPORT,
      AuditAction.SECURITY_PERMISSION_DENIED,
    ];

    const filter: AuditLogFilter = {
      action: securityActions,
      startDate,
      endDate,
      limit: 1000,
    };

    const securityLogs = await this.auditService.findLogsAdvanced(filter);

    // 按类型统计
    const eventCounts = securityLogs.reduce(
      (acc, log) => {
        acc[log.operation] = (acc[log.operation] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 按 IP 统计
    const ipCounts = securityLogs.reduce(
      (acc, log) => {
        acc[log.ip] = (acc[log.ip] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 按用户统计
    const userCounts = securityLogs.reduce(
      (acc, log) => {
        if (log.userId) {
          acc[log.userId] = (acc[log.userId] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      period: { startDate, endDate, days },
      totalEvents: securityLogs.length,
      eventCounts,
      topIps: Object.entries(ipCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([ip, count]) => ({ ip, count })),
      topUsers: Object.entries(userCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([userId, count]) => ({ userId, count })),
      recentEvents: securityLogs.slice(0, 20),
    };
  }

  /**
   * 手动清理过期日志
   */
  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '手动清理过期日志' })
  @ApiResponse({ status: 200, description: '清理完成' })
  async cleanupLogs(@Query('days', new DefaultValuePipe(90), ParseIntPipe) days: number = 90) {
    const deletedCount = await this.auditService.cleanupLogs(days);
    return {
      message: '日志清理完成',
      deletedCount,
      retentionDays: days,
    };
  }

  /**
   * 获取审计健康状态
   */
  @Get('health')
  @ApiOperation({ summary: '获取审计健康状态' })
  @ApiResponse({ status: 200, description: '健康状态获取成功' })
  async getHealth() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [recentStats, dailyStats] = await Promise.all([
      this.auditService.getStatistics(oneHourAgo, now),
      this.auditService.getStatistics(oneDayAgo, now),
    ]);

    const isHealthy = recentStats.totalLogs > 0; // 最近一小时有日志记录
    const avgLogsPerHour = dailyStats.totalLogs / 24;

    return {
      status: isHealthy ? 'healthy' : 'warning',
      timestamp: now,
      metrics: {
        recentLogs: recentStats.totalLogs,
        dailyLogs: dailyStats.totalLogs,
        avgLogsPerHour: Math.round(avgLogsPerHour),
        suspiciousActivities: dailyStats.suspiciousActivities,
        highRiskActivities: dailyStats.highRiskActivities,
      },
      checks: {
        recentActivity: recentStats.totalLogs > 0,
        normalVolume: avgLogsPerHour > 0 && avgLogsPerHour < 1000, // 合理的日志量
        lowSuspiciousActivity: dailyStats.suspiciousActivities < 10,
      },
    };
  }

  /**
   * 定时清理过期日志（每天凌晨 2 点执行）
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledCleanup() {
    try {
      const deletedCount = await this.auditService.cleanupLogs(90);
      console.log(`Scheduled cleanup completed: ${deletedCount} logs deleted`);
    } catch (error) {
      console.error('Scheduled cleanup failed:', error);
    }
  }

  /**
   * 测试审计日志记录
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '测试审计日志记录' })
  @ApiResponse({ status: 200, description: '测试完成' })
  async testAuditLog() {
    const testContext = {
      userId: 'test-user-123',
      userEmail: 'test@example.com',
      userRole: 'user',
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent',
      endpoint: 'POST /audit/test',
      httpMethod: 'POST',
      resourceType: 'audit',
      metadata: {
        testFlag: true,
        timestamp: new Date().toISOString(),
      },
    };

    const auditLog = await this.auditService.log(
      AuditAction.SYSTEM_MAINTENANCE,
      AuditResult.SUCCESS,
      testContext,
      'Test audit log created successfully',
      AuditSeverity.LOW,
    );

    return {
      message: '测试审计日志创建成功',
      auditLogId: auditLog.id,
      timestamp: auditLog.createTime,
    };
  }
}
