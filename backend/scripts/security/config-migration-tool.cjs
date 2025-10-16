#!/usr/bin/env node

/**
 * 配置迁移工具
 * 
 * 帮助用户从旧的安全配置迁移到新的安全配置
 * 
 * @author 后端开发团队
 * @version 1.0.0
 * @since 2025-10-13
 */

const fs = require('fs');
const path = require('path');

/**
 * 默认的新配置
 */
const DEFAULT_NEW_CONFIG = {
  security: {
    version: "2.0.0",
    userValidation: {
      enabled: true,
      strictMode: false,
      allowedUsers: [
        "test-monitor",
        "ci",
        "jenkins",
        "gitlab-runner",
        "github-runner",
        "node"
      ],
      allowedGroups: [
        "test-monitor",
        "ci",
        "jenkins",
        "gitlab-runner",
        "github-runner",
        "node",
        "docker",
        "Users"
      ],
      forbiddenUsers: [
        "root",
        "Administrator"
      ],
      privilegedUsers: [
        "root",
        "Administrator"
      ],
      forbidPrivilegedUsers: false,
      checkGroups: true
    },
    testValidation: {
      enabled: true,
      defaultImpactLevel: "medium",
      requireIsolation: {
        low: false,
        medium: true,
        high: true
      },
      logActivities: true,
      maxLogEntries: 1000,
      auditLogPath: "./reports/test-audit-log.json"
    },
    encryption: {
      enabled: true,
      algorithm: "aes-256-gcm",
      keyDerivation: "pbkdf2",
      iterations: 100000
    },
    signatureVerification: {
      enabled: true,
      algorithm: "rsa-sha256",
      keySize: 2048
    },
    logSanitization: {
      enabled: true,
      patterns: [
        {
          name: "password",
          pattern: "password\\s*=\\s*[\"'][^\"']+[\"']",
          replacement: "password=\"***\""
        },
        {
          name: "api_key",
          pattern: "api_key\\s*=\\s*[\"'][^\"']+[\"']",
          replacement: "api_key=\"***\""
        },
        {
          name: "token",
          pattern: "token\\s*=\\s*[\"'][^\"']+[\"']",
          replacement: "token=\"***\""
        },
        {
          name: "path",
          pattern: "(/Users/[^/]+|/home/[^/]+|C:\\\\\\\\Users\\\\\\\\[^\\\\\\\\]+)",
          replacement: "$1***"
        }
      ]
    }
  },
  features: {
    security: {
      enabled: true,
      pathValidation: true,
      signatureVerification: true,
      encryption: true,
      userValidation: true,
      testValidation: true,
      logSanitization: true
    },
    performance: {
      enabled: false
    },
    notifications: {
      enabled: false
    },
    reports: {
      enabled: true,
      html: false,
      json: true
    }
  },
  logging: {
    level: "INFO",
    format: "json",
    file: "./logs/test-monitor.log",
    maxFileSize: "10MB",
    maxFiles: 5
  }
};

/**
 * 迁移旧配置到新配置
 */
function migrateConfig(oldConfig) {
  // 创建新配置的深拷贝
  const newConfig = JSON.parse(JSON.stringify(DEFAULT_NEW_CONFIG));
  
  // 迁移用户验证配置
  if (oldConfig.security && oldConfig.security.userValidation) {
    const oldUserValidation = oldConfig.security.userValidation;
    
    // 保留用户验证设置
    if (oldUserValidation.enabled !== undefined) {
      newConfig.security.userValidation.enabled = oldUserValidation.enabled;
    }
    
    if (oldUserValidation.strictMode !== undefined) {
      newConfig.security.userValidation.strictMode = oldUserValidation.strictMode;
    }
    
    if (oldUserValidation.allowedUsers && Array.isArray(oldUserValidation.allowedUsers)) {
      newConfig.security.userValidation.allowedUsers = oldUserValidation.allowedUsers;
    }
    
    if (oldUserValidation.allowedGroups && Array.isArray(oldUserValidation.allowedGroups)) {
      newConfig.security.userValidation.allowedGroups = oldUserValidation.allowedGroups;
    }
    
    if (oldUserValidation.forbiddenUsers && Array.isArray(oldUserValidation.forbiddenUsers)) {
      newConfig.security.userValidation.forbiddenUsers = oldUserValidation.forbiddenUsers;
    }
    
    if (oldUserValidation.checkGroups !== undefined) {
      newConfig.security.userValidation.checkGroups = oldUserValidation.checkGroups;
    }
  }
  
  // 迁移加密配置
  if (oldConfig.security && oldConfig.security.encryption) {
    const oldEncryption = oldConfig.security.encryption;
    
    if (oldEncryption.enabled !== undefined) {
      newConfig.security.encryption.enabled = oldEncryption.enabled;
    }
    
    if (oldEncryption.password) {
      // 注意：在实际应用中，应该使用更安全的方式处理密码
      newConfig.security.encryption.password = oldEncryption.password;
    }
  }
  
  // 迁移签名验证配置
  if (oldConfig.security && oldConfig.security.enableSignatureVerification !== undefined) {
    newConfig.security.signatureVerification.enabled = oldConfig.security.enableSignatureVerification;
  }
  
  if (oldConfig.security && oldConfig.security.publicKeyPath) {
    newConfig.security.signatureVerification.publicKeyPath = oldConfig.security.publicKeyPath;
  }
  
  // 迁移日志脱敏配置
  if (oldConfig.security && oldConfig.security.logSanitization !== undefined) {
    newConfig.security.logSanitization.enabled = oldConfig.security.logSanitization;
  }
  
  // 迁移功能配置
  if (oldConfig.features) {
    if (oldConfig.features.security) {
      const oldSecurity = oldConfig.features.security;
      
      if (oldSecurity.enabled !== undefined) {
        newConfig.features.security.enabled = oldSecurity.enabled;
      }
      
      if (oldSecurity.pathValidation !== undefined) {
        newConfig.features.security.pathValidation = oldSecurity.pathValidation;
      }
      
      if (oldSecurity.signatureVerification !== undefined) {
        newConfig.features.security.signatureVerification = oldSecurity.signatureVerification;
      }
      
      if (oldSecurity.encryption !== undefined) {
        newConfig.features.security.encryption = oldSecurity.encryption;
      }
      
      if (oldSecurity.userValidation !== undefined) {
        newConfig.features.security.userValidation = oldSecurity.userValidation;
      }
    }
    
    if (oldConfig.features.performance) {
      const oldPerformance = oldConfig.features.performance;
      
      if (oldPerformance.enabled !== undefined) {
        newConfig.features.performance.enabled = oldPerformance.enabled;
      }
    }
    
    if (oldConfig.features.notifications) {
      const oldNotifications = oldConfig.features.notifications;
      
      if (oldNotifications.enabled !== undefined) {
        newConfig.features.notifications.enabled = oldNotifications.enabled;
      }
    }
    
    if (oldConfig.features.reports) {
      const oldReports = oldConfig.features.reports;
      
      if (oldReports.enabled !== undefined) {
        newConfig.features.reports.enabled = oldReports.enabled;
      }
      
      if (oldReports.html !== undefined) {
        newConfig.features.reports.html = oldReports.html;
      }
      
      if (oldReports.json !== undefined) {
        newConfig.features.reports.json = oldReports.json;
      }
    }
  }
  
  // 迁移日志配置
  if (oldConfig.logLevel) {
    newConfig.logging.level = oldConfig.logLevel;
  }
  
  return newConfig;
}

/**
 * 生成迁移报告
 */
function generateMigrationReport(oldConfig, newConfig, outputPath) {
  const report = {
    timestamp: new Date().toISOString(),
    oldVersion: oldConfig.security?.version || "1.0.0",
    newVersion: newConfig.security.version,
    changes: [],
    summary: {
      totalChanges: 0,
      breakingChanges: 0,
      newFeatures: 0,
      deprecatedFeatures: 0
    }
  };
  
  // 检查新增的配置项
  if (!oldConfig.security?.testValidation && newConfig.security.testValidation) {
    report.changes.push({
      type: "new_feature",
      path: "security.testValidation",
      description: "新增测试验证配置",
      impact: "medium"
    });
    report.summary.newFeatures++;
    report.summary.totalChanges++;
  }
  
  // 检查配置结构变化
  if (oldConfig.security?.userValidation && !oldConfig.security.userValidation.privilegedUsers) {
    report.changes.push({
      type: "breaking_change",
      path: "security.userValidation.privilegedUsers",
      description: "新增特权用户列表，与禁止用户列表分离",
      impact: "low"
    });
    report.summary.breakingChanges++;
    report.summary.totalChanges++;
  }
  
  if (oldConfig.security?.userValidation && oldConfig.security.userValidation.forbidPrivilegedUsers === undefined) {
    report.changes.push({
      type: "new_feature",
      path: "security.userValidation.forbidPrivilegedUsers",
      description: "新增特权用户限制选项",
      impact: "low"
    });
    report.summary.newFeatures++;
    report.summary.totalChanges++;
  }
  
  // 写入报告
  try {
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    return outputPath;
  } catch (error) {
    console.error(`Failed to write migration report: ${error.message}`);
    return null;
  }
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('用法: node config-migration-tool.cjs <旧配置文件路径> <新配置文件路径> [报告文件路径]');
    console.log('');
    console.log('示例:');
    console.log('  node config-migration-tool.cjs old-config.json new-config.json migration-report.json');
    process.exit(1);
  }
  
  const oldConfigPath = args[0];
  const newConfigPath = args[1];
  const reportPath = args[2] || path.join(path.dirname(newConfigPath), 'migration-report.json');
  
  try {
    // 检查旧配置文件是否存在
    if (!fs.existsSync(oldConfigPath)) {
      console.error(`错误: 旧配置文件不存在: ${oldConfigPath}`);
      process.exit(1);
    }
    
    // 读取旧配置
    const oldConfigData = fs.readFileSync(oldConfigPath, 'utf8');
    const oldConfig = JSON.parse(oldConfigData);
    
    console.log(`成功读取旧配置文件: ${oldConfigPath}`);
    
    // 迁移配置
    const newConfig = migrateConfig(oldConfig);
    
    console.log('配置迁移完成');
    
    // 创建目录（如果不存在）
    const newConfigDir = path.dirname(newConfigPath);
    if (!fs.existsSync(newConfigDir)) {
      fs.mkdirSync(newConfigDir, { recursive: true });
    }
    
    // 写入新配置
    fs.writeFileSync(newConfigPath, JSON.stringify(newConfig, null, 2));
    
    console.log(`新配置文件已写入: ${newConfigPath}`);
    
    // 生成迁移报告
    const reportPathGenerated = generateMigrationReport(oldConfig, newConfig, reportPath);
    
    if (reportPathGenerated) {
      console.log(`迁移报告已生成: ${reportPathGenerated}`);
    }
    
    console.log('\n迁移完成！');
    console.log('请检查新配置文件，并根据需要调整设置。');
    
  } catch (error) {
    console.error(`迁移失败: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本，执行主函数
if (require.main === module) {
  main();
}

module.exports = {
  migrateConfig,
  generateMigrationReport,
  DEFAULT_NEW_CONFIG
};