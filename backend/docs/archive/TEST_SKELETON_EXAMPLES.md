# 测试骨架示例与用例导航

> 📋 **文档索引**: 
> - 📊 [整体改进计划](./BACKEND_IMPROVEMENT_PLAN.md) - 8周改进路线图
> - 🔧 [关键修正清单](./CRITICAL_FIXES_SUMMARY.md) - 问题修正摘要
> - 💻 [代码修复示例](./CODE_FIX_EXAMPLES.md) - 技术实现细节
> - 🧪 [测试骨架示例](./TEST_SKELETON_EXAMPLES.md) - 测试用例骨架（当前文档）
> - 🔧 [源文件补丁片段](./SOURCE_PATCH_FRAGMENTS.md) - 可直接落盘的源文件
> - 🧪 [测试执行计划](./TEST_EXECUTION_PLAN.md) - 完整测试执行指南
> - 📊 [测试执行报告](./TEST_EXECUTION_REPORT.md) - 测试执行结果

## 🎯 概述

本文档提供了全面的测试骨架示例，涵盖NestJS应用的各种测试场景，包括单元测试、集成测试、E2E测试等。每个骨架都包含完整的依赖注入、Mock配置和测试用例结构。

## 🏗️ 基础测试骨架

### S1 Nest 模块测试骨架（含 Provider 注入）

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AddressService } from '@/address/address.service';
import { AddressValidationService } from '@/address/address-validation.service';
import { AddressCacheService } from '@/address/address-cache.service';

describe('AddressService', () => {
  let service: AddressService;
  let cacheService: AddressCacheService;
  let validationService: AddressValidationService;

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
  };

  const mockValidation = {
    validateAddress: jest.fn(),
    validatePostalCode: jest.fn(),
    validatePhoneNumber: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AddressService,
        AddressValidationService,
        {
          provide: AddressCacheService,
          useValue: mockCache,
        },
      ],
    })
    .overrideProvider(AddressValidationService)
    .useValue(mockValidation)
    .compile();

    service = moduleRef.get<AddressService>(AddressService);
    cacheService = moduleRef.get<AddressCacheService>(AddressCacheService);
    validationService = moduleRef.get<AddressValidationService>(AddressValidationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAddress', () => {
    it('should validate address successfully', async () => {
      const address = {
        street: '123 Test St',
        city: 'Test City',
        postalCode: '12345',
        country: 'CN',
      };

      mockCache.get.mockResolvedValue(null);
      mockValidation.validateAddress.mockResolvedValue(true);
      mockCache.set.mockResolvedValue(true);

      const result = await service.validateAddress(address);

      expect(mockCache.get).toHaveBeenCalledWith(`address:${JSON.stringify(address)}`);
      expect(mockValidation.validateAddress).toHaveBeenCalledWith(address);
      expect(mockCache.set).toHaveBeenCalledWith(
        `address:${JSON.stringify(address)}`,
        true,
        3600
      );
      expect(result).toBe(true);
    });

    it('should return cached validation result', async () => {
      const address = {
        street: '123 Test St',
        city: 'Test City',
        postalCode: '12345',
        country: 'CN',
      };

      mockCache.get.mockResolvedValue(true);

      const result = await service.validateAddress(address);

      expect(mockCache.get).toHaveBeenCalledWith(`address:${JSON.stringify(address)}`);
      expect(mockValidation.validateAddress).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});
```

### S2 异步 Guard/Interceptor/Filter 测试骨架

```typescript
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { ExecutionContext } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
    get: jest.fn(),
  };

  const createMockContext = (user?: any, handler?: any): ExecutionContext => {
    return {
      getHandler: () => handler || (() => {}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          headers: {},
          query: {},
          params: {},
        }),
      }),
      switchToRpc: () => ({
        getData: () => ({}),
        getContext: () => ({}),
      }),
      switchToWs: () => ({
        getClient: () => ({}),
        getData: () => ({}),
      }),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('canActivate', () => {
    it('should allow access when no roles required', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([]);
      
      const context = createMockContext({ id: 1, roles: ['user'] });
      
      const result = await guard.canActivate(context);
      
      expect(result).toBe(true);
    });

    it('should allow access when user has required role', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin']);
      
      const context = createMockContext({ id: 1, roles: ['admin', 'user'] });
      
      const result = await guard.canActivate(context);
      
      expect(result).toBe(true);
    });

    it('should deny access when user lacks required role', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin']);
      
      const context = createMockContext({ id: 1, roles: ['user'] });
      
      const result = await guard.canActivate(context);
      
      expect(result).toBe(false);
    });

    it('should deny access when no user in request', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin']);
      
      const context = createMockContext();
      
      const result = await guard.canActivate(context);
      
      expect(result).toBe(false);
    });
  });
});
```

### S3 定时器与清理骨架

```typescript
import { MonitoringService } from '@/monitoring/monitoring.service';
import { MonitoringMetricsService } from '@/monitoring/monitoring-metrics.service';

describe('MonitoringService', () => {
  let service: MonitoringService;
  let metricsService: MonitoringMetricsService;

  const mockMetricsService = {
    recordMetric: jest.fn(),
    incrementCounter: jest.fn(),
    recordHistogram: jest.fn(),
    getMetrics: jest.fn(),
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    
    const module = await Test.createTestingModule({
      providers: [
        MonitoringService,
        {
          provide: MonitoringMetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
    metricsService = module.get<MonitoringMetricsService>(MonitoringMetricsService);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('startMetricsCollection', () => {
    it('should start collecting metrics periodically', () => {
      const collectMetricsSpy = jest.spyOn(service, 'collectMetrics');
      
      service.startMetricsCollection(60000); // 1分钟间隔
      
      expect(setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        60000
      );
      
      // 快进时间触发定时器
      jest.advanceTimersByTime(60000);
      
      expect(collectMetricsSpy).toHaveBeenCalled();
    });

    it('should handle multiple intervals correctly', () => {
      const collectMetricsSpy = jest.spyOn(service, 'collectMetrics');
      const cleanupSpy = jest.spyOn(service, 'cleanup');
      
      service.startMetricsCollection(60000);
      service.startHealthCheck(30000);
      
      expect(setInterval).toHaveBeenCalledTimes(2);
      
      // 快进时间触发两个定时器
      jest.advanceTimersByTime(60000);
      
      expect(collectMetricsSpy).toHaveBeenCalled();
      expect(cleanupSpy).toHaveBeenCalled();
      
      service.stopMetricsCollection();
      service.stopHealthCheck();
    });
  });

  describe('collectMetrics', () => {
    it('should collect and record metrics', async () => {
      const mockMetrics = {
        cpuUsage: 50,
        memoryUsage: 70,
        activeConnections: 100,
        responseTime: 200,
      };

      mockMetricsService.getMetrics.mockResolvedValue(mockMetrics);

      await service.collectMetrics();

      expect(mockMetricsService.getMetrics).toHaveBeenCalled();
      expect(mockMetricsService.recordHistogram).toHaveBeenCalledWith(
        'system.cpu.usage',
        mockMetrics.cpuUsage
      );
      expect(mockMetricsService.recordHistogram).toHaveBeenCalledWith(
        'system.memory.usage',
        mockMetrics.memoryUsage
      );
    });

    it('should handle metric collection errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockMetricsService.getMetrics.mockRejectedValue(new Error('Metrics collection failed'));

      await service.collectMetrics();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to collect metrics:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });
});
```

### S4 DataSource/QueryRunner 事务骨架

```typescript
import { DataSource } from 'typeorm';
import { PaymentService } from '@/payment/payment.service';
import { PaymentRepository } from '@/payment/payment.repository';

describe('PaymentService', () => {
  let service: PaymentService;
  let dataSource: DataSource;
  let paymentRepository: PaymentRepository;
  let mockQueryRunner: any;

  const createMockQueryRunner = () => ({
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: 'mock-id' })),
      remove: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    },
  });

  const mockPaymentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
    })),
  };

  beforeEach(async () => {
    mockQueryRunner = createMockQueryRunner();
    
    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const module = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: PaymentRepository,
          useValue: mockPaymentRepository,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    dataSource = module.get<DataSource>(DataSource);
    paymentRepository = module.get<PaymentRepository>(PaymentRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processPayment', () => {
    it('should process payment with transaction', async () => {
      const paymentDto = {
        orderId: 'order-123',
        amount: 100,
        method: 'credit_card',
        currency: 'USD',
      };

      const expectedPayment = {
        id: 'payment-123',
        ...paymentDto,
        status: 'completed',
        createdAt: new Date(),
      };

      mockQueryRunner.manager.save.mockResolvedValue(expectedPayment);

      const result = await service.processPayment(paymentDto);

      expect(dataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: paymentDto.orderId,
          amount: paymentDto.amount,
          method: paymentDto.method,
          currency: paymentDto.currency,
        })
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result).toEqual(expectedPayment);
    });

    it('should rollback transaction on error', async () => {
      const paymentDto = {
        orderId: 'order-123',
        amount: 100,
        method: 'credit_card',
        currency: 'USD',
      };

      mockQueryRunner.manager.save.mockRejectedValue(new Error('Database error'));

      await expect(service.processPayment(paymentDto)).rejects.toThrow('Database error');

      expect(dataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('refundPayment', () => {
    it('should refund payment with transaction', async () => {
      const paymentId = 'payment-123';
      const refundDto = {
        amount: 50,
        reason: 'Customer request',
      };

      const existingPayment = {
        id: paymentId,
        orderId: 'order-123',
        amount: 100,
        status: 'completed',
      };

      const expectedRefund = {
        id: 'refund-123',
        paymentId,
        amount: refundDto.amount,
        reason: refundDto.reason,
        status: 'processed',
      };

      mockPaymentRepository.findOne.mockResolvedValue(existingPayment);
      mockQueryRunner.manager.save.mockResolvedValue(expectedRefund);

      const result = await service.refundPayment(paymentId, refundDto);

      expect(paymentRepository.findOne).toHaveBeenCalledWith(paymentId);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId,
          amount: refundDto.amount,
          reason: refundDto.reason,
        })
      );
      expect(result).toEqual(expectedRefund);
    });

    it('should throw error when payment not found', async () => {
      const paymentId = 'non-existent-payment';
      const refundDto = {
        amount: 50,
        reason: 'Customer request',
      };

      mockPaymentRepository.findOne.mockResolvedValue(null);

      await expect(service.refundPayment(paymentId, refundDto)).rejects.toThrow('Payment not found');

      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
    });
  });
});
```

## 🔧 高级测试骨架

### S5 缓存服务测试骨架

```typescript
import { EnhancedCacheService } from '@/cache/enhanced-cache.service';

describe('EnhancedCacheService', () => {
  let service: EnhancedCacheService;
  let cacheRepository: any;
  let logger: any;

  const mockCacheRepository = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    ttl: jest.fn(),
    keys: jest.fn(),
    flushdb: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EnhancedCacheService,
        {
          provide: 'CACHE_REPOSITORY',
          useValue: mockCacheRepository,
        },
        {
          provide: 'LOGGER',
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<EnhancedCacheService>(EnhancedCacheService);
    cacheRepository = module.get('CACHE_REPOSITORY');
    logger = module.get('LOGGER');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('set', () => {
    it('should set cache with correct parameters', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      const ttl = 3600;

      await service.set(key, value, ttl);

      expect(cacheRepository.set).toHaveBeenCalledWith(
        'enhanced:' + key,
        JSON.stringify(value),
        'EX',
        ttl
      );
    });

    it('should use default TTL when not provided', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      await service.set(key, value);

      expect(cacheRepository.set).toHaveBeenCalledWith(
        'enhanced:' + key,
        JSON.stringify(value),
        'EX',
        1800 // 默认30分钟
      );
    });

    it('should handle cache set errors', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      cacheRepository.set.mockRejectedValue(new Error('Redis error'));

      await expect(service.set(key, value)).rejects.toThrow('Redis error');
      expect(logger.error).toHaveBeenCalledWith('Cache set failed:', expect.any(Error));
    });
  });

  describe('get', () => {
    it('should get and deserialize cache value', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      const serializedValue = JSON.stringify(value);

      cacheRepository.get.mockResolvedValue(serializedValue);

      const result = await service.get(key);

      expect(cacheRepository.get).toHaveBeenCalledWith('enhanced:' + key);
      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const key = 'non-existent-key';

      cacheRepository.get.mockResolvedValue(null);

      const result = await service.get(key);

      expect(result).toBeNull();
    });

    it('should handle JSON parsing errors', async () => {
      const key = 'test-key';
      const invalidJson = '{ invalid json }';

      cacheRepository.get.mockResolvedValue(invalidJson);

      const result = await service.get(key);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith('Failed to parse cache value:', expect.any(Error));
    });
  });

  describe('invalidatePattern', () => {
    it('should invalidate cache keys matching pattern', async () => {
      const pattern = 'user:*';
      const keys = ['user:123', 'user:456', 'product:789'];

      cacheRepository.keys.mockResolvedValue(keys);
      cacheRepository.del.mockResolvedValue(2); // 删除了2个key

      const result = await service.invalidatePattern(pattern);

      expect(cacheRepository.keys).toHaveBeenCalledWith('enhanced:user:*');
      expect(cacheRepository.del).toHaveBeenCalledWith('user:123', 'user:456');
      expect(result).toBe(2);
    });

    it('should handle empty key list', async () => {
      const pattern = 'nonexistent:*';

      cacheRepository.keys.mockResolvedValue([]);

      const result = await service.invalidatePattern(pattern);

      expect(cacheRepository.del).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });
  });
});
```

### S6 通知服务测试骨架

```typescript
import { NotificationService } from '@/notification/notification.service';
import { EmailService } from '@/notification/services/email.service';
import { SmsService } from '@/notification/services/sms.service';
import { PushService } from '@/notification/services/push.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let emailService: EmailService;
  let smsService: SmsService;
  let pushService: PushService;

  const mockEmailService = {
    send: jest.fn().mockResolvedValue({ messageId: 'email-id', success: true }),
    sendBatch: jest.fn().mockResolvedValue([
      { messageId: 'email-id-1', success: true },
      { messageId: 'email-id-2', success: true },
    ]),
    getStatus: jest.fn().mockResolvedValue({ status: 'delivered' }),
  };

  const mockSmsService = {
    send: jest.fn().mockResolvedValue({ messageId: 'sms-id', success: true }),
    sendBatch: jest.fn().mockResolvedValue([
      { messageId: 'sms-id-1', success: true },
      { messageId: 'sms-id-2', success: true },
    ]),
    getStatus: jest.fn().mockResolvedValue({ status: 'delivered' }),
  };

  const mockPushService = {
    send: jest.fn().mockResolvedValue({ messageId: 'push-id', success: true }),
    sendBatch: jest.fn().mockResolvedValue([
      { messageId: 'push-id-1', success: true },
      { messageId: 'push-id-2', success: true },
    ]),
    getStatus: jest.fn().mockResolvedValue({ status: 'delivered' }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: SmsService,
          useValue: mockSmsService,
        },
        {
          provide: PushService,
          useValue: mockPushService,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    emailService = module.get<EmailService>(EmailService);
    smsService = module.get<SmsService>(SmsService);
    pushService = module.get<PushService>(PushService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const emailDto = {
        to: 'test@example.com',
        subject: 'Test Subject',
        content: 'Test Content',
        template: 'default',
        data: {},
      };

      const result = await service.sendEmail(emailDto);

      expect(emailService.send).toHaveBeenCalledWith(emailDto);
      expect(result).toEqual({ messageId: 'email-id', success: true });
    });

    it('should handle email sending failure', async () => {
      const emailDto = {
        to: 'test@example.com',
        subject: 'Test Subject',
        content: 'Test Content',
      };

      emailService.send.mockRejectedValue(new Error('SMTP error'));

      await expect(service.sendEmail(emailDto)).rejects.toThrow('SMTP error');
    });
  });

  describe('sendMultiChannel', () => {
    it('should send notifications via multiple channels', async () => {
      const notificationDto = {
        userId: 'user-123',
        title: 'Test Notification',
        message: 'Test message',
        channels: ['email', 'sms', 'push'],
        email: 'test@example.com',
        phone: '+1234567890',
        pushToken: 'push-token',
      };

      const result = await service.sendMultiChannel(notificationDto);

      expect(emailService.send).toHaveBeenCalledWith({
        to: notificationDto.email,
        subject: notificationDto.title,
        content: notificationDto.message,
      });
      expect(smsService.send).toHaveBeenCalledWith({
        to: notificationDto.phone,
        message: notificationDto.message,
      });
      expect(pushService.send).toHaveBeenCalledWith({
        token: notificationDto.pushToken,
        title: notificationDto.title,
        message: notificationDto.message,
      });

      expect(result).toEqual({
        email: { messageId: 'email-id', success: true },
        sms: { messageId: 'sms-id', success: true },
        push: { messageId: 'push-id', success: true },
      });
    });

    it('should handle partial failures gracefully', async () => {
      const notificationDto = {
        userId: 'user-123',
        title: 'Test Notification',
        message: 'Test message',
        channels: ['email', 'sms'],
        email: 'test@example.com',
        phone: '+1234567890',
      };

      emailService.send.mockRejectedValue(new Error('Email failed'));

      const result = await service.sendMultiChannel(notificationDto);

      expect(result).toEqual({
        email: { success: false, error: 'Email failed' },
        sms: { messageId: 'sms-id', success: true },
      });
    });
  });
});
```

### S7 业务服务测试骨架

```typescript
import { CartService } from '@/cart/cart.service';
import { CartRepository } from '@/cart/cart.repository';
import { ProductService } from '@/product/product.service';
import { InventoryService } from '@/inventory/inventory.service';

describe('CartService', () => {
  let service: CartService;
  let cartRepository: CartRepository;
  let productService: ProductService;
  let inventoryService: InventoryService;

  const mockCartRepository = {
    findByUserId: jest.fn(),
    findByUserIdAndSkuId: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    updateQuantity: jest.fn(),
    clearByUserId: jest.fn(),
    countByUserId: jest.fn(),
  };

  const mockProductService = {
    findById: jest.fn(),
    findBySkuId: jest.fn(),
    validateProduct: jest.fn(),
  };

  const mockInventoryService = {
    checkStock: jest.fn(),
    reserveStock: jest.fn(),
    releaseStock: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: CartRepository,
          useValue: mockCartRepository,
        },
        {
          provide: ProductService,
          useValue: mockProductService,
        },
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    cartRepository = module.get<CartRepository>(CartRepository);
    productService = module.get<ProductService>(ProductService);
    inventoryService = module.get<InventoryService>(InventoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addItemToCart', () => {
    it('should add new item to cart', async () => {
      const userId = 'user-123';
      const itemDto = {
        productId: 'product-123',
        skuId: 'sku-123',
        quantity: 2,
      };

      const product = {
        id: 'product-123',
        name: 'Test Product',
        price: 100,
        stock: 10,
      };

      const existingCart = [];
      const expectedCartItem = {
        id: 'cart-item-123',
        userId,
        productId: itemDto.productId,
        skuId: itemDto.skuId,
        quantity: itemDto.quantity,
        price: product.price,
        addedAt: new Date(),
      };

      mockCartRepository.findByUserId.mockResolvedValue(existingCart);
      mockProductService.findBySkuId.mockResolvedValue(product);
      mockInventoryService.checkStock.mockResolvedValue(true);
      mockCartRepository.save.mockResolvedValue(expectedCartItem);

      const result = await service.addItemToCart(userId, itemDto);

      expect(mockCartRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(mockProductService.findBySkuId).toHaveBeenCalledWith(itemDto.skuId);
      expect(mockInventoryService.checkStock).toHaveBeenCalledWith(itemDto.skuId, itemDto.quantity);
      expect(mockCartRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          productId: itemDto.productId,
          skuId: itemDto.skuId,
          quantity: itemDto.quantity,
          price: product.price,
        })
      );
      expect(result).toEqual(expectedCartItem);
    });

    it('should update quantity for existing item', async () => {
      const userId = 'user-123';
      const itemDto = {
        productId: 'product-123',
        skuId: 'sku-123',
        quantity: 2,
      };

      const existingCartItem = {
        id: 'cart-item-123',
        userId,
        productId: itemDto.productId,
        skuId: itemDto.skuId,
        quantity: 1,
        price: 100,
      };

      const updatedCartItem = {
        ...existingCartItem,
        quantity: 3, // 1 + 2
      };

      mockCartRepository.findByUserIdAndSkuId.mockResolvedValue(existingCartItem);
      mockCartRepository.save.mockResolvedValue(updatedCartItem);

      const result = await service.addItemToCart(userId, itemDto);

      expect(mockCartRepository.findByUserIdAndSkuId).toHaveBeenCalledWith(userId, itemDto.skuId);
      expect(mockCartRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: existingCartItem.id,
          quantity: 3,
        })
      );
      expect(result).toEqual(updatedCartItem);
    });

    it('should throw error when insufficient stock', async () => {
      const userId = 'user-123';
      const itemDto = {
        productId: 'product-123',
        skuId: 'sku-123',
        quantity: 10,
      };

      mockProductService.findBySkuId.mockResolvedValue({ id: 'product-123' });
      mockInventoryService.checkStock.mockResolvedValue(false);

      await expect(service.addItemToCart(userId, itemDto)).rejects.toThrow('Insufficient stock');

      expect(mockInventoryService.checkStock).toHaveBeenCalledWith(itemDto.skuId, itemDto.quantity);
      expect(mockCartRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error when quantity exceeds limit', async () => {
      const userId = 'user-123';
      const itemDto = {
        productId: 'product-123',
        skuId: 'sku-123',
        quantity: 1000, // 超过限制
      };

      await expect(service.addItemToCart(userId, itemDto)).rejects.toThrow('Quantity exceeds limit');

      expect(mockProductService.findBySkuId).not.toHaveBeenCalled();
      expect(mockInventoryService.checkStock).not.toHaveBeenCalled();
      expect(mockCartRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('removeFromCart', () => {
    it('should remove item from cart', async () => {
      const userId = 'user-123';
      const skuId = 'sku-123';

      const existingItem = {
        id: 'cart-item-123',
        userId,
        skuId,
        quantity: 2,
      };

      mockCartRepository.findByUserIdAndSkuId.mockResolvedValue(existingItem);
      mockCartRepository.remove.mockResolvedValue(undefined);

      await service.removeFromCart(userId, skuId);

      expect(mockCartRepository.findByUserIdAndSkuId).toHaveBeenCalledWith(userId, skuId);
      expect(mockCartRepository.remove).toHaveBeenCalledWith(existingItem);
    });

    it('should throw error when item not found', async () => {
      const userId = 'user-123';
      const skuId = 'non-existent-sku';

      mockCartRepository.findByUserIdAndSkuId.mockResolvedValue(null);

      await expect(service.removeFromCart(userId, skuId)).rejects.toThrow('Item not found in cart');

      expect(mockCartRepository.remove).not.toHaveBeenCalled();
    });
  });
});
```

## 🌐 E2E测试骨架

### S8 API端到端测试骨架

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('API E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication API', () => {
    describe('POST /auth/login', () => {
      it('should login successfully with valid credentials', () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({
            username: 'testuser',
            password: 'password123',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('access_token');
            expect(res.body).toHaveProperty('user');
            expect(res.body.user).toHaveProperty('id');
            expect(res.body.user).toHaveProperty('username');
            expect(res.body.user).not.toHaveProperty('password');
          });
      });

      it('should return 401 for invalid credentials', () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({
            username: 'testuser',
            password: 'wrongpassword',
          })
          .expect(401)
          .expect((res) => {
            expect(res.body).toHaveProperty('message');
            expect(res.body.message).toContain('Unauthorized');
          });
      });

      it('should return 400 for missing credentials', () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({})
          .expect(400)
          .expect((res) => {
            expect(res.body).toHaveProperty('message');
            expect(res.body.message).toContain('username');
            expect(res.body.message).toContain('password');
          });
      });
    });

    describe('POST /auth/register', () => {
      it('should register new user successfully', () => {
        const newUser = {
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User',
        };

        return request(app.getHttpServer())
          .post('/auth/register')
          .send(newUser)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('username', newUser.username);
            expect(res.body).toHaveProperty('email', newUser.email);
            expect(res.body).toHaveProperty('firstName', newUser.firstName);
            expect(res.body).toHaveProperty('lastName', newUser.lastName);
            expect(res.body).not.toHaveProperty('password');
          });
      });

      it('should return 400 for duplicate username', () => {
        const duplicateUser = {
          username: 'testuser', // 假设已存在
          email: 'another@example.com',
          password: 'password123',
          firstName: 'Another',
          lastName: 'User',
        };

        return request(app.getHttpServer())
          .post('/auth/register')
          .send(duplicateUser)
          .expect(400)
          .expect((res) => {
            expect(res.body).toHaveProperty('message');
            expect(res.body.message).toContain('username');
          });
      });
    });
  });

  describe('Cart API', () => {
    let authToken: string;

    beforeAll(async () => {
      // 登录获取token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        });

      authToken = loginResponse.body.access_token;
    });

    describe('GET /cart', () => {
      it('should get user cart', () => {
        return request(app.getHttpServer())
          .get('/cart')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body.items)).toBe(true);
            expect(res.body).toHaveProperty('totalAmount');
            expect(res.body).toHaveProperty('totalItems');
          });
      });

      it('should return 401 without authentication', () => {
        return request(app.getHttpServer())
          .get('/cart')
          .expect(401);
      });
    });

    describe('POST /cart/items', () => {
      it('should add item to cart', () => {
        const newItem = {
          productId: 'product-123',
          skuId: 'sku-123',
          quantity: 2,
        };

        return request(app.getHttpServer())
          .post('/cart/items')
          .set('Authorization', `Bearer ${authToken}`)
          .send(newItem)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('productId', newItem.productId);
            expect(res.body).toHaveProperty('skuId', newItem.skuId);
            expect(res.body).toHaveProperty('quantity', newItem.quantity);
          });
      });

      it('should return 400 for invalid item data', () => {
        const invalidItem = {
          productId: '',
          skuId: 'sku-123',
          quantity: 0,
        };

        return request(app.getHttpServer())
          .post('/cart/items')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidItem)
          .expect(400);
      });
    });
  });
});
```

## 📋 导航与定位

### 问题类型导航

| 问题类型 | 关联骨架 | 修复示例 | 源文件补丁 |
|----------|----------|----------|------------|
| 依赖注入缺失 | S1 | F1.1, F1.2 | A1 |
| 异步Mock问题 | S2 | F2.1, F2.2 | A2 |
| 定时器清理 | S3 | F4.1, F4.2 | A4 |
| 事务与数据库 | S4 | F3.1, F3.2 | A3 |
| 缓存断言修订 | S5 | F5.1 | A5 |
| 通知服务测试 | S6 | F2.2 | A2 |
| 业务逻辑测试 | S7 | F5.2, F6.1 | A5 |
| API集成测试 | S8 | - | - |

### 快速定位指南

#### 根据错误信息定位
- **"Cannot resolve dependency"** → S1, F1.1, A1
- **"Cannot read property 'then'"** → S2, F2.1, A2
- **"QueryRunner connection failed"** → S4, F3.1, A3
- **"Jest has detected open handles"** → S3, F4.1, A4
- **"Expected mock to be called with"** → S5, F5.1, A5

#### 根据文件类型定位
- **Guard测试** → S2, F2.1, A2
- **Service测试** → S1, S5, S6, S7
- **Controller测试** → S8
- **Repository测试** → S4, F3.1, A3
- **定时器相关** → S3, F4.1, F4.2, A4

#### 根据测试场景定位
- **依赖注入问题** → S1
- **异步处理问题** → S2, S6
- **事务处理问题** → S4
- **缓存相关问题** → S5
- **业务逻辑问题** → S7
- **API集成问题** → S8

---

**文档创建时间**: 2025-10-04  
**文档版本**: v1.0  
**下次更新**: 根据新的测试场景需求更新