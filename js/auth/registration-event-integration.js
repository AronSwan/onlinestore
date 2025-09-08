/**
 * 注册事件集成模块
 * 统一管理注册相关的事件触发和处理，与现有事件系统集成
 *
 * 功能特性：
 * - 统一的事件命名规范
 * - 事件优先级管理
 * - 错误处理和恢复
 * - 性能监控
 * - 与现有系统的无缝集成
 */

class RegistrationEventIntegration {
  constructor(options = {}) {
    this.config = {
      enableEventLogging: true,
      enablePerformanceMonitoring: true,
      enableErrorRecovery: true,
      eventTimeout: 5000,
      maxRetries: 3,
      ...options
    };

    // 事件监听器存储
    this.eventListeners = new Map();

    // 事件统计
    this.eventStats = {
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      averageExecutionTime: 0,
      eventsByType: {},
      retryCount: 0
    };

    // 事件队列（用于批处理和优先级管理）
    this.eventQueue = [];
    this.isProcessingQueue = false;

    // 初始化
    this.init();
  }

  /**
   * 初始化事件集成系统
   */
  init() {
    // 注册标准注册事件类型
    this.registerStandardEvents();

    // 设置错误处理
    this.setupErrorHandling();

    // 启动事件队列处理
    this.startQueueProcessor();

    if (this.config.enableEventLogging) {
      console.log('RegistrationEventIntegration initialized');
    }
  }

  /**
   * 注册标准注册事件类型
   */
  registerStandardEvents() {
    this.eventTypes = {
      // 注册流程事件
      REGISTRATION_STARTED: 'registration:started',
      REGISTRATION_VALIDATION_STARTED: 'registration:validation:started',
      REGISTRATION_VALIDATION_SUCCESS: 'registration:validation:success',
      REGISTRATION_VALIDATION_FAILED: 'registration:validation:failed',
      REGISTRATION_SECURITY_CHECK_STARTED: 'registration:security:started',
      REGISTRATION_SECURITY_CHECK_SUCCESS: 'registration:security:success',
      REGISTRATION_SECURITY_CHECK_FAILED: 'registration:security:failed',
      REGISTRATION_UNIQUENESS_CHECK_STARTED: 'registration:uniqueness:started',
      REGISTRATION_UNIQUENESS_CHECK_SUCCESS: 'registration:uniqueness:success',
      REGISTRATION_UNIQUENESS_CHECK_FAILED: 'registration:uniqueness:failed',
      REGISTRATION_STORAGE_STARTED: 'registration:storage:started',
      REGISTRATION_STORAGE_SUCCESS: 'registration:storage:success',
      REGISTRATION_STORAGE_FAILED: 'registration:storage:failed',
      REGISTRATION_SUCCESS: 'registration:success',
      REGISTRATION_FAILED: 'registration:failed',
      REGISTRATION_CANCELLED: 'registration:cancelled',

      // 用户交互事件
      USER_INPUT_CHANGED: 'user:input:changed',
      USER_FORM_SUBMITTED: 'user:form:submitted',
      USER_FORM_RESET: 'user:form:reset',

      // 系统事件
      SYSTEM_ERROR: 'system:error',
      SYSTEM_WARNING: 'system:warning',
      SYSTEM_INFO: 'system:info',

      // 性能事件
      PERFORMANCE_METRIC: 'performance:metric',
      PERFORMANCE_WARNING: 'performance:warning'
    };

    // 事件优先级定义
    this.eventPriorities = {
      [this.eventTypes.SYSTEM_ERROR]: 1,
      [this.eventTypes.REGISTRATION_FAILED]: 2,
      [this.eventTypes.REGISTRATION_SUCCESS]: 3,
      [this.eventTypes.REGISTRATION_STARTED]: 4,
      [this.eventTypes.USER_FORM_SUBMITTED]: 5,
      [this.eventTypes.PERFORMANCE_WARNING]: 6,
      [this.eventTypes.USER_INPUT_CHANGED]: 10
    };
  }

  /**
   * 设置错误处理
   */
  setupErrorHandling() {
    // 与现有错误管理器集成
    if (typeof window !== 'undefined' && window.errorManager) {
      this.errorManager = window.errorManager;
    }
  }

  /**
   * 启动事件队列处理器
   */
  startQueueProcessor() {
    setInterval(() => {
      this.processEventQueue();
    }, 100); // 每100ms处理一次队列
  }

  /**
   * 处理事件队列
   */
  async processEventQueue() {
    if (this.isProcessingQueue || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      // 按优先级排序
      this.eventQueue.sort((a, b) => {
        const priorityA = this.eventPriorities[a.type] || 999;
        const priorityB = this.eventPriorities[b.type] || 999;
        return priorityA - priorityB;
      });

      // 处理队列中的事件
      while (this.eventQueue.length > 0) {
        const eventData = this.eventQueue.shift();
        await this.processEvent(eventData);
      }
    } catch (error) {
      if (this.errorManager) {
        this.errorManager.handleError(error, {
          context: 'RegistrationEventIntegration.processEventQueue',
          severity: 'warning'
        });
      } else {
        console.error('Event queue processing error:', error);
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * 处理单个事件
   */
  async processEvent(eventData) {
    const startTime = Date.now();
    let success = false;

    try {
      // 获取事件监听器
      const listeners = this.eventListeners.get(eventData.type) || [];

      if (listeners.length === 0) {
        if (this.config.enableEventLogging) {
          console.log(`No listeners for event: ${eventData.type}`);
        }
        return;
      }

      // 执行所有监听器
      const promises = listeners.map(async (listener) => {
        try {
          if (typeof listener.handler === 'function') {
            await listener.handler(eventData);
          }
        } catch (error) {
          if (this.errorManager) {
            this.errorManager.handleError(error, {
              context: `RegistrationEventIntegration.listener.${eventData.type}`,
              severity: 'warning'
            });
          } else {
            console.error(`Event listener error for ${eventData.type}:`, error);
          }
          throw error;
        }
      });

      await Promise.allSettled(promises);
      success = true;

    } catch (error) {
      if (this.config.enableErrorRecovery && eventData.retryCount < this.config.maxRetries) {
        eventData.retryCount = (eventData.retryCount || 0) + 1;
        this.eventQueue.push(eventData);
        this.eventStats.retryCount++;
      } else {
        this.eventStats.failedEvents++;
        if (this.errorManager) {
          this.errorManager.handleError(error, {
            context: 'RegistrationEventIntegration.processEvent',
            severity: 'error',
            eventType: eventData.type
          });
        }
      }
    } finally {
      const executionTime = Date.now() - startTime;
      this.updateStats(eventData.type, success, executionTime);
    }
  }

  /**
   * 更新统计信息
   */
  updateStats(eventType, success, executionTime) {
    this.eventStats.totalEvents++;

    if (success) {
      this.eventStats.successfulEvents++;
    }

    // 更新事件类型统计
    if (!this.eventStats.eventsByType[eventType]) {
      this.eventStats.eventsByType[eventType] = 0;
    }
    this.eventStats.eventsByType[eventType]++;

    // 更新平均执行时间
    const totalEvents = this.eventStats.totalEvents;
    const currentAverage = this.eventStats.averageExecutionTime;
    this.eventStats.averageExecutionTime =
      ((currentAverage * (totalEvents - 1)) + executionTime) / totalEvents;

    // 性能警告
    if (this.config.enablePerformanceMonitoring && executionTime > 1000) {
      this.emit(this.eventTypes.PERFORMANCE_WARNING, {
        eventType,
        executionTime,
        threshold: 1000
      });
    }
  }

  /**
   * 添加事件监听器
   */
  on(eventType, handler, options = {}) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }

    const listener = {
      handler,
      options,
      id: this.generateListenerId(),
      createdAt: new Date().toISOString()
    };

    this.eventListeners.get(eventType).push(listener);

    if (this.config.enableEventLogging) {
      console.log(`Event listener added for: ${eventType}`);
    }

    return listener.id;
  }

  /**
   * 移除事件监听器
   */
  off(eventType, listenerId) {
    if (!this.eventListeners.has(eventType)) {
      return false;
    }

    const listeners = this.eventListeners.get(eventType);
    const index = listeners.findIndex(l => l.id === listenerId);

    if (index !== -1) {
      listeners.splice(index, 1);
      if (this.config.enableEventLogging) {
        console.log(`Event listener removed for: ${eventType}`);
      }
      return true;
    }

    return false;
  }

  /**
   * 触发事件
   */
  emit(eventType, data = {}, options = {}) {
    const eventData = {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
      id: this.generateEventId(),
      source: 'RegistrationEventIntegration',
      retryCount: 0,
      ...options
    };

    // 立即处理高优先级事件
    const priority = this.eventPriorities[eventType] || 999;
    if (priority <= 3) {
      this.processEvent(eventData);
    } else {
      this.eventQueue.push(eventData);
    }

    if (this.config.enableEventLogging) {
      console.log(`Event emitted: ${eventType}`, data);
    }

    // 与现有事件系统集成
    this.integrateWithExistingSystems(eventType, data);
  }

  /**
   * 与现有事件系统集成
   */
  integrateWithExistingSystems(eventType, data) {
    // 与registration-manager的事件总线集成
    if (typeof window !== 'undefined' && window.registrationManager) {
      try {
        if (typeof window.registrationManager.emit === 'function') {
          window.registrationManager.emit(eventType, data);
        }
      } catch (error) {
        console.warn('Failed to integrate with registration manager events:', error);
      }
    }

    // 与DOM事件系统集成
    if (typeof window !== 'undefined' && window.document) {
      try {
        const customEvent = new CustomEvent(eventType, {
          detail: data,
          bubbles: true,
          cancelable: true
        });
        window.document.dispatchEvent(customEvent);
      } catch (error) {
        console.warn('Failed to dispatch DOM event:', error);
      }
    }

    // 与utils.js的EventDelegator集成
    if (typeof window !== 'undefined' && window.eventDelegator) {
      try {
        if (typeof window.eventDelegator.emit === 'function') {
          window.eventDelegator.emit(eventType, data);
        }
      } catch (error) {
        console.warn('Failed to integrate with event delegator:', error);
      }
    }
  }

  /**
   * 生成监听器ID
   */
  generateListenerId() {
    return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成事件ID
   */
  generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取事件统计信息
   */
  getStats() {
    return { ...this.eventStats };
  }

  /**
   * 获取所有事件类型
   */
  getEventTypes() {
    return { ...this.eventTypes };
  }

  /**
   * 清理资源
   */
  destroy() {
    this.eventListeners.clear();
    this.eventQueue.length = 0;

    if (this.config.enableEventLogging) {
      console.log('RegistrationEventIntegration destroyed');
    }
  }

  /**
   * 注册流程专用方法
   */

  /**
   * 触发注册开始事件
   */
  emitRegistrationStarted(userData) {
    this.emit(this.eventTypes.REGISTRATION_STARTED, {
      user: userData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 触发注册成功事件
   */
  emitRegistrationSuccess(userData, registrationResult) {
    this.emit(this.eventTypes.REGISTRATION_SUCCESS, {
      user: userData,
      result: registrationResult,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 触发注册失败事件
   */
  emitRegistrationFailed(userData, error) {
    this.emit(this.eventTypes.REGISTRATION_FAILED, {
      user: userData,
      error: {
        message: error.message,
        type: error.type || 'unknown',
        code: error.code
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 触发验证事件
   */
  emitValidationEvent(type, field, value, result) {
    const eventType = result.isValid ?
      this.eventTypes.REGISTRATION_VALIDATION_SUCCESS :
      this.eventTypes.REGISTRATION_VALIDATION_FAILED;

    this.emit(eventType, {
      field,
      value,
      result,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 触发安全检查事件
   */
  emitSecurityEvent(type, checkType, result) {
    const eventType = result.passed ?
      this.eventTypes.REGISTRATION_SECURITY_CHECK_SUCCESS :
      this.eventTypes.REGISTRATION_SECURITY_CHECK_FAILED;

    this.emit(eventType, {
      checkType,
      result,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 触发唯一性检查事件
   */
  emitUniquenessEvent(field, value, result) {
    const eventType = result.isUnique ?
      this.eventTypes.REGISTRATION_UNIQUENESS_CHECK_SUCCESS :
      this.eventTypes.REGISTRATION_UNIQUENESS_CHECK_FAILED;

    this.emit(eventType, {
      field,
      value,
      result,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 触发存储事件
   */
  emitStorageEvent(operation, result) {
    const eventType = result.success ?
      this.eventTypes.REGISTRATION_STORAGE_SUCCESS :
      this.eventTypes.REGISTRATION_STORAGE_FAILED;

    this.emit(eventType, {
      operation,
      result,
      timestamp: new Date().toISOString()
    });
  }
}

// 创建全局实例
if (typeof window !== 'undefined') {
  window.RegistrationEventIntegration = RegistrationEventIntegration;

  // 创建默认实例
  if (!window.registrationEventIntegration) {
    window.registrationEventIntegration = new RegistrationEventIntegration();
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RegistrationEventIntegration };
}
