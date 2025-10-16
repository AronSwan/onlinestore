#!/usr/bin/env node

/**
 * 熔断器实现 - 防止级联故障
 */

const { StandardError, ErrorTypes, ErrorSeverity } = require('./error-handler.cjs');

// 熔断器状态
const CircuitBreakerState = {
  CLOSED: 'CLOSED',     // 正常状态
  OPEN: 'OPEN',         // 熔断状态
  HALF_OPEN: 'HALF_OPEN' // 半开状态
};

// 熔断器实现
class CircuitBreaker {
  constructor(options = {}) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      recoveryTimeout: options.recoveryTimeout || 30000,
      monitoringPeriod: options.monitoringPeriod || 10000,
      ...options
    };
    
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      circuitOpenCount: 0
    };
  }
  
  async execute(operation, fallback = null) {
    this.stats.totalRequests++;
    
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        // 熔断器打开，执行降级逻辑
        if (fallback) {
          return await fallback();
        }
        throw new StandardError(
          'Circuit breaker is open',
          ErrorTypes.RESOURCE_EXHAUSTED,
          ErrorSeverity.HIGH,
          { circuitBreakerState: this.state }
        );
      } else {
        // 尝试半开状态
        this.state = CircuitBreakerState.HALF_OPEN;
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.stats.successfulRequests++;
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED;
    }
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.stats.failedRequests++;
    
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.options.recoveryTimeout;
      this.stats.circuitOpenCount++;
    }
  }
  
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      stats: { ...this.stats }
    };
  }
  
  reset() {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }
}

module.exports = {
  CircuitBreaker,
  CircuitBreakerState
};