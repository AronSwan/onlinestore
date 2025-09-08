/**
 * 注册容错和降级管理器测试
 * 测试重试机制、存储降级、离线模式等功能
 */

const { RegistrationResilienceManager } = require('../js/auth/registration-resilience');

describe('RegistrationResilienceManager', () => {
  let resilienceManager;
  let mockLocalStorage;
  let mockSessionStorage;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      data: {},
      setItem: jest.fn((key, value) => {
        mockLocalStorage.data[key] = value;
      }),
      getItem: jest.fn((key) => mockLocalStorage.data[key] || null),
      removeItem: jest.fn((key) => {
        delete mockLocalStorage.data[key];
      }),
      clear: jest.fn(() => {
        mockLocalStorage.data = {};
      })
    };

    // Mock sessionStorage
    mockSessionStorage = {
      data: {},
      setItem: jest.fn((key, value) => {
        mockSessionStorage.data[key] = value;
      }),
      getItem: jest.fn((key) => mockSessionStorage.data[key] || null),
      removeItem: jest.fn((key) => {
        delete mockSessionStorage.data[key];
      }),
      clear: jest.fn(() => {
        mockSessionStorage.data = {};
      })
    };

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    global.localStorage = mockLocalStorage;
    global.sessionStorage = mockSessionStorage;

    resilienceManager = new RegistrationResilienceManager({
      maxRetries: 2,
      baseDelay: 100,
      maxDelay: 1000,
      enableLogging: false
    });
  });

  afterEach(() => {
    resilienceManager.destroy();
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    test('应该正确初始化配置', () => {
      expect(resilienceManager.config.maxRetries).toBe(2);
      expect(resilienceManager.config.baseDelay).toBe(100);
      expect(resilienceManager.storageAdapters.size).toBeGreaterThan(0);
      expect(resilienceManager.degradationStrategies.size).toBeGreaterThan(0);
    });

    test('应该设置存储适配器', () => {
      expect(resilienceManager.storageAdapters.has('localStorage')).toBe(true);
      expect(resilienceManager.storageAdapters.has('sessionStorage')).toBe(true);
      expect(resilienceManager.storageAdapters.has('memory')).toBe(true);
    });

    test('应该设置降级策略', () => {
      expect(resilienceManager.degradationStrategies.has('network')).toBe(true);
      expect(resilienceManager.degradationStrategies.has('storage')).toBe(true);
    });
  });

  describe('重试机制', () => {
    test('应该在操作成功时不重试', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const result = await resilienceManager.executeWithRetry('test-op', mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(resilienceManager.metrics.totalRetries).toBe(0);
    });

    test('应该在操作失败时重试', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');
      
      const result = await resilienceManager.executeWithRetry('test-op', mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(resilienceManager.metrics.totalRetries).toBe(2);
      expect(resilienceManager.metrics.successfulRetries).toBe(1);
    });

    test('应该在达到最大重试次数后抛出错误', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent failure'));
      
      await expect(resilienceManager.executeWithRetry('test-op', mockOperation))
        .rejects.toThrow('Persistent failure');
      
      expect(mockOperation).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
      expect(resilienceManager.metrics.totalRetries).toBe(2);
      expect(resilienceManager.metrics.failedRetries).toBe(1);
    });

    test('应该使用指数退避延迟', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      await resilienceManager.executeWithRetry('test-op', mockOperation);
      const endTime = Date.now();
      
      // 应该至少等待 baseDelay (100ms)
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('存储容错', () => {
    test('应该使用主要存储适配器', async () => {
      const testData = { test: 'data' };
      
      const result = await resilienceManager.storeWithFallback('test-key', testData);
      
      expect(result.success).toBe(true);
      expect(result.adapter).toBe('localStorage');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(testData));
    });

    test('应该在主要存储失败时使用备用存储', async () => {
      // 模拟 localStorage 失败
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const testData = { test: 'data' };
      
      const result = await resilienceManager.storeWithFallback('test-key', testData);
      
      expect(result.success).toBe(true);
      expect(result.adapter).toBe('sessionStorage');
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(testData));
      expect(resilienceManager.metrics.storageFailovers).toBe(1);
    });

    test('应该在所有存储失败时抛出错误', async () => {
      // 模拟所有存储失败
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('LocalStorage failed');
      });
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error('SessionStorage failed');
      });
      
      // 直接修改内存存储适配器使其失败
      const memoryAdapter = resilienceManager.storageAdapters.get('memory');
      const originalStore = memoryAdapter.store;
      memoryAdapter.store = () => {
        throw new Error('Memory storage failed');
      };
      
      const testData = { test: 'data' };
      
      try {
        await expect(resilienceManager.storeWithFallback('test-key', testData))
          .rejects.toThrow('All storage adapters failed');
      } finally {
        // 恢复原始方法
        memoryAdapter.store = originalStore;
      }
    });

    test('应该从可用的存储中检索数据', async () => {
      const testData = { test: 'data' };
      mockLocalStorage.data['test-key'] = JSON.stringify(testData);
      
      const result = await resilienceManager.retrieveWithFallback('test-key');
      
      expect(result.data).toEqual(testData);
      expect(result.adapter).toBe('localStorage');
    });

    test('应该在主要存储无数据时尝试备用存储', async () => {
      const testData = { test: 'data' };
      mockSessionStorage.data['test-key'] = JSON.stringify(testData);
      
      const result = await resilienceManager.retrieveWithFallback('test-key');
      
      expect(result.data).toEqual(testData);
      expect(result.adapter).toBe('sessionStorage');
    });
  });

  describe('网络降级', () => {
    test('应该检测网络状态', () => {
      navigator.onLine = false;
      
      const conditions = resilienceManager.checkDegradationConditions();
      
      expect(conditions.network).toBe(true);
    });

    test('应该在离线时处理注册', async () => {
      navigator.onLine = false;
      resilienceManager.config.offlineMode = true;
      
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      
      const mockRegistrationFunction = jest.fn();
      
      const result = await resilienceManager.handleRegistrationWithDegradation(
        userData,
        mockRegistrationFunction
      );
      
      expect(result.success).toBe(true);
      expect(result.offline).toBe(true);
      expect(result.id).toBeDefined();
      expect(mockRegistrationFunction).not.toHaveBeenCalled();
      expect(resilienceManager.metrics.offlineOperations).toBe(1);
    });

    test('应该在网络恢复时同步离线数据', async () => {
      // 模拟离线数据
      const offlineData = {
        userData: { username: 'testuser', email: 'test@example.com' },
        timestamp: new Date().toISOString(),
        status: 'pending_sync',
        id: 'offline_123'
      };
      
      resilienceManager.memoryStorage.set('offline_registration_123', offlineData);
      
      const mockSyncFunction = jest.fn().mockResolvedValue({ success: true });
      
      const result = await resilienceManager.syncOfflineData(mockSyncFunction);
      
      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockSyncFunction).toHaveBeenCalledWith(offlineData.userData);
    });
  });

  describe('降级策略', () => {
    test('应该在正常情况下执行正常流程', async () => {
      navigator.onLine = true;
      
      const userData = { username: 'testuser' };
      const mockRegistrationFunction = jest.fn().mockResolvedValue({ success: true });
      
      const result = await resilienceManager.handleRegistrationWithDegradation(
        userData,
        mockRegistrationFunction
      );
      
      expect(result.success).toBe(true);
      expect(mockRegistrationFunction).toHaveBeenCalledWith(userData);
    });

    test('应该在存储降级时保存备份', async () => {
      const userData = { username: 'testuser' };
      const mockRegistrationFunction = jest.fn().mockResolvedValue({ success: true, id: 'user123' });
      
      const result = await resilienceManager.handleStorageDegradedRegistration(
        userData,
        mockRegistrationFunction
      );
      
      expect(result.success).toBe(true);
      expect(mockRegistrationFunction).toHaveBeenCalledWith(userData);
    });
  });

  describe('指标收集', () => {
    test('应该正确收集指标', () => {
      resilienceManager.metrics.totalRetries = 5;
      resilienceManager.metrics.successfulRetries = 3;
      resilienceManager.metrics.failedRetries = 2;
      
      const metrics = resilienceManager.getMetrics();
      
      expect(metrics.totalRetries).toBe(5);
      expect(metrics.successfulRetries).toBe(3);
      expect(metrics.failedRetries).toBe(2);
      expect(metrics.activeRetries).toBe(0);
      expect(metrics.availableStorageAdapters).toBeGreaterThan(0);
    });

    test('应该重置指标', () => {
      resilienceManager.metrics.totalRetries = 5;
      resilienceManager.metrics.successfulRetries = 3;
      
      resilienceManager.resetMetrics();
      
      expect(resilienceManager.metrics.totalRetries).toBe(0);
      expect(resilienceManager.metrics.successfulRetries).toBe(0);
    });
  });

  describe('工具方法', () => {
    test('应该生成唯一的离线ID', () => {
      const id1 = resilienceManager.generateOfflineId();
      const id2 = resilienceManager.generateOfflineId();
      
      expect(id1).toMatch(/^offline_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^offline_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    test('应该正确延迟执行', async () => {
      const startTime = Date.now();
      await resilienceManager.delay(100);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('资源清理', () => {
    test('应该正确清理资源', () => {
      resilienceManager.retryState.set('test', {});
      resilienceManager.memoryStorage.set('test', 'data');
      
      resilienceManager.destroy();
      
      expect(resilienceManager.retryState.size).toBe(0);
      expect(resilienceManager.memoryStorage.size).toBe(0);
    });
  });

  describe('错误处理', () => {
    test('应该处理存储适配器错误', async () => {
      // 模拟存储适配器抛出异常
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const testData = { test: 'data' };
      
      // 应该回退到下一个可用的存储
      const result = await resilienceManager.storeWithFallback('test-key', testData);
      
      expect(result.success).toBe(true);
      expect(result.adapter).toBe('sessionStorage');
    });

    test('应该处理重试过程中的错误', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout error'))
        .mockRejectedValue(new Error('Server error'));
      
      await expect(resilienceManager.executeWithRetry('test-op', mockOperation))
        .rejects.toThrow('Server error');
      
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });
  });

  describe('配置选项', () => {
    test('应该支持自定义配置', () => {
      const customManager = new RegistrationResilienceManager({
        maxRetries: 5,
        baseDelay: 500,
        enableLocalStorage: false
      });
      
      expect(customManager.config.maxRetries).toBe(5);
      expect(customManager.config.baseDelay).toBe(500);
      expect(customManager.config.enableLocalStorage).toBe(false);
      
      customManager.destroy();
    });

    test('应该使用默认配置', () => {
      const defaultManager = new RegistrationResilienceManager();
      
      expect(defaultManager.config.maxRetries).toBe(3);
      expect(defaultManager.config.baseDelay).toBe(1000);
      expect(defaultManager.config.enableLocalStorage).toBe(true);
      
      defaultManager.destroy();
    });
  });
});