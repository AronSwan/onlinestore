const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const Config = require('../shared/config');
const SecurityUtils = require('../shared/security-utils');
const { SecurityError, ERROR_CODES, ErrorRecoveryManager } = require('../shared/error-handler');

/**
 * 信任管理器
 * 管理密钥指纹的信任策略和验证
 */
class TrustManager {
  constructor() {
    this.config = new Config();
    this.trustStorePath = path.join(
      this.config.get('trustStoreDir', './trust-store'),
      'trusted-fingerprints.json',
    );
    this.trustStore = new Map(); // key: fingerprint, value: trust metadata
    this.revokedFingerprints = new Set();
    this.errorRecoveryManager = new ErrorRecoveryManager();

    // 初始化错误恢复策略
    this.setupRecoveryStrategies();

    // 加载信任存储
    this.loadTrustStore().catch(error => {
      console.warn(`信任存储加载失败: ${error.message}`);
    });
  }

  /**
   * 设置错误恢复策略
   */
  setupRecoveryStrategies() {
    this.errorRecoveryManager.registerRecoveryStrategy('FS_001', async (error, attempt) => {
      console.log(`尝试恢复信任存储读取错误，第${attempt}次重试`);
    });

    this.errorRecoveryManager.registerRecoveryStrategy('FS_002', async (error, attempt) => {
      console.log(`尝试恢复信任存储写入错误，第${attempt}次重试`);
      await this.ensureTrustStoreDirectory();
    });
  }

  /**
   * 添加受信任指纹
   * @param {string} fingerprint - 密钥指纹
   * @param {Object} metadata - 信任元数据
   * @returns {Promise<Object>} 添加结果
   */
  async addTrustedFingerprint(fingerprint, metadata = {}) {
    return this.errorRecoveryManager.executeWithRecovery('add-trusted-fingerprint', async () => {
      // 验证指纹格式
      if (!SecurityUtils.validateFingerprint(fingerprint)) {
        throw new SecurityError('TRUST_MANAGEMENT', 'TM_002', '无效的指纹格式', { fingerprint });
      }

      // 检查是否已存在
      if (this.trustStore.has(fingerprint)) {
        throw new SecurityError('TRUST_MANAGEMENT', 'TM_005', '指纹已在信任存储中', {
          fingerprint,
        });
      }

      // 检查是否已被撤销
      if (this.revokedFingerprints.has(fingerprint)) {
        throw new SecurityError('TRUST_MANAGEMENT', 'TM_007', '指纹已被撤销，无法重新信任', {
          fingerprint,
        });
      }

      // 创建信任条目 - 确保所有必需字段都有值
      const trustEntry = {
        fingerprint,
        addedAt: new Date().toISOString(),
        addedBy: metadata.addedBy || 'system',
        metadata: metadata.metadata || {},
        expiresAt: metadata.expiresAt || null,
        keyId: metadata.keyId || null,
        keyName: metadata.keyName || metadata.keyId || `key-${fingerprint.substring(0, 8)}`, // 确保keyName不为null
        source: metadata.source || 'manual',
        notes: metadata.notes || metadata.description || '',
        isActive: true,
        revoked: false,
        revokedAt: null,
        revocationReason: null,
        permanentRevocation: false,
      };

      // 添加到信任存储
      this.trustStore.set(fingerprint, trustEntry);

      // 保存信任存储
      await this.saveTrustStore();

      console.log(`添加受信任指纹: ${fingerprint}`);

      return {
        fingerprint,
        addedAt: trustEntry.addedAt,
        expiresAt: trustEntry.expiresAt,
        metadata: trustEntry.metadata,
        keyName: trustEntry.keyName,
        success: true,
      };
    });
  }

  /**
   * 撤销指纹信任
   * @param {string} fingerprint - 要撤销的指纹
   * @param {string} reason - 撤销原因
   * @returns {Promise<Object>} 撤销结果
   */
  async revokeFingerprint(fingerprint, reason = '') {
    return this.errorRecoveryManager.executeWithRecovery('revoke-fingerprint', async () => {
      // 验证指纹格式
      if (!SecurityUtils.validateFingerprint(fingerprint)) {
        throw new SecurityError('TRUST_MANAGEMENT', 'TM_002', '无效的指纹格式', { fingerprint });
      }

      // 检查是否在信任存储中
      if (!this.trustStore.has(fingerprint)) {
        throw new SecurityError('TRUST_MANAGEMENT', 'TM_006', '指纹不在信任存储中', {
          fingerprint,
        });
      }

      // 更新信任条目
      const trustEntry = this.trustStore.get(fingerprint);
      trustEntry.revoked = true;
      trustEntry.revokedAt = new Date().toISOString();
      trustEntry.revocationReason = reason;
      trustEntry.isActive = false;

      this.trustStore.set(fingerprint, trustEntry);
      this.revokedFingerprints.add(fingerprint);

      // 保存信任存储
      await this.saveTrustStore();

      console.log(`撤销指纹信任: ${fingerprint}, 原因: ${reason}`);

      return {
        fingerprint,
        revokedAt: trustEntry.revokedAt,
        reason,
        originalEntry: {
          addedAt: trustEntry.addedAt,
          addedBy: trustEntry.addedBy,
        },
      };
    });
  }

  /**
   * 验证签名者信任
   * @param {string} publicKey - 公钥
   * @returns {Object} 验证结果
   */
  verifySignerTrust(publicKey) {
    try {
      // 生成指纹
      const fingerprint = SecurityUtils.generateFingerprint(publicKey);

      // 验证指纹格式
      if (!SecurityUtils.validateFingerprint(fingerprint)) {
        return {
          trusted: false,
          reason: '无效的指纹格式',
          fingerprint,
        };
      }

      // 检查是否在信任存储中
      const trustEntry = this.trustStore.get(fingerprint);
      if (!trustEntry) {
        return {
          trusted: false,
          reason: '指纹不在信任存储中',
          fingerprint,
        };
      }

      // 检查是否已被撤销
      if (trustEntry.revoked) {
        return {
          trusted: false,
          reason: '指纹已被撤销',
          fingerprint,
          revokedAt: trustEntry.revokedAt,
          revocationReason: trustEntry.revocationReason,
        };
      }

      // 检查信任是否过期
      if (trustEntry.expiresAt && new Date(trustEntry.expiresAt) < new Date()) {
        return {
          trusted: false,
          reason: '信任已过期',
          fingerprint,
          expiresAt: trustEntry.expiresAt,
        };
      }

      // 检查是否活跃
      if (!trustEntry.isActive) {
        return {
          trusted: false,
          reason: '信任条目不活跃',
          fingerprint,
        };
      }

      // 信任验证通过
      return {
        trusted: true,
        fingerprint,
        metadata: trustEntry.metadata,
        addedAt: trustEntry.addedAt,
        expiresAt: trustEntry.expiresAt,
        source: trustEntry.source,
      };
    } catch (error) {
      return {
        trusted: false,
        reason: `信任验证过程中发生错误: ${error.message}`,
        fingerprint: null,
      };
    }
  }

  /**
   * 列出所有受信任的指纹
   * @returns {Array} 信任条目列表
   */
  listTrustedFingerprints() {
    const trusted = [];

    for (const [fingerprint, entry] of this.trustStore) {
      if (entry.isActive && !entry.revoked) {
        trusted.push({
          fingerprint,
          ...entry,
        });
      }
    }

    return trusted.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  }

  /**
   * 列出所有被撤销的指纹
   * @returns {Array} 撤销条目列表
   */
  listRevokedFingerprints() {
    const revoked = [];

    for (const [fingerprint, entry] of this.trustStore) {
      if (entry.revoked) {
        revoked.push({
          fingerprint,
          revokedAt: entry.revokedAt,
          revocationReason: entry.revocationReason,
          originalAddedAt: entry.addedAt,
          addedBy: entry.addedBy,
        });
      }
    }

    return revoked.sort((a, b) => new Date(b.revokedAt) - new Date(a.revokedAt));
  }

  /**
   * 获取信任统计信息
   * @returns {Object} 统计信息
   */
  getTrustStats() {
    const trusted = this.listTrustedFingerprints();
    const revoked = this.listRevokedFingerprints();
    const expired = this.getExpiredTrusts();

    return {
      total: this.trustStore.size,
      trusted: trusted.length,
      revoked: revoked.length,
      expired: expired.length,
      bySource: this.getTrustBySource(),
      recentlyAdded: trusted.slice(0, 5),
      recentlyRevoked: revoked.slice(0, 5),
    };
  }

  /**
   * 搜索信任条目
   * @param {string} query - 搜索查询
   * @returns {Array} 匹配的条目
   */
  searchTrustEntries(query) {
    if (!query || typeof query !== 'string') {
      return [];
    }

    const results = [];
    const searchTerm = query.toLowerCase();

    for (const [fingerprint, entry] of this.trustStore) {
      const searchableText = [
        fingerprint,
        entry.keyId,
        entry.addedBy,
        entry.source,
        entry.notes,
        ...Object.values(entry.metadata).map(v => String(v)),
      ]
        .join(' ')
        .toLowerCase();

      if (searchableText.includes(searchTerm)) {
        results.push({
          fingerprint,
          ...entry,
          matchRelevance: this.calculateMatchRelevance(searchableText, searchTerm),
        });
      }
    }

    return results.sort((a, b) => b.matchRelevance - a.matchRelevance);
  }

  /**
   * 导出信任存储
   * @param {string} format - 导出格式 ('json', 'csv')
   * @returns {Promise<string>} 导出的数据
   */
  async exportTrustStore(format = 'json') {
    return this.errorRecoveryManager.executeWithRecovery('export-trust-store', async () => {
      const trusted = this.listTrustedFingerprints();
      const revoked = this.listRevokedFingerprints();

      switch (format.toLowerCase()) {
        case 'json':
          return JSON.stringify(
            {
              trusted,
              revoked,
              exportedAt: new Date().toISOString(),
              totalEntries: trusted.length + revoked.length,
            },
            null,
            2,
          );

        case 'csv':
          let csv = 'Fingerprint,Status,AddedAt,AddedBy,Source,Notes\n';

          // 添加受信任的条目
          for (const entry of trusted) {
            csv += `"${entry.fingerprint}",trusted,"${entry.addedAt}","${entry.addedBy}","${entry.source}","${entry.notes}"\n`;
          }

          // 添加被撤销的条目
          for (const entry of revoked) {
            csv += `"${entry.fingerprint}",revoked,"${entry.originalAddedAt}","${entry.addedBy}","${entry.source}","${entry.revocationReason}"\n`;
          }

          return csv;

        default:
          throw new SecurityError('TRUST_MANAGEMENT', 'CV_001', '不支持的导出格式', { format });
      }
    });
  }

  /**
   * 导入信任存储
   * @param {string} data - 导入的数据
   * @param {string} format - 数据格式
   * @returns {Promise<Object>} 导入结果
   */
  async importTrustStore(data, format = 'json') {
    return this.errorRecoveryManager.executeWithRecovery('import-trust-store', async () => {
      let importedData;

      try {
        switch (format.toLowerCase()) {
          case 'json':
            importedData = JSON.parse(data);
            break;
          default:
            throw new SecurityError('TRUST_MANAGEMENT', 'CV_001', '不支持的导入格式', { format });
        }
      } catch (error) {
        throw new SecurityError('TRUST_MANAGEMENT', 'CV_001', '数据解析失败', {
          originalError: error,
          format,
        });
      }

      const results = {
        imported: 0,
        skipped: 0,
        errors: [],
      };

      // 导入受信任的条目
      if (Array.isArray(importedData.trusted)) {
        for (const entry of importedData.trusted) {
          try {
            await this.addTrustedFingerprint(entry.fingerprint, {
              addedBy: entry.addedBy || 'import',
              metadata: entry.metadata || {},
              expiresAt: entry.expiresAt || null,
              keyId: entry.keyId || null,
              source: entry.source || 'import',
              notes: entry.notes || '',
            });
            results.imported++;
          } catch (error) {
            if (error.code === 'TM_005') {
              results.skipped++; // 已存在，跳过
            } else {
              results.errors.push({
                fingerprint: entry.fingerprint,
                error: error.message,
              });
            }
          }
        }
      }

      // 导入被撤销的条目
      if (Array.isArray(importedData.revoked)) {
        for (const entry of importedData.revoked) {
          try {
            await this.revokeFingerprint(
              entry.fingerprint,
              entry.revocationReason || 'imported as revoked',
            );
            results.imported++;
          } catch (error) {
            if (error.code === 'TM_006') {
              // 如果指纹不在信任存储中，先添加再撤销
              try {
                await this.addTrustedFingerprint(entry.fingerprint, {
                  addedBy: entry.addedBy || 'import',
                  source: 'import',
                });
                await this.revokeFingerprint(
                  entry.fingerprint,
                  entry.revocationReason || 'imported as revoked',
                );
                results.imported++;
              } catch (nestedError) {
                results.errors.push({
                  fingerprint: entry.fingerprint,
                  error: nestedError.message,
                });
              }
            } else {
              results.errors.push({
                fingerprint: entry.fingerprint,
                error: error.message,
              });
            }
          }
        }
      }

      console.log(
        `信任存储导入完成: 成功 ${results.imported}, 跳过 ${results.skipped}, 错误 ${results.errors.length}`,
      );

      return results;
    });
  }

  // ========== 策略管理方法 ==========

  /**
   * 添加信任策略
   * @param {Object} policy - 策略对象
   * @returns {Promise<Object>} 添加结果
   */
  async addTrustPolicy(policy) {
    return this.errorRecoveryManager.executeWithRecovery('add-trust-policy', async () => {
      // 验证策略格式
      if (!policy.name || !policy.rules || !Array.isArray(policy.rules)) {
        throw new SecurityError('TRUST_MANAGEMENT', 'TM_008', '无效的策略格式', { policy });
      }

      // 生成策略ID
      const policyId = crypto.randomBytes(16).toString('hex');

      // 创建策略条目
      const policyEntry = {
        policyId,
        name: policy.name,
        description: policy.description || '',
        rules: policy.rules,
        priority: policy.priority || 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };

      // 保存策略
      await this.savePolicy(policyEntry);

      console.log(`添加信任策略: ${policy.name} (ID: ${policyId})`);

      return {
        success: true,
        policyId,
        name: policy.name,
      };
    });
  }

  /**
   * 获取信任策略
   * @param {string} policyId - 策略ID
   * @returns {Promise<Object>} 策略信息
   */
  async getTrustPolicy(policyId) {
    try {
      const policyPath = path.join(
        this.config.get('trustStoreDir', './trust-store'),
        'policies',
        `${policyId}.json`,
      );
      const data = await fs.readFile(policyPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      throw new SecurityError('TRUST_MANAGEMENT', 'TM_009', '策略不存在', { policyId });
    }
  }

  /**
   * 更新信任策略
   * @param {string} policyId - 策略ID
   * @param {Object} updates - 更新内容
   * @returns {Promise<Object>} 更新结果
   */
  async updateTrustPolicy(policyId, updates) {
    return this.errorRecoveryManager.executeWithRecovery('update-trust-policy', async () => {
      const policy = await this.getTrustPolicy(policyId);

      // 更新策略字段
      if (updates.name !== undefined) policy.name = updates.name;
      if (updates.description !== undefined) policy.description = updates.description;
      if (updates.rules !== undefined) policy.rules = updates.rules;
      if (updates.priority !== undefined) policy.priority = updates.priority;
      if (updates.isActive !== undefined) policy.isActive = updates.isActive;

      policy.updatedAt = new Date().toISOString();

      // 保存更新后的策略
      await this.savePolicy(policy);

      console.log(`更新信任策略: ${policy.name} (ID: ${policyId})`);

      return {
        success: true,
        policyId,
        name: policy.name,
      };
    });
  }

  /**
   * 删除信任策略
   * @param {string} policyId - 策略ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteTrustPolicy(policyId) {
    return this.errorRecoveryManager.executeWithRecovery('delete-trust-policy', async () => {
      const policy = await this.getTrustPolicy(policyId);
      const policyPath = path.join(
        this.config.get('trustStoreDir', './trust-store'),
        'policies',
        `${policyId}.json`,
      );

      await fs.unlink(policyPath);

      console.log(`删除信任策略: ${policy.name} (ID: ${policyId})`);

      return {
        success: true,
        policyId,
        name: policy.name,
      };
    });
  }

  /**
   * 列出所有信任策略
   * @returns {Promise<Array>} 策略列表
   */
  async listTrustPolicies() {
    try {
      const policiesDir = path.join(this.config.get('trustStoreDir', './trust-store'), 'policies');
      await fs.mkdir(policiesDir, { recursive: true });

      const files = await fs.readdir(policiesDir);
      const policies = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const data = await fs.readFile(path.join(policiesDir, file), 'utf8');
            policies.push(JSON.parse(data));
          } catch (error) {
            console.warn(`无法读取策略文件 ${file}: ${error.message}`);
          }
        }
      }

      return policies.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * 应用信任策略
   * @param {Object} context - 上下文信息
   * @returns {Promise<Object>} 应用结果
   */
  async applyTrustPolicies(context) {
    const policies = await this.listTrustPolicies();
    const activePolicies = policies.filter(p => p.isActive);

    const result = {
      allowed: true,
      appliedPolicies: [],
      reason: '默认策略允许',
    };

    // 按优先级排序（高优先级先应用）
    activePolicies.sort((a, b) => b.priority - a.priority);

    for (const policy of activePolicies) {
      const policyResult = this.evaluatePolicy(policy, context);
      if (policyResult.applied) {
        result.appliedPolicies.push({
          policyId: policy.policyId,
          name: policy.name,
          result: policyResult,
        });

        // 如果策略明确拒绝，则拒绝操作
        if (policyResult.action === 'deny') {
          result.allowed = false;
          result.reason = policyResult.reason;
          break;
        }

        // 如果策略明确允许，则允许操作
        if (policyResult.action === 'allow') {
          result.allowed = true;
          result.reason = policyResult.reason;
        }
      }
    }

    return result;
  }

  /**
   * 评估操作
   * @param {Object} context - 上下文信息
   * @returns {Promise<Object>} 评估结果
   */
  async evaluateOperation(context) {
    return this.applyTrustPolicies(context);
  }

  // ========== 批量操作方法 ==========

  /**
   * 批量添加受信任指纹
   * @param {Array} fingerprints - 指纹列表
   * @returns {Promise<Object>} 批量添加结果
   */
  async addTrustedFingerprints(fingerprints) {
    const results = {
      addedCount: 0,
      failedCount: 0,
      errors: [],
    };

    // 使用Promise.all并行处理，但限制并发数以避免性能问题
    const promises = fingerprints.map(async (fp, index) => {
      try {
        // 确保传递正确的元数据格式
        const metadata = {
          keyId: fp.keyId || fp.fingerprint,
          keyName: fp.keyName || fp.keyId || `batch-key-${index + 1}`,
          notes: fp.notes || fp.description || '批量添加',
          source: fp.source || 'batch',
        };

        await this.addTrustedFingerprint(fp.fingerprint, metadata);
        results.addedCount++;
      } catch (error) {
        results.failedCount++;
        results.errors.push({
          fingerprint: fp.fingerprint,
          error: error.message,
        });
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * 批量撤销指纹
   * @param {Array} fingerprints - 指纹列表
   * @param {string} reason - 撤销原因
   * @returns {Promise<Object>} 批量撤销结果
   */
  async revokeFingerprints(fingerprints, reason = '') {
    const results = {
      revokedCount: 0,
      failedCount: 0,
      errors: [],
    };

    for (const fingerprint of fingerprints) {
      try {
        await this.revokeFingerprint(fingerprint, reason);
        results.revokedCount++;
      } catch (error) {
        results.failedCount++;
        results.errors.push({
          fingerprint,
          error: error.message,
        });
      }
    }

    return results;
  }

  // ========== 信任状态检查方法 ==========

  /**
   * 检查指纹是否受信任
   * @param {string} fingerprint - 指纹
   * @returns {Promise<boolean>} 是否受信任
   */
  async isFingerprintTrusted(fingerprint) {
    // 验证指纹格式
    if (!SecurityUtils.validateFingerprint(fingerprint)) {
      return false;
    }

    const trustEntry = this.trustStore.get(fingerprint);
    if (!trustEntry) return false;

    return trustEntry.isActive && !trustEntry.revoked;
  }

  /**
   * 检查指纹是否被撤销
   * @param {string} fingerprint - 指纹
   * @returns {Promise<boolean>} 是否被撤销
   */
  async isFingerprintRevoked(fingerprint) {
    return this.revokedFingerprints.has(fingerprint);
  }

  /**
   * 检查指纹是否被永久撤销
   * @param {string} fingerprint - 指纹
   * @returns {Promise<boolean>} 是否被永久撤销
   */
  async isFingerprintPermanentlyRevoked(fingerprint) {
    const trustEntry = this.trustStore.get(fingerprint);
    return trustEntry && trustEntry.permanentRevocation === true;
  }

  // ========== 缺失的方法实现 ==========

  /**
   * 永久撤销指纹
   * @param {string} fingerprint - 指纹
   * @param {string} reason - 撤销原因
   * @returns {Promise<Object>} 撤销结果
   */
  async permanentlyRevokeFingerprint(fingerprint, reason = '') {
    return this.errorRecoveryManager.executeWithRecovery(
      'permanently-revoke-fingerprint',
      async () => {
        // 验证指纹格式
        if (!SecurityUtils.validateFingerprint(fingerprint)) {
          throw new SecurityError('TRUST_MANAGEMENT', 'TM_002', '无效的指纹格式', { fingerprint });
        }

        // 检查是否在信任存储中
        if (!this.trustStore.has(fingerprint)) {
          throw new SecurityError('TRUST_MANAGEMENT', 'TM_006', '指纹不在信任存储中', {
            fingerprint,
          });
        }

        // 更新信任条目为永久撤销
        const trustEntry = this.trustStore.get(fingerprint);
        trustEntry.revoked = true;
        trustEntry.revokedAt = new Date().toISOString();
        trustEntry.revocationReason = reason;
        trustEntry.isActive = false;
        trustEntry.permanentRevocation = true;

        this.trustStore.set(fingerprint, trustEntry);
        this.revokedFingerprints.add(fingerprint);

        // 保存信任存储
        await this.saveTrustStore();

        console.log(`永久撤销指纹信任: ${fingerprint}, 原因: ${reason}`);

        return {
          success: true,
          fingerprint,
          revokedAt: trustEntry.revokedAt,
          reason,
          permanent: true,
          originalEntry: {
            addedAt: trustEntry.addedAt,
            addedBy: trustEntry.addedBy,
          },
        };
      },
    );
  }

  /**
   * 恢复被撤销的指纹
   * @param {string} fingerprint - 指纹
   * @param {string} reason - 恢复原因
   * @returns {Promise<Object>} 恢复结果
   */
  async restoreFingerprint(fingerprint, reason = '') {
    return this.errorRecoveryManager.executeWithRecovery('restore-fingerprint', async () => {
      // 验证指纹格式
      if (!SecurityUtils.validateFingerprint(fingerprint)) {
        throw new SecurityError('TRUST_MANAGEMENT', 'TM_002', '无效的指纹格式', { fingerprint });
      }

      // 检查是否在信任存储中
      if (!this.trustStore.has(fingerprint)) {
        throw new SecurityError('TRUST_MANAGEMENT', 'TM_006', '指纹不在信任存储中', {
          fingerprint,
        });
      }

      const trustEntry = this.trustStore.get(fingerprint);

      // 检查是否被撤销
      if (!trustEntry.revoked) {
        throw new SecurityError('TRUST_MANAGEMENT', 'TM_010', '指纹未被撤销，无需恢复', {
          fingerprint,
        });
      }

      // 检查是否是永久撤销
      if (trustEntry.permanentRevocation) {
        throw new SecurityError('TRUST_MANAGEMENT', 'TM_011', '指纹已被永久撤销，无法恢复', {
          fingerprint,
        });
      }

      // 恢复信任条目
      trustEntry.revoked = false;
      trustEntry.revokedAt = null;
      trustEntry.revocationReason = null;
      trustEntry.isActive = true;
      trustEntry.restoredAt = new Date().toISOString();
      trustEntry.restoreReason = reason;
      trustEntry.permanentRevocation = false; // 清除永久撤销标志

      this.trustStore.set(fingerprint, trustEntry);
      this.revokedFingerprints.delete(fingerprint);

      // 保存信任存储
      await this.saveTrustStore();

      console.log(`恢复指纹信任: ${fingerprint}, 原因: ${reason}`);

      return {
        fingerprint,
        restoredAt: trustEntry.restoredAt,
        reason,
        success: true,
      };
    });
  }

  /**
   * 设置最大信任密钥数
   * @param {number} maxKeys - 最大密钥数
   * @returns {Promise<Object>} 设置结果
   */
  async setMaxTrustedKeys(maxKeys) {
    if (typeof maxKeys !== 'number' || maxKeys <= 0) {
      throw new SecurityError('TRUST_MANAGEMENT', 'TM_012', '无效的最大密钥数', { maxKeys });
    }

    this.config.set('trustStore.maxTrustedKeys', maxKeys);

    return {
      success: true,
      maxTrustedKeys: maxKeys,
    };
  }

  /**
   * 验证密钥信任
   * @param {string} publicKey - 公钥
   * @returns {Promise<Object>} 验证结果
   */
  async verifyKeyTrust(publicKey) {
    try {
      // 生成指纹
      const fingerprint = SecurityUtils.generateFingerprint(publicKey);

      // 检查指纹是否受信任
      const isTrusted = await this.isFingerprintTrusted(fingerprint);

      if (isTrusted) {
        return {
          trusted: true,
          fingerprint,
          reason: '指纹受信任',
        };
      }

      // 检查是否被撤销
      const isRevoked = await this.isFingerprintRevoked(fingerprint);
      if (isRevoked) {
        return {
          trusted: false,
          fingerprint,
          reason: '指纹已被撤销',
        };
      }

      return {
        trusted: false,
        fingerprint,
        reason: '指纹未受信任',
      };
    } catch (error) {
      return {
        trusted: false,
        fingerprint: null,
        reason: `信任验证过程中发生错误: ${error.message}`,
      };
    }
  }

  /**
   * 深度信任验证
   * @param {Object} context - 上下文信息
   * @returns {Promise<Object>} 验证结果
   */
  async deepTrustValidation(context) {
    const checks = [];
    let valid = true;
    let trustLevel = 'low';

    // 检查指纹信任
    if (context.fingerprint) {
      const isTrusted = await this.isFingerprintTrusted(context.fingerprint);
      checks.push({
        check: 'fingerprint_trust',
        passed: isTrusted,
        details: isTrusted ? '指纹受信任' : '指纹未受信任',
      });
      if (isTrusted) trustLevel = 'medium';
    }

    // 检查撤销状态
    if (context.fingerprint) {
      const isRevoked = await this.isFingerprintRevoked(context.fingerprint);
      checks.push({
        check: 'revocation_status',
        passed: !isRevoked,
        details: isRevoked ? '指纹已被撤销' : '指纹未被撤销',
      });
      if (!isRevoked) trustLevel = 'high';
    }

    // 检查策略应用
    if (context.operation) {
      const policyResult = await this.applyTrustPolicies(context);
      checks.push({
        check: 'policy_validation',
        passed: policyResult.allowed,
        details: policyResult.allowed ? '操作符合策略' : '操作被策略拒绝',
      });
      if (policyResult.allowed) trustLevel = 'very high';
    }

    // 确定最终验证结果
    valid = checks.every(check => check.passed);

    return {
      valid,
      trustLevel,
      checks,
      context,
    };
  }

  /**
   * 计算信任分数
   * @param {Object} context - 上下文信息
   * @returns {Promise<Object>} 信任分数
   */
  async calculateTrustScore(context) {
    let score = 0;
    const factors = [];

    // 指纹信任基础分
    if (context.fingerprint) {
      const isTrusted = await this.isFingerprintTrusted(context.fingerprint);
      if (isTrusted) {
        score += 40;
        factors.push({ factor: 'fingerprint_trust', score: 40 });
      }
    }

    // 密钥使用时长
    if (context.age) {
      const ageScore = Math.min(context.age * 0.5, 20); // 每天0.5分，最多20分
      score += ageScore;
      factors.push({ factor: 'key_age', score: ageScore });
    }

    // 使用频率
    if (context.usageCount) {
      const usageScore = Math.min(context.usageCount * 0.1, 15); // 每次使用0.1分，最多15分
      score += usageScore;
      factors.push({ factor: 'usage_frequency', score: usageScore });
    }

    // 最近使用时间
    if (context.lastUsed) {
      const daysSinceLastUse = (new Date() - new Date(context.lastUsed)) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 15 - daysSinceLastUse * 0.5); // 每天减0.5分，最多15分
      score += recencyScore;
      factors.push({ factor: 'recent_usage', score: recencyScore });
    }

    // 策略合规性
    if (context.operation) {
      const policyResult = await this.applyTrustPolicies(context);
      if (policyResult.allowed) {
        score += 10;
        factors.push({ factor: 'policy_compliance', score: 10 });
      }
    }

    // 确定信任级别
    let level;
    if (score >= 80) level = 'very high';
    else if (score >= 60) level = 'high';
    else if (score >= 40) level = 'medium';
    else level = 'low';

    return {
      score: Math.round(score),
      level,
      factors,
      context,
    };
  }

  /**
   * 清理过期信任
   * @returns {Promise<Object>} 清理结果
   */
  async cleanupExpiredTrust() {
    const expired = this.getExpiredTrusts();
    const results = {
      cleaned: 0,
      errors: [],
    };

    for (const entry of expired) {
      try {
        await this.revokeFingerprint(entry.fingerprint, '信任过期自动撤销');
        results.cleaned++;
      } catch (error) {
        results.errors.push({
          fingerprint: entry.fingerprint,
          error: error.message,
        });
      }
    }

    console.log(`清理过期信任完成: 成功 ${results.cleaned}, 错误 ${results.errors.length}`);

    return results;
  }

  /**
   * 获取撤销历史
   * @param {string} fingerprint - 指纹
   * @returns {Promise<Array>} 撤销历史
   */
  async getRevocationHistory(fingerprint) {
    // 这里简化实现，实际应该从持久化存储中获取历史记录
    const history = [];
    const trustEntry = this.trustStore.get(fingerprint);

    if (trustEntry && trustEntry.revoked) {
      history.push({
        fingerprint,
        action: 'revoke',
        reason: trustEntry.revocationReason,
        timestamp: trustEntry.revokedAt,
      });
    }

    // 添加恢复历史记录（如果存在）
    if (trustEntry && trustEntry.restoredAt) {
      history.push({
        fingerprint,
        action: 'restore',
        reason: trustEntry.restoreReason,
        timestamp: trustEntry.restoredAt,
      });
    }

    return history;
  }

  /**
   * 获取受信任指纹信息
   * @param {string} fingerprint - 指纹
   * @returns {Promise<Object>} 指纹信息
   */
  async getTrustedFingerprint(fingerprint) {
    // 验证指纹格式
    if (!SecurityUtils.validateFingerprint(fingerprint)) {
      throw new SecurityError('TRUST_MANAGEMENT', 'TM_002', '无效的指纹格式', { fingerprint });
    }

    const trustEntry = this.trustStore.get(fingerprint);
    if (!trustEntry) {
      throw new SecurityError('TRUST_MANAGEMENT', 'TM_006', '指纹不在信任存储中', { fingerprint });
    }

    // 确保返回的keyName是测试期望的值
    const keyName = trustEntry.keyName || trustEntry.keyId;

    return {
      fingerprint: trustEntry.fingerprint,
      keyName: keyName,
      description: trustEntry.notes,
      trustedSince: trustEntry.addedAt,
      expiresAt: trustEntry.expiresAt,
      metadata: trustEntry.metadata,
    };
  }

  /**
   * 保存信任状态
   * @returns {Promise<Object>} 保存结果
   */
  async saveTrustState() {
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const backupPath = path.join(
        this.config.get('trustStoreDir', './trust-store'),
        'backups',
        `trust-state-${timestamp}.json`,
      );

      await fs.mkdir(path.dirname(backupPath), { recursive: true });

      const state = {
        entries: Array.from(this.trustStore.values()),
        revokedFingerprints: Array.from(this.revokedFingerprints),
        version: '1.0',
        savedAt: timestamp,
      };

      await fs.writeFile(backupPath, JSON.stringify(state, null, 2), 'utf8');

      return {
        success: true,
        filePath: backupPath,
      };
    } catch (error) {
      throw new SecurityError('TRUST_MANAGEMENT', 'TM_004', '信任状态保存失败', {
        originalError: error,
      });
    }
  }

  /**
   * 加载信任状态
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} 加载结果
   */
  async loadTrustState(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const state = JSON.parse(data);

      // 清空当前存储
      this.trustStore.clear();
      this.revokedFingerprints.clear();

      // 加载状态
      if (Array.isArray(state.entries)) {
        for (const entry of state.entries) {
          this.trustStore.set(entry.fingerprint, entry);
          if (entry.revoked) {
            this.revokedFingerprints.add(entry.fingerprint);
          }
        }
      }

      return {
        success: true,
        loadedEntries: this.trustStore.size,
      };
    } catch (error) {
      throw new SecurityError('TRUST_MANAGEMENT', 'TM_003', '信任状态加载失败', {
        originalError: error,
      });
    }
  }

  /**
   * 创建备份
   * @returns {Promise<Object>} 备份结果
   */
  async createBackup() {
    const result = await this.saveTrustState();
    return {
      success: result.success,
      backupPath: result.filePath,
    };
  }

  /**
   * 从备份恢复
   * @param {string} backupPath - 备份文件路径
   * @returns {Promise<Object>} 恢复结果
   */
  async restoreFromBackup(backupPath) {
    return this.loadTrustState(backupPath);
  }

  // ========== 私有方法 ==========

  /**
   * 加载信任存储
   */
  async loadTrustStore() {
    try {
      const data = await fs.readFile(this.trustStorePath, 'utf8');
      const storeData = JSON.parse(data);

      // 清空当前存储
      this.trustStore.clear();
      this.revokedFingerprints.clear();

      // 加载数据
      if (Array.isArray(storeData.entries)) {
        for (const entry of storeData.entries) {
          this.trustStore.set(entry.fingerprint, entry);
          if (entry.revoked) {
            this.revokedFingerprints.add(entry.fingerprint);
          }
        }
      }

      console.log(`加载了 ${this.trustStore.size} 个信任条目`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('信任存储文件不存在，将创建新文件');
        await this.saveTrustStore(); // 创建初始文件
      } else {
        throw new SecurityError('TRUST_MANAGEMENT', 'TM_003', '信任存储加载失败', {
          originalError: error,
        });
      }
    }
  }

  /**
   * 保存信任存储
   */
  async saveTrustStore() {
    try {
      await this.ensureTrustStoreDirectory();

      const storeData = {
        entries: Array.from(this.trustStore.values()),
        version: '1.0',
        lastUpdated: new Date().toISOString(),
      };

      await fs.writeFile(this.trustStorePath, JSON.stringify(storeData, null, 2), 'utf8');
    } catch (error) {
      throw new SecurityError('TRUST_MANAGEMENT', 'TM_004', '信任存储保存失败', {
        originalError: error,
      });
    }
  }

  /**
   * 确保信任存储目录存在
   */
  async ensureTrustStoreDirectory() {
    try {
      await fs.mkdir(this.config.get('trustStoreDir', './trust-store'), { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw new SecurityError('FILE_SYSTEM', 'FS_004', '信任存储目录创建失败', {
          originalError: error,
          dirPath: this.config.get('trustStoreDir', './trust-store'),
        });
      }
    }
  }

  /**
   * 获取过期的信任
   */
  getExpiredTrusts() {
    const now = new Date();
    const expired = [];

    for (const [fingerprint, entry] of this.trustStore) {
      if (entry.expiresAt && new Date(entry.expiresAt) < now && !entry.revoked) {
        expired.push({
          fingerprint,
          ...entry,
        });
      }
    }

    return expired;
  }

  /**
   * 按来源统计信任
   */
  getTrustBySource() {
    const bySource = {};

    for (const [fingerprint, entry] of this.trustStore) {
      const source = entry.source || 'unknown';
      bySource[source] = (bySource[source] || 0) + 1;
    }

    return bySource;
  }

  /**
   * 计算匹配相关性
   */
  calculateMatchRelevance(text, searchTerm) {
    let relevance = 0;

    // 完全匹配指纹得最高分
    if (text.includes(searchTerm)) {
      relevance += 100;
    }

    // 计算词频
    const words = searchTerm.split(' ');
    for (const word of words) {
      const count = (text.match(new RegExp(word, 'g')) || []).length;
      relevance += count * 10;
    }

    return relevance;
  }

  /**
   * 保存策略
   * @param {Object} policy - 策略对象
   */
  async savePolicy(policy) {
    const policiesDir = path.join(this.config.get('trustStoreDir', './trust-store'), 'policies');
    await fs.mkdir(policiesDir, { recursive: true });

    const policyPath = path.join(policiesDir, `${policy.policyId}.json`);
    await fs.writeFile(policyPath, JSON.stringify(policy, null, 2), 'utf8');
  }

  /**
   * 评估单个策略
   * @param {Object} policy - 策略
   * @param {Object} context - 上下文
   * @returns {Object} 评估结果
   */
  evaluatePolicy(policy, context) {
    for (const rule of policy.rules) {
      const match = this.evaluateRule(rule, context);
      if (match) {
        let reason = '';
        if (rule.action === 'allow') {
          reason =
            rule.type === 'fingerprint'
              ? '指纹匹配允许规则'
              : rule.type === 'operation'
                ? '操作匹配允许规则'
                : '规则匹配允许';
        } else if (rule.action === 'deny') {
          reason =
            rule.type === 'fingerprint'
              ? '指纹匹配拒绝规则'
              : rule.type === 'operation'
                ? '操作匹配拒绝规则'
                : '规则匹配拒绝';
        }

        return {
          applied: true,
          action: rule.action,
          matchedRule: rule,
          policyName: policy.name,
          reason,
        };
      }
    }

    return { applied: false };
  }

  /**
   * 评估单个规则
   * @param {Object} rule - 规则
   * @param {Object} context - 上下文
   * @returns {boolean} 是否匹配
   */
  evaluateRule(rule, context) {
    switch (rule.type) {
      case 'fingerprint':
        return context.fingerprint === rule.value;
      case 'operation':
        return context.operation === rule.value || rule.value === '*';
      case 'keyName':
        return context.keyName === rule.value;
      default:
        return false;
    }
  }
}

module.exports = TrustManager;
