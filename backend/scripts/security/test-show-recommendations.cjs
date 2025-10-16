#!/usr/bin/env node

/**
 * 测试showSecurityRecommendations函数
 */

// 清除模块缓存，确保使用最新版本的函数
delete require.cache[require.resolve('./redesigned-user-validation.js')];

const { validateTestRun } = require('./redesigned-user-validation.js');

console.log('=== 测试validateTestRun函数 ===\n');

console.log('调用 validateTestRun...');
const showResult = validateTestRun({
  type: 'integration',
  name: '强制显示测试',
  description: '测试强制显示建议功能',
  showRecommendations: true
});

console.log('返回结果:');
console.log(JSON.stringify(showResult, null, 2));