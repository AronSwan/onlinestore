/**
 * Email Verification Service - 调用 AfterShip email-verifier 微服务
 */
const axios = require('axios');
const { performance } = require('perf_hooks');

class EmailVerifierService {
  constructor(config = {}) {
    this.apiBaseUrl =
      config.apiBaseUrl || process.env.EMAIL_VERIFIER_API_URL || 'http://localhost:8080';
    this.timeout = config.timeout || 10000; // 10秒超时
    this.enableCache = config.enableCache !== false;
    this.cache = new Map(); // 简单内存缓存，生产环境建议用 Redis
    this.cacheExpiry = config.cacheExpiry || 300000; // 5分钟缓存

    // 业务规则配置
    this.rules = {
      allowDisposable: config.allowDisposable || false,
      allowRoleAccount: config.allowRoleAccount !== false,
      requireMX: config.requireMX !== false,
      minReachability: config.minReachability || 'unknown', // unknown, low, medium, high
      enableSMTPCheck: config.enableSMTPCheck || false,
    };
  }

  /**
   * 验证邮箱地址
   * @param {string} email - 要验证的邮箱地址
   * @returns {Promise<Object>} 验证结果
   */
  async verifyEmail(email) {
    const startTime = performance.now();

    try {
      // 基础语法检查
      if (!this.isValidEmailSyntax(email)) {
        return this.createResult(email, false, 'Invalid email syntax', null, startTime);
      }

      // 检查缓存
      const cacheKey = email.toLowerCase();
      if (this.enableCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          return { ...cached.result, fromCache: true };
        }
        this.cache.delete(cacheKey);
      }

      // 调用 email-verifier API
      const apiResult = await this.callVerifierAPI(email);

      // 应用业务规则
      const businessResult = this.applyBusinessRules(apiResult);

      // 创建最终结果
      const result = this.createResult(
        email,
        businessResult.allowed,
        businessResult.reason,
        apiResult,
        startTime,
      );

      // 缓存结果
      if (this.enableCache) {
        this.cache.set(cacheKey, {
          result,
          timestamp: Date.now(),
        });
      }

      return result;
    } catch (error) {
      console.error('Email verification failed:', error.message);

      // 降级策略：仅语法检查
      const fallbackResult = this.createFallbackResult(email, error, startTime);
      return fallbackResult;
    }
  }

  /**
   * 调用 email-verifier API
   */
  async callVerifierAPI(email) {
    const url = `${this.apiBaseUrl}/v1/${encodeURIComponent(email)}/verification`;

    const response = await axios.get(url, {
      timeout: this.timeout,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'EmailVerifier-Client/1.0',
      },
    });

    return response.data;
  }

  /**
   * 应用业务规则
   */
  applyBusinessRules(apiResult) {
    const checks = [];

    // 语法检查
    if (!apiResult.syntax?.valid) {
      return { allowed: false, reason: 'Invalid email syntax' };
    }

    // MX 记录检查
    if (this.rules.requireMX && !apiResult.has_mx_records) {
      return { allowed: false, reason: 'Domain has no MX records' };
    }

    // 一次性邮箱检查
    if (!this.rules.allowDisposable && apiResult.disposable) {
      return { allowed: false, reason: 'Disposable email addresses are not allowed' };
    }

    // 角色邮箱检查
    if (!this.rules.allowRoleAccount && apiResult.role_account) {
      return { allowed: false, reason: 'Role-based email addresses are not allowed' };
    }

    // SMTP 可达性检查
    if (this.rules.enableSMTPCheck && apiResult.smtp) {
      if (apiResult.smtp.deliverable === false) {
        return { allowed: false, reason: 'Email address is not deliverable' };
      }

      if (apiResult.reachable === 'undeliverable') {
        return { allowed: false, reason: 'Email address is undeliverable' };
      }
    }

    // 可达性等级检查
    const reachabilityScore = this.getReachabilityScore(apiResult.reachable);
    const minScore = this.getReachabilityScore(this.rules.minReachability);

    if (reachabilityScore < minScore) {
      return {
        allowed: false,
        reason: `Email reachability (${apiResult.reachable}) below minimum requirement (${this.rules.minReachability})`,
      };
    }

    return { allowed: true, reason: 'Email passed all validation checks' };
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
      duration_ms: duration,
      timestamp: new Date().toISOString(),
      details: apiData
        ? {
            syntax: apiData.syntax,
            has_mx_records: apiData.has_mx_records,
            disposable: apiData.disposable,
            role_account: apiData.role_account,
            free: apiData.free,
            reachable: apiData.reachable,
            smtp: apiData.smtp,
            gravatar: apiData.gravatar,
            suggestion: apiData.suggestion,
          }
        : null,
    };
  }

  /**
   * 创建降级结果（API 不可用时）
   */
  createFallbackResult(email, error, startTime) {
    const isValidSyntax = this.isValidEmailSyntax(email);

    return this.createResult(
      email,
      isValidSyntax, // 降级时仅依赖语法检查
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
   * 获取服务健康状态
   */
  async getHealthStatus() {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/health`, {
        timeout: 5000,
      });
      return { status: 'healthy', details: response.data };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        fallback: 'syntax-only',
      };
    }
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxAge: this.cacheExpiry,
      enabled: this.enableCache,
    };
  }
}

module.exports = EmailVerifierService;
