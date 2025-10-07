/**
 * 豁免标记解析模块
 * 用途: 解析和处理代码中的安全豁免标记
 */

const fs = require('fs');
const path = require('path');

/**
 * 解析文件中的豁免标记
 * @param {string} filePath 文件路径
 * @returns {Array} 豁免标记列表
 */
function parseExemptionComments(filePath) {
  const exemptions = [];
  
  if (!fs.existsSync(filePath)) {
    return exemptions;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // 匹配豁免标记格式（支持中英文键名）:
  // 中文: // SECURITY-EXEMPTION: RULE/VULN:ID, 原因: 兼容性问题, 批准人: 安全团队, 到期日: 2025-12-31
  // 英文: // SECURITY-EXEMPTION: RULE/VULN:ID, Reason: Compatibility issue, ApprovedBy: Security team, ExpiresOn: 2025-12-31
  const exemptionRegex = /\/\/\s*SECURITY-EXEMPTION:\s*(RULE|VULN):([^,]+),\s*(原因|Reason):\s*([^,]+),\s*(批准人|ApprovedBy):\s*([^,]+),\s*(到期日|ExpiresOn):\s*([^\s]+)/g;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;
    
    while ((match = exemptionRegex.exec(line)) !== null) {
      const type = match[1].trim(); // RULE 或 VULN
      const id = match[2].trim(); // 规则ID或漏洞ID
      const reasonKey = match[3].trim(); // 原因 或 Reason
      const reason = match[4].trim();
      const approverKey = match[5].trim(); // 批准人 或 ApprovedBy
      const approver = match[6].trim();
      const expiryDateKey = match[7].trim(); // 到期日 或 ExpiresOn
      const expiryDate = match[8].trim();
      
      // 日期格式验证
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(expiryDate)) {
        console.warn(`警告: 文件 ${filePath} 第 ${i + 1} 行的日期格式无效: ${expiryDate}，应为 YYYY-MM-DD 格式`);
        continue;
      }
      
      // 检查是否已过期
      const today = new Date();
      const expiry = new Date(expiryDate);
      
      // 检查日期是否有效
      if (isNaN(expiry.getTime())) {
        console.warn(`警告: 文件 ${filePath} 第 ${i + 1} 行的日期无效: ${expiryDate}`);
        continue;
      }
      
      const isExpired = expiry < today;
      
      exemptions.push({
        type,
        id,
        reason,
        approver,
        expiryDate,
        isExpired,
        lineNumber: i + 1,
        file: filePath,
        // 保留原始键名信息
        originalKeys: {
          reason: reasonKey,
          approver: approverKey,
          expiryDate: expiryDateKey
        }
      });
    }
  }
  
  return exemptions;
}

/**
 * 检查规则是否有有效豁免
 * @param {string} ruleId 规则ID
 * @param {Array} exemptions 豁免标记列表
 * @returns {boolean} 是否有有效豁免
 */
function hasValidExemption(ruleId, exemptions) {
  // 查找与规则相关的豁免
  const relevantExemptions = exemptions.filter(e =>
    !e.isExpired && (
      (e.type === 'RULE' && e.id === ruleId) ||
      (e.type === 'VULN' && e.id.startsWith('VULN-'))
    )
  );
  
  return relevantExemptions.length > 0;
}

/**
 * 验证豁免标记格式
 * @param {Array} exemptions 豁免标记列表
 * @returns {Object} 验证结果
 */
function validateExemptions(exemptions) {
  const issues = [];
  const validExemptions = [];
  
  for (const exemption of exemptions) {
    let isValid = true;
    const exemptionIssues = [];
    
    // 检查必要字段
    if (!exemption.id) {
      exemptionIssues.push('缺少ID');
      isValid = false;
    }
    
    if (!exemption.reason) {
      exemptionIssues.push('缺少原因');
      isValid = false;
    }
    
    if (!exemption.approver) {
      exemptionIssues.push('缺少批准人');
      isValid = false;
    }
    
    if (!exemption.expiryDate) {
      exemptionIssues.push('缺少到期日期');
      isValid = false;
    }
    
    // 检查是否过期
    if (exemption.isExpired) {
      exemptionIssues.push('豁免已过期');
      isValid = false;
    }
    
    // 检查日期格式
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (exemption.expiryDate && !dateRegex.test(exemption.expiryDate)) {
      exemptionIssues.push('日期格式无效，应为 YYYY-MM-DD');
      isValid = false;
    }
    
    if (exemptionIssues.length > 0) {
      issues.push({
        file: exemption.file,
        lineNumber: exemption.lineNumber,
        id: exemption.id,
        issues: exemptionIssues
      });
    }
    
    if (isValid) {
      validExemptions.push(exemption);
    }
  }
  
  return {
    valid: validExemptions,
    invalid: issues,
    total: exemptions.length
  };
}

module.exports = {
  parseExemptionComments,
  hasValidExemption,
  validateExemptions
};