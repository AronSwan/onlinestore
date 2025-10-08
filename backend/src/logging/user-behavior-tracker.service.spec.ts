import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { UserBehaviorTracker } from './user-behavior-tracker.service';
import { OpenObserveConfig } from '../interfaces/logging.interface';
import { Request } from 'express';

describe('UserBehaviorTracker', () => {
  let service: UserBehaviorTracker;
  let mockConfig: OpenObserveConfig;
  let mockRequest: Partial<Request>;

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

    mockRequest = {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'x-forwarded-for': '192.168.1.1',
        'sec-ch-ua-platform': 'Windows',
        referer: 'https://example.com',
      },
      ip: '192.168.1.1',
    } as Partial<Request>;

    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        UserBehaviorTracker,
        {
          provide: 'OPENOBSERVE_CONFIG',
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<UserBehaviorTracker>(UserBehaviorTracker);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackPageView', () => {
    it('should track page view correctly', () => {
      const sessionId = 'session123';
      const page = '/home';
      const userId = 'user123';

      // Mock the console.log to avoid actual logging during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.trackPageView(sessionId, page, userId, mockRequest as Request);
      
      // Verify that no errors are thrown
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to send user behavior log to OpenObserve')
      );
      
      consoleSpy.mockRestore();
    });

    it('should track page view without userId', () => {
      const sessionId = 'session123';
      const page = '/home';

      // Mock the console.log to avoid actual logging during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.trackPageView(sessionId, page, undefined, mockRequest as Request);
      
      // Verify that no errors are thrown
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to send user behavior log to OpenObserve')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('trackProductView', () => {
    it('should track product view correctly', () => {
      const sessionId = 'session123';
      const productId = 'product123';
      const userId = 'user123';

      // Mock the console.log to avoid actual logging during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.trackProductView(sessionId, productId, userId, mockRequest as Request);
      
      // Verify that no errors are thrown
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to send user behavior log to OpenObserve')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('trackSearch', () => {
    it('should track search correctly', () => {
      const sessionId = 'session123';
      const searchQuery = 'laptop';
      const userId = 'user123';

      // Mock the console.log to avoid actual logging during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.trackSearch(sessionId, searchQuery, userId, mockRequest as Request);
      
      // Verify that no errors are thrown
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to send user behavior log to OpenObserve')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('trackCartOperation', () => {
    it('should track cart add correctly', () => {
      const sessionId = 'session123';
      const operation = 'CART_ADD' as const;
      const productId = 'product123';
      const quantity = 2;
      const price = 99.99;
      const userId = 'user123';
      const cartId = 'cart123';

      // Mock the console.log to avoid actual logging during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.trackCartOperation(
        sessionId, 
        operation, 
        productId, 
        quantity, 
        price, 
        userId, 
        cartId,
        mockRequest as Request
      );
      
      // Verify that no errors are thrown
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to send user behavior log to OpenObserve')
      );
      
      consoleSpy.mockRestore();
    });

    it('should track cart remove correctly', () => {
      const sessionId = 'session123';
      const operation = 'CART_REMOVE' as const;
      const productId = 'product123';
      const quantity = 1;
      const price = 99.99;
      const userId = 'user123';
      const cartId = 'cart123';

      // Mock the console.log to avoid actual logging during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.trackCartOperation(
        sessionId, 
        operation, 
        productId, 
        quantity, 
        price, 
        userId, 
        cartId,
        mockRequest as Request
      );
      
      // Verify that no errors are thrown
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to send user behavior log to OpenObserve')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('trackCheckout', () => {
    it('should track checkout correctly', () => {
      const sessionId = 'session123';
      const orderId = 'order123';
      const totalAmount = 199.99;
      const userId = 'user123';

      // Mock the console.log to avoid actual logging during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.trackCheckout(sessionId, orderId, totalAmount, userId, mockRequest as Request);
      
      // Verify that no errors are thrown
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to send user behavior log to OpenObserve')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('trackPurchase', () => {
    it('should track purchase correctly', () => {
      const sessionId = 'session123';
      const orderId = 'order123';
      const totalAmount = 199.99;
      const userId = 'user123';

      // Mock the console.log to avoid actual logging during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.trackPurchase(sessionId, orderId, totalAmount, userId, mockRequest as Request);
      
      // Verify that no errors are thrown
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to send user behavior log to OpenObserve')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('trackCustomEvent', () => {
    it('should track custom event correctly', () => {
      const sessionId = 'session123';
      const eventType = 'CUSTOM_EVENT';
      const eventData = { customField: 'customValue' };
      const userId = 'user123';

      // Mock the console.log to avoid actual logging during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.trackCustomEvent(sessionId, eventType, eventData, userId, mockRequest as Request);
      
      // Verify that no errors are thrown
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to send user behavior log to OpenObserve')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('flush', () => {
    it('should flush logs without errors', () => {
      // Mock the console.log to avoid actual logging during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.flush();
      
      // Verify that no errors are thrown
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to flush behavior log buffer')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('extractDeviceInfo', () => {
    it('should extract device info correctly', () => {
      // Create a mock request with all necessary headers
      const mockRequestWithHeaders: Partial<Request> = {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'x-forwarded-for': '192.168.1.1',
          'sec-ch-ua-platform': 'Windows',
        },
      };

      // Access the private method through prototype
      const extractDeviceInfo = (service as any).extractDeviceInfo.bind(service);
      const deviceInfo = extractDeviceInfo(mockRequestWithHeaders);

      expect(deviceInfo).toEqual({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ip: '192.168.1.1',
        platform: 'Windows',
      });
    });

    it('should handle missing request', () => {
      // Access the private method through prototype
      const extractDeviceInfo = (service as any).extractDeviceInfo.bind(service);
      const deviceInfo = extractDeviceInfo(null);

      expect(deviceInfo).toBeNull();
    });
  });

  describe('getClientIp', () => {
    it('should get client IP from x-forwarded-for header', () => {
      const mockRequestWithIp: Partial<Request> = {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      };

      // Access the private method through prototype
      const getClientIp = (service as any).getClientIp.bind(service);
      const ip = getClientIp(mockRequestWithIp as Request);

      expect(ip).toBe('192.168.1.1');
    });

    it('should get client IP from x-real-ip header', () => {
      const mockRequestWithIp: Partial<Request> = {
        headers: {
          'x-real-ip': '192.168.1.2',
        },
      };

      // Access the private method through prototype
      const getClientIp = (service as any).getClientIp.bind(service);
      const ip = getClientIp(mockRequestWithIp as Request);

      expect(ip).toBe('192.168.1.2');
    });

    it('should return unknown when no IP headers are present', () => {
      const mockRequestWithoutIp: Partial<Request> = {
        headers: {},
      };

      // Access the private method through prototype
      const getClientIp = (service as any).getClientIp.bind(service);
      const ip = getClientIp(mockRequestWithoutIp as Request);

      expect(ip).toBe('unknown');
    });
  });
});