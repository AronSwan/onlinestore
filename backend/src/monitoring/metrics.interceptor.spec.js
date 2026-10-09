"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const metrics_interceptor_1 = require("./metrics.interceptor");
const monitoring_service_1 = require("./monitoring.service");
const rxjs_1 = require("rxjs");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('MetricsInterceptor', () => {
    let interceptor;
    let monitoringService;
    let mockRequest;
    let mockResponse;
    let mockContext;
    let mockCallHandler;
    let execIntercept;
    (0, globals_1.beforeEach)(async () => {
        const mockMonitoringService = {
            incrementActiveConnections: globals_1.jest.fn(),
            decrementActiveConnections: globals_1.jest.fn(),
            recordApiCall: globals_1.jest.fn(),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                metrics_interceptor_1.MetricsInterceptor,
                {
                    provide: monitoring_service_1.MonitoringService,
                    useValue: mockMonitoringService,
                },
            ],
        }).compile();
        interceptor = module.get(metrics_interceptor_1.MetricsInterceptor);
        monitoringService = mockMonitoringService;
        mockRequest = {
            url: '/api/test',
            method: 'GET',
            ip: '127.0.0.1',
        };
        mockResponse = {
            statusCode: 200,
        };
        mockContext = {
            switchToHttp: globals_1.jest.fn().mockReturnValue({
                getRequest: () => mockRequest,
                getResponse: () => mockResponse,
            }),
        };
        mockCallHandler = {
            handle: () => (0, rxjs_1.of)({}),
        };
        execIntercept = () => {
            const obs = interceptor.intercept(mockContext, mockCallHandler);
            if (obs && typeof obs.subscribe === 'function') {
                obs.subscribe({ next: () => { }, error: () => { } });
            }
        };
    });
    (0, globals_1.it)('should be defined', () => {
        (0, globals_1.expect)(interceptor).toBeDefined();
    });
    (0, globals_1.describe)('intercept', () => {
        (0, globals_1.beforeEach)(() => {
            globals_1.jest.spyOn(Date, 'now').mockReturnValue(1609459200000);
        });
        (0, globals_1.it)('should increment active connections on request start', () => {
            execIntercept();
            (0, globals_1.expect)(monitoringService.incrementActiveConnections).toHaveBeenCalled();
        });
        (0, globals_1.it)('should decrement active connections on request completion', done => {
            execIntercept();
            setTimeout(() => {
                (0, globals_1.expect)(monitoringService.decrementActiveConnections).toHaveBeenCalled();
                done();
            }, 0);
        });
        (0, globals_1.it)('should record API call metrics on successful response', done => {
            execIntercept();
            setTimeout(() => {
                (0, globals_1.expect)(monitoringService.recordApiCall).toHaveBeenCalledWith('GET', '/api/test', 200, globals_1.expect.any(Number));
                done();
            }, 0);
        });
        (0, globals_1.it)('should record API call metrics on error response', done => {
            mockResponse.statusCode = 404;
            mockCallHandler.handle = () => new rxjs_1.Observable(subscriber => {
                subscriber.error(new Error('Not found'));
            });
            execIntercept();
            setTimeout(() => {
                (0, globals_1.expect)(monitoringService.recordApiCall).toHaveBeenCalledWith('GET', '/api/test', 404, globals_1.expect.any(Number));
                done();
            }, 0);
        });
        (0, globals_1.it)('should calculate request duration correctly', done => {
            const mockDateNow = globals_1.jest
                .spyOn(Date, 'now')
                .mockReturnValueOnce(1609459200000)
                .mockReturnValueOnce(1609459200200);
            execIntercept();
            setTimeout(() => {
                (0, globals_1.expect)(monitoringService.recordApiCall).toHaveBeenCalledWith('GET', '/api/test', 200, 200);
                mockDateNow.mockRestore();
                done();
            }, 0);
        });
        (0, globals_1.it)('should handle different HTTP methods', done => {
            const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
            let completed = 0;
            methods.forEach(method => {
                mockRequest.method = method;
                execIntercept();
                setTimeout(() => {
                    (0, globals_1.expect)(monitoringService.recordApiCall).toHaveBeenCalledWith(method, '/api/test', 200, globals_1.expect.any(Number));
                    completed++;
                    if (completed === methods.length) {
                        done();
                    }
                }, 0);
            });
        });
        (0, globals_1.it)('should handle different status codes', done => {
            const statusCodes = [200, 201, 204, 400, 401, 403, 404, 500, 502, 503];
            let completed = 0;
            statusCodes.forEach(statusCode => {
                mockResponse.statusCode = statusCode;
                execIntercept();
                setTimeout(() => {
                    (0, globals_1.expect)(monitoringService.recordApiCall).toHaveBeenCalledWith('GET', '/api/test', statusCode, globals_1.expect.any(Number));
                    completed++;
                    if (completed === statusCodes.length) {
                        done();
                    }
                }, 0);
            });
        });
        (0, globals_1.it)('should handle different request paths', done => {
            const paths = ['/api/users', '/api/products', '/api/orders', '/health'];
            let completed = 0;
            paths.forEach(path => {
                mockRequest.url = path;
                execIntercept();
                setTimeout(() => {
                    (0, globals_1.expect)(monitoringService.recordApiCall).toHaveBeenCalledWith('GET', path, 200, globals_1.expect.any(Number));
                    completed++;
                    if (completed === paths.length) {
                        done();
                    }
                }, 0);
            });
        });
        (0, globals_1.it)('should handle concurrent requests', done => {
            const concurrentRequests = 5;
            const promises = [];
            for (let i = 0; i < concurrentRequests; i++) {
                const independentMockCallHandler = {
                    handle: () => (0, rxjs_1.of)({}),
                };
                const observable = interceptor.intercept(mockContext, independentMockCallHandler);
                const promise = new Promise((resolve, reject) => {
                    observable.subscribe({
                        next: () => resolve(),
                        error: (err) => reject(err),
                        complete: () => resolve()
                    });
                });
                promises.push(promise);
            }
            (0, globals_1.expect)(monitoringService.incrementActiveConnections).toHaveBeenCalledTimes(concurrentRequests);
            const timeout = setTimeout(() => {
                done(new Error(`测试超时，已完成 ${promises.length}/${concurrentRequests} 个请求`));
            }, 5000);
            Promise.all(promises)
                .then(() => {
                clearTimeout(timeout);
                (0, globals_1.expect)(monitoringService.decrementActiveConnections).toHaveBeenCalledTimes(concurrentRequests);
                (0, globals_1.expect)(monitoringService.recordApiCall).toHaveBeenCalledTimes(concurrentRequests);
                done();
            })
                .catch((error) => {
                clearTimeout(timeout);
                done(error);
            });
        });
    });
});
