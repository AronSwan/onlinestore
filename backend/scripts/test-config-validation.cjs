#!/usr/bin/env node

/**
 * 配置文件验证测试脚本
 * 用于验证 test-runner-secure.config.cjs 是否正常工作
 */

console.log('🚀 配置文件验证测试开始\n');

try {
  const configModule = require('./test-runner-secure.config.cjs');
  const config = configModule.getConfig();
  const env = configModule.getEnvironment();
  
  console.log('✅ 配置文件加载成功');
  console.log(`版本: ${config.version}`);
  console.log(`名称: ${config.name}`);
  console.log(`环境: ${env}`);
  
  // 配置验证
  configModule.validateConfig(config);
  console.log('✅ 配置验证通过');
  
  // 配置完整性检查
  const requiredSections = [
    'commandRateLimit',
    'validation', 
    'performance',
    'concurrency',
    'logging',
    'testing',
    'reporting',
    'security'
  ];
  
  let missingSections = [];
  for (const section of requiredSections) {
    if (!config[section]) {
      missingSections.push(section);
    }
  }
  
  if (missingSections.length > 0) {
    console.log(`❌ 缺少配置节: ${missingSections.join(', ')}`);
    process.exit(1);
  } else {
    console.log('✅ 所有必需配置节都存在');
  }
  
  console.log('\n📊 测试总结');
  console.log('='.repeat(30));
  console.log('🎉 所有测试通过！配置文件工作正常。');
  process.exit(0);
  
} catch (error) {
  console.error('❌ 测试执行失败:', error.message);
  process.exit(1);
}