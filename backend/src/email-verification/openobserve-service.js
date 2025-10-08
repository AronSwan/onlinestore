/**
 * OpenObserve Service - 邮箱验证监控数据收集服务
 * 
 * 功能特性：
 * - 批量数据发送优化
 * - 错误重试机制
 * - 数据格式标准化
 * - 性能指标收集
 * - 业务事件追踪
 */

const axios = require('axios');
const { EventEmitter } = require('events');

class OpenObserveService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // OpenObserve配置
    this.baseUrl = config.baseUrl || process.env.OPENOBSERVE_BASE_URL || 'http://openobserve:5080';
    this.organization = config.organization || process.env.OPENOBSERVE_ORG || 'default';
    this.streamName = config.streamName || process.env.OPENOBSERVE_STREAM || 'email_verification';
    this.token = config.token || process.env.OPENOBSERVE_TOKEN;
    
    // 发送配置
    this.enabled = config.enabled !== false && process.env.OPENOBSERVE_ENABLED !== 'false';
    this.batchSize = config.batchSize || parseInt(process.env.OPENOBSERVE_BATCH_SIZE) || 100;
    this.flushInterval = config.flushInterval || parseInt(process.env.OPENOBSERVE_FLUSH_INTERVAL) || 5000;
    this.maxRetries = config.maxRetries || parseInt(process.env.OPENOBSERVE_MAX_RETRIES) || 3;
    this.retryDelay = config.retryDelay || parseInt(process.env.OPENOBSERVE_RETRY_DELAY) || 1000;
    
    // 数据缓冲区
    this.buffer = [];
    this.flushTimer = null;
    
    // 性能指标
    this.metrics = {
      sentRecords: 0,
      failedRecords: 0,
      sendAttempts: 0,
      lastFlushTime: null,
      errors: [],
    };
    
    // HTTP客户端
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: config.timeout || 10000,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'EmailVerifier-OpenObserve/1.0',
      },
    });
    
    // 启动定时刷新
    if (this.enabled) {
      this.startFlushTimer();
    }
  }
  
  /**
   * 启动定时刷新
   */
  startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        console.error('Scheduled flush failed:', error.message);
      });
    }, this.flushInterval);
  }
  
  /**
   * 记录邮箱验证结果
   */
  async recordVerificationResult(email, result, duration, metadata = {}) {
    if (!this.enabled) return;
    
    const record = {
      timestamp: new Date().toISOString(),
      email: this.maskEmail(email),
      domain: this.extractDomain(email),
      valid: result.valid,
      code: result.code,
      reason: result.reason,
      duration_ms: duration,
      from_cache: result.fromCache || false,
      source: 'email-verifier-service',
      kind: 'verify_result',
      version: process.env.APP_VERSION || '2.0.0',
      ...metadata,
    };
    
    this.addRecord(record);
    this.emit('recordAdded', { type: 'verification_result', record });
  }
  
  /**
   * 记录邮箱验证错误
   */
  async recordVerificationError(email, error, duration, metadata = {}) {
    if (!this.enabled) return;
    
    const record = {
      timestamp: new Date().toISOString(),
      email: this.maskEmail(email),
      domain: this.extractDomain(email),
      error_code: error.code || 'unknown',
      error_message: error.message,
      error_type: this.classifyError(error),
      duration_ms: duration,
      source: 'email-verifier-service',
      kind: 'verify_error',
      version: process.env.APP_VERSION || '2.0.0',
      ...metadata,
    };
    
    this.addRecord(record);
    this.emit('recordAdded', { type: 'verification_error', record });
  }
  
  /**
   * 记录批量验证结果
   */
  async recordBatchResult(batchId, emails, results, duration, metadata = {}) {
    if (!this.enabled) return;
    
    const record = {
      timestamp: new Date().toISOString(),
      batch_id: batchId,
      total_emails: emails.length,
      successful_validations: results.filter(r => r.valid).length,
      failed_validations: results.filter(r => !r.valid).length,
      duration_ms: duration,
      success_rate: (results.filter(r => r.valid).length / results.length) * 100,
      source: 'email-verifier-service',
      kind: 'batch_result',
      version: process.env.APP_VERSION || '2.0.0',
      ...metadata,
    };
    
    this.addRecord(record);
    this.emit('recordAdded', { type: 'batch_result', record });
  }
  
  /**
   * 记录性能指标
   */
  async recordPerformanceMetrics(metrics, metadata = {}) {
    if (!this.enabled) return;
    
    const record = {
      timestamp: new Date().toISOString(),
      request_count: metrics.requestCount || 0,
      success_count: metrics.successCount || 0,
      error_count: metrics.errorCount || 0,
      cache_hit_count: metrics.cacheHitCount || 0,
      average_duration_ms: metrics.averageDuration || 0,
      success_rate: metrics.successRate || 0,
      cache_hit_rate: metrics.cacheHitRate || 0,
      active_requests: metrics.activeRequests || 0,
      queued_requests: metrics.queuedRequests || 0,
      source: 'email-verifier-service',
      kind: 'performance_metrics',
      version: process.env.APP_VERSION || '2.0.0',
      ...metadata,
    };
    
    this.addRecord(record);
    this.emit('recordAdded', { type: 'performance_metrics', record });
  }
  
  /**
   * 记录缓存事件
   */
  async recordCacheEvent(event, data, metadata = {}) {
    if (!this.enabled) return;
    
    const record = {
      timestamp: new Date().toISOString(),
      event_type: event,
      cache_type: data.type || 'memory',
      cache_size: data.size || 0,
      ttl: data.ttl || 0,
      source: 'email-verifier-service',
      kind: 'cache_event',
      version: process.env.APP_VERSION || '2.0.0',
      ...metadata,
    };
    
    this.addRecord(record);
    this.emit('recordAdded', { type: 'cache_event', record });
  }
  
  /**
   * 记录健康检查结果
   */
  async recordHealthCheck(healthData, metadata = {}) {
    if (!this.enabled) return;
    
    const record = {
      timestamp: new Date().toISOString(),
      status: healthData.status,
      uptime: healthData.uptime || 0,
      version: healthData.version || '2.0.0',
      checks: Object.keys(healthData.checks || {}),
      source: 'email-verifier-service',
      kind: 'health_check',
      version: process.env.APP_VERSION || '2.0.0',
      ...metadata,
    };
    
    this.addRecord(record);
    this.emit('recordAdded', { type: 'health_check', record });
  }
  
  /**
   * 添加记录到缓冲区
   */
  addRecord(record) {
    if (!this.enabled) return;
    
    this.buffer.push(record);
    
    // 如果缓冲区达到批量大小，立即刷新
    if (this.buffer.length >= this.batchSize) {
      setImmediate(() => {
        this.flush().catch(error => {
          console.error('Immediate flush failed:', error.message);
        });
      });
    }
  }
  
  /**
   * 刷新缓冲区到OpenObserve
   */
  async flush() {
    if (!this.enabled || this.buffer.length === 0) {
      return;
    }
    
    const records = [...this.buffer];
    this.buffer.length = 0; // 清空缓冲区
    
    try {
      await this.sendToOpenObserve(records);
      this.metrics.sentRecords += records.length;
      this.metrics.lastFlushTime = new Date().toISOString();
      
      this.emit('flushSuccess', { recordCount: records.length });
      console.debug(`Sent ${records.length} records to OpenObserve`);
      
    } catch (error) {
      this.metrics.failedRecords += records.length;
      this.metrics.errors.push({
        timestamp: new Date().toISOString(),
        error: error.message,
        recordCount: records.length,
      });
      
      // 错误重试：将记录放回缓冲区
      this.buffer.unshift(...records);
      
      this.emit('flushError', { error, recordCount: records.length });
      console.error(`Failed to send ${records.length} records to OpenObserve:`, error.message);
      
      // 如果错误持续，限制缓冲区大小
      if (this.buffer.length > this.batchSize * 3) {
        this.buffer = this.buffer.slice(0, this.batchSize * 2);
        console.warn('Buffer overflow, dropping oldest records');
      }
    }
  }
  
  /**
   * 发送数据到OpenObserve
   */
  async sendToOpenObserve(records) {
    const url = `/api/${this.organization}/${this.streamName}/_json`;
    
    let retryCount = 0;
    let lastError = null;
    
    while (retryCount <= this.maxRetries) {
      try {
        this.metrics.sendAttempts++;
        
        const response = await this.httpClient.post(url, records);
        
        if (response.status !== 200) {
          throw new Error(`Unexpected status code: ${response.status}`);
        }
        
        return response.data;
        
      } catch (error) {
        lastError = error;
        retryCount++;
        
        if (retryCount <= this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, retryCount - 1); // 指数退避
          console.warn(`OpenObserve send failed (attempt ${retryCount}/${this.maxRetries}), retrying in ${delay}ms:`, error.message);
          await this.delay(delay);
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * 邮箱地址脱敏
   */
  maskEmail(email) {
    const [username, domain] = email.split('@');
    if (username.length <= 3) {
      return `${username[0]}***@${domain}`;
    }
    return `${username.substring(0, 2)}***@${domain}`;
  }
  
  /**
   * 提取域名
   */
  extractDomain(email) {
    return email.split('@')[1]?.toLowerCase() || 'unknown';
  }
  
  /**
   * 错误分类
   */
  classifyError(error) {
    if (error.message.includes('timeout')) return 'timeout';
    if (error.message.includes('connection')) return 'connection';
    if (error.message.includes('rate limit')) return 'rate_limit';
    if (error.message.includes('syntax')) return 'syntax';
    if (error.message.includes('validation')) return 'validation';
    return 'unknown';
  }
  
  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      enabled: this.enabled,
      config: {
        baseUrl: this.baseUrl,
        organization: this.organization,
        streamName: this.streamName,
        batchSize: this.batchSize,
        flushInterval: this.flushInterval,
      },
      buffer: {
        size: this.buffer.length,
        lastFlush: this.metrics.lastFlushTime,
      },
      metrics: {
        ...this.metrics,
        successRate: this.metrics.sendAttempts > 0 ? 
          ((this.metrics.sendAttempts - this.metrics.errors.length) / this.metrics.sendAttempts) * 100 : 0,
      },
    };
  }
  
  /**
   * 清理缓冲区
   */
  clearBuffer() {
    const recordCount = this.buffer.length;
    this.buffer.length = 0;
    this.emit('bufferCleared', { recordCount });
    return recordCount;
  }
  
  /**
   * 优雅关闭
   */
  async shutdown() {
    console.log('Shutting down OpenObserve Service...');
    
    // 停止定时器
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // 刷新剩余数据
    await this.flush();
    
    console.log('OpenObserve Service shutdown complete');
  }
}

module.exports = OpenObserveService;