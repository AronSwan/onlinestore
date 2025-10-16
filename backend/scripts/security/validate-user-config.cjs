#!/usr/bin/env node

/**
 * 用户配置验证工具
 * 
 * 用于验证用户验证配置的一致性和正确性
 * 
 * @author 后端开发团队
 * @version 1.0.0
 * @since 2025-10-13
 */

const fs = require('fs');
const path = require('path');

// 导入用户验证模块
// 由于user-validation.js是CommonJS模块，我们需要直接读取配置
const USER_VALIDATION_CONFIG = {
  // 允许的用户列表
  allowedUsers: [
    'test-monitor',
    'ci',
    'jenkins',
    'gitlab-runner',
    'github-runner',
    'node'
  ],
  // 允许的用户组列表
  allowedGroups: [
    'test-monitor',
    'ci',
    'jenkins',
    'gitlab-runner',
    'github-runner',
    'node',
    'docker',
    'Users' // Windows默认用户组
  ],
  // 禁止的用户列表
  forbiddenUsers: [
    'root',
    'Administrator'
  ],
  // 特权用户列表（与禁止用户列表分开）
  privilegedUsers: [
    'root',
    'Administrator'
  ],
  // 是否严格模式（只允许白名单中的用户）
  strictMode: false,
  // 是否允许非特权用户
  allowNonPrivileged: true,
  // 是否检查用户组
  checkGroups: true,
  // 是否禁止特权用户运行测试（安全最佳实践）
  forbidPrivilegedUsers: true
};

/**
 * 验证配置一致性
 */
function validateConfigConsistency(config) {
  const issues = [];
  const warnings = [];
  
  // 检查禁止名单与允许名单是否互斥
  const conflictingUsers = config.allowedUsers.filter(user => 
    config.forbiddenUsers.includes(user)
  );
  
  if (conflictingUsers.length > 0) {
    issues.push({
      type: 'error',
      message: `Forbidden and allowed lists have conflicting users: ${conflictingUsers.join(', ')}`,
      suggestion: `Remove conflicting users from one of the lists. Forbidden and allowed lists should be mutually exclusive.`
    });
  }
  
  // 检查特权用户是否在禁止名单中（这是允许的，但会发出警告）
  const privilegedInForbidden = config.privilegedUsers.filter(user => 
    config.forbiddenUsers.includes(user)
  );
  
  if (privilegedInForbidden.length > 0) {
    warnings.push({
      type: 'warning',
      message: `Privileged users in forbidden list: ${privilegedInForbidden.join(', ')}`,
      suggestion: `This is allowed but may be restrictive. Consider if these users should be forbidden.`
    });
  }
  
  // 检查特权用户是否在允许名单中（这是允许的，但会发出警告）
  const privilegedInAllowed = config.privilegedUsers.filter(user => 
    config.allowedUsers.includes(user)
  );
  
  if (privilegedInAllowed.length > 0) {
    warnings.push({
      type: 'warning',
      message: `Privileged users in allowed list: ${privilegedInAllowed.join(', ')}`,
      suggestion: `This is allowed but may not follow security best practices. Consider running tests as non-privileged users.`
    });
  }
  
  // 检查空列表
  if (config.allowedUsers.length === 0 && config.strictMode) {
    issues.push({
      type: 'error',
      message: 'Strict mode enabled but allowed users list is empty',
      suggestion: 'Add users to allowed list or disable strict mode.'
    });
  }
  
  if (config.allowedGroups.length === 0 && config.strictMode && config.checkGroups) {
    issues.push({
      type: 'error',
      message: 'Strict mode enabled with group checking but allowed groups list is empty',
      suggestion: 'Add groups to allowed list, disable group checking, or disable strict mode.'
    });
  }
  
  return { issues, warnings };
}

/**
 * 显示验证结果
 */
function displayValidationResult(config, { issues, warnings }) {
  console.log('\n=== 用户配置验证结果 ===');
  console.log(`配置文件: ${config.configPath || '默认配置'}`);
  
  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ 配置验证通过，没有发现问题');
    return;
  }
  
  if (issues.length > 0) {
    console.log(`\n❌ 发现 ${issues.length} 个配置问题:`);
    issues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.message}`);
      console.log(`   建议: ${issue.suggestion}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  发现 ${warnings.length} 个配置警告:`);
    warnings.forEach((warning, index) => {
      console.log(`\n${index + 1}. ${warning.message}`);
      console.log(`   建议: ${warning.suggestion}`);
    });
  }
  
  console.log(`\n总结: ${issues.length} 个问题, ${warnings.length} 个警告`);
}

/**
 * 生成配置报告
 */
function generateConfigReport(config, { issues, warnings }) {
  const report = {
    timestamp: new Date().toISOString(),
    config: {
      allowedUsers: config.allowedUsers,
      forbiddenUsers: config.forbiddenUsers,
      privilegedUsers: config.privilegedUsers,
      allowedGroups: config.allowedGroups,
      strictMode: config.strictMode,
      checkGroups: config.checkGroups,
      forbidPrivilegedUsers: config.forbidPrivilegedUsers
    },
    validation: {
      issues,
      warnings,
      status: issues.length === 0 ? 'passed' : 'failed'
    }
  };
  
  const reportPath = path.join(__dirname, '..', 'reports', 'user-config-validation-report.json');
  
  try {
    if (!fs.existsSync(path.dirname(reportPath))) {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 配置报告已生成: ${reportPath}`);
    return reportPath;
  } catch (error) {
    console.error(`Failed to generate config report: ${error.message}`);
    return null;
  }
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const configPath = args[0];
  
  let config;
  
  if (configPath) {
    try {
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        config = { ...USER_VALIDATION_CONFIG, ...JSON.parse(configData), configPath };
      } else {
        console.error(`配置文件不存在: ${configPath}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`读取配置文件失败: ${error.message}`);
      process.exit(1);
    }
  } else {
    config = { ...USER_VALIDATION_CONFIG, configPath: '默认配置' };
  }
  
  // 验证配置一致性
  const validationResult = validateConfigConsistency(config);
  
  // 显示验证结果
  displayValidationResult(config, validationResult);
  
  // 生成配置报告
  generateConfigReport(config, validationResult);
  
  // 根据验证结果设置退出代码
  process.exit(validationResult.issues.length > 0 ? 1 : 0);
}

// 如果直接运行此脚本，执行主函数
if (require.main === module) {
  main();
}

module.exports = {
  validateConfigConsistency,
  displayValidationResult,
  generateConfigReport
};