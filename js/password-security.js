/**
 * 密码安全处理模块
 * 提供密码哈希、盐值生成、安全存储等功能
 * 使用现代加密标准确保密码安全
 */
class PasswordSecurity {
  constructor() {
    // 配置参数
    this.config = {
      // PBKDF2 配置
      pbkdf2: {
        iterations: 100000, // OWASP 推荐最小值
        keyLength: 64,      // 输出密钥长度（字节）
        digest: 'sha512'    // 哈希算法
      },
      // 盐值配置
      salt: {
        length: 32          // 盐值长度（字节）
      },
      // 密码策略
      policy: {
        minLength: 8,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      }
    };

    // 检查环境支持
    this.checkEnvironmentSupport();
  }

  /**
   * 检查环境是否支持所需的加密功能
   */
  checkEnvironmentSupport() {
    // 优先检查 Node.js 环境（包括 Jest 测试环境）
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      // Node.js 环境
      try {
        this.crypto = require('crypto');
        this.environment = 'node';
        return;
      } catch (error) {
        throw new Error('Node.js 环境缺少 crypto 模块');
      }
    }

    if (typeof window !== 'undefined') {
      // 浏览器环境
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error('当前浏览器不支持 Web Crypto API，无法进行安全的密码处理');
      }
      this.environment = 'browser';
    } else {
      throw new Error('不支持的运行环境');
    }
  }

  /**
   * 生成加密安全的随机盐值
   * @param {number} length - 盐值长度（字节）
   * @returns {Promise<string>} Base64 编码的盐值
   */
  async generateSalt(length = this.config.salt.length) {
    if (this.environment === 'browser') {
      const saltArray = new Uint8Array(length);
      window.crypto.getRandomValues(saltArray);
      return this.arrayBufferToBase64(saltArray);
    }
    const salt = this.crypto.randomBytes(length);
    return salt.toString('base64');

  }

  /**
   * 使用 PBKDF2 算法哈希密码
   * @param {string} password - 原始密码
   * @param {string} salt - Base64 编码的盐值
   * @returns {Promise<string>} Base64 编码的哈希值
   */
  async hashPassword(password, salt) {
    if (!password || typeof password !== 'string') {
      throw new Error('密码必须是非空字符串');
    }

    if (!salt || typeof salt !== 'string') {
      throw new Error('盐值必须是非空字符串');
    }

    if (this.environment === 'browser') {
      return await this.hashPasswordBrowser(password, salt);
    }
    return await this.hashPasswordNode(password, salt);

  }

  /**
   * 浏览器环境下的密码哈希
   */
  async hashPasswordBrowser(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const saltBuffer = this.base64ToArrayBuffer(salt);

    // 导入密码作为密钥材料
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    // 派生密钥
    const derivedKey = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: this.config.pbkdf2.iterations,
        hash: this.config.pbkdf2.digest.toUpperCase()
      },
      keyMaterial,
      this.config.pbkdf2.keyLength * 8 // 转换为位数
    );

    return this.arrayBufferToBase64(new Uint8Array(derivedKey));
  }

  /**
   * Node.js 环境下的密码哈希
   */
  async hashPasswordNode(password, salt) {
    return new Promise((resolve, reject) => {
      this.crypto.pbkdf2(
        password,
        Buffer.from(salt, 'base64'),
        this.config.pbkdf2.iterations,
        this.config.pbkdf2.keyLength,
        this.config.pbkdf2.digest,
        (err, derivedKey) => {
          if (err) {
            reject(new Error(`密码哈希失败: ${err.message}`));
          } else {
            resolve(derivedKey.toString('base64'));
          }
        }
      );
    });
  }

  /**
   * 创建完整的密码哈希（包含盐值生成）
   * @param {string} password - 原始密码
   * @returns {Promise<Object>} 包含哈希值和盐值的对象
   */
  async createPasswordHash(password) {
    try {
      const salt = await this.generateSalt();
      const hash = await this.hashPassword(password, salt);

      return {
        hash,
        salt,
        algorithm: 'PBKDF2',
        iterations: this.config.pbkdf2.iterations,
        keyLength: this.config.pbkdf2.keyLength,
        digest: this.config.pbkdf2.digest,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`创建密码哈希失败: ${error.message}`);
    }
  }

  /**
   * 验证密码
   * @param {string} password - 待验证的密码
   * @param {Object} storedHash - 存储的哈希信息
   * @returns {Promise<boolean>} 验证结果
   */
  async verifyPassword(password, storedHash) {
    try {
      if (!storedHash || !storedHash.hash || !storedHash.salt) {
        throw new Error('存储的哈希信息不完整');
      }

      const computedHash = await this.hashPassword(password, storedHash.salt);
      return this.secureCompare(computedHash, storedHash.hash);
    } catch (error) {
      throw new Error(`密码验证失败: ${error.message}`);
    }
  }

  /**
   * 安全的字符串比较（防止时序攻击）
   * @param {string} a - 字符串 A
   * @param {string} b - 字符串 B
   * @returns {boolean} 比较结果
   */
  secureCompare(a, b) {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * 检查密码是否需要重新哈希（算法升级）
   * @param {Object} storedHash - 存储的哈希信息
   * @returns {boolean} 是否需要重新哈希
   */
  needsRehash(storedHash) {
    if (!storedHash) {return true;}

    return (
      storedHash.algorithm !== 'PBKDF2' ||
      storedHash.iterations < this.config.pbkdf2.iterations ||
      storedHash.keyLength !== this.config.pbkdf2.keyLength ||
      storedHash.digest !== this.config.pbkdf2.digest
    );
  }

  /**
   * 生成密码重置令牌
   * @returns {Promise<string>} 安全的重置令牌
   */
  async generateResetToken() {
    const tokenLength = 32;
    if (this.environment === 'browser') {
      const tokenArray = new Uint8Array(tokenLength);
      window.crypto.getRandomValues(tokenArray);
      return this.arrayBufferToBase64(tokenArray);
    }
    const token = this.crypto.randomBytes(tokenLength);
    return token.toString('base64');

  }

  /**
   * 工具方法：ArrayBuffer 转 Base64
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * 工具方法：Base64 转 ArrayBuffer
   */
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * 获取密码安全配置信息
   * @returns {Object} 配置信息（不包含敏感数据）
   */
  getSecurityInfo() {
    return {
      algorithm: 'PBKDF2',
      iterations: this.config.pbkdf2.iterations,
      keyLength: this.config.pbkdf2.keyLength,
      digest: this.config.pbkdf2.digest,
      saltLength: this.config.salt.length,
      environment: this.environment,
      supportedFeatures: {
        webCrypto: this.environment === 'browser' && !!window.crypto?.subtle,
        nodeCrypto: this.environment === 'node' && !!this.crypto
      }
    };
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PasswordSecurity;
} else if (typeof window !== 'undefined') {
  window.PasswordSecurity = PasswordSecurity;
}
