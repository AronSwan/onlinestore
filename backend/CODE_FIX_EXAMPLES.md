# 代码修复示例 - 技术实现细节

> 📋 **文档索引**: 
> - 📊 [整体改进计划](./BACKEND_IMPROVEMENT_PLAN.md) - 8周改进路线图
> - 🔧 [关键修正清单](./CRITICAL_FIXES_SUMMARY.md) - 问题修正摘要
> - 💻 [代码修复示例](./CODE_FIX_EXAMPLES.md) - 技术实现细节（当前文档）
> - 🧪 [测试骨架示例](./TEST_SKELETON_EXAMPLES.md) - 测试用例骨架
> - 🔧 [源文件补丁片段](./SOURCE_PATCH_FRAGMENTS.md) - 可直接落盘的源文件
> - 🧪 [测试执行计划](./TEST_EXECUTION_PLAN.md) - 完整测试执行指南
> - 📊 [测试执行报告](./TEST_EXECUTION_REPORT.md) - 测试执行结果

## 🎯 概述

本文档提供了针对测试执行报告中发现的各类问题的具体修复示例，包括依赖注入、异步Mock、事务处理、定时器管理和断言修正等方面的最小实现示例。

## 🔧 依赖注入修复示例

### F1.1 AddressService 依赖注入修复

**问题**: `AddressCacheService` 依赖无法解析
**影响文件**: `src/address/address.spec.ts`

```typescript
// 修复前 - 缺失依赖
beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AddressService,
      AddressValidationService,
      // 缺失 AddressCacheService
    ],
  }).compile();
});

// 修复后 - 完整依赖配置
beforeEach(async () => {
  const mockAddressCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AddressService,
      AddressValidationService,
      {
        provide: AddressCacheService,
        useValue: mockAddressCacheService,
      },
    ],
  }).compile();
});
```

### F1.2 复杂依赖链修复

**问题**: 多层依赖注入失败
**影响文件**: `src/payment/payment.service.spec.ts`

```typescript
// 修复前 - 简单Mock无法满足复杂依赖
const mockPaymentRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
};

// 修复后 - 完整依赖链配置
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

const mockDataSource = {
  createQueryRunner: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      save: jest.fn(),
      remove: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    },
  })),
};

beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      PaymentService,
      {
        provide: getRepositoryToken(Payment),
        useValue: mockPaymentRepository,
      },
      {
        provide: DataSource,
        useValue: mockDataSource,
      },
    ],
  }).compile();
});
```

## 🔄 异步Mock修复示例

### F2.1 Guard异步方法Mock修复

**问题**: Mock方法配置不正确，导致异步方法返回同步值
**影响文件**: `src/auth/guards/roles.guard.spec.ts`

```typescript
// 修复前 - 同步返回值
const mockReflector = {
  getAllAndOverride: jest.fn(() => []), // 同步返回
};

// 修复后 - 正确的异步Mock
const mockReflector = {
  getAllAndOverride: jest.fn().mockReturnValue([]), // 明确返回值
  get: jest.fn().mockReturnValue('roles'),
};

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

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

  it('should allow access when no roles required', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([]);
    
    const context = {
      getHandler: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 1, roles: ['user'] },
        }),
      }),
    } as any;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow access when user has required role', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['admin']);
    
    const context = {
      getHandler: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 1, roles: ['admin', 'user'] },
        }),
      }),
    } as any;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
```

### F2.2 服务层异步方法Mock修复

**问题**: 服务方法异步调用Mock配置错误
**影响文件**: `src/notification/notification.service.spec.ts`

```typescript
// 修复前 - 不完整的Mock配置
const mockEmailService = {
  send: jest.fn(), // 缺少返回值配置
};

// 修复后 - 完整的异步Mock配置
const mockEmailService = {
  send: jest.fn().mockResolvedValue({ messageId: 'test-id', success: true }),
  sendBatch: jest.fn().mockResolvedValue([
    { messageId: 'test-id-1', success: true },
    { messageId: 'test-id-2', success: true },
  ]),
  getStatus: jest.fn().mockResolvedValue({ status: 'delivered' }),
};

const mockSmsService = {
  send: jest.fn().mockResolvedValue({ messageId: 'sms-id', success: true }),
  getStatus: jest.fn().mockResolvedValue({ status: 'delivered' }),
};

describe('NotificationService', () => {
  let service: NotificationService;
  let emailService: EmailService;
  let smsService: SmsService;

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
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    emailService = module.get<EmailService>(EmailService);
    smsService = module.get<SmsService>(SmsService);
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const emailDto = {
        to: 'test@example.com',
        subject: 'Test Subject',
        content: 'Test Content',
      };

      const result = await service.sendEmail(emailDto);
      
      expect(emailService.send).toHaveBeenCalledWith(emailDto);
      expect(result).toEqual({ messageId: 'test-id', success: true });
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
});
```

## 🗄️ 事务处理修复示例

### F3.1 数据库事务Mock修复

**问题**: QueryRunner连接失败
**影响文件**: `src/payment/payment.service.spec.ts`

```typescript
// 修复前 - 不完整的事务Mock
const mockQueryRunner = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
};

// 修复后 - 完整的事务Mock配置
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
  },
});

describe('PaymentService', () => {
  let service: PaymentService;
  let dataSource: DataSource;
  let mockQueryRunner: any;

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
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    dataSource = module.get<DataSource>(DataSource);
  });

  describe('processPayment', () => {
    it('should process payment with transaction', async () => {
      const paymentDto = {
        orderId: 'order-123',
        amount: 100,
        method: 'credit_card',
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
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result).toEqual(expectedPayment);
    });

    it('should rollback transaction on error', async () => {
      const paymentDto = {
        orderId: 'order-123',
        amount: 100,
        method: 'credit_card',
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
});
```

### F3.2 分布式事务处理

**问题**: 跨服务事务处理不完整
**影响文件**: `src/orders/orders.service.spec.ts`

```typescript
// 分布式事务Mock配置
const createDistributedTransactionMock = () => ({
  start: jest.fn().mockResolvedValue({ transactionId: 'tx-123' }),
  commit: jest.fn().mockResolvedValue({ success: true }),
  rollback: jest.fn().mockResolvedValue({ success: true }),
  addParticipant: jest.fn().mockResolvedValue({ participantId: 'p-123' }),
});

describe('OrdersService', () => {
  let service: OrdersService;
  let mockDistributedTx: any;

  beforeEach(async () => {
    mockDistributedTx = createDistributedTransactionMock();
    
    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: 'DISTRIBUTED_TRANSACTION_SERVICE',
          useValue: mockDistributedTx,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('createOrderWithPayment', () => {
    it('should handle distributed transaction successfully', async () => {
      const orderDto = {
        userId: 'user-123',
        items: [{ productId: 'p-1', quantity: 2 }],
        paymentMethod: 'credit_card',
      };

      const result = await service.createOrderWithPayment(orderDto);

      expect(mockDistributedTx.start).toHaveBeenCalled();
      expect(mockDistributedTx.addParticipant).toHaveBeenCalledTimes(2); // order + payment
      expect(mockDistributedTx.commit).toHaveBeenCalled();
      expect(mockDistributedTx.rollback).not.toHaveBeenCalled();
      expect(result).toHaveProperty('orderId');
      expect(result).toHaveProperty('paymentId');
    });

    it('should rollback distributed transaction on payment failure', async () => {
      const orderDto = {
        userId: 'user-123',
        items: [{ productId: 'p-1', quantity: 2 }],
        paymentMethod: 'credit_card',
      };

      // Mock payment service failure
      jest.spyOn(service, 'processPayment').mockRejectedValue(new Error('Payment failed'));

      await expect(service.createOrderWithPayment(orderDto)).rejects.toThrow('Payment failed');

      expect(mockDistributedTx.start).toHaveBeenCalled();
      expect(mockDistributedTx.rollback).toHaveBeenCalled();
      expect(mockDistributedTx.commit).not.toHaveBeenCalled();
    });
  });
});
```

## ⏰ 定时器管理修复示例

### F4.1 定时器清理机制

**问题**: Jest检测到未关闭的定时器
**影响文件**: `src/monitoring/monitoring.service.spec.ts`

```typescript
// 修复前 - 缺少定时器清理
describe('MonitoringService', () => {
  let service: MonitoringService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [MonitoringService],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
  });

  it('should collect metrics periodically', () => {
    service.startMetricsCollection();
    // 测试逻辑...
  });
});

// 修复后 - 完整的定时器管理
describe('MonitoringService', () => {
  let service: MonitoringService;

  beforeEach(async () => {
    // 使用假定时器
    jest.useFakeTimers();
    
    const module = await Test.createTestingModule({
      providers: [MonitoringService],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
  });

  afterEach(() => {
    // 清理所有定时器
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should collect metrics periodically', () => {
    const collectMetricsSpy = jest.spyOn(service, 'collectMetrics');
    
    service.startMetricsCollection();
    
    // 验证定时器已设置
    expect(setInterval).toHaveBeenCalled();
    
    // 快进时间触发定时器
    jest.advanceTimersByTime(60000); // 1分钟
    
    expect(collectMetricsSpy).toHaveBeenCalled();
    
    service.stopMetricsCollection();
  });

  it('should handle multiple intervals correctly', () => {
    const collectMetricsSpy = jest.spyOn(service, 'collectMetrics');
    const cleanupSpy = jest.spyOn(service, 'cleanup');
    
    service.startMetricsCollection();
    service.startHealthCheck();
    
    // 验证两个定时器都已设置
    expect(setInterval).toHaveBeenCalledTimes(2);
    
    // 快进时间触发两个定时器
    jest.advanceTimersByTime(120000); // 2分钟
    
    expect(collectMetricsSpy).toHaveBeenCalledTimes(2);
    expect(cleanupSpy).toHaveBeenCalledTimes(2);
    
    service.stopMetricsCollection();
    service.stopHealthCheck();
  });
});
```

### F4.2 异步定时器处理

**问题**: 异步定时器处理不完整
**影响文件**: `src/cache/cache-cleanup.service.spec.ts`

```typescript
// 修复前 - 同步定时器处理
const mockCacheCleanupService = {
  cleanup: jest.fn(),
};

// 修复后 - 异步定时器处理
const mockCacheCleanupService = {
  cleanup: jest.fn().mockResolvedValue({ deletedCount: 10 }),
  scheduleCleanup: jest.fn(),
  cancelCleanup: jest.fn(),
};

describe('CacheCleanupService', () => {
  let service: CacheCleanupService;

  beforeEach(async () => {
    jest.useFakeTimers();
    
    const module = await Test.createTestingModule({
      providers: [
        CacheCleanupService,
        {
          provide: 'CACHE_REPOSITORY',
          useValue: {
            scan: jest.fn().mockResolvedValue(['key1', 'key2', 'key3']),
            del: jest.fn().mockResolvedValue(1),
          },
        },
      ],
    }).compile();

    service = module.get<CacheCleanupService>(CacheCleanupService);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('scheduled cleanup', () => {
    it('should schedule cleanup periodically', async () => {
      const cleanupSpy = jest.spyOn(service, 'cleanup');
      
      service.startScheduledCleanup();
      
      // 验证定时器已设置
      expect(setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        3600000 // 1小时
      );
      
      // 快进时间触发清理
      jest.advanceTimersByTime(3600000);
      
      // 等待异步操作完成
      await Promise.resolve();
      
      expect(cleanupSpy).toHaveBeenCalled();
      
      service.stopScheduledCleanup();
    });

    it('should handle cleanup errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock cleanup失败
      jest.spyOn(service, 'cleanup').mockRejectedValue(new Error('Cleanup failed'));
      
      service.startScheduledCleanup();
      
      // 快进时间触发清理
      jest.advanceTimersByTime(3600000);
      
      // 等待异步操作完成
      await Promise.resolve();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Cache cleanup failed:',
        expect.any(Error)
      );
      
      service.stopScheduledCleanup();
      consoleErrorSpy.mockRestore();
    });
  });
});
```

## ✅ 断言修复示例

### F5.1 缓存服务断言修复

**问题**: 缓存参数验证失败
**影响文件**: `src/cache/enhanced-cache.spec.ts`

```typescript
// 修复前 - 不准确的断言
expect(cacheService.set).toHaveBeenCalledWith(
  'key',
  'value',
  3600
);

// 修复后 - 精确的断言配置
describe('EnhancedCacheService', () => {
  let service: EnhancedCacheService;
  let cacheRepository: any;

  beforeEach(async () => {
    cacheRepository = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      ttl: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        EnhancedCacheService,
        {
          provide: 'CACHE_REPOSITORY',
          useValue: cacheRepository,
        },
      ],
    }).compile();

    service = module.get<EnhancedCacheService>(EnhancedCacheService);
  });

  describe('set', () => {
    it('should set cache with correct parameters', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };
      const ttl = 3600;

      await service.set(key, value, ttl);

      expect(cacheRepository.set).toHaveBeenCalledWith(
        'enhanced:' + key, // 带前缀的键
        JSON.stringify(value), // 序列化的值
        'EX', // Redis过期命令
        ttl // 过期时间
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

      expect(cacheRepository.get).toHaveBeenCalledWith('enhanced:' + key);
      expect(result).toBeNull();
    });

    it('should handle JSON parsing errors', async () => {
      const key = 'test-key';
      const invalidJson = '{ invalid json }';

      cacheRepository.get.mockResolvedValue(invalidJson);

      const result = await service.get(key);

      expect(cacheRepository.get).toHaveBeenCalledWith('enhanced:' + key);
      expect(result).toBeNull();
    });
  });
});
```

### F5.2 业务逻辑断言修复

**问题**: 业务逻辑测试断言不完整
**影响文件**: `src/cart/cart.service.spec.ts`

```typescript
// 修复前 - 简单断言
expect(result).toBe(true);

// 修复后 - 完整的业务逻辑断言
describe('CartService', () => {
  let service: CartService;
  let cartRepository: any;
  let productRepository: any;

  beforeEach(async () => {
    cartRepository = {
      findByUserId: jest.fn(),
      findByUserIdAndSkuId: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      updateQuantity: jest.fn(),
    };

    productRepository = {
      findById: jest.fn(),
      checkStock: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: 'CART_REPOSITORY',
          useValue: cartRepository,
        },
        {
          provide: 'PRODUCT_REPOSITORY',
          useValue: productRepository,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
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

      cartRepository.findByUserId.mockResolvedValue(existingCart);
      productRepository.findById.mockResolvedValue(product);
      productRepository.checkStock.mockResolvedValue(true);
      cartRepository.save.mockResolvedValue(expectedCartItem);

      const result = await service.addItemToCart(userId, itemDto);

      expect(cartRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(productRepository.findById).toHaveBeenCalledWith(itemDto.productId);
      expect(productRepository.checkStock).toHaveBeenCalledWith(itemDto.skuId, itemDto.quantity);
      expect(cartRepository.save).toHaveBeenCalledWith(
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

      cartRepository.findByUserIdAndSkuId.mockResolvedValue(existingCartItem);
      cartRepository.save.mockResolvedValue(updatedCartItem);

      const result = await service.addItemToCart(userId, itemDto);

      expect(cartRepository.findByUserIdAndSkuId).toHaveBeenCalledWith(userId, itemDto.skuId);
      expect(cartRepository.save).toHaveBeenCalledWith(
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

      productRepository.checkStock.mockResolvedValue(false);

      await expect(service.addItemToCart(userId, itemDto)).rejects.toThrow('Insufficient stock');

      expect(productRepository.checkStock).toHaveBeenCalledWith(itemDto.skuId, itemDto.quantity);
      expect(cartRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error when quantity exceeds limit', async () => {
      const userId = 'user-123';
      const itemDto = {
        productId: 'product-123',
        skuId: 'sku-123',
        quantity: 1000, // 超过限制
      };

      await expect(service.addItemToCart(userId, itemDto)).rejects.toThrow('Quantity exceeds limit');

      expect(productRepository.checkStock).not.toHaveBeenCalled();
      expect(cartRepository.save).not.toHaveBeenCalled();
    });
  });
});
```

## 🔄 综合修复示例

### F6.1 复杂服务完整修复

**问题**: 多个问题同时存在的复杂服务
**影响文件**: `src/orders/orders.service.spec.ts`

```typescript
// 完整的复杂服务修复示例
describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: any;
  let paymentService: any;
  let inventoryService: any;
  let notificationService: any;
  let dataSource: any;
  let mockQueryRunner: any;

  beforeEach(async () => {
    jest.useFakeTimers();
    
    // 完整的Mock配置
    orderRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
        getMany: jest.fn(),
      })),
    };

    paymentService = {
      processPayment: jest.fn(),
      refundPayment: jest.fn(),
      getPaymentStatus: jest.fn(),
    };

    inventoryService = {
      reserveItems: jest.fn(),
      releaseReservation: jest.fn(),
      confirmReservation: jest.fn(),
    };

    notificationService = {
      sendOrderConfirmation: jest.fn(),
      sendPaymentFailure: jest.fn(),
    };

    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        save: jest.fn(),
        remove: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
      },
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: orderRepository,
        },
        {
          provide: 'PAYMENT_SERVICE',
          useValue: paymentService,
        },
        {
          provide: 'INVENTORY_SERVICE',
          useValue: inventoryService,
        },
        {
          provide: 'NOTIFICATION_SERVICE',
          useValue: notificationService,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('createOrder', () => {
    it('should create order successfully with complete transaction', async () => {
      const orderDto = {
        userId: 'user-123',
        items: [
          { productId: 'product-1', skuId: 'sku-1', quantity: 2, price: 100 },
          { productId: 'product-2', skuId: 'sku-2', quantity: 1, price: 50 },
        ],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          country: 'Test Country',
        },
        paymentMethod: 'credit_card',
      };

      const expectedOrder = {
        id: 'order-123',
        userId: orderDto.userId,
        items: orderDto.items,
        totalAmount: 250, // 100*2 + 50*1
        status: 'pending',
        createdAt: new Date(),
      };

      const paymentResult = {
        id: 'payment-123',
        orderId: expectedOrder.id,
        amount: expectedOrder.totalAmount,
        status: 'completed',
      };

      // Mock所有依赖服务调用
      orderRepository.create.mockReturnValue(expectedOrder);
      orderRepository.save.mockResolvedValue(expectedOrder);
      inventoryService.reserveItems.mockResolvedValue({ reservationId: 'res-123' });
      paymentService.processPayment.mockResolvedValue(paymentResult);
      inventoryService.confirmReservation.mockResolvedValue(true);
      notificationService.sendOrderConfirmation.mockResolvedValue({ messageId: 'msg-123' });

      const result = await service.createOrder(orderDto);

      // 验证事务流程
      expect(dataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();

      // 验证业务逻辑
      expect(inventoryService.reserveItems).toHaveBeenCalledWith(
        expectedOrder.items,
        expectedOrder.id
      );
      expect(paymentService.processPayment).toHaveBeenCalledWith({
        orderId: expectedOrder.id,
        amount: expectedOrder.totalAmount,
        method: orderDto.paymentMethod,
      });
      expect(inventoryService.confirmReservation).toHaveBeenCalledWith('res-123');
      expect(notificationService.sendOrderConfirmation).toHaveBeenCalledWith(
        expectedOrder.userId,
        expectedOrder.id
      );

      // 验证事务提交
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();

      // 验证返回结果
      expect(result).toEqual({
        order: expectedOrder,
        payment: paymentResult,
      });
    });

    it('should rollback transaction on payment failure', async () => {
      const orderDto = {
        userId: 'user-123',
        items: [{ productId: 'product-1', skuId: 'sku-1', quantity: 2, price: 100 }],
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          country: 'Test Country',
        },
        paymentMethod: 'credit_card',
      };

      const expectedOrder = {
        id: 'order-123',
        userId: orderDto.userId,
        items: orderDto.items,
        totalAmount: 200,
        status: 'pending',
        createdAt: new Date(),
      };

      // Mock支付失败
      orderRepository.create.mockReturnValue(expectedOrder);
      orderRepository.save.mockResolvedValue(expectedOrder);
      inventoryService.reserveItems.mockResolvedValue({ reservationId: 'res-123' });
      paymentService.processPayment.mockRejectedValue(new Error('Payment failed'));
      inventoryService.releaseReservation.mockResolvedValue(true);
      notificationService.sendPaymentFailure.mockResolvedValue({ messageId: 'msg-456' });

      await expect(service.createOrder(orderDto)).rejects.toThrow('Payment failed');

      // 验证事务回滚
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();

      // 验证库存释放
      expect(inventoryService.releaseReservation).toHaveBeenCalledWith('res-123');

      // 验证失败通知
      expect(notificationService.sendPaymentFailure).toHaveBeenCalledWith(
        expectedOrder.userId,
        expectedOrder.id
      );

      // 验证事务未提交
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('getOrderWithRetry', () => {
    it('should retry on temporary failure', async () => {
      const orderId = 'order-123';
      const expectedOrder = {
        id: orderId,
        userId: 'user-123',
        status: 'completed',
      };

      // Mock前两次失败，第三次成功
      orderRepository.findOne
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(expectedOrder);

      const result = await service.getOrderWithRetry(orderId, 3, 1000);

      expect(orderRepository.findOne).toHaveBeenCalledTimes(3);
      expect(result).toEqual(expectedOrder);
    });

    it('should fail after max retries', async () => {
      const orderId = 'order-123';

      // Mock所有尝试都失败
      orderRepository.findOne.mockRejectedValue(new Error('Persistent failure'));

      await expect(service.getOrderWithRetry(orderId, 3, 1000)).rejects.toThrow('Persistent failure');

      expect(orderRepository.findOne).toHaveBeenCalledTimes(3);
    });
  });
});
```

## 📝 最佳实践总结

### 依赖注入最佳实践
1. **完整Mock配置**: 确保所有依赖都有对应的Mock实现
2. **类型安全**: 使用TypeScript类型确保Mock接口正确
3. **默认值设置**: 为Mock方法提供合理的默认返回值
4. **状态隔离**: 每个测试用例前重置Mock状态

### 异步Mock最佳实践
1. **Promise返回**: 确保异步方法返回Promise对象
2. **错误处理**: 测试成功和失败场景
3. **时序控制**: 使用jest.useFakeTimers控制异步时序
4. **等待机制**: 正确等待异步操作完成

### 事务处理最佳实践
1. **完整生命周期**: Mock事务的完整生命周期
2. **错误回滚**: 测试事务回滚机制
3. **资源清理**: 确保事务资源正确释放
4. **并发处理**: 测试并发事务场景

### 定时器管理最佳实践
1. **假定时器**: 使用jest.useFakeTimers控制定时器
2. **完整清理**: 在afterEach中清理所有定时器
3. **时序验证**: 验证定时器的触发时机
4. **异步处理**: 正确处理异步定时器回调

### 断言最佳实践
1. **精确匹配**: 使用精确的参数匹配
2. **完整验证**: 验证所有重要的调用和返回值
3. **边界条件**: 测试边界条件和异常情况
4. **业务逻辑**: 验证业务逻辑的正确性

---

**文档创建时间**: 2025-10-04  
**文档版本**: v1.0  
**下次更新**: 根据实际修复情况更新