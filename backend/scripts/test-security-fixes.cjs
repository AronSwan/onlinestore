#!/usr/bin/env node

/**
 * 测试安全组件修复
 * 验证加密审计日志和安全扫描插件的修复
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

// 导入组件
const { EncryptedAuditLogger } = require('./encrypted-audit-logger.cjs');
const { SecurityScannerPlugin } = require('./security-scanner-plugin.cjs');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * 清理测试目录
 */
function cleanupTestDir(dir) {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch (error) {
    log(`⚠️  清理测试目录失败: ${error.message}`, colors.yellow);
  }
}

/**
 * 测试加密审计日志修复
 */
async function testEncryptedAuditLoggerFix() {
  log('\n🔐 测试加密审计日志修复...', colors.bright);
  
  try {
    // 清理测试目录
    const testLogDir = path.join(process.cwd(), '.test-audit-logs-fix');
    cleanupTestDir(testLogDir);
    
    // 创建审计日志器
    const auditLogger = new EncryptedAuditLogger({
      logDir: testLogDir,
      enableCompression: false, // 简化测试
      enableIntegrityCheck: false, // 简化测试
      rotation: {
        maxFileSize: 1024 * 1024,
        maxFiles: 3,
        checkInterval: 5000
      }
    });
    
    // 监听事件
    auditLogger.on('audit-log', (data) => {
      log(`✅ 审计日志已记录: ${data.event.action}`, colors.green);
    });
    
    auditLogger.on('warning', (data) => {
      log(`⚠️  警告: ${data}`, colors.yellow);
    });
    
    auditLogger.on('error', (error) => {
      log(`❌ 错误: ${error.message}`, colors.red);
    });
    
    // 测试记录一个简单的审计事件
    const testEvent = {
      level: 'INFO',
      category: 'TEST',
      action: 'TEST_ENCRYPTION',
      userId: 'test-user-123',
      details: { test: true, timestamp: Date.now() }
    };
    
    log('📝 记录测试事件...', colors.blue);
    await auditLogger.logAuditEvent(testEvent);
    
    // 等待写入完成
    await sleep(1000);
    
    // 获取统计信息
    const stats = auditLogger.getStats();
    log(`📊 审计日志统计:`, colors.cyan);
    log(`  总日志数: ${stats.totalLogs}`, colors.cyan);
    log(`  加密日志数: ${stats.encryptedLogs}`, colors.cyan);
    log(`  完整性检查数: ${stats.integrityChecks}`, colors.cyan);
    log(`  完整性失败数: ${stats.integrityFailures}`, colors.cyan);
    
    // 销毁审计日志器
    await auditLogger.destroy();
    
    // 清理测试目录
    cleanupTestDir(testLogDir);
    
    log('✅ 加密审计日志修复测试完成', colors.green);
    return true;
    
  } catch (error) {
    log(`❌ 加密审计日志修复测试失败: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * 测试安全扫描插件修复
 */
async function testSecurityScannerPluginFix() {
  log('\n🔍 测试安全扫描插件修复...', colors.bright);
  
  try {
    // 创建安全扫描器
    const securityScanner = new SecurityScannerPlugin({
      projectPath: process.cwd(),
      codeSecurity: {
        enabled: true,
        patterns: {
          dangerousFunctions: [
            /eval\s*\(/,
            /Function\s*\(/
          ],
          sensitiveData: [
            /password\s*[=:]\s*["'`][^"'`]{3,}["'`]/
          ]
        },
        excludedFiles: [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**'
        ]
      },
      dependencySecurity: {
        enabled: false // 简化测试
      },
      configSecurity: {
        enabled: true,
        checks: {
          filePermissions: {
            maxReadableByOthers: ['*.key', '*.pem'],
            maxWritableByOthers: ['*.json', '*.env']
          },
          insecureConfigs: [
            { file: 'package.json', pattern: /"scripts":\s*{\s*["'`]preinstall["'`]/, severity: 'HIGH' }
          ]
        }
      },
      networkSecurity: {
        enabled: false // 简化测试
      }
    });
    
    // 监听事件
    securityScanner.on('scan-progress', (data) => {
      log(`🔄 扫描进度: ${data.phase} - ${data.status}`, colors.blue);
    });
    
    securityScanner.on('warning', (data) => {
      log(`⚠️  警告: ${data}`, colors.yellow);
    });
    
    // 只执行代码安全扫描
    log('🚀 开始执行代码安全扫描...', colors.bright);
    await securityScanner.scanCodeSecurity(process.cwd());
    
    // 获取扫描结果
    const codeSecurityResults = securityScanner.scanResults.codeSecurity;
    
    log(`\n📊 代码安全扫描结果:`, colors.cyan);
    log(`  总问题数: ${codeSecurityResults.summary.total}`, colors.cyan);
    log(`  严重问题: ${codeSecurityResults.summary.critical}`, colors.cyan);
    log(`  高危问题: ${codeSecurityResults.summary.high}`, colors.cyan);
    log(`  中危问题: ${codeSecurityResults.summary.medium}`, colors.cyan);
    log(`  低危问题: ${codeSecurityResults.summary.low}`, colors.cyan);
    
    // 显示前3个问题
    if (codeSecurityResults.issues.length > 0) {
      log(`\n📋 发现的问题:`, colors.magenta);
      codeSecurityResults.issues.slice(0, 3).forEach((issue, index) => {
        log(`  ${index + 1}. [${issue.severity}] ${issue.description}`, colors.magenta);
        log(`     文件: ${issue.file}`, colors.magenta);
      });
    }
    
    log('✅ 安全扫描插件修复测试完成', colors.green);
    return true;
    
  } catch (error) {
    log(`❌ 安全扫描插件修复测试失败: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  log('🚀 测试安全组件修复', colors.bright);
  
  try {
    // 测试加密审计日志修复
    const auditLogSuccess = await testEncryptedAuditLoggerFix();
    
    // 测试安全扫描插件修复
    const securityScanSuccess = await testSecurityScannerPluginFix();
    
    // 判断测试结果
    if (auditLogSuccess && securityScanSuccess) {
      log('\n✅ 所有修复测试通过！', colors.green);
      process.exit(0);
    } else {
      log('\n❌ 部分修复测试失败', colors.red);
      process.exit(1);
    }
    
  } catch (error) {
    log(`\n❌ 修复测试执行失败: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  testEncryptedAuditLoggerFix,
  testSecurityScannerPluginFix
};