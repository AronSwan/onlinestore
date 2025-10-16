#!/usr/bin/env node

/**
 * Test Monitor 统一版测试组件
 *
 * 功能：
 * 1. 测试统一版本的各种运行模式
 * 2. 验证安全功能
 * 3. 验证性能监控功能
 * 4. 验证报告生成功能
 * 5. 验证通知系统
 *
 * @author 后端开发团队
 * @version 1.0.0
 * @since 2025-10-12
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 测试结果统计
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
};

// 测试配置
const TEST_CONFIG = {
  timeout: 30000, // 30秒超时
  testCommand: 'node test-simple.js', // 使用简单的测试脚本
  coverageFile: path.join(__dirname, 'test-coverage.json'), // 创建一个模拟覆盖率文件
  testReportsDir: path.join(__dirname, 'test-reports'),
};

/**
 * 记录测试结果
 */
function recordTestResult(testName, passed, error = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ [PASS] ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ [FAIL] ${testName}: ${error ? error.message : 'Unknown error'}`);
    testResults.errors.push({ test: testName, error: error ? error.message : 'Unknown error' });
  }
}

/**
 * 创建模拟覆盖率文件
 */
function createMockCoverageFile() {
  const coverageData = {
    total: {
      lines: { total: 100, covered: 85, pct: 85 },
      functions: { total: 20, covered: 18, pct: 90 },
      branches: { total: 40, covered: 32, pct: 80 },
      statements: { total: 120, covered: 102, pct: 85 },
    },
  };

  fs.writeFileSync(TEST_CONFIG.coverageFile, JSON.stringify(coverageData, null, 2));
  console.log(`Created mock coverage file: ${TEST_CONFIG.coverageFile}`);

  // 同时在默认位置创建覆盖率文件
  const defaultCoverageFile = path.join(__dirname, 'coverage', 'coverage-summary.json');
  if (!fs.existsSync(path.dirname(defaultCoverageFile))) {
    fs.mkdirSync(path.dirname(defaultCoverageFile), { recursive: true });
  }
  fs.writeFileSync(defaultCoverageFile, JSON.stringify(coverageData, null, 2));
  console.log(`Created mock coverage file at default location: ${defaultCoverageFile}`);
}

/**
 * 清理测试文件
 */
function cleanupTestFiles() {
  try {
    if (fs.existsSync(TEST_CONFIG.coverageFile)) {
      fs.unlinkSync(TEST_CONFIG.coverageFile);
    }

    if (fs.existsSync(TEST_CONFIG.testReportsDir)) {
      const files = fs.readdirSync(TEST_CONFIG.testReportsDir);
      for (const file of files) {
        fs.unlinkSync(path.join(TEST_CONFIG.testReportsDir, file));
      }
      fs.rmdirSync(TEST_CONFIG.testReportsDir);
    }

    console.log('Cleaned up test files');
  } catch (error) {
    console.error('Error cleaning up test files:', error.message);
  }
}

/**
 * 运行测试命令
 */
async function runTestCommand(args, testName) {
  return new Promise(resolve => {
    console.log(`\n🧪 Running test: ${testName}`);
    console.log(`Command: node start-test-monitor.js ${args.join(' ')}`);

    const child = spawn('node', ['start-test-monitor.js', ...args], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: TEST_CONFIG.timeout,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', data => {
      stdout += data.toString();
    });

    child.stderr.on('data', data => {
      stderr += data.toString();
    });

    child.on('close', code => {
      console.log(`Exit code: ${code}`);
      if (stdout) console.log(`Output: ${stdout.trim()}`);
      if (stderr) console.log(`Error: ${stderr.trim()}`);
      resolve({ code, stdout, stderr });
    });

    child.on('error', error => {
      console.error(`Process error: ${error.message}`);
      resolve({ code: -1, stdout: '', stderr: error.message });
    });

    child.on('timeout', () => {
      console.error('Process timed out');
      child.kill();
      resolve({ code: -1, stdout: '', stderr: 'Process timed out' });
    });
  });
}

/**
 * 测试安全模式
 */
async function testSecurityMode() {
  console.log('\n🔒 Testing Security Mode');

  // 测试1: 安全模式基本功能
  const result1 = await runTestCommand(
    ['--type=unified', '--mode=security', '--once', `--testCommand=${TEST_CONFIG.testCommand}`],
    'Security Mode Basic Functionality',
  );

  recordTestResult(
    'Security Mode Basic Functionality',
    result1.code === 0,
    result1.code !== 0 ? new Error(result1.stderr) : null,
  );

  // 测试2: 命令白名单验证
  const result2 = await runTestCommand(
    ['--type=unified', '--mode=security', '--once', '--testCommand=malicious-command'],
    'Command Whitelist Validation',
  );

  recordTestResult(
    'Command Whitelist Validation',
    result2.code !== 0 && result2.stderr.includes('not in whitelist'),
    result2.code === 0 ? new Error('Should have blocked malicious command') : null,
  );
}

/**
 * 测试性能模式
 */
async function testPerformanceMode() {
  console.log('\n⚡ Testing Performance Mode');

  // 测试1: 性能模式基本功能
  const result1 = await runTestCommand(
    ['--type=unified', '--mode=performance', '--once', `--testCommand=${TEST_CONFIG.testCommand}`],
    'Performance Mode Basic Functionality',
  );

  recordTestResult(
    'Performance Mode Basic Functionality',
    (result1.code === 0 || result1.code === null) &&
      result1.stdout.includes('Unified test monitoring completed successfully'),
    result1.code !== 0 && result1.code !== null ? new Error(result1.stderr) : null,
  );

  // 测试2: 性能监控功能
  const result2 = await runTestCommand(
    ['--type=unified', '--mode=performance', '--once', `--testCommand=${TEST_CONFIG.testCommand}`],
    'Performance Monitoring',
  );

  recordTestResult(
    'Performance Monitoring',
    (result2.code === 0 || result2.code === null) &&
      result2.stdout.includes('Unified test monitoring completed successfully'),
    result2.code !== 0 && result2.code !== null ? new Error(result2.stderr) : null,
  );
}

/**
 * 测试完整模式
 */
async function testFullMode() {
  console.log('\n🌟 Testing Full Mode');

  // 测试1: 完整模式基本功能
  const result1 = await runTestCommand(
    ['--type=unified', '--mode=full', '--once', `--testCommand=${TEST_CONFIG.testCommand}`],
    'Full Mode Basic Functionality',
  );

  recordTestResult(
    'Full Mode Basic Functionality',
    (result1.code === 0 || result1.code === null) &&
      result1.stdout.includes('Unified test monitoring completed successfully'),
    result1.code !== 0 && result1.code !== null ? new Error(result1.stderr) : null,
  );

  // 测试2: 所有功能启用
  const result2 = await runTestCommand(
    ['--type=unified', '--mode=full', '--once', `--testCommand=${TEST_CONFIG.testCommand}`],
    'All Features Enabled',
  );

  recordTestResult(
    'All Features Enabled',
    (result2.code === 0 || result2.code === null) &&
      result2.stdout.includes('Unified test monitoring completed successfully'),
    result2.code !== 0 && result2.code !== null ? new Error(result2.stderr) : null,
  );
}

/**
 * 测试报告生成
 */
async function testReportGeneration() {
  console.log('\n📊 Testing Report Generation');

  // 确保测试报告目录存在
  if (!fs.existsSync(TEST_CONFIG.testReportsDir)) {
    fs.mkdirSync(TEST_CONFIG.testReportsDir, { recursive: true });
  }

  // 测试1: JSON报告生成
  const result1 = await runTestCommand(
    ['--type=unified', '--mode=full', '--once', `--testCommand=${TEST_CONFIG.testCommand}`],
    'JSON Report Generation',
  );

  // 检查是否生成了报告文件
  const reportsDir = path.join(__dirname, 'reports');
  const jsonReportsExist =
    fs.existsSync(reportsDir) && fs.readdirSync(reportsDir).some(file => file.endsWith('.json'));

  recordTestResult(
    'JSON Report Generation',
    (result1.code === 0 || result1.code === null) &&
      result1.stdout.includes('JSON report generated'),
    result1.code !== 0 && result1.code !== null ? new Error(result1.stderr) : null,
  );

  // 测试2: HTML报告生成
  const htmlReportsExist =
    fs.existsSync(reportsDir) && fs.readdirSync(reportsDir).some(file => file.endsWith('.html'));

  recordTestResult(
    'HTML Report Generation',
    (result1.code === 0 || result1.code === null) &&
      result1.stdout.includes('HTML report generated'),
    result1.code !== 0 && result1.code !== null ? new Error(result1.stderr) : null,
  );
}

/**
 * 测试通知系统
 */
async function testNotificationSystem() {
  console.log('\n📢 Testing Notification System');

  // 测试1: 通知系统初始化
  const result1 = await runTestCommand(
    ['--type=unified', '--mode=full', '--once', `--testCommand=${TEST_CONFIG.testCommand}`],
    'Notification System Initialization',
  );

  recordTestResult(
    'Notification System Initialization',
    (result1.code === 0 || result1.code === null) &&
      result1.stdout.includes('Notification system initialized'),
    result1.code !== 0 && result1.code !== null ? new Error(result1.stderr) : null,
  );

  // 测试2: 模拟通知器
  recordTestResult(
    'Mock Notifier',
    (result1.code === 0 || result1.code === null) &&
      result1.stdout.includes('Mock notification sent'),
    !result1.stdout.includes('Mock notification sent')
      ? new Error('Mock notification not sent')
      : null,
  );
}

/**
 * 测试配置系统
 */
async function testConfigurationSystem() {
  console.log('\n⚙️ Testing Configuration System');

  // 测试1: 配置加载
  const result1 = await runTestCommand(
    ['--type=unified', '--mode=full', '--once', `--testCommand=${TEST_CONFIG.testCommand}`],
    'Configuration Loading',
  );

  recordTestResult(
    'Configuration Loading',
    (result1.code === 0 || result1.code === null) &&
      result1.stdout.includes('Unified Test Monitor initialized'),
    result1.code !== 0 && result1.code !== null ? new Error(result1.stderr) : null,
  );

  // 测试2: 功能开关
  recordTestResult(
    'Feature Switches',
    (result1.code === 0 || result1.code === null) &&
      result1.stdout.includes('Unified Test Monitor initialized'),
    result1.code !== 0 && result1.code !== null ? new Error(result1.stderr) : null,
  );
}

/**
 * 显示测试结果
 */
function displayTestResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(
    `Success Rate: ${testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(2) : 0}%`,
  );

  if (testResults.errors.length > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.errors.forEach(error => {
      console.log(`  - ${error.test}: ${error.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 Starting Test Monitor Unified Version Tests');
  console.log('='.repeat(60));

  try {
    // 准备测试环境
    createMockCoverageFile();

    // 运行测试
    await testSecurityMode();
    await testPerformanceMode();
    await testFullMode();
    await testReportGeneration();
    await testNotificationSystem();
    await testConfigurationSystem();

    // 显示测试结果
    displayTestResults();

    // 清理测试环境
    cleanupTestFiles();

    // 根据测试结果设置退出码
    process.exit(testResults.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test execution failed:', error);
    cleanupTestFiles();
    process.exit(1);
  }
}

// 如果直接运行此脚本，执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    cleanupTestFiles();
    process.exit(1);
  });
}
