import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenObserveService } from './openobserve.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OpenObserveService', () => {
  let service: OpenObserveService;

  beforeEach(async () => {
    // Mock ConfigService
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenObserveService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OpenObserveService>(OpenObserveService);
    
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initializeConfig', () => {
    it('should initialize OpenObserve configuration', () => {
      const expectedConfig = {
        url: 'http://localhost:5080',
        organization: 'default',
        username: 'admin@example.com',
        password: 'ComplexPass#123',
      };

      // Mock the ConfigService.get method
      const originalGet = (ConfigService.prototype as any).get;
      (ConfigService.prototype as any).get = jest.fn((key: string) => {
        switch (key) {
          case 'OPENOBSERVE_URL':
            return expectedConfig.url;
          case 'OPENOBSERVE_ORGANIZATION':
            return expectedConfig.organization;
          case 'OPENOBSERVE_USERNAME':
            return expectedConfig.username;
          case 'OPENOBSERVE_PASSWORD':
            return expectedConfig.password;
          default:
            return undefined;
        }
      });

      // Create a new service instance to trigger initialization
      const newService = new OpenObserveService(ConfigService.prototype as any);
      expect(newService).toBeDefined();

      // Restore original method
      (ConfigService.prototype as any).get = originalGet;
    });
  });

  describe('ingestData', () => {
    it('should ingest data to OpenObserve', async () => {
      const mockConfig = {
        url: 'http://localhost:5080',
        organization: 'default',
        username: 'admin@example.com',
        password: 'ComplexPass#123',
      };

      // Mock the ConfigService.get method
      const originalGet = (ConfigService.prototype as any).get;
      (ConfigService.prototype as any).get = jest.fn((key: string) => {
        switch (key) {
          case 'OPENOBSERVE_URL':
            return mockConfig.url;
          case 'OPENOBSERVE_ORGANIZATION':
            return mockConfig.organization;
          case 'OPENOBSERVE_USERNAME':
            return mockConfig.username;
          case 'OPENOBSERVE_PASSWORD':
            return mockConfig.password;
          default:
            return undefined;
        }
      });

      // Create a new service instance with the mock config
      const newService = new OpenObserveService(ConfigService.prototype as any);

      const stream = 'test-stream';
      const data = [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Test log message',
          service: 'test-service',
        },
      ];

      // Mock the HTTP POST request
      const mockResponse = {
        status: 200,
        data: {},
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await newService.ingestData(stream, data);
      expect(result.success).toBe(true);
      expect(result.count).toBe(data.length);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mockConfig.url}/api/${mockConfig.organization}/${stream}/_json`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'Content-Encoding': 'gzip',
            'Authorization': `Basic ${Buffer.from(`${mockConfig.username}:${mockConfig.password}`).toString('base64')}`,
          },
          timeout: 10000,
        }
      );
    });

    it('should handle ingestion errors', async () => {
      const mockConfig = {
        url: 'http://localhost:5080',
        organization: 'default',
        username: 'admin@example.com',
        password: 'ComplexPass#123',
      };

      // Mock the ConfigService.get method
      const originalGet = (ConfigService.prototype as any).get;
      (ConfigService.prototype as any).get = jest.fn((key: string) => {
        switch (key) {
          case 'OPENOBSERVE_URL':
            return mockConfig.url;
          case 'OPENOBSERVE_ORGANIZATION':
            return mockConfig.organization;
          case 'OPENOBSERVE_USERNAME':
            return mockConfig.username;
          case 'OPENOBSERVE_PASSWORD':
            return mockConfig.password;
          default:
            return undefined;
        }
      });

      // Create a new service instance with the mock config
      const newService = new OpenObserveService(ConfigService.prototype as any);

      const stream = 'test-stream';
      const data = [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Test log message',
          service: 'test-service',
        },
      ];

      // Mock the HTTP POST request to throw an error
      const error = new Error('Network error');
      mockedAxios.post.mockRejectedValue(error);

      const result = await newService.ingestData(stream, data);
      expect(result.success).toBe(false);
      expect(result.error).toBe(error.message);

      // Restore original method
      (ConfigService.prototype as any).get = originalGet;
    });
  });

  describe('querySingleSourceOfTruth', () => {
    it('should query data from OpenObserve', async () => {
      const mockConfig = {
        url: 'http://localhost:5080',
        organization: 'default',
        username: 'admin@example.com',
        password: 'ComplexPass#123',
      };

      // Mock the ConfigService.get method
      const originalGet = (ConfigService.prototype as any).get;
      (ConfigService.prototype as any).get = jest.fn((key: string) => {
        switch (key) {
          case 'OPENOBSERVE_URL':
            return mockConfig.url;
          case 'OPENOBSERVE_ORGANIZATION':
            return mockConfig.organization;
          case 'OPENOBSERVE_USERNAME':
            return mockConfig.username;
          case 'OPENOBSERVE_PASSWORD':
            return mockConfig.password;
          default:
            return undefined;
        }
      });

      // Create a new service instance with the mock config
      const newService = new OpenObserveService(ConfigService.prototype as any);

      const streams = ['test-stream'];
      const query = 'SELECT * FROM test-stream';

      const mockResponse = {
        data: {
          hits: [
            {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: 'Test log message',
              service: 'test-service',
            },
          ],
          total: 1,
          took: 10,
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await newService.querySingleSourceOfTruth(streams, query);
      expect(result.data).toEqual(mockResponse.data.hits);
      expect(result.total).toBe(mockResponse.data.total);
      expect(result.took).toBe(mockResponse.data.took);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mockConfig.url}/api/${mockConfig.organization}/_search`,
        {
          query,
          streams,
          start_time: 'now-1h',
          end_time: 'now',
          limit: 1000,
          sql_mode: true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${mockConfig.username}:${mockConfig.password}`).toString('base64')}`,
          },
          timeout: 30000,
        }
      );

      // Restore original method
      (ConfigService.prototype as any).get = originalGet;
    });
  });

  describe('getSystemHealth', () => {
    it('should check OpenObserve health', async () => {
      const mockConfig = {
        url: 'http://localhost:5080',
        organization: 'default',
        username: 'admin@example.com',
        password: 'ComplexPass#123',
      };

      // Mock the ConfigService.get method
      const originalGet = (ConfigService.prototype as any).get;
      (ConfigService.prototype as any).get = jest.fn((key: string) => {
        switch (key) {
          case 'OPENOBSERVE_URL':
            return mockConfig.url;
          case 'OPENOBSERVE_ORGANIZATION':
            return mockConfig.organization;
          case 'OPENOBSERVE_USERNAME':
            return mockConfig.username;
          case 'OPENOBSERVE_PASSWORD':
            return mockConfig.password;
          default:
            return undefined;
        }
      });

      // Create a new service instance with the mock config
      const newService = new OpenObserveService(ConfigService.prototype as any);

      const mockResponse = {
        status: 200,
        data: {
          status: 'healthy',
          version: '1.0.0',
          uptime: 3600,
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await newService.getSystemHealth();
      expect(result.status).toBe('healthy');
      expect(result.details.version).toBe('1.0.0');
      expect(result.details.uptime).toBe(3600);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockConfig.url}/api/_health`,
        { timeout: 5000 }
      );
    });

    it('should handle unhealthy status', async () => {
      const mockConfig = {
        url: 'http://localhost:5080',
        organization: 'default',
        username: 'admin@example.com',
        password: 'ComplexPass#123',
      };

      // Mock the ConfigService.get method
      const originalGet = (ConfigService.prototype as any).get;
      (ConfigService.prototype as any).get = jest.fn((key: string) => {
        switch (key) {
          case 'OPENOBSERVE_URL':
            return mockConfig.url;
          case 'OPENOBSERVE_ORGANIZATION':
            return mockConfig.organization;
          case 'OPENOBSERVE_USERNAME':
            return mockConfig.username;
          case 'OPENOBSERVE_PASSWORD':
            return mockConfig.password;
          default:
            return undefined;
        }
      });

      // Create a new service instance with the mock config
      const newService = new OpenObserveService(ConfigService.prototype as any);

      const mockResponse = {
        status: 500,
        data: {},
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await newService.getSystemHealth();
      expect(result.status).toBe('unhealthy');

      // Restore original method
      (ConfigService.prototype as any).get = originalGet;
    });
  });

  describe('sendLogs', () => {
    it('should send logs to OpenObserve', async () => {
      const mockConfig = {
        url: 'http://localhost:5080',
        organization: 'default',
        username: 'admin@example.com',
        password: 'ComplexPass#123',
      };

      // Mock the ConfigService.get method
      const originalGet = (ConfigService.prototype as any).get;
      (ConfigService.prototype as any).get = jest.fn((key: string) => {
        switch (key) {
          case 'OPENOBSERVE_URL':
            return mockConfig.url;
          case 'OPENOBSERVE_ORGANIZATION':
            return mockConfig.organization;
          case 'OPENOBSERVE_USERNAME':
            return mockConfig.username;
          case 'OPENOBSERVE_PASSWORD':
            return mockConfig.password;
          default:
            return undefined;
        }
      });

      // Create a new service instance with the mock config
      const newService = new OpenObserveService(ConfigService.prototype as any);

      const logs = [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Test log message',
          service: 'test-service',
        },
      ];

      // Mock the ingestData method
      jest.spyOn(newService, 'ingestData').mockResolvedValue({
        success: true,
        message: 'Data ingested successfully',
        count: logs.length,
      });

      // Should not throw an error
      await expect(newService.sendLogs(logs)).resolves.not.toThrow();
      expect(newService.ingestData).toHaveBeenCalledWith('logs', logs);

      // Restore original method
      (ConfigService.prototype as any).get = originalGet;
    });

    it('should handle empty logs array', async () => {
      const mockConfig = {
        url: 'http://localhost:5080',
        organization: 'default',
        username: 'admin@example.com',
        password: 'ComplexPass#123',
      };

      // Mock the ConfigService.get method
      const originalGet = (ConfigService.prototype as any).get;
      (ConfigService.prototype as any).get = jest.fn((key: string) => {
        switch (key) {
          case 'OPENOBSERVE_URL':
            return mockConfig.url;
          case 'OPENOBSERVE_ORGANIZATION':
            return mockConfig.organization;
          case 'OPENOBSERVE_USERNAME':
            return mockConfig.username;
          case 'OPENOBSERVE_PASSWORD':
            return mockConfig.password;
          default:
            return undefined;
        }
      });

      // Create a new service instance with the mock config
      const newService = new OpenObserveService(ConfigService.prototype as any);

      // Should not throw an error with empty logs
      await expect(newService.sendLogs([])).resolves.not.toThrow();

      // Restore original method
      (ConfigService.prototype as any).get = originalGet;
    });
  });

  describe('queryLogs', () => {
    it('should query logs from OpenObserve', async () => {
      const mockConfig = {
        url: 'http://localhost:5080',
        organization: 'default',
        username: 'admin@example.com',
        password: 'ComplexPass#123',
      };

      // Mock the ConfigService.get method
      const originalGet = (ConfigService.prototype as any).get;
      (ConfigService.prototype as any).get = jest.fn((key: string) => {
        switch (key) {
          case 'OPENOBSERVE_URL':
            return mockConfig.url;
          case 'OPENOBSERVE_ORGANIZATION':
            return mockConfig.organization;
          case 'OPENOBSERVE_USERNAME':
            return mockConfig.username;
          case 'OPENOBSERVE_PASSWORD':
            return mockConfig.password;
          default:
            return undefined;
        }
      });

      // Create a new service instance with the mock config
      const newService = new OpenObserveService(ConfigService.prototype as any);

      const query = {
        query: 'test',
        size: 10,
      };

      const mockQueryResult = {
        data: [
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Test log message',
            service: 'test-service',
          },
        ],
        total: 1,
        took: 10,
      };

      // Mock the querySingleSourceOfTruth method
      jest.spyOn(newService, 'querySingleSourceOfTruth').mockResolvedValue(mockQueryResult);

      const result = await newService.queryLogs(query);
      expect(result.total).toBe(mockQueryResult.total);
      expect(result.hits).toEqual(mockQueryResult.data);
      expect(result.took).toBe(mockQueryResult.took);
      expect(newService.querySingleSourceOfTruth).toHaveBeenCalledWith(
        ['logs'],
        expect.any(String),
        undefined,
        undefined,
        10
      );
    });
  });

  describe('testConnection', () => {
    it('should test OpenObserve connection successfully', async () => {
      const mockConfig = {
        url: 'http://localhost:5080',
        organization: 'default',
        username: 'admin@example.com',
        password: 'ComplexPass#123',
      };

      (ConfigService.prototype as any).get.mockImplementation((key: string) => {
        switch (key) {
          case 'OPENOBSERVE_URL':
            return mockConfig.url;
          case 'OPENOBSERVE_ORGANIZATION':
            return mockConfig.organization;
          case 'OPENOBSERVE_USERNAME':
            return mockConfig.username;
          case 'OPENOBSERVE_PASSWORD':
            return mockConfig.password;
          default:
            return undefined;
        }
      });

      // Create a new service instance with the mock config
      const newService = new OpenObserveService(ConfigService.prototype as any);

      // Mock the getSystemHealth method
      jest.spyOn(newService, 'getSystemHealth').mockResolvedValue({
        status: 'healthy',
        details: {},
      });

      // Should not throw an error
      await expect(newService.testConnection()).resolves.not.toThrow();
    });

    it('should throw error when connection test fails', async () => {
      const mockConfig = {
        url: 'http://localhost:5080',
        organization: 'default',
        username: 'admin@example.com',
        password: 'ComplexPass#123',
      };

      (ConfigService.prototype as any).get.mockImplementation((key: string) => {
        switch (key) {
          case 'OPENOBSERVE_URL':
            return mockConfig.url;
          case 'OPENOBSERVE_ORGANIZATION':
            return mockConfig.organization;
          case 'OPENOBSERVE_USERNAME':
            return mockConfig.username;
          case 'OPENOBSERVE_PASSWORD':
            return mockConfig.password;
          default:
            return undefined;
        }
      });

      // Create a new service instance with the mock config
      const newService = new OpenObserveService(ConfigService.prototype as any);

      // Mock the getSystemHealth method to return unhealthy status
      jest.spyOn(newService, 'getSystemHealth').mockResolvedValue({
        status: 'unhealthy',
        details: {},
      });

      // Should throw an error
      await expect(newService.testConnection()).rejects.toThrow('OpenObserve服务不健康');
    });
  });
});