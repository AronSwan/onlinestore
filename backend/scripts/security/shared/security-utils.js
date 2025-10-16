const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const Config = require('./config');

// 创建配置实例
const CONFIG = new Config();

/**
 * 安全工具类
 * 继承现有安全功能并统一验证逻辑
 */
class SecurityUtils {
  /**
   * 验证口令强度
   * @param {string} passphrase - 待验证的口令
   * @param {Object} options - 验证选项
   * @returns {Object} 验证结果
   */
  static validatePassphrase(passphrase, options = {}) {
    const minLength = options.minLength || CONFIG.get('security.minPassphraseLength');
    const requireSpecial = options.requireSpecial !== false;
    const requireNumbers = options.requireNumbers !== false;
    const requireMixedCase = options.requireMixedCase !== false;

    const issues = [];

    // 基本长度检查
    if (!passphrase || passphrase.length < minLength) {
      issues.push(`口令长度必须至少 ${minLength} 个字符`);
    }

    // 特殊字符检查
    if (requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passphrase)) {
      issues.push('口令必须包含至少一个特殊字符');
    }

    // 数字检查
    if (requireNumbers && !/\d/.test(passphrase)) {
      issues.push('口令必须包含至少一个数字');
    }

    // 大小写混合检查
    if (requireMixedCase && (!/[a-z]/.test(passphrase) || !/[A-Z]/.test(passphrase))) {
      issues.push('口令必须包含大小写字母');
    }

    // 常见弱口令检查
    const weakPassphrases = ['password', '123456', 'admin', 'qwerty', 'letmein'];
    if (weakPassphrases.includes(passphrase.toLowerCase())) {
      issues.push('口令过于常见，请使用更强的口令');
    }

    const isValid = issues.length === 0;

    return {
      isValid,
      issues,
      strength: isValid ? 'strong' : 'weak',
      score: this.calculatePassphraseStrength(passphrase),
    };
  }

  /**
   * 计算口令强度分数
   * @param {string} passphrase - 口令
   * @returns {number} 强度分数 (0-100)
   */
  static calculatePassphraseStrength(passphrase) {
    if (!passphrase) return 0;

    let score = 0;

    // 长度得分
    score += Math.min(passphrase.length * 4, 40);

    // 字符类型多样性得分
    const hasLower = /[a-z]/.test(passphrase);
    const hasUpper = /[A-Z]/.test(passphrase);
    const hasNumbers = /\d/.test(passphrase);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passphrase);

    const charTypeCount = [hasLower, hasUpper, hasNumbers, hasSpecial].filter(Boolean).length;
    score += (charTypeCount - 1) * 15;

    // 熵值计算
    const entropy = this.calculateEntropy(passphrase);
    score += Math.min(entropy * 2, 30);

    return Math.min(Math.round(score), 100);
  }

  /**
   * 计算字符串熵值
   * @param {string} str - 输入字符串
   * @returns {number} 熵值
   */
  static calculateEntropy(str) {
    const charSet = new Set(str);
    const probability = Array.from(charSet).map(char => {
      const count = str.split(char).length - 1;
      return count / str.length;
    });

    return -probability.reduce((sum, p) => sum + p * Math.log2(p), 0);
  }

  /**
   * 验证密钥ID格式
   * @param {string} keyId - 密钥ID
   * @returns {Object} 验证结果
   */
  static validateKeyId(keyId) {
    const issues = [];

    if (!keyId || typeof keyId !== 'string') {
      issues.push('密钥ID不能为空且必须是字符串');
      return { isValid: false, issues };
    }

    // 长度检查
    if (keyId.length < 3 || keyId.length > 64) {
      issues.push('密钥ID长度必须在3-64个字符之间');
    }

    // 字符集检查
    if (!/^[a-zA-Z0-9\-_.]+$/.test(keyId)) {
      issues.push('密钥ID只能包含字母、数字、连字符、下划线和点');
    }

    // 保留字检查
    const reservedWords = ['null', 'undefined', 'none', 'default', 'root', 'admin'];
    if (reservedWords.includes(keyId.toLowerCase())) {
      issues.push('密钥ID不能使用保留字');
    }

    return {
      isValid: issues.length === 0,
      issues,
      normalizedId: keyId.toLowerCase().replace(/[^a-z0-9\-_.]/g, ''),
    };
  }

  /**
   * 验证文件路径安全性
   * @param {string} filePath - 文件路径
   * @param {Array} allowedExtensions - 允许的文件扩展名
   * @returns {Object} 验证结果
   */
  static validateFilePath(filePath, allowedExtensions = ['.json', '.pem', '.key', '.sig']) {
    const issues = [];

    if (!filePath || typeof filePath !== 'string') {
      issues.push('文件路径不能为空且必须是字符串');
      return { isValid: false, issues };
    }

    // 路径遍历攻击检查
    if (filePath.includes('..') || filePath.includes('~')) {
      issues.push('文件路径包含非法字符，可能存在路径遍历攻击风险');
    }

    // 绝对路径检查
    if (path.isAbsolute(filePath)) {
      issues.push('文件路径应为相对路径');
    }

    // 扩展名检查
    const ext = path.extname(filePath).toLowerCase();
    if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
      issues.push(`文件扩展名 ${ext} 不在允许的列表中: ${allowedExtensions.join(', ')}`);
    }

    // 路径规范化
    const normalizedPath = path.normalize(filePath);

    return {
      isValid: issues.length === 0,
      issues,
      normalizedPath,
      extension: ext,
    };
  }

  /**
   * 生成密钥指纹
   * @param {string|Buffer} publicKey - 公钥
   * @returns {string} 指纹
   */
  static generateFingerprint(publicKey) {
    if (!publicKey) {
      throw new Error('公钥不能为空');
    }

    const keyData = typeof publicKey === 'string' ? publicKey : publicKey.toString();
    const hash = crypto.createHash('sha256');
    hash.update(keyData);

    return hash.digest('hex').toUpperCase();
  }

  /**
   * 验证指纹格式
   * @param {string} fingerprint - 指纹
   * @returns {boolean} 是否有效
   */
  static validateFingerprint(fingerprint) {
    if (!fingerprint || typeof fingerprint !== 'string') {
      return false;
    }

    // SHA256指纹应该是64个十六进制字符
    return /^[A-F0-9]{64}$/.test(fingerprint);
  }

  /**
   * 清理和规范化输入
   * @param {*} input - 输入数据
   * @param {string} type - 输入类型
   * @returns {*} 清理后的数据
   */
  static sanitizeInput(input, type = 'string') {
    if (input === null || input === undefined) {
      return input;
    }

    switch (type) {
      case 'string':
        return String(input).trim().replace(/[<>]/g, '');

      case 'number':
        const num = Number(input);
        return isNaN(num) ? 0 : num;

      case 'boolean':
        return Boolean(input);

      case 'path':
        return path.normalize(String(input).trim()).replace(/[<>|&$]/g, '');

      case 'json':
        try {
          return JSON.parse(String(input));
        } catch {
          return {};
        }

      default:
        return input;
    }
  }

  /**
   * 生成随机安全字符串
   * @param {number} length - 长度
   * @returns {string} 随机字符串
   */
  static generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('base64').replace(/[+/=]/g, '').slice(0, length);
  }

  /**
   * 验证Windows ACL权限
   * @param {string} filePath - 文件路径
   * @returns {Promise<boolean>} 权限是否安全
   */
  static async validateWindowsACL(filePath) {
    if (!CONFIG.get('security.isWindows') || !CONFIG.get('windowsACL.enabled')) {
      return true; // 非Windows系统或ACL禁用时返回true
    }

    try {
      const fs = require('fs');
      const stats = fs.statSync(filePath);

      // 检查文件权限（简化版本，实际实现需要更复杂的ACL检查）
      const mode = stats.mode;
      const isSecure = (mode & 0o022) === 0; // 检查是否设置了写权限给组和其他用户

      return isSecure;
    } catch (error) {
      console.warn(`Windows ACL验证失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 验证信任策略
   * @param {string} fingerprint - 指纹
   * @param {Object} trustStore - 信任存储
   * @returns {Object} 验证结果
   */
  static validateTrust(fingerprint, trustStore) {
    if (!this.validateFingerprint(fingerprint)) {
      return { trusted: false, reason: '无效的指纹格式' };
    }

    const trustedEntry = trustStore[fingerprint];

    if (!trustedEntry) {
      return { trusted: false, reason: '指纹不在信任存储中' };
    }

    if (trustedEntry.revoked) {
      return { trusted: false, reason: '指纹已被撤销', revokedAt: trustedEntry.revokedAt };
    }

    // 检查信任过期
    if (trustedEntry.expiresAt && new Date(trustedEntry.expiresAt) < new Date()) {
      return { trusted: false, reason: '信任已过期', expiresAt: trustedEntry.expiresAt };
    }

    return {
      trusted: true,
      metadata: trustedEntry.metadata,
      addedAt: trustedEntry.addedAt,
      expiresAt: trustedEntry.expiresAt,
    };
  }
}

module.exports = SecurityUtils;
