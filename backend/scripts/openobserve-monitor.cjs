#!/usr/bin/env node

/**
 * OpenObserve 监控集成 - 提供与 OpenObserve 的集成
 * 实现日志、指标和追踪数据的收集与发送
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const EventEmitter = require('events');

// OpenObserve 配置
const OpenObserveConfig = {
  // 连接配置
  connection: {
    endpoint: process.env.OPENOBSERVE_ENDPOINT || 'http://localhost:5080',
    organization: process.env.OPENOBSERVE_ORG || 'default',
    username: process.env.OPENOBSERVE_USERNAME || 'admin',
    password: process.env.OPENOBSERVE_PASSWORD || 'Complexpass#123',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  
  // 流配置
  streams: {
    logs: {
      name: 'test-runner-logs',
      mappings: {
        timestamp: '@timestamp',
        level: 'level',
        message: 'message',
        category: 'category',
        action: 'action',
        source: 'source',
        userId: 'userId',
        sessionId: 'sessionId',
        details: 'details'
      }
    },
    metrics: {
      name: 'test-runner-metrics',
      mappings: {
        timestamp: '@timestamp',
        metric_name: 'metric_name',
        metric_value: 'metric_value',
        metric_type: 'metric_type',
        labels: 'labels'
      }
    },
    traces: {
      name: 'test-runner-traces',
      mappings: {
        timestamp: '@timestamp',
        trace_id: 'trace_id',
        span_id: 'span_id',
        parent_span_id: 'parent_span_id',
        operation_name: 'operation_name',
        service_name: 'service_name',
        duration: 'duration',
        status: 'status',
        tags: 'tags'
      }
    }
  },
  
  // 批处理配置
  batching: {
    enabled: true,
    maxBatchSize: 100,
    maxBatchTime: 5000, // 5秒
    flushOnExit: true
  },
  
  // 压缩配置
  compression: {
    enabled: true,
    algorithm: 'gzip'
  }
};

class OpenObserveMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      ...OpenObserveConfig,
      ...options
    };
    
    // 状态管理
    this.isConnected = false;
    this.isConnecting = false;
    this.accessToken = null;
    this.lastError = null;
    
    // 批处理队列
    this.queues = {
      logs: [],
      metrics: [],
      traces: []
    };
    
    // 批处理定时器
    this.batchTimers = {
      logs: null,
      metrics: null,
      traces: null
    };
    
    // 统计信息
    this.stats = {
      totalSent: 0,
      totalFailed: 0,
      totalRetried: 0,
      lastSentTime: null,
      uptime: 0,
      startTime: Date.now()
    };
    
    // 初始化
    this.initialize();
  }
  
  /**
   * 初始化监控器
   */
  async initialize() {
    try {
      await this.connect();
      this.startBatchProcessing();
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
    }
  }
  
  /**
   * 连接到 OpenObserve
   */
  async connect() {
    if (this.isConnecting || this.isConnected) {
      return;
    }
    
    this.isConnecting = true;
    
    try {
      // 获取访问令牌
      await this.authenticate();
      
      this.isConnected = true;
      this.isConnecting = false;
      this.emit('connected');
      
    } catch (error) {
      this.isConnecting = false;
      this.lastError = error;
      this.emit('error', error);
      throw error;
    }
  }
  
  /**
   * 认证获取访问令牌
   */
  async authenticate() {
    // OpenObserve 可能不需要预认证，而是使用基本认证
    // 我们可以尝试直接使用基本认证，而不是获取令牌
    
    // 尝试获取访问令牌
    try {
      const authData = JSON.stringify({
        username: this.options.connection.username,
        password: this.options.connection.password
      });
      
      const response = await this.makeRequest({
        method: 'POST',
        path: `/api/${this.options.connection.organization}/users/login`,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(authData)
        },
        data: authData,
        useBasicAuth: false
      });
      
      const authResult = JSON.parse(response);
      this.accessToken = authResult.access_token;
    } catch (error) {
      // 如果获取令牌失败，使用基本认证
      this.accessToken = null;
      this.useBasicAuth = true;
    }
  }
  
  /**
   * 发送日志
   */
  async sendLog(logEntry) {
    if (!this.isConnected) {
      await this.connect();
    }
    
    const streamName = this.options.streams.logs.name;
    const mappedEntry = this.mapEntry(logEntry, this.options.streams.logs.mappings);
    
    if (this.options.batching.enabled) {
      this.queues.logs.push(mappedEntry);
      
      if (this.queues.logs.length >= this.options.batching.maxBatchSize) {
        await this.flushQueue('logs');
      }
    } else {
      await this.sendSingleEntry('logs', streamName, mappedEntry);
    }
  }
  
  /**
   * 发送指标
   */
  async sendMetric(metricEntry) {
    if (!this.isConnected) {
      await this.connect();
    }
    
    const streamName = this.options.streams.metrics.name;
    const mappedEntry = this.mapEntry(metricEntry, this.options.streams.metrics.mappings);
    
    if (this.options.batching.enabled) {
      this.queues.metrics.push(mappedEntry);
      
      if (this.queues.metrics.length >= this.options.batching.maxBatchSize) {
        await this.flushQueue('metrics');
      }
    } else {
      await this.sendSingleEntry('metrics', streamName, mappedEntry);
    }
  }
  
  /**
   * 发送追踪
   */
  async sendTrace(traceEntry) {
    if (!this.isConnected) {
      await this.connect();
    }
    
    const streamName = this.options.streams.traces.name;
    const mappedEntry = this.mapEntry(traceEntry, this.options.streams.traces.mappings);
    
    if (this.options.batching.enabled) {
      this.queues.traces.push(mappedEntry);
      
      if (this.queues.traces.length >= this.options.batching.maxBatchSize) {
        await this.flushQueue('traces');
      }
    } else {
      await this.sendSingleEntry('traces', streamName, mappedEntry);
    }
  }
  
  /**
   * 映射条目字段
   */
  mapEntry(entry, mappings) {
    const mapped = {};
    
    // 防御性编程：确保entry是对象
    if (!entry || typeof entry !== 'object') {
      entry = {};
    }
    
    // 防御性编程：确保mappings是对象
    if (!mappings || typeof mappings !== 'object') {
      mappings = {};
    }
    
    // 安全地遍历 mappings
    for (const [sourceField, targetField] of Object.entries(mappings)) {
      if (entry[sourceField] !== undefined) {
        mapped[targetField] = entry[sourceField];
      }
    }
    
    // 添加未映射的字段
    for (const [key, value] of Object.entries(entry)) {
      if (!mappings[key] && mapped[key] === undefined) {
        mapped[key] = value;
      }
    }
    
    return mapped;
  }
  
  /**
   * 刷新队列
   */
  async flushQueue(queueType) {
    if (this.queues[queueType].length === 0) {
      return;
    }
    
    const entries = [...this.queues[queueType]];
    this.queues[queueType] = [];
    
    try {
      const streamName = this.options.streams[queueType].name;
      await this.sendBatch(queueType, streamName, entries);
      this.stats.totalSent += entries.length;
      this.stats.lastSentTime = Date.now();
      this.emit('batch-sent', { type: queueType, count: entries.length });
    } catch (error) {
      this.stats.totalFailed += entries.length;
      this.emit('error', error);
      
      // 重试逻辑
      if (this.options.connection.retryAttempts > 0) {
        this.queues[queueType] = [...entries, ...this.queues[queueType]];
        this.stats.totalRetried += entries.length;
        
        setTimeout(() => {
          this.flushQueue(queueType);
        }, this.options.connection.retryDelay);
      }
    }
  }
  
  /**
   * 发送单个条目
   */
  async sendSingleEntry(queueType, streamName, entry) {
    const data = JSON.stringify(entry);
    
    await this.makeRequest({
      method: 'POST',
      path: `/api/${this.options.connection.organization}/${streamName}/_json`,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      data
    });
    
    this.stats.totalSent++;
    this.stats.lastSentTime = Date.now();
  }
  
  /**
   * 发送批次数据
   */
  async sendBatch(queueType, streamName, entries) {
    const data = entries.map(entry => JSON.stringify(entry)).join('\n');
    
    await this.makeRequest({
      method: 'POST',
      path: `/api/${this.options.connection.organization}/${streamName}/_json`,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/x-ndjson',
        'Content-Length': Buffer.byteLength(data)
      },
      data
    });
  }
  
  /**
   * 发起 HTTP 请求
   */
  async makeRequest(options) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.options.connection.endpoint);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const requestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: options.path,
        method: options.method,
        headers: {
          ...options.headers,
          'User-Agent': 'test-runner-secure/3.3.0'
        },
        timeout: this.options.connection.timeout
      };
      
      // 添加认证头
      if (this.accessToken && options.useBasicAuth !== false) {
        requestOptions.headers['Authorization'] = `Bearer ${this.accessToken}`;
      } else if (this.useBasicAuth || options.useBasicAuth === false) {
        // 使用基本认证
        const auth = Buffer.from(`${this.options.connection.username}:${this.options.connection.password}`).toString('base64');
        requestOptions.headers['Authorization'] = `Basic ${auth}`;
      }
      
      const req = httpModule.request(requestOptions, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (options.data) {
        req.write(options.data);
      }
      
      req.end();
    });
  }
  
  /**
   * 启动批处理
   */
  startBatchProcessing() {
    if (!this.options.batching.enabled) {
      return;
    }
    
    for (const queueType of ['logs', 'metrics', 'traces']) {
      this.batchTimers[queueType] = setInterval(() => {
        this.flushQueue(queueType);
      }, this.options.batching.maxBatchTime);
    }
  }
  
  /**
   * 停止批处理
   */
  stopBatchProcessing() {
    for (const queueType of ['logs', 'metrics', 'traces']) {
      if (this.batchTimers[queueType]) {
        clearInterval(this.batchTimers[queueType]);
        this.batchTimers[queueType] = null;
      }
    }
  }
  
  /**
   * 刷新所有队列
   */
  async flushAllQueues() {
    for (const queueType of ['logs', 'metrics', 'traces']) {
      await this.flushQueue(queueType);
    }
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      isConnected: this.isConnected,
      queueSizes: {
        logs: this.queues.logs.length,
        metrics: this.queues.metrics.length,
        traces: this.queues.traces.length
      },
      lastError: this.lastError ? {
        message: this.lastError.message,
        timestamp: this.lastError.timestamp
      } : null
    };
  }
  
  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const response = await this.makeRequest({
        method: 'GET',
        path: `/api/${this.options.connection.organization}/_health`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      return {
        healthy: true,
        response: JSON.parse(response)
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }
  
  /**
   * 销毁监控器
   */
  async destroy() {
    this.stopBatchProcessing();
    
    if (this.options.batching.flushOnExit) {
      await this.flushAllQueues();
    }
    
    this.removeAllListeners();
    this.isConnected = false;
  }
}

// 便捷的监控适配器
class OpenObserveAdapter {
  constructor(monitor) {
    this.monitor = monitor;
    this.serviceName = 'test-runner-secure';
    this.hostname = require('os').hostname();
  }
  
  /**
   * 记录日志
   */
  async log(level, message, category = 'GENERAL', details = {}) {
    await this.monitor.sendLog({
      '@timestamp': new Date().toISOString(),
      level,
      message,
      category,
      source: this.serviceName,
      hostname: this.hostname,
      details
    });
  }
  
  /**
   * 记录错误
   */
  async error(message, details = {}) {
    await this.log('ERROR', message, 'ERROR', details);
  }
  
  /**
   * 记录警告
   */
  async warn(message, details = {}) {
    await this.log('WARN', message, 'WARNING', details);
  }
  
  /**
   * 记录信息
   */
  async info(message, details = {}) {
    await this.log('INFO', message, 'INFO', details);
  }
  
  /**
   * 记录调试信息
   */
  async debug(message, details = {}) {
    await this.log('DEBUG', message, 'DEBUG', details);
  }
  
  /**
   * 记录指标
   */
  async metric(name, value, type = 'gauge', labels = {}) {
    await this.monitor.sendMetric({
      '@timestamp': new Date().toISOString(),
      metric_name: name,
      metric_value: value,
      metric_type: type,
      labels: {
        service: this.serviceName,
        hostname: this.hostname,
        ...labels
      }
    });
  }
  
  /**
   * 记录计数器
   */
  async counter(name, value = 1, labels = {}) {
    await this.metric(name, value, 'counter', labels);
  }
  
  /**
   * 记录直方图
   */
  async histogram(name, value, labels = {}) {
    await this.metric(name, value, 'histogram', labels);
  }
  
  /**
   * 开始追踪
   */
  startTrace(operationName, parentSpanId = null) {
    const traceId = this.generateTraceId();
    const spanId = this.generateSpanId();
    const adapter = this; // 保存当前适配器实例的引用
    
    return {
      traceId,
      spanId,
      parentSpanId,
      operationName,
      startTime: Date.now(),
      
      async finish(status = 'ok', tags = {}) {
        const duration = Date.now() - this.startTime;
        
        await adapter.monitor.sendTrace({
          '@timestamp': new Date().toISOString(),
          trace_id: traceId,
          span_id: spanId,
          parent_span_id: parentSpanId,
          operation_name: operationName,
          service_name: adapter.serviceName,
          duration,
          status,
          tags: {
            hostname: adapter.hostname,
            ...tags
          }
        });
      }
    };
  }
  
  /**
   * 生成追踪ID
   */
  generateTraceId() {
    return crypto.randomBytes(16).toString('hex');
  }
  
  /**
   * 生成跨度ID
   */
  generateSpanId() {
    return crypto.randomBytes(8).toString('hex');
  }
}

module.exports = {
  OpenObserveMonitor,
  OpenObserveAdapter,
  OpenObserveConfig
};