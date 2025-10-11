/**
 * 安全类别模块
 * 用途: 定义安全检查类别和对应的规则
 */

// 安全检查类别
const SECURITY_CATEGORIES = {
  auth: [
    'jwt-expiration',
    'jwt-secret-strength',
    'jwt-format-validation',
    'jwt-refresh-mechanism',
    'jwt-minimal-payload',
    'session-management',
    'roles-guard',
  ],
  'input-validation': ['input-validation', 'input-length-validation', 'sql-injection-protection'],
  'data-security': ['password-field-exclusion', 'password-hash'],
  'web-security': [
    'security-headers',
    'cors-config',
    'csrf-protection',
    'rate-limiting',
    'ssrf-protection',
    'file-upload-security',
    'path-traversal-protection',
  ],
  logging: ['audit-logging'],
  database: ['database-indexes', 'transaction-usage', 'transaction-rollback'],
  'supply-chain': ['dependency-vulnerability'],
  audit: ['evidence-validation'],
};

module.exports = {
  SECURITY_CATEGORIES,
};
