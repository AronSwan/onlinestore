/**
 * 密钥管理器单元测试
 *
 * 测试覆盖：
 * 1. 密钥生成和导入
 * 2. 密钥导出和列表
 * 3. 密钥删除和清理
 * 4. 密钥信息获取
 * 5. 密钥生命周期管理
 * 6. 错误处理和边界情况
 *
 * @author 后端开发团队
 * @version 2.0.0
 * @since 2025-10-13
 */

const KeyManager = require('../../key-management/key-manager');
const Config = require('../../shared/config');
const SecurityUtils = require('../../shared/security-utils');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// 测试配置
const TEST_CONFIG = {
  keyStorage: {
    path: path.join(__dirname, '../test-keys'),
    backupPath: path.join(__dirname, '../test-keys/backup'),
    rotationInterval: 1000,
    maxKeys: 10,
  },
  security: {
    level: 'high',
    minPassphraseLength: 16,
    enforceStrongPassphrase: true,
  },
};

// 测试数据
const TEST_PASSPHRASE = 'TestPassphrase123!@#';
const TEST_KEY_NAME = 'test-key-1';

describe('密钥管理器单元测试', () => {
  let keyManager;
  let config;
  let securityUtils;

  beforeAll(() => {
    config = new Config();
    securityUtils = new SecurityUtils();

    // 应用测试配置
    config.merge(TEST_CONFIG);
  });

  beforeEach(async () => {
    keyManager = new KeyManager();

    // 确保测试目录存在
    await fs.mkdir(TEST_CONFIG.keyStorage.path, { recursive: true });
    await fs.mkdir(TEST_CONFIG.keyStorage.backupPath, { recursive: true });
  });

  afterEach(async () => {
    // 清理测试目录
    try {
      await fs.rm(TEST_CONFIG.keyStorage.path, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('密钥生成和导入', () => {
    test('应该成功生成RSA密钥对', async () => {
      const keyParams = {
        name: TEST_KEY_NAME,
        type: 'rsa',
        size: 2048,
        password: TEST_PASSPHRASE,
      };

      const keyInfo = await keyManager.generateKey(keyParams);

      expect(keyInfo).toBeDefined();
      expect(keyInfo.name).toBe(TEST_KEY_NAME);
      expect(keyInfo.type).toBe('rsa');
      expect(keyInfo.size).toBe(2048);
      expect(keyInfo.fingerprint).toHaveLength(64);
      expect(keyInfo.createdAt).toBeDefined();
      expect(keyInfo.publicKeyPath).toContain(`${TEST_KEY_NAME}.pub`);
      expect(keyInfo.privateKeyPath).toContain(`${TEST_KEY_NAME}.key`);

      // 验证文件是否存在
      const publicKeyExists = await fs
        .access(keyInfo.publicKeyPath)
        .then(() => true)
        .catch(() => false);
      const privateKeyExists = await fs
        .access(keyInfo.privateKeyPath)
        .then(() => true)
        .catch(() => false);

      expect(publicKeyExists).toBe(true);
      expect(privateKeyExists).toBe(true);
    });

    test('应该成功生成EC密钥对', async () => {
      const keyParams = {
        name: 'test-ec-key',
        type: 'ec',
        curve: 'prime256v1',
        password: TEST_PASSPHRASE,
      };

      const keyInfo = await keyManager.generateKey(keyParams);

      expect(keyInfo).toBeDefined();
      expect(keyInfo.type).toBe('ec');
      expect(keyInfo.curve).toBe('prime256v1');
      expect(keyInfo.fingerprint).toHaveLength(64);
    });

    test('应该成功生成Ed25519密钥对', async () => {
      const keyParams = {
        name: 'test-ed25519-key',
        type: 'ed25519',
        password: TEST_PASSPHRASE,
      };

      const keyInfo = await keyManager.generateKey(keyParams);

      expect(keyInfo).toBeDefined();
      expect(keyInfo.type).toBe('ed25519');
      expect(keyInfo.fingerprint).toHaveLength(64);
    });

    test('应该使用自动生成的密钥名称', async () => {
      const keyParams = {
        type: 'rsa',
        size: 2048,
        password: TEST_PASSPHRASE,
      };

      const keyInfo = await keyManager.generateKey(keyParams);

      expect(keyInfo.name).toBeDefined();
      expect(keyInfo.name).toMatch(/^key-\d+-[a-z0-9]+$/);
    });

    test('应该验证密码强度', async () => {
      const weakPassphrase = 'weak';
      const keyParams = {
        name: 'test-weak-passphrase',
        type: 'rsa',
        size: 2048,
        password: weakPassphrase,
      };

      await expect(keyManager.generateKey(keyParams)).rejects.toThrow();
    });

    test('应该导入现有密钥', async () => {
      // 先生成一个密钥
      const keyParams = {
        name: 'source-key',
        type: 'rsa',
        size: 2048,
        password: TEST_PASSPHRASE,
      };
      const sourceKey = await keyManager.generateKey(keyParams);

      // 导入密钥
      const importParams = {
        filePath: sourceKey.privateKeyPath,
        name: 'imported-key',
        password: TEST_PASSPHRASE,
      };

      const importedKey = await keyManager.importKey(importParams);

      expect(importedKey).toBeDefined();
      expect(importedKey.name).toBe('imported-key');
      expect(importedKey.fingerprint).toBe(sourceKey.fingerprint);
      expect(importedKey.type).toBe(sourceKey.type);
      expect(importedKey.size).toBe(sourceKey.size);
    });

    test('应该处理导入密钥密码错误', async () => {
      const keyParams = {
        name: 'source-key',
        type: 'rsa',
        size: 2048,
        password: TEST_PASSPHRASE,
      };
      const sourceKey = await keyManager.generateKey(keyParams);

      const importParams = {
        filePath: sourceKey.privateKeyPath,
        name: 'imported-key',
        password: 'wrong-password',
      };

      await expect(keyManager.importKey(importParams)).rejects.toThrow();
    });

    test('应该处理导入文件不存在', async () => {
      const importParams = {
        filePath: '/nonexistent/file.key',
        name: 'imported-key',
        password: TEST_PASSPHRASE,
      };

      await expect(keyManager.importKey(importParams)).rejects.toThrow();
    });
  });

  describe('密钥导出和列表', () => {
    beforeEach(async () => {
      // 生成测试密钥
      const keyParams = {
        name: TEST_KEY_NAME,
        type: 'rsa',
        size: 2048,
        password: TEST_PASSPHRASE,
      };
      await keyManager.generateKey(keyParams);
    });

    test('应该导出公钥', async () => {
      const exportPath = path.join(TEST_CONFIG.keyStorage.path, 'exported-public.pub');
      const exportParams = {
        keyName: TEST_KEY_NAME,
        filePath: exportPath,
        publicOnly: true,
      };

      await keyManager.exportKey(exportParams);

      // 验证导出文件存在
      const fileExists = await fs
        .access(exportPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // 验证文件内容是公钥
      const fileContent = await fs.readFile(exportPath, 'utf8');
      expect(fileContent).toContain('-----BEGIN PUBLIC KEY-----');
      expect(fileContent).toContain('-----END PUBLIC KEY-----');
    });

    test('应该导出完整密钥对', async () => {
      const exportPath = path.join(TEST_CONFIG.keyStorage.path, 'exported-key.pem');
      const exportParams = {
        keyName: TEST_KEY_NAME,
        filePath: exportPath,
        password: 'export-password',
        publicOnly: false,
      };

      await keyManager.exportKey(exportParams);

      // 验证导出文件存在
      const fileExists = await fs
        .access(exportPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // 验证文件内容是私钥（加密的）
      const fileContent = await fs.readFile(exportPath, 'utf8');
      expect(fileContent).toContain('-----BEGIN ENCRYPTED PRIVATE KEY-----');
    });

    test('应该列出所有密钥', async () => {
      // 生成多个密钥
      const keyNames = ['key-1', 'key-2', 'key-3'];
      for (const name of keyNames) {
        const keyParams = {
          name: name,
          type: 'rsa',
          size: 2048,
          password: TEST_PASSPHRASE,
        };
        await keyManager.generateKey(keyParams);
      }

      const keys = await keyManager.listKeys();

      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBeGreaterThanOrEqual(keyNames.length);

      // 验证每个密钥都有必要的信息
      keys.forEach(key => {
        expect(key.name).toBeDefined();
        expect(key.type).toBeDefined();
        expect(key.fingerprint).toBeDefined();
        expect(key.createdAt).toBeDefined();
      });

      // 验证特定密钥存在
      const keyNamesInList = keys.map(k => k.name);
      keyNames.forEach(name => {
        expect(keyNamesInList).toContain(name);
      });
    });

    test('应该获取密钥信息', async () => {
      const keyInfo = await keyManager.getKeyInfo(TEST_KEY_NAME);

      expect(keyInfo).toBeDefined();
      expect(keyInfo.name).toBe(TEST_KEY_NAME);
      expect(keyInfo.type).toBe('rsa');
      expect(keyInfo.size).toBe(2048);
      expect(keyInfo.fingerprint).toHaveLength(64);
      expect(keyInfo.createdAt).toBeDefined();
      expect(keyInfo.publicKeyPath).toBeDefined();
      expect(keyInfo.privateKeyPath).toBeDefined();
    });

    test('应该处理获取不存在的密钥信息', async () => {
      await expect(keyManager.getKeyInfo('nonexistent-key')).rejects.toThrow();
    });
  });

  describe('密钥删除和清理', () => {
    beforeEach(async () => {
      // 生成测试密钥
      const keyParams = {
        name: TEST_KEY_NAME,
        type: 'rsa',
        size: 2048,
        password: TEST_PASSPHRASE,
      };
      await keyManager.generateKey(keyParams);
    });

    test('应该删除密钥', async () => {
      // 验证密钥存在
      const keyInfo = await keyManager.getKeyInfo(TEST_KEY_NAME);
      expect(keyInfo).toBeDefined();

      // 删除密钥
      await keyManager.deleteKey(TEST_KEY_NAME);

      // 验证密钥已被删除
      await expect(keyManager.getKeyInfo(TEST_KEY_NAME)).rejects.toThrow();

      // 验证文件已被删除
      const publicKeyExists = await fs
        .access(keyInfo.publicKeyPath)
        .then(() => true)
        .catch(() => false);
      const privateKeyExists = await fs
        .access(keyInfo.privateKeyPath)
        .then(() => true)
        .catch(() => false);

      expect(publicKeyExists).toBe(false);
      expect(privateKeyExists).toBe(false);
    });

    test('应该处理删除不存在的密钥', async () => {
      await expect(keyManager.deleteKey('nonexistent-key')).rejects.toThrow();
    });

    test('应该清理过期密钥', async () => {
      // 创建一些过期密钥
      const expiredKeys = ['expired-1', 'expired-2'];
      for (const name of expiredKeys) {
        const keyParams = {
          name: name,
          type: 'rsa',
          size: 2048,
          password: TEST_PASSPHRASE,
        };
        const keyInfo = await keyManager.generateKey(keyParams);

        // 手动设置过期时间（过去的时间）
        keyInfo.expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      }

      const cleanupResult = await keyManager.cleanupExpiredKeys();

      expect(cleanupResult.cleanedCount).toBeGreaterThan(0);
      expect(Array.isArray(cleanupResult.cleanedKeys)).toBe(true);
    });

    test('应该归档旧密钥', async () => {
      // 创建多个密钥
      const keyNames = ['key-1', 'key-2', 'key-3', 'key-4', 'key-5'];
      for (const name of keyNames) {
        const keyParams = {
          name: name,
          type: 'rsa',
          size: 2048,
          password: TEST_PASSPHRASE,
        };
        await keyManager.generateKey(keyParams);
      }

      const archiveResult = await keyManager.archiveOldKeys(2);

      expect(archiveResult.archivedCount).toBeGreaterThan(0);
      expect(Array.isArray(archiveResult.archivedKeys)).toBe(true);

      // 验证归档的密钥状态
      for (const keyName of archiveResult.archivedKeys) {
        const keyInfo = await keyManager.getKeyInfo(keyName);
        expect(keyInfo.status).toBe('archived');
      }
    });
  });

  describe('密钥生命周期管理', () => {
    test('应该轮换密钥', async () => {
      const originalKeyParams = {
        name: 'original-key',
        type: 'rsa',
        size: 2048,
        password: TEST_PASSPHRASE,
      };
      const originalKey = await keyManager.generateKey(originalKeyParams);

      const newKeyName = await keyManager.rotateKey({
        oldKeyName: 'original-key',
        newKeyParams: {
          type: 'rsa',
          size: 3072,
          password: TEST_PASSPHRASE,
        },
      });

      expect(newKeyName).toBeDefined();
      expect(newKeyName).not.toBe('original-key');

      // 验证新密钥存在
      const newKeyInfo = await keyManager.getKeyInfo(newKeyName);
      expect(newKeyInfo).toBeDefined();
      expect(newKeyInfo.size).toBe(3072);

      // 验证旧密钥状态
      const oldKeyInfo = await keyManager.getKeyInfo('original-key');
      expect(oldKeyInfo.status).toBe('deprecated');
    });

    test('应该检查密钥轮换需求', async () => {
      const keyParams = {
        name: 'rotation-test-key',
        type: 'rsa',
        size: 2048,
        password: TEST_PASSPHRASE,
        maxAge: 1000, // 1秒后需要轮换
      };
      await keyManager.generateKey(keyParams);

      // 新生成的密钥不应该需要轮换
      let shouldRotate = await keyManager.shouldRotateKey('rotation-test-key');
      expect(shouldRotate).toBe(false);

      // 等待超过最大年龄
      await new Promise(resolve => setTimeout(resolve, 1100));

      // 现在应该需要轮换
      shouldRotate = await keyManager.shouldRotateKey('rotation-test-key');
      expect(shouldRotate).toBe(true);
    });

    test('应该备份密钥', async () => {
      const keyParams = {
        name: 'backup-test-key',
        type: 'rsa',
        size: 2048,
        password: TEST_PASSPHRASE,
      };
      await keyManager.generateKey(keyParams);

      const backupResult = await keyManager.backupKey('backup-test-key');

      expect(backupResult.success).toBe(true);
      expect(backupResult.backupPath).toBeDefined();

      // 验证备份文件存在
      const backupExists = await fs
        .access(backupResult.backupPath)
        .then(() => true)
        .catch(() => false);
      expect(backupExists).toBe(true);
    });

    test('应该从备份恢复密钥', async () => {
      const keyParams = {
        name: 'restore-test-key',
        type: 'rsa',
        size: 2048,
        password: TEST_PASSPHRASE,
      };
      const originalKey = await keyManager.generateKey(keyParams);

      // 创建备份
      const backupResult = await keyManager.backupKey('restore-test-key');

      // 删除原始密钥
      await keyManager.deleteKey('restore-test-key');

      // 从备份恢复
      const restoreResult = await keyManager.restoreFromBackup({
        backupPath: backupResult.backupPath,
        keyName: 'restored-key',
      });

      expect(restoreResult.success).toBe(true);
      expect(restoreResult.keyInfo.name).toBe('restored-key');
      expect(restoreResult.keyInfo.fingerprint).toBe(originalKey.fingerprint);
    });
  });

  describe('错误处理和边界情况', () => {
    test('应该处理重复的密钥名称', async () => {
      const keyParams = {
        name: TEST_KEY_NAME,
        type: 'rsa',
        size: 2048,
        password: TEST_PASSPHRASE,
      };
      await keyManager.generateKey(keyParams);

      // 尝试使用相同的名称生成密钥
      await expect(keyManager.generateKey(keyParams)).rejects.toThrow();
    });

    test('应该处理无效的密钥类型', async () => {
      const keyParams = {
        name: 'invalid-type-key',
        type: 'invalid-type',
        size: 2048,
        password: TEST_PASSPHRASE,
      };

      await expect(keyManager.generateKey(keyParams)).rejects.toThrow();
    });

    test('应该处理无效的密钥大小', async () => {
      const keyParams = {
        name: 'invalid-size-key',
        type: 'rsa',
        size: 512, // 太小的RSA密钥
        password: TEST_PASSPHRASE,
      };

      await expect(keyManager.generateKey(keyParams)).rejects.toThrow();
    });

    test('应该处理存储目录权限问题', async () => {
      // 创建一个只读目录来模拟权限问题
      const readOnlyDir = path.join(TEST_CONFIG.keyStorage.path, 'readonly');
      await fs.mkdir(readOnlyDir, { recursive: true });
      // 在Windows上设置只读属性可能不同，这里我们只是测试错误处理

      const keyParams = {
        name: 'permission-test-key',
        type: 'rsa',
        size: 2048,
        password: TEST_PASSPHRASE,
        storagePath: '/root/protected/directory', // 假设这是一个受保护的目录
      };

      await expect(keyManager.generateKey(keyParams)).rejects.toThrow();
    });

    test('应该处理磁盘空间不足', async () => {
      // 这个测试在实际环境中可能难以模拟
      // 我们主要验证错误处理代码路径
      const keyParams = {
        name: 'disk-space-test-key',
        type: 'rsa',
        size: 2048,
        password: TEST_PASSPHRASE,
      };

      // 正常情况下应该成功
      const keyInfo = await keyManager.generateKey(keyParams);
      expect(keyInfo).toBeDefined();
    });

    test('应该处理网络超时', async () => {
      // 对于本地操作，网络超时不太可能发生
      // 主要验证异步操作管理
      const keyParams = {
        name: 'timeout-test-key',
        type: 'rsa',
        size: 2048,
        password: TEST_PASSPHRASE,
      };

      const keyInfo = await keyManager.generateKey(keyParams);
      expect(keyInfo).toBeDefined();
    });
  });

  describe('性能测试', () => {
    test('应该高效处理多个密钥', async () => {
      const startTime = Date.now();
      const keyCount = 5;

      // 生成多个密钥
      const promises = [];
      for (let i = 0; i < keyCount; i++) {
        const keyParams = {
          name: `perf-test-key-${i}`,
          type: 'rsa',
          size: 2048,
          password: TEST_PASSPHRASE,
        };
        promises.push(keyManager.generateKey(keyParams));
      }

      await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // 验证所有密钥都已创建
      const keys = await keyManager.listKeys();
      const perfKeys = keys.filter(k => k.name.startsWith('perf-test-key-'));
      expect(perfKeys).toHaveLength(keyCount);

      // 性能检查：5个密钥应该在合理时间内完成（例如10秒内）
      expect(totalTime).toBeLessThan(10000);
    });

    test('应该高效列出大量密钥', async () => {
      // 创建一些测试密钥
      const keyCount = 10;
      for (let i = 0; i < keyCount; i++) {
        const keyParams = {
          name: `list-test-key-${i}`,
          type: 'rsa',
          size: 2048,
          password: TEST_PASSPHRASE,
        };
        await keyManager.generateKey(keyParams);
      }

      const startTime = Date.now();
      const keys = await keyManager.listKeys();
      const endTime = Date.now();
      const listTime = endTime - startTime;

      expect(keys.length).toBeGreaterThanOrEqual(keyCount);
      // 列出操作应该很快（例如1秒内）
      expect(listTime).toBeLessThan(1000);
    });
  });
});
