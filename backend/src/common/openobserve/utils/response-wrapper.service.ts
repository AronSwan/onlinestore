import { Injectable, Logger } from '@nestjs/common';

/**
 * 响应包装服务
 * 替代兼容性服务，提供响应包装和错误处理功能
 */
@Injectable()
export class ResponseWrapperService {
  private readonly logger = new Logger(ResponseWrapperService.name);

  /**
   * 包装成功响应
   * @param data 响应数据
   * @param requestId 请求ID
   * @param metadata 额外元数据
   * @returns 包装后的响应
   */
  wrapSuccessResponse(
    data: any,
    requestId?: string,
    metadata?: Record<string, any>
  ): {
    success: boolean;
    data: any;
    requestId?: string;
    timestamp: string;
    metadata?: Record<string, any>;
  } {
    return {
      success: true,
      data,
      requestId,
      timestamp: new Date().toISOString(),
      metadata,
    };
  }

  /**
   * 包装错误响应
   * @param error 错误对象
   * @param requestId 请求ID
   * @param operation 操作名称
   * @returns 包装后的错误响应
   */
  wrapErrorResponse(
    error: any,
    requestId?: string,
    operation?: string
  ): {
    success: boolean;
    error: {
      code: string;
      message: string;
      details?: any;
    };
    requestId?: string;
    timestamp: string;
    operation?: string;
  } {
    const errorCode = error.code || 'UNKNOWN_ERROR';
    const errorMessage = error.message || 'An unknown error occurred';
    
    this.logger.error(`Operation ${operation} failed`, {
      requestId,
      errorCode,
      errorMessage,
      stack: error.stack,
    });

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details: error.details || error.response?.data,
      },
      requestId,
      timestamp: new Date().toISOString(),
      operation,
    };
  }

  /**
   * 包装分页响应
   * @param data 响应数据
   * @param total 总数
   * @param page 页码
   * @param limit 每页数量
   * @param requestId 请求ID
   * @returns 包装后的分页响应
   */
  wrapPaginatedResponse(
    data: any[],
    total: number,
    page: number,
    limit: number,
    requestId?: string
  ): {
    success: boolean;
    data: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    requestId?: string;
    timestamp: string;
  } {
    const totalPages = Math.ceil(total / limit);
    
    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      requestId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 包装流式响应
   * @param stream 流数据
   * @param requestId 请求ID
   * @returns 包装后的流式响应
   */
  wrapStreamResponse(
    stream: any,
    requestId?: string
  ): {
    success: boolean;
    stream: any;
    requestId?: string;
    timestamp: string;
    type: 'stream';
  } {
    return {
      success: true,
      stream,
      requestId,
      timestamp: new Date().toISOString(),
      type: 'stream',
    };
  }

  /**
   * 创建标准化的API响应
   * @param success 是否成功
   * @param data 数据
   * @param message 消息
   * @param requestId 请求ID
   * @param metadata 额外元数据
   * @returns 标准化的API响应
   */
  createStandardResponse<T>(
    success: boolean,
    data?: T,
    message?: string,
    requestId?: string,
    metadata?: Record<string, any>
  ): {
    success: boolean;
    data?: T;
    message?: string;
    requestId?: string;
    timestamp: string;
    metadata?: Record<string, any>;
  } {
    return {
      success,
      data,
      message,
      requestId,
      timestamp: new Date().toISOString(),
      metadata,
    };
  }
}