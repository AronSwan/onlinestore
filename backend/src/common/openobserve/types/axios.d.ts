import { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

/**
 * 扩展Axios请求配置，添加元数据
 */
declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * 请求元数据
     */
    metadata?: {
      /** 请求开始时间 */
      startTime?: number;
      /** 请求持续时间 */
      duration?: number;
      /** 请求ID */
      requestId?: string;
      /** 重试次数 */
      retryCount?: number;
      /** 自定义属性 */
      [key: string]: any;
    };
    
    /**
     * 重试配置
     */
    retryConfig?: {
      maxRetries: number;
      initialDelayMs: number;
      maxDelayMs: number;
      backoffMultiplier: number;
      retryableErrors: string[];
      retryableStatusCodes: number[];
    };
    
    /**
     * 自定义属性
     */
    [key: string]: any;
  }

  interface AxiosResponse {
    /**
     * 响应元数据
     */
    metadata?: {
      /** 请求开始时间 */
      startTime?: number;
      /** 请求持续时间 */
      duration?: number;
      /** 请求ID */
      requestId?: string;
      /** 重试次数 */
      retryCount?: number;
      /** 响应大小 */
      size?: number;
      /** 自定义属性 */
      [key: string]: any;
    };
    
    /**
     * 自定义属性
     */
    [key: string]: any;
  }

  interface AxiosError {
    /**
     * 错误元数据
     */
    metadata?: {
      /** 请求开始时间 */
      startTime?: number;
      /** 请求持续时间 */
      duration?: number;
      /** 请求ID */
      requestId?: string;
      /** 重试次数 */
      retryCount?: number;
      /** 自定义属性 */
      [key: string]: any;
    };
    
    /**
     * 自定义属性
     */
    [key: string]: any;
  }
}

/**
 * 请求拦截器选项
 */
export interface AxiosRequestInterceptorOptions {
  /** 是否启用请求ID */
  enableRequestId?: boolean;
  /** 是否记录请求时间 */
  enableTiming?: boolean;
  /** 是否记录请求大小 */
  enableSizeTracking?: boolean;
  /** 自定义元数据生成函数 */
  metadataGenerator?: (config: AxiosRequestConfig) => Record<string, any>;
}

/**
 * 响应拦截器选项
 */
export interface AxiosResponseInterceptorOptions {
  /** 是否计算响应时间 */
  calculateDuration?: boolean;
  /** 是否记录响应大小 */
  calculateSize?: boolean;
  /** 自定义元数据处理函数 */
  metadataProcessor?: (response: AxiosResponse) => Record<string, any>;
}

/**
 * 重试拦截器选项
 */
export interface AxiosRetryInterceptorOptions {
  /** 是否启用重试 */
  enabled?: boolean;
  /** 自定义重试条件函数 */
  shouldRetry?: (error: AxiosError) => boolean;
  /** 重试回调函数 */
  onRetry?: (error: AxiosError, retryCount: number) => void;
  /** 最大重试延迟 */
  maxRetryDelay?: number;
}

/**
 * 创建带元数据的请求配置
 */
export function createMetadataRequestConfig(
  config: AxiosRequestConfig,
  metadata?: Record<string, any>
): AxiosRequestConfig {
  return {
    ...config,
    metadata: {
      ...config.metadata,
      startTime: Date.now(),
      requestId: generateRequestId(),
      ...metadata,
    },
  };
}

/**
 * 生成请求ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 计算请求持续时间
 */
export function calculateDuration(startTime: number): number {
  return Date.now() - startTime;
}

/**
 * 计算响应大小
 */
export function calculateSize(data: any): number {
  if (!data) {
    return 0;
  }
  
  if (typeof data === 'string') {
    return Buffer.byteLength(data, 'utf8');
  }
  
  if (data instanceof ArrayBuffer) {
    return data.byteLength;
  }
  
  if (data instanceof Blob) {
    return data.size;
  }
  
  // 对于对象，计算JSON字符串的长度
  try {
    const jsonString = JSON.stringify(data);
    return Buffer.byteLength(jsonString, 'utf8');
  } catch {
    return 0;
  }
}

/**
 * 创建请求拦截器
 */
export function createRequestInterceptor(
  options: AxiosRequestInterceptorOptions = {}
) {
  return (config: AxiosRequestConfig) => {
    const {
      enableRequestId = true,
      enableTiming = true,
      enableSizeTracking = false,
      metadataGenerator,
    } = options;
    
    // 初始化元数据
    if (!config.metadata) {
      config.metadata = {};
    }
    
    // 添加请求开始时间
    if (enableTiming && !config.metadata.startTime) {
      config.metadata.startTime = Date.now();
    }
    
    // 添加请求ID
    if (enableRequestId && !config.metadata.requestId) {
      config.metadata.requestId = generateRequestId();
    }
    
    // 计算请求大小
    if (enableSizeTracking && config.data) {
      config.metadata.requestSize = calculateSize(config.data);
    }
    
    // 应用自定义元数据生成器
    if (metadataGenerator) {
      const customMetadata = metadataGenerator(config);
      Object.assign(config.metadata, customMetadata);
    }
    
    return config;
  };
}

/**
 * 创建响应拦截器
 */
export function createResponseInterceptor(
  options: AxiosResponseInterceptorOptions = {}
) {
  return (response: AxiosResponse) => {
    const {
      calculateDuration = true,
      calculateSize = false,
      metadataProcessor,
    } = options;
    
    // 初始化响应元数据
    if (!response.metadata) {
      response.metadata = {};
    }
    
    // 传递请求元数据
    if (response.config && response.config.metadata) {
      Object.assign(response.metadata, response.config.metadata);
    }
    
    // 计算响应时间
    if (calculateDuration && response.metadata.startTime) {
      response.metadata.duration = calculateDuration(response.metadata.startTime);
    }
    
    // 计算响应大小
    if (calculateSize && response.data) {
      response.metadata.size = calculateSize(response.data);
    }
    
    // 应用自定义元数据处理器
    if (metadataProcessor) {
      const customMetadata = metadataProcessor(response);
      Object.assign(response.metadata, customMetadata);
    }
    
    return response;
  };
}

/**
 * 创建错误拦截器
 */
export function createErrorInterceptor(
  options: AxiosResponseInterceptorOptions = {}
) {
  return (error: AxiosError) => {
    const {
      calculateDuration = true,
      metadataProcessor,
    } = options;
    
    // 初始化错误元数据
    if (!error.metadata) {
      error.metadata = {};
    }
    
    // 传递请求元数据
    if (error.config && error.config.metadata) {
      Object.assign(error.metadata, error.config.metadata);
    }
    
    // 计算响应时间
    if (calculateDuration && error.metadata.startTime) {
      error.metadata.duration = calculateDuration(error.metadata.startTime);
    }
    
    // 应用自定义元数据处理器
    if (metadataProcessor) {
      const customMetadata = metadataProcessor(error as any);
      Object.assign(error.metadata, customMetadata);
    }
    
    return Promise.reject(error);
  };
}