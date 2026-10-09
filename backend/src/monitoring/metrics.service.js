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
var MetricsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsService = void 0;
const common_1 = require("@nestjs/common");
let MetricsService = MetricsService_1 = class MetricsService {
    constructor() {
        this.logger = new common_1.Logger(MetricsService_1.name);
        this.metrics = {
            httpRequests: {
                total: 0,
                byMethod: {},
                byRoute: {},
                byStatus: {},
            },
            httpRequestDurations: {
                data: [],
                buckets: {
                    '0-100': 0,
                    '100-500': 0,
                    '500-1000': 0,
                    '1000-2000': 0,
                    '2000+': 0,
                },
            },
            httpRequestErrors: {
                total: 0,
                byMethod: {},
                byRoute: {},
                byStatus: {},
            },
            activeConnections: 0,
            databaseQueries: {
                total: 0,
                durations: [],
                byOperation: {},
                byTable: {},
            },
            cache: {
                hits: 0,
                misses: 0,
            },
        };
        this.initializeMetrics();
    }
    initializeMetrics() {
        ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].forEach(method => {
            this.metrics.httpRequests.byMethod[method] = 0;
            this.metrics.httpRequestErrors.byMethod[method] = 0;
        });
        ['200', '201', '204', '400', '401', '403', '404', '500', '502', '503'].forEach(status => {
            this.metrics.httpRequests.byStatus[status] = 0;
            this.metrics.httpRequestErrors.byStatus[status] = 0;
        });
    }
    recordHttpRequest(method, route, statusCode, duration) {
        this.metrics.httpRequests.total++;
        this.metrics.httpRequests.byMethod[method] =
            (this.metrics.httpRequests.byMethod[method] || 0) + 1;
        this.metrics.httpRequests.byRoute[route] = (this.metrics.httpRequests.byRoute[route] || 0) + 1;
        const statusStr = statusCode.toString();
        this.metrics.httpRequests.byStatus[statusStr] =
            (this.metrics.httpRequests.byStatus[statusStr] || 0) + 1;
        this.metrics.httpRequestDurations.data.push(duration);
        if (this.metrics.httpRequestDurations.data.length > 1000) {
            this.metrics.httpRequestDurations.data = this.metrics.httpRequestDurations.data.slice(-1000);
        }
        if (duration < 100) {
            this.metrics.httpRequestDurations.buckets['0-100']++;
        }
        else if (duration < 500) {
            this.metrics.httpRequestDurations.buckets['100-500']++;
        }
        else if (duration < 1000) {
            this.metrics.httpRequestDurations.buckets['500-1000']++;
        }
        else if (duration < 2000) {
            this.metrics.httpRequestDurations.buckets['1000-2000']++;
        }
        else {
            this.metrics.httpRequestDurations.buckets['2000+']++;
        }
        if (statusCode >= 400) {
            this.metrics.httpRequestErrors.total++;
            this.metrics.httpRequestErrors.byMethod[method] =
                (this.metrics.httpRequestErrors.byMethod[method] || 0) + 1;
            this.metrics.httpRequestErrors.byRoute[route] =
                (this.metrics.httpRequestErrors.byRoute[route] || 0) + 1;
            this.metrics.httpRequestErrors.byStatus[statusStr] =
                (this.metrics.httpRequestErrors.byStatus[statusStr] || 0) + 1;
        }
    }
    updateActiveConnections(count) {
        this.metrics.activeConnections = count;
    }
    recordDatabaseQuery(operation, table, duration) {
        this.metrics.databaseQueries.total++;
        this.metrics.databaseQueries.byOperation[operation] =
            (this.metrics.databaseQueries.byOperation[operation] || 0) + 1;
        this.metrics.databaseQueries.byTable[table] =
            (this.metrics.databaseQueries.byTable[table] || 0) + 1;
        this.metrics.databaseQueries.durations.push(duration);
        if (this.metrics.databaseQueries.durations.length > 1000) {
            this.metrics.databaseQueries.durations = this.metrics.databaseQueries.durations.slice(-1000);
        }
    }
    recordCacheHit() {
        this.metrics.cache.hits++;
    }
    recordCacheMiss() {
        this.metrics.cache.misses++;
    }
    getMetrics() {
        const httpRequestDurationAvg = this.metrics.httpRequestDurations.data.length > 0
            ? this.metrics.httpRequestDurations.data.reduce((a, b) => a + b, 0) /
                this.metrics.httpRequestDurations.data.length
            : 0;
        const databaseQueryDurationAvg = this.metrics.databaseQueries.durations.length > 0
            ? this.metrics.databaseQueries.durations.reduce((a, b) => a + b, 0) /
                this.metrics.databaseQueries.durations.length
            : 0;
        const cacheHitRate = this.metrics.cache.hits + this.metrics.cache.misses > 0
            ? (this.metrics.cache.hits / (this.metrics.cache.hits + this.metrics.cache.misses)) * 100
            : 0;
        const errorRate = this.metrics.httpRequests.total > 0
            ? (this.metrics.httpRequestErrors.total / this.metrics.httpRequests.total) * 100
            : 0;
        return {
            ...this.metrics,
            derived: {
                httpRequestDurationAvg: Number(httpRequestDurationAvg.toFixed(2)),
                databaseQueryDurationAvg: Number(databaseQueryDurationAvg.toFixed(2)),
                cacheHitRate: Number(cacheHitRate.toFixed(2)),
                errorRate: Number(errorRate.toFixed(2)),
            },
            timestamp: new Date().toISOString(),
        };
    }
    getMetricsSummary() {
        const metrics = this.getMetrics();
        return {
            httpRequests: {
                total: metrics.httpRequests.total,
                errorRate: metrics.derived.errorRate,
                avgResponseTime: metrics.derived.httpRequestDurationAvg,
            },
            database: {
                totalQueries: metrics.databaseQueries.total,
                avgQueryTime: metrics.derived.databaseQueryDurationAvg,
            },
            cache: {
                hitRate: metrics.derived.cacheHitRate,
            },
            connections: {
                active: metrics.activeConnections,
            },
            timestamp: metrics.timestamp,
        };
    }
    getMetricsByCategory(category) {
        const metrics = this.getMetrics();
        switch (category) {
            case 'http':
                return {
                    requests: metrics.httpRequests,
                    durations: metrics.httpRequestDurations,
                    errors: metrics.httpRequestErrors,
                    derived: {
                        avgResponseTime: metrics.derived.httpRequestDurationAvg,
                        errorRate: metrics.derived.errorRate,
                    },
                };
            case 'database':
                return {
                    queries: metrics.databaseQueries,
                    derived: {
                        avgQueryTime: metrics.derived.databaseQueryDurationAvg,
                    },
                };
            case 'cache':
                return {
                    cache: metrics.cache,
                    derived: {
                        hitRate: metrics.derived.cacheHitRate,
                    },
                };
            case 'connections':
                return {
                    activeConnections: metrics.activeConnections,
                };
            default:
                return {};
        }
    }
};
exports.MetricsService = MetricsService;
exports.MetricsService = MetricsService = MetricsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MetricsService);
