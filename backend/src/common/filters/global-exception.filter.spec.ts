import { Test, TestingModule } from '@nestjs/testing';
import { GlobalExceptionFilter } from './global-exception.filter';
import { EnhancedBusinessException } from '../exceptions/enhanced-business.exception';
import { ERROR_CODES } from '../constants/error-codes';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: jest.Mocked<Response>;
  let mockRequest: jest.Mocked<Request>;
  let mockArgumentsHost: jest.Mocked<ArgumentsHost>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlobalExceptionFilter],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any;

    mockRequest = {
      url: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn(),
      user: { id: 'user-123' },
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

  describe('catch', () => {
    beforeEach(() => {
      // Mock Date.now to return a consistent timestamp
      const mockNow = new Date('2021-01-01T00:00:00.000Z');
      jest.spyOn(Date, 'now').mockReturnValue(mockNow.getTime());
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockNow.toISOString());
    });

    it('should handle EnhancedBusinessException', () => {
      const exception = new EnhancedBusinessException(
        ERROR_CODES.USER_NOT_FOUND,
        'User not found',
        [{ field: 'userId', value: '123' }],
        { requestId: 'req-123' },
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: ERROR_CODES.USER_NOT_FOUND,
          category: 'business',
          message: 'User not found',
          details: [{ field: 'userId', value: '123' }],
        }),
      );
    });

    it('should handle HttpException with object response', () => {
      const exception = new HttpException(
        { message: 'Validation failed', details: [{ field: 'email', value: 'invalid' }] },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: ERROR_CODES.VALIDATION_ERROR,
          category: 'validation',
          message: 'Validation failed',
          details: [{ field: 'email', value: 'invalid' }],
        }),
      );
    });

    it('should handle HttpException with string response', () => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: ERROR_CODES.USER_NOT_FOUND,
          message: 'Not found',
        }),
      );
    });

    it('should handle unknown exceptions', () => {
      const exception = new Error('Unknown error');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR,
          category: 'system',
          message: '服务器内部错误',
        }),
      );
    });

    it('should map HTTP status codes to error codes correctly', () => {
      const testCases = [
        { status: HttpStatus.BAD_REQUEST, expectedCode: ERROR_CODES.VALIDATION_ERROR },
        { status: HttpStatus.UNAUTHORIZED, expectedCode: ERROR_CODES.UNAUTHORIZED },
        { status: HttpStatus.FORBIDDEN, expectedCode: ERROR_CODES.FORBIDDEN },
        { status: HttpStatus.NOT_FOUND, expectedCode: ERROR_CODES.USER_NOT_FOUND },
        { status: HttpStatus.CONFLICT, expectedCode: ERROR_CODES.USER_ALREADY_EXISTS },
        { status: HttpStatus.TOO_MANY_REQUESTS, expectedCode: ERROR_CODES.RATE_LIMIT_EXCEEDED },
        { status: HttpStatus.INTERNAL_SERVER_ERROR, expectedCode: ERROR_CODES.INTERNAL_SERVER_ERROR },
        { status: HttpStatus.BAD_GATEWAY, expectedCode: ERROR_CODES.EXTERNAL_SERVICE_ERROR },
        { status: HttpStatus.SERVICE_UNAVAILABLE, expectedCode: ERROR_CODES.SERVICE_UNAVAILABLE },
        { status: HttpStatus.GATEWAY_TIMEOUT, expectedCode: ERROR_CODES.TIMEOUT_ERROR },
      ];

      testCases.forEach(({ status, expectedCode }) => {
        const exception = new HttpException('Test error', status);
        filter.catch(exception, mockArgumentsHost);
        expect(mockResponse.status).toHaveBeenCalledWith(status);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            errorCode: expectedCode,
          }),
        );
      });
    });

    it('should categorize errors correctly', () => {
      const testCases = [
        { status: HttpStatus.NOT_FOUND, expectedCategory: 'business' },
        { status: HttpStatus.CONFLICT, expectedCategory: 'business' },
      ];

      testCases.forEach(({ status, expectedCategory }) => {
        const exception = new HttpException('Test error', status);
        filter.catch(exception, mockArgumentsHost);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            category: expectedCategory,
          }),
        );
      });
    });
  });
});