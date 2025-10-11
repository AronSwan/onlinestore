#!/usr/bin/env node

/**
 * 📋 配置验证脚本
 *
 * 功能：
 * - 验证环境变量配置
 * - 检查配置文件一致性
 * - 生成配置报告
 *
 * 使用方法：
 * npm run config:validate
 * npm run config:test
 * npm run config:prod
 */

const fs = require('fs');
const path = require('path');

class ConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.env = process.env.NODE_ENV || 'development';
  }

  // 必需的环境变量
  getRequiredEnvVars() {
    const base = [
      'NODE_ENV',
      'PORT',
      'DB_TYPE',
      'DB_DATABASE',
      'REDIS_HOST',
      'REDIS_PORT',
      'JWT_SECRET',
      'ENCRYPTION_KEY',
    ];

    const conditional = {
      mysql: ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD'],
      tidb: ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD'],
      postgres: ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD'],
    };

    const dbType = process.env.DB_TYPE;
    if (conditional[dbType]) {
      base.push(...conditional[dbType]);
    }

    return base;
  }

  // 验证环境变量
  validateEnvVars() {
    console.log('🔍 验证环境变量...');

    const required = this.getRequiredEnvVars();
    const missing = [];
    const invalid = [];

    required.forEach(varName => {
      const value = process.env[varName];
      if (!value) {
        missing.push(varName);
      } else {
        // 特定验证
        if (varName === 'JWT_SECRET' && value.length < 32) {
          invalid.push(`${varName}: 长度不足32字符`);
        }
        if (varName === 'ENCRYPTION_KEY' && value.length !== 64) {
          invalid.push(`${varName}: 必须为64字符`);
        }
        if (varName === 'PORT' && (isNaN(value) || value < 1 || value > 65535)) {
          invalid.push(`${varName}: 端口号无效`);
        }
      }
    });

    if (missing.length > 0) {
      this.errors.push(`缺少必需环境变量: ${missing.join(', ')}`);
    }

    if (invalid.length > 0) {
      this.errors.push(`环境变量值无效: ${invalid.join(', ')}`);
    }

    return missing.length === 0 && invalid.length === 0;
  }

  // 验证配置文件存在性
  validateConfigFiles() {
    console.log('📁 验证配置文件...');

    const configFiles = ['.env', '.env.master', 'src/config/unified-master.config.ts'];

    const missing = [];

    configFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        missing.push(file);
      }
    });

    if (missing.length > 0) {
      this.warnings.push(`配置文件缺失: ${missing.join(', ')}`);
    }

    return missing.length === 0;
  }

  // 验证数据库配置
  validateDatabaseConfig() {
    console.log('🗄️ 验证数据库配置...');

    const dbType = process.env.DB_TYPE;
    const validTypes = ['sqlite', 'mysql', 'postgres', 'tidb'];

    if (!validTypes.includes(dbType)) {
      this.errors.push(`不支持的数据库类型: ${dbType}`);
      return false;
    }

    if (dbType === 'sqlite') {
      const dbPath = process.env.DB_DATABASE;
      if (!dbPath) {
        this.errors.push('SQLite 数据库路径未配置');
        return false;
      }

      // 检查目录是否存在
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        this.warnings.push(`数据库目录不存在: ${dbDir}`);
      }
    }

    return true;
  }

  // 验证Redis配置
  validateRedisConfig() {
    console.log('🔴 验证Redis配置...');

    const host = process.env.REDIS_HOST;
    const port = process.env.REDIS_PORT;

    if (!host) {
      this.errors.push('Redis主机未配置');
      return false;
    }

    if (!port || isNaN(port) || port < 1 || port > 65535) {
      this.errors.push('Redis端口配置无效');
      return false;
    }

    return true;
  }

  // 验证安全配置
  validateSecurityConfig() {
    console.log('🛡️ 验证安全配置...');

    const jwtSecret = process.env.JWT_SECRET;
    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (jwtSecret && jwtSecret.length < 32) {
      this.errors.push('JWT密钥长度不足32字符');
    }

    if (encryptionKey && encryptionKey.length !== 64) {
      this.errors.push('加密密钥必须为64字符');
    }

    // 检查生产环境安全性
    if (this.env === 'production') {
      if (jwtSecret === 'your-secret-key' || jwtSecret.includes('test')) {
        this.errors.push('生产环境不能使用默认或测试JWT密钥');
      }

      if (process.env.DB_PASSWORD === 'password' || !process.env.DB_PASSWORD) {
        this.warnings.push('生产环境应使用强数据库密码');
      }
    }

    return this.errors.length === 0;
  }

  // 生成配置报告
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      environment: this.env,
      validation: {
        passed: this.errors.length === 0,
        errors: this.errors,
        warnings: this.warnings,
      },
      config: {
        database: {
          type: process.env.DB_TYPE,
          host: process.env.DB_HOST || 'N/A',
          port: process.env.DB_PORT || 'N/A',
        },
        redis: {
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT,
        },
        security: {
          jwtConfigured: !!process.env.JWT_SECRET,
          encryptionConfigured: !!process.env.ENCRYPTION_KEY,
        },
      },
    };

    const reportPath = path.join(process.cwd(), 'docs', 'quality', 'config-validation-report.json');

    // 确保目录存在
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 配置验证报告已生成: ${reportPath}`);

    return report;
  }

  // 运行完整验证
  async validate() {
    console.log('🚀 开始配置验证...');
    console.log(`环境: ${this.env}`);
    console.log('');

    const results = {
      envVars: this.validateEnvVars(),
      configFiles: this.validateConfigFiles(),
      database: this.validateDatabaseConfig(),
      redis: this.validateRedisConfig(),
      security: this.validateSecurityConfig(),
    };

    console.log('');
    console.log('📊 验证结果汇总:');
    console.log('==================================================');

    Object.entries(results).forEach(([category, passed]) => {
      const status = passed ? '✅' : '❌';
      const categoryName = {
        envVars: '环境变量',
        configFiles: '配置文件',
        database: '数据库配置',
        redis: 'Redis配置',
        security: '安全配置',
      }[category];

      console.log(`${status} ${categoryName}: ${passed ? '通过' : '失败'}`);
    });

    if (this.warnings.length > 0) {
      console.log('');
      console.log('⚠️ 警告:');
      this.warnings.forEach(warning => {
        console.log(`   ${warning}`);
      });
    }

    if (this.errors.length > 0) {
      console.log('');
      console.log('❌ 错误:');
      this.errors.forEach(error => {
        console.log(`   ${error}`);
      });
    }

    const report = this.generateReport();

    const allPassed = Object.values(results).every(result => result);

    if (allPassed && this.errors.length === 0) {
      console.log('');
      console.log('✅ 所有配置验证通过');
      return true;
    } else {
      console.log('');
      console.log('❌ 配置验证失败，请检查上述问题');
      return false;
    }
  }
}

// 主函数
async function main() {
  // 加载环境变量
  require('dotenv').config();

  const validator = new ConfigValidator();
  const success = await validator.validate();

  // 如果是CI环境且验证失败，退出并返回错误码
  if (process.env.CI && !success) {
    process.exit(1);
  }

  return success;
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('配置验证失败:', error);
    process.exit(1);
  });
}

module.exports = { ConfigValidator };
