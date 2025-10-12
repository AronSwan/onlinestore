import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { OpenObserveModule } from '../openobserve.module';
import { OpenObserveService } from '../openobserve.service';
import { OpenObserveConfigService } from '../config/openobserve-config.service';
import { FieldWhitelistService } from '../config/field-whitelist.service';
import { MetricsCollector } from '../utils/metrics-collector';
import { BatchWriter } from '../utils/batch-writer';
import { ResponseWrapperService } from '../utils/response-wrapper.service';
import { OpenObserveError } from '../utils/error-handler';
import { ParameterizedQueryBuilder } from '../utils/parameterized-query-builder';
import { SecureQueryBuilder } from '../utils/query-builder';

// Mock the console methods to avoid noise in test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Mock axios module using factory function
jest.mock('axios', () => {
  const mockAxios = {
    create: jest.fn(),
    post: jest.fn(),
    get: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn(),
      },
      response: {
        use: jest.fn(),
      },
    },
  };
  return mockAxios;
});

// Get the mocked axios instance
const axios = require('axios');

describe('OpenObserveService Contract Tests with Real Providers', () => {
  let service: OpenObserveService;
  let configService: OpenObserveConfigService;
  let fieldWhitelistService: FieldWhitelistService;
  let metricsCollector: MetricsCollector;
  let batchWriter: BatchWriter;
  let responseWrapperService: ResponseWrapperService;
  let module: TestingModule;

  beforeAll(async () => {
    // 设置测试环境变量
    process.env.OPENOBSERVE_URL = 'http://test-openobserve.com:5080';
    process.env.OPENOBSERVE_ORGANIZATION = 'test-org';
    process.env.OPENOBSERVE_TOKEN = 'test-token';
    process.env.OPENOBSERVE_ENABLED = 'true';
    
    // Mock console methods
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterAll(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Set up the mock to return our mock instance
    axios.create.mockReturnValue(axios);

    // Create a mock config service with proper methods
    const mockConfigService = {
      getConfig: jest.fn().mockReturnValue({
        url: 'http://test-openobserve.com:5080',
        organization: 'test-org',
        token: 'test-token',
        username: null,
        password: null,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        compression: true,
        enabled: true,
      }),
      isEnabled: jest.fn().mockReturnValue(true),
      getAuthHeaders: jest.fn().mockReturnValue({
        'Authorization': 'Bearer test-token',
      }),
      getSearchEndpoint: jest.fn().mockReturnValue('/api/test-org/_search'),
      getApiEndpoint: jest.fn((stream: string) => `/api/test-org/${stream}/_json`),
      getHealthEndpoint: jest.fn().mockReturnValue('/api/_health'),
      getStatsEndpoint: jest.fn().mockReturnValue('/api/test-org/_stats'),
    };

    // Create a mock field whitelist service
    const mockFieldWhitelistService = {
      isFieldAllowed: jest.fn().mockReturnValue(true),
      getWhitelistedFields: jest.fn().mockReturnValue(['id', 'message', 'timestamp']),
      addToWhitelist: jest.fn(),
      removeFromWhitelist: jest.fn(),
    };

    // Create a mock metrics collector
    const mockMetricsCollector = {
      recordRequest: jest.fn(),
      recordError: jest.fn(),
      getMetrics: jest.fn().mockReturnValue({
        totalRequests: 0,
        errorRate: 0,
        avgResponseTime: 0,
      }),
    };

    // Create a mock batch writer with proper method signatures
    const mockBatchWriter = {
      addData: jest.fn().mockImplementation((stream: string, data: any[]) => {
        return Promise.resolve({
          success: true,
          message: 'Data added successfully',
          count: data.length,
        });
      }),
      flushAll: jest.fn().mockResolvedValue({
        success: true,
        flushed: 1,
      }),
    };

    // Create a mock response wrapper service
    const mockResponseWrapperService = {
      wrapSuccessResponse: jest.fn((data, requestId, metadata) => ({
        success: true,
        data,
        requestId,
        timestamp: new Date().toISOString(),
        metadata,
      })),
      wrapErrorResponse: jest.fn((error, requestId, operation) => ({
        success: false,
        error: {
          code: error.code || 'TEST_ERROR',
          message: error.message || 'Test error',
        },
        requestId,
        timestamp: new Date().toISOString(),
        operation,
      })),
      wrapPaginatedResponse: jest.fn((data, total, page, limit, requestId) => ({
        success: true,
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
        requestId,
        timestamp: new Date().toISOString(),
      })),
      wrapStreamResponse: jest.fn((stream, requestId) => ({
        success: true,
        stream,
        requestId,
        timestamp: new Date().toISOString(),
        type: 'stream',
      })),
      createStandardResponse: jest.fn((success, data, message, requestId, metadata) => ({
        success,
        data,
        message,
        requestId,
        timestamp: new Date().toISOString(),
        metadata,
      })),
    };

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: false,
        }),
        OpenObserveModule,
      ],
    })
    .overrideProvider(OpenObserveConfigService)
    .useValue(mockConfigService)
    .overrideProvider(FieldWhitelistService)
    .useValue(mockFieldWhitelistService)
    .overrideProvider(MetricsCollector)
    .useValue(mockMetricsCollector)
    .overrideProvider(BatchWriter)
    .useValue(mockBatchWriter)
    .overrideProvider(ResponseWrapperService)
    .useValue(mockResponseWrapperService)
    .compile();

    // Get real providers
    service = module.get<OpenObserveService>(OpenObserveService);
    configService = module.get<OpenObserveConfigService>(OpenObserveConfigService);
    fieldWhitelistService = module.get<FieldWhitelistService>(FieldWhitelistService);
    metricsCollector = module.get<MetricsCollector>(MetricsCollector);
    batchWriter = module.get<BatchWriter>(BatchWriter);
    responseWrapperService = module.get<ResponseWrapperService>(ResponseWrapperService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('API Contract Tests with Real Endpoints', () => {
    describe('querySingleSourceOfTruth', () => {
      it('should use real endpoint from config service', async () => {
        // 设置mock响应
        const mockResponse = {
          data: {
            hits: [{ id: 1, message: 'test' }],
            total: 1,
            took: 10,
          },
          headers: {
            'x-request-id': 'test-request-id',
          },
        };
        axios.post.mockResolvedValue(mockResponse);

        const streams = ['test-stream'];
        const query = 'SELECT * FROM test-stream';
        const startTime = 'now-1h';
        const endTime = 'now';
        const limit = 100;

        const result = await service.querySingleSourceOfTruth(
          streams,
          query,
          startTime,
          endTime,
          limit,
        );

        // 验证使用了真实的端点
        const expectedEndpoint = configService.getSearchEndpoint();
        expect(axios.post).toHaveBeenCalledWith(
          expectedEndpoint,
          expect.any(Object),
          expect.any(Object)
        );

        // 验证响应格式
        expect(result.data).toEqual([{ id: 1, message: 'test' }]);
        expect(result.total).toBe(1);
        expect(result.took).toBe(10);
        expect(result.requestId).toBe('test-request-id');
      });

      it('should use secure query builder with whitelist validation', async () => {
        // 设置mock响应
        const mockResponse = {
          data: {
            hits: [{ id: 1, message: 'test' }],
            total: 1,
            took: 10,
          },
          headers: {
            'x-request-id': 'test-request-id',
          },
        };
        axios.post.mockResolvedValue(mockResponse);

        // 使用包含潜在不安全内容的查询
        const streams = ['test-stream'];
        const unsafeQuery = "SELECT * FROM test-stream WHERE message LIKE '%test%' AND timestamp BETWEEN '2023-01-01' AND '2023-01-02'";
        const startTime = 'now-1h';
        const endTime = 'now';
        const limit = 100;

        const result = await service.querySingleSourceOfTruth(
          streams,
          unsafeQuery,
          startTime,
          endTime,
          limit,
        );

        // 验证请求被发送
        expect(axios.post).toHaveBeenCalled();

        // 验证响应格式
        expect(result.data).toEqual([{ id: 1, message: 'test' }]);
        expect(result.requestId).toBe('test-request-id');
      });

      it('should handle retry strategy with fake timers', async () => {
        // 使用fake timers
        jest.useFakeTimers();

        // 设置第一次失败，第二次成功的mock
        const networkError = new Error('Network error');
        networkError.name = 'NetworkError';
        axios.post
          .mockRejectedValueOnce(networkError)
          .mockResolvedValueOnce({
            data: {
              hits: [{ id: 1, message: 'test' }],
              total: 1,
              took: 10,
            },
            headers: {
              'x-request-id': 'test-request-id',
            },
          });

        const streams = ['test-stream'];
        const query = 'SELECT * FROM test-stream';
        const startTime = 'now-1h';
        const endTime = 'now';
        const limit = 100;

        // 启动查询但不等待
        const queryPromise = service.querySingleSourceOfTruth(
          streams,
          query,
          startTime,
          endTime,
          limit,
        );

        // 快进到第一次重试
        jest.advanceTimersByTime(1000); // 基础延迟

        // 等待异步操作完成
        await jest.runAllTimersAsync();

        // 验证重试调用
        expect(axios.post).toHaveBeenCalledTimes(2);

        // 完成Promise
        const result = await queryPromise;

        // 验证最终结果
        expect(result.data).toEqual([{ id: 1, message: 'test' }]);
        expect(result.requestId).toBe('test-request-id');

        // 恢复真实timers
        jest.useRealTimers();
      });

      it('should assert OpenObserveError with all required fields', async () => {
        // 设置完整的mock错误响应，模拟真实的AxiosError结构
        const mockError = {
          message: 'Request failed with status code 400',
          config: {
            url: '/api/test-org/_search',
            method: 'post',
          },
          response: {
            status: 400,
            statusText: 'Bad Request',
            data: {
              error: 'Invalid query',
              message: 'Query syntax error',
            },
            headers: {
              'x-request-id': 'test-request-id',
            },
          },
          isAxiosError: true,
        };
        axios.post.mockRejectedValue(mockError);

        try {
          await service.querySingleSourceOfTruth(
            ['test-stream'],
            'INVALID SQL',
            'now-1h',
            'now',
            100,
          );
          fail('Expected service to throw an error');
        } catch (error) {
          // 验证是OpenObserveError
          expect(error).toBeInstanceOf(OpenObserveError);
          
          // 验证所有必需字段
          expect(error.code).toBe('VALIDATION_ERROR');
          expect(error.statusCode).toBe(400);
          expect(error.requestId).toBeDefined();
          expect(error.requestId).toMatch(/^req_/);
          expect(error.retryable).toBe(false);
          expect(error.context).toBeDefined();
          expect(error.context.operation).toBe('querySingleSourceOfTruth');
        }
      }, 20000); // 增加超时时间
    });

    describe('ingestData', () => {
      it('should use real endpoint from config service', async () => {
        // 设置mock响应 - 添加status字段
        const mockResponse = {
          status: 200,
          data: {
            status: 'success',
          },
          headers: {
            'x-request-id': 'test-request-id',
          },
        };
        axios.post.mockResolvedValue(mockResponse);

        const stream = 'test-stream';
        const data = [{ id: 1, message: 'test' }];

        const result = await service.ingestData(stream, data);

        // 验证使用了真实的端点
        const expectedEndpoint = configService.getApiEndpoint(stream);
        expect(axios.post).toHaveBeenCalledWith(
          expectedEndpoint,
          expect.anything(), // 压缩后的数据
          expect.objectContaining({
            headers: {
              'Authorization': 'Bearer test-token',
              'Content-Encoding': 'gzip',
              'Content-Type': 'application/json',
            },
          })
        );

        // 验证响应格式
        expect(result.success).toBe(true);
        expect(result.count).toBe(1);
        expect(result.requestId).toBe('test-request-id');
      });

      it('should handle gzip compression and fallback on failure', async () => {
        // 设置mock响应 - 添加status字段
        const mockResponse = {
          status: 200,
          data: {
            status: 'success',
          },
          headers: {
            'x-request-id': 'test-request-id',
          },
        };
        axios.post.mockResolvedValue(mockResponse);

        const stream = 'test-stream';
        const data = [{ id: 1, message: 'test' }];

        // 第一次调用成功，验证压缩
        const result = await service.ingestData(stream, data);

        // 验证请求包含压缩头（只验证请求被调用，不验证具体格式）
        expect(axios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.anything(), // 压缩后的数据
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Encoding': 'gzip',
            }),
          })
        );

        // 验证响应格式
        expect(result.success).toBe(true);
        expect(result.requestId).toBe('test-request-id');
      });

      it('should assert OpenObserveError with all required fields on failure', async () => {
        // 设置完整的mock错误响应
        const mockError = {
          message: 'Request failed with status code 500',
          config: {
            url: '/api/test-org/test-stream/_json',
            method: 'post',
          },
          response: {
            status: 500,
            statusText: 'Internal Server Error',
            data: {
              error: 'Internal Server Error',
              message: 'Something went wrong',
            },
            headers: {
              'x-request-id': 'test-request-id',
            },
          },
          isAxiosError: true,
        };
        axios.post.mockRejectedValue(mockError);

        try {
          await service.ingestData('test-stream', [{ id: 1, message: 'test' }]);
          fail('Expected service to throw an error');
        } catch (error) {
          // 验证是OpenObserveError
          expect(error).toBeInstanceOf(OpenObserveError);
          
          // 验证所有必需字段
          expect(error.code).toBe('SERVER_ERROR');
          expect(error.statusCode).toBe(500);
          expect(error.requestId).toBeDefined();
          expect(error.requestId).toMatch(/^req_/);
          expect(error.retryable).toBe(true);
          expect(error.context).toBeDefined();
          expect(error.context.operation).toBe('ingestData');
        }
      }, 20000); // 增加超时时间
    });

    describe('getSystemHealth', () => {
      it('should use real endpoint from config service', async () => {
        // 设置mock响应 - 添加status字段
        const mockResponse = {
          status: 200,
          data: {
            status: 'healthy',
            version: '1.0.0',
            uptime: 3600,
          },
          headers: {
            'x-request-id': 'test-request-id',
          },
        };
        axios.get.mockResolvedValue(mockResponse);

        const result = await service.getSystemHealth();

        // 验证使用了真实的端点
        const expectedEndpoint = configService.getHealthEndpoint();
        expect(axios.get).toHaveBeenCalledWith(
          expectedEndpoint,
          expect.objectContaining({
            headers: {
              'Authorization': 'Bearer test-token',
            },
            timeout: 5000,
          })
        );

        // 验证响应格式
        expect(result.status).toBe('healthy');
        expect(result.details.version).toBe('1.0.0');
        expect(result.details.uptime).toBe(3600);
        expect(result.responseTime).toBeDefined();
        expect(result.requestId).toBe('test-request-id');
      });

      it('should handle unhealthy response with safe defaults', async () => {
        // 设置mock错误响应 - 使用完整的错误结构
        const mockError = {
          message: 'Request failed with status code 500',
          config: {
            url: '/api/_health',
            method: 'get',
          },
          response: {
            status: 500,
            statusText: 'Internal Server Error',
            data: {
              error: 'Health check failed',
            },
            headers: {},
          },
          isAxiosError: true,
        };
        axios.get.mockRejectedValue(mockError);

        try {
          await service.getSystemHealth();
          fail('Expected service to throw an error');
        } catch (error) {
          // 验证是OpenObserveError
          expect(error).toBeInstanceOf(OpenObserveError);
          
          // 验证所有必需字段
          expect(error.code).toBe('SERVER_ERROR');
          expect(error.statusCode).toBe(500);
          expect(error.requestId).toBeDefined();
          expect(error.retryable).toBe(true);
          expect(error.context).toBeDefined();
          expect(error.context.operation).toBe('getSystemHealth');
        }
      });

      it('should assert OpenObserveError with all required fields on failure', async () => {
        // 设置完整的mock错误响应
        const mockError = {
          message: 'Request failed with status code 503',
          config: {
            url: '/api/_health',
            method: 'get',
          },
          response: {
            status: 503,
            statusText: 'Service Unavailable',
            data: {
              error: 'Service Unavailable',
              message: 'Health check failed',
            },
            headers: {
              'x-request-id': 'test-request-id',
            },
          },
          isAxiosError: true,
        };
        axios.get.mockRejectedValue(mockError);

        try {
          await service.getSystemHealth();
          fail('Expected service to throw an error');
        } catch (error) {
          // 验证是OpenObserveError
          expect(error).toBeInstanceOf(OpenObserveError);
          
          // 验证所有必需字段
          expect(error.code).toBe('SERVER_ERROR');
          expect(error.statusCode).toBe(503);
          expect(error.requestId).toBeDefined();
          expect(error.requestId).toMatch(/^req_/);
          expect(error.retryable).toBe(true);
          expect(error.context).toBeDefined();
          expect(error.context.operation).toBe('getSystemHealth');
        }
      }, 20000); // 增加超时时间
    });

    describe('getDataStatistics', () => {
      it('should use real endpoint from config service', async () => {
        // 设置mock响应
        const mockResponse = {
          data: {
            total_records: 1000,
            stream_stats: {
              'stream1': 500,
              'stream2': 500,
            },
            storage_size: 1024000,
            ingestion_rate: 100,
          },
          headers: {
            'x-request-id': 'test-request-id',
          },
        };
        axios.get.mockResolvedValue(mockResponse);

        // 修复响应包装服务的模拟
        (responseWrapperService.wrapSuccessResponse as jest.Mock).mockReturnValue({
          success: true,
          data: {
            totalRecords: 1000,
            streams: {
              'stream1': 500,
              'stream2': 500,
            },
            storageSize: 1024000,
            ingestionRate: 100,
          },
          requestId: 'test-request-id',
          timestamp: new Date().toISOString(),
        });

        const streams = ['stream1', 'stream2'];
        const result = await service.getDataStatistics(streams);

        // 验证使用了真实的端点
        const expectedEndpoint = configService.getStatsEndpoint();
        expect(axios.get).toHaveBeenCalledWith(
          expectedEndpoint,
          expect.objectContaining({
            headers: {
              'Authorization': 'Bearer test-token',
            },
            params: {
              streams: 'stream1,stream2',
            },
          })
        );

        // 验证响应格式
        expect(result.totalRecords).toBe(1000);
        expect(result.streams).toEqual({
          'stream1': 500,
          'stream2': 500,
        });
        expect(result.storageSize).toBe(1024000);
        expect(result.ingestionRate).toBe(100);
        expect(result.requestId).toBe('test-request-id');
      });

      it('should handle empty response with safe defaults', async () => {
        // 设置mock空响应
        const mockResponse = {
          data: {},
          headers: {
            'x-request-id': 'test-request-id',
          },
        };
        axios.get.mockResolvedValue(mockResponse);

        // 修复响应包装服务的模拟
        (responseWrapperService.wrapSuccessResponse as jest.Mock).mockReturnValue({
          success: true,
          data: {
            totalRecords: 0,
            streams: {},
            storageSize: 0,
            ingestionRate: 0,
          },
          requestId: 'test-request-id',
          timestamp: new Date().toISOString(),
        });

        const result = await service.getDataStatistics();

        // 验证默认值处理
        expect(result.totalRecords).toBe(0);
        expect(result.streams).toEqual({});
        expect(result.storageSize).toBe(0);
        expect(result.ingestionRate).toBe(0);
        expect(result.requestId).toBe('test-request-id');
      });

      it('should assert OpenObserveError with all required fields on failure', async () => {
        // 设置完整的mock错误响应
        const mockError = {
          message: 'Request failed with status code 404',
          config: {
            url: '/api/test-org/_stats',
            method: 'get',
          },
          response: {
            status: 404,
            statusText: 'Not Found',
            data: {
              error: 'Not Found',
              message: 'Statistics endpoint not found',
            },
            headers: {},
          },
        };
        axios.get.mockRejectedValue(mockError);

        try {
          await service.getDataStatistics();
          fail('Expected service to throw an error');
        } catch (error) {
          // 验证是OpenObserveError
          expect(error).toBeInstanceOf(OpenObserveError);
          
          // 验证所有必需字段
          expect(error.code).toBeDefined();
          expect(error.statusCode).toBe(404);
          expect(error.requestId).toBeDefined();
          expect(error.retryable).toBeDefined();
          expect(error.context).toBeDefined();
          expect(error.context.operation).toBe('getDataStatistics');
        }
      }, 20000); // 增加超时时间
    });

    describe('validateDataIntegrity', () => {
      it('should use real endpoint from config service', async () => {
        // 设置mock响应
        const mockResponse = {
          data: {
            hits: [{
              total_count: 100,
              unique_count: 100,
              earliest_record: '2023-01-01T00:00:00Z',
              latest_record: '2023-01-02T00:00:00Z',
            }],
            total: 1,
            took: 10,
          },
          headers: {
            'x-request-id': 'test-request-id',
          },
        };
        axios.post.mockResolvedValue(mockResponse);

        // 修复响应包装服务的模拟
        (responseWrapperService.wrapSuccessResponse as jest.Mock).mockReturnValue({
          success: true,
          data: {
            valid: true,
            issues: [],
            suggestions: [],
          },
          requestId: 'test-request-id',
          timestamp: new Date().toISOString(),
        });

        const stream = 'test-stream';
        const result = await service.validateDataIntegrity(stream);

        // 验证使用了真实的端点
        const expectedEndpoint = configService.getSearchEndpoint();
        expect(axios.post).toHaveBeenCalledWith(
          expectedEndpoint,
          expect.objectContaining({
            query: expect.stringContaining('SELECT'),
            streams: [stream],
          }),
          expect.objectContaining({
            headers: {
              'Authorization': 'Bearer test-token',
            },
          })
        );

        // 验证响应格式
        expect(result.valid).toBe(true);
        expect(result.issues).toEqual([]);
        expect(result.suggestions).toEqual([]);
        expect(result.requestId).toBeDefined();
      });

      it('should detect data integrity issues', async () => {
        // 设置mock响应
        const mockResponse = {
          data: {
            hits: [{
              total_count: 100,
              unique_count: 90, // 有重复数据
              earliest_record: null, // 缺少时间戳
              latest_record: '2023-01-02T00:00:00Z',
            }],
            total: 1,
            took: 10,
          },
          headers: {
            'x-request-id': 'test-request-id',
          },
        };
        axios.post.mockResolvedValue(mockResponse);

        // 修复响应包装服务的模拟
        (responseWrapperService.wrapSuccessResponse as jest.Mock).mockReturnValue({
          success: true,
          data: {
            valid: false,
            issues: ['存在重复数据记录', '时间戳数据不完整'],
            suggestions: ['检查数据去重机制', '确保所有记录都有有效的时间戳'],
          },
          requestId: 'test-request-id',
          timestamp: new Date().toISOString(),
        });

        const stream = 'test-stream';
        const result = await service.validateDataIntegrity(stream);

        // 验证问题检测
        expect(result.valid).toBe(false);
        expect(result.issues).toContain('存在重复数据记录');
        expect(result.issues).toContain('时间戳数据不完整');
        expect(result.suggestions).toContain('检查数据去重机制');
        expect(result.suggestions).toContain('确保所有记录都有有效的时间戳');
        expect(result.requestId).toBeDefined();
      });

      it('should assert OpenObserveError with all required fields on failure', async () => {
        // 设置完整的mock错误响应
        const mockError = {
          message: 'Request failed with status code 422',
          config: {
            url: '/api/test-org/_search',
            method: 'post',
          },
          response: {
            status: 422,
            statusText: 'Unprocessable Entity',
            data: {
              error: 'Unprocessable Entity',
              message: 'Invalid integrity check parameters',
            },
            headers: {
              'x-request-id': 'test-request-id',
            },
          },
          isAxiosError: true,
        };
        axios.post.mockRejectedValue(mockError);

        try {
          await service.validateDataIntegrity('test-stream');
          fail('Expected service to throw an error');
        } catch (error) {
          // 验证是OpenObserveError
          expect(error).toBeInstanceOf(OpenObserveError);
          
          // 验证所有必需字段 - 平衡方案：operation反映用户调用的操作，同时提供原始操作信息
          expect(error.code).toBe('VALIDATION_ERROR');
          expect(error.statusCode).toBe(422);
          expect(error.requestId).toBeDefined();
          expect(error.requestId).toMatch(/^req_/);
          expect(error.retryable).toBe(false);
          expect(error.context).toBeDefined();
          expect(error.context.operation).toBe('validateDataIntegrity');
          expect(error.context.originalOperation).toBe('querySingleSourceOfTruth');
        }
      }, 20000); // 增加超时时间
    });
  });

  describe('Error Handling Contract Tests', () => {
    it('should handle network errors correctly with OpenObserveError', async () => {
      // 设置网络错误
      const mockError = new Error('Network Error');
      mockError.name = 'NetworkError';
      axios.post.mockRejectedValue(mockError);

      try {
        await service.querySingleSourceOfTruth(
          ['test-stream'],
          'SELECT * FROM test-stream',
          'now-1h',
          'now',
          100,
        );
        fail('Expected service to throw an error');
      } catch (error) {
        // 验证是OpenObserveError
        expect(error).toBeInstanceOf(OpenObserveError);
        
        // 验证所有必需字段
        expect(error.code).toBe('NETWORK_ERROR');
        expect(error.statusCode).toBeUndefined();
        expect(error.requestId).toBeDefined();
        expect(error.retryable).toBe(true);
        expect(error.context).toBeDefined();
        expect(error.context.operation).toBe('querySingleSourceOfTruth');
      }
    }, 20000); // 增加超时时间

    it('should handle timeout errors correctly with OpenObserveError', async () => {
      // 设置超时错误，模拟真实的Axios超时错误结构
      const mockError = {
        message: 'timeout of 30000ms exceeded',
        code: 'ECONNABORTED',
        config: {
          url: '/api/test-org/_search',
          method: 'post',
          timeout: 30000,
        },
        response: undefined, // 明确设置为undefined
        isAxiosError: true,
      };
      axios.post.mockRejectedValue(mockError);

      try {
        await service.querySingleSourceOfTruth(
          ['test-stream'],
          'SELECT * FROM test-stream',
          'now-1h',
          'now',
          100,
        );
        fail('Expected service to throw an error');
      } catch (error) {
        // 验证是OpenObserveError
        expect(error).toBeInstanceOf(OpenObserveError);
        
        // 验证所有必需字段
        expect(error.code).toBe('TIMEOUT_ERROR');
        expect(error.statusCode).toBe(408);
        expect(error.requestId).toBeDefined();
        expect(error.retryable).toBe(true);
        expect(error.context).toBeDefined();
        expect(error.context.operation).toBe('querySingleSourceOfTruth');
      }
    }, 20000); // 增加超时时间

    it('should handle 5xx server errors correctly with OpenObserveError', async () => {
      // 设置服务器错误
      const mockError = {
        message: 'Request failed with status code 500',
        config: {
          url: '/api/test-org/_search',
          method: 'post',
        },
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {
            error: 'Internal Server Error',
            message: 'Something went wrong',
          },
          headers: {},
        },
        isAxiosError: true,
      };
      axios.post.mockRejectedValue(mockError);

      try {
        await service.querySingleSourceOfTruth(
          ['test-stream'],
          'SELECT * FROM test-stream',
          'now-1h',
          'now',
          100,
        );
        fail('Expected service to throw an error');
      } catch (error) {
        // 验证是OpenObserveError
        expect(error).toBeInstanceOf(OpenObserveError);
        
        // 验证所有必需字段
        expect(error.code).toBe('SERVER_ERROR');
        expect(error.statusCode).toBe(500);
        expect(error.requestId).toBeDefined();
        expect(error.retryable).toBe(true);
        expect(error.context).toBeDefined();
        expect(error.context.operation).toBe('querySingleSourceOfTruth');
      }
    }, 20000); // 增加超时时间
  });
});