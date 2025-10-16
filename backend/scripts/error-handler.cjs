#!/usr/bin/env node

/**
 * 统一错误处理器 - 标准化错误分类和处理机制
 * 实现错误恢复、熔断器模式和优雅降级
 */

const EventEmitter = require('events');

// 标准错误类型枚举
const ErrorTypes = {
  // 系统错误
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  MEMORY_ERROR: 'MEMORY_ERROR',
  DISK_ERROR: 'DISK_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  
  // 命令执行错误
  COMMAND_FAILED: 'COMMAND_FAILED',
  COMMAND_TIMEOUT: 'COMMAND_TIMEOUT',
  COMMAND_RATE_LIMIT: 'COMMAND_RATE_LIMIT',
  
  // 验证错误
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PARAMETER_ERROR: 'PARAMETER_ERROR',
  CONFIG_ERROR: 'CONFIG_ERROR',
  
  // 并发错误
  CONCURRENCY_CONFLICT: 'CONCURRENCY_CONFLICT',
  LOCK_TIMEOUT: 'LOCK_TIMEOUT',
  RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED',
  
  // 安全错误
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INJECTION_ATTEMPT: 'INJECTION_ATTEMPT',
  
  // 业务错误
  BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR',
  DATA_CONSISTENCY_ERROR: 'DATA_CONSISTENCY_ERROR',
  
  // 未知错误
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

// 错误严重级别
const ErrorSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

// 标准化错误类
class StandardError extends Error {
  constructor(message, type = ErrorTypes.UNKNOWN_ERROR, severity = ErrorSeverity.MEDIUM, context = {}) {
    super(message);
    
    this.name = 'StandardError';
    this.type = type;
    this.severity = severity;
    this.context = context;
    this.timestamp = Date.now();
    this.id = this.generateErrorId();
    
    // 保持堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StandardError);
    }
  }
  
  generateErrorId() {
    return `ERR_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
  
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

module.exports = {
  ErrorTypes,
  ErrorSeverity,
  StandardError
};