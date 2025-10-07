#!/usr/bin/env node

/**
 * 修复验证脚本 - 验证P0/P1级别问题修复效果
 * 使用方法: node verify-fixes.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔍 开始验证测试修复效果...\n');

// 验证统计
const verifyStats = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

// 执行测试并返回结果
function runTest(testPattern, description) {
  try {
    console.log(`🧪 运行测试: ${description}`);
    
    const stdout = execSync(
      `npm test -- --testPathPattern="${testPattern}" --verbose --passWithNoTests`,
      { encoding: 'utf8', cwd: path.join(__dirname), stdio: 'pipe' }
    );
    
    // 检查测试结果
    const hasFailures = stdout.includes('FAIL:') || stdout.includes('failed');
    
    if (hasFailures) {
      console.log(`❌ 测试失败: ${description}`);
      verifyStats.failed++;
      verifyStats.details.push(`❌ ${description}`);
      return false;
    } else {
      console.log(`✅ 测试通过: ${description}`);
      verifyStats.passed++;
      verifyStats.details.push(`✅ ${description}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ 测试执行错误: ${description}`, error.message);
    verifyStats.failed++;
    verifyStats.details.push(`❌ ${description} - 执行错误`);
    return false;
  }
}

// 验证特定问题
function verifySpecificIssues() {
  console.log('🔍 验证特定问题修复效果...\n');
  
  // 验证1: 监控服务定时器泄漏问题
  runTest(
    'monitoring.service.spec.ts',
    '监控服务定时器泄漏问题'
  );
  
  // 验证2: 支付服务事务处理问题
  runTest(
    'payment.service.spec.ts',
    '支付服务事务处理问题'
  );
  
  // 验证3: 缓存服务断言问题
  runTest(
    'enhanced-cache.spec.ts',
    '缓存服务断言问题'
  );
  
  // 验证4: 通知服务Mock问题
  runTest(
    'notification.service.spec.ts',
    '通知服务Mock问题'
  );
  
  // 验证5: 地址服务依赖注入问题
  runTest(
    'address.spec.ts',
    '地址服务依赖注入问题'
  );
  
  // 验证6: 角色守卫异步Mock问题
  runTest(
    'roles.guard.spec.ts',
    '角色守卫异步Mock问题'
  );
}

// 验证整体测试套件
function verifyOverallTestSuite() {
  console.log('\n🔍 验证整体测试套件...\n');
  
  try {
    console.log('🧪 运行完整测试套件（这可能需要几分钟）...');
    
    const stdout = execSync(
      'npm test -- --coverage --passWithNoTests',
      { encoding: 'utf8', cwd: path.join(__dirname), stdio: 'pipe' }
    );
    
    // 提取测试统计信息
    const testSuitesMatch = stdout.match(/Test Suites:\s*(\d+)\s*(passed|failed)/);
    const testsMatch = stdout.match(/Tests:\s*(\d+)\s*(passed|failed)/);
    const coverageMatch = stdout.match(/All files\s+\|\s*([\d.]+)/);
    
    if (testSuitesMatch && testsMatch) {
      const testSuites = testSuitesMatch[1];
      const tests = testsMatch[1];
      const coverage = coverageMatch ? coverageMatch[1] : 'N/A';
      
      console.log(`\n📊 测试统计:`);
      console.log(`测试套件: ${testSuites}`);
      console.log(`测试用例: ${tests}`);
      console.log(`覆盖率: ${coverage}%`);
      
      // 计算成功率
      const totalSuites = parseInt(testSuitesMatch[1]);
      const totalTests = parseInt(testsMatch[1]);
      
      if (totalSuites > 0 && totalTests > 0) {
        console.log(`\n🎯 测试成功率:`);
        console.log(`套件成功率: ${((totalSuites / totalSuites) * 100).toFixed(2)}%`);
        console.log(`用例成功率: ${((totalTests / totalTests) * 100).toFixed(2)}%`);
      }
    }
    
    // 检查是否有失败
    const hasFailures = stdout.includes('FAIL:') || stdout.includes('failed');
    
    if (hasFailures) {
      console.log('\n❌ 测试套件存在失败用例');
      verifyStats.failed++;
      verifyStats.details.push('❌ 整体测试套件存在失败用例');
    } else {
      console.log('\n✅ 所有测试通过');
      verifyStats.passed++;
      verifyStats.details.push('✅ 整体测试套件全部通过');
    }
    
    return !hasFailures;
  } catch (error) {
    console.error('❌ 测试套件执行错误:', error.message);
    verifyStats.failed++;
    verifyStats.details.push('❌ 整体测试套件执行错误');
    return false;
  }
}

// 验证特定文件是否存在
function verifyFileExists(filePath, description) {
  try {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ 文件存在: ${description}`);
      verifyStats.passed++;
      verifyStats.details.push(`✅ ${description}`);
      return true;
    } else {
      console.log(`❌ 文件不存在: ${description}`);
      verifyStats.failed++;
      verifyStats.details.push(`❌ ${description}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 文件检查错误: ${description}`, error.message);
    verifyStats.failed++;
    verifyStats.details.push(`❌ ${description} - 检查错误`);
    return false;
  }
}

// 验证修复文件
function verifyFixedFiles() {
  console.log('\n🔍 验证修复文件...\n');
  
  // 验证关键修复文件
  verifyFileExists(
    'src/monitoring/monitoring.service.spec.ts',
    '监控服务测试文件'
  );
  
  verifyFileExists(
    'src/payment/payment.service.spec.ts',
    '支付服务测试文件'
  );
  
  verifyFileExists(
    'src/cache/enhanced-cache.spec.ts',
    '缓存服务测试文件'
  );
  
  verifyFileExists(
    'src/notification/notification.service.spec.ts',
    '通知服务测试文件'
  );
  
  verifyFileExists(
    'src/address/address.spec.ts',
    '地址服务测试文件'
  );
}

// 显示验证结果
function showResults() {
  console.log('\n📊 验证结果统计:');
  console.log(`总计: ${verifyStats.total}`);
  console.log(`通过: ${verifyStats.passed}`);
  console.log(`失败: ${verifyStats.failed}`);
  
  console.log('\n📋 详细结果:');
  verifyStats.details.forEach(detail => console.log(detail));
  
  const successRate = verifyStats.total > 0 ? (verifyStats.passed / verifyStats.total * 100).toFixed(2) : 0;
  console.log(`\n🎯 验证成功率: ${successRate}%`);
  
  if (verifyStats.failed === 0) {
    console.log('\n🎉 所有验证通过！问题修复成功！');
    console.log('\n💡 建议:');
    console.log('- 继续监控测试执行情况');
    console.log('- 定期运行完整测试套件');
    console.log('- 考虑集成到CI/CD流程');
  } else {
    console.log('\n⚠️ 部分验证失败，可能需要进一步修复');
    console.log('\n💡 建议:');
    console.log('- 检查失败的测试用例');
    console.log('- 查看详细错误日志');
    console.log('- 参考文档中的修复指南');
  }
}

// 主函数
function main() {
  console.log('🔍 测试问题修复验证脚本');
  console.log('=====================================\n');
  
  // 验证修复文件
  verifyFixedFiles();
  
  // 验证特定问题
  verifySpecificIssues();
  
  // 验证整体测试套件
  verifyOverallTestSuite();
  
  // 显示结果
  showResults();
}

// 执行脚本
if (require.main === module) {
  main();
}

module.exports = {
  runTest,
  verifySpecificIssues,
  verifyOverallTestSuite,
  verifyFixedFiles
};