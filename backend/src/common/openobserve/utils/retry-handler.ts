import { Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { OpenObserveConfigService } from '../config/openobserve-config.service';

/**
 * 重试配置接口
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  retryableStatusCodes: number[];
}

/**
 * 默认重试配置
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'EHOSTUNREACH',
    'EPIPE',
    'ENOTFOUND',
    'ENETUNREACH',
    'EAI_AGAIN',
  ],
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * 重试处理器
 * 支持从配置服务读取重试参数
 */
export class RetryHandler {
  private readonly logger = new Logger(RetryHandler.name);
  private readonly config: RetryConfig;

  constructor(configService?: OpenObserveConfigService, customConfig?: Partial<RetryConfig>) {
    // 从配置服务读取重试参数
    const configFromService = configService ? this.extractConfigFromService(configService) : {};
    
    // 合并配置：默认配置 < 服务配置 < 自定义配置
    this.config = {
      ...DEFAULT_RETRY_CONFIG,
      ...configFromService,
      ...customConfig,
    };
    
    this.logger.debug(`RetryHandler initialized with config: ${JSON.stringify(this.config)}`);
  }

  /**
   * 从配置服务提取重试配置
   */
  private extractConfigFromService(configService: OpenObserveConfigService): Partial<RetryConfig> {
    const config = configService.getConfig();
    
    return {
      maxRetries: config.retryCount ?? DEFAULT_RETRY_CONFIG.maxRetries,
      initialDelayMs: config.retryDelay ?? DEFAULT_RETRY_CONFIG.initialDelayMs,
      backoffMultiplier: 2.0, // 使用默认值，因为配置服务中没有此属性
    };
  }

  /**
   * 执行带重试的异步函数
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: Error;
    let attempt = 0;
    
    while (attempt <= this.config.maxRetries) {
      try {
        const startTime = Date.now();
        const result = await fn();
        const duration = Date.now() - startTime;
        
        if (attempt > 0) {
          this.logger.log(`Operation succeeded after ${attempt} retries (${duration}ms)`, context);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        attempt++;
        
        const shouldRetry = this.shouldRetry(error, attempt);
        
        if (!shouldRetry || attempt > this.config.maxRetries) {
          this.logger.error(
            `Operation failed after ${attempt - 1} retries, giving up`,
            { context, error: lastError.message, attempt: attempt - 1 }
          );
          throw lastError;
        }
        
        const delay = this.calculateDelay(attempt);
        this.logger.warn(
          `Operation failed (attempt ${attempt}/${this.config.maxRetries}), retrying in ${delay}ms`,
          { context, error: lastError.message }
        );
        
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: Error, attempt: number): boolean {
    if (attempt > this.config.maxRetries) {
      return false;
    }
    
    // 检查错误类型
    if (error.name && this.config.retryableErrors.includes(error.name)) {
      return true;
    }
    
    // 检查Axios错误
    if (this.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      // 检查错误码
      if (axiosError.code && this.config.retryableErrors.includes(axiosError.code)) {
        return true;
      }
      
      // 检查HTTP状态码
      if (
        axiosError.response &&
        axiosError.response.status &&
        this.config.retryableStatusCodes.includes(axiosError.response.status)
      ) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 计算重试延迟
   */
  private calculateDelay(attempt: number): number {
    // 指数退避算法
    const delay = this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attempt - 1);
    
    // 添加随机抖动，避免雷群效应
    const jitter = delay * 0.1 * Math.random();
    
    // 确保不超过最大延迟
    return Math.min(delay + jitter, this.config.maxDelayMs);
  }

  /**
   * 休眠指定时间
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 检查是否为Axios错误
   */
  private isAxiosError(error: any): error is AxiosError {
    return error && error.isAxiosError === true;
  }

  /**
   * 获取当前重试配置
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * 更新重试配置
   */
  updateConfig(newConfig: Partial<RetryConfig>): void {
    Object.assign(this.config, newConfig);
    this.logger.debug(`RetryHandler config updated: ${JSON.stringify(this.config)}`);
  }

  /**
   * 创建带重试的Axios请求拦截器
   */
  createRequestInterceptor() {
    return (config: any) => {
      // 添加请求开始时间，用于计算持续时间
      config.metadata = {
        ...config.metadata,
        startTime: Date.now(),
      };
      return config;
    };
  }

  /**
   * 创建带重试的Axios响应拦截器
   */
  createResponseInterceptor(onRetry?: (error: any, attempt: number) => void) {
    return (error: any) => {
      if (!error.config) {
        return Promise.reject(error);
      }
      
      // 获取当前重试次数
      const currentRetry = error.config.__retryCount || 0;
      
      // 检查是否应该重试
      if (!this.shouldRetry(error, currentRetry + 1)) {
        return Promise.reject(error);
      }
      
      // 增加重试计数
      error.config.__retryCount = currentRetry + 1;
      
      // 计算延迟时间
      const delay = this.calculateRetryDelay(error.config.__retryCount);
      
      // 记录重试日志
      this.logger.warn(
        `Request failed, retrying (${error.config.__retryCount}/${this.config.maxRetries}) in ${delay}ms`,
        {
          url: error.config.url,
          method: error.config.method?.toUpperCase(),
          status: error.response?.status,
          code: error.code,
        }
      );
      
      // 调用重试回调
      if (onRetry) {
        onRetry(error, error.config.__retryCount);
      }
      
      // 返回延迟后的重试请求
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(this.axiosInstance(error.config));
        }, delay);
      });
    };
  }

  /**
   * 计算重试延迟
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attempt - 1);
    const jitter = delay * 0.1 * Math.random();
    return Math.min(delay + jitter, this.config.maxDelayMs);
  }

  /**
   * 创建Axios实例（内部使用）
   */
  private get axiosInstance() {
    // 这里应该使用依赖注入的axios实例
    // 为了简化，我们返回一个简单的函数
    return (config: any) => {
      // 在实际实现中，这里应该调用axios实例
      throw new Error('Axios instance not available in this context');
    };
  }

  /**
   * 创建带重试功能的Axios实例配置
   */
  createAxiosConfig(axiosConfig: any = {}): any {
    return {
      ...axiosConfig,
      retryConfig: this.config,
      // 添加请求拦截器
      transformRequest: [
        ...(axiosConfig.transformRequest || []),
        this.createRequestInterceptor(),
      ],
      // 添加响应拦截器
      transformResponse: [
        ...(axiosConfig.transformResponse || []),
      ],
    };
  }
}