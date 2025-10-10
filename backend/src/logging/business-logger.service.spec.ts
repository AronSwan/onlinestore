/// <reference path="./jest.d.ts" />
import { describe, it, expect, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { BusinessLoggerService } from './business-logger.service';
import { OpenObserveConfig } from '../interfaces/logging.interface';

describe('BusinessLoggerService', () => {
  let service: BusinessLoggerService;
  let mockConfig: OpenObserveConfig;
  let mockTransport: { log: jest.Mock; flush: jest.Mock };

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

    mockTransport = { log: jest.fn(), flush: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        BusinessLoggerService,
        {
          provide: 'OPENOBSERVE_CONFIG',
          useValue: mockConfig,
        },
        {
          provide: 'OPENOBSERVE_TRANSPORT',
          useValue: mockTransport,
        },
      ],
    }).compile();

    service = module.get<BusinessLoggerService>(BusinessLoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logUserAction', () => {
    it('should log user action correctly', () => {
      const userId = 'user123';
      const action = 'LOGIN';
      const metadata = { ip: '192.168.1.1' };
      
      service.logUserAction(action, userId, metadata);
      
      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'INFO',
          category: 'USER',
          action,
          userId,
        }),
        expect.any(Function)
      );
    });

    it('negative-path: does not throw when transport.log fails', () => {
      mockTransport.log.mockImplementation(() => { throw new Error('network error'); });
      expect(() => service.logUserAction('LOGIN', 'user123', {})).not.toThrow();
    });
  });

  describe('logOrderEvent', () => {
    it('should log order event correctly', () => {
      const orderId = 'order123';
      const event = 'ORDER_CREATED';
      const metadata = { userId: 'user123', totalAmount: 100 };
      
      service.logOrderEvent(orderId, event, metadata);
      
      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'ORDER',
          action: event,
          businessContext: expect.objectContaining({ orderId })
        }),
        expect.any(Function)
      );
    });

    it('negative-path: does not throw when transport.log fails', () => {
      mockTransport.log.mockImplementation(() => { throw new Error('network error'); });
      expect(() =>
        service.logOrderEvent('ORDER_CREATED', 'order-001', { amount: 199, currency: 'USD' })
      ).not.toThrow();
    });
  });

  describe('logPaymentEvent', () => {
    it('should log payment event correctly', () => {
      const paymentId = 'payment123';
      const event = 'PAYMENT_INITIATED';
      const amount = 100;
      const status = 'PENDING';
      const metadata = { userId: 'user123' };
      
      service.logPaymentEvent(paymentId, event, amount, status, metadata);
      
      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'PAYMENT',
          action: event,
          businessContext: expect.objectContaining({ paymentId, amount, status }),
        }),
        expect.any(Function)
      );
    });
  });

  describe('logInventoryEvent', () => {
    it('should log inventory event correctly', () => {
      const productId = 'product123';
      const event = 'STOCK_UPDATED';
      const quantity = 50;
      const metadata = { userId: 'admin123' };
      
      service.logInventoryEvent(productId, event, quantity, metadata);
      
      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'INVENTORY',
          action: event,
          businessContext: expect.objectContaining({ productId, quantity }),
        }),
        expect.any(Function)
      );
    });
  });

  describe('logSystemEvent', () => {
    it('should log system event correctly', () => {
      const event = 'SYSTEM_STARTUP';
      const level = 'INFO';
      const metadata = { version: '1.0.0' };
      
      service.logSystemEvent(event, level, metadata);
      
      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'SYSTEM',
          action: event,
          level,
        }),
        expect.any(Function)
      );
    });

    it('negative-path: error log does not leak exception', () => {
      mockTransport.log.mockImplementation(() => { throw new Error('network error'); });
      expect(() => service.logError(new Error('boom'), {})).not.toThrow();
    });
  });

  describe('logError', () => {
    it('should log error correctly', () => {
      const error = new Error('Test error');
      const context = { userId: 'user123', action: 'TEST_ACTION' };
      
      service.logError(error, context);
      
      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'SYSTEM',
          action: 'ERROR_OCCURRED',
          level: 'ERROR',
        }),
        expect.any(Function)
      );
    });
  });

  describe('flush', () => {
    it('should flush logs without errors', () => {
      // Mock the console.log to avoid actual logging during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      
      service.flush();
      
      // Verify that no errors are thrown
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to flush log buffer')
      );
      
      consoleSpy.mockRestore();
    });
  });
});