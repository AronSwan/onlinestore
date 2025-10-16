/**
 * 配置管理模块单元测试
 *
 * 测试覆盖：
 * 1. 配置加载和验证
 * 2. 配置获取和设置
 * 3. 配置重置和默认值
 * 4. 环境变量支持
 *
 * @author 后端开发团队
 * @version 2.0.0
 * @since 2025-10-13
 */

const Config = require('../../shared/config');
const fs = require('fs').promises;
const path = require('path');

// 测试配置
const TEST_CONFIG = {
  keyStorage: {
    path: path.join(__dirname, '../test-keys'),
    backupPath: path.join(__dirname, '../test-keys/backup'),
    rotationInterval: 1000,
  },
  security: {
    level: 'high',
    minPassphraseLength: 16,
    enforceStrongPassphrase: true,
  },
  signatureService: {
    defaultFormat: 'hex',
    timestampEnabled: true,
    detachedSignatures: false,
  },
  logging: {
    level: 'debug',
    file: path.join(__dirname, '../test-logs/test.log'),
  },
};

describe('配置管理模块测试', () => {
  let config;

  beforeEach(() => {
    config = new Config();
    // 重置为默认配置
    config.resetToDefaults();
  });

  afterEach(async () => {
    // 清理测试文件
    try {
      await fs.rm(path.join(__dirname, '../test-keys'), { recursive: true, force: true });
      await fs.rm(path.join(__dirname, '../test-logs'), { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('配置加载和验证', () => {
    test('应该成功加载默认配置', () => {
      const allConfig = config.getAll();

      expect(allConfig).toBeDefined();
      expect(allConfig.keyStorage).toBeDefined();
      expect(allConfig.security).toBeDefined();
      expect(allConfig.signatureService).toBeDefined();
      expect(allConfig.logging).toBeDefined();
    });

    test('应该验证配置完整性', () => {
      const isValid = config.validateConfig();

      expect(isValid).toBe(true);
    });

    test('应该检测无效配置', () => {
      // 设置无效配置
      config.set('keyStorage.path', '');

      const isValid = config.validateConfig();

      expect(isValid).toBe(false);
    });

    test('应该从文件加载配置', async () => {
      const configFile = path.join(__dirname, '../test-config.json');
      const testConfig = {
        keyStorage: {
          path: '/custom/path',
        },
      };

      await fs.writeFile(configFile, JSON.stringify(testConfig, null, 2));

      await config.loadFromFile(configFile);

      const loadedConfig = config.get('keyStorage.path');
      expect(loadedConfig).toBe('/custom/path');

      // 清理
      await fs.unlink(configFile);
    });

    test('应该处理配置文件不存在的情况', async () => {
      await expect(config.loadFromFile('/nonexistent/file.json')).rejects.toThrow();
    });
  });

  describe('配置获取和设置', () => {
    test('应该获取配置值', () => {
      const securityLevel = config.get('security.level');

      expect(securityLevel).toBeDefined();
      expect(typeof securityLevel).toBe('string');
    });

    test('应该设置配置值', () => {
      config.set('security.level', 'ultra');

      const securityLevel = config.get('security.level');
      expect(securityLevel).toBe('ultra');
    });

    test('应该设置嵌套配置值', () => {
      config.set('keyStorage.backup.enabled', true);

      const backupEnabled = config.get('keyStorage.backup.enabled');
      expect(backupEnabled).toBe(true);
    });

    test('应该获取不存在的配置返回undefined', () => {
      const nonexistent = config.get('nonexistent.property');

      expect(nonexistent).toBeUndefined();
    });

    test('应该获取带默认值的配置', () => {
      const value = config.get('nonexistent.property', 'default-value');

      expect(value).toBe('default-value');
    });

    test('应该检查配置是否存在', () => {
      const exists = config.has('security.level');
      const notExists = config.has('nonexistent.property');

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });
  });

  describe('配置重置和默认值', () => {
    test('应该重置为默认配置', () => {
      // 修改配置
      config.set('security.level', 'custom');
      config.set('keyStorage.path', '/custom/path');

      // 重置
      config.resetToDefaults();

      const securityLevel = config.get('security.level');
      const keyStoragePath = config.get('keyStorage.path');

      expect(securityLevel).not.toBe('custom');
      expect(keyStoragePath).not.toBe('/custom/path');
    });

    test('应该获取默认配置值', () => {
      const defaults = config.getDefaults();

      expect(defaults).toBeDefined();
      expect(defaults.keyStorage).toBeDefined();
      expect(defaults.security).toBeDefined();
    });

    test('应该合并配置', () => {
      const customConfig = {
        security: {
          level: 'custom',
        },
        newSection: {
          enabled: true,
        },
      };

      config.merge(customConfig);

      const securityLevel = config.get('security.level');
      const newSectionEnabled = config.get('newSection.enabled');

      expect(securityLevel).toBe('custom');
      expect(newSectionEnabled).toBe(true);
    });
  });

  describe('环境变量支持', () => {
    beforeEach(() => {
      // 设置测试环境变量
      process.env.SIGNATURE_MANAGER_SECURITY_LEVEL = 'high';
      process.env.SIGNATURE_MANAGER_KEY_STORAGE_PATH = '/env/path';
    });

    afterEach(() => {
      // 清理环境变量
      delete process.env.SIGNATURE_MANAGER_SECURITY_LEVEL;
      delete process.env.SIGNATURE_MANAGER_KEY_STORAGE_PATH;
    });

    test('应该从环境变量加载配置', () => {
      config.loadFromEnv();

      const securityLevel = config.get('security.level');
      const keyStoragePath = config.get('keyStorage.path');

      expect(securityLevel).toBe('high');
      expect(keyStoragePath).toBe('/env/path');
    });

    test('应该处理环境变量前缀', () => {
      process.env.CUSTOM_PREFIX_SECURITY_LEVEL = 'ultra';

      config.loadFromEnv('CUSTOM_PREFIX_');

      const securityLevel = config.get('security.level');
      expect(securityLevel).toBe('ultra');

      delete process.env.CUSTOM_PREFIX_SECURITY_LEVEL;
    });
  });

  describe('配置持久化', () => {
    test('应该保存配置到文件', async () => {
      const configFile = path.join(__dirname, '../test-save-config.json');

      // 修改配置
      config.set('security.level', 'saved-level');

      await config.saveToFile(configFile);

      // 验证文件存在且内容正确
      const fileContent = await fs.readFile(configFile, 'utf8');
      const savedConfig = JSON.parse(fileContent);

      expect(savedConfig.security.level).toBe('saved-level');

      // 清理
      await fs.unlink(configFile);
    });

    test('应该处理保存错误', async () => {
      const invalidPath = 'C:\\invalid\\path\\with\\reserved\\characters\\<test>.json';

      await expect(config.saveToFile(invalidPath)).rejects.toThrow();
    });
  });

  describe('配置验证', () => {
    test('应该验证密钥存储配置', () => {
      const validation = config.validateKeyStorageConfig();

      expect(validation.valid).toBe(true);
    });

    test('应该验证安全配置', () => {
      const validation = config.validateSecurityConfig();

      expect(validation.valid).toBe(true);
    });

    test('应该验证签名服务配置', () => {
      const validation = config.validateSignatureServiceConfig();

      expect(validation.valid).toBe(true);
    });

    test('应该检测无效的密钥存储路径', () => {
      config.set('keyStorage.path', '');

      const validation = config.validateKeyStorageConfig();

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('密钥存储路径不能为空');
    });

    test('应该检测无效的安全级别', () => {
      config.set('security.level', 'invalid-level');

      const validation = config.validateSecurityConfig();

      expect(validation.valid).toBe(false);
    });
  });

  describe('配置事件', () => {
    test('应该触发配置变更事件', done => {
      config.on('configChanged', (key, oldValue, newValue) => {
        expect(key).toBe('security.level');
        expect(oldValue).toBe('high');
        expect(newValue).toBe('ultra');
        done();
      });

      config.set('security.level', 'ultra');
    });

    test('应该触发配置重置事件', done => {
      config.on('configReset', () => {
        done();
      });

      config.resetToDefaults();
    });
  });
});
