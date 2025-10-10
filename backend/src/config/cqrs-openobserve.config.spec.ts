import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

/**
 * 用途：cqrs-openobserve 配置的单元测试，验证“适配器优先、env 兜底”策略与默认值
 * 作者：后端开发团队
 * 时间：2025-10-09
 */

// 为 Nest registerAs 提供最简实现：返回工厂函数自身
jest.mock('@nestjs/config', () => ({
  registerAs: (key: string, factory: Function) => factory,
}));

describe('cqrs-openobserve.config (adapter priority with env fallback)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.OPENOBSERVE_URL;
    delete process.env.OPENOBSERVE_ORG;
    delete process.env.OPENOBSERVE_TOKEN;
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env = originalEnv;
  });

  it('defaults when env not set and adapter missing', () => {
    // 模拟适配器模块不存在/不可用
    jest.doMock('./environment-adapter', () => ({
      EnvironmentAdapter: {
        getOpenObserve: () => ({ baseUrl: '', organization: '', token: '' }),
      },
    }));

    const mod = require('./cqrs-openobserve.config');
    const getter = mod.default as unknown as () => any;
    const cfg = getter();

    expect(cfg.baseUrl).toBe('http://localhost:5080');
    expect(cfg.organization).toBe('default');
    expect(cfg.token).toBe('');
    expect(cfg.endpoints.logs).toBe('http://localhost:5080/otlp/v1/logs');
    expect(cfg.performance.batchSize).toBeGreaterThan(0);
    expect(cfg.streams.commands).toBeTruthy();
  });

  it('maps env variables correctly when adapter empty', () => {
    jest.doMock('./environment-adapter', () => ({
      EnvironmentAdapter: {
        getOpenObserve: () => ({ baseUrl: '', organization: '', token: '' }),
      },
    }));

    process.env.OPENOBSERVE_URL = 'https://oo.example.com';
    process.env.OPENOBSERVE_ORG = 'shop';
    process.env.OPENOBSERVE_TOKEN = 'env-token';
    process.env.CQRS_STREAM_COMMANDS = 'cmds';

    const mod = require('./cqrs-openobserve.config');
    const getter = mod.default as unknown as () => any;
    const cfg = getter();

    expect(cfg.baseUrl).toBe('https://oo.example.com');
    expect(cfg.organization).toBe('shop');
    expect(cfg.token).toBe('env-token');
    expect(cfg.streams.commands).toBe('cmds');
    expect(cfg.endpoints.traces).toBe('https://oo.example.com/otlp/v1/traces');
  });

  it('uses adapter values when available (adapter priority)', () => {
    // 适配器提供完整值，应优先使用
    jest.doMock('./environment-adapter', () => ({
      EnvironmentAdapter: {
        getOpenObserve: () => ({
          baseUrl: 'https://adapter.example.com',
          organization: 'adapter-org',
          token: 'adapter-token',
          streams: { commands: 'a-cmds', queries: 'a-queries', events: 'a-events', metrics: 'a-metrics', traces: 'a-traces' },
          performance: { batchSize: 200, flushInterval: 3000, maxRetries: 5, timeout: 15000 },
          tracing: { enabled: true, samplingRate: 0.5 },
          alerts: { enabled: true, evaluationInterval: 120000 },
        }),
      },
    }));

    // 即便 env 也设置，仍应采用适配器值
    process.env.OPENOBSERVE_URL = 'https://env.example.com';
    process.env.OPENOBSERVE_ORG = 'env-org';
    process.env.OPENOBSERVE_TOKEN = 'env-token';

    const mod = require('./cqrs-openobserve.config');
    const getter = mod.default as unknown as () => any;
    const cfg = getter();

    expect(cfg.baseUrl).toBe('https://adapter.example.com');
    expect(cfg.organization).toBe('adapter-org');
    expect(cfg.token).toBe('adapter-token');
    // endpoints 应基于适配器 baseUrl 构造
    expect(cfg.endpoints.logs).toBe('https://adapter.example.com/otlp/v1/logs');
    expect(cfg.endpoints.metrics).toBe('https://adapter.example.com/otlp/v1/metrics');
    expect(cfg.endpoints.traces).toBe('https://adapter.example.com/otlp/v1/traces');
    // streams/performance/tracing/alerts 保持当前文件的 env 映射逻辑，不在此强断言具体数值
    expect(cfg.streams).toBeTruthy();
    expect(cfg.performance).toBeTruthy();
    expect(cfg.tracing).toBeTruthy();
    expect(cfg.alerts).toBeTruthy();
  });
});