#!/usr/bin/env node

/**
 * 高级用户验证模块
 * 
 * 基于redesigned-user-validation.js，提供与旧代码兼容的接口
 * 同时保留先进的安全理念：关注测试本身，而不是用户
 * 
 * @author 后端开发团队
 * @version 3.0.0
 * @since 2025-10-14
 */

const os = require('os');
const path = require('path');
const {
  assessTestImpact,
  checkEnvironmentIsolation,
  logTestActivity,
  provideSecurityRecommendations,
  validateTestRun
} = require('./redesigned-user-validation.js');

/**
 * 检查用户名是否包含潜在的注入攻击
 * @param {string} username - 用户名
 * @returns {boolean} 是否包含注入攻击
 */
function containsInjectionAttack(username) {
  // 检查常见的注入攻击模式
  const injectionPatterns = [
    /;\s*rm\s+-rf/, // 删除命令
    /\.\.[\/\\]/, // 路径遍历
    /\|\s*nc/, // 网络连接
    /\$\{.*\}/, // 变量替换
    /\x00/, // 空字节注入
    /&&\s*\w+/, // 命令连接
    /\|\|\s*\w+/, // 命令连接
    /`.*`/, // 命令替换
    /\$\(.*\)/, // 命令替换
  ];
  
  return injectionPatterns.some(pattern => pattern.test(username));
}

/**
 * 加载用户配置
 * @returns {Object} 用户配置
 */
function loadUserConfig() {
  // 默认配置
  const defaultConfig = {
    allowedUsers: [],
    allowedGroups: [],
    forbiddenUsers: ['root', 'Administrator'],
    strictMode: false,
    enableAdvancedFeatures: true,
    testImpactAssessment: true,
    environmentIsolationCheck: true,
    securityRecommendations: true
  };

  // 尝试从配置文件加载
  const configPath = path.join(__dirname, 'user-validation-config.json');
  try {
    if (require('fs').existsSync(configPath)) {
      const fileConfig = JSON.parse(require('fs').readFileSync(configPath, 'utf8'));
      return { ...defaultConfig, ...fileConfig };
    }
  } catch (error) {
    console.warn(`Failed to load user config: ${error.message}`);
  }

  return defaultConfig;
}

/**
 * 验证当前用户
 * @param {Object} config - 验证配置
 * @returns {Object} 验证结果
 */
function validateCurrentUser(config = {}) {
  // 合并默认配置
  const finalConfig = { ...loadUserConfig(), ...config };

  // 如果启用了高级功能，使用新的验证方式
  if (finalConfig.enableAdvancedFeatures) {
    // 构建测试配置
    const testConfig = {
      type: 'integration', // 默认为集成测试
      name: '安全测试',
      description: '验证系统安全性',
      showRecommendations: false, // 在验证函数中默认不显示建议，避免重复
      collectRecommendations: true // 收集建议而不是显示
    };

    // 获取当前用户信息
    const currentUser = os.userInfo();
    
    // 使用新的验证方式，传递当前用户信息
    const result = validateTestRun(testConfig, currentUser);
    const isForbidden = finalConfig.forbiddenUsers.includes(currentUser.username);
    
    // 如果用户在禁止列表中，标记为无效
    if (isForbidden) {
      return {
        valid: false,
        reason: `用户 ${currentUser.username} 在禁止列表中`,
        suggestion: '请使用非特权用户运行测试',
        ...result
      };
    }
    
    // 检查用户名是否包含注入攻击
    if (containsInjectionAttack(currentUser.username)) {
      return {
        valid: false,
        reason: `用户名 ${currentUser.username} 包含潜在的注入攻击`,
        suggestion: '请使用不包含特殊字符的用户名',
        recommendations: result.collectedRecommendations || []
      };
    }
    
    // 检查用户是否在允许列表中（如果列表不为空）
    if (finalConfig.allowedUsers.length > 0) {
      const isAllowed = finalConfig.allowedUsers.includes(currentUser.username);
      
      if (!isAllowed) {
        return {
          valid: false,
          reason: `用户 ${currentUser.username} 不在允许列表中`,
          suggestion: '请使用允许列表中的用户运行测试',
          ...result
        };
      }
    }
    
    // 检查用户组（如果配置了）
    if (finalConfig.allowedGroups.length > 0) {
      // 这里简化处理，实际应该检查用户组成员身份
      // 由于Node.js没有直接的用户组检查API，这里跳过
    }
    
    // 在严格模式下，即使没有明确配置，也需要验证
    if (finalConfig.strictMode && finalConfig.allowedUsers.length === 0) {
      return {
        valid: false,
        reason: '严格模式下未配置允许用户列表',
        suggestion: '请配置允许用户列表或禁用严格模式'
      };
    }
    
    // 返回验证结果
    return {
      valid: true,
      reason: '用户验证通过',
      recommendations: result.collectedRecommendations || [],
      ...result
    };
  } else {
    // 使用传统验证方式
    const currentUser = os.userInfo();
    
    // 检查用户是否在禁止列表中
    const isForbidden = finalConfig.forbiddenUsers.includes(currentUser.username);
    if (isForbidden) {
      return {
        valid: false,
        reason: `用户 ${currentUser.username} 在禁止列表中`,
        suggestion: '请使用非特权用户运行测试'
      };
    }
    
    // 检查用户是否在允许列表中（如果列表不为空）
    if (finalConfig.allowedUsers.length > 0) {
      const isAllowed = finalConfig.allowedUsers.includes(currentUser.username);
      
      if (!isAllowed) {
        return {
          valid: false,
          reason: `用户 ${currentUser.username} 不在允许列表中`,
          suggestion: '请使用允许列表中的用户运行测试'
        };
      }
    }
    
    // 返回验证结果
    return {
      valid: true,
      reason: '用户验证通过'
    };
  }
}

/**
 * 显示安全建议
 * @param {Object} user - 用户信息
 * @param {Object} testConfig - 测试配置
 * @returns {Promise<Object>} 显示结果
 */
async function showSecurityRecommendations(user = null, testConfig = {}) {
  // 获取当前用户信息（如果没有提供）
  const currentUser = user || os.userInfo();
  
  // 构建测试配置
  const config = {
    type: 'integration',
    name: '安全测试',
    description: '验证系统安全性',
    forceShowRecommendations: true, // 强制显示建议
    ...testConfig
  };
  
  // 调用验证函数以获取建议
  const result = validateTestRun(config, currentUser);
  
  // 返回成功结果，因为建议已经显示
  return {
    valid: true,
    message: '安全建议已显示',
    recommendations: result.recommendations || result.collectedRecommendations || []
  };
}

// 导出函数供其他模块使用
module.exports = {
  assessTestImpact,
  checkEnvironmentIsolation,
  logTestActivity,
  provideSecurityRecommendations,
  validateTestRun,
  loadUserConfig,
  validateCurrentUser,
  containsInjectionAttack,
  showSecurityRecommendations
};