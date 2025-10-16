#!/usr/bin/env node

/**
 * 安全功能性能测试脚本
 * 
 * 测试安全功能对性能的影响
 * 
 * @author 后端开发团队
 * @version 1.0.0
 * @since 2025-10-13
 */

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// 导入安全模块
const {
  validateTestRun,
  provideSecurityRecommendations,
  checkEnvironmentIsolation,
  assessTestImpact
} = require('./redesigned-user-validation.js');

const { 
  generateKey, 
  encryptData, 
  decryptData, 
  encryptConfigFile, 
  decryptConfigFile, 
  readConfigFile, 
  isConfigFileEncrypted 
} = require('./config-encryption');

const { 
  generateKeyPair, 
  signFile, 
  verifyFileSignature, 
  signConfigFile, 
  verifyConfigFileSignature 
} = require('./signature-verification');

// 导入Test Monitor
const { UnifiedTestMonitor } = require('../test-monitor.cjs');

// 测试配置
const TEST_CONFIG = {
  testDir: path.join(__dirname, 'test-security-performance'),
  configDir: path.join(__dirname, 'test-security-performance', 'config'),
  keysDir: path.join(__dirname, 'test-security-performance', 'keys'),
  testConfigFile: path.join(__dirname, 'test-security-performance', 'config', 'test-config.json'),
  encryptedConfigFile: path.join(__dirname, 'test-security-performance', 'config', 'test-config.encrypted.json'),
  publicKeyFile: path.join(__dirname, 'test-security-performance', 'keys', 'public.pem'),
  privateKeyFile: path.join(__dirname, 'test-security-performance', 'keys', 'private.pem'),
  signatureFile: path.join(__dirname, 'test-security-performance', 'config', 'test-config.json.sig')
};

// 测试结果
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

/**
 * 记录测试结果
 */
function recordTestResult(testName, passed, message, metrics = {}) {
  const result = {
    name: testName,
    passed,
    message,
    timestamp: new Date().toISOString(),
    metrics
  };
  
  testResults.details.push(result);
  testResults.total++;
  
  if (passed) {
    testResults.passed++;
    console.log(`✅ [${testName}] ${message}`);
  } else {
    testResults.failed++;
    console.log(`❌ [${testName}] ${message}`);
  }
}

/**
 * 准备测试环境
 */
function setupTestEnvironment() {
  try {
    // 创建测试目录
    if (!fs.existsSync(TEST_CONFIG.testDir)) {
      fs.mkdirSync(TEST_CONFIG.testDir, { recursive: true });
    }
    
    if (!fs.existsSync(TEST_CONFIG.configDir)) {
      fs.mkdirSync(TEST_CONFIG.configDir, { recursive: true });
    }
    
    if (!fs.existsSync(TEST_CONFIG.keysDir)) {
      fs.mkdirSync(TEST_CONFIG.keysDir, { recursive: true });
    }
    
    // 创建测试配置文件
    const testConfig = {
      testCommand: process.platform === 'win32' ? 'cmd /c echo "test"' : 'echo "test"',
      coverageFile: path.join(TEST_CONFIG.testDir, 'coverage.json'),
      targetCoverage: 80,
      logLevel: 'INFO'
    };
    
    fs.writeFileSync(TEST_CONFIG.testConfigFile, JSON.stringify(testConfig, null, 2));
    
    return true;
  } catch (error) {
    console.error(`Failed to setup test environment: ${error.message}`);
    return false;
  }
}

/**
 * 清理测试环境
 */
function cleanupTestEnvironment() {
  try {
    // 删除测试目录
    if (fs.existsSync(TEST_CONFIG.testDir)) {
      fs.rmSync(TEST_CONFIG.testDir, { recursive: true, force: true });
    }
    
    return true;
  } catch (error) {
    console.error(`Failed to cleanup test environment: ${error.message}`);
    return false;
  }
}

/**
 * 测试用户验证性能
 */
function testUserValidationPerformance() {
  console.log('\n=== 测试用户验证性能 ===');
  
  try {
    const iterations = 100;
    const results = [];
    const os = require('os');
    
    // 测试获取当前用户
    const startGetCurrentUser = performance.now();
    for (let i = 0; i < iterations; i++) {
      os.userInfo();
    }
    const endGetCurrentUser = performance.now();
    const getCurrentUserTime = (endGetCurrentUser - startGetCurrentUser) / iterations;
    results.push({ operation: 'getCurrentUser', time: getCurrentUserTime });
    
    // 测试用户验证
    const currentUser = os.userInfo();
    const startValidateUser = performance.now();
    for (let i = 0; i < iterations; i++) {
      // 使用redesigned-user-validation.js，但禁用安全建议输出
      const originalLog = console.log;
      console.log = () => {}; // 临时禁用console.log
      try {
        validateTestRun({
          type: 'integration',
          name: '性能测试',
          description: '测试用户验证性能',
          showRecommendations: false
        }, currentUser);
      } finally {
        console.log = originalLog; // 恢复console.log
      }
    }
    const endValidateUser = performance.now();
    const validateUserTime = (endValidateUser - startValidateUser) / iterations;
    results.push({ operation: 'validateTestRun', time: validateUserTime });
    
    // 记录结果
    const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
    const maxTime = Math.max(...results.map(r => r.time));
    
    recordTestResult('用户验证性能', true,
      `平均时间: ${avgTime.toFixed(3)}ms, 最大时间: ${maxTime.toFixed(3)}ms`,
      { avgTime, maxTime, iterations, results });
    
    return true;
  } catch (error) {
    recordTestResult('用户验证性能', false, `错误: ${error.message}`);
    return false;
  }
}

/**
 * 测试加密性能
 */
function testEncryptionPerformance() {
  console.log('\n=== 测试加密性能 ===');
  
  try {
    const iterations = 50;
    const testData = { test: 'data', value: 123 };
    const key = generateKey();
    const results = [];
    
    // 测试数据加密
    const startEncrypt = performance.now();
    for (let i = 0; i < iterations; i++) {
      encryptData(testData, key);
    }
    const endEncrypt = performance.now();
    const encryptTime = (endEncrypt - startEncrypt) / iterations;
    results.push({ operation: 'encryptData', time: encryptTime });
    
    // 测试数据解密
    const encryptedData = encryptData(testData, key);
    const startDecrypt = performance.now();
    for (let i = 0; i < iterations; i++) {
      decryptData(encryptedData, key);
    }
    const endDecrypt = performance.now();
    const decryptTime = (endDecrypt - startDecrypt) / iterations;
    results.push({ operation: 'decryptData', time: decryptTime });
    
    // 记录结果
    const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
    const maxTime = Math.max(...results.map(r => r.time));
    
    recordTestResult('加密性能', true, 
      `平均时间: ${avgTime.toFixed(3)}ms, 最大时间: ${maxTime.toFixed(3)}ms`,
      { avgTime, maxTime, iterations, results });
    
    return true;
  } catch (error) {
    recordTestResult('加密性能', false, `错误: ${error.message}`);
    return false;
  }
}

/**
 * 测试签名验证性能
 */
function testSignaturePerformance() {
  console.log('\n=== 测试签名验证性能 ===');
  
  try {
    const iterations = 50;
    const results = [];
    
    // 确保测试目录存在
    if (!fs.existsSync(TEST_CONFIG.keysDir)) {
      fs.mkdirSync(TEST_CONFIG.keysDir, { recursive: true });
    }
    
    // 生成密钥对
    const { publicKey, privateKey } = generateKeyPair();
    
    // 保存密钥对
    fs.writeFileSync(TEST_CONFIG.publicKeyFile, publicKey);
    fs.writeFileSync(TEST_CONFIG.privateKeyFile, privateKey);
    
    // 签名配置文件
    signConfigFile(TEST_CONFIG.testConfigFile, TEST_CONFIG.privateKeyFile, TEST_CONFIG.signatureFile);
    
    // 测试签名验证
    const startVerify = performance.now();
    for (let i = 0; i < iterations; i++) {
      verifyConfigFileSignature(TEST_CONFIG.testConfigFile, TEST_CONFIG.publicKeyFile, TEST_CONFIG.signatureFile);
    }
    const endVerify = performance.now();
    const verifyTime = (endVerify - startVerify) / iterations;
    results.push({ operation: 'verifyConfigFileSignature', time: verifyTime });
    
    // 记录结果
    const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
    const maxTime = Math.max(...results.map(r => r.time));
    
    recordTestResult('签名验证性能', true,
      `平均时间: ${avgTime.toFixed(3)}ms, 最大时间: ${maxTime.toFixed(3)}ms`,
      { avgTime, maxTime, iterations, results });
    
    return true;
  } catch (error) {
    recordTestResult('签名验证性能', false, `错误: ${error.message}`);
    return false;
  }
}

/**
 * 测试Test Monitor性能
 */
async function testTestMonitorPerformance() {
  console.log('\n=== 测试Test Monitor性能 ===');
  
  try {
    const iterations = 5;
    const results = [];
    
    // 确保测试目录存在
    if (!fs.existsSync(TEST_CONFIG.keysDir)) {
      fs.mkdirSync(TEST_CONFIG.keysDir, { recursive: true });
    }
    
    // 保存密钥对
    const { publicKey, privateKey } = generateKeyPair();
    fs.writeFileSync(TEST_CONFIG.publicKeyFile, publicKey);
    fs.writeFileSync(TEST_CONFIG.privateKeyFile, privateKey);
    
    // 签名配置文件
    signConfigFile(TEST_CONFIG.testConfigFile, TEST_CONFIG.privateKeyFile, TEST_CONFIG.signatureFile);
    
    // 创建Test Monitor实例
    const monitorConfig = {
      testCommand: process.platform === 'win32' ? 'cmd /c echo "test"' : 'echo "test"',
      configFile: TEST_CONFIG.testConfigFile,
      logLevel: 'ERROR', // 减少日志输出
      features: {
        security: {
          enabled: true,
          pathValidation: true,
          signatureVerification: true,
          encryption: true,
          userValidation: true
        },
        performance: {
          enabled: false
        },
        notifications: {
          enabled: false
        },
        reports: {
          enabled: false
        },
        config: {
          hotReload: false
        }
      },
      security: {
        commandWhitelist: ['echo', 'cmd'],
        encryption: {
          enabled: true,
          password: 'test-password-123'
        },
        userValidation: {
          enabled: true,
          strictMode: false,
          allowedUsers: [require('os').userInfo().username],
          forbiddenUsers: []
        },
        enableSignatureVerification: true,
        publicKeyPath: TEST_CONFIG.publicKeyFile,
        signaturePath: TEST_CONFIG.signatureFile
      }
    };
    
    // 测试Test Monitor初始化
    const startInit = performance.now();
    for (let i = 0; i < iterations; i++) {
      new UnifiedTestMonitor(monitorConfig);
    }
    const endInit = performance.now();
    const initTime = (endInit - startInit) / iterations;
    results.push({ operation: 'init', time: initTime });
    
    // 测试Test Monitor运行
    const monitor = new UnifiedTestMonitor(monitorConfig);
    const startRun = performance.now();
    for (let i = 0; i < iterations; i++) {
      try {
        await monitor.runTest();
      } catch (error) {
        // 忽略错误，只关注性能
      }
    }
    const endRun = performance.now();
    const runTime = (endRun - startRun) / iterations;
    results.push({ operation: 'run', time: runTime });
    
    // 记录结果
    const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
    const maxTime = Math.max(...results.map(r => r.time));
    
    recordTestResult('Test Monitor性能', true, 
      `平均时间: ${avgTime.toFixed(3)}ms, 最大时间: ${maxTime.toFixed(3)}ms`,
      { avgTime, maxTime, iterations, results });
    
    return true;
  } catch (error) {
    recordTestResult('Test Monitor性能', false, `错误: ${error.message}`);
    return false;
  }
}

/**
 * 生成性能测试报告
 */
function generatePerformanceReport() {
  const reportPath = path.join(__dirname, 'security-performance-report.json');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      passRate: ((testResults.passed / testResults.total) * 100).toFixed(2) + '%'
    },
    details: testResults.details
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n性能测试报告已生成: ${reportPath}`);
  
  return reportPath;
}

/**
 * 主函数
 */
async function main() {
  console.log('安全功能性能测试开始...\n');
  
  // 设置测试环境
  const setupSuccess = setupTestEnvironment();
  if (!setupSuccess) {
    console.error('测试环境设置失败，退出测试');
    process.exit(1);
  }
  
  try {
    // 运行性能测试
    testUserValidationPerformance();
    testEncryptionPerformance();
    testSignaturePerformance();
    await testTestMonitorPerformance();
    
    // 生成性能测试报告
    const reportPath = generatePerformanceReport();
    
    // 输出测试结果摘要
    console.log('\n=== 性能测试结果摘要 ===');
    console.log(`总测试数: ${testResults.total}`);
    console.log(`通过: ${testResults.passed}`);
    console.log(`失败: ${testResults.failed}`);
    console.log(`通过率: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
    
    // 输出性能指标摘要
    console.log('\n=== 性能指标摘要 ===');
    testResults.details.forEach(result => {
      if (result.metrics && result.metrics.avgTime) {
        console.log(`${result.name}: 平均 ${result.metrics.avgTime.toFixed(3)}ms`);
      }
    });
    
    // 如果有失败的测试，退出码为1
    if (testResults.failed > 0) {
      console.log('\n存在失败的测试，请检查性能测试报告获取详细信息');
      process.exit(1);
    } else {
      console.log('\n所有性能测试通过！');
      process.exit(0);
    }
  } finally {
    // 清理测试环境
    cleanupTestEnvironment();
  }
}

// 如果直接运行此脚本，执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('性能测试执行出错:', error);
    process.exit(1);
  });
}