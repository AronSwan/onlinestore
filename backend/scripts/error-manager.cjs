#!/usr/bin/env node

/**
 * 错误管理器 - 统一错误处理入口
 */

const EventEmitter = require('events');
const { StandardError, ErrorTypes, ErrorSeverity } = require('./error-handler.cjs');
const { CircuitBreaker } = require('./circuit-breaker.cjs');
const { RetryStrategy } = require('./retry-strategy.cjs');

// 主错误处理器
class ErrorManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      enableCircuitBreaker: options.enableCircuitBreaker !== false,
      enableRetry: options.enableRetry !== false,
      enableFallback: options.enableFallback !== false,
      logErrors: options.logErrors !== false,
      ...options
    };
    
    this.circuitBreakers = new Map();
    this.retryStrategies = new Map();
    this.errorHistory = [];
    this.errorStats = new Map();
    this.fallbackHandlers = new Map();
    
    this.setupDefaultStrategies();
  }
  
  setupDefaultStrategies() {
    // 默认重试策略
    this.retryStrategies.set('default', new RetryStrategy());
    this.retryStrategies.set('network', new RetryStrategy({
      maxAttempts: 5,
      initialDelay: 2000,
      maxDelay: 60000
    }));
    this.retryStrategies.set('command', new RetryStrategy({
      maxAttempts: 3,
      initialDelay: 1000,
      retryableErrors: [ErrorTypes.COMMAND_TIMEOUT, ErrorTypes.COMMAND_RATE_LIMIT]
    }));
    
    // 默认熔断器
    this.circuitBreakers.set('default', new CircuitBreaker());
    this.circuitBreakers.set('critical', new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeout: 60000
    }));
  }
  
  /**
   * 处理错误
   */
  async handleError(error, context = {}) {
    const standardError = this.standardizeError(error, context);
    this.recordError(standardError);
    
    if (this.options.logErrors) {
      this.logError(standardError);
    }
    
    this.emit('error-handled', standardError);
    
    return standardError;
  }
  
  /**
   * 执行带错误处理的操作
   */
  async executeWithHandling(operation, options = {}) {
    const {
      retryStrategy = 'default',
      circuitBreakerKey = 'default',
      fallbackKey = null,
      context = {}
    } = options;
    
    try {
      // 使用熔断器包装操作
      if (this.options.enableCircuitBreaker && this.circuitBreakers.has(circuitBreakerKey)) {
        const circuitBreaker = this.circuitBreakers.get(circuitBreakerKey);
        const fallback = fallbackKey ? this.fallbackHandlers.get(fallbackKey) : null;
        
        return await circuitBreaker.execute(async () => {
          // 使用重试策略执行操作
          if (this.options.enableRetry && this.retryStrategies.has(retryStrategy)) {
            const retry = this.retryStrategies.get(retryStrategy);
            return await retry.execute(operation, context);
          }
          
          return await operation();
        }, fallback);
      }
      
      // 仅使用重试策略
      if (this.options.enableRetry && this.retryStrategies.has(retryStrategy)) {
        const retry = this.retryStrategies.get(retryStrategy);
        return await retry.execute(operation, context);
      }
      
      // 直接执行操作
      return await operation();
      
    } catch (error) {
      const handledError = await this.handleError(error, context);
      throw handledError;
    }
  }
  
  /**
   * 标准化错误
   */
  standardizeError(error, context = {}) {
    if (error instanceof StandardError) {
      return error;
    }
    
    const errorType = this.classifyError(error);
    const severity = this.determineSeverity(error, errorType);
    
    return new StandardError(
      error.message || 'Unknown error occurred',
      errorType,
      severity,
      {
        originalError: error.name,
        stack: error.stack,
        ...context
      }
    );
  }
  
  /**
   * 分类错误
   */
  classifyError(error) {
    const message = (error.message || '').toLowerCase();
    
    // 系统错误
    if (message.includes('memory') || message.includes('heap')) {
      return ErrorTypes.MEMORY_ERROR;
    }
    if (message.includes('disk') || message.includes('enospc')) {
      return ErrorTypes.DISK_ERROR;
    }
    if (message.includes('network') || message.includes('enotfound')) {
      return ErrorTypes.NETWORK_ERROR;
    }
    
    // 命令执行错误
    if (message.includes('timeout')) {
      return ErrorTypes.COMMAND_TIMEOUT;
    }
    if (message.includes('command') || message.includes('spawn')) {
      return ErrorTypes.COMMAND_FAILED;
    }
    
    // 验证错误
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorTypes.VALIDATION_ERROR;
    }
    
    // 安全错误
    if (message.includes('permission') || message.includes('access')) {
      return ErrorTypes.PERMISSION_DENIED;
    }
    
    return ErrorTypes.UNKNOWN_ERROR;
  }
  
  /**
   * 确定错误严重级别
   */
  determineSeverity(error, errorType) {
    const criticalTypes = [
      ErrorTypes.SECURITY_VIOLATION,
      ErrorTypes.INJECTION_ATTEMPT,
      ErrorTypes.DATA_CONSISTENCY_ERROR
    ];
    
    const highTypes = [
      ErrorTypes.MEMORY_ERROR,
      ErrorTypes.DISK_ERROR,
      ErrorTypes.PERMISSION_DENIED
    ];
    
    if (criticalTypes.includes(errorType)) {
      return ErrorSeverity.CRITICAL;
    }
    if (highTypes.includes(errorType)) {
      return ErrorSeverity.HIGH;
    }
    
    return ErrorSeverity.MEDIUM;
  }
  
  /**
   * 记录错误
   */
  recordError(error) {
    this.errorHistory.push(error);
    
    // 限制历史记录大小
    if (this.errorHistory.length > 1000) {
      this.errorHistory = this.errorHistory.slice(-500);
    }
    
    // 更新统计信息
    const key = `${error.type}_${error.severity}`;
    if (!this.errorStats.has(key)) {
      this.errorStats.set(key, {
        count: 0,
        firstOccurrence: error.timestamp,
        lastOccurrence: error.timestamp
      });
    }
    
    const stats = this.errorStats.get(key);
    stats.count++;
    stats.lastOccurrence = error.timestamp;
  }
  
  /**
   * 记录错误日志
   */
  logError(error) {
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = `[${error.severity}] ${error.type}: ${error.message}`;
    
    console[logLevel](`${new Date().toISOString()} - ${logMessage}`);
    if (error.context && Object.keys(error.context).length > 0) {
      console[logLevel]('Context:', error.context);
    }
  }
  
  getLogLevel(severity) {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'error';
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'log';
    }
  }
  
  /**
   * 注册降级处理器
   */
  registerFallbackHandler(key, handler) {
    if (typeof handler !== 'function') {
      throw new StandardError('Fallback handler must be a function', ErrorTypes.PARAMETER_ERROR);
    }
    
    this.fallbackHandlers.set(key, handler);
    return () => this.fallbackHandlers.delete(key);
  }
  
  /**
   * 获取错误统计
   */
  getErrorStats() {
    return {
      totalErrors: this.errorHistory.length,
      errorsByType: Object.fromEntries(this.errorStats),
      recentErrors: this.errorHistory.slice(-10),
      circuitBreakerStats: Object.fromEntries(
        Array.from(this.circuitBreakers.entries()).map(([key, cb]) => [key, cb.getState()])
      )
    };
  }
  
  /**
   * 重置统计信息
   */
  resetStats() {
    this.errorHistory = [];
    this.errorStats.clear();
    this.circuitBreakers.forEach(cb => cb.reset());
    this.emit('stats-reset');
  }
}

module.exports = ErrorManager;