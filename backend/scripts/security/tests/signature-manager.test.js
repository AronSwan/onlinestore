#!/usr/bin/env node

/**
 * 增强版签名管理器测试套件
 *
 * 功能：
 * 1. 单元测试
 * 2. 端到端测试
 * 3. 边界场景测试
 * 4. 密钥轮换测试
 * 5. 多签名测试
 *
 * @author 后端开发团队
 * @version 1.0.0
 * @since 2025-10-12
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

// 导入增强版签名管理器
const {
  EnhancedKeyManager,
  TrustPolicyManager,
  KeyFingerprintGenerator,
  SecurityChecker,
  ERROR_CODES,
  CONFIG,
} = require('../enhanced-signature-manager');

// 测试配置
const TEST_CONFIG = {
  tempDir: fs.mkdtempSync(path.join(os.tmpdir(), 'signature-test-')),
  testPassphrase: 'Test-Passphrase-123!',
  weakPassphrase: 'weak',
  keysDir: null,
  signaturesDir: null,
  keyHistoryDir: null,
  trustStoreDir: null,
};

// 设置测试环境
function setupTestEnvironment() {
  // 创建临时目录
  TEST_CONFIG.keysDir = path.join(TEST_CONFIG.tempDir, 'keys');
  TEST_CONFIG.signaturesDir = path.join(TEST_CONFIG.tempDir, 'signatures');
  TEST_CONFIG.keyHistoryDir = path.join(TEST_CONFIG.tempDir, 'keys/history');
  TEST_CONFIG.trustStoreDir = path.join(TEST_CONFIG.tempDir, 'trust');

  [
    TEST_CONFIG.keysDir,
    TEST_CONFIG.signaturesDir,
    TEST_CONFIG.keyHistoryDir,
    TEST_CONFIG.trustStoreDir,
  ].forEach(dir => {
    fs.mkdirSync(dir, { recursive: true });
  });

  // 设置环境变量
  process.env.CONFIG_KEY_PASSPHRASE = TEST_CONFIG.testPassphrase;
  process.env.NODE_ENV = 'test';

  // 修改配置以使用临时目录
  CONFIG.keysDir = TEST_CONFIG.keysDir;
  CONFIG.signaturesDir = TEST_CONFIG.signaturesDir;
  CONFIG.keyHistoryDir = TEST_CONFIG.keyHistoryDir;
  CONFIG.trustStoreDir = TEST_CONFIG.trustStoreDir;
}

// 清理测试环境
function cleanupTestEnvironment() {
  // 删除临时目录
  fs.rmSync(TEST_CONFIG.tempDir, { recursive: true, force: true });

  // 恢复环境变量
  delete process.env.CONFIG_KEY_PASSPHRASE;
  delete process.env.NODE_ENV;
}

// 测试结果记录器
class TestResultRecorder {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      details: [],
    };
  }

  assert(condition, testName, errorMessage = null) {
    this.results.total++;

    if (condition) {
      this.results.passed++;
      this.results.details.push({
        name: testName,
        status: 'PASSED',
        message: null,
      });
      console.log(`✅ ${testName}`);
    } else {
      this.results.failed++;
      this.results.details.push({
        name: testName,
        status: 'FAILED',
        message: errorMessage,
      });
      console.log(`❌ ${testName}${errorMessage ? `: ${errorMessage}` : ''}`);
    }
  }

  async assertAsync(asyncCondition, testName, errorMessage = null) {
    this.results.total++;

    try {
      const result = await asyncCondition();

      if (result) {
        this.results.passed++;
        this.results.details.push({
          name: testName,
          status: 'PASSED',
          message: null,
        });
        console.log(`✅ ${testName}`);
      } else {
        this.results.failed++;
        this.results.details.push({
          name: testName,
          status: 'FAILED',
          message: errorMessage,
        });
        console.log(`❌ ${testName}${errorMessage ? `: ${errorMessage}` : ''}`);
      }
    } catch (error) {
      this.results.failed++;
      this.results.details.push({
        name: testName,
        status: 'FAILED',
        message: `Exception: ${error.message}`,
      });
      console.log(`❌ ${testName}: Exception - ${error.message}`);
    }
  }

  printSummary() {
    console.log('\n==========================================');
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('==========================================');
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(2)}%`);

    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.details
        .filter(detail => detail.status === 'FAILED')
        .forEach(detail => {
          console.log(`  - ${detail.name}: ${detail.message}`);
        });
    }

    console.log('==========================================');
  }
}

// 测试套件
class SignatureManagerTestSuite {
  constructor() {
    this.recorder = new TestResultRecorder();
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('🚀 Starting Enhanced Signature Manager Tests\n');

    try {
      // 设置测试环境
      setupTestEnvironment();

      // 运行测试
      await this.testPassphraseValidation();
      await this.testKeyGeneration();
      await this.testKeyRotation();
      await this.testKeyExportImport();
      await this.testFingerprintGeneration();
      await this.testTrustPolicy();
      await this.testMultiSignature();
      await this.testArchiving();
      await this.testErrorHandling();

      // 打印测试结果
      this.recorder.printSummary();

      // 清理测试环境
      cleanupTestEnvironment();

      // 返回测试结果
      return {
        success: this.recorder.results.failed === 0,
        ...this.recorder.results,
      };
    } catch (error) {
      console.error('Test suite failed with exception:', error.message);
      cleanupTestEnvironment();
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 测试口令验证
   */
  async testPassphraseValidation() {
    console.log('\n🔐 Testing Passphrase Validation');

    // 测试强口令
    const strongValidation = SecurityChecker.validatePassphrase(TEST_CONFIG.testPassphrase);
    this.recorder.assert(
      strongValidation.valid,
      'Strong passphrase validation',
      strongValidation.error,
    );

    // 测试弱口令
    const weakValidation = SecurityChecker.validatePassphrase(TEST_CONFIG.weakPassphrase);
    this.recorder.assert(!weakValidation.valid, 'Weak passphrase validation', weakValidation.error);

    // 测试默认口令
    const defaultValidation = SecurityChecker.validatePassphrase(CONFIG.defaultPassphrase);
    this.recorder.assert(
      !defaultValidation.valid,
      'Default passphrase validation',
      defaultValidation.error,
    );

    // 测试空口令
    const emptyValidation = SecurityChecker.validatePassphrase('');
    this.recorder.assert(
      !emptyValidation.valid,
      'Empty passphrase validation',
      emptyValidation.error,
    );
  }

  /**
   * 测试密钥生成
   */
  async testKeyGeneration() {
    console.log('\n🔑 Testing Key Generation');

    const keyManager = new EnhancedKeyManager();

    // 测试密钥生成
    const keyPair = await keyManager.generateKeyPair();
    this.recorder.assert(
      keyPair && keyPair.keyId && keyPair.fingerprint,
      'Key generation',
      'Failed to generate key pair',
    );

    // 测试密钥元数据
    const keyInfo = keyManager.keyMetadata[keyPair.keyId];
    this.recorder.assert(
      keyInfo && keyInfo.id === keyPair.keyId && keyInfo.fingerprint === keyPair.fingerprint,
      'Key metadata',
      'Key metadata not properly stored',
    );

    // 测试公钥文件存在
    this.recorder.assert(
      fs.existsSync(keyPair.publicKeyPath),
      'Public key file exists',
      'Public key file not created',
    );

    // 测试私钥文件存在
    this.recorder.assert(
      fs.existsSync(keyPair.privateKeyPath),
      'Private key file exists',
      'Private key file not created',
    );

    // 测试设置当前密钥
    const success = keyManager.setCurrentKey(keyPair.keyId);
    this.recorder.assert(success, 'Set current key', 'Failed to set current key');

    // 测试获取当前密钥
    const currentKey = keyManager.getCurrentKey();
    this.recorder.assert(
      currentKey && currentKey.keyId === keyPair.keyId,
      'Get current key',
      'Current key not properly retrieved',
    );
  }

  /**
   * 测试密钥轮换
   */
  async testKeyRotation() {
    console.log('\n🔄 Testing Key Rotation');

    const keyManager = new EnhancedKeyManager();

    // 生成初始密钥
    const initialKey = await keyManager.generateKeyPair();
    keyManager.setCurrentKey(initialKey.keyId);

    // 轮换密钥
    const rotatedKey = await keyManager.rotateKey();

    // 验证新密钥
    this.recorder.assert(
      rotatedKey && rotatedKey !== initialKey.keyId,
      'Key rotation generates new key',
      'Key rotation did not generate new key',
    );

    // 验证当前密钥已更新
    const currentKey = keyManager.getCurrentKey();
    this.recorder.assert(
      currentKey.keyId === rotatedKey,
      'Current key updated after rotation',
      'Current key not updated after rotation',
    );

    // 验证旧密钥状态
    const oldKeyInfo = keyManager.keyMetadata[initialKey.keyId];
    this.recorder.assert(
      oldKeyInfo.status === 'deprecated',
      'Old key marked as deprecated',
      'Old key not properly marked as deprecated',
    );
  }

  /**
   * 测试密钥导入导出
   */
  async testKeyExportImport() {
    console.log('\n📤📥 Testing Key Export/Import');

    const keyManager = new EnhancedKeyManager();

    // 生成密钥
    const keyPair = await keyManager.generateKeyPair();

    // 导出公钥
    const exportPath = path.join(TEST_CONFIG.tempDir, 'exported.pub');
    const exportedKey = keyManager.exportPublicKey(keyPair.keyId, exportPath);

    // 验证导出
    this.recorder.assert(
      fs.existsSync(exportPath),
      'Public key export',
      'Public key not exported to file',
    );

    this.recorder.assert(
      exportedKey && exportedKey.length > 0,
      'Public key export content',
      'Exported public key is empty',
    );

    // 导入公钥
    const importKeyId = `imported-${Date.now()}`;
    const importResult = keyManager.importPublicKey(importKeyId, exportPath, true);

    // 验证导入
    this.recorder.assert(
      importResult && importResult.keyId === importKeyId,
      'Public key import',
      'Public key not properly imported',
    );

    // 验证指纹匹配
    this.recorder.assert(
      importResult.fingerprint === keyPair.fingerprint,
      'Fingerprint match after import/export',
      'Fingerprint does not match after import/export',
    );
  }

  /**
   * 测试指纹生成
   */
  async testFingerprintGeneration() {
    console.log('\n🔍 Testing Fingerprint Generation');

    // 生成测试密钥对
    const { publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });

    // 生成指纹
    const fingerprint = KeyFingerprintGenerator.generateFingerprint(publicKey);

    // 验证指纹结构
    this.recorder.assert(
      fingerprint && fingerprint.sha256 && fingerprint.formatted,
      'Fingerprint generation',
      'Fingerprint not properly generated',
    );

    // 验证指纹长度
    this.recorder.assert(
      fingerprint.sha256.length === 64, // SHA-256 produces 64 hex characters
      'Fingerprint length',
      'Fingerprint has incorrect length',
    );

    // 验证指纹一致性
    const secondFingerprint = KeyFingerprintGenerator.generateFingerprint(publicKey);
    this.recorder.assert(
      fingerprint.sha256 === secondFingerprint.sha256,
      'Fingerprint consistency',
      'Fingerprint not consistent across multiple generations',
    );

    // 验证指纹验证
    const isValid = KeyFingerprintGenerator.verifyFingerprint(publicKey, fingerprint.sha256);
    this.recorder.assert(isValid, 'Fingerprint verification', 'Fingerprint verification failed');
  }

  /**
   * 测试信任策略
   */
  async testTrustPolicy() {
    console.log('\n🛡️ Testing Trust Policy');

    const trustPolicyManager = new TrustPolicyManager();

    // 生成测试公钥
    const { publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });

    // 生成指纹
    const fingerprint = KeyFingerprintGenerator.generateFingerprint(publicKey);

    // 测试添加受信任指纹
    const addResult = trustPolicyManager.addTrustedFingerprint(fingerprint.sha256, {
      source: 'test',
    });

    this.recorder.assert(addResult, 'Add trusted fingerprint', 'Failed to add trusted fingerprint');

    // 测试指纹是否受信任
    const isTrusted = trustPolicyManager.isFingerprintTrusted(fingerprint.sha256);
    this.recorder.assert(isTrusted, 'Fingerprint trust status', 'Fingerprint not properly trusted');

    // 测试验证签名者信任
    const trustResult = trustPolicyManager.verifySignerTrust(publicKey);
    this.recorder.assert(
      trustResult && trustResult.trusted,
      'Signer trust verification',
      'Signer trust verification failed',
    );

    // 测试撤销指纹
    const revokeResult = trustPolicyManager.revokeFingerprint(
      fingerprint.sha256,
      'Test revocation',
    );
    this.recorder.assert(revokeResult, 'Revoke fingerprint', 'Failed to revoke fingerprint');

    // 测试指纹是否已被撤销
    const isRevoked = trustPolicyManager.isFingerprintRevoked(fingerprint.sha256);
    this.recorder.assert(
      isRevoked,
      'Fingerprint revocation status',
      'Fingerprint not properly revoked',
    );
  }

  /**
   * 测试多签名
   */
  async testMultiSignature() {
    console.log('\n✍️ Testing Multi-Signature');

    const keyManager = new EnhancedKeyManager();
    const trustPolicyManager = new TrustPolicyManager();

    // 生成多个密钥对
    const keyPairs = [];
    for (let i = 0; i < 3; i++) {
      const keyPair = await keyManager.generateKeyPair();
      keyPairs.push(keyPair);

      // 添加到信任存储
      trustPolicyManager.addTrustedFingerprint(keyPair.fingerprint, {
        source: 'test',
        signer: `signer-${i}`,
      });
    }

    // 创建测试文件
    const testFilePath = path.join(TEST_CONFIG.tempDir, 'test-file.txt');
    const testContent = 'This is a test file for multi-signature verification.';
    fs.writeFileSync(testFilePath, testContent);

    // 使用多个密钥签名文件
    const signatures = [];
    for (const keyPair of keyPairs) {
      const data = fs.readFileSync(testFilePath, 'utf8');
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(data);
      sign.end();

      const privateKey = fs.readFileSync(keyPair.privateKeyPath, 'utf8');
      const signature = sign.sign(
        {
          key: privateKey,
          passphrase: TEST_CONFIG.testPassphrase,
        },
        'base64',
      );

      signatures.push({
        signerId: keyPair.keyId,
        signature,
        fingerprint: keyPair.fingerprint,
      });
    }

    // 验证所有签名
    let validSignatures = 0;
    for (const sig of signatures) {
      const data = fs.readFileSync(testFilePath, 'utf8');
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(data);
      verify.end();

      const publicKey = fs.readFileSync(
        path.join(TEST_CONFIG.keysDir, `${sig.signerId}.pub`),
        'utf8',
      );

      const isValid = verify.verify(publicKey, sig.signature, 'base64');
      if (isValid) {
        validSignatures++;
      }
    }

    // 验证多签名
    this.recorder.assert(
      validSignatures === keyPairs.length,
      'Multi-signature verification',
      `Only ${validSignatures}/${keyPairs.length} signatures are valid`,
    );
  }

  /**
   * 测试归档
   */
  async testArchiving() {
    console.log('\n📦 Testing Archiving');

    // 密钥管理器是单例模式，所以我们需要适应已有的密钥
    const keyManager = new EnhancedKeyManager();

    // 获取所有活跃和已弃用的密钥，按创建时间排序
    const allKeys = keyManager
      .getAllKeys()
      .filter(key => key.status === 'active' || key.status === 'deprecated')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 确保我们有足够的密钥进行测试
    this.recorder.assert(
      allKeys.length >= 5,
      'Key setup for archiving',
      `Expected at least 5 keys, got ${allKeys.length}`,
    );

    // 设置最新的密钥为当前密钥
    keyManager.setCurrentKey(allKeys[0].keyId);

    // 归档旧密钥（保留2个）
    const archivedKeys = keyManager.archiveOldKeys(2);

    // 计算预期归档的密钥数量（总密钥数 - 保留数量 - 1个当前密钥）
    const expectedArchivedCount = Math.max(0, allKeys.length - 2 - 1);

    // 验证归档
    this.recorder.assert(
      archivedKeys.length === expectedArchivedCount,
      'Key archiving',
      `Expected ${expectedArchivedCount} keys to be archived, got ${archivedKeys.length}`,
    );

    // 验证归档密钥状态
    let archivedCount = 0;
    for (const keyId of archivedKeys) {
      const keyInfo = keyManager.keyMetadata[keyId];
      if (keyInfo.status === 'archived') {
        archivedCount++;
      }
    }

    this.recorder.assert(
      archivedCount === expectedArchivedCount,
      'Archived key status',
      `Expected ${expectedArchivedCount} keys to have archived status, got ${archivedCount}`,
    );

    // 验证保留密钥状态
    let activeCount = 0;
    for (const key of allKeys) {
      if (!archivedKeys.includes(key.keyId)) {
        const keyInfo = keyManager.keyMetadata[key.keyId];
        if (keyInfo.status === 'active' || keyInfo.status === 'deprecated') {
          activeCount++;
        }
      }
    }

    // 期望的活跃密钥数量是2（保留的数量）
    this.recorder.assert(
      activeCount >= 2,
      'Retained key status',
      `Expected at least 2 keys to have active/deprecated status, got ${activeCount}`,
    );
  }

  /**
   * 测试错误处理
   */
  async testErrorHandling() {
    console.log('\n⚠️ Testing Error Handling');

    const keyManager = new EnhancedKeyManager();

    // 测试不存在的密钥
    try {
      // 创建一个新的密钥管理器实例，它没有当前密钥
      const newKeyManager = new EnhancedKeyManager();
      // 清除当前密钥
      newKeyManager.currentKeyId = null;

      newKeyManager.getCurrentKey();
      this.recorder.assert(false, 'Error handling for non-existent current key');
    } catch (error) {
      this.recorder.assert(
        error.message.includes('No current key available'),
        'Error handling for non-existent current key',
        `Unexpected error message: ${error.message}`,
      );
    }

    // 测试设置不存在的密钥为当前密钥
    try {
      keyManager.setCurrentKey('non-existent-key-id');
      this.recorder.assert(false, 'Error handling for non-existent key ID');
    } catch (error) {
      this.recorder.assert(
        error.message.includes('not found'),
        'Error handling for non-existent key ID',
        `Unexpected error message: ${error.message}`,
      );
    }

    // 测试导入不存在的公钥文件
    try {
      keyManager.importPublicKey('test-key', '/non-existent/path/key.pub');
      this.recorder.assert(false, 'Error handling for non-existent public key file');
    } catch (error) {
      this.recorder.assert(
        error.message.includes('not found'),
        'Error handling for non-existent public key file',
        `Unexpected error message: ${error.message}`,
      );
    }

    // 测试验证不存在的签名
    const trustPolicyManager = new TrustPolicyManager();
    // 传入一个无效的公钥字符串
    const result = trustPolicyManager.verifySignerTrust('invalid-public-key-string');

    // verifySignerTrust 不会抛出异常，而是返回一个包含错误信息的对象
    // 验证返回的对象包含错误信息
    this.recorder.assert(
      result && !result.trusted && result.reason,
      'Error handling for invalid public key',
      `Expected error information in result: ${JSON.stringify(result)}`,
    );
  }
}

// 主函数
async function main() {
  const testSuite = new SignatureManagerTestSuite();
  const results = await testSuite.runAllTests();

  // 根据测试结果设置退出码
  process.exit(results.success ? 0 : 1);
}

// 如果直接运行此脚本，执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Test suite failed with exception:', error.message);
    process.exit(1);
  });
}

// 导出测试套件供其他模块使用
module.exports = {
  SignatureManagerTestSuite,
  TestResultRecorder,
  TEST_CONFIG,
};
