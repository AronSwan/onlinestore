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
 * 多签名管理器
 * 继承advanced-signature-manager的多签名收集和验证功能
 */
class MultiSignatureManager {
  constructor(signer, verifier, keyManager, trustManager = null) {
    this.signer = signer;
    this.verifier = verifier;
    this.keyManager = keyManager;
    this.trustManager = trustManager;
    this.errorRecoveryManager = new ErrorRecoveryManager();
    this.asyncOperationManager = new AsyncOperationManager();

    // 存储多签名会话
    this.activeSessions = new Map();

    // 初始化错误恢复策略
    this.setupRecoveryStrategies();
  }

  /**
   * 设置错误恢复策略
   */
  setupRecoveryStrategies() {
    this.errorRecoveryManager.registerRecoveryStrategy('SS_003', async (error, attempt) => {
      console.log(`尝试恢复多签名错误，第${attempt}次重试`);
    });
  }

  /**
   * 创建多签名会话
   * @param {string} filePath - 要签名的文件路径
   * @param {number} minSignatures - 所需最小签名数
   * @param {Array} requiredSigners - 必需的签名者列表（可选）
   * @returns {Promise<Object>} 会话信息
   */
  async createMultiSignatureSession(
    filePath,
    minSignatures = CONFIG.minSignaturesRequired,
    requiredSigners = [],
  ) {
    return this.errorRecoveryManager.executeWithRecovery(
      'create-multi-signature-session',
      async () => {
        // 验证文件路径
        const pathValidation = SecurityUtils.validateFilePath(filePath);
        if (!pathValidation.isValid) {
          throw new SecurityError('FILE_SYSTEM', 'CV_001', '无效的文件路径', {
            issues: pathValidation.issues,
          });
        }

        const validatedFilePath = pathValidation.normalizedPath;

        // 检查文件是否存在
        await this.verifyFileExists(validatedFilePath);

        // 生成会话ID
        const sessionId = this.generateSessionId();

        // 创建会话数据
        const sessionData = {
          sessionId,
          filePath: validatedFilePath,
          minSignaturesRequired: Math.max(1, minSignatures),
          requiredSigners: Array.isArray(requiredSigners) ? requiredSigners : [],
          signatures: [],
          status: 'active',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24小时过期
          metadata: {
            fileName: path.basename(validatedFilePath),
            fileSize: (await fs.stat(validatedFilePath)).size,
            totalRequired: minSignatures,
          },
        };

        // 存储会话
        this.activeSessions.set(sessionId, sessionData);

        // 保存会话数据到文件
        await this.saveSessionData(sessionId, sessionData);

        console.log(
          `创建多签名会话: ${sessionId}, 文件: ${validatedFilePath}, 最小签名数: ${minSignatures}`,
        );

        return {
          sessionId,
          filePath: validatedFilePath,
          minSignaturesRequired: minSignatures,
          requiredSigners,
          expiresAt: sessionData.expiresAt,
          status: 'active',
        };
      },
    );
  }

  /**
   * 向会话添加签名
   * @param {string} sessionId - 会话ID
   * @param {string} keyId - 签名者密钥ID
   * @param {string} passphrase - 口令（如果需要）
   * @returns {Promise<Object>} 签名结果
   */
  async addSignatureToSession(sessionId, keyId, passphrase = null) {
    return this.errorRecoveryManager.executeWithRecovery('add-signature-to-session', async () => {
      // 获取会话
      const session = this.getSession(sessionId);

      // 检查会话状态
      if (session.status !== 'active') {
        throw new SecurityError('SIGNATURE_SERVICE', 'SS_003', '会话已关闭或过期', {
          sessionId,
          status: session.status,
        });
      }

      // 检查是否已签名
      if (session.signatures.some(sig => sig.keyId === keyId)) {
        throw new SecurityError('SIGNATURE_SERVICE', 'SS_003', '该密钥已对会话签名', {
          sessionId,
          keyId,
        });
      }

      // 验证密钥ID
      const keyValidation = SecurityUtils.validateKeyId(keyId);
      if (!keyValidation.isValid) {
        throw new SecurityError('KEY_MANAGEMENT', 'CV_001', '无效的密钥ID', {
          issues: keyValidation.issues,
        });
      }

      // 对文件进行签名
      const signResult = await this.signer.signFile(session.filePath, keyId, passphrase);

      // 添加签名到会话
      const signatureEntry = {
        keyId,
        signature: signResult.signature,
        timestamp: new Date().toISOString(),
        signer: keyId, // 可以使用更详细的签名者信息
        metadata: signResult.metadata,
        publicKeyFingerprint: await this.getKeyFingerprint(keyId),
      };

      session.signatures.push(signatureEntry);

      // 检查是否达到阈值
      const meetsThreshold = session.signatures.length >= session.minSignaturesRequired;
      const hasRequiredSigners = this.checkRequiredSigners(session);

      if (meetsThreshold && hasRequiredSigners) {
        session.status = 'completed';
        session.completedAt = new Date().toISOString();

        // 保存完整的多签名数据
        await this.saveMultiSignatureData(session);
      }

      // 更新会话数据
      this.activeSessions.set(sessionId, session);
      await this.saveSessionData(sessionId, session);

      console.log(
        `添加签名到会话: ${sessionId}, 密钥: ${keyId}, 当前签名数: ${session.signatures.length}`,
      );

      return {
        sessionId,
        keyId,
        signatureAdded: true,
        currentSignatures: session.signatures.length,
        minRequired: session.minSignaturesRequired,
        meetsThreshold,
        hasRequiredSigners,
        sessionStatus: session.status,
      };
    });
  }

  /**
   * 验证多签名
   * @param {string} sessionId - 会话ID
   * @returns {Promise<Object>} 验证结果
   */
  async verifyMultiSignatures(sessionId) {
    return this.errorRecoveryManager.executeWithRecovery('verify-multi-signatures', async () => {
      // 获取会话
      const session = this.getSession(sessionId);

      // 检查文件是否存在
      await this.verifyFileExists(session.filePath);

      // 读取文件内容
      const fileData = await this.readFileContent(session.filePath);

      const verificationResults = [];
      let validSignatures = 0;
      let trustedSignatures = 0;

      // 验证每个签名
      for (const signatureEntry of session.signatures) {
        try {
          const publicKey = await this.keyManager.exportPublicKey(signatureEntry.keyId);

          const result = await this.verifier.verifySignature(
            fileData,
            signatureEntry.signature,
            publicKey,
            { throwOnInvalid: false },
          );

          verificationResults.push({
            keyId: signatureEntry.keyId,
            signer: signatureEntry.signer,
            timestamp: signatureEntry.timestamp,
            valid: result.valid,
            trustVerified: result.trustVerified,
            fingerprint: signatureEntry.publicKeyFingerprint,
          });

          if (result.valid) {
            validSignatures++;
            if (result.trustVerified) {
              trustedSignatures++;
            }
          }
        } catch (error) {
          verificationResults.push({
            keyId: signatureEntry.keyId,
            signer: signatureEntry.signer,
            valid: false,
            trustVerified: false,
            error: error.message,
          });
        }
      }

      // 检查是否达到阈值
      const meetsThreshold = validSignatures >= session.minSignaturesRequired;
      const hasRequiredSigners = this.checkRequiredSigners(session, verificationResults);

      const multiResult = {
        sessionId,
        filePath: session.filePath,
        totalSignatures: session.signatures.length,
        validSignatures,
        trustedSignatures,
        meetsThreshold,
        hasRequiredSigners,
        threshold: session.minSignaturesRequired,
        verificationResults,
        timestamp: new Date().toISOString(),
        overallValid: meetsThreshold && hasRequiredSigners,
      };

      if (!multiResult.overallValid) {
        throw new SecurityError(
          'SIGNATURE_SERVICE',
          'SS_003',
          '多签名验证失败：未达到要求',
          multiResult,
        );
      }

      console.log(
        `多签名验证完成: ${sessionId}, 有效签名: ${validSignatures}/${session.signatures.length}, 阈值: ${session.minSignaturesRequired}`,
      );

      return multiResult;
    });
  }

  /**
   * 获取会话状态
   * @param {string} sessionId - 会话ID
   * @returns {Object} 会话状态
   */
  getSessionStatus(sessionId) {
    const session = this.getSession(sessionId);

    const status = {
      sessionId,
      filePath: session.filePath,
      minSignaturesRequired: session.minSignaturesRequired,
      currentSignatures: session.signatures.length,
      requiredSigners: session.requiredSigners,
      status: session.status,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      signatures: session.signatures.map(sig => ({
        keyId: sig.keyId,
        signer: sig.signer,
        timestamp: sig.timestamp,
        fingerprint: sig.publicKeyFingerprint,
      })),
    };

    // 检查是否过期
    if (new Date() > new Date(session.expiresAt) && session.status === 'active') {
      session.status = 'expired';
      status.status = 'expired';
      this.activeSessions.set(sessionId, session);
    }

    return status;
  }

  /**
   * 列出所有活跃会话
   * @returns {Array} 会话列表
   */
  listActiveSessions() {
    const sessions = [];

    for (const [sessionId, session] of this.activeSessions) {
      if (session.status === 'active') {
        sessions.push(this.getSessionStatus(sessionId));
      }
    }

    return sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * 关闭会话
   * @param {string} sessionId - 会话ID
   * @param {string} reason - 关闭原因
   * @returns {Promise<Object>} 关闭结果
   */
  async closeSession(sessionId, reason = 'manual') {
    const session = this.getSession(sessionId);

    session.status = 'closed';
    session.closedAt = new Date().toISOString();
    session.closeReason = reason;

    this.activeSessions.set(sessionId, session);
    await this.saveSessionData(sessionId, session);

    console.log(`关闭多签名会话: ${sessionId}, 原因: ${reason}`);

    return {
      sessionId,
      status: 'closed',
      closedAt: session.closedAt,
      reason,
      finalSignatures: session.signatures.length,
    };
  }

  /**
   * 清理过期会话
   * @returns {Promise<Object>} 清理结果
   */
  async cleanupExpiredSessions() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.activeSessions) {
      if (session.status === 'active' && new Date(session.expiresAt) < now) {
        await this.closeSession(sessionId, 'expired');
        cleanedCount++;
      }
    }

    console.log(`清理了 ${cleanedCount} 个过期会话`);

    return {
      cleanedCount,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 导出多签名数据
   * @param {string} sessionId - 会话ID
   * @param {string} format - 导出格式 ('json', 'report')
   * @returns {Promise<string>} 导出的数据
   */
  async exportMultiSignatureData(sessionId, format = 'json') {
    const session = this.getSession(sessionId);
    const verificationResult = await this.verifyMultiSignatures(sessionId).catch(() => null);

    const exportData = {
      session: {
        sessionId: session.sessionId,
        filePath: session.filePath,
        minSignaturesRequired: session.minSignaturesRequired,
        requiredSigners: session.requiredSigners,
        status: session.status,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      },
      signatures: session.signatures,
      verification: verificationResult,
      exportedAt: new Date().toISOString(),
    };

    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(exportData, null, 2);

      case 'report':
        return this.generateReport(exportData);

      default:
        throw new SecurityError('SIGNATURE_SERVICE', 'CV_001', '不支持的导出格式', { format });
    }
  }

  /**
   * 获取多签名统计信息
   * @returns {Object} 统计信息
   */
  getMultiSignatureStats() {
    const sessions = Array.from(this.activeSessions.values());

    const stats = {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'active').length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      closedSessions: sessions.filter(s => s.status === 'closed').length,
      expiredSessions: sessions.filter(s => s.status === 'expired').length,
      averageSignatures: 0,
      successRate: 0,
    };

    if (sessions.length > 0) {
      const totalSignatures = sessions.reduce((sum, session) => sum + session.signatures.length, 0);
      stats.averageSignatures = totalSignatures / sessions.length;

      const successfulSessions = sessions.filter(
        s =>
          s.status === 'completed' ||
          (s.status === 'closed' && s.signatures.length >= s.minSignaturesRequired),
      ).length;

      stats.successRate = (successfulSessions / sessions.length) * 100;
    }

    return stats;
  }

  // ========== 私有方法 ==========

  /**
   * 获取会话
   */
  getSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new SecurityError('SIGNATURE_SERVICE', 'SS_003', '会话不存在', { sessionId });
    }
    return session;
  }

  /**
   * 生成会话ID
   */
  generateSessionId() {
    return `ms_${Date.now()}_${SecurityUtils.generateRandomString(8)}`;
  }

  /**
   * 保存会话数据
   */
  async saveSessionData(sessionId, sessionData) {
    try {
      const sessionsDir = path.join(CONFIG.signaturesDir, 'multi-sessions');
      await this.ensureDirectoryExists(sessionsDir);

      const sessionPath = path.join(sessionsDir, `${sessionId}.json`);
      await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2), 'utf8');
    } catch (error) {
      throw new SecurityError('FILE_SYSTEM', 'FS_002', '会话数据保存失败', {
        originalError: error,
        sessionId,
      });
    }
  }

  /**
   * 保存多签名数据
   */
  async saveMultiSignatureData(session) {
    try {
      const multiDir = path.join(CONFIG.signaturesDir, 'multi');
      await this.ensureDirectoryExists(multiDir);

      const multiPath = path.join(multiDir, `${session.sessionId}.json`);

      const multiData = {
        sessionId: session.sessionId,
        filePath: session.filePath,
        signatures: session.signatures,
        metadata: {
          minSignaturesRequired: session.minSignaturesRequired,
          requiredSigners: session.requiredSigners,
          completedAt: session.completedAt,
          totalSignatures: session.signatures.length,
        },
        version: '1.0',
      };

      await fs.writeFile(multiPath, JSON.stringify(multiData, null, 2), 'utf8');
    } catch (error) {
      throw new SecurityError('FILE_SYSTEM', 'FS_002', '多签名数据保存失败', {
        originalError: error,
        sessionId: session.sessionId,
      });
    }
  }

  /**
   * 检查必需签名者
   */
  checkRequiredSigners(session, verificationResults = null) {
    if (session.requiredSigners.length === 0) {
      return true;
    }

    const signedKeyIds = verificationResults
      ? verificationResults.filter(r => r.valid).map(r => r.keyId)
      : session.signatures.map(sig => sig.keyId);

    return session.requiredSigners.every(requiredKeyId => signedKeyIds.includes(requiredKeyId));
  }

  /**
   * 获取密钥指纹
   */
  async getKeyFingerprint(keyId) {
    try {
      const publicKey = await this.keyManager.exportPublicKey(keyId);
      return SecurityUtils.generateFingerprint(publicKey);
    } catch (error) {
      console.warn(`无法获取密钥指纹: ${keyId} - ${error.message}`);
      return 'unknown';
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
   * 生成报告
   */
  generateReport(exportData) {
    let report = `多签名报告\n`;
    report += `==========\n\n`;
    report += `会话ID: ${exportData.session.sessionId}\n`;
    report += `文件: ${exportData.session.filePath}\n`;
    report += `状态: ${exportData.session.status}\n`;
    report += `创建时间: ${exportData.session.createdAt}\n`;
    report += `过期时间: ${exportData.session.expiresAt}\n\n`;

    report += `签名要求:\n`;
    report += `- 最小签名数: ${exportData.session.minSignaturesRequired}\n`;
    report += `- 必需签名者: ${exportData.session.requiredSigners.join(', ') || '无'}\n\n`;

    report += `签名详情:\n`;
    report += `- 总签名数: ${exportData.signatures.length}\n`;

    for (const [index, signature] of exportData.signatures.entries()) {
      report += `\n签名 ${index + 1}:\n`;
      report += `- 密钥ID: ${signature.keyId}\n`;
      report += `- 签名者: ${signature.signer}\n`;
      report += `- 时间: ${signature.timestamp}\n`;
      report += `- 指纹: ${signature.publicKeyFingerprint}\n`;
    }

    if (exportData.verification) {
      report += `\n验证结果:\n`;
      report += `- 有效签名: ${exportData.verification.validSignatures}/${exportData.signatures.length}\n`;
      report += `- 受信任签名: ${exportData.verification.trustedSignatures}\n`;
      report += `- 达到阈值: ${exportData.verification.meetsThreshold ? '是' : '否'}\n`;
      report += `- 必需签名者满足: ${exportData.verification.hasRequiredSigners ? '是' : '否'}\n`;
      report += `- 整体有效: ${exportData.verification.overallValid ? '是' : '否'}\n`;
    }

    report += `\n导出时间: ${exportData.exportedAt}\n`;

    return report;
  }
}

module.exports = MultiSignatureManager;
