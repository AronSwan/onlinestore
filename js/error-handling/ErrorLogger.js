/**
 * AI生成代码来源：基于Claude 4 Sonnet重构的错误日志记录类
 * 职责：错误日志记录和监控服务集成
 * 遵循单一职责原则，专注于日志记录功能
 */
class ErrorLogger {
  constructor() {
    this.severityLevels = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };
  }

  /**
   * 记录错误
   * @param {Object} error - 标准化错误对象
   * @param {string} errorType - 错误类型
   * @param {string} severity - 错误严重程度
   */
  logError(error, errorType, severity) {
    const logLevel = this.getLogLevel(severity);
    const logMessage = `[${errorType.toUpperCase()}] ${error.message}`;

    // 根据严重程度选择日志级别
    switch (logLevel) {
    case 'error':
      console.error(logMessage, error);
      break;
    case 'warn':
      console.warn(logMessage, error);
      break;
    default:
      console.log(logMessage, error);
    }

    // 发送到错误监控服务（如果配置了）
    this.sendToMonitoringService(error, errorType, severity);
  }

  /**
   * 获取日志级别
   * @param {string} severity - 错误严重程度
   * @returns {string} 日志级别
   */
  getLogLevel(severity) {
    switch (severity) {
    case this.severityLevels.CRITICAL:
    case this.severityLevels.HIGH:
      return 'error';
    case this.severityLevels.MEDIUM:
      return 'warn';
    default:
      return 'log';
    }
  }

  /**
   * 发送到监控服务
   * @param {Object} error - 错误对象
   * @param {string} errorType - 错误类型
   * @param {string} severity - 错误严重程度
   */
  sendToMonitoringService(error, errorType, severity) {
    // 这里可以集成第三方错误监控服务
    // 例如：Sentry, LogRocket, Bugsnag等
    try {
      // 示例：发送到自定义监控端点
      if (window.errorMonitoringEndpoint) {
        fetch(window.errorMonitoringEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            error,
            errorType,
            severity,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href
          })
        }).catch(() => {
          // 静默失败，避免错误循环
        });
      }
    } catch (monitoringError) {
      // 静默失败，避免错误循环
    }
  }

  /**
   * 记录性能指标
   * @param {string} metric - 指标名称
   * @param {number} value - 指标值
   * @param {Object} context - 上下文信息
   */
  logPerformanceMetric(metric, value, context = {}) {
    const performanceData = {
      metric,
      value,
      context,
      timestamp: Date.now(),
      url: window.location.href
    };

    console.log(`[PERFORMANCE] ${metric}: ${value}`, performanceData);

    // 发送到性能监控服务
    this.sendPerformanceData(performanceData);
  }

  /**
   * 发送性能数据
   * @param {Object} performanceData - 性能数据
   */
  sendPerformanceData(performanceData) {
    try {
      if (window.performanceMonitoringEndpoint) {
        fetch(window.performanceMonitoringEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(performanceData)
        }).catch(() => {
          // 静默失败
        });
      }
    } catch (error) {
      // 静默失败
    }
  }

  /**
   * 记录用户行为
   * @param {string} action - 用户行为
   * @param {Object} data - 行为数据
   */
  logUserAction(action, data = {}) {
    const actionData = {
      action,
      data,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    console.log(`[USER_ACTION] ${action}`, actionData);

    // 发送到用户行为分析服务
    this.sendUserActionData(actionData);
  }

  /**
   * 发送用户行为数据
   * @param {Object} actionData - 用户行为数据
   */
  sendUserActionData(actionData) {
    try {
      if (window.analyticsEndpoint) {
        fetch(window.analyticsEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(actionData)
        }).catch(() => {
          // 静默失败
        });
      }
    } catch (error) {
      // 静默失败
    }
  }

  /**
   * 批量发送日志
   * @param {Array} logs - 日志数组
   */
  batchSendLogs(logs) {
    if (!logs || logs.length === 0) {
      return;
    }

    try {
      if (window.batchLoggingEndpoint) {
        fetch(window.batchLoggingEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            logs,
            timestamp: Date.now(),
            batchSize: logs.length
          })
        }).catch(() => {
          // 静默失败
        });
      }
    } catch (error) {
      // 静默失败
    }
  }

  /**
   * 设置日志级别
   * @param {string} level - 日志级别
   */
  setLogLevel(level) {
    this.currentLogLevel = level;
  }

  /**
   * 检查是否应该记录日志
   * @param {string} severity - 错误严重程度
   * @returns {boolean} 是否应该记录
   */
  shouldLog(severity) {
    if (!this.currentLogLevel) {
      return true;
    }

    const levelPriority = {
      [this.severityLevels.LOW]: 1,
      [this.severityLevels.MEDIUM]: 2,
      [this.severityLevels.HIGH]: 3,
      [this.severityLevels.CRITICAL]: 4
    };

    return levelPriority[severity] >= levelPriority[this.currentLogLevel];
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorLogger;
}
