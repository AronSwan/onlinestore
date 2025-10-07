import { Injectable, Logger } from '@nestjs/common';

/**
 * 错误严重级别枚举
 */
export enum ErrorSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

/**
 * 错误类别枚举
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  NETWORK = 'network',
  SYSTEM = 'system',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
}

/**
 * 错误分类接口
 */
export interface ErrorClassification {
  category: ErrorCategory;
  severity: ErrorSeverity;
  isRetryable: boolean;
  requiresImmediateAttention: boolean;
  suggestedActions: string[];
  relatedDocumentation?: string[];
  escalationLevel: number;
}

/**
 * 增强错误信息接口
 */
export interface EnhancedErrorInfo {
  originalError: Error;
  classification: ErrorClassification;
  context: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
  stackTrace?: string;
}

/**
 * 错误处理策略接口
 */
export interface ErrorHandlingStrategy {
  shouldLog: boolean;
  shouldAlert: boolean;
  shouldRetry: boolean;
  retryDelay?: number;
  maxRetries?: number;
  customHandler?: (error: EnhancedErrorInfo) => void;
}

/**
 * 错误分类服务
 * 用途: 提供细粒度的错误分类和处理机制
 * @author 安全团队
 * @version 1.0.0
 * @since 2025-10-03
 */
@Injectable()
export class ErrorClassificationService {
  private readonly logger = new Logger(ErrorClassificationService.name);

  /**
   * 分类错误
   * @param {Error} error - 原始错误
   * @param {Record<string, any>} context - 错误上下文
   * @returns {EnhancedErrorInfo} 增强的错误信息
   */
  classifyError(error: Error, context: Record<string, any> = {}): EnhancedErrorInfo {
    const classification = this.determineErrorClassification(error, context);

    return {
      originalError: error,
      classification,
      context,
      timestamp: new Date(),
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      stackTrace: error.stack,
    };
  }

  /**
   * 确定错误分类
   * @param {Error} error - 错误对象
   * @param {Record<string, any>} context - 错误上下文
   * @returns {ErrorClassification} 错误分类
   */
  private determineErrorClassification(
    error: Error,
    context: Record<string, any>,
  ): ErrorClassification {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.constructor.name.toLowerCase();

    // 安全相关错误
    if (this.isSecurityError(errorMessage, errorName)) {
      return {
        category: ErrorCategory.SECURITY,
        severity: ErrorSeverity.HIGH,
        isRetryable: false,
        requiresImmediateAttention: true,
        suggestedActions: ['检查用户权限', '验证请求来源', '检查认证令牌', '记录安全事件'],
        relatedDocumentation: ['SECURITY_AUDIT_REPORT.md', 'SECURITY_CHECKLIST.md'],
        escalationLevel: 3,
      };
    }

    // 认证错误
    if (this.isAuthenticationError(errorMessage, errorName)) {
      return {
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        isRetryable: false,
        requiresImmediateAttention: false,
        suggestedActions: ['检查用户凭据', '验证JWT令牌', '检查会话状态'],
        relatedDocumentation: ['SECURITY_CHECKLIST.md#jwt-authentication'],
        escalationLevel: 2,
      };
    }

    // 授权错误
    if (this.isAuthorizationError(errorMessage, errorName)) {
      return {
        category: ErrorCategory.AUTHORIZATION,
        severity: ErrorSeverity.MEDIUM,
        isRetryable: false,
        requiresImmediateAttention: false,
        suggestedActions: ['检查用户角色', '验证权限设置', '检查资源访问控制'],
        relatedDocumentation: ['SECURITY_CHECKLIST.md#role-permission-control'],
        escalationLevel: 1,
      };
    }

    // 验证错误
    if (this.isValidationError(errorMessage, errorName)) {
      return {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        isRetryable: false,
        requiresImmediateAttention: false,
        suggestedActions: ['检查输入格式', '验证必填字段', '检查数据类型'],
        relatedDocumentation: ['SECURITY_CHECKLIST.md#input-validation'],
        escalationLevel: 1,
      };
    }

    // 数据库错误
    if (this.isDatabaseError(errorMessage, errorName)) {
      return {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        isRetryable: true,
        requiresImmediateAttention: true,
        suggestedActions: ['检查数据库连接', '验证查询语法', '检查事务状态', '检查数据库锁'],
        relatedDocumentation: ['SECURITY_CHECKLIST.md#database-security'],
        escalationLevel: 2,
      };
    }

    // 外部服务错误
    if (this.isExternalServiceError(errorMessage, errorName)) {
      return {
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSeverity.MEDIUM,
        isRetryable: true,
        requiresImmediateAttention: false,
        suggestedActions: ['检查服务可用性', '验证API密钥', '检查网络连接', '检查请求格式'],
        escalationLevel: 1,
      };
    }

    // 网络错误
    if (this.isNetworkError(errorMessage, errorName)) {
      return {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        isRetryable: true,
        requiresImmediateAttention: false,
        suggestedActions: ['检查网络连接', '验证端点可达性', '检查防火墙设置', '检查DNS解析'],
        escalationLevel: 1,
      };
    }

    // 业务逻辑错误
    if (this.isBusinessLogicError(errorMessage, errorName)) {
      return {
        category: ErrorCategory.BUSINESS_LOGIC,
        severity: ErrorSeverity.MEDIUM,
        isRetryable: false,
        requiresImmediateAttention: false,
        suggestedActions: ['检查业务规则', '验证数据一致性', '检查状态机', '检查约束条件'],
        escalationLevel: 1,
      };
    }

    // 性能错误
    if (this.isPerformanceError(errorMessage, errorName)) {
      return {
        category: ErrorCategory.PERFORMANCE,
        severity: ErrorSeverity.LOW,
        isRetryable: true,
        requiresImmediateAttention: false,
        suggestedActions: ['优化查询', '增加缓存', '检查资源使用', '分析性能瓶颈'],
        escalationLevel: 1,
      };
    }

    // 系统错误（默认）
    return {
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.HIGH,
      isRetryable: false,
      requiresImmediateAttention: true,
      suggestedActions: ['检查系统资源', '查看系统日志', '检查配置文件', '联系系统管理员'],
      escalationLevel: 2,
    };
  }

  /**
   * 获取错误处理策略
   * @param {EnhancedErrorInfo} errorInfo - 增强的错误信息
   * @returns {ErrorHandlingStrategy} 错误处理策略
   */
  getErrorHandlingStrategy(errorInfo: EnhancedErrorInfo): ErrorHandlingStrategy {
    const { classification } = errorInfo;

    const baseStrategy: ErrorHandlingStrategy = {
      shouldLog: true,
      shouldAlert:
        classification.severity === ErrorSeverity.CRITICAL ||
        classification.requiresImmediateAttention,
      shouldRetry: classification.isRetryable,
      retryDelay: this.calculateRetryDelay(classification.severity),
      maxRetries: this.getMaxRetries(classification.category),
    };

    // 根据错误类别调整策略
    switch (classification.category) {
      case ErrorCategory.SECURITY:
        return {
          ...baseStrategy,
          shouldAlert: true,
          shouldRetry: false,
          customHandler: error => this.handleSecurityError(error),
        };

      case ErrorCategory.AUTHENTICATION:
        return {
          ...baseStrategy,
          shouldRetry: false,
          customHandler: error => this.handleAuthenticationError(error),
        };

      case ErrorCategory.DATABASE:
        return {
          ...baseStrategy,
          retryDelay: 1000, // 数据库错误重试间隔较长
          maxRetries: 3,
          customHandler: error => this.handleDatabaseError(error),
        };

      case ErrorCategory.EXTERNAL_SERVICE:
        return {
          ...baseStrategy,
          retryDelay: 2000, // 外部服务错误重试间隔更长
          maxRetries: 5,
          customHandler: error => this.handleExternalServiceError(error),
        };

      default:
        return baseStrategy;
    }
  }

  /**
   * 处理错误
   * @param {EnhancedErrorInfo} errorInfo - 增强的错误信息
   */
  handleError(errorInfo: EnhancedErrorInfo): void {
    const strategy = this.getErrorHandlingStrategy(errorInfo);

    // 记录错误
    if (strategy.shouldLog) {
      this.logError(errorInfo);
    }

    // 发送告警
    if (strategy.shouldAlert) {
      this.sendAlert(errorInfo);
    }

    // 执行自定义处理
    if (strategy.customHandler) {
      strategy.customHandler(errorInfo);
    }
  }

  /**
   * 记录错误
   * @param {EnhancedErrorInfo} errorInfo - 增强的错误信息
   */
  private logError(errorInfo: EnhancedErrorInfo): void {
    const { classification, originalError, context } = errorInfo;

    const logMessage = `错误分类: ${classification.category}/${classification.severity} - ${originalError.message}`;
    const logContext = {
      category: classification.category,
      severity: classification.severity,
      isRetryable: classification.isRetryable,
      suggestedActions: classification.suggestedActions,
      context,
      stackTrace: errorInfo.stackTrace,
    };

    switch (classification.severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.error(logMessage, logContext);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error(logMessage, logContext);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn(logMessage, logContext);
        break;
      case ErrorSeverity.LOW:
        this.logger.log(logMessage, logContext);
        break;
      case ErrorSeverity.INFO:
        this.logger.debug(logMessage, logContext);
        break;
    }
  }

  /**
   * 发送告警
   * @param {EnhancedErrorInfo} errorInfo - 增强的错误信息
   */
  private sendAlert(errorInfo: EnhancedErrorInfo): void {
    // 这里可以集成告警系统，如邮件、短信、Slack等
    this.logger.error(
      `发送告警: ${errorInfo.classification.category}/${errorInfo.classification.severity} - ${errorInfo.originalError.message}`,
    );
  }

  /**
   * 计算重试延迟
   * @param {ErrorSeverity} severity - 错误严重级别
   * @returns {number} 重试延迟（毫秒）
   */
  private calculateRetryDelay(severity: ErrorSeverity): number {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 5000; // 5秒
      case ErrorSeverity.HIGH:
        return 3000; // 3秒
      case ErrorSeverity.MEDIUM:
        return 2000; // 2秒
      case ErrorSeverity.LOW:
        return 1000; // 1秒
      default:
        return 1000;
    }
  }

  /**
   * 获取最大重试次数
   * @param {ErrorCategory} category - 错误类别
   * @returns {number} 最大重试次数
   */
  private getMaxRetries(category: ErrorCategory): number {
    switch (category) {
      case ErrorCategory.DATABASE:
        return 3;
      case ErrorCategory.EXTERNAL_SERVICE:
        return 5;
      case ErrorCategory.NETWORK:
        return 3;
      default:
        return 1;
    }
  }

  // 以下方法用于判断错误类型
  private isSecurityError(message: string, name: string): boolean {
    const securityKeywords = [
      'unauthorized',
      'forbidden',
      'csrf',
      'xss',
      'injection',
      'security',
      'token',
      'auth',
    ];
    return securityKeywords.some(keyword => message.includes(keyword) || name.includes(keyword));
  }

  private isAuthenticationError(message: string, name: string): boolean {
    const authKeywords = [
      'authentication',
      'login',
      'credential',
      'jwt',
      'token expired',
      'invalid token',
    ];
    return authKeywords.some(keyword => message.includes(keyword) || name.includes(keyword));
  }

  private isAuthorizationError(message: string, name: string): boolean {
    const authzKeywords = ['authorization', 'permission', 'access denied', 'role', 'privilege'];
    return authzKeywords.some(keyword => message.includes(keyword) || name.includes(keyword));
  }

  private isValidationError(message: string, name: string): boolean {
    const validationKeywords = [
      'validation',
      'invalid',
      'required',
      'format',
      'constraint',
      'bad request',
    ];
    return validationKeywords.some(keyword => message.includes(keyword) || name.includes(keyword));
  }

  private isDatabaseError(message: string, name: string): boolean {
    const dbKeywords = [
      'database',
      'connection',
      'query',
      'sql',
      'timeout',
      'deadlock',
      'constraint violation',
    ];
    return dbKeywords.some(keyword => message.includes(keyword) || name.includes(keyword));
  }

  private isExternalServiceError(message: string, name: string): boolean {
    const externalKeywords = [
      'external',
      'api',
      'service',
      'third party',
      'timeout',
      'unavailable',
    ];
    return externalKeywords.some(keyword => message.includes(keyword) || name.includes(keyword));
  }

  private isNetworkError(message: string, name: string): boolean {
    const networkKeywords = ['network', 'connection', 'timeout', 'unreachable', 'dns', 'socket'];
    return networkKeywords.some(keyword => message.includes(keyword) || name.includes(keyword));
  }

  private isBusinessLogicError(message: string, name: string): boolean {
    const businessKeywords = ['business', 'logic', 'rule', 'constraint', 'state', 'workflow'];
    return businessKeywords.some(keyword => message.includes(keyword) || name.includes(keyword));
  }

  private isPerformanceError(message: string, name: string): boolean {
    const performanceKeywords = ['performance', 'timeout', 'slow', 'memory', 'cpu', 'resource'];
    return performanceKeywords.some(keyword => message.includes(keyword) || name.includes(keyword));
  }

  // 以下方法用于处理特定类型的错误
  private handleSecurityError(errorInfo: EnhancedErrorInfo): void {
    this.logger.error(`安全错误处理: ${errorInfo.originalError.message}`);
    // 可以在这里添加安全事件记录、用户会话终止等逻辑
  }

  private handleAuthenticationError(errorInfo: EnhancedErrorInfo): void {
    this.logger.warn(`认证错误处理: ${errorInfo.originalError.message}`);
    // 可以在这里添加清除认证状态、重定向到登录页等逻辑
  }

  private handleDatabaseError(errorInfo: EnhancedErrorInfo): void {
    this.logger.error(`数据库错误处理: ${errorInfo.originalError.message}`);
    // 可以在这里添加连接池重置、事务回滚等逻辑
  }

  private handleExternalServiceError(errorInfo: EnhancedErrorInfo): void {
    this.logger.warn(`外部服务错误处理: ${errorInfo.originalError.message}`);
    // 可以在这里添加服务降级、缓存回退等逻辑
  }
}
