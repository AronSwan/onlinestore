import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { extractErrorInfo } from '../utils/logging-error.util';

@Catch()
export class LoggingExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(LoggingExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || (exceptionResponse as any).error || message;
        details = (exceptionResponse as any).details || null;
      }
    } else if (exception instanceof Error) {
      // S4 修复: 非 HttpException 的内部错误不向客户端泄漏原始 message/stack,
      // 客户端固定文案; 原始细节仅保留在服务端 logger.error 中
      message = '服务器内部错误';
      details = null;
    }

    const errorInfo = extractErrorInfo(exception);
    // 记录错误日志(服务端保留原始 message 与 stack)
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - Message: ${errorInfo.message}`,
      errorInfo.stack,
    );

    // 构建错误响应
    const errorResponse = {
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(details && { details }),
    };

    response.status(status).json(errorResponse);
  }
}
