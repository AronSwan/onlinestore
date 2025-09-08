/**
 * 密码安全处理模块
 * 提供密码加密、验证、策略管理和账户锁定功能
 * 基于 design/auth_password_security.md 伪代码实现
 */

/**
 * 密码策略管理器
 * 管理密码复杂度要求和安全规则
 */
class PasswordPolicyManager {
  constructor() {
    this.policies = {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      forbiddenPatterns: [
        /password/i,
        /123456/,
        /qwerty/i,
        /admin/i
      ],
      maxRepeatingChars: 3,
      preventCommonPasswords: true,
      passwordHistory: 5 // 记住最近5个密码
    };

    this.commonPasswords = new Set([
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', '1234567890', 'abc123'
    ]);
  }

  /**
   * 验证密码是否符合策略
   * @param {string} password - 待验证的密码
   * @param {Array} passwordHistory - 用户历史密码哈希
   * @returns {Object} 验证结果
   */
  validatePassword(password, _passwordHistory = []) {
    const result = {
      isValid: true,
      errors: [],
      score: 0,
      strength: 'weak'
    };

    // 长度检查
    if (password.length < this.policies.minLength) {
      result.errors.push(`密码长度至少${this.policies.minLength}位`);
      result.isValid = false;
    }
    if (password.length > this.policies.maxLength) {
      result.errors.push(`密码长度不能超过${this.policies.maxLength}位`);
      result.isValid = false;
    }

    // 复杂度检查
    if (this.policies.requireUppercase && !/[A-Z]/.test(password)) {
      result.errors.push('密码必须包含大写字母');
      result.isValid = false;
    }
    if (this.policies.requireLowercase && !/[a-z]/.test(password)) {
      result.errors.push('密码必须包含小写字母');
      result.isValid = false;
    }
    if (this.policies.requireNumbers && !/\d/.test(password)) {
      result.errors.push('密码必须包含数字');
      result.isValid = false;
    }
    if (this.policies.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      result.errors.push('密码必须包含特殊字符');
      result.isValid = false;
    }

    // 禁用模式检查
    for (const pattern of this.policies.forbiddenPatterns) {
      if (pattern.test(password)) {
        result.errors.push('密码包含禁用的模式');
        result.isValid = false;
      }
    }

    // 常用密码检查
    if (this.policies.preventCommonPasswords && this.commonPasswords.has(password.toLowerCase())) {
      result.errors.push('不能使用常见密码');
      result.isValid = false;
    }

    // 重复字符检查
    if (this.hasExcessiveRepeatingChars(password)) {
      result.errors.push(`不能有超过${this.policies.maxRepeatingChars}个连续相同字符`);
      result.isValid = false;
    }

    // 计算密码强度
    result.score = this.calculatePasswordScore(password);
    result.strength = this.getPasswordStrength(result.score);

    return result;
  }

  /**
   * 检查是否有过多重复字符
   * @param {string} password - 密码
   * @returns {boolean} 是否有过多重复字符
   */
  hasExcessiveRepeatingChars(password) {
    let count = 1;
    for (let i = 1; i < password.length; i++) {
      if (password[i] === password[i - 1]) {
        count++;
        if (count > this.policies.maxRepeatingChars) {
          return true;
        }
      } else {
        count = 1;
      }
    }
    return false;
  }

  /**
   * 计算密码强度分数
   * @param {string} password - 密码
   * @returns {number} 强度分数 (0-100)
   */
  calculatePasswordScore(password) {
    let score = 0;

    // 长度加分
    const MAX_LENGTH_SCORE = 25;
    score += Math.min(password.length * 4, MAX_LENGTH_SCORE);

    // 字符类型加分
    if (/[a-z]/.test(password)) {score += 5;}
    if (/[A-Z]/.test(password)) {score += 5;}
    if (/\d/.test(password)) {score += 5;}
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {score += 10;}

    // 多样性加分
    const uniqueChars = new Set(password).size;
    score += Math.min(uniqueChars * 2, 20);

    // 模式检查减分
    if (/123|abc|qwe/i.test(password)) {score -= 10;}
    if (/password|admin/i.test(password)) {score -= 20;}

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 根据分数获取密码强度等级
   * @param {number} score - 密码分数
   * @returns {string} 强度等级
   */
  getPasswordStrength(score) {
    const VERY_STRONG_THRESHOLD = 80;
    const STRONG_THRESHOLD = 60;
    const MEDIUM_THRESHOLD = 40;
    const WEAK_THRESHOLD = 20;
    if (score >= VERY_STRONG_THRESHOLD) {return 'very_strong';}
    if (score >= STRONG_THRESHOLD) {return 'strong';}
    if (score >= MEDIUM_THRESHOLD) {return 'medium';}
    if (score >= WEAK_THRESHOLD) {return 'weak';}
    return 'very_weak';
  }

  /**
   * 生成密码建议
   * @param {string} password - 当前密码
   * @returns {Array} 改进建议
   */
  generatePasswordSuggestions(password) {
    const suggestions = [];

    if (password.length < this.policies.minLength) {
      suggestions.push('增加密码长度');
    }
    if (!/[A-Z]/.test(password)) {
      suggestions.push('添加大写字母');
    }
    if (!/[a-z]/.test(password)) {
      suggestions.push('添加小写字母');
    }
    if (!/\d/.test(password)) {
      suggestions.push('添加数字');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      suggestions.push('添加特殊字符');
    }

    return suggestions;
  }
}

/**
 * 账户锁定管理器
 * 处理登录失败次数跟踪和账户锁定逻辑
 */
class AccountLockoutManager {
  constructor() {
    this.maxAttempts = 5; // 最大尝试次数
    this.lockoutDuration = 30 * 60 * 1000; // 锁定时长：30分钟
    this.attemptWindow = 15 * 60 * 1000; // 尝试窗口：15分钟
    this.attempts = new Map(); // 存储尝试记录

    // 定期清理过期记录
    setInterval(() => this.cleanupExpiredAttempts(), 5 * 60 * 1000);
  }

  /**
   * 记录登录失败
   * @param {string} identifier - 用户标识（用户名或IP）
   * @returns {Object} 锁定状态信息
   */
  recordFailedAttempt(identifier) {
    const now = Date.now();
    const key = this.normalizeIdentifier(identifier);

    if (!this.attempts.has(key)) {
      this.attempts.set(key, {
        count: 0,
        firstAttempt: now,
        lastAttempt: now,
        lockedUntil: null
      });
    }

    const record = this.attempts.get(key);

    // 如果当前在锁定期内，返回锁定信息
    if (record.lockedUntil && now < record.lockedUntil) {
      return {
        isLocked: true,
        remainingTime: record.lockedUntil - now,
        attemptsRemaining: 0
      };
    }

    // 如果超出尝试窗口，重置计数
    if (now - record.firstAttempt > this.attemptWindow) {
      record.count = 0;
      record.firstAttempt = now;
    }

    record.count++;
    record.lastAttempt = now;

    // 检查是否需要锁定
    if (record.count >= this.maxAttempts) {
      record.lockedUntil = now + this.lockoutDuration;
      return {
        isLocked: true,
        remainingTime: this.lockoutDuration,
        attemptsRemaining: 0
      };
    }

    return {
      isLocked: false,
      remainingTime: 0,
      attemptsRemaining: this.maxAttempts - record.count
    };
  }

  /**
   * 检查账户是否被锁定
   * @param {string} identifier - 用户标识
   * @returns {Object} 锁定状态
   */
  isLocked(identifier) {
    const key = this.normalizeIdentifier(identifier);
    const record = this.attempts.get(key);

    if (!record) {
      return { isLocked: false, remainingTime: 0 };
    }

    const now = Date.now();
    if (record.lockedUntil && now < record.lockedUntil) {
      return {
        isLocked: true,
        remainingTime: record.lockedUntil - now
      };
    }

    return { isLocked: false, remainingTime: 0 };
  }

  /**
   * 重置用户的失败尝试记录
   * @param {string} identifier - 用户标识
   */
  resetAttempts(identifier) {
    const key = this.normalizeIdentifier(identifier);
    this.attempts.delete(key);
  }

  /**
   * 标准化标识符
   * @param {string} identifier - 原始标识符
   * @returns {string} 标准化后的标识符
   */
  normalizeIdentifier(identifier) {
    return identifier.toLowerCase().trim();
  }

  /**
   * 清理过期的尝试记录
   */
  cleanupExpiredAttempts() {
    const now = Date.now();
    for (const [key, record] of this.attempts.entries()) {
      // 如果记录已过期（超出锁定时间且超出尝试窗口）
      if ((!record.lockedUntil || now > record.lockedUntil) &&
          (now - record.lastAttempt > this.attemptWindow)) {
        this.attempts.delete(key);
      }
    }
  }

  /**
   * 获取当前尝试统计
   * @returns {Object} 统计信息
   */
  getStats() {
    const now = Date.now();
    let totalAttempts = 0;
    let lockedAccounts = 0;

    for (const record of this.attempts.values()) {
      totalAttempts += record.count;
      if (record.lockedUntil && now < record.lockedUntil) {
        lockedAccounts++;
      }
    }

    return {
      totalAttempts,
      lockedAccounts,
      activeRecords: this.attempts.size
    };
  }
}

/**
 * 密码安全管理器
 * 处理密码加密、验证和安全策略执行
 */
class PasswordSecurityManager {
  constructor() {
    this.policyManager = new PasswordPolicyManager();
    this.lockoutManager = new AccountLockoutManager();
    this.saltLength = 16;
    this.iterations = 100000; // PBKDF2 迭代次数
  }

  /**
     * 生成随机盐值
     * @returns {string} Base64编码的盐值
     */
  generateSalt() {
    try {
      const array = new Uint8Array(this.saltLength);
      crypto.getRandomValues(array);
      return btoa(String.fromCharCode.apply(null, array));
    } catch (error) {
      console.error('生成盐值失败:', error);
      // 降级方案：使用时间戳和随机数
      return btoa(Date.now().toString() + Math.random().toString());
    }
  }

  /**
     * 使用PBKDF2加密密码
     * @param {string} password - 原始密码
     * @param {string} salt - 盐值
     * @returns {Promise<string>} 加密后的密码哈希
     */
  async hashPassword(password, salt) {
    try {
      const encoder = new TextEncoder();

      // 使用Web Crypto API进行PBKDF2加密
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: encoder.encode(salt),
          iterations: this.iterations,
          hash: 'SHA-256'
        },
        key,
        256
      );

      return btoa(String.fromCharCode.apply(null, new Uint8Array(derivedBits)));
    } catch (error) {
      console.error('密码加密失败:', error);
      // 降级方案：使用SHA-256
      return await this.fallbackHash(password, salt);
    }
  }

  /**
     * 降级加密方案（SHA-256）
     * @param {string} password - 原始密码
     * @param {string} salt - 盐值
     * @returns {Promise<string>} 加密后的密码哈希
     */
  async fallbackHash(password, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, new Uint8Array(hashBuffer)));
  }

  /**
     * 验证密码
     * @param {string} password - 输入的密码
     * @param {string} storedHash - 存储的密码哈希
     * @param {string} salt - 盐值
     * @returns {Promise<boolean>} 验证结果
     */
  async verifyPassword(password, storedHash, salt) {
    try {
      const computedHash = await this.hashPassword(password, salt);
      return computedHash === storedHash;
    } catch (error) {
      console.error('密码验证失败:', error);
      return false;
    }
  }

  /**
     * 创建完整的密码安全数据
     * @param {string} password - 原始密码
     * @returns {Promise<Object>} 包含哈希、盐值和元数据的对象
     */
  async createPasswordData(password) {
    try {
      // 验证密码策略
      const policyResult = this.policyManager.validatePassword(password);
      if (!policyResult.isValid) {
        throw new Error(`密码不符合安全策略: ${policyResult.errors.join(', ')}`);
      }

      const salt = this.generateSalt();
      const hash = await this.hashPassword(password, salt);

      return {
        hash,
        salt,
        algorithm: 'PBKDF2-SHA256',
        iterations: this.iterations,
        createdAt: new Date().toISOString(),
        strength: policyResult.strength
      };
    } catch (error) {
      console.error('创建密码数据失败:', error);
      throw error;
    }
  }

  /**
     * 检查密码是否需要更新
     * @param {Object} passwordData - 密码数据对象
     * @returns {boolean} 是否需要更新
     */
  needsUpdate(passwordData) {
    if (!passwordData || !passwordData.createdAt) {
      return true;
    }

    const createdDate = new Date(passwordData.createdAt);
    const now = new Date();
    const daysSinceCreated = (now - createdDate) / (1000 * 60 * 60 * 24);

    // 密码超过90天需要更新
    return daysSinceCreated > 90;
  }
}


// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PasswordSecurityManager,
    PasswordPolicyManager,
    AccountLockoutManager
  };
} else {
  window.PasswordSecurityManager = PasswordSecurityManager;
  window.PasswordPolicyManager = PasswordPolicyManager;
  window.AccountLockoutManager = AccountLockoutManager;
}
