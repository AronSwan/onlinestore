"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("typeorm");
const audit_service_1 = require("./audit.service");
const audit_log_entity_1 = require("./entities/audit-log.entity");
const audit_chain_1 = require("./audit-chain");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const role_enum_1 = require("../../auth/enums/role.enum");
let AuditController = class AuditController {
    constructor(auditService, dataSource) {
        this.auditService = auditService;
        this.dataSource = dataSource;
    }
    async verifyAuditChain() {
        const rows = await this.dataSource.query(`SELECT id, seq, prevHash, recordHash, createTime, userId, userName, operation,
              module, method, url, ip, userAgent, requestParams, responseData,
              duration, status, errorMessage
       FROM audit_logs`);
        const result = (0, audit_chain_1.verifyChain)(rows);
        const message = result.valid
            ? `台账链完整：${result.length} 条记录首尾相扣，头哈希 ${result.headHash.slice(0, 8)}…。git 锚比对请跑 npm run verify:audit。`
            : `台账链在第 ${result.problems.find(p => p.seq !== null)?.seq ?? '?'} 条断裂——绕过管理页直接改过库。跑 npm run verify:audit 看逐行报告。`;
        return {
            valid: result.valid,
            length: result.length,
            headSeq: result.headSeq,
            headHash: result.headHash,
            problemsTotal: result.problems.length,
            problems: result.problems.slice(0, 20),
            message,
        };
    }
    async findLogs(userId, module, operation, startTime, endTime, page = 1, limit = 20) {
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
    async findLogsAdvanced(filter) {
        return this.auditService.findLogsAdvanced(filter);
    }
    async getStatistics(startDate, endDate) {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        return this.auditService.getStatistics(start, end);
    }
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
    async getUserActivity(userId, days = 30) {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
        const filter = {
            userId,
            startDate,
            endDate,
            limit: 1000,
        };
        const logs = await this.auditService.findLogsAdvanced(filter);
        const actionCounts = logs.reduce((acc, log) => {
            acc[log.operation] = (acc[log.operation] || 0) + 1;
            return acc;
        }, {});
        const dailyActivity = logs.reduce((acc, log) => {
            const date = log.createTime.toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});
        return {
            userId,
            period: { startDate, endDate, days },
            totalActivities: logs.length,
            actionCounts,
            dailyActivity,
            recentActivities: logs.slice(0, 10),
        };
    }
    async getSecurityEvents(days = 7) {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
        const securityActions = [
            audit_service_1.AuditAction.SECURITY_LOGIN_FAILED,
            audit_service_1.AuditAction.SECURITY_ACCOUNT_LOCKED,
            audit_service_1.AuditAction.SECURITY_SUSPICIOUS_ACTIVITY,
            audit_service_1.AuditAction.SECURITY_DATA_EXPORT,
            audit_service_1.AuditAction.SECURITY_PERMISSION_DENIED,
        ];
        const filter = {
            action: securityActions,
            startDate,
            endDate,
            limit: 1000,
        };
        const securityLogs = await this.auditService.findLogsAdvanced(filter);
        const eventCounts = securityLogs.reduce((acc, log) => {
            acc[log.operation] = (acc[log.operation] || 0) + 1;
            return acc;
        }, {});
        const ipCounts = securityLogs.reduce((acc, log) => {
            acc[log.ip] = (acc[log.ip] || 0) + 1;
            return acc;
        }, {});
        const userCounts = securityLogs.reduce((acc, log) => {
            if (log.userId) {
                acc[log.userId] = (acc[log.userId] || 0) + 1;
            }
            return acc;
        }, {});
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
    async cleanupLogs(days = 90) {
        const deletedCount = await this.auditService.cleanupLogs(days);
        return {
            message: '日志清理完成',
            deletedCount,
            retentionDays: days,
        };
    }
    async getHealth() {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const [recentStats, dailyStats] = await Promise.all([
            this.auditService.getStatistics(oneHourAgo, now),
            this.auditService.getStatistics(oneDayAgo, now),
        ]);
        const isHealthy = recentStats.totalLogs > 0;
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
                normalVolume: avgLogsPerHour > 0 && avgLogsPerHour < 1000,
                lowSuspiciousActivity: dailyStats.suspiciousActivities < 10,
            },
        };
    }
    async scheduledCleanup() {
        try {
            const deletedCount = await this.auditService.cleanupLogs(90);
            console.log(`Scheduled cleanup completed: ${deletedCount} logs deleted`);
        }
        catch (error) {
            console.error('Scheduled cleanup failed:', error);
        }
    }
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
        const auditLog = await this.auditService.log(audit_service_1.AuditAction.SYSTEM_MAINTENANCE, audit_service_1.AuditResult.SUCCESS, testContext, 'Test audit log created successfully', audit_service_1.AuditSeverity.LOW);
        return {
            message: '测试审计日志创建成功',
            auditLogId: auditLog.id,
            timestamp: auditLog.createTime,
        };
    }
};
exports.AuditController = AuditController;
__decorate([
    (0, common_1.Get)('verify'),
    (0, swagger_1.ApiOperation)({ summary: '校验台账哈希链完整性' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '校验完成（valid 标志链完整与否）' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "verifyAuditChain", null);
__decorate([
    (0, common_1.Get)('logs'),
    (0, swagger_1.ApiOperation)({ summary: '查询审计日志' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '查询成功' }),
    (0, swagger_1.ApiQuery)({ name: 'userId', required: false, description: '用户ID' }),
    (0, swagger_1.ApiQuery)({ name: 'module', required: false, description: '模块名称' }),
    (0, swagger_1.ApiQuery)({ name: 'operation', required: false, description: '操作类型' }),
    (0, swagger_1.ApiQuery)({ name: 'startTime', required: false, description: '开始时间' }),
    (0, swagger_1.ApiQuery)({ name: 'endTime', required: false, description: '结束时间' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, description: '页码', type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, description: '每页数量', type: Number }),
    __param(0, (0, common_1.Query)('userId')),
    __param(1, (0, common_1.Query)('module')),
    __param(2, (0, common_1.Query)('operation')),
    __param(3, (0, common_1.Query)('startTime')),
    __param(4, (0, common_1.Query)('endTime')),
    __param(5, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(6, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "findLogs", null);
__decorate([
    (0, common_1.Post)('logs/search'),
    (0, swagger_1.ApiOperation)({ summary: '高级查询审计日志' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '查询成功', type: [audit_log_entity_1.AuditLogEntity] }),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "findLogsAdvanced", null);
__decorate([
    (0, common_1.Get)('statistics'),
    (0, swagger_1.ApiOperation)({ summary: '获取审计统计信息' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '统计信息获取成功' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, description: '开始日期' }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, description: '结束日期' }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Get)('overview'),
    (0, swagger_1.ApiOperation)({ summary: '获取审计概览' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '概览信息获取成功' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "getOverview", null);
__decorate([
    (0, common_1.Get)('users/:userId/activity'),
    (0, swagger_1.ApiOperation)({ summary: '获取用户活动统计' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '用户活动统计获取成功' }),
    __param(0, (0, common_1.Query)('userId')),
    __param(1, (0, common_1.Query)('days', new common_1.DefaultValuePipe(30), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "getUserActivity", null);
__decorate([
    (0, common_1.Get)('security/events'),
    (0, swagger_1.ApiOperation)({ summary: '获取安全事件统计' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '安全事件统计获取成功' }),
    __param(0, (0, common_1.Query)('days', new common_1.DefaultValuePipe(7), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "getSecurityEvents", null);
__decorate([
    (0, common_1.Post)('cleanup'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: '手动清理过期日志' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '清理完成' }),
    __param(0, (0, common_1.Query)('days', new common_1.DefaultValuePipe(90), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "cleanupLogs", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({ summary: '获取审计健康状态' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '健康状态获取成功' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "getHealth", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_2AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "scheduledCleanup", null);
__decorate([
    (0, common_1.Post)('test'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: '测试审计日志记录' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '测试完成' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuditController.prototype, "testAuditLog", null);
exports.AuditController = AuditController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiTags)('审计日志'),
    (0, common_1.Controller)('audit'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [audit_service_1.AuditService,
        typeorm_1.DataSource])
], AuditController);
