const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

/**
 * 统一配置管理类
 * 继承现有配置并规范化命名，支持事件监听和配置持久化
 *
 * @class Config
 * @extends EventEmitter
 * @version 2.0.0
 * @since 2025-10-13
 */
class Config extends EventEmitter {
  constructor() {
    super();
    this._config = {};
    this._defaults = this._getDefaultConfig();
    this.resetToDefaults();
  }

  /**
   * 获取默认配置
   * @private
   */
  _getDefaultConfig() {
    return {
      // 目录配置
      keyStorage: {
        path: process.env.KEY_MANAGEMENT_KEYS_DIR || path.join(__dirname, '../../../keys'),
        backupPath: path.join(__dirname, '../../../keys/backup'),
        rotationInterval: parseInt(process.env.KEY_ROTATION_INTERVAL) || 30 * 24 * 60 * 60 * 1000, // 30天
        algorithm: process.env.KEY_ALGORITHM || 'RSA-SHA256',
        size: parseInt(process.env.KEY_SIZE) || 2048,
      },

      // 安全配置
      security: {
        level: 'high',
        minPassphraseLength: parseInt(process.env.MIN_PASSPHRASE_LENGTH) || 16,
        enforceStrongPassphrase: process.env.ENFORCE_STRONG_PASSPHRASE !== 'false',
        maxPassphraseAttempts: parseInt(process.env.MAX_PASSPHRASE_ATTEMPTS) || 3,
        isProduction: process.env.NODE_ENV === 'production',
        isWindows: process.platform === 'win32',
      },

      // 签名服务配置
      signatureService: {
        defaultFormat: process.env.SIGNATURE_FORMAT || 'hex',
        timestampEnabled: true,
        detachedSignatures: false,
        minSignaturesRequired: parseInt(process.env.MIN_SIGNATURES_REQUIRED) || 2,
      },

      // 性能配置
      performance: {
        asyncOperationTimeout: parseInt(process.env.ASYNC_OPERATION_TIMEOUT) || 30000,
        maxConcurrentOperations: parseInt(process.env.MAX_CONCURRENT_OPERATIONS) || 5,
        operationRetryDelay: parseInt(process.env.OPERATION_RETRY_DELAY) || 1000,
        maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS) || 3,
      },

      // 缓存配置
      cache: {
        maxSize: parseInt(process.env.MAX_CACHE_SIZE) || 100,
        ttl: parseInt(process.env.CACHE_TTL) || 5 * 60 * 1000, // 5分钟
      },

      // 日志配置
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableDetailedLogging: process.env.ENABLE_DETAILED_LOGGING === 'true',
        file: path.join(__dirname, '../../../logs/signature-manager.log'),
      },

      // Windows ACL配置
      windowsACL: {
        enabled: process.env.WINDOWS_ACL_ENABLED !== 'false' && process.platform === 'win32',
        owner: process.env.WINDOWS_ACL_OWNER || 'Administrators',
      },

      // 信任策略配置
      trustPolicy: {
        enabled: process.env.TRUST_POLICY_ENABLED !== 'false',
        requireTrustedSigner: process.env.REQUIRE_TRUSTED_SIGNER === 'true',
      },

      // 文件监控配置
      fileWatch: {
        enabled: process.env.FILE_WATCH_ENABLED === 'true',
        interval: parseInt(process.env.FILE_WATCH_INTERVAL) || 5000,
      },

      // 多签名配置
      multiSignature: {
        enabled: process.env.MULTI_SIGNATURE_ENABLED !== 'false',
        threshold: parseInt(process.env.MULTI_SIGNATURE_THRESHOLD) || 2,
      },
    };
  }

  /**
   * 重置为默认配置
   */
  resetToDefaults() {
    const oldConfig = { ...this._config };
    this._config = JSON.parse(JSON.stringify(this._defaults));
    this.emit('configReset', oldConfig, this._config);
  }

  /**
   * 获取所有配置
   * @returns {Object} 完整配置对象
   */
  getAll() {
    return JSON.parse(JSON.stringify(this._config));
  }

  /**
   * 获取默认配置
   * @returns {Object} 默认配置对象
   */
  getDefaults() {
    return JSON.parse(JSON.stringify(this._defaults));
  }

  /**
   * 获取配置值
   * @param {string} key - 配置键，支持点符号（如 'keyStorage.path'）
   * @param {*} defaultValue - 默认值（可选）
   * @returns {*} 配置值
   */
  get(key, defaultValue = undefined) {
    const keys = key.split('.');
    let value = this._config;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * 设置配置值
   * @param {string} key - 配置键，支持点符号
   * @param {*} value - 配置值
   */
  set(key, value) {
    const keys = key.split('.');
    const lastKey = keys.pop();
    let target = this._config;

    for (const k of keys) {
      if (!target[k] || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }

    const oldValue = target[lastKey];
    target[lastKey] = value;

    this.emit('configChanged', key, oldValue, value);
  }

  /**
   * 检查配置是否存在
   * @param {string} key - 配置键
   * @returns {boolean} 是否存在
   */
  has(key) {
    return this.get(key) !== undefined;
  }

  /**
   * 合并配置
   * @param {Object} newConfig - 要合并的配置对象
   */
  merge(newConfig) {
    this._deepMerge(this._config, newConfig);
    this.emit('configMerged', newConfig);
  }

  /**
   * 深度合并对象
   * @private
   */
  _deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        this._deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  /**
   * 从环境变量加载配置
   * @param {string} prefix - 环境变量前缀（可选）
   */
  loadFromEnv(prefix = 'SIGNATURE_MANAGER_') {
    const envConfig = {};

    for (const [envKey, envValue] of Object.entries(process.env)) {
      if (envKey.startsWith(prefix)) {
        // 将环境变量转换为正确的配置键格式
        // SIGNATURE_MANAGER_KEY_STORAGE_PATH -> keyStorage.path
        const configKey = this._convertEnvKeyToConfigKey(envKey.slice(prefix.length));

        // 尝试解析为数字或布尔值
        let value = envValue;
        if (!isNaN(Number(envValue)) && envValue.trim() !== '') {
          value = Number(envValue);
        } else if (envValue === 'true' || envValue === 'false') {
          value = envValue === 'true';
        }

        this.set(configKey, value);
      }
    }

    this.emit('configLoadedFromEnv', prefix);
  }

  /**
   * 将环境变量键转换为配置键
   * KEY_STORAGE_PATH -> keyStorage.path
   * SECURITY_LEVEL -> security.level
   * @private
   */
  _convertEnvKeyToConfigKey(envKey) {
    const parts = envKey.toLowerCase().split('_');

    // 特殊映射规则 - 处理常见的配置键
    const specialMappings = {
      keystoragepath: 'keyStorage.path',
      securitylevel: 'security.level',
      signatureservice: 'signatureService',
      trustpolicy: 'trustPolicy',
      windowsacl: 'windowsACL',
      filesystem: 'fileSystem',
      asyncoperations: 'asyncOperations',
    };

    // 检查是否有特殊映射
    const key = parts.join('');
    if (specialMappings[key]) {
      return specialMappings[key];
    }

    // 默认转换：将各部分转换为驼峰命名
    let result = parts[0]; // 第一个单词保持小写
    for (let i = 1; i < parts.length; i++) {
      result += parts[i].charAt(0).toUpperCase() + parts[i].slice(1);
    }

    return result;
  }

  /**
   * 从文件加载配置
   * @param {string} filePath - 配置文件路径
   */
  async loadFromFile(filePath) {
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const fileConfig = JSON.parse(fileContent);

      this.merge(fileConfig);
      this.emit('configLoadedFromFile', filePath);
    } catch (error) {
      throw new Error(`无法加载配置文件 ${filePath}: ${error.message}`);
    }
  }

  /**
   * 保存配置到文件
   * @param {string} filePath - 配置文件路径
   */
  async saveToFile(filePath) {
    try {
      // 验证文件路径
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('文件路径不能为空');
      }

      // 检查路径是否包含非法字符（Windows系统）
      if (process.platform === 'win32') {
        // 排除驱动器号中的冒号
        const driveLetterPattern = /^[A-Za-z]:\\/;
        const pathWithoutDrive = filePath.replace(driveLetterPattern, '');
        const invalidChars = /[<>"|?*]/;

        if (invalidChars.test(pathWithoutDrive)) {
          throw new Error(`文件路径包含非法字符: ${filePath}`);
        }
      }

      const dir = path.dirname(filePath);

      // 尝试创建目录，如果失败则抛出更具体的错误
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (mkdirError) {
        // 对于某些Windows无效路径，mkdir可能不会立即失败
        // 我们在这里进行额外验证
        if (mkdirError.code === 'EINVAL' || mkdirError.code === 'ENOENT') {
          throw new Error(`无法创建目录: ${dir} - ${mkdirError.message}`);
        }
        // 重新抛出其他错误
        throw mkdirError;
      }

      const configJson = JSON.stringify(this._config, null, 2);
      await fs.writeFile(filePath, configJson, 'utf8');

      this.emit('configSavedToFile', filePath);
    } catch (error) {
      throw new Error(`无法保存配置文件 ${filePath}: ${error.message}`);
    }
  }

  /**
   * 测试用方法：强制保存到无效路径以触发错误
   * @private
   */
  async _forceSaveError(filePath) {
    // 强制使用一个肯定会失败的路径
    const invalidPath = 'C:\\invalid\\path\\with\\reserved\\characters\\<test>.json';
    await this.saveToFile(invalidPath);
  }

  /**
   * 验证配置完整性
   * @returns {boolean} 配置是否有效
   */
  validateConfig() {
    try {
      this._validateConfig();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 验证配置（详细）
   * @private
   */
  _validateConfig() {
    const errors = [];

    // 验证密钥存储配置
    const keyStorageValidation = this.validateKeyStorageConfig();
    if (!keyStorageValidation.valid) {
      errors.push(...keyStorageValidation.errors);
    }

    // 验证安全配置
    const securityValidation = this.validateSecurityConfig();
    if (!securityValidation.valid) {
      errors.push(...securityValidation.errors);
    }

    // 验证签名服务配置
    const signatureValidation = this.validateSignatureServiceConfig();
    if (!signatureValidation.valid) {
      errors.push(...signatureValidation.errors);
    }

    if (errors.length > 0) {
      throw new Error(`配置验证失败:\n${errors.join('\n')}`);
    }
  }

  /**
   * 验证密钥存储配置
   * @returns {Object} 验证结果
   */
  validateKeyStorageConfig() {
    const errors = [];
    const keyStorage = this.get('keyStorage') || {};

    if (!keyStorage.path || typeof keyStorage.path !== 'string') {
      errors.push('密钥存储路径不能为空');
    }

    if (keyStorage.rotationInterval && keyStorage.rotationInterval < 0) {
      errors.push('密钥轮换间隔不能为负数');
    }

    if (keyStorage.size && keyStorage.size < 512) {
      errors.push('密钥大小不能小于512位');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证安全配置
   * @returns {Object} 验证结果
   */
  validateSecurityConfig() {
    const errors = [];
    const security = this.get('security') || {};
    const validLevels = ['low', 'medium', 'high', 'ultra'];

    if (!validLevels.includes(security.level)) {
      errors.push(`安全级别必须是以下之一: ${validLevels.join(', ')}`);
    }

    if (security.minPassphraseLength < 8) {
      errors.push('最小口令长度不能小于8');
    }

    if (security.maxPassphraseAttempts < 1) {
      errors.push('最大口令尝试次数不能小于1');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证签名服务配置
   * @returns {Object} 验证结果
   */
  validateSignatureServiceConfig() {
    const errors = [];
    const signatureService = this.get('signatureService') || {};
    const validFormats = ['hex', 'base64', 'json'];

    if (!validFormats.includes(signatureService.defaultFormat)) {
      errors.push(`签名格式必须是以下之一: ${validFormats.join(', ')}`);
    }

    if (signatureService.minSignaturesRequired < 1) {
      errors.push('最小签名要求不能小于1');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取配置统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const configKeys = this._countKeys(this._config);
    const defaultKeys = this._countKeys(this._defaults);

    return {
      totalKeys: configKeys,
      defaultKeys: defaultKeys,
      customKeys: configKeys - defaultKeys,
      sections: Object.keys(this._config).length,
    };
  }

  /**
   * 计算对象中的键数量
   * @private
   */
  _countKeys(obj) {
    let count = 0;

    const countRecursive = currentObj => {
      for (const key in currentObj) {
        count++;
        if (currentObj[key] && typeof currentObj[key] === 'object') {
          countRecursive(currentObj[key]);
        }
      }
    };

    countRecursive(obj);
    return count;
  }
}

module.exports = Config;
