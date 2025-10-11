import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CqrsMetricsService } from './cqrs-metrics.service';

describe('CqrsMetricsService', () => {
  let service: CqrsMetricsService;
  let mockTransport: { log: jest.Mock; flush?: jest.Mock };
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    mockTransport = { log: jest.fn(), flush: jest.fn() };
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'cqrsOpenObserve') {
          return {
            performance: {
              batchSize: 3,
              flushInterval: 1000,
              timeout: 30000,
            },
            metrics: {
              histogramBuckets: {
                swrRefreshMs: [50, 100, 200],
              },
              labels: {
                enableCacheKeyPrefix: true,
              },
            },
          } as any;
        }
        return undefined;
      }),
    } as Partial<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CqrsMetricsService,
        { provide: 'OPENOBSERVE_TRANSPORT', useValue: mockTransport },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CqrsMetricsService>(CqrsMetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('records query metrics and flushes to transport', async () => {
    service.recordQuery('GetProduct', false, 120, 'GetProductHandler');
    service.recordQuery('GetProduct', true, 80, 'GetProductHandler');
    service.recordQuery('Search', false, 300, 'SearchHandler');

    // Allow scheduled flush to run once
    await new Promise(r => setTimeout(r, 10));

    // Manually trigger flush to simplify timing in tests
    // @ts-ignore access private for test
    await service['flushMetrics']();

    expect(mockTransport.log).toHaveBeenCalled();
    // At least some entries should contain metric_name
    expect(mockTransport.log.mock.calls[0][0]).toHaveProperty('metric_name');
  });

  it('supports histogram buckets for swr refresh duration', () => {
    const buckets = service.getHistogramBuckets('cqrs_swr_refresh_duration_ms');
    expect(buckets).toEqual([50, 100, 200]);
  });

  it('negative-path: when transport.log throws, metrics are re-buffered', async () => {
    // Make log throw
    mockTransport.log.mockImplementation(() => {
      throw new Error('network error');
    });

    service.recordQuery('GetProduct', false, 120, 'GetProductHandler');

    // snapshot buffer length before flush
    // @ts-ignore access private for test
    const beforeLen = service['metricsBuffer'].length;
    // @ts-ignore access private for test
    await service['flushMetrics']();

    // After failure, metrics should be put back to buffer
    // @ts-ignore access private for test
    const afterLen = service['metricsBuffer'].length;
    expect(afterLen).toBeGreaterThanOrEqual(beforeLen);
  });
});
