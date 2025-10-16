const Config = require('./config');
const CONFIG = new Config();

/**
 * 统一错误代码定义
 * 继承现有错误代码并规范化
 */
const ERROR_CODES = {
  // 密钥管理错误 (KM - Key Management)
  KEY_MANAGEMENT: {
    KEY_GENERATION_FAILED: 'KM_001',
    KEY_LOAD_FAILED: 'KM_002',
    KEY_SAVE_FAILED: 'KM_003',
    KEY_ROTATION_FAILED: 'KM_004',
    KEY_ARCHIVE_FAILED: 'KM_005',
    KEY_NOT_FOUND: 'KM_006',
    KEY_ALREADY_EXISTS: 'KM_007',
    INVALID_KEY_FORMAT: 'KM_008',
    KEY_EXPORT_FAILED: 'KM_009',
    KEY_IMPORT_FAILED: 'KM_010',
    PASSPHRASE_REQUIRED: 'KM_011',
    INVALID_PASSPHRASE: 'KM_012',
    PASSPHRASE_TOO_WEAK: 'KM_013',
  },

  // 签名服务错误 (SS - Signature Service)
  SIGNATURE_SERVICE: {
    SIGNATURE_FAILED: 'SS_001',
    VERIFICATION_FAILED: 'SS_002',
    MULTI_SIGNATURE_INCOMPLETE: 'SS_003',
    AUTO_SIGN_FAILED: 'SS_004',
    BATCH_SIGN_FAILED: 'SS_005',
    INVALID_SIGNATURE_FORMAT: 'SS_006',
    SIGNATURE_EXPIRED: 'SS_007',
    SIGNER_NOT_TRUSTED: 'SS_008',
  },

  // 信任管理错误 (TM - Trust Management)
  TRUST_MANAGEMENT: {
    TRUST_VALIDATION_FAILED: 'TM_001',
    FINGERPRINT_INVALID: 'TM_002',
    TRUST_STORE_LOAD_FAILED: 'TM_003',
    TRUST_STORE_SAVE_FAILED: 'TM_004',
    FINGERPRINT_ALREADY_TRUSTED: 'TM_005',
    FINGERPRINT_NOT_FOUND: 'TM_006',
    REVOCATION_FAILED: 'TM_007',
  },

  // 缓存管理错误 (CM - Cache Management)
  CACHE_MANAGEMENT: {
    CACHE_INIT_FAILED: 'CM_001',
    CACHE_OPERATION_FAILED: 'CM_002',
    CACHE_EVICTION_FAILED: 'CM_003',
    CACHE_STATS_FAILED: 'CM_004',
  },

  // 文件系统错误 (FS - File System)
  FILE_SYSTEM: {
    FILE_READ_FAILED: 'FS_001',
    FILE_WRITE_FAILED: 'FS_002',
    FILE_DELETE_FAILED: 'FS_003',
    DIRECTORY_CREATE_FAILED: 'FS_004',
    PERMISSION_DENIED: 'FS_005',
    FILE_NOT_FOUND: 'FS_006',
    PATH_TRAVERSAL_DETECTED: 'FS_007',
  },

  // 异步操作错误 (AO - Async Operations)
  ASYNC_OPERATIONS: {
    OPERATION_TIMEOUT: 'AO_001',
    OPERATION_QUEUE_FULL: 'AO_002',
    CONCURRENT_OPERATION_LIMIT: 'AO_003',
    OPERATION_CANCELLED: 'AO_004',
    OPERATION_RETRY_EXCEEDED: 'AO_005',
  },

  // 配置和验证错误 (CV - Configuration & Validation)
  CONFIGURATION: {
    VALIDATION_ERROR: 'CV_001',
    SECURITY_VIOLATION: 'CV_002',
    CONFIGURATION_ERROR: 'CV_003',
    ENVIRONMENT_ERROR: 'CV_004',
    INVALID_INPUT: 'CV_005',
  },

  // 系统错误 (SY - System)
  SYSTEM: {
    MEMORY_ALLOCATION_FAILED: 'SY_001',
    PROCESS_FORK_FAILED: 'SY_002',
    RESOURCE_EXHAUSTED: 'SY_003',
    PLATFORM_NOT_SUPPORTED: 'SY_004',
  },
};

/**
 * 安全错误类
 * 继承现有错误处理并提供结构化错误信息
 */
class SecurityError extends Error {
  constructor(domain, code, message, details = {}) {
    super(message);
    this.name = 'SecurityError';
    this.domain = domain; // 'key-management', 'signature-service', 'trust-management', etc.
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.stackTrace = this.stack;

    // 保留原始错误信息
    if (details.originalError && details.originalError instanceof Error) {
      this.originalError = {
        message: details.originalError.message,
        stack: details.originalError.stack,
        name: details.originalError.name,
      };
    }
  }

  /**
   * 转换为可序列化的对象
   */
  toJSON() {
    return {
      name: this.name,
      domain: this.domain,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      stackTrace: this.stackTrace,
    };
  }

  /**
   * 获取错误严重性级别
   */
  getSeverity() {
    const criticalCodes = [
      'KM_001',
      'KM_002',
      'KM_003', // 关键密钥操作失败
      'SS_001',
      'SS_002', // 签名验证失败
      'TM_001', // 信任验证失败
      'FS_005', // 权限拒绝
      'SY_003', // 资源耗尽
    ];

    if (criticalCodes.includes(this.code)) {
      return 'CRITICAL';
    } else if (this.code.startsWith('CV_') || this.code.startsWith('FS_')) {
      return 'HIGH';
    } else {
      return 'MEDIUM';
    }
  }
}

/**
 * 错误恢复管理器
 * 继承现有错误恢复机制
 */
class ErrorRecoveryManager {
  constructor() {
    this.recoveryStrategies = new Map();
    this.operationHistory = [];
    this.maxHistorySize = CONFIG.maxRetryAttempts * 10;

    // 确保配置值存在
    if (typeof CONFIG.maxRetryAttempts === 'undefined') {
      CONFIG.maxRetryAttempts = 3;
    }
  }

  /**
   * 注册恢复策略
   */
  registerRecoveryStrategy(errorCode, strategy) {
    this.recoveryStrategies.set(errorCode, strategy);
  }

  /**
   * 执行带恢复的操作
   */
  async executeWithRecovery(operationName, operation, options = {}) {
    const maxRetries = options.maxRetries || CONFIG.maxRetryAttempts || 3;
    const retryDelay = options.retryDelay || CONFIG.operationRetryDelay || 100;
    const shouldRetry = options.shouldRetry || this.defaultRetryCondition;

    let lastError;
    let result;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        result = await operation();
        this.recordOperation(operationName, 'SUCCESS', { attempt });
        break; // 成功时跳出循环
      } catch (error) {
        lastError = error;
        this.recordOperation(operationName, 'FAILED', {
          attempt,
          error: error?.message || '未知错误',
        });

        // 检查是否应该重试
        if (attempt <= maxRetries && shouldRetry(error)) {
          const recoveryStrategy = this.recoveryStrategies.get(error?.code);

          if (recoveryStrategy) {
            try {
              await recoveryStrategy(error, attempt);
            } catch (recoveryError) {
              console.warn(`恢复策略执行失败: ${recoveryError.message}`);
            }
          }

          // 指数退避延迟
          const delay = retryDelay * Math.pow(2, attempt - 1);
          await this.delay(delay);
          continue;
        }

        break;
      }
    }

    // 如果操作成功，返回结果
    if (result !== undefined) {
      return result;
    }

    // 如果操作失败且重试次数用尽，抛出包装后的错误
    if (lastError) {
      throw this.wrapError(lastError, operationName, { attempts: maxRetries + 1 });
    }

    // 理论上不应该到达这里，但为了安全起见
    throw new SecurityError('ASYNC_OPERATIONS', 'AO_005', '操作失败但未提供错误信息');
  }

  /**
   * 默认重试条件
   */
  defaultRetryCondition(error) {
    // 网络错误、临时错误可以重试
    const retryableCodes = [
      'FS_001',
      'FS_002', // 文件读写错误
      'AO_001', // 操作超时
      'SY_003', // 资源耗尽（可能临时）
    ];

    return (
      retryableCodes.includes(error.code) ||
      error.message.includes('temporary') ||
      error.message.includes('timeout')
    );
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 包装错误
   */
  wrapError(error, operationName, context = {}) {
    if (error instanceof SecurityError) {
      return error;
    }

    // 根据错误类型推断错误代码
    let domain = 'SYSTEM';
    let code = 'SY_001';

    if (error && error.code && typeof error.code === 'string') {
      const codeParts = error.code.split('_');
      if (codeParts.length === 2) {
        domain = this.mapErrorDomain(codeParts[0]);
        code = error.code;
      }
    }

    return new SecurityError(domain, code, error?.message || '未知错误', {
      originalError: error,
      operation: operationName,
      ...context,
    });
  }

  /**
   * 映射错误域
   */
  mapErrorDomain(prefix) {
    const domainMap = {
      KM: 'key-management',
      SS: 'signature-service',
      TM: 'trust-management',
      CM: 'cache-management',
      FS: 'file-system',
      AO: 'async-operations',
      CV: 'configuration',
      SY: 'system',
    };

    return domainMap[prefix] || 'system';
  }

  /**
   * 记录操作历史
   */
  recordOperation(operation, status, details = {}) {
    const record = {
      operation,
      status,
      timestamp: new Date().toISOString(),
      ...details,
    };

    this.operationHistory.push(record);

    // 限制历史记录大小
    if (this.operationHistory.length > this.maxHistorySize) {
      this.operationHistory = this.operationHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * 获取操作统计
   */
  getOperationStats() {
    // 确保操作历史存在
    if (!this.operationHistory) {
      this.operationHistory = [];
    }

    const stats = {
      total: this.operationHistory.length,
      success: 0,
      failed: 0,
      byOperation: {},
    };

    for (const record of this.operationHistory) {
      if (record.status === 'SUCCESS') {
        stats.success++;
      } else if (record.status === 'FAILED') {
        stats.failed++;
      }

      if (!stats.byOperation[record.operation]) {
        stats.byOperation[record.operation] = { success: 0, failed: 0 };
      }

      if (record.status === 'SUCCESS') {
        stats.byOperation[record.operation].success++;
      } else if (record.status === 'FAILED') {
        stats.byOperation[record.operation].failed++;
      }
    }

    return stats;
  }
}

/**
 * 异步操作管理器
 * 继承现有异步操作管理功能
 */
class AsyncOperationManager {
  constructor() {
    this.operationQueue = [];
    this.activeOperations = new Map();
    this.operationStats = new Map();
    this.isShuttingDown = false;
  }

  /**
   * 执行带超时的操作
   */
  async executeWithTimeout(operationId, operation, timeout = CONFIG.asyncOperationTimeout) {
    if (this.isShuttingDown) {
      throw new SecurityError('ASYNC_OPERATIONS', 'AO_004', '操作被取消：系统正在关闭');
    }

    this.trackOperationStart(operationId);

    try {
      const result = await Promise.race([
        operation(),
        this.createTimeoutPromise(timeout, operationId),
      ]);

      this.trackOperationSuccess(operationId);
      return result;
    } catch (error) {
      this.trackOperationFailure(operationId, error);
      throw error;
    }
  }

  /**
   * 在队列中执行操作
   */
  async executeInQueue(operationId, operation, priority = 'normal') {
    if (this.isShuttingDown) {
      throw new SecurityError('ASYNC_OPERATIONS', 'AO_004', '操作被取消：系统正在关闭');
    }

    // 检查并发限制
    if (this.activeOperations.size >= CONFIG.maxConcurrentOperations) {
      throw new SecurityError('ASYNC_OPERATIONS', 'AO_002', '操作队列已满');
    }

    return new Promise((resolve, reject) => {
      const queueItem = {
        operationId,
        operation,
        priority,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.operationQueue.push(queueItem);
      this.processQueue();
    });
  }

  /**
   * 处理操作队列
   */
  async processQueue() {
    if (
      this.activeOperations.size >= CONFIG.maxConcurrentOperations ||
      this.operationQueue.length === 0
    ) {
      return;
    }

    // 按优先级排序
    this.operationQueue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority] || a.timestamp - b.timestamp;
    });

    const queueItem = this.operationQueue.shift();

    try {
      this.trackOperationStart(queueItem.operationId);
      const result = await queueItem.operation();
      this.trackOperationSuccess(queueItem.operationId);
      queueItem.resolve(result);
    } catch (error) {
      this.trackOperationFailure(queueItem.operationId, error);
      queueItem.reject(error);
    } finally {
      this.processQueue(); // 继续处理队列
    }
  }

  /**
   * 创建超时Promise
   */
  createTimeoutPromise(timeout, operationId) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new SecurityError('ASYNC_OPERATIONS', 'AO_001', `操作超时: ${operationId}`, {
            timeout,
            operationId,
          }),
        );
      }, timeout);
    });
  }

  /**
   * 跟踪操作开始
   */
  trackOperationStart(operationId) {
    this.activeOperations.set(operationId, {
      startTime: Date.now(),
      status: 'running',
    });
  }

  /**
   * 跟踪操作成功
   */
  trackOperationSuccess(operationId) {
    const operation = this.activeOperations.get(operationId);
    if (operation) {
      const duration = Date.now() - operation.startTime;
      this.recordStat(operationId, 'success', duration);
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * 跟踪操作失败
   */
  trackOperationFailure(operationId, error) {
    const operation = this.activeOperations.get(operationId);
    if (operation) {
      const duration = Date.now() - operation.startTime;
      this.recordStat(operationId, 'failed', duration, error);
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * 记录操作统计
   */
  recordStat(operationId, status, duration, error = null) {
    if (!this.operationStats.has(operationId)) {
      this.operationStats.set(operationId, {
        total: 0,
        success: 0,
        failed: 0,
        totalDuration: 0,
        errors: [],
      });
    }

    const stats = this.operationStats.get(operationId);
    stats.total++;
    stats.totalDuration += duration;

    if (status === 'success') {
      stats.success++;
    } else {
      stats.failed++;
      if (error) {
        stats.errors.push({
          message: error.message,
          code: error.code,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * 获取操作统计
   */
  getOperationStats() {
    const stats = {};

    for (const [operationId, operationStats] of this.operationStats) {
      stats[operationId] = {
        ...operationStats,
        averageDuration:
          operationStats.total > 0 ? operationStats.totalDuration / operationStats.total : 0,
        successRate:
          operationStats.total > 0 ? (operationStats.success / operationStats.total) * 100 : 0,
      };
    }

    return stats;
  }

  /**
   * 优雅关闭
   */
  async shutdown() {
    this.isShuttingDown = true;

    // 等待所有活跃操作完成
    const maxWaitTime = 30000; // 30秒
    const startTime = Date.now();

    while (this.activeOperations.size > 0 && Date.now() - startTime < maxWaitTime) {
      await this.delay(100);
    }

    // 清除队列中剩余的操作
    for (const item of this.operationQueue) {
      item.reject(new SecurityError('ASYNC_OPERATIONS', 'AO_004', '操作被取消：系统关闭'));
    }

    this.operationQueue = [];
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出所有组件
module.exports = {
  ERROR_CODES,
  SecurityError,
  ErrorRecoveryManager,
  AsyncOperationManager,
};
