import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggingExceptionFilter } from './logging-exception.filter';

describe('LoggingExceptionFilter', () => {
  let filter: LoggingExceptionFilter;
  let mockResponse: jest.Mocked<Response>;
  let mockRequest: jest.Mocked<Request>;
  let mockArgumentsHost: jest.Mocked<ArgumentsHost>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingExceptionFilter],
    }).compile();

    filter = module.get<LoggingExceptionFilter>(LoggingExceptionFilter);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any;

    mockRequest = {
      url: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn(),
    } as any;

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('非 HttpException: 响应体不含 stack 且不含原始 message, 固定返回服务器内部错误', () => {
    const exception = new Error('database connection failed for user root at 10.0.0.1');
    exception.stack = 'Error: database connection failed\n    at /app/src/db/db.service.ts:42:15';

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = (mockResponse.json as unknown as jest.Mock).mock.calls[0][0];
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain('database connection failed');
    expect(bodyStr).not.toContain('stack');
    expect(bodyStr).not.toContain('db.service.ts');
    expect(body.message).toBe('服务器内部错误');
    expect(body.details).toBeUndefined();
  });

  it('HttpException: 保留业务 message 不被改写', () => {
    const exception = new HttpException('用户名或密码错误', HttpStatus.UNAUTHORIZED);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.UNAUTHORIZED,
        message: '用户名或密码错误',
      }),
    );
  });

  it('非 HttpException: 返回 500 状态码', () => {
    filter.catch(new Error('boom'), mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: '服务器内部错误',
      }),
    );
  });
});
