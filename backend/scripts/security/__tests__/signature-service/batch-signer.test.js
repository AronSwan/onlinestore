/**
 * 批量签名器单元测试
 *
 * 测试覆盖：
 * 1. 批量数据签名
 * 2. 批量文件签名
 * 3. 并发处理控制
 * 4. 进度跟踪和报告
 * 5. 错误处理和边界情况
 * 6. 性能测试
 *
 * @author 后端开发团队
 * @version 2.0.0
 * @since 2025-10-13
 */

const { BatchSigner } = require('../../signature-service/batch-signer');
const { Signer } = require('../../signature-service/signer');
const { Verifier } = require('../../signature-service/verifier');
const { KeyManager } = require('../../key-management/key-manager');
const { Config } = require('../../shared/config');
const { SecurityUtils } = require('../../shared/security-utils');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// 测试配置
const TEST_CONFIG = {
  keyStorage: {
    path: path.join(__dirname, '../test-keys'),
    backupPath: path.join(__dirname, '../test-keys/backup'),
  },
  batchSigner: {
    defaultConcurrency: 3,
    maxConcurrency: 10,
    progressUpdateInterval: 100,
    timeout: 30000,
  },
  security: {
    level: 'high',
    minPassphraseLength: 16,
    enforceStrongPassphrase: true,
  },
};

// 测试数据
const TEST_PASSPHRASE = 'TestPassphrase123!@#';
const TEST_KEY_NAME = 'test-batch-sign-key';
const TEST_DATA_PREFIX = 'Batch test data item';

describe('批量签名器单元测试', () => {
  let batchSigner;
  let signer;
  let verifier;
  let keyManager;
  let config;
  let securityUtils;
  let testKeyInfo;
  let testBatchDir;

  beforeAll(async () => {
    config = new Config();
    securityUtils = new SecurityUtils();

    // 应用测试配置
    config.merge(TEST_CONFIG);

    // 初始化密钥管理器
    keyManager = new KeyManager();
    await fs.mkdir(TEST_CONFIG.keyStorage.path, { recursive: true });

    // 生成测试密钥
    const keyParams = {
      name: TEST_KEY_NAME,
      type: 'rsa',
      size: 2048,
      password: TEST_PASSPHRASE,
    };

    testKeyInfo = await keyManager.generateKey(keyParams);

    // 创建测试批量目录
    testBatchDir = path.join(__dirname, '../test-batch-files');
    await fs.mkdir(testBatchDir, { recursive: true });
  });

  beforeEach(async () => {
    batchSigner = new BatchSigner();
    signer = new Signer();
    verifier = new Verifier();

    // 确保测试目录为空
    try {
      const files = await fs.readdir(testBatchDir);
      for (const file of files) {
        await fs.unlink(path.join(testBatchDir, file));
      }
    } catch (error) {
      // 忽略错误
    }
  });

  afterEach(async () => {
    // 清理测试文件
    try {
      const files = await fs.readdir(testBatchDir);
      for (const file of files) {
        await fs.unlink(path.join(testBatchDir, file));
      }
    } catch (error) {
      // 忽略清理错误
    }
  });

  afterAll(async () => {
    // 清理测试目录
    try {
      await fs.rm(TEST_CONFIG.keyStorage.path, { recursive: true, force: true });
      await fs.rm(testBatchDir, { recursive: true, force: true });
      await fs.rm(path.join(__dirname, '../test-batch-results'), { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('批量数据签名', () => {
    test('应该批量签名多个数据项', async () => {
      const batchItems = [
        { id: 'item-1', data: 'Data for item 1' },
        { id: 'item-2', data: 'Data for item 2' },
        { id: 'item-3', data: 'Data for item 3' },
        { id: 'item-4', data: 'Data for item 4' },
        { id: 'item-5', data: 'Data for item 5' },
      ];

      const batchParams = {
        items: batchItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
      };

      const results = await batchSigner.signBatch(batchParams);

      expect(results).toBeDefined();
      expect(results.totalItems).toBe(batchItems.length);
      expect(results.successCount).toBe(batchItems.length);
      expect(results.failedCount).toBe(0);
      expect(results.results).toHaveLength(batchItems.length);

      // 验证每个结果
      results.results.forEach((result, index) => {
        expect(result.id).toBe(batchItems[index].id);
        expect(result.success).toBe(true);
        expect(result.signature).toBeDefined();
        expect(result.timestamp).toBeDefined();
      });

      // 验证签名有效性
      for (const result of results.results) {
        const verifyParams = {
          data: batchItems.find(item => item.id === result.id).data,
          signature: result.signature,
          keyName: TEST_KEY_NAME,
        };
        const verification = await verifier.verify(verifyParams);
        expect(verification.valid).toBe(true);
      }
    });

    test('应该处理批量签名中的部分失败', async () => {
      const batchItems = [
        { id: 'valid-1', data: 'Valid data 1' },
        { id: 'invalid', data: null }, // 无效数据
        { id: 'valid-2', data: 'Valid data 2' },
        { id: 'empty', data: '' }, // 空数据
        { id: 'valid-3', data: 'Valid data 3' },
      ];

      const batchParams = {
        items: batchItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
      };

      const results = await batchSigner.signBatch(batchParams);

      expect(results.totalItems).toBe(batchItems.length);
      expect(results.successCount).toBe(3); // 3个有效数据
      expect(results.failedCount).toBe(2); // 2个失败
      expect(results.results).toHaveLength(batchItems.length);

      // 验证成功和失败的结果
      const successResults = results.results.filter(r => r.success);
      const failedResults = results.results.filter(r => !r.success);

      expect(successResults).toHaveLength(3);
      expect(failedResults).toHaveLength(2);

      // 验证失败原因
      const invalidResult = failedResults.find(r => r.id === 'invalid');
      const emptyResult = failedResults.find(r => r.id === 'empty');

      expect(invalidResult.error).toBeDefined();
      expect(emptyResult.error).toBeDefined();
    });

    test('应该使用不同的签名格式', async () => {
      const batchItems = [
        { id: 'hex-item', data: 'Hex format data' },
        { id: 'base64-item', data: 'Base64 format data' },
        { id: 'json-item', data: 'JSON format data' },
      ];

      // 测试十六进制格式
      const hexParams = {
        items: batchItems,
        keyName: TEST_KEY_NAME,
        format: 'hex',
      };

      const hexResults = await batchSigner.signBatch(hexParams);
      expect(hexResults.successCount).toBe(3);

      // 验证十六进制格式签名
      const hexSignature = hexResults.results[0].signature;
      expect(typeof hexSignature).toBe('string');
      expect(hexSignature).toMatch(/^[0-9a-f]+$/i); // 十六进制格式

      // 测试Base64格式
      const base64Params = {
        items: batchItems,
        keyName: TEST_KEY_NAME,
        format: 'base64',
      };

      const base64Results = await batchSigner.signBatch(base64Params);
      expect(base64Results.successCount).toBe(3);

      // 验证Base64格式签名
      const base64Signature = base64Results.results[0].signature;
      expect(typeof base64Signature).toBe('string');
      expect(base64Signature).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64格式
    });

    test('应该添加时间戳到批量签名', async () => {
      const batchItems = [
        { id: 'timestamp-1', data: 'Timestamp test 1' },
        { id: 'timestamp-2', data: 'Timestamp test 2' },
      ];

      const batchParams = {
        items: batchItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
        timestamp: true,
      };

      const results = await batchSigner.signBatch(batchParams);

      expect(results.successCount).toBe(2);

      // 验证每个签名都包含时间戳
      results.results.forEach(result => {
        const signatureData = JSON.parse(result.signature);
        expect(signatureData.timestamp).toBeDefined();
        expect(new Date(signatureData.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
      });
    });

    test('应该使用分离签名', async () => {
      const batchItems = [
        { id: 'detached-1', data: 'Detached test 1' },
        { id: 'detached-2', data: 'Detached test 2' },
      ];

      const batchParams = {
        items: batchItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
        detached: true,
      };

      const results = await batchSigner.signBatch(batchParams);

      expect(results.successCount).toBe(2);

      // 验证分离签名
      results.results.forEach(result => {
        const signatureData = JSON.parse(result.signature);
        expect(signatureData.detached).toBe(true);
        expect(signatureData.dataHash).toBeDefined();

        // 验证分离签名有效性
        const originalItem = batchItems.find(item => item.id === result.id);
        const verifyParams = {
          data: originalItem.data,
          signature: result.signature,
          keyName: TEST_KEY_NAME,
          detached: true,
        };

        return expect(verifier.verify(verifyParams)).resolves.toMatchObject({
          valid: true,
          detached: true,
        });
      });
    });
  });

  describe('批量文件签名', () => {
    let testFiles = [];

    beforeEach(async () => {
      // 创建测试文件
      testFiles = [
        { name: 'batch-file-1.txt', content: 'Batch file content 1' },
        { name: 'batch-file-2.txt', content: 'Batch file content 2' },
        { name: 'batch-file-3.txt', content: 'Batch file content 3' },
        { name: 'batch-file-4.txt', content: 'Batch file content 4' },
        { name: 'batch-file-5.txt', content: 'Batch file content 5' },
      ];

      for (const file of testFiles) {
        await fs.writeFile(path.join(testBatchDir, file.name), file.content, 'utf8');
      }
    });

    test('应该批量签名多个文件', async () => {
      const filePaths = testFiles.map(file => path.join(testBatchDir, file.name));

      const batchParams = {
        filePaths: filePaths,
        keyName: TEST_KEY_NAME,
        outputDirectory: testBatchDir,
      };

      const results = await batchSigner.signFileBatch(batchParams);

      expect(results).toBeDefined();
      expect(results.totalFiles).toBe(filePaths.length);
      expect(results.successCount).toBe(filePaths.length);
      expect(results.failedCount).toBe(0);
      expect(results.results).toHaveLength(filePaths.length);

      // 验证每个结果
      results.results.forEach((result, index) => {
        expect(result.filePath).toBe(filePaths[index]);
        expect(result.success).toBe(true);
        expect(result.signaturePath).toBeDefined();
        expect(result.timestamp).toBeDefined();
      });

      // 验证签名文件存在
      for (const result of results.results) {
        const signatureExists = await fs
          .access(result.signaturePath)
          .then(() => true)
          .catch(() => false);
        expect(signatureExists).toBe(true);

        // 验证签名有效性
        const verifyParams = {
          filePath: result.filePath,
          signaturePath: result.signaturePath,
          keyName: TEST_KEY_NAME,
        };
        const verification = await verifier.verifyFile(verifyParams);
        expect(verification.valid).toBe(true);
      }
    });

    test('应该处理批量文件签名中的部分失败', async () => {
      const filePaths = [
        path.join(testBatchDir, 'batch-file-1.txt'), // 有效文件
        path.join(testBatchDir, 'non-existent.txt'), // 不存在的文件
        path.join(testBatchDir, 'batch-file-3.txt'), // 有效文件
        '/invalid/path/file.txt', // 无效路径
        path.join(testBatchDir, 'batch-file-5.txt'), // 有效文件
      ];

      const batchParams = {
        filePaths: filePaths,
        keyName: TEST_KEY_NAME,
        outputDirectory: testBatchDir,
      };

      const results = await batchSigner.signFileBatch(batchParams);

      expect(results.totalFiles).toBe(filePaths.length);
      expect(results.successCount).toBe(3); // 3个有效文件
      expect(results.failedCount).toBe(2); // 2个失败
      expect(results.results).toHaveLength(filePaths.length);

      // 验证成功和失败的结果
      const successResults = results.results.filter(r => r.success);
      const failedResults = results.results.filter(r => !r.success);

      expect(successResults).toHaveLength(3);
      expect(failedResults).toHaveLength(2);

      // 验证失败原因
      failedResults.forEach(failedResult => {
        expect(failedResult.error).toBeDefined();
      });
    });

    test('应该使用自定义签名文件扩展名', async () => {
      const filePaths = testFiles.slice(0, 2).map(file => path.join(testBatchDir, file.name));

      const batchParams = {
        filePaths: filePaths,
        keyName: TEST_KEY_NAME,
        outputDirectory: testBatchDir,
        signatureExtension: '.signature', // 自定义扩展名
      };

      const results = await batchSigner.signFileBatch(batchParams);

      expect(results.successCount).toBe(2);

      // 验证使用自定义扩展名
      results.results.forEach(result => {
        expect(result.signaturePath).toMatch(/\.signature$/);
        const signatureExists = fs
          .access(result.signaturePath)
          .then(() => true)
          .catch(() => false);
        expect(signatureExists).resolves.toBe(true);
      });
    });

    test('应该备份原始文件', async () => {
      const backupDir = path.join(__dirname, '../test-batch-backups');
      const filePaths = testFiles.slice(0, 2).map(file => path.join(testBatchDir, file.name));

      const batchParams = {
        filePaths: filePaths,
        keyName: TEST_KEY_NAME,
        outputDirectory: testBatchDir,
        backupOriginal: true,
        backupDirectory: backupDir,
      };

      const results = await batchSigner.signFileBatch(batchParams);

      expect(results.successCount).toBe(2);

      // 验证备份文件存在
      for (const filePath of filePaths) {
        const fileName = path.basename(filePath);
        const backupPath = path.join(backupDir, fileName);
        const backupExists = await fs
          .access(backupPath)
          .then(() => true)
          .catch(() => false);
        expect(backupExists).toBe(true);

        // 验证备份文件内容
        const originalContent = await fs.readFile(filePath, 'utf8');
        const backupContent = await fs.readFile(backupPath, 'utf8');
        expect(backupContent).toBe(originalContent);
      }

      // 清理备份目录
      await fs.rm(backupDir, { recursive: true, force: true });
    });

    test('应该处理大文件批量签名', async () => {
      // 创建大文件
      const largeFiles = [
        { name: 'large-file-1.txt', size: 1024 * 50 }, // 50KB
        { name: 'large-file-2.txt', size: 1024 * 100 }, // 100KB
        { name: 'large-file-3.txt', size: 1024 * 200 }, // 200KB
      ];

      for (const file of largeFiles) {
        const content = 'x'.repeat(file.size);
        await fs.writeFile(path.join(testBatchDir, file.name), content, 'utf8');
      }

      const filePaths = largeFiles.map(file => path.join(testBatchDir, file.name));

      const batchParams = {
        filePaths: filePaths,
        keyName: TEST_KEY_NAME,
        outputDirectory: testBatchDir,
      };

      const results = await batchSigner.signFileBatch(batchParams);

      expect(results.successCount).toBe(largeFiles.length);

      // 验证大文件签名有效性
      for (const result of results.results) {
        const verifyParams = {
          filePath: result.filePath,
          signaturePath: result.signaturePath,
          keyName: TEST_KEY_NAME,
        };
        const verification = await verifier.verifyFile(verifyParams);
        expect(verification.valid).toBe(true);
      }
    });
  });

  describe('并发处理控制', () => {
    test('应该控制并发处理数量', async () => {
      const batchItems = [];
      for (let i = 0; i < 10; i++) {
        batchItems.push({
          id: `concurrent-${i}`,
          data: `Concurrent test data ${i}`,
        });
      }

      const batchParams = {
        items: batchItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
        concurrency: 2, // 限制并发数为2
      };

      const startTime = Date.now();
      const results = await batchSigner.signBatch(batchParams);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(results.successCount).toBe(10);

      // 由于并发限制为2，处理10个项目应该需要一定时间
      expect(processingTime).toBeGreaterThan(100);
    });

    test('应该处理高并发场景', async () => {
      const batchItems = [];
      for (let i = 0; i < 20; i++) {
        batchItems.push({
          id: `high-concurrent-${i}`,
          data: `High concurrent test data ${i}`,
        });
      }

      const batchParams = {
        items: batchItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
        concurrency: 10, // 高并发
      };

      const results = await batchSigner.signBatch(batchParams);

      expect(results.successCount).toBe(20);
      expect(results.failedCount).toBe(0);

      // 验证所有签名有效
      for (const result of results.results) {
        const originalItem = batchItems.find(item => item.id === result.id);
        const verifyParams = {
          data: originalItem.data,
          signature: result.signature,
          keyName: TEST_KEY_NAME,
        };
        const verification = await verifier.verify(verifyParams);
        expect(verification.valid).toBe(true);
      }
    });

    test('应该处理零并发场景', async () => {
      const batchItems = [
        { id: 'sequential-1', data: 'Sequential test 1' },
        { id: 'sequential-2', data: 'Sequential test 2' },
        { id: 'sequential-3', data: 'Sequential test 3' },
      ];

      const batchParams = {
        items: batchItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
        concurrency: 1, // 顺序处理
      };

      const startTime = Date.now();
      const results = await batchSigner.signBatch(batchParams);
      const endTime = Date.now();
      const sequentialTime = endTime - startTime;

      expect(results.successCount).toBe(3);

      // 顺序处理应该需要一定时间
      expect(sequentialTime).toBeGreaterThan(50);
    });

    test('应该限制最大并发数', async () => {
      const batchItems = [];
      for (let i = 0; i < 15; i++) {
        batchItems.push({
          id: `max-concurrent-${i}`,
          data: `Max concurrent test data ${i}`,
        });
      }

      const batchParams = {
        items: batchItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
        concurrency: 20, // 超过默认最大并发数
      };

      const results = await batchSigner.signBatch(batchParams);

      expect(results.successCount).toBe(15);

      // 验证并发数被限制在合理范围内
      expect(results.actualConcurrency).toBeLessThanOrEqual(TEST_CONFIG.batchSigner.maxConcurrency);
    });
  });

  describe('进度跟踪和报告', () => {
    test('应该跟踪批量操作进度', async () => {
      const batchItems = [];
      for (let i = 0; i < 5; i++) {
        batchItems.push({
          id: `progress-${i}`,
          data: `Progress test data ${i}`,
        });
      }

      const batchParams = {
        items: batchItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
        trackProgress: true,
      };

      let progressUpdates = 0;
      const progressCallback = progress => {
        progressUpdates++;
        expect(progress).toBeDefined();
        expect(progress.total).toBe(5);
        expect(progress.completed).toBeGreaterThanOrEqual(0);
        expect(progress.completed).toBeLessThanOrEqual(5);
        expect(progress.percentage).toBeGreaterThanOrEqual(0);
        expect(progress.percentage).toBeLessThanOrEqual(100);
      };

      batchParams.progressCallback = progressCallback;

      const results = await batchSigner.signBatch(batchParams);

      expect(results.successCount).toBe(5);
      expect(progressUpdates).toBeGreaterThan(0); // 应该有进度更新
    });

    test('应该生成详细批量报告', async () => {
      const batchItems = [
        { id: 'report-1', data: 'Report test 1' },
        { id: 'report-2', data: 'Report test 2' },
        { id: 'report-3', data: 'Report test 3' },
      ];

      const batchParams = {
        items: batchItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
        generateReport: true,
      };

      const results = await batchSigner.signBatch(batchParams);

      expect(results.report).toBeDefined();
      expect(results.report.batchId).toBeDefined();
      expect(results.report.startTime).toBeDefined();
      expect(results.report.endTime).toBeDefined();
      expect(results.report.duration).toBeGreaterThan(0);
      expect(results.report.summary).toBeDefined();
      expect(results.report.details).toBeDefined();
    });

    test('应该保存批量报告到文件', async () => {
      const reportDir = path.join(__dirname, '../test-batch-results');
      const batchItems = [
        { id: 'save-report-1', data: 'Save report test 1' },
        { id: 'save-report-2', data: 'Save report test 2' },
      ];

      const batchParams = {
        items: batchItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
        reportPath: path.join(reportDir, 'batch-report.json'),
      };

      const results = await batchSigner.signBatch(batchParams);

      expect(results.reportSaved).toBe(true);
      expect(results.reportPath).toBe(batchParams.reportPath);

      // 验证报告文件存在
      const reportExists = await fs
        .access(batchParams.reportPath)
        .then(() => true)
        .catch(() => false);
      expect(reportExists).toBe(true);

      // 验证报告内容
      const reportContent = await fs.readFile(batchParams.reportPath, 'utf8');
      const report = JSON.parse(reportContent);
      expect(report.summary.totalItems).toBe(2);
      expect(report.summary.successCount).toBe(2);

      // 清理报告目录
      await fs.rm(reportDir, { recursive: true, force: true });
    });

    test('应该提供批量统计信息', async () => {
      // 执行一些批量操作
      const batchItems1 = [
        { id: 'stats-1', data: 'Stats test 1' },
        { id: 'stats-2', data: 'Stats test 2' },
      ];

      const batchItems2 = [
        { id: 'stats-3', data: 'Stats test 3' },
        { id: 'stats-4', data: 'Stats test 4' },
        { id: 'stats-5', data: 'Stats test 5' },
      ];

      await batchSigner.signBatch({
        items: batchItems1,
        keyName: TEST_KEY_NAME,
        format: 'json',
      });

      await batchSigner.signBatch({
        items: batchItems2,
        keyName: TEST_KEY_NAME,
        format: 'json',
      });

      const stats = await batchSigner.getBatchStats();

      expect(stats).toBeDefined();
      expect(stats.totalBatches).toBeGreaterThanOrEqual(2);
      expect(stats.totalItemsProcessed).toBeGreaterThanOrEqual(5);
      expect(stats.successfulItems).toBeGreaterThanOrEqual(5);
      expect(stats.failedItems).toBe(0);
      expect(stats.averageBatchSize).toBeGreaterThan(0);
      expect(stats.averageProcessingTime).toBeGreaterThan(0);
    });
  });

  describe('错误处理和边界情况', () => {
    test('应该处理空批量项目', async () => {
      const batchParams = {
        items: [],
        keyName: TEST_KEY_NAME,
        format: 'json',
      };

      const results = await batchSigner.signBatch(batchParams);

      expect(results.totalItems).toBe(0);
      expect(results.successCount).toBe(0);
      expect(results.failedCount).toBe(0);
      expect(results.results).toHaveLength(0);
    });

    test('应该处理无效的密钥', async () => {
      const batchItems = [
        { id: 'invalid-key-1', data: 'Invalid key test 1' },
        { id: 'invalid-key-2', data: 'Invalid key test 2' },
      ];

      const batchParams = {
        items: batchItems,
        keyName: 'non-existent-key',
        format: 'json',
      };

      const results = await batchSigner.signBatch(batchParams);

      expect(results.successCount).toBe(0);
      expect(results.failedCount).toBe(2);

      // 验证所有结果都有错误
      results.results.forEach(result => {
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    test('应该处理超时情况', async () => {
      const batchItems = [];
      for (let i = 0; i < 5; i++) {
        batchItems.push({
          id: `timeout-${i}`,
          data: `Timeout test data ${i}`,
        });
      }

      const batchParams = {
        items: batchItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
        timeout: 10, // 非常短的超时时间（10ms）
      };

      const results = await batchSigner.signBatch(batchParams);

      // 由于超时时间太短，可能有些项目会失败
      expect(results.failedCount).toBeGreaterThan(0);

      // 验证失败结果有超时错误
      const failedResults = results.results.filter(r => !r.success);
      failedResults.forEach(failedResult => {
        expect(failedResult.error).toContain('超时');
      });
    });

    test('应该处理内存限制', async () => {
      // 创建大量数据项来测试内存管理
      const largeBatchItems = [];
      for (let i = 0; i < 100; i++) {
        largeBatchItems.push({
          id: `memory-${i}`,
          data: 'x'.repeat(1024), // 每个1KB，总共约100KB
        });
      }

      const batchParams = {
        items: largeBatchItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
        concurrency: 5,
      };

      const results = await batchSigner.signBatch(batchParams);

      expect(results.totalItems).toBe(100);
      expect(results.successCount).toBe(100);

      // 验证批量签名器能够处理大量数据而不崩溃
      expect(results.results).toHaveLength(100);
    });

    test('应该从部分失败中恢复', async () => {
      const batchItems = [
        { id: 'recovery-1', data: 'Recovery test 1' },
        { id: 'recovery-2', data: null }, // 会失败
        { id: 'recovery-3', data: 'Recovery test 3' },
      ];

      const batchParams = {
        items: batchItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
      };

      const results = await batchSigner.signBatch(batchParams);

      expect(results.successCount).toBe(2);
      expect(results.failedCount).toBe(1);

      // 验证批量签名器在部分失败后仍然返回完整结果
      expect(results.results).toHaveLength(3);

      // 验证成功的项目仍然有效
      const successResults = results.results.filter(r => r.success);
      for (const result of successResults) {
        const originalItem = batchItems.find(item => item.id === result.id);
        const verifyParams = {
          data: originalItem.data,
          signature: result.signature,
          keyName: TEST_KEY_NAME,
        };
        const verification = await verifier.verify(verifyParams);
        expect(verification.valid).toBe(true);
      }
    });

    test('应该处理取消操作', async () => {
      const batchItems = [];
      for (let i = 0; i < 10; i++) {
        batchItems.push({
          id: `cancel-${i}`,
          data: `Cancel test data ${i}`,
        });
      }

      const batchParams = {
        items: batchItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
      };

      // 启动批量操作，然后立即取消
      const batchPromise = batchSigner.signBatch(batchParams);

      // 立即取消
      await batchSigner.cancelCurrentBatch();

      const results = await batchPromise;

      // 取消后可能有些项目已完成，有些被取消
      expect(results.cancelled).toBe(true);
      expect(results.completedBeforeCancel).toBeGreaterThanOrEqual(0);
      expect(results.completedBeforeCancel).toBeLessThanOrEqual(10);
    });
  });

  describe('性能测试', () => {
    test('应该测量批量签名性能', async () => {
      const benchmarkParams = {
        keyName: TEST_KEY_NAME,
        itemCount: 10,
        dataSize: 1024, // 1KB
        concurrency: 3,
      };

      const results = await batchSigner.runBenchmark(benchmarkParams);

      expect(results).toBeDefined();
      expect(results.itemCount).toBe(10);
      expect(results.totalTime).toBeGreaterThan(0);
      expect(results.avgSignTime).toBeGreaterThan(0);
      expect(results.itemsPerSecond).toBeGreaterThan(0);
      expect(results.successCount).toBe(10);
      expect(results.memoryUsage).toBeDefined();
    });

    test('应该优化大批量处理', async () => {
      const largeBatchItems = [];
      for (let i = 0; i < 50; i++) {
        largeBatchItems.push({
          id: `large-batch-${i}`,
          data: `Large batch test data ${i}`,
        });
      }

      const startTime = Date.now();

      const batchParams = {
        items: largeBatchItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
        concurrency: 5,
      };

      const results = await batchSigner.signBatch(batchParams);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(results.successCount).toBe(50);

      // 50个项目应该在合理时间内完成
      expect(processingTime).toBeLessThan(5000); // 5秒内
    });

    test('应该比较不同并发数的性能', async () => {
      const testItems = [];
      for (let i = 0; i < 20; i++) {
        testItems.push({
          id: `concurrency-compare-${i}`,
          data: `Concurrency compare test data ${i}`,
        });
      }

      // 测试低并发
      const lowConcurrencyParams = {
        items: testItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
        concurrency: 2,
      };

      const lowStartTime = Date.now();
      const lowResults = await batchSigner.signBatch(lowConcurrencyParams);
      const lowTime = Date.now() - lowStartTime;

      // 测试高并发
      const highConcurrencyParams = {
        items: testItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
        concurrency: 10,
      };

      const highStartTime = Date.now();
      const highResults = await batchSigner.signBatch(highConcurrencyParams);
      const highTime = Date.now() - highStartTime;

      expect(lowResults.successCount).toBe(20);
      expect(highResults.successCount).toBe(20);

      // 高并发应该比低并发快（或至少不慢）
      expect(highTime).toBeLessThanOrEqual(lowTime * 1.5); // 允许50%的误差
    });

    test('应该处理压力测试', async () => {
      const stressItems = [];
      for (let i = 0; i < 100; i++) {
        stressItems.push({
          id: `stress-${i}`,
          data: `Stress test data ${i} - ${'x'.repeat(100)}`, // 每个约120字节
        });
      }

      const batchParams = {
        items: stressItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
        concurrency: 10,
      };

      const results = await batchSigner.signBatch(batchParams);

      expect(results.successCount).toBe(100);
      expect(results.failedCount).toBe(0);

      // 验证压力测试后批量签名器仍然正常工作
      const followUpItems = [
        { id: 'follow-up-1', data: 'Follow up test 1' },
        { id: 'follow-up-2', data: 'Follow up test 2' },
      ];

      const followUpResults = await batchSigner.signBatch({
        items: followUpItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
      });

      expect(followUpResults.successCount).toBe(2);
    });
  });

  describe('批量操作管理', () => {
    test('应该暂停和恢复批量操作', async () => {
      const batchItems = [];
      for (let i = 0; i < 5; i++) {
        batchItems.push({
          id: `pause-resume-${i}`,
          data: `Pause resume test data ${i}`,
        });
      }

      const batchParams = {
        items: batchItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
        concurrency: 1, // 顺序处理以便控制
      };

      let paused = false;
      let resumed = false;

      // 监听进度以在中间暂停
      batchParams.progressCallback = async progress => {
        if (progress.completed === 2 && !paused) {
          paused = true;
          await batchSigner.pauseCurrentBatch();

          // 验证操作已暂停
          const status = await batchSigner.getBatchStatus();
          expect(status.paused).toBe(true);

          // 等待一会然后恢复
          setTimeout(async () => {
            await batchSigner.resumeCurrentBatch();
            resumed = true;
          }, 100);
        }
      };

      const results = await batchSigner.signBatch(batchParams);

      expect(results.successCount).toBe(5);
      expect(paused).toBe(true);
      expect(resumed).toBe(true);
    });

    test('应该获取批量操作状态', async () => {
      const batchItems = [
        { id: 'status-1', data: 'Status test 1' },
        { id: 'status-2', data: 'Status test 2' },
      ];

      const batchParams = {
        items: batchItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
      };

      // 在操作进行中获取状态
      const batchPromise = batchSigner.signBatch(batchParams);

      // 立即获取状态
      const status = await batchSigner.getBatchStatus();

      expect(status).toBeDefined();
      expect(status.active).toBe(true);
      expect(status.totalItems).toBe(2);
      expect(status.completedItems).toBeGreaterThanOrEqual(0);
      expect(status.percentage).toBeGreaterThanOrEqual(0);

      await batchPromise; // 等待操作完成
    });

    test('应该清理完成的批量操作', async () => {
      // 执行一些批量操作
      const batchItems = [
        { id: 'cleanup-1', data: 'Cleanup test 1' },
        { id: 'cleanup-2', data: 'Cleanup test 2' },
      ];

      await batchSigner.signBatch({
        items: batchItems,
        keyName: TEST_KEY_NAME,
        format: 'json',
      });

      const cleanupResult = await batchSigner.cleanupCompletedBatches();

      expect(cleanupResult.cleanedCount).toBeGreaterThan(0);

      // 验证状态已重置
      const status = await batchSigner.getBatchStatus();
      expect(status.active).toBe(false);
    });
  });
});
