"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MonitoringService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringService = exports.AuditEventType = exports.SecurityEventType = exports.Metric = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const schedule_1 = require("@nestjs/schedule");
const os = __importStar(require("os"));
const metrics_service_1 = require("./metrics.service");
const typeorm_3 = require("typeorm");
let Metric = class Metric {
};
exports.Metric = Metric;
__decorate([
    (0, typeorm_3.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Metric.prototype, "id", void 0);
__decorate([
    (0, typeorm_3.CreateDateColumn)(),
    __metadata("design:type", Date)
], Metric.prototype, "timestamp", void 0);
__decorate([
    (0, typeorm_3.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Metric.prototype, "apiCalls", void 0);
__decorate([
    (0, typeorm_3.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Metric.prototype, "avgResponseTime", void 0);
__decorate([
    (0, typeorm_3.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Metric.prototype, "errorRate", void 0);
__decorate([
    (0, typeorm_3.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Metric.prototype, "errors", void 0);
__decorate([
    (0, typeorm_3.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Metric.prototype, "memoryUsage", void 0);
__decorate([
    (0, typeorm_3.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Metric.prototype, "cpuLoad", void 0);
__decorate([
    (0, typeorm_3.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Metric.prototype, "uptime", void 0);
exports.Metric = Metric = __decorate([
    (0, typeorm_3.Entity)('metrics')
], Metric);
var SecurityEventType;
(function (SecurityEventType) {
    SecurityEventType["LOGIN_FAILED"] = "LOGIN_FAILED";
    SecurityEventType["LOGIN_SUCCESS"] = "LOGIN_SUCCESS";
    SecurityEventType["LOGOUT"] = "LOGOUT";
    SecurityEventType["PASSWORD_CHANGE"] = "PASSWORD_CHANGE";
    SecurityEventType["PERMISSION_DENIED"] = "PERMISSION_DENIED";
    SecurityEventType["SUSPICIOUS_ACTIVITY"] = "SUSPICIOUS_ACTIVITY";
    SecurityEventType["DATA_BREACH"] = "DATA_BREACH";
    SecurityEventType["SYSTEM_ERROR"] = "SYSTEM_ERROR";
    SecurityEventType["AUTHENTICATION_FAILED"] = "AUTHENTICATION_FAILED";
})(SecurityEventType || (exports.SecurityEventType = SecurityEventType = {}));
var AuditEventType;
(function (AuditEventType) {
    AuditEventType["USER_LOGIN"] = "USER_LOGIN";
    AuditEventType["USER_LOGOUT"] = "USER_LOGOUT";
    AuditEventType["USER_CREATE"] = "USER_CREATE";
    AuditEventType["USER_UPDATE"] = "USER_UPDATE";
    AuditEventType["USER_DELETE"] = "USER_DELETE";
    AuditEventType["PASSWORD_CHANGE"] = "PASSWORD_CHANGE";
    AuditEventType["PERMISSION_CHANGE"] = "PERMISSION_CHANGE";
    AuditEventType["SYSTEM_ERROR"] = "SYSTEM_ERROR";
    AuditEventType["DATA_ACCESS"] = "DATA_ACCESS";
    AuditEventType["CONFIG_CHANGE"] = "CONFIG_CHANGE";
    AuditEventType["BUSINESS_OPERATION"] = "BUSINESS_OPERATION";
    AuditEventType["SECURITY_ALERT"] = "SECURITY_ALERT";
    AuditEventType["LOGIN"] = "LOGIN";
})(AuditEventType || (exports.AuditEventType = AuditEventType = {}));
let MonitoringService = MonitoringService_1 = class MonitoringService {
    constructor(metricRepository, metricsService) {
        this.metricRepository = metricRepository;
        this.metricsService = metricsService;
        this.logger = new common_1.Logger(MonitoringService_1.name);
        this.metrics = {
            apiCalls: 0,
            responseTimes: [],
            errors: 0,
            memoryUsage: [],
            cpuUsage: [],
            lastUpdated: new Date(),
        };
    }
    observeDbQuery(operation, table, duration) {
        this.metricsService.recordDatabaseQuery(operation, table, duration);
    }
    recordCacheHit(key) {
        this.metricsService.recordCacheHit();
    }
    recordCacheMiss(key) {
        this.metricsService.recordCacheMiss();
    }
    incrementCacheError(operation) {
        this.logger.warn(`Cache error during ${operation}`);
    }
    incrementCacheSet(resource) {
        this.logger.debug(`Cache set for ${resource}`);
    }
    incrementCacheDelete(resource) {
        this.logger.debug(`Cache delete for ${resource}`);
    }
    observeRedisDuration(operation, duration) {
        this.logger.debug(`Redis ${operation} took ${duration}ms`);
    }
    incrementKafkaDlqMessages(topic, reason) {
        this.logger.warn(`Kafka DLQ message for topic ${topic}: ${reason}`);
    }
    getCurrentTraceId() {
        return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    incrementActiveConnections() {
        const current = this.metricsService?.metrics?.activeConnections ?? 0;
        this.metricsService.updateActiveConnections(current + 1);
    }
    decrementActiveConnections() {
        const current = this.metricsService?.metrics?.activeConnections ?? 0;
        this.metricsService.updateActiveConnections(Math.max(0, current - 1));
    }
    getAuditLogs(filter) {
        this.logger.debug(`Getting audit logs with filter: ${JSON.stringify(filter)}`);
        return [];
    }
    getSecurityEvents(filter) {
        this.logger.debug(`Getting security events with filter: ${JSON.stringify(filter)}`);
        return [];
    }
    getApplicationStatus() {
        return {
            status: 'running',
            timestamp: new Date(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.version,
            platform: process.platform,
        };
    }
    async onModuleInit() {
        this.logger.log('MonitoringService initialized');
    }
    async onModuleDestroy() {
        this.logger.log('MonitoringService destroyed');
    }
    recordApiCall(method, path, statusCode, duration) {
        this.metrics.apiCalls++;
        this.metrics.responseTimes.push(duration);
        if (this.metrics.responseTimes.length > 100) {
            this.metrics.responseTimes = this.metrics.responseTimes.slice(-100);
        }
        if (statusCode >= 400) {
            this.metrics.errors++;
        }
        this.metrics.lastUpdated = new Date();
        if (duration > 1000) {
            this.logger.warn(`Slow request detected: ${method} ${path} - ${duration}ms`);
        }
        this.metricsService.recordHttpRequest(method, path, statusCode, duration);
    }
    getMetrics() {
        const avgResponseTime = this.metrics.responseTimes.length > 0
            ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
            : 0;
        const errorRate = this.metrics.apiCalls > 0 ? (this.metrics.errors / this.metrics.apiCalls) * 100 : 0;
        return {
            ...this.metrics,
            avgResponseTime: Number(avgResponseTime.toFixed(2)),
            errorRate: Number(errorRate.toFixed(2)),
            systemInfo: this.getSystemInfo(),
            detailedMetrics: this.metricsService.getMetricsSummary(),
        };
    }
    getSystemInfo() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memUsage = (usedMem / totalMem) * 100;
        this.metrics.memoryUsage.push(memUsage);
        if (this.metrics.memoryUsage.length > 100) {
            this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
        }
        const cpus = os.cpus();
        const loadAvg = os.loadavg();
        const cpuLoad = (loadAvg[0] / cpus.length) * 100;
        this.metrics.cpuUsage.push(cpuLoad);
        if (this.metrics.cpuUsage.length > 100) {
            this.metrics.cpuUsage = this.metrics.cpuUsage.slice(-100);
        }
        return {
            platform: os.platform(),
            arch: os.arch(),
            uptime: os.uptime(),
            totalMemory: totalMem,
            freeMemory: freeMem,
            usedMemory: usedMem,
            memoryUsage: Number(memUsage.toFixed(2)),
            cpuCount: cpus.length,
            loadAverage: loadAvg.map(avg => Number(avg.toFixed(2))),
            cpuLoad: Number(cpuLoad.toFixed(2)),
            nodeVersion: process.version,
        };
    }
    async healthCheck() {
        const systemInfo = this.getSystemInfo();
        const metrics = this.getMetrics();
        let status = 'ok';
        const issues = [];
        if (metrics.errorRate > 5) {
            status = 'degraded';
            issues.push(`High error rate: ${metrics.errorRate}%`);
        }
        if (metrics.avgResponseTime > 500) {
            status = 'degraded';
            issues.push(`Slow response time: ${metrics.avgResponseTime}ms`);
        }
        if (systemInfo.memoryUsage > 90) {
            status = 'critical';
            issues.push(`High memory usage: ${systemInfo.memoryUsage}%`);
        }
        if (systemInfo.cpuLoad > 80) {
            status = 'critical';
            issues.push(`High CPU load: ${systemInfo.cpuLoad}%`);
        }
        return {
            status,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            metrics,
            system: systemInfo,
            issues: issues.length > 0 ? issues : undefined,
        };
    }
    async getMetricsHistory(period = 'day') {
        try {
            const now = new Date();
            let startDate;
            switch (period) {
                case 'hour':
                    startDate = new Date(now.getTime() - 60 * 60 * 1000);
                    break;
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'day':
                default:
                    startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
            }
            return this.metricRepository
                .createQueryBuilder('metric')
                .where('metric.timestamp >= :startDate', { startDate })
                .orderBy('metric.timestamp', 'ASC')
                .getMany();
        }
        catch (error) {
            this.logger.error('Failed to get metrics history', error);
            return [];
        }
    }
    async generatePerformanceReport() {
        try {
            const dailyMetrics = await this.getMetricsHistory('day');
            const weeklyMetrics = await this.getMetricsHistory('week');
            if (dailyMetrics.length === 0) {
                return {
                    status: 'no_data',
                    period: 'daily',
                    message: 'No metrics data available for the selected period',
                    generatedAt: new Date().toISOString(),
                };
            }
            const dailyStats = this.calculateStats(dailyMetrics);
            const weeklyStats = this.calculateStats(weeklyMetrics);
            const detailedMetrics = this.metricsService.getMetrics();
            return {
                period: 'daily',
                generatedAt: new Date().toISOString(),
                daily: dailyStats,
                weekly: weeklyStats,
                detailed: {
                    http: this.metricsService.getMetricsByCategory('http'),
                    database: this.metricsService.getMetricsByCategory('database'),
                    cache: this.metricsService.getMetricsByCategory('cache'),
                },
                recommendations: this.generateRecommendations(dailyStats ?? { errorRate: 0, avgResponseTime: 0, avgMemoryUsage: 0, avgCpuLoad: 0 }, detailedMetrics),
            };
        }
        catch (error) {
            this.logger.error('Failed to generate performance report', error);
            return {
                status: 'error',
                message: 'Failed to generate performance report',
            };
        }
    }
    calculateStats(metrics) {
        if (metrics.length === 0) {
            return null;
        }
        const apiCalls = metrics.reduce((sum, m) => sum + m.apiCalls, 0);
        const errors = metrics.reduce((sum, m) => sum + m.errors, 0);
        const errorRate = apiCalls > 0 ? (errors / apiCalls) * 100 : 0;
        const responseTimes = metrics.map(m => m.avgResponseTime).filter(t => t > 0);
        const avgResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;
        const memoryUsages = metrics.map(m => m.memoryUsage);
        const avgMemoryUsage = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
        const cpuLoads = metrics.map(m => m.cpuLoad);
        const avgCpuLoad = cpuLoads.reduce((a, b) => a + b, 0) / cpuLoads.length;
        return {
            apiCalls,
            errors,
            errorRate: Number(errorRate.toFixed(2)),
            avgResponseTime: Number(avgResponseTime.toFixed(2)),
            avgMemoryUsage: Number(avgMemoryUsage.toFixed(2)),
            avgCpuLoad: Number(avgCpuLoad.toFixed(2)),
            dataPoints: metrics.length,
        };
    }
    generateRecommendations(stats, detailedMetrics) {
        const recommendations = [];
        if (stats.errorRate > 5) {
            recommendations.push({
                priority: 'high',
                category: 'error_rate',
                message: `High error rate detected (${stats.errorRate}%). Investigate error logs and fix underlying issues.`,
            });
        }
        if (stats.avgResponseTime > 500) {
            recommendations.push({
                priority: 'medium',
                category: 'response_time',
                message: `Slow response time detected (${stats.avgResponseTime}ms). Consider optimizing database queries or implementing caching.`,
            });
        }
        if (stats.avgMemoryUsage > 80) {
            recommendations.push({
                priority: 'high',
                category: 'memory',
                message: `High memory usage detected (${stats.avgMemoryUsage}%). Check for memory leaks or consider scaling up resources.`,
            });
        }
        if (stats.avgCpuLoad > 2) {
            recommendations.push({
                priority: 'medium',
                category: 'cpu',
                message: `High CPU load detected (${stats.avgCpuLoad}). Consider optimizing CPU-intensive operations or scaling horizontally.`,
            });
        }
        if (detailedMetrics.derived && (detailedMetrics.derived.errorRate ?? 0) > 5) {
            recommendations.push({
                priority: 'high',
                category: 'http_errors',
                message: `HTTP error rate is high (${detailedMetrics.derived.errorRate}%). Review error logs and fix failing endpoints.`,
            });
        }
        if (detailedMetrics.derived && (detailedMetrics.derived.httpRequestDurationAvg ?? 0) > 500) {
            recommendations.push({
                priority: 'medium',
                category: 'http_performance',
                message: `Average HTTP response time is slow (${detailedMetrics.derived.httpRequestDurationAvg}ms). Consider optimizing API endpoints.`,
            });
        }
        if (detailedMetrics.derived && (detailedMetrics.derived.databaseQueryDurationAvg ?? 0) > 100) {
            recommendations.push({
                priority: 'medium',
                category: 'database_performance',
                message: `Database queries are slow (${detailedMetrics.derived.databaseQueryDurationAvg}ms). Consider optimizing queries or adding indexes.`,
            });
        }
        if (detailedMetrics.derived && (detailedMetrics.derived.cacheHitRate ?? 100) < 80) {
            recommendations.push({
                priority: 'low',
                category: 'cache_efficiency',
                message: `Cache hit rate is low (${detailedMetrics.derived.cacheHitRate}%). Consider adjusting cache strategy or TTL values.`,
            });
        }
        return recommendations;
    }
};
exports.MonitoringService = MonitoringService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MonitoringService.prototype, "getMetricsHistory", null);
exports.MonitoringService = MonitoringService = MonitoringService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(Metric)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        metrics_service_1.MetricsService])
], MonitoringService);
