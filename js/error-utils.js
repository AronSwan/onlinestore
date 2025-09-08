/**
 * AI生成代码来源：基于Claude 4 Sonnet重构的错误处理工具类
 * 重构说明：采用组合模式，将原有的单一类拆分为多个专职类
 * 遵循SOLID原则，提高代码的可维护性和可扩展性
 */

// 导入专职类
const ErrorHandler = window.ErrorHandler || require('./error-handling/ErrorHandler');
const ErrorLogger = window.ErrorLogger || require('./error-handling/ErrorLogger');
const ErrorRecovery = window.ErrorRecovery || require('./error-handling/ErrorRecovery');
const ErrorNotifier = window.ErrorNotifier || require('./error-handling/ErrorNotifier');

class ErrorUtils {
  constructor() {
    this.errorQueue = [];
    this.maxQueueSize = 100;
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.initialized = false;

    // 初始化专职组件
    this.handler = new ErrorHandler();
    this.logger = new ErrorLogger();
    this.recovery = new ErrorRecovery();
    this.notifier = new ErrorNotifier();

    this.init();
  }

  /**
     * 初始化错误处理系统
     */
  init() {
    try {
      // 设置全局错误处理器
      this.setupGlobalErrorHandlers();

      this.initialized = true;
      console.log('ErrorUtils initialized successfully with modular architecture');
    } catch (error) {
      console.error('Failed to initialize ErrorUtils:', error);
    }
  }

  /**
     * 设置全局错误处理器
     */
  setupGlobalErrorHandlers() {
    // 捕获未处理的JavaScript错误
    window.addEventListener('error', (event) => {
      const error = {
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        timestamp: Date.now()
      };
      const context = { global: true, source: 'global_error_handler' };
      this.handleError(error, this.errorTypes.SYSTEM, context);
    });

    // 捕获未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      const error = {
        type: 'promise',
        message: event.reason?.message || 'Unhandled promise rejection',
        reason: event.reason,
        timestamp: Date.now()
      };
      const context = { global: true, source: 'unhandled_promise_rejection' };
      this.handleError(error, this.errorTypes.SYSTEM, context);
    });

    // 捕获资源加载错误
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        const error = {
          type: 'resource',
          element: event.target.tagName,
          source: event.target.src || event.target.href,
          message: 'Resource loading failed',
          timestamp: Date.now()
        };
        const context = { resource: true, element: event.target };
        this.handleError(error, this.errorTypes.RESOURCE, context);
      }
    }, true);
  }

  /**
     * 获取错误类型（委托给ErrorHandler）
     */
  get errorTypes() {
    return this.handler.errorTypes;
  }

  /**
     * 获取严重程度级别（委托给ErrorHandler）
     */
  get severityLevels() {
    return this.handler.severityLevels;
  }


  /**
     * 处理错误的主要方法
     * @param {Error|string} error - 错误对象或错误消息
     * @param {string} type - 错误类型
     * @param {Object} context - 错误上下文信息
     * @param {Object} options - 处理选项
     */
  handleError(error, type = this.errorTypes.SYSTEM, context = {}, options = {}) {
    try {
      // 使用ErrorHandler处理错误
      const processedError = this.handler.handleError(error, type, context);

      // 使用ErrorLogger记录错误
      this.logger.logError(processedError.error, processedError.type, processedError.severity, context);

      // 使用ErrorRecovery尝试恢复
      let recovered = false;
      if (options.attemptRecovery !== false) {
        recovered = this.recovery.attemptRecovery(processedError.error, processedError.type, context);
      }

      // 用户反馈和通知
      if (options.showUserFeedback !== false) {
        if (!recovered && processedError.severity >= 3) {
          this.notifier.showUserFeedbackForm(processedError.error, context);
        } else if (processedError.severity >= 2) {
          const notificationType = this.getNotificationType(processedError.severity);
          this.notifier.showNotification(processedError.error.message, notificationType);
        }
      }

      // 添加到错误队列
      this.addToErrorQueue(processedError.error, processedError.type, processedError.severity);

      return {
        handled: true,
        errorId: processedError.error.id,
        type: processedError.type,
        severity: processedError.severity,
        recovered: recovered
      };

    } catch (handlingError) {
      console.error('Error in error handling:', handlingError);
      this.fallbackErrorHandling(error, handlingError);
      return { handled: false, fallback: true };
    }
  }


  /**
     * 获取通知类型
     * @param {number} severity - 严重程度
     * @returns {string} 通知类型
     */
  getNotificationType(severity) {
    return this.notifier.getNotificationType(severity);
  }


  /**
     * 添加验证消息（委托给ErrorNotifier）
     */
  addValidationMessage(element, message) {
    this.notifier.addValidationMessage(element, message);
  }


  /**
     * 添加到错误队列（委托给ErrorLogger）
     */
  addToErrorQueue(error, errorType, severity) {
    this.logger.addToErrorQueue(error, errorType, severity);
  }

  /**
     * 生成错误ID（委托给ErrorHandler）
     */
  generateErrorId() {
    return this.handler.generateErrorId();
  }

  /**
     * 发送到监控服务（委托给ErrorLogger）
     */
  sendToMonitoringService(error, errorType, severity) {
    this.logger.sendToMonitoringService(error, errorType, severity);
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
     * 获取错误统计（委托给ErrorLogger）
     */
  getErrorStats() {
    return this.logger.getErrorStats();
  }

  /**
     * 清理错误队列（委托给ErrorLogger）
     */
  clearErrorQueue() {
    this.logger.clearErrorQueue();
    this.retryAttempts.clear();
  }

  /**
     * 销毁错误处理器
     */
  destroy() {
    // 清理各个组件
    if (this.handler) { this.handler.destroy(); }
    if (this.logger) { this.logger.destroy(); }
    if (this.recovery) { this.recovery.destroy(); }
    if (this.notifier) { this.notifier.destroy(); }

    this.clearErrorQueue();
    this.initialized = false;
    console.log('ErrorUtils destroyed');
  }
}

// 创建全局实例
if (!window.errorUtils) {
  window.errorUtils = new ErrorUtils();
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorUtils;
}
