#!/usr/bin/env node

/**
 * 测试优化后的安全组件
 * 验证加密审计日志和安全扫描插件的功能
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

// 导入组件
const { EncryptedAuditLogger } = require('./encrypted-audit-logger.cjs');
const { SecurityScannerPlugin } = require('./security-scanner-plugin.cjs');

// 测试配置
const testConfig = {
  // 审计日志配置
  auditLog: {
    logDir: path.join(process.cwd(), '.test-audit-logs'),
    enableCompression: true,
    enableIntegrityCheck: true,
    rotation: {
      maxFileSize: 1024 * 1024, // 1MB
      maxFiles: 5,
      checkInterval: 5000 // 5秒
    }
  },
  
  // 安全扫描配置
  securityScan: {
    projectPath: process.cwd(),
    codeSecurity: {
      enabled: true,
      patterns: {
        dangerousFunctions: [
          /eval\s*\(/,
          /Function\s*\(/,
          /setTimeout\s*\(\s*["'`][^"'`]*["'`]/
        ],
        sensitiveData: [
          /password\s*[=:]\s*["'`][^"'`]{3,}["'`]/,
          /secret\s*[=:]\s*["'`][^"'`]{3,}["'`]/
        ]
      }
    },
    dependencySecurity: {
      enabled: true,
      checkVulnerabilities: true,
      checkLicenses: true
    },
    configSecurity: {
      enabled: true
    },
    networkSecurity: {
      enabled: true,
      checks: {
        openPorts: true,
        sslTls: true
      }
    }
  }
};

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
 * 测试加密审计日志
 */
async function testEncryptedAuditLogger() {
  log('\n🔐 测试加密审计日志...', colors.bright);
  
  try {
    // 清理测试目录
    cleanupTestDir(testConfig.auditLog.logDir);
    
    // 创建审计日志器
    const auditLogger = new EncryptedAuditLogger(testConfig.auditLog);
    
    // 监听事件
    auditLogger.on('audit-log', (data) => {
      log(`✅ 审计日志已记录: ${data.event.action}`, colors.green);
    });
    
    auditLogger.on('warning', (data) => {
      log(`⚠️  警告: ${data}`, colors.yellow);
    });
    
    // 测试记录不同类型的审计事件
    const testEvents = [
      {
        level: 'INFO',
        category: 'AUTH',
        action: 'USER_LOGIN',
        userId: 'test-user-123',
        sessionId: 'session-456',
        details: { ip: '192.168.1.100', userAgent: 'Mozilla/5.0' }
      },
      {
        level: 'WARN',
        category: 'SECURITY',
        action: 'FAILED_LOGIN',
        userId: 'test-user-123',
        details: { reason: 'invalid_password', attempts: 3 }
      },
      {
        level: 'ERROR',
        category: 'SYSTEM',
        action: 'DATABASE_ERROR',
        details: { error: 'Connection timeout', code: 'ETIMEDOUT' }
      },
      {
        level: 'CRITICAL',
        category: 'SECURITY',
        action: 'SUSPICIOUS_ACTIVITY',
        userId: 'test-user-123',
        details: { activity: 'multiple_failed_logins', count: 5 }
      }
    ];
    
    // 记录测试事件
    for (const event of testEvents) {
      await auditLogger.logAuditEvent(event);
      await sleep(100); // 等待写入完成
    }
    
    // 等待写入完成
    await sleep(1000);
    
    // 获取统计信息
    const stats = auditLogger.getStats();
    log(`📊 审计日志统计:`, colors.cyan);
    log(`  总日志数: ${stats.totalLogs}`, colors.cyan);
    log(`  加密日志数: ${stats.encryptedLogs}`, colors.cyan);
    log(`  压缩日志数: ${stats.compressedLogs}`, colors.cyan);
    log(`  完整性检查数: ${stats.integrityChecks}`, colors.cyan);
    log(`  完整性失败数: ${stats.integrityFailures}`, colors.cyan);
    
    // 测试读取日志
    log('\n📖 测试读取加密日志...', colors.bright);
    const logFiles = fs.readdirSync(testConfig.auditLog.logDir)
      .filter(file => file.endsWith('.audit'));
    
    if (logFiles.length > 0) {
      const logFile = path.join(testConfig.auditLog.logDir, logFiles[0]);
      const logs = await auditLogger.readAuditLogs(logFile);
      
      log(`✅ 成功读取 ${logs.length} 条日志`, colors.green);
      
      if (logs.length > 0) {
        log(`📝 示例日志:`, colors.cyan);
        log(`  时间戳: ${logs[0].timestamp}`, colors.cyan);
        log(`  级别: ${logs[0].level}`, colors.cyan);
        log(`  类别: ${logs[0].category}`, colors.cyan);
        log(`  动作: ${logs[0].action}`, colors.cyan);
      }
    }
    
    // 销毁审计日志器
    await auditLogger.destroy();
    
    // 清理测试目录
    cleanupTestDir(testConfig.auditLog.logDir);
    
    log('✅ 加密审计日志测试完成', colors.green);
    return true;
    
  } catch (error) {
    log(`❌ 加密审计日志测试失败: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * 测试安全扫描插件
 */
async function testSecurityScannerPlugin() {
  log('\n🔍 测试安全扫描插件...', colors.bright);
  
  try {
    // 创建安全扫描器
    const securityScanner = new SecurityScannerPlugin(testConfig.securityScan);
    
    // 监听事件
    securityScanner.on('scan-progress', (data) => {
      log(`🔄 扫描进度: ${data.phase} - ${data.status}`, colors.blue);
    });
    
    securityScanner.on('warning', (data) => {
      log(`⚠️  警告: ${data}`, colors.yellow);
    });
    
    // 执行扫描
    log('🚀 开始执行安全扫描...', colors.bright);
    const scanResults = await securityScanner.runFullScan();
    
    // 显示扫描结果
    log(`\n📊 扫描结果摘要:`, colors.cyan);
    log(`  扫描时间: ${scanResults.scanTime.duration}ms`, colors.cyan);
    log(`  总问题数: ${scanResults.summary.total}`, colors.cyan);
    log(`  严重问题: ${scanResults.summary.critical}`, colors.cyan);
    log(`  高危问题: ${scanResults.summary.high}`, colors.cyan);
    log(`  中危问题: ${scanResults.summary.medium}`, colors.cyan);
    log(`  低危问题: ${scanResults.summary.low}`, colors.cyan);
    log(`  风险分数: ${scanResults.summary.riskScore}/100`, colors.cyan);
    
    // 显示各类别问题
    for (const [category, result] of Object.entries(scanResults.results)) {
      if (result.issues.length > 0) {
        log(`\n📋 ${category} 问题:`, colors.magenta);
        
        // 只显示前3个问题作为示例
        result.issues.slice(0, 3).forEach((issue, index) => {
          log(`  ${index + 1}. [${issue.severity}] ${issue.description}`, colors.magenta);
          log(`     文件: ${issue.file}`, colors.magenta);
          log(`     建议: ${issue.recommendation}`, colors.magenta);
        });
        
        if (result.issues.length > 3) {
          log(`  ... 还有 ${result.issues.length - 3} 个问题`, colors.magenta);
        }
      }
    }
    
    // 显示建议
    if (scanResults.recommendations.length > 0) {
      log(`\n💡 安全建议:`, colors.yellow);
      scanResults.recommendations.forEach((rec, index) => {
        log(`  ${index + 1}. ${rec}`, colors.yellow);
      });
    }
    
    log('✅ 安全扫描插件测试完成', colors.green);
    return true;
    
  } catch (error) {
    log(`❌ 安全扫描插件测试失败: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  log('🚀 测试优化后的安全组件', colors.bright);
  
  try {
    // 测试加密审计日志
    const auditLogSuccess = await testEncryptedAuditLogger();
    
    // 测试安全扫描插件
    const securityScanSuccess = await testSecurityScannerPlugin();
    
    // 判断测试结果
    if (auditLogSuccess && securityScanSuccess) {
      log('\n✅ 所有测试通过！', colors.green);
      process.exit(0);
    } else {
      log('\n❌ 部分测试失败', colors.red);
      process.exit(1);
    }
    
  } catch (error) {
    log(`\n❌ 测试执行失败: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  testEncryptedAuditLogger,
  testSecurityScannerPlugin
};