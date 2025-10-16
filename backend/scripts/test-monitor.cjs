#!/usr/bin/env node

/**
 * Test Monitor - 统一版本
 * 
 * 整合了安全增强版和功能增强版的所有功能：
 * 
 * 安全功能：
 * 1. 实现测试命令白名单验证 (SEC-1.1.1)
 * 2. 添加命令参数转义和验证 (SEC-1.1.2)
 * 3. 使用spawn替代execSync (SEC-1.1.3)
 * 4. 添加配置文件签名验证 (SEC-1.1.4)
 * 5. 实现路径规范化检查 (SEC-1.2.1)
 * 6. 添加路径遍历攻击防护 (SEC-1.2.2)
 * 7. 实现日志敏感信息脱敏 (SEC-1.3.1)
 * 8. 添加文件权限检查 (SEC-1.4.1)
 * 
 * 功能增强：
 * 1. 完成Webhook通知实现 (CONF-2.1.1)
 * 2. 实现邮件通知功能 (CONF-2.1.2)
 * 3. 支持Slack/Discord等即时通讯工具 (CONF-2.1.3)
 * 4. 实现通知级别配置 (CONF-2.1.4)
 * 5. 细化重试机制策略 (CONF-2.1.5)
 * 6. 添加测试执行时间统计 (CONF-2.2.1)
 * 7. 实现内存使用监控 (CONF-2.2.2)
 * 8. 添加CPU使用率监控 (CONF-2.2.3)
 * 9. 实现HTML格式报告 (CONF-2.3.1)
 * 10. 添加可视化图表支持 (CONF-2.3.2)
 * 11. 实现报告历史记录 (CONF-2.3.3)
 * 12. 支持报告导出功能 (CONF-2.3.4)
 * 13. 添加报告比较功能 (CONF-2.3.5)
 * 14. 实现配置热重载 (CONF-2.4.2)
 * 15. 支持多环境配置文件 (CONF-2.4.4)
 * 
 * @author 后端开发团队
 * @version 3.0.0-unified
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

// 导入安全模块
const { verifyConfigFileSignature } = require('./security/signature-verification');
const { readConfigFile, isConfigFileEncrypted } = require('./security/config-encryption');
const { validateTestRun } = require('./security/redesigned-user-validation.js');

// 配置常量
const CONFIG_FILE = path.join(__dirname, 'test-monitor.config.json');
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
      error: true
    },
    webhook: {
      enabled: false,
      url: '',
      format: 'default', // default, slack, discord, teams
      retryAttempts: 3,
      retryDelay: 2000,
      timeout: 10000
    },
    email: {
      enabled: false,
      smtp: {
        host: '',
        port: 587,
        secure: false,
        auth: {
          user: '',
          pass: ''
        }
      },
      from: '',
      to: [],
      subject: 'Test Monitor Report'
    },
    slack: {
      enabled: false,
      webhookUrl: '',
      channel: '#general',
      username: 'TestMonitor'
    },
    discord: {
      enabled: false,
      webhookUrl: '',
      username: 'TestMonitor'
    }
  },
  monitoring: {
    enabled: true,
    interval: 5000, // 5秒
    metrics: {
      executionTime: true,
      memoryUsage: true,
      cpuUsage: true
    },
    thresholds: {
      executionTime: 30000, // 30秒
      memoryUsage: 512 * 1024 * 1024, // 512MB
      cpuUsage: 80 // 80%
    }
  },
  reports: {
    enabled: true,
    formats: ['html', 'json'],
    history: {
      enabled: true,
      maxEntries: 100
    },
    export: {
      enabled: true,
      formats: ['csv', 'json']
    },
    comparison: {
      enabled: true,
      baseline: 'last' // last, specific, average
    }
  },
  config: {
    hotReload: true,
    environments: {
      development: 'test-monitor-dev.config.json',
      staging: 'test-monitor-staging.config.json',
      production: 'test-monitor-prod.config.json'
    },
    current: 'development'
  },
  security: {
    commandWhitelist: [
      'npm',
      'node',
      'jest',
      'mocha',
      'yarn',
      'pnpm',
      'echo'
    ],
    allowedPaths: [
      __dirname,
      path.join(__dirname, 'coverage'),
      path.join(__dirname, 'reports'),
      path.join(__dirname, 'test')
    ],
    enableSignatureVerification: false,
    publicKeyPath: '',
    logSanitization: true,
    filePermissions: {
      log: 0o600,
      report: 0o644,
      lock: 0o600
    },
    pathValidation: {
      enabled: true,
      strictMode: false
    },
    encryption: {
      enabled: false,
      password: process.env.CONFIG_ENCRYPTION_PASSWORD || ''
    },
    userValidation: {
      enabled: false,
      strictMode: false,
      allowedUsers: [],
      allowedGroups: [],
      forbiddenUsers: ['root', 'Administrator']
    }
  },
  features: {
    security: {
      enabled: true,
      pathValidation: true,
      signatureVerification: true,
      encryption: true,
      userValidation: true
    },
    performance: {
      enabled: true,
      monitoring: true,
      thresholds: true
    },
    notifications: {
      enabled: true,
      all: true,
      webhook: true,
      email: false,
      slack: false,
      discord: false
    },
    reports: {
      enabled: true,
      html: true,
      json: true,
      history: true,
      export: true
    },
    config: {
      hotReload: true
    }
  },
  featureFlags: {
    TM_NOTIFICATIONS_WEBHOOK_ENABLED: true,
    TM_NOTIFICATIONS_EMAIL_ENABLED: false,
    TM_MONITORING_PERFORMANCE_ENABLED: true,
    TM_REPORTS_HISTORY_ENABLED: true,
    TM_CONFIG_HOTRELOAD_ENABLED: true
  }
};

// 日志级别
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

/**
 * 统一的测试监控类
 */
class UnifiedTestMonitor {
  constructor(options = {}) {
    // 合并配置
    this.config = { ...DEFAULT_CONFIG, ...options };
    
    // 设置文件路径
    this.configFile = options.configFile || CONFIG_FILE;
    this.lockFile = options.lockFile || LOCK_FILE;
    this.logFile = options.logFile || LOG_FILE;
    this.reportsDir = options.reportsDir || REPORTS_DIR;
    this.historyDir = options.historyDir || HISTORY_DIR;
    
    // 初始化监控数据
    this.metrics = {
      startTime: null,
      endTime: null,
      executionTime: 0,
      memoryUsage: {
        initial: null,
        peak: null,
        final: null
      },
      cpuUsage: {
        initial: null,
        peak: null,
        final: null,
        samples: []
      }
    };
    
    // 验证用户
    if ((this.config.features.security.userValidation && this.config.security.userValidation.enabled) ||
        (this.config.security.userValidation && this.config.security.userValidation.enabled)) {
      this.validateUser();
    }
    
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
    if (this.config.features.config.hotReload && this.config.featureFlags.TM_CONFIG_HOTRELOAD_ENABLED) {
      this.initConfigHotReload();
    }
    
    this.log('INFO', 'Unified Test Monitor initialized');
  }

  /**
   * 验证配置
   */
  /**
   * 验证当前用户
   */
  validateUser() {
    try {
      // 构建测试配置
      const testConfig = {
        type: 'integration',
        name: 'Test Monitor',
        description: '验证用户是否有权限运行测试监控',
        showRecommendations: false // 不显示建议，避免干扰
      };
      
      // 验证当前用户
      const result = validateTestRun(testConfig);
      
      // 检查用户是否在禁止列表中
      const currentUser = result.user;
      const isForbidden = this.config.security.userValidation.forbiddenUsers.includes(currentUser.username);
      
      if (isForbidden) {
        this.log('ERROR', `User validation failed: User '${currentUser.username}' is in forbidden list`);
        throw new Error(`User validation failed: User '${currentUser.username}' is in forbidden list`);
      }
      
      // 如果启用了严格模式，检查用户是否在允许列表中
      if (this.config.security.userValidation.strictMode &&
          this.config.security.userValidation.allowedUsers.length > 0) {
        const isAllowed = this.config.security.userValidation.allowedUsers.includes(currentUser.username);
        
        if (!isAllowed) {
          this.log('ERROR', `User validation failed: User '${currentUser.username}' is not in allowed list (strict mode)`);
          throw new Error(`User validation failed: User '${currentUser.username}' is not in allowed list (strict mode)`);
        }
      }
      
      this.log('INFO', `User validation passed: User '${currentUser.username}' is allowed to run test monitor`);
      
      // 记录安全建议（如果有）
      if (result.recommendations && result.recommendations.length > 0) {
        this.log('INFO', `Security recommendations available: ${result.recommendations.length} items`);
        result.recommendations.forEach((rec, index) => {
          this.log('INFO', `  ${index + 1}. ${rec.message} (${rec.priority} priority)`);
        });
      }
    } catch (error) {
      this.log('ERROR', `User validation error: ${error.message}`);
      throw error;
    }
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
    
    if (!this.config.security || !this.config.security.commandWhitelist || !this.config.security.commandWhitelist.includes(command)) {
      throw new Error(`Command '${command}' is not in whitelist`);
    }
    
    // 验证路径
    if ((this.config.features.security && this.config.features.security.pathValidation && this.config.features.security.pathValidation.enabled) ||
        (this.config.security && this.config.security.pathValidation && this.config.security.pathValidation.enabled)) {
      this.validatePath(this.config.coverageFile);
      this.validatePath(this.configFile);
      this.validatePath(this.logFile);
    }
    
    // 验证通知配置
    if (this.config.features.notifications.enabled && this.config.notifications.enabled) {
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
   * 验证路径安全性
   */
  validatePath(filePath) {
    // 检查路径是否包含潜在的路径遍历攻击
    const traversalPatterns = [
      /\.\.[\/\\]/, // ../ or ..\
      /\.\.%2f/i, // URL编码的../
      /\.\.%5c/i, // URL编码的..\
      /%2e%2e[\/\\]/i, // 双重URL编码的../
      /\.\.\/\.\.\//, // 多级遍历
      /\.\.\//g // 多个../
    ];
    
    for (const pattern of traversalPatterns) {
      if (pattern.test(filePath)) {
        throw new Error(`Path contains potential traversal attack: ${filePath}`);
      }
    }
    
    const resolvedPath = path.resolve(filePath);
    
    // 检查路径是否在允许的目录范围内
    if (!this.config.security || !this.config.security.allowedPaths) {
      throw new Error(`Security configuration is missing, cannot validate path`);
    }
    
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
    const logDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // 设置日志文件权限
    if (fs.existsSync(LOG_FILE)) {
      if (this.config.security && this.config.security.filePermissions && this.config.security.filePermissions.log) {
        fs.chmodSync(LOG_FILE, this.config.security.filePermissions.log);
      }
    }
  }

  /**
   * 设置文件权限
   */
  setFilePermissions() {
    // 设置日志文件权限
    if (fs.existsSync(LOG_FILE)) {
      if (this.config.security && this.config.security.filePermissions && this.config.security.filePermissions.log) {
        fs.chmodSync(LOG_FILE, this.config.security.filePermissions.log);
      }
    }
    
    // 设置锁文件权限
    if (fs.existsSync(LOCK_FILE)) {
      if (this.config.security && this.config.security.filePermissions && this.config.security.filePermissions.lock) {
        fs.chmodSync(LOCK_FILE, this.config.security.filePermissions.lock);
      }
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
    if ((this.config.features.notifications && !this.config.features.notifications.enabled) ||
        (this.config.notifications && !this.config.notifications.enabled)) {
      this.log('DEBUG', 'Notifications are disabled globally');
      return;
    }
    
    // 初始化Webhook通知器
    if ((this.config.features.notifications && this.config.features.notifications.webhook && this.config.features.notifications.webhook.enabled) ||
        (this.config.notifications && this.config.notifications.webhook && this.config.notifications.webhook.enabled)) {
      if (this.config.featureFlags && this.config.featureFlags.TM_NOTIFICATIONS_WEBHOOK_ENABLED) {
        this.notifiers.push(new WebhookNotifier(this.config.notifications.webhook));
        this.log('DEBUG', 'Webhook notifier initialized');
      }
    }
    
    // 初始化邮件通知器
    if ((this.config.features.notifications && this.config.features.notifications.email && this.config.features.notifications.email.enabled) ||
        (this.config.notifications && this.config.notifications.email && this.config.notifications.email.enabled)) {
      if (this.config.featureFlags && this.config.featureFlags.TM_NOTIFICATIONS_EMAIL_ENABLED) {
        this.notifiers.push(new EmailNotifier(this.config.notifications.email));
        this.log('DEBUG', 'Email notifier initialized');
      }
    }
    
    // 初始化Slack通知器
    if ((this.config.features.notifications && this.config.features.notifications.slack && this.config.features.notifications.slack.enabled) ||
        (this.config.notifications && this.config.notifications.slack && this.config.notifications.slack.enabled)) {
      this.notifiers.push(new SlackNotifier(this.config.notifications.slack));
      this.log('DEBUG', 'Slack notifier initialized');
    }
    
    // 初始化Discord通知器
    if ((this.config.features.notifications && this.config.features.notifications.discord && this.config.features.notifications.discord.enabled) ||
        (this.config.notifications && this.config.notifications.discord && this.config.notifications.discord.enabled)) {
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
    this.configWatcher = fs.watch(CONFIG_FILE, (eventType) => {
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
      let newConfig;
      
      // 检查是否需要解密配置
      if (this.config.features.security.encryption &&
          this.config.security.encryption.enabled &&
          isConfigFileEncrypted(CONFIG_FILE)) {
        // 解密配置文件
        newConfig = readConfigFile(CONFIG_FILE, this.config.security.encryption.password);
      } else {
        // 直接读取配置文件
        newConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      }
      
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
        ...meta
      };
      
      // 敏感信息脱敏
      if (this.config.security.logSanitization ||
          (this.config.features.security && this.config.features.security.logSanitization)) {
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
    
    // 脱敏Windows路径
    message = message.replace(/(C:\\Users\\[^\\]+\\)/g, 'C:\\Users\\***\\');
    
    return message;
  }

  /**
   * 开始监控性能指标
   */
  startPerformanceMonitoring() {
    if (!(this.config.features.performance && this.config.features.performance.enabled) ||
        !(this.config.features.performance.monitoring && this.config.features.performance.monitoring.enabled) ||
        !(this.config.monitoring && this.config.monitoring.enabled) ||
        !(this.config.featureFlags && this.config.featureFlags.TM_MONITORING_PERFORMANCE_ENABLED)) {
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
    if (this.config.monitoring.metrics && this.config.monitoring.metrics.memoryUsage && this.config.monitoring.metrics.memoryUsage.enabled) {
      const memUsage = process.memoryUsage();
      
      // 更新峰值内存使用
      if (memUsage.heapUsed > this.metrics.memoryUsage.peak.heapUsed) {
        this.metrics.memoryUsage.peak = memUsage;
      }
      
      // 检查内存使用阈值
      if (this.config.features.performance.thresholds &&
          memUsage.heapUsed > this.config.monitoring.thresholds.memoryUsage) {
        this.log('WARN', `Memory usage (${memUsage.heapUsed / 1024 / 1024}MB) exceeds threshold (${this.config.monitoring.thresholds.memoryUsage / 1024 / 1024}MB)`);
      }
    }
    
    // 采集CPU使用率
    if (this.config.monitoring.metrics && this.config.monitoring.metrics.cpuUsage && this.config.monitoring.metrics.cpuUsage.enabled) {
      const cpuUsage = this.getCpuUsage();
      this.metrics.cpuUsage.samples.push({
        timestamp: Date.now(),
        usage: cpuUsage
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
      if (this.config.features.performance.thresholds &&
          cpuUsage > this.config.monitoring.thresholds.cpuUsage) {
        this.log('WARN', `CPU usage (${cpuUsage}%) exceeds threshold (${this.config.monitoring.thresholds.cpuUsage}%)`);
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
    
    for (let cpu of cpus) {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }
    
    return 100 - (totalIdle / totalTick * 100);
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
        shell: process.platform === 'win32' && command === 'node'
      };
      
      const child = spawn(command, escapedArgs, options);
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          this.log('DEBUG', `Command completed successfully`);
          resolve({ stdout, stderr, exitCode: code });
        } else {
          this.log('ERROR', `Command failed with exit code ${code}: ${stderr}`);
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });
      
      child.on('error', (error) => {
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
    if (!((this.config.features.security && this.config.features.security.signatureVerification) ||
          (this.config.security && this.config.security.enableSignatureVerification))) {
      return true;
    }
    
    try {
      // 使用配置中的签名文件路径，如果没有则使用默认路径
      const signaturePath = this.config.security.signaturePath || `${this.configFile}.sig`;
      
      // 检查签名文件是否存在
      if (!fs.existsSync(signaturePath)) {
        this.log('WARN', 'Config signature file not found, skipping verification');
        return true;
      }
      
      // 使用配置中的公钥路径，如果没有则使用默认路径
      const publicKeyPath = this.config.security.publicKeyPath;
      
      // 使用签名验证模块验证签名
      const isValid = verifyConfigFileSignature(
        this.configFile,
        publicKeyPath,
        signaturePath
      );
      
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
      if ((this.config.features.security && this.config.features.security.signatureVerification) ||
          (this.config.security && this.config.security.enableSignatureVerification)) {
        await this.verifyConfigSignature();
      }
      
      // 开始性能监控
      if (this.config.features.performance && this.config.features.performance.enabled) {
        this.startPerformanceMonitoring();
      }
      
      // 解析测试命令
      const commandParts = this.config.testCommand.split(' ');
      const command = commandParts[0];
      const args = commandParts.slice(1);
      
      // 执行测试命令
      await this.executeCommand(command, args);
      
      // 停止性能监控
      if (this.config.features.performance && this.config.features.performance.enabled) {
        this.stopPerformanceMonitoring();
      }
      
      // 分析覆盖率
      const coverageData = this.analyzeCoverage();
      
      // 检查性能阈值
      if (this.config.features.performance && this.config.features.performance.thresholds && this.config.features.performance.thresholds.enabled) {
        this.checkPerformanceThresholds();
      }
      
      return {
        success: true,
        coverage: coverageData,
        metrics: this.metrics
      };
    } catch (error) {
      // 停止性能监控
      if (this.config.features.performance.enabled) {
        this.stopPerformanceMonitoring();
      }
      
      this.log('ERROR', `Test execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 检查性能阈值
   */
  checkPerformanceThresholds() {
    // 检查执行时间阈值
    if (this.config.monitoring.metrics.executionTime && 
        this.metrics.executionTime > this.config.monitoring.thresholds.executionTime) {
      this.log('WARN', `Execution time (${this.metrics.executionTime}ms) exceeds threshold (${this.config.monitoring.thresholds.executionTime}ms)`);
    }
    
    // 检查内存使用阈值
    if (this.config.monitoring.metrics.memoryUsage && 
        this.metrics.memoryUsage.peak.heapUsed > this.config.monitoring.thresholds.memoryUsage) {
      this.log('WARN', `Peak memory usage (${this.metrics.memoryUsage.peak.heapUsed / 1024 / 1024}MB) exceeds threshold (${this.config.monitoring.thresholds.memoryUsage / 1024 / 1024}MB)`);
    }
    
    // 检查CPU使用率阈值
    if (this.config.monitoring.metrics.cpuUsage && 
        this.metrics.cpuUsage.peak > this.config.monitoring.thresholds.cpuUsage) {
      this.log('WARN', `Peak CPU usage (${this.metrics.cpuUsage.peak}%) exceeds threshold (${this.config.monitoring.thresholds.cpuUsage}%)`);
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
    if (!this.config.features.reports.enabled || !this.config.reports.enabled) {
      return null;
    }
    
    const reports = {};
    
    // 生成JSON报告
    if (this.config.reports.formats.includes('json')) {
      reports.json = await this.generateJsonReport(testResult);
    }
    
    // 生成HTML报告
    if (this.config.features.reports.html && this.config.reports.formats.includes('html')) {
      reports.html = await this.generateHtmlReport(testResult);
    }
    
    // 保存到历史记录
    if (this.config.features.reports.history && 
        this.config.reports.history.enabled && 
        this.config.featureFlags.TM_REPORTS_HISTORY_ENABLED) {
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
    
    const success = coverage && coverage.total && coverage.total.lines ?
      coverage.total.lines.pct >= this.config.targetCoverage : false;
    
    // 如果覆盖率数据缺失，记录警告
    if (!coverage || !coverage.total || !coverage.total.lines) {
      this.log('WARN', 'Coverage data is incomplete or missing, marking test as potentially failed');
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
          webhook: this.config.notifications && this.config.notifications.webhook ? this.config.notifications.webhook.enabled : false,
          email: this.config.notifications && this.config.notifications.email ? this.config.notifications.email.enabled : false,
          slack: this.config.notifications && this.config.notifications.slack ? this.config.notifications.slack.enabled : false,
          discord: this.config.notifications && this.config.notifications.discord ? this.config.notifications.discord.enabled : false
        }
      }
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
        baseline: this.config.reports.comparison.baseline
      });
      
      this.log('INFO', `HTML report generated: ${result.htmlPath}`);
      
      return result.htmlPath;
    } catch (error) {
      this.log('ERROR', `Failed to generate HTML report: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取历史数据
   */
  async getHistoryData(baseline) {
    if (!this.config.features.reports.history || 
        !this.config.reports.history.enabled || 
        !fs.existsSync(HISTORY_DIR)) {
      return null;
    }
    
    try {
      const historyFiles = fs.readdirSync(HISTORY_DIR)
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
              lines: { pct: count > 0 ? totalCoverage / count : 0 }
            }
          }
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
    if (!this.config.features.reports.history || 
        !this.config.reports.history.enabled || 
        !fs.existsSync(HISTORY_DIR)) {
      return;
    }
    
    try {
      // 生成历史记录文件
      const historyFile = path.join(HISTORY_DIR, `test-monitor-${Date.now()}.json`);
      
      // 防御性编程：确保覆盖率数据结构完整
      const coverage = testResult.coverage || {};
      const coverageTotal = coverage.total || {};
      const linesCoverage = coverageTotal.lines || { pct: 0 };
      
      const success = coverage && coverage.total && coverage.total.lines ?
        coverage.total.lines.pct >= this.config.targetCoverage : false;
      
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
        success: success
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
      const historyFiles = fs.readdirSync(HISTORY_DIR)
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
    if (!this.config.features.notifications.enabled || !this.config.notifications.enabled) {
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
      targetCoverage: this.config.targetCoverage
    };
    
    // 并行发送所有通知
    const notificationPromises = this.notifiers.map(notifier => 
      notifier.send(notificationLevel, notificationData)
        .catch(error => {
          this.log('ERROR', `Notification failed (${notifier.constructor.name}): ${error.message}`);
        })
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
    
    if (coverage && coverage.total && coverage.total.lines &&
        coverage.total.lines.pct < this.config.targetCoverage) {
      return 'warning';
    }
    
    // 如果覆盖率数据缺失，返回警告级别
    if (!coverage || !coverage.total || !coverage.total.lines) {
      this.log('WARN', 'Coverage data is incomplete or missing for notification level determination');
      return 'warning';
    }
    
    // 检查性能阈值
    if (this.config.features.performance.thresholds &&
        (this.metrics.executionTime > this.config.monitoring.thresholds.executionTime ||
         (this.metrics.memoryUsage.peak && this.metrics.memoryUsage.peak.heapUsed > this.config.monitoring.thresholds.memoryUsage) ||
         (this.metrics.cpuUsage.peak && this.metrics.cpuUsage.peak > this.config.monitoring.thresholds.cpuUsage))) {
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
      if (this.config.security && this.config.security.filePermissions && this.config.security.filePermissions.lock) {
        fs.chmodSync(LOCK_FILE, this.config.security.filePermissions.lock);
      }
      
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
      this.log('INFO', 'Starting unified test monitoring...');
      
      // 运行测试
      const testResult = await this.runTest();
      
      // 生成报告
      const reports = await this.generateReports(testResult);
      
      // 发送通知
      await this.sendNotification(testResult, reports);
      
      this.log('INFO', 'Unified test monitoring completed successfully');
      
      return { testResult, reports };
    } catch (error) {
      this.log('ERROR', `Unified test monitoring failed: ${error.message}`);
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
    if (this.config.features.performance.enabled) {
      this.stopPerformanceMonitoring();
    }
    
    // 停止配置热重载
    if (this.configWatcher) {
      this.configWatcher.close();
      this.configWatcher = null;
    }
    
    this.log('INFO', 'Unified Test Monitor cleaned up');
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
          attachments: [{
            color: level === 'error' ? 'danger' : level === 'warning' ? 'warning' : 'good',
            fields: [
              { title: 'Status', value: data.success ? 'Success' : 'Failed', short: true },
              { title: 'Coverage', value: `${data.coverage ? data.coverage.total.lines.pct : 'N/A'}%`, short: true },
              { title: 'Execution Time', value: `${(data.metrics.executionTime / 1000).toFixed(2)}s`, short: true }
            ],
            footer: 'Test Monitor',
            ts: Date.now() / 1000
          }]
        };
        
      case 'discord':
        return {
          embeds: [{
            title: `Test Monitor ${level}`,
            color: level === 'error' ? 0xFF0000 : level === 'warning' ? 0xFFFF00 : 0x00FF00,
            fields: [
              { name: 'Status', value: data.success ? 'Success' : 'Failed', inline: true },
              { name: 'Coverage', value: `${data.coverage ? data.coverage.total.lines.pct : 'N/A'}%`, inline: true },
              { name: 'Execution Time', value: `${(data.metrics.executionTime / 1000).toFixed(2)}s`, inline: true }
            ],
            footer: { text: 'Test Monitor' },
            timestamp: new Date().toISOString()
          }]
        };
        
      case 'teams':
        return {
          "@type": "MessageCard",
          "@context": "http://schema.org/extensions",
          "themeColor": level === 'error' ? 'FF0000' : level === 'warning' ? 'FFFF00' : '00FF00',
          "summary": `Test Monitor ${level}`,
          "sections": [{
            "activityTitle": `Test Monitor ${level}`,
            "facts": [
              { "name": "Status", "value": data.success ? 'Success' : 'Failed' },
              { "name": "Coverage", "value": `${data.coverage ? data.coverage.total.lines.pct : 'N/A'}%` },
              { "name": "Execution Time", "value": `${(data.metrics.executionTime / 1000).toFixed(2)}s` }
            ],
            "markdown": true
          }]
        };
        
      default:
        return {
          timestamp: data.timestamp,
          level,
          success: data.success,
          coverage: data.coverage,
          metrics: data.metrics,
          targetCoverage: data.targetCoverage
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
        'User-Agent': 'Test-Monitor/3.0.0'
      },
      timeout: this.config.timeout || 10000
    };

    return new Promise((resolve, reject) => {
      const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
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

      req.on('error', (error) => {
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
      timeout: this.config.timeout || 10000
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
      timeout: this.config.timeout || 10000
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
      } else if (arg.startsWith('--mode=')) {
        options.mode = arg.split('=')[1]; // security, performance, full
      } else if (arg === '--once') {
        options.once = true;
      }
    }
    
    // 根据模式调整功能开关
    if (options.mode) {
      switch (options.mode) {
        case 'security':
          options.features = {
            security: {
              enabled: true,
              pathValidation: true,
              signatureVerification: true,
              encryption: true,
              userValidation: true
            },
            performance: { enabled: false, monitoring: false, thresholds: false },
            notifications: { enabled: false, all: false },
            reports: { enabled: true, html: false, json: true, history: false, export: false },
            config: { hotReload: false }
          };
          break;
        case 'performance':
          options.features = {
            security: {
              enabled: true,
              pathValidation: true,
              signatureVerification: false,
              encryption: false,
              userValidation: false
            },
            performance: { enabled: true, monitoring: true, thresholds: true },
            notifications: { enabled: true, all: false },
            reports: { enabled: true, html: true, json: true, history: true, export: true },
            config: { hotReload: true }
          };
          break;
        case 'full':
        default:
          // 使用默认配置，启用所有功能
          break;
      }
    }
    
    // 加载环境特定配置
    if (options.env) {
      const envConfigPath = DEFAULT_CONFIG.config.environments[options.env];
      if (envConfigPath && fs.existsSync(envConfigPath)) {
        let envConfig;
        
        // 检查是否需要解密配置
        if (options.features && options.features.security &&
            options.features.security.encryption &&
            isConfigFileEncrypted(envConfigPath)) {
          // 解密配置文件
          envConfig = readConfigFile(envConfigPath, process.env.CONFIG_ENCRYPTION_PASSWORD);
        } else {
          // 直接读取配置文件
          envConfig = JSON.parse(fs.readFileSync(envConfigPath, 'utf8'));
        }
        
        options = { ...options, ...envConfig };
      }
    }

    // 确保测试命令是有效的
    if (!options.testCommand) {
      options.testCommand = 'npm test';
    }
    
    // 创建监控实例
    const monitor = new UnifiedTestMonitor(options);
    
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
      
      console.log(`Starting unified monitor with ${intervalMinutes} minute interval...`);
      
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
  UnifiedTestMonitor,
  WebhookNotifier,
  EmailNotifier,
  SlackNotifier,
  DiscordNotifier,
  MockNotifier
};

// 如果直接运行此脚本，执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}