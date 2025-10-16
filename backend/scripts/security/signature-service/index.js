const Signer = require('./signer');
const Verifier = require('./verifier');
const MultiSignatureManager = require('./multi-signature');
const AutoSigner = require('./auto-signer');
const BatchSigner = require('./batch-signer');

/**
 * 签名服务模块入口
 * 提供统一的签名服务接口
 */
class SignatureServiceModule {
  constructor(keyManager, trustManager = null) {
    this.keyManager = keyManager;
    this.trustManager = trustManager;

    // 初始化核心组件
    this.signer = new Signer(keyManager, trustManager);
    this.verifier = new Verifier(keyManager, trustManager);
    this.multiSignatureManager = new MultiSignatureManager(
      this.signer,
      this.verifier,
      keyManager,
      trustManager,
    );
    this.autoSigner = new AutoSigner(this.signer, keyManager);
    this.batchSigner = new BatchSigner(this.signer);
  }

  /**
   * 初始化签名服务模块
   * @returns {Promise<Object>} 初始化结果
   */
  async initialize() {
    try {
      console.log('初始化签名服务模块...');

      // 检查签名目录权限
      await this.checkSignatureDirectory();

      // 初始化自动签名器（如果启用）
      if (this.autoSigner && this.autoSigner.initialize) {
        await this.autoSigner.initialize();
      }

      // 获取系统状态
      const status = await this.getSystemStatus();

      console.log('签名服务模块初始化完成');
      return {
        success: true,
        status,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('签名服务模块初始化失败:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 获取系统状态
   * @returns {Promise<Object>} 系统状态
   */
  async getSystemStatus() {
    const signerStats = this.signer.getSigningStats();
    const verifierStats = this.verifier.getVerificationStats();
    const multiSignatureStats = this.multiSignatureManager.getMultiSignatureStats();

    // 获取自动签名器状态（如果可用）
    let autoSignerStatus = null;
    if (this.autoSigner && this.autoSigner.getStatus) {
      autoSignerStatus = await this.autoSigner.getStatus();
    }

    // 获取批量签名器状态（如果可用）
    let batchSignerStatus = null;
    if (this.batchSigner && this.batchSigner.getStats) {
      batchSignerStatus = this.batchSigner.getStats();
    }

    return {
      signer: signerStats,
      verifier: verifierStats,
      multiSignature: multiSignatureStats,
      autoSigner: autoSignerStatus,
      batchSigner: batchSignerStatus,
      configuration: {
        multiSignatureEnabled: this.multiSignatureManager !== null,
        autoSignerEnabled: this.autoSigner !== null,
        batchSignerEnabled: this.batchSigner !== null,
        trustVerificationEnabled: this.trustManager !== null,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 数据签名
   * @param {string|Buffer} data - 要签名的数据
   * @param {string} keyId - 密钥ID（可选）
   * @param {string} passphrase - 口令（可选）
   * @returns {Promise<Object>} 签名结果
   */
  async signData(data, keyId = null, passphrase = null) {
    return this.signer.signData(data, keyId, passphrase);
  }

  /**
   * 文件签名
   * @param {string} filePath - 文件路径
   * @param {string} keyId - 密钥ID（可选）
   * @param {string} passphrase - 口令（可选）
   * @returns {Promise<Object>} 签名结果
   */
  async signFile(filePath, keyId = null, passphrase = null) {
    return this.signer.signFile(filePath, keyId, passphrase);
  }

  /**
   * 批量文件签名
   * @param {Array} filePaths - 文件路径数组
   * @param {string} keyId - 密钥ID（可选）
   * @param {string} passphrase - 口令（可选）
   * @returns {Promise<Object>} 批量签名结果
   */
  async signFilesBatch(filePaths, keyId = null, passphrase = null) {
    return this.signer.signFilesBatch(filePaths, keyId, passphrase);
  }

  /**
   * 验证数据签名
   * @param {string|Buffer} data - 原始数据
   * @param {string} signature - 签名
   * @param {string} publicKey - 公钥
   * @param {Object} options - 验证选项
   * @returns {Promise<Object>} 验证结果
   */
  async verifyDataSignature(data, signature, publicKey, options = {}) {
    return this.verifier.verifySignature(data, signature, publicKey, options);
  }

  /**
   * 验证文件签名
   * @param {string} filePath - 文件路径
   * @param {string} signaturePath - 签名文件路径（可选）
   * @param {Object} options - 验证选项
   * @returns {Promise<Object>} 验证结果
   */
  async verifyFileSignature(filePath, signaturePath = null, options = {}) {
    return this.verifier.verifyFileSignature(filePath, signaturePath, options);
  }

  /**
   * 批量验证文件签名
   * @param {Array} filePaths - 文件路径数组
   * @param {Object} options - 验证选项
   * @returns {Promise<Object>} 批量验证结果
   */
  async verifyFilesBatch(filePaths, options = {}) {
    return this.verifier.verifyFilesBatch(filePaths, options);
  }

  /**
   * 创建多签名会话
   * @param {string} filePath - 文件路径
   * @param {number} minSignatures - 最小签名数
   * @param {Array} requiredSigners - 必需签名者
   * @returns {Promise<Object>} 会话信息
   */
  async createMultiSignatureSession(filePath, minSignatures, requiredSigners = []) {
    return this.multiSignatureManager.createMultiSignatureSession(
      filePath,
      minSignatures,
      requiredSigners,
    );
  }

  /**
   * 向多签名会话添加签名
   * @param {string} sessionId - 会话ID
   * @param {string} keyId - 密钥ID
   * @param {string} passphrase - 口令（可选）
   * @returns {Promise<Object>} 签名结果
   */
  async addSignatureToSession(sessionId, keyId, passphrase = null) {
    return this.multiSignatureManager.addSignatureToSession(sessionId, keyId, passphrase);
  }

  /**
   * 验证多签名
   * @param {string} sessionId - 会话ID
   * @returns {Promise<Object>} 验证结果
   */
  async verifyMultiSignatures(sessionId) {
    return this.multiSignatureManager.verifyMultiSignatures(sessionId);
  }

  /**
   * 获取多签名会话状态
   * @param {string} sessionId - 会话ID
   * @returns {Object} 会话状态
   */
  getMultiSignatureSessionStatus(sessionId) {
    return this.multiSignatureManager.getSessionStatus(sessionId);
  }

  /**
   * 列出活跃的多签名会话
   * @returns {Array} 会话列表
   */
  listActiveMultiSignatureSessions() {
    return this.multiSignatureManager.listActiveSessions();
  }

  /**
   * 关闭多签名会话
   * @param {string} sessionId - 会话ID
   * @param {string} reason - 关闭原因
   * @returns {Promise<Object>} 关闭结果
   */
  async closeMultiSignatureSession(sessionId, reason = 'manual') {
    return this.multiSignatureManager.closeSession(sessionId, reason);
  }

  /**
   * 开始自动签名监控
   * @param {string} directory - 监控目录
   * @param {Object} options - 监控选项
   * @returns {Promise<Object>} 监控结果
   */
  async startAutoSigning(directory, options = {}) {
    if (!this.autoSigner) {
      throw new Error('自动签名器未启用');
    }
    return this.autoSigner.startMonitoring(directory, options);
  }

  /**
   * 停止自动签名监控
   * @returns {Promise<Object>} 停止结果
   */
  async stopAutoSigning() {
    if (!this.autoSigner) {
      throw new Error('自动签名器未启用');
    }
    return this.autoSigner.stopMonitoring();
  }

  /**
   * 执行批量签名操作
   * @param {Array} operations - 批量操作数组
   * @param {Object} options - 批量选项
   * @returns {Promise<Object>} 批量操作结果
   */
  async executeBatchOperations(operations, options = {}) {
    if (!this.batchSigner) {
      throw new Error('批量签名器未启用');
    }
    return this.batchSigner.executeBatch(operations, options);
  }

  /**
   * 清理资源
   */
  async cleanup() {
    console.log('清理签名服务模块资源...');

    // 停止自动签名监控
    if (this.autoSigner && this.autoSigner.stopMonitoring) {
      await this.autoSigner.stopMonitoring().catch(console.error);
    }

    // 清理多签名会话
    if (this.multiSignatureManager && this.multiSignatureManager.cleanupExpiredSessions) {
      await this.multiSignatureManager.cleanupExpiredSessions().catch(console.error);
    }

    console.log('签名服务模块资源清理完成');
  }

  /**
   * 优雅关闭
   */
  async shutdown() {
    console.log('关闭签名服务模块...');

    await this.cleanup();

    console.log('签名服务模块已关闭');
  }

  // ========== 私有方法 ==========

  /**
   * 检查签名目录权限
   */
  async checkSignatureDirectory() {
    const { CONFIG } = require('../shared/config');

    try {
      await require('fs').promises.access(
        CONFIG.signaturesDir,
        require('fs').constants.R_OK | require('fs').constants.W_OK,
      );
    } catch (error) {
      console.warn(`签名目录权限检查失败: ${CONFIG.signaturesDir} - ${error.message}`);
      // 尝试创建目录
      try {
        await require('fs').promises.mkdir(CONFIG.signaturesDir, { recursive: true });
        console.log(`创建签名目录: ${CONFIG.signaturesDir}`);
      } catch (mkdirError) {
        throw new Error(`无法创建签名目录: ${mkdirError.message}`);
      }
    }
  }
}

// 导出所有组件和模块
module.exports = {
  SignatureServiceModule,
  Signer,
  Verifier,
  MultiSignatureManager,
};
