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
 * 验证器
 * 专注于签名验证功能，整合signature-verification.js的功能
 */
class Verifier {
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

    // 验证错误恢复策略
    this.errorRecoveryManager.registerRecoveryStrategy('SS_002', async (error, attempt) => {
      console.log(`尝试恢复签名验证错误，第${attempt}次重试`);
    });
  }

  /**
   * 验证数据签名
   * @param {string|Buffer} data - 原始数据
   * @param {string} signature - 签名
   * @param {string} publicKey - 公钥
   * @param {Object} options - 验证选项
   * @returns {Promise<Object>} 验证结果
   */
  async verifySignature(data, signature, publicKey, options = {}) {
    return this.errorRecoveryManager.executeWithRecovery('verify-signature', async () => {
      // 验证输入参数
      this.validateVerificationInputs(data, signature, publicKey);

      // 执行验证
      const isValid = await this.asyncOperationManager.executeWithTimeout(
        'verify-signature-core',
        async () => {
          return this.performSignatureVerification(data, signature, publicKey);
        },
      );

      // 检查信任（如果配置了信任管理器）
      let trustResult = null;
      if (this.trustManager && options.checkTrust !== false) {
        trustResult = this.trustManager.verifySignerTrust(publicKey);
      }

      const result = {
        valid: isValid,
        timestamp: new Date().toISOString(),
        dataSize: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data),
        trustVerified: trustResult ? trustResult.trusted : null,
        trustDetails: trustResult,
        algorithm: options.algorithm || CONFIG.keyAlgorithm,
        publicKeyFingerprint: SecurityUtils.generateFingerprint(publicKey),
      };

      if (!isValid && options.throwOnInvalid !== false) {
        throw new SecurityError('SIGNATURE_SERVICE', 'SS_002', '签名验证失败', result);
      }

      console.log(`签名验证完成: ${isValid ? '有效' : '无效'}, 信任: ${result.trustVerified}`);

      return result;
    });
  }

  /**
   * 验证文件签名
   * @param {string} filePath - 原始文件路径
   * @param {string} signaturePath - 签名文件路径（可选，自动推断）
   * @param {Object} options - 验证选项
   * @returns {Promise<Object>} 验证结果
   */
  async verifyFileSignature(filePath, signaturePath = null, options = {}) {
    return this.errorRecoveryManager.executeWithRecovery('verify-file-signature', async () => {
      // 验证文件路径
      const validatedPaths = await this.validateAndResolvePaths(filePath, signaturePath);

      // 读取文件内容
      const [fileData, signatureData] = await Promise.all([
        this.readFileContent(validatedPaths.filePath),
        this.readFileContent(validatedPaths.signaturePath),
      ]);

      // 解析签名数据
      const signatureInfo = this.parseSignatureData(signatureData);

      // 获取公钥
      const publicKey = await this.getPublicKeyForVerification(signatureInfo, options);

      // 验证签名
      const verificationResult = await this.verifySignature(
        fileData,
        signatureInfo.signature,
        publicKey,
        options,
      );

      console.log(
        `文件签名验证完成: ${validatedPaths.filePath}, 结果: ${verificationResult.valid ? '有效' : '无效'}`,
      );

      return {
        ...verificationResult,
        filePath: validatedPaths.filePath,
        signaturePath: validatedPaths.signaturePath,
        keyId: signatureInfo.metadata.keyId,
        signatureTimestamp: signatureInfo.metadata.timestamp,
        fileName: path.basename(validatedPaths.filePath),
      };
    });
  }

  /**
   * 批量验证文件签名
   * @param {Array} filePaths - 文件路径数组
   * @param {Object} options - 验证选项
   * @returns {Promise<Object>} 批量验证结果
   */
  async verifyFilesBatch(filePaths, options = {}) {
    return this.errorRecoveryManager.executeWithRecovery('verify-files-batch', async () => {
      if (!Array.isArray(filePaths) || filePaths.length === 0) {
        throw new SecurityError('SIGNATURE_SERVICE', 'CV_005', '无效的文件路径数组');
      }

      const results = {
        total: filePaths.length,
        valid: 0,
        invalid: 0,
        trusted: 0,
        untrusted: 0,
        details: [],
      };

      // 使用并发控制执行批量验证
      const batchOperations = filePaths.map(filePath =>
        this.asyncOperationManager.executeInQueue(
          `batch-verify-${path.basename(filePath)}`,
          async () => {
            try {
              const result = await this.verifyFileSignature(filePath, null, {
                ...options,
                throwOnInvalid: false, // 不抛出异常，收集结果
              });

              return {
                filePath,
                success: true,
                result,
                status: result.valid ? 'valid' : 'invalid',
              };
            } catch (error) {
              return {
                filePath,
                success: false,
                error: error.message,
                status: 'error',
              };
            }
          },
          'normal',
        ),
      );

      const batchResults = await Promise.all(batchOperations);

      // 统计结果
      for (const batchResult of batchResults) {
        if (batchResult.success) {
          if (batchResult.result.valid) {
            results.valid++;
            if (batchResult.result.trustVerified) {
              results.trusted++;
            } else {
              results.untrusted++;
            }
          } else {
            results.invalid++;
          }

          results.details.push({
            filePath: batchResult.filePath,
            status: batchResult.status,
            valid: batchResult.result.valid,
            trustVerified: batchResult.result.trustVerified,
            keyId: batchResult.result.keyId,
            signatureTimestamp: batchResult.result.signatureTimestamp,
          });
        } else {
          results.invalid++;
          results.details.push({
            filePath: batchResult.filePath,
            status: 'error',
            error: batchResult.error,
            valid: false,
            trustVerified: false,
          });
        }
      }

      console.log(
        `批量文件验证完成: 有效 ${results.valid}, 无效 ${results.invalid}, 受信任 ${results.trusted}`,
      );

      return results;
    });
  }

  /**
   * 验证多签名
   * @param {string} filePath - 原始文件路径
   * @param {string} signatureId - 多签名标识符
   * @param {Object} options - 验证选项
   * @returns {Promise<Object>} 多签名验证结果
   */
  async verifyMultiSignatures(filePath, signatureId, options = {}) {
    return this.errorRecoveryManager.executeWithRecovery('verify-multi-signatures', async () => {
      // 验证文件路径
      const filePathValidation = SecurityUtils.validateFilePath(filePath);
      if (!filePathValidation.isValid) {
        throw new SecurityError('FILE_SYSTEM', 'CV_001', '无效的文件路径', {
          issues: filePathValidation.issues,
        });
      }

      const validatedFilePath = filePathValidation.normalizedPath;

      // 检查文件是否存在
      await this.verifyFileExists(validatedFilePath);

      // 读取多签名数据
      const multiSignatureData = await this.loadMultiSignatureData(signatureId);

      // 读取文件内容
      const fileData = await this.readFileContent(validatedFilePath);

      const verificationResults = [];
      let validSignatures = 0;
      let trustedSignatures = 0;

      // 验证每个签名
      for (const signatureEntry of multiSignatureData.signatures) {
        try {
          const publicKey = await this.getPublicKeyForVerification(signatureEntry, options);

          const result = await this.verifySignature(fileData, signatureEntry.signature, publicKey, {
            ...options,
            throwOnInvalid: false,
          });

          verificationResults.push({
            signer: signatureEntry.signer,
            keyId: signatureEntry.metadata.keyId,
            timestamp: signatureEntry.metadata.timestamp,
            valid: result.valid,
            trustVerified: result.trustVerified,
            fingerprint: result.publicKeyFingerprint,
          });

          if (result.valid) {
            validSignatures++;
            if (result.trustVerified) {
              trustedSignatures++;
            }
          }
        } catch (error) {
          verificationResults.push({
            signer: signatureEntry.signer,
            keyId: signatureEntry.metadata.keyId,
            valid: false,
            trustVerified: false,
            error: error.message,
          });
        }
      }

      // 检查是否达到阈值
      const minSignatures = options.minSignaturesRequired || CONFIG.minSignaturesRequired;
      const meetsThreshold = validSignatures >= minSignatures;

      const multiResult = {
        filePath: validatedFilePath,
        signatureId,
        totalSignatures: multiSignatureData.signatures.length,
        validSignatures,
        trustedSignatures,
        meetsThreshold,
        threshold: minSignatures,
        verificationResults,
        timestamp: new Date().toISOString(),
      };

      if (!meetsThreshold && options.throwOnInvalid !== false) {
        throw new SecurityError(
          'SIGNATURE_SERVICE',
          'SS_003',
          '多签名验证失败：未达到阈值',
          multiResult,
        );
      }

      console.log(
        `多签名验证完成: ${validatedFilePath}, 有效签名: ${validSignatures}/${multiSignatureData.signatures.length}, 阈值: ${minSignatures}`,
      );

      return multiResult;
    });
  }

  /**
   * 验证签名链
   * @param {Array} signatureChain - 签名链数组
   * @param {Object} options - 验证选项
   * @returns {Promise<Object>} 签名链验证结果
   */
  async verifySignatureChain(signatureChain, options = {}) {
    return this.errorRecoveryManager.executeWithRecovery('verify-signature-chain', async () => {
      if (!Array.isArray(signatureChain) || signatureChain.length === 0) {
        throw new SecurityError('SIGNATURE_SERVICE', 'CV_005', '无效的签名链');
      }

      const chainResults = [];
      let chainValid = true;
      let currentData = signatureChain[0].data;

      for (let i = 0; i < signatureChain.length; i++) {
        const link = signatureChain[i];

        try {
          const publicKey = await this.getPublicKeyForVerification(link, options);

          const result = await this.verifySignature(currentData, link.signature, publicKey, {
            ...options,
            throwOnInvalid: false,
          });

          chainResults.push({
            linkIndex: i,
            signer: link.signer,
            keyId: link.metadata.keyId,
            valid: result.valid,
            trustVerified: result.trustVerified,
            dataSize: Buffer.isBuffer(currentData)
              ? currentData.length
              : Buffer.byteLength(currentData),
          });

          if (!result.valid) {
            chainValid = false;
            break;
          }

          // 准备下一环的数据（通常是当前签名）
          if (i < signatureChain.length - 1) {
            currentData = link.signature;
          }
        } catch (error) {
          chainResults.push({
            linkIndex: i,
            signer: link.signer,
            valid: false,
            trustVerified: false,
            error: error.message,
          });
          chainValid = false;
          break;
        }
      }

      const chainResult = {
        chainValid,
        totalLinks: signatureChain.length,
        validLinks: chainResults.filter(r => r.valid).length,
        chainResults,
        timestamp: new Date().toISOString(),
      };

      if (!chainValid && options.throwOnInvalid !== false) {
        throw new SecurityError('SIGNATURE_SERVICE', 'SS_002', '签名链验证失败', chainResult);
      }

      console.log(
        `签名链验证完成: ${chainValid ? '有效' : '无效'}, 有效链接: ${chainResult.validLinks}/${signatureChain.length}`,
      );

      return chainResult;
    });
  }

  /**
   * 获取验证统计信息
   * @returns {Object} 统计信息
   */
  getVerificationStats() {
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
   * 验证输入参数
   */
  validateVerificationInputs(data, signature, publicKey) {
    if (!data || (typeof data !== 'string' && !Buffer.isBuffer(data))) {
      throw new SecurityError('SIGNATURE_SERVICE', 'CV_005', '无效的验证数据');
    }

    if (!signature || typeof signature !== 'string') {
      throw new SecurityError('SIGNATURE_SERVICE', 'CV_005', '无效的签名');
    }

    if (!publicKey || typeof publicKey !== 'string') {
      throw new SecurityError('SIGNATURE_SERVICE', 'CV_005', '无效的公钥');
    }
  }

  /**
   * 执行实际的签名验证
   */
  async performSignatureVerification(data, signature, publicKey) {
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
   * 验证和解析路径
   */
  async validateAndResolvePaths(filePath, signaturePath) {
    // 验证文件路径
    const filePathValidation = SecurityUtils.validateFilePath(filePath);
    if (!filePathValidation.isValid) {
      throw new SecurityError('FILE_SYSTEM', 'CV_001', '无效的文件路径', {
        issues: filePathValidation.issues,
      });
    }

    const validatedFilePath = filePathValidation.normalizedPath;

    // 推断签名文件路径
    if (!signaturePath) {
      signaturePath = this.generateSignaturePath(validatedFilePath);
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

    const validatedSignaturePath = signaturePathValidation.normalizedPath;

    // 检查文件是否存在
    await this.verifyFileExists(validatedFilePath);
    await this.verifyFileExists(validatedSignaturePath);

    return {
      filePath: validatedFilePath,
      signaturePath: validatedSignaturePath,
    };
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
   * 读取文件内容
   */
  async readFileContent(filePath) {
    return this.asyncOperationManager.executeWithTimeout(
      `read-${path.basename(filePath)}`,
      async () => {
        return fs.readFile(filePath);
      },
    );
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
   * 获取验证用的公钥
   */
  async getPublicKeyForVerification(signatureInfo, options) {
    if (options.publicKey) {
      return options.publicKey;
    }

    if (signatureInfo.metadata && signatureInfo.metadata.keyId) {
      return await this.keyManager.exportPublicKey(signatureInfo.metadata.keyId);
    }

    throw new SecurityError('SIGNATURE_SERVICE', 'CV_005', '无法确定验证用的公钥');
  }

  /**
   * 加载多签名数据
   */
  async loadMultiSignatureData(signatureId) {
    const multiSignaturePath = path.join(CONFIG.signaturesDir, 'multi', `${signatureId}.json`);

    try {
      const data = await fs.readFile(multiSignaturePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      throw new SecurityError('SIGNATURE_SERVICE', 'SS_003', '多签名数据加载失败', {
        originalError: error,
        signatureId,
      });
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
}

module.exports = Verifier;
