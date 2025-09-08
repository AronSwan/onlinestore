/**
 * 输入数据验证模块
 * 提供用户注册表单的客户端验证功能
 * 支持用户名、邮箱、密码的实时验证和批量验证
 *
 * @author AI Assistant
 * @version 1.0.0
 * @since 2025-01-12
 */

class InputValidator {
  constructor() {
    this.validationRules = {
      username: {
        minLength: 3,
        maxLength: 20,
        pattern: /^[a-zA-Z0-9_-]+$/,
        reserved: ['admin', 'root', 'user', 'test', 'guest', 'system']
      },
      email: {
        pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        maxLength: 254
      },
      password: {
        minLength: 8,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        commonPasswords: [
          'password', '123456', '123456789', 'qwerty', 'abc123',
          'password123', 'admin', 'letmein', 'welcome', 'monkey'
        ]
      }
    };

    this.errorMessages = {
      username: {
        required: '用户名不能为空',
        minLength: '用户名至少需要3个字符',
        maxLength: '用户名不能超过20个字符',
        pattern: '用户名只能包含字母、数字、下划线和连字符',
        reserved: '该用户名为系统保留，请选择其他用户名'
      },
      email: {
        required: '邮箱地址不能为空',
        pattern: '请输入有效的邮箱地址',
        maxLength: '邮箱地址过长'
      },
      password: {
        required: '密码不能为空',
        minLength: '密码至少需要8个字符',
        maxLength: '密码不能超过128个字符',
        requireUppercase: '密码必须包含至少一个大写字母',
        requireLowercase: '密码必须包含至少一个小写字母',
        requireNumbers: '密码必须包含至少一个数字',
        requireSpecialChars: '密码必须包含至少一个特殊字符',
        commonPassword: '密码过于简单，请选择更安全的密码'
      },
      confirmPassword: {
        required: '请确认密码',
        mismatch: '两次输入的密码不一致'
      }
    };
  }

  /**
   * 验证用户名
   * @param {string} username - 用户名
   * @returns {Object} 验证结果 {isValid: boolean, errors: string[]}
   */
  validateUsername(username) {
    const errors = [];
    const rules = this.validationRules.username;
    const messages = this.errorMessages.username;

    // 必填检查
    if (!username || username.trim() === '') {
      errors.push(messages.required);
      return { isValid: false, errors };
    }

    username = username.trim();

    // 长度检查
    if (username.length < rules.minLength) {
      errors.push(messages.minLength);
    }
    if (username.length > rules.maxLength) {
      errors.push(messages.maxLength);
    }

    // 格式检查
    if (!rules.pattern.test(username)) {
      errors.push(messages.pattern);
    }

    // 保留字检查
    if (rules.reserved.includes(username.toLowerCase())) {
      errors.push(messages.reserved);
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: username
    };
  }

  /**
   * 验证邮箱地址
   * @param {string} email - 邮箱地址
   * @returns {Object} 验证结果 {isValid: boolean, errors: string[]}
   */
  validateEmail(email) {
    const errors = [];
    const rules = this.validationRules.email;
    const messages = this.errorMessages.email;

    // 必填检查
    if (!email || email.trim() === '') {
      errors.push(messages.required);
      return { isValid: false, errors };
    }

    email = email.trim().toLowerCase();

    // 长度检查
    if (email.length > rules.maxLength) {
      errors.push(messages.maxLength);
    }

    // 格式检查
    if (!rules.pattern.test(email)) {
      errors.push(messages.pattern);
    }

    // 额外的邮箱格式检查
    if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
      errors.push(messages.pattern);
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: email
    };
  }

  /**
   * 验证密码强度
   * @param {string} password - 密码
   * @returns {Object} 验证结果 {isValid: boolean, errors: string[], strength: string}
   */
  validatePassword(password) {
    const errors = [];
    const rules = this.validationRules.password;
    const messages = this.errorMessages.password;

    // 必填检查
    if (!password) {
      errors.push(messages.required);
      return { isValid: false, errors, strength: 'none' };
    }

    // 长度检查
    if (password.length < rules.minLength) {
      errors.push(messages.minLength);
    }
    if (password.length > rules.maxLength) {
      errors.push(messages.maxLength);
    }

    // 字符类型检查
    if (rules.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push(messages.requireUppercase);
    }
    if (rules.requireLowercase && !/[a-z]/.test(password)) {
      errors.push(messages.requireLowercase);
    }
    if (rules.requireNumbers && !/\d/.test(password)) {
      errors.push(messages.requireNumbers);
    }
    if (rules.requireSpecialChars && !new RegExp(`[${this.escapeRegex(rules.specialChars)}]`).test(password)) {
      errors.push(messages.requireSpecialChars);
    }

    // 常见密码检查
    if (rules.commonPasswords.includes(password.toLowerCase())) {
      errors.push(messages.commonPassword);
    }

    // 计算密码强度
    const strength = this.calculatePasswordStrength(password);

    return {
      isValid: errors.length === 0,
      errors,
      strength
    };
  }

  /**
   * 验证确认密码
   * @param {string} password - 原密码
   * @param {string} confirmPassword - 确认密码
   * @returns {Object} 验证结果 {isValid: boolean, errors: string[]}
   */
  validateConfirmPassword(password, confirmPassword) {
    const errors = [];
    const messages = this.errorMessages.confirmPassword;

    // 必填检查
    if (!confirmPassword) {
      errors.push(messages.required);
      return { isValid: false, errors };
    }

    // 一致性检查
    if (password !== confirmPassword) {
      errors.push(messages.mismatch);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 批量验证所有字段
   * @param {Object} formData - 表单数据
   * @param {string} formData.username - 用户名
   * @param {string} formData.email - 邮箱
   * @param {string} formData.password - 密码
   * @param {string} formData.confirmPassword - 确认密码
   * @returns {Object} 验证结果
   */
  validateAll(formData) {
    const results = {
      username: this.validateUsername(formData.username),
      email: this.validateEmail(formData.email),
      password: this.validatePassword(formData.password),
      confirmPassword: this.validateConfirmPassword(formData.password, formData.confirmPassword)
    };

    const isValid = Object.values(results).every(result => result.isValid);
    const allErrors = Object.values(results).flatMap(result => result.errors);

    return {
      isValid,
      errors: allErrors,
      fieldResults: results,
      sanitizedData: {
        username: results.username.sanitized,
        email: results.email.sanitized,
        password: formData.password // 密码不进行清理，保持原样
      }
    };
  }

  /**
   * 计算密码强度
   * @private
   * @param {string} password - 密码
   * @returns {string} 强度等级 ('weak'|'medium'|'strong'|'very-strong')
   */
  calculatePasswordStrength(password) {
    let score = 0;

    // 长度评分
    if (password.length >= 8) {score += 1;}
    if (password.length >= 12) {score += 1;}
    if (password.length >= 16) {score += 1;}

    // 字符类型评分
    if (/[a-z]/.test(password)) {score += 1;}
    if (/[A-Z]/.test(password)) {score += 1;}
    if (/\d/.test(password)) {score += 1;}
    if (/[^a-zA-Z0-9]/.test(password)) {score += 1;}

    // 复杂度评分
    if (/[a-z].*[A-Z]|[A-Z].*[a-z]/.test(password)) {score += 1;}
    if (/\d.*[^a-zA-Z0-9]|[^a-zA-Z0-9].*\d/.test(password)) {score += 1;}

    // 返回强度等级
    if (score < 3) {return 'weak';}
    if (score < 5) {return 'medium';}
    if (score < 7) {return 'strong';}
    return 'very-strong';
  }

  /**
   * 转义正则表达式特殊字符
   * @private
   * @param {string} string - 需要转义的字符串
   * @returns {string} 转义后的字符串
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
  }

  /**
   * 获取密码强度描述
   * @param {string} strength - 强度等级
   * @returns {Object} 强度描述 {text: string, color: string, percentage: number}
   */
  getPasswordStrengthDescription(strength) {
    const descriptions = {
      'none': { text: '无', color: '#ccc', percentage: 0 },
      'weak': { text: '弱', color: '#ff4757', percentage: 25 },
      'medium': { text: '中等', color: '#ffa502', percentage: 50 },
      'strong': { text: '强', color: '#2ed573', percentage: 75 },
      'very-strong': { text: '很强', color: '#1e90ff', percentage: 100 }
    };

    return descriptions[strength] || descriptions.none;
  }

  /**
   * 实时验证字段
   * @param {string} fieldName - 字段名称
   * @param {string} value - 字段值
   * @param {string} [compareValue] - 比较值（用于确认密码）
   * @returns {Object} 验证结果
   */
  validateField(fieldName, value, compareValue = null) {
    switch (fieldName) {
    case 'username':
      return this.validateUsername(value);
    case 'email':
      return this.validateEmail(value);
    case 'password':
      return this.validatePassword(value);
    case 'confirmPassword':
      return this.validateConfirmPassword(compareValue, value);
    default:
      return { isValid: true, errors: [] };
    }
  }
}

// 导出验证器类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InputValidator;
} else if (typeof window !== 'undefined') {
  window.InputValidator = InputValidator;
}

// 创建全局实例
if (typeof window !== 'undefined') {
  window.inputValidator = new InputValidator();
}
