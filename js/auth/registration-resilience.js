/**
 * 注册容错和降级管理器
 * 提供网络错误重试、存储失败备用方案、服务降级策略
 *
 * 功能特性：
 * - 智能重试机制（指数退避）
 * - 多级存储备用方案
 * - 服务降级策略
 * - 离线模式支持
 * - 错误恢复机制
 */

class RegistrationResilienceManager {
  constructor(options = {}) {
    this.config = {
      // 重试配置
      maxRetries: 3,
      baseDelay: 1000, // 基础延迟 1秒
      maxDelay: 30000, // 最大延迟 30秒
      backoffMultiplier: 2, // 指数退避倍数

      // 存储配置
      enableLocalStorage: true,
      enableSessionStorage: true,
      enableIndexedDB: true,

      // 降级配置
      enableGracefulDegradation: true,
      offlineMode: false,

      // 监控配置
      enableMetrics: true,
      enableLogging: true,

      ...options
    };

    // 重试状态管理
    this.retryState = new Map();

    // 存储适配器
    this.storageAdapters = new Map();

    // 降级策略
    this.degradationStrategies = new Map();

    // 指标收集
    this.metrics = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      storageFailovers: 0,
      degradationActivations: 0,
      offlineOperations: 0
    };

    // 初始化
    this.init();
  }

  /**
   * 初始化容错管理器
   */
  init() {
    this.setupStorageAdapters();
    this.setupDegradationStrategies();
    this.setupNetworkMonitoring();

    if (this.config.enableLogging) {
      console.log('RegistrationResilienceManager initialized');
    }
  }

  /**
   * 设置存储适配器
   */
  setupStorageAdapters() {
    // LocalStorage 适配器
    if (this.config.enableLocalStorage && typeof localStorage !== 'undefined') {
      this.storageAdapters.set('localStorage', {
        priority: 1,
        available: true,
        store: (key, data) => {
          try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
          } catch (error) {
            console.warn('LocalStorage failed:', error);
            return false;
          }
        },
        retrieve: (key) => {
          try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
          } catch (error) {
            console.warn('LocalStorage retrieval failed:', error);
            return null;
          }
        },
        remove: (key) => {
          try {
            localStorage.removeItem(key);
            return true;
          } catch (error) {
            console.warn('LocalStorage removal failed:', error);
            return false;
          }
        }
      });
    }

    // SessionStorage 适配器
    if (this.config.enableSessionStorage && typeof sessionStorage !== 'undefined') {
      this.storageAdapters.set('sessionStorage', {
        priority: 2,
        available: true,
        store: (key, data) => {
          try {
            sessionStorage.setItem(key, JSON.stringify(data));
            return true;
          } catch (error) {
            console.warn('SessionStorage failed:', error);
            return false;
          }
        },
        retrieve: (key) => {
          try {
            const data = sessionStorage.getItem(key);
            return data ? JSON.parse(data) : null;
          } catch (error) {
            console.warn('SessionStorage retrieval failed:', error);
            return null;
          }
        },
        remove: (key) => {
          try {
            sessionStorage.removeItem(key);
            return true;
          } catch (error) {
            console.warn('SessionStorage removal failed:', error);
            return false;
          }
        }
      });
    }

    // 内存存储适配器（最后备用）
    this.memoryStorage = new Map();
    this.storageAdapters.set('memory', {
      priority: 3,
      available: true,
      store: (key, data) => {
        try {
          this.memoryStorage.set(key, data);
          return true;
        } catch (error) {
          console.warn('Memory storage failed:', error);
          return false;
        }
      },
      retrieve: (key) => {
        return this.memoryStorage.get(key) || null;
      },
      remove: (key) => {
        return this.memoryStorage.delete(key);
      }
    });
  }

  /**
   * 设置降级策略
   */
  setupDegradationStrategies() {
    // 网络降级策略
    this.degradationStrategies.set('network', {
      condition: () => !navigator.onLine,
      action: () => {
        this.config.offlineMode = true;
        this.metrics.degradationActivations++;
        if (this.config.enableLogging) {
          console.log('Network degradation activated - switching to offline mode');
        }
      },
      recovery: () => {
        this.config.offlineMode = false;
        if (this.config.enableLogging) {
          console.log('Network recovered - switching back to online mode');
        }
      }
    });

    // 存储降级策略
    this.degradationStrategies.set('storage', {
      condition: () => {
        // 检查主要存储是否可用
        const primaryStorage = Array.from(this.storageAdapters.values())
          .sort((a, b) => a.priority - b.priority)[0];
        return !primaryStorage || !primaryStorage.available;
      },
      action: () => {
        this.metrics.degradationActivations++;
        if (this.config.enableLogging) {
          console.log('Storage degradation activated - using fallback storage');
        }
      }
    });
  }

  /**
   * 设置网络监控
   */
  setupNetworkMonitoring() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        const strategy = this.degradationStrategies.get('network');
        if (strategy && strategy.recovery) {
          strategy.recovery();
        }
      });

      window.addEventListener('offline', () => {
        const strategy = this.degradationStrategies.get('network');
        if (strategy && strategy.action) {
          strategy.action();
        }
      });
    }
  }

  /**
   * 执行带重试的操作
   */
  async executeWithRetry(operationId, operation, options = {}) {
    const config = { ...this.config, ...options };
    const retryKey = `${operationId}_${Date.now()}`;

    this.retryState.set(retryKey, {
      attempts: 0,
      lastError: null,
      startTime: Date.now()
    });

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const state = this.retryState.get(retryKey);
        state.attempts = attempt + 1;

        if (this.config.enableLogging && attempt > 0) {
          console.log(`Retry attempt ${attempt} for operation: ${operationId}`);
        }

        const result = await operation();

        // 成功时清理重试状态
        this.retryState.delete(retryKey);

        if (attempt > 0) {
          this.metrics.successfulRetries++;
        }

        return result;
      } catch (error) {
        const state = this.retryState.get(retryKey);
        state.lastError = error;

        if (attempt === config.maxRetries) {
          // 最后一次尝试失败
          this.metrics.failedRetries++;
          this.retryState.delete(retryKey);

          if (this.config.enableLogging) {
            console.error(`Operation ${operationId} failed after ${config.maxRetries + 1} attempts:`, error);
          }

          throw error;
        }

        // 计算重试次数（不包括最后一次失败）
        this.metrics.totalRetries++;

        // 计算延迟时间（指数退避）
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );

        if (this.config.enableLogging) {
          console.warn(`Operation ${operationId} failed (attempt ${attempt + 1}), retrying in ${delay}ms:`, error.message);
        }

        await this.delay(delay);
      }
    }
  }

  /**
   * 容错存储操作
   */
  async storeWithFallback(key, data, _options = {}) {
    const adapters = Array.from(this.storageAdapters.entries())
      .sort(([, a], [, b]) => a.priority - b.priority)
      .filter(([, adapter]) => adapter.available);

    let attemptCount = 0;

    for (const [name, adapter] of adapters) {
      try {
        const success = await adapter.store(key, data);
        if (success) {
          // 只有在不是第一个适配器时才计为故障转移
          if (attemptCount > 0) {
            this.metrics.storageFailovers++;
            if (this.config.enableLogging) {
              console.log(`Data stored using fallback storage: ${name}`);
            }
          }
          return { success: true, adapter: name };
        }
      } catch (error) {
        console.warn(`Storage adapter ${name} failed:`, error);
        adapter.available = false;
      }
      attemptCount++;
    }

    throw new Error('All storage adapters failed');
  }

  /**
   * 容错检索操作
   */
  async retrieveWithFallback(key) {
    const adapters = Array.from(this.storageAdapters.entries())
      .sort(([, a], [, b]) => a.priority - b.priority)
      .filter(([, adapter]) => adapter.available);

    for (const [name, adapter] of adapters) {
      try {
        const data = await adapter.retrieve(key);
        if (data !== null) {
          return { data, adapter: name };
        }
      } catch (error) {
        console.warn(`Retrieval from ${name} failed:`, error);
        continue;
      }
    }

    return { data: null, adapter: null };
  }

  /**
   * 注册降级处理
   */
  async handleRegistrationWithDegradation(userData, registrationFunction) {
    // 检查是否需要降级
    const needsDegradation = this.checkDegradationConditions();

    if (needsDegradation.network) {
      // 网络降级：保存到本地存储，稍后同步
      return await this.handleOfflineRegistration(userData);
    }

    if (needsDegradation.storage) {
      // 存储降级：使用备用存储
      return await this.handleStorageDegradedRegistration(userData, registrationFunction);
    }

    // 正常流程
    return await this.executeWithRetry('registration', () => registrationFunction(userData));
  }

  /**
   * 处理离线注册
   */
  async handleOfflineRegistration(userData) {
    this.metrics.offlineOperations++;

    const offlineData = {
      userData,
      timestamp: new Date().toISOString(),
      status: 'pending_sync',
      id: this.generateOfflineId()
    };

    await this.storeWithFallback(`offline_registration_${offlineData.id}`, offlineData);

    if (this.config.enableLogging) {
      console.log('Registration saved for offline sync:', offlineData.id);
    }

    return {
      success: true,
      offline: true,
      id: offlineData.id,
      message: '注册已保存，将在网络恢复后同步'
    };
  }

  /**
   * 处理存储降级注册
   */
  async handleStorageDegradedRegistration(userData, registrationFunction) {
    try {
      // 尝试正常注册
      const result = await this.executeWithRetry('registration', () => registrationFunction(userData));

      // 使用备用存储保存结果
      await this.storeWithFallback(`registration_backup_${Date.now()}`, {
        userData,
        result,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      // 注册失败，保存到备用存储稍后重试
      const backupData = {
        userData,
        error: error.message,
        timestamp: new Date().toISOString(),
        status: 'failed_retry_pending'
      };

      await this.storeWithFallback(`failed_registration_${Date.now()}`, backupData);

      throw error;
    }
  }

  /**
   * 检查降级条件
   */
  checkDegradationConditions() {
    const conditions = {};

    for (const [name, strategy] of this.degradationStrategies) {
      conditions[name] = strategy.condition();
    }

    return conditions;
  }

  /**
   * 同步离线数据
   */
  async syncOfflineData(syncFunction) {
    if (this.config.offlineMode) {
      if (this.config.enableLogging) {
        console.log('Still in offline mode, skipping sync');
      }
      return { synced: 0, failed: 0 };
    }

    const offlineKeys = [];

    // 查找所有离线数据
    for (const [name, adapter] of this.storageAdapters) {
      if (!adapter.available) { continue; }

      try {
        // 这里需要实现存储扫描逻辑
        // 简化实现：假设有方法获取所有键
        if (name === 'memory') {
          for (const key of this.memoryStorage.keys()) {
            if (key.startsWith('offline_registration_')) {
              offlineKeys.push({ key, adapter: name });
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to scan ${name} for offline data:`, error);
      }
    }

    let synced = 0;
    let failed = 0;

    for (const { key, adapter } of offlineKeys) {
      try {
        const storageAdapter = this.storageAdapters.get(adapter);
        const offlineData = await storageAdapter.retrieve(key);

        if (offlineData && offlineData.status === 'pending_sync') {
          await this.executeWithRetry('offline_sync', () => syncFunction(offlineData.userData));

          // 同步成功，删除离线数据
          await storageAdapter.remove(key);
          synced++;

          if (this.config.enableLogging) {
            console.log(`Synced offline registration: ${offlineData.id}`);
          }
        }
      } catch (error) {
        failed++;
        console.error(`Failed to sync offline data ${key}:`, error);
      }
    }

    return { synced, failed };
  }

  /**
   * 获取容错指标
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeRetries: this.retryState.size,
      availableStorageAdapters: Array.from(this.storageAdapters.values())
        .filter(adapter => adapter.available).length,
      isOfflineMode: this.config.offlineMode
    };
  }

  /**
   * 重置指标
   */
  resetMetrics() {
    this.metrics = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      storageFailovers: 0,
      degradationActivations: 0,
      offlineOperations: 0
    };
  }

  /**
   * 工具方法
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateOfflineId() {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理资源
   */
  destroy() {
    this.retryState.clear();
    this.storageAdapters.clear();
    this.degradationStrategies.clear();
    this.memoryStorage.clear();

    if (this.config.enableLogging) {
      console.log('RegistrationResilienceManager destroyed');
    }
  }
}

// 创建全局实例
if (typeof window !== 'undefined') {
  window.RegistrationResilienceManager = RegistrationResilienceManager;

  // 创建默认实例
  if (!window.registrationResilienceManager) {
    window.registrationResilienceManager = new RegistrationResilienceManager();
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RegistrationResilienceManager };
}
