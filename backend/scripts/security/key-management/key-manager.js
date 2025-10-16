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
 * 核心密钥管理器
 * 继承enhanced-signature-manager的密钥管理功能，专注密钥生命周期管理
 */
class KeyManager {
  constructor() {
    this.currentKeyId = null;
    this.keyMetadata = new Map();
    this.trustManager = new (require('./trust-manager'))();
    this.keyCache = new (require('./key-cache'))();
    this.errorRecoveryManager = new ErrorRecoveryManager();
    this.asyncOperationManager = new AsyncOperationManager();
    this.windowsACLManager = CONFIG.isWindows ? new (require('./windows-acl'))() : null;

    // 初始化错误恢复策略
    this.setupRecoveryStrategies();

    // 加载现有密钥元数据
    this.loadKeyMetadata().catch(error => {
      console.warn(`密钥元数据加载失败: ${error.message}`);
    });
  }

  /**
   * 设置错误恢复策略
   */
  setupRecoveryStrategies() {
    // 文件系统错误恢复策略
    this.errorRecoveryManager.registerRecoveryStrategy('FS_001', async (error, attempt) => {
      console.log(`尝试恢复文件读取错误，第${attempt}次重试`);
      // 可以在这里添加文件系统检查或修复逻辑
    });

    this.errorRecoveryManager.registerRecoveryStrategy('FS_002', async (error, attempt) => {
      console.log(`尝试恢复文件写入错误，第${attempt}次重试`);
      // 确保目录存在
      const dir = path.dirname(error.details.filePath);
      await this.ensureDirectoryExists(dir);
    });

    // 异步操作超时恢复策略
    this.errorRecoveryManager.registerRecoveryStrategy('AO_001', async (error, attempt) => {
      console.log(`操作超时，第${attempt}次重试，增加超时时间`);
      // 可以调整超时时间或清理资源
    });
  }

  /**
   * 生成密钥对
   * @param {string} keyId - 密钥ID（可选，自动生成）
   * @param {string} passphrase - 口令（可选）
   * @returns {Promise<Object>} 生成的密钥信息
   */
  async generateKeyPair(keyId = null, passphrase = null) {
    return this.errorRecoveryManager.executeWithRecovery('generate-key-pair', async () => {
      // 验证输入
      if (keyId) {
        const validation = SecurityUtils.validateKeyId(keyId);
        if (!validation.isValid) {
          throw new SecurityError('KEY_MANAGEMENT', 'CV_001', '无效的密钥ID', {
            issues: validation.issues,
          });
        }
        keyId = validation.normalizedId;
      } else {
        keyId = `key_${Date.now()}_${SecurityUtils.generateRandomString(8)}`;
      }

      // 验证口令强度（如果提供）
      if (passphrase && CONFIG.enforceStrongPassphrase) {
        const passphraseValidation = SecurityUtils.validatePassphrase(passphrase);
        if (!passphraseValidation.isValid) {
          throw new SecurityError('KEY_MANAGEMENT', 'KM_013', '口令强度不足', {
            issues: passphraseValidation.issues,
            strength: passphraseValidation.strength,
          });
        }
      }

      // 检查密钥是否已存在
      if (this.keyMetadata.has(keyId)) {
        throw new SecurityError('KEY_MANAGEMENT', 'KM_007', '密钥ID已存在', { keyId });
      }

      // 生成密钥对
      const keyPair = await this.asyncOperationManager.executeWithTimeout(
        `generate-key-${keyId}`,
        async () => {
          return new Promise((resolve, reject) => {
            crypto.generateKeyPair(
              'rsa',
              {
                modulusLength: CONFIG.keySize,
                publicKeyEncoding: {
                  type: 'spki',
                  format: 'pem',
                },
                privateKeyEncoding: {
                  type: 'pkcs8',
                  format: 'pem',
                  cipher: passphrase ? 'aes-256-cbc' : undefined,
                  passphrase: passphrase || undefined,
                },
              },
              (err, publicKey, privateKey) => {
                if (err) {
                  reject(
                    new SecurityError('KEY_MANAGEMENT', 'KM_001', '密钥生成失败', {
                      originalError: err,
                      keyId,
                    }),
                  );
                } else {
                  resolve({ publicKey, privateKey });
                }
              },
            );
          });
        },
      );

      // 保存密钥文件
      await this.saveKeyFiles(keyId, keyPair, passphrase);

      // 生成指纹
      const fingerprint = SecurityUtils.generateFingerprint(keyPair.publicKey);

      // 创建元数据
      const metadata = {
        keyId,
        fingerprint,
        algorithm: CONFIG.keyAlgorithm,
        keySize: CONFIG.keySize,
        generatedAt: new Date().toISOString(),
        isActive: true,
        passphraseProtected: !!passphrase,
        usageCount: 0,
        lastUsed: null,
      };

      // 保存元数据
      this.keyMetadata.set(keyId, metadata);
      await this.saveKeyMetadata();

      // 缓存公钥
      this.keyCache.set(`public:${keyId}`, keyPair.publicKey);
      this.keyCache.set(`fingerprint:${keyId}`, fingerprint);

      console.log(`密钥对生成成功: ${keyId}, 指纹: ${fingerprint}`);

      return {
        keyId,
        fingerprint,
        publicKey: keyPair.publicKey,
        metadata,
      };
    });
  }

  /**
   * 轮换密钥
   * @param {string} passphrase - 新密钥的口令（可选）
   * @returns {Promise<Object>} 轮换结果
   */
  async rotateKey(passphrase = null) {
    return this.errorRecoveryManager.executeWithRecovery('rotate-key', async () => {
      if (!this.currentKeyId) {
        throw new SecurityError('KEY_MANAGEMENT', 'KM_006', '没有当前活跃密钥可轮换');
      }

      // 生成新密钥
      const newKeyId = `key_${Date.now()}_${SecurityUtils.generateRandomString(8)}`;
      const newKeyResult = await this.generateKeyPair(newKeyId, passphrase);

      // 归档旧密钥
      await this.archiveKey(this.currentKeyId);

      // 更新当前密钥ID
      this.currentKeyId = newKeyId;

      console.log(`密钥轮换完成: ${this.currentKeyId} -> ${newKeyId}`);

      return {
        oldKeyId: this.currentKeyId,
        newKeyId,
        newFingerprint: newKeyResult.fingerprint,
        rotatedAt: new Date().toISOString(),
      };
    });
  }

  /**
   * 归档密钥
   * @param {string} keyId - 要归档的密钥ID
   * @returns {Promise<Object>} 归档结果
   */
  async archiveKey(keyId) {
    return this.errorRecoveryManager.executeWithRecovery('archive-key', async () => {
      const validation = SecurityUtils.validateKeyId(keyId);
      if (!validation.isValid) {
        throw new SecurityError('KEY_MANAGEMENT', 'CV_001', '无效的密钥ID', {
          issues: validation.issues,
        });
      }

      keyId = validation.normalizedId;

      const metadata = this.keyMetadata.get(keyId);
      if (!metadata) {
        throw new SecurityError('KEY_MANAGEMENT', 'KM_006', '密钥不存在', { keyId });
      }

      // 更新元数据
      metadata.isActive = false;
      metadata.archivedAt = new Date().toISOString();
      this.keyMetadata.set(keyId, metadata);

      // 移动密钥文件到归档目录
      await this.moveKeyToArchive(keyId);

      // 从缓存中移除
      this.keyCache.delete(`public:${keyId}`);
      this.keyCache.delete(`fingerprint:${keyId}`);

      // 保存元数据
      await this.saveKeyMetadata();

      console.log(`密钥已归档: ${keyId}`);

      return {
        keyId,
        archivedAt: metadata.archivedAt,
        fingerprint: metadata.fingerprint,
      };
    });
  }

  /**
   * 导出公钥
   * @param {string} keyId - 密钥ID
   * @param {string} outputPath - 输出路径（可选）
   * @returns {Promise<string>} 公钥内容或文件路径
   */
  async exportPublicKey(keyId, outputPath = null) {
    return this.errorRecoveryManager.executeWithRecovery('export-public-key', async () => {
      const validation = SecurityUtils.validateKeyId(keyId);
      if (!validation.isValid) {
        throw new SecurityError('KEY_MANAGEMENT', 'CV_001', '无效的密钥ID', {
          issues: validation.issues,
        });
      }

      keyId = validation.normalizedId;

      // 首先尝试从缓存获取
      const cachedPublicKey = this.keyCache.get(`public:${keyId}`);
      if (cachedPublicKey) {
        console.log(`从缓存获取公钥: ${keyId}`);
        if (outputPath) {
          await this.writePublicKeyToFile(outputPath, cachedPublicKey);
          return outputPath;
        }
        return cachedPublicKey;
      }

      // 从文件加载
      const publicKey = await this.loadPublicKey(keyId);

      // 缓存公钥
      this.keyCache.set(`public:${keyId}`, publicKey);

      if (outputPath) {
        await this.writePublicKeyToFile(outputPath, publicKey);
        return outputPath;
      }

      return publicKey;
    });
  }

  /**
   * 导入公钥
   * @param {string} keyId - 密钥ID
   * @param {string} publicKeyPath - 公钥文件路径
   * @param {boolean} trust - 是否自动信任
   * @returns {Promise<Object>} 导入结果
   */
  async importPublicKey(keyId, publicKeyPath, trust = false) {
    return this.errorRecoveryManager.executeWithRecovery('import-public-key', async () => {
      // 验证输入
      const keyValidation = SecurityUtils.validateKeyId(keyId);
      if (!keyValidation.isValid) {
        throw new SecurityError('KEY_MANAGEMENT', 'CV_001', '无效的密钥ID', {
          issues: keyValidation.issues,
        });
      }

      const pathValidation = SecurityUtils.validateFilePath(publicKeyPath, ['.pem', '.key']);
      if (!pathValidation.isValid) {
        throw new SecurityError('FILE_SYSTEM', 'CV_001', '无效的公钥文件路径', {
          issues: pathValidation.issues,
        });
      }

      keyId = keyValidation.normalizedId;
      publicKeyPath = pathValidation.normalizedPath;

      // 检查密钥是否已存在
      if (this.keyMetadata.has(keyId)) {
        throw new SecurityError('KEY_MANAGEMENT', 'KM_007', '密钥ID已存在', { keyId });
      }

      // 读取公钥文件
      const publicKey = await this.asyncOperationManager.executeWithTimeout(
        `import-public-key-${keyId}`,
        async () => {
          return fs.readFile(publicKeyPath, 'utf8');
        },
      );

      // 验证公钥格式
      if (!this.validatePublicKeyFormat(publicKey)) {
        throw new SecurityError('KEY_MANAGEMENT', 'KM_008', '无效的公钥格式', {
          keyId,
          publicKeyPath,
        });
      }

      // 生成指纹
      const fingerprint = SecurityUtils.generateFingerprint(publicKey);

      // 创建元数据
      const metadata = {
        keyId,
        fingerprint,
        algorithm: this.detectKeyAlgorithm(publicKey),
        importedAt: new Date().toISOString(),
        isActive: true,
        isImported: true,
        sourcePath: publicKeyPath,
        usageCount: 0,
        lastUsed: null,
      };

      // 保存元数据
      this.keyMetadata.set(keyId, metadata);
      await this.saveKeyMetadata();

      // 缓存公钥和指纹
      this.keyCache.set(`public:${keyId}`, publicKey);
      this.keyCache.set(`fingerprint:${keyId}`, fingerprint);

      // 如果请求信任，添加到信任存储
      if (trust) {
        await this.trustManager.addTrustedFingerprint(fingerprint, {
          keyId,
          importedAt: metadata.importedAt,
          source: 'imported',
        });
      }

      console.log(`公钥导入成功: ${keyId}, 指纹: ${fingerprint}`);

      return {
        keyId,
        fingerprint,
        trusted: trust,
        metadata,
      };
    });
  }

  /**
   * 列出所有密钥
   * @returns {Array} 密钥列表
   */
  listKeys() {
    const keys = [];

    for (const [keyId, metadata] of this.keyMetadata) {
      keys.push({
        keyId,
        ...metadata,
        isCurrent: keyId === this.currentKeyId,
      });
    }

    return keys.sort(
      (a, b) => new Date(b.generatedAt || b.importedAt) - new Date(a.generatedAt || a.importedAt),
    );
  }

  /**
   * 获取密钥统计信息
   * @returns {Object} 统计信息
   */
  getKeyStats() {
    const keys = this.listKeys();
    const stats = {
      total: keys.length,
      active: 0,
      archived: 0,
      imported: 0,
      byAlgorithm: {},
      cacheStats: this.keyCache.getStats(),
    };

    for (const key of keys) {
      if (key.isActive) stats.active++;
      if (!key.isActive) stats.archived++;
      if (key.isImported) stats.imported++;

      const algorithm = key.algorithm || 'unknown';
      stats.byAlgorithm[algorithm] = (stats.byAlgorithm[algorithm] || 0) + 1;
    }

    return stats;
  }

  // ========== 私有方法 ==========

  /**
   * 加载密钥元数据
   */
  async loadKeyMetadata() {
    try {
      const metadataPath = path.join(CONFIG.keysDir, 'key-metadata.json');
      const data = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(data);

      for (const [keyId, meta] of Object.entries(metadata)) {
        this.keyMetadata.set(keyId, meta);

        // 设置当前密钥（第一个活跃密钥）
        if (meta.isActive && !this.currentKeyId) {
          this.currentKeyId = keyId;
        }
      }

      console.log(`加载了 ${this.keyMetadata.size} 个密钥的元数据`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('密钥元数据文件不存在，将创建新文件');
      } else {
        throw new SecurityError('KEY_MANAGEMENT', 'KM_002', '密钥元数据加载失败', {
          originalError: error,
        });
      }
    }
  }

  /**
   * 保存密钥元数据
   */
  async saveKeyMetadata() {
    try {
      await this.ensureDirectoryExists(CONFIG.keysDir);

      const metadataPath = path.join(CONFIG.keysDir, 'key-metadata.json');
      const metadata = Object.fromEntries(this.keyMetadata);

      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    } catch (error) {
      throw new SecurityError('KEY_MANAGEMENT', 'KM_003', '密钥元数据保存失败', {
        originalError: error,
      });
    }
  }

  /**
   * 保存密钥文件
   */
  async saveKeyFiles(keyId, keyPair, passphrase = null) {
    try {
      await this.ensureDirectoryExists(CONFIG.keysDir);

      const basePath = path.join(CONFIG.keysDir, keyId);

      // 保存公钥
      await fs.writeFile(`${basePath}.pub`, keyPair.publicKey, 'utf8');

      // 保存私钥
      await fs.writeFile(`${basePath}.key`, keyPair.privateKey, 'utf8');

      // 应用Windows ACL（如果启用）
      if (this.windowsACLManager) {
        await this.windowsACLManager.secureKeyFiles(basePath);
      }

      console.log(`密钥文件保存成功: ${basePath}.{pub,key}`);
    } catch (error) {
      throw new SecurityError('KEY_MANAGEMENT', 'KM_003', '密钥文件保存失败', {
        originalError: error,
        keyId,
      });
    }
  }

  /**
   * 加载公钥
   */
  async loadPublicKey(keyId) {
    try {
      const publicKeyPath = path.join(CONFIG.keysDir, `${keyId}.pub`);
      return await fs.readFile(publicKeyPath, 'utf8');
    } catch (error) {
      throw new SecurityError('KEY_MANAGEMENT', 'KM_002', '公钥加载失败', {
        originalError: error,
        keyId,
      });
    }
  }

  /**
   * 将公钥写入文件
   */
  async writePublicKeyToFile(outputPath, publicKey) {
    try {
      await this.ensureDirectoryExists(path.dirname(outputPath));
      await fs.writeFile(outputPath, publicKey, 'utf8');
    } catch (error) {
      throw new SecurityError('KEY_MANAGEMENT', 'KM_009', '公钥导出失败', {
        originalError: error,
        outputPath,
      });
    }
  }

  /**
   * 移动密钥到归档目录
   */
  async moveKeyToArchive(keyId) {
    try {
      await this.ensureDirectoryExists(CONFIG.keyHistoryDir);

      const basePath = path.join(CONFIG.keysDir, keyId);
      const archivePath = path.join(CONFIG.keyHistoryDir, `${keyId}_${Date.now()}`);

      await fs.rename(`${basePath}.pub`, `${archivePath}.pub`);
      await fs.rename(`${basePath}.key`, `${archivePath}.key`);
    } catch (error) {
      throw new SecurityError('KEY_MANAGEMENT', 'KM_005', '密钥归档失败', {
        originalError: error,
        keyId,
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
   * 验证公钥格式
   */
  validatePublicKeyFormat(publicKey) {
    return (
      publicKey.includes('-----BEGIN PUBLIC KEY-----') &&
      publicKey.includes('-----END PUBLIC KEY-----')
    );
  }

  /**
   * 检测密钥算法
   */
  detectKeyAlgorithm(publicKey) {
    if (publicKey.includes('RSA PUBLIC KEY')) return 'RSA';
    if (publicKey.includes('EC PUBLIC KEY')) return 'ECDSA';
    if (publicKey.includes('ED25519 PUBLIC KEY')) return 'Ed25519';
    return 'unknown';
  }
}

module.exports = KeyManager;
