/**
 * PasswordSecurity - 密码安全专职类
 * 职责: 密码加密、强度验证
 * 符合单一职责原则(SRP)
 */
class PasswordSecurity {
  constructor() {
    this.minLength = 8;
    this.maxLength = 128;
    this.saltRounds = 12; // bcrypt盐轮数
  }

  /**
   * 验证密码强度
   * @param {string} password - 待验证的密码
   * @returns {Object} 验证结果
   */
  validatePasswordStrength(password) {
    const result = {
      isValid: false,
      score: 0,
      message: '',
      requirements: {
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false
      }
    };

    // 检查密码长度
    if (!password || password.length < this.minLength) {
      result.message = `密码长度至少需要${this.minLength}个字符`;
      return result;
    }

    if (password.length > this.maxLength) {
      result.message = `密码长度不能超过${this.maxLength}个字符`;
      return result;
    }

    result.requirements.length = true;
    result.score += 1;

    // 检查是否包含大写字母
    if (/[A-Z]/.test(password)) {
      result.requirements.uppercase = true;
      result.score += 1;
    }

    // 检查是否包含小写字母
    if (/[a-z]/.test(password)) {
      result.requirements.lowercase = true;
      result.score += 1;
    }

    // 检查是否包含数字
    if (/\d/.test(password)) {
      result.requirements.number = true;
      result.score += 1;
    }

    // 检查是否包含特殊字符
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      result.requirements.special = true;
      result.score += 1;
    }

    // 检查常见弱密码
    if (this.isCommonPassword(password)) {
      result.message = '密码过于常见，请使用更复杂的密码';
      return result;
    }

    // 检查重复字符
    if (this.hasRepeatingCharacters(password)) {
      result.message = '密码不能包含过多重复字符';
      return result;
    }

    // 根据评分确定密码强度
    if (result.score >= 4) {
      result.isValid = true;
      result.message = '密码强度良好';
    } else if (result.score >= 3) {
      result.isValid = true;
      result.message = '密码强度中等，建议包含更多字符类型';
    } else {
      result.message = '密码强度不足，请包含大小写字母、数字和特殊字符';
    }

    return result;
  }

  /**
   * 哈希密码
   * @param {string} password - 明文密码
   * @returns {Promise<string>} 哈希后的密码
   */
  async hashPassword(password) {
    try {
      // 在浏览器环境中使用Web Crypto API
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        return await this.hashPasswordWebCrypto(password);
      }

      // 在Node.js环境中使用bcrypt
      if (typeof require !== 'undefined') {
        const bcrypt = require('bcrypt');
        return await bcrypt.hash(password, this.saltRounds);
      }

      // 降级方案：使用简单的哈希(仅用于开发环境)
      console.warn('使用降级哈希方案，不适用于生产环境');
      return await this.simpleHash(password);
    } catch (error) {
      console.error('Password hashing failed:', error);
      throw new Error('密码加密失败');
    }
  }

  /**
   * 使用Web Crypto API哈希密码
   * @param {string} password - 明文密码
   * @returns {Promise<string>} 哈希后的密码
   */
  async hashPasswordWebCrypto(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + this.generateSalt());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 简单哈希方案(仅用于开发)
   * @param {string} password - 明文密码
   * @returns {Promise<string>} 哈希后的密码
   */
  async simpleHash(password) {
    // 这是一个简化的哈希实现，仅用于开发环境
    const salt = this.generateSalt();
    let hash = 0;
    const str = password + salt;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }

    return `simple_${Math.abs(hash).toString(16)}_${salt}`;
  }

  /**
   * 验证密码
   * @param {string} password - 明文密码
   * @param {string} hashedPassword - 哈希密码
   * @returns {Promise<boolean>} 验证结果
   */
  async verifyPassword(password, hashedPassword) {
    try {
      // 检查是否为bcrypt哈希
      if (hashedPassword.startsWith('$2b$') || hashedPassword.startsWith('$2a$')) {
        if (typeof require !== 'undefined') {
          const bcrypt = require('bcrypt');
          return await bcrypt.compare(password, hashedPassword);
        }
      }

      // 检查是否为简单哈希
      if (hashedPassword.startsWith('simple_')) {
        const parts = hashedPassword.split('_');
        if (parts.length === 3) {
          const salt = parts[2];
          const expectedHash = await this.simpleHash(password.replace(salt, ''));
          return expectedHash === hashedPassword;
        }
      }

      // Web Crypto API验证
      const newHash = await this.hashPasswordWebCrypto(password);
      return newHash === hashedPassword;
    } catch (error) {
      console.error('Password verification failed:', error);
      return false;
    }
  }

  /**
   * 生成随机盐
   * @returns {string} 随机盐
   */
  generateSalt() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let salt = '';
    for (let i = 0; i < 16; i++) {
      salt += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return salt;
  }

  /**
   * 检查是否为常见弱密码
   * @param {string} password - 密码
   * @returns {boolean} 是否为常见密码
   */
  isCommonPassword(password) {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey',
      '1234567890', 'password1', '123123', 'qwerty123',
      'iloveyou', 'princess', 'admin123', 'welcome123'
    ];

    return commonPasswords.includes(password.toLowerCase());
  }

  /**
   * 检查是否有过多重复字符
   * @param {string} password - 密码
   * @returns {boolean} 是否有过多重复字符
   */
  hasRepeatingCharacters(password) {
    // 检查连续重复字符(如aaa, 111)
    for (let i = 0; i < password.length - 2; i++) {
      if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
        return true;
      }
    }

    // 检查字符重复率
    const charCount = {};
    for (const char of password) {
      charCount[char] = (charCount[char] || 0) + 1;
    }

    const maxRepeats = Math.max(...Object.values(charCount));
    const repeatRatio = maxRepeats / password.length;

    return repeatRatio > 0.5; // 超过50%重复率
  }

  /**
   * 生成安全的随机密码
   * @param {number} length - 密码长度
   * @returns {string} 随机密码
   */
  generateSecurePassword(length = 12) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    const allChars = uppercase + lowercase + numbers + special;
    let password = '';

    // 确保至少包含每种字符类型
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // 填充剩余长度
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // 打乱密码字符顺序
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * 设置密码长度要求
   * @param {number} minLength - 最小长度
   * @param {number} maxLength - 最大长度
   */
  setPasswordLengthRequirements(minLength, maxLength) {
    this.minLength = minLength;
    this.maxLength = maxLength;
  }
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PasswordSecurity;
}

// 浏览器环境下的全局暴露
if (typeof window !== 'undefined') {
  window.PasswordSecurity = PasswordSecurity;
}
