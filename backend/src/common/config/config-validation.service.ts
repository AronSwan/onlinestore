import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SECURITY_CONSTANTS } from '../security/security.constants';

/**
 * 验证结果接口
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 分类验证结果接口
 */
interface CategoryValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 完整验证结果接口
 */
interface CompleteValidationResult extends ValidationResult {
  categories: {
    jwt: CategoryValidationResult;
    payment: CategoryValidationResult;
    encryption: CategoryValidationResult;
    requestValidation: CategoryValidationResult;
    securityCheck: CategoryValidationResult;
    monitoring: CategoryValidationResult;
  };
}

/**
 * 配置验证服务
 * 用途: 验证所有安全相关的环境变量是否正确设置
 * @author 安全团队
 * @version 1.0.0
 * @since 2025-10-03
 */
@Injectable()
export class ConfigValidationService {
  private readonly logger = new Logger(ConfigValidationService.name);

  constructor(private configService: ConfigService) {}

  /**
   * 验证所有安全配置
   * @returns {CompleteValidationResult} 验证结果
   */
  validateAllSecurityConfig(): CompleteValidationResult {
    const results: CompleteValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      categories: {
        jwt: this.validateJwtConfig(),
        payment: this.validatePaymentConfig(),
        encryption: this.validateEncryptionConfig(),
        requestValidation: this.validateRequestValidationConfig(),
        securityCheck: this.validateSecurityCheckConfig(),
        monitoring: this.validateMonitoringConfig(),
      },
    };

    // 汇总所有错误和警告
    Object.values(results.categories).forEach(category => {
      if (!category.valid) {
        results.valid = false;
      }
      results.errors.push(...category.errors);
      results.warnings.push(...category.warnings);
    });

    // 记录验证结果
    if (results.valid) {
      this.logger.log('所有安全配置验证通过');
    } else {
      this.logger.error(`安全配置验证失败，发现 ${results.errors.length} 个错误`);
      results.errors.forEach(error => this.logger.error(error));
    }

    if (results.warnings.length > 0) {
      this.logger.warn(`发现 ${results.warnings.length} 个配置警告`);
      results.warnings.forEach(warning => this.logger.warn(warning));
    }

    return results;
  }

  /**
   * 验证JWT配置
   * @returns {CategoryValidationResult} 验证结果
   */
  private validateJwtConfig(): CategoryValidationResult {
    const result: CategoryValidationResult = { valid: true, errors: [], warnings: [] };

    // 验证JWT密钥长度
    if (SECURITY_CONSTANTS.JWT.MIN_SECRET_LENGTH < 32) {
      result.valid = false;
      result.errors.push('JWT_MIN_SECRET_LENGTH 必须至少为32位');
    }

    // 验证JWT算法
    const validAlgorithms = ['RS256', 'HS256', 'ES256', 'PS256'];
    if (!validAlgorithms.includes(SECURITY_CONSTANTS.JWT.ALGORITHM)) {
      result.valid = false;
      result.errors.push(`JWT_ALGORITHM 必须是以下之一: ${validAlgorithms.join(', ')}`);
    }

    // 验证RSA密钥长度（如果使用RSA算法）
    if (
      SECURITY_CONSTANTS.JWT.ALGORITHM.startsWith('RS') ||
      SECURITY_CONSTANTS.JWT.ALGORITHM.startsWith('PS')
    ) {
      if (SECURITY_CONSTANTS.JWT.KEY_SIZE < 2048) {
        result.warnings.push('建议RSA密钥长度至少为2048位');
      }
    }

    // 验证令牌过期时间
    const tokenExpiry = SECURITY_CONSTANTS.JWT.TOKEN_EXPIRY;
    if (!this.isValidTimeFormat(tokenExpiry)) {
      result.valid = false;
      result.errors.push('JWT_TOKEN_EXPIRY 格式无效，应为数字+单位(s,m,h,d)，如: 1h, 30m');
    }

    // 验证刷新令牌过期时间
    const refreshExpiry = SECURITY_CONSTANTS.JWT.REFRESH_TOKEN_EXPIRY;
    if (!this.isValidTimeFormat(refreshExpiry)) {
      result.valid = false;
      result.errors.push('JWT_REFRESH_TOKEN_EXPIRY 格式无效，应为数字+单位(s,m,h,d)，如: 7d, 168h');
    }

    return result;
  }

  /**
   * 验证支付配置
   * @returns {CategoryValidationResult} 验证结果
   */
  private validatePaymentConfig(): CategoryValidationResult {
    const result: CategoryValidationResult = { valid: true, errors: [], warnings: [] };

    // 验证重试次数
    if (
      SECURITY_CONSTANTS.PAYMENT.MAX_RETRY_COUNT < 1 ||
      SECURITY_CONSTANTS.PAYMENT.MAX_RETRY_COUNT > 10
    ) {
      result.warnings.push('PAYMENT_MAX_RETRY_COUNT 建议在1-10之间');
    }

    // 验证回调超时时间
    if (
      SECURITY_CONSTANTS.PAYMENT.CALLBACK_TIMEOUT_MINUTES < 5 ||
      SECURITY_CONSTANTS.PAYMENT.CALLBACK_TIMEOUT_MINUTES > 60
    ) {
      result.warnings.push('PAYMENT_CALLBACK_TIMEOUT_MINUTES 建议在5-60分钟之间');
    }

    // 验证随机数过期时间
    if (
      SECURITY_CONSTANTS.PAYMENT.NONCE_EXPIRY_MINUTES < 5 ||
      SECURITY_CONSTANTS.PAYMENT.NONCE_EXPIRY_MINUTES > 30
    ) {
      result.warnings.push('PAYMENT_NONCE_EXPIRY_MINUTES 建议在5-30分钟之间');
    }

    // 验证速率限制配置
    const rateLimitConfigs = [
      { name: 'CREATE_PAYMENT', config: SECURITY_CONSTANTS.PAYMENT.RATE_LIMIT.CREATE_PAYMENT },
      { name: 'CALLBACK', config: SECURITY_CONSTANTS.PAYMENT.RATE_LIMIT.CALLBACK },
      { name: 'QUERY', config: SECURITY_CONSTANTS.PAYMENT.RATE_LIMIT.QUERY },
    ];

    rateLimitConfigs.forEach(({ name, config }) => {
      if (config.ttl < 1 || config.ttl > 3600) {
        result.warnings.push(`PAYMENT_RATE_LIMIT_${name}_TTL 建议在1-3600秒之间`);
      }
      if (config.limit < 1 || config.limit > 1000) {
        result.warnings.push(`PAYMENT_RATE_LIMIT_${name}_LIMIT 建议在1-1000之间`);
      }
    });

    return result;
  }

  /**
   * 验证加密配置
   * @returns {CategoryValidationResult} 验证结果
   */
  private validateEncryptionConfig(): CategoryValidationResult {
    const result: CategoryValidationResult = { valid: true, errors: [], warnings: [] };

    // 验证加密算法
    const validAlgorithms = ['aes-128-gcm', 'aes-192-gcm', 'aes-256-gcm', 'aes-256-cbc'];
    if (!validAlgorithms.includes(SECURITY_CONSTANTS.ENCRYPTION.ALGORITHM)) {
      result.valid = false;
      result.errors.push(`ENCRYPTION_ALGORITHM 必须是以下之一: ${validAlgorithms.join(', ')}`);
    }

    // 验证密钥长度 - 强制要求32字节（64字符）
    const keyLength = SECURITY_CONSTANTS.ENCRYPTION.KEY_LENGTH;

    if (keyLength !== 32) {
      result.valid = false;
      result.errors.push('为了最高安全性，密钥长度必须是32字节（64字符）');
    }

    // 验证IV长度
    if (
      SECURITY_CONSTANTS.ENCRYPTION.IV_LENGTH < 12 ||
      SECURITY_CONSTANTS.ENCRYPTION.IV_LENGTH > 16
    ) {
      result.warnings.push('ENCRYPTION_IV_LENGTH 建议在12-16字节之间');
    }

    // 验证认证标签长度
    if (
      SECURITY_CONSTANTS.ENCRYPTION.TAG_LENGTH < 12 ||
      SECURITY_CONSTANTS.ENCRYPTION.TAG_LENGTH > 16
    ) {
      result.warnings.push('ENCRYPTION_TAG_LENGTH 建议在12-16字节之间');
    }

    return result;
  }

  /**
   * 验证请求验证配置
   * @returns {CategoryValidationResult} 验证结果
   */
  private validateRequestValidationConfig(): CategoryValidationResult {
    const result: CategoryValidationResult = { valid: true, errors: [], warnings: [] };

    // 验证最大载荷大小
    const maxPayloadSize = SECURITY_CONSTANTS.REQUEST_VALIDATION.MAX_PAYLOAD_SIZE;
    if (!this.isValidSizeFormat(maxPayloadSize)) {
      result.valid = false;
      result.errors.push(
        'REQUEST_MAX_PAYLOAD_SIZE 格式无效，应为数字+单位(kb,mb,gb)，如: 10mb, 1gb',
      );
    }

    // 验证允许的来源
    const allowedOrigins = SECURITY_CONSTANTS.REQUEST_VALIDATION.ALLOWED_ORIGINS;
    if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0) {
      result.valid = false;
      result.errors.push('ALLOWED_ORIGINS 必须至少包含一个有效的来源');
    }

    // 验证CSRF Cookie名称
    const csrfCookieName = SECURITY_CONSTANTS.REQUEST_VALIDATION.CSRF_COOKIE_NAME;
    if (!csrfCookieName || csrfCookieName.length < 3) {
      result.warnings.push('CSRF_COOKIE_NAME 应该至少3个字符长');
    }

    return result;
  }

  /**
   * 验证安全检查配置
   * @returns {CategoryValidationResult} 验证结果
   */
  private validateSecurityCheckConfig(): CategoryValidationResult {
    const result: CategoryValidationResult = { valid: true, errors: [], warnings: [] };

    // 验证扫描超时时间
    if (
      SECURITY_CONSTANTS.SECURITY_CHECK.SCAN_TIMEOUT < 60000 ||
      SECURITY_CONSTANTS.SECURITY_CHECK.SCAN_TIMEOUT > 1800000
    ) {
      result.warnings.push('SECURITY_CHECK_SCAN_TIMEOUT 建议在1-30分钟之间');
    }

    // 验证缓存目录
    const cacheDir = SECURITY_CONSTANTS.SECURITY_CHECK.CACHE_DIR;
    if (!cacheDir || cacheDir.length < 3) {
      result.warnings.push('SECURITY_CHECK_CACHE_DIR 应该是一个有效的目录路径');
    }

    return result;
  }

  /**
   * 验证监控配置
   * @returns {CategoryValidationResult} 验证结果
   */
  private validateMonitoringConfig(): CategoryValidationResult {
    const result: CategoryValidationResult = { valid: true, errors: [], warnings: [] };

    // 验证告警阈值
    if (
      SECURITY_CONSTANTS.MONITORING.ALERT_THRESHOLD < 1 ||
      SECURITY_CONSTANTS.MONITORING.ALERT_THRESHOLD > 100
    ) {
      result.warnings.push('SECURITY_ALERT_THRESHOLD 建议在1-100之间');
    }

    // 验证日志保留天数
    if (
      SECURITY_CONSTANTS.MONITORING.RETENTION_DAYS < 7 ||
      SECURITY_CONSTANTS.MONITORING.RETENTION_DAYS > 365
    ) {
      result.warnings.push('SECURITY_LOG_RETENTION_DAYS 建议在7-365天之间');
    }

    return result;
  }

  /**
   * 验证时间格式
   * @param {string} timeFormat - 时间格式字符串
   * @returns {boolean} 是否有效
   */
  private isValidTimeFormat(timeFormat: string): boolean {
    if (!timeFormat || typeof timeFormat !== 'string') {
      return false;
    }

    // 匹配数字+单位格式，如: 1h, 30m, 7d
    const timePattern = /^\d+[smhd]$/;
    return timePattern.test(timeFormat);
  }

  /**
   * 验证大小格式
   * @param {string} sizeFormat - 大小格式字符串
   * @returns {boolean} 是否有效
   */
  private isValidSizeFormat(sizeFormat: string): boolean {
    if (!sizeFormat || typeof sizeFormat !== 'string') {
      return false;
    }

    // 匹配数字+单位格式，如: 10mb, 1gb, 500kb
    const sizePattern = /^\d+[kmg]b$/i;
    return sizePattern.test(sizeFormat);
  }

  /**
   * 获取配置摘要
   * @returns {Object} 配置摘要
   */
  getConfigSummary() {
    return {
      jwt: {
        algorithm: SECURITY_CONSTANTS.JWT.ALGORITHM,
        tokenExpiry: SECURITY_CONSTANTS.JWT.TOKEN_EXPIRY,
        issuer: SECURITY_CONSTANTS.JWT.ISSUER,
      },
      payment: {
        maxRetryCount: SECURITY_CONSTANTS.PAYMENT.MAX_RETRY_COUNT,
        callbackTimeout: SECURITY_CONSTANTS.PAYMENT.CALLBACK_TIMEOUT_MINUTES,
        rateLimitEnabled: true,
      },
      encryption: {
        algorithm: SECURITY_CONSTANTS.ENCRYPTION.ALGORITHM,
        keyLength: SECURITY_CONSTANTS.ENCRYPTION.KEY_LENGTH,
      },
      securityCheck: {
        enabled: SECURITY_CONSTANTS.SECURITY_CHECK.ENABLED,
        failOnHigh: SECURITY_CONSTANTS.SECURITY_CHECK.FAIL_ON_HIGH,
        cacheEnabled: SECURITY_CONSTANTS.SECURITY_CHECK.CACHE_ENABLED,
      },
      monitoring: {
        enabled: SECURITY_CONSTANTS.MONITORING.ENABLED,
        alertThreshold: SECURITY_CONSTANTS.MONITORING.ALERT_THRESHOLD,
        retentionDays: SECURITY_CONSTANTS.MONITORING.RETENTION_DAYS,
      },
    };
  }
}
