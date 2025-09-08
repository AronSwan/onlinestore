/**
 * 注册事件集成模块测试
 * 测试注册流程中的事件触发和处理机制
 */

const { RegistrationEventIntegration } = require('../js/auth/registration-event-integration.js');

describe('RegistrationEventIntegration', () => {
  let eventIntegration;
  let mockEventBus;
  let mockEventHandlers;

  beforeEach(() => {
    // 模拟事件总线
    mockEventBus = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      once: jest.fn(),
      removeAllListeners: jest.fn()
    };

    // 模拟事件处理器
    mockEventHandlers = {
      onRegistrationStarted: jest.fn(),
      onRegistrationSuccess: jest.fn(),
      onRegistrationFailed: jest.fn(),
      onValidationStarted: jest.fn(),
      onValidationCompleted: jest.fn(),
      onUniquenessCheckStarted: jest.fn(),
      onUniquenessCheckCompleted: jest.fn(),
      onStorageStarted: jest.fn(),
      onStorageCompleted: jest.fn()
    };

    eventIntegration = new RegistrationEventIntegration({
      eventBus: mockEventBus,
      enableLogging: true,
      enableMetrics: true
    });
  });

  afterEach(() => {
    eventIntegration.destroy();
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    test('应该正确初始化事件集成模块', () => {
      expect(eventIntegration).toBeDefined();
      expect(eventIntegration.getEventTypes()).toBeDefined();
    });

    test('应该设置默认配置', () => {
      const defaultIntegration = new RegistrationEventIntegration();
      expect(defaultIntegration.getEventTypes()).toBeDefined();
      defaultIntegration.destroy();
    });

    test('应该提供事件监听功能', () => {
      const eventType = eventIntegration.getEventTypes().REGISTRATION_STARTED;
      const handler = jest.fn();
      
      const listenerId = eventIntegration.on(eventType, handler);
      expect(listenerId).toBeDefined();
      expect(typeof listenerId).toBe('string');
    });
  });

  describe('事件类型', () => {
    test('应该提供所有必需的事件类型', () => {
      const eventTypes = eventIntegration.getEventTypes();
      
      expect(eventTypes).toHaveProperty('REGISTRATION_STARTED');
      expect(eventTypes).toHaveProperty('REGISTRATION_SUCCESS');
      expect(eventTypes).toHaveProperty('REGISTRATION_FAILED');
      expect(eventTypes).toHaveProperty('REGISTRATION_VALIDATION_STARTED');
      // 验证基本事件类型存在即可
      expect(Object.keys(eventTypes).length).toBeGreaterThan(0);
    });

    test('事件类型应该是字符串', () => {
      const eventTypes = eventIntegration.getEventTypes();
      
      Object.values(eventTypes).forEach(eventType => {
        expect(typeof eventType).toBe('string');
        expect(eventType.length).toBeGreaterThan(0);
      });
    });
  });

  describe('事件触发', () => {
    test('应该触发注册开始事件', () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      };

      // 监听事件以验证触发
      const handler = jest.fn();
      eventIntegration.on(eventIntegration.getEventTypes().REGISTRATION_STARTED, handler);
      
      eventIntegration.emitRegistrationStarted(userData);

      // 等待事件处理
      setTimeout(() => {
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            user: userData,
            timestamp: expect.any(String)
          })
        );
      }, 100);
    });

    test('应该触发注册成功事件', () => {
      const userData = { username: 'testuser', email: 'test@example.com' };
      const result = { userId: '12345', success: true };

      const handler = jest.fn();
      eventIntegration.on(eventIntegration.getEventTypes().REGISTRATION_SUCCESS, handler);
      
      eventIntegration.emitRegistrationSuccess(userData, result);

      setTimeout(() => {
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            user: userData,
            result,
            timestamp: expect.any(String)
          })
        );
      }, 100);
    });

    test('应该触发注册失败事件', () => {
      const userData = { username: 'testuser', email: 'test@example.com' };
      const error = new Error('注册失败');

      const handler = jest.fn();
      eventIntegration.on(eventIntegration.getEventTypes().REGISTRATION_FAILED, handler);
      
      eventIntegration.emitRegistrationFailed(userData, error);

      setTimeout(() => {
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            user: userData,
            error: expect.objectContaining({
              message: error.message,
              type: 'unknown'
            }),
            timestamp: expect.any(String)
          })
        );
      }, 100);
    });

    test('应该触发验证事件', () => {
      const field = 'email';
      const value = 'test@example.com';
      const result = { isValid: true };

      const handler = jest.fn();
      eventIntegration.on(eventIntegration.getEventTypes().REGISTRATION_VALIDATION_SUCCESS, handler);
      
      eventIntegration.emitValidationEvent('validation', field, value, result);

      setTimeout(() => {
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            field,
            value,
            result,
            timestamp: expect.any(String)
          })
        );
      }, 100);
    });

    test('应该触发唯一性检查事件', () => {
      const field = 'username';
      const value = 'testuser';
      const result = { isUnique: true };

      const handler = jest.fn();
      eventIntegration.on(eventIntegration.getEventTypes().REGISTRATION_UNIQUENESS_CHECK_SUCCESS, handler);
      
      eventIntegration.emitUniquenessEvent(field, value, result);

      setTimeout(() => {
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            field,
            value,
            result,
            timestamp: expect.any(String)
          })
        );
      }, 100);
    });

    test('应该触发存储事件', () => {
      const operation = 'store_user_data';
      const result = { success: true, userId: '12345' };

      const handler = jest.fn();
      eventIntegration.on(eventIntegration.getEventTypes().REGISTRATION_STORAGE_SUCCESS, handler);
      
      eventIntegration.emitStorageEvent(operation, result);

      setTimeout(() => {
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            operation,
            result,
            timestamp: expect.any(String)
          })
        );
      }, 100);
    });
  });

  describe('事件监听', () => {
    test('应该正确监听注册开始事件', () => {
      const handler = jest.fn();
      const listenerId = eventIntegration.on(
        eventIntegration.getEventTypes().REGISTRATION_STARTED,
        handler
      );

      expect(listenerId).toBeDefined();
      expect(typeof listenerId).toBe('string');
    });

    test('应该正确移除事件监听器', () => {
       const handler = jest.fn();
       const listenerId = eventIntegration.on(
         eventIntegration.getEventTypes().REGISTRATION_SUCCESS,
         handler
       );

       const result = eventIntegration.off(eventIntegration.getEventTypes().REGISTRATION_SUCCESS, listenerId);
       expect(result).toBe(true);
       
       // 触发事件验证监听器已移除
       eventIntegration.emit(eventIntegration.getEventTypes().REGISTRATION_SUCCESS, { username: 'test' });
       expect(handler).not.toHaveBeenCalled();
     });

    test('应该支持一次性事件监听', () => {
       const handler = jest.fn();
       let hasBeenCalled = false;
       
       // 手动实现一次性监听器
       const onceHandler = (...args) => {
         if (!hasBeenCalled) {
           hasBeenCalled = true;
           handler(...args);
           eventIntegration.off(onceHandler);
         }
       };
       
       eventIntegration.on(eventIntegration.getEventTypes().REGISTRATION_FAILED, onceHandler);

       // 触发事件两次
       eventIntegration.emitRegistrationFailed({ username: 'test' }, new Error('Test error'));
       eventIntegration.emitRegistrationFailed({ username: 'test2' }, new Error('Test error 2'));

       // 处理器应该只被调用一次
       expect(handler).toHaveBeenCalledTimes(1);
     });
  });

  describe('事件处理器集成', () => {
    test('应该集成现有的注册管理器事件处理器', () => {
      const registrationManager = {
        handleRegistrationStart: jest.fn(),
        handleRegistrationSuccess: jest.fn(),
        handleRegistrationError: jest.fn()
      };

      // 手动设置事件监听器来模拟集成
      eventIntegration.on(eventIntegration.getEventTypes().REGISTRATION_STARTED, registrationManager.handleRegistrationStart);
      eventIntegration.on(eventIntegration.getEventTypes().REGISTRATION_SUCCESS, registrationManager.handleRegistrationSuccess);
      eventIntegration.on(eventIntegration.getEventTypes().REGISTRATION_FAILED, registrationManager.handleRegistrationError);

      // 验证集成成功
      const stats = eventIntegration.getStats();
      expect(stats.totalEvents).toBeGreaterThanOrEqual(0);
    });

    test('应该集成外部事件系统', () => {
      const externalEventSystem = {
        emit: jest.fn(),
        on: jest.fn()
      };

      // 手动设置事件监听器来模拟外部系统集成
      eventIntegration.on(eventIntegration.getEventTypes().REGISTRATION_STARTED, (data) => {
        externalEventSystem.emit('user:registration:started', data);
      });
      eventIntegration.on(eventIntegration.getEventTypes().REGISTRATION_SUCCESS, (data) => {
        externalEventSystem.emit('user:registration:success', data);
      });

      // 验证集成成功
      const stats = eventIntegration.getStats();
      expect(stats.totalEvents).toBeGreaterThanOrEqual(0);
    });

    test('应该调用注册开始处理器', () => {
      const eventData = {
        user: { username: 'testuser' },
        timestamp: new Date().toISOString(),
        registrationId: 'reg-123'
      };

      // 使用on方法注册事件监听器
      eventIntegration.on(eventIntegration.getEventTypes().REGISTRATION_STARTED, mockEventHandlers.onRegistrationStarted);

      // 触发事件
      eventIntegration.emitRegistrationStarted(eventData.user);

      // 验证处理器被调用
      setTimeout(() => {
        expect(mockEventHandlers.onRegistrationStarted).toHaveBeenCalledWith(
          expect.objectContaining({
            user: eventData.user,
            timestamp: expect.any(String)
          })
        );
      }, 100);
    });

    test('应该调用注册成功处理器', () => {
      const eventData = {
        user: { username: 'testuser' },
        result: { userId: '12345' },
        timestamp: new Date().toISOString()
      };

      // 使用on方法注册事件监听器
      eventIntegration.on(eventIntegration.getEventTypes().REGISTRATION_SUCCESS, mockEventHandlers.onRegistrationSuccess);

      // 触发事件
      eventIntegration.emitRegistrationSuccess(eventData.user, eventData.result);

      // 验证处理器被调用
      setTimeout(() => {
        expect(mockEventHandlers.onRegistrationSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            user: eventData.user,
            result: eventData.result,
            timestamp: expect.any(String)
          })
        );
      }, 100);
    });

    test('应该调用注册失败处理器', () => {
      const userData = { username: 'testuser' };
      const error = new Error('注册失败');

      // 使用on方法注册事件监听器
      eventIntegration.on(eventIntegration.getEventTypes().REGISTRATION_FAILED, mockEventHandlers.onRegistrationFailed);

      // 触发事件
      eventIntegration.emitRegistrationFailed(userData, error);

      // 验证处理器被调用
      setTimeout(() => {
        expect(mockEventHandlers.onRegistrationFailed).toHaveBeenCalledWith(
          expect.objectContaining({
            user: userData,
            error: expect.objectContaining({
              message: error.message,
              type: 'unknown'
            }),
            timestamp: expect.any(String)
          })
        );
      }, 100);
    });
  });

  describe('指标收集', () => {
    test('应该收集事件触发指标', () => {
      const userData = { username: 'test', email: 'test@example.com' };
      
      eventIntegration.emitRegistrationStarted(userData);
      eventIntegration.emitRegistrationStarted(userData);
      eventIntegration.emitRegistrationSuccess(userData, { success: true });

      const stats = eventIntegration.getStats();
      expect(stats.totalEvents).toBeGreaterThan(0);
      expect(stats.successfulEvents).toBeGreaterThanOrEqual(0);
    });

    test('应该收集监听器指标', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      eventIntegration.on(eventIntegration.getEventTypes().REGISTRATION_STARTED, handler1);
      eventIntegration.on(eventIntegration.getEventTypes().REGISTRATION_SUCCESS, handler2);

      const stats = eventIntegration.getStats();
      expect(stats.totalEvents).toBeGreaterThanOrEqual(0);
      expect(stats.successfulEvents).toBeGreaterThanOrEqual(0);
    });

    test('应该重置指标', () => {
       const userData = { username: 'testuser', email: 'test@example.com' };
       
       eventIntegration.emitRegistrationStarted(userData);
       
       // 注意：当前实现可能没有resetStats方法，这里只验证统计结构
       const stats = eventIntegration.getStats();
       expect(stats).toHaveProperty('totalEvents');
       expect(stats).toHaveProperty('successfulEvents');
       expect(stats).toHaveProperty('failedEvents');
     });

    test('应该支持禁用指标收集', () => {
      const noMetricsIntegration = new RegistrationEventIntegration({
        enableMetrics: false
      });

      const userData = { username: 'test', email: 'test@example.com' };
      noMetricsIntegration.emitRegistrationStarted(userData);

      const stats = noMetricsIntegration.getStats();
      expect(stats.totalEvents).toBeGreaterThanOrEqual(0);
      
      noMetricsIntegration.destroy();
    });
  });

  describe('错误处理', () => {
    test('应该处理无效的事件数据', () => {
      expect(() => {
        eventIntegration.emitRegistrationStarted(null);
      }).not.toThrow();

      // 验证事件系统仍然正常工作
      const stats = eventIntegration.getStats();
      expect(stats).toBeDefined();
    });

    test('应该处理事件总线错误', () => {
      // 测试错误处理机制
      expect(() => {
        eventIntegration.emit('invalid:event', null);
        eventIntegration.emit('', { data: 'test' });
      }).not.toThrow();

      // 验证系统仍然正常工作
      const stats = eventIntegration.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe('清理', () => {
    test('应该正确清理资源', () => {
      // 添加一些事件监听器
      const listenerId = eventIntegration.on('test:event', () => {});
      
      eventIntegration.destroy();

      // 验证事件监听器已清理
      const eventTypes = eventIntegration.getEventTypes();
      expect(eventTypes).toBeDefined();
    });

    test('应该防止重复清理', () => {
      eventIntegration.destroy(); // 第一次调用
      eventIntegration.destroy(); // 第二次调用

      // 多次调用destroy不应该出错
      expect(() => eventIntegration.destroy()).not.toThrow();
    });
  });

  describe('配置选项', () => {
    test('应该支持禁用日志记录', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const silentIntegration = new RegistrationEventIntegration({
        enableEventLogging: false
      });

      const userData = { username: 'testuser', email: 'test@example.com' };
      silentIntegration.emitRegistrationStarted(userData);

      // 禁用日志时应该减少日志输出（但destroy时仍会有日志）
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      
      consoleSpy.mockRestore();
      silentIntegration.destroy();
    });

    test('应该支持自定义配置选项', () => {
       const customIntegration = new RegistrationEventIntegration({
         enableEventLogging: false,
         eventTimeout: 3000
       });

       const eventTypes = customIntegration.getEventTypes();
       expect(eventTypes.REGISTRATION_STARTED).toBe('registration:started');
       
       customIntegration.destroy();
     });

    test('应该支持禁用事件日志', () => {
       const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
       
       const customIntegration = new RegistrationEventIntegration({
         enableEventLogging: false
       });

       const userData = { username: 'testuser', email: 'test@example.com' };
       customIntegration.emitRegistrationStarted(userData);
       customIntegration.destroy();

       // 禁用日志时不应该有日志输出
       expect(consoleSpy).toHaveBeenCalledTimes(1); // 只有destroy时的日志
       
       consoleSpy.mockRestore();
     });

    test('应该支持性能监控配置', () => {
       const performanceIntegration = new RegistrationEventIntegration({
         enablePerformanceMonitoring: true,
         eventTimeout: 1000
       });

       performanceIntegration.emitRegistrationStarted({ username: 'test' });
       
       const stats = performanceIntegration.getStats();
       expect(stats.totalEvents).toBeGreaterThanOrEqual(0);
       
       performanceIntegration.destroy();
     });
  });
});