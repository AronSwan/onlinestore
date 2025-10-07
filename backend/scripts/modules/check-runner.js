/**
 * 检查运行器模块
 * 用途: 执行安全检查的核心逻辑
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const { PROJECT_ROOT } = require('./env-loader');
const { parseExemptionComments, hasValidExemption, validateExemptions } = require('./exemption-parser');
const { SECURITY_RULES } = require('./security-rules');
const { SECURITY_CATEGORIES } = require('./security-categories');

// 并发控制配置
const CONCURRENCY_LIMIT = 5; // 限制并发执行的规则数量

/**
 * 运行安全检查
 * @param {Object} options 选项
 * @returns {Promise<Object>} 检查结果
 */
async function runSecurityChecks(options = {}) {
  const { category, rule, ci, envFile, envOverride } = options;
  const { loadEnvFile, loadedEnvFile, loadEnvChain } = require('./env-loader');
  
  // 加载环境变量文件（优先使用 --env-file）
  const envFiles = envFile ? [envFile, '.env.local', '.env', '.env.example'] : ['.env.local', '.env', '.env.example'];
  
  // 根据是否覆盖环境变量选择加载方式
  if (envOverride) {
    // 使用链式加载，支持覆盖
    for (const f of envFiles) {
      loadEnvFile(f, true);
    }
  } else {
    // 使用默认加载方式，只加载第一个存在的文件
    for (const f of envFiles) {
      if (loadEnvFile(f)) break;
    }
  }

  const startTime = new Date();
  let rulesToRun = [];
  
  // 收集所有豁免标记（使用并发控制）
  const allExemptions = [];
  const sourceFiles = glob.sync('src/**/*.ts', { cwd: PROJECT_ROOT });
  
  // 使用Promise.allSettled和并发控制来处理文件读取
  const processFile = async (sourceFile) => {
    try {
      const filePath = path.join(PROJECT_ROOT, sourceFile);
      const exemptions = parseExemptionComments(filePath);
      return exemptions;
    } catch (error) {
      if (!ci) console.error(`处理文件 ${sourceFile} 时出错: ${error.message}`);
      return [];
    }
  };
  
  // 分批处理文件以避免I/O峰值
  const processBatch = async (batch) => {
    const results = await Promise.allSettled(batch.map(processFile));
    return results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  };
  
  // 分批处理所有源文件
  const batchSize = Math.ceil(sourceFiles.length / CONCURRENCY_LIMIT);
  for (let i = 0; i < sourceFiles.length; i += batchSize) {
    const batch = sourceFiles.slice(i, i + batchSize);
    const batchExemptions = await processBatch(batch);
    allExemptions.push(...batchExemptions);
  }
  
  // 检查过期豁免并警告
  const expiredExemptions = allExemptions.filter(e => e.isExpired);
  if (expiredExemptions.length > 0 && !ci) {
    console.log(`\n⚠️  发现 ${expiredExemptions.length} 个已过期的豁免标记:`);
    for (const exemption of expiredExemptions) {
      const relativePath = path.relative(PROJECT_ROOT, exemption.file);
      console.log(`   - ${exemption.id} 在 ${relativePath}:${exemption.lineNumber} (到期日: ${exemption.expiryDate})`);
    }
    console.log('请及时更新或移除这些过期豁免标记。\n');
  }

  // 校验豁免标记格式并提示问题
  const validation = validateExemptions(allExemptions);
  if (validation.invalid.length > 0 && !ci) {
    console.log(`\n⚠️  发现 ${validation.invalid.length} 个豁免标记格式问题:`);
    for (const issue of validation.invalid) {
      const relativePath = path.relative(PROJECT_ROOT, issue.file);
      console.log(`   - ${issue.id || '(未指定ID)'} 在 ${relativePath}:${issue.lineNumber}: ${issue.issues.join('; ')}`);
    }
    console.log('请修正以上豁免标记格式问题。\n');
  }
  
  if (rule) {
    // 运行特定规则
    if (SECURITY_RULES[rule]) {
      rulesToRun = [rule];
    } else {
      console.error(`错误: 未知规则 "${rule}"`);
      process.exit(1);
    }
  } else if (category) {
    // 运行特定类别
    if (SECURITY_CATEGORIES[category]) {
      rulesToRun = SECURITY_CATEGORIES[category];
    } else {
      console.error(`错误: 未知类别 "${category}"`);
      process.exit(1);
    }
  } else {
    // 运行所有规则
    rulesToRun = Object.keys(SECURITY_RULES);
  }
  
  const results = [];
  let passedCount = 0;
  
  // 并发执行规则检查（带并发控制）
  const checkRule = async (ruleId) => {
    const rule = SECURITY_RULES[ruleId];
    if (!ci) console.log(`正在检查: ${rule.name}...`);
    
    try {
      // 为规则提供上下文参数
      const ruleContext = {
        projectRoot: PROJECT_ROOT,
        allExemptions,
        options
      };
      
      // 检查规则是否支持上下文参数
          let result;
          try {
            if (rule.check.length === 1) {
              result = await Promise.resolve(rule.check(ruleContext));
            } else {
              result = await Promise.resolve(rule.check());
            }
          } catch (syncError) {
            // 如果是同步函数且出错，直接使用同步结果
            if (rule.check.length === 1) {
              result = rule.check(ruleContext);
            } else {
              result = rule.check();
            }
          }
      
      // 检查是否有有效豁免
      const exemption = hasValidExemption(ruleId, allExemptions);
      const adjustedResult = { ...result };
      
      // 如果有有效豁免且检查失败，将结果调整为通过
      if (exemption && !result.passed) {
        adjustedResult.passed = true;
        adjustedResult.message = `${result.message} (已豁免)`;
        adjustedResult.exemption = true;
      }
      
      return {
        id: ruleId,
        name: rule.name,
        category: rule.category,
        description: rule.description,
        severity: result.severity || rule.severity || 'medium',
        ...adjustedResult
      };
    } catch (error) {
      if (!ci) console.error(`✗ ${rule.name}: 检查过程中出错 - ${error.message}`);
      return {
        id: ruleId,
        name: rule.name,
        category: rule.category,
        description: rule.description,
        passed: false,
        message: `检查过程中出错 - ${error.message}`,
        severity: rule.severity || 'medium'
      };
    }
  };
  
  // 分批执行规则检查
  const ruleBatchSize = CONCURRENCY_LIMIT;
  for (let i = 0; i < rulesToRun.length; i += ruleBatchSize) {
    const batch = rulesToRun.slice(i, i + ruleBatchSize);
    const batchResults = await Promise.all(batch.map(checkRule));
    
    for (const result of batchResults) {
      results.push(result);
      
      if (result.passed) {
        passedCount++;
        if (!ci) console.log(`✓ ${result.name}: ${result.message}`);
      } else {
        if (!ci) console.log(`✗ ${result.name}: ${result.message}`);
      }
    }
  }
  
  const endTime = new Date();
  const durationMs = endTime - startTime;

  // 生成摘要
  const summary = {
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    passRate: Math.round((passedCount / Math.max(results.length, 1)) * 100),
    severityBreakdown: {
      critical: results.filter(r => (r.severity || (SECURITY_RULES[r.id]?.severity) || 'medium') === 'critical').length,
      high: results.filter(r => (r.severity || (SECURITY_RULES[r.id]?.severity) || 'medium') === 'high').length,
      medium: results.filter(r => (r.severity || (SECURITY_RULES[r.id]?.severity) || 'medium') === 'medium').length,
      low: results.filter(r => (r.severity || (SECURITY_RULES[r.id]?.severity) || 'medium') === 'low').length,
    }
  };
  
  // 生成元数据
  const metadata = {
    environment: process.env.NODE_ENV || 'development',
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    durationMs,
    envFile: loadedEnvFile() || null,
  };
  
  return {
    summary,
    metadata,
    results
  };
}

module.exports = {
  runSecurityChecks
};