#!/usr/bin/env node

/**
 * 超级全面测试套件执行器
 * 
 * 使用方法：
 * node run-super-comprehensive-tests.cjs
 * 
 * 或者：
 * npm run test:super-comprehensive
 */

const path = require('path');
const fs = require('fs');

// 检查是否存在所需的模块
const requiredModules = [
  './modules/test-result-collector.cjs',
  './modules/secure-command-executor.cjs',
  './modules/system-resource-monitor.cjs',
  './modules/basic-functionality-tests.cjs',
  './modules/boundary-condition-tests.cjs',
  './modules/security-tests.cjs',
  './modules/performance-tests.cjs',
  './modules/concurrency-tests.cjs'
];

console.log('🔍 检查测试模块...');
for (const module of requiredModules) {
  const modulePath = path.resolve(__dirname, module);
  if (!fs.existsSync(modulePath)) {
    console.error(`❌ 缺少必需模块: ${module}`);
    process.exit(1);
  }
}
console.log('✅ 所有测试模块检查完成\n');

// 导入主测试套件
const SuperComprehensiveTestSuite = require('./test-runner-secure.super-comprehensive-test.cjs');

async function main() {
  console.log('🚀 启动test-runner-secure.cjs超级全面测试套件');
  console.log('=' .repeat(60));
  console.log(`开始时间: ${new Date().toLocaleString()}`);
  console.log(`Node.js版本: ${process.version}`);
  console.log(`平台: ${process.platform} ${process.arch}`);
  console.log('=' .repeat(60));
  console.log();

  const suite = new SuperComprehensiveTestSuite();
  let report = null;
  
  try {
    // 设置测试套件
    await suite.setup();
    
    // 运行所有测试
    await suite.runAllTests();
    
    // 生成报告
    report = await suite.generateReport();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 测试套件执行完成！');
    
    // 显示总结
    if (report.summary.failed > 0) {
      console.log(`❌ 发现 ${report.summary.failed} 个失败的测试，需要修复`);
      process.exit(1);
    } else if (report.summary.warnings > 0) {
      console.log(`⚠️ 有 ${report.summary.warnings} 个警告，建议检查`);
    } else {
      console.log('✅ 所有测试都通过了！test-runner-secure.cjs 非常健壮');
    }
    
  } catch (error) {
    console.error('\n❌ 测试套件执行失败:', error.message);
    console.error(error.stack);
    process.exit(1);
    
  } finally {
    // 清理资源
    await suite.cleanup();
    
    console.log('\n📋 测试完成统计:');
    if (report) {
      console.log(`  总测试数: ${report.summary.total}`);
      console.log(`  通过率: ${report.summary.passRate}%`);
      console.log(`  执行时间: ${(report.summary.duration / 1000).toFixed(2)}秒`);
    }
    console.log(`结束时间: ${new Date().toLocaleString()}`);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 执行主函数
if (require.main === module) {
  main().catch(console.error);
}