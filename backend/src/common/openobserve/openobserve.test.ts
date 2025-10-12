import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { OpenObserveModule } from './openobserve.module';
import { OpenObserveService } from './openobserve.service';
import { OpenObserveController } from './openobserve.controller';
import { OpenObserveConfigService } from './config/openobserve-config.service';
import { FieldWhitelistService } from './config/field-whitelist.service';
import { MetricsCollector } from './utils/metrics-collector';
import { BatchWriter } from './utils/batch-writer';
import { ResponseWrapperService } from './utils/response-wrapper.service';

describe('OpenObserveModule Integration', () => {
  let module: TestingModule;
  let service: OpenObserveService;
  let controller: OpenObserveController;
  let responseWrapperService: ResponseWrapperService;

  beforeAll(async () => {
    // 设置测试环境变量
    process.env.OPENOBSERVE_URL = 'http://test-openobserve.com:5080';
    process.env.OPENOBSERVE_ORGANIZATION = 'test-org';
    process.env.OPENOBSERVE_TOKEN = 'test-token';
    process.env.OPENOBSERVE_ENABLED = 'true';
  });

  beforeEach(async () => {
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
    .useValue({
      getConfig: () => ({
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
      isEnabled: () => true,
      getAuthHeaders: () => ({
        'Authorization': 'Bearer test-token',
      }),
      getSearchEndpoint: () => '/api/test-org/_search',
      getApiEndpoint: (stream: string) => `/api/test-org/${stream}/_json`,
      getHealthEndpoint: () => '/api/_health',
      getStatsEndpoint: () => '/api/test-org/_stats',
    })
    .overrideProvider(MetricsCollector)
    .useValue({
      recordRequest: jest.fn(),
      recordError: jest.fn(),
      getMetrics: jest.fn().mockReturnValue({
        totalRequests: 0,
        errorRate: 0,
        avgResponseTime: 0,
      }),
    })
    .overrideProvider(BatchWriter)
    .useValue({
      addData: jest.fn().mockResolvedValue({
        success: true,
        message: 'Data added successfully',
        count: 1,
      }),
      flushAll: jest.fn().mockResolvedValue({
        success: true,
        flushed: 1,
      }),
    })
    .compile();

    service = module.get<OpenObserveService>(OpenObserveService);
    controller = module.get<OpenObserveController>(OpenObserveController);
    responseWrapperService = module.get<ResponseWrapperService>(ResponseWrapperService);
  });

  afterAll(async () => {
    await module.close();
  });

  it('module should be defined', () => {
    expect(module).toBeDefined();
  });

  it('service should be defined', () => {
    expect(service).toBeDefined();
  });

  it('controller should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('response wrapper service should be defined', () => {
    expect(responseWrapperService).toBeDefined();
  });

  it('should have all required providers', () => {
    expect(module.get<OpenObserveConfigService>(OpenObserveConfigService)).toBeDefined();
    expect(module.get<FieldWhitelistService>(FieldWhitelistService)).toBeDefined();
    expect(module.get<MetricsCollector>(MetricsCollector)).toBeDefined();
    expect(module.get<BatchWriter>(BatchWriter)).toBeDefined();
    expect(module.get<ResponseWrapperService>(ResponseWrapperService)).toBeDefined();
  });

  describe('Service Integration', () => {
    it('should have correct initialization', () => {
      expect(service).toBeInstanceOf(OpenObserveService);
    });

    it('should have required methods', () => {
      expect(typeof service.querySingleSourceOfTruth).toBe('function');
      expect(typeof service.ingestData).toBe('function');
      expect(typeof service.getSystemHealth).toBe('function');
      expect(typeof service.getDataStatistics).toBe('function');
      expect(typeof service.crossStreamCorrelation).toBe('function');
      expect(typeof service.validateDataIntegrity).toBe('function');
      expect(typeof service.testConnection).toBe('function');
      expect(typeof service.sendLogs).toBe('function');
      expect(typeof service.queryLogs).toBe('function');
      expect(typeof service.queryMetrics).toBe('function');
      expect(typeof service.getLogAnalytics).toBe('function');
      expect(typeof service.getErrorStats).toBe('function');
      expect(typeof service.resetErrorStats).toBe('function');
    });
  });

  describe('Controller Integration', () => {
    it('should have correct initialization', () => {
      expect(controller).toBeInstanceOf(OpenObserveController);
    });

    it('should have required methods', () => {
      expect(typeof controller.querySingleSourceOfTruth).toBe('function');
      expect(typeof controller.crossStreamCorrelation).toBe('function');
      expect(typeof controller.getDataStatistics).toBe('function');
      expect(typeof controller.getSystemHealth).toBe('function');
      expect(typeof controller.validateDataIntegrity).toBe('function');
      expect(typeof controller.ingestData).toBe('function');
      expect(typeof controller.ingestEmailVerification).toBe('function');
      expect(typeof controller.cleanupData).toBe('function');
      expect(typeof controller.getUserBehaviorAnalytics).toBe('function');
      expect(typeof controller.getSystemPerformanceAnalytics).toBe('function');
      expect(typeof controller.getSecurityEventsAnalytics).toBe('function');
      expect(typeof controller.getBusinessMetricsAnalytics).toBe('function');
      expect(typeof controller.testConnection).toBe('function');
      expect(typeof controller.getErrorStats).toBe('function');
      expect(typeof controller.resetErrorStats).toBe('function');
      expect(typeof controller.getModuleStatus).toBe('function');
    });
  });

  describe('Dependency Injection Integration', () => {
    it('should properly inject dependencies', () => {
      const configService = module.get<OpenObserveConfigService>(OpenObserveConfigService);
      const fieldWhitelistService = module.get<FieldWhitelistService>(FieldWhitelistService);
      const metricsCollector = module.get<MetricsCollector>(MetricsCollector);
      const batchWriter = module.get<BatchWriter>(BatchWriter);

      expect(configService).toBeDefined();
      expect(fieldWhitelistService).toBeDefined();
      expect(metricsCollector).toBeDefined();
      expect(batchWriter).toBeDefined();
      expect(responseWrapperService).toBeDefined();
    });

    it('should export all required services', () => {
      const moduleRef = module.get<OpenObserveModule>(OpenObserveModule);
      expect(moduleRef).toBeDefined();
      
      expect(() => module.get<OpenObserveService>(OpenObserveService)).not.toThrow();
      expect(() => module.get<OpenObserveConfigService>(OpenObserveConfigService)).not.toThrow();
      expect(() => module.get<FieldWhitelistService>(FieldWhitelistService)).not.toThrow();
      expect(() => module.get<MetricsCollector>(MetricsCollector)).not.toThrow();
      expect(() => module.get<BatchWriter>(BatchWriter)).not.toThrow();
      expect(() => module.get<ResponseWrapperService>(ResponseWrapperService)).not.toThrow();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle disabled service gracefully', async () => {
      const disabledConfigService = {
        isEnabled: () => false,
        getConfig: () => ({ enabled: false }),
      };

      const disabledModule = await Test.createTestingModule({
        imports: [ConfigModule.forRoot()],
        providers: [
          {
            provide: OpenObserveConfigService,
            useValue: disabledConfigService,
          },
          OpenObserveService,
        ],
      }).compile();

      const disabledService = disabledModule.get<OpenObserveService>(OpenObserveService);

      try {
        await disabledService.querySingleSourceOfTruth(['test'], 'SELECT * FROM test');
        fail('Expected service to throw an error when disabled');
      } catch (error) {
        expect(error.message).toContain('OpenObserve is not enabled');
      }

      await disabledModule.close();
    });
  });

  describe('Configuration Integration', () => {
    it('should use validation pipe configuration', () => {
      const validationPipe = OpenObserveModule.configureValidationPipe();
      expect(validationPipe).toBeDefined();
      expect(validationPipe).toBeInstanceOf(Object);
    });
  });
});