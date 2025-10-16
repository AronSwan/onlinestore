/**
 * 安全工具模块单元测试
 *
 * 测试覆盖：
 * 1. 口令验证和强度检查
 * 2. 密钥ID验证
 * 3. 文件路径安全性验证
 * 4. 指纹生成和验证
 * 5. 输入清理和验证
 * 6. 随机字符串生成
 *
 * @author 后端开发团队
 * @version 2.0.0
 * @since 2025-10-13
 */

const SecurityUtils = require('../../shared/security-utils');
const crypto = require('crypto');

describe('安全工具模块测试', () => {
  describe('口令验证和强度检查', () => {
    test('应该验证强口令', () => {
      const strongPassword = 'StrongPass123!@#';
      const validation = SecurityUtils.validatePassphrase(strongPassword);

      expect(validation.isValid).toBe(true);
      expect(validation.score).toBeGreaterThanOrEqual(3);
      expect(validation.strength).toBe('strong');
    });

    test('应该拒绝弱口令', () => {
      const weakPassword = 'weak';
      const validation = SecurityUtils.validatePassphrase(weakPassword);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('口令长度必须至少 16 个字符');
    });

    test('应该检测缺少数字的口令', () => {
      const noNumbers = 'NoNumbers!@#';
      const validation = SecurityUtils.validatePassphrase(noNumbers);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('口令必须包含至少一个数字');
    });

    test('应该检测缺少特殊字符的口令', () => {
      const noSpecial = 'NoSpecial123';
      const validation = SecurityUtils.validatePassphrase(noSpecial);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('口令必须包含至少一个特殊字符');
    });

    test('应该检测常见弱口令', () => {
      const commonPasswords = ['password', '123456', 'qwerty', 'admin'];

      commonPasswords.forEach(password => {
        const validation = SecurityUtils.validatePassphrase(password);
        expect(validation.isValid).toBe(false);
        expect(validation.issues).toContain('口令过于常见，请使用更强的口令');
      });
    });

    test('应该计算口令强度分数', () => {
      const weakPassword = 'weak';
      const strongPassword = 'StrongPass123!@#';

      const weakScore = SecurityUtils.calculatePassphraseStrength(weakPassword);
      const strongScore = SecurityUtils.calculatePassphraseStrength(strongPassword);

      expect(strongScore).toBeGreaterThan(weakScore);
      expect(strongScore).toBeGreaterThanOrEqual(70);
    });

    test('应该计算字符串熵值', () => {
      const lowEntropyString = 'aaaaaaa';
      const highEntropyString = 'A1b2!C3d4@E5f6#';

      const lowEntropy = SecurityUtils.calculateEntropy(lowEntropyString);
      const highEntropy = SecurityUtils.calculateEntropy(highEntropyString);

      expect(highEntropy).toBeGreaterThan(lowEntropy);
    });
  });

  describe('密钥ID验证', () => {
    test('应该验证有效的密钥ID', () => {
      const validKeyIds = ['valid-key-123', 'key_456', 'test.key.789', 'KEY-ABC-123'];

      validKeyIds.forEach(keyId => {
        const validation = SecurityUtils.validateKeyId(keyId);
        expect(validation.isValid).toBe(true);
      });
    });

    test('应该拒绝无效的密钥ID', () => {
      const invalidKeyIds = [
        'invalid key!@#',
        '../malicious',
        'key with spaces',
        '',
        null,
        undefined,
      ];

      invalidKeyIds.forEach(keyId => {
        const validation = SecurityUtils.validateKeyId(keyId);
        expect(validation.isValid).toBe(false);
      });
    });

    test('应该规范化密钥ID', () => {
      const input = 'Test Key ID';
      const validation = SecurityUtils.validateKeyId(input);

      expect(validation.normalizedId).toBe('testkeyid');
    });
  });

  describe('文件路径安全性验证', () => {
    test('应该验证安全的文件路径', () => {
      const safePaths = ['safe-file.json', 'keys/valid.pem', 'relative/path/file.key'];

      safePaths.forEach(filePath => {
        const validation = SecurityUtils.validateFilePath(filePath);
        expect(validation.isValid).toBe(true);
      });
    });

    test('应该拒绝不安全的文件路径', () => {
      const unsafePaths = [
        '../unsafe-file.pub',
        '/etc/passwd',
        'C:\\Windows\\System32',
        '../../malicious',
      ];

      unsafePaths.forEach(filePath => {
        const validation = SecurityUtils.validateFilePath(filePath);
        expect(validation.isValid).toBe(false);
      });
    });

    test('应该规范化文件路径', () => {
      const unsafePath = '../keys/../../malicious/file.pub';
      const safePath = 'keys/file.pem';

      const unsafeValidation = SecurityUtils.validateFilePath(unsafePath);
      const safeValidation = SecurityUtils.validateFilePath(safePath);

      // 注意：path.normalize 可能会保留 ..，但验证会失败
      expect(unsafeValidation.isValid).toBe(false);

      // 使用 path.normalize 来确保跨平台兼容性
      const expectedPath = require('path').normalize('keys/file.pem');
      expect(safeValidation.normalizedPath).toBe(expectedPath);
    });

    test('应该验证文件扩展名', () => {
      const validExtensions = ['.json', '.pem', '.key', '.sig'];
      const invalidExtensions = ['.exe', '.bat', '.sh', '.php'];

      validExtensions.forEach(ext => {
        const validation = SecurityUtils.validateFilePath(`file${ext}`);
        expect(validation.isValid).toBe(true);
      });

      invalidExtensions.forEach(ext => {
        const validation = SecurityUtils.validateFilePath(`file${ext}`);
        expect(validation.isValid).toBe(false);
      });
    });
  });

  describe('指纹生成和验证', () => {
    test('应该生成SHA-256指纹', () => {
      const testData = 'test data for fingerprint';
      const fingerprint = SecurityUtils.generateFingerprint(testData);

      expect(fingerprint).toHaveLength(64);
      expect(fingerprint).toMatch(/^[A-F0-9]+$/);
    });

    test('应该验证指纹格式', () => {
      const validFingerprint = 'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678';
      const invalidFingerprint = 'invalid-fingerprint';

      const validResult = SecurityUtils.validateFingerprint(validFingerprint);
      const invalidResult = SecurityUtils.validateFingerprint(invalidFingerprint);

      expect(validResult).toBe(true);
      expect(invalidResult).toBe(false);
    });

    test('应该生成公钥指纹', () => {
      const publicKey = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
      }).publicKey;

      const fingerprint = SecurityUtils.generateFingerprint(publicKey);

      expect(fingerprint).toHaveLength(64);
      expect(fingerprint).toMatch(/^[A-F0-9]+$/);
    });
  });

  describe('输入清理和验证', () => {
    test('应该清理用户输入', () => {
      const maliciousInput = '<script>alert("xss")</script> malicious input';
      const cleaned = SecurityUtils.sanitizeInput(maliciousInput);

      expect(cleaned).not.toContain('<script>');
      expect(cleaned).not.toContain('</script>');
      expect(cleaned).toContain('malicious input');
    });

    test('应该清理不同类型输入', () => {
      // 字符串清理
      const stringInput = '  test string  ';
      expect(SecurityUtils.sanitizeInput(stringInput)).toBe('test string');

      // 数字清理
      const numberInput = '123';
      expect(SecurityUtils.sanitizeInput(numberInput, 'number')).toBe(123);

      // 布尔值清理
      const boolInput = 'true';
      expect(SecurityUtils.sanitizeInput(boolInput, 'boolean')).toBe(true);

      // 路径清理
      const pathInput = '../malicious/path';
      const cleanedPath = SecurityUtils.sanitizeInput(pathInput, 'path');
      expect(cleanedPath).not.toMatch(/[<>|&$]/);
    });
  });

  describe('随机字符串生成', () => {
    test('应该生成随机安全字符串', () => {
      const randomString = SecurityUtils.generateRandomString(16);

      expect(randomString).toHaveLength(16);
      expect(typeof randomString).toBe('string');
    });

    test('应该生成不同长度的随机字符串', () => {
      const length32 = SecurityUtils.generateRandomString(32);
      const length64 = SecurityUtils.generateRandomString(64);

      expect(length32).toHaveLength(32);
      expect(length64).toHaveLength(64);
      expect(length32).not.toBe(length64);
    });
  });

  describe('信任验证', () => {
    test('应该验证信任策略', () => {
      const fingerprint = 'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678';
      const trustStore = {
        A1B2C3D4E5F67890123456789012345678901234567890123456789012345678: {
          metadata: { name: 'test-key' },
          addedAt: new Date().toISOString(),
          expiresAt: null,
          revoked: false,
        },
      };

      const validation = SecurityUtils.validateTrust(fingerprint, trustStore);

      expect(validation.trusted).toBe(true);
      expect(validation.metadata.name).toBe('test-key');
    });

    test('应该拒绝无效指纹的信任', () => {
      const invalidFingerprint = 'invalid';
      const trustStore = {};

      const validation = SecurityUtils.validateTrust(invalidFingerprint, trustStore);

      expect(validation.trusted).toBe(false);
      expect(validation.reason).toBe('无效的指纹格式');
    });

    test('应该检测已撤销的信任', () => {
      const fingerprint = 'A1B2C3D4E5F67890123456789012345678901234567890123456789012345678';
      const trustStore = {
        A1B2C3D4E5F67890123456789012345678901234567890123456789012345678: {
          revoked: true,
          revokedAt: new Date().toISOString(),
        },
      };

      const validation = SecurityUtils.validateTrust(fingerprint, trustStore);

      expect(validation.trusted).toBe(false);
      expect(validation.reason).toBe('指纹已被撤销');
    });
  });
});
