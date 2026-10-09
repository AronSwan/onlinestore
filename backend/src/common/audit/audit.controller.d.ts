import { DataSource } from 'typeorm';
import { AuditService, AuditLogFilter, AuditStatistics } from './audit.service';
import { AuditLogEntity } from './entities/audit-log.entity';
export declare class AuditController {
    private readonly auditService;
    private readonly dataSource;
    constructor(auditService: AuditService, dataSource: DataSource);
    verifyAuditChain(): Promise<{
        valid: boolean;
        length: number;
        headSeq: number;
        headHash: string;
        problemsTotal: number;
        problems: import("./audit-chain").ChainProblem[];
        message: string;
    }>;
    findLogs(userId?: string, module?: string, operation?: string, startTime?: string, endTime?: string, page?: number, limit?: number): Promise<{
        data: AuditLogEntity[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findLogsAdvanced(filter: AuditLogFilter): Promise<AuditLogEntity[]>;
    getStatistics(startDate?: string, endDate?: string): Promise<AuditStatistics>;
    getOverview(): Promise<{
        today: {
            total: number;
            suspicious: number;
            highRisk: number;
        };
        yesterday: {
            total: number;
            suspicious: number;
            highRisk: number;
        };
        thisWeek: {
            total: number;
            suspicious: number;
            highRisk: number;
        };
        thisMonth: {
            total: number;
            suspicious: number;
            highRisk: number;
        };
        trends: {
            date: string;
            total: number;
            success: number;
            failed: number;
            suspicious: number;
        }[];
    }>;
    getUserActivity(userId: string, days?: number): Promise<{
        userId: string;
        period: {
            startDate: Date;
            endDate: Date;
            days: number;
        };
        totalActivities: number;
        actionCounts: Record<string, number>;
        dailyActivity: Record<string, number>;
        recentActivities: AuditLogEntity[];
    }>;
    getSecurityEvents(days?: number): Promise<{
        period: {
            startDate: Date;
            endDate: Date;
            days: number;
        };
        totalEvents: number;
        eventCounts: Record<string, number>;
        topIps: {
            ip: string;
            count: number;
        }[];
        topUsers: {
            userId: string;
            count: number;
        }[];
        recentEvents: AuditLogEntity[];
    }>;
    cleanupLogs(days?: number): Promise<{
        message: string;
        deletedCount: number;
        retentionDays: number;
    }>;
    getHealth(): Promise<{
        status: string;
        timestamp: Date;
        metrics: {
            recentLogs: number;
            dailyLogs: number;
            avgLogsPerHour: number;
            suspiciousActivities: number;
            highRiskActivities: number;
        };
        checks: {
            recentActivity: boolean;
            normalVolume: boolean;
            lowSuspiciousActivity: boolean;
        };
    }>;
    scheduledCleanup(): Promise<void>;
    testAuditLog(): Promise<{
        message: string;
        auditLogId: string;
        timestamp: Date;
    }>;
}
