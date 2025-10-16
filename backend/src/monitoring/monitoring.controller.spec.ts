import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { MetricsService } from './metrics.service';
import { HttpStatus } from '@nestjs/common';
import { Response } from 'express';

describe('MonitoringController', () => {
  let controller: MonitoringController;
  let monitoringService: MonitoringService;
  let metricsService: MetricsService;
  let mockResponse: jest.Mocked<Response>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitoringController],
      providers: [
        {
          provide: MonitoringService,
          useValue: {
            healthCheck: jest.fn(),
            getMetrics: jest.fn(),
            getMetricsHistory: jest.fn(),
            generatePerformanceReport: jest.fn(),
            getApplicationStatus: jest.fn(),
            logAuditLog: jest.fn(),
            getAuditLogs: jest.fn(),
            logSecurityEvent: jest.fn(),
            getSecurityEvents: jest.fn(),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            getMetricsSummary: jest.fn(),
            getMetricsByCategory: jest.fn(),
            getMetrics: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MonitoringController>(MonitoringController);
    monitoringService = module.get<MonitoringService>(MonitoringService);
    metricsService = module.get<MetricsService>(MetricsService);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as any;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('healthCheck', () => {
    it('should return health status with 200 when status is ok', async () => {
      const healthData = {
        status: 'ok',
        timestamp: new Date(),
        uptime: 3600,
        metrics: {
          avgResponseTime: 150,
          errorRate: 5,
          systemInfo: {
            platform: 'linux',
            arch: 'x64',
            uptime: 7200,
            totalMemory: 8000000000,
            freeMemory: 4000000000,
            usedMemory: 4000000000,
            memoryUsage: 50,
            cpuCount: 4,
            loadAverage: [1, 1.5, 2],
            cpuLoad: 50,
            nodeVersion: '18.0.0',
          },
          detailedMetrics: {},
          lastUpdated: new Date(),
        },
        system: {
          platform: 'linux',
          arch: 'x64',
          uptime: 7200,
          totalMemory: 8000000000,
          freeMemory: 4000000000,
          usedMemory: 4000000000,
          memoryUsage: 50,
          cpuCount: 4,
          loadAverage: [1, 1.5, 2],
          cpuLoad: 50,
          nodeVersion: '18.0.0',
        },
        issues: undefined,
      };

      jest.spyOn(monitoringService, 'healthCheck').mockResolvedValue(healthData as any);

      await controller.healthCheck(mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(healthData);
    });

    it('should return health status with 200 when status is degraded', async () => {
      const healthData = {
        status: 'degraded',
        timestamp: new Date(),
        uptime: 3600,
        metrics: {
          avgResponseTime: 150,
          errorRate: 5,
          systemInfo: {
            platform: 'linux',
            arch: 'x64',
            uptime: 7200,
            totalMemory: 8000000000,
            freeMemory: 4000000000,
            usedMemory: 4000000000,
            memoryUsage: 50,
            cpuCount: 4,
            loadAverage: [1, 1.5, 2],
            cpuLoad: 50,
            nodeVersion: '18.0.0',
          },
          detailedMetrics: {},
          lastUpdated: new Date(),
        },
        system: {
          platform: 'linux',
          arch: 'x64',
          uptime: 7200,
          totalMemory: 8000000000,
          freeMemory: 4000000000,
          usedMemory: 4000000000,
          memoryUsage: 50,
          cpuCount: 4,
          loadAverage: [1, 1.5, 2],
          cpuLoad: 50,
          nodeVersion: '18.0.0',
        },
        issues: ['High error rate'],
      };

      jest.spyOn(monitoringService, 'healthCheck').mockResolvedValue(healthData as any);

      await controller.healthCheck(mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(healthData);
    });

    it('should return health status with 503 when status is critical', async () => {
      const healthData = {
        status: 'critical',
        timestamp: new Date(),
        uptime: 3600,
        metrics: {
          avgResponseTime: 150,
          errorRate: 5,
          systemInfo: {
            platform: 'linux',
            arch: 'x64',
            uptime: 7200,
            totalMemory: 8000000000,
            freeMemory: 4000000000,
            usedMemory: 4000000000,
            memoryUsage: 50,
            cpuCount: 4,
            loadAverage: [1, 1.5, 2],
            cpuLoad: 50,
            nodeVersion: '18.0.0',
          },
          detailedMetrics: {},
          lastUpdated: new Date(),
        },
        system: {
          platform: 'linux',
          arch: 'x64',
          uptime: 7200,
          totalMemory: 8000000000,
          freeMemory: 4000000000,
          usedMemory: 4000000000,
          memoryUsage: 50,
          cpuCount: 4,
          loadAverage: [1, 1.5, 2],
          cpuLoad: 50,
          nodeVersion: '18.0.0',
        },
        issues: ['High memory usage'],
      };

      jest.spyOn(monitoringService, 'healthCheck').mockResolvedValue(healthData as any);

      await controller.healthCheck(mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(mockResponse.json).toHaveBeenCalledWith(healthData);
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      const metricsData = {
        avgResponseTime: 150,
        errorRate: 5,
        systemInfo: {
          platform: 'linux',
          arch: 'x64',
          uptime: 7200,
          totalMemory: 8000000000,
          freeMemory: 4000000000,
          usedMemory: 4000000000,
          memoryUsage: 50,
          cpuCount: 4,
          loadAverage: [1, 1.5, 2],
          cpuLoad: 50,
          nodeVersion: '18.0.0',
        },
        detailedMetrics: {},
        lastUpdated: new Date(),
        responseTimes: [100, 200, 300],
        errors: 5,
        memoryUsage: [50, 55, 60],
        cpuUsage: [30, 35, 40],
      };

      jest.spyOn(monitoringService, 'getMetrics').mockReturnValue(metricsData as any);

      const result = controller.getMetrics();

      expect(result).toEqual(metricsData);
      expect(monitoringService.getMetrics).toHaveBeenCalled();
    });
  });

  describe('getMetricsSummary', () => {
    it('should return metrics summary', () => {
      const summaryData = {
        httpRequests: { total: 100, errorRate: 5, avgResponseTime: 150 },
        database: { totalQueries: 50, avgQueryTime: 45 },
        cache: { hitRate: 80 },
        connections: { active: 10 },
        timestamp: new Date().toISOString(),
      };

      jest.spyOn(metricsService, 'getMetricsSummary').mockReturnValue(summaryData as any);

      const result = controller.getMetricsSummary();

      expect(result).toEqual(summaryData);
      expect(metricsService.getMetricsSummary).toHaveBeenCalled();
    });
  });

  describe('getMetricsByCategory', () => {
    it('should return metrics for http category', () => {
      const categoryData = {
        requests: { total: 100, byMethod: {}, byRoute: {}, byStatus: {} },
        durations: {
          data: [100, 200],
          buckets: { '0-100': 0, '100-500': 0, '500-1000': 0, '1000-2000': 0, '2000+': 0 },
        },
        errors: { total: 5, byMethod: {}, byRoute: {}, byStatus: {} },
        derived: { avgResponseTime: 150, errorRate: 5 },
      };

      jest.spyOn(metricsService, 'getMetricsByCategory').mockReturnValue(categoryData as any);

      const result = controller.getMetricsByCategory('http');

      expect(result).toEqual(categoryData);
      expect(metricsService.getMetricsByCategory).toHaveBeenCalledWith('http');
    });

    it('should return metrics for database category', () => {
      const categoryData = {
        queries: { total: 50, durations: [], byOperation: {}, byTable: {} },
        derived: { avgQueryTime: 45 },
      };

      jest.spyOn(metricsService, 'getMetricsByCategory').mockReturnValue(categoryData as any);

      const result = controller.getMetricsByCategory('database');

      expect(result).toEqual(categoryData);
      expect(metricsService.getMetricsByCategory).toHaveBeenCalledWith('database');
    });

    it('should return metrics for cache category', () => {
      const categoryData = {
        cache: { hits: 80, misses: 20 },
        derived: { hitRate: 80 },
      };

      jest.spyOn(metricsService, 'getMetricsByCategory').mockReturnValue(categoryData as any);

      const result = controller.getMetricsByCategory('cache');

      expect(result).toEqual(categoryData);
      expect(metricsService.getMetricsByCategory).toHaveBeenCalledWith('cache');
    });

    it('should return metrics for connections category', () => {
      const categoryData = {
        activeConnections: 10,
      };

      jest.spyOn(metricsService, 'getMetricsByCategory').mockReturnValue(categoryData as any);

      const result = controller.getMetricsByCategory('connections');

      expect(result).toEqual(categoryData);
      expect(metricsService.getMetricsByCategory).toHaveBeenCalledWith('connections');
    });
  });

  describe('getMetricsHistory', () => {
    it('should return metrics history for day period by default', async () => {
      const historyData = [
        {
          id: 1,
          timestamp: new Date(),
          apiCalls: 100,
          avgResponseTime: 150,
          errorRate: 5,
          errors: 5,
          memoryUsage: 50,
          cpuLoad: 30,
          uptime: 3600,
        },
        {
          id: 2,
          timestamp: new Date(),
          apiCalls: 120,
          avgResponseTime: 160,
          errorRate: 5,
          errors: 6,
          memoryUsage: 55,
          cpuLoad: 35,
          uptime: 3600,
        },
      ];

      jest.spyOn(monitoringService, 'getMetricsHistory').mockResolvedValue(historyData as any);

      const result = await controller.getMetricsHistory();

      expect(result).toEqual(historyData);
      expect(monitoringService.getMetricsHistory).toHaveBeenCalledWith('day');
    });

    it('should return metrics history for hour period', async () => {
      const historyData = [
        {
          id: 1,
          timestamp: new Date(),
          apiCalls: 10,
          avgResponseTime: 120,
          errorRate: 5,
          errors: 0,
          memoryUsage: 50,
          cpuLoad: 30,
          uptime: 3600,
        },
        {
          id: 2,
          timestamp: new Date(),
          apiCalls: 15,
          avgResponseTime: 130,
          errorRate: 5,
          errors: 0,
          memoryUsage: 55,
          cpuLoad: 35,
          uptime: 3600,
        },
      ];

      jest.spyOn(monitoringService, 'getMetricsHistory').mockResolvedValue(historyData as any);

      const result = await controller.getMetricsHistory('hour');

      expect(result).toEqual(historyData);
      expect(monitoringService.getMetricsHistory).toHaveBeenCalledWith('hour');
    });

    it('should return metrics history for week period', async () => {
      const historyData = [
        {
          id: 1,
          timestamp: new Date(),
          apiCalls: 1000,
          avgResponseTime: 140,
          errorRate: 5,
          errors: 50,
          memoryUsage: 50,
          cpuLoad: 30,
          uptime: 3600,
        },
        {
          id: 2,
          timestamp: new Date(),
          apiCalls: 1200,
          avgResponseTime: 150,
          errorRate: 5,
          errors: 60,
          memoryUsage: 55,
          cpuLoad: 35,
          uptime: 3600,
        },
      ];

      jest.spyOn(monitoringService, 'getMetricsHistory').mockResolvedValue(historyData as any);

      const result = await controller.getMetricsHistory('week');

      expect(result).toEqual(historyData);
      expect(monitoringService.getMetricsHistory).toHaveBeenCalledWith('week');
    });
  });

  describe('generatePerformanceReport', () => {
    it('should generate performance report', async () => {
      const reportData = {
        period: 'daily',
        generatedAt: new Date().toISOString(),
        daily: {
          apiCalls: 1000,
          errors: 50,
          errorRate: 5,
          avgResponseTime: 150,
          avgMemoryUsage: 50,
          avgCpuLoad: 30,
          dataPoints: 24,
        },
        weekly: {
          apiCalls: 7000,
          errors: 350,
          errorRate: 5,
          avgResponseTime: 150,
          avgMemoryUsage: 50,
          avgCpuLoad: 30,
          dataPoints: 168,
        },
        detailed: {},
        recommendations: [],
      };

      jest
        .spyOn(monitoringService, 'generatePerformanceReport')
        .mockResolvedValue(reportData as any);

      const result = await controller.generatePerformanceReport();

      expect(result).toEqual(reportData);
      expect(monitoringService.generatePerformanceReport).toHaveBeenCalled();
    });
  });

  describe('getApplicationStatus', () => {
    it('should return application status', () => {
      const statusData = {
        status: 'running',
        timestamp: new Date(),
        uptime: 3600,
        memory: {
          rss: 100000000,
          heapTotal: 50000000,
          heapUsed: 40000000,
          external: 10000000,
          arrayBuffers: 5000000,
        },
        version: '1.0.0',
        platform: 'linux',
      };

      jest.spyOn(monitoringService, 'getApplicationStatus').mockReturnValue(statusData as any);

      const result = controller.getApplicationStatus();

      expect(result).toEqual(statusData);
      expect(monitoringService.getApplicationStatus).toHaveBeenCalled();
    });
  });

  describe('getSystemInfo', () => {
    it('should return system info', () => {
      const metricsData = {
        avgResponseTime: 150,
        errorRate: 5,
        systemInfo: {
          platform: 'linux',
          arch: 'x64',
          uptime: 7200,
          totalMemory: 8000000000,
          freeMemory: 4000000000,
          usedMemory: 4000000000,
          memoryUsage: 50,
          cpuCount: 4,
          loadAverage: [1, 1.5, 2],
          cpuLoad: 50,
          nodeVersion: '18.0.0',
        },
        detailedMetrics: {},
        lastUpdated: new Date(),
        responseTimes: [100, 200, 300],
        errors: 5,
        memoryUsage: [50, 55, 60],
        cpuUsage: [30, 35, 40],
      };

      jest.spyOn(monitoringService, 'getMetrics').mockReturnValue(metricsData as any);

      const result = controller.getSystemInfo();

      expect(result).toEqual(metricsData.systemInfo);
      expect(monitoringService.getMetrics).toHaveBeenCalled();
    });
  });

  describe('getAuditLogs', () => {
    it('should return audit logs', () => {
      const filter = { userId: 'user-123' };

      jest.spyOn(monitoringService, 'getAuditLogs').mockReturnValue([] as any);

      const result = controller.getAuditLogs(filter);

      expect(result).toEqual([]);
      expect(monitoringService.getAuditLogs).toHaveBeenCalledWith(filter);
    });
  });

  describe('getSecurityEvents', () => {
    it('should return security events', () => {
      const filter = { severity: 'high' };

      jest.spyOn(monitoringService, 'getSecurityEvents').mockReturnValue([] as any);

      const result = controller.getSecurityEvents(filter);

      expect(result).toEqual([]);
      expect(monitoringService.getSecurityEvents).toHaveBeenCalledWith(filter);
    });
  });

  describe('getPrometheusMetrics', () => {
    it('should return Prometheus format metrics', () => {
      const metricsData = {
        httpRequests: { total: 100, byMethod: {}, byRoute: {}, byStatus: {} },
        httpRequestErrors: { total: 5, byMethod: {}, byRoute: {}, byStatus: {} },
        httpRequestDurations: {
          data: [100, 200, 300],
          buckets: { '0-100': 0, '100-500': 0, '500-1000': 0, '1000-2000': 0, '2000+': 0 },
        },
        databaseQueries: { total: 50, durations: [], byOperation: {}, byTable: {} },
        cache: { hits: 80, misses: 20 },
        activeConnections: 10,
        derived: {
          httpRequestDurationAvg: 200,
          httpRequestErrorRate: 5,
          databaseQueryDurationAvg: 50,
          cacheHitRate: 80,
        },
        timestamp: new Date().toISOString(),
      };

      jest.spyOn(metricsService, 'getMetrics').mockReturnValue(metricsData as any);

      controller.getPrometheusMetrics(mockResponse);

      expect(mockResponse.set).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(mockResponse.send).toHaveBeenCalled();

      const sentData = mockResponse.send.mock.calls[0][0];
      expect(sentData).toContain('# HELP http_requests_total');
      expect(sentData).toContain('# TYPE http_requests_total counter');
      expect(sentData).toContain('http_requests_total 100');
      expect(sentData).toContain('# HELP http_request_duration_avg');
      expect(sentData).toContain('# TYPE http_request_duration_avg gauge');
      expect(sentData).toContain('http_request_duration_avg 200');
    });
  });
});
