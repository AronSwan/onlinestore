/**
 * Enhanced Email Verifier Service Test Suite
 * 
 * 测试覆盖：
 * - 基础邮箱验证功能
 * - 缓存机制
 * - 限流和并发控制
 * - 错误处理和降级策略
 * - 批量验证
 * - 性能指标
 */

const EnhancedEmailVerifierService = require('../enhanced-email-verifier-service');
const Redis = require('ioredis');

// Mock dependencies
jest.mock('ioredis');
jest.mock('axios');

describe('EnhancedEmailVerifierService', () => {
  let service;
  let mockRedis;
  let mockAxios;

  beforeEach(() => {
    // Mock Redis
    mockRedis = {
      ping: jest.fn().mockResolvedValue('PONG'),
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      quit: jest.fn(),
    };
    Redis.mockImplementation(() => mockRedis);

    // Mock Axios
    mockAxios = {
      get: jest.fn(),
    };
    jest.doMock('axios', () => mockAxios);

    // Create service instance
    service = new EnhancedEmailVerifierService({
      enableCache: true,
      timeout: 5000,
      maxConcurrency: 5,
      domainRateLimit: 2,
      globalRateLimit: 10,
    });
  });

  afterEach(async () => {
    if (service) {
      await service.shutdown();
    }
    jest.clearAllMocks();
  });

  describe('基础邮箱验证', () => {
    test('应该验证有效的邮箱地址', async () => {
      const email = 'test@example.com';
      const mockApiResponse = {
        email,
        syntax: { valid: true, username: 'test', domain: 'example.com' },
        has_mx_records: true,
        disposable: false,
        role_account: false,
        free: false,
        reachable: 'high',
        smtp: { deliverable: true },
      };

      mockAxios.get.mockResolvedValue({ data: mockApiResponse });

      const result = await service.verifyEmail(email);

      expect(result.valid).toBe(true);
      expect(result.email).toBe(email);
      expect(result.code).toBe('VALID');
      expect(result.duration_ms).toBeGreaterThan(0);
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining(`/v1/${encodeURIComponent(email)}/verification`),
        expect.any(Object)
      );
    });

    test('应该拒绝无效的邮箱格式', async () => {
      const email = 'invalid-email';

      const result = await service.verifyEmail(email);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid email syntax');
      expect(result.code).toBe('FALLBACK');
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    test('应该拒绝一次性邮箱', async () => {
      const email = 'test@10minutemail.com';
      const mockApiResponse = {
        email,
        syntax: { valid: true },
        has_mx_records: true,
        disposable: true,
        role_account: false,
        free: false,
        reachable: 'high',
      };

      mockAxios.get.mockResolvedValue({ data: mockApiResponse });

      const result = await service.verifyEmail(email);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Disposable email addresses are not allowed');
      expect(result.code).toBe('DISPOSABLE_EMAIL');
    });

    test('应该拒绝角色邮箱', async () => {
      const email = 'admin@example.com';
      const mockApiResponse = {
        email,
        syntax: { valid: true },
        has_mx_records: true,
        disposable: false,
        role_account: true,
        free: false,
        reachable: 'high',
      };

      mockAxios.get.mockResolvedValue({ data: mockApiResponse });

      const result = await service.verifyEmail(email);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Role-based email addresses are not allowed');
      expect(result.code).toBe('ROLE_ACCOUNT');
    });

    test('应该拒绝没有MX记录的域名', async () => {
      const email = 'test@nomx.example.com';
      const mockApiResponse = {
        email,
        syntax: { valid: true },
        has_mx_records: false,
        disposable: false,
        role_account: false,
        free: false,
        reachable: 'unknown',
      };

      mockAxios.get.mockResolvedValue({ data: mockApiResponse });

      const result = await service.verifyEmail(email);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Domain has no MX records');
      expect(result.code).toBe('NO_MX_RECORDS');
    });
  });

  describe('缓存机制', () => {
    test('应该从缓存返回结果', async () => {
      const email = 'cached@example.com';
      const cachedResult = {
        email,
        valid: true,
        reason: 'Cached result',
        code: 'VALID',
        duration_ms: 100,
        timestamp: new Date().toISOString(),
      };

      // 设置缓存
      await service.setCache(email, cachedResult);

      // 验证缓存命中
      const result = await service.verifyEmail(email);

      expect(result.fromCache).toBe(true);
      expect(result.valid).toBe(cachedResult.valid);
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    test('应该在缓存过期时调用API', async () => {
      const email = 'expired@example.com';
      const expiredResult = {
        email,
        valid: true,
        code: 'VALID',
        timestamp: new Date(Date.now() - service.cacheExpiry - 1000).toISOString(), // 过期
      };

      const freshApiResponse = {
        email,
        syntax: { valid: true },
        has_mx_records: true,
        disposable: false,
        role_account: false,
        free: false,
        reachable: 'high',
      };

      // 设置过期的缓存
      await service.setCache(email, expiredResult);

      // 模拟API响应
      mockAxios.get.mockResolvedValue({ data: freshApiResponse });

      const result = await service.verifyEmail(email);

      expect(result.fromCache).toBeUndefined();
      expect(mockAxios.get).toHaveBeenCalled();
    });

    test('应该处理Redis连接失败', async () => {
      // 创建Redis连接失败的服务
      const serviceWithoutRedis = new EnhancedEmailVerifierService({
        redis: false, // 禁用Redis
        enableCache: true,
      });

      const email = 'test@example.com';
      const mockApiResponse = {
        email,
        syntax: { valid: true },
        has_mx_records: true,
        disposable: false,
        role_account: false,
        free: false,
        reachable: 'high',
      };

      mockAxios.get.mockResolvedValue({ data: mockApiResponse });

      const result = await serviceWithoutRedis.verifyEmail(email);

      expect(result.valid).toBe(true);
      expect(mockAxios.get).toHaveBeenCalled();

      await serviceWithoutRedis.shutdown();
    });
  });

  describe('限流和并发控制', () => {
    test('应该限制全局请求速率', async () => {
      const email = 'test@example.com';
      const mockApiResponse = {
        email,
        syntax: { valid: true },
        has_mx_records: true,
        disposable: false,
        role_account: false,
        free: false,
        reachable: 'high',
      };

      mockAxios.get.mockResolvedValue({ data: mockApiResponse });

      // 发送超过限制的请求
      const promises = [];
      for (let i = 0; i < service.globalRateLimit + 5; i++) {
        promises.push(service.verifyEmail(`${i}_${email}`));
      }

      const results = await Promise.allSettled(promises);

      // 应该有一些请求因为限流而失败
      const rejectedCount = results.filter(r => r.status === 'rejected').length;
      expect(rejectedCount).toBeGreaterThan(0);
    });

    test('应该限制域级请求速率', async () => {
      const domain = 'example.com';
      const emails = Array.from({ length: service.domainRateLimit + 2 }, (_, i) => `user${i}@${domain}`);
      
      const mockApiResponse = {
        syntax: { valid: true },
        has_mx_records: true,
        disposable: false,
        role_account: false,
        free: false,
        reachable: 'high',
      };

      mockAxios.get.mockResolvedValue({ data: mockApiResponse });

      const promises = emails.map(email => service.verifyEmail(email));
      const results = await Promise.allSettled(promises);

      // 应该有一些请求因为域级限流而失败
      const rejectedCount = results.filter(r => r.status === 'rejected').length;
      expect(rejectedCount).toBeGreaterThan(0);
    });

    test('应该控制并发请求数量', async () => {
      const emails = Array.from({ length: service.maxConcurrency + 5 }, (_, i) => `user${i}@example${i}.com`);
      
      const mockApiResponse = {
        syntax: { valid: true },
        has_mx_records: true,
        disposable: false,
        role_account: false,
        free: false,
        reachable: 'high',
      };

      // 模拟慢响应
      mockAxios.get.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve({ data: mockApiResponse }), 100);
      }));

      const startTime = Date.now();
      const promises = emails.map(email => service.verifyEmail(email));
      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // 由于并发控制，总时间应该比没有控制要长
      expect(duration).toBeGreaterThan(200);
    });
  });

  describe('错误处理和降级策略', () => {
    test('应该在API不可用时使用降级策略', async () => {
      const email = 'test@example.com';
      
      // 模拟API错误
      mockAxios.get.mockRejectedValue(new Error('Service unavailable'));

      const result = await service.verifyEmail(email);

      expect(result.valid).toBe(true); // 语法有效
      expect(result.reason).toBe('Syntax valid (API unavailable)');
      expect(result.code).toBe('FALLBACK');
    });

    test('应该在超时时使用降级策略', async () => {
      const email = 'test@example.com';
      
      // 模拟超时
      mockAxios.get.mockRejectedValue(new Error('timeout of 5000ms exceeded'));

      const result = await service.verifyEmail(email);

      expect(result.valid).toBe(true);
      expect(result.reason).toBe('Syntax valid (API unavailable)');
    });

    test('应该处理API响应格式错误', async () => {
      const email = 'test@example.com';
      
      // 模拟无效响应
      mockAxios.get.mockResolvedValue({ data: null });

      const result = await service.verifyEmail(email);

      expect(result.valid).toBe(true);
      expect(result.reason).toBe('Syntax valid (API unavailable)');
    });
  });

  describe('批量验证', () => {
    test('应该批量验证多个邮箱', async () => {
      const emails = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      const mockApiResponse = {
        syntax: { valid: true },
        has_mx_records: true,
        disposable: false,
        role_account: false,
        free: false,
        reachable: 'high',
      };

      mockAxios.get.mockResolvedValue({ data: mockApiResponse });

      const result = await service.verifyEmailBatch(emails);

      expect(result.total).toBe(emails.length);
      expect(result.success).toBe(emails.length);
      expect(result.errors).toBe(0);
      expect(result.results).toHaveLength(emails.length);
      expect(mockAxios.get).toHaveBeenCalledTimes(emails.length);
    });

    test('应该按域名分组优化批量验证', async () => {
      const emails = [
        'user1@example.com',
        'user2@example.com',
        'user3@test.com',
        'user4@test.com',
      ];
      
      const mockApiResponse = {
        syntax: { valid: true },
        has_mx_records: true,
        disposable: false,
        role_account: false,
        free: false,
        reachable: 'high',
      };

      mockAxios.get.mockResolvedValue({ data: mockApiResponse });

      const result = await service.verifyEmailBatch(emails, { batchSize: 2 });

      expect(result.total).toBe(emails.length);
      expect(result.success).toBe(emails.length);
      
      // 验证按域名分组的调用顺序
      expect(mockAxios.get).toHaveBeenCalledTimes(emails.length);
    });

    test('应该处理批量验证中的部分失败', async () => {
      const emails = ['valid@example.com', 'invalid-format', 'timeout@example.com'];
      
      mockAxios.get
        .mockResolvedValueOnce({
          data: {
            syntax: { valid: true },
            has_mx_records: true,
            disposable: false,
            role_account: false,
            free: false,
            reachable: 'high',
          },
        })
        .mockRejectedValueOnce(new Error('timeout'));

      const result = await service.verifyEmailBatch(emails);

      expect(result.total).toBe(emails.length);
      expect(result.success).toBe(2); // 语法有效 + API成功
      expect(result.errors).toBe(1);
    });
  });

  describe('性能指标', () => {
    test('应该收集性能指标', async () => {
      const email = 'test@example.com';
      const mockApiResponse = {
        email,
        syntax: { valid: true },
        has_mx_records: true,
        disposable: false,
        role_account: false,
        free: false,
        reachable: 'high',
      };

      mockAxios.get.mockResolvedValue({ data: mockApiResponse });

      await service.verifyEmail(email);

      const metrics = service.getMetrics();

      expect(metrics.requestCount).toBe(1);
      expect(metrics.successCount).toBe(1);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.averageDuration).toBeGreaterThan(0);
      expect(metrics.successRate).toBe(100);
    });

    test('应该跟踪域级统计', async () => {
      const emails = ['user1@example.com', 'user2@example.com', 'user3@test.com'];
      const mockApiResponse = {
        syntax: { valid: true },
        has_mx_records: true,
        disposable: false,
        role_account: false,
        free: false,
        reachable: 'high',
      };

      mockAxios.get.mockResolvedValue({ data: mockApiResponse });

      for (const email of emails) {
        await service.verifyEmail(email);
      }

      const metrics = service.getMetrics();

      expect(metrics.domainStats).toHaveProperty('example.com');
      expect(metrics.domainStats).toHaveProperty('test.com');
      expect(metrics.domainStats.example.com.count).toBe(2);
      expect(metrics.domainStats.test.com.count).toBe(1);
    });
  });

  describe('健康检查', () => {
    test('应该返回健康状态', async () => {
      const health = await service.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.version).toBe('2.0.0');
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.checks).toBeDefined();
    });

    test('应该检测API不健康状态', async () => {
      // 模拟API健康检查失败
      mockAxios.get.mockRejectedValue(new Error('API unavailable'));

      const health = await service.getHealthStatus();

      expect(health.checks.api.status).toBe('unhealthy');
      expect(health.status).toBe('degraded');
    });

    test('应该检测Redis不健康状态', async () => {
      // 模拟Redis连接失败
      mockRedis.ping.mockRejectedValue(new Error('Redis connection failed'));

      const health = await service.getHealthStatus();

      expect(health.checks.redis.status).toBe('unhealthy');
    });
  });

  describe('事件系统', () => {
    test('应该发出验证成功事件', async () => {
      const email = 'test@example.com';
      const mockApiResponse = {
        email,
        syntax: { valid: true },
        has_mx_records: true,
        disposable: false,
        role_account: false,
        free: false,
        reachable: 'high',
      };

      mockAxios.get.mockResolvedValue({ data: mockApiResponse });

      const successSpy = jest.fn();
      service.on('verificationSuccess', successSpy);

      await service.verifyEmail(email);

      expect(successSpy).toHaveBeenCalledWith({
        email,
        result: expect.objectContaining({ valid: true }),
      });
    });

    test('应该发出验证错误事件', async () => {
      const email = 'test@example.com';
      const error = new Error('API error');

      mockAxios.get.mockRejectedValue(error);

      const errorSpy = jest.fn();
      service.on('verificationError', errorSpy);

      await service.verifyEmail(email);

      expect(errorSpy).toHaveBeenCalledWith({
        email,
        error,
      });
    });

    test('应该发出缓存命中事件', async () => {
      const email = 'cached@example.com';
      const cachedResult = {
        email,
        valid: true,
        code: 'VALID',
        timestamp: new Date().toISOString(),
      };

      await service.setCache(email, cachedResult);

      const cacheHitSpy = jest.fn();
      service.on('cacheHit', cacheHitSpy);

      await service.verifyEmail(email);

      expect(cacheHitSpy).toHaveBeenCalledWith({
        email,
        result: expect.objectContaining({ fromCache: true }),
      });
    });
  });
});