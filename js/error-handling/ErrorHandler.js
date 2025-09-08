/* global Utils */
/**
 * AI生成代码来源：基于Claude 4 Sonnet重构的错误处理核心类
 * 职责：统一错误处理和分类
 * 遵循单一职责原则，专注于错误处理逻辑
 */
class ErrorHandler {
  constructor(logger, recovery, notifier) {
    this.logger = logger;
    this.recovery = recovery;
    this.notifier = notifier;
    this.errorQueue = [];
    this.maxQueueSize = 100;
    this.initialized = false;

    this.initErrorClassifier();
  }

  /**
   * 初始化错误分类器
   */
  initErrorClassifier() {
    this.errorTypes = {
      NETWORK: 'network',
      VALIDATION: 'validation',
      PERMISSION: 'permission',
      RESOURCE: 'resource',
      LOGIC: 'logic',
      SYSTEM: 'system',
      USER_INPUT: 'user_input'
    };

    this.severityLevels = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };
  }

  /**
   * 处理错误的主要方法
   * @param {Error|string} error - 错误对象或错误消息
   * @param {Object} context - 错误上下文信息
   * @param {Object} options - 处理选项
   */
  handleError(error, context = {}, options = {}) {
    try {
      // 标准化错误对象
      const standardizedError = this.standardizeError(error, context);

      // 分类错误
      const errorType = this.classifyError(standardizedError);
      const severity = this.determineSeverity(standardizedError, errorType);

      // 记录错误
      if (this.logger) {
        this.logger.logError(standardizedError, errorType, severity);
      }

      // 尝试恢复
      if (options.attemptRecovery !== false && this.recovery) {
        this.recovery.attemptRecovery(standardizedError, errorType, context);
      }

      // 用户反馈
      if (options.showUserFeedback !== false && this.notifier) {
        this.notifier.showUserFeedback(standardizedError, errorType, severity);
      }

      // 添加到错误队列
      this.addToErrorQueue(standardizedError, errorType, severity);

      return {
        handled: true,
        errorId: standardizedError.id,
        type: errorType,
        severity: severity
      };

    } catch (handlingError) {
      console.error('Error in error handling:', handlingError);
      this.fallbackErrorHandling(error, handlingError);
      return { handled: false, fallback: true };
    }
  }

  /**
   * 标准化错误对象
   */
  standardizeError(error, context) {
    const standardized = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      message: '',
      stack: '',
      context: context || {},
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    if (error instanceof Error) {
      standardized.message = error.message;
      standardized.stack = error.stack;
      standardized.name = error.name;
    } else if (typeof error === 'string') {
      standardized.message = error;
    } else if (typeof error === 'object') {
      Object.assign(standardized, error);
    }

    return standardized;
  }

  /**
   * 分类错误类型
   */
  classifyError(error) {
    const message = error.message?.toLowerCase() || '';

    // 网络错误
    if (message.includes('network') || message.includes('fetch') ||
      message.includes('timeout') || message.includes('connection')) {
      return this.errorTypes.NETWORK;
    }

    // 验证错误
    if (message.includes('validation') || message.includes('invalid') ||
      message.includes('required') || message.includes('format')) {
      return this.errorTypes.VALIDATION;
    }

    // 权限错误
    if (message.includes('permission') || message.includes('unauthorized') ||
      message.includes('forbidden') || message.includes('access denied')) {
      return this.errorTypes.PERMISSION;
    }

    // 资源错误
    if (message.includes('not found') || message.includes('404') ||
      message.includes('resource') || error.type === 'resource') {
      return this.errorTypes.RESOURCE;
    }

    // 系统错误
    if (message.includes('system') || message.includes('internal') ||
      message.includes('server') || message.includes('500')) {
      return this.errorTypes.SYSTEM;
    }

    // 默认为逻辑错误
    return this.errorTypes.LOGIC;
  }

  /**
   * 确定错误严重程度
   */
  determineSeverity(error, errorType) {
    const message = error.message?.toLowerCase() || '';

    // 关键错误
    if (message.includes('critical') || message.includes('fatal') ||
      message.includes('crash') || errorType === this.errorTypes.SYSTEM) {
      return this.severityLevels.CRITICAL;
    }

    // 高严重性错误
    if (message.includes('error') || errorType === this.errorTypes.PERMISSION ||
      errorType === this.errorTypes.NETWORK) {
      return this.severityLevels.HIGH;
    }

    // 中等严重性错误
    if (message.includes('warning') || errorType === this.errorTypes.VALIDATION) {
      return this.severityLevels.MEDIUM;
    }

    // 低严重性错误
    return this.severityLevels.LOW;
  }

  /**
   * 添加到错误队列
   */
  addToErrorQueue(error, errorType, severity) {
    this.errorQueue.push({
      error,
      errorType,
      severity,
      timestamp: Date.now()
    });

    // 保持队列大小
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }
  }

  /**
   * 生成错误ID
   */
  generateErrorId() {
    return Utils.generateErrorId();
  }

  /**
   * 降级错误处理
   */
  fallbackErrorHandling(originalError, handlingError) {
    try {
      console.error('Original error:', originalError);
      console.error('Error handling failed:', handlingError);

      // 最基本的用户反馈
      if (window.showNotification) {
        window.showNotification('系统出现错误，请刷新页面重试', 'error');
      }
    } catch (fallbackError) {
      // 最后的降级措施
      console.error('Fallback error handling failed:', fallbackError);
    }
  }

  /**
   * 获取错误统计
   */
  getErrorStats() {
    const stats = {
      total: this.errorQueue.length,
      byType: {},
      bySeverity: {},
      recent: this.errorQueue.slice(-10)
    };

    this.errorQueue.forEach(item => {
      stats.byType[item.errorType] = (stats.byType[item.errorType] || 0) + 1;
      stats.bySeverity[item.severity] = (stats.bySeverity[item.severity] || 0) + 1;
    });

    return stats;
  }

  /**
   * 清理错误队列
   */
  clearErrorQueue() {
    this.errorQueue = [];
  }

  /**
   * 销毁错误处理器
   */
  destroy() {
    this.clearErrorQueue();
    this.initialized = false;
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
}
