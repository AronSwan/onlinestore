#!/usr/bin/env node

/**
 * Test Monitor - 安全增强版
 *
 * 改进内容：
 * 1. 实现测试命令白名单验证 (SEC-1.1.1)
 * 2. 添加命令参数转义和验证 (SEC-1.1.2)
 * 3. 使用spawn替代execSync (SEC-1.1.3)
 * 4. 添加配置文件签名验证 (SEC-1.1.4)
 * 5. 实现路径规范化检查 (SEC-1.2.1)
 * 6. 添加路径遍历攻击防护 (SEC-1.2.2)
 * 7. 实现日志敏感信息脱敏 (SEC-1.3.1)
 * 8. 添加文件权限检查 (SEC-1.4.1)
 *
 * @author 后端开发团队
 * @version 2.1.0-secure
 * @since 2025-10-12
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 配置常量
const DEFAULT_CONFIG_FILE = path.join(__dirname, 'test-monitor.config.json');
const DEFAULT_LOCK_FILE = path.join(__dirname, '.test-monitor.lock');
const DEFAULT_LOG_FILE = path.join(__dirname, 'test-monitor.log');
const DEFAULT_REPORTS_DIR = path.join(__dirname, 'reports');

// 默认配置
const DEFAULT_CONFIG = {
  testCommand: 'npm test',
  coverageFile: path.join(__dirname, 'coverage', 'coverage-summary.json'),
  targetCoverage: 80,
  logLevel: 'INFO',
  retryAttempts: 3,
  retryDelay: 1000,
  notifications: {
    enabled: false,
    webhook: '',
    email: '',
  },
  security: {
    commandWhitelist: ['npm', 'node', 'jest', 'mocha', 'yarn', 'pnpm', 'echo'],
    allowedPaths: [
      __dirname,
      path.join(__dirname, 'coverage'),
      path.join(__dirname, 'reports'),
      path.join(__dirname, 'test'),
    ],
    enableSignatureVerification: false,
    publicKeyPath: '',
    logSanitization: true,
    filePermissions: {
      log: 0o600,
      report: 0o644,
      lock: 0o600,
    },
  },
};

// 日志级别
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

/**
 * 安全增强的测试监控类
 */
class SecureTestMonitor {
  constructor(options = {}) {
    // 合并配置
    this.config = { ...DEFAULT_CONFIG, ...options };

    // 设置文件路径
    this.configFile = options.configFile || DEFAULT_CONFIG_FILE;
    this.lockFile = options.lockFile || DEFAULT_LOCK_FILE;
    this.logFile = options.logFile || DEFAULT_LOG_FILE;
    this.reportsDir = options.reportsDir || DEFAULT_REPORTS_DIR;

    // 验证配置
    this.validateConfig();

    // 初始化日志
    this.initLogger();

    // 设置文件权限
    this.setFilePermissions();

    this.log('INFO', 'Secure Test Monitor initialized');
  }

  /**
   * 验证配置
   */
  validateConfig() {
    // 验证测试命令白名单
    if (!this.config.testCommand) {
      throw new Error('Test command is required');
    }

    const commandParts = this.config.testCommand.split(' ');
    const command = commandParts[0];

    if (!this.config.security.commandWhitelist.includes(command)) {
      throw new Error(`Command '${command}' is not in whitelist`);
    }

    // 验证路径
    this.validatePath(this.config.coverageFile);
    this.validatePath(this.configFile);
    this.validatePath(this.logFile);

    // 验证覆盖率目标
    if (this.config.targetCoverage < 0 || this.config.targetCoverage > 100) {
      throw new Error('Target coverage must be between 0 and 100');
    }
  }

  /**
   * 验证路径安全性
   */
  validatePath(filePath) {
    const resolvedPath = path.resolve(filePath);

    // 检查路径是否在允许的目录范围内
    const isAllowed = this.config.security.allowedPaths.some(allowedPath => {
      const resolvedAllowedPath = path.resolve(allowedPath);
      return resolvedPath.startsWith(resolvedAllowedPath);
    });

    if (!isAllowed) {
      throw new Error(`Path '${resolvedPath}' is not in allowed paths`);
    }

    return resolvedPath;
  }

  /**
   * 初始化日志系统
   */
  initLogger() {
    // 确保日志目录存在
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // 设置日志文件权限
    if (fs.existsSync(this.logFile)) {
      fs.chmodSync(this.logFile, this.config.security.filePermissions.log);
    } else {
      // 如果日志文件不存在，创建一个并设置权限
      fs.writeFileSync(this.logFile, '');
      fs.chmodSync(this.logFile, this.config.security.filePermissions.log);
    }
  }

  /**
   * 设置文件权限
   */
  setFilePermissions() {
    // 设置日志文件权限
    if (fs.existsSync(this.logFile)) {
      fs.chmodSync(this.logFile, this.config.security.filePermissions.log);
    }

    // 设置锁文件权限
    if (fs.existsSync(this.lockFile)) {
      fs.chmodSync(this.lockFile, this.config.security.filePermissions.lock);
    }
  }

  /**
   * 记录日志
   */
  log(level, message, meta = {}) {
    if (LOG_LEVELS[level] <= LOG_LEVELS[this.config.logLevel]) {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        message,
        ...meta,
      };

      // 敏感信息脱敏
      if (this.config.security.logSanitization) {
        logEntry.message = this.sanitizeLogMessage(logEntry.message);
      }

      const logLine = JSON.stringify(logEntry) + '\n';

      // 输出到控制台
      console.log(`[${timestamp}] [${level}] ${logEntry.message}`);

      // 写入日志文件
      try {
        fs.appendFileSync(this.logFile, logLine);
      } catch (error) {
        console.error('Failed to write to log file:', error.message);
      }
    }
  }

  /**
   * 敏感信息脱敏
   */
  sanitizeLogMessage(message) {
    // 脱敏密码
    message = message.replace(/password["\s]*[:=]["\s]*([^"'\s]+)/gi, 'password="***"');

    // 脱敏API密钥
    message = message.replace(/api[_-]?key["\s]*[:=]["\s]*([^"'\s]+)/gi, 'api_key="***"');

    // 脱敏令牌
    message = message.replace(/token["\s]*[:=]["\s]*([^"'\s]+)/gi, 'token="***"');

    // 脱敏敏感路径
    message = message.replace(/(\/Users\/[^\/]+\/)/g, '/Users/***/');

    // 脱敏Windows路径
    message = message.replace(/(C:\\Users\\[^\\]+\\)/g, 'C:\\Users\\***\\');

    return message;
  }

  /**
   * 安全地执行命令
   */
  async executeCommand(command, args = []) {
    // 验证命令白名单
    if (!this.config.security.commandWhitelist.includes(command)) {
      throw new Error(`Command '${command}' is not in whitelist`);
    }

    // 转义参数
    const escapedArgs = args.map(arg => this.escapeArgument(arg));

    return new Promise((resolve, reject) => {
      this.log('INFO', `Executing command: ${command} ${escapedArgs.join(' ')}`);

      // 在Windows上，使用shell: true来执行node命令
      const options = {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32' && command === 'node',
      };

      const child = spawn(command, escapedArgs, options);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', data => {
        stdout += data.toString();
      });

      child.stderr.on('data', data => {
        stderr += data.toString();
      });

      child.on('close', code => {
        if (code === 0) {
          this.log('DEBUG', `Command completed successfully`);
          resolve({ stdout, stderr, exitCode: code });
        } else {
          this.log('ERROR', `Command failed with exit code ${code}: ${stderr}`);
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      child.on('error', error => {
        this.log('ERROR', `Command execution error: ${error.message}`);
        reject(error);
      });
    });
  }

  /**
   * 转义命令参数
   */
  escapeArgument(arg) {
    // 简单的参数转义，实际应用中可能需要更复杂的转义逻辑
    if (arg.includes(' ') || arg.includes('"') || arg.includes("'")) {
      return `"${arg.replace(/"/g, '\\"')}"`;
    }
    return arg;
  }

  /**
   * 验证配置文件签名
   */
  async verifyConfigSignature() {
    if (!this.config.security.enableSignatureVerification) {
      return true;
    }

    try {
      const publicKey = fs.readFileSync(this.config.security.publicKeyPath, 'utf8');
      const signature = fs.readFileSync(`${this.configFile}.sig`, 'utf8');
      const data = fs.readFileSync(this.configFile, 'utf8');

      const verify = crypto.createVerify('SHA256');
      verify.update(data);
      verify.end();

      const isValid = verify.verify(publicKey, signature, 'base64');

      if (!isValid) {
        throw new Error('Config file signature verification failed');
      }

      this.log('INFO', 'Config file signature verified successfully');
      return true;
    } catch (error) {
      this.log('ERROR', `Config signature verification failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 运行测试
   */
  async runTest() {
    try {
      // 验证配置签名
      await this.verifyConfigSignature();

      // 解析测试命令
      const commandParts = this.config.testCommand.split(' ');
      const command = commandParts[0];
      const args = commandParts.slice(1);

      // 执行测试命令
      await this.executeCommand(command, args);

      // 分析覆盖率
      const coverageData = this.analyzeCoverage();

      return {
        success: true,
        coverage: coverageData,
      };
    } catch (error) {
      this.log('ERROR', `Test execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 分析覆盖率数据
   */
  analyzeCoverage() {
    try {
      if (!fs.existsSync(this.config.coverageFile)) {
        this.log('WARN', 'Coverage file not found');
        return null;
      }

      const coverageData = JSON.parse(fs.readFileSync(this.config.coverageFile, 'utf8'));

      this.log('INFO', `Coverage analysis completed: ${coverageData.total.lines.pct}%`);

      return coverageData;
    } catch (error) {
      this.log('ERROR', `Coverage analysis failed: ${error.message}`);
      return null;
    }
  }

  /**
   * 生成报告
   */
  generateReport(coverageData) {
    // 确保报告目录存在
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }

    const reportPath = path.join(this.reportsDir, `test-monitor-report-${Date.now()}.json`);

    const report = {
      timestamp: new Date().toISOString(),
      coverage: coverageData,
      targetCoverage: this.config.targetCoverage,
      success: coverageData ? coverageData.total.lines.pct >= this.config.targetCoverage : false,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // 设置报告文件权限
    fs.chmodSync(reportPath, this.config.security.filePermissions.report);

    this.log('INFO', `Report generated: ${reportPath}`);

    return reportPath;
  }

  /**
   * 发送通知
   */
  async sendNotification(report) {
    if (!this.config.notifications.enabled) {
      return;
    }

    // 实现通知逻辑
    this.log('INFO', 'Notification sent (placeholder)');
  }

  /**
   * 获取锁
   */
  acquireLock() {
    try {
      if (fs.existsSync(this.lockFile)) {
        const lockTime = fs.readFileSync(this.lockFile, 'utf8');
        const lockAge = Date.now() - parseInt(lockTime);

        // 如果锁文件超过30分钟，可能是僵尸进程
        if (lockAge > 30 * 60 * 1000) {
          this.log('WARN', 'Found stale lock file, removing it');
          fs.unlinkSync(this.lockFile);
        } else {
          throw new Error('Another monitor process is already running');
        }
      }

      fs.writeFileSync(this.lockFile, Date.now().toString());

      // 设置锁文件权限
      fs.chmodSync(this.lockFile, this.config.security.filePermissions.lock);

      this.log('DEBUG', 'Lock acquired');
    } catch (error) {
      this.log('ERROR', `Failed to acquire lock: ${error.message}`);
      throw error;
    }
  }

  /**
   * 释放锁
   */
  releaseLock() {
    try {
      if (fs.existsSync(this.lockFile)) {
        fs.unlinkSync(this.lockFile);
      }

      this.log('DEBUG', 'Lock released');
    } catch (error) {
      this.log('ERROR', `Failed to release lock: ${error.message}`);
    }
  }

  /**
   * 运行监控
   */
  async run() {
    this.acquireLock();

    try {
      this.log('INFO', 'Starting test monitoring...');

      // 运行测试
      const testResult = await this.runTest();

      // 生成报告
      const reportPath = this.generateReport(testResult.coverage);

      // 发送通知
      await this.sendNotification(testResult);

      this.log('INFO', 'Test monitoring completed successfully');

      return testResult;
    } catch (error) {
      this.log('ERROR', `Test monitoring failed: ${error.message}`);
      throw error;
    } finally {
      this.releaseLock();
    }
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 解析命令行参数
    const args = process.argv.slice(2);
    const options = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('--targetCoverage=')) {
        options.targetCoverage = parseInt(arg.split('=')[1]);
      } else if (arg.startsWith('--interval=')) {
        options.intervalMinutes = parseInt(arg.split('=')[1]);
      } else if (arg.startsWith('--logLevel=')) {
        options.logLevel = arg.split('=')[1];
      } else if (arg === '--once') {
        options.once = true;
      }
    }

    // 创建监控实例
    const monitor = new SecureTestMonitor(options);

    if (options.once) {
      // 只运行一次
      await monitor.run();
    } else {
      // 定时运行
      const intervalMinutes = options.intervalMinutes || 60;
      const intervalMs = intervalMinutes * 60 * 1000;

      console.log(`Starting monitor with ${intervalMinutes} minute interval...`);

      // 立即运行一次
      await monitor.run();

      // 设置定时器
      setInterval(async () => {
        try {
          await monitor.run();
        } catch (error) {
          console.error('Monitor run failed:', error.message);
        }
      }, intervalMs);

      // 保持进程运行
      process.stdin.resume();
    }
  } catch (error) {
    console.error('Monitor initialization failed:', error.message);
    process.exit(1);
  }
}

// 导出类供测试使用
module.exports = SecureTestMonitor;

// 如果直接运行此脚本，执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
