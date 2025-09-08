/**
 * 核心输入验证模块
 * 提供实时输入验证、错误处理和用户反馈功能
 * 创建时间: 2025-01-12
 * 关联需求: project.md#REQ-002
 */

/**
 * 验证结果类
 * 封装验证结果和错误信息
 */
class ValidationResult {
  constructor(isValid = true, errors = [], warnings = []) {
    this.isValid = isValid;
    this.errors = Array.isArray(errors) ? errors : [errors];
    this.warnings = Array.isArray(warnings) ? warnings : [warnings];
    this.timestamp = Date.now();
  }

  /**
     * 添加错误信息
     * @param {string|object} error - 错误信息
     */
  addError(error) {
    this.errors.push(error);
    this.isValid = false;
  }

  /**
     * 添加警告信息
     * @param {string|object} warning - 警告信息
     */
  addWarning(warning) {
    this.warnings.push(warning);
  }

  /**
     * 获取第一个错误信息
     * @returns {string|null}
     */
  getFirstError() {
    return this.errors.length > 0 ? this.errors[0] : null;
  }

  /**
     * 获取所有错误信息
     * @returns {Array}
     */
  getAllErrors() {
    return [...this.errors];
  }

  /**
     * 获取所有警告信息
     * @returns {Array}
     */
  getAllWarnings() {
    return [...this.warnings];
  }

  /**
     * 合并其他验证结果
     * @param {ValidationResult} other - 其他验证结果
     */
  merge(other) {
    if (!(other instanceof ValidationResult)) {
      throw new Error('参数必须是ValidationResult实例');
    }

    this.errors.push(...other.errors);
    this.warnings.push(...other.warnings);
    this.isValid = this.isValid && other.isValid;
  }

  /**
     * 转换为JSON格式
     * @returns {object}
     */
  toJSON() {
    return {
      isValid: this.isValid,
      errors: this.errors,
      warnings: this.warnings,
      timestamp: this.timestamp
    };
  }
}

/**
 * 核心输入验证器类
 * 提供各种输入验证规则和方法
 */
class InputValidator {
  constructor(config = {}) {
    this.config = {
      // 用户名验证配置
      username: {
        minLength: config.username?.minLength || 3,
        maxLength: config.username?.maxLength || 20,
        allowedChars: config.username?.allowedChars || /^[a-zA-Z0-9_-]+$/,
        reservedNames: config.username?.reservedNames || [
          'admin', 'root', 'user', 'test', 'guest', 'anonymous',
          'system', 'null', 'undefined', 'api', 'www'
        ],
        caseSensitive: config.username?.caseSensitive || false
      },

      // 邮箱验证配置
      email: {
        maxLength: config.email?.maxLength || 254,
        allowedDomains: config.email?.allowedDomains || null, // null表示允许所有域名
        blockedDomains: config.email?.blockedDomains || [
          '10minutemail.com', 'tempmail.org', 'guerrillamail.com'
        ],
        requireMX: config.email?.requireMX || false
      },

      // 密码验证配置
      password: {
        minLength: config.password?.minLength || 8,
        maxLength: config.password?.maxLength || 128,
        requireUppercase: config.password?.requireUppercase || true,
        requireLowercase: config.password?.requireLowercase || true,
        requireNumbers: config.password?.requireNumbers || true,
        requireSpecialChars: config.password?.requireSpecialChars || true,
        specialChars: config.password?.specialChars || '!@#$%^&*()_+-=[]{}|;:,.<>?',
        maxRepeatingChars: config.password?.maxRepeatingChars || 3,
        commonPasswords: config.password?.commonPasswords || [
          'password', '123456', '123456789', 'qwerty', 'abc123',
          'password123', 'admin', 'letmein', 'welcome', 'monkey'
        ]
      },

      // 姓名验证配置
      name: {
        minLength: config.name?.minLength || 1,
        maxLength: config.name?.maxLength || 50,
        allowedChars: config.name?.allowedChars || /^[a-zA-Z\u4e00-\u9fa5\s'-]+$/,
        requireBothNames: config.name?.requireBothNames || false
      },

      // 通用配置
      general: {
        trimWhitespace: config.general?.trimWhitespace !== false,
        caseSensitive: config.general?.caseSensitive || false,
        enableLogging: config.general?.enableLogging || true
      }
    };

    // 验证统计
    this.stats = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      validationsByType: {}
    };

    // 缓存验证结果
    this.cache = new Map();
    this.cacheMaxSize = config.cacheMaxSize || 1000;
    this.cacheTTL = config.cacheTTL || 300000; // 5分钟

    this.log('InputValidator初始化完成', { config: this.config });
  }

  /**
     * 验证用户名
     * @param {string} username - 用户名
     * @returns {ValidationResult}
     */
  validateUsername(username) {
    try {
      this.updateStats('username');

      const result = new ValidationResult();
      const config = this.config.username;

      // 预处理
      if (this.config.general.trimWhitespace) {
        username = username?.trim();
      }

      // 基础检查
      if (!username) {
        result.addError('用户名不能为空');
        return result;
      }

      if (typeof username !== 'string') {
        result.addError('用户名必须是字符串');
        return result;
      }

      // 长度检查
      if (username.length < config.minLength) {
        result.addError(`用户名至少需要${config.minLength}个字符`);
      }

      if (username.length > config.maxLength) {
        result.addError(`用户名不能超过${config.maxLength}个字符`);
      }

      // 字符检查
      if (!config.allowedChars.test(username)) {
        result.addError('用户名只能包含字母、数字、下划线和连字符');
      }

      // 保留名称检查
      const checkName = config.caseSensitive ? username : username.toLowerCase();
      const reservedNames = config.caseSensitive ?
        config.reservedNames :
        config.reservedNames.map(name => name.toLowerCase());

      if (reservedNames.includes(checkName)) {
        result.addError('该用户名为系统保留，请选择其他用户名');
      }

      // 特殊规则检查
      if (username.startsWith('-') || username.endsWith('-')) {
        result.addError('用户名不能以连字符开头或结尾');
      }

      if (username.includes('__')) {
        result.addWarning('用户名包含连续下划线，可能影响可读性');
      }

      // 数字开头检查
      if (/^\d/.test(username)) {
        result.addWarning('建议用户名不要以数字开头');
      }

      this.updateValidationStats(result.isValid);
      this.log('用户名验证完成', { username, result: result.toJSON() });

      return result;

    } catch (error) {
      this.logError('用户名验证失败', error);
      const result = new ValidationResult(false, '验证过程中发生错误');
      this.updateValidationStats(false);
      return result;
    }
  }

  /**
     * 验证邮箱地址
     * @param {string} email - 邮箱地址
     * @returns {ValidationResult}
     */
  validateEmail(email) {
    try {
      this.updateStats('email');

      const result = new ValidationResult();
      const config = this.config.email;

      // 预处理
      if (this.config.general.trimWhitespace) {
        email = email?.trim();
      }

      if (!this.config.general.caseSensitive) {
        email = email?.toLowerCase();
      }

      // 基础检查
      if (!email) {
        result.addError('邮箱地址不能为空');
        return result;
      }

      if (typeof email !== 'string') {
        result.addError('邮箱地址必须是字符串');
        return result;
      }

      // 长度检查
      if (email.length > config.maxLength) {
        result.addError(`邮箱地址不能超过${config.maxLength}个字符`);
      }

      // 基本格式检查
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

      if (!emailRegex.test(email)) {
        result.addError('邮箱地址格式不正确');
        return result;
      }

      // 分离本地部分和域名部分
      const [localPart, domain] = email.split('@');

      // 本地部分检查
      const MAX_LOCAL_PART_LENGTH = 64;
      if (localPart.length > MAX_LOCAL_PART_LENGTH) {
        result.addError('邮箱用户名部分不能超过64个字符');
      }

      if (localPart.startsWith('.') || localPart.endsWith('.')) {
        result.addError('邮箱用户名不能以点号开头或结尾');
      }

      if (localPart.includes('..')) {
        result.addError('邮箱用户名不能包含连续的点号');
      }

      // 域名检查
      const MAX_DOMAIN_LENGTH = 253;
      if (domain.length > MAX_DOMAIN_LENGTH) {
        result.addError('邮箱域名部分不能超过253个字符');
      }

      // 允许域名检查
      if (config.allowedDomains && !config.allowedDomains.includes(domain)) {
        result.addError('不支持该邮箱域名');
      }

      // 禁止域名检查
      if (config.blockedDomains.includes(domain)) {
        result.addError('不允许使用临时邮箱地址');
      }

      // 常见拼写错误检查
      const commonMisspellings = {
        'gmail.co': 'gmail.com',
        'gmail.cm': 'gmail.com',
        'gmial.com': 'gmail.com',
        'yahoo.co': 'yahoo.com',
        'hotmail.co': 'hotmail.com'
      };

      if (commonMisspellings[domain]) {
        result.addWarning(`您是否想输入 ${localPart}@${commonMisspellings[domain]}？`);
      }

      this.updateValidationStats(result.isValid);
      this.log('邮箱验证完成', { email, result: result.toJSON() });

      return result;

    } catch (error) {
      this.logError('邮箱验证失败', error);
      const result = new ValidationResult(false, '验证过程中发生错误');
      this.updateValidationStats(false);
      return result;
    }
  }

  /**
     * 验证密码强度
     * @param {string} password - 密码
     * @param {string} username - 用户名（用于检查密码是否包含用户名）
     * @returns {ValidationResult}
     */
  validatePassword(password, username = '') {
    try {
      this.updateStats('password');

      const result = new ValidationResult();
      const config = this.config.password;

      // 基础检查
      if (!password) {
        result.addError('密码不能为空');
        return result;
      }

      if (typeof password !== 'string') {
        result.addError('密码必须是字符串');
        return result;
      }

      // 长度检查
      if (password.length < config.minLength) {
        result.addError(`密码至少需要${config.minLength}个字符`);
      }

      if (password.length > config.maxLength) {
        result.addError(`密码不能超过${config.maxLength}个字符`);
      }

      // 字符类型检查
      if (config.requireUppercase && !/[A-Z]/.test(password)) {
        result.addError('密码必须包含至少一个大写字母');
      }

      if (config.requireLowercase && !/[a-z]/.test(password)) {
        result.addError('密码必须包含至少一个小写字母');
      }

      if (config.requireNumbers && !/\d/.test(password)) {
        result.addError('密码必须包含至少一个数字');
      }

      if (config.requireSpecialChars) {
        const specialCharsRegex = new RegExp(`[${config.specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`);
        if (!specialCharsRegex.test(password)) {
          result.addError(`密码必须包含至少一个特殊字符 (${config.specialChars})`);
        }
      }

      // 重复字符检查
      if (config.maxRepeatingChars > 0) {
        const repeatingRegex = new RegExp(`(.)\\1{${config.maxRepeatingChars},}`);
        if (repeatingRegex.test(password)) {
          result.addError(`密码不能包含超过${config.maxRepeatingChars}个连续相同字符`);
        }
      }

      // 常见密码检查
      const lowerPassword = password.toLowerCase();
      if (config.commonPasswords.some(common => lowerPassword.includes(common.toLowerCase()))) {
        result.addError('密码不能包含常见的弱密码');
      }

      // 用户名包含检查
      if (username && lowerPassword.includes(username.toLowerCase())) {
        result.addError('密码不能包含用户名');
      }

      // 顺序字符检查
      if (this.hasSequentialChars(password)) {
        result.addWarning('密码包含连续字符，建议使用更复杂的组合');
      }

      // 键盘模式检查
      if (this.hasKeyboardPattern(password)) {
        result.addWarning('密码包含键盘模式，建议使用更随机的组合');
      }

      // 计算密码强度分数
      const strengthScore = this.calculatePasswordStrength(password);
      if (strengthScore < 60) {
        result.addWarning('密码强度较弱，建议增加复杂度');
      } else if (strengthScore < 80) {
        result.addWarning('密码强度中等，可以进一步增强');
      }

      this.updateValidationStats(result.isValid);
      this.log('密码验证完成', {
        passwordLength: password.length,
        strengthScore,
        result: result.toJSON()
      });

      return result;

    } catch (error) {
      this.logError('密码验证失败', error);
      const result = new ValidationResult(false, '验证过程中发生错误');
      this.updateValidationStats(false);
      return result;
    }
  }

  /**
     * 验证密码确认
     * @param {string} password - 原密码
     * @param {string} confirmPassword - 确认密码
     * @returns {ValidationResult}
     */
  validatePasswordConfirmation(password, confirmPassword) {
    try {
      this.updateStats('passwordConfirmation');

      const result = new ValidationResult();

      if (!confirmPassword) {
        result.addError('请确认密码');
        return result;
      }

      if (password !== confirmPassword) {
        result.addError('两次输入的密码不一致');
      }

      this.updateValidationStats(result.isValid);
      this.log('密码确认验证完成', { result: result.toJSON() });

      return result;

    } catch (error) {
      this.logError('密码确认验证失败', error);
      const result = new ValidationResult(false, '验证过程中发生错误');
      this.updateValidationStats(false);
      return result;
    }
  }

  /**
     * 验证姓名
     * @param {string} firstName - 名
     * @param {string} lastName - 姓
     * @returns {ValidationResult}
     */
  validateName(firstName, lastName = '') {
    try {
      this.updateStats('name');

      const result = new ValidationResult();
      const config = this.config.name;

      // 预处理
      if (this.config.general.trimWhitespace) {
        firstName = firstName?.trim();
        lastName = lastName?.trim();
      }

      // 基础检查
      if (!firstName) {
        result.addError('姓名不能为空');
        return result;
      }

      // 长度检查
      if (firstName.length < config.minLength) {
        result.addError(`姓名至少需要${config.minLength}个字符`);
      }

      if (firstName.length > config.maxLength) {
        result.addError(`姓名不能超过${config.maxLength}个字符`);
      }

      if (lastName && lastName.length > config.maxLength) {
        result.addError(`姓氏不能超过${config.maxLength}个字符`);
      }

      // 字符检查
      if (!config.allowedChars.test(firstName)) {
        result.addError('姓名只能包含字母、中文字符、空格、撇号和连字符');
      }

      if (lastName && !config.allowedChars.test(lastName)) {
        result.addError('姓氏只能包含字母、中文字符、空格、撇号和连字符');
      }

      // 要求姓和名都存在
      if (config.requireBothNames && !lastName) {
        result.addError('请输入完整的姓名');
      }

      // 特殊字符检查
      if (firstName.includes('  ')) {
        result.addWarning('姓名包含多个连续空格');
      }

      this.updateValidationStats(result.isValid);
      this.log('姓名验证完成', { firstName, lastName, result: result.toJSON() });

      return result;

    } catch (error) {
      this.logError('姓名验证失败', error);
      const result = new ValidationResult(false, '验证过程中发生错误');
      this.updateValidationStats(false);
      return result;
    }
  }

  /**
     * 验证登录表单数据
     * @param {object} formData - 表单数据
     * @returns {ValidationResult}
     */
  validateLoginForm(formData) {
    try {
      this.updateStats('loginForm');

      const result = new ValidationResult();

      // 验证用户名或邮箱
      if (typeof formData.username !== 'undefined' && formData.username !== null) {
        // 检查是否为邮箱格式
        if (formData.username.includes('@')) {
          const emailResult = this.validateEmail(formData.username);
          result.merge(emailResult);
        } else {
          const usernameResult = this.validateUsername(formData.username);
          result.merge(usernameResult);
        }
      } else {
        result.addError('请输入用户名或邮箱');
      }

      // 验证密码
      if (typeof formData.password !== 'undefined' && formData.password !== null) {
        if (!formData.password || formData.password.trim() === '') {
          result.addError('请输入密码');
        } else if (formData.password.length < this.config.password.minLength) {
          result.addError(`密码至少需要${this.config.password.minLength}个字符`);
        }
      } else {
        result.addError('请输入密码');
      }

      this.updateValidationStats(result.isValid);
      this.log('登录表单验证完成', { result: result.toJSON() });

      return result;

    } catch (error) {
      this.logError('登录表单验证失败', error);
      const result = new ValidationResult(false, '验证过程中发生错误');
      this.updateValidationStats(false);
      return result;
    }
  }

  /**
     * 验证注册表单数据
     * @param {object} formData - 表单数据
     * @returns {ValidationResult}
     */
  validateRegistrationForm(formData) {
    try {
      this.updateStats('registrationForm');

      const result = new ValidationResult();

      // 验证用户名
      if (typeof formData.username !== 'undefined' && formData.username !== null) {
        const usernameResult = this.validateUsername(formData.username);
        result.merge(usernameResult);
      }

      // 验证邮箱
      if (typeof formData.email !== 'undefined' && formData.email !== null) {
        const emailResult = this.validateEmail(formData.email);
        result.merge(emailResult);
      }

      // 验证密码
      if (typeof formData.password !== 'undefined' && formData.password !== null) {
        const passwordResult = this.validatePassword(formData.password, formData.username);
        result.merge(passwordResult);
      }

      // 验证密码确认
      if (typeof formData.confirmPassword !== 'undefined') {
        const confirmResult = this.validatePasswordConfirmation(formData.password, formData.confirmPassword);
        result.merge(confirmResult);
      }

      // 验证姓名
      if (typeof formData.firstName !== 'undefined') {
        const nameResult = this.validateName(formData.firstName, formData.lastName);
        result.merge(nameResult);
      }

      // 验证服务条款同意
      if (typeof formData.agreeToTerms !== 'undefined' && !formData.agreeToTerms) {
        result.addError('请同意服务条款和隐私政策');
      }

      this.updateValidationStats(result.isValid);
      this.log('注册表单验证完成', { result: result.toJSON() });

      return result;

    } catch (error) {
      this.logError('注册表单验证失败', error);
      const result = new ValidationResult(false, '验证过程中发生错误');
      this.updateValidationStats(false);
      return result;
    }
  }

  /**
     * 检查是否包含连续字符
     * @param {string} password - 密码
     * @returns {boolean}
     */
  hasSequentialChars(password) {
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      '0123456789',
      'qwertyuiopasdfghjklzxcvbnm'
    ];

    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        const subseq = sequence.substring(i, i + 3);
        if (password.toLowerCase().includes(subseq) ||
                    password.toLowerCase().includes(subseq.split('').reverse().join(''))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
     * 检查是否包含键盘模式
     * @param {string} password - 密码
     * @returns {boolean}
     */
  hasKeyboardPattern(password) {
    const patterns = [
      'qwerty', 'asdf', 'zxcv',
      '123456', '654321',
      'qwertyuiop', 'asdfghjkl', 'zxcvbnm'
    ];

    const lowerPassword = password.toLowerCase();
    return patterns.some(pattern => lowerPassword.includes(pattern));
  }

  /**
     * 计算密码强度分数
     * @param {string} password - 密码
     * @returns {number} 强度分数 (0-100)
     */
  calculatePasswordStrength(password) {
    let score = 0;

    // 长度分数 (最多30分)
    score += Math.min(password.length * 2, 30);

    // 字符类型分数
    if (/[a-z]/.test(password)) {score += 10;}
    if (/[A-Z]/.test(password)) {score += 10;}
    if (/\d/.test(password)) {score += 10;}
    if (/[^a-zA-Z0-9]/.test(password)) {score += 15;}

    // 复杂度分数
    const uniqueChars = new Set(password).size;
    score += Math.min(uniqueChars * 2, 20);

    // 减分项
    if (this.hasSequentialChars(password)) {score -= 10;}
    if (this.hasKeyboardPattern(password)) {score -= 10;}
    if (/(..).*\1/.test(password)) {score -= 5;} // 重复模式

    return Math.max(0, Math.min(100, score));
  }

  /**
     * 更新验证统计
     * @param {string} type - 验证类型
     */
  updateStats(type) {
    this.stats.totalValidations++;
    if (!this.stats.validationsByType[type]) {
      this.stats.validationsByType[type] = 0;
    }
    this.stats.validationsByType[type]++;
  }

  /**
     * 更新验证结果统计
     * @param {boolean} isValid - 是否验证成功
     */
  updateValidationStats(isValid) {
    if (isValid) {
      this.stats.successfulValidations++;
    } else {
      this.stats.failedValidations++;
    }
  }

  /**
     * 获取验证统计信息
     * @returns {object}
     */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalValidations > 0 ?
        (this.stats.successfulValidations / this.stats.totalValidations * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
     * 重置验证统计
     */
  resetStats() {
    this.stats = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      validationsByType: {}
    };
  }

  /**
     * 记录日志
     * @param {string} message - 日志消息
     * @param {object} data - 附加数据
     */
  log(message, data = {}) {
    if (this.config.general.enableLogging) {
      console.log(`[InputValidator] ${message}`, data);
    }
  }

  /**
     * 记录错误日志
     * @param {string} message - 错误消息
     * @param {Error} error - 错误对象
     */
  logError(message, error) {
    if (this.config.general.enableLogging) {
      console.error(`[InputValidator] ${message}`, error);
    }
  }

  /**
     * 销毁验证器
     */
  destroy() {
    this.cache.clear();
    this.resetStats();
    this.log('InputValidator已销毁');
  }
}

/**
 * 实时验证管理器
 * 管理表单字段的实时验证
 */
class RealTimeValidationManager {
  constructor(validator, config = {}) {
    this.validator = validator;
    this.config = {
      debounceDelay: config.debounceDelay || 300,
      validateOnBlur: config.validateOnBlur !== false,
      validateOnInput: config.validateOnInput !== false,
      showSuccessIndicator: config.showSuccessIndicator !== false,
      animateErrors: config.animateErrors !== false
    };

    this.fieldValidators = new Map();
    this.debounceTimers = new Map();
    this.validationResults = new Map();

    this.log('RealTimeValidationManager初始化完成');
  }

  /**
     * 注册字段验证
     * @param {string} fieldName - 字段名称
     * @param {HTMLElement} element - DOM元素
     * @param {function} validatorFn - 验证函数
     * @param {object} options - 选项
     */
  registerField(fieldName, element, validatorFn, options = {}) {
    try {
      if (!element || !validatorFn) {
        throw new Error('元素和验证函数都是必需的');
      }

      const fieldConfig = {
        element,
        validatorFn,
        options: {
          required: options.required || false,
          validateOnInput: options.validateOnInput ?? this.config.validateOnInput,
          validateOnBlur: options.validateOnBlur ?? this.config.validateOnBlur,
          debounceDelay: options.debounceDelay || this.config.debounceDelay,
          errorContainer: options.errorContainer || null,
          successContainer: options.successContainer || null
        }
      };

      this.fieldValidators.set(fieldName, fieldConfig);

      // 绑定事件监听器
      this.bindFieldEvents(fieldName, fieldConfig);

      this.log(`字段 ${fieldName} 注册成功`);

    } catch (error) {
      this.logError(`字段 ${fieldName} 注册失败`, error);
    }
  }

  /**
     * 绑定字段事件
     * @param {string} fieldName - 字段名称
     * @param {object} fieldConfig - 字段配置
     */
  bindFieldEvents(fieldName, fieldConfig) {
    const { element, options } = fieldConfig;

    if (options.validateOnInput) {
      element.addEventListener('input', (event) => {
        this.handleFieldInput(fieldName, event);
      });
    }

    if (options.validateOnBlur) {
      element.addEventListener('blur', (event) => {
        this.handleFieldBlur(fieldName, event);
      });
    }

    // 焦点事件 - 清除错误状态
    element.addEventListener('focus', () => {
      this.clearFieldError(fieldName);
    });
  }

  /**
     * 处理字段输入事件
     * @param {string} fieldName - 字段名称
     * @param {Event} event - 事件对象
     */
  handleFieldInput(fieldName, event) {
    const fieldConfig = this.fieldValidators.get(fieldName);
    if (!fieldConfig) {return;}

    // 清除之前的防抖定时器
    if (this.debounceTimers.has(fieldName)) {
      clearTimeout(this.debounceTimers.get(fieldName));
    }

    // 设置新的防抖定时器
    const timer = setTimeout(() => {
      this.validateField(fieldName, event.target.value);
      this.debounceTimers.delete(fieldName);
    }, fieldConfig.options.debounceDelay);

    this.debounceTimers.set(fieldName, timer);
  }

  /**
     * 处理字段失焦事件
     * @param {string} fieldName - 字段名称
     * @param {Event} event - 事件对象
     */
  handleFieldBlur(fieldName, event) {
    // 清除防抖定时器，立即验证
    if (this.debounceTimers.has(fieldName)) {
      clearTimeout(this.debounceTimers.get(fieldName));
      this.debounceTimers.delete(fieldName);
    }

    this.validateField(fieldName, event.target.value);
  }

  /**
     * 验证单个字段
     * @param {string} fieldName - 字段名称
     * @param {string} value - 字段值
     * @returns {ValidationResult}
     */
  validateField(fieldName, value) {
    try {
      const fieldConfig = this.fieldValidators.get(fieldName);
      if (!fieldConfig) {
        throw new Error(`字段 ${fieldName} 未注册`);
      }

      // 执行验证
      const result = fieldConfig.validatorFn(value);

      // 保存验证结果
      this.validationResults.set(fieldName, result);

      // 更新UI
      this.updateFieldUI(fieldName, result);

      this.log(`字段 ${fieldName} 验证完成`, { result: result.toJSON() });

      return result;

    } catch (error) {
      this.logError(`字段 ${fieldName} 验证失败`, error);
      const result = new ValidationResult(false, '验证过程中发生错误');
      this.validationResults.set(fieldName, result);
      this.updateFieldUI(fieldName, result);
      return result;
    }
  }

  /**
     * 更新字段UI
     * @param {string} fieldName - 字段名称
     * @param {ValidationResult} result - 验证结果
     */
  updateFieldUI(fieldName, result) {
    try {
      const fieldConfig = this.fieldValidators.get(fieldName);
      if (!fieldConfig) {return;}

      const { element, options } = fieldConfig;

      // 清除之前的状态
      element.classList.remove('valid', 'invalid', 'warning');

      if (result.isValid) {
        element.classList.add('valid');
        this.showFieldSuccess(fieldName, options.successContainer);
        this.hideFieldError(fieldName, options.errorContainer);
      } else {
        element.classList.add('invalid');
        this.showFieldError(fieldName, result.getFirstError(), options.errorContainer);
        this.hideFieldSuccess(fieldName, options.successContainer);
      }

      // 显示警告
      if (result.warnings.length > 0) {
        element.classList.add('warning');
        this.showFieldWarning(fieldName, result.warnings[0]);
      }

    } catch (error) {
      this.logError(`更新字段 ${fieldName} UI失败`, error);
    }
  }

  /**
     * 显示字段错误
     * @param {string} fieldName - 字段名称
     * @param {string} errorMessage - 错误消息
     * @param {HTMLElement} container - 错误容器
     */
  showFieldError(fieldName, errorMessage, container) {
    try {
      const errorElement = container || this.findErrorContainer(fieldName);
      if (!errorElement) {return;}

      errorElement.textContent = errorMessage;
      errorElement.classList.add('show-error');
      errorElement.classList.remove('show-success', 'show-warning');

      if (this.config.animateErrors) {
        errorElement.classList.add('animate-error');
        setTimeout(() => {
          errorElement.classList.remove('animate-error');
        }, 300);
      }

    } catch (error) {
      this.logError(`显示字段 ${fieldName} 错误失败`, error);
    }
  }

  /**
     * 隐藏字段错误
     * @param {string} fieldName - 字段名称
     * @param {HTMLElement} container - 错误容器
     */
  hideFieldError(fieldName, container) {
    try {
      const errorElement = container || this.findErrorContainer(fieldName);
      if (!errorElement) {return;}

      errorElement.classList.remove('show-error');

    } catch (error) {
      this.logError(`隐藏字段 ${fieldName} 错误失败`, error);
    }
  }

  /**
     * 显示字段成功
     * @param {string} fieldName - 字段名称
     * @param {HTMLElement} container - 成功容器
     */
  showFieldSuccess(fieldName, container) {
    try {
      if (!this.config.showSuccessIndicator) {return;}

      const successElement = container || this.findSuccessContainer(fieldName);
      if (!successElement) {return;}

      successElement.classList.add('show-success');
      successElement.classList.remove('show-error', 'show-warning');

    } catch (error) {
      this.logError(`显示字段 ${fieldName} 成功状态失败`, error);
    }
  }

  /**
     * 隐藏字段成功
     * @param {string} fieldName - 字段名称
     * @param {HTMLElement} container - 成功容器
     */
  hideFieldSuccess(fieldName, container) {
    try {
      const successElement = container || this.findSuccessContainer(fieldName);
      if (!successElement) {return;}

      successElement.classList.remove('show-success');

    } catch (error) {
      this.logError(`隐藏字段 ${fieldName} 成功状态失败`, error);
    }
  }

  /**
     * 显示字段警告
     * @param {string} fieldName - 字段名称
     * @param {string} warningMessage - 警告消息
     */
  showFieldWarning(fieldName, warningMessage) {
    try {
      const warningElement = this.findWarningContainer(fieldName);
      if (!warningElement) {return;}

      warningElement.textContent = warningMessage;
      warningElement.classList.add('show-warning');
      warningElement.classList.remove('show-error', 'show-success');

    } catch (error) {
      this.logError(`显示字段 ${fieldName} 警告失败`, error);
    }
  }

  /**
     * 清除字段错误状态
     * @param {string} fieldName - 字段名称
     */
  clearFieldError(fieldName) {
    try {
      const fieldConfig = this.fieldValidators.get(fieldName);
      if (!fieldConfig) {return;}

      const { element } = fieldConfig;
      element.classList.remove('invalid', 'warning');

      const errorElement = this.findErrorContainer(fieldName);
      if (errorElement) {
        errorElement.classList.remove('show-error');
      }

      const warningElement = this.findWarningContainer(fieldName);
      if (warningElement) {
        warningElement.classList.remove('show-warning');
      }

    } catch (error) {
      this.logError(`清除字段 ${fieldName} 错误状态失败`, error);
    }
  }

  /**
     * 验证所有字段
     * @returns {ValidationResult}
     */
  validateAllFields() {
    try {
      const overallResult = new ValidationResult();

      for (const [fieldName, fieldConfig] of this.fieldValidators) {
        const value = fieldConfig.element.value;
        const result = this.validateField(fieldName, value);
        overallResult.merge(result);
      }

      this.log('所有字段验证完成', { result: overallResult.toJSON() });

      return overallResult;

    } catch (error) {
      this.logError('验证所有字段失败', error);
      return new ValidationResult(false, '验证过程中发生错误');
    }
  }

  /**
     * 获取字段验证结果
     * @param {string} fieldName - 字段名称
     * @returns {ValidationResult|null}
     */
  getFieldResult(fieldName) {
    return this.validationResults.get(fieldName) || null;
  }

  /**
     * 获取所有验证结果
     * @returns {Map}
     */
  getAllResults() {
    return new Map(this.validationResults);
  }

  /**
     * 查找错误容器
     * @param {string} fieldName - 字段名称
     * @returns {HTMLElement|null}
     */
  findErrorContainer(fieldName) {
    return document.querySelector(`[data-error-for="${fieldName}"]`) ||
               document.querySelector(`#${fieldName}-error`) ||
               document.querySelector(`.${fieldName}-error`);
  }

  /**
     * 查找成功容器
     * @param {string} fieldName - 字段名称
     * @returns {HTMLElement|null}
     */
  findSuccessContainer(fieldName) {
    return document.querySelector(`[data-success-for="${fieldName}"]`) ||
               document.querySelector(`#${fieldName}-success`) ||
               document.querySelector(`.${fieldName}-success`);
  }

  /**
     * 查找警告容器
     * @param {string} fieldName - 字段名称
     * @returns {HTMLElement|null}
     */
  findWarningContainer(fieldName) {
    return document.querySelector(`[data-warning-for="${fieldName}"]`) ||
               document.querySelector(`#${fieldName}-warning`) ||
               document.querySelector(`.${fieldName}-warning`);
  }

  /**
     * 注销字段验证
     * @param {string} fieldName - 字段名称
     */
  unregisterField(fieldName) {
    try {
      // 清除防抖定时器
      if (this.debounceTimers.has(fieldName)) {
        clearTimeout(this.debounceTimers.get(fieldName));
        this.debounceTimers.delete(fieldName);
      }

      // 移除验证器和结果
      this.fieldValidators.delete(fieldName);
      this.validationResults.delete(fieldName);

      this.log(`字段 ${fieldName} 注销成功`);

    } catch (error) {
      this.logError(`字段 ${fieldName} 注销失败`, error);
    }
  }

  /**
     * 记录日志
     * @param {string} message - 日志消息
     * @param {object} data - 附加数据
     */
  log(message, data = {}) {
    console.log(`[RealTimeValidationManager] ${message}`, data);
  }

  /**
     * 记录错误日志
     * @param {string} message - 错误消息
     * @param {Error} error - 错误对象
     */
  logError(message, error) {
    console.error(`[RealTimeValidationManager] ${message}`, error);
  }

  /**
     * 销毁管理器
     */
  destroy() {
    // 清除所有防抖定时器
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }

    // 清除所有数据
    this.fieldValidators.clear();
    this.debounceTimers.clear();
    this.validationResults.clear();

    this.log('RealTimeValidationManager已销毁');
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ValidationResult,
    InputValidator,
    RealTimeValidationManager
  };
} else {
  window.ValidationResult = ValidationResult;
  window.InputValidator = InputValidator;
  window.RealTimeValidationManager = RealTimeValidationManager;
}
