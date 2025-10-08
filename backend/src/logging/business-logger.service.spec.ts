import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { BusinessLoggerService } from './business-logger.service';
import { OpenObserveConfig } from '../interfaces/logging.interface';

describe('BusinessLoggerService', () => {
  let service: BusinessLoggerService;
  let mockConfig: OpenObserveConfig;

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

    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        BusinessLoggerService,
        {
          provide: 'OPENOBSERVE_CONFIG',
          useValue: mockConfig,
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

      // Mock the console.log to avoid actual logging during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.logUserAction(action, userId, metadata);
      
      // Verify that no errors are thrown
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to send business log to OpenObserve')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('logOrderEvent', () => {
    it('should log order event correctly', () => {
      const orderId = 'order123';
      const event = 'ORDER_CREATED';
      const metadata = { userId: 'user123', totalAmount: 100 };

      // Mock the console.log to avoid actual logging during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.logOrderEvent(orderId, event, metadata);
      
      // Verify that no errors are thrown
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to send business log to OpenObserve')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('logPaymentEvent', () => {
    it('should log payment event correctly', () => {
      const paymentId = 'payment123';
      const event = 'PAYMENT_INITIATED';
      const amount = 100;
      const status = 'PENDING';
      const metadata = { userId: 'user123' };

      // Mock the console.log to avoid actual logging during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.logPaymentEvent(paymentId, event, amount, status, metadata);
      
      // Verify that no errors are thrown
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to send business log to OpenObserve')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('logInventoryEvent', () => {
    it('should log inventory event correctly', () => {
      const productId = 'product123';
      const event = 'STOCK_UPDATED';
      const quantity = 50;
      const metadata = { userId: 'admin123' };

      // Mock the console.log to avoid actual logging during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.logInventoryEvent(productId, event, quantity, metadata);
      
      // Verify that no errors are thrown
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to send business log to OpenObserve')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('logSystemEvent', () => {
    it('should log system event correctly', () => {
      const event = 'SYSTEM_STARTUP';
      const level = 'INFO';
      const metadata = { version: '1.0.0' };

      // Mock the console.log to avoid actual logging during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.logSystemEvent(event, level, metadata);
      
      // Verify that no errors are thrown
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to send business log to OpenObserve')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('logError', () => {
    it('should log error correctly', () => {
      const error = new Error('Test error');
      const context = { userId: 'user123', action: 'TEST_ACTION' };

      // Mock the console.log to avoid actual logging during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      service.logError(error, context);
      
      // Verify that no errors are thrown
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to send business log to OpenObserve')
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
        expect.stringContaining('Failed to flush log buffer')
      );
      
      consoleSpy.mockRestore();
    });
  });
});