#!/usr/bin/env node

/**
 * 测试安全建议收集和显示功能
 */

const os = require('os');
const { validateTestRun, provideSecurityRecommendations } = require('./redesigned-user-validation.js');

console.log('=== 测试安全建议收集和显示功能 ===\n');

// 测试1: 验证安全建议能够被正确收集
console.log('测试1: 验证安全建议能够被正确收集');
const config = {
  type: 'integration',
  name: '建议收集测试',
  description: '测试安全建议收集功能',
  collectRecommendations: true,
  showRecommendations: false
};

const result = validateTestRun(config);

console.log(`验证结果: ${result.valid ? '通过' : '拒绝'}`);
console.log(`收集的建议数量: ${result.recommendations ? result.recommendations.length : 0}`);

if (result.recommendations && result.recommendations.length > 0) {
  console.log('收集的建议:');
  result.recommendations.forEach((rec, index) => {
    console.log(`  ${index + 1}. ${rec.message} (类型: ${rec.type}, 优先级: ${rec.priority})`);
  });
} else {
  console.log('没有收集到建议');
}

// 测试2: 验证重复建议能够被去重
console.log('\n测试2: 验证重复建议能够被去重');

// 模拟多次调用验证函数
const recommendations = [];
for (let i = 0; i < 3; i++) {
  const result = validateTestRun(config);
  if (result.recommendations) {
    recommendations.push(...result.recommendations);
  }
}

// 去重
const uniqueRecommendations = [];
const seen = new Set();

for (const rec of recommendations) {
  const key = `${rec.type}-${rec.message}`;
  if (!seen.has(key)) {
    seen.add(key);
    uniqueRecommendations.push(rec);
  }
}

console.log(`总建议数量: ${recommendations.length}`);
console.log(`去重后建议数量: ${uniqueRecommendations.length}`);

// 测试3: 验证建议能够在测试结束时统一显示
console.log('\n测试3: 验证建议能够在测试结束时统一显示');

if (uniqueRecommendations.length > 0) {
  console.log('\n=== 安全建议 ===');
  uniqueRecommendations.forEach((rec, index) => {
    const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
    console.log(`${priority} ${index + 1}. ${rec.message}`);
    console.log(`   原因: ${rec.reason}`);
    console.log(`   类型: ${rec.type}`);
    console.log('');
  });
} else {
  console.log('没有建议可显示');
}

// 测试4: 验证建议来源
console.log('\n测试4: 验证建议来源');
console.log(`当前用户: ${os.userInfo().username}`);
console.log(`是否为特权用户: ${os.userInfo().username === 'root' || os.userInfo().username === 'Administrator'}`);
console.log(`测试配置类型: integration`);
console.log(`预期影响级别: medium`);

// 测试5: 验证不同的配置选项
console.log('\n测试5: 验证不同的配置选项');

// 测试禁用建议收集
const noCollectConfig = {
  type: 'integration',
  name: '禁用收集测试',
  description: '测试禁用建议收集功能',
  collectRecommendations: false,
  showRecommendations: false
};

const noCollectResult = validateTestRun(noCollectConfig);
console.log(`禁用收集时的建议数量: ${noCollectResult.recommendations ? noCollectResult.recommendations.length : 0}`);

// 测试强制显示建议
const forceShowConfig = {
  type: 'integration',
  name: '强制显示测试',
  description: '测试强制显示建议功能',
  showRecommendations: true
};

console.log('\n测试强制显示建议:');
console.log('调用 validateTestRun...');

try {
  const showResult = validateTestRun(forceShowConfig);
  console.log(`显示结果: ${showResult.valid ? '成功' : '失败'}`);
  console.log(`返回的建议数量: ${showResult.recommendations ? showResult.recommendations.length : 0}`);
} catch (error) {
  console.error('调用 validateTestRun 失败:', error.message);
}