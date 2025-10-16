import { Test, TestingModule } from '@nestjs/testing';
import { MetricsInterceptor } from './metrics.interceptor';
import { MonitoringService } from './monitoring.service';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { Request, Response } from 'express';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;
  let monitoringService: MonitoringService;
  let mockRequest: jest.Mocked<Request>;
  let mockResponse: jest.Mocked<Response>;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let execIntercept: () => void;

  beforeEach(async () => {
    const mockMonitoringService = {
      incrementActiveConnections: jest.fn(),
      decrementActiveConnections: jest.fn(),
      recordApiCall: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsInterceptor,
        {
          provide: MonitoringService,
          useValue: mockMonitoringService,
        },
      ],
    }).compile();

    interceptor = module.get<MetricsInterceptor>(MetricsInterceptor);
    monitoringService = mockMonitoringService as any;

    mockRequest = {
      url: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
    } as any;

    mockResponse = {
      statusCode: 200,
    } as any;

    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as any;

    mockCallHandler = {
      handle: () => of({}),
    } as CallHandler;

    // 订阅触发：辅助函数，执行一次拦截并订阅以触发 tap 的 next/error
    execIntercept = () => {
      const obs = interceptor.intercept(mockContext, mockCallHandler) as any;
      if (obs && typeof obs.subscribe === 'function') {
        obs.subscribe({ next: () => {}, error: () => {} });
      }
    };
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1609459200000); // 2021-01-01
    });

    it('should increment active connections on request start', () => {
      execIntercept();

      expect(monitoringService.incrementActiveConnections).toHaveBeenCalled();
    });

    it('should decrement active connections on request completion', done => {
      execIntercept();

      // Wait for the observable to complete
      setTimeout(() => {
        expect(monitoringService.decrementActiveConnections).toHaveBeenCalled();
        done();
      }, 0);
    });

    it('should record API call metrics on successful response', done => {
      execIntercept();

      // Wait for the observable to complete
      setTimeout(() => {
        expect(monitoringService.recordApiCall).toHaveBeenCalledWith(
          'GET',
          '/api/test',
          200,
          expect.any(Number), // Duration will be calculated
        );
        done();
      }, 0);
    });

    it('should record API call metrics on error response', done => {
      mockResponse.statusCode = 404;
      mockCallHandler.handle = () =>
        new Observable(subscriber => {
          subscriber.error(new Error('Not found'));
        });

      execIntercept();

      // Wait for the observable to error
      setTimeout(() => {
        expect(monitoringService.recordApiCall).toHaveBeenCalledWith(
          'GET',
          '/api/test',
          404,
          expect.any(Number), // Duration will be calculated
        );
        done();
      }, 0);
    });

    it('should calculate request duration correctly', done => {
      // Mock Date.now to return different values
      const mockDateNow = jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(1609459200000) // Start time
        .mockReturnValueOnce(1609459200200); // End time (200ms later)

      execIntercept();

      // Wait for the observable to complete
      setTimeout(() => {
        expect(monitoringService.recordApiCall).toHaveBeenCalledWith(
          'GET',
          '/api/test',
          200,
          200, // Duration should be 200ms
        );
        mockDateNow.mockRestore();
        done();
      }, 0);
    });

    it('should handle different HTTP methods', done => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      let completed = 0;

      methods.forEach(method => {
        mockRequest.method = method;
        execIntercept();

        setTimeout(() => {
          expect(monitoringService.recordApiCall).toHaveBeenCalledWith(
            method,
            '/api/test',
            200,
            expect.any(Number),
          );
          completed++;
          if (completed === methods.length) {
            done();
          }
        }, 0);
      });
    });

    it('should handle different status codes', done => {
      const statusCodes = [200, 201, 204, 400, 401, 403, 404, 500, 502, 503];
      let completed = 0;

      statusCodes.forEach(statusCode => {
        mockResponse.statusCode = statusCode;
        execIntercept();

        setTimeout(() => {
          expect(monitoringService.recordApiCall).toHaveBeenCalledWith(
            'GET',
            '/api/test',
            statusCode,
            expect.any(Number),
          );
          completed++;
          if (completed === statusCodes.length) {
            done();
          }
        }, 0);
      });
    });

    it('should handle different request paths', done => {
      const paths = ['/api/users', '/api/products', '/api/orders', '/health'];
      let completed = 0;

      paths.forEach(path => {
        mockRequest.url = path;
        execIntercept();

        setTimeout(() => {
          expect(monitoringService.recordApiCall).toHaveBeenCalledWith(
            'GET',
            path,
            200,
            expect.any(Number),
          );
          completed++;
          if (completed === paths.length) {
            done();
          }
        }, 0);
      });
    });

    it('should handle concurrent requests', done => {
      const concurrentRequests = 5;

      // 为每个请求创建独立的mockCallHandler，避免共享状态
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        const independentMockCallHandler = {
          handle: () => of({}),
        } as CallHandler;
        
        const observable = interceptor.intercept(mockContext, independentMockCallHandler);
        
        // 将Observable转换为Promise
        const promise = new Promise<void>((resolve, reject) => {
          observable.subscribe({
            next: () => resolve(),
            error: (err) => reject(err),
            complete: () => resolve()
          });
        });
        
        promises.push(promise);
      }

      // 检查increment调用（应该在拦截时立即调用）
      expect(monitoringService.incrementActiveConnections).toHaveBeenCalledTimes(
        concurrentRequests,
      );

      // 添加超时保护
      const timeout = setTimeout(() => {
        done(new Error(`测试超时，已完成 ${promises.length}/${concurrentRequests} 个请求`));
      }, 5000);

      // 等待所有Observable完成
      Promise.all(promises)
        .then(() => {
          // 清理超时定时器
          clearTimeout(timeout);
          
          // 所有请求完成后进行断言
          expect(monitoringService.decrementActiveConnections).toHaveBeenCalledTimes(
            concurrentRequests,
          );
          expect(monitoringService.recordApiCall).toHaveBeenCalledTimes(concurrentRequests);
          done();
        })
        .catch((error) => {
          // 清理超时定时器
          clearTimeout(timeout);
          done(error);
        });
    });
  });
});
