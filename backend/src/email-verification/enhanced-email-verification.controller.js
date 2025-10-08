/**
 * Enhanced Email Verification Controller - 提供增强的邮箱验证 REST API
 * 
 * 功能特性：
 * - 高级错误处理和响应格式
 * - 请求验证和安全检查
 * - 性能监控和指标收集
 * - OpenObserve集成
 * - API文档和版本控制
 */

const EnhancedEmailVerifierService = require('./enhanced-email-verifier-service');
const { v4: uuidv4 } = require('uuid');

class EnhancedEmailVerificationController {
  constructor() {
    // 初始化增强服务
    this.verifierService = new EnhancedEmailVerifierService({
      apiBaseUrl: process.env.EMAIL_VERIFIER_API_URL || 'http://localhost:8080',
      timeout: parseInt(process.env.EMAIL_VERIFIER_TIMEOUT) || 10000,
      enableCache: process.env.EMAIL_VERIFIER_CACHE !== 'false',
      cacheExpiry: parseInt(process.env.EMAIL_VERIFIER_CACHE_EXPIRY) || 300000,
      unknownCacheExpiry: parseInt(process.env.EMAIL_VERIFIER_UNKNOWN_CACHE_EXPIRY) || 60000,
      negativeCacheExpiry: parseInt(process.env.EMAIL_VERIFIER_NEGATIVE_CACHE_EXPIRY) || 30000,
      
      // 业务规则配置
      allowDisposable: process.env.ALLOW_DISPOSABLE_EMAIL === 'true',
      allowRoleAccount: process.env.ALLOW_ROLE_ACCOUNT !== 'false',
      requireMX: process.env.REQUIRE_MX_RECORDS !== 'false',
      minReachability: process.env.MIN_EMAIL_REACHABILITY || 'unknown',
      enableSMTPCheck: process.env.ENABLE_SMTP_CHECK === 'true',
      
      // 性能配置
      maxConcurrency: parseInt(process.env.EMAIL_VERIFIER_MAX_CONCURRENCY) || 50,
      domainRateLimit: parseInt(process.env.EMAIL_VERIFIER_DOMAIN_RATE_LIMIT) || 3,
      globalRateLimit: parseInt(process.env.EMAIL_VERIFIER_GLOBAL_RATE_LIMIT) || 200,
      
      // Redis配置
      redis: process.env.REDIS_URL ? {
        url: process.env.REDIS_URL,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0,
      } : {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0,
      },
      
      // 代理配置
      proxyUrl: process.env.SOCKS_PROXY,
    });
    
    // 设置事件监听器
    this.setupEventListeners();
    
    // 控制器指标
    this.controllerMetrics = {
      requests: {
        verify: 0,
        verifyBatch: 0,
        health: 0,
        config: 0,
        clearCache: 0,
      },
      errors: {
        validation: 0,
        rateLimit: 0,
        internal: 0,
      },
      startTime: Date.now(),
    };
  }
  
  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 监听验证成功事件
    this.verifierService.on('verificationSuccess', (data) => {
      this.logEvent('verification_success', data);
      this.sendToOpenObserve('verification_result', {
        email: this.maskEmail(data.email),
        result: data.result.valid ? 'success' : 'failure',
        code: data.result.code,
        duration: data.result.duration_ms,
        fromCache: data.result.fromCache || false,
      });
    });
    
    // 监听验证错误事件
    this.verifierService.on('verificationError', (data) => {
      this.logEvent('verification_error', data);
      this.sendToOpenObserve('verification_error', {
        email: this.maskEmail(data.email),
        error: data.error.message,
        type: this.classifyError(data.error),
      });
    });
    
    // 监听缓存命中事件
    this.verifierService.on('cacheHit', (data) => {
      this.logEvent('cache_hit', data);
    });
    
    // 监听缓存清理事件
    this.verifierService.on('cacheCleared', () => {
      this.logEvent('cache_cleared', {});
      this.sendToOpenObserve('cache_cleared', {
        timestamp: new Date().toISOString(),
      });
    });
  }
  
  /**
   * 验证单个邮箱地址
   * POST /api/email/verify
   */
  async verifyEmail(req, res) {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    try {
      this.controllerMetrics.requests.verify++;
      
      // 参数验证
      const validationResult = this.validateVerifyRequest(req.body);
      if (!validationResult.valid) {
        this.controllerMetrics.errors.validation++;
        return this.sendErrorResponse(res, 400, 'VALIDATION_ERROR', validationResult.message, {
          requestId,
          field: validationResult.field,
        });
      }
      
      const { email, options = {} } = req.body;
      
      // 执行验证
      const result = await this.verifierService.verifyEmail(email, {
        ...options,
        requestId,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
      
      // 记录请求指标
      this.recordRequestMetrics('verify', Date.now() - startTime, true);
      
      // 返回成功响应
      this.sendSuccessResponse(res, 200, {
        requestId,
        result,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      this.controllerMetrics.errors.internal++;
      this.recordRequestMetrics('verify', Date.now() - startTime, false);
      
      // 错误分类处理
      if (error.message.includes('Rate limit exceeded')) {
        this.controllerMetrics.errors.rateLimit++;
        return this.sendErrorResponse(res, 429, 'RATE_LIMIT_EXCEEDED', error.message, {
          requestId,
          retryAfter: this.calculateRetryAfter(error.message),
        });
      }
      
      this.sendErrorResponse(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred', {
        requestId,
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  /**
   * 批量验证邮箱地址
   * POST /api/email/verify-batch
   */
  async verifyEmailBatch(req, res) {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    try {
      this.controllerMetrics.requests.verifyBatch++;
      
      // 参数验证
      const validationResult = this.validateBatchRequest(req.body);
      if (!validationResult.valid) {
        this.controllerMetrics.errors.validation++;
        return this.sendErrorResponse(res, 400, 'VALIDATION_ERROR', validationResult.message, {
          requestId,
          field: validationResult.field,
        });
      }
      
      const { emails, options = {} } = req.body;
      
      // 执行批量验证
      const result = await this.verifierService.verifyEmailBatch(emails, {
        ...options,
        requestId,
        startTime,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
      
      // 记录请求指标
      this.recordRequestMetrics('verifyBatch', Date.now() - startTime, true);
      
      // 返回成功响应
      this.sendSuccessResponse(res, 200, {
        requestId,
        batchId: uuidv4(),
        result,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      this.controllerMetrics.errors.internal++;
      this.recordRequestMetrics('verifyBatch', Date.now() - startTime, false);
      
      this.sendErrorResponse(res, 500, 'INTERNAL_ERROR', 'Batch verification failed', {
        requestId,
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  /**
   * 获取服务健康状态
   * GET /api/email/health
   */
  async getHealth(req, res) {
    const requestId = uuidv4();
    
    try {
      this.controllerMetrics.requests.health++;
      
      const health = await this.verifierService.getHealthStatus();
      
      // 添加控制器级别的健康信息
      health.controller = {
        uptime: Math.floor((Date.now() - this.controllerMetrics.startTime) / 1000),
        version: '2.0.0',
        metrics: this.controllerMetrics,
      };
      
      // 确定HTTP状态码
      const statusCode = health.status === 'healthy' ? 200 : 
                         health.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json({
        success: true,
        data: health,
        requestId,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      this.controllerMetrics.errors.internal++;
      
      res.status(503).json({
        success: false,
        error: 'Health check failed',
        code: 'HEALTH_CHECK_ERROR',
        requestId,
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  /**
   * 获取详细的服务指标
   * GET /api/email/metrics
   */
  async getMetrics(req, res) {
    const requestId = uuidv4();
    
    try {
      const serviceMetrics = this.verifierService.getMetrics();
      const health = await this.verifierService.getHealthStatus();
      
      const metrics = {
        controller: this.controllerMetrics,
        service: serviceMetrics,
        health: health.checks,
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
        },
      };
      
      this.sendSuccessResponse(res, 200, {
        requestId,
        metrics,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      this.sendErrorResponse(res, 500, 'METRICS_ERROR', 'Failed to retrieve metrics', {
        requestId,
      });
    }
  }
  
  /**
   * 清理缓存
   * POST /api/email/cache/clear
   */
  async clearCache(req, res) {
    const requestId = uuidv4();
    
    try {
      this.controllerMetrics.requests.clearCache++;
      
      await this.verifierService.clearCache();
      
      this.sendSuccessResponse(res, 200, {
        requestId,
        message: 'Cache cleared successfully',
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      this.sendErrorResponse(res, 500, 'CACHE_CLEAR_ERROR', 'Failed to clear cache', {
        requestId,
      });
    }
  }
  
  /**
   * 获取验证配置
   * GET /api/email/config
   */
  async getConfig(req, res) {
    const requestId = uuidv4();
    
    try {
      this.controllerMetrics.requests.config++;
      
      const config = {
        rules: this.verifierService.rules,
        cache: {
          enabled: this.verifierService.enableCache,
          expiry: this.verifierService.cacheExpiry,
          unknownExpiry: this.verifierService.unknownCacheExpiry,
          negativeExpiry: this.verifierService.negativeCacheExpiry,
        },
        performance: {
          maxConcurrency: this.verifierService.maxConcurrency,
          domainRateLimit: this.verifierService.domainRateLimit,
          globalRateLimit: this.verifierService.globalRateLimit,
        },
        timeout: this.verifierService.timeout,
        apiBaseUrl: this.verifierService.apiBaseUrl,
      };
      
      this.sendSuccessResponse(res, 200, {
        requestId,
        config,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      this.sendErrorResponse(res, 500, 'CONFIG_ERROR', 'Failed to retrieve configuration', {
        requestId,
      });
    }
  }
  
  /**
   * 验证单个验证请求
   */
  validateVerifyRequest(body) {
    if (!body || typeof body !== 'object') {
      return { valid: false, message: 'Request body is required', field: 'body' };
    }
    
    if (!body.email || typeof body.email !== 'string') {
      return { valid: false, message: 'Email address is required', field: 'email' };
    }
    
    if (body.email.length > 254) {
      return { valid: false, message: 'Email address too long', field: 'email' };
    }
    
    if (!this.isValidEmailFormat(body.email)) {
      return { valid: false, message: 'Invalid email format', field: 'email' };
    }
    
    if (body.options && typeof body.options !== 'object') {
      return { valid: false, message: 'Options must be an object', field: 'options' };
    }
    
    return { valid: true };
  }
  
  /**
   * 验证批量验证请求
   */
  validateBatchRequest(body) {
    if (!body || typeof body !== 'object') {
      return { valid: false, message: 'Request body is required', field: 'body' };
    }
    
    if (!Array.isArray(body.emails)) {
      return { valid: false, message: 'Emails must be an array', field: 'emails' };
    }
    
    if (body.emails.length === 0) {
      return { valid: false, message: 'Emails array cannot be empty', field: 'emails' };
    }
    
    if (body.emails.length > 1000) {
      return { valid: false, message: 'Maximum 1000 emails per batch', field: 'emails' };
    }
    
    // 验证每个邮箱
    for (let i = 0; i < body.emails.length; i++) {
      const email = body.emails[i];
      if (typeof email !== 'string') {
        return { valid: false, message: `Email at index ${i} must be a string`, field: `emails[${i}]` };
      }
      
      if (email.length > 254) {
        return { valid: false, message: `Email at index ${i} too long`, field: `emails[${i}]` };
      }
      
      if (!this.isValidEmailFormat(email)) {
        return { valid: false, message: `Email at index ${i} has invalid format`, field: `emails[${i}]` };
      }
    }
    
    if (body.options && typeof body.options !== 'object') {
      return { valid: false, message: 'Options must be an object', field: 'options' };
    }
    
    return { valid: true };
  }
  
  /**
   * 基础邮箱格式验证
   */
  isValidEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * 发送成功响应
   */
  sendSuccessResponse(res, statusCode, data) {
    res.status(statusCode).json({
      success: true,
      ...data,
    });
  }
  
  /**
   * 发送错误响应
   */
  sendErrorResponse(res, statusCode, code, message, additionalData = {}) {
    res.status(statusCode).json({
      success: false,
      error: message,
      code,
      timestamp: new Date().toISOString(),
      ...additionalData,
    });
  }
  
  /**
   * 记录请求指标
   */
  recordRequestMetrics(endpoint, duration, success) {
    // 这里可以集成到监控系统
    this.logEvent('request_metrics', {
      endpoint,
      duration,
      success,
      timestamp: new Date().toISOString(),
    });
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
   * 错误分类
   */
  classifyError(error) {
    if (error.message.includes('timeout')) return 'timeout';
    if (error.message.includes('connection')) return 'connection';
    if (error.message.includes('rate limit')) return 'rate_limit';
    if (error.message.includes('syntax')) return 'syntax';
    return 'unknown';
  }
  
  /**
   * 计算重试时间
   */
  calculateRetryAfter(errorMessage) {
    const match = errorMessage.match(/wait (\d+)ms/);
    return match ? parseInt(match[1]) / 1000 : 60; // 默认60秒
  }
  
  /**
   * 发送数据到OpenObserve
   */
  async sendToOpenObserve(stream, data) {
    // 如果配置了OpenObserve，发送监控数据
    if (process.env.OPENOBSERVE_ENABLED === 'true') {
      try {
        // 这里应该实现实际的OpenObserve客户端调用
        // 暂时只记录日志
        this.logEvent('openobserve_data', { stream, data });
      } catch (error) {
        console.error('Failed to send data to OpenObserve:', error);
      }
    }
  }
  
  /**
   * 记录事件日志
   */
  logEvent(event, data) {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`[EVENT] ${event}:`, JSON.stringify(data, null, 2));
    }
  }
  
  /**
   * 优雅关闭
   */
  async shutdown() {
    console.log('Shutting down Enhanced Email Verification Controller...');
    await this.verifierService.shutdown();
    console.log('Enhanced Email Verification Controller shutdown complete');
  }
}

module.exports = EnhancedEmailVerificationController;