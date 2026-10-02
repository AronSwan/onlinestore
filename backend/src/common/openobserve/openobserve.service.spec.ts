import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import * as zlib from 'zlib';
import { OpenObserveService } from './openobserve.service';
import { OpenObserveConfigService } from './config/openobserve-config.service';
import { OpenObserveError } from './utils/error-handler';

// Mock axios：服务内部通过 axios.create() 自建实例，需拦截 create 返回 mock 实例
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OpenObserveService', () => {
  let service: OpenObserveService;

  let mockConfigService: {
    getConfig: jest.Mock;
    isEnabled: jest.Mock;
    getAuthHeaders: jest.Mock;
    getApiEndpoint: jest.Mock;
    getHealthEndpoint: jest.Mock;
    getSearchEndpoint: jest.Mock;
    getStatsEndpoint: jest.Mock;
  };

  let mockAxiosInstance: {
    post: jest.Mock;
    get: jest.Mock;
    interceptors: {
      request: { use: jest.Mock };
      response: { use: jest.Mock };
    };
  };

  const baseConfig = {
    url: 'http://localhost:5080',
    timeout: 10000,
    compression: false,
    organization: 'default',
    username: 'admin@example.com',
    password: 'CHANGE_ME_test_password',
  };

  beforeEach(async () => {
    mockConfigService = {
      getConfig: jest.fn().mockReturnValue(baseConfig),
      isEnabled: jest.fn().mockReturnValue(true),
      getAuthHeaders: jest.fn().mockReturnValue({ Authorization: 'Basic dGVzdDp0ZXN0' }),
      getApiEndpoint: jest.fn(
        (stream: string) => `${baseConfig.url}/api/${baseConfig.organization}/${stream}/_json`,
      ),
      getHealthEndpoint: jest.fn(() => `${baseConfig.url}/api/_health`),
      getSearchEndpoint: jest.fn(() => `${baseConfig.url}/api/${baseConfig.organization}/_search`),
      getStatsEndpoint: jest.fn(() => `${baseConfig.url}/api/${baseConfig.organization}/stats`),
    };

    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    // 先清上一轮用例的调用记录（实现保留），再编译模块，保证构造期间的调用可被断言
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenObserveService,
        {
          provide: OpenObserveConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OpenObserveService>(OpenObserveService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(mockedAxios.create).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: baseConfig.url, timeout: baseConfig.timeout }),
    );
  });

  describe('querySingleSourceOfTruth', () => {
    it('should query data from OpenObserve', async () => {
      const hits = [
        { timestamp: new Date().toISOString(), level: 'info', message: 'Test log message' },
      ];
      mockAxiosInstance.post.mockResolvedValue({
        data: { hits, total: 1, took: 10 },
        headers: {},
      });

      const result = await service.querySingleSourceOfTruth(['test-stream'], 'SELECT * FROM test-stream');

      expect(result.data).toEqual(hits);
      expect(result.total).toBe(1);
      expect(result.took).toBe(10);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `${baseConfig.url}/api/${baseConfig.organization}/_search`,
        expect.objectContaining({
          query: 'SELECT * FROM test-stream',
          streams: ['test-stream'],
          start_time: 'now-1h',
          end_time: 'now',
          limit: 1000,
          sql_mode: true,
        }),
        expect.objectContaining({ headers: { Authorization: 'Basic dGVzdDp0ZXN0' } }),
      );
    });

    it('should reject when OpenObserve is not enabled', async () => {
      mockConfigService.isEnabled.mockReturnValue(false);

      await expect(
        service.querySingleSourceOfTruth(['logs'], 'SELECT 1'),
      ).rejects.toThrow('OpenObserve is not enabled');
    });

    it('should reject when streams array is empty', async () => {
      await expect(service.querySingleSourceOfTruth([], 'SELECT 1')).rejects.toThrow(
        'Streams array is required',
      );
    });

    it('should reject when query string is empty', async () => {
      await expect(service.querySingleSourceOfTruth(['logs'], '  ')).rejects.toThrow(
        'Query string is required',
      );
    });
  });

  describe('ingestData', () => {
    const sampleData = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Test log message',
        service: 'test-service',
      },
    ];

    it('should ingest data to OpenObserve', async () => {
      mockAxiosInstance.post.mockResolvedValue({ status: 200, data: {}, headers: {} });

      const result = await service.ingestData('test-stream', sampleData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Data ingested successfully');
      expect(result.count).toBe(sampleData.length);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        `${baseConfig.url}/api/${baseConfig.organization}/test-stream/_json`,
        sampleData,
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Basic dGVzdDp0ZXN0' }),
        }),
      );
    });

    it('should gzip payload when compression is enabled', async () => {
      mockConfigService.getConfig.mockReturnValue({ ...baseConfig, compression: true });
      // 压缩配置在构造函数里已读取，需重建实例以生效
      const compressedService = new OpenObserveService(mockConfigService as any);
      mockAxiosInstance.post.mockClear();
      mockAxiosInstance.post.mockResolvedValue({ status: 200, data: {}, headers: {} });

      const result = await compressedService.ingestData('test-stream', sampleData);

      expect(result.success).toBe(true);
      const [, payload, requestConfig] = mockAxiosInstance.post.mock.calls[0];
      expect(Buffer.isBuffer(payload)).toBe(true);
      expect(JSON.parse(zlib.gunzipSync(payload as Buffer).toString())).toEqual(sampleData);
      expect(requestConfig.headers['Content-Encoding']).toBe('gzip');
    });

    it('should reject when OpenObserve is not enabled', async () => {
      mockConfigService.isEnabled.mockReturnValue(false);

      await expect(service.ingestData('logs', sampleData)).rejects.toThrow(
        'OpenObserve is not enabled',
      );
    });

    it('should reject when stream name is empty', async () => {
      await expect(service.ingestData('  ', sampleData)).rejects.toThrow(
        'Stream name is required',
      );
    });

    it('should reject when data array is empty', async () => {
      await expect(service.ingestData('logs', [])).rejects.toThrow('Data array is required');
    });

    it('should wrap request errors into OpenObserveError', async () => {
      const axiosLikeError = Object.assign(new Error('Network error'), {
        isAxiosError: true,
        config: {},
        response: { status: 500 },
      });
      mockAxiosInstance.post.mockRejectedValue(axiosLikeError);

      await expect(service.ingestData('test-stream', sampleData)).rejects.toBeInstanceOf(
        OpenObserveError,
      );
    });
  });

  describe('getSystemHealth', () => {
    it('should check OpenObserve health', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: { status: 'healthy', version: '1.0.0', uptime: 3600 },
        headers: {},
      });

      const result = await service.getSystemHealth();

      expect(result.status).toBe('healthy');
      expect(result.details.version).toBe('1.0.0');
      expect(result.details.uptime).toBe(3600);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`${baseConfig.url}/api/_health`, {
        headers: { Authorization: 'Basic dGVzdDp0ZXN0' },
        timeout: 5000,
      });
    });

    it('should report unhealthy on non-200 status', async () => {
      mockAxiosInstance.get.mockResolvedValue({ status: 500, data: {}, headers: {} });

      const result = await service.getSystemHealth();

      expect(result.status).toBe('unhealthy');
    });

    it('should reject when OpenObserve is not enabled', async () => {
      mockConfigService.isEnabled.mockReturnValue(false);

      await expect(service.getSystemHealth()).rejects.toThrow('OpenObserve is not enabled');
    });
  });

  describe('sendLogs', () => {
    it('should ingest logs into the logs stream', async () => {
      const logs = [{ level: 'info', message: 'Test log message' }];
      const ingestSpy = jest
        .spyOn(service, 'ingestData')
        .mockResolvedValue({ success: true, message: 'Data ingested successfully' });

      await expect(service.sendLogs(logs)).resolves.toBeUndefined();
      expect(ingestSpy).toHaveBeenCalledWith('logs', logs);
    });

    it('should skip ingestion for empty logs array', async () => {
      const ingestSpy = jest.spyOn(service, 'ingestData');

      await expect(service.sendLogs([])).resolves.toBeUndefined();
      expect(ingestSpy).not.toHaveBeenCalled();
    });

    it('should wrap ingestion failures', async () => {
      jest
        .spyOn(service, 'ingestData')
        .mockRejectedValue(new Error('OpenObserve is not enabled'));

      await expect(service.sendLogs([{ level: 'info' }])).rejects.toThrow(
        '发送日志到OpenObserve失败: OpenObserve is not enabled',
      );
    });
  });

  describe('queryLogs', () => {
    it('should delegate to querySingleSourceOfTruth on the logs stream', async () => {
      const hits = [{ level: 'info', message: 'Test log message' }];
      const querySpy = jest
        .spyOn(service, 'querySingleSourceOfTruth')
        .mockResolvedValue({ data: hits, total: 1, took: 10 });

      const result = await service.queryLogs({ query: 'level="info"', size: 10 });

      expect(result.total).toBe(1);
      expect(result.hits).toEqual(hits);
      expect(result.took).toBe(10);
      expect(querySpy).toHaveBeenCalledWith(['logs'], expect.any(String), undefined, undefined, 10);
    });

    it('should reject when OpenObserve is not enabled', async () => {
      mockConfigService.isEnabled.mockReturnValue(false);

      await expect(service.queryLogs({ query: 'level="info"' })).rejects.toThrow(
        'OpenObserve is not enabled',
      );
    });
  });

  describe('testConnection', () => {
    it('should succeed when the service is healthy', async () => {
      jest
        .spyOn(service, 'getSystemHealth')
        .mockResolvedValue({ status: 'healthy', details: {} });

      const result = await service.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toBe('连接测试成功');
    });

    it('should fail when the service is unhealthy', async () => {
      jest
        .spyOn(service, 'getSystemHealth')
        .mockResolvedValue({ status: 'unhealthy', details: {} });

      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe('OpenObserve服务不健康');
    });

    it('should fail when the health check throws', async () => {
      jest.spyOn(service, 'getSystemHealth').mockRejectedValue(new Error('timeout'));

      const result = await service.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('连接测试失败');
    });
  });
});
