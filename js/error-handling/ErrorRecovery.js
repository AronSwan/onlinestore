/**
 * AI生成代码来源：基于Claude 4 Sonnet重构的错误恢复策略类
 * 职责：错误恢复和重试机制
 * 遵循单一职责原则，专注于错误恢复功能
 */
class ErrorRecovery {
  constructor() {
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.errorTypes = {
      NETWORK: 'network',
      VALIDATION: 'validation',
      PERMISSION: 'permission',
      RESOURCE: 'resource',
      LOGIC: 'logic',
      SYSTEM: 'system',
      USER_INPUT: 'user_input'
    };

    this.setupRecoveryStrategies();
  }

  /**
   * 设置错误恢复策略
   */
  setupRecoveryStrategies() {
    this.recoveryStrategies = {
      [this.errorTypes.NETWORK]: this.handleNetworkError.bind(this),
      [this.errorTypes.VALIDATION]: this.handleValidationError.bind(this),
      [this.errorTypes.PERMISSION]: this.handlePermissionError.bind(this),
      [this.errorTypes.RESOURCE]: this.handleResourceErrorRecovery.bind(this),
      [this.errorTypes.LOGIC]: this.handleLogicError.bind(this),
      [this.errorTypes.SYSTEM]: this.handleSystemError.bind(this),
      [this.errorTypes.USER_INPUT]: this.handleUserInputError.bind(this)
    };
  }

  /**
   * 尝试错误恢复
   * @param {Object} error - 错误对象
   * @param {string} errorType - 错误类型
   * @param {Object} context - 错误上下文
   * @returns {boolean} 恢复是否成功
   */
  attemptRecovery(error, errorType, context) {
    const strategy = this.recoveryStrategies[errorType];
    if (strategy && typeof strategy === 'function') {
      try {
        return strategy(error, context);
      } catch (recoveryError) {
        console.error('Error recovery failed:', recoveryError);
        return false;
      }
    }
    return false;
  }

  /**
   * 网络错误恢复策略
   * @param {Object} error - 错误对象
   * @param {Object} context - 错误上下文
   * @returns {boolean} 恢复是否成功
   */
  handleNetworkError(error, context) {
    const retryKey = context.url || context.operation || 'unknown';
    const attempts = this.retryAttempts.get(retryKey) || 0;

    if (attempts < this.maxRetries) {
      this.retryAttempts.set(retryKey, attempts + 1);

      // 延迟重试 - 指数退避
      const delay = Math.pow(2, attempts) * 1000;
      setTimeout(() => {
        if (context.retryCallback && typeof context.retryCallback === 'function') {
          context.retryCallback();
        }
      }, delay);

      return true;
    }

    // 达到最大重试次数，清除重试记录
    this.retryAttempts.delete(retryKey);
    return false;
  }

  /**
   * 验证错误恢复策略
   * @param {Object} error - 错误对象
   * @param {Object} context - 错误上下文
   * @returns {boolean} 恢复是否成功
   */
  handleValidationError(error, context) {
    // 清理无效输入
    if (context.element && typeof context.element.value !== 'undefined') {
      context.element.classList.add('error');

      // 添加错误提示
      this.addValidationMessage(context.element, error.message);
    }

    return true;
  }

  /**
   * 权限错误恢复策略
   * @param {Object} error - 错误对象
   * @param {Object} context - 错误上下文
   * @returns {boolean} 恢复是否成功
   */
  handlePermissionError(error, context) {
    // 重定向到登录页面或显示权限提示
    if (context.redirectToLogin) {
      window.location.href = '/login';
      return true;
    }

    // 显示权限不足提示
    if (window.showNotification) {
      window.showNotification('您没有执行此操作的权限，请联系管理员', 'warning');
    }

    return false;
  }

  /**
   * 资源错误恢复策略
   * @param {Object} error - 错误对象
   * @param {Object} context - 错误上下文
   * @returns {boolean} 恢复是否成功
   */
  handleResourceErrorRecovery(error, context) {
    if (context.element && context.fallbackSrc) {
      context.element.src = context.fallbackSrc;
      return true;
    }

    // 尝试重新加载资源
    if (context.resourceUrl && context.retryCallback) {
      const retryKey = `resource_${context.resourceUrl}`;
      const attempts = this.retryAttempts.get(retryKey) || 0;

      if (attempts < this.maxRetries) {
        this.retryAttempts.set(retryKey, attempts + 1);
        setTimeout(() => {
          context.retryCallback();
        }, 1000 * (attempts + 1));
        return true;
      }
    }

    return false;
  }

  /**
   * 逻辑错误恢复策略
   * @param {Object} error - 错误对象
   * @param {Object} context - 错误上下文
   * @returns {boolean} 恢复是否成功
   */
  handleLogicError(error, context) {
    // 重置到安全状态
    if (context.resetCallback && typeof context.resetCallback === 'function') {
      context.resetCallback();
      return true;
    }

    // 尝试重新初始化组件
    if (context.component && context.component.reinitialize) {
      try {
        context.component.reinitialize();
        return true;
      } catch (reinitError) {
        console.error('Component reinitialization failed:', reinitError);
      }
    }

    return false;
  }

  /**
   * 系统错误恢复策略
   * @param {Object} error - 错误对象
   * @param {Object} context - 错误上下文
   * @returns {boolean} 恢复是否成功
   */
  handleSystemError(error, context) {
    // 系统错误通常需要页面刷新
    if (context.allowRefresh) {
      if (window.showNotification) {
        window.showNotification('系统出现错误，3秒后将自动刷新页面', 'error');
      }
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      return true;
    }

    // 尝试重新连接服务
    if (context.reconnectCallback) {
      const retryKey = 'system_reconnect';
      const attempts = this.retryAttempts.get(retryKey) || 0;

      if (attempts < this.maxRetries) {
        this.retryAttempts.set(retryKey, attempts + 1);
        setTimeout(() => {
          context.reconnectCallback();
        }, 5000 * (attempts + 1));
        return true;
      }
    }

    return false;
  }

  /**
   * 用户输入错误恢复策略
   * @param {Object} error - 错误对象
   * @param {Object} context - 错误上下文
   * @returns {boolean} 恢复是否成功
   */
  handleUserInputError(error, context) {
    return this.handleValidationError(error, context);
  }

  /**
   * 添加验证消息
   * @param {HTMLElement} element - 表单元素
   * @param {string} message - 错误消息
   */
  addValidationMessage(element, message) {
    // 移除现有的错误消息
    const existingMessage = element.parentNode.querySelector('.error-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    // 添加新的错误消息
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.color = 'red';
    errorDiv.style.fontSize = '12px';
    errorDiv.style.marginTop = '4px';

    element.parentNode.insertBefore(errorDiv, element.nextSibling);

    // 自动清除错误状态
    element.addEventListener('input', () => {
      element.classList.remove('error');
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, { once: true });
  }

  /**
   * 设置最大重试次数
   * @param {number} maxRetries - 最大重试次数
   */
  setMaxRetries(maxRetries) {
    this.maxRetries = maxRetries;
  }

  /**
   * 清除重试记录
   * @param {string} key - 重试键（可选）
   */
  clearRetryAttempts(key = null) {
    if (key) {
      this.retryAttempts.delete(key);
    } else {
      this.retryAttempts.clear();
    }
  }

  /**
   * 获取重试统计
   * @returns {Object} 重试统计信息
   */
  getRetryStats() {
    const stats = {
      totalRetries: this.retryAttempts.size,
      retryDetails: {}
    };

    this.retryAttempts.forEach((attempts, key) => {
      stats.retryDetails[key] = attempts;
    });

    return stats;
  }

  /**
   * 销毁恢复器
   */
  destroy() {
    this.retryAttempts.clear();
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorRecovery;
}
