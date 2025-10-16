/**
 * 验证器单元测试
 *
 * 测试覆盖：
 * 1. 签名验证功能
 * 2. 文件签名验证
 * 3. 签名信息提取
 * 4. 信任验证
 * 5. 错误处理和边界情况
 * 6. 性能测试
 *
 * @author 后端开发团队
 * @version 2.0.0
 * @since 2025-10-13
 */

const Verifier = require('../../signature-service/verifier');
const Signer = require('../../signature-service/signer');
const KeyManager = require('../../key-management/key-manager');
const TrustManager = require('../../key-management/trust-manager');
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
  },
  signatureService: {
    defaultFormat: 'hex',
    timestampEnabled: true,
    detachedSignatures: false,
    maxDataSize: 10 * 1024 * 1024, // 10MB
  },
  security: {
    level: 'high',
    minPassphraseLength: 16,
    enforceStrongPassphrase: true,
  },
};

// 测试数据
const TEST_PASSPHRASE = 'TestPassphrase123!@#';
const TEST_KEY_NAME = 'test-verification-key';
const TEST_DATA = 'Hello, World! This is test data for signature verification.';
const TEST_LARGE_DATA = 'x'.repeat(10000); // 10KB测试数据

describe('验证器单元测试', () => {
  let verifier;
  let signer;
  let keyManager;
  let trustManager;
  let config;
  let securityUtils;
  let testKeyInfo;
  let testSignature;

  beforeAll(async () => {
    config = new Config();
    securityUtils = new SecurityUtils();

    // 应用测试配置
    config.merge(TEST_CONFIG);

    // 初始化密钥管理器并生成测试密钥
    keyManager = new KeyManager();
    trustManager = new TrustManager();
    await fs.mkdir(TEST_CONFIG.keyStorage.path, { recursive: true });

    const keyParams = {
      name: TEST_KEY_NAME,
      type: 'rsa',
      size: 2048,
      password: TEST_PASSPHRASE,
    };

    testKeyInfo = await keyManager.generateKey(keyParams);

    // 将测试密钥添加到信任管理器
    await trustManager.addTrustedFingerprint(testKeyInfo.fingerprint, {
      keyName: TEST_KEY_NAME,
      description: '测试验证密钥',
    });
  });

  beforeEach(async () => {
    verifier = new Verifier();
    signer = new Signer();

    // 生成测试签名
    const signParams = {
      data: TEST_DATA,
      keyName: TEST_KEY_NAME,
      format: 'hex',
    };
    testSignature = await signer.sign(signParams);
  });

  afterEach(async () => {
    // 清理测试文件
    try {
      const testFiles = await fs.readdir(path.join(__dirname, '../test-verifications'));
      for (const file of testFiles) {
        if (file.endsWith('.sig') || file.endsWith('.json') || file.endsWith('.verification')) {
          await fs.unlink(path.join(__dirname, '../test-verifications', file));
        }
      }
    } catch (error) {
      // 忽略清理错误
    }
  });

  afterAll(async () => {
    // 清理测试目录
    try {
      await fs.rm(TEST_CONFIG.keyStorage.path, { recursive: true, force: true });
      await fs.rm(path.join(__dirname, '../test-verifications'), { recursive: true, force: true });
      await fs.rm(path.join(__dirname, '../test-trust'), { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('签名验证功能', () => {
    test('应该成功验证有效签名', async () => {
      const verifyParams = {
        data: TEST_DATA,
        signature: testSignature,
        keyName: TEST_KEY_NAME,
      };

      const result = await verifier.verify(verifyParams);

      expect(result.valid).toBe(true);
      expect(result.verifiedAt).toBeDefined();
      expect(result.keyInfo).toBeDefined();
      expect(result.keyInfo.name).toBe(TEST_KEY_NAME);
    });

    test('应该拒绝无效签名', async () => {
      const invalidSignature = 'invalid-signature-data';

      const verifyParams = {
        data: TEST_DATA,
        signature: invalidSignature,
        keyName: TEST_KEY_NAME,
      };

      const result = await verifier.verify(verifyParams);

      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('无效');
    });

    test('应该检测篡改的数据', async () => {
      const tamperedData = TEST_DATA + 'tampered';

      const verifyParams = {
        data: tamperedData,
        signature: testSignature,
        keyName: TEST_KEY_NAME,
      };

      const result = await verifier.verify(verifyParams);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('数据不匹配');
    });

    test('应该验证不同格式的签名', async () => {
      // 测试Base64格式
      const base64SignParams = {
        data: TEST_DATA,
        keyName: TEST_KEY_NAME,
        format: 'base64',
      };
      const base64Signature = await signer.sign(base64SignParams);

      const base64VerifyParams = {
        data: TEST_DATA,
        signature: base64Signature,
        keyName: TEST_KEY_NAME,
      };
      const base64Result = await verifier.verify(base64VerifyParams);
      expect(base64Result.valid).toBe(true);

      // 测试JSON格式
      const jsonSignParams = {
        data: TEST_DATA,
        keyName: TEST_KEY_NAME,
        format: 'json',
      };
      const jsonSignature = await signer.sign(jsonSignParams);

      const jsonVerifyParams = {
        data: TEST_DATA,
        signature: jsonSignature,
        keyName: TEST_KEY_NAME,
      };
      const jsonResult = await verifier.verify(jsonVerifyParams);
      expect(jsonResult.valid).toBe(true);
    });

    test('应该验证带时间戳的签名', async () => {
      const timestampSignParams = {
        data: TEST_DATA,
        keyName: TEST_KEY_NAME,
        timestamp: true,
        format: 'json',
      };
      const timestampSignature = await signer.sign(timestampSignParams);

      const verifyParams = {
        data: TEST_DATA,
        signature: timestampSignature,
        keyName: TEST_KEY_NAME,
      };

      const result = await verifier.verify(verifyParams);

      expect(result.valid).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });

    test('应该验证分离签名', async () => {
      const detachedSignParams = {
        data: TEST_DATA,
        keyName: TEST_KEY_NAME,
        detached: true,
        format: 'json',
      };
      const detachedSignature = await signer.sign(detachedSignParams);

      const verifyParams = {
        data: TEST_DATA,
        signature: detachedSignature,
        keyName: TEST_KEY_NAME,
        detached: true,
      };

      const result = await verifier.verify(verifyParams);

      expect(result.valid).toBe(true);
      expect(result.detached).toBe(true);
    });

    test('应该验证使用不同算法的签名', async () => {
      // 测试EC密钥
      const ecKeyParams = {
        name: 'test-ec-verification-key',
        type: 'ec',
        curve: 'prime256v1',
        password: TEST_PASSPHRASE,
      };

      const ecKeyInfo = await keyManager.generateKey(ecKeyParams);

      const ecSignParams = {
        data: TEST_DATA,
        keyName: 'test-ec-verification-key',
        format: 'hex',
      };
      const ecSignature = await signer.sign(ecSignParams);

      const ecVerifyParams = {
        data: TEST_DATA,
        signature: ecSignature,
        keyName: 'test-ec-verification-key',
      };
      const ecResult = await verifier.verify(ecVerifyParams);

      expect(ecResult.valid).toBe(true);
      expect(ecResult.keyInfo.type).toBe('ec');

      // 清理EC测试密钥
      await keyManager.deleteKey('test-ec-verification-key');
    });
  });

  describe('文件签名验证', () => {
    let testFilePath;
    let testSignaturePath;

    beforeEach(async () => {
      // 创建测试文件目录
      await fs.mkdir(path.join(__dirname, '../test-files'), { recursive: true });

      // 创建测试文件
      testFilePath = path.join(__dirname, '../test-files/test-verification-file.txt');
      await fs.writeFile(testFilePath, TEST_DATA, 'utf8');

      // 创建签名文件
      testSignaturePath = path.join(__dirname, '../test-files/test-verification-file.sig');

      const signParams = {
        filePath: testFilePath,
        keyName: TEST_KEY_NAME,
        outputPath: testSignaturePath,
        format: 'hex',
      };
      await signer.signFile(signParams);
    });

    afterEach(async () => {
      // 清理测试文件
      try {
        await fs.rm(path.join(__dirname, '../test-files'), { recursive: true, force: true });
      } catch (error) {
        // 忽略清理错误
      }
    });

    test('应该成功验证文件签名', async () => {
      const verifyParams = {
        filePath: testFilePath,
        signaturePath: testSignaturePath,
        keyName: TEST_KEY_NAME,
      };

      const result = await verifier.verifyFile(verifyParams);

      expect(result.valid).toBe(true);
      expect(result.filePath).toBe(testFilePath);
      expect(result.signaturePath).toBe(testSignaturePath);
    });

    test('应该检测文件篡改', async () => {
      // 篡改文件内容
      await fs.writeFile(testFilePath, TEST_DATA + 'tampered', 'utf8');

      const verifyParams = {
        filePath: testFilePath,
        signaturePath: testSignaturePath,
        keyName: TEST_KEY_NAME,
      };

      const result = await verifier.verifyFile(verifyParams);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('文件内容不匹配');
    });

    test('应该处理大文件的验证', async () => {
      // 创建大测试文件
      const largeFilePath = path.join(__dirname, '../test-files/large-verification-file.txt');
      await fs.writeFile(largeFilePath, TEST_LARGE_DATA, 'utf8');

      const largeSignaturePath = path.join(__dirname, '../test-files/large-verification-file.sig');

      const signParams = {
        filePath: largeFilePath,
        keyName: TEST_KEY_NAME,
        outputPath: largeSignaturePath,
        format: 'hex',
      };
      await signer.signFile(signParams);

      const verifyParams = {
        filePath: largeFilePath,
        signaturePath: largeSignaturePath,
        keyName: TEST_KEY_NAME,
      };

      const result = await verifier.verifyFile(verifyParams);

      expect(result.valid).toBe(true);
    });

    test('应该从签名中自动检测密钥', async () => {
      const jsonSignParams = {
        filePath: testFilePath,
        keyName: TEST_KEY_NAME,
        format: 'json',
        includeKeyInfo: true,
      };
      const jsonSignaturePath = path.join(__dirname, '../test-files/json-signature.json');
      await signer.signFile({ ...jsonSignParams, outputPath: jsonSignaturePath });

      const verifyParams = {
        filePath: testFilePath,
        signaturePath: jsonSignaturePath,
      };

      const result = await verifier.verifyFile(verifyParams);

      expect(result.valid).toBe(true);
      expect(result.keyDetected).toBe(true);
      expect(result.keyInfo.name).toBe(TEST_KEY_NAME);
    });
  });

  describe('签名信息提取', () => {
    test('应该提取签名基本信息', async () => {
      const jsonSignParams = {
        data: TEST_DATA,
        keyName: TEST_KEY_NAME,
        format: 'json',
      };
      const jsonSignature = await signer.sign(jsonSignParams);

      const info = await verifier.getSignatureInfo(jsonSignature);

      expect(info).toBeDefined();
      expect(info.format).toBe('json');
      expect(info.algorithm).toBeDefined();
      expect(info.timestamp).toBeDefined();
      expect(info.keyId).toBe(TEST_KEY_NAME);
    });

    test('应该提取详细签名信息', async () => {
      const detailedSignParams = {
        data: TEST_DATA,
        keyName: TEST_KEY_NAME,
        format: 'json',
        timestamp: true,
        metadata: {
          purpose: '测试',
          author: '测试用户',
        },
      };
      const detailedSignature = await signer.sign(detailedSignParams);

      const info = await verifier.getSignatureInfo(detailedSignature, { detailed: true });

      expect(info.detailed).toBe(true);
      expect(info.metadata).toBeDefined();
      expect(info.metadata.purpose).toBe('测试');
      expect(info.metadata.author).toBe('测试用户');
      expect(info.creationTime).toBeDefined();
      expect(info.expirationTime).toBeDefined();
    });

    test('应该验证签名完整性', async () => {
      const jsonSignParams = {
        data: TEST_DATA,
        keyName: TEST_KEY_NAME,
        format: 'json',
      };
      const jsonSignature = await signer.sign(jsonSignParams);

      const integrity = await verifier.verifySignatureIntegrity(jsonSignature);

      expect(integrity.valid).toBe(true);
      expect(integrity.format).toBe('json');
      expect(integrity.parsable).toBe(true);
    });

    test('应该检测损坏的签名', async () => {
      const corruptedSignature = '{"signature": "corrupted", "algorithm": "RSA-SHA256"}';

      const integrity = await verifier.verifySignatureIntegrity(corruptedSignature);

      expect(integrity.valid).toBe(false);
      expect(integrity.parsable).toBe(true);
      expect(integrity.error).toBeDefined();
    });

    test('应该提取签名中的公钥信息', async () => {
      const jsonSignParams = {
        data: TEST_DATA,
        keyName: TEST_KEY_NAME,
        format: 'json',
        includePublicKey: true,
      };
      const jsonSignature = await signer.sign(jsonSignParams);

      const publicKeyInfo = await verifier.extractPublicKeyInfo(jsonSignature);

      expect(publicKeyInfo).toBeDefined();
      expect(publicKeyInfo.keyId).toBe(TEST_KEY_NAME);
      expect(publicKeyInfo.algorithm).toBeDefined();
      expect(publicKeyInfo.fingerprint).toBeDefined();
    });
  });

  describe('信任验证', () => {
    test('应该验证受信任密钥的签名', async () => {
      const verifyParams = {
        data: TEST_DATA,
        signature: testSignature,
        keyName: TEST_KEY_NAME,
        checkTrust: true,
      };

      const result = await verifier.verify(verifyParams);

      expect(result.valid).toBe(true);
      expect(result.trusted).toBe(true);
      expect(result.trustReason).toBe('密钥受信任');
    });

    test('应该拒绝不受信任密钥的签名', async () => {
      // 创建一个不受信任的密钥
      const untrustedKeyParams = {
        name: 'untrusted-key',
        type: 'rsa',
        size: 2048,
        password: TEST_PASSPHRASE,
      };
      const untrustedKeyInfo = await keyManager.generateKey(untrustedKeyParams);

      const untrustedSignParams = {
        data: TEST_DATA,
        keyName: 'untrusted-key',
        format: 'hex',
      };
      const untrustedSignature = await signer.sign(untrustedSignParams);

      const verifyParams = {
        data: TEST_DATA,
        signature: untrustedSignature,
        keyName: 'untrusted-key',
        checkTrust: true,
      };

      const result = await verifier.verify(verifyParams);

      expect(result.valid).toBe(true); // 签名本身有效
      expect(result.trusted).toBe(false); // 但密钥不受信任
      expect(result.trustReason).toContain('未受信任');

      // 清理不受信任的密钥
      await keyManager.deleteKey('untrusted-key');
    });

    test('应该拒绝被撤销密钥的签名', async () => {
      // 创建一个密钥，添加到信任然后撤销
      const revokedKeyParams = {
        name: 'revoked-key',
        type: 'rsa',
        size: 2048,
        password: TEST_PASSPHRASE,
      };
      const revokedKeyInfo = await keyManager.generateKey(revokedKeyParams);

      // 添加到信任
      await trustManager.addTrustedFingerprint(revokedKeyInfo.fingerprint, {
        keyName: 'revoked-key',
      });

      // 生成签名
      const revokedSignParams = {
        data: TEST_DATA,
        keyName: 'revoked-key',
        format: 'hex',
      };
      const revokedSignature = await signer.sign(revokedSignParams);

      // 撤销密钥
      await trustManager.revokeFingerprint(revokedKeyInfo.fingerprint, '测试撤销');

      const verifyParams = {
        data: TEST_DATA,
        signature: revokedSignature,
        keyName: 'revoked-key',
        checkTrust: true,
      };

      const result = await verifier.verify(verifyParams);

      expect(result.valid).toBe(true); // 签名本身有效
      expect(result.trusted).toBe(false); // 但密钥已被撤销
      expect(result.trustReason).toContain('撤销');

      // 清理被撤销的密钥
      await keyManager.deleteKey('revoked-key');
    });

    test('应该仅使用受信任密钥验证', async () => {
      const verifyParams = {
        data: TEST_DATA,
        signature: testSignature,
        trustedOnly: true,
      };

      const result = await verifier.verify(verifyParams);

      expect(result.valid).toBe(true);
      expect(result.trusted).toBe(true);
    });

    test('应该验证信任链', async () => {
      const chainVerifyParams = {
        data: TEST_DATA,
        signature: testSignature,
        keyName: TEST_KEY_NAME,
        verifyTrustChain: true,
      };

      const result = await verifier.verify(chainVerifyParams);

      expect(result.valid).toBe(true);
      expect(result.trustChain).toBeDefined();
      expect(result.trustChain.valid).toBe(true);
      expect(result.trustChain.levels).toBeGreaterThan(0);
    });
  });

  describe('错误处理和边界情况', () => {
    test('应该处理不存在的密钥', async () => {
      const verifyParams = {
        data: TEST_DATA,
        signature: testSignature,
        keyName: 'non-existent-key',
      };

      await expect(verifier.verify(verifyParams)).rejects.toThrow();
    });

    test('应该处理空数据', async () => {
      const verifyParams = {
        data: '',
        signature: testSignature,
        keyName: TEST_KEY_NAME,
      };

      await expect(verifier.verify(verifyParams)).rejects.toThrow();
    });

    test('应该处理空签名', async () => {
      const verifyParams = {
        data: TEST_DATA,
        signature: '',
        keyName: TEST_KEY_NAME,
      };

      const result = await verifier.verify(verifyParams);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('空');
    });

    test('应该处理无效的签名格式', async () => {
      const invalidSignature = 'invalid-signature-format';

      const verifyParams = {
        data: TEST_DATA,
        signature: invalidSignature,
        keyName: TEST_KEY_NAME,
      };

      const result = await verifier.verify(verifyParams);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('格式');
    });

    test('应该处理不匹配的密钥', async () => {
      // 创建另一个密钥
      const otherKeyParams = {
        name: 'other-key',
        type: 'rsa',
        size: 2048,
        password: TEST_PASSPHRASE,
      };
      await keyManager.generateKey(otherKeyParams);

      const verifyParams = {
        data: TEST_DATA,
        signature: testSignature, // 使用test-key-name的签名
        keyName: 'other-key', // 但尝试用other-key验证
      };

      const result = await verifier.verify(verifyParams);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('不匹配');

      // 清理其他密钥
      await keyManager.deleteKey('other-key');
    });

    test('应该处理过期的签名', async () => {
      const expiredSignParams = {
        data: TEST_DATA,
        keyName: TEST_KEY_NAME,
        format: 'json',
        expiresIn: 100, // 100ms后过期
      };
      const expiredSignature = await signer.sign(expiredSignParams);

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 150));

      const verifyParams = {
        data: TEST_DATA,
        signature: expiredSignature,
        keyName: TEST_KEY_NAME,
        checkExpiry: true,
      };

      const result = await verifier.verify(verifyParams);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('过期');
    });

    test('应该从错误状态恢复', async () => {
      // 先触发一个错误
      const invalidVerifyParams = {
        data: null,
        signature: testSignature,
        keyName: TEST_KEY_NAME,
      };

      await expect(verifier.verify(invalidVerifyParams)).rejects.toThrow();

      // 验证验证器仍然可以正常使用
      const validVerifyParams = {
        data: TEST_DATA,
        signature: testSignature,
        keyName: TEST_KEY_NAME,
      };

      const result = await verifier.verify(validVerifyParams);
      expect(result.valid).toBe(true);
    });
  });

  describe('性能测试', () => {
    test('应该高效处理多次验证', async () => {
      const iterations = 10;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const verifyParams = {
          data: TEST_DATA,
          signature: testSignature,
          keyName: TEST_KEY_NAME,
        };

        await verifier.verify(verifyParams);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // 10次验证应该在合理时间内完成
      expect(totalTime).toBeLessThan(3000); // 3秒内
    });

    test('应该高效处理并发验证', async () => {
      const concurrentOperations = 5;
      const promises = [];

      for (let i = 0; i < concurrentOperations; i++) {
        const verifyParams = {
          data: TEST_DATA,
          signature: testSignature,
          keyName: TEST_KEY_NAME,
        };

        promises.push(verifier.verify(verifyParams));
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const concurrentTime = endTime - startTime;

      // 验证所有操作都成功
      results.forEach(result => {
        expect(result.valid).toBe(true);
      });

      // 并发操作应该在合理时间内完成
      expect(concurrentTime).toBeLessThan(2000); // 2秒内
    });

    test('应该测量验证性能', async () => {
      const benchmarkParams = {
        keyName: TEST_KEY_NAME,
        iterations: 5,
        dataSize: 1024, // 1KB
        signature: testSignature,
      };

      const results = await verifier.runBenchmark(benchmarkParams);

      expect(results).toBeDefined();
      expect(results.iterations).toBe(5);
      expect(results.totalTime).toBeGreaterThan(0);
      expect(results.avgVerifyTime).toBeGreaterThan(0);
      expect(results.operationsPerSecond).toBeGreaterThan(0);
      expect(results.successCount).toBe(5);
    });

    test('应该优化大文件的验证性能', async () => {
      // 创建大文件
      const largeFilePath = path.join(__dirname, '../test-files/large-performance-file.txt');
      await fs.writeFile(largeFilePath, TEST_LARGE_DATA, 'utf8');

      const largeSignaturePath = path.join(__dirname, '../test-files/large-performance-file.sig');

      const signParams = {
        filePath: largeFilePath,
        keyName: TEST_KEY_NAME,
        outputPath: largeSignaturePath,
        format: 'hex',
      };
      await signer.signFile(signParams);

      const startTime = Date.now();

      const verifyParams = {
        filePath: largeFilePath,
        signaturePath: largeSignaturePath,
        keyName: TEST_KEY_NAME,
      };
      const result = await verifier.verifyFile(verifyParams);

      const endTime = Date.now();
      const verificationTime = endTime - startTime;

      expect(result.valid).toBe(true);
      // 大文件验证应该在合理时间内完成
      expect(verificationTime).toBeLessThan(1000); // 1秒内

      // 清理
      await fs.unlink(largeFilePath);
      await fs.unlink(largeSignaturePath);
    });
  });

  describe('批量验证功能', () => {
    test('应该批量验证多个签名', async () => {
      const batchItems = [
        { id: 'item-1', data: 'data-1', signature: testSignature },
        { id: 'item-2', data: 'data-2', signature: testSignature },
        { id: 'item-3', data: 'data-3', signature: testSignature },
      ];

      // 为每个项目生成特定的签名
      for (let i = 0; i < batchItems.length; i++) {
        const signParams = {
          data: batchItems[i].data,
          keyName: TEST_KEY_NAME,
          format: 'hex',
        };
        batchItems[i].signature = await signer.sign(signParams);
      }

      const batchParams = {
        items: batchItems,
        keyName: TEST_KEY_NAME,
      };

      const results = await verifier.batchVerify(batchParams);

      expect(results).toBeDefined();
      expect(results.validCount).toBe(batchItems.length);
      expect(results.invalidCount).toBe(0);
      expect(results.results).toHaveLength(batchItems.length);

      // 验证每个结果
      results.results.forEach((result, index) => {
        expect(result.id).toBe(batchItems[index].id);
        expect(result.valid).toBe(true);
      });
    });

    test('应该处理批量验证中的部分失败', async () => {
      const batchItems = [
        { id: 'valid-1', data: 'valid-data-1', signature: testSignature },
        { id: 'invalid', data: 'tampered-data', signature: testSignature }, // 数据被篡改
        { id: 'valid-2', data: 'valid-data-2', signature: testSignature },
      ];

      // 为有效项目生成正确的签名
      const signParams1 = {
        data: batchItems[0].data,
        keyName: TEST_KEY_NAME,
        format: 'hex',
      };
      batchItems[0].signature = await signer.sign(signParams1);

      const signParams2 = {
        data: batchItems[2].data,
        keyName: TEST_KEY_NAME,
        format: 'hex',
      };
      batchItems[2].signature = await signer.sign(signParams2);

      const batchParams = {
        items: batchItems,
        keyName: TEST_KEY_NAME,
      };

      const results = await verifier.batchVerify(batchParams);

      expect(results.validCount).toBe(2);
      expect(results.invalidCount).toBe(1);
      expect(results.results).toHaveLength(batchItems.length);

      // 验证成功和失败的结果
      const validResults = results.results.filter(r => r.valid);
      const invalidResults = results.results.filter(r => !r.valid);

      expect(validResults).toHaveLength(2);
      expect(invalidResults).toHaveLength(1);
      expect(invalidResults[0].error).toBeDefined();
    });

    test('应该控制批量验证的并发数', async () => {
      const batchSize = 10;
      const batchItems = [];

      for (let i = 0; i < batchSize; i++) {
        const data = `batch-data-${i}`;
        const signParams = {
          data: data,
          keyName: TEST_KEY_NAME,
          format: 'hex',
        };
        const signature = await signer.sign(signParams);

        batchItems.push({
          id: `batch-${i}`,
          data: data,
          signature: signature,
        });
      }

      const batchParams = {
        items: batchItems,
        keyName: TEST_KEY_NAME,
        concurrency: 3, // 限制并发数为3
      };

      const startTime = Date.now();
      const results = await verifier.batchVerify(batchParams);
      const endTime = Date.now();
      const batchTime = endTime - startTime;

      expect(results.validCount).toBe(batchSize);
      expect(results.invalidCount).toBe(0);

      // 由于并发限制，批量操作应该需要一定时间
      expect(batchTime).toBeGreaterThan(100);
    });
  });

  describe('验证报告生成', () => {
    test('应该生成详细验证报告', async () => {
      const verifyParams = {
        data: TEST_DATA,
        signature: testSignature,
        keyName: TEST_KEY_NAME,
        generateReport: true,
      };

      const result = await verifier.verify(verifyParams);

      expect(result.report).toBeDefined();
      expect(result.report.verificationId).toBeDefined();
      expect(result.report.timestamp).toBeDefined();
      expect(result.report.summary).toBeDefined();
      expect(result.report.details).toBeDefined();
    });

    test('应该保存验证报告到文件', async () => {
      const reportPath = path.join(__dirname, '../test-verifications/verification-report.json');

      const verifyParams = {
        data: TEST_DATA,
        signature: testSignature,
        keyName: TEST_KEY_NAME,
        reportPath: reportPath,
      };

      const result = await verifier.verify(verifyParams);

      expect(result.reportSaved).toBe(true);
      expect(result.reportPath).toBe(reportPath);

      // 验证报告文件存在
      const fileExists = await fs
        .access(reportPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // 验证报告内容
      const reportContent = await fs.readFile(reportPath, 'utf8');
      const report = JSON.parse(reportContent);
      expect(report.valid).toBe(true);
      expect(report.keyInfo.name).toBe(TEST_KEY_NAME);
    });

    test('应该生成验证统计', async () => {
      // 执行一些验证操作
      await verifier.verify({
        data: TEST_DATA,
        signature: testSignature,
        keyName: TEST_KEY_NAME,
      });

      const stats = await verifier.getVerificationStats();

      expect(stats).toBeDefined();
      expect(stats.totalVerifications).toBeGreaterThan(0);
      expect(stats.successfulVerifications).toBeGreaterThan(0);
      expect(stats.failedVerifications).toBe(0);
      expect(stats.averageVerificationTime).toBeGreaterThan(0);
    });
  });
});
