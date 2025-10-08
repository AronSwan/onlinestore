/**
 * Enhanced Email Verification Service - 基于AfterShip email-verifier的增强版
 * 
 * 功能特性：
 * - 多级缓存（内存 + Redis）
 * - 智能限流和并发控制
 * - OpenObserve监控集成
 * - 高级错误处理和降级策略
 * - 性能优化和批量处理
 */

const axios = require('axios');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { EventEmitter } = require('events');

class EnhancedEmailVerifierService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // 基础配置
    this.apiBaseUrl = config.apiBaseUrl || process.env.EMAIL_VERIFIER_API_URL || 'http://localhost:8080';
    this.timeout = config.timeout || parseInt(process.env.EMAIL_VERIFIER_TIMEOUT) || 10000;
    
    // 缓存配置
    this.enableCache = config.enableCache !== false;
    this.cacheExpiry = config.cacheExpiry || parseInt(process.env.EMAIL_VERIFIER_CACHE_EXPIRY) || 300000;
    this.unknownCacheExpiry = config.unknownCacheExpiry || parseInt(process.env.EMAIL_VERIFIER_UNKNOWN_CACHE_EXPIRY) || 60000;
    this.negativeCacheExpiry = config.negativeCacheExpiry || parseInt(process.env.EMAIL_VERIFIER_NEGATIVE_CACHE_EXPIRY) || 30000;
    
    // 业务规则配置
    this.rules = {
      allowDisposable: config.allowDisposable || process.env.ALLOW_DISPOSABLE_EMAIL === 'true',
      allowRoleAccount: config.allowRoleAccount !== false && process.env.ALLOW_ROLE_ACCOUNT !== 'false',
      requireMX: config.requireMX !== false && process.env.REQUIRE_MX_RECORDS !== 'false',
      minReachability: config.minReachability || process.env.MIN_EMAIL_REACHABILITY || 'unknown',
      enableSMTPCheck: config.enableSMTPCheck || process.env.ENABLE_SMTP_CHECK === 'true',
    };
    
    // 性能配置
    this.maxConcurrency = config.maxConcurrency || parseInt(process.env.EMAIL_VERIFIER_MAX_CONCURRENCY) || 50;
    this.domainRateLimit = config.domainRateLimit || parseInt(process.env.EMAIL_VERIFIER_DOMAIN_RATE_LIMIT) || 3;
    this.globalRateLimit = config.globalRateLimit || parseInt(process.env.EMAIL_VERIFIER_GLOBAL_RATE_LIMIT) || 200;
    
    // 代理配置
    this.proxyUrl = config.proxyUrl || process.env.SOCKS_PROXY;
    
    // 初始化缓存
    this.initializeCache(config.redis);
    
    // 初始化限流器
    this.initializeRateLimiters();
    
    // 性能指标
    this.metrics = {
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      cacheHitCount: 0,
      totalDuration: 0,
      domainStats: new Map(),
    };
    
    // 并发控制
    this.activeRequests = 0;
    this.requestQueue = [];
  }
  
  /**
   * 初始化缓存系统
   */
  async initializeCache(redisConfig) {
    if (this.enableCache && redisConfig !== false) {
      try {
        // Redis缓存
        this.redis = new Redis(redisConfig || {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB) || 0,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
        });
        
        // 测试Redis连接
        await this.redis.ping();
        console.log('Redis cache connected successfully');
        
        // 内存缓存作为回退
        this.memoryCache = new Map();
      } catch (error) {
        console.warn('Redis connection failed, using memory cache only:', error.message);
        this.redis = null;
        this.memoryCache = new Map();
      }
    } else {
      this.memoryCache = new Map();
    }
  }
  
  /**
   * 初始化限流器
   */
  initializeRateLimiters() {
    // 域级限流器映射
    this.domainLimiters = new Map();
    
    // 全局限流器（简单的令牌桶实现）
    this.globalLimiter = {
      tokens: this.globalRateLimit,
      lastRefill: Date.now(),
      refillRate: this.globalRateLimit / 1000, // 每毫秒补充的令牌数
    };
  }
  
  /**
   * 获取或创建域级限流器
   */
  getDomainLimiter(domain) {
    if (!this.domainLimiters.has(domain)) {
      this.domainLimiters.set(domain, {
        tokens: this.domainRateLimit,
        lastRefill: Date.now(),
        refillRate: this.domainRateLimit / 1000,
      });
    }
    return this.domainLimiters.get(domain);
  }
  
  /**
   * 令牌桶限流检查
   */
  async checkRateLimiter(limiter) {
    const now = Date.now();
    const timePassed = now - limiter.lastRefill;
    const tokensToAdd = Math.floor(timePassed * limiter.refillRate);
    
    if (tokensToAdd > 0) {
      limiter.tokens = Math.min(limiter.tokens + tokensToAdd, this.domainRateLimit);
      limiter.lastRefill = now;
    }
    
    if (limiter.tokens < 1) {
      const waitTime = Math.ceil((1 - limiter.tokens) / limiter.refillRate);
      throw new Error(`Rate limit exceeded, wait ${waitTime}ms`);
    }
    
    limiter.tokens--;
  }
  
  /**
   * 并发控制
   */
  async acquireRequestSlot() {
    return new Promise((resolve) => {
      if (this.activeRequests < this.maxConcurrency) {
        this.activeRequests++;
        resolve();
      } else {
        this.requestQueue.push(resolve);
      }
    });
  }
  
  releaseRequestSlot() {
    this.activeRequests--;
    if (this.requestQueue.length > 0) {
      const resolve = this.requestQueue.shift();
      this.activeRequests++;
      resolve();
    }
  }
  
  /**
   * 增强的邮箱验证方法
   */
  async verifyEmail(email, options = {}) {
    const startTime = performance.now();
    this.metrics.requestCount++;
    
    try {
      // 参数验证
      if (!email || typeof email !== 'string') {
        throw new Error('Invalid email parameter');
      }
      
      // 基础语法检查
      if (!this.isValidEmailSyntax(email)) {
        return this.createResult(email, false, 'Invalid email syntax', null, startTime);
      }
      
      const domain = email.split('@')[1]?.toLowerCase();
      if (!domain) {
        return this.createResult(email, false, 'Invalid domain', null, startTime);
      }
      
      // 并发控制
      await this.acquireRequestSlot();
      
      try {
        // 限流检查
        await this.checkRateLimiter(this.globalLimiter);
        await this.checkRateLimiter(this.getDomainLimiter(domain));
        
        // 缓存检查
        const cached = await this.getFromCache(email);
        if (cached) {
          this.metrics.cacheHitCount++;
          this.emit('cacheHit', { email, result: cached });
          return { ...cached, fromCache: true };
        }
        
        // 调用API
        const apiResult = await this.callVerifierAPI(email, options);
        
        // 应用业务规则
        const businessResult = this.applyBusinessRules(apiResult);
        
        // 创建结果
        const result = this.createResult(
          email,
          businessResult.allowed,
          businessResult.reason,
          apiResult,
          startTime,
        );
        
        // 缓存结果
        await this.setCache(email, result);
        
        // 更新指标
        this.updateMetrics(email, result, true);
        
        // 发送事件
        this.emit('verificationSuccess', { email, result });
        
        return result;
      } finally {
        this.releaseRequestSlot();
      }
    } catch (error) {
      this.metrics.errorCount++;
      this.updateMetrics(email, null, false);
      
      // 发送错误事件
      this.emit('verificationError', { email, error });
      
      // 降级策略
      return this.createFallbackResult(email, error, startTime);
    }
  }
  
  /**
   * 调用email-verifier API
   */
  async callVerifierAPI(email, options = {}) {
    const url = `${this.apiBaseUrl}/v1/${encodeURIComponent(email)}/verification`;
    
    const requestConfig = {
      timeout: options.timeout || this.timeout,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'EnhancedEmailVerifier/2.0',
        ...options.headers,
      },
    };
    
    // 添加代理配置
    if (this.proxyUrl && !options.skipProxy) {
      const { HttpsProxyAgent } = require('https-proxy-agent');
      requestConfig.httpsAgent = new HttpsProxyAgent(this.proxyUrl);
      requestConfig.httpAgent = require('http-proxy-agent')(this.proxyUrl);
    }
    
    const response = await axios.get(url, requestConfig);
    
    // 验证响应格式
    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Invalid API response format');
    }
    
    return response.data;
  }
  
  /**
   * 从缓存获取结果
   */
  async getFromCache(email) {
    if (!this.enableCache) return null;
    
    const key = this.getCacheKey(email);
    
    try {
      // 优先从Redis获取
      if (this.redis) {
        const cached = await this.redis.get(key);
        if (cached) {
          return JSON.parse(cached);
        }
      }
      
      // 回退到内存缓存
      if (this.memoryCache.has(key)) {
        const cached = this.memoryCache.get(key);
        if (Date.now() - cached.timestamp < this.getCacheTTL(cached.result)) {
          return cached.result;
        }
        this.memoryCache.delete(key);
      }
    } catch (error) {
      console.warn('Cache get error:', error.message);
    }
    
    return null;
  }
  
  /**
   * 设置缓存
   */
  async setCache(email, result) {
    if (!this.enableCache) return;
    
    const key = this.getCacheKey(email);
    const ttl = this.getCacheTTL(result);
    const cacheEntry = {
      result,
      timestamp: Date.now(),
    };
    
    try {
      // 设置Redis缓存
      if (this.redis) {
        await this.redis.setex(key, Math.ceil(ttl / 1000), JSON.stringify(cacheEntry));
      }
      
      // 设置内存缓存（作为回退）
      this.memoryCache.set(key, cacheEntry);
      
      // 清理过期的内存缓存
      this.cleanExpiredMemoryCache();
    } catch (error) {
      console.warn('Cache set error:', error.message);
    }
  }
  
  /**
   * 获取缓存键
   */
  getCacheKey(email) {
    return `email_verify:${email.toLowerCase()}`;
  }
  
  /**
   * 根据结果类型获取缓存TTL
   */
  getCacheTTL(result) {
    if (!result || !result.valid) {
      return this.negativeCacheExpiry;
    }
    
    if (result.details?.reachable === 'unknown') {
      return this.unknownCacheExpiry;
    }
    
    return this.cacheExpiry;
  }
  
  /**
   * 清理过期的内存缓存
   */
  cleanExpiredMemoryCache() {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > this.getCacheTTL(entry.result)) {
        this.memoryCache.delete(key);
      }
    }
  }
  
  /**
   * 应用增强的业务规则
   */
  applyBusinessRules(apiResult) {
    const checks = [];
    
    // 语法检查
    if (!apiResult.syntax?.valid) {
      return { allowed: false, reason: 'Invalid email syntax', code: 'SYNTAX_ERROR' };
    }
    
    // MX记录检查
    if (this.rules.requireMX && !apiResult.has_mx_records) {
      return { allowed: false, reason: 'Domain has no MX records', code: 'NO_MX_RECORDS' };
    }
    
    // 一次性邮箱检查
    if (!this.rules.allowDisposable && apiResult.disposable) {
      return { allowed: false, reason: 'Disposable email addresses are not allowed', code: 'DISPOSABLE_EMAIL' };
    }
    
    // 角色邮箱检查
    if (!this.rules.allowRoleAccount && apiResult.role_account) {
      return { allowed: false, reason: 'Role-based email addresses are not allowed', code: 'ROLE_ACCOUNT' };
    }
    
    // SMTP可达性检查
    if (this.rules.enableSMTPCheck && apiResult.smtp) {
      if (apiResult.smtp.deliverable === false) {
        return { allowed: false, reason: 'Email address is not deliverable', code: 'UNDELIVERABLE' };
      }
      
      if (apiResult.reachable === 'undeliverable') {
        return { allowed: false, reason: 'Email address is undeliverable', code: 'UNDELIVERABLE' };
      }
    }
    
    // 可达性等级检查
    const reachabilityScore = this.getReachabilityScore(apiResult.reachable);
    const minScore = this.getReachabilityScore(this.rules.minReachability);
    
    if (reachabilityScore < minScore) {
      return {
        allowed: false,
        reason: `Email reachability (${apiResult.reachable}) below minimum requirement (${this.rules.minReachability})`,
        code: 'LOW_REACHABILITY',
      };
    }
    
    return { allowed: true, reason: 'Email passed all validation checks', code: 'VALID' };
  }
  
  /**
   * 获取可达性分数
   */
  getReachabilityScore(reachability) {
    const scores = {
      undeliverable: 0,
      unknown: 1,
      low: 2,
      medium: 3,
      high: 4,
    };
    return scores[reachability] || 1;
  }
  
  /**
   * 创建验证结果
   */
  createResult(email, isValid, reason, apiData, startTime) {
    const duration = Math.round(performance.now() - startTime);
    
    return {
      email,
      valid: isValid,
      reason,
      code: apiData ? this.getVerificationCode(apiData) : 'FALLBACK',
      duration_ms: duration,
      timestamp: new Date().toISOString(),
      details: apiData ? {
        syntax: apiData.syntax,
        has_mx_records: apiData.has_mx_records,
        disposable: apiData.disposable,
        role_account: apiData.role_account,
        free: apiData.free,
        reachable: apiData.reachable,
        smtp: apiData.smtp,
        gravatar: apiData.gravatar,
        suggestion: apiData.suggestion,
      } : null,
    };
  }
  
  /**
   * 获取验证结果代码
   */
  getVerificationCode(apiData) {
    if (!apiData.syntax?.valid) return 'SYNTAX_ERROR';
    if (!apiData.has_mx_records) return 'NO_MX_RECORDS';
    if (apiData.disposable) return 'DISPOSABLE_EMAIL';
    if (apiData.role_account) return 'ROLE_ACCOUNT';
    if (apiData.reachable === 'undeliverable') return 'UNDELIVERABLE';
    if (apiData.reachable === 'unknown') return 'UNKNOWN';
    return 'VALID';
  }
  
  /**
   * 创建降级结果
   */
  createFallbackResult(email, error, startTime) {
    const isValidSyntax = this.isValidEmailSyntax(email);
    
    return this.createResult(
      email,
      isValidSyntax,
      isValidSyntax ? 'Syntax valid (API unavailable)' : 'Invalid email syntax',
      null,
      startTime,
    );
  }
  
  /**
   * 基础邮箱语法检查
   */
  isValidEmailSyntax(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }
  
  /**
   * 更新性能指标
   */
  updateMetrics(email, result, success) {
    const duration = performance.now() - this.metrics.startTime || 0;
    this.metrics.totalDuration += duration;
    
    if (success) {
      this.metrics.successCount++;
    }
    
    // 更新域级统计
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain) {
      if (!this.metrics.domainStats.has(domain)) {
        this.metrics.domainStats.set(domain, { count: 0, success: 0, errors: 0 });
      }
      const stats = this.metrics.domainStats.get(domain);
      stats.count++;
      if (success) {
        stats.success++;
      } else {
        stats.errors++;
      }
    }
  }
  
  /**
   * 批量验证邮箱
   */
  async verifyEmailBatch(emails, options = {}) {
    const batchSize = options.batchSize || 10;
    const results = [];
    const errors = [];
    
    // 按域名分组优化
    const domainGroups = this.groupEmailsByDomain(emails);
    
    for (const [domain, domainEmails] of domainGroups) {
      for (let i = 0; i < domainEmails.length; i += batchSize) {
        const batch = domainEmails.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (email) => {
          try {
            const result = await this.verifyEmail(email, options);
            return { email, ...result };
          } catch (error) {
            errors.push({ email, error: error.message });
            return {
              email,
              valid: false,
              reason: 'Verification failed',
              error: error.message,
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // 批次间延迟，避免过载
        if (i + batchSize < domainEmails.length) {
          await this.delay(options.batchDelay || 100);
        }
      }
    }
    
    return {
      total: emails.length,
      success: results.filter(r => r.valid).length,
      errors: errors.length,
      results,
      errors,
      duration: performance.now() - options.startTime || 0,
    };
  }
  
  /**
   * 按域名分组邮箱
   */
  groupEmailsByDomain(emails) {
    const groups = new Map();
    
    for (const email of emails) {
      const domain = email.split('@')[1]?.toLowerCase();
      if (domain) {
        if (!groups.has(domain)) {
          groups.set(domain, []);
        }
        groups.get(domain).push(email);
      }
    }
    
    return groups;
  }
  
  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 获取服务健康状态
   */
  async getHealthStatus() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      uptime: process.uptime(),
      checks: {},
    };
    
    try {
      // API服务检查
      const apiHealth = await this.checkAPIHealth();
      health.checks.api = apiHealth;
      
      // Redis检查
      if (this.redis) {
        const redisHealth = await this.checkRedisHealth();
        health.checks.redis = redisHealth;
      }
      
      // 缓存统计
      health.checks.cache = await this.getCacheStats();
      
      // 性能指标
      health.checks.metrics = this.getMetrics();
      
      // 限流器状态
      health.checks.rateLimiters = this.getRateLimiterStats();
      
      // 检查是否有任何组件不健康
      const unhealthyChecks = Object.values(health.checks).filter(check => check.status !== 'healthy');
      if (unhealthyChecks.length > 0) {
        health.status = 'degraded';
      }
    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }
    
    return health;
  }
  
  /**
   * 检查API健康状态
   */
  async checkAPIHealth() {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/health`, {
        timeout: 5000,
      });
      
      return {
        status: 'healthy',
        response: response.data,
        responseTime: response.headers['x-response-time'] || 'unknown',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        fallback: 'syntax-only',
      };
    }
  }
  
  /**
   * 检查Redis健康状态
   */
  async checkRedisHealth() {
    try {
      const start = performance.now();
      await this.redis.ping();
      const responseTime = performance.now() - start;
      
      return {
        status: 'healthy',
        responseTime: Math.round(responseTime),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }
  
  /**
   * 获取缓存统计
   */
  async getCacheStats() {
    const stats = {
      enabled: this.enableCache,
      type: this.redis ? 'redis' : 'memory',
      memorySize: this.memoryCache.size,
    };
    
    if (this.redis) {
      try {
        const info = await this.redis.info('memory');
        stats.redisMemory = this.parseRedisMemoryInfo(info);
      } catch (error) {
        stats.redisError = error.message;
      }
    }
    
    return stats;
  }
  
  /**
   * 解析Redis内存信息
   */
  parseRedisMemoryInfo(info) {
    const lines = info.split('\r\n');
    const memory = {};
    
    for (const line of lines) {
      if (line.startsWith('used_memory:')) {
        memory.used = parseInt(line.split(':')[1]);
      } else if (line.startsWith('used_memory_human:')) {
        memory.usedHuman = line.split(':')[1];
      }
    }
    
    return memory;
  }
  
  /**
   * 获取性能指标
   */
  getMetrics() {
    const avgDuration = this.metrics.requestCount > 0 ? 
      Math.round(this.metrics.totalDuration / this.metrics.requestCount) : 0;
    
    const successRate = this.metrics.requestCount > 0 ? 
      Math.round((this.metrics.successCount / this.metrics.requestCount) * 100) : 0;
    
    const cacheHitRate = this.metrics.requestCount > 0 ? 
      Math.round((this.metrics.cacheHitCount / this.metrics.requestCount) * 100) : 0;
    
    return {
      requestCount: this.metrics.requestCount,
      successCount: this.metrics.successCount,
      errorCount: this.metrics.errorCount,
      cacheHitCount: this.metrics.cacheHitCount,
      averageDuration: avgDuration,
      successRate,
      cacheHitRate,
      activeRequests: this.activeRequests,
      queuedRequests: this.requestQueue.length,
      domainStats: Object.fromEntries(this.metrics.domainStats),
    };
  }
  
  /**
   * 获取限流器统计
   */
  getRateLimiterStats() {
    return {
      globalTokens: Math.round(this.globalLimiter.tokens),
      globalLimit: this.globalRateLimit,
      domainLimiters: this.domainLimiters.size,
      activeDomains: Array.from(this.domainLimiters.entries()).map(([domain, limiter]) => ({
        domain,
        tokens: Math.round(limiter.tokens),
        limit: this.domainRateLimit,
      })),
    };
  }
  
  /**
   * 清理缓存
   */
  async clearCache() {
    try {
      if (this.redis) {
        const pattern = this.getCacheKey('*');
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
      
      this.memoryCache.clear();
      
      this.emit('cacheCleared');
    } catch (error) {
      console.error('Cache clear error:', error);
      throw error;
    }
  }
  
  /**
   * 优雅关闭
   */
  async shutdown() {
    console.log('Shutting down Enhanced Email Verifier Service...');
    
    // 等待所有活动请求完成
    while (this.activeRequests > 0) {
      console.log(`Waiting for ${this.activeRequests} active requests to complete...`);
      await this.delay(1000);
    }
    
    // 关闭Redis连接
    if (this.redis) {
      await this.redis.quit();
    }
    
    // 清理资源
    this.memoryCache.clear();
    this.domainLimiters.clear();
    this.metrics.domainStats.clear();
    
    console.log('Enhanced Email Verifier Service shutdown complete');
  }
}

module.exports = EnhancedEmailVerifierService;