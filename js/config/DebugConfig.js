/**
 * 调试配置管理器
 * 专门负责调试相关的配置常量和设置
 */
class DebugConfig {
  constructor() {
    this.config = {
      ENABLED: process?.env?.NODE_ENV === 'development' ||
        (typeof window !== 'undefined' && window.location.hostname === 'localhost'),
      LOG_LEVELS: {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3,
        TRACE: 4
      },
      CURRENT_LOG_LEVEL: 2, // INFO level by default
      CONSOLE_STYLES: {
        error: 'color: #ff4444; font-weight: bold;',
        warn: 'color: #ffaa00; font-weight: bold;',
        info: 'color: #4444ff; font-weight: normal;',
        debug: 'color: #888888; font-weight: normal;',
        trace: 'color: #cccccc; font-weight: normal;',
        success: 'color: #44ff44; font-weight: bold;'
      },
      PERFORMANCE_MONITORING: {
        enabled: true,
        trackUserTiming: true,
        trackResourceTiming: true,
        trackNavigationTiming: true,
        slowThreshold: 1000 // ms
      },
      ERROR_REPORTING: {
        enabled: true,
        includeStackTrace: true,
        includeUserAgent: true,
        includeUrl: true,
        maxErrorsPerSession: 50
      },
      FEATURE_FLAGS: {
        enableVerboseLogging: false,
        enablePerformanceLogging: true,
        enableErrorBoundary: true,
        enableDevTools: true
      },
      STORAGE_KEYS: {
        debugMode: 'debug_mode_enabled',
        logLevel: 'debug_log_level',
        performanceData: 'debug_performance_data',
        errorLog: 'debug_error_log'
      }
    };

    // 检查localStorage中的调试设置
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedDebugMode = localStorage.getItem(this.config.STORAGE_KEYS.debugMode);
      if (storedDebugMode !== null) {
        this.config.ENABLED = storedDebugMode === 'true';
      }

      const storedLogLevel = localStorage.getItem(this.config.STORAGE_KEYS.logLevel);
      if (storedLogLevel !== null) {
        this.config.CURRENT_LOG_LEVEL = parseInt(storedLogLevel, 10);
      }
    }

    Object.freeze(this.config);
  }

  /**
   * 获取配置值
   * @param {string} key - 配置键
   * @param {*} defaultValue - 默认值
   * @returns {*} 配置值
   */
  get(key, defaultValue) {
    return Object.prototype.hasOwnProperty.call(this.config, key) ? this.config[key] : defaultValue;
  }

  /**
   * 检查配置键是否存在
   * @param {string} key - 配置键
   * @returns {boolean} 是否存在
   */
  has(key) {
    return Object.prototype.hasOwnProperty.call(this.config, key);
  }

  /**
   * 获取所有配置
   * @returns {object} 配置对象的深拷贝
   */
  getAll() {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * 检查调试模式是否启用
   * @returns {boolean} 是否启用调试模式
   */
  isEnabled() {
    return this.config.ENABLED;
  }

  /**
   * 获取当前日志级别
   * @returns {number} 当前日志级别
   */
  getCurrentLogLevel() {
    return this.config.CURRENT_LOG_LEVEL;
  }

  /**
   * 检查指定日志级别是否应该输出
   * @param {string|number} level - 日志级别
   * @returns {boolean} 是否应该输出
   */
  shouldLog(level) {
    if (!this.isEnabled()) { return false; }

    const levelValue = typeof level === 'string' ?
      this.config.LOG_LEVELS[level.toUpperCase()] : level;

    return levelValue <= this.config.CURRENT_LOG_LEVEL;
  }

  /**
   * 获取日志级别配置
   * @returns {object} 日志级别配置
   */
  getLogLevels() {
    return JSON.parse(JSON.stringify(this.config.LOG_LEVELS));
  }

  /**
   * 获取控制台样式
   * @param {string} type - 样式类型
   * @returns {string} CSS样式字符串
   */
  getConsoleStyle(type) {
    return this.config.CONSOLE_STYLES[type] || this.config.CONSOLE_STYLES.info;
  }

  /**
   * 获取所有控制台样式
   * @returns {object} 所有控制台样式
   */
  getAllConsoleStyles() {
    return JSON.parse(JSON.stringify(this.config.CONSOLE_STYLES));
  }

  /**
   * 获取性能监控配置
   * @returns {object} 性能监控配置
   */
  getPerformanceConfig() {
    return JSON.parse(JSON.stringify(this.config.PERFORMANCE_MONITORING));
  }

  /**
   * 检查性能监控是否启用
   * @returns {boolean} 是否启用性能监控
   */
  isPerformanceMonitoringEnabled() {
    return this.config.PERFORMANCE_MONITORING.enabled && this.isEnabled();
  }

  /**
   * 获取错误报告配置
   * @returns {object} 错误报告配置
   */
  getErrorReportingConfig() {
    return JSON.parse(JSON.stringify(this.config.ERROR_REPORTING));
  }

  /**
   * 检查错误报告是否启用
   * @returns {boolean} 是否启用错误报告
   */
  isErrorReportingEnabled() {
    return this.config.ERROR_REPORTING.enabled && this.isEnabled();
  }

  /**
   * 获取功能标志配置
   * @returns {object} 功能标志配置
   */
  getFeatureFlags() {
    return JSON.parse(JSON.stringify(this.config.FEATURE_FLAGS));
  }

  /**
   * 检查功能标志是否启用
   * @param {string} flagName - 功能标志名称
   * @returns {boolean} 是否启用
   */
  isFeatureEnabled(flagName) {
    return this.config.FEATURE_FLAGS[flagName] === true && this.isEnabled();
  }

  /**
   * 获取存储键配置
   * @returns {object} 存储键配置
   */
  getStorageKeys() {
    return JSON.parse(JSON.stringify(this.config.STORAGE_KEYS));
  }

  /**
   * 格式化日志消息
   * @param {string} level - 日志级别
   * @param {string} message - 消息内容
   * @param {*} data - 附加数据
   * @returns {object} 格式化后的日志对象
   */
  formatLogMessage(level, message, data = null) {
    return {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      data,
      url: typeof window !== 'undefined' ? window.location.href : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null
    };
  }

  /**
   * 检查是否应该记录性能数据
   * @param {number} duration - 执行时长
   * @returns {boolean} 是否应该记录
   */
  shouldLogPerformance(duration) {
    return this.isPerformanceMonitoringEnabled() &&
      duration >= this.config.PERFORMANCE_MONITORING.slowThreshold;
  }

  /**
   * 获取调试信息摘要
   * @returns {object} 调试信息摘要
   */
  getDebugSummary() {
    return {
      enabled: this.isEnabled(),
      logLevel: this.getCurrentLogLevel(),
      performanceMonitoring: this.isPerformanceMonitoringEnabled(),
      errorReporting: this.isErrorReportingEnabled(),
      featureFlags: this.getFeatureFlags(),
      environment: {
        isDevelopment: process?.env?.NODE_ENV === 'development',
        isLocalhost: typeof window !== 'undefined' && window.location.hostname === 'localhost',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null
      }
    };
  }
}

// 创建全局实例
const debugConfig = new DebugConfig();

// 导出配置管理器
if (typeof window !== 'undefined') {
  window.DebugConfig = DebugConfig;
  window.debugConfig = debugConfig;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DebugConfig, debugConfig };
}
