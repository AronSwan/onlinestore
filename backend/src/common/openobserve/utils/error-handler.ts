import { AxiosError } from 'axios';

/**
 * 统一错误处理类
 * 提供详细的错误信息和可观测性
 */
export class OpenObserveError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly requestId?: string;
  public readonly timestamp: string;
  public readonly context?: Record<string, any>;
  public readonly retryable: boolean;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode?: number,
    context?: Record<string, any>,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'OpenObserveError';
    this.code = code;
    this.statusCode = statusCode;
    this.requestId = context?.requestId;
    this.timestamp = new Date().toISOString();
    this.context = context;
    this.retryable = retryable;

    // 保持堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenObserveError);
    }
  }

  /**
   * 创建网络错误
   */
  static networkError(message: string, context?: Record<string, any>): OpenObserveError {
    return new OpenObserveError(
      message,
      'NETWORK_ERROR',
      undefined,
      context,
      true // 网络错误通常可重试
    );
  }

  /**
   * 创建认证错误
   */
  static authenticationError(message: string, context?: Record<string, any>): OpenObserveError {
    return new OpenObserveError(
      message,
      'AUTHENTICATION_ERROR',
      401,
      context,
      false // 认证错误不可重试
    );
  }

  /**
   * 创建授权错误
   */
  static authorizationError(message: string, context?: Record<string, any>): OpenObserveError {
    return new OpenObserveError(
      message,
      'AUTHORIZATION_ERROR',
      403,
      context,
      false // 授权错误不可重试
    );
  }

  /**
   * 创建验证错误
   */
  static validationError(message: string, context?: Record<string, any>): OpenObserveError {
    return new OpenObserveError(
      message,
      'VALIDATION_ERROR',
      400,
      context,
      false // 验证错误不可重试
    );
  }

  /**
   * 创建资源未找到错误
   */
  static notFoundError(message: string, context?: Record<string, any>): OpenObserveError {
    return new OpenObserveError(
      message,
      'NOT_FOUND_ERROR',
      404,
      context,
      false
    );
  }

  /**
   * 创建服务器错误
   */
  static serverError(message: string, statusCode: number = 500, context?: Record<string, any>): OpenObserveError {
    return new OpenObserveError(
      message,
      'SERVER_ERROR',
      statusCode,
      context,
      statusCode >= 500 // 5xx错误可重试
    );
  }

  /**
   * 创建超时错误
   */
  static timeoutError(message: string, context?: Record<string, any>): OpenObserveError {
    return new OpenObserveError(
      message,
      'TIMEOUT_ERROR',
      408,
      context,
      true // 超时可重试
    );
  }

  /**
   * 从Axios错误创建OpenObserve错误
   */
  static fromAxiosError(error: AxiosError, context?: Record<string, any>): OpenObserveError {
    const requestId = error.response?.headers['x-request-id'] ||
                     error.response?.headers['request-id'] ||
                     this.generateRequestId();

    const errorContext = {
      ...context,
      requestId: context?.requestId || requestId, // 优先使用传入的requestId
      url: error.config?.url,
      method: error.config?.method,
      statusCode: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      axiosCode: error.code,
    };

    // 首先检查是否是超时错误
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return OpenObserveError.timeoutError(
        `Request timeout: ${error.message}`,
        errorContext
      );
    }

    if (!error.response) {
      // 网络错误
      return OpenObserveError.networkError(
        `Network error: ${error.message}`,
        errorContext
      );
    }

    const status = error.response.status;

    if (status === 401) {
      return OpenObserveError.authenticationError(
        `Authentication failed: ${error.message}`,
        errorContext
      );
    }

    if (status === 403) {
      return OpenObserveError.authorizationError(
        `Authorization failed: ${error.message}`,
        errorContext
      );
    }

    if (status === 404) {
      return OpenObserveError.notFoundError(
        `Resource not found: ${error.message}`,
        errorContext
      );
    }

    if (status === 408) {
      return OpenObserveError.timeoutError(
        `Request timeout: ${error.message}`,
        errorContext
      );
    }

    if (status >= 400 && status < 500) {
      // 对于422状态码，保留原始状态码
      if (status === 422) {
        return new OpenObserveError(
          `Validation error: ${error.message}`,
          'VALIDATION_ERROR',
          status,
          errorContext,
          false
        );
      }
      return OpenObserveError.validationError(
        `Validation error: ${error.message}`,
        errorContext
      );
    }

    // 5xx服务器错误
    if (status >= 500) {
      return OpenObserveError.serverError(
        `Server error: ${error.message}`,
        status,
        errorContext
      );
    }

    // 默认网络错误
    return OpenObserveError.networkError(
      `Network error: ${error.message}`,
      errorContext
    );
  }

  /**
   * 生成请求ID
   */
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 转换为JSON格式
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      requestId: this.requestId,
      timestamp: this.timestamp,
      context: this.context,
      retryable: this.retryable,
      stack: this.stack,
    };
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserFriendlyMessage(): string {
    switch (this.code) {
      case 'NETWORK_ERROR':
        return '网络连接失败，请检查网络设置后重试';
      case 'AUTHENTICATION_ERROR':
        return '身份验证失败，请检查凭据';
      case 'AUTHORIZATION_ERROR':
        return '权限不足，请联系管理员';
      case 'VALIDATION_ERROR':
        return '输入数据格式不正确';
      case 'NOT_FOUND_ERROR':
        return '请求的资源不存在';
      case 'TIMEOUT_ERROR':
        return '请求超时，请稍后重试';
      case 'SERVER_ERROR':
        return '服务器内部错误，请稍后重试';
      default:
        return this.message;
    }
  }
}

/**
 * 错误指标收集器
 */
export class ErrorMetrics {
  private static errorCounts: Map<string, number> = new Map();
  private static errorRates: Map<string, number> = new Map();

  /**
   * 记录错误
   */
  static recordError(error: OpenObserveError): void {
    const key = `${error.code}:${error.statusCode || 'unknown'}`;
    const currentCount = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, currentCount + 1);

    // 计算错误率（简化实现）
    const totalRequests = this.getTotalRequests();
    const errorCount = currentCount + 1;
    this.errorRates.set(key, totalRequests > 0 ? errorCount / totalRequests : 0);

    // 记录到日志系统
    console.error('[OpenObserveError]', {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      requestId: error.requestId,
      timestamp: error.timestamp,
      context: error.context,
    });
  }

  /**
   * 获取错误统计
   */
  static getErrorStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    this.errorCounts.forEach((count, key) => {
      const [code, statusCode] = key.split(':');
      stats[key] = {
        code,
        statusCode,
        count,
        rate: this.errorRates.get(key) || 0,
      };
    });

    return stats;
  }

  /**
   * 重置错误统计
   */
  static resetStats(): void {
    this.errorCounts.clear();
    this.errorRates.clear();
  }

  /**
   * 获取总请求数（简化实现）
   */
  private static getTotalRequests(): number {
    // 这里应该从实际的请求计数器获取
    // 暂时返回一个估算值
    return Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0) * 10;
  }
}

/**
 * 重试策略配置
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

/**
 * 默认重试配置
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'SERVER_ERROR',
  ],
};

/**
 * 重试工具类
 */
export class RetryHandler {
  /**
   * 执行带重试的操作
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
    context?: Record<string, any>
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // 转换为OpenObserveError
        const openObserveError = error instanceof OpenObserveError
          ? error
          : OpenObserveError.fromAxiosError(error, context);

        // 记录错误指标
        ErrorMetrics.recordError(openObserveError);

        // 检查是否可重试
        if (!openObserveError.retryable || !config.retryableErrors.includes(openObserveError.code)) {
          throw openObserveError;
        }

        // 如果是最后一次尝试，直接抛出错误
        if (attempt === config.maxAttempts) {
          throw openObserveError;
        }

        // 计算延迟时间
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );

        // 添加随机抖动
        const jitter = delay * 0.1 * Math.random();
        const finalDelay = delay + jitter;

        console.warn(`[Retry] Attempt ${attempt} failed, retrying in ${finalDelay}ms`, {
          error: openObserveError.message,
          code: openObserveError.code,
          attempt,
          maxAttempts: config.maxAttempts,
        });

        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, finalDelay));
      }
    }

    throw lastError!;
  }
}