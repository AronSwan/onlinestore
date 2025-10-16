#!/usr/bin/env node

/**
 * 重试策略实现 - 智能重试机制
 */

const { StandardError, ErrorTypes } = require('./error-handler.cjs');

// 重试策略
class RetryStrategy {
  constructor(options = {}) {
    this.options = {
      maxAttempts: options.maxAttempts || 3,
      initialDelay: options.initialDelay || 1000,
      maxDelay: options.maxDelay || 30000,
      backoffMultiplier: options.backoffMultiplier || 2,
      jitterMax: options.jitterMax || 100,
      retryableErrors: options.retryableErrors || [
        ErrorTypes.NETWORK_ERROR,
        ErrorTypes.COMMAND_TIMEOUT,
        ErrorTypes.RESOURCE_EXHAUSTED,
        ErrorTypes.CONCURRENCY_CONFLICT
      ],
      ...options
    };
  }
  
  async execute(operation, context = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        lastError = error;
        
        // 检查是否是可重试的错误
        if (!this.isRetryableError(error) || attempt === this.options.maxAttempts) {
          throw error;
        }
        
        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }
  
  isRetryableError(error) {
    if (error instanceof StandardError) {
      return this.options.retryableErrors.includes(error.type);
    }
    
    // 对于非标准错误，基于错误消息进行判断
    const message = error.message.toLowerCase();
    return message.includes('timeout') || 
           message.includes('network') || 
           message.includes('connection') ||
           message.includes('temporary');
  }
  
  calculateDelay(attempt) {
    const exponentialDelay = this.options.initialDelay * Math.pow(this.options.backoffMultiplier, attempt - 1);
    const cappedDelay = Math.min(exponentialDelay, this.options.maxDelay);
    const jitter = Math.random() * this.options.jitterMax;
    
    return cappedDelay + jitter;
  }
  
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = {
  RetryStrategy
};