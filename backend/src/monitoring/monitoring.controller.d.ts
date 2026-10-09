import { Response } from 'express';
import { MonitoringService } from './monitoring.service';
import { MetricsService } from './metrics.service';
export declare class MonitoringController {
    private readonly monitoringService;
    private readonly metricsService;
    constructor(monitoringService: MonitoringService, metricsService: MetricsService);
    healthCheck(res: Response): Promise<void>;
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
    getMetricsSummary(): {
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
    getMetricsByCategory(category: 'http' | 'database' | 'cache' | 'connections'): {
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
    getMetricsHistory(period?: 'hour' | 'day' | 'week'): Promise<import("./monitoring.service").Metric[]>;
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
    getApplicationStatus(): {
        status: string;
        timestamp: Date;
        uptime: number;
        memory: NodeJS.MemoryUsage;
        version: string;
        platform: NodeJS.Platform;
    };
    getSystemInfo(): {
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
    getAuditLogs(filter: Record<string, unknown>): never[];
    getSecurityEvents(filter: Record<string, unknown>): never[];
    getPrometheusMetrics(res?: Response): string | undefined;
}
