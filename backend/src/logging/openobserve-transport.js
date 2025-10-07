
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
    
    // 定期刷新缓冲区
    setInterval(() => this.flush(), this.flushInterval);
  }
  
  log(info, callback) {
    this.buffer.push({
      timestamp: new Date().toISOString(),
      level: info.level,
      message: info.message,
      service: this.options.service || 'unknown',
      ...info.meta
    });
    
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
    
    callback();
  }
  
  async flush() {
    if (this.buffer.length === 0) return;
    
    const batch = [...this.buffer];
    this.buffer = [];
    
    try {
      await axios.post(this.endpoint, batch, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.options.token}`
        }
      });
      console.log(`✓ 发送 ${batch.length} 条日志到OpenObserve`);
    } catch (error) {
      console.error('❌ 发送日志失败:', error.message);
      // 重新加入缓冲区
      this.buffer.unshift(...batch);
    }
  }
}

module.exports = OpenObserveTransport;
