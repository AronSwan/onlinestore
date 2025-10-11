/**
 * 安全常量模块
 * 用途: 定义安全检查相关的常量
 * @author 安全团队
 * @version 1.1.0
 * @since 2025-10-03
 */

/**
 * 严重度权重映射
 * 用于计算风险评分和优先级排序
 * @readonly
 * @enum {number}
 * @property {number} low - 低严重度权重值为1
 * @property {number} medium - 中严重度权重值为2
 * @property {number} high - 高严重度权重值为3
 * @property {number} critical - 严重严重度权重值为4
 * @example
 * // 获取高严重度的权重值
 * const weight = SEVERITY_WEIGHT.high; // 返回 3
 */
const SEVERITY_WEIGHT = Object.freeze({
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
});

/**
 * 严重度映射到SARIF级别
 * 用于生成静态分析结果交换格式(SARIF)报告
 * @readonly
 * @enum {string}
 * @property {string} critical - 严重级别映射为error
 * @property {string} high - 高级别映射为error
 * @property {string} medium - 中级别映射为warning
 * @property {string} low - 低级别映射为note
 * @example
 * // 获取中等严重度的SARIF级别
 * const sarifLevel = SEVERITY_TO_SARIF_LEVEL.medium; // 返回 'warning'
 */
const SEVERITY_TO_SARIF_LEVEL = Object.freeze({
  critical: 'error',
  high: 'error',
  medium: 'warning',
  low: 'note',
});

/**
 * 严重度中英文映射
 * 用于国际化支持和多语言显示
 * @readonly
 * @enum {string}
 * @property {string} critical - 严重级别中文为"严重"
 * @property {string} high - 高级别中文为"高"
 * @property {string} medium - 中级别中文为"中"
 * @property {string} low - 低级别中文为"低"
 * @property {string} 严重 - 中文"严重"对应英文"critical"
 * @property {string} 高 - 中文"高"对应英文"high"
 * @property {string} 中 - 中文"中"对应英文"medium"
 * @property {string} 低 - 中文"低"对应英文"low"
 * @example
 * // 获取"高"的英文表示
 * const englishLevel = SEVERITY_I18N['高']; // 返回 'high'
 *
 * // 获取"critical"的中文表示
 * const chineseLevel = SEVERITY_I18N.critical; // 返回 '严重'
 */
const SEVERITY_I18N = Object.freeze({
  critical: '严重',
  high: '高',
  medium: '中',
  low: '低',
  严重: 'critical',
  高: 'high',
  中: 'medium',
  低: 'low',
});

/**
 * 安全常量集合
 * @namespace SecurityConstants
 * @property {Object} SEVERITY_WEIGHT - 严重度权重映射
 * @property {Object} SEVERITY_TO_SARIF_LEVEL - 严重度到SARIF级别映射
 * @property {Object} SEVERITY_I18N - 严重度中英文映射
 */

module.exports = {
  SEVERITY_WEIGHT,
  SEVERITY_TO_SARIF_LEVEL,
  SEVERITY_I18N,
};
