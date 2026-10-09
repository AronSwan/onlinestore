import { Repository, DataSource } from 'typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';
export declare enum AuditAction {
    USER_LOGIN = "USER_LOGIN",
    USER_LOGOUT = "USER_LOGOUT",
    USER_REGISTER = "USER_REGISTER",
    USER_UPDATE_PROFILE = "USER_UPDATE_PROFILE",
    USER_CHANGE_PASSWORD = "USER_CHANGE_PASSWORD",
    USER_DELETE_ACCOUNT = "USER_DELETE_ACCOUNT",
    USER_VERIFY_EMAIL = "USER_VERIFY_EMAIL",
    USER_RESET_PASSWORD = "USER_RESET_PASSWORD",
    PRODUCT_VIEW = "PRODUCT_VIEW",
    PRODUCT_SEARCH = "PRODUCT_SEARCH",
    PRODUCT_ADD_TO_CART = "PRODUCT_ADD_TO_CART",
    PRODUCT_REMOVE_FROM_CART = "PRODUCT_REMOVE_FROM_CART",
    PRODUCT_ADD_TO_WISHLIST = "PRODUCT_ADD_TO_WISHLIST",
    PRODUCT_AUTO_UNLIST = "PRODUCT_AUTO_UNLIST",
    ORDER_CREATE = "ORDER_CREATE",
    ORDER_UPDATE = "ORDER_UPDATE",
    ORDER_CANCEL = "ORDER_CANCEL",
    ORDER_CONFIRM = "ORDER_CONFIRM",
    ORDER_SHIP = "ORDER_SHIP",
    ORDER_DELIVER = "ORDER_DELIVER",
    ORDER_RETURN = "ORDER_RETURN",
    ORDER_REFUND = "ORDER_REFUND",
    PAYMENT_INITIATE = "PAYMENT_INITIATE",
    PAYMENT_SUCCESS = "PAYMENT_SUCCESS",
    PAYMENT_FAILED = "PAYMENT_FAILED",
    PAYMENT_REFUND = "PAYMENT_REFUND",
    PAYMENT_CHARGEBACK = "PAYMENT_CHARGEBACK",
    ADMIN_LOGIN = "ADMIN_LOGIN",
    ADMIN_USER_MANAGE = "ADMIN_USER_MANAGE",
    ADMIN_PRODUCT_MANAGE = "ADMIN_PRODUCT_MANAGE",
    ADMIN_ORDER_MANAGE = "ADMIN_ORDER_MANAGE",
    ADMIN_SYSTEM_CONFIG = "ADMIN_SYSTEM_CONFIG",
    SECURITY_LOGIN_FAILED = "SECURITY_LOGIN_FAILED",
    SECURITY_ACCOUNT_LOCKED = "SECURITY_ACCOUNT_LOCKED",
    SECURITY_SUSPICIOUS_ACTIVITY = "SECURITY_SUSPICIOUS_ACTIVITY",
    SECURITY_DATA_EXPORT = "SECURITY_DATA_EXPORT",
    SECURITY_PERMISSION_DENIED = "SECURITY_PERMISSION_DENIED",
    SYSTEM_BACKUP = "SYSTEM_BACKUP",
    SYSTEM_RESTORE = "SYSTEM_RESTORE",
    SYSTEM_MAINTENANCE = "SYSTEM_MAINTENANCE",
    SYSTEM_ERROR = "SYSTEM_ERROR"
}
export declare enum AuditResult {
    SUCCESS = "SUCCESS",
    FAILED = "FAILED",
    PARTIAL = "PARTIAL",
    PENDING = "PENDING"
}
export declare enum AuditSeverity {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL"
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
    topUsers: Array<{
        userId: string;
        count: number;
    }>;
    topIpAddresses: Array<{
        ipAddress: string;
        count: number;
    }>;
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
export declare class AuditService {
    private auditLogRepository;
    private readonly dataSource;
    private readonly logger;
    constructor(auditLogRepository: Repository<AuditLogEntity>, dataSource: DataSource);
    log(action: AuditAction, result: AuditResult, context: AuditContext, description?: string, severity?: AuditSeverity, oldValues?: Record<string, any>, newValues?: Record<string, any>): Promise<AuditLogEntity>;
    findLogs(params: {
        userId?: string;
        module?: string;
        operation?: string;
        startTime?: Date;
        endTime?: Date;
        page?: number;
        limit?: number;
    }): Promise<{
        data: AuditLogEntity[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findLogsAdvanced(filter: AuditLogFilter): Promise<AuditLogEntity[]>;
    getStatistics(startDate: Date, endDate: Date): Promise<AuditStatistics>;
    cleanupLogs(daysToKeep?: number): Promise<number>;
    private extractIpAddress;
    private calculateRiskScore;
    private isSuspiciousActivity;
    private isInternalIp;
    private handleHighRiskActivity;
    private getTotalLogsCount;
    private getActionCounts;
    private getResultCounts;
    private getTopUsers;
    private getTopIpAddresses;
    private getRecentTrends;
}
