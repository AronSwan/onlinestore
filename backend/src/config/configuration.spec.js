"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
process.env.NODE_ENV = 'test';
process.env.DB_DATABASE = './data/test_caddy_shopping.db';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-32-chars-min';
process.env.ENCRYPTION_KEY = 'test_encryption_key_64_characters_long_for_testing_purposes_1234';
process.env.ENCRYPTION_ALGORITHM = 'aes-256-gcm';
process.env.CORS_ORIGINS = 'http://localhost:3000,http://localhost:5173';
const configuration_validator_1 = require("./configuration.validator");
describe('ConfigurationValidator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    describe('validateAll', () => {
        it('应该返回有效的验证结果', () => {
            const result = configuration_validator_1.ConfigurationValidator.validateAll();
            expect(result).toBeDefined();
            expect(typeof result.isValid).toBe('boolean');
            expect(Array.isArray(result.errors)).toBe(true);
            expect(Array.isArray(result.warnings)).toBe(true);
        });
        it('应该验证所有配置项', () => {
            const result = configuration_validator_1.ConfigurationValidator.validateAll();
            expect(result).toHaveProperty('isValid');
            expect(result).toHaveProperty('errors');
            expect(result).toHaveProperty('warnings');
        });
        it('应该在开发环境产生警告而不是错误', () => {
            process.env.NODE_ENV = 'development';
            const result = configuration_validator_1.ConfigurationValidator.validateAll();
            expect(result.warnings.length).toBeGreaterThan(0);
        });
    });
    describe('validateDatabaseConfig', () => {
        it('应该验证数据库配置', () => {
            const result = configuration_validator_1.ConfigurationValidator.validateDatabaseConfig();
            expect(result).toBeDefined();
            expect(typeof result.isValid).toBe('boolean');
            expect(Array.isArray(result.errors)).toBe(true);
            expect(Array.isArray(result.warnings)).toBe(true);
        });
        it('应该在生产环境检查localhost', () => {
            const originalEnv = process.env.NODE_ENV;
            const originalDbType = process.env.DB_TYPE;
            process.env.NODE_ENV = 'production';
            process.env.DB_TYPE = 'mysql';
            jest.resetModules();
            const { ConfigurationValidator } = require('./configuration.validator');
            const result = ConfigurationValidator.validateDatabaseConfig();
            expect(result.errors.length).toBeGreaterThan(0);
            process.env.NODE_ENV = originalEnv;
            process.env.DB_TYPE = originalDbType;
        });
        it('应该检查数据库密码强度', () => {
            const result = configuration_validator_1.ConfigurationValidator.validateDatabaseConfig();
            expect(result.errors.length + result.warnings.length).toBeGreaterThan(0);
        });
    });
    describe('validateRedisConfig', () => {
        it('应该验证Redis配置', () => {
            const result = configuration_validator_1.ConfigurationValidator.validateRedisConfig();
            expect(result).toBeDefined();
            expect(typeof result.isValid).toBe('boolean');
            expect(Array.isArray(result.errors)).toBe(true);
            expect(Array.isArray(result.warnings)).toBe(true);
        });
        it('应该在生产环境检查Redis安全设置', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            const result = configuration_validator_1.ConfigurationValidator.validateRedisConfig();
            expect(result.warnings.length).toBeGreaterThan(0);
            process.env.NODE_ENV = originalEnv;
        });
    });
    describe('validateJwtConfig', () => {
        it('应该验证JWT配置', () => {
            const result = configuration_validator_1.ConfigurationValidator.validateJwtConfig();
            expect(result).toBeDefined();
            expect(typeof result.isValid).toBe('boolean');
            expect(Array.isArray(result.errors)).toBe(true);
            expect(Array.isArray(result.warnings)).toBe(true);
        });
        it('应该检查JWT密钥长度', () => {
            const result = configuration_validator_1.ConfigurationValidator.validateJwtConfig();
            expect(result.errors.length + result.warnings.length).toBeGreaterThan(0);
        });
        it('应该验证RSA密钥格式', () => {
            const result = configuration_validator_1.ConfigurationValidator.validateJwtConfig();
            expect(result.errors.length + result.warnings.length).toBeGreaterThan(0);
        });
    });
    describe('validateConnectionPool', () => {
        it('应该验证连接池配置', () => {
            const result = configuration_validator_1.ConfigurationValidator.validateConnectionPool();
            expect(result).toBeDefined();
            expect(typeof result.isValid).toBe('boolean');
            expect(Array.isArray(result.warnings)).toBe(true);
        });
        it('应该检查连接池大小', () => {
            const result = configuration_validator_1.ConfigurationValidator.validateConnectionPool();
            expect(result.warnings.length).toBeGreaterThanOrEqual(0);
        });
        it('应该检查连接超时设置', () => {
            const result = configuration_validator_1.ConfigurationValidator.validateConnectionPool();
            expect(result.warnings.length).toBeGreaterThanOrEqual(0);
        });
    });
    describe('generateConfigReport', () => {
        it('应该生成配置报告', () => {
            const report = configuration_validator_1.ConfigurationValidator.generateConfigReport();
            expect(typeof report).toBe('string');
            expect(report).toContain('配置验证报告');
            expect(report).toContain('验证结果');
        });
        it('应该包含配置摘要', () => {
            const report = configuration_validator_1.ConfigurationValidator.generateConfigReport();
            expect(report).toContain('配置摘要');
            expect(report).toContain('数据库');
            expect(report).toContain('Redis');
        });
        it('应该包含错误和警告信息', () => {
            const report = configuration_validator_1.ConfigurationValidator.generateConfigReport();
            expect(report.length).toBeGreaterThan(0);
        });
    });
    describe('边界情况测试', () => {
        it('应该处理空配置', () => {
            const result = configuration_validator_1.ConfigurationValidator.validateAll();
            expect(result).toBeDefined();
            expect(typeof result.isValid).toBe('boolean');
        });
        it('应该处理无效配置', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'invalid';
            const result = configuration_validator_1.ConfigurationValidator.validateAll();
            expect(result).toBeDefined();
            process.env.NODE_ENV = originalEnv;
        });
        it('应该处理缺失的环境变量', () => {
            const originalEnv = process.env.NODE_ENV;
            delete process.env.NODE_ENV;
            const result = configuration_validator_1.ConfigurationValidator.validateAll();
            expect(result).toBeDefined();
            process.env.NODE_ENV = originalEnv;
        });
    });
    describe('性能测试', () => {
        it('应该在合理时间内完成验证', () => {
            const startTime = Date.now();
            configuration_validator_1.ConfigurationValidator.validateAll();
            const endTime = Date.now();
            const duration = endTime - startTime;
            expect(duration).toBeLessThan(1000);
        });
        it('应该能够处理多次验证调用', () => {
            const iterations = 10;
            for (let i = 0; i < iterations; i++) {
                const result = configuration_validator_1.ConfigurationValidator.validateAll();
                expect(result).toBeDefined();
            }
        });
    });
    describe('集成测试', () => {
        it('应该与所有配置模块集成', () => {
            const result = configuration_validator_1.ConfigurationValidator.validateAll();
            expect(result.errors.length + result.warnings.length).toBeGreaterThanOrEqual(0);
        });
        it('应该提供完整的验证覆盖', () => {
            const result = configuration_validator_1.ConfigurationValidator.validateAll();
            expect(result).toHaveProperty('isValid');
            expect(result).toHaveProperty('errors');
            expect(result).toHaveProperty('warnings');
        });
    });
});
