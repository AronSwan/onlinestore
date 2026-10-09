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
exports.MonitoringController = void 0;
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/enums/role.enum");
const roles_guard_1 = require("../auth/guards/roles.guard");
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const monitoring_service_1 = require("./monitoring.service");
const metrics_service_1 = require("./metrics.service");
const swagger_1 = require("@nestjs/swagger");
let MonitoringController = class MonitoringController {
    constructor(monitoringService, metricsService) {
        this.monitoringService = monitoringService;
        this.metricsService = metricsService;
    }
    async healthCheck(res) {
        const health = await this.monitoringService.healthCheck();
        let statusCode = common_1.HttpStatus.OK;
        if (health.status === 'degraded') {
            statusCode = common_1.HttpStatus.OK;
        }
        else if (health.status === 'critical') {
            statusCode = common_1.HttpStatus.SERVICE_UNAVAILABLE;
        }
        res.status(statusCode).json(health);
    }
    getMetrics() {
        return this.monitoringService.getMetrics();
    }
    getMetricsSummary() {
        return this.metricsService.getMetricsSummary();
    }
    getMetricsByCategory(category) {
        return this.metricsService.getMetricsByCategory(category);
    }
    async getMetricsHistory(period = 'day') {
        return this.monitoringService.getMetricsHistory(period);
    }
    async generatePerformanceReport() {
        return this.monitoringService.generatePerformanceReport();
    }
    getApplicationStatus() {
        return this.monitoringService.getApplicationStatus();
    }
    getSystemInfo() {
        const metrics = this.monitoringService.getMetrics();
        return metrics.systemInfo;
    }
    getAuditLogs(filter) {
        return this.monitoringService.getAuditLogs(filter);
    }
    getSecurityEvents(filter) {
        return this.monitoringService.getSecurityEvents(filter);
    }
    getPrometheusMetrics(res) {
        const metrics = this.metricsService.getMetrics();
        let prometheusMetrics = '';
        prometheusMetrics += `# HELP http_requests_total Total number of HTTP requests\n`;
        prometheusMetrics += `# TYPE http_requests_total counter\n`;
        prometheusMetrics += `http_requests_total ${metrics.httpRequests.total}\n\n`;
        prometheusMetrics += `# HELP http_requests_errors_total Total number of HTTP errors\n`;
        prometheusMetrics += `# TYPE http_requests_errors_total counter\n`;
        prometheusMetrics += `http_requests_errors_total ${metrics.httpRequestErrors.total}\n\n`;
        prometheusMetrics += `# HELP http_request_duration_avg Average HTTP request duration in milliseconds\n`;
        prometheusMetrics += `# TYPE http_request_duration_avg gauge\n`;
        prometheusMetrics += `http_request_duration_avg ${metrics.derived.httpRequestDurationAvg}\n\n`;
        prometheusMetrics += `# HELP http_request_error_rate HTTP request error rate in percentage\n`;
        prometheusMetrics += `# TYPE http_request_error_rate gauge\n`;
        prometheusMetrics += `http_request_error_rate ${metrics.derived.errorRate}\n\n`;
        prometheusMetrics += `# HELP database_queries_total Total number of database queries\n`;
        prometheusMetrics += `# TYPE database_queries_total counter\n`;
        prometheusMetrics += `database_queries_total ${metrics.databaseQueries.total}\n\n`;
        prometheusMetrics += `# HELP database_query_duration_avg Average database query duration in milliseconds\n`;
        prometheusMetrics += `# TYPE database_query_duration_avg gauge\n`;
        prometheusMetrics += `database_query_duration_avg ${metrics.derived.databaseQueryDurationAvg}\n\n`;
        prometheusMetrics += `# HELP cache_hit_rate Cache hit rate in percentage\n`;
        prometheusMetrics += `# TYPE cache_hit_rate gauge\n`;
        prometheusMetrics += `cache_hit_rate ${metrics.derived.cacheHitRate}\n\n`;
        prometheusMetrics += `# HELP active_connections Number of active connections\n`;
        prometheusMetrics += `# TYPE active_connections gauge\n`;
        prometheusMetrics += `active_connections ${metrics.activeConnections}\n\n`;
        if (res && typeof res.send === 'function') {
            res.set?.('Content-Type', 'text/plain');
            res.send(prometheusMetrics);
            return;
        }
        return prometheusMetrics;
    }
};
exports.MonitoringController = MonitoringController;
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({ summary: '健康检查' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '健康状态' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "healthCheck", null);
__decorate([
    (0, common_1.Get)('metrics'),
    (0, swagger_1.ApiOperation)({ summary: '获取当前指标' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '当前指标数据' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MonitoringController.prototype, "getMetrics", null);
__decorate([
    (0, common_1.Get)('metrics/summary'),
    (0, swagger_1.ApiOperation)({ summary: '获取指标摘要' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '指标摘要数据' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MonitoringController.prototype, "getMetricsSummary", null);
__decorate([
    (0, common_1.Get)('metrics/category'),
    (0, swagger_1.ApiOperation)({ summary: '按类别获取指标' }),
    (0, swagger_1.ApiQuery)({
        name: 'category',
        enum: ['http', 'database', 'cache', 'connections'],
        required: true,
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '指定类别的指标数据' }),
    __param(0, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MonitoringController.prototype, "getMetricsByCategory", null);
__decorate([
    (0, common_1.Get)('metrics/history'),
    (0, swagger_1.ApiOperation)({ summary: '获取历史指标' }),
    (0, swagger_1.ApiQuery)({ name: 'period', enum: ['hour', 'day', 'week'], required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '历史指标数据' }),
    __param(0, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "getMetricsHistory", null);
__decorate([
    (0, common_1.Get)('performance/report'),
    (0, swagger_1.ApiOperation)({ summary: '生成性能报告' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '性能报告数据' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MonitoringController.prototype, "generatePerformanceReport", null);
__decorate([
    (0, common_1.Get)('application/status'),
    (0, swagger_1.ApiOperation)({ summary: '获取应用状态' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '应用状态数据' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MonitoringController.prototype, "getApplicationStatus", null);
__decorate([
    (0, common_1.Get)('system/info'),
    (0, swagger_1.ApiOperation)({ summary: '获取系统信息' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '系统信息数据' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MonitoringController.prototype, "getSystemInfo", null);
__decorate([
    (0, common_1.Get)('audit/logs'),
    (0, swagger_1.ApiOperation)({ summary: '获取审计日志' }),
    (0, swagger_1.ApiQuery)({ name: 'userId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'eventType', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '审计日志数据' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MonitoringController.prototype, "getAuditLogs", null);
__decorate([
    (0, common_1.Get)('security/events'),
    (0, swagger_1.ApiOperation)({ summary: '获取安全事件' }),
    (0, swagger_1.ApiQuery)({ name: 'eventType', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'severity', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, description: '安全事件数据' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MonitoringController.prototype, "getSecurityEvents", null);
__decorate([
    (0, common_1.Get)('prometheus'),
    (0, swagger_1.ApiOperation)({ summary: '获取Prometheus格式的指标' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Prometheus格式的指标数据' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MonitoringController.prototype, "getPrometheusMetrics", null);
exports.MonitoringController = MonitoringController = __decorate([
    (0, swagger_1.ApiTags)('monitoring'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, common_1.Controller)('monitoring'),
    __metadata("design:paramtypes", [monitoring_service_1.MonitoringService,
        metrics_service_1.MetricsService])
], MonitoringController);
