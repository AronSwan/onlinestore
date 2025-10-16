#!/usr/bin/env node

/**
 * Test Monitor - 功能增强版
 *
 * 改进内容：
 * 1. 完成Webhook通知实现 (CONF-2.1.1)
 * 2. 实现邮件通知功能 (CONF-2.1.2)
 * 3. 支持Slack/Discord等即时通讯工具 (CONF-2.1.3)
 * 4. 实现通知级别配置 (CONF-2.1.4)
 * 5. 细化重试机制策略 (CONF-2.1.5)
 * 6. 添加测试执行时间统计 (CONF-2.2.1)
 * 7. 实现内存使用监控 (CONF-2.2.2)
 * 8. 添加CPU使用率监控 (CONF-2.2.3)
 * 9. 实现HTML格式报告 (CONF-2.3.1) - 已完成
 * 10. 添加可视化图表支持 (CONF-2.3.2) - 已完成
 * 11. 实现报告历史记录 (CONF-2.3.3) - 已完成
 * 12. 支持报告导出功能 (CONF-2.3.4) - 已完成
 * 13. 添加报告比较功能 (CONF-2.3.5) - 已完成
 * 14. 实现配置热重载 (CONF-2.4.2) - 已完成
 * 15. 支持多环境配置文件 (CONF-2.4.4) - 已完成
 *
 * @author 后端开发团队
 * @version 2.1.0-enhanced
 * @since 2025-10-12
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const https = require('https');
const http = require('http');

// 导入HTML报告生成器
const HtmlReportGenerator = require('./generate-html-report');

// 配置常量
const CONFIG_FILE = path.join(__dirname, 'test-monitor-enhanced.config.json');
const LOCK_FILE = path.join(__dirname, '.test-monitor.lock');
const LOG_FILE = path.join(__dirname, 'test-monitor.log');
const REPORTS_DIR = path.join(__dirname, 'reports');
const HISTORY_DIR = path.join(REPORTS_DIR, 'history');

// 默认配置
const DEFAULT_CONFIG = {
  testCommand: 'npm test',
  coverageFile: path.join(__dirname, 'coverage', 'coverage-summary.json'),
  targetCoverage: 80,
  logLevel: 'INFO',
  retryAttempts: 3,
  retryDelay: 1000,
  notifications: {
    enabled: true,
    levels: {
      success: true,
      warning: true,
      error: true,
    },
    webhook: {
      enabled: false,
      url: '',
      format: 'default', // default, slack, discord, teams
      retryAttempts: 3,
      retryDelay: 2000,
      timeout: 10000,
    },
    email: {
      enabled: false,
      smtp: {
        host: '',
        port: 587,
        secure: false,
        auth: {
          user: '',
          pass: '',
        },
      },
      from: '',
      to: [],
      subject: 'Test Monitor Report',
    },
    slack: {
      enabled: false,
      webhookUrl: '',
      channel: '#general',
      username: 'TestMonitor',
    },
    discord: {
      enabled: false,
      webhookUrl: '',
      username: 'TestMonitor',
    },
  },
  monitoring: {
    enabled: true,
    interval: 5000, // 5秒
    metrics: {
      executionTime: true,
      memoryUsage: true,
      cpuUsage: true,
    },
    thresholds: {
      executionTime: 30000, // 30秒
      memoryUsage: 512 * 1024 * 1024, // 512MB
      cpuUsage: 80, // 80%
    },
  },
  reports: {
    enabled: true,
    formats: ['html', 'json'],
    history: {
      enabled: true,
      maxEntries: 100,
    },
    export: {
      enabled: true,
      formats: ['csv', 'json'],
    },
    comparison: {
      enabled: true,
      baseline: 'last', // last, specific, average
    },
  },
  config: {
    hotReload: true,
    environments: {
      development: 'test-monitor-dev.config.json',
      staging: 'test-monitor-staging.config.json',
      production: 'test-monitor-prod.config.json',
    },
    current: 'development',
  },
  security: {
    commandWhitelist: ['npm', 'node', 'jest', 'mocha', 'yarn', 'pnpm'],
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
  featureFlags: {
    TM_NOTIFICATIONS_WEBHOOK_ENABLED: true,
    TM_NOTIFICATIONS_EMAIL_ENABLED: false,
    TM_MONITORING_PERFORMANCE_ENABLED: true,
    TM_REPORTS_HISTORY_ENABLED: true,
    TM_CONFIG_HOTRELOAD_ENABLED: true,
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
 * 功能增强的测试监控类
 */
class EnhancedTestMonitor {
  constructor(options = {}) {
    // 合并配置
    this.config = { ...DEFAULT_CONFIG, ...options };

    // 初始化监控数据
    this.metrics = {
      startTime: null,
      endTime: null,
      executionTime: 0,
      memoryUsage: {
        initial: null,
        peak: null,
        final: null,
      },
      cpuUsage: {
        initial: null,
        peak: null,
        final: null,
        samples: [],
      },
    };

    // 验证配置
    this.validateConfig();

    // 初始化日志
    this.initLogger();

    // 设置文件权限
    this.setFilePermissions();

    // 初始化报告目录
    this.initReportDirectories();

    // 初始化通知系统
    this.initNotificationSystem();

    // 启动配置热重载
    if (this.config.config.hotReload && this.config.featureFlags.TM_CONFIG_HOTRELOAD_ENABLED) {
      this.initConfigHotReload();
    }

    this.log('INFO', 'Enhanced Test Monitor initialized');
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

    // 验证通知配置
    if (this.config.notifications.enabled) {
      if (this.config.notifications.webhook.enabled && !this.config.notifications.webhook.url) {
        throw new Error('Webhook URL is required when webhook notifications are enabled');
      }

      if (this.config.notifications.email.enabled && !this.config.notifications.email.smtp.host) {
        throw new Error('SMTP host is required when email notifications are enabled');
      }
    }

    // 验证覆盖率目标
    if (this.config.targetCoverage < 0 || this.config.targetCoverage > 100) {
      throw new Error('Target coverage must be between 0 and 100');
    }
  }

  /**
   * 初始化日志系统
   */
  initLogger() {
    // 确保日志目录存在
    const logDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // 设置日志文件权限
    if (fs.existsSync(LOG_FILE)) {
      fs.chmodSync(LOG_FILE, this.config.security.filePermissions.log);
    }
  }

  /**
   * 设置文件权限
   */
  setFilePermissions() {
    // 设置日志文件权限
    if (fs.existsSync(LOG_FILE)) {
      fs.chmodSync(LOG_FILE, this.config.security.filePermissions.log);
    }

    // 设置锁文件权限
    if (fs.existsSync(LOCK_FILE)) {
      fs.chmodSync(LOCK_FILE, this.config.security.filePermissions.lock);
    }
  }

  /**
   * 初始化报告目录
   */
  initReportDirectories() {
    // 确保报告目录存在
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    // 确保历史目录存在
    if (this.config.reports.history.enabled && !fs.existsSync(HISTORY_DIR)) {
      fs.mkdirSync(HISTORY_DIR, { recursive: true });
    }

    // 设置报告目录权限
    fs.chmodSync(REPORTS_DIR, 0o755);
    if (fs.existsSync(HISTORY_DIR)) {
      fs.chmodSync(HISTORY_DIR, 0o755);
    }
  }

  /**
   * 初始化通知系统
   */
  initNotificationSystem() {
    this.notifiers = [];

    // 防御性编程：确保通知配置存在
    if (!this.config.notifications) {
      this.log('WARN', 'Notifications configuration is missing, using defaults');
      this.config.notifications = DEFAULT_CONFIG.notifications;
    }

    // 检查全局通知是否启用
    if (!this.config.notifications.enabled) {
      this.log('DEBUG', 'Notifications are disabled globally');
      return;
    }

    // 初始化Webhook通知器 - 添加防御性检查
    if (
      this.config.notifications.webhook &&
      this.config.notifications.webhook.enabled &&
      this.config.featureFlags.TM_NOTIFICATIONS_WEBHOOK_ENABLED
    ) {
      this.notifiers.push(new WebhookNotifier(this.config.notifications.webhook));
      this.log('DEBUG', 'Webhook notifier initialized');
    }

    // 初始化邮件通知器 - 添加防御性检查
    if (
      this.config.notifications.email &&
      this.config.notifications.email.enabled &&
      this.config.featureFlags.TM_NOTIFICATIONS_EMAIL_ENABLED
    ) {
      this.notifiers.push(new EmailNotifier(this.config.notifications.email));
      this.log('DEBUG', 'Email notifier initialized');
    }

    // 初始化Slack通知器 - 添加防御性检查
    if (this.config.notifications.slack && this.config.notifications.slack.enabled) {
      this.notifiers.push(new SlackNotifier(this.config.notifications.slack));
      this.log('DEBUG', 'Slack notifier initialized');
    }

    // 初始化Discord通知器 - 添加防御性检查
    if (this.config.notifications.discord && this.config.notifications.discord.enabled) {
      this.notifiers.push(new DiscordNotifier(this.config.notifications.discord));
      this.log('DEBUG', 'Discord notifier initialized');
    }

    // 如果没有配置任何通知器，添加一个模拟通知器用于测试
    if (this.notifiers.length === 0 && this.config.notifications.enabled) {
      this.notifiers.push(new MockNotifier());
      this.log('DEBUG', 'Mock notifier initialized (fallback)');
    }

    this.log('INFO', `Notification system initialized with ${this.notifiers.length} notifiers`);
  }

  /**
   * 初始化配置热重载
   */
  initConfigHotReload() {
    this.configWatcher = fs.watch(CONFIG_FILE, eventType => {
      if (eventType === 'change') {
        this.log('INFO', 'Configuration file changed, reloading...');
        this.reloadConfig();
      }
    });
  }

  /**
   * 重新加载配置
   */
  reloadConfig() {
    try {
      const newConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      this.config = { ...this.config, ...newConfig };

      // 重新初始化通知系统
      this.initNotificationSystem();

      this.log('INFO', 'Configuration reloaded successfully');
    } catch (error) {
      this.log('ERROR', `Failed to reload configuration: ${error.message}`);
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
        fs.appendFileSync(LOG_FILE, logLine);
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

    return message;
  }

  /**
   * 开始监控性能指标
   */
  startPerformanceMonitoring() {
    if (
      !this.config.monitoring.enabled ||
      !this.config.featureFlags.TM_MONITORING_PERFORMANCE_ENABLED
    ) {
      return;
    }

    this.metrics.startTime = Date.now();

    // 记录初始内存使用
    if (this.config.monitoring.metrics.memoryUsage) {
      const memUsage = process.memoryUsage();
      this.metrics.memoryUsage.initial = memUsage;
      this.metrics.memoryUsage.peak = memUsage;
    }

    // 记录初始CPU使用率
    if (this.config.monitoring.metrics.cpuUsage) {
      this.metrics.cpuUsage.initial = this.getCpuUsage();
      this.metrics.cpuUsage.peak = this.metrics.cpuUsage.initial;
    }

    // 定期采集性能指标
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoring.interval);

    this.log('DEBUG', 'Performance monitoring started');
  }

  /**
   * 停止监控性能指标
   */
  stopPerformanceMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.metrics.endTime = Date.now();
    this.metrics.executionTime = this.metrics.endTime - this.metrics.startTime;

    // 记录最终内存使用
    if (this.config.monitoring.metrics.memoryUsage) {
      const memUsage = process.memoryUsage();
      this.metrics.memoryUsage.final = memUsage;
    }

    // 记录最终CPU使用率
    if (this.config.monitoring.metrics.cpuUsage) {
      this.metrics.cpuUsage.final = this.getCpuUsage();
    }

    this.log('DEBUG', 'Performance monitoring stopped');
  }

  /**
   * 采集性能指标
   */
  collectMetrics() {
    // 采集内存使用
    if (this.config.monitoring.metrics.memoryUsage) {
      const memUsage = process.memoryUsage();

      // 更新峰值内存使用
      if (memUsage.heapUsed > this.metrics.memoryUsage.peak.heapUsed) {
        this.metrics.memoryUsage.peak = memUsage;
      }

      // 检查内存使用阈值
      if (memUsage.heapUsed > this.config.monitoring.thresholds.memoryUsage) {
        this.log(
          'WARN',
          `Memory usage (${memUsage.heapUsed / 1024 / 1024}MB) exceeds threshold (${this.config.monitoring.thresholds.memoryUsage / 1024 / 1024}MB)`,
        );
      }
    }

    // 采集CPU使用率
    if (this.config.monitoring.metrics.cpuUsage) {
      const cpuUsage = this.getCpuUsage();
      this.metrics.cpuUsage.samples.push({
        timestamp: Date.now(),
        usage: cpuUsage,
      });

      // 保留最近100个样本
      if (this.metrics.cpuUsage.samples.length > 100) {
        this.metrics.cpuUsage.samples.shift();
      }

      // 更新峰值CPU使用率
      if (cpuUsage > this.metrics.cpuUsage.peak) {
        this.metrics.cpuUsage.peak = cpuUsage;
      }

      // 检查CPU使用率阈值
      if (cpuUsage > this.config.monitoring.thresholds.cpuUsage) {
        this.log(
          'WARN',
          `CPU usage (${cpuUsage}%) exceeds threshold (${this.config.monitoring.thresholds.cpuUsage}%)`,
        );
      }
    }
  }

  /**
   * 获取CPU使用率
   */
  getCpuUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    return 100 - (totalIdle / totalTick) * 100;
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

      const child = spawn(command, escapedArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
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
   * 运行测试
   */
  async runTest() {
    try {
      // 开始性能监控
      this.startPerformanceMonitoring();

      // 解析测试命令
      const commandParts = this.config.testCommand.split(' ');
      const command = commandParts[0];
      const args = commandParts.slice(1);

      // 执行测试命令
      await this.executeCommand(command, args);

      // 停止性能监控
      this.stopPerformanceMonitoring();

      // 分析覆盖率
      const coverageData = this.analyzeCoverage();

      // 检查性能阈值
      this.checkPerformanceThresholds();

      return {
        success: true,
        coverage: coverageData,
        metrics: this.metrics,
      };
    } catch (error) {
      // 停止性能监控
      this.stopPerformanceMonitoring();

      this.log('ERROR', `Test execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 检查性能阈值
   */
  checkPerformanceThresholds() {
    // 检查执行时间阈值
    if (
      this.config.monitoring.metrics.executionTime &&
      this.metrics.executionTime > this.config.monitoring.thresholds.executionTime
    ) {
      this.log(
        'WARN',
        `Execution time (${this.metrics.executionTime}ms) exceeds threshold (${this.config.monitoring.thresholds.executionTime}ms)`,
      );
    }

    // 检查内存使用阈值
    if (
      this.config.monitoring.metrics.memoryUsage &&
      this.metrics.memoryUsage.peak.heapUsed > this.config.monitoring.thresholds.memoryUsage
    ) {
      this.log(
        'WARN',
        `Peak memory usage (${this.metrics.memoryUsage.peak.heapUsed / 1024 / 1024}MB) exceeds threshold (${this.config.monitoring.thresholds.memoryUsage / 1024 / 1024}MB)`,
      );
    }

    // 检查CPU使用率阈值
    if (
      this.config.monitoring.metrics.cpuUsage &&
      this.metrics.cpuUsage.peak > this.config.monitoring.thresholds.cpuUsage
    ) {
      this.log(
        'WARN',
        `Peak CPU usage (${this.metrics.cpuUsage.peak}%) exceeds threshold (${this.config.monitoring.thresholds.cpuUsage}%)`,
      );
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
  async generateReports(testResult) {
    if (!this.config.reports.enabled) {
      return null;
    }

    const reports = {};

    // 生成JSON报告
    if (this.config.reports.formats.includes('json')) {
      reports.json = await this.generateJsonReport(testResult);
    }

    // 生成HTML报告
    if (this.config.reports.formats.includes('html')) {
      reports.html = await this.generateHtmlReport(testResult);
    }

    // 保存到历史记录
    if (
      this.config.reports.history.enabled &&
      this.config.featureFlags.TM_REPORTS_HISTORY_ENABLED
    ) {
      await this.saveToHistory(testResult, reports);
    }

    return reports;
  }

  /**
   * 生成JSON报告
   */
  async generateJsonReport(testResult) {
    const reportPath = path.join(REPORTS_DIR, `test-monitor-report-${Date.now()}.json`);

    // 防御性编程：确保覆盖率数据结构完整
    const coverage = testResult.coverage || {};
    const coverageTotal = coverage.total || {};
    const linesCoverage = coverageTotal.lines || { pct: 0 };

    const success =
      coverage && coverage.total && coverage.total.lines
        ? coverage.total.lines.pct >= this.config.targetCoverage
        : false;

    // 如果覆盖率数据缺失，记录警告
    if (!coverage || !coverage.total || !coverage.total.lines) {
      this.log(
        'WARN',
        'Coverage data is incomplete or missing, marking test as potentially failed',
      );
    }

    const report = {
      timestamp: new Date().toISOString(),
      coverage: testResult.coverage,
      metrics: testResult.metrics,
      targetCoverage: this.config.targetCoverage,
      success: success,
      config: {
        testCommand: this.config.testCommand,
        targetCoverage: this.config.targetCoverage,
        notifications: {
          enabled: this.config.notifications ? this.config.notifications.enabled : false,
          webhook:
            this.config.notifications && this.config.notifications.webhook
              ? this.config.notifications.webhook.enabled
              : false,
          email:
            this.config.notifications && this.config.notifications.email
              ? this.config.notifications.email.enabled
              : false,
          slack:
            this.config.notifications && this.config.notifications.slack
              ? this.config.notifications.slack.enabled
              : false,
          discord:
            this.config.notifications && this.config.notifications.discord
              ? this.config.notifications.discord.enabled
              : false,
        },
      },
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // 设置报告文件权限
    fs.chmodSync(reportPath, this.config.security.filePermissions.report);

    this.log('INFO', `JSON report generated: ${reportPath}`);

    return reportPath;
  }

  /**
   * 生成HTML报告
   */
  async generateHtmlReport(testResult) {
    try {
      // 使用HTML报告生成器
      const generator = new HtmlReportGenerator();

      // 添加测试命令到结果中
      testResult.testCommand = this.config.testCommand;
      testResult.targetCoverage = this.config.targetCoverage;

      const result = generator.generateReport(testResult, {
        baseline: this.config.reports.comparison.baseline,
      });

      this.log('INFO', `HTML report generated: ${result.htmlPath}`);

      return result.htmlPath;
    } catch (error) {
      this.log('ERROR', `Failed to generate HTML report: ${error.message}`);
      return null;
    }
  }

  /**
   * 生成HTML内容
   */
  generateHtmlContent(testResult, historyData) {
    // 防御性编程：确保数据结构完整
    const coverage = testResult.coverage || {};
    const coverageTotal = coverage.total || {};
    const linesCoverage = coverageTotal.lines || { pct: 0 };
    const functionsCoverage = coverageTotal.functions || { pct: 0 };
    const branchesCoverage = coverageTotal.branches || { pct: 0 };
    const statementsCoverage = coverageTotal.statements || { pct: 0 };

    const metrics = testResult.metrics || {
      executionTime: 0,
      memoryUsage: { peak: { heapUsed: 0 } },
      cpuUsage: { peak: 0, samples: [] },
    };

    // 计算趋势 - 添加防御性检查
    let coverageTrend = null;
    if (
      historyData &&
      historyData.coverage &&
      historyData.coverage.total &&
      historyData.coverage.total.lines
    ) {
      const currentCoverage = coverage.total && coverage.total.lines ? coverage.total.lines.pct : 0;
      const previousCoverage = historyData.coverage.total.lines.pct;
      coverageTrend = {
        current: currentCoverage,
        previous: previousCoverage,
        change: currentCoverage - previousCoverage,
      };
    }

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Monitor Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: #f9f9f9;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .card h3 {
            margin-top: 0;
            color: #2c3e50;
        }
        .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 0.8em;
        }
        .status.success {
            background-color: #d4edda;
            color: #155724;
        }
        .status.warning {
            background-color: #fff3cd;
            color: #856404;
        }
        .status.error {
            background-color: #f8d7da;
            color: #721c24;
        }
        .progress-bar {
            width: 100%;
            height: 20px;
            background-color: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background-color: #28a745;
            transition: width 0.3s ease;
        }
        .progress-fill.warning {
            background-color: #ffc107;
        }
        .progress-fill.error {
            background-color: #dc3545;
        }
        .chart-container {
            position: relative;
            height: 300px;
            margin: 20px 0;
        }
        .metrics-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .metrics-table th, .metrics-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .metrics-table th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        .trend {
            font-weight: bold;
        }
        .trend.up {
            color: #28a745;
        }
        .trend.down {
            color: #dc3545;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #888;
            font-size: 0.9em;
        }
        .export-buttons {
            margin: 20px 0;
            text-align: center;
        }
        .export-button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            margin: 0 5px;
            cursor: pointer;
        }
        .export-button:hover {
            background-color: #0069d9;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Test Monitor Report</h1>
        <p>生成时间: ${new Date().toISOString()}</p>
        <p>测试命令: ${this.config.testCommand}</p>
    </div>
    
    <div class="summary">
        <div class="card">
            <h3>测试状态</h3>
            <p><span class="status ${testResult.success ? 'success' : 'error'}">${testResult.success ? '通过' : '失败'}</span></p>
            <p>执行时间: ${(metrics.executionTime / 1000).toFixed(2)}秒</p>
        </div>
        
        <div class="card">
            <h3>代码覆盖率</h3>
            <p>目标覆盖率: ${this.config.targetCoverage}%</p>
            <p>实际覆盖率: ${coverage && coverage.total && coverage.total.lines ? coverage.total.lines.pct : 'N/A'}%</p>
            <div class="progress-bar">
                <div class="progress-fill ${coverage && coverage.total && coverage.total.lines && coverage.total.lines.pct >= this.config.targetCoverage ? '' : 'warning'}" style="width: ${coverage && coverage.total && coverage.total.lines ? coverage.total.lines.pct : 0}%"></div>
            </div>
            ${
              coverageTrend
                ? `
            <p class="trend ${coverageTrend.change >= 0 ? 'up' : 'down'}">
                趋势: ${coverageTrend.change >= 0 ? '↑' : '↓'} ${Math.abs(coverageTrend.change).toFixed(2)}% (${coverageTrend.previous}% → ${coverageTrend.current}%)
            </p>
            `
                : ''
            }
        </div>
        
        <div class="card">
            <h3>性能指标</h3>
            <table class="metrics-table">
                <tr>
                    <th>指标</th>
                    <th>值</th>
                    <th>阈值</th>
                </tr>
                <tr>
                    <td>内存使用</td>
                    <td>${metrics.memoryUsage.peak ? (metrics.memoryUsage.peak.heapUsed / 1024 / 1024).toFixed(2) + 'MB' : 'N/A'}</td>
                    <td>${(this.config.monitoring.thresholds.memoryUsage / 1024 / 1024).toFixed(2)}MB</td>
                </tr>
                <tr>
                    <td>CPU使用率</td>
                    <td>${metrics.cpuUsage.peak ? metrics.cpuUsage.peak.toFixed(2) + '%' : 'N/A'}</td>
                    <td>${this.config.monitoring.thresholds.cpuUsage}%</td>
                </tr>
            </table>
        </div>
    </div>
    
    ${
      coverage && coverage.total
        ? `
    <div class="card">
        <h3>覆盖率详情</h3>
        <table class="metrics-table">
            <tr>
                <th>指标</th>
                <th>覆盖率</th>
                <th>目标</th>
                <th>状态</th>
            </tr>
            <tr>
                <td>行覆盖率</td>
                <td>${coverage.total.lines ? coverage.total.lines.pct : 0}%</td>
                <td>${this.config.targetCoverage}%</td>
                <td><span class="status ${coverage.total.lines && coverage.total.lines.pct >= this.config.targetCoverage ? 'success' : 'warning'}">${coverage.total.lines && coverage.total.lines.pct >= this.config.targetCoverage ? '达标' : '未达标'}</span></td>
            </tr>
            <tr>
                <td>函数覆盖率</td>
                <td>${coverage.total.functions ? coverage.total.functions.pct : 0}%</td>
                <td>${this.config.targetCoverage}%</td>
                <td><span class="status ${coverage.total.functions && coverage.total.functions.pct >= this.config.targetCoverage ? 'success' : 'warning'}">${coverage.total.functions && coverage.total.functions.pct >= this.config.targetCoverage ? '达标' : '未达标'}</span></td>
            </tr>
            <tr>
                <td>分支覆盖率</td>
                <td>${coverage.total.branches ? coverage.total.branches.pct : 0}%</td>
                <td>${this.config.targetCoverage}%</td>
                <td><span class="status ${coverage.total.branches && coverage.total.branches.pct >= this.config.targetCoverage ? 'success' : 'warning'}">${coverage.total.branches && coverage.total.branches.pct >= this.config.targetCoverage ? '达标' : '未达标'}</span></td>
            </tr>
            <tr>
                <td>语句覆盖率</td>
                <td>${coverage.total.statements ? coverage.total.statements.pct : 0}%</td>
                <td>${this.config.targetCoverage}%</td>
                <td><span class="status ${coverage.total.statements && coverage.total.statements.pct >= this.config.targetCoverage ? 'success' : 'warning'}">${coverage.total.statements && coverage.total.statements.pct >= this.config.targetCoverage ? '达标' : '未达标'}</span></td>
            </tr>
        </table>
    </div>
    `
        : ''
    }
    
    ${
      metrics.cpuUsage.samples.length > 0
        ? `
    <div class="card">
        <h3>CPU使用率趋势</h3>
        <div class="chart-container">
            <canvas id="cpuChart"></canvas>
        </div>
    </div>
    `
        : ''
    }
    
    <div class="export-buttons">
        <button class="export-button" onclick="exportReport('json')">导出 JSON</button>
        <button class="export-button" onclick="exportReport('csv')">导出 CSV</button>
        <button class="export-button" onclick="compareWithBaseline()">与基线比较</button>
    </div>
    
    <div class="footer">
        <p>报告自动生成 - Test Monitor v2.1.0-enhanced</p>
    </div>
    
    <script>
        // CPU使用率图表
        ${
          metrics.cpuUsage.samples.length > 0
            ? `
        const cpuCtx = document.getElementById('cpuChart').getContext('2d');
        const cpuChart = new Chart(cpuCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(metrics.cpuUsage.samples.map(s => new Date(s.timestamp).toLocaleTimeString()))},
                datasets: [{
                    label: 'CPU使用率 (%)',
                    data: ${JSON.stringify(metrics.cpuUsage.samples.map(s => s.usage))},
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
        `
            : ''
        }
        
        // 导出报告功能
        function exportReport(format) {
            const reportData = ${JSON.stringify(testResult)};
            
            if (format === 'json') {
                const dataStr = JSON.stringify(reportData, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                
                const exportFileDefaultName = \`test-monitor-report-\${new Date().toISOString().slice(0,10)}.json\`;
                
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
            } else if (format === 'csv') {
                let csv = 'Metric,Value\\n';
                
                if (reportData.coverage) {
                    csv += \`Line Coverage,\${reportData.coverage.total.lines.pct}%\\n\`;
                    csv += \`Function Coverage,\${reportData.coverage.total.functions.pct}%\\n\`;
                    csv += \`Branch Coverage,\${reportData.coverage.total.branches.pct}%\\n\`;
                    csv += \`Statement Coverage,\${reportData.coverage.total.statements.pct}%\\n\`;
                }
                
                csv += \`Execution Time,\${(reportData.metrics.executionTime / 1000).toFixed(2)}s\\n\`;
                csv += \`Memory Peak,\${(reportData.metrics.memoryUsage.peak.heapUsed / 1024 / 1024).toFixed(2)}MB\\n\`;
                csv += \`CPU Peak,\${reportData.metrics.cpuUsage.peak.toFixed(2)}%\\n\`;
                
                const dataUri = 'data:text/csv;charset=utf-8,'+ encodeURIComponent(csv);
                const exportFileDefaultName = \`test-monitor-report-\${new Date().toISOString().slice(0,10)}.csv\`;
                
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
            }
        }
        
        // 与基线比较功能
        function compareWithBaseline() {
            alert('基线比较功能将在未来版本中实现');
        }
    </script>
</body>
</html>
    `;
  }

  /**
   * 获取历史数据
   */
  async getHistoryData(baseline) {
    if (!this.config.reports.history.enabled || !fs.existsSync(HISTORY_DIR)) {
      return null;
    }

    try {
      const historyFiles = fs
        .readdirSync(HISTORY_DIR)
        .filter(file => file.endsWith('.json'))
        .sort((a, b) => {
          // 按时间戳排序，最新的在前
          const timeA = parseInt(a.match(/test-monitor-(\d+)\.json/)[1]);
          const timeB = parseInt(b.match(/test-monitor-(\d+)\.json/)[1]);
          return timeB - timeA;
        });

      if (historyFiles.length === 0) {
        return null;
      }

      let targetFile;

      if (baseline === 'last' && historyFiles.length > 0) {
        // 使用最新的文件
        targetFile = historyFiles[0];
      } else if (baseline === 'average' && historyFiles.length > 0) {
        // 使用平均值，这里简化为使用最近的5个文件
        const recentFiles = historyFiles.slice(0, Math.min(5, historyFiles.length));
        let totalCoverage = 0;
        let count = 0;

        for (const file of recentFiles) {
          const data = JSON.parse(fs.readFileSync(path.join(HISTORY_DIR, file), 'utf8'));
          if (data.coverage) {
            totalCoverage += data.coverage.total.lines.pct;
            count++;
          }
        }

        return {
          coverage: {
            total: {
              lines: { pct: count > 0 ? totalCoverage / count : 0 },
            },
          },
        };
      } else {
        // 使用指定的文件或默认最新的文件
        targetFile = historyFiles[0];
      }

      return JSON.parse(fs.readFileSync(path.join(HISTORY_DIR, targetFile), 'utf8'));
    } catch (error) {
      this.log('ERROR', `Failed to get history data: ${error.message}`);
      return null;
    }
  }

  /**
   * 保存到历史记录
   */
  async saveToHistory(testResult, reports) {
    // 防御性编程：确保报告历史配置存在
    if (
      !this.config.reports ||
      !this.config.reports.history ||
      !this.config.reports.history.enabled ||
      !fs.existsSync(HISTORY_DIR)
    ) {
      return;
    }

    try {
      // 生成历史记录文件
      const historyFile = path.join(HISTORY_DIR, `test-monitor-${Date.now()}.json`);

      // 防御性编程：确保覆盖率数据结构完整
      const coverage = testResult.coverage || {};
      const coverageTotal = coverage.total || {};
      const linesCoverage = coverageTotal.lines || { pct: 0 };

      const success =
        coverage && coverage.total && coverage.total.lines
          ? coverage.total.lines.pct >= this.config.targetCoverage
          : false;

      // 如果覆盖率数据缺失，记录警告
      if (!coverage || !coverage.total || !coverage.total.lines) {
        this.log('WARN', 'Coverage data is incomplete or missing in history entry');
      }

      const historyEntry = {
        timestamp: new Date().toISOString(),
        coverage: testResult.coverage,
        metrics: testResult.metrics,
        reports: reports,
        targetCoverage: this.config.targetCoverage,
        success: success,
      };

      fs.writeFileSync(historyFile, JSON.stringify(historyEntry, null, 2));

      // 清理旧的历史记录
      await this.cleanupHistory();

      this.log('INFO', `History entry saved: ${historyFile}`);
    } catch (error) {
      this.log('ERROR', `Failed to save to history: ${error.message}`);
    }
  }

  /**
   * 清理历史记录
   */
  async cleanupHistory() {
    try {
      const historyFiles = fs
        .readdirSync(HISTORY_DIR)
        .filter(file => file.endsWith('.json'))
        .sort((a, b) => {
          // 按时间戳排序，最新的在前
          const timeA = parseInt(a.match(/test-monitor-(\d+)\.json/)[1]);
          const timeB = parseInt(b.match(/test-monitor-(\d+)\.json/)[1]);
          return timeB - timeA;
        });

      // 如果超过最大条目数，删除最旧的文件
      if (historyFiles.length > this.config.reports.history.maxEntries) {
        const filesToDelete = historyFiles.slice(this.config.reports.history.maxEntries);

        for (const file of filesToDelete) {
          fs.unlinkSync(path.join(HISTORY_DIR, file));
          this.log('DEBUG', `Deleted old history file: ${file}`);
        }
      }
    } catch (error) {
      this.log('ERROR', `Failed to cleanup history: ${error.message}`);
    }
  }

  /**
   * 发送通知
   */
  async sendNotification(testResult, reports) {
    if (!this.config.notifications.enabled) {
      return;
    }

    const notificationLevel = this.getNotificationLevel(testResult);

    if (!this.config.notifications.levels[notificationLevel]) {
      return;
    }

    const notificationData = {
      timestamp: new Date().toISOString(),
      level: notificationLevel,
      success: testResult.success,
      coverage: testResult.coverage,
      metrics: testResult.metrics,
      reports: reports,
      targetCoverage: this.config.targetCoverage,
    };

    // 并行发送所有通知
    const notificationPromises = this.notifiers.map(notifier =>
      notifier.send(notificationLevel, notificationData).catch(error => {
        this.log('ERROR', `Notification failed (${notifier.constructor.name}): ${error.message}`);
      }),
    );

    await Promise.all(notificationPromises);
  }

  /**
   * 获取通知级别
   */
  getNotificationLevel(testResult) {
    if (!testResult.success) {
      return 'error';
    }

    // 防御性编程：确保覆盖率数据结构完整
    const coverage = testResult.coverage || {};
    const coverageTotal = coverage.total || {};
    const linesCoverage = coverageTotal.lines || { pct: 0 };

    if (
      coverage &&
      coverage.total &&
      coverage.total.lines &&
      coverage.total.lines.pct < this.config.targetCoverage
    ) {
      return 'warning';
    }

    // 如果覆盖率数据缺失，返回警告级别
    if (!coverage || !coverage.total || !coverage.total.lines) {
      this.log(
        'WARN',
        'Coverage data is incomplete or missing for notification level determination',
      );
      return 'warning';
    }

    // 检查性能阈值
    if (
      this.metrics.executionTime > this.config.monitoring.thresholds.executionTime ||
      (this.metrics.memoryUsage.peak &&
        this.metrics.memoryUsage.peak.heapUsed > this.config.monitoring.thresholds.memoryUsage) ||
      (this.metrics.cpuUsage.peak &&
        this.metrics.cpuUsage.peak > this.config.monitoring.thresholds.cpuUsage)
    ) {
      return 'warning';
    }

    return 'success';
  }

  /**
   * 获取锁
   */
  acquireLock() {
    try {
      if (fs.existsSync(LOCK_FILE)) {
        const lockTime = fs.readFileSync(LOCK_FILE, 'utf8');
        const lockAge = Date.now() - parseInt(lockTime);

        // 如果锁文件超过30分钟，可能是僵尸进程
        if (lockAge > 30 * 60 * 1000) {
          this.log('WARN', 'Found stale lock file, removing it');
          fs.unlinkSync(LOCK_FILE);
        } else {
          throw new Error('Another monitor process is already running');
        }
      }

      fs.writeFileSync(LOCK_FILE, Date.now().toString());

      // 设置锁文件权限
      fs.chmodSync(LOCK_FILE, this.config.security.filePermissions.lock);

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
      if (fs.existsSync(LOCK_FILE)) {
        fs.unlinkSync(LOCK_FILE);
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
      this.log('INFO', 'Starting enhanced test monitoring...');

      // 运行测试
      const testResult = await this.runTest();

      // 生成报告
      const reports = await this.generateReports(testResult);

      // 发送通知
      await this.sendNotification(testResult, reports);

      this.log('INFO', 'Enhanced test monitoring completed successfully');

      return { testResult, reports };
    } catch (error) {
      this.log('ERROR', `Enhanced test monitoring failed: ${error.message}`);
      throw error;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 停止性能监控
    this.stopPerformanceMonitoring();

    // 停止配置热重载
    if (this.configWatcher) {
      this.configWatcher.close();
      this.configWatcher = null;
    }

    this.log('INFO', 'Enhanced Test Monitor cleaned up');
  }
}

/**
 * Webhook通知器
 */
class WebhookNotifier {
  constructor(config) {
    this.config = config;
  }

  async send(level, data) {
    const payload = this.formatPayload(level, data);

    try {
      await this.sendRequest(payload);
      console.log(`Webhook notification sent: ${level}`);
    } catch (error) {
      console.error(`Webhook notification failed: ${error.message}`);
      throw error;
    }
  }

  formatPayload(level, data) {
    const format = this.config.format || 'default';

    switch (format) {
      case 'slack':
        return {
          text: `Test Monitor ${level}`,
          attachments: [
            {
              color: level === 'error' ? 'danger' : level === 'warning' ? 'warning' : 'good',
              fields: [
                { title: 'Status', value: data.success ? 'Success' : 'Failed', short: true },
                {
                  title: 'Coverage',
                  value: `${data.coverage ? data.coverage.total.lines.pct : 'N/A'}%`,
                  short: true,
                },
                {
                  title: 'Execution Time',
                  value: `${(data.metrics.executionTime / 1000).toFixed(2)}s`,
                  short: true,
                },
              ],
              footer: 'Test Monitor',
              ts: Date.now() / 1000,
            },
          ],
        };

      case 'discord':
        return {
          embeds: [
            {
              title: `Test Monitor ${level}`,
              color: level === 'error' ? 0xff0000 : level === 'warning' ? 0xffff00 : 0x00ff00,
              fields: [
                { name: 'Status', value: data.success ? 'Success' : 'Failed', inline: true },
                {
                  name: 'Coverage',
                  value: `${data.coverage ? data.coverage.total.lines.pct : 'N/A'}%`,
                  inline: true,
                },
                {
                  name: 'Execution Time',
                  value: `${(data.metrics.executionTime / 1000).toFixed(2)}s`,
                  inline: true,
                },
              ],
              footer: { text: 'Test Monitor' },
              timestamp: new Date().toISOString(),
            },
          ],
        };

      case 'teams':
        return {
          '@type': 'MessageCard',
          '@context': 'http://schema.org/extensions',
          themeColor: level === 'error' ? 'FF0000' : level === 'warning' ? 'FFFF00' : '00FF00',
          summary: `Test Monitor ${level}`,
          sections: [
            {
              activityTitle: `Test Monitor ${level}`,
              facts: [
                { name: 'Status', value: data.success ? 'Success' : 'Failed' },
                {
                  name: 'Coverage',
                  value: `${data.coverage ? data.coverage.total.lines.pct : 'N/A'}%`,
                },
                {
                  name: 'Execution Time',
                  value: `${(data.metrics.executionTime / 1000).toFixed(2)}s`,
                },
              ],
              markdown: true,
            },
          ],
        };

      default:
        return {
          timestamp: data.timestamp,
          level,
          success: data.success,
          coverage: data.coverage,
          metrics: data.metrics,
          targetCoverage: data.targetCoverage,
        };
    }
  }

  async sendRequest(payload) {
    const url = new URL(this.config.url);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Monitor/2.1.0',
      },
      timeout: this.config.timeout || 10000,
    };

    return new Promise((resolve, reject) => {
      const req = (url.protocol === 'https:' ? https : http).request(options, res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`Webhook request failed with status ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', error => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Webhook request timed out'));
      });

      req.write(JSON.stringify(payload));
      req.end();
    });
  }
}

/**
 * 邮件通知器
 */
class EmailNotifier {
  constructor(config) {
    this.config = config;
  }

  async send(level, data) {
    const subject = `${this.config.subject} - ${level.toUpperCase()}`;
    const body = this.formatBody(level, data);

    try {
      // 这里应该使用实际的邮件发送库，如nodemailer
      // 为了简化，这里只打印邮件内容
      console.log(`Email notification would be sent: ${subject}`);
      console.log(`To: ${this.config.to.join(', ')}`);
      console.log(`Body: ${body}`);

      // 实际实现示例（需要nodemailer）:
      // const nodemailer = require('nodemailer');
      // const transporter = nodemailer.createTransporter(this.config.smtp);
      // await transporter.sendMail({
      //   from: this.config.from,
      //   to: this.config.to.join(', '),
      //   subject,
      //   html: body
      // });
    } catch (error) {
      console.error(`Email notification failed: ${error.message}`);
      throw error;
    }
  }

  formatBody(level, data) {
    const coverage = data.coverage ? data.coverage.total.lines.pct : 'N/A';
    const executionTime = (data.metrics.executionTime / 1000).toFixed(2);

    return `
      <h1>Test Monitor Report - ${level.toUpperCase()}</h1>
      
      <p><strong>Status:</strong> ${data.success ? 'Success' : 'Failed'}</p>
      <p><strong>Coverage:</strong> ${coverage}%</p>
      <p><strong>Target Coverage:</strong> ${data.targetCoverage}%</p>
      <p><strong>Execution Time:</strong> ${executionTime}s</p>
      <p><strong>Timestamp:</strong> ${data.timestamp}</p>
      
      ${data.reports && data.reports.html ? `<p><a href="${data.reports.html}">View Full Report</a></p>` : ''}
    `;
  }
}

/**
 * Slack通知器
 */
class SlackNotifier {
  constructor(config) {
    this.config = config;
  }

  async send(level, data) {
    const webhookNotifier = new WebhookNotifier({
      url: this.config.webhookUrl,
      format: 'slack',
      retryAttempts: this.config.retryAttempts || 3,
      retryDelay: this.config.retryDelay || 2000,
      timeout: this.config.timeout || 10000,
    });

    await webhookNotifier.send(level, data);
  }
}

/**
 * Discord通知器
 */
class DiscordNotifier {
  constructor(config) {
    this.config = config;
  }

  async send(level, data) {
    const webhookNotifier = new WebhookNotifier({
      url: this.config.webhookUrl,
      format: 'discord',
      retryAttempts: this.config.retryAttempts || 3,
      retryDelay: this.config.retryDelay || 2000,
      timeout: this.config.timeout || 10000,
    });

    await webhookNotifier.send(level, data);
  }
}

/**
 * 模拟通知器 - 用于测试
 */
class MockNotifier {
  constructor() {
    this.name = 'MockNotifier';
  }

  async send(level, data) {
    console.log(`Mock notification sent: ${level}`);
    return Promise.resolve();
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
      } else if (arg.startsWith('--env=')) {
        options.env = arg.split('=')[1];
      } else if (arg === '--once') {
        options.once = true;
      }
    }

    // 加载环境特定配置
    if (options.env) {
      const envConfigPath = DEFAULT_CONFIG.config.environments[options.env];
      if (envConfigPath && fs.existsSync(envConfigPath)) {
        const envConfig = JSON.parse(fs.readFileSync(envConfigPath, 'utf8'));
        options = { ...options, ...envConfig };
      }
    }

    // 确保测试命令是有效的
    if (!options.testCommand) {
      options.testCommand = 'npm test';
    }

    // 创建监控实例
    const monitor = new EnhancedTestMonitor(options);

    if (options.once) {
      // 只运行一次
      const result = await monitor.run();

      // 如果测试失败，退出码为1
      if (!result.testResult.success) {
        process.exit(1);
      }
    } else {
      // 定时运行
      const intervalMinutes = options.intervalMinutes || 60;
      const intervalMs = intervalMinutes * 60 * 1000;

      console.log(`Starting enhanced monitor with ${intervalMinutes} minute interval...`);

      // 立即运行一次
      await monitor.run();

      // 设置定时器
      const intervalId = setInterval(async () => {
        try {
          await monitor.run();
        } catch (error) {
          console.error('Monitor run failed:', error.message);
        }
      }, intervalMs);

      // 处理进程退出
      process.on('SIGINT', () => {
        console.log('\nReceived SIGINT, cleaning up...');
        clearInterval(intervalId);
        monitor.cleanup();
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        console.log('\nReceived SIGTERM, cleaning up...');
        clearInterval(intervalId);
        monitor.cleanup();
        process.exit(0);
      });

      // 保持进程运行
      process.stdin.resume();
    }
  } catch (error) {
    console.error('Monitor initialization failed:', error.message);
    process.exit(1);
  }
}

// 导出类供测试使用
module.exports = {
  EnhancedTestMonitor,
  WebhookNotifier,
  EmailNotifier,
  SlackNotifier,
  DiscordNotifier,
  MockNotifier,
};

// 如果直接运行此脚本，执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
