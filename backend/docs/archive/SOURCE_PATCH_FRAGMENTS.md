# 源文件补丁片段 - 可直接落盘的源文件

> 📋 **文档索引**: 
> - 📊 [整体改进计划](./BACKEND_IMPROVEMENT_PLAN.md) - 8周改进路线图
> - 🔧 [关键修正清单](./CRITICAL_FIXES_SUMMARY.md) - 问题修正摘要
> - 💻 [代码修复示例](./CODE_FIX_EXAMPLES.md) - 技术实现细节
> - 🧪 [测试骨架示例](./TEST_SKELETON_EXAMPLES.md) - 测试用例骨架
> - 🔧 [源文件补丁片段](./SOURCE_PATCH_FRAGMENTS.md) - 可直接落盘的源文件（当前文档）
> - 🧪 [测试执行计划](./TEST_EXECUTION_PLAN.md) - 完整测试执行指南
> - 📊 [测试执行报告](./TEST_EXECUTION_REPORT.md) - 测试执行结果

## 🎯 概述

本文档提供了可直接复制粘贴到项目中的最小补丁片段，用于快速修复测试执行报告中发现的关键问题。每个补丁都经过精心设计，可以直接应用到对应的源文件中。

## 🔧 A1: 依赖注入修复补丁

### A1.1 AddressService 测试文件补丁

**目标文件**: `src/address/address.spec.ts`

```typescript
// 在文件开头添加导入
import { AddressCacheService } from './address-cache.service';
import { AddressValidationService } from './address-validation.service';

// 替换现有的 beforeEach 块
beforeEach(async () => {
  const mockAddressCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
  };

  const mockAddressValidationService = {
    validateAddress: jest.fn(),
    validatePostalCode: jest.fn(),
    validatePhoneNumber: jest.fn(),
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
  })
  .overrideProvider(AddressValidationService)
  .useValue(mockAddressValidationService)
  .compile();

  service = module.get<AddressService>(AddressService);
  cacheService = module.get<AddressCacheService>(AddressCacheService);
  validationService = module.get<AddressValidationService>(AddressValidationService);
});
```

### A1.2 PaymentService 测试文件补丁

**目标文件**: `src/payment/payment.service.spec.ts`

```typescript
// 在文件开头添加导入
import { DataSource } from 'typeorm';
import { PaymentRepository } from './payment.repository';

// 替换现有的 Mock 配置
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

// 替换现有的 beforeEach 块
beforeEach(async () => {
  const mockQueryRunner = createMockQueryRunner();
  
  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

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

  service = module.get<PaymentService>(PaymentService);
  repository = module.get<PaymentRepository>(getRepositoryToken(Payment));
  dataSource = module.get<DataSource>(DataSource);
});
```

## 🔄 A2: 异步Mock修复补丁

### A2.1 RolesGuard 测试文件补丁

**目标文件**: `src/auth/guards/roles.guard.spec.ts`

```typescript
// 替换现有的 Mock 配置
const mockReflector = {
  getAllAndOverride: jest.fn().mockReturnValue([]),
  get: jest.fn().mockReturnValue('roles'),
};

// 替换现有的 beforeEach 块
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

// 添加完整的测试用例
describe('canActivate', () => {
  it('should allow access when no roles required', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([]);
    
    const context = {
      getHandler: () => (() => {}),
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
      getHandler: () => (() => {}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 1, roles: ['admin', 'user'] },
        }),
      }),
    } as any;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should deny access when user lacks required role', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(['admin']);
    
    const context = {
      getHandler: () => (() => {}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 1, roles: ['user'] },
        }),
      }),
    } as any;

    const result = await guard.canActivate(context);
    expect(result).toBe(false);
  });
});
```

### A2.2 NotificationService 测试文件补丁

**目标文件**: `src/notification/notification.service.spec.ts`

```typescript
// 替换现有的 Mock 配置
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

// 替换现有的 beforeEach 块
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

// 添加完整的测试用例
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
```

## 🗄️ A3: 事务处理修复补丁

### A3.1 PaymentService 事务处理补丁

**目标文件**: `src/payment/payment.service.spec.ts`

```typescript
// 在文件开头添加定时器管理
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

// 添加完整的事务测试用例
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

    const mockQueryRunner = createMockQueryRunner();
    mockQueryRunner.manager.save.mockResolvedValue(expectedPayment);
    
    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    // 重新创建服务实例以使用新的 mock
    const module = await Test.createTestingModule({
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

    const service = module.get<PaymentService>(PaymentService);

    const result = await service.processPayment(paymentDto);

    expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
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

    const mockQueryRunner = createMockQueryRunner();
    mockQueryRunner.manager.save.mockRejectedValue(new Error('Database error'));
    
    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const module = await Test.createTestingModule({
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

    const service = module.get<PaymentService>(PaymentService);

    await expect(service.processPayment(paymentDto)).rejects.toThrow('Database error');

    expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
    expect(mockQueryRunner.connect).toHaveBeenCalled();
    expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.release).toHaveBeenCalled();
    expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
  });
});
```

### A3.2 OrdersService 分布式事务补丁

**目标文件**: `src/orders/orders.service.spec.ts`

```typescript
// 添加分布式事务 Mock
const createDistributedTransactionMock = () => ({
  start: jest.fn().mockResolvedValue({ transactionId: 'tx-123' }),
  commit: jest.fn().mockResolvedValue({ success: true }),
  rollback: jest.fn().mockResolvedValue({ success: true }),
  addParticipant: jest.fn().mockResolvedValue({ participantId: 'p-123' }),
});

// 添加分布式事务测试用例
describe('createOrderWithPayment', () => {
  it('should handle distributed transaction successfully', async () => {
    const orderDto = {
      userId: 'user-123',
      items: [{ productId: 'p-1', quantity: 2 }],
      paymentMethod: 'credit_card',
    };

    const mockDistributedTx = createDistributedTransactionMock();
    
    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: 'ORDER_REPOSITORY',
          useValue: mockOrderRepository,
        },
        {
          provide: 'DISTRIBUTED_TRANSACTION_SERVICE',
          useValue: mockDistributedTx,
        },
      ],
    }).compile();

    const service = module.get<OrdersService>(OrdersService);

    const result = await service.createOrderWithPayment(orderDto);

    expect(mockDistributedTx.start).toHaveBeenCalled();
    expect(mockDistributedTx.addParticipant).toHaveBeenCalledTimes(2);
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

    const mockDistributedTx = createDistributedTransactionMock();
    
    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: 'ORDER_REPOSITORY',
          useValue: mockOrderRepository,
        },
        {
          provide: 'DISTRIBUTED_TRANSACTION_SERVICE',
          useValue: mockDistributedTx,
        },
      ],
    }).compile();

    const service = module.get<OrdersService>(OrdersService);
    
    // Mock payment service failure
    jest.spyOn(service, 'processPayment').mockRejectedValue(new Error('Payment failed'));

    await expect(service.createOrderWithPayment(orderDto)).rejects.toThrow('Payment failed');

    expect(mockDistributedTx.start).toHaveBeenCalled();
    expect(mockDistributedTx.rollback).toHaveBeenCalled();
    expect(mockDistributedTx.commit).not.toHaveBeenCalled();
  });
});
```

## ⏰ A4: 定时器清理修复补丁

### A4.1 MonitoringService 定时器补丁

**目标文件**: `src/monitoring/monitoring.service.spec.ts`

```typescript
// 在文件开头添加定时器管理
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
  jest.useRealTimers();
});

// 替换现有的测试用例
describe('startMetricsCollection', () => {
  it('should start collecting metrics periodically', () => {
    const collectMetricsSpy = jest.spyOn(service, 'collectMetrics');
    
    service.startMetricsCollection();
    
    // 验证定时器已设置
    expect(setInterval).toHaveBeenCalledWith(
      expect.any(Function),
      60000 // 默认1分钟间隔
    );
    
    // 快进时间触发定时器
    jest.advanceTimersByTime(60000);
    
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
```

### A4.2 CacheCleanupService 定时器补丁

**目标文件**: `src/cache/cache-cleanup.service.spec.ts`

```typescript
// 在文件开头添加定时器管理
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
  jest.useRealTimers();
});

// 添加定时器清理测试用例
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

  it('should cleanup all timers on stop', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    
    service.startScheduledCleanup();
    service.startHealthCheck();
    
    service.stopScheduledCleanup();
    service.stopHealthCheck();
    
    expect(clearIntervalSpy).toHaveBeenCalledTimes(2);
    
    clearIntervalSpy.mockRestore();
  });
});
```

## ✅ A5: 缓存断言修复补丁

### A5.1 EnhancedCacheService 断言补丁

**目标文件**: `src/cache/enhanced-cache.spec.ts`

```typescript
// 替换现有的测试用例
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
```

### A5.2 CartService 业务逻辑断言补丁

**目标文件**: `src/cart/cart.service.spec.ts`

```typescript
// 替换现有的测试用例
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
    productService.findBySkuId.mockResolvedValue(product);
    inventoryService.checkStock.mockResolvedValue(true);
    cartRepository.save.mockResolvedValue(expectedCartItem);

    const result = await service.addItemToCart(userId, itemDto);

    expect(cartRepository.findByUserId).toHaveBeenCalledWith(userId);
    expect(productService.findBySkuId).toHaveBeenCalledWith(itemDto.skuId);
    expect(inventoryService.checkStock).toHaveBeenCalledWith(itemDto.skuId, itemDto.quantity);
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

    productService.findBySkuId.mockResolvedValue({ id: 'product-123' });
    inventoryService.checkStock.mockResolvedValue(false);

    await expect(service.addItemToCart(userId, itemDto)).rejects.toThrow('Insufficient stock');

    expect(inventoryService.checkStock).toHaveBeenCalledWith(itemDto.skuId, itemDto.quantity);
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

    expect(productService.findBySkuId).not.toHaveBeenCalled();
    expect(inventoryService.checkStock).not.toHaveBeenCalled();
    expect(cartRepository.save).not.toHaveBeenCalled();
  });
});
```

## 📋 使用指南

### 应用补丁步骤

1. **定位目标文件**
   - 根据补丁描述找到对应的源文件
   - 确认文件路径和文件名匹配

2. **备份原文件**
   ```bash
   cp src/address/address.spec.ts src/address/address.spec.ts.backup
   ```

3. **应用补丁**
   - 复制对应的补丁代码
   - 替换文件中的相应部分
   - 保留文件的其他部分不变

4. **验证修复**
   ```bash
   npx jest src/address/address.spec.ts --verbose
   ```

### 补丁选择指南

| 问题类型 | 补丁编号 | 目标文件 | 验证命令 |
|----------|----------|----------|----------|
| 依赖注入失败 | A1.1 | `src/address/address.spec.ts` | `npx jest src/address/address.spec.ts` |
| 依赖注入失败 | A1.2 | `src/payment/payment.service.spec.ts` | `npx jest src/payment/payment.service.spec.ts` |
| 异步Mock问题 | A2.1 | `src/auth/guards/roles.guard.spec.ts` | `npx jest src/auth/guards/roles.guard.spec.ts` |
| 异步Mock问题 | A2.2 | `src/notification/notification.service.spec.ts` | `npx jest src/notification/notification.service.spec.ts` |
| 事务处理问题 | A3.1 | `src/payment/payment.service.spec.ts` | `npx jest src/payment/payment.service.spec.ts --detectOpenHandles` |
| 事务处理问题 | A3.2 | `src/orders/orders.service.spec.ts` | `npx jest src/orders/orders.service.spec.ts --detectOpenHandles` |
| 定时器泄漏 | A4.1 | `src/monitoring/monitoring.service.spec.ts` | `npx jest src/monitoring/monitoring.service.spec.ts --detectOpenHandles` |
| 定时器泄漏 | A4.2 | `src/cache/cache-cleanup.service.spec.ts` | `npx jest src/cache/cache-cleanup.service.spec.ts --detectOpenHandles` |
| 缓存断言错误 | A5.1 | `src/cache/enhanced-cache.spec.ts` | `npx jest src/cache/enhanced-cache.spec.ts` |
| 业务逻辑断言错误 | A5.2 | `src/cart/cart.service.spec.ts` | `npx jest src/cart/cart.service.spec.ts` |

### 注意事项

1. **导入检查**
   - 确保所有必要的导入都已添加
   - 检查导入路径是否正确

2. **Mock配置**
   - 确保Mock对象与实际接口匹配
   - 检查Mock方法的返回值类型

3. **异步处理**
   - 确保异步方法返回Promise
   - 正确使用await和async

4. **定时器管理**
   - 在beforeEach中使用jest.useFakeTimers()
   - 在afterEach中清理定时器

5. **事务管理**
   - 确保事务生命周期完整
   - 正确处理提交和回滚

## 🔧 自定义补丁

### 创建自定义补丁模板

```typescript
// 补丁标题：问题描述
// 目标文件：文件路径
// 优先级：P0/P1/P2

// 在文件开头添加导入
import { ServiceName } from './service.path';

// 替换现有的 Mock 配置
const mockService = {
  methodName: jest.fn().mockResolvedValue(expectedValue),
};

// 替换现有的 beforeEach 块
beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ServiceUnderTest,
      {
        provide: ServiceDependency,
        useValue: mockService,
      },
    ],
  }).compile();

  service = module.get<ServiceUnderTest>(ServiceUnderTest);
});

// 添加完整的测试用例
describe('methodName', () => {
  it('should handle success case', async () => {
    const input = { /* test data */ };
    const expected = { /* expected result */ };

    mockService.methodName.mockResolvedValue(expected);

    const result = await service.methodName(input);

    expect(mockService.methodName).toHaveBeenCalledWith(input);
    expect(result).toEqual(expected);
  });
});
```

---

**文档创建时间**: 2025-10-04  
**文档版本**: v1.0  
**下次更新**: 根据新的修复需求更新