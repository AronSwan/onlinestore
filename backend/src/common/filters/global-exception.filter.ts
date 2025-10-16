import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { EnhancedBusinessException, ErrorContext } from '../exceptions/enhanced-business.exception';
import { ERROR_CODES } from '../constants/error-codes';

/**
 * 增强版全局异常过滤器
 * 支持统一错误码、结构化错误信息和详细的错误日志记录
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 构建错误上下文
    const errorContext: ErrorContext = {
      requestId: (request as any).requestId,
      traceId: (request as any).traceId,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
      userId: (request as any).user?.id,
    };

    let errorResponse: any;
    let httpStatus: number;
    let logLevel: 'error' | 'warn' = 'error';

    if (exception instanceof EnhancedBusinessException) {
      // 处理增强业务异常
      httpStatus = exception.getStatus();
      errorResponse = exception.toClientResponse();

      // 业务异常通常记录为警告级别
      logLevel = 'warn';

      this.logStructuredError(exception, errorContext, logLevel);
    } else if (exception instanceof HttpException) {
      // 处理标准HTTP异常
      httpStatus = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        errorResponse = {
          success: false,
          errorCode: this.mapHttpStatusToErrorCode(httpStatus),
          category: this.getCategoryFromHttpStatus(httpStatus),
          message: (exceptionResponse as any).message || exception.message,
          details: (exceptionResponse as any).details,
          timestamp: errorContext.timestamp,
          requestId: errorContext.requestId,
        };
      } else {
        errorResponse = {
          success: false,
          errorCode: this.mapHttpStatusToErrorCode(httpStatus),
          category: this.getCategoryFromHttpStatus(httpStatus),
          message: typeof exceptionResponse === 'string' ? exceptionResponse : exception.message,
          timestamp: errorContext.timestamp,
          requestId: errorContext.requestId,
        };
      }

      this.logHttpException(exception, errorContext, httpStatus >= 500 ? 'error' : 'warn');
    } else {
      // 处理未知异常
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

      // 创建增强业务异常来处理未知错误
      const enhancedException = new EnhancedBusinessException(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        '服务器内部错误',
        undefined,
        errorContext,
        exception instanceof Error ? exception : new Error(String(exception)),
        true,
      );

      errorResponse = enhancedException.toClientResponse();
      this.logStructuredError(enhancedException, errorContext, 'error');
    }

    // 发送响应
    response.status(httpStatus).json(errorResponse);
  }

  /**
   * 记录结构化错误日志
   */
  private logStructuredError(
    exception: EnhancedBusinessException,
    context: ErrorContext,
    level: 'error' | 'warn',
  ): void {
    const logData = {
      errorCode: exception.errorCode,
      category: exception.category,
      message: exception.message,
      details: exception.details,
      context,
      retryable: exception.retryable,
      stack: exception.stack,
      cause: exception.cause?.message,
    };

    if (level === 'error') {
      this.logger.error(`${context.method} ${context.path} - ${exception.errorCode}`, logData);
    } else {
      this.logger.warn(`${context.method} ${context.path} - ${exception.errorCode}`, logData);
    }
  }

  /**
   * 记录HTTP异常日志
   */
  private logHttpException(
    exception: HttpException,
    context: ErrorContext,
    level: 'error' | 'warn',
  ): void {
    const logData = {
      statusCode: exception.getStatus(),
      message: exception.message,
      response: exception.getResponse(),
      context,
      stack: exception.stack,
    };

    if (level === 'error') {
      this.logger.error(
        `${context.method} ${context.path} - HTTP ${exception.getStatus()}`,
        logData,
      );
    } else {
      this.logger.warn(
        `${context.method} ${context.path} - HTTP ${exception.getStatus()}`,
        logData,
      );
    }
  }

  /**
   * 将HTTP状态码映射到错误码
   */
  private mapHttpStatusToErrorCode(httpStatus: number): string {
    switch (httpStatus) {
      case 400:
        return ERROR_CODES.VALIDATION_ERROR;
      case 401:
        return ERROR_CODES.UNAUTHORIZED;
      case 403:
        return ERROR_CODES.FORBIDDEN;
      case 404:
        return ERROR_CODES.USER_NOT_FOUND; // 默认为用户不存在，具体业务可以覆盖
      case 409:
        return ERROR_CODES.USER_ALREADY_EXISTS; // 默认为用户已存在，具体业务可以覆盖
      case 429:
        return ERROR_CODES.RATE_LIMIT_EXCEEDED;
      case 500:
        return ERROR_CODES.INTERNAL_SERVER_ERROR;
      case 502:
        return ERROR_CODES.EXTERNAL_SERVICE_ERROR;
      case 503:
        return ERROR_CODES.SERVICE_UNAVAILABLE;
      case 504:
        return ERROR_CODES.TIMEOUT_ERROR;
      default:
        return ERROR_CODES.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * 根据HTTP状态码获取错误分类
   */
  private getCategoryFromHttpStatus(httpStatus: number): string {
    if (httpStatus >= 400 && httpStatus < 500) {
      if (httpStatus === 401) return 'authentication';
      if (httpStatus === 403) return 'authorization';
      if (httpStatus === 429) return 'rate_limit';
      // 404和409状态码属于业务逻辑错误
      if (httpStatus === 404 || httpStatus === 409) return 'business';
      return 'validation';
    } else if (httpStatus >= 500) {
      if (httpStatus === 502 || httpStatus === 503) return 'external';
      return 'system';
    }
    return 'unknown';
  }
}
