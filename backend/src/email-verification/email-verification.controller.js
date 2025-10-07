/**
 * Email Verification Controller - 提供邮箱验证的 REST API
 */
const EmailVerifierService = require('./email-verifier-service');

class EmailVerificationController {
  constructor() {
    // 从环境变量或配置文件读取配置
    this.verifierService = new EmailVerifierService({
      apiBaseUrl: process.env.EMAIL_VERIFIER_API_URL || 'http://localhost:8080',
      timeout: parseInt(process.env.EMAIL_VERIFIER_TIMEOUT) || 10000,
      enableCache: process.env.EMAIL_VERIFIER_CACHE !== 'false',
      cacheExpiry: parseInt(process.env.EMAIL_VERIFIER_CACHE_EXPIRY) || 300000,

      // 业务规则配置
      allowDisposable: process.env.ALLOW_DISPOSABLE_EMAIL === 'true',
      allowRoleAccount: process.env.ALLOW_ROLE_ACCOUNT !== 'false',
      requireMX: process.env.REQUIRE_MX_RECORDS !== 'false',
      minReachability: process.env.MIN_EMAIL_REACHABILITY || 'unknown',
      enableSMTPCheck: process.env.ENABLE_SMTP_CHECK === 'true',
    });
  }

  /**
   * 验证单个邮箱地址
   * POST /api/email/verify
   */
  async verifyEmail(req, res) {
    try {
      const { email } = req.body;

      // 参数验证
      if (!email || typeof email !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Email address is required',
          code: 'MISSING_EMAIL',
        });
      }

      // 长度检查
      if (email.length > 254) {
        return res.status(400).json({
          success: false,
          error: 'Email address too long',
          code: 'EMAIL_TOO_LONG',
        });
      }

      // 执行验证
      const result = await this.verifierService.verifyEmail(email);

      // 返回结果
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Email verification error:', error);

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'VERIFICATION_ERROR',
      });
    }
  }

  /**
   * 批量验证邮箱地址
   * POST /api/email/verify-batch
   */
  async verifyEmailBatch(req, res) {
    try {
      const { emails } = req.body;

      // 参数验证
      if (!Array.isArray(emails)) {
        return res.status(400).json({
          success: false,
          error: 'Emails must be an array',
          code: 'INVALID_INPUT',
        });
      }

      // 数量限制
      if (emails.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 100 emails per batch',
          code: 'BATCH_TOO_LARGE',
        });
      }

      // 并发验证（限制并发数避免过载）
      const concurrency = 10;
      const results = [];

      for (let i = 0; i < emails.length; i += concurrency) {
        const batch = emails.slice(i, i + concurrency);
        const batchPromises = batch.map(async email => {
          try {
            const result = await this.verifierService.verifyEmail(email);
            return { email, ...result };
          } catch (error) {
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
      }

      res.json({
        success: true,
        data: {
          total: emails.length,
          results,
        },
      });
    } catch (error) {
      console.error('Batch email verification error:', error);

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'BATCH_VERIFICATION_ERROR',
      });
    }
  }

  /**
   * 获取服务健康状态
   * GET /api/email/health
   */
  async getHealth(req, res) {
    try {
      const health = await this.verifierService.getHealthStatus();
      const cacheStats = this.verifierService.getCacheStats();

      res.json({
        success: true,
        data: {
          service: health,
          cache: cacheStats,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Health check error:', error);

      res.status(500).json({
        success: false,
        error: 'Health check failed',
        code: 'HEALTH_CHECK_ERROR',
      });
    }
  }

  /**
   * 清理缓存
   * POST /api/email/cache/clear
   */
  async clearCache(req, res) {
    try {
      this.verifierService.clearCache();

      res.json({
        success: true,
        message: 'Cache cleared successfully',
      });
    } catch (error) {
      console.error('Cache clear error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to clear cache',
        code: 'CACHE_CLEAR_ERROR',
      });
    }
  }

  /**
   * 获取验证配置
   * GET /api/email/config
   */
  getConfig(req, res) {
    res.json({
      success: true,
      data: {
        rules: this.verifierService.rules,
        cache: {
          enabled: this.verifierService.enableCache,
          expiry: this.verifierService.cacheExpiry,
        },
        timeout: this.verifierService.timeout,
      },
    });
  }
}

module.exports = EmailVerificationController;
