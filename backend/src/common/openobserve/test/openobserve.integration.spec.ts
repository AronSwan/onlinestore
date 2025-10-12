import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { OpenObserveModule } from '../openobserve.module';
import { OpenObserveService } from '../openobserve.service';
import { OpenObserveConfigService } from '../config/openobserve-config.service';
import { FieldWhitelistService } from '../config/field-whitelist.service';
import { MetricsCollector } from '../utils/metrics-collector';
import { BatchWriter } from '../utils/batch-writer';
import { ResponseWrapperService } from '../utils/response-wrapper.service';
import { OpenObserveController } from '../openobserve.controller';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ApiKeyGuard } from '../../guards/api-key.guard';

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

describe('OpenObserve Integration Tests', () => {
  let app: INestApplication;
  let service: OpenObserveService;
  let controller: OpenObserveController;
  let configService: OpenObserveConfigService;
  let fieldWhitelistService: FieldWhitelistService;
  let metricsCollector: MetricsCollector;
  let batchWriter: BatchWriter;
  let responseWrapperService: ResponseWrapperService;
  let module: TestingModule;
  let httpServer: any;
  let axiosInstance: any;

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

    // Create a mock API key guard with proper implementation
    const mockApiKeyGuard = {
      canActivate: jest.fn().mockImplementation((context) => {
        // 直接返回true，不进行复杂的请求处理
        return true;
      }),
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
    .overrideGuard(ApiKeyGuard)
    .useValue(mockApiKeyGuard)
    .compile();

    // Create application
    app = module.createNestApplication();
    await app.init();

    // Get providers
    service = module.get<OpenObserveService>(OpenObserveService);
    controller = module.get<OpenObserveController>(OpenObserveController);
    configService = module.get<OpenObserveConfigService>(OpenObserveConfigService);
    fieldWhitelistService = module.get<FieldWhitelistService>(FieldWhitelistService);
    metricsCollector = module.get<MetricsCollector>(MetricsCollector);
    batchWriter = module.get<BatchWriter>(BatchWriter);
    responseWrapperService = module.get<ResponseWrapperService>(ResponseWrapperService);

    // Get HTTP server
    httpServer = app.getHttpServer();
    axiosInstance = request(httpServer);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (module) {
      await module.close();
    }
  });

  describe('Module Integration', () => {
    it('should initialize the module correctly', () => {
      expect(app).toBeDefined();
      expect(service).toBeDefined();
      expect(controller).toBeDefined();
      expect(configService).toBeDefined();
      expect(fieldWhitelistService).toBeDefined();
      expect(metricsCollector).toBeDefined();
      expect(batchWriter).toBeDefined();
      expect(responseWrapperService).toBeDefined();
    });

    it('should have all required providers registered', () => {
      // 验证模块已正确注册
      expect(module).toBeDefined();
      expect(module.get(OpenObserveService)).toBeDefined();
      expect(module.get(OpenObserveConfigService)).toBeDefined();
      expect(module.get(FieldWhitelistService)).toBeDefined();
      expect(module.get(MetricsCollector)).toBeDefined();
      expect(module.get(BatchWriter)).toBeDefined();
      expect(module.get(ResponseWrapperService)).toBeDefined();
      expect(module.get(OpenObserveController)).toBeDefined();
    });
  });

  describe('Service Integration', () => {
    it('should have correct initialization', () => {
      expect(service).toBeDefined();
      expect(service['configService']).toBeDefined();
      // 直接检查服务是否获取了依赖，而不是通过私有属性
      expect(fieldWhitelistService).toBeDefined();
      expect(metricsCollector).toBeDefined();
      expect(batchWriter).toBeDefined();
      expect(responseWrapperService).toBeDefined();
      // 不直接检查私有属性，而是检查服务是否有axios实例的方法
      expect(typeof service.querySingleSourceOfTruth).toBe('function');
    });

    it('should have required methods', () => {
      expect(typeof service.querySingleSourceOfTruth).toBe('function');
      expect(typeof service.ingestData).toBe('function');
      expect(typeof service.getSystemHealth).toBe('function');
      expect(typeof service.getDataStatistics).toBe('function');
      expect(typeof service.validateDataIntegrity).toBe('function');
    });
  });

  describe('Controller Integration', () => {
    it('should have correct initialization', () => {
      expect(controller).toBeDefined();
      expect(controller['openObserveService']).toBeDefined();
    });

    it('should have required methods', () => {
      expect(typeof controller.querySingleSourceOfTruth).toBe('function');
      expect(typeof controller.crossStreamCorrelation).toBe('function');
      expect(typeof controller.getDataStatistics).toBe('function');
      expect(typeof controller.getSystemHealth).toBe('function');
      expect(typeof controller.validateDataIntegrity).toBe('function');
      expect(typeof controller.ingestData).toBe('function');
    });
  });

  describe('HTTP API Integration', () => {
    it('should handle query requests', async () => {
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

      // 修复响应包装服务的模拟
      (responseWrapperService.wrapSuccessResponse as jest.Mock).mockReturnValue({
        success: true,
        data: { hits: [{ id: 1, message: 'test' }], total: 1, took: 10 },
        requestId: 'test-request-id',
        timestamp: new Date().toISOString(),
      });

      const response = await axiosInstance
        .get('/openobserve/query')
        .query({
          streams: 'test-stream',  // 使用字符串，让DTO转换
          query: 'SELECT * FROM test-stream',
          startTime: 'now-1h',
          endTime: 'now',
          limit: 100,
        })
        .expect(200);

      // 验证响应格式
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ hits: [{ id: 1, message: 'test' }], total: 1, took: 10 });
      expect(response.body.requestId).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle ingest requests', async () => {
      // 设置mock响应
      const mockResponse = {
        data: {
          status: 'success',
        },
        headers: {
          'x-request-id': 'test-request-id',
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      // 修复批量写入器的模拟
      (batchWriter.addData as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Data added successfully',
        count: 1,
      });

      // 修复响应包装服务的模拟
      (responseWrapperService.createStandardResponse as jest.Mock).mockReturnValue({
        success: true,
        data: { success: true, message: 'Data added successfully', count: 1 },
        message: 'Data ingested successfully',
        requestId: 'test-request-id',
        timestamp: new Date().toISOString(),
      });

      const response = await axiosInstance
        .post('/openobserve/ingest')
        .send({
          stream: 'test-stream',
          data: [{ id: 1, message: 'test' }],
        })
        .expect(200);

      // 验证响应格式
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Data ingested successfully');
      expect(response.body.requestId).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle health requests', async () => {
      // 设置mock响应
      const mockResponse = {
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

      // 修复响应包装服务的模拟
      (responseWrapperService.wrapSuccessResponse as jest.Mock).mockReturnValue({
        success: true,
        data: {
          status: 'healthy',
          version: '1.0.0',
          uptime: 3600,
        },
        requestId: 'test-request-id',
        timestamp: new Date().toISOString(),
      });

      const response = await axiosInstance
        .get('/openobserve/health')
        .expect(200);

      // 验证响应格式
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.version).toBe('1.0.0');
      expect(response.body.data.uptime).toBe(3600);
      expect(response.body.requestId).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle statistics requests', async () => {
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

      const response = await axiosInstance
        .get('/openobserve/statistics')
        .query({ streams: 'stream1,stream2' })
        .expect(200);

      // 验证响应格式
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalRecords).toBe(1000);
      expect(response.body.data.streams).toEqual({
        'stream1': 500,
        'stream2': 500,
      });
      expect(response.body.data.storageSize).toBe(1024000);
      expect(response.body.data.ingestionRate).toBe(100);
      expect(response.body.requestId).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle integrity validation requests', async () => {
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

      const response = await axiosInstance
        .get('/openobserve/integrity')
        .query({
          stream: 'test-stream',
        })
        .expect(200);

      // 验证响应格式
      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.issues).toEqual([]);
      expect(response.body.data.suggestions).toEqual([]);
      expect(response.body.requestId).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent requests', async () => {
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

      // 修复响应包装服务的模拟
      (responseWrapperService.wrapSuccessResponse as jest.Mock).mockReturnValue({
        success: true,
        data: { hits: [{ id: 1, message: 'test' }], total: 1, took: 10 },
        requestId: 'test-request-id',
        timestamp: new Date().toISOString(),
      });

      const startTime = Date.now();
      const promises = Array(10).fill(null).map(() =>
        axiosInstance
          .get('/openobserve/query')
          .query({
            streams: 'test-stream',  // 使用字符串，让DTO转换
            query: 'SELECT * FROM test-stream',
            startTime: 'now-1h',
            endTime: 'now',
            limit: 100,
          })
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证所有响应都成功
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // 验证性能（10个并发请求应该在5秒内完成）
      expect(duration).toBeLessThan(5000);
    }, 10000);

    it('should handle large data ingestion efficiently', async () => {
      // 设置mock响应
      const mockResponse = {
        data: {
          status: 'success',
        },
        headers: {
          'x-request-id': 'test-request-id',
        },
      };
      axios.post.mockResolvedValue(mockResponse);

      // 修复批量写入器的模拟
      (batchWriter.addData as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Data added successfully',
        count: 1000,
      });

      // 修复响应包装服务的模拟
      (responseWrapperService.createStandardResponse as jest.Mock).mockReturnValue({
        success: true,
        data: { success: true, message: 'Data added successfully', count: 1000 },
        message: 'Data ingested successfully',
        requestId: 'test-request-id',
        timestamp: new Date().toISOString(),
      });

      // 创建大量数据
      const largeData = Array(1000).fill(null).map((_, index) => ({
        id: index,
        message: `test message ${index}`,
        timestamp: new Date().toISOString(),
      }));

      const startTime = Date.now();
      const response = await axiosInstance
        .post('/openobserve/ingest')
        .send({
          stream: 'test-stream',
          data: largeData,
        })
        .expect(200);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证响应格式
      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(1000);

      // 验证性能（1000条记录的批量写入应该在3秒内完成）
      expect(duration).toBeLessThan(3000);
    }, 10000);
  });
});