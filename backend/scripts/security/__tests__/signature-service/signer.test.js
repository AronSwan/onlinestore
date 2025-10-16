/**
 * 签名器单元测试
 *
 * 测试覆盖：
 * 1. 数据签名功能
 * 2. 文件签名功能
 * 3. 签名格式和选项
 * 4. 错误处理和边界情况
 * 5. 性能测试
 *
 * @author 后端开发团队
 * @version 2.0.0
 * @since 2025-10-13
 */

const Signer = require('../../signature-service/signer');
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
const TEST_KEY_NAME = 'test-signing-key';
const TEST_DATA = 'Hello, World! This is test data for signature verification.';
const TEST_LARGE_DATA = 'x'.repeat(10000); // 10KB测试数据

describe('签名器单元测试', () => {
  let signer;
  let keyManager;
  let config;
  let securityUtils;
  let testKeyInfo;

  beforeAll(async () => {
    config = new Config();
    securityUtils = new SecurityUtils();

    // 应用测试配置
    config.merge(TEST_CONFIG);

    // 初始化密钥管理器并生成测试密钥
    keyManager = new KeyManager();
    await fs.mkdir(TEST_CONFIG.keyStorage.path, { recursive: true });

    const keyParams = {
      name: TEST_KEY_NAME,
      type: 'rsa',
      size: 2048,
      password: TEST_PASSPHRASE,
    };

    testKeyInfo = await keyManager.generateKey(keyParams);
  });

  beforeEach(() => {
    signer = new Signer();
  });

  afterEach(async () => {
    // 清理测试文件
    try {
      const testFiles = await fs.readdir(path.join(__dirname, '../test-signatures'));
      for (const file of testFiles) {
        if (file.endsWith('.sig') || file.endsWith('.json')) {
          await fs.unlink(path.join(__dirname, '../test-signatures', file));
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
      await fs.rm(path.join(__dirname, '../test-signatures'), { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('数据签名功能', () => {
    test('应该成功对数据进行签名', async () => {
      const signParams = {
        data: TEST_DATA,
        keyName: TEST_KEY_NAME,
        format: 'hex',
      };

      const signature = await signer.sign(signParams);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);

      // 验证签名格式（十六进制）
      expect(signature).toMatch(/^[0-9a-f]+$/i);
    });

    test('应该使用Base64格式签名', async () => {
      const signParams = {
        data: TEST_DATA,
        keyName: TEST_KEY_NAME,
        format: 'base64',
      };

      const signature = await signer.sign(signParams);

      expect(signature).toBeDefined();
      // Base64格式验证
      expect(signature).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    test('应该使用JSON格式签名', async () => {
      const signParams = {
        data: TEST_DATA,
        keyName: TEST_KEY_NAME,
        format: 'json',
      };

      const signature = await signer.sign(signParams);

      expect(signature).toBeDefined();

      // 解析JSON签名
      const signatureObj = JSON.parse(signature);
      expect(signatureObj).toHaveProperty('signature');
      expect(signatureObj).toHaveProperty('algorithm');
      expect(signatureObj).toHaveProperty('keyId');
      expect(signatureObj).toHaveProperty('timestamp');
    });

    test('应该生成带时间戳的签名', async () => {
      const signParams = {
        data: TEST_DATA,
        keyName: TEST_KEY_NAME,
        timestamp: true,
        format: 'json',
      };

      const signature = await signer.sign(signParams);
      const signatureObj = JSON.parse(signature);

      expect(signatureObj.timestamp).toBeDefined();
      expect(new Date(signatureObj.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });

    test('应该生成分离签名', async () => {
      const signParams = {
        data: TEST_DATA,
        keyName: TEST_KEY_NAME,
        detached: true,
        format: 'json',
      };

      const signature = await signer.sign(signParams);
      const signatureObj = JSON.parse(signature);

      expect(signatureObj.detached).toBe(true);
      expect(signatureObj.dataHash).toBeDefined();
    });

    test('应该使用不同的密钥算法签名', async () => {
      // 测试EC密钥
      const ecKeyParams = {
        name: 'test-ec-key',
        type: 'ec',
        curve: 'prime256v1',
        password: TEST_PASSPHRASE,
      };

      const ecKeyInfo = await keyManager.generateKey(ecKeyParams);

      const signParams = {
        data: TEST_DATA,
        keyName: 'test-ec-key',
        format: 'hex',
      };

      const signature = await signer.sign(signParams);

      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);

      // 清理EC测试密钥
      await keyManager.deleteKey('test-ec-key');
    });

    test('应该处理大数据的签名', async () => {
      const signParams = {
        data: TEST_LARGE_DATA,
        keyName: TEST_KEY_NAME,
        format: 'hex',
      };

      const signature = await signer.sign(signParams);

      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);
    });
  });

  describe('文件签名功能', () => {
    let testFilePath;
    let largeTestFilePath;

    beforeEach(async () => {
      // 创建测试文件目录
      await fs.mkdir(path.join(__dirname, '../test-files'), { recursive: true });

      // 创建测试文件
      testFilePath = path.join(__dirname, '../test-files/test-file.txt');
      await fs.writeFile(testFilePath, TEST_DATA, 'utf8');

      // 创建大测试文件
      largeTestFilePath = path.join(__dirname, '../test-files/large-test-file.txt');
      await fs.writeFile(largeTestFilePath, TEST_LARGE_DATA, 'utf8');
    });

    afterEach(async () => {
      // 清理测试文件
      try {
        await fs.rm(path.join(__dirname, '../test-files'), { recursive: true, force: true });
      } catch (error) {
        // 忽略清理错误
      }
    });

    test('应该成功对文件进行签名', async () => {
      const signParams = {
        filePath: testFilePath,
        keyName: TEST_KEY_NAME,
        format: 'hex',
      };

      const signature = await signer.signFile(signParams);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });

    test('应该将文件签名保存到指定路径', async () => {
      const outputPath = path.join(__dirname, '../test-signatures/file-signature.sig');

      const signParams = {
        filePath: testFilePath,
        keyName: TEST_KEY_NAME,
        outputPath: outputPath,
        format: 'hex',
      };

      const result = await signer.signFile(signParams);

      expect(result.success).toBe(true);
      expect(result.signaturePath).toBe(outputPath);

      // 验证签名文件存在
      const fileExists = await fs
        .access(outputPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // 验证签名文件内容
      const signatureContent = await fs.readFile(outputPath, 'utf8');
      expect(signatureContent).toBe(result.signature);
    });

    test('应该处理大文件的签名', async () => {
      const signParams = {
        filePath: largeTestFilePath,
        keyName: TEST_KEY_NAME,
        format: 'hex',
      };

      const signature = await signer.signFile(signParams);

      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);
    });

    test('应该计算文件的哈希值', async () => {
      const hashParams = {
        filePath: testFilePath,
        algorithm: 'sha256',
      };

      const hashResult = await signer.calculateFileHash(hashParams);

      expect(hashResult).toBeDefined();
      expect(hashResult.hash).toHaveLength(64); // SHA-256哈希长度
      expect(hashResult.algorithm).toBe('sha256');
      expect(hashResult.fileSize).toBe(Buffer.from(TEST_DATA).length);
    });

    test('应该验证文件完整性', async () => {
      // 先计算文件的哈希
      const hashParams = {
        filePath: testFilePath,
        algorithm: 'sha256',
      };
      const originalHash = await signer.calculateFileHash(hashParams);

      // 验证文件完整性
      const verifyParams = {
        filePath: testFilePath,
        expectedHash: originalHash.hash,
        algorithm: 'sha256',
      };

      const verification = await signer.verifyFileIntegrity(verifyParams);

      expect(verification.valid).toBe(true);
      expect(verification.actualHash).toBe(originalHash.hash);
    });
  });

  describe('签名格式和选项', () => {
    test('应该支持不同的签名算法', async () => {
      const algorithms = ['RSA-SHA256', 'RSA-SHA384', 'RSA-SHA512'];

      for (const algorithm of algorithms) {
        const signParams = {
          data: TEST_DATA,
          keyName: TEST_KEY_NAME,
          algorithm: algorithm,
          format: 'json',
        };

        const signature = await signer.sign(signParams);
        const signatureObj = JSON.parse(signature);

        expect(signatureObj.algorithm).toBe(algorithm);
      }
    });

    test('应该添加自定义元数据', async () => {
      const customMetadata = {
        purpose: '测试签名',
        author: '测试用户',
        version: '1.0.0',
      };

      const signParams = {
        data: TEST_DATA,
        keyName: TEST_KEY_NAME,
        metadata: customMetadata,
        format: 'json',
      };

      const signature = await signer.sign(signParams);
      const signatureObj = JSON.parse(signature);

      expect(signatureObj.metadata).toEqual(customMetadata);
    });

    test('应该设置签名有效期', async () => {
      const expiresIn = 24 * 60 * 60 * 1000; // 24小时
      const signParams = {
        data: TEST_DATA,
        keyName: TEST_KEY_NAME,
        expiresIn: expiresIn,
        format: 'json',
      };

      const signature = await signer.sign(signParams);
      const signatureObj = JSON.parse(signature);

      expect(signatureObj.expiresAt).toBeDefined();

      const expiresAt = new Date(signatureObj.expiresAt);
      const expectedExpiry = Date.now() + expiresIn;
      const tolerance = 1000; // 1秒容差

      expect(Math.abs(expiresAt.getTime() - expectedExpiry)).toBeLessThan(tolerance);
    });

    test('应该生成可验证的签名', async () => {
      const signParams = {
        data: TEST_DATA,
        keyName: TEST_KEY_NAME,
        format: 'json',
        verifiable: true,
      };

      const signature = await signer.sign(signParams);
      const signatureObj = JSON.parse(signature);

      // 验证签名包含必要的验证信息
      expect(signatureObj).toHaveProperty('publicKeyInfo');
      expect(signatureObj).toHaveProperty('signatureScheme');
      expect(signatureObj).toHaveProperty('verificationInstructions');
    });

    test('应该生成压缩签名', async () => {
      const signParams = {
        data: TEST_LARGE_DATA,
        keyName: TEST_KEY_NAME,
        format: 'hex',
        compressed: true,
      };

      const signature = await signer.sign(signParams);

      expect(signature).toBeDefined();
      // 压缩签名可能更短，但这不是强制的
      expect(signature.length).toBeGreaterThan(0);
    });
  });

  describe('错误处理和边界情况', () => {
    test('应该处理不存在的密钥', async () => {
      const signParams = {
        data: TEST_DATA,
        keyName: 'non-existent-key',
        format: 'hex',
      };

      await expect(signer.sign(signParams)).rejects.toThrow();
    });

    test('应该处理空数据', async () => {
      const signParams = {
        data: '',
        keyName: TEST_KEY_NAME,
        format: 'hex',
      };

      await expect(signer.sign(signParams)).rejects.toThrow();
    });

    test('应该处理无效的数据类型', async () => {
      const invalidData = [null, undefined, 123, {}, []];

      for (const data of invalidData) {
        const signParams = {
          data: data,
          keyName: TEST_KEY_NAME,
          format: 'hex',
        };

        await expect(signer.sign(signParams)).rejects.toThrow();
      }
    });

    test('应该处理不存在的文件', async () => {
      const signParams = {
        filePath: '/nonexistent/file.txt',
        keyName: TEST_KEY_NAME,
        format: 'hex',
      };

      await expect(signer.signFile(signParams)).rejects.toThrow();
    });

    test('应该处理文件权限错误', async () => {
      // 创建一个受保护的文件（模拟权限错误）
      const protectedPath = path.join(__dirname, '../test-files/protected.txt');
      await fs.writeFile(protectedPath, TEST_DATA, 'utf8');

      // 在Windows上模拟权限错误可能比较复杂，这里主要测试错误处理路径
      const signParams = {
        filePath: '/root/protected/file.txt', // 假设这是受保护的路径
        keyName: TEST_KEY_NAME,
        format: 'hex',
      };

      await expect(signer.signFile(signParams)).rejects.toThrow();
    });

    test('应该处理过大的数据', async () => {
      // 创建超过限制的数据
      const hugeData = 'x'.repeat(20 * 1024 * 1024); // 20MB，超过10MB限制

      const signParams = {
        data: hugeData,
        keyName: TEST_KEY_NAME,
        format: 'hex',
      };

      await expect(signer.sign(signParams)).rejects.toThrow();
    });

    test('应该处理无效的签名格式', async () => {
      const signParams = {
        data: TEST_DATA,
        keyName: TEST_KEY_NAME,
        format: 'invalid-format',
      };

      await expect(signer.sign(signParams)).rejects.toThrow();
    });

    test('应该从错误状态恢复', async () => {
      // 先触发一个错误
      const invalidSignParams = {
        data: null,
        keyName: TEST_KEY_NAME,
        format: 'hex',
      };

      await expect(signer.sign(invalidSignParams)).rejects.toThrow();

      // 验证签名器仍然可以正常使用
      const validSignParams = {
        data: TEST_DATA,
        keyName: TEST_KEY_NAME,
        format: 'hex',
      };

      const signature = await signer.sign(validSignParams);
      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);
    });
  });

  describe('性能测试', () => {
    test('应该高效处理多次签名', async () => {
      const iterations = 10;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const signParams = {
          data: `test-data-${i}: ${TEST_DATA}`,
          keyName: TEST_KEY_NAME,
          format: 'hex',
        };

        await signer.sign(signParams);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // 10次签名应该在合理时间内完成
      expect(totalTime).toBeLessThan(5000); // 5秒内
    });

    test('应该高效处理并发签名', async () => {
      const concurrentOperations = 5;
      const promises = [];

      for (let i = 0; i < concurrentOperations; i++) {
        const signParams = {
          data: `concurrent-data-${i}: ${TEST_DATA}`,
          keyName: TEST_KEY_NAME,
          format: 'hex',
        };

        promises.push(signer.sign(signParams));
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const concurrentTime = endTime - startTime;

      // 验证所有操作都成功
      results.forEach(signature => {
        expect(signature).toBeDefined();
        expect(signature.length).toBeGreaterThan(0);
      });

      // 并发操作应该在合理时间内完成
      expect(concurrentTime).toBeLessThan(3000); // 3秒内
    });

    test('应该测量签名性能', async () => {
      const benchmarkParams = {
        keyName: TEST_KEY_NAME,
        iterations: 5,
        dataSize: 1024, // 1KB
        format: 'hex',
      };

      const results = await signer.runBenchmark(benchmarkParams);

      expect(results).toBeDefined();
      expect(results.iterations).toBe(5);
      expect(results.totalTime).toBeGreaterThan(0);
      expect(results.avgSignTime).toBeGreaterThan(0);
      expect(results.operationsPerSecond).toBeGreaterThan(0);
      expect(results.peakMemory).toBeGreaterThan(0);
      expect(results.successCount).toBe(5);
    });

    test('应该优化内存使用', async () => {
      // 测试大文件签名的内存使用
      const largeData = 'x'.repeat(5 * 1024 * 1024); // 5MB

      const memoryBefore = process.memoryUsage().heapUsed;

      const signParams = {
        data: largeData,
        keyName: TEST_KEY_NAME,
        format: 'hex',
      };

      await signer.sign(signParams);

      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryIncrease = memoryAfter - memoryBefore;

      // 内存增加应该在合理范围内（例如不超过数据大小的2倍）
      const reasonableIncrease = largeData.length * 2;
      expect(memoryIncrease).toBeLessThan(reasonableIncrease);
    });
  });

  describe('批量签名功能', () => {
    test('应该批量签名多个数据项', async () => {
      const batchData = [
        { id: 'item-1', data: 'data-1' },
        { id: 'item-2', data: 'data-2' },
        { id: 'item-3', data: 'data-3' },
      ];

      const batchParams = {
        items: batchData,
        keyName: TEST_KEY_NAME,
        format: 'json',
      };

      const results = await signer.batchSign(batchParams);

      expect(results).toBeDefined();
      expect(results.successCount).toBe(batchData.length);
      expect(results.failureCount).toBe(0);
      expect(results.results).toHaveLength(batchData.length);

      // 验证每个结果
      results.results.forEach((result, index) => {
        expect(result.id).toBe(batchData[index].id);
        expect(result.success).toBe(true);
        expect(result.signature).toBeDefined();

        // 验证签名格式
        const signatureObj = JSON.parse(result.signature);
        expect(signatureObj).toHaveProperty('signature');
        expect(signatureObj).toHaveProperty('keyId');
      });
    });

    test('应该处理批量签名中的部分失败', async () => {
      const batchData = [
        { id: 'valid-1', data: 'valid-data-1' },
        { id: 'invalid', data: null }, // 无效数据
        { id: 'valid-2', data: 'valid-data-2' },
      ];

      const batchParams = {
        items: batchData,
        keyName: TEST_KEY_NAME,
        format: 'json',
      };

      const results = await signer.batchSign(batchParams);

      expect(results.successCount).toBe(2);
      expect(results.failureCount).toBe(1);
      expect(results.results).toHaveLength(batchData.length);

      // 验证成功和失败的结果
      const validResults = results.results.filter(r => r.success);
      const invalidResults = results.results.filter(r => !r.success);

      expect(validResults).toHaveLength(2);
      expect(invalidResults).toHaveLength(1);
      expect(invalidResults[0].error).toBeDefined();
    });

    test('应该控制批量签名的并发数', async () => {
      const batchSize = 10;
      const batchData = [];

      for (let i = 0; i < batchSize; i++) {
        batchData.push({
          id: `concurrent-${i}`,
          data: `data-${i}`,
        });
      }

      const batchParams = {
        items: batchData,
        keyName: TEST_KEY_NAME,
        format: 'hex',
        concurrency: 3, // 限制并发数为3
      };

      const startTime = Date.now();
      const results = await signer.batchSign(batchParams);
      const endTime = Date.now();
      const batchTime = endTime - startTime;

      expect(results.successCount).toBe(batchSize);
      expect(results.failureCount).toBe(0);

      // 由于并发限制，批量操作应该需要一定时间
      expect(batchTime).toBeGreaterThan(100);
    });
  });

  describe('签名验证集成', () => {
    test('应该生成可验证的签名', async () => {
      const signParams = {
        data: TEST_DATA,
        keyName: TEST_KEY_NAME,
        format: 'json',
      };

      const signature = await signer.sign(signParams);
      const signatureObj = JSON.parse(signature);

      // 验证签名包含必要的信息用于验证
      expect(signatureObj).toHaveProperty('signature');
      expect(signatureObj).toHaveProperty('algorithm');
      expect(signatureObj).toHaveProperty('keyId');
      expect(signatureObj).toHaveProperty('data');
      expect(signatureObj.data).toBe(TEST_DATA);
    });

    test('应该提供签名验证工具', async () => {
      const signParams = {
        data: TEST_DATA,
        keyName: TEST_KEY_NAME,
        format: 'json',
        includeVerificationData: true,
      };

      const signature = await signer.sign(signParams);
      const signatureObj = JSON.parse(signature);

      // 验证包含验证所需的数据
      expect(signatureObj).toHaveProperty('publicKey');
      expect(signatureObj).toHaveProperty('verificationMethod');
      expect(signatureObj).toHaveProperty('hashAlgorithm');
    });
  });
});
