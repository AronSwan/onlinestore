/**
 * ErrorManager - 错误处理管理器
 * 提供统一的错误处理、用户友好的错误信息和错误恢复机制
 */

class ErrorManager {
  constructor(config = {}) {
    this.config = {
      // 错误处理配置
      enableErrorLogging: config.enableErrorLogging !== false,
      enableUserFriendlyMessages: config.enableUserFriendlyMessages !== false,
      enableErrorRecovery: config.enableErrorRecovery !== false,
      enableErrorReporting: config.enableErrorReporting !== false,

      // 错误级别配置
      logLevel: config.logLevel || 'error', // debug, info, warn, error
      maxErrorHistory: config.maxErrorHistory || 100,

      // 恢复策略配置
      maxRetryAttempts: config.maxRetryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      enableAutoRecovery: config.enableAutoRecovery !== false,

      // 用户界面配置
      showErrorToasts: config.showErrorToasts !== false,
      errorDisplayDuration: config.errorDisplayDuration || 5000,

      ...config
    };

    // 错误历史记录
    this.errorHistory = [];

    // 错误类型映射
    this.errorTypes = {
      VALIDATION_ERROR: 'validation',
      NETWORK_ERROR: 'network',
      STORAGE_ERROR: 'storage',
      SECURITY_ERROR: 'security',
      AUTHENTICATION_ERROR: 'authentication',
      AUTHORIZATION_ERROR: 'authorization',
      SYSTEM_ERROR: 'system',
      USER_ERROR: 'user',
      UNKNOWN_ERROR: 'unknown'
    };

    // 错误恢复策略
    this.recoveryStrategies = new Map();

    // 错误监听器
    this.errorListeners = new Set();

    // 初始化状态
    this.isInitialized = false;
  }

  /**
     * 初始化错误管理器
     */
  async init() {
    try {
      console.log('ErrorManager: 开始初始化');

      // 设置全局错误处理
      this.setupGlobalErrorHandling();

      // 初始化错误恢复策略
      this.initializeRecoveryStrategies();

      // 加载错误历史记录
      await this.loadErrorHistory();

      // 设置错误报告
      if (this.config.enableErrorReporting) {
        this.setupErrorReporting();
      }

      this.isInitialized = true;
      console.log('ErrorManager: 初始化完成');

    } catch (error) {
      console.error('ErrorManager: 初始化失败', error);
      throw error;
    }
  }

  /**
     * 设置全局错误处理
     */
  setupGlobalErrorHandling() {
    // 捕获未处理的Promise拒绝
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, {
          type: this.errorTypes.SYSTEM_ERROR,
          context: 'unhandledrejection',
          recoverable: false
        });
      });

      // 捕获全局JavaScript错误
      window.addEventListener('error', (event) => {
        this.handleError(event.error, {
          type: this.errorTypes.SYSTEM_ERROR,
          context: 'global_error',
          recoverable: false,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });
    }
  }

  /**
     * 初始化错误恢复策略
     */
  initializeRecoveryStrategies() {
    // 网络错误恢复策略
    this.recoveryStrategies.set(this.errorTypes.NETWORK_ERROR, {
      canRecover: true,
      maxAttempts: this.config.maxRetryAttempts,
      delay: this.config.retryDelay,
      strategy: async (error, context, attempt) => {
        console.log(`ErrorManager: 网络错误恢复尝试 ${attempt}/${this.config.maxRetryAttempts}`);

        // 指数退避延迟
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        await this.delay(delay);

        // 检查网络连接
        if (navigator.onLine === false) {
          throw new Error('网络连接不可用');
        }

        // 重试原始操作
        if (context.retryFunction) {
          return await context.retryFunction();
        }

        return false;
      }
    });

    // 存储错误恢复策略
    this.recoveryStrategies.set(this.errorTypes.STORAGE_ERROR, {
      canRecover: true,
      maxAttempts: 2,
      delay: 500,
      strategy: async (error, context, attempt) => {
        console.log(`ErrorManager: 存储错误恢复尝试 ${attempt}/2`);

        if (attempt === 1) {
          // 第一次尝试：清理存储空间
          try {
            this.cleanupStorage();
            await this.delay(500);

            if (context.retryFunction) {
              return await context.retryFunction();
            }
          } catch (cleanupError) {
            console.warn('ErrorManager: 存储清理失败', cleanupError);
          }
        } else {
          // 第二次尝试：使用备用存储
          try {
            if (context.fallbackFunction) {
              return await context.fallbackFunction();
            }
          } catch (fallbackError) {
            console.warn('ErrorManager: 备用存储失败', fallbackError);
          }
        }

        return false;
      }
    });

    // 验证错误恢复策略
    this.recoveryStrategies.set(this.errorTypes.VALIDATION_ERROR, {
      canRecover: true,
      maxAttempts: 1,
      delay: 0,
      strategy: async (error, context, _attempt) => {
        console.log('ErrorManager: 验证错误恢复');

        // 提供用户友好的验证错误信息
        if (context.showUserMessage !== false) {
          this.showUserFriendlyError(error, context);
        }

        // 聚焦到错误字段
        if (context.fieldName && typeof document !== 'undefined') {
          const field = document.querySelector(`[name="${context.fieldName}"]`);
          if (field) {
            field.focus();
            field.classList.add('error');
          }
        }

        return true; // 验证错误通常不需要重试，只需要用户修正
      }
    });
  }

  /**
     * 处理错误
     */
  async handleError(error, options = {}) {
    try {
      const errorInfo = this.createErrorInfo(error, options);

      // 记录错误
      if (this.config.enableErrorLogging) {
        this.logError(errorInfo);
      }

      // 添加到错误历史
      this.addToErrorHistory(errorInfo);

      // 通知错误监听器
      this.notifyErrorListeners(errorInfo);

      // 尝试错误恢复
      if (this.config.enableErrorRecovery && options.recoverable !== false) {
        const recovered = await this.attemptRecovery(errorInfo);
        if (recovered) {
          console.log('ErrorManager: 错误恢复成功');
          return { recovered: true, errorInfo };
        }
      }

      // 显示用户友好的错误信息
      if (this.config.enableUserFriendlyMessages && options.showUserMessage !== false) {
        this.showUserFriendlyError(errorInfo, options);
      }

      return { recovered: false, errorInfo };

    } catch (handlingError) {
      console.error('ErrorManager: 错误处理过程中发生错误', handlingError);
      return { recovered: false, errorInfo: null };
    }
  }

  /**
     * 创建错误信息对象
     */
  createErrorInfo(error, options = {}) {
    const errorInfo = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      type: options.type || this.detectErrorType(error),
      message: error.message || error.toString(),
      stack: error.stack,
      context: options.context || 'unknown',
      severity: options.severity || 'error',
      recoverable: options.recoverable !== false,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userId: options.userId || null,
      sessionId: options.sessionId || null,
      additionalData: options.additionalData || {}
    };

    // 添加错误特定信息
    if (options.filename) { errorInfo.filename = options.filename; }
    if (options.lineno) { errorInfo.lineno = options.lineno; }
    if (options.colno) { errorInfo.colno = options.colno; }
    if (options.fieldName) { errorInfo.fieldName = options.fieldName; }

    return errorInfo;
  }

  /**
     * 检测错误类型
     */
  detectErrorType(error) {
    const message = error.message?.toLowerCase() || '';
    const name = error.name?.toLowerCase() || '';

    if (message.includes('network') || message.includes('fetch') || name.includes('networkerror')) {
      return this.errorTypes.NETWORK_ERROR;
    }

    if (message.includes('storage') || message.includes('quota') || name.includes('quotaexceedederror')) {
      return this.errorTypes.STORAGE_ERROR;
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return this.errorTypes.VALIDATION_ERROR;
    }

    if (message.includes('unauthorized') || message.includes('authentication')) {
      return this.errorTypes.AUTHENTICATION_ERROR;
    }

    if (message.includes('forbidden') || message.includes('permission')) {
      return this.errorTypes.AUTHORIZATION_ERROR;
    }

    if (message.includes('security') || message.includes('xss') || message.includes('csrf')) {
      return this.errorTypes.SECURITY_ERROR;
    }

    return this.errorTypes.UNKNOWN_ERROR;
  }

  /**
     * 尝试错误恢复
     */
  async attemptRecovery(errorInfo) {
    const strategy = this.recoveryStrategies.get(errorInfo.type);

    if (!strategy || !strategy.canRecover) {
      console.log(`ErrorManager: 错误类型 ${errorInfo.type} 不支持自动恢复`);
      return false;
    }

    for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
      try {
        console.log(`ErrorManager: 错误恢复尝试 ${attempt}/${strategy.maxAttempts}`);

        const result = await strategy.strategy(errorInfo, errorInfo.context, attempt);

        if (result) {
          console.log('ErrorManager: 错误恢复成功');
          return true;
        }

      } catch (recoveryError) {
        console.warn(`ErrorManager: 恢复尝试 ${attempt} 失败`, recoveryError);

        if (attempt === strategy.maxAttempts) {
          console.error('ErrorManager: 所有恢复尝试都失败了');
          return false;
        }
      }
    }

    return false;
  }

  /**
     * 显示用户友好的错误信息
     */
  showUserFriendlyError(errorInfo, _options = {}) {
    const userMessage = this.getUserFriendlyMessage(errorInfo);

    if (this.config.showErrorToasts && typeof document !== 'undefined') {
      this.showErrorToast(userMessage, errorInfo.severity);
    }

    // 触发自定义错误显示事件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('userError', {
        detail: {
          message: userMessage,
          severity: errorInfo.severity,
          type: errorInfo.type,
          errorId: errorInfo.id
        }
      }));
    }
  }

  /**
     * 获取用户友好的错误信息
     */
  getUserFriendlyMessage(errorInfo) {
    const errorMessages = {
      [this.errorTypes.VALIDATION_ERROR]: {
        'username': '用户名格式不正确，请使用3-20个字符，只能包含字母、数字和下划线',
        'email': '邮箱格式不正确，请输入有效的邮箱地址',
        'password': '密码强度不够，请使用至少8个字符，包含大小写字母、数字和特殊字符',
        'default': '输入信息有误，请检查并重新输入'
      },
      [this.errorTypes.NETWORK_ERROR]: {
        'default': '网络连接出现问题，请检查网络连接后重试'
      },
      [this.errorTypes.STORAGE_ERROR]: {
        'default': '数据保存失败，请清理浏览器缓存后重试'
      },
      [this.errorTypes.AUTHENTICATION_ERROR]: {
        'default': '身份验证失败，请重新登录'
      },
      [this.errorTypes.AUTHORIZATION_ERROR]: {
        'default': '您没有权限执行此操作'
      },
      [this.errorTypes.SECURITY_ERROR]: {
        'default': '安全检查失败，请确保输入内容安全'
      },
      [this.errorTypes.SYSTEM_ERROR]: {
        'default': '系统出现错误，请稍后重试'
      },
      [this.errorTypes.USER_ERROR]: {
        'default': '操作失败，请检查输入信息'
      },
      [this.errorTypes.UNKNOWN_ERROR]: {
        'default': '发生未知错误，请联系技术支持'
      }
    };

    const typeMessages = errorMessages[errorInfo.type] || errorMessages[this.errorTypes.UNKNOWN_ERROR];

    // 尝试根据字段名获取特定消息
    if (errorInfo.fieldName && typeMessages[errorInfo.fieldName]) {
      return typeMessages[errorInfo.fieldName];
    }

    // 尝试根据错误消息关键词匹配
    const message = errorInfo.message.toLowerCase();
    for (const [key, value] of Object.entries(typeMessages)) {
      if (key !== 'default' && message.includes(key)) {
        return value;
      }
    }

    return typeMessages.default;
  }

  /**
     * 显示错误提示
     */
  showErrorToast(message, severity = 'error') {
    // 创建错误提示元素
    const toast = document.createElement('div');
    toast.className = `error-toast error-toast-${severity}`;
    toast.textContent = message;

    // 添加样式
    toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${severity === 'error' ? '#f44336' : '#ff9800'};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 400px;
            word-wrap: break-word;
            animation: slideIn 0.3s ease-out;
        `;

    // 添加动画样式
    if (!document.querySelector('#error-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'error-toast-styles';
      style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
      document.head.appendChild(style);
    }

    // 添加到页面
    document.body.appendChild(toast);

    // 自动移除
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, this.config.errorDisplayDuration);
  }

  /**
     * 记录错误
     */
  logError(errorInfo) {
    const logLevel = this.config.logLevel;
    const logMessage = `[${errorInfo.type}] ${errorInfo.message}`;

    switch (errorInfo.severity) {
    case 'debug':
      if (logLevel === 'debug') { console.debug(logMessage, errorInfo); }
      break;
    case 'info':
      if (['debug', 'info'].includes(logLevel)) { console.info(logMessage, errorInfo); }
      break;
    case 'warn':
      if (['debug', 'info', 'warn'].includes(logLevel)) { console.warn(logMessage, errorInfo); }
      break;
    case 'error':
    default:
      console.error(logMessage, errorInfo);
      break;
    }
  }

  /**
     * 添加到错误历史
     */
  addToErrorHistory(errorInfo) {
    this.errorHistory.unshift(errorInfo);

    // 保持历史记录数量限制
    if (this.errorHistory.length > this.config.maxErrorHistory) {
      this.errorHistory = this.errorHistory.slice(0, this.config.maxErrorHistory);
    }

    // 保存到本地存储
    this.saveErrorHistory();
  }

  /**
     * 加载错误历史记录
     */
  async loadErrorHistory() {
    try {
      const stored = localStorage.getItem('error_history');
      if (stored) {
        this.errorHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('ErrorManager: 加载错误历史失败', error);
      this.errorHistory = [];
    }
  }

  /**
     * 保存错误历史记录
     */
  saveErrorHistory() {
    try {
      localStorage.setItem('error_history', JSON.stringify(this.errorHistory));
    } catch (error) {
      console.warn('ErrorManager: 保存错误历史失败', error);
    }
  }

  /**
     * 设置错误报告
     */
  setupErrorReporting() {
    // 这里可以集成第三方错误报告服务
    console.log('ErrorManager: 错误报告功能已启用');
  }

  /**
     * 清理存储空间
     */
  cleanupStorage() {
    try {
      // 清理过期的缓存数据
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('temp_') || key.startsWith('cache_'))) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`ErrorManager: 清理了 ${keysToRemove.length} 个临时存储项`);

    } catch (error) {
      console.warn('ErrorManager: 存储清理失败', error);
    }
  }

  /**
     * 添加错误监听器
     */
  addErrorListener(listener) {
    this.errorListeners.add(listener);
  }

  /**
     * 移除错误监听器
     */
  removeErrorListener(listener) {
    this.errorListeners.delete(listener);
  }

  /**
     * 通知错误监听器
     */
  notifyErrorListeners(errorInfo) {
    this.errorListeners.forEach(listener => {
      try {
        listener(errorInfo);
      } catch (error) {
        console.warn('ErrorManager: 错误监听器执行失败', error);
      }
    });
  }

  /**
     * 获取错误统计
     */
  getErrorStats() {
    const stats = {
      total: this.errorHistory.length,
      byType: {},
      bySeverity: {},
      recent: this.errorHistory.slice(0, 10)
    };

    this.errorHistory.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }

  /**
     * 清除错误历史
     */
  clearErrorHistory() {
    this.errorHistory = [];
    this.saveErrorHistory();
  }

  /**
     * 生成错误ID
     */
  generateErrorId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
     * 延迟函数
     */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
     * 销毁错误管理器
     */
  destroy() {
    this.errorListeners.clear();
    this.recoveryStrategies.clear();
    this.isInitialized = false;
  }
}

// 导出ErrorManager类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorManager;
} else if (typeof window !== 'undefined') {
  window.ErrorManager = ErrorManager;
}
