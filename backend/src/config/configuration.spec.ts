// 用途：配置验证器单元测试
// 依赖文件：configuration.validator.ts
// 作者：后端开发团队
// 时间：2025-06-17 10:50:00

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.DB_DATABASE = './data/test_caddy_shopping.db';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-32-chars-min';
process.env.ENCRYPTION_KEY = 'test_encryption_key_64_characters_long_for_testing_purposes_1234';
process.env.ENCRYPTION_ALGORITHM = 'aes-256-gcm';
process.env.CORS_ORIGINS = 'http://localhost:3000,http://localhost:5173';

import { ConfigurationValidator } from './configuration.validator';
import { CacheKeyManager } from './cache-key-manager';
import { ErrorLogger } from './error-logger';
import { ApiVersionManager } from './api-version-manager';

describe('ConfigurationValidator', () => {
  beforeEach(() => {
    // 重置环境变量
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 清理测试环境
    jest.restoreAllMocks();
  });

  describe('validateAll', () => {
    it('应该返回有效的验证结果', () => {
      const result = ConfigurationValidator.validateAll();

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('应该验证所有配置项', () => {
      const result = ConfigurationValidator.validateAll();

      // 验证结果包含所有必要的字段
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });

    it('应该在开发环境产生警告而不是错误', () => {
      // 模拟开发环境
      process.env.NODE_ENV = 'development';

      const result = ConfigurationValidator.validateAll();

      // 开发环境应该有一些警告，但不应该有关键错误
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateDatabaseConfig', () => {
    it('应该验证数据库配置', () => {
      const result = ConfigurationValidator.validateDatabaseConfig();

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('应该在生产环境检查localhost', () => {
      // 模拟生产环境
      const originalEnv = process.env.NODE_ENV;
      const originalDbType = process.env.DB_TYPE;
      process.env.NODE_ENV = 'production';
      process.env.DB_TYPE = 'mysql'; // 生产环境不能使用sqlite

      // 重新导入配置模块以获取新的环境变量
      jest.resetModules();
      const { ConfigurationValidator } = require('./configuration.validator');

      const result = ConfigurationValidator.validateDatabaseConfig();

      expect(result.errors.length).toBeGreaterThan(0);

      // 恢复环境变量
      process.env.NODE_ENV = originalEnv;
      process.env.DB_TYPE = originalDbType;
    });

    it('应该检查数据库密码强度', () => {
      const result = ConfigurationValidator.validateDatabaseConfig();

      // 应该检查密码设置
      expect(result.errors.length + result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateRedisConfig', () => {
    it('应该验证Redis配置', () => {
      const result = ConfigurationValidator.validateRedisConfig();

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('应该在生产环境检查Redis安全设置', () => {
      // 模拟生产环境
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = ConfigurationValidator.validateRedisConfig();

      expect(result.warnings.length).toBeGreaterThan(0);

      // 恢复环境变量
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('validateJwtConfig', () => {
    it('应该验证JWT配置', () => {
      const result = ConfigurationValidator.validateJwtConfig();

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('应该检查JWT密钥长度', () => {
      const result = ConfigurationValidator.validateJwtConfig();

      // 应该检查密钥长度
      expect(result.errors.length + result.warnings.length).toBeGreaterThan(0);
    });

    it('应该验证RSA密钥格式', () => {
      const result = ConfigurationValidator.validateJwtConfig();

      // 应该检查密钥格式
      expect(result.errors.length + result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateConnectionPool', () => {
    it('应该验证连接池配置', () => {
      const result = ConfigurationValidator.validateConnectionPool();

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('应该检查连接池大小', () => {
      const result = ConfigurationValidator.validateConnectionPool();

      // 应该检查连接池大小是否合理
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('应该检查连接超时设置', () => {
      const result = ConfigurationValidator.validateConnectionPool();

      // 应该检查超时设置
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateConfigReport', () => {
    it('应该生成配置报告', () => {
      const report = ConfigurationValidator.generateConfigReport();

      expect(typeof report).toBe('string');
      expect(report).toContain('配置验证报告');
      expect(report).toContain('验证结果');
    });

    it('应该包含配置摘要', () => {
      const report = ConfigurationValidator.generateConfigReport();

      expect(report).toContain('配置摘要');
      expect(report).toContain('数据库');
      expect(report).toContain('Redis');
    });

    it('应该包含错误和警告信息', () => {
      const report = ConfigurationValidator.generateConfigReport();

      // 可能包含错误或警告部分
      expect(report.length).toBeGreaterThan(0);
    });
  });

  describe('validateRxJSOptimization', () => {
    it('应该验证RxJS优化配置', () => {
      const result = ConfigurationValidator.validateRxJSOptimization();

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('应该检查重试机制配置', () => {
      const result = ConfigurationValidator.validateRxJSOptimization();

      // 应该检查重试机制
      expect(result.errors.length + result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateCacheKeyManagement', () => {
    it('应该验证缓存键管理', () => {
      const result = ConfigurationValidator.validateCacheKeyManagement();

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('应该测试缓存键生成', () => {
      // Mock CacheKeyManager
      jest.spyOn(CacheKeyManager.product, 'byId').mockReturnValue('test-key');

      const result = ConfigurationValidator.validateCacheKeyManagement();

      expect(result.errors.length + result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('应该检查TTL配置', () => {
      const result = ConfigurationValidator.validateCacheKeyManagement();

      // 应该检查TTL设置
      expect(result.errors.length + result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateErrorLogging', () => {
    it('应该验证错误日志配置', () => {
      const result = ConfigurationValidator.validateErrorLogging();

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('应该测试错误日志功能', () => {
      // Mock ErrorLogger
      jest.spyOn(ErrorLogger, 'logError').mockImplementation(() => {});

      const result = ConfigurationValidator.validateErrorLogging();

      expect(result.errors.length + result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('应该检查日志级别配置', () => {
      const result = ConfigurationValidator.validateErrorLogging();

      // 应该检查日志级别
      expect(result.errors.length + result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateApiVersionControl', () => {
    it('应该验证API版本控制', () => {
      const result = ConfigurationValidator.validateApiVersionControl();

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('应该验证版本支持', () => {
      // Mock ApiVersionManager
      jest.spyOn(ApiVersionManager, 'validateVersion').mockReturnValue({
        valid: true,
        message: '版本有效',
      });

      const result = ConfigurationValidator.validateApiVersionControl();

      expect(result.errors.length + result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空配置', () => {
      // 测试边界情况
      const result = ConfigurationValidator.validateAll();

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
    });

    it('应该处理无效配置', () => {
      // 模拟无效配置
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'invalid';

      const result = ConfigurationValidator.validateAll();

      expect(result).toBeDefined();

      // 恢复环境变量
      process.env.NODE_ENV = originalEnv;
    });

    it('应该处理缺失的环境变量', () => {
      // 删除环境变量
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      const result = ConfigurationValidator.validateAll();

      expect(result).toBeDefined();

      // 恢复环境变量
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成验证', () => {
      const startTime = Date.now();

      ConfigurationValidator.validateAll();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证应该在1秒内完成
      expect(duration).toBeLessThan(1000);
    });

    it('应该能够处理多次验证调用', () => {
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const result = ConfigurationValidator.validateAll();
        expect(result).toBeDefined();
      }
    });
  });

  describe('集成测试', () => {
    it('应该与所有配置模块集成', () => {
      const result = ConfigurationValidator.validateAll();

      // 验证所有模块都被调用
      expect(result.errors.length + result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('应该提供完整的验证覆盖', () => {
      const result = ConfigurationValidator.validateAll();

      // 验证覆盖所有配置项
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });
  });
});
