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
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = exports.AuditSeverity = exports.AuditResult = exports.AuditAction = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const audit_log_entity_1 = require("./entities/audit-log.entity");
const audit_chain_1 = require("./audit-chain");
const db_write_mutex_1 = require("../db-write-mutex");
var AuditAction;
(function (AuditAction) {
    AuditAction["USER_LOGIN"] = "USER_LOGIN";
    AuditAction["USER_LOGOUT"] = "USER_LOGOUT";
    AuditAction["USER_REGISTER"] = "USER_REGISTER";
    AuditAction["USER_UPDATE_PROFILE"] = "USER_UPDATE_PROFILE";
    AuditAction["USER_CHANGE_PASSWORD"] = "USER_CHANGE_PASSWORD";
    AuditAction["USER_DELETE_ACCOUNT"] = "USER_DELETE_ACCOUNT";
    AuditAction["USER_VERIFY_EMAIL"] = "USER_VERIFY_EMAIL";
    AuditAction["USER_RESET_PASSWORD"] = "USER_RESET_PASSWORD";
    AuditAction["PRODUCT_VIEW"] = "PRODUCT_VIEW";
    AuditAction["PRODUCT_SEARCH"] = "PRODUCT_SEARCH";
    AuditAction["PRODUCT_ADD_TO_CART"] = "PRODUCT_ADD_TO_CART";
    AuditAction["PRODUCT_REMOVE_FROM_CART"] = "PRODUCT_REMOVE_FROM_CART";
    AuditAction["PRODUCT_ADD_TO_WISHLIST"] = "PRODUCT_ADD_TO_WISHLIST";
    AuditAction["PRODUCT_AUTO_UNLIST"] = "PRODUCT_AUTO_UNLIST";
    AuditAction["ORDER_CREATE"] = "ORDER_CREATE";
    AuditAction["ORDER_UPDATE"] = "ORDER_UPDATE";
    AuditAction["ORDER_CANCEL"] = "ORDER_CANCEL";
    AuditAction["ORDER_CONFIRM"] = "ORDER_CONFIRM";
    AuditAction["ORDER_SHIP"] = "ORDER_SHIP";
    AuditAction["ORDER_DELIVER"] = "ORDER_DELIVER";
    AuditAction["ORDER_RETURN"] = "ORDER_RETURN";
    AuditAction["ORDER_REFUND"] = "ORDER_REFUND";
    AuditAction["PAYMENT_INITIATE"] = "PAYMENT_INITIATE";
    AuditAction["PAYMENT_SUCCESS"] = "PAYMENT_SUCCESS";
    AuditAction["PAYMENT_FAILED"] = "PAYMENT_FAILED";
    AuditAction["PAYMENT_REFUND"] = "PAYMENT_REFUND";
    AuditAction["PAYMENT_CHARGEBACK"] = "PAYMENT_CHARGEBACK";
    AuditAction["ADMIN_LOGIN"] = "ADMIN_LOGIN";
    AuditAction["ADMIN_USER_MANAGE"] = "ADMIN_USER_MANAGE";
    AuditAction["ADMIN_PRODUCT_MANAGE"] = "ADMIN_PRODUCT_MANAGE";
    AuditAction["ADMIN_ORDER_MANAGE"] = "ADMIN_ORDER_MANAGE";
    AuditAction["ADMIN_SYSTEM_CONFIG"] = "ADMIN_SYSTEM_CONFIG";
    AuditAction["SECURITY_LOGIN_FAILED"] = "SECURITY_LOGIN_FAILED";
    AuditAction["SECURITY_ACCOUNT_LOCKED"] = "SECURITY_ACCOUNT_LOCKED";
    AuditAction["SECURITY_SUSPICIOUS_ACTIVITY"] = "SECURITY_SUSPICIOUS_ACTIVITY";
    AuditAction["SECURITY_DATA_EXPORT"] = "SECURITY_DATA_EXPORT";
    AuditAction["SECURITY_PERMISSION_DENIED"] = "SECURITY_PERMISSION_DENIED";
    AuditAction["SYSTEM_BACKUP"] = "SYSTEM_BACKUP";
    AuditAction["SYSTEM_RESTORE"] = "SYSTEM_RESTORE";
    AuditAction["SYSTEM_MAINTENANCE"] = "SYSTEM_MAINTENANCE";
    AuditAction["SYSTEM_ERROR"] = "SYSTEM_ERROR";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
var AuditResult;
(function (AuditResult) {
    AuditResult["SUCCESS"] = "SUCCESS";
    AuditResult["FAILED"] = "FAILED";
    AuditResult["PARTIAL"] = "PARTIAL";
    AuditResult["PENDING"] = "PENDING";
})(AuditResult || (exports.AuditResult = AuditResult = {}));
var AuditSeverity;
(function (AuditSeverity) {
    AuditSeverity["LOW"] = "LOW";
    AuditSeverity["MEDIUM"] = "MEDIUM";
    AuditSeverity["HIGH"] = "HIGH";
    AuditSeverity["CRITICAL"] = "CRITICAL";
})(AuditSeverity || (exports.AuditSeverity = AuditSeverity = {}));
let AuditService = AuditService_1 = class AuditService {
    constructor(auditLogRepository, dataSource) {
        this.auditLogRepository = auditLogRepository;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(AuditService_1.name);
    }
    async log(action, result, context, description, severity = AuditSeverity.LOW, oldValues, newValues) {
        const auditLog = this.auditLogRepository.create({
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
            duration: 0,
            status: result === AuditResult.SUCCESS ? 'SUCCESS' : 'FAILURE',
            errorMessage: result === AuditResult.FAILED ? description : undefined,
            createTime: new Date(),
            ...(context.metadata && { metadata: JSON.stringify(context.metadata) }),
            ...(context.traceId && { traceId: context.traceId }),
            ...(context.sessionId && { sessionId: context.sessionId }),
            ...(context.requestId && { requestId: context.requestId }),
        });
        try {
            const savedLog = await (0, db_write_mutex_1.runExclusiveWrite)(() => this.dataSource.transaction(async (em) => {
                const [head] = await em.query(`SELECT seq, recordHash FROM audit_logs WHERE seq IS NOT NULL ORDER BY seq DESC LIMIT 1`);
                const seq = head ? Number(head.seq) + 1 : 1;
                const prevHash = head ? String(head.recordHash) : audit_chain_1.ZERO_HASH;
                const inserted = await em.save(audit_log_entity_1.AuditLogEntity, auditLog);
                const [rawRow] = await em.query(`SELECT * FROM audit_logs WHERE id = ?`, [
                    inserted.id,
                ]);
                const recordHash = (0, audit_chain_1.computeRecordHash)(prevHash, seq, rawRow);
                await em.update(audit_log_entity_1.AuditLogEntity, { id: inserted.id }, { seq, prevHash, recordHash });
                return { ...inserted, seq, prevHash, recordHash };
            }));
            const riskScore = context.riskScore || this.calculateRiskScore(action, context);
            const isSuspicious = context.isSuspicious || this.isSuspiciousActivity(action, context);
            if (isSuspicious || riskScore > 70) {
                this.handleHighRiskActivity(savedLog, riskScore, isSuspicious).catch(error => {
                    this.logger.error('Failed to handle high risk activity', error);
                });
            }
            return savedLog;
        }
        catch (error) {
            this.logger.error('Failed to save audit log', error);
            throw error;
        }
    }
    async findLogs(params) {
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
    async findLogsAdvanced(filter) {
        const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');
        if (filter.userId) {
            queryBuilder.andWhere('audit.userId = :userId', { userId: filter.userId });
        }
        if (filter.action) {
            if (Array.isArray(filter.action)) {
                queryBuilder.andWhere('audit.operation IN (:...actions)', { actions: filter.action });
            }
            else {
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
        queryBuilder.orderBy('audit.createTime', 'DESC');
        if (filter.limit) {
            queryBuilder.limit(filter.limit);
        }
        if (filter.offset) {
            queryBuilder.offset(filter.offset);
        }
        const logs = await queryBuilder.getMany();
        return logs;
    }
    async getStatistics(startDate, endDate) {
        const [totalLogs, actionCounts, resultCounts, topUsers, topIpAddresses, recentTrends] = await Promise.all([
            this.getTotalLogsCount(startDate, endDate),
            this.getActionCounts(startDate, endDate),
            this.getResultCounts(startDate, endDate),
            this.getTopUsers(startDate, endDate),
            this.getTopIpAddresses(startDate, endDate),
            this.getRecentTrends(startDate, endDate),
        ]);
        const statistics = {
            totalLogs,
            actionCounts,
            resultCounts,
            severityCounts: {},
            topUsers,
            topIpAddresses,
            suspiciousActivities: 0,
            highRiskActivities: 0,
            recentTrends,
        };
        return statistics;
    }
    async cleanupLogs(daysToKeep = 90) {
        const chainedCount = await this.auditLogRepository.count({
            where: { seq: (0, typeorm_2.Not)((0, typeorm_2.IsNull)()) },
        });
        if (chainedCount > 0) {
            this.logger.warn(`链式台账不参与滚动清理（在册 ${chainedCount} 条链化行，保留 ${daysToKeep} 天策略不适用于 audit_logs）`);
            return 0;
        }
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const result = await this.auditLogRepository
            .createQueryBuilder()
            .delete()
            .where('createTime < :cutoffDate', { cutoffDate })
            .execute();
        const deletedCount = result.affected || 0;
        this.logger.log(`Cleaned up ${deletedCount} expired audit logs`);
        return deletedCount;
    }
    extractIpAddress(request) {
        return (request.headers['x-forwarded-for'] ||
            request.headers['x-real-ip'] ||
            request.connection.remoteAddress ||
            request.socket.remoteAddress ||
            'unknown');
    }
    calculateRiskScore(action, context) {
        let score = 0;
        const actionRiskScores = {
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
        if (context.userRole === 'admin') {
            score += 20;
        }
        else if (context.userRole === 'guest') {
            score += 10;
        }
        if (context.ipAddress && this.isInternalIp(context.ipAddress)) {
            score -= 10;
        }
        else {
            score += 15;
        }
        return Math.max(0, Math.min(100, score));
    }
    isSuspiciousActivity(action, context) {
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
        const riskScore = this.calculateRiskScore(action, context);
        return riskScore > 70;
    }
    isInternalIp(ip) {
        return (ip.startsWith('192.168.') ||
            ip.startsWith('10.') ||
            ip.startsWith('172.16.') ||
            ip === '127.0.0.1' ||
            ip === 'localhost');
    }
    async handleHighRiskActivity(auditLog, riskScore, isSuspicious) {
        this.logger.warn(`High risk activity detected: ${auditLog.operation} by user ${auditLog.userId}`, {
            auditLogId: auditLog.id,
            riskScore,
            isSuspicious,
        });
    }
    async getTotalLogsCount(startDate, endDate) {
        return this.auditLogRepository.count({
            where: { createTime: (0, typeorm_2.Between)(startDate, endDate) },
        });
    }
    async getActionCounts(startDate, endDate) {
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
    async getResultCounts(startDate, endDate) {
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
    async getTopUsers(startDate, endDate) {
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
    async getTopIpAddresses(startDate, endDate) {
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
    async getRecentTrends(startDate, endDate) {
        const results = await this.auditLogRepository
            .createQueryBuilder('audit')
            .select('DATE(audit.createTime)', 'date')
            .addSelect('COUNT(*)', 'total')
            .addSelect('SUM(CASE WHEN audit.status = "SUCCESS" THEN 1 ELSE 0 END)', 'success')
            .addSelect('SUM(CASE WHEN audit.status = "FAILURE" THEN 1 ELSE 0 END)', 'failed')
            .addSelect('0', 'suspicious')
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
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLogEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource])
], AuditService);
