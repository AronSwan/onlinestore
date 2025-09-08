/**
 * 密码安全处理模块测试
 * 测试密码哈希、盐值生成、验证等功能
 */
const PasswordSecurity = require('../js/password-security.js');

describe('PasswordSecurity', () => {
  let passwordSecurity;

  beforeEach(() => {
    passwordSecurity = new PasswordSecurity();
  });

  describe('环境检查', () => {
    test('应该正确识别 Node.js 环境', () => {
      expect(passwordSecurity.environment).toBe('node');
    });

    test('应该有正确的配置', () => {
      const config = passwordSecurity.config;
      expect(config.pbkdf2.iterations).toBeGreaterThanOrEqual(100000);
      expect(config.pbkdf2.keyLength).toBe(64);
      expect(config.pbkdf2.digest).toBe('sha512');
      expect(config.salt.length).toBe(32);
    });
  });

  describe('盐值生成', () => {
    test('应该生成指定长度的盐值', async () => {
      const salt = await passwordSecurity.generateSalt(16);
      expect(typeof salt).toBe('string');
      expect(salt.length).toBeGreaterThan(0);
      
      // Base64 编码的 16 字节应该是 24 个字符（包含可能的填充）
      const expectedLength = Math.ceil(16 * 4 / 3);
      expect(salt.length).toBeGreaterThanOrEqual(expectedLength - 2);
      expect(salt.length).toBeLessThanOrEqual(expectedLength + 2);
    });

    test('应该生成默认长度的盐值', async () => {
      const salt = await passwordSecurity.generateSalt();
      expect(typeof salt).toBe('string');
      expect(salt.length).toBeGreaterThan(0);
    });

    test('每次生成的盐值应该不同', async () => {
      const salt1 = await passwordSecurity.generateSalt();
      const salt2 = await passwordSecurity.generateSalt();
      expect(salt1).not.toBe(salt2);
    });
  });

  describe('密码哈希', () => {
    test('应该成功哈希密码', async () => {
      const password = 'TestPassword123!';
      const salt = await passwordSecurity.generateSalt();
      const hash = await passwordSecurity.hashPassword(password, salt);
      
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    test('相同密码和盐值应该产生相同哈希', async () => {
      const password = 'TestPassword123!';
      const salt = await passwordSecurity.generateSalt();
      
      const hash1 = await passwordSecurity.hashPassword(password, salt);
      const hash2 = await passwordSecurity.hashPassword(password, salt);
      
      expect(hash1).toBe(hash2);
    });

    test('不同盐值应该产生不同哈希', async () => {
      const password = 'TestPassword123!';
      const salt1 = await passwordSecurity.generateSalt();
      const salt2 = await passwordSecurity.generateSalt();
      
      const hash1 = await passwordSecurity.hashPassword(password, salt1);
      const hash2 = await passwordSecurity.hashPassword(password, salt2);
      
      expect(hash1).not.toBe(hash2);
    });

    test('应该拒绝无效输入', async () => {
      const salt = await passwordSecurity.generateSalt();
      
      await expect(passwordSecurity.hashPassword('', salt))
        .rejects.toThrow('密码必须是非空字符串');
      
      await expect(passwordSecurity.hashPassword(null, salt))
        .rejects.toThrow('密码必须是非空字符串');
      
      await expect(passwordSecurity.hashPassword('password', ''))
        .rejects.toThrow('盐值必须是非空字符串');
      
      await expect(passwordSecurity.hashPassword('password', null))
        .rejects.toThrow('盐值必须是非空字符串');
    });
  });

  describe('完整密码哈希创建', () => {
    test('应该创建完整的密码哈希对象', async () => {
      const password = 'TestPassword123!';
      const result = await passwordSecurity.createPasswordHash(password);
      
      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('salt');
      expect(result).toHaveProperty('algorithm', 'PBKDF2');
      expect(result).toHaveProperty('iterations');
      expect(result).toHaveProperty('keyLength');
      expect(result).toHaveProperty('digest');
      expect(result).toHaveProperty('timestamp');
      
      expect(typeof result.hash).toBe('string');
      expect(typeof result.salt).toBe('string');
      expect(result.iterations).toBeGreaterThanOrEqual(100000);
    });

    test('每次创建应该产生不同的哈希和盐值', async () => {
      const password = 'TestPassword123!';
      const result1 = await passwordSecurity.createPasswordHash(password);
      const result2 = await passwordSecurity.createPasswordHash(password);
      
      expect(result1.hash).not.toBe(result2.hash);
      expect(result1.salt).not.toBe(result2.salt);
    });
  });

  describe('密码验证', () => {
    test('应该验证正确的密码', async () => {
      const password = 'TestPassword123!';
      const hashInfo = await passwordSecurity.createPasswordHash(password);
      
      const isValid = await passwordSecurity.verifyPassword(password, hashInfo);
      expect(isValid).toBe(true);
    });

    test('应该拒绝错误的密码', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hashInfo = await passwordSecurity.createPasswordHash(password);
      
      const isValid = await passwordSecurity.verifyPassword(wrongPassword, hashInfo);
      expect(isValid).toBe(false);
    });

    test('应该处理无效的哈希信息', async () => {
      const password = 'TestPassword123!';
      
      await expect(passwordSecurity.verifyPassword(password, null))
        .rejects.toThrow('存储的哈希信息不完整');
      
      await expect(passwordSecurity.verifyPassword(password, {}))
        .rejects.toThrow('存储的哈希信息不完整');
      
      await expect(passwordSecurity.verifyPassword(password, { hash: 'test' }))
        .rejects.toThrow('存储的哈希信息不完整');
    });
  });

  describe('安全字符串比较', () => {
    test('应该正确比较相同字符串', () => {
      const str = 'teststring';
      expect(passwordSecurity.secureCompare(str, str)).toBe(true);
    });

    test('应该正确比较不同字符串', () => {
      expect(passwordSecurity.secureCompare('test1', 'test2')).toBe(false);
    });

    test('应该处理不同长度的字符串', () => {
      expect(passwordSecurity.secureCompare('short', 'longer')).toBe(false);
      expect(passwordSecurity.secureCompare('longer', 'short')).toBe(false);
    });

    test('应该处理空字符串', () => {
      expect(passwordSecurity.secureCompare('', '')).toBe(true);
      expect(passwordSecurity.secureCompare('test', '')).toBe(false);
      expect(passwordSecurity.secureCompare('', 'test')).toBe(false);
    });
  });

  describe('重新哈希检查', () => {
    test('应该识别需要重新哈希的情况', () => {
      // 空哈希信息
      expect(passwordSecurity.needsRehash(null)).toBe(true);
      expect(passwordSecurity.needsRehash(undefined)).toBe(true);
      
      // 旧算法
      expect(passwordSecurity.needsRehash({ algorithm: 'MD5' })).toBe(true);
      
      // 迭代次数不足
      expect(passwordSecurity.needsRehash({
        algorithm: 'PBKDF2',
        iterations: 50000,
        keyLength: 64,
        digest: 'sha512'
      })).toBe(true);
      
      // 密钥长度不匹配
      expect(passwordSecurity.needsRehash({
        algorithm: 'PBKDF2',
        iterations: 100000,
        keyLength: 32,
        digest: 'sha512'
      })).toBe(true);
      
      // 哈希算法不匹配
      expect(passwordSecurity.needsRehash({
        algorithm: 'PBKDF2',
        iterations: 100000,
        keyLength: 64,
        digest: 'sha256'
      })).toBe(true);
    });

    test('应该识别不需要重新哈希的情况', () => {
      expect(passwordSecurity.needsRehash({
        algorithm: 'PBKDF2',
        iterations: 100000,
        keyLength: 64,
        digest: 'sha512'
      })).toBe(false);
    });
  });

  describe('重置令牌生成', () => {
    test('应该生成重置令牌', async () => {
      const token = await passwordSecurity.generateResetToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    test('每次生成的令牌应该不同', async () => {
      const token1 = await passwordSecurity.generateResetToken();
      const token2 = await passwordSecurity.generateResetToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('安全信息获取', () => {
    test('应该返回安全配置信息', () => {
      const info = passwordSecurity.getSecurityInfo();
      
      expect(info).toHaveProperty('algorithm', 'PBKDF2');
      expect(info).toHaveProperty('iterations');
      expect(info).toHaveProperty('keyLength');
      expect(info).toHaveProperty('digest');
      expect(info).toHaveProperty('saltLength');
      expect(info).toHaveProperty('environment');
      expect(info).toHaveProperty('supportedFeatures');
      
      expect(info.iterations).toBeGreaterThanOrEqual(100000);
      expect(info.environment).toBe('node');
      expect(info.supportedFeatures.nodeCrypto).toBe(true);
    });
  });

  describe('工具方法', () => {
    test('Base64 编码解码应该正确', () => {
      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      const base64 = passwordSecurity.arrayBufferToBase64(testData);
      const decoded = passwordSecurity.base64ToArrayBuffer(base64);
      const decodedArray = new Uint8Array(decoded);
      
      expect(decodedArray).toEqual(testData);
    });
  });

  describe('性能测试', () => {
    test('密码哈希应该在合理时间内完成', async () => {
      const password = 'TestPassword123!';
      const startTime = Date.now();
      
      await passwordSecurity.createPasswordHash(password);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 应该在 5 秒内完成（在大多数现代硬件上应该更快）
      expect(duration).toBeLessThan(5000);
    }, 10000); // 设置较长的超时时间
  });

  describe('边界情况', () => {
    test('应该处理极长密码', async () => {
      const longPassword = 'a'.repeat(1000);
      const hashInfo = await passwordSecurity.createPasswordHash(longPassword);
      
      expect(hashInfo.hash).toBeDefined();
      expect(hashInfo.salt).toBeDefined();
      
      const isValid = await passwordSecurity.verifyPassword(longPassword, hashInfo);
      expect(isValid).toBe(true);
    });

    test('应该处理包含特殊字符的密码', async () => {
      const specialPassword = '密码123!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hashInfo = await passwordSecurity.createPasswordHash(specialPassword);
      
      expect(hashInfo.hash).toBeDefined();
      expect(hashInfo.salt).toBeDefined();
      
      const isValid = await passwordSecurity.verifyPassword(specialPassword, hashInfo);
      expect(isValid).toBe(true);
    });
  });
});