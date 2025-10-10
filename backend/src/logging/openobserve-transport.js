
const winston = require('winston');
const axios = require('axios');

class OpenObserveTransport extends winston.Transport {
  constructor(options) {
    super(options);
    this.options = options;
    this.endpoint = options.endpoint;
    this.batchSize = options.batchSize || 10;
    this.buffer = [];
    this.flushInterval = options.flushInterval || 5000;
    this.maxRetries = options.maxRetries || 3;
    this.retryCount = 0;
    this.timeout = options.timeout || 30000;
    // 静态标签（由统一环境适配器/配置派生），用于所有日志
    this.staticLabels = options.staticLabels || {};
    
    // 定期刷新缓冲区，保存句柄以便清理
    if (process.env.NODE_ENV !== 'test') {
      this._interval = setInterval(() => this.flush(), this.flushInterval);
      // 降低对事件循环的影响（可选）
      if (this._interval.unref) this._interval.unref();
    }
  }
  
  log(entry, callback) {
    // 安全展开 meta，避免 undefined/null 错误
    const meta = (entry && entry.meta) ? entry.meta : {};
    // 统一错误序列化：从 entry.error 或 entry.tags 中抽取 name/message/stack
    let errorPayload = {};
    try {
      const e = entry && (entry.error || (entry.tags && (entry.tags.error || entry.tags.errorStack || entry.tags.errorName)));
      if (e) {
        let name, message, stack;
        if (e instanceof Error) {
          name = e.name; message = e.message; stack = e.stack;
        } else if (typeof e === 'string') {
          name = 'Error'; message = e;
        } else {
          // 从 tags 兜底
          name = entry?.tags?.errorName;
          stack = entry?.tags?.errorStack;
          message = entry?.message || 'Unknown error';
        }
        errorPayload = {
          error_name: name,
          error_message: message,
          error_stack: stack,
        };
      }
    } catch (_) {
      // 忽略错误序列化中的异常，不影响正常日志发送
    }
    const payload = {
      timestamp: entry.timestamp || new Date().toISOString(),
      service: entry.service || this.options.service || 'unknown',
      // 保留完整业务字段（level、message、category、action、tags、businessContext、traceId、spanId 等）
      ...entry,
      // 合并静态标签，确保所有日志具备统一标签（例如 domain、cacheKeyPrefix 等）
      ...this.staticLabels,
      // 追加统一错误字段，便于下游检索
      ...errorPayload,
      // meta 最后合并以允许覆盖
      ...meta,
    };

    this.buffer.push(payload);
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
    
    if (typeof callback === 'function') callback();
  }
  
  async flush() {
    if (this.buffer.length === 0) return;
    
    // Skip network calls in tests to avoid open handles
    if (process.env.NODE_ENV === 'test') {
      this.retryCount = 0;
      return;
    }

    const batch = [...this.buffer];
    this.buffer = [];
    
    try {
      await axios.post(this.endpoint, batch, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.options.token}`
        },
        timeout: this.timeout,
      });
      console.log(`Successfully sent ${batch.length} log entries to OpenObserve`);
      this.retryCount = 0; // 重置重试计数
    } catch (error) {
      console.error(`Failed to send logs to OpenObserve: ${error.message}`);
      
      // 检查重试次数
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        // 重新加入缓冲区末尾，而不是前端
        this.buffer.push(...batch);
      } else {
        console.error(`Max retries (${this.maxRetries}) exceeded, dropping ${batch.length} log entries`);
        this.retryCount = 0;
      }
    }
  }
  
  // 添加清理方法
  close() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    // 最后一次刷新
    this.flush();
  }
}

// 修改为 ESM 导出以解决 CJS/ESM 互操作问题
module.exports = OpenObserveTransport;
