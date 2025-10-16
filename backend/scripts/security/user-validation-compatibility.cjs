#!/usr/bin/env node

/**
 * 用户验证兼容性适配器
 * 
 * 提供向后兼容的接口，内部使用新的安全模型
 * 
 * @author 后端开发团队
 * @version 1.0.0
 * @since 2025-10-13
 */

const os = require('os');
const path = require('path');

// 导入新设计的用户验证模块
const { 
  assessTestImpact, 
  checkEnvironmentIsolation, 
  logTestActivity, 
  provideSecurityRecommendations, 
  validateTestRun 
} = require('./redesigned-user-validation');

// 旧版配置（为了兼容性）
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
  // 是否禁止特权用户运行测试（默认false，仅作为警告）
  forbidPrivilegedUsers: false
};

/**
 * 获取当前运行用户（兼容性接口）
 */
function getCurrentUser() {
  return os.userInfo();
}

/**
 * 检查用户是否在允许列表中（兼容性接口）
 */
function isUserAllowed(username) {
  // 如果不在严格模式，允许所有非禁止用户
  if (!USER_VALIDATION_CONFIG.strictMode) {
    return !USER_VALIDATION_CONFIG.forbiddenUsers.includes(username);
  }
  
  // 严格模式，只允许白名单中的用户
  return USER_VALIDATION_CONFIG.allowedUsers.includes(username);
}

/**
 * 检查用户是否在禁止列表中（兼容性接口）
 */
function isUserForbidden(username) {
  return USER_VALIDATION_CONFIG.forbiddenUsers.includes(username);
}

/**
 * 检查用户是否为特权用户（兼容性接口）
 */
function isPrivilegedUser(username) {
  return USER_VALIDATION_CONFIG.privilegedUsers.includes(username);
}

/**
 * 获取用户所属的组（兼容性接口）
 */
function getUserGroups(username) {
  try {
    let groups = [];
    
    if (process.platform === 'win32') {
      // Windows系统
      try {
        // 使用buffer处理编码问题
        const { execSync } = require('child_process');
        const outputBuffer = execSync('whoami /groups');
        const output = outputBuffer.toString('utf8');
        const lines = output.split('\n');
        
        // 解析输出行，提取组名
        groups = lines
          .filter(line => line.trim() !== '')
          .map(line => {
            // 格式通常是: 组名 SID Type
            const match = line.match(/^([^\\]+\\)?([^\s]+)\s+.*$/);
            return match ? match[2] : null;
          })
          .filter(group => group !== null);
          
        // 如果获取成功，返回结果
        if (groups.length > 0 && !groups[0].includes('��')) {
          return groups;
        }
      } catch (whoamiError) {
        console.warn(`Failed to get user groups with whoami: ${whoamiError.message}`);
      }
      
      // 如果所有方法都失败，返回默认组
      return ['Users'];
    } else {
      // Unix-like系统
      try {
        const { execSync } = require('child_process');
        const output = execSync(`groups ${username}`, { encoding: 'utf8' });
        groups = output.trim().split(' ').slice(1); // 跳过用户名
      } catch (error) {
        console.warn(`Failed to get user groups for ${username}: ${error.message}`);
      }
    }
    
    return groups;
  } catch (error) {
    console.error(`Error getting user groups for ${username}: ${error.message}`);
    return [];
  }
}

/**
 * 检查用户组是否在允许列表中（兼容性接口）
 */
function isGroupAllowed(groups) {
  if (!USER_VALIDATION_CONFIG.checkGroups) {
    return true;
  }
  
  // 如果没有组，返回false
  if (!groups || groups.length === 0) {
    return false;
  }
  
  // 检查是否有任何组在允许列表中
  return groups.some(group => USER_VALIDATION_CONFIG.allowedGroups.includes(group));
}

/**
 * 验证当前用户（兼容性接口）
 * 
 * 注意：这个接口现在使用新的安全模型，但保持兼容的返回格式
 */
function validateCurrentUser(config = {}) {
  // 合并配置
  const validationConfig = { ...USER_VALIDATION_CONFIG, ...config };
  
  // 获取当前用户信息
  const currentUser = getCurrentUser();
  const username = currentUser.username;
  
  // 检查用户名是否包含潜在的恶意字符（优先检查）
  if (validationConfig.allowedUsers && validationConfig.allowedUsers.length > 0) {
    const maliciousPatterns = [
      /[;\|&`$(){}[\]]/, // 命令注入字符
      /\.\.[\/\\]/, // 路径遍历
      /[<>]/, // HTML标签
      /\$\{[^}]*\}/, // 表达式语言注入
      /\x00/, // 空字节注入
      /[\r\n]/, // 换行符注入
    ];
    
    for (const pattern of maliciousPatterns) {
      if (pattern.test(username)) {
        return {
          valid: false,
          reason: `Username '${username}' contains potentially malicious characters`,
          suggestion: 'Use a username with only alphanumeric characters, underscores, and hyphens',
          user: currentUser,
          groups: validationConfig.checkGroups ? getUserGroups(username) : undefined
        };
      }
    }
  }
  
  // 使用新的安全模型验证测试运行
  const testConfig = {
    type: 'read-only', // 默认为只读测试，影响最低
    name: '用户验证测试',
    description: '验证用户是否有权限运行测试'
  };
  
  const validationResult = validateTestRun(testConfig);
  
  // 根据旧配置调整结果
  let valid = validationResult.valid;
  let reason = validationResult.impact.description;
  
  // 检查用户是否在禁止列表中
  if (validationConfig.forbiddenUsers.includes(username)) {
    valid = false;
    reason = `User '${username}' is in forbidden list`;
  }
  
  // 检查用户是否在允许列表中（严格模式）
  if (validationConfig.strictMode && !validationConfig.allowedUsers.includes(username)) {
    valid = false;
    reason = `User '${username}' is not in allowed list (strict mode)`;
  }
  
  // 检查用户组
  if (validationConfig.checkGroups) {
    const groups = getUserGroups(username);
    const groupAllowed = isGroupAllowed(groups);
    
    if (!groupAllowed && validationConfig.strictMode) {
      valid = false;
      reason = `User '${username}' is not in any allowed group`;
    }
  }
  
  // 返回兼容格式的结果
  return {
    valid,
    reason: valid ? `User '${username}' is allowed to run test monitor` : reason,
    suggestion: valid ? null : `Please run as an allowed user or check your configuration`,
    user: currentUser,
    groups: validationConfig.checkGroups ? getUserGroups(username) : undefined,
    // 新增字段，提供更多信息
    impact: validationResult.impact,
    isolation: validationResult.isolation,
    recommendations: validationResult.recommendations
  };
}

/**
 * 从配置文件加载用户验证配置（兼容性接口）
 */
function loadUserConfig(configPath) {
  const fs = require('fs');
  const defaultConfigPath = path.join(__dirname, 'user-validation.config.json');
  const pathToUse = configPath || defaultConfigPath;
  
  try {
    if (fs.existsSync(pathToUse)) {
      const configData = fs.readFileSync(pathToUse, 'utf8');
      return JSON.parse(configData);
    }
    return USER_VALIDATION_CONFIG;
  } catch (error) {
    console.error(`Failed to load user config: ${error.message}`);
    return USER_VALIDATION_CONFIG;
  }
}

// 导出兼容性接口
module.exports = {
  getCurrentUser,
  isUserAllowed,
  isUserForbidden,
  isPrivilegedUser,
  getUserGroups,
  isGroupAllowed,
  validateCurrentUser,
  loadUserConfig,
  // 同时导出新接口，供需要使用新模型的代码使用
  assessTestImpact,
  checkEnvironmentIsolation,
  logTestActivity,
  provideSecurityRecommendations,
  validateTestRun
};

// 如果直接运行此脚本，执行兼容性测试
if (require.main === module) {
  console.log('=== 用户验证兼容性测试 ===');
  
  // 测试旧接口
  const currentUser = getCurrentUser();
  console.log(`当前用户: ${currentUser.username}`);
  
  const isAllowed = isUserAllowed(currentUser.username);
  console.log(`用户是否被允许: ${isAllowed}`);
  
  const isPrivileged = isPrivilegedUser(currentUser.username);
  console.log(`用户是否为特权用户: ${isPrivileged}`);
  
  const groups = getUserGroups(currentUser.username);
  console.log(`用户组: ${groups.join(', ')}`);
  
  const groupAllowed = isGroupAllowed(groups);
  console.log(`用户组是否被允许: ${groupAllowed}`);
  
  // 测试验证接口
  const validationResult = validateCurrentUser();
  console.log(`\n验证结果: ${validationResult.valid ? '通过' : '失败'}`);
  console.log(`原因: ${validationResult.reason}`);
  
  if (validationResult.recommendations && validationResult.recommendations.length > 0) {
    console.log('\n建议:');
    validationResult.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.message}`);
    });
  }
}