import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private configService: ConfigService) {}

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let errorResponse: any;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      errorResponse = {
        success: false,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        message: (exceptionResponse as any).message || exception.message,
        details: (exceptionResponse as any).details || null,
        ...(this.configService.get('NODE_ENV') === 'development' && {
          stack: exception.stack,
        }),
      };
    } else {
      errorResponse = {
        success: false,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        message: typeof exceptionResponse === 'string' ? exceptionResponse : exception.message,
        ...(this.configService.get('NODE_ENV') === 'development' && {
          stack: exception.stack,
        }),
      };
    }

    // 记录错误日志
    this.logger.error(
      `${request.method} ${request.url} - ${status}`,
      JSON.stringify(errorResponse),
    );

    response.status(status).json(errorResponse);
  }
}
