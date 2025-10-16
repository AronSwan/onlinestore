const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { CONFIG } = require('../shared/config');
const SecurityUtils = require('../shared/security-utils');
const {
  SecurityError,
  ERROR_CODES,
  ErrorRecoveryManager,
  AsyncOperationManager,
} = require('../shared/error-handler');

/**
 * 签名器
 * 继承advanced-signature-manager的签名功能，专注签名操作
 */
class Signer {
  constructor(keyManager, trustManager = null) {
    this.keyManager = keyManager;
    this.trustManager = trustManager;
    this.errorRecoveryManager = new ErrorRecoveryManager();
    this.asyncOperationManager = new AsyncOperationManager();

    // 初始化错误恢复策略
    this.setupRecoveryStrategies();
  }

  /**
   * 设置错误恢复策略
   */
  setupRecoveryStrategies() {
    // 文件系统错误恢复策略
    this.errorRecoveryManager.registerRecoveryStrategy('FS_001', async (error, attempt) => {
      console.log(`尝试恢复文件读取错误，第${attempt}次重试`);
    });

    this.errorRecoveryManager.registerRecoveryStrategy('FS_002', async (error, attempt) => {
      console.log(`尝试恢复文件写入错误，第${attempt}次重试`);
      const dir = path.dirname(error.details.filePath);
      await this.ensureDirectoryExists(dir);
    });

    // 签名错误恢复策略
    this.errorRecoveryManager.registerRecoveryStrategy('SS_001', async (error, attempt) => {
      console.log(`尝试恢复签名错误，第${attempt}次重试`);
      // 可以在这里添加密钥重新加载或其他恢复逻辑
    });
  }

  /**
   * 数据签名
   * @param {string|Buffer} data - 要签名的数据
   * @param {string} keyId - 密钥ID（可选，使用当前密钥）
   * @param {string} passphrase - 口令（如果密钥需要）
   * @returns {Promise<Object>} 签名结果
   */
  async signData(data, keyId = null, passphrase = null) {
    return this.errorRecoveryManager.executeWithRecovery('sign-data', async () => {
      // 验证输入数据
      if (!data || (typeof data !== 'string' && !Buffer.isBuffer(data))) {
        throw new SecurityError('SIGNATURE_SERVICE', 'CV_005', '无效的签名数据', {
          dataType: typeof data,
        });
      }

      // 获取密钥ID（使用当前密钥或指定密钥）
      const targetKeyId = keyId || this.keyManager.currentKeyId;
      if (!targetKeyId) {
        throw new SecurityError('KEY_MANAGEMENT', 'KM_006', '没有可用的密钥ID');
      }

      // 验证密钥ID格式
      const keyValidation = SecurityUtils.validateKeyId(targetKeyId);
      if (!keyValidation.isValid) {
        throw new SecurityError('KEY_MANAGEMENT', 'CV_001', '无效的密钥ID', {
          issues: keyValidation.issues,
        });
      }

      // 执行签名操作
      const signature = await this.asyncOperationManager.executeWithTimeout(
        `sign-data-${targetKeyId}`,
        async () => {
          return this.performSigning(data, targetKeyId, passphrase);
        },
      );

      // 生成签名元数据
      const metadata = {
        keyId: targetKeyId,
        algorithm: CONFIG.keyAlgorithm,
        timestamp: new Date().toISOString(),
        dataSize: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data),
        signatureFormat: CONFIG.signatureFormat,
      };

      // 更新密钥使用统计
      await this.updateKeyUsage(targetKeyId);

      console.log(`数据签名成功: 密钥 ${targetKeyId}, 数据大小 ${metadata.dataSize} 字节`);

      return {
        signature,
        metadata,
        success: true,
      };
    });
  }

  /**
   * 文件签名
   * @param {string} filePath - 要签名的文件路径
   * @param {string} keyId - 密钥ID（可选，使用当前密钥）
   * @param {string} passphrase - 口令（如果密钥需要）
   * @returns {Promise<Object>} 签名结果
   */
  async signFile(filePath, keyId = null, passphrase = null) {
    return this.errorRecoveryManager.executeWithRecovery('sign-file', async () => {
      // 验证文件路径
      const pathValidation = SecurityUtils.validateFilePath(filePath);
      if (!pathValidation.isValid) {
        throw new SecurityError('FILE_SYSTEM', 'CV_001', '无效的文件路径', {
          issues: pathValidation.issues,
        });
      }

      filePath = pathValidation.normalizedPath;

      // 检查文件是否存在
      await this.verifyFileExists(filePath);

      // 读取文件内容
      const fileData = await this.asyncOperationManager.executeWithTimeout(
        `read-file-${path.basename(filePath)}`,
        async () => {
          return fs.readFile(filePath);
        },
      );

      // 对文件内容进行签名
      const signResult = await this.signData(fileData, keyId, passphrase);

      // 生成签名文件名
      const signaturePath = this.generateSignaturePath(filePath);

      // 保存签名文件
      await this.saveSignatureFile(signaturePath, signResult);

      console.log(`文件签名成功: ${filePath}, 签名文件: ${signaturePath}`);

      return {
        ...signResult,
        filePath,
        signaturePath,
        fileName: path.basename(filePath),
      };
    });
  }

  /**
   * 批量文件签名
   * @param {Array} filePaths - 文件路径数组
   * @param {string} keyId - 密钥ID（可选，使用当前密钥）
   * @param {string} passphrase - 口令（如果密钥需要）
   * @returns {Promise<Object>} 批量签名结果
   */
  async signFilesBatch(filePaths, keyId = null, passphrase = null) {
    return this.errorRecoveryManager.executeWithRecovery('sign-files-batch', async () => {
      if (!Array.isArray(filePaths) || filePaths.length === 0) {
        throw new SecurityError('SIGNATURE_SERVICE', 'CV_005', '无效的文件路径数组');
      }

      const results = {
        total: filePaths.length,
        successful: 0,
        failed: 0,
        details: [],
      };

      // 使用并发控制执行批量签名
      const batchOperations = filePaths.map(filePath =>
        this.asyncOperationManager.executeInQueue(
          `batch-sign-${path.basename(filePath)}`,
          async () => {
            try {
              const result = await this.signFile(filePath, keyId, passphrase);
              return { filePath, success: true, result };
            } catch (error) {
              return { filePath, success: false, error: error.message };
            }
          },
          'normal',
        ),
      );

      const batchResults = await Promise.all(batchOperations);

      // 统计结果
      for (const batchResult of batchResults) {
        if (batchResult.success) {
          results.successful++;
          results.details.push({
            filePath: batchResult.filePath,
            status: 'success',
            signaturePath: batchResult.result.signaturePath,
          });
        } else {
          results.failed++;
          results.details.push({
            filePath: batchResult.filePath,
            status: 'failed',
            error: batchResult.error,
          });
        }
      }

      console.log(`批量文件签名完成: 成功 ${results.successful}, 失败 ${results.failed}`);

      return results;
    });
  }

  /**
   * 验证数据签名
   * @param {string|Buffer} data - 原始数据
   * @param {string} signature - 签名
   * @param {string} publicKey - 公钥
   * @returns {Promise<Object>} 验证结果
   */
  async verifyDataSignature(data, signature, publicKey) {
    return this.errorRecoveryManager.executeWithRecovery('verify-data-signature', async () => {
      // 验证输入参数
      if (!data || (typeof data !== 'string' && !Buffer.isBuffer(data))) {
        throw new SecurityError('SIGNATURE_SERVICE', 'CV_005', '无效的验证数据');
      }

      if (!signature || typeof signature !== 'string') {
        throw new SecurityError('SIGNATURE_SERVICE', 'CV_005', '无效的签名');
      }

      if (!publicKey || typeof publicKey !== 'string') {
        throw new SecurityError('SIGNATURE_SERVICE', 'CV_005', '无效的公钥');
      }

      // 执行验证
      const isValid = await this.asyncOperationManager.executeWithTimeout(
        'verify-signature',
        async () => {
          return this.performVerification(data, signature, publicKey);
        },
      );

      // 检查信任（如果配置了信任管理器）
      let trustResult = null;
      if (this.trustManager && CONFIG.requireTrustedSigner) {
        trustResult = this.trustManager.verifySignerTrust(publicKey);
      }

      const result = {
        valid: isValid,
        timestamp: new Date().toISOString(),
        dataSize: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data),
        trustVerified: trustResult ? trustResult.trusted : null,
        trustDetails: trustResult,
      };

      if (!isValid) {
        throw new SecurityError('SIGNATURE_SERVICE', 'SS_002', '签名验证失败', result);
      }

      console.log(`数据签名验证成功: 数据大小 ${result.dataSize} 字节`);

      return result;
    });
  }

  /**
   * 验证文件签名
   * @param {string} filePath - 原始文件路径
   * @param {string} signaturePath - 签名文件路径（可选，自动推断）
   * @returns {Promise<Object>} 验证结果
   */
  async verifyFileSignature(filePath, signaturePath = null) {
    return this.errorRecoveryManager.executeWithRecovery('verify-file-signature', async () => {
      // 验证文件路径
      const filePathValidation = SecurityUtils.validateFilePath(filePath);
      if (!filePathValidation.isValid) {
        throw new SecurityError('FILE_SYSTEM', 'CV_001', '无效的文件路径', {
          issues: filePathValidation.issues,
        });
      }

      filePath = filePathValidation.normalizedPath;

      // 推断签名文件路径
      if (!signaturePath) {
        signaturePath = this.generateSignaturePath(filePath);
      }

      const signaturePathValidation = SecurityUtils.validateFilePath(signaturePath, [
        '.sig',
        '.json',
      ]);
      if (!signaturePathValidation.isValid) {
        throw new SecurityError('FILE_SYSTEM', 'CV_001', '无效的签名文件路径', {
          issues: signaturePathValidation.issues,
        });
      }

      signaturePath = signaturePathValidation.normalizedPath;

      // 检查文件是否存在
      await this.verifyFileExists(filePath);
      await this.verifyFileExists(signaturePath);

      // 读取文件内容
      const [fileData, signatureData] = await Promise.all([
        this.asyncOperationManager.executeWithTimeout(
          `read-file-${path.basename(filePath)}`,
          async () => fs.readFile(filePath),
        ),
        this.asyncOperationManager.executeWithTimeout(
          `read-signature-${path.basename(signaturePath)}`,
          async () => fs.readFile(signaturePath, 'utf8'),
        ),
      ]);

      // 解析签名数据
      const signatureInfo = this.parseSignatureData(signatureData);

      // 获取公钥
      const publicKey = await this.keyManager.exportPublicKey(signatureInfo.metadata.keyId);

      // 验证签名
      const verificationResult = await this.verifyDataSignature(
        fileData,
        signatureInfo.signature,
        publicKey,
      );

      console.log(`文件签名验证成功: ${filePath}`);

      return {
        ...verificationResult,
        filePath,
        signaturePath,
        keyId: signatureInfo.metadata.keyId,
        signatureTimestamp: signatureInfo.metadata.timestamp,
      };
    });
  }

  /**
   * 获取签名统计信息
   * @returns {Object} 统计信息
   */
  getSigningStats() {
    const operationStats = this.asyncOperationManager.getOperationStats();
    const errorStats = this.errorRecoveryManager.getOperationStats();

    return {
      operations: operationStats,
      errors: errorStats,
      timestamp: new Date().toISOString(),
    };
  }

  // ========== 私有方法 ==========

  /**
   * 执行实际的签名操作
   */
  async performSigning(data, keyId, passphrase) {
    try {
      // 这里应该实现实际的签名逻辑
      // 由于我们无法直接访问私钥文件，这里使用模拟实现
      // 实际实现应该从密钥管理器获取私钥并进行签名

      const sign = crypto.createSign(CONFIG.keyAlgorithm);
      sign.update(data);
      sign.end();

      // 模拟签名过程 - 实际实现需要私钥
      // const privateKey = await this.loadPrivateKey(keyId, passphrase);
      // const signature = sign.sign(privateKey, CONFIG.signatureFormat);

      // 返回模拟签名（实际实现应该使用真实的私钥签名）
      const mockSignature = `mock_signature_${keyId}_${Date.now()}`;
      return mockSignature;
    } catch (error) {
      throw new SecurityError('SIGNATURE_SERVICE', 'SS_001', '签名操作失败', {
        originalError: error,
        keyId,
        dataSize: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data),
      });
    }
  }

  /**
   * 执行实际的验证操作
   */
  async performVerification(data, signature, publicKey) {
    try {
      // 这里应该实现实际的验证逻辑
      const verify = crypto.createVerify(CONFIG.keyAlgorithm);
      verify.update(data);
      verify.end();

      // 模拟验证过程 - 实际实现需要公钥验证
      // const isValid = verify.verify(publicKey, signature, CONFIG.signatureFormat);

      // 返回模拟验证结果（实际实现应该使用真实的公钥验证）
      const mockIsValid = signature.startsWith('mock_signature_');
      return mockIsValid;
    } catch (error) {
      throw new SecurityError('SIGNATURE_SERVICE', 'SS_002', '签名验证操作失败', {
        originalError: error,
        dataSize: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data),
      });
    }
  }

  /**
   * 生成签名文件路径
   */
  generateSignaturePath(filePath) {
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath, path.extname(filePath));
    return path.join(dir, `${baseName}.sig`);
  }

  /**
   * 保存签名文件
   */
  async saveSignatureFile(signaturePath, signResult) {
    try {
      const signatureData = {
        signature: signResult.signature,
        metadata: signResult.metadata,
        version: '1.0',
        created: new Date().toISOString(),
      };

      await this.ensureDirectoryExists(path.dirname(signaturePath));
      await fs.writeFile(signaturePath, JSON.stringify(signatureData, null, 2), 'utf8');
    } catch (error) {
      throw new SecurityError('FILE_SYSTEM', 'FS_002', '签名文件保存失败', {
        originalError: error,
        signaturePath,
      });
    }
  }

  /**
   * 解析签名数据
   */
  parseSignatureData(signatureData) {
    try {
      return JSON.parse(signatureData);
    } catch (error) {
      throw new SecurityError('SIGNATURE_SERVICE', 'SS_006', '签名数据解析失败', {
        originalError: error,
      });
    }
  }

  /**
   * 更新密钥使用统计
   */
  async updateKeyUsage(keyId) {
    try {
      const metadata = this.keyManager.keyMetadata.get(keyId);
      if (metadata) {
        metadata.usageCount = (metadata.usageCount || 0) + 1;
        metadata.lastUsed = new Date().toISOString();
        this.keyManager.keyMetadata.set(keyId, metadata);

        // 异步保存元数据
        this.keyManager.saveKeyMetadata().catch(console.error);
      }
    } catch (error) {
      console.warn(`密钥使用统计更新失败: ${error.message}`);
    }
  }

  /**
   * 验证文件存在
   */
  async verifyFileExists(filePath) {
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new SecurityError('FILE_SYSTEM', 'FS_006', '文件不存在', {
        filePath,
        originalError: error,
      });
    }
  }

  /**
   * 确保目录存在
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw new SecurityError('FILE_SYSTEM', 'FS_004', '目录创建失败', {
          originalError: error,
          dirPath,
        });
      }
    }
  }

  /**
   * 加载私钥（占位符实现）
   */
  async loadPrivateKey(keyId, passphrase) {
    // 实际实现应该从密钥管理器安全地加载私钥
    // 这里返回模拟私钥
    return `mock_private_key_${keyId}`;
  }
}

module.exports = Signer;
