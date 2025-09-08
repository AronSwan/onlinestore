/**
 * 输入清理器 - 防止注入攻击和数据验证
 * 符合AI代码审计规范的安全输入处理
 * @ai-generated: 基于Claude 4 Sonnet生成的输入清理器
 */
class InputSanitizer {
  constructor() {
    // 安全配置常量
    this.SECURITY_CONFIG = {
      MAX_INPUT_LENGTH: 10000,
      MAX_NESTED_DEPTH: 10,
      ALLOWED_HTML_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      BLOCKED_PROTOCOLS: ['data:', 'vbscript:', 'file:'],
      SQL_INJECTION_PATTERNS: [
        /('|(--)|[;|*])/i,
        /(union|select|insert|delete|update|drop|create|alter|exec|execute)/i,
        /(script|vbscript|onload|onerror|onclick)/i
      ],
      XSS_PATTERNS: [
        /<script[^>]*>.*?<\/script>/gi,
        /<iframe[^>]*>.*?<\/iframe>/gi,
        /<object[^>]*>.*?<\/object>/gi,
        /<embed[^>]*>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ],
      COMMAND_INJECTION_PATTERNS: [
        /[;&|`$(){}[\]]/,
        /(rm|del|format|shutdown|reboot)/i,
        /(cat|type|more|less|head|tail)/i,
        /(wget|curl|nc|netcat)/i
      ]
    };

    // 清理模式定义
    this.sanitizationPatterns = {
      // HTML实体编码
      htmlEntities: {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#x27;',
        '/': '&#x2F;'
      },

      // URL编码
      urlEncoding: {
        ' ': '%20',
        '!': '%21',
        '"': '%22',
        '#': '%23',
        '$': '%24',
        '%': '%25',
        '&': '%26',
        '\'': '%27',
        '(': '%28',
        ')': '%29',
        '*': '%2A',
        '+': '%2B',
        ',': '%2C',
        '/': '%2F',
        ':': '%3A',
        ';': '%3B',
        '=': '%3D',
        '?': '%3F',
        '@': '%40',
        '[': '%5B',
        ']': '%5D'
      },

      // SQL转义
      sqlEscape: {
        '\'': '\'\'',
        '"': '""',
        '\\': '\\\\',
        '\0': '\\0',
        '\n': '\\n',
        '\r': '\\r',
        '\x1a': '\\Z'
      }
    };

    // 验证规则
    this.validationRules = {
      email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      phone: /^[+]?[1-9]?[0-9]{7,15}$/,
      alphanumeric: /^[a-zA-Z0-9]+$/,
      numeric: /^[0-9]+$/,
      url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
      ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    };
  }

  /**
   * 主要清理方法 - 综合清理输入
   * @param {any} input - 输入数据
   * @param {Object} options - 清理选项
   * @returns {Object} 清理结果
   * @ai-generated: 基于Claude 4 Sonnet生成的综合清理逻辑
   */
  sanitize(input, options = {}) {
    const config = {
      type: options.type || 'general',
      maxLength: options.maxLength || this.SECURITY_CONFIG.MAX_INPUT_LENGTH,
      allowHtml: options.allowHtml || false,
      strictMode: options.strictMode || true,
      encoding: options.encoding || 'html',
      validateOnly: options.validateOnly || false
    };

    const result = {
      original: input,
      sanitized: null,
      isValid: true,
      violations: [],
      warnings: [],
      metadata: {
        inputType: typeof input,
        inputLength: this.getInputLength(input),
        sanitizationType: config.type,
        timestamp: new Date().toISOString()
      }
    };

    try {
      // 基础验证
      this.performBasicValidation(input, config, result);

      if (!result.isValid && config.strictMode) {
        return result;
      }

      // 执行清理
      if (!config.validateOnly) {
        result.sanitized = this.performSanitization(input, config, result);
      }

      // 安全检查
      this.performSecurityChecks(result.sanitized || input, result);

    } catch (error) {
      result.isValid = false;
      result.violations.push({
        type: 'sanitization_error',
        severity: 'critical',
        message: `清理过程中发生错误: ${error.message}`,
        details: error
      });
    }

    return result;
  }

  /**
   * 执行基础验证
   * @param {any} input - 输入数据
   * @param {Object} config - 配置
   * @param {Object} result - 结果对象
   * @ai-generated: 基于Claude 4 Sonnet生成的基础验证逻辑
   */
  performBasicValidation(input, config, result) {
    // 检查输入类型
    if (input === null || typeof input === 'undefined') {
      result.violations.push({
        type: 'null_input',
        severity: 'medium',
        message: '输入为空值'
      });
      return;
    }

    // 检查长度限制
    const inputLength = this.getInputLength(input);
    if (inputLength > config.maxLength) {
      result.isValid = false;
      result.violations.push({
        type: 'length_exceeded',
        severity: 'high',
        message: `输入长度(${inputLength})超过限制(${config.maxLength})`,
        details: { actual: inputLength, limit: config.maxLength }
      });
    }

    // 检查嵌套深度（对象类型）
    if (typeof input === 'object' && input !== null) {
      const depth = this.calculateObjectDepth(input);
      if (depth > this.SECURITY_CONFIG.MAX_NESTED_DEPTH) {
        result.isValid = false;
        result.violations.push({
          type: 'depth_exceeded',
          severity: 'high',
          message: `对象嵌套深度(${depth})超过限制(${this.SECURITY_CONFIG.MAX_NESTED_DEPTH})`,
          details: { actual: depth, limit: this.SECURITY_CONFIG.MAX_NESTED_DEPTH }
        });
      }
    }

    // 类型特定验证
    this.performTypeSpecificValidation(input, config, result);
  }

  /**
   * 执行类型特定验证
   * @param {any} input - 输入数据
   * @param {Object} config - 配置
   * @param {Object} result - 结果对象
   * @ai-generated: 基于Claude 4 Sonnet生成的类型验证逻辑
   */
  performTypeSpecificValidation(input, config, result) {
    if (typeof input !== 'string') {
      return;
    }

    const validationRule = this.validationRules[config.type];
    if (validationRule && !validationRule.test(input)) {
      result.isValid = false;
      result.violations.push({
        type: 'format_invalid',
        severity: 'medium',
        message: `输入格式不符合${config.type}类型要求`,
        details: { type: config.type, pattern: validationRule.toString() }
      });
    }
  }

  /**
   * 执行清理操作
   * @param {any} input - 输入数据
   * @param {Object} config - 配置
   * @param {Object} result - 结果对象
   * @returns {any} 清理后的数据
   * @ai-generated: 基于Claude 4 Sonnet生成的清理操作逻辑
   */
  performSanitization(input, config, result) {
    if (typeof input === 'string') {
      return this.sanitizeString(input, config, result);
    } else if (typeof input === 'object' && input !== null) {
      return this.sanitizeObject(input, config, result);
    } else if (Array.isArray(input)) {
      return this.sanitizeArray(input, config, result);
    }

    return input;
  }

  /**
   * 清理字符串
   * @param {string} input - 输入字符串
   * @param {Object} config - 配置
   * @param {Object} result - 结果对象
   * @returns {string} 清理后的字符串
   * @ai-generated: 基于Claude 4 Sonnet生成的字符串清理逻辑
   */
  sanitizeString(input, config, result) {
    let sanitized = input;

    // 移除控制字符（保留常用的制表符、换行符等）
    sanitized = sanitized.replace(/[\cA-\cH\cK\cL\cN-\c_\x7F-\x9F]/g, '');

    // 根据编码类型进行清理
    switch (config.encoding) {
    case 'html':
      sanitized = this.escapeHtml(sanitized);
      break;
    case 'url':
      sanitized = this.escapeUrl(sanitized);
      break;
    case 'sql':
      sanitized = this.escapeSql(sanitized);
      break;
    case 'json':
      sanitized = this.escapeJson(sanitized);
      break;
    }

    // HTML清理（如果允许HTML）
    if (config.allowHtml) {
      sanitized = this.sanitizeHtml(sanitized, result);
    }

    // 长度截断
    if (sanitized.length > config.maxLength) {
      sanitized = sanitized.substring(0, config.maxLength);
      result.warnings.push({
        type: 'truncated',
        message: `输入已截断至${config.maxLength}字符`
      });
    }

    return sanitized;
  }

  /**
   * 清理对象
   * @param {Object} input - 输入对象
   * @param {Object} config - 配置
   * @param {Object} result - 结果对象
   * @returns {Object} 清理后的对象
   * @ai-generated: 基于Claude 4 Sonnet生成的对象清理逻辑
   */
  sanitizeObject(input, config, result) {
    const sanitized = {};

    for (const [key, value] of Object.entries(input)) {
      // 清理键名
      const sanitizedKey = this.sanitizeString(key, { ...config, encoding: 'html' }, result);

      // 递归清理值
      sanitized[sanitizedKey] = this.performSanitization(value, config, result);
    }

    return sanitized;
  }

  /**
   * 清理数组
   * @param {Array} input - 输入数组
   * @param {Object} config - 配置
   * @param {Object} result - 结果对象
   * @returns {Array} 清理后的数组
   * @ai-generated: 基于Claude 4 Sonnet生成的数组清理逻辑
   */
  sanitizeArray(input, config, result) {
    return input.map(item => this.performSanitization(item, config, result));
  }

  /**
   * HTML转义
   * @param {string} input - 输入字符串
   * @returns {string} 转义后的字符串
   * @ai-generated: 基于Claude 4 Sonnet生成的HTML转义逻辑
   */
  escapeHtml(input) {
    return input.replace(/[&<>"'/]/g, (char) => {
      return this.sanitizationPatterns.htmlEntities[char] || char;
    });
  }

  /**
   * URL转义
   * @param {string} input - 输入字符串
   * @returns {string} 转义后的字符串
   * @ai-generated: 基于Claude 4 Sonnet生成的URL转义逻辑
   */
  escapeUrl(input) {
    return encodeURIComponent(input);
  }

  /**
   * SQL转义
   * @param {string} input - 输入字符串
   * @returns {string} 转义后的字符串
   * @ai-generated: 基于Claude 4 Sonnet生成的SQL转义逻辑
   */
  escapeSql(input) {
    return input.replace(/['"\\\cA\n\r\cZ]/g, (char) => {
      return this.sanitizationPatterns.sqlEscape[char] || char;
    });
  }

  /**
   * JSON转义
   * @param {string} input - 输入字符串
   * @returns {string} 转义后的字符串
   * @ai-generated: 基于Claude 4 Sonnet生成的JSON转义逻辑
   */
  escapeJson(input) {
    return JSON.stringify(input).slice(1, -1); // 移除首尾引号
  }

  /**
   * HTML清理（允许特定标签）
   * @param {string} input - 输入HTML
   * @param {Object} result - 结果对象
   * @returns {string} 清理后的HTML
   * @ai-generated: 基于Claude 4 Sonnet生成的HTML清理逻辑
   */
  sanitizeHtml(input, result) {
    // 移除危险标签
    let sanitized = input;

    // 移除script标签
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');

    // 移除事件处理器
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

    // 移除javascript:协议
    sanitized = sanitized.replace(/javascript:/gi, '');

    // 只保留允许的标签
    const allowedTagsRegex = new RegExp(`<(?!/?(?:${this.SECURITY_CONFIG.ALLOWED_HTML_TAGS.join('|')})\b)[^>]+>`, 'gi');
    const removedTags = sanitized.match(allowedTagsRegex);

    if (removedTags && removedTags.length > 0) {
      result.warnings.push({
        type: 'html_tags_removed',
        message: `移除了${removedTags.length}个不允许的HTML标签`,
        details: removedTags
      });
    }

    sanitized = sanitized.replace(allowedTagsRegex, '');

    return sanitized;
  }

  /**
   * 执行安全检查
   * @param {any} input - 输入数据
   * @param {Object} result - 结果对象
   * @ai-generated: 基于Claude 4 Sonnet生成的安全检查逻辑
   */
  performSecurityChecks(input, result) {
    if (typeof input !== 'string') {
      return;
    }

    // SQL注入检查
    this.checkSqlInjection(input, result);

    // XSS检查
    this.checkXss(input, result);

    // 命令注入检查
    this.checkCommandInjection(input, result);

    // 路径遍历检查
    this.checkPathTraversal(input, result);
  }

  /**
   * SQL注入检查
   * @param {string} input - 输入字符串
   * @param {Object} result - 结果对象
   * @ai-generated: 基于Claude 4 Sonnet生成的SQL注入检查逻辑
   */
  checkSqlInjection(input, result) {
    this.SECURITY_CONFIG.SQL_INJECTION_PATTERNS.forEach((pattern, index) => {
      if (pattern.test(input)) {
        result.violations.push({
          type: 'sql_injection',
          severity: 'critical',
          message: `检测到潜在SQL注入攻击模式 #${index + 1}`,
          details: { pattern: pattern.toString(), match: input.match(pattern) }
        });
      }
    });
  }

  /**
   * XSS检查
   * @param {string} input - 输入字符串
   * @param {Object} result - 结果对象
   * @ai-generated: 基于Claude 4 Sonnet生成的XSS检查逻辑
   */
  checkXss(input, result) {
    this.SECURITY_CONFIG.XSS_PATTERNS.forEach((pattern, index) => {
      if (pattern.test(input)) {
        result.violations.push({
          type: 'xss_attack',
          severity: 'high',
          message: `检测到潜在XSS攻击模式 #${index + 1}`,
          details: { pattern: pattern.toString(), match: input.match(pattern) }
        });
      }
    });
  }

  /**
   * 命令注入检查
   * @param {string} input - 输入字符串
   * @param {Object} result - 结果对象
   * @ai-generated: 基于Claude 4 Sonnet生成的命令注入检查逻辑
   */
  checkCommandInjection(input, result) {
    this.SECURITY_CONFIG.COMMAND_INJECTION_PATTERNS.forEach((pattern, index) => {
      if (pattern.test(input)) {
        result.violations.push({
          type: 'command_injection',
          severity: 'critical',
          message: `检测到潜在命令注入攻击模式 #${index + 1}`,
          details: { pattern: pattern.toString(), match: input.match(pattern) }
        });
      }
    });
  }

  /**
   * 路径遍历检查
   * @param {string} input - 输入字符串
   * @param {Object} result - 结果对象
   * @ai-generated: 基于Claude 4 Sonnet生成的路径遍历检查逻辑
   */
  checkPathTraversal(input, result) {
    const pathTraversalPatterns = [
      /\.\.\/|\.\.\\/g,
      /%2e%2e%2f|%2e%2e%5c/gi,
      /\.\.\\|\.\.\//g
    ];

    pathTraversalPatterns.forEach((pattern, index) => {
      if (pattern.test(input)) {
        result.violations.push({
          type: 'path_traversal',
          severity: 'high',
          message: `检测到潜在路径遍历攻击模式 #${index + 1}`,
          details: { pattern: pattern.toString(), match: input.match(pattern) }
        });
      }
    });
  }

  /**
   * 获取输入长度
   * @param {any} input - 输入数据
   * @returns {number} 长度
   * @ai-generated: 基于Claude 4 Sonnet生成的长度计算逻辑
   */
  getInputLength(input) {
    if (typeof input === 'string') {
      return input.length;
    } else if (typeof input === 'object' && input !== null) {
      return JSON.stringify(input).length;
    } else if (Array.isArray(input)) {
      return input.length;
    }
    return 0;
  }

  /**
   * 计算对象嵌套深度
   * @param {Object} obj - 对象
   * @param {number} currentDepth - 当前深度
   * @returns {number} 最大深度
   * @ai-generated: 基于Claude 4 Sonnet生成的深度计算逻辑
   */
  calculateObjectDepth(obj, currentDepth = 0) {
    if (typeof obj !== 'object' || obj === null) {
      return currentDepth;
    }

    let maxDepth = currentDepth;
    for (const value of Object.values(obj)) {
      const depth = this.calculateObjectDepth(value, currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    }

    return maxDepth;
  }

  /**
   * 批量清理
   * @param {Array} inputs - 输入数组
   * @param {Object} options - 清理选项
   * @returns {Array} 清理结果数组
   * @ai-generated: 基于Claude 4 Sonnet生成的批量清理逻辑
   */
  sanitizeBatch(inputs, options = {}) {
    return inputs.map((input, index) => {
      const result = this.sanitize(input, options);
      result.metadata.batchIndex = index;
      return result;
    });
  }

  /**
   * 生成清理报告
   * @param {Array} results - 清理结果数组
   * @returns {Object} 清理报告
   * @ai-generated: 基于Claude 4 Sonnet生成的报告生成逻辑
   */
  generateSanitizationReport(results) {
    const report = {
      summary: {
        totalInputs: results.length,
        validInputs: results.filter(r => r.isValid).length,
        invalidInputs: results.filter(r => !r.isValid).length,
        totalViolations: results.reduce((sum, r) => sum + r.violations.length, 0),
        totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0)
      },
      violationsByType: {},
      severityDistribution: { critical: 0, high: 0, medium: 0, low: 0 },
      recommendations: [],
      timestamp: new Date().toISOString()
    };

    // 统计违规类型
    results.forEach(result => {
      result.violations.forEach(violation => {
        if (!report.violationsByType[violation.type]) {
          report.violationsByType[violation.type] = 0;
        }
        report.violationsByType[violation.type]++;
        report.severityDistribution[violation.severity]++;
      });
    });

    // 生成建议
    if (report.summary.invalidInputs > 0) {
      report.recommendations.push({
        priority: 'high',
        message: `发现${report.summary.invalidInputs}个无效输入，建议加强输入验证`
      });
    }

    if (report.severityDistribution.critical > 0) {
      report.recommendations.push({
        priority: 'critical',
        message: `发现${report.severityDistribution.critical}个严重安全问题，需要立即处理`
      });
    }

    return report;
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InputSanitizer;
} else if (typeof window !== 'undefined') {
  window.InputSanitizer = InputSanitizer;
}
