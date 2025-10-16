#!/usr/bin/env node

/**
 * 调试showSecurityRecommendations函数
 */

// 清除模块缓存
delete require.cache[require.resolve('./redesigned-user-validation.js')];

console.log('=== 调试validateTestRun函数 ===\n');

// 1. 检查函数是否正确导出
const moduleExports = require('./redesigned-user-validation.js');
console.log('模块导出的函数:', Object.keys(moduleExports));
console.log('validateTestRun是否导出:', 'validateTestRun' in moduleExports);

// 2. 检查函数定义
if ('validateTestRun' in moduleExports) {
  console.log('\nvalidateTestRun函数类型:', typeof moduleExports.validateTestRun);
  console.log('函数长度:', moduleExports.validateTestRun.length);
  
  // 3. 尝试调用函数并捕获异常
  try {
    console.log('\n尝试调用validateTestRun...');
    const result = moduleExports.validateTestRun({
      type: 'integration',
      name: '调试测试',
      description: '调试validateTestRun函数',
      showRecommendations: true
    });
    console.log('调用返回结果:', JSON.stringify(result, null, 2));
    console.log('返回结果类型:', typeof result);
    console.log('返回结果是否为对象:', result !== null && typeof result === 'object');
    console.log('返回结果是否为空对象:', JSON.stringify(result) === '{}');
    console.log('返回结果是否包含建议:', !!result.recommendations && result.recommendations.length > 0);
  } catch (error) {
    console.error('调用失败，错误信息:', error.message);
    console.error('错误堆栈:', error.stack);
  }
} else {
  console.error('validateTestRun函数未导出');
}