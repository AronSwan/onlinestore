"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const monitoring_service_1 = require("./monitoring.service");
const metrics_service_1 = require("./metrics.service");
const typeorm_1 = require("@nestjs/typeorm");
describe('MonitoringService', () => {
    let service;
    let metricsService;
    let metricRepository;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                monitoring_service_1.MonitoringService,
                {
                    provide: metrics_service_1.MetricsService,
                    useValue: {
                        recordHttpRequest: jest.fn(),
                        recordDatabaseQuery: jest.fn(),
                        recordCacheHit: jest.fn(),
                        recordCacheMiss: jest.fn(),
                        updateActiveConnections: jest.fn(),
                        getMetrics: jest.fn().mockReturnValue({
                            httpRequests: { total: 100, errorRate: 5 },
                            databaseQueries: { total: 50 },
                            cache: { hitRate: 80 },
                            activeConnections: 10,
                            timestamp: new Date().toISOString(),
                        }),
                        getMetricsSummary: jest.fn().mockReturnValue({
                            httpRequests: { total: 100, errorRate: 5 },
                            database: { totalQueries: 50 },
                            cache: { hitRate: 80 },
                            connections: { active: 10 },
                            timestamp: new Date().toISOString(),
                        }),
                        getMetricsByCategory: jest.fn().mockReturnValue({}),
                    },
                },
                {
                    provide: (0, typeorm_1.getRepositoryToken)(monitoring_service_1.Metric),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        createQueryBuilder: jest.fn().mockReturnValue({
                            where: jest.fn().mockReturnThis(),
                            delete: jest.fn().mockReturnThis(),
                            execute: jest.fn(),
                            orderBy: jest.fn().mockReturnThis(),
                            getMany: jest.fn().mockResolvedValue([]),
                        }),
                    },
                },
            ],
        }).compile();
        service = module.get(monitoring_service_1.MonitoringService);
        metricsService = module.get(metrics_service_1.MetricsService);
        metricRepository = module.get((0, typeorm_1.getRepositoryToken)(monitoring_service_1.Metric));
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    describe('recordApiCall', () => {
        it('should record API call metrics', () => {
            const method = 'GET';
            const path = '/api/test';
            const statusCode = 200;
            const duration = 150;
            service.recordApiCall(method, path, statusCode, duration);
            expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(method, path, statusCode, duration);
        });
        it('should log slow requests', () => {
            const loggerSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();
            const method = 'GET';
            const path = '/api/slow';
            const statusCode = 200;
            const duration = 2000;
            service.recordApiCall(method, path, statusCode, duration);
            expect(loggerSpy).toHaveBeenCalledWith(`Slow request detected: ${method} ${path} - ${duration}ms`);
        });
    });
    describe('getMetrics', () => {
        it('should return current metrics', () => {
            const metrics = service.getMetrics();
            expect(metrics).toBeDefined();
            expect(metrics).toHaveProperty('apiCalls');
            expect(metrics).toHaveProperty('avgResponseTime');
            expect(metrics).toHaveProperty('errorRate');
            expect(metrics).toHaveProperty('systemInfo');
            expect(metrics).toHaveProperty('detailedMetrics');
        });
        it('should calculate average response time correctly', () => {
            service['metrics'].responseTimes = [100, 200, 300];
            const metrics = service.getMetrics();
            expect(metrics.avgResponseTime).toBe(200);
        });
        it('should calculate error rate correctly', () => {
            service['metrics'].apiCalls = 100;
            service['metrics'].errors = 10;
            const metrics = service.getMetrics();
            expect(metrics.errorRate).toBe(10);
        });
    });
    describe('healthCheck', () => {
        it('should return healthy status when metrics are good', async () => {
            service['metrics'].apiCalls = 100;
            service['metrics'].responseTimes = [100, 150, 200];
            service['metrics'].errors = 2;
            jest.spyOn(service, 'getSystemInfo').mockReturnValue({
                memoryUsage: 50,
                cpuLoad: 30,
            });
            const health = await service.healthCheck();
            expect(health.status).toBe('ok');
            expect(health.issues).toBeUndefined();
        });
        it('should return degraded status when error rate is high', async () => {
            service['metrics'].apiCalls = 100;
            service['metrics'].responseTimes = [100, 150, 200];
            service['metrics'].errors = 10;
            jest.spyOn(service, 'getSystemInfo').mockReturnValue({
                memoryUsage: 50,
                cpuLoad: 30,
            });
            const health = await service.healthCheck();
            expect(health.status).toBe('degraded');
            expect(health.issues).toContain('High error rate: 10%');
        });
        it('should return critical status when memory usage is high', async () => {
            service['metrics'].apiCalls = 100;
            service['metrics'].responseTimes = [100, 150, 200];
            service['metrics'].errors = 2;
            jest.spyOn(service, 'getSystemInfo').mockReturnValue({
                memoryUsage: 95,
                cpuLoad: 30,
            });
            const health = await service.healthCheck();
            expect(health.status).toBe('critical');
            expect(health.issues).toContain('High memory usage: 95%');
        });
        it('should return critical status when CPU load is high', async () => {
            service['metrics'].apiCalls = 100;
            service['metrics'].responseTimes = [100, 150, 200];
            service['metrics'].errors = 2;
            jest.spyOn(service, 'getSystemInfo').mockReturnValue({
                memoryUsage: 50,
                cpuLoad: 90,
            });
            const health = await service.healthCheck();
            expect(health.status).toBe('critical');
            expect(health.issues).toContain('High CPU load: 90%');
        });
    });
    describe('observeDbQuery', () => {
        it('should record database query metrics', () => {
            const operation = 'SELECT';
            const table = 'users';
            const duration = 50;
            service.observeDbQuery(operation, table, duration);
            expect(metricsService.recordDatabaseQuery).toHaveBeenCalledWith(operation, table, duration);
        });
    });
    describe('recordCacheHit', () => {
        it('should record cache hit', () => {
            const key = 'test-key';
            service.recordCacheHit(key);
            expect(metricsService.recordCacheHit).toHaveBeenCalled();
        });
    });
    describe('recordCacheMiss', () => {
        it('should record cache miss', () => {
            const key = 'test-key';
            service.recordCacheMiss(key);
            expect(metricsService.recordCacheMiss).toHaveBeenCalled();
        });
    });
    describe('incrementActiveConnections', () => {
        it('should increment active connections', () => {
            service.incrementActiveConnections();
            expect(metricsService.updateActiveConnections).toHaveBeenCalled();
        });
    });
    describe('decrementActiveConnections', () => {
        it('should decrement active connections', () => {
            service.decrementActiveConnections();
            expect(metricsService.updateActiveConnections).toHaveBeenCalled();
        });
    });
    describe('generatePerformanceReport', () => {
        it('should generate performance report', async () => {
            const dailyMetrics = [
                {
                    apiCalls: 100,
                    errors: 5,
                    avgResponseTime: 120,
                    memoryUsage: 60,
                    cpuLoad: 30,
                    timestamp: new Date(),
                    errorRate: 5,
                    uptime: 3600,
                },
                {
                    apiCalls: 80,
                    errors: 4,
                    avgResponseTime: 150,
                    memoryUsage: 55,
                    cpuLoad: 35,
                    timestamp: new Date(),
                    errorRate: 5,
                    uptime: 3600,
                },
            ];
            const weeklyMetrics = [
                {
                    apiCalls: 700,
                    errors: 30,
                    avgResponseTime: 140,
                    memoryUsage: 58,
                    cpuLoad: 32,
                    timestamp: new Date(),
                    errorRate: 4.29,
                    uptime: 3600,
                },
                {
                    apiCalls: 650,
                    errors: 25,
                    avgResponseTime: 160,
                    memoryUsage: 62,
                    cpuLoad: 36,
                    timestamp: new Date(),
                    errorRate: 3.85,
                    uptime: 3600,
                },
            ];
            jest
                .spyOn(service, 'getMetricsHistory')
                .mockImplementation(async (period = 'day') => period === 'day' ? dailyMetrics : weeklyMetrics);
            const report = await service.generatePerformanceReport();
            expect(report).toBeDefined();
            expect(report).toHaveProperty('period');
            expect(report).toHaveProperty('generatedAt');
            expect(report).toHaveProperty('daily');
            expect(report).toHaveProperty('weekly');
            expect(report).toHaveProperty('detailed');
            expect(report).toHaveProperty('recommendations');
        });
        it('should return no_data status when no metrics are available', async () => {
            jest.spyOn(service, 'getMetricsHistory').mockResolvedValue([]);
            const report = await service.generatePerformanceReport();
            expect(report.status).toBe('no_data');
            expect(report.message).toBe('No metrics data available for the selected period');
        });
    });
    describe('getMetricsHistory', () => {
        it('should get metrics history for day period by default', async () => {
            const history = await service.getMetricsHistory();
            expect(metricRepository.createQueryBuilder).toHaveBeenCalled();
            expect(history).toBeDefined();
        });
        it('should get metrics history for hour period', async () => {
            const history = await service.getMetricsHistory('hour');
            expect(metricRepository.createQueryBuilder).toHaveBeenCalled();
            expect(history).toBeDefined();
        });
        it('should get metrics history for week period', async () => {
            const history = await service.getMetricsHistory('week');
            expect(metricRepository.createQueryBuilder).toHaveBeenCalled();
            expect(history).toBeDefined();
        });
    });
    describe('getApplicationStatus', () => {
        it('should return application status', () => {
            const status = service.getApplicationStatus();
            expect(status).toBeDefined();
            expect(status).toHaveProperty('status', 'running');
            expect(status).toHaveProperty('timestamp');
            expect(status).toHaveProperty('uptime');
            expect(status).toHaveProperty('memory');
            expect(status).toHaveProperty('version');
            expect(status).toHaveProperty('platform');
        });
    });
});
