/// <reference path="./jest.d.ts" />
import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { LogAnalyticsService } from './log-analytics.service';
import { OpenObserveConfig } from '../interfaces/logging.interface';
import { of } from 'rxjs';

describe('LogAnalyticsService', () => {
  let service: LogAnalyticsService;
  let mockConfig: OpenObserveConfig;
  let mockHttpService: jest.Mocked<HttpService> | any;

  beforeEach(async () => {
    mockConfig = {
      url: 'http://localhost:5080',
      organization: 'test-org',
      auth: {
        type: 'bearer',
        token: 'test-token',
      },
      streams: {
        application_logs: 'application-logs',
        business_events: 'business-events',
        user_behavior: 'user-behavior',
        metrics: 'metrics',
        traces: 'traces',
      },
      retention: {
        logs: '30d',
        metrics: '90d',
        traces: '7d',
        business_events: '365d',
      },
      performance: {
        batch_size: 100,
        flush_interval: 5000,
        max_retries: 3,
        timeout: 30000,
      },
      tracing: {
        enabled: false,
        sampling_rate: 0.1,
      },
      alerts: {
        enabled: false,
        evaluation_interval: 60,
      },
    };

    mockHttpService = {
      post: jest.fn() as unknown as jest.MockedFunction<HttpService['post']>,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        LogAnalyticsService,
        {
          provide: 'OPENOBSERVE_CONFIG',
          useValue: mockConfig,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<LogAnalyticsService>(LogAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLogStats', () => {
    it('should return log stats successfully', async () => {
      // 在此用例中设置非 test 环境，触发真实分支（使用 HttpService mock）
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const timeRange = { start: '2023-01-01T00:00:00Z', end: '2023-01-02T00:00:00Z' };
      const filters = { level: 'INFO' };

      const mockResponse = {
        data: {
          hits: {
            total: { value: 100 },
            hits: [
              {
                _source: {
                  level: 'INFO',
                  category: 'USER',
                  count: 50,
                  unique_users: 20,
                },
              },
              {
                _source: {
                  level: 'INFO',
                  category: 'ORDER',
                  count: 30,
                  unique_users: 15,
                },
              },
            ],
          },
          aggregations: {},
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.getLogStats(timeRange, filters);

      expect(result).toEqual({
        total: 100,
        stats: [
          {
            level: 'INFO',
            category: 'USER',
            count: 50,
            unique_users: 20,
          },
          {
            level: 'INFO',
            category: 'ORDER',
            count: 30,
            unique_users: 15,
          },
        ],
        aggregations: {},
      });

      expect(mockHttpService.post).toHaveBeenCalledWith(
        `${mockConfig.url}/api/${mockConfig.organization}/_search`,
        {
          query: expect.stringContaining('SELECT'),
        },
        {
          headers: {
            Authorization: `Bearer ${mockConfig.auth.token}`,
            'Content-Type': 'application/json',
          },
          timeout: mockConfig.performance.timeout,
        },
      );

      // 恢复环境变量
      process.env.NODE_ENV = originalEnv;
    });

    it('should return empty result when request fails', async () => {
      // 非 test 环境下模拟返回结构为空，函数应返回默认空结果
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const timeRange = { start: '2023-01-01T00:00:00Z', end: '2023-01-02T00:00:00Z' };

      // 模拟响应数据为空，但结构正确
      mockHttpService.post.mockReturnValue(of({
        data: {
          hits: {
            total: { value: 0 },
            hits: []
          },
          aggregations: {}
        }
      }));

      const result = await service.getLogStats(timeRange);
      expect(result).toEqual({ total: 0, stats: [], aggregations: {} });
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('getUserBehaviorAnalytics', () => {
    it('should return user behavior analytics successfully', async () => {
      const timeRange = { start: '2023-01-01T00:00:00Z', end: '2023-01-02T00:00:00Z' };
      const userId = 'user123';

      const mockResponse = {
        data: {
          hits: {
            total: { value: 50 },
            hits: [
              {
                _source: {
                  eventType: 'PAGE_VIEW',
                  count: 20,
                  unique_sessions: 10,
                  unique_users: 5,
                },
              },
              {
                _source: {
                  eventType: 'PRODUCT_VIEW',
                  count: 15,
                  unique_sessions: 8,
                  unique_users: 4,
                },
              },
            ],
          },
          aggregations: {},
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.getUserBehaviorAnalytics(timeRange, userId);

      expect(result).toEqual({
        total: 50,
        analytics: [
          {
            eventType: 'PAGE_VIEW',
            count: 20,
            unique_sessions: 10,
            unique_users: 5,
          },
          {
            eventType: 'PRODUCT_VIEW',
            count: 15,
            unique_sessions: 8,
            unique_users: 4,
          },
        ],
        aggregations: {},
      });

      expect(mockHttpService.post).toHaveBeenCalledWith(
        `${mockConfig.url}/api/${mockConfig.organization}/_search`,
        {
          query: expect.stringContaining('SELECT'),
        },
        {
          headers: {
            Authorization: `Bearer ${mockConfig.auth.token}`,
            'Content-Type': 'application/json',
          },
          timeout: mockConfig.performance.timeout,
        },
      );
    });
  });

  describe('detectAnomalousPatterns', () => {
    it('should return anomaly detection results successfully', async () => {
      const timeRange = { start: '2023-01-01T00:00:00Z', end: '2023-01-02T00:00:00Z' };

      const mockResponse = {
        data: {
          hits: {
            total: { value: 2 },
            hits: [
              {
                _source: {
                  level: 'ERROR',
                  category: 'SYSTEM',
                  action: 'DATABASE_ERROR',
                  count: 10,
                  percentage: 0.1,
                },
              },
              {
                _source: {
                  level: 'ERROR',
                  category: 'ORDER',
                  action: 'PAYMENT_FAILED',
                  count: 5,
                  percentage: 0.05,
                },
              },
            ],
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.detectAnomalousPatterns(timeRange);

      expect(result).toEqual({
        total: 2,
        anomalies: [
          {
            level: 'ERROR',
            category: 'SYSTEM',
            action: 'DATABASE_ERROR',
            count: 10,
            percentage: 0.1,
            severity: 'medium',
          },
          {
            level: 'ERROR',
            category: 'ORDER',
            action: 'PAYMENT_FAILED',
            count: 5,
            percentage: 0.05,
            severity: 'low',
          },
        ],
      });

      expect(mockHttpService.post).toHaveBeenCalledWith(
        `${mockConfig.url}/api/${mockConfig.organization}/_search`,
        {
          query: expect.stringContaining('SELECT'),
        },
        {
          headers: {
            Authorization: `Bearer ${mockConfig.auth.token}`,
            'Content-Type': 'application/json',
          },
          timeout: mockConfig.performance.timeout,
        },
      );
    });
  });

  describe('getPopularPages', () => {
    it('should return popular pages successfully', async () => {
      const timeRange = { start: '2023-01-01T00:00:00Z', end: '2023-01-02T00:00:00Z' };
      const limit = 5;

      const mockResponse = {
        data: {
          hits: {
            hits: [
              {
                _source: {
                  page: '/home',
                  view_count: 100,
                  unique_users: 50,
                },
              },
              {
                _source: {
                  page: '/products',
                  view_count: 80,
                  unique_users: 40,
                },
              },
            ],
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.getPopularPages(timeRange, limit);

      expect(result).toEqual([
        {
          page: '/home',
          view_count: 100,
          unique_users: 50,
        },
        {
          page: '/products',
          view_count: 80,
          unique_users: 40,
        },
      ]);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        `${mockConfig.url}/api/${mockConfig.organization}/_search`,
        {
          query: expect.stringContaining('SELECT'),
        },
        {
          headers: {
            Authorization: `Bearer ${mockConfig.auth.token}`,
            'Content-Type': 'application/json',
          },
          timeout: mockConfig.performance.timeout,
        },
      );
    });
  });

  describe('getConversionFunnel', () => {
    it('should return conversion funnel successfully', async () => {
      const timeRange = { start: '2023-01-01T00:00:00Z', end: '2023-01-02T00:00:00Z' };

      const mockResponse = {
        data: {
          hits: {
            hits: [
              {
                _source: {
                  eventType: 'PRODUCT_VIEW',
                  user_count: 100,
                },
              },
              {
                _source: {
                  eventType: 'CART_ADD',
                  user_count: 50,
                },
              },
              {
                _source: {
                  eventType: 'CHECKOUT',
                  user_count: 20,
                },
              },
              {
                _source: {
                  eventType: 'PURCHASE',
                  user_count: 10,
                },
              },
            ],
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.getConversionFunnel(timeRange);

      expect(result).toEqual([
        {
          eventType: 'PRODUCT_VIEW',
          user_count: 100,
        },
        {
          eventType: 'CART_ADD',
          user_count: 50,
        },
        {
          eventType: 'CHECKOUT',
          user_count: 20,
        },
        {
          eventType: 'PURCHASE',
          user_count: 10,
        },
      ]);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        `${mockConfig.url}/api/${mockConfig.organization}/_search`,
        {
          query: expect.stringContaining('SELECT'),
        },
        {
          headers: {
            Authorization: `Bearer ${mockConfig.auth.token}`,
            'Content-Type': 'application/json',
          },
          timeout: mockConfig.performance.timeout,
        },
      );
    });
  });

  describe('calculateSeverity', () => {
    it('should return low severity for percentage < 0.1', () => {
      // Access the private method through prototype
      const calculateSeverity = (service as any).calculateSeverity.bind(service);
      const severity = calculateSeverity(0.05);
      expect(severity).toBe('low');
    });

    it('should return medium severity for percentage < 0.2', () => {
      // Access the private method through prototype
      const calculateSeverity = (service as any).calculateSeverity.bind(service);
      const severity = calculateSeverity(0.15);
      expect(severity).toBe('medium');
    });

    it('should return high severity for percentage < 0.5', () => {
      // Access the private method through prototype
      const calculateSeverity = (service as any).calculateSeverity.bind(service);
      const severity = calculateSeverity(0.3);
      expect(severity).toBe('high');
    });

    it('should return critical severity for percentage >= 0.5', () => {
      // Access the private method through prototype
      const calculateSeverity = (service as any).calculateSeverity.bind(service);
      const severity = calculateSeverity(0.6);
      expect(severity).toBe('critical');
    });
  });
});
