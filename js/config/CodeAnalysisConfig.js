/**
 * 代码分析配置管理器
 * 专门负责代码分析相关的配置常量和设置
 */
class CodeAnalysisConfig {
  constructor() {
    this.config = {
      COMPLEXITY_THRESHOLDS: {
        cyclomatic: {
          low: 5,
          medium: 10,
          high: 15,
          critical: 20
        },
        cognitive: {
          low: 7,
          medium: 15,
          high: 25,
          critical: 35
        }
      },
      CODE_METRICS: {
        maxFunctionLength: 50,
        maxClassLength: 300,
        maxParameterCount: 5,
        maxNestingDepth: 4,
        minTestCoverage: 80
      },
      ANALYSIS_RULES: {
        detectDuplicateCode: true,
        detectLongMethods: true,
        detectLargeClasses: true,
        detectDeepNesting: true,
        detectMagicNumbers: true,
        detectUnusedVariables: true,
        detectComplexConditions: true
      },
      SEVERITY_LEVELS: {
        INFO: 1,
        WARNING: 2,
        ERROR: 3,
        CRITICAL: 4
      },
      ISSUE_CATEGORIES: {
        COMPLEXITY: 'complexity',
        MAINTAINABILITY: 'maintainability',
        PERFORMANCE: 'performance',
        SECURITY: 'security',
        STYLE: 'style',
        BUGS: 'bugs'
      },
      LANGUAGE_CONFIGS: {
        javascript: {
          fileExtensions: ['.js', '.jsx', '.mjs'],
          commentPatterns: ['//', '/*', '*/', '/**'],
          functionKeywords: ['function', 'async function', '=>']
        },
        typescript: {
          fileExtensions: ['.ts', '.tsx'],
          commentPatterns: ['//', '/*', '*/', '/**'],
          functionKeywords: ['function', 'async function', '=>']
        },
        css: {
          fileExtensions: ['.css', '.scss', '.sass', '.less'],
          commentPatterns: ['/*', '*/'],
          functionKeywords: []
        },
        html: {
          fileExtensions: ['.html', '.htm'],
          commentPatterns: ['<!--', '-->'],
          functionKeywords: []
        }
      }
    };

    Object.freeze(this.config);
  }

  /**
   * 获取配置值
   * @param {string} key - 配置键
   * @param {*} defaultValue - 默认值
   * @returns {*} 配置值
   */
  get(key, defaultValue) {
    return Object.prototype.hasOwnProperty.call(this.config, key) ? this.config[key] : defaultValue;
  }

  /**
   * 检查配置键是否存在
   * @param {string} key - 配置键
   * @returns {boolean} 是否存在
   */
  has(key) {
    return Object.prototype.hasOwnProperty.call(this.config, key);
  }

  /**
   * 获取所有配置
   * @returns {object} 配置对象的深拷贝
   */
  getAll() {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * 获取复杂度阈值
   * @param {string} type - 复杂度类型 (cyclomatic, cognitive)
   * @returns {object} 复杂度阈值配置
   */
  getComplexityThresholds(type = 'cyclomatic') {
    return this.config.COMPLEXITY_THRESHOLDS[type] || this.config.COMPLEXITY_THRESHOLDS.cyclomatic;
  }

  /**
   * 获取所有复杂度阈值
   * @returns {object} 所有复杂度阈值配置
   */
  getAllComplexityThresholds() {
    return JSON.parse(JSON.stringify(this.config.COMPLEXITY_THRESHOLDS));
  }

  /**
   * 获取代码指标配置
   * @returns {object} 代码指标配置
   */
  getCodeMetrics() {
    return JSON.parse(JSON.stringify(this.config.CODE_METRICS));
  }

  /**
   * 获取分析规则配置
   * @returns {object} 分析规则配置
   */
  getAnalysisRules() {
    return JSON.parse(JSON.stringify(this.config.ANALYSIS_RULES));
  }

  /**
   * 检查分析规则是否启用
   * @param {string} ruleName - 规则名称
   * @returns {boolean} 是否启用
   */
  isRuleEnabled(ruleName) {
    return this.config.ANALYSIS_RULES[ruleName] === true;
  }

  /**
   * 获取严重性级别
   * @returns {object} 严重性级别配置
   */
  getSeverityLevels() {
    return JSON.parse(JSON.stringify(this.config.SEVERITY_LEVELS));
  }

  /**
   * 获取问题分类
   * @returns {object} 问题分类配置
   */
  getIssueCategories() {
    return JSON.parse(JSON.stringify(this.config.ISSUE_CATEGORIES));
  }

  /**
   * 根据复杂度值获取严重性级别
   * @param {number} complexity - 复杂度值
   * @param {string} type - 复杂度类型
   * @returns {string} 严重性级别
   */
  getComplexitySeverity(complexity, type = 'cyclomatic') {
    const thresholds = this.getComplexityThresholds(type);

    if (complexity >= thresholds.critical) {
      return 'CRITICAL';
    } else if (complexity >= thresholds.high) {
      return 'ERROR';
    } else if (complexity >= thresholds.medium) {
      return 'WARNING';
    }
    return 'INFO';

  }

  /**
   * 获取语言配置
   * @param {string} language - 语言名称
   * @returns {object|null} 语言配置
   */
  getLanguageConfig(language) {
    return this.config.LANGUAGE_CONFIGS[language.toLowerCase()] || null;
  }

  /**
   * 获取所有支持的语言
   * @returns {string[]} 支持的语言列表
   */
  getSupportedLanguages() {
    return Object.keys(this.config.LANGUAGE_CONFIGS);
  }

  /**
   * 根据文件扩展名检测语言
   * @param {string} filename - 文件名
   * @returns {string|null} 检测到的语言
   */
  detectLanguageByExtension(filename) {
    const extension = filename.substring(filename.lastIndexOf('.'));

    for (const [language, config] of Object.entries(this.config.LANGUAGE_CONFIGS)) {
      if (config.fileExtensions.includes(extension)) {
        return language;
      }
    }

    return null;
  }

  /**
   * 验证代码指标是否超出阈值
   * @param {string} metric - 指标名称
   * @param {number} value - 指标值
   * @returns {boolean} 是否超出阈值
   */
  isMetricExceeded(metric, value) {
    const threshold = this.config.CODE_METRICS[metric];
    return typeof threshold !== 'undefined' && value > threshold;
  }

  /**
   * 获取问题严重性数值
   * @param {string} severity - 严重性级别名称
   * @returns {number} 严重性数值
   */
  getSeverityValue(severity) {
    return this.config.SEVERITY_LEVELS[severity] || 1;
  }

  /**
   * 比较两个严重性级别
   * @param {string} severity1 - 严重性级别1
   * @param {string} severity2 - 严重性级别2
   * @returns {number} 比较结果 (-1, 0, 1)
   */
  compareSeverity(severity1, severity2) {
    const value1 = this.getSeverityValue(severity1);
    const value2 = this.getSeverityValue(severity2);

    if (value1 < value2) { return -1; }
    if (value1 > value2) { return 1; }
    return 0;
  }
}

// 创建全局实例
const codeAnalysisConfig = new CodeAnalysisConfig();

// 导出配置管理器
if (typeof window !== 'undefined') {
  window.CodeAnalysisConfig = CodeAnalysisConfig;
  window.codeAnalysisConfig = codeAnalysisConfig;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CodeAnalysisConfig, codeAnalysisConfig };
}
