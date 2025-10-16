/**
 * 自动签名器单元测试
 *
 * 测试覆盖：
 * 1. 文件监控和自动签名
 * 2. 监控目录管理
 * 3. 文件过滤规则
 * 4. 签名策略配置
 * 5. 错误处理和边界情况
 * 6. 性能测试
 *
 * @author 后端开发团队
 * @version 2.0.0
 * @since 2025-10-13
 */

const { AutoSigner } = require('../../signature-service/auto-signer');
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
  autoSigner: {
    defaultKey: 'test-auto-sign-key',
    watchInterval: 1000, // 1秒监控间隔
    maxFileSize: 10 * 1024 * 1024, // 10MB
    signatureFormat: 'json',
    backupSignedFiles: true,
  },
  security: {
    level: 'high',
    minPassphraseLength: 16,
    enforceStrongPassphrase: true,
  },
};

// 测试数据
const TEST_PASSPHRASE = 'TestPassphrase123!@#';
const TEST_KEY_NAME = 'test-auto-sign-key';
const TEST_DATA = 'Hello, World! This is test data for auto-signer.';

describe('自动签名器单元测试', () => {
  let autoSigner;
  let signer;
  let verifier;
  let keyManager;
  let config;
  let securityUtils;
  let testKeyInfo;
  let testWatchDir;

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

    // 创建测试监控目录
    testWatchDir = path.join(__dirname, '../test-watch-dir');
    await fs.mkdir(testWatchDir, { recursive: true });
  });

  beforeEach(async () => {
    autoSigner = new AutoSigner();
    signer = new Signer();
    verifier = new Verifier();

    // 确保测试目录为空
    try {
      const files = await fs.readdir(testWatchDir);
      for (const file of files) {
        await fs.unlink(path.join(testWatchDir, file));
      }
    } catch (error) {
      // 忽略错误
    }
  });

  afterEach(async () => {
    // 停止所有监控
    try {
      await autoSigner.stopAllWatchers();
    } catch (error) {
      // 忽略停止错误
    }

    // 清理测试文件
    try {
      const files = await fs.readdir(testWatchDir);
      for (const file of files) {
        await fs.unlink(path.join(testWatchDir, file));
      }
    } catch (error) {
      // 忽略清理错误
    }
  });

  afterAll(async () => {
    // 清理测试目录
    try {
      await fs.rm(TEST_CONFIG.keyStorage.path, { recursive: true, force: true });
      await fs.rm(testWatchDir, { recursive: true, force: true });
      await fs.rm(path.join(__dirname, '../test-signed-backups'), { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('文件监控和自动签名', () => {
    test('应该启动目录监控', async () => {
      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt', '*.json'],
      };

      const watcher = await autoSigner.startWatching(watchParams);

      expect(watcher).toBeDefined();
      expect(watcher.watcherId).toBeDefined();
      expect(watcher.directory).toBe(testWatchDir);
      expect(watcher.keyName).toBe(TEST_KEY_NAME);
      expect(watcher.patterns).toEqual(['*.txt', '*.json']);
      expect(watcher.active).toBe(true);
    });

    test('应该自动签名新创建的文件', async () => {
      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
      };

      await autoSigner.startWatching(watchParams);

      // 创建测试文件
      const testFilePath = path.join(testWatchDir, 'auto-sign-test.txt');
      await fs.writeFile(testFilePath, TEST_DATA, 'utf8');

      // 等待自动签名处理
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证签名文件已创建
      const signaturePath = testFilePath + '.sig';
      const signatureExists = await fs
        .access(signaturePath)
        .then(() => true)
        .catch(() => false);
      expect(signatureExists).toBe(true);

      // 验证签名文件内容
      const signatureContent = await fs.readFile(signaturePath, 'utf8');
      expect(signatureContent).toBeDefined();

      // 验证签名有效性
      const verifyParams = {
        filePath: testFilePath,
        signaturePath: signaturePath,
        keyName: TEST_KEY_NAME,
      };
      const result = await verifier.verifyFile(verifyParams);
      expect(result.valid).toBe(true);
    });

    test('应该自动签名修改的文件', async () => {
      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
        watchModifications: true,
      };

      await autoSigner.startWatching(watchParams);

      // 创建初始文件
      const testFilePath = path.join(testWatchDir, 'modification-test.txt');
      await fs.writeFile(testFilePath, 'Initial content', 'utf8');

      // 等待初始签名
      await new Promise(resolve => setTimeout(resolve, 500));

      // 修改文件内容
      await fs.writeFile(testFilePath, 'Modified content', 'utf8');

      // 等待重新签名
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证签名文件已更新
      const signaturePath = testFilePath + '.sig';
      const signatureExists = await fs
        .access(signaturePath)
        .then(() => true)
        .catch(() => false);
      expect(signatureExists).toBe(true);

      // 验证新签名有效性
      const verifyParams = {
        filePath: testFilePath,
        signaturePath: signaturePath,
        keyName: TEST_KEY_NAME,
      };
      const result = await verifier.verifyFile(verifyParams);
      expect(result.valid).toBe(true);
    });

    test('应该处理多个文件的自动签名', async () => {
      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt', '*.json'],
      };

      await autoSigner.startWatching(watchParams);

      // 创建多个测试文件
      const files = [
        { name: 'file1.txt', content: 'Content 1' },
        { name: 'file2.txt', content: 'Content 2' },
        { name: 'config.json', content: '{"test": true}' },
      ];

      for (const file of files) {
        await fs.writeFile(path.join(testWatchDir, file.name), file.content, 'utf8');
      }

      // 等待自动签名处理
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 验证所有文件都有签名
      for (const file of files) {
        const signaturePath = path.join(testWatchDir, file.name + '.sig');
        const signatureExists = await fs
          .access(signaturePath)
          .then(() => true)
          .catch(() => false);
        expect(signatureExists).toBe(true);

        // 验证签名有效性
        const verifyParams = {
          filePath: path.join(testWatchDir, file.name),
          signaturePath: signaturePath,
          keyName: TEST_KEY_NAME,
        };
        const result = await verifier.verifyFile(verifyParams);
        expect(result.valid).toBe(true);
      }
    });

    test('应该备份已签名的文件', async () => {
      const backupDir = path.join(__dirname, '../test-signed-backups');

      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
        backupSignedFiles: true,
        backupDirectory: backupDir,
      };

      await autoSigner.startWatching(watchParams);

      // 创建测试文件
      const testFilePath = path.join(testWatchDir, 'backup-test.txt');
      await fs.writeFile(testFilePath, TEST_DATA, 'utf8');

      // 等待自动签名和备份
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证备份文件存在
      const backupPath = path.join(backupDir, 'backup-test.txt');
      const backupExists = await fs
        .access(backupPath)
        .then(() => true)
        .catch(() => false);
      expect(backupExists).toBe(true);

      // 验证备份文件内容
      const backupContent = await fs.readFile(backupPath, 'utf8');
      expect(backupContent).toBe(TEST_DATA);
    });

    test('应该记录自动签名活动', async () => {
      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
        logActivity: true,
      };

      await autoSigner.startWatching(watchParams);

      // 创建测试文件
      const testFilePath = path.join(testWatchDir, 'log-test.txt');
      await fs.writeFile(testFilePath, TEST_DATA, 'utf8');

      // 等待自动签名
      await new Promise(resolve => setTimeout(resolve, 500));

      // 获取活动日志
      const activityLog = await autoSigner.getActivityLog();

      expect(activityLog).toBeDefined();
      expect(activityLog.length).toBeGreaterThan(0);

      const recentActivity = activityLog.find(
        log => log.filePath && log.filePath.includes('log-test.txt'),
      );
      expect(recentActivity).toBeDefined();
      expect(recentActivity.action).toBe('auto_sign');
      expect(recentActivity.success).toBe(true);
      expect(recentActivity.timestamp).toBeDefined();
    });
  });

  describe('监控目录管理', () => {
    test('应该列出所有活动监控器', async () => {
      const watchParams1 = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
      };

      const watchParams2 = {
        directory: path.join(__dirname, '../test-watch-dir-2'),
        keyName: TEST_KEY_NAME,
        patterns: ['*.json'],
      };

      await fs.mkdir(watchParams2.directory, { recursive: true });

      const watcher1 = await autoSigner.startWatching(watchParams1);
      const watcher2 = await autoSigner.startWatching(watchParams2);

      const activeWatchers = await autoSigner.listActiveWatchers();

      expect(activeWatchers).toBeDefined();
      expect(activeWatchers.length).toBeGreaterThanOrEqual(2);

      const foundWatcher1 = activeWatchers.find(w => w.watcherId === watcher1.watcherId);
      const foundWatcher2 = activeWatchers.find(w => w.watcherId === watcher2.watcherId);

      expect(foundWatcher1).toBeDefined();
      expect(foundWatcher2).toBeDefined();
      expect(foundWatcher1.directory).toBe(testWatchDir);
      expect(foundWatcher2.directory).toBe(watchParams2.directory);

      // 清理第二个监控目录
      await autoSigner.stopWatching(watcher2.watcherId);
      await fs.rm(watchParams2.directory, { recursive: true, force: true });
    });

    test('应该停止特定监控器', async () => {
      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
      };

      const watcher = await autoSigner.startWatching(watchParams);

      // 验证监控器正在运行
      const activeWatchers = await autoSigner.listActiveWatchers();
      const foundWatcher = activeWatchers.find(w => w.watcherId === watcher.watcherId);
      expect(foundWatcher.active).toBe(true);

      // 停止监控器
      const stopResult = await autoSigner.stopWatching(watcher.watcherId);
      expect(stopResult.stopped).toBe(true);
      expect(stopResult.watcherId).toBe(watcher.watcherId);

      // 验证监控器已停止
      const updatedWatchers = await autoSigner.listActiveWatchers();
      const stoppedWatcher = updatedWatchers.find(w => w.watcherId === watcher.watcherId);
      expect(stoppedWatcher).toBeUndefined();
    });

    test('应该停止所有监控器', async () => {
      const watchParams1 = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
      };

      const watchParams2 = {
        directory: path.join(__dirname, '../test-watch-dir-2'),
        keyName: TEST_KEY_NAME,
        patterns: ['*.json'],
      };

      await fs.mkdir(watchParams2.directory, { recursive: true });

      await autoSigner.startWatching(watchParams1);
      await autoSigner.startWatching(watchParams2);

      // 验证有多个活动监控器
      let activeWatchers = await autoSigner.listActiveWatchers();
      expect(activeWatchers.length).toBeGreaterThanOrEqual(2);

      // 停止所有监控器
      const stopResult = await autoSigner.stopAllWatchers();
      expect(stopResult.stoppedCount).toBeGreaterThanOrEqual(2);

      // 验证所有监控器已停止
      activeWatchers = await autoSigner.listActiveWatchers();
      expect(activeWatchers.length).toBe(0);

      // 清理第二个监控目录
      await fs.rm(watchParams2.directory, { recursive: true, force: true });
    });

    test('应该更新监控器配置', async () => {
      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
      };

      const watcher = await autoSigner.startWatching(watchParams);

      // 更新配置
      const updateParams = {
        patterns: ['*.txt', '*.json'],
        watchModifications: true,
        recursive: true,
      };

      const updatedWatcher = await autoSigner.updateWatcher(watcher.watcherId, updateParams);

      expect(updatedWatcher).toBeDefined();
      expect(updatedWatcher.watcherId).toBe(watcher.watcherId);
      expect(updatedWatcher.patterns).toEqual(['*.txt', '*.json']);
      expect(updatedWatcher.watchModifications).toBe(true);
      expect(updatedWatcher.recursive).toBe(true);
    });

    test('应该获取监控器状态', async () => {
      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
      };

      const watcher = await autoSigner.startWatching(watchParams);

      const status = await autoSigner.getWatcherStatus(watcher.watcherId);

      expect(status).toBeDefined();
      expect(status.watcherId).toBe(watcher.watcherId);
      expect(status.active).toBe(true);
      expect(status.directory).toBe(testWatchDir);
      expect(status.filesProcessed).toBeDefined();
      expect(status.lastActivity).toBeDefined();
      expect(status.uptime).toBeGreaterThan(0);
    });
  });

  describe('文件过滤规则', () => {
    test('应该根据文件模式过滤文件', async () => {
      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'], // 只监控.txt文件
      };

      await autoSigner.startWatching(watchParams);

      // 创建不同类型的文件
      const files = [
        { name: 'should-sign.txt', content: 'Text content' },
        { name: 'should-not-sign.json', content: '{"test": true}' },
        { name: 'also-should-not-sign.log', content: 'Log content' },
      ];

      for (const file of files) {
        await fs.writeFile(path.join(testWatchDir, file.name), file.content, 'utf8');
      }

      // 等待自动签名处理
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证只有.txt文件有签名
      const txtSignaturePath = path.join(testWatchDir, 'should-sign.txt.sig');
      const jsonSignaturePath = path.join(testWatchDir, 'should-not-sign.json.sig');
      const logSignaturePath = path.join(testWatchDir, 'also-should-not-sign.log.sig');

      const txtSignatureExists = await fs
        .access(txtSignaturePath)
        .then(() => true)
        .catch(() => false);
      const jsonSignatureExists = await fs
        .access(jsonSignaturePath)
        .then(() => true)
        .catch(() => false);
      const logSignatureExists = await fs
        .access(logSignaturePath)
        .then(() => true)
        .catch(() => false);

      expect(txtSignatureExists).toBe(true);
      expect(jsonSignatureExists).toBe(false);
      expect(logSignatureExists).toBe(false);
    });

    test('应该根据文件大小过滤文件', async () => {
      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
        maxFileSize: 100, // 只处理小于100字节的文件
      };

      await autoSigner.startWatching(watchParams);

      // 创建小文件和大文件
      const smallFile = path.join(testWatchDir, 'small.txt');
      const largeFile = path.join(testWatchDir, 'large.txt');

      await fs.writeFile(smallFile, 'Small content', 'utf8'); // 13字节
      await fs.writeFile(largeFile, 'x'.repeat(200), 'utf8'); // 200字节

      // 等待自动签名处理
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证只有小文件有签名
      const smallSignaturePath = smallFile + '.sig';
      const largeSignaturePath = largeFile + '.sig';

      const smallSignatureExists = await fs
        .access(smallSignaturePath)
        .then(() => true)
        .catch(() => false);
      const largeSignatureExists = await fs
        .access(largeSignaturePath)
        .then(() => true)
        .catch(() => false);

      expect(smallSignatureExists).toBe(true);
      expect(largeSignatureExists).toBe(false);
    });

    test('应该根据文件扩展名排除文件', async () => {
      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*'],
        excludePatterns: ['*.log', '*.tmp'], // 排除.log和.tmp文件
      };

      await autoSigner.startWatching(watchParams);

      // 创建不同类型的文件
      const files = [
        { name: 'should-sign.txt', content: 'Text content' },
        { name: 'should-not-sign.log', content: 'Log content' },
        { name: 'also-should-not-sign.tmp', content: 'Temp content' },
      ];

      for (const file of files) {
        await fs.writeFile(path.join(testWatchDir, file.name), file.content, 'utf8');
      }

      // 等待自动签名处理
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证只有非排除文件有签名
      const txtSignaturePath = path.join(testWatchDir, 'should-sign.txt.sig');
      const logSignaturePath = path.join(testWatchDir, 'should-not-sign.log.sig');
      const tmpSignaturePath = path.join(testWatchDir, 'also-should-not-sign.tmp.sig');

      const txtSignatureExists = await fs
        .access(txtSignaturePath)
        .then(() => true)
        .catch(() => false);
      const logSignatureExists = await fs
        .access(logSignaturePath)
        .then(() => true)
        .catch(() => false);
      const tmpSignatureExists = await fs
        .access(tmpSignaturePath)
        .then(() => true)
        .catch(() => false);

      expect(txtSignatureExists).toBe(true);
      expect(logSignatureExists).toBe(false);
      expect(tmpSignatureExists).toBe(false);
    });

    test('应该递归监控子目录', async () => {
      const subDir = path.join(testWatchDir, 'subdirectory');
      await fs.mkdir(subDir, { recursive: true });

      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
        recursive: true,
      };

      await autoSigner.startWatching(watchParams);

      // 在子目录中创建文件
      const subDirFile = path.join(subDir, 'subdir-file.txt');
      await fs.writeFile(subDirFile, 'Subdirectory content', 'utf8');

      // 等待自动签名处理
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证子目录中的文件也有签名
      const signaturePath = subDirFile + '.sig';
      const signatureExists = await fs
        .access(signaturePath)
        .then(() => true)
        .catch(() => false);
      expect(signatureExists).toBe(true);

      // 验证签名有效性
      const verifyParams = {
        filePath: subDirFile,
        signaturePath: signaturePath,
        keyName: TEST_KEY_NAME,
      };
      const result = await verifier.verifyFile(verifyParams);
      expect(result.valid).toBe(true);
    });

    test('应该忽略隐藏文件', async () => {
      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*'],
        ignoreHidden: true,
      };

      await autoSigner.startWatching(watchParams);

      // 创建普通文件和隐藏文件
      const normalFile = path.join(testWatchDir, 'normal.txt');
      const hiddenFile = path.join(testWatchDir, '.hidden.txt');

      await fs.writeFile(normalFile, 'Normal content', 'utf8');
      await fs.writeFile(hiddenFile, 'Hidden content', 'utf8');

      // 等待自动签名处理
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证只有普通文件有签名
      const normalSignaturePath = normalFile + '.sig';
      const hiddenSignaturePath = hiddenFile + '.sig';

      const normalSignatureExists = await fs
        .access(normalSignaturePath)
        .then(() => true)
        .catch(() => false);
      const hiddenSignatureExists = await fs
        .access(hiddenSignaturePath)
        .then(() => true)
        .catch(() => false);

      expect(normalSignatureExists).toBe(true);
      expect(hiddenSignatureExists).toBe(false);
    });
  });

  describe('签名策略配置', () => {
    test('应该使用指定的签名格式', async () => {
      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
        signatureFormat: 'json', // 指定JSON格式
      };

      await autoSigner.startWatching(watchParams);

      // 创建测试文件
      const testFilePath = path.join(testWatchDir, 'format-test.txt');
      await fs.writeFile(testFilePath, TEST_DATA, 'utf8');

      // 等待自动签名
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证签名文件格式
      const signaturePath = testFilePath + '.sig';
      const signatureContent = await fs.readFile(signaturePath, 'utf8');

      // 尝试解析JSON格式
      const signatureData = JSON.parse(signatureContent);
      expect(signatureData).toBeDefined();
      expect(signatureData.format).toBe('json');
      expect(signatureData.signature).toBeDefined();
      expect(signatureData.algorithm).toBeDefined();
    });

    test('应该使用指定的签名算法', async () => {
      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
        algorithm: 'RSA-SHA256', // 指定算法
      };

      await autoSigner.startWatching(watchParams);

      // 创建测试文件
      const testFilePath = path.join(testWatchDir, 'algorithm-test.txt');
      await fs.writeFile(testFilePath, TEST_DATA, 'utf8');

      // 等待自动签名
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证签名文件
      const signaturePath = testFilePath + '.sig';
      const signatureExists = await fs
        .access(signaturePath)
        .then(() => true)
        .catch(() => false);
      expect(signatureExists).toBe(true);

      // 验证签名有效性
      const verifyParams = {
        filePath: testFilePath,
        signaturePath: signaturePath,
        keyName: TEST_KEY_NAME,
      };
      const result = await verifier.verifyFile(verifyParams);
      expect(result.valid).toBe(true);
      expect(result.algorithm).toBe('RSA-SHA256');
    });

    test('应该添加时间戳到签名', async () => {
      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
        timestamp: true,
      };

      await autoSigner.startWatching(watchParams);

      // 创建测试文件
      const testFilePath = path.join(testWatchDir, 'timestamp-test.txt');
      await fs.writeFile(testFilePath, TEST_DATA, 'utf8');

      // 等待自动签名
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证签名文件包含时间戳
      const signaturePath = testFilePath + '.sig';
      const signatureContent = await fs.readFile(signaturePath, 'utf8');
      const signatureData = JSON.parse(signatureContent);

      expect(signatureData.timestamp).toBeDefined();
      expect(new Date(signatureData.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });

    test('应该使用分离签名', async () => {
      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
        detached: true,
      };

      await autoSigner.startWatching(watchParams);

      // 创建测试文件
      const testFilePath = path.join(testWatchDir, 'detached-test.txt');
      await fs.writeFile(testFilePath, TEST_DATA, 'utf8');

      // 等待自动签名
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证分离签名文件
      const signaturePath = testFilePath + '.sig';
      const signatureContent = await fs.readFile(signaturePath, 'utf8');
      const signatureData = JSON.parse(signatureContent);

      expect(signatureData.detached).toBe(true);
      expect(signatureData.dataHash).toBeDefined();

      // 验证分离签名有效性
      const verifyParams = {
        filePath: testFilePath,
        signaturePath: signaturePath,
        keyName: TEST_KEY_NAME,
        detached: true,
      };
      const result = await verifier.verifyFile(verifyParams);
      expect(result.valid).toBe(true);
      expect(result.detached).toBe(true);
    });

    test('应该添加自定义元数据', async () => {
      const customMetadata = {
        purpose: '自动签名测试',
        author: '测试系统',
        environment: 'test',
      };

      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
        metadata: customMetadata,
      };

      await autoSigner.startWatching(watchParams);

      // 创建测试文件
      const testFilePath = path.join(testWatchDir, 'metadata-test.txt');
      await fs.writeFile(testFilePath, TEST_DATA, 'utf8');

      // 等待自动签名
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证签名文件包含元数据
      const signaturePath = testFilePath + '.sig';
      const signatureContent = await fs.readFile(signaturePath, 'utf8');
      const signatureData = JSON.parse(signatureContent);

      expect(signatureData.metadata).toBeDefined();
      expect(signatureData.metadata.purpose).toBe('自动签名测试');
      expect(signatureData.metadata.author).toBe('测试系统');
      expect(signatureData.metadata.environment).toBe('test');
    });
  });

  describe('错误处理和边界情况', () => {
    test('应该处理不存在的监控目录', async () => {
      const nonExistentDir = path.join(__dirname, '../non-existent-dir');

      const watchParams = {
        directory: nonExistentDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
      };

      await expect(autoSigner.startWatching(watchParams)).rejects.toThrow();
    });

    test('应该处理无效的密钥', async () => {
      const watchParams = {
        directory: testWatchDir,
        keyName: 'non-existent-key',
        patterns: ['*.txt'],
      };

      await expect(autoSigner.startWatching(watchParams)).rejects.toThrow();
    });

    test('应该处理文件权限错误', async () => {
      // 在Windows上可能无法模拟权限错误，跳过此测试
      if (process.platform === 'win32') {
        console.log('跳过Windows上的文件权限测试');
        return;
      }

      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
      };

      await autoSigner.startWatching(watchParams);

      // 创建一个无法读取的文件（模拟权限错误）
      const protectedFile = path.join(testWatchDir, 'protected.txt');
      await fs.writeFile(protectedFile, 'Protected content', 'utf8');

      // 在Unix系统上修改文件权限为不可读
      await fs.chmod(protectedFile, 0o000);

      // 等待自动签名尝试
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证活动日志中有错误记录
      const activityLog = await autoSigner.getActivityLog();
      const errorActivity = activityLog.find(
        log => log.filePath && log.filePath.includes('protected.txt') && !log.success,
      );

      expect(errorActivity).toBeDefined();
      expect(errorActivity.error).toBeDefined();

      // 恢复文件权限以便清理
      await fs.chmod(protectedFile, 0o644);
    });

    test('应该处理磁盘空间不足的情况', async () => {
      // 这个测试主要是验证错误处理逻辑，实际磁盘空间不足很难模拟
      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
      };

      await autoSigner.startWatching(watchParams);

      // 创建一个大文件来模拟空间压力（但实际不会触发真正的空间不足）
      const largeFile = path.join(testWatchDir, 'large-file.txt');
      const largeContent = 'x'.repeat(100000); // 100KB
      await fs.writeFile(largeFile, largeContent, 'utf8');

      // 等待自动签名处理
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证自动签名器仍然运行正常
      const activeWatchers = await autoSigner.listActiveWatchers();
      expect(activeWatchers.length).toBeGreaterThan(0);
      expect(activeWatchers[0].active).toBe(true);
    });

    test('应该从错误状态恢复', async () => {
      // 先触发一个错误（使用无效目录）
      const invalidParams = {
        directory: '/invalid/path',
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
      };

      await expect(autoSigner.startWatching(invalidParams)).rejects.toThrow();

      // 验证自动签名器仍然可以正常使用
      const validParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
      };

      const watcher = await autoSigner.startWatching(validParams);
      expect(watcher).toBeDefined();
      expect(watcher.active).toBe(true);
    });

    test('应该处理监控器停止后的文件创建', async () => {
      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
      };

      const watcher = await autoSigner.startWatching(watchParams);

      // 停止监控器
      await autoSigner.stopWatching(watcher.watcherId);

      // 创建测试文件
      const testFilePath = path.join(testWatchDir, 'after-stop.txt');
      await fs.writeFile(testFilePath, TEST_DATA, 'utf8');

      // 等待一段时间
      await new Promise(resolve => setTimeout(resolve, 500));

      // 验证文件没有被自动签名
      const signaturePath = testFilePath + '.sig';
      const signatureExists = await fs
        .access(signaturePath)
        .then(() => true)
        .catch(() => false);
      expect(signatureExists).toBe(false);
    });
  });

  describe('性能测试', () => {
    test('应该高效处理大量文件', async () => {
      const fileCount = 10;
      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
      };

      await autoSigner.startWatching(watchParams);

      const startTime = Date.now();

      // 快速创建多个文件
      const createPromises = [];
      for (let i = 0; i < fileCount; i++) {
        const filePath = path.join(testWatchDir, `bulk-${i}.txt`);
        createPromises.push(fs.writeFile(filePath, `Content ${i}`, 'utf8'));
      }

      await Promise.all(createPromises);

      // 等待自动签名处理
      await new Promise(resolve => setTimeout(resolve, 2000));

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // 验证所有文件都有签名
      let signedCount = 0;
      for (let i = 0; i < fileCount; i++) {
        const signaturePath = path.join(testWatchDir, `bulk-${i}.txt.sig`);
        const exists = await fs
          .access(signaturePath)
          .then(() => true)
          .catch(() => false);
        if (exists) signedCount++;
      }

      expect(signedCount).toBe(fileCount);
      // 大量文件处理应该在合理时间内完成
      expect(processingTime).toBeLessThan(5000); // 5秒内
    });

    test('应该测量自动签名性能', async () => {
      const benchmarkParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        fileCount: 5,
        fileSize: 1024, // 1KB
      };

      const results = await autoSigner.runBenchmark(benchmarkParams);

      expect(results).toBeDefined();
      expect(results.fileCount).toBe(5);
      expect(results.totalTime).toBeGreaterThan(0);
      expect(results.avgSignTime).toBeGreaterThan(0);
      expect(results.filesPerSecond).toBeGreaterThan(0);
      expect(results.successCount).toBe(5);
    });

    test('应该优化监控间隔', async () => {
      const fastWatchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
        watchInterval: 100, // 100ms快速监控
      };

      await autoSigner.startWatching(fastWatchParams);

      // 创建测试文件
      const testFilePath = path.join(testWatchDir, 'fast-monitor-test.txt');
      await fs.writeFile(testFilePath, TEST_DATA, 'utf8');

      // 等待快速监控检测
      await new Promise(resolve => setTimeout(resolve, 200));

      // 验证文件已被快速签名
      const signaturePath = testFilePath + '.sig';
      const signatureExists = await fs
        .access(signaturePath)
        .then(() => true)
        .catch(() => false);
      expect(signatureExists).toBe(true);
    });

    test('应该处理并发文件创建', async () => {
      const watchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
        maxConcurrent: 3, // 限制并发数
      };

      await autoSigner.startWatching(watchParams);

      const concurrentFiles = 5;
      const startTime = Date.now();

      // 并发创建多个文件
      const createPromises = [];
      for (let i = 0; i < concurrentFiles; i++) {
        const filePath = path.join(testWatchDir, `concurrent-${i}.txt`);
        createPromises.push(fs.writeFile(filePath, `Concurrent content ${i}`, 'utf8'));
      }

      await Promise.all(createPromises);

      // 等待自动签名处理
      await new Promise(resolve => setTimeout(resolve, 1000));

      const endTime = Date.now();
      const concurrentTime = endTime - startTime;

      // 验证所有文件都有签名
      let signedCount = 0;
      for (let i = 0; i < concurrentFiles; i++) {
        const signaturePath = path.join(testWatchDir, `concurrent-${i}.txt.sig`);
        const exists = await fs
          .access(signaturePath)
          .then(() => true)
          .catch(() => false);
        if (exists) signedCount++;
      }

      expect(signedCount).toBe(concurrentFiles);
      // 由于并发限制，处理时间应该需要一定时间
      expect(concurrentTime).toBeGreaterThan(500);
    });
  });

  describe('批量操作', () => {
    test('应该批量启动多个监控器', async () => {
      const watchConfigs = [
        {
          directory: testWatchDir,
          keyName: TEST_KEY_NAME,
          patterns: ['*.txt'],
        },
        {
          directory: path.join(__dirname, '../test-watch-dir-2'),
          keyName: TEST_KEY_NAME,
          patterns: ['*.json'],
        },
        {
          directory: path.join(__dirname, '../test-watch-dir-3'),
          keyName: TEST_KEY_NAME,
          patterns: ['*.log'],
        },
      ];

      // 创建目录
      for (const config of watchConfigs.slice(1)) {
        await fs.mkdir(config.directory, { recursive: true });
      }

      const results = await autoSigner.batchStartWatching(watchConfigs);

      expect(results).toBeDefined();
      expect(results.startedCount).toBe(watchConfigs.length);
      expect(results.failedCount).toBe(0);
      expect(results.results).toHaveLength(watchConfigs.length);

      // 验证所有监控器都成功启动
      results.results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.watcherId).toBeDefined();
      });

      // 清理额外目录
      for (const config of watchConfigs.slice(1)) {
        await autoSigner.stopWatching(
          results.results.find(r => r.directory === config.directory).watcherId,
        );
        await fs.rm(config.directory, { recursive: true, force: true });
      }
    });

    test('应该批量停止多个监控器', async () => {
      const watchParams1 = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
      };

      const watchParams2 = {
        directory: path.join(__dirname, '../test-watch-dir-2'),
        keyName: TEST_KEY_NAME,
        patterns: ['*.json'],
      };

      await fs.mkdir(watchParams2.directory, { recursive: true });

      const watcher1 = await autoSigner.startWatching(watchParams1);
      const watcher2 = await autoSigner.startWatching(watchParams2);

      const stopResults = await autoSigner.batchStopWatching([
        watcher1.watcherId,
        watcher2.watcherId,
      ]);

      expect(stopResults).toBeDefined();
      expect(stopResults.stoppedCount).toBe(2);
      expect(stopResults.failedCount).toBe(0);

      // 验证所有监控器已停止
      const activeWatchers = await autoSigner.listActiveWatchers();
      expect(activeWatchers.length).toBe(0);

      // 清理第二个监控目录
      await fs.rm(watchParams2.directory, { recursive: true, force: true });
    });

    test('应该批量处理现有文件', async () => {
      // 创建一些现有文件
      const existingFiles = [
        { name: 'existing1.txt', content: 'Existing content 1' },
        { name: 'existing2.txt', content: 'Existing content 2' },
        { name: 'existing3.txt', content: 'Existing content 3' },
      ];

      for (const file of existingFiles) {
        await fs.writeFile(path.join(testWatchDir, file.name), file.content, 'utf8');
      }

      const batchParams = {
        directory: testWatchDir,
        keyName: TEST_KEY_NAME,
        patterns: ['*.txt'],
      };

      const results = await autoSigner.batchSignExistingFiles(batchParams);

      expect(results).toBeDefined();
      expect(results.processedCount).toBe(existingFiles.length);
      expect(results.successCount).toBe(existingFiles.length);
      expect(results.failedCount).toBe(0);

      // 验证所有现有文件都有签名
      for (const file of existingFiles) {
        const signaturePath = path.join(testWatchDir, file.name + '.sig');
        const signatureExists = await fs
          .access(signaturePath)
          .then(() => true)
          .catch(() => false);
        expect(signatureExists).toBe(true);
      }
    });
  });
});
