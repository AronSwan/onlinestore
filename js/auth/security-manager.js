/**
 * 安全管理器 - 提供XSS防护、输入过滤、数据加密等安全措施
 *
 * 功能包括：
 * - XSS防护和HTML转义
 * - 输入数据过滤和清理
 * - 敏感数据加密/解密
 * - CSP策略管理
 * - 安全头部设置
 *
 * @author AI Assistant
 * @version 1.0.0
 */

class SecurityManager {
  constructor(options = {}) {
    this.config = {
      enableXSSProtection: true,
      enableCSP: true,
      enableInputSanitization: true,
      enableDataEncryption: true,
      encryptionKey: options.encryptionKey || this.generateEncryptionKey(),
      allowedTags: options.allowedTags || ['b', 'i', 'em', 'strong'],
      allowedAttributes: options.allowedAttributes || ['class', 'id'],
      maxInputLength: options.maxInputLength || 1000,
      ...options
    };

    this.xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>/gi,
      /<link[^>]*>/gi,
      /<meta[^>]*>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /on\w+\s*=/gi
    ];

    this.sqlInjectionPatterns = [
      /('|(--)|;|(\||\|)|(\*|\*))/gi,
      /(union|select|insert|delete|update|drop|create|alter|exec|execute)/gi,
      /(script|javascript|vbscript|onload|onerror|onclick)/gi
    ];

    this.init();
  }

  /**
   * 初始化安全管理器
   */
  init() {
    try {
      if (this.config.enableCSP) {
        this.setupCSP();
      }

      if (this.config.enableXSSProtection) {
        this.setupXSSProtection();
      }

      this.setupSecurityHeaders();

      console.log('SecurityManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SecurityManager:', error);
      throw error;
    }
  }

  /**
   * 设置内容安全策略 (CSP)
   */
  setupCSP() {
    if (typeof document !== 'undefined') {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = [
        'default-src \'self\'',
        'script-src \'self\' \'unsafe-inline\' \'unsafe-eval\'',
        'style-src \'self\' \'unsafe-inline\'',
        'img-src \'self\' data: https:',
        'font-src \'self\' https:',
        'connect-src \'self\' https:',
        'frame-src \'none\'',
        'object-src \'none\'',
        'base-uri \'self\''
      ].join('; ');

      document.head.appendChild(meta);
    }
  }

  /**
   * 设置XSS防护
   */
  setupXSSProtection() {
    if (typeof document !== 'undefined') {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'X-XSS-Protection';
      meta.content = '1; mode=block';
      document.head.appendChild(meta);
    }
  }

  /**
   * 设置安全头部
   */
  setupSecurityHeaders() {
    if (typeof document !== 'undefined') {
      // X-Content-Type-Options
      const noSniff = document.createElement('meta');
      noSniff.httpEquiv = 'X-Content-Type-Options';
      noSniff.content = 'nosniff';
      document.head.appendChild(noSniff);

      // X-Frame-Options
      const frameOptions = document.createElement('meta');
      frameOptions.httpEquiv = 'X-Frame-Options';
      frameOptions.content = 'DENY';
      document.head.appendChild(frameOptions);

      // Referrer-Policy
      const referrerPolicy = document.createElement('meta');
      referrerPolicy.name = 'referrer';
      referrerPolicy.content = 'strict-origin-when-cross-origin';
      document.head.appendChild(referrerPolicy);
    }
  }

  /**
   * HTML转义，防止XSS攻击
   * @param {string} input - 需要转义的字符串
   * @returns {string} 转义后的字符串
   */
  escapeHtml(input) {
    if (typeof input !== 'string') {
      return input;
    }

    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      '\'': '&#x27;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };

    return input.replace(/[&<>"'`=/]/g, (match) => escapeMap[match]);
  }

  /**
   * 反转义HTML
   * @param {string} input - 需要反转义的字符串
   * @returns {string} 反转义后的字符串
   */
  unescapeHtml(input) {
    if (typeof input !== 'string') {
      return input;
    }

    const unescapeMap = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#x27;': '\'',
      '&#x2F;': '/',
      '&#x60;': '`',
      '&#x3D;': '='
    };

    return input.replace(/&(amp|lt|gt|quot|#x27|#x2F|#x60|#x3D);/g, (match) => unescapeMap[match]);
  }

  /**
   * 清理和过滤输入数据
   * @param {string} input - 输入数据
   * @param {Object} options - 过滤选项
   * @returns {Object} 过滤结果
   */
  sanitizeInput(input, options = {}) {
    const result = {
      original: input,
      sanitized: input,
      isValid: true,
      violations: []
    };

    if (typeof input !== 'string') {
      result.isValid = false;
      result.violations.push('Input must be a string');
      return result;
    }

    // 长度检查
    if (input.length > this.config.maxInputLength) {
      result.isValid = false;
      result.violations.push(`Input exceeds maximum length of ${this.config.maxInputLength}`);
      result.sanitized = input.substring(0, this.config.maxInputLength);
    }

    // XSS检查
    if (this.config.enableXSSProtection) {
      const xssResult = this.detectXSS(input);
      if (!xssResult.isClean) {
        result.violations.push(...xssResult.violations);
        result.sanitized = this.removeXSS(result.sanitized);
      }
    }

    // SQL注入检查
    const sqlResult = this.detectSQLInjection(input);
    if (!sqlResult.isClean) {
      result.isValid = false;
      result.violations.push(...sqlResult.violations);
    }

    // HTML转义
    if (options.escapeHtml !== false) {
      result.sanitized = this.escapeHtml(result.sanitized);
    }

    // 移除不允许的标签和属性
    if (options.allowHtml) {
      result.sanitized = this.sanitizeHtml(result.sanitized, options);
    }

    return result;
  }

  /**
   * 检测XSS攻击
   * @param {string} input - 输入字符串
   * @returns {Object} 检测结果
   */
  detectXSS(input) {
    const result = {
      isClean: true,
      violations: []
    };

    for (const pattern of this.xssPatterns) {
      if (pattern.test(input)) {
        result.isClean = false;
        result.violations.push(`Potential XSS detected: ${pattern.source}`);
      }
    }

    return result;
  }

  /**
   * 移除XSS攻击代码
   * @param {string} input - 输入字符串
   * @returns {string} 清理后的字符串
   */
  removeXSS(input) {
    let cleaned = input;

    for (const pattern of this.xssPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    return cleaned;
  }

  /**
   * 检测SQL注入攻击
   * @param {string} input - 输入字符串
   * @returns {Object} 检测结果
   */
  detectSQLInjection(input) {
    const result = {
      isClean: true,
      violations: []
    };

    for (const pattern of this.sqlInjectionPatterns) {
      if (pattern.test(input)) {
        result.isClean = false;
        result.violations.push(`Potential SQL injection detected: ${pattern.source}`);
      }
    }

    return result;
  }

  /**
   * 清理HTML内容
   * @param {string} html - HTML字符串
   * @param {Object} options - 清理选项
   * @returns {string} 清理后的HTML
   */
  sanitizeHtml(html, options = {}) {
    const allowedTags = options.allowedTags || this.config.allowedTags;
    const allowedAttributes = options.allowedAttributes || this.config.allowedAttributes;

    // 简单的HTML清理实现
    // 在生产环境中建议使用DOMPurify等专业库
    let cleaned = html;

    // 移除不允许的标签
    cleaned = cleaned.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tagName) => {
      if (allowedTags.includes(tagName.toLowerCase())) {
        // 清理属性
        return match.replace(/\s+([a-zA-Z-]+)\s*=\s*["']?[^"'>]*["']?/g, (attrMatch, attrName) => {
          if (allowedAttributes.includes(attrName.toLowerCase())) {
            return attrMatch;
          }
          return '';
        });
      }
      return '';
    });

    return cleaned;
  }

  /**
   * 生成加密密钥
   * @returns {string} 加密密钥
   */
  generateEncryptionKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  /**
   * 简单的数据加密（仅用于演示，生产环境请使用专业加密库）
   * @param {string} data - 需要加密的数据
   * @returns {string} 加密后的数据
   */
  encrypt(data) {
    if (!this.config.enableDataEncryption) {
      return data;
    }

    try {
      // 简单的XOR加密（仅用于演示）
      const key = this.config.encryptionKey;
      let encrypted = '';

      for (let i = 0; i < data.length; i++) {
        const keyChar = key.charCodeAt(i % key.length);
        const dataChar = data.charCodeAt(i);
        encrypted += String.fromCharCode(dataChar ^ keyChar);
      }

      return btoa(encrypted); // Base64编码
    } catch (error) {
      console.error('Encryption failed:', error);
      return data;
    }
  }

  /**
   * 简单的数据解密
   * @param {string} encryptedData - 加密的数据
   * @returns {string} 解密后的数据
   */
  decrypt(encryptedData) {
    if (!this.config.enableDataEncryption) {
      return encryptedData;
    }

    try {
      const encrypted = atob(encryptedData); // Base64解码
      const key = this.config.encryptionKey;
      let decrypted = '';

      for (let i = 0; i < encrypted.length; i++) {
        const keyChar = key.charCodeAt(i % key.length);
        const encryptedChar = encrypted.charCodeAt(i);
        decrypted += String.fromCharCode(encryptedChar ^ keyChar);
      }

      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return encryptedData;
    }
  }

  /**
   * 验证输入数据的安全性
   * @param {Object} data - 输入数据对象
   * @param {Object} rules - 验证规则
   * @returns {Object} 验证结果
   */
  validateSecurityRules(data, rules = {}) {
    const result = {
      isValid: true,
      violations: [],
      sanitizedData: {}
    };

    for (const [field, value] of Object.entries(data)) {
      const fieldRules = rules[field] || {};
      const sanitizeResult = this.sanitizeInput(value, fieldRules);

      result.sanitizedData[field] = sanitizeResult.sanitized;

      if (!sanitizeResult.isValid) {
        result.isValid = false;
        result.violations.push({
          field,
          violations: sanitizeResult.violations
        });
      }
    }

    return result;
  }

  /**
   * 生成安全的随机令牌
   * @param {number} length - 令牌长度
   * @returns {string} 随机令牌
   */
  generateSecureToken(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';

    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      for (let i = 0; i < length; i++) {
        token += chars[array[i] % chars.length];
      }
    } else {
      // 降级到Math.random
      for (let i = 0; i < length; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    return token;
  }

  /**
   * 获取安全配置
   * @returns {Object} 当前安全配置
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * 更新安全配置
   * @param {Object} newConfig - 新的配置
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecurityManager;
} else if (typeof window !== 'undefined') {
  window.SecurityManager = SecurityManager;
}
