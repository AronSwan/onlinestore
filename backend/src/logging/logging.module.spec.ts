import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

describe('LoggingModule providers (adapter priority)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('OPENOBSERVE_CONFIG uses EnvironmentAdapter values when available', async () => {
    jest.mock(
      '../config/environment-adapter',
      () => ({
        EnvironmentAdapter: {
          getOpenObserve: () => ({
            baseUrl: 'https://adapter.example.com',
            organization: 'adapter-org',
            token: 'adapter-token',
            streams: { events: 'business-events', metrics: 'metrics', traces: 'traces' },
            performance: { batchSize: 100, flushInterval: 5000, timeout: 30000 },
            tracing: { enabled: true, samplingRate: 0.2 },
            alerts: { enabled: true, evaluationInterval: 60 },
          }),
        },
      }),
      { virtual: true },
    );

    const { LoggingModule } = require('./logging.module');
    jest.doMock('../config/environment-adapter', () => ({
      EnvironmentAdapter: {
        getOpenObserve: () => ({
          baseUrl: 'https://adapter.example.com',
          organization: 'adapter-org',
          token: 'adapter-token',
          streams: { events: 'business-events', metrics: 'metrics', traces: 'traces' },
          performance: { batchSize: 100, flushInterval: 5000, timeout: 30000 },
          tracing: { enabled: true, samplingRate: 0.2 },
          alerts: { enabled: true, evaluationInterval: 60 },
        }),
      },
    }));
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [LoggingModule],
    }).compile();

    const cfg = moduleRef.get<any>('OPENOBSERVE_CONFIG');
    expect(cfg).toBeTruthy();
    expect(cfg.url).toBe('https://adapter.example.com');
    expect(cfg.organization).toBe('adapter-org');
    expect(cfg.auth.token).toBe('adapter-token');
    expect(cfg.streams.business_events).toBe('business-events');
  });

  it('USER_BEHAVIOR_TRANSPORT endpoint uses adapter baseUrl/organization', async () => {
    jest.mock(
      '../config/environment-adapter',
      () => ({
        EnvironmentAdapter: {
          getOpenObserve: () => ({
            baseUrl: 'https://adapter.example.com',
            organization: 'adapter-org',
            token: 'tkn',
            performance: { batchSize: 50, flushInterval: 2000, timeout: 10000 },
          }),
        },
      }),
      { virtual: true },
    );

    // 拦截构造函数以捕获参数用于断言
    (global as any).__oo_ctor = undefined;
    jest.mock('./openobserve-transport', () => {
      return {
        __esModule: true,
        default: class MockOpenObserveTransport {
          public endpoint: string;
          public token: string;
          constructor(opts: any) {
            this.endpoint = opts.endpoint;
            this.token = opts.token;
            (global as any).__oo_ctor = opts;
          }
        },
      };
    });

    const { LoggingModule } = require('./logging.module');
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [LoggingModule],
    }).compile();

    const transport = moduleRef.get<any>('USER_BEHAVIOR_TRANSPORT');
    expect(transport).toBeTruthy();

    const ctorOpts = (global as any).__oo_ctor;
    expect(String(ctorOpts.endpoint)).toContain(
      'https://adapter.example.com/api/adapter-org/user-behavior/_json',
    );
    expect(String(ctorOpts.token)).toBe('tkn');

    (global as any).__oo_ctor = undefined;
  });
});
