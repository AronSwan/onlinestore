import { Repository } from 'typeorm';
import { MetricsService } from './metrics.service';
export declare class Metric {
    id: number;
    timestamp: Date;
    apiCalls: number;
    avgResponseTime: number;
    errorRate: number;
    errors: number;
    memoryUsage: number;
    cpuLoad: number;
    uptime: number;
}
export declare enum SecurityEventType {
    LOGIN_FAILED = "LOGIN_FAILED",
    LOGIN_SUCCESS = "LOGIN_SUCCESS",
    LOGOUT = "LOGOUT",
    PASSWORD_CHANGE = "PASSWORD_CHANGE",
    PERMISSION_DENIED = "PERMISSION_DENIED",
    SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
    DATA_BREACH = "DATA_BREACH",
    SYSTEM_ERROR = "SYSTEM_ERROR",
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED"
}
export declare enum AuditEventType {
    USER_LOGIN = "USER_LOGIN",
    USER_LOGOUT = "USER_LOGOUT",
    USER_CREATE = "USER_CREATE",
    USER_UPDATE = "USER_UPDATE",
    USER_DELETE = "USER_DELETE",
    PASSWORD_CHANGE = "PASSWORD_CHANGE",
    PERMISSION_CHANGE = "PERMISSION_CHANGE",
    SYSTEM_ERROR = "SYSTEM_ERROR",
    DATA_ACCESS = "DATA_ACCESS",
    CONFIG_CHANGE = "CONFIG_CHANGE",
    BUSINESS_OPERATION = "BUSINESS_OPERATION",
    SECURITY_ALERT = "SECURITY_ALERT",
    LOGIN = "LOGIN"
}
export declare class MonitoringService {
    private readonly metricRepository;
    private readonly metricsService;
    private readonly logger;
    private metrics;
    constructor(metricRepository: Repository<Metric>, metricsService: MetricsService);
    observeDbQuery(operation: string, table: string, duration: number): void;
    recordCacheHit(key: string): void;
    recordCacheMiss(key: string): void;
    incrementCacheError(operation: string): void;
    incrementCacheSet(resource: string): void;
    incrementCacheDelete(resource: string): void;
    observeRedisDuration(operation: string, duration: number): void;
    incrementKafkaDlqMessages(topic: string, reason: string): void;
    getCurrentTraceId(): string;
    incrementActiveConnections(): void;
    decrementActiveConnections(): void;
    getAuditLogs(filter?: Record<string, unknown>): never[];
    getSecurityEvents(filter?: Record<string, unknown>): never[];
    getApplicationStatus(): {
        status: string;
        timestamp: Date;
        uptime: number;
        memory: NodeJS.MemoryUsage;
        version: string;
        platform: NodeJS.Platform;
    };
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    recordApiCall(method: string, path: string, statusCode: number, duration: number): void;
    getMetrics(): {
        avgResponseTime: number;
        errorRate: number;
        systemInfo: {
            platform: NodeJS.Platform;
            arch: NodeJS.Architecture;
            uptime: number;
            totalMemory: number;
            freeMemory: number;
            usedMemory: number;
            memoryUsage: number;
            cpuCount: number;
            loadAverage: number[];
            cpuLoad: number;
            nodeVersion: string;
        };
        detailedMetrics: {
            httpRequests: {
                total: number;
                errorRate: number;
                avgResponseTime: number;
            };
            database: {
                totalQueries: number;
                avgQueryTime: number;
            };
            cache: {
                hitRate: number;
            };
            connections: {
                active: number;
            };
            timestamp: string;
        };
        apiCalls: number;
        responseTimes: number[];
        errors: number;
        memoryUsage: number[];
        cpuUsage: number[];
        lastUpdated: Date;
    };
    private getSystemInfo;
    healthCheck(): Promise<{
        status: string;
        timestamp: string;
        uptime: number;
        metrics: {
            avgResponseTime: number;
            errorRate: number;
            systemInfo: {
                platform: NodeJS.Platform;
                arch: NodeJS.Architecture;
                uptime: number;
                totalMemory: number;
                freeMemory: number;
                usedMemory: number;
                memoryUsage: number;
                cpuCount: number;
                loadAverage: number[];
                cpuLoad: number;
                nodeVersion: string;
            };
            detailedMetrics: {
                httpRequests: {
                    total: number;
                    errorRate: number;
                    avgResponseTime: number;
                };
                database: {
                    totalQueries: number;
                    avgQueryTime: number;
                };
                cache: {
                    hitRate: number;
                };
                connections: {
                    active: number;
                };
                timestamp: string;
            };
            apiCalls: number;
            responseTimes: number[];
            errors: number;
            memoryUsage: number[];
            cpuUsage: number[];
            lastUpdated: Date;
        };
        system: {
            platform: NodeJS.Platform;
            arch: NodeJS.Architecture;
            uptime: number;
            totalMemory: number;
            freeMemory: number;
            usedMemory: number;
            memoryUsage: number;
            cpuCount: number;
            loadAverage: number[];
            cpuLoad: number;
            nodeVersion: string;
        };
        issues: string[] | undefined;
    }>;
    getMetricsHistory(period?: 'hour' | 'day' | 'week'): Promise<Metric[]>;
    generatePerformanceReport(): Promise<{
        status: string;
        period: string;
        message: string;
        generatedAt: string;
        daily?: undefined;
        weekly?: undefined;
        detailed?: undefined;
        recommendations?: undefined;
    } | {
        period: string;
        generatedAt: string;
        daily: {
            apiCalls: number;
            errors: number;
            errorRate: number;
            avgResponseTime: number;
            avgMemoryUsage: number;
            avgCpuLoad: number;
            dataPoints: number;
        } | null;
        weekly: {
            apiCalls: number;
            errors: number;
            errorRate: number;
            avgResponseTime: number;
            avgMemoryUsage: number;
            avgCpuLoad: number;
            dataPoints: number;
        } | null;
        detailed: {
            http: {
                requests: {
                    total: number;
                    byMethod: Record<string, number>;
                    byRoute: Record<string, number>;
                    byStatus: Record<string, number>;
                };
                durations: {
                    data: number[];
                    buckets: {
                        '0-100': number;
                        '100-500': number;
                        '500-1000': number;
                        '1000-2000': number;
                        '2000+': number;
                    };
                };
                errors: {
                    total: number;
                    byMethod: Record<string, number>;
                    byRoute: Record<string, number>;
                    byStatus: Record<string, number>;
                };
                derived: {
                    avgResponseTime: number;
                    errorRate: number;
                    avgQueryTime?: undefined;
                    hitRate?: undefined;
                };
                queries?: undefined;
                cache?: undefined;
                activeConnections?: undefined;
            } | {
                queries: {
                    total: number;
                    durations: number[];
                    byOperation: Record<string, number>;
                    byTable: Record<string, number>;
                };
                derived: {
                    avgQueryTime: number;
                    avgResponseTime?: undefined;
                    errorRate?: undefined;
                    hitRate?: undefined;
                };
                requests?: undefined;
                durations?: undefined;
                errors?: undefined;
                cache?: undefined;
                activeConnections?: undefined;
            } | {
                cache: {
                    hits: number;
                    misses: number;
                };
                derived: {
                    hitRate: number;
                    avgResponseTime?: undefined;
                    errorRate?: undefined;
                    avgQueryTime?: undefined;
                };
                requests?: undefined;
                durations?: undefined;
                errors?: undefined;
                queries?: undefined;
                activeConnections?: undefined;
            } | {
                activeConnections: number;
                requests?: undefined;
                durations?: undefined;
                errors?: undefined;
                derived?: undefined;
                queries?: undefined;
                cache?: undefined;
            } | {
                requests?: undefined;
                durations?: undefined;
                errors?: undefined;
                derived?: undefined;
                queries?: undefined;
                cache?: undefined;
                activeConnections?: undefined;
            };
            database: {
                requests: {
                    total: number;
                    byMethod: Record<string, number>;
                    byRoute: Record<string, number>;
                    byStatus: Record<string, number>;
                };
                durations: {
                    data: number[];
                    buckets: {
                        '0-100': number;
                        '100-500': number;
                        '500-1000': number;
                        '1000-2000': number;
                        '2000+': number;
                    };
                };
                errors: {
                    total: number;
                    byMethod: Record<string, number>;
                    byRoute: Record<string, number>;
                    byStatus: Record<string, number>;
                };
                derived: {
                    avgResponseTime: number;
                    errorRate: number;
                    avgQueryTime?: undefined;
                    hitRate?: undefined;
                };
                queries?: undefined;
                cache?: undefined;
                activeConnections?: undefined;
            } | {
                queries: {
                    total: number;
                    durations: number[];
                    byOperation: Record<string, number>;
                    byTable: Record<string, number>;
                };
                derived: {
                    avgQueryTime: number;
                    avgResponseTime?: undefined;
                    errorRate?: undefined;
                    hitRate?: undefined;
                };
                requests?: undefined;
                durations?: undefined;
                errors?: undefined;
                cache?: undefined;
                activeConnections?: undefined;
            } | {
                cache: {
                    hits: number;
                    misses: number;
                };
                derived: {
                    hitRate: number;
                    avgResponseTime?: undefined;
                    errorRate?: undefined;
                    avgQueryTime?: undefined;
                };
                requests?: undefined;
                durations?: undefined;
                errors?: undefined;
                queries?: undefined;
                activeConnections?: undefined;
            } | {
                activeConnections: number;
                requests?: undefined;
                durations?: undefined;
                errors?: undefined;
                derived?: undefined;
                queries?: undefined;
                cache?: undefined;
            } | {
                requests?: undefined;
                durations?: undefined;
                errors?: undefined;
                derived?: undefined;
                queries?: undefined;
                cache?: undefined;
                activeConnections?: undefined;
            };
            cache: {
                requests: {
                    total: number;
                    byMethod: Record<string, number>;
                    byRoute: Record<string, number>;
                    byStatus: Record<string, number>;
                };
                durations: {
                    data: number[];
                    buckets: {
                        '0-100': number;
                        '100-500': number;
                        '500-1000': number;
                        '1000-2000': number;
                        '2000+': number;
                    };
                };
                errors: {
                    total: number;
                    byMethod: Record<string, number>;
                    byRoute: Record<string, number>;
                    byStatus: Record<string, number>;
                };
                derived: {
                    avgResponseTime: number;
                    errorRate: number;
                    avgQueryTime?: undefined;
                    hitRate?: undefined;
                };
                queries?: undefined;
                cache?: undefined;
                activeConnections?: undefined;
            } | {
                queries: {
                    total: number;
                    durations: number[];
                    byOperation: Record<string, number>;
                    byTable: Record<string, number>;
                };
                derived: {
                    avgQueryTime: number;
                    avgResponseTime?: undefined;
                    errorRate?: undefined;
                    hitRate?: undefined;
                };
                requests?: undefined;
                durations?: undefined;
                errors?: undefined;
                cache?: undefined;
                activeConnections?: undefined;
            } | {
                cache: {
                    hits: number;
                    misses: number;
                };
                derived: {
                    hitRate: number;
                    avgResponseTime?: undefined;
                    errorRate?: undefined;
                    avgQueryTime?: undefined;
                };
                requests?: undefined;
                durations?: undefined;
                errors?: undefined;
                queries?: undefined;
                activeConnections?: undefined;
            } | {
                activeConnections: number;
                requests?: undefined;
                durations?: undefined;
                errors?: undefined;
                derived?: undefined;
                queries?: undefined;
                cache?: undefined;
            } | {
                requests?: undefined;
                durations?: undefined;
                errors?: undefined;
                derived?: undefined;
                queries?: undefined;
                cache?: undefined;
                activeConnections?: undefined;
            };
        };
        recommendations: {
            priority: string;
            category: string;
            message: string;
        }[];
        status?: undefined;
        message?: undefined;
    } | {
        status: string;
        message: string;
        period?: undefined;
        generatedAt?: undefined;
        daily?: undefined;
        weekly?: undefined;
        detailed?: undefined;
        recommendations?: undefined;
    }>;
    private calculateStats;
    private generateRecommendations;
}
