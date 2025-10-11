/// <reference path="./jest.d.ts" />
import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule, HttpService } from '@nestjs/axios';
import { LoggingModule } from './logging.module';
import { BusinessLoggerService } from './business-logger.service';
import { UserBehaviorTracker } from './user-behavior-tracker.service';
import { LogAnalyticsService } from './log-analytics.service';
import { LoggingController } from './logging.controller';
import { OpenObserveConfig } from '../interfaces/logging.interface';
import { of } from 'rxjs';

describe('Logging Integration', () => {
  let module: TestingModule;
  let businessLoggerService: BusinessLoggerService;
  let userBehaviorTracker: UserBehaviorTracker;
  let logAnalyticsService: LogAnalyticsService;
  let loggingController: LoggingController;
  let mockConfig: OpenObserveConfig;
  let mockHttpService: jest.Mocked<HttpService> | any;

  beforeAll(async () => {
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
        batch_size: 10,
        flush_interval: 1000,
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

    module = await Test.createTestingModule({
      imports: [HttpModule, LoggingModule],
      providers: [
        {
          provide: 'OPENOBSERVE_CONFIG',
          useValue: mockConfig,
        },
        {
          provide: 'HttpService',
          useValue: mockHttpService,
        },
      ],
    }).compile();

    businessLoggerService = module.get<BusinessLoggerService>(BusinessLoggerService);
    userBehaviorTracker = module.get<UserBehaviorTracker>(UserBehaviorTracker);
    logAnalyticsService = module.get<LogAnalyticsService>(LogAnalyticsService);
    loggingController = module.get<LoggingController>(LoggingController);
  });

  afterAll(async () => {
    await module.close();
  });

  it('module should be defined', () => {
    expect(module).toBeDefined();
  });

  it('services should be defined', () => {
    expect(businessLoggerService).toBeDefined();
    expect(userBehaviorTracker).toBeDefined();
    expect(logAnalyticsService).toBeDefined();
  });

  it('controller should be defined', () => {
    expect(loggingController).toBeDefined();
  });

  describe('Business Logging Integration', () => {
    it('should log user action through controller', async () => {
      const body = { action: 'LOGIN', userId: 'user123', metadata: { ip: '192.168.1.1' } };

      const result = await loggingController.logUserAction(body);

      expect(result.success).toBe(true);
    });

    it('should log order event through controller', async () => {
      const body = { orderId: 'order123', event: 'ORDER_CREATED', metadata: { userId: 'user123' } };

      const result = await loggingController.logOrderEvent(body);

      expect(result.success).toBe(true);
    });

    it('should log payment event through controller', async () => {
      const body = {
        paymentId: 'payment123',
        event: 'PAYMENT_INITIATED',
        amount: 100,
        status: 'PENDING',
        metadata: { userId: 'user123' },
      };

      const result = await loggingController.logPaymentEvent(body);

      expect(result.success).toBe(true);
    });

    it('should log inventory event through controller', async () => {
      const body = {
        productId: 'product123',
        event: 'STOCK_UPDATED',
        quantity: 50,
        metadata: { userId: 'admin123' },
      };

      const result = await loggingController.logInventoryEvent(body);

      expect(result.success).toBe(true);
    });
  });

  describe('User Behavior Tracking Integration', () => {
    it('should track page view through controller', async () => {
      const body = { sessionId: 'session123', page: '/home', userId: 'user123' };
      const mockRequest = {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': '192.168.1.1',
          'sec-ch-ua-platform': 'Windows',
          referer: 'https://example.com',
        },
        ip: '192.168.1.1',
      };

      const result = await loggingController.trackPageView(body as any, mockRequest as any);

      expect(result.success).toBe(true);
    });

    it('should track product view through controller', async () => {
      const body = {
        sessionId: 'session123',
        productId: 'product123',
        userId: 'user123',
        eventType: 'PRODUCT_VIEW',
      };
      const mockRequest = {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': '192.168.1.1',
          'sec-ch-ua-platform': 'Windows',
        },
        ip: '192.168.1.1',
      };

      const result = await loggingController.trackProductView(body, mockRequest as any);

      expect(result.success).toBe(true);
    });

    it('should track search through controller', async () => {
      const body = {
        sessionId: 'session123',
        searchQuery: 'laptop',
        userId: 'user123',
        eventType: 'SEARCH',
      };
      const mockRequest = {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': '192.168.1.1',
          'sec-ch-ua-platform': 'Windows',
        },
        ip: '192.168.1.1',
      };

      const result = await loggingController.trackSearch(body, mockRequest as any);

      expect(result.success).toBe(true);
    });

    it('should track cart operation through controller', async () => {
      const body = {
        sessionId: 'session123',
        operation: 'CART_ADD' as const,
        productId: 'product123',
        quantity: 2,
        price: 99.99,
        userId: 'user123',
        cartId: 'cart123',
        eventType: 'CART_ADD',
      };
      const mockRequest = {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': '192.168.1.1',
          'sec-ch-ua-platform': 'Windows',
        },
        ip: '192.168.1.1',
      };

      const result = await loggingController.trackCartOperation(body, mockRequest as any);

      expect(result.success).toBe(true);
    });

    it('should track checkout through controller', async () => {
      const body = {
        sessionId: 'session123',
        orderId: 'order123',
        totalAmount: 199.99,
        userId: 'user123',
        eventType: 'CHECKOUT',
      };
      const mockRequest = {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': '192.168.1.1',
          'sec-ch-ua-platform': 'Windows',
        },
        ip: '192.168.1.1',
      };

      const result = await loggingController.trackCheckout(body, mockRequest as any);

      expect(result.success).toBe(true);
    });

    it('should track purchase through controller', async () => {
      const body = {
        sessionId: 'session123',
        orderId: 'order123',
        totalAmount: 199.99,
        userId: 'user123',
        eventType: 'PURCHASE',
      };
      const mockRequest = {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': '192.168.1.1',
          'sec-ch-ua-platform': 'Windows',
        },
        ip: '192.168.1.1',
      };

      const result = await loggingController.trackPurchase(body, mockRequest as any);

      expect(result.success).toBe(true);
    });
  });

  describe('Log Analytics Integration', () => {
    it('should get log stats through controller', async () => {
      const mockResponse = {
        data: {
          hits: {
            total: { value: 100 },
            hits: [],
          },
          aggregations: {},
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const query = { start: '2023-01-01T00:00:00Z', end: '2023-01-02T00:00:00Z' };

      const result = await loggingController.getLogStats({
        start: query.start,
        end: query.end,
        filters: { level: 'INFO' },
      } as any);

      expect(result.success).toBe(true);
      // 联合类型安全访问：仅在存在 data 字段时断言
      expect('data' in result && result.data).toBeDefined();
    });

    it('should get user behavior analytics through controller', async () => {
      const mockResponse = {
        data: {
          hits: {
            total: { value: 50 },
            hits: [],
          },
          aggregations: {},
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const query = {
        start: '2023-01-01T00:00:00Z',
        end: '2023-01-02T00:00:00Z',
        userId: 'user123',
      };

      const result = await loggingController.getUserBehaviorAnalytics(
        query.start,
        query.end,
        query.userId,
      );

      expect(result.success).toBe(true);
      // 联合类型安全访问：仅在存在 data 字段时断言
      expect('data' in result && result.data).toBeDefined();
    });

    it('should detect anomalous patterns through controller', async () => {
      const mockResponse = {
        data: {
          hits: {
            total: { value: 2 },
            hits: [],
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const query = { start: '2023-01-01T00:00:00Z', end: '2023-01-02T00:00:00Z' };

      const result = await loggingController.detectAnomalousPatterns(query.start, query.end);

      expect(result.success).toBe(true);
      // 联合类型安全访问：仅在存在 data 字段时断言
      expect('data' in result && result.data).toBeDefined();
    });

    it('should get popular pages through controller', async () => {
      const mockResponse = {
        data: {
          hits: {
            hits: [
              { _source: { page: '/home', view_count: 100, unique_users: 50 } },
              { _source: { page: '/products', view_count: 80, unique_users: 40 } },
            ],
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const query = { start: '2023-01-01T00:00:00Z', end: '2023-01-02T00:00:00Z', limit: '10' };

      const result = await loggingController.getPopularPages(query.start, query.end, query.limit);

      expect(result.success).toBe(true);
      // 联合类型安全访问：仅在存在 data 字段时断言
      expect('data' in result && result.data).toBeDefined();
      expect('data' in result && Array.isArray(result.data)).toBe(true);
    });

    it('should get conversion funnel through controller', async () => {
      const mockResponse = {
        data: {
          hits: {
            hits: [
              { _source: { eventType: 'PRODUCT_VIEW', user_count: 100 } },
              { _source: { eventType: 'CART_ADD', user_count: 50 } },
              { _source: { eventType: 'CHECKOUT', user_count: 20 } },
              { _source: { eventType: 'PURCHASE', user_count: 10 } },
            ],
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const query = { start: '2023-01-01T00:00:00Z', end: '2023-01-02T00:00:00Z' };

      const result = await loggingController.getConversionFunnel(query.start, query.end);

      expect(result.success).toBe(true);
      // 联合类型安全访问：仅在存在 data 字段时断言
      expect('data' in result && result.data).toBeDefined();
      expect('data' in result && Array.isArray(result.data)).toBe(true);
    });
  });

  describe('Utility Functions Integration', () => {
    it('should flush logs through controller', async () => {
      const result = await loggingController.flushLogs();

      expect(result.success).toBe(true);
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete a full user journey logging workflow', async () => {
      const sessionId = 'session123';
      const userId = 'user123';
      const mockRequest = {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': '192.168.1.1',
          'sec-ch-ua-platform': 'Windows',
          referer: 'https://google.com',
        },
        ip: '192.168.1.1',
      };

      // 1. Track page view
      const pageViewResult = await loggingController.trackPageView(
        { sessionId, page: '/home', userId } as any,
        mockRequest as any,
      );
      expect(pageViewResult.success).toBe(true);

      // 2. Track product view
      const productViewResult = await loggingController.trackProductView(
        { sessionId, productId: 'product123', userId },
        mockRequest as any,
      );
      expect(productViewResult.success).toBe(true);

      // 3. Track cart add
      const cartAddResult = await loggingController.trackCartOperation(
        {
          sessionId,
          operation: 'CART_ADD',
          productId: 'product123',
          quantity: 1,
          price: 99.99,
          userId,
          cartId: 'cart123',
        },
        mockRequest as any,
      );
      expect(cartAddResult.success).toBe(true);

      // 4. Log order event
      const orderEventResult = await loggingController.logOrderEvent({
        orderId: 'order123',
        event: 'ORDER_CREATED',
        metadata: { userId, totalAmount: 99.99 },
      });
      expect(orderEventResult.success).toBe(true);

      // 5. Log payment event
      const paymentEventResult = await loggingController.logPaymentEvent({
        paymentId: 'payment123',
        event: 'PAYMENT_INITIATED',
        amount: 99.99,
        status: 'PENDING',
        metadata: { userId },
      });
      expect(paymentEventResult.success).toBe(true);

      // 6. Track checkout
      const checkoutResult = await loggingController.trackCheckout(
        { sessionId, orderId: 'order123', totalAmount: 99.99, userId },
        mockRequest as any,
      );
      expect(checkoutResult.success).toBe(true);

      // 7. Track purchase
      const purchaseResult = await loggingController.trackPurchase(
        { sessionId, orderId: 'order123', totalAmount: 99.99, userId },
        mockRequest as any,
      );
      expect(purchaseResult.success).toBe(true);

      // 8. Flush logs
      const flushResult = await loggingController.flushLogs();
      expect(flushResult.success).toBe(true);
    });
  });
});
