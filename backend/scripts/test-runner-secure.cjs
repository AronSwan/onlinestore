#!/usr/bin/env node

/**
 * 测试运行脚本 v3.3 - 健壮性增强版
 * 基于超级全面测试结果的改进版本
 * 
 * 主要改进:
 * 1. 优化命令执行频率限制机制
 * 2. 增强边界条件处理
 * 3. 改进并发安全性
 * 4. 优化性能和资源管理
 * 5. 增强错误恢复机制
 */

// 核心Node.js模块依赖
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// 设置测试环境变量
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-that-is-very-long-for-testing-only-at-least-32-characters-long';
}

// 第三方依赖检查
const DEPENDENCIES = {
  required: {
    'child_process': 'built-in',
    'fs': 'built-in',
    'path': 'built-in',
    'os': 'built-in',
    'crypto': 'built-in'
  },
  optional: {
    './memory-monitor.cjs': 'local',
    './error-manager.cjs': 'local',
    './boundary-tests.cjs': 'local',
    './error-handler.cjs': 'local',
    './read-write-lock.cjs': 'local',
    './sandbox-executor.cjs': 'local',
    './encrypted-audit-logger.cjs': 'local',
    './security-scanner-plugin.cjs': 'local',
    './openobserve-monitor.cjs': 'local'
  }
};

// 导入本地优化组件（带错误处理）
let MemoryMonitor, ErrorManager, BoundaryTestSuite, StandardError, ErrorTypes, ErrorSeverity;
let ReadWriteLock, SandboxExecutor, EncryptedAuditLogger, SecurityScannerPlugin;
let OpenObserveMonitor, OpenObserveAdapter;

try {
  MemoryMonitor = require('./memory-monitor.cjs');
  ErrorManager = require('./error-manager.cjs');
  BoundaryTestSuite = require('./boundary-tests.cjs');
  const errorHandler = require('./error-handler.cjs');
  StandardError = errorHandler.StandardError;
  ErrorTypes = errorHandler.ErrorTypes;
  ErrorSeverity = errorHandler.ErrorSeverity;
  
  const readWriteLock = require('./read-write-lock.cjs');
  ReadWriteLock = readWriteLock.ReadWriteLock;
  
  const sandboxExecutor = require('./sandbox-executor.cjs');
  SandboxExecutor = sandboxExecutor.SandboxExecutor;
  
  const encryptedAuditLogger = require('./encrypted-audit-logger.cjs');
  EncryptedAuditLogger = encryptedAuditLogger.EncryptedAuditLogger;
  
  const securityScannerPlugin = require('./security-scanner-plugin.cjs');
  SecurityScannerPlugin = securityScannerPlugin.SecurityScannerPlugin;
  
  const openobserveMonitor = require('./openobserve-monitor.cjs');
  OpenObserveMonitor = openobserveMonitor.OpenObserveMonitor;
  OpenObserveAdapter = openobserveMonitor.OpenObserveAdapter;
} catch (error) {
  console.warn('⚠️ 部分依赖加载失败，某些功能可能受限:', error.message);
}

// 增强的日志管理器
class Logger {
  constructor(config) {
    this.config = config;
    this.enabled = config.logging?.enableConsole !== false;
    this.level = config.logging?.level || 'info';
    this.logFile = config.logging?.filePath;
    this.setupFileLogging();
  }
  
  setupFileLogging() {
    if (this.logFile) {
      try {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
      } catch (error) {
        console.warn('无法创建日志目录:', error.message);
        this.logFile = null;
      }
    }
  }
  
  log(message, level = 'info') {
    if (!this.enabled) return;
    if (this.shouldLog(level)) {
      const timestamp = new Date().toISOString();
      const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
      console.log(formattedMessage);
      this.writeToFile(formattedMessage);
    }
  }
  
  error(message) {
    if (!this.enabled) return;
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [ERROR] ${message}`;
    console.error(formattedMessage);
    this.writeToFile(formattedMessage);
  }
  
  warn(message) {
    this.log(message, 'warn');
  }
  
  debug(message) {
    this.log(message, 'debug');
  }
  
  shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.level];
  }
  
  writeToFile(message) {
    if (this.logFile) {
      try {
        fs.appendFileSync(this.logFile, message + '\n', 'utf8');
      } catch (error) {
        console.warn('写入日志文件失败:', error.message);
      }
    }
  }
}

// 配置管理器
class ConfigManager {
  static loadConfig() {
    try {
      const configModule = require('./test-runner-secure.config.cjs');
      const config = configModule.getConfig();
      configModule.validateConfig(config);
      return config;
    } catch (error) {
      console.error('❌ 配置加载失败，使用默认配置:', error.message);
      return ConfigManager.getDefaultConfig();
    }
  }
  
  static getDefaultConfig() {
    return {
      version: '3.3.0',
      name: 'test-runner-secure-improved',
      commandRateLimit: {
        maxExecutions: 50,
        timeWindow: 10000,
        cooldownPeriod: 2000
      },
      validation: {
        maxArgLength: 2000,
        maxArgs: 50,
        allowedChars: /^[a-zA-Z0-9\-_.\/\\:=, ]*$/,
        dangerousPatterns: [
          /[;&|`$(){}[\]]/,
          /\.\.\//,
          /<script/i,
          /\x00/,
          /\u0000-\u001f/,
          /drop\s+table/i,
          /rm\s+-rf/i,
          /del\s+\/[sq]/i
        ]
      },
      performance: {
        maxMemoryMB: 512,
        maxExecutionTime: 30000,
        gcInterval: 5000,
        monitorInterval: 1000
      },
      concurrency: {
        maxConcurrent: Math.min(os.cpus().length, 8),
        lockTimeout: 10000,
        retryAttempts: 3,
        retryDelay: 1000
      },
      logging: {
        enableConsole: true,
        level: 'info',
        filePath: null
      },
      sandbox: {
        enabled: true,
        resourceLimits: {
          maxMemoryMB: 256,
          maxCpuTime: 30,
          maxFileSize: 10 * 1024 * 1024
        },
        securityLimits: {
          allowedPaths: ['/tmp', process.cwd()],
          blockedCommands: ['rm', 'sudo', 'chmod', 'kill']
        }
      },
      audit: {
        enabled: true,
        encryption: {
          enabled: true,
          algorithm: 'aes-256-gcm'
        },
        compression: {
          enabled: true,
          level: 6
        },
        integrity: {
          enabled: true,
          algorithm: 'sha256'
        },
        rotation: {
          maxFileSize: 10 * 1024 * 1024,
          maxFiles: 10
        }
      },
      security: {
        enabled: true,
        scanOnStartup: false,
        scanOnTestFailure: true,
        codeSecurity: {
          enabled: true,
          excludePatterns: ['**/node_modules/**', '**/dist/**', '**/coverage/**']
        },
        dependencySecurity: {
          enabled: true,
          checkVulnerabilities: true,
          checkLicenses: true
        },
        configSecurity: {
          enabled: true,
          checkFilePermissions: true
        }
      },
      caching: {
        enabled: true,
        maxSize: 100,
        ttl: 3600000, // 1小时
        cleanupInterval: 300000 // 5分钟清理一次过期缓存
      },
      monitoring: {
        enabled: true,
        openobserve: {
          enabled: true,
          endpoint: process.env.OPENOBSERVE_ENDPOINT || 'http://localhost:5080',
          organization: process.env.OPENOBSERVE_ORG || 'default',
          username: process.env.OPENOBSERVE_USERNAME || 'admin',
          password: process.env.OPENOBSERVE_PASSWORD || 'Complexpass#123',
          batching: {
            enabled: true,
            maxBatchSize: 100,
            maxBatchTime: 5000
          },
          streams: {
            logs: 'test-runner-logs',
            metrics: 'test-runner-metrics',
            traces: 'test-runner-traces'
          }
        }
      }
    };
  }
}

// 导入配置
const CONFIG = ConfigManager.loadConfig();
const logger = new Logger(CONFIG);

// 版本信息
const VERSION = CONFIG.version || '3.3.0';
const SCRIPT_NAME = CONFIG.name || 'test-runner-secure-improved';

// 全局状态管理
class StateManager {
  constructor() {
    this.commandHistory = new Map();
    this.activeProcesses = new Map();
    this.resourceMonitor = null;
    this.processLocks = new Map();
    // 跟踪锁的超时计时器，便于统一清理
    this.lockTimeouts = new Map();
    this.errorRecovery = new ErrorRecoveryManager();
    
    // 读写锁分离机制
    this.readWriteLocks = new Map();
    this.globalLock = new ReadWriteLock({
      writeTimeout: 15000,
      readTimeout: 5000,
      fairMode: true
    });

    // 新增：性能监控数据结构 - 使用真实数据收集
    this.performanceMetrics = {
      testExecutionTimes: new Map(), // 测试执行时间历史
      cacheStats: {
        hits: 0,
        misses: 0,
        evictions: 0,
        totalRequests: 0
      },
      resourceUsage: {
        peakMemory: 0,
        averageCpu: 0,
        totalCommands: 0,
        commandExecutionTimes: new Map(), // 命令执行时间历史
        memorySnapshots: [] // 内存使用快照
      },
      realTimeMetrics: {
        startTime: Date.now(),
        testSuitesExecuted: 0,
        commandsExecuted: 0,
        errorsEncountered: 0
      }
    };

    // 新增：测试依赖关系图
    this.testDependencyGraph = new Map();
    
    // 新增：缓存持久化支持
    this.cachePersistence = {
      enabled: process.env.CACHE_PERSISTENCE !== 'false',
      filePath: path.resolve(__dirname, '..', '.test-cache', 'test-runner-cache.json'),
      saveInterval: 30000 // 30秒保存一次
    };

    // 新增：性能指标持久化支持
    this.performancePersistence = {
      enabled: process.env.PERFORMANCE_PERSISTENCE !== 'false',
      filePath: path.resolve(__dirname, '..', '.test-cache', 'test-runner-performance.json'),
      saveInterval: 10000 // 10秒保存一次，便于测试验证
    };

    // 新增：结构化日志
    this.structuredLogs = [];
    
    // 新增：缓存系统
    this.cacheConfig = CONFIG.caching || {
      enabled: true,
      maxSize: 100,
      ttl: 3600000,
      cleanupInterval: 300000
    };
    this.commandCache = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    
    // 新增：测试文件时间戳跟踪
    this.testFileTimestamps = new Map();
    
    // 延迟初始化缓存持久化，避免循环依赖
    process.nextTick(() => {
      if (this.cachePersistence.enabled) {
        this.initCachePersistence();
      }
    });
  }
  
  // 获取或创建读写锁
  getReadWriteLock(resourceId) {
    if (!this.readWriteLocks.has(resourceId)) {
      this.readWriteLocks.set(resourceId, new ReadWriteLock({
        writeTimeout: 10000,
        readTimeout: 5000,
        fairMode: true
      }));
    }
    return this.readWriteLocks.get(resourceId);
  }
  
  // 读锁操作
  async withReadLock(resourceId, operation) {
    const lock = this.getReadWriteLock(resourceId);
    const release = await lock.acquireReadLock();
    try {
      return await operation();
    } finally {
      release();
    }
  }
  
  // 写锁操作
  async withWriteLock(resourceId, operation) {
    const lock = this.getReadWriteLock(resourceId);
    const release = await lock.acquireWriteLock();
    try {
      return await operation();
    } finally {
      release();
    }
  }
  
  // 改进的命令频率检查
  async checkCommandRate(command) {
    const key = command.split(' ')[0]; // 使用命令名作为key
    
    return this.withWriteLock(`rate:${key}`, async () => {
      const now = Date.now();
      
      if (!this.commandHistory.has(key)) {
        this.commandHistory.set(key, []);
      }
      
      const history = this.commandHistory.get(key);
      
      // 清理过期记录
      const validHistory = history.filter(
        time => now - time < CONFIG.commandRateLimit.timeWindow
      );
      
      // 检查频率限制
      if (validHistory.length >= CONFIG.commandRateLimit.maxExecutions) {
        const oldestExecution = Math.min(...validHistory);
        const waitTime = CONFIG.commandRateLimit.timeWindow - (now - oldestExecution);
        
        if (waitTime > 0) {
          console.warn(`⚠️ 命令执行频率限制，等待 ${Math.ceil(waitTime/1000)} 秒`);
          return { allowed: false, waitTime };
        }
      }
      
      // 记录本次执行
      validHistory.push(now);
      this.commandHistory.set(key, validHistory);
      
      return { allowed: true, waitTime: 0 };
    });
  }
  
  // 进程锁管理
  acquireLock(lockId) {
    if (this.processLocks.has(lockId)) {
      return false;
    }
    
    this.processLocks.set(lockId, {
      acquired: Date.now(),
      pid: process.pid
    });
    
    // 设置锁超时并记录计时器句柄，确保可清理
    const timeoutHandle = setTimeout(() => {
      this.releaseLock(lockId);
    }, CONFIG.concurrency.lockTimeout);
    this.lockTimeouts.set(lockId, timeoutHandle);
    
    return true;
  }
  
  releaseLock(lockId) {
    // 先清理与该锁相关的计时器
    if (this.lockTimeouts.has(lockId)) {
      clearTimeout(this.lockTimeouts.get(lockId));
      this.lockTimeouts.delete(lockId);
    }
    return this.processLocks.delete(lockId);
  }
  
  // 资源监控
  startResourceMonitoring() {
    if (this.resourceMonitor) return;
    
    // 配置边界校验
    const minMonitorInterval = 100; // 最小监控间隔 100ms
    const maxMonitorInterval = 60000; // 最大监控间隔 60s
    const monitorInterval = Math.max(minMonitorInterval,
      Math.min(CONFIG.performance.monitorInterval, maxMonitorInterval));
    
    const minMemoryMB = 10; // 最小内存限制 10MB
    const maxMemoryLimitMB = 8192; // 最大内存限制 8GB
    const validatedMaxMemoryMB = Math.max(minMemoryMB,
      Math.min(CONFIG.performance.maxMemoryMB, maxMemoryLimitMB));
    
    this.resourceMonitor = setInterval(() => {
      const memUsage = process.memoryUsage();
      const memMB = memUsage.heapUsed / 1024 / 1024;
      const totalMemMB = memUsage.heapTotal / 1024 / 1024;
      const rssMemMB = memUsage.rss / 1024 / 1024;
      
      // 更新内存使用峰值
      if (memMB > this.performanceMetrics.resourceUsage.peakMemory) {
        this.performanceMetrics.resourceUsage.peakMemory = memMB;
      }
      
      // 记录内存使用指标
      this.recordPerformanceMetric('memory_usage', memMB);
      
      // 确保 memorySnapshots 数组存在
      if (!this.performanceMetrics.resourceUsage.memorySnapshots) {
        this.performanceMetrics.resourceUsage.memorySnapshots = [];
      }
      
      // 记录内存快照（每5次记录一次，避免数据过多）
      if (this.performanceMetrics.resourceUsage.memorySnapshots.length % 5 === 0) {
        this.performanceMetrics.resourceUsage.memorySnapshots.push({
          timestamp: Date.now(),
          heapUsed: memMB,
          heapTotal: totalMemMB,
          rss: rssMemMB
        });
        
        // 保持最近50个内存快照
        if (this.performanceMetrics.resourceUsage.memorySnapshots.length > 50) {
          this.performanceMetrics.resourceUsage.memorySnapshots.shift();
        }
      }
      
      if (memMB > validatedMaxMemoryMB) {
        console.warn(`⚠️ 内存使用过高: ${memMB.toFixed(2)}MB (限制: ${validatedMaxMemoryMB}MB)`);
        
        // 触发垃圾回收
        if (global.gc) {
          global.gc();
        }
        
        // 清理历史记录
        this.cleanupHistory();
      }
    }, monitorInterval);
  }
  
  stopResourceMonitoring() {
    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor);
      this.resourceMonitor = null;
    }
    
    // 停止缓存清理定时器
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }
    
    // 停止所有锁的超时计时器，避免悬挂的 setTimeout 保持事件循环存活
    this.clearAllLockTimeouts();
  }
  
  cleanupHistory() {
    return this.withWriteLock('commandHistory', async () => {
      const now = Date.now();
      for (const [key, history] of this.commandHistory.entries()) {
        const validHistory = history.filter(
          time => now - time < CONFIG.commandRateLimit.timeWindow * 2
        );
        
        if (validHistory.length === 0) {
          this.commandHistory.delete(key);
        } else {
          this.commandHistory.set(key, validHistory);
        }
      }
    });
  }
  
  // 清理所有锁的超时计时器
  clearAllLockTimeouts() {
    for (const [lockId, handle] of this.lockTimeouts.entries()) {
      clearTimeout(handle);
      this.lockTimeouts.delete(lockId);
    }
  }

  // 注册进程
  registerProcess(childProcess, metadata = {}) {
    // 防御性编程：确保 activeProcesses 是 Map 类型
    if (!this.activeProcesses || typeof this.activeProcesses.set !== 'function') {
      console.error('🚨 [ERROR] activeProcesses is not a Map! Reinitializing as Map');
      this.activeProcesses = new Map();
    }
    
    this.activeProcesses.set(childProcess.pid, {
      process: childProcess,
      metadata: {
        command: metadata.command || 'unknown',
        args: metadata.args || [],
        startTime: metadata.startTime || Date.now(),
        ...metadata
      }
    });
  }

  // 注销进程
  unregisterProcess(pid) {
    return this.activeProcesses.delete(pid);
  }

  // 获取活跃进程信息
  getActiveProcesses() {
    return Array.from(this.activeProcesses.entries()).map(([pid, data]) => ({
      pid,
      ...data.metadata,
      running: data.process.exitCode === null
    }));
  }
  
  // 缓存管理方法
  getCache(key) {
    if (!this.cacheConfig.enabled) return null;
    
    // 统计总请求数 - 修复数据一致性问题
    this.performanceMetrics.cacheStats.totalRequests++;
    
    const item = this.commandCache.get(key);
    if (!item) {
      this.performanceMetrics.cacheStats.misses++;
      return null;
    }
    
    // 检查是否过期
    if (Date.now() - item.createdAt > this.cacheConfig.ttl) {
      this.commandCache.delete(key);
      this.performanceMetrics.cacheStats.misses++;
      return null;
    }
    
    // 更新最后访问时间
    item.lastAccess = Date.now();
    this.cacheHits++;
    this.performanceMetrics.cacheStats.hits++;
    return item.value;
  }
  
  setCache(key, value) {
    if (!this.cacheConfig.enabled) return;
    
    const now = Date.now();
    const cacheItem = {
      value,
      createdAt: now,
      lastAccess: now
    };
    
    this.commandCache.set(key, cacheItem);
    
    // 修复数据一致性问题：setCache 不应该增加 totalRequests
    // 只有 getCache 操作才应该被统计为缓存请求
    this.cacheMisses++;
    
    // 检查缓存大小，如果超过限制，清理最旧的缓存
    if (this.commandCache.size > this.cacheConfig.maxSize) {
      this.cleanupOldestCache();
    }
  }
  
  // 清理过期缓存
  cleanupExpiredCache() {
    const now = Date.now();
    for (const [key, item] of this.commandCache.entries()) {
      if (now - item.createdAt > this.cacheConfig.ttl) {
        this.commandCache.delete(key);
      }
    }
  }
  
  // 清理最旧的缓存（基于最后访问时间）
  cleanupOldestCache() {
    if (this.commandCache.size <= this.cacheConfig.maxSize) return;
    
    const entries = Array.from(this.commandCache.entries());
    // 按最后访问时间排序
    entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
    
    // 删除最旧的10%的缓存项
    const itemsToRemove = Math.max(1, Math.floor(this.commandCache.size * 0.1));
    for (let i = 0; i < itemsToRemove; i++) {
      this.commandCache.delete(entries[i][0]);
    }
  }
  
  // 记录结构化日志
  logStructuredEvent(category, action, level, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      category,
      action,
      level,
      details,
      context: {
        pid: process.pid,
        scriptName: SCRIPT_NAME,
        version: VERSION
      }
    };
    
    this.structuredLogs.push(logEntry);
    
    // 保持日志数组大小，避免内存泄漏
    if (this.structuredLogs.length > 1000) {
      this.structuredLogs = this.structuredLogs.slice(-500);
    }
    
    // 同时输出到控制台（根据日志级别）
    const message = `[${category}] ${action}: ${JSON.stringify(details)}`;
    if (level === 'ERROR') {
      logger.error(message);
    } else if (level === 'WARN') {
      logger.warn(message);
    } else {
      logger.log(message, level.toLowerCase());
    }
  }

  // 新增：初始化缓存持久化
  initCachePersistence() {
    if (!this.cachePersistence.enabled) return;

    try {
      const cacheDir = path.dirname(this.cachePersistence.filePath);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      // 加载持久化缓存
      if (fs.existsSync(this.cachePersistence.filePath)) {
        const cacheData = JSON.parse(fs.readFileSync(this.cachePersistence.filePath, 'utf8'));
        
        // 恢复命令缓存
        if (cacheData.commandCache) {
          for (const [key, item] of Object.entries(cacheData.commandCache)) {
            // 检查缓存项是否过期
            if (Date.now() - item.createdAt < this.cacheConfig.ttl) {
              this.commandCache.set(key, item);
            }
          }
        }

        // 恢复测试文件时间戳
        if (cacheData.testFileTimestamps) {
          this.testFileTimestamps = new Map(Object.entries(cacheData.testFileTimestamps));
        }

        // 恢复性能指标
        if (cacheData.performanceMetrics) {
          this.performanceMetrics = cacheData.performanceMetrics;
        }

        console.log(`📁 从持久化缓存加载了 ${this.commandCache.size} 个缓存项`);
      }

      // 设置定期保存
      this.cacheSaveInterval = setInterval(() => {
        this.saveCacheToDisk();
      }, this.cachePersistence.saveInterval);

      // 初始化性能指标持久化
      this.initPerformancePersistence();

    } catch (error) {
      console.warn('⚠️ 缓存持久化初始化失败:', error.message);
    }
  }

  // 新增：初始化性能指标持久化
  initPerformancePersistence() {
    if (!this.performancePersistence.enabled) {
      console.log('🔕 性能指标持久化已禁用');
      return;
    }

    try {
      console.log(`🔧 初始化性能指标持久化，文件路径: ${this.performancePersistence.filePath}`);
      
      const perfDir = path.dirname(this.performancePersistence.filePath);
      if (!fs.existsSync(perfDir)) {
        console.log(`📁 创建性能指标目录: ${perfDir}`);
        fs.mkdirSync(perfDir, { recursive: true });
      }

      // 加载历史性能数据
      if (fs.existsSync(this.performancePersistence.filePath)) {
        console.log('📂 发现历史性能数据文件，正在加载...');
        const perfData = JSON.parse(fs.readFileSync(this.performancePersistence.filePath, 'utf8'));
        
        // 合并历史性能数据（保留最近的数据）
        if (perfData.performanceMetrics) {
          // 确保 testExecutionTimes 是 Map 对象
          if (perfData.performanceMetrics.testExecutionTimes &&
              typeof perfData.performanceMetrics.testExecutionTimes === 'object' &&
              !(perfData.performanceMetrics.testExecutionTimes instanceof Map)) {
            
            console.log('🔄 转换 testExecutionTimes 为 Map 对象');
            const testExecutionTimesMap = new Map();
            for (const [key, value] of Object.entries(perfData.performanceMetrics.testExecutionTimes)) {
              testExecutionTimesMap.set(key, value);
            }
            perfData.performanceMetrics.testExecutionTimes = testExecutionTimesMap;
          }
          
          // 确保 commandExecutionTimes 是 Map 对象
          if (perfData.performanceMetrics.resourceUsage &&
              perfData.performanceMetrics.resourceUsage.commandExecutionTimes &&
              typeof perfData.performanceMetrics.resourceUsage.commandExecutionTimes === 'object' &&
              !(perfData.performanceMetrics.resourceUsage.commandExecutionTimes instanceof Map)) {
            
            console.log('🔄 转换 commandExecutionTimes 为 Map 对象');
            const commandExecutionTimesMap = new Map();
            for (const [key, value] of Object.entries(perfData.performanceMetrics.resourceUsage.commandExecutionTimes)) {
              commandExecutionTimesMap.set(key, value);
            }
            perfData.performanceMetrics.resourceUsage.commandExecutionTimes = commandExecutionTimesMap;
          } else if (!perfData.performanceMetrics.resourceUsage.commandExecutionTimes) {
            // 如果 commandExecutionTimes 不存在，初始化它
            perfData.performanceMetrics.resourceUsage.commandExecutionTimes = new Map();
          }
          
          // 确保 memorySnapshots 是数组
          if (!perfData.performanceMetrics.resourceUsage.memorySnapshots ||
              !Array.isArray(perfData.performanceMetrics.resourceUsage.memorySnapshots)) {
            perfData.performanceMetrics.resourceUsage.memorySnapshots = [];
          }
          
          // 确保 realTimeMetrics 存在
          if (!perfData.performanceMetrics.realTimeMetrics) {
            perfData.performanceMetrics.realTimeMetrics = {
              startTime: Date.now(),
              testSuitesExecuted: 0,
              commandsExecuted: 0,
              errorsEncountered: 0
            };
          }
          
          this.mergePerformanceMetrics(perfData.performanceMetrics);
          console.log(`📊 从持久化文件加载了性能指标历史数据`);
        }
      } else {
        console.log('📂 未发现历史性能数据文件，将创建新文件');
      }

      // 设置定期保存性能指标 - 优化保存频率
      this.performanceSaveInterval = setInterval(() => {
        // 只有在有实际数据变化时才保存，避免频繁保存
        const testExecStats = this.getTestExecutionTimeStats();
        const hasRealData = testExecStats.count > 0 ||
                           (this.performanceMetrics.cacheStats && this.performanceMetrics.cacheStats.totalRequests > 0);
        
        if (hasRealData) {
          console.log('⏰ 性能指标保存定时器触发');
          console.log(`   - 测试执行时间记录数: ${testExecStats.count} 个${testExecStats.type}`);
          console.log(`   - 缓存请求总数: ${this.performanceMetrics.cacheStats ? this.performanceMetrics.cacheStats.totalRequests : 0}`);
          
          console.log('💾 保存性能指标...');
          this.savePerformanceToDisk();
        } else {
          if (process.env.DEBUG_PERFORMANCE) {
            console.log('⏰ 性能指标定时器触发 - 无实际数据，跳过保存');
          }
        }
      }, Math.max(this.performancePersistence.saveInterval, 30000)); // 至少30秒保存一次

      // 立即执行一次保存，确保文件创建
      console.log('🚀 立即执行初始性能指标保存...');
      this.savePerformanceToDisk();

      console.log(`✅ 性能指标持久化初始化完成，保存间隔: ${this.performancePersistence.saveInterval}ms`);

    } catch (error) {
      console.warn('⚠️ 性能指标持久化初始化失败:', error.message);
    }
  }

  // 新增：合并性能指标数据 - 严格过滤模拟数据
  mergePerformanceMetrics(existingMetrics) {
    console.log('🔄 合并性能指标数据 - 严格过滤模拟数据...');
    
    // 确保现有性能指标数据结构正确
    if (!this.performanceMetrics.testExecutionTimes ||
        !(this.performanceMetrics.testExecutionTimes instanceof Map)) {
      console.log('🔄 重新初始化 testExecutionTimes 为 Map');
      this.performanceMetrics.testExecutionTimes = new Map();
    }
    
    // 合并测试执行时间 - 严格过滤模拟数据
    if (existingMetrics.testExecutionTimes) {
      console.log(`📊 合并测试执行时间记录: ${existingMetrics.testExecutionTimes instanceof Map ? existingMetrics.testExecutionTimes.size : Object.keys(existingMetrics.testExecutionTimes).length}`);
      
      // 处理 Map 或普通对象
      const entries = existingMetrics.testExecutionTimes instanceof Map
        ? existingMetrics.testExecutionTimes.entries()
        : Object.entries(existingMetrics.testExecutionTimes);
      
      let realDataCount = 0;
      let filteredDataCount = 0;
      
      for (const [testFile, times] of entries) {
        // 严格过滤模拟数据：不包含 "test-example"、"mock"、"fake" 等关键词
        const isMockData =
          testFile.includes('test-example') ||
          testFile.includes('mock') ||
          testFile.includes('fake') ||
          testFile.includes('dummy') ||
          testFile.includes('example') && testFile.endsWith('.js');
        
        if (isMockData) {
          console.log(`🚫 过滤模拟数据: ${testFile}`);
          filteredDataCount++;
          continue;
        }
        
        // 只处理真实数据
        if (!this.performanceMetrics.testExecutionTimes.has(testFile)) {
          this.performanceMetrics.testExecutionTimes.set(testFile, []);
        }
        const currentTimes = this.performanceMetrics.testExecutionTimes.get(testFile);
        
        // 确保时间数据是真实收集的
        const validTimes = Array.isArray(times) ? times.filter(time =>
          time &&
          typeof time.duration === 'number' &&
          time.duration > 0 &&
          time.duration < 3600000 && // 合理的时间范围：小于1小时
          time.timestamp &&
          time.timestamp > Date.now() - 30 * 24 * 60 * 60 * 1000 // 最近30天内的数据
        ) : [];
        
        if (validTimes.length > 0) {
          // 保留最近的数据，避免重复
          const combinedTimes = [...currentTimes, ...validTimes]
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, 20); // 保留最近20个
          this.performanceMetrics.testExecutionTimes.set(testFile, combinedTimes);
          realDataCount++;
        }
      }
      
      console.log(`✅ 性能数据过滤结果: 保留 ${realDataCount} 个真实文件，过滤 ${filteredDataCount} 个模拟文件`);
    }

    // 合并缓存统计 - 重置为0如果检测到模拟数据
    if (existingMetrics.cacheStats) {
      const isMockCacheStats =
        existingMetrics.cacheStats.hits > 1000 || // 不合理的命中数
        existingMetrics.cacheStats.misses > 1000 || // 不合理的未命中数
        existingMetrics.cacheStats.totalRequests > 5000; // 不合理的总请求数
      
      if (isMockCacheStats) {
        console.log(`🚫 检测到模拟缓存统计，重置为0`);
        this.performanceMetrics.cacheStats = {
          hits: 0,
          misses: 0,
          evictions: 0,
          totalRequests: 0
        };
      } else {
        console.log(`📊 合并缓存统计: 文件中的历史数据 hits=${existingMetrics.cacheStats.hits || 0}, misses=${existingMetrics.cacheStats.misses || 0}, totalRequests=${existingMetrics.cacheStats.totalRequests || 0}`);
        
        // 关键修复：修复数据一致性问题，totalRequests 应该等于 hits + misses
        const existingHits = existingMetrics.cacheStats.hits || 0;
        const existingMisses = existingMetrics.cacheStats.misses || 0;
        const calculatedTotal = existingHits + existingMisses;
        
        this.performanceMetrics.cacheStats = {
          hits: existingHits,
          misses: existingMisses,
          evictions: existingMetrics.cacheStats.evictions || 0,
          totalRequests: calculatedTotal // 使用计算值确保一致性
        };
        
        console.log(`✅ 缓存统计初始化完成: hits=${this.performanceMetrics.cacheStats.hits}, misses=${this.performanceMetrics.cacheStats.misses}, totalRequests=${this.performanceMetrics.cacheStats.totalRequests}`);
      }
    }

    // 合并资源使用 - 验证数据合理性
    if (existingMetrics.resourceUsage) {
      const isMockResourceUsage =
        existingMetrics.resourceUsage.peakMemory > 8192 || // 不合理的峰值内存：> 8GB
        existingMetrics.resourceUsage.totalCommands > 10000; // 不合理的总命令数
      
      if (isMockResourceUsage) {
        console.log(`🚫 检测到模拟资源使用数据，重置为合理值`);
        this.performanceMetrics.resourceUsage.peakMemory = Math.max(
          this.performanceMetrics.resourceUsage.peakMemory || 0,
          128 // 合理的默认峰值内存
        );
        this.performanceMetrics.resourceUsage.totalCommands = Math.max(
          this.performanceMetrics.resourceUsage.totalCommands || 0,
          0
        );
      } else {
        console.log(`📊 合并资源使用: peakMemory=${existingMetrics.resourceUsage.peakMemory || 0}`);
        this.performanceMetrics.resourceUsage.peakMemory = Math.max(
          this.performanceMetrics.resourceUsage.peakMemory || 0,
          existingMetrics.resourceUsage.peakMemory || 0
        );
        this.performanceMetrics.resourceUsage.totalCommands = Math.max(
          this.performanceMetrics.resourceUsage.totalCommands || 0,
          existingMetrics.resourceUsage.totalCommands || 0
        );
      }
    }
    
    console.log(`✅ 性能指标合并完成: ${this.performanceMetrics.testExecutionTimes.size} 个真实测试文件记录`);
  }

  // 新增：保存缓存到磁盘
  saveCacheToDisk() {
    if (!this.cachePersistence.enabled) return;

    try {
      const cacheData = {
        commandCache: Object.fromEntries(this.commandCache),
        testFileTimestamps: Object.fromEntries(this.testFileTimestamps),
        performanceMetrics: this.performanceMetrics,
        lastSave: Date.now()
      };

      // 写入临时文件然后重命名，避免写入过程中崩溃导致文件损坏
      const tempPath = this.cachePersistence.filePath + '.tmp';
      fs.writeFileSync(tempPath, JSON.stringify(cacheData, null, 2), 'utf8');
      fs.renameSync(tempPath, this.cachePersistence.filePath);

      if (process.env.DEBUG_CACHE) {
        console.log(`💾 缓存已保存到磁盘 (${this.commandCache.size} 项)`);
      }
    } catch (error) {
      console.warn('⚠️ 保存缓存到磁盘失败:', error.message);
    }
  }

  // 新增：保存性能指标到磁盘
  savePerformanceToDisk() {
    if (!this.performancePersistence.enabled) {
      console.log('🔕 性能指标持久化已禁用，跳过保存');
      return;
    }

    try {
      console.log(`💾 开始保存性能指标到: ${this.performancePersistence.filePath}`);
      
      // 确保目录存在
      const cacheDir = path.dirname(this.performancePersistence.filePath);
      if (!fs.existsSync(cacheDir)) {
        console.log(`📁 创建缓存目录: ${cacheDir}`);
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      
      // 即使没有性能数据也创建文件结构，用于验证
      const performanceData = {
        performanceMetrics: {
          testExecutionTimes: Object.fromEntries(
            Array.from(this.performanceMetrics.testExecutionTimes).map(([key, value]) => [
              key,
              value
            ])
          ),
          cacheStats: this.performanceMetrics.cacheStats,
          resourceUsage: {
            ...this.performanceMetrics.resourceUsage,
            commandExecutionTimes: this.performanceMetrics.resourceUsage.commandExecutionTimes &&
                                   this.performanceMetrics.resourceUsage.commandExecutionTimes instanceof Map ?
              Object.fromEntries(
                Array.from(this.performanceMetrics.resourceUsage.commandExecutionTimes).map(([key, value]) => [
                  key,
                  value
                ])
              ) : {},
            memorySnapshots: this.performanceMetrics.resourceUsage.memorySnapshots || []
          },
          realTimeMetrics: this.performanceMetrics.realTimeMetrics || {
            startTime: Date.now(),
            testSuitesExecuted: 0,
            commandsExecuted: 0,
            errorsEncountered: 0
          }
        },
        testDependencyGraph: Object.fromEntries(
          Array.from(this.testDependencyGraph.entries()).map(([key, value]) => [
            key,
            Array.from(value)
          ])
        ),
        timestamp: Date.now(),
        version: VERSION,
        // 添加调试信息
        debug: {
          hasTestExecutionTimes: this.performanceMetrics.testExecutionTimes.size > 0,
          hasCacheStats: this.performanceMetrics.cacheStats.totalRequests > 0,
          testExecutionCount: this.performanceMetrics.testExecutionTimes.size,
          cacheRequestCount: this.performanceMetrics.cacheStats.totalRequests,
          // 不再强制生成模拟数据，只使用真实数据
          forceGenerate: false,
          realDataOnly: true
        }
      };

      // 即使没有真实的性能数据，也使用真实的数据结构，不生成模拟数据
      if (this.performanceMetrics.testExecutionTimes.size === 0) {
        console.log('📊 性能数据为空，保存真实的数据结构（非模拟数据）');
        performanceData.debug.usingMockData = false;
        performanceData.debug.realDataEmpty = true;
      }

      // 写入临时文件然后重命名，避免写入过程中崩溃导致文件损坏
      const tempPath = this.performancePersistence.filePath + '.tmp';
      console.log(`📝 写入临时文件: ${tempPath}`);
      fs.writeFileSync(tempPath, JSON.stringify(performanceData, null, 2), 'utf8');
      console.log(`📝 临时文件写入完成，大小: ${fs.statSync(tempPath).size} bytes`);
      
      console.log(`📝 重命名临时文件到目标文件: ${this.performancePersistence.filePath}`);
      fs.renameSync(tempPath, this.performancePersistence.filePath);
      console.log(`✅ 重命名完成`);

      const saveStats = this.getTestExecutionTimeStats();
      console.log(`✅ 性能指标已保存到磁盘 (${saveStats.count} 个${saveStats.type})`);
      console.log(`📁 文件路径: ${this.performancePersistence.filePath}`);
      console.log(`📊 文件大小: ${fs.statSync(this.performancePersistence.filePath).size} bytes`);
      
      // 调试信息
      console.log('📊 保存的性能数据摘要:');
      const summaryStats = this.getTestExecutionTimeStats();
      console.log(`   - 测试执行时间记录数: ${summaryStats.count} 个${summaryStats.type}`);
      console.log(`   - 缓存命中数: ${this.performanceMetrics.cacheStats ? this.performanceMetrics.cacheStats.hits || 0 : 0}`);
      console.log(`   - 缓存请求总数: ${this.performanceMetrics.cacheStats ? this.performanceMetrics.cacheStats.totalRequests || 0 : 0}`);
      console.log(`   - 内存峰值: ${this.performanceMetrics.resourceUsage ? this.performanceMetrics.resourceUsage.peakMemory || 0 : 0}MB`);
      
    } catch (error) {
      console.error('❌ 保存性能指标到磁盘失败:', error.message);
      console.error('❌ 错误堆栈:', error.stack);
      console.error('❌ 错误代码:', error.code);
      console.error('❌ 错误路径:', this.performancePersistence.filePath);
      
      // 检查目录权限
      const cacheDir = path.dirname(this.performancePersistence.filePath);
      try {
        console.log(`📁 检查目录权限: ${cacheDir}`);
        console.log(`📁 目录是否存在: ${fs.existsSync(cacheDir)}`);
        if (fs.existsSync(cacheDir)) {
          console.log(`📁 目录权限: ${fs.statSync(cacheDir).mode.toString(8)}`);
        }
      } catch (dirError) {
        console.error('❌ 检查目录权限失败:', dirError.message);
      }
    }
  }

  // 新增：记录性能指标
  recordPerformanceMetric(metricName, value, tags = {}) {
    const timestamp = Date.now();
    
    if (!this.performanceMetrics[metricName]) {
      this.performanceMetrics[metricName] = [];
    }

    this.performanceMetrics[metricName].push({
      value,
      timestamp,
      tags
    });

    // 保持最近1000个指标点
    if (this.performanceMetrics[metricName].length > 1000) {
      this.performanceMetrics[metricName] = this.performanceMetrics[metricName].slice(-500);
    }

    // 更新资源使用峰值
    if (metricName === 'memory_usage') {
      this.performanceMetrics.resourceUsage.peakMemory = Math.max(
        this.performanceMetrics.resourceUsage.peakMemory,
        value
      );
    }
    
    // 发送到监控系统（如果启用）
    if (this.monitorAdapter) {
      this.monitorAdapter.metric(metricName, value, tags);
    }
  }
  
  // 新增：记录自定义业务指标
  recordCustomMetric(metricName, value, tags = {}) {
    console.log(`📊 记录自定义指标: ${metricName} = ${value}, tags: ${JSON.stringify(tags)}`);
    
    // 检查是否为预定义的自定义指标
    const customMetricsConfig = CONFIG.monitoring?.customMetrics?.metrics || [];
    const metricConfig = customMetricsConfig.find(m => m.name === metricName);
    
    if (metricConfig) {
      console.log(`✅ 使用预定义指标配置: ${metricConfig.type} - ${metricConfig.description}`);
      
      // 根据指标类型进行验证
      if (metricConfig.type === 'counter' && typeof value !== 'number') {
        console.warn(`⚠️ 计数器指标 ${metricName} 需要数值类型，收到: ${typeof value}`);
        return;
      }
      
      if (metricConfig.type === 'histogram' && typeof value !== 'number') {
        console.warn(`⚠️ 直方图指标 ${metricName} 需要数值类型，收到: ${typeof value}`);
        return;
      }
      
      // 验证标签
      const allowedTags = metricConfig.tags || [];
      const invalidTags = Object.keys(tags).filter(tag => !allowedTags.includes(tag));
      if (invalidTags.length > 0) {
        console.warn(`⚠️ 指标 ${metricName} 包含未允许的标签: ${invalidTags.join(', ')}`);
      }
    } else {
      console.log(`📝 记录未预定义的自定义指标: ${metricName}`);
    }
    
    // 记录到性能指标
    this.recordPerformanceMetric(metricName, value, tags);
    
    // 记录到结构化日志
    this.logStructuredEvent('CUSTOM_METRIC', 'RECORDED', 'INFO', {
      metricName,
      value,
      tags,
      metricType: metricConfig?.type || 'unknown'
    });
  }

  // 新增：获取性能报告
  getPerformanceReport() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    const recentMetrics = {};
    for (const [metricName, data] of Object.entries(this.performanceMetrics)) {
      if (Array.isArray(data)) {
        recentMetrics[metricName] = data.filter(item => item.timestamp > oneHourAgo);
      }
    }

    const cacheHitRate = this.cacheHits + this.cacheMisses > 0
      ? (this.cacheHits / (this.cacheHits + this.cacheMisses) * 100).toFixed(2)
      : 0;

    return {
      cache: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRate: cacheHitRate,
        currentSize: this.commandCache.size,
        evictions: this.performanceMetrics.cacheStats.evictions
      },
      resources: {
        peakMemory: this.performanceMetrics.resourceUsage.peakMemory,
        totalCommands: this.performanceMetrics.resourceUsage.totalCommands
      },
      recentMetrics,
      testDependencies: {
        totalNodes: this.testDependencyGraph.size,
        edges: this.calculateDependencyEdges()
      }
    };
  }

  // 新增：计算依赖边数
  calculateDependencyEdges() {
    let edges = 0;
    for (const dependencies of this.testDependencyGraph.values()) {
      edges += dependencies.size;
    }
    return edges;
  }

  // 新增：添加测试依赖关系
  addTestDependency(testFile, dependsOn) {
    if (!this.testDependencyGraph.has(testFile)) {
      this.testDependencyGraph.set(testFile, new Set());
    }
    
    const dependencies = this.testDependencyGraph.get(testFile);
    if (Array.isArray(dependsOn)) {
      dependsOn.forEach(dep => dependencies.add(dep));
    } else {
      dependencies.add(dependsOn);
    }

    // 记录依赖关系变更
    this.logStructuredEvent('DEPENDENCY', 'ADDED', 'INFO', {
      testFile,
      dependencies: Array.from(dependencies)
    });
  }

  // 新增：智能测试排序
  getOptimalTestOrder(testFiles) {
    const visited = new Set();
    const order = [];

    // 深度优先遍历依赖图
    const visit = (node) => {
      if (visited.has(node)) return;
      visited.add(node);

      const dependencies = this.testDependencyGraph.get(node) || new Set();
      for (const dep of dependencies) {
        if (testFiles.includes(dep)) {
          visit(dep);
        }
      }

      order.push(node);
    };

    // 为每个测试文件添加执行时间权重
    const weightedFiles = testFiles.map(file => ({
      file,
      weight: this.getTestExecutionWeight(file),
      dependencies: this.testDependencyGraph.get(file) || new Set()
    }));

    // 按权重和依赖关系排序
    weightedFiles.sort((a, b) => {
      // 如果a依赖b，则b应该先执行
      if (a.dependencies.has(b.file)) return 1;
      if (b.dependencies.has(a.file)) return -1;
      
      // 否则按权重排序（权重高的先执行，因为可能更快完成）
      return b.weight - a.weight;
    });

    // 构建最终执行顺序
    for (const { file } of weightedFiles) {
      visit(file);
    }

    // 确保所有文件都被包含
    for (const file of testFiles) {
      if (!visited.has(file)) {
        order.push(file);
      }
    }

    this.logStructuredEvent('TEST_ORDER', 'OPTIMIZED', 'INFO', {
      totalFiles: testFiles.length,
      orderedFiles: order,
      dependencyCount: this.calculateDependencyEdges()
    });

    return order;
  }

  // 新增：获取测试执行权重
  getTestExecutionWeight(testFile) {
    const executionTimes = this.performanceMetrics.testExecutionTimes.get(testFile) || [];
    
    if (executionTimes.length === 0) {
      return 1.0; // 默认权重
    }

    // 计算平均执行时间，转换为权重（执行时间越短，权重越高）
    const avgTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
    return Math.max(0.1, 1.0 / Math.log(avgTime + 1));
  }

  // 新增：记录测试执行时间
  recordTestExecutionTime(testFile, duration) {
    console.log(`⏱️ 记录测试执行时间: ${testFile} - ${duration}ms`);
    console.log(`📊 当前性能指标状态:`);
    console.log(`   - testExecutionTimes Map大小: ${this.performanceMetrics.testExecutionTimes.size} 个测试文件`);
    console.log(`   - 缓存统计: hits=${this.performanceMetrics.cacheStats.hits}, misses=${this.performanceMetrics.cacheStats.misses}, totalRequests=${this.performanceMetrics.cacheStats.totalRequests}`);
    
    if (!this.performanceMetrics.testExecutionTimes.has(testFile)) {
      console.log(`📝 创建新的测试文件记录: ${testFile}`);
      this.performanceMetrics.testExecutionTimes.set(testFile, []);
    }

    const times = this.performanceMetrics.testExecutionTimes.get(testFile);
    console.log(`📝 添加执行时间记录，当前该文件记录数: ${times.length}`);
    times.push({
      duration,
      timestamp: Date.now()
    });

    // 保持最近20次执行时间
    if (times.length > 20) {
      console.log(`📝 清理旧记录，保留最近20个`);
      times.shift();
    }

    // 注意：这里不更新缓存统计，因为缓存统计只在缓存操作时更新
    // 测试执行时间记录与缓存请求是独立的指标
    console.log(`📊 测试执行时间记录完成，当前缓存统计保持不变: totalRequests = ${this.performanceMetrics.cacheStats.totalRequests}`);
    
    // 记录测试执行性能指标
    this.recordPerformanceMetric('test_execution_duration', duration, {
      testFile: testFile,
      testType: 'unit' // 这里可以根据文件名推断测试类型
    });
    
    // 只有在有多个测试文件记录时才保存，避免频繁保存
    const testExecStats = this.getTestExecutionTimeStats();
    if (testExecStats.count >= 3 || testExecStats.type === '测试套件') {
      console.log(`💾 测试执行时间记录达到阈值，保存性能数据...`);
      this.savePerformanceToDisk();
    } else {
      if (process.env.DEBUG_PERFORMANCE) {
        console.log(`💾 测试执行时间记录较少 (${testExecStats.count} 个${testExecStats.type})，跳过立即保存`);
      }
    }
  }

  // 新增：分析测试依赖关系
  analyzeTestDependencies(testFiles) {
    const analysis = {
      independent: [],
      dependent: [],
      circular: [],
      longestChain: 0
    };

    const visited = new Set();
    const recursionStack = new Set();

    const detectCircular = (node, path = []) => {
      if (recursionStack.has(node)) {
        analysis.circular.push([...path, node]);
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const dependencies = this.testDependencyGraph.get(node) || new Set();
      for (const dep of dependencies) {
        if (testFiles.includes(dep)) {
          detectCircular(dep, [...path]);
        }
      }

      recursionStack.delete(node);
      path.pop();

      // 更新最长链
      analysis.longestChain = Math.max(analysis.longestChain, path.length + 1);
    };

    for (const file of testFiles) {
      const dependencies = this.testDependencyGraph.get(file) || new Set();
      if (dependencies.size === 0) {
        analysis.independent.push(file);
      } else {
        analysis.dependent.push(file);
      }
      detectCircular(file);
    }

    return analysis;
  }

  // 新增：清理过期性能数据
  cleanupPerformanceData(maxAge = 24 * 3600000) { // 默认24小时
    const cutoffTime = Date.now() - maxAge;
    
    for (const [metricName, data] of Object.entries(this.performanceMetrics)) {
      if (Array.isArray(data)) {
        this.performanceMetrics[metricName] = data.filter(item => item.timestamp > cutoffTime);
      }
    }

    // 清理过期的测试执行时间记录
    for (const [testFile, times] of this.performanceMetrics.testExecutionTimes) {
      // 只清理长时间未执行的测试
      if (times.length > 0) {
        const lastExecution = Math.max(...times.map(t => t.timestamp || 0));
        if (lastExecution < cutoffTime) {
          this.performanceMetrics.testExecutionTimes.delete(testFile);
        }
      }
    }
  }
  
  // 获取结构化日志
  getStructuredLogs() {
    return [...this.structuredLogs];
  }

  // 新增：获取测试执行时间统计信息
  getTestExecutionTimeStats() {
    if (!this.performanceMetrics.testExecutionTimes ||
        this.performanceMetrics.testExecutionTimes.size === 0) {
      return { count: 0, type: '测试套件' };
    }
    
    // 分析测试执行时间的键名来确定类型
    const keys = Array.from(this.performanceMetrics.testExecutionTimes.keys());
    const hasFullTestSuite = keys.includes('full-test-suite');
    const hasIndividualFiles = keys.some(key =>
      key.endsWith('.test.js') || key.endsWith('.spec.js') || key.includes('/')
    );
    
    // 如果只有 full-test-suite，则显示测试套件
    if (hasFullTestSuite && keys.length === 1) {
      return { count: 1, type: '测试套件' };
    }
    
    // 如果有多个测试文件，则显示测试文件
    if (hasIndividualFiles && !hasFullTestSuite) {
      return { count: keys.length, type: '测试文件' };
    }
    
    // 混合情况，显示测试套件和文件
    if (hasFullTestSuite && hasIndividualFiles) {
      return { count: keys.length, type: '测试套件和文件' };
    }
    
    // 默认显示测试套件
    return { count: keys.length, type: '测试套件' };
  }

  // 等待所有活跃进程完成
  async waitForActiveProcesses(timeout = 10000) {
    if (this.activeProcesses.size === 0) {
      return true;
    }

    const startTime = Date.now();
    const processes = Array.from(this.activeProcesses.values());
    
    while (this.activeProcesses.size > 0) {
      // 检查超时
      if (Date.now() - startTime > timeout) {
        console.warn(`等待进程超时，剩余 ${this.activeProcesses.size} 个进程`);
        return false;
      }

      // 检查进程状态
      for (const [pid, data] of this.activeProcesses.entries()) {
        if (data.process.exitCode !== null) {
          this.unregisterProcess(pid);
        }
      }

      // 等待一小段时间再检查
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return true;
  }
}

// 错误恢复管理器
class ErrorRecoveryManager {
  constructor() {
    this.errorHistory = [];
    this.recoveryStrategies = new Map();
    this.setupStrategies();
  }
  
  setupStrategies() {
    // 命令执行失败恢复策略
    this.recoveryStrategies.set('COMMAND_FAILED', {
      maxRetries: CONFIG.concurrency.retryAttempts,
      retryDelay: CONFIG.concurrency.retryDelay,
      backoffMultiplier: 1.5
    });
    
    // 资源不足恢复策略
    this.recoveryStrategies.set('RESOURCE_EXHAUSTED', {
      maxRetries: 2,
      retryDelay: 5000,
      cleanupRequired: true
    });
    
    // 并发冲突恢复策略
    this.recoveryStrategies.set('CONCURRENCY_CONFLICT', {
      maxRetries: 5,
      retryDelay: 1000,
      randomDelay: true
    });
  }
  
  async handleError(error, context, errorType = 'COMMAND_FAILED') {
    const strategy = this.recoveryStrategies.get(errorType);
    if (!strategy) {
      throw error;
    }
    
    const errorId = `${errorType}_${Date.now()}`;
    this.errorHistory.push({
      id: errorId,
      error: error.message,
      context,
      timestamp: Date.now(),
      attempts: 0
    });
    
    return this.attemptRecovery(errorId, error, context, strategy);
  }
  
  async attemptRecovery(errorId, error, context, strategy) {
    const errorRecord = this.errorHistory.find(e => e.id === errorId);
    
    if (errorRecord.attempts >= strategy.maxRetries) {
      throw new Error(`恢复失败，已达到最大重试次数: ${error.message}`);
    }
    
    errorRecord.attempts++;
    
    // 计算延迟时间
    let delay = strategy.retryDelay;
    if (strategy.backoffMultiplier) {
      delay *= Math.pow(strategy.backoffMultiplier, errorRecord.attempts - 1);
    }
    if (strategy.randomDelay) {
      delay += Math.random() * 1000;
    }
    
    console.log(`🔄 错误恢复尝试 ${errorRecord.attempts}/${strategy.maxRetries}，等待 ${delay}ms`);
    
    // 记录错误恢复指标
    const monitorAdapter = this.runner && this.runner.monitorAdapter;
    if (monitorAdapter) {
      monitorAdapter.metric('error_recovery_attempts', 1, {
        errorType: errorType,
        attempt: errorRecord.attempts
      });
    }
    
    // 执行清理（如果需要）
    if (strategy.cleanupRequired) {
      await this.performCleanup();
    }
    
    // 等待后重试
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return { shouldRetry: true, delay };
  }
  
  async performCleanup() {
    // 强制垃圾回收
    if (global.gc) {
      global.gc();
    }
    
    // 清理临时文件
    try {
      const tempDir = path.join(os.tmpdir(), 'test-runner-temp');
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.warn('清理临时文件失败:', cleanupError.message);
    }
  }
}

// 增强的参数验证器
class ParameterValidator {
  static validate(args) {
    // 基本检查
    if (!Array.isArray(args)) {
      throw new Error('参数必须是数组');
    }
    
    if (args.length > CONFIG.validation.maxArgs) {
      throw new Error(`参数数量超出限制: ${args.length} > ${CONFIG.validation.maxArgs}`);
    }
    
    // 逐个验证参数
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      // 类型检查
      if (typeof arg !== 'string') {
        throw new Error(`参数 ${i} 必须是字符串: ${typeof arg}`);
      }
      
      // 长度检查
      if (arg.length > CONFIG.validation.maxArgLength) {
        throw new Error(`参数 ${i} 长度超出限制: ${arg.length} > ${CONFIG.validation.maxArgLength}`);
      }
      
      // 危险模式检查
      for (const pattern of CONFIG.validation.dangerousPatterns) {
        if (pattern.test(arg)) {
          throw new Error(`参数 ${i} 包含危险模式: ${arg.substring(0, 50)}...`);
        }
      }
      
      // 边界值检查
      this.validateBoundaryValues(arg, i);
    }
    
    // 参数组合验证
    this.validateArgumentCombinations(args);
    
    return true;
  }
  
  static validateBoundaryValues(arg, index) {
    // 数值参数的边界检查
    if (arg.startsWith('--timeout=') || arg.startsWith('--maxWorkers=')) {
      const value = arg.split('=')[1];
      const numValue = parseFloat(value);
      
      if (isNaN(numValue)) {
        throw new Error(`参数 ${index} 的数值无效: ${value}`);
      }
      
      if (arg.startsWith('--timeout=')) {
        if (numValue < 0 || numValue > 3600000) { // 0-1小时
          throw new Error(`超时值超出范围: ${numValue} (0-3600000)`);
        }
      }
      
      if (arg.startsWith('--maxWorkers=')) {
        if (numValue < 1 || numValue > os.cpus().length * 2) {
          throw new Error(`工作线程数超出范围: ${numValue} (1-${os.cpus().length * 2})`);
        }
      }
    }
  }
  
  static validateArgumentCombinations(args) {
    const flags = args.filter(arg => arg.startsWith('--'));
    const flagNames = flags.map(flag => flag.split('=')[0]);
    
    // 检查冲突的参数组合
    const conflicts = [
      ['--silent', '--verbose'],
      ['--coverage', '--no-coverage'],
      ['--watch', '--ci']
    ];
    
    for (const [flag1, flag2] of conflicts) {
      if (flagNames.includes(flag1) && flagNames.includes(flag2)) {
        throw new Error(`冲突的参数组合: ${flag1} 和 ${flag2}`);
      }
    }
  }
}

// 改进的安全命令执行器
class SecureCommandExecutor {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.sandboxExecutor = null;
    this.auditLogger = null;
    this.monitorAdapter = null;
    
    // 如果启用了沙箱，初始化沙箱执行器
    if (CONFIG.sandbox && CONFIG.sandbox.enabled) {
      this.sandboxExecutor = new SandboxExecutor(CONFIG.sandbox);
    }
  }
  
  async executeCommand(command, args = [], options = {}) {
    const fullCommand = `${command} ${args.join(' ')}`;
    
    try {
      // 参数验证
      ParameterValidator.validate([command, ...args]);
      
      // 频率检查（改进版）
      const rateCheck = await this.stateManager.checkCommandRate(fullCommand);
      if (!rateCheck.allowed) {
        // 记录频率限制事件
        const auditLogger = this.auditLogger || (this.runner && this.runner.auditLogger);
        if (auditLogger) {
          await auditLogger.logAuditEvent({
            category: 'SECURITY',
            action: 'RATE_LIMIT',
            level: 'WARN',
            details: {
              command: fullCommand,
              waitTime: rateCheck.waitTime,
              reason: 'Command execution frequency exceeded'
            }
          });
        }
        
        // 记录监控指标
        const monitorAdapter = this.monitorAdapter || (this.runner && this.runner.monitorAdapter);
        if (monitorAdapter) {
          monitorAdapter.counter('rate_limit_events', 1, { command: command.split(' ')[0] });
          monitorAdapter.warn('Rate limit applied', {
            command: fullCommand,
            waitTime: rateCheck.waitTime
          });
        }
        
        if (options.waitForRate !== false) {
          await new Promise(resolve => setTimeout(resolve, rateCheck.waitTime));
          return this.executeCommand(command, args, { ...options, waitForRate: false });
        } else {
          throw new Error(`命令执行频率过高，请稍后重试`);
        }
      }
      
      // 获取进程锁
      const lockId = `cmd_${command}_${Date.now()}`;
      if (!this.stateManager.acquireLock(lockId)) {
        throw new Error('无法获取进程锁，可能存在并发冲突');
      }
      
      try {
        return await this.doExecuteCommand(command, args, options);
      } finally {
        this.stateManager.releaseLock(lockId);
      }
      
    } catch (error) {
      // 记录失败的命令统计
      if (!this.runner || !this.runner.stats) {
        console.warn('⚠️ 统计信息未初始化，跳过记录失败命令');
      } else {
        this.runner.stats.failedCommands = (this.runner.stats.failedCommands || 0) + 1;
        this.runner.stats.totalCommands = (this.runner.stats.totalCommands || 0) + 1;
        this.stateManager.performanceMetrics.resourceUsage.totalCommands = this.runner.stats.totalCommands;
        
        // 确保 realTimeMetrics 存在
        if (!this.stateManager.performanceMetrics.realTimeMetrics) {
          this.stateManager.performanceMetrics.realTimeMetrics = {
            startTime: Date.now(),
            testSuitesExecuted: 0,
            commandsExecuted: 0,
            errorsEncountered: 0
          };
        }
        this.stateManager.performanceMetrics.realTimeMetrics.errorsEncountered++;
      }
      
      // 记录错误恢复尝试指标
      this.stateManager.recordPerformanceMetric('error_recovery_attempts', 1, {
        errorType: this.classifyError(error),
        command: command
      });
      
      // 错误恢复
      if (options.enableRecovery !== false) {
        try {
          const recovery = await this.stateManager.errorRecovery.handleError(
            error,
            { command, args, options },
            this.classifyError(error)
          );
          
          if (recovery.shouldRetry) {
            return this.executeCommand(command, args, { ...options, enableRecovery: false });
          }
        } catch (recoveryError) {
          throw recoveryError;
        }
      }
      
      throw error;
    }
  }
  
  async doExecuteCommand(command, args, options) {
    // 如果启用了沙箱且命令不是系统命令，使用沙箱执行
    if (this.sandboxExecutor && this.shouldUseSandbox(command, options)) {
      try {
        const result = await this.sandboxExecutor.execute(command, args, {
          silent: options.silent,
          ...options.sandboxOptions
        });
        
        return {
          code: result.code,
          stdout: result.stdout,
          stderr: result.stderr,
          duration: result.duration,
          success: result.success
        };
      } catch (error) {
        // 如果沙箱执行失败，回退到普通执行（如果允许）
        if (options.allowFallback !== false) {
          console.warn(`⚠️ 沙箱执行失败，回退到普通执行: ${error.message}`);
          return this.executeNormally(command, args, options);
        }
        throw error;
      }
    }
    
    // 普通执行
    return this.executeNormally(command, args, options);
  }
  
  /**
   * 判断是否应该使用沙箱
   */
  shouldUseSandbox(command, options) {
    // 如果明确指定不使用沙箱
    if (options.useSandbox === false) {
      return false;
    }
    
    // 如果明确指定使用沙箱
    if (options.useSandbox === true) {
      return true;
    }
    
    // 默认情况下，对非系统命令使用沙箱
    const systemCommands = ['node', 'npm', 'npx', 'yarn', 'pnpm'];
    return !systemCommands.includes(command);
  }
  
  /**
   * 普通命令执行
   */
  async executeNormally(command, args, options) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      // 兼容 Windows 平台的可执行文件解析（如 npx 需要使用 npx.cmd）
      const isWin = process.platform === 'win32';
      const resolvedCommand = (isWin && command === 'npx') ? 'npx.cmd' : command;
      const spawnOptions = {
        // 始终使用 'pipe' 捕获输出，解决默认 inherit 下外部运行器无法抓取的问题
        stdio: 'pipe',
        windowsHide: true,
        ...options.spawnOptions
      };

      // 在 Windows 上运行 .cmd/.bat 时使用 shell
      if (isWin && /\.cmd$|\.bat$/i.test(resolvedCommand)) {
        spawnOptions.shell = true;
      }

      // 使用 spawn，不直接传递 timeout（spawn 不支持该选项）
      const child = spawn(resolvedCommand, args, spawnOptions);
      
      this.stateManager.registerProcess(child, {
        command: command,
        args: args,
        startTime: Date.now()
      });
      
      let stdout = '';
      let stderr = '';
      // 看门狗配置与状态
      const cmdTimeoutMs = Number((options.timeout != null ? options.timeout : (process.env.CMD_TIMEOUT_MS || CONFIG.performance.maxExecutionTime))) || 90000;
      const idleTimeoutMs = Number((process.env.IDLE_TIMEOUT_MS || (CONFIG.performance && CONFIG.performance.idleTimeout) || 15000)) || 15000;
      let timedOut = false;
      let timeoutType = null; // 'CMD_TIMEOUT' | 'IDLE_TIMEOUT'
      let idleTimer = null;
      const resetIdleTimer = () => {
        try { if (idleTimer) clearTimeout(idleTimer); } catch (_) {}
        idleTimer = setTimeout(() => {
          timedOut = true;
          timeoutType = 'IDLE_TIMEOUT';
          try { child.kill(); } catch (_) {}
        }, idleTimeoutMs);
      };
      
      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
          if (!options.silent) {
            try { process.stdout.write(data); } catch (_) {}
          }
          resetIdleTimer();
        });
      }
      
      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
          if (!options.silent) {
            try { process.stderr.write(data); } catch (_) {}
          }
          resetIdleTimer();
        });
      }
      
      // 初始化空闲计时器
      resetIdleTimer();
      // 命令总时长超时控制：达到上限后终止子进程
      const cmdTimer = setTimeout(() => {
        timedOut = true;
        timeoutType = 'CMD_TIMEOUT';
        try { child.kill(); } catch (_) {}
      }, cmdTimeoutMs);

      child.on('close', (code) => {
        try { clearTimeout(cmdTimer); } catch (_) {}
        try { if (idleTimer) clearTimeout(idleTimer); } catch (_) {}
        this.stateManager.unregisterProcess(child.pid);
        const duration = Date.now() - startTime;
        
        if (code === 0) {
          // 记录成功的命令统计
          // 防御性检查：确保统计信息已初始化
          if (!this.runner || !this.runner.stats) {
            console.warn('⚠️ 统计信息未初始化，跳过记录成功命令');
          } else {
            this.runner.stats.successfulCommands = (this.runner.stats.successfulCommands || 0) + 1;
            this.runner.stats.totalCommands = (this.runner.stats.totalCommands || 0) + 1;
            this.stateManager.performanceMetrics.resourceUsage.totalCommands = this.runner.stats.totalCommands;
            
            // 确保 realTimeMetrics 存在
            if (!this.stateManager.performanceMetrics.realTimeMetrics) {
              this.stateManager.performanceMetrics.realTimeMetrics = {
                startTime: Date.now(),
                testSuitesExecuted: 0,
                commandsExecuted: 0,
                errorsEncountered: 0
              };
            }
            this.stateManager.performanceMetrics.realTimeMetrics.commandsExecuted++;
          }
          
          // 记录命令执行性能指标
          this.stateManager.recordPerformanceMetric('command_execution_time', duration, {
            command: command,
            success: true
          });
          
          // 记录详细的命令执行时间
          // 确保 commandExecutionTimes Map 存在
          if (!this.stateManager.performanceMetrics.resourceUsage.commandExecutionTimes ||
              !(this.stateManager.performanceMetrics.resourceUsage.commandExecutionTimes instanceof Map)) {
            console.log('🔄 重新初始化 commandExecutionTimes 为 Map');
            this.stateManager.performanceMetrics.resourceUsage.commandExecutionTimes = new Map();
          }
          
          if (!this.stateManager.performanceMetrics.resourceUsage.commandExecutionTimes.has(command)) {
            this.stateManager.performanceMetrics.resourceUsage.commandExecutionTimes.set(command, []);
          }
          const commandTimes = this.stateManager.performanceMetrics.resourceUsage.commandExecutionTimes.get(command);
          commandTimes.push({
            duration: duration,
            timestamp: Date.now(),
            success: true
          });
          
          // 保持最近20次命令执行时间
          if (commandTimes.length > 20) {
            commandTimes.shift();
          }
          
          resolve({
            code,
            stdout,
            stderr,
            duration,
            success: true,
            timeoutType: timedOut ? timeoutType : null
          });
        } else {
          const err = new Error(`命令执行失败 (退出码: ${code}): ${stderr || '未知错误'}`);
          err.code = code;
          err.stdout = stdout;
          err.stderr = stderr;
          err.duration = duration;
          err.timeoutType = timedOut ? timeoutType : null;
          
          // 记录失败的命令性能指标
          this.stateManager.recordPerformanceMetric('command_execution_time', duration, {
            command: command,
            success: false,
            exitCode: code,
            timeoutType: timedOut ? timeoutType : null
          });
          
          // 记录失败的命令执行时间
          // 确保 commandExecutionTimes Map 存在
          if (!this.stateManager.performanceMetrics.resourceUsage.commandExecutionTimes ||
              !(this.stateManager.performanceMetrics.resourceUsage.commandExecutionTimes instanceof Map)) {
            console.log('🔄 重新初始化 commandExecutionTimes 为 Map');
            this.stateManager.performanceMetrics.resourceUsage.commandExecutionTimes = new Map();
          }
          
          if (!this.stateManager.performanceMetrics.resourceUsage.commandExecutionTimes.has(command)) {
            this.stateManager.performanceMetrics.resourceUsage.commandExecutionTimes.set(command, []);
          }
          const commandTimes = this.stateManager.performanceMetrics.resourceUsage.commandExecutionTimes.get(command);
          commandTimes.push({
            duration: duration,
            timestamp: Date.now(),
            success: false,
            exitCode: code,
            timeoutType: timedOut ? timeoutType : null
          });
          
          // 保持最近20次命令执行时间
          if (commandTimes.length > 20) {
            commandTimes.shift();
          }
          
          // 更新错误计数
          this.stateManager.performanceMetrics.realTimeMetrics.errorsEncountered++;
          
          reject(err);
        }
      });
      
      child.on('error', (error) => {
        try { clearTimeout(cmdTimer); } catch (_) {}
        try { if (idleTimer) clearTimeout(idleTimer); } catch (_) {}
        this.stateManager.unregisterProcess(child.pid);
        reject(error);
      });
      
      // 统一使用前面的 cmdTimer 与 idleTimer 处理超时
    });
  }
  
  classifyError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('频率') || message.includes('rate')) {
      return 'COMMAND_FAILED';
    }
    
    if (message.includes('内存') || message.includes('memory')) {
      return 'RESOURCE_EXHAUSTED';
    }
    
    if (message.includes('锁') || message.includes('lock') || message.includes('并发')) {
      return 'CONCURRENCY_CONFLICT';
    }
    
    return 'COMMAND_FAILED';
  }
}

// 主程序类
class ImprovedTestRunner {
  constructor() {
    this.stateManager = new StateManager();
    this.executor = new SecureCommandExecutor(this.stateManager);
    
    // 确保监控初始化方法在构造函数中可用
    this.initializeMonitoring = ImprovedTestRunner.prototype.initializeMonitoring;
    this.createMockMonitorAdapter = ImprovedTestRunner.prototype.createMockMonitorAdapter;
    this.analyzeJestOutputForIndividualTestTimes = ImprovedTestRunner.prototype.analyzeJestOutputForIndividualTestTimes;
    this.inferTestType = ImprovedTestRunner.prototype.inferTestType;
    this.extractModuleName = ImprovedTestRunner.prototype.extractModuleName;
    this.buildTestDependencyGraph = ImprovedTestRunner.prototype.buildTestDependencyGraph;
    this.analyzeRealTestDependencies = ImprovedTestRunner.prototype.analyzeRealTestDependencies;
    
    this.memoryMonitor = new MemoryMonitor({
      maxMemoryMB: CONFIG.performance.maxMemoryMB,
      cleanupThresholdMB: CONFIG.performance.maxMemoryMB * 0.8,
      monitorInterval: CONFIG.performance.monitorInterval
    });
    this.errorManager = new ErrorManager({
      logErrors: true,
      enableCircuitBreaker: true,
      enableRetry: true
    });
    
    // 初始化统计信息
    this.stats = {
      startTime: Date.now(),
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0
    };
    
    // 初始化审计日志
    this.auditLogger = null;
    if (CONFIG.audit && CONFIG.audit.enabled) {
      this.auditLogger = new EncryptedAuditLogger({
        logDir: path.resolve(__dirname, '..', '.audit-logs'),
        encryptionKey: this.generateAuditKey(),
        ...CONFIG.audit
      });
      this.setupAuditLogging();
    }
    
    // 初始化安全扫描插件
    this.securityScanner = null;
    if (CONFIG.security && CONFIG.security.enabled) {
      this.securityScanner = new SecurityScannerPlugin(CONFIG.security);
      this.setupSecurityScanning();
    }
    
    // 延迟初始化监控，避免简单命令时不必要的初始化
    this.monitor = null;
    this.monitorAdapter = null;
    
    this.setupSignalHandlers();
    this.setupMemoryMonitoring();
    this.outputDir = path.resolve(__dirname, '..', '.test-output');
    
    // 将审计日志和监控适配器传递给执行器
    this.executor.auditLogger = this.auditLogger;
    this.executor.monitorAdapter = this.monitorAdapter;
    this.executor.runner = this;
  }
  
  /**
   * 生成审计密钥
   */
  generateAuditKey() {
    // 基于系统信息和随机数据生成密钥
    const systemInfo = `${process.pid}-${os.hostname()}-${Date.now()}`;
    const randomData = require('crypto').randomBytes(32);
    return require('crypto').pbkdf2Sync(systemInfo, randomData, 10000, 32, 'sha256');
  }
  
  /**
   * 设置审计日志
   */
  setupAuditLogging() {
    if (!this.auditLogger) return;
    
    // 监听关键事件
    this.auditLogger.on('integrity-failure', (data) => {
      console.error('🚨 审计日志完整性检查失败:', data);
    });
    
    this.auditLogger.on('log-rotation', (data) => {
      console.log('📋 审计日志轮转:', data.oldFile);
    });
    
    this.auditLogger.on('error', (error) => {
      console.error('❌ 审计日志错误:', error.message);
    });
    
    // 记录启动事件
    this.logAuditEvent({
      category: 'SYSTEM',
      action: 'STARTUP',
      level: 'INFO',
      details: {
        version: VERSION,
        scriptName: SCRIPT_NAME,
        config: CONFIG
      }
    });
  }
  
  /**
   * 记录审计事件
   */
  async logAuditEvent(event) {
    if (!this.auditLogger) return;
    
    try {
      await this.auditLogger.logAuditEvent(event);
    } catch (error) {
      console.error('审计日志记录失败:', error.message);
    }
  }
  
  /**
   * 设置安全扫描
   */
  setupSecurityScanning() {
    if (!this.securityScanner) return;
    
    // 监听扫描事件
    this.securityScanner.on('scan-started', (data) => {
      console.log(`🔒 开始安全扫描: ${data.projectPath}`);
    });
    
    this.securityScanner.on('scan-progress', (data) => {
      console.log(`🔍 ${data.phase}: ${data.status}`);
    });
    
    this.securityScanner.on('scan-completed', (data) => {
      console.log(`✅ 安全扫描完成，耗时 ${data.duration}ms`);
      console.log(`📊 发现问题: ${data.results.summary.total} (关键: ${data.results.summary.critical}, 高: ${data.results.summary.high})`);
      
      // 记录扫描结果到审计日志
      if (this.auditLogger) {
        this.logAuditEvent({
          category: 'SECURITY',
          action: 'SCAN_COMPLETED',
          level: data.results.summary.critical > 0 ? 'CRITICAL' : 'INFO',
          details: {
            results: data.results,
            duration: data.duration
          }
        });
      }
    });
    
    this.securityScanner.on('scan-error', (data) => {
      console.error('❌ 安全扫描失败:', data.error);
      
      // 记录扫描错误到审计日志
      if (this.auditLogger) {
        this.logAuditEvent({
          category: 'SECURITY',
          action: 'SCAN_ERROR',
          level: 'ERROR',
          details: {
            error: data.error
          }
        });
      }
    });
    
    // 启动时扫描（如果配置了）
    if (CONFIG.security.scanOnStartup) {
      this.runSecurityScan();
    }
  }
  
  /**
   * 运行安全扫描
   */
  async runSecurityScan(projectPath = process.cwd()) {
    if (!this.securityScanner) return null;
    
    try {
      const results = await this.securityScanner.runFullScan(projectPath);
      
      // 如果发现关键问题，输出详细信息
      if (results.summary.critical > 0 || results.summary.high > 0) {
        console.log('\n🚨 发现安全问题:');
        this.displaySecurityIssues(results);
      }
      
      return results;
    } catch (error) {
      console.error('安全扫描执行失败:', error.message);
      return null;
    }
  }
  
  /**
   * 显示安全问题
   */
  displaySecurityIssues(results) {
    const allIssues = [
      ...results.results.codeSecurity.issues,
      ...results.results.dependencySecurity.issues,
      ...results.results.configSecurity.issues,
      ...results.results.networkSecurity.issues
    ];
    
    // 按严重程度排序
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    
    // 显示前10个问题
    const topIssues = allIssues.slice(0, 10);
    
    for (const issue of topIssues) {
      const severityIcon = {
        CRITICAL: '🔴',
        HIGH: '🟠',
        MEDIUM: '🟡',
        LOW: '🟢'
      }[issue.severity];
      
      console.log(`  ${severityIcon} ${issue.severity}: ${issue.description}`);
      if (issue.file) {
        console.log(`    📁 ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
      }
      console.log(`    💡 建议: ${issue.recommendation}`);
      console.log('');
    }
    
    if (allIssues.length > 10) {
      console.log(`  ... 还有 ${allIssues.length - 10} 个问题未显示`);
    }
  }
  
  /**
   * 设置监控
   */
  setupMonitoring() {
    if (!this.monitor || !this.monitorAdapter) return;
    
    // 监听连接事件
    this.monitor.on('connected', () => {
      console.log('📊 OpenObserve 监控已连接');
      this.monitorAdapter.info('Monitor connected', { component: 'openobserve' });
    });
    
    this.monitor.on('error', (error) => {
      console.error('❌ 监控连接失败:', error.message);
    });
    
    this.monitor.on('batch-sent', (data) => {
      if (process.env.DEBUG) {
        console.log(`📊 批次发送: ${data.type} (${data.count} 条)`);
      }
    });
    
    // 记录启动事件
    this.monitorAdapter.info('Test runner started', {
      version: VERSION,
      scriptName: SCRIPT_NAME,
      nodeVersion: process.version,
      platform: process.platform
    });
    
    // 发送初始指标
    this.monitorAdapter.metric('test_runner_start_time', Date.now(), 'counter');
    this.monitorAdapter.metric('test_runner_uptime', 0, 'gauge');
    
    // 设置定期指标收集
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 10000); // 每10秒收集一次指标
  }
  
  /**
   * 收集指标
   */
  collectMetrics() {
    if (!this.monitorAdapter) return;
    
    const memUsage = process.memoryUsage();
    const uptime = Date.now() - this.stats.startTime;
    
    // 内存指标
    this.monitorAdapter.metric('memory_heap_used', memUsage.heapUsed, 'gauge');
    this.monitorAdapter.metric('memory_heap_total', memUsage.heapTotal, 'gauge');
    this.monitorAdapter.metric('memory_rss', memUsage.rss, 'gauge');
    this.monitorAdapter.metric('memory_external', memUsage.external, 'gauge');
    
    // 运行时指标
    this.monitorAdapter.metric('test_runner_uptime', uptime, 'gauge');
    this.monitorAdapter.metric('active_processes', this.stateManager.activeProcesses.size, 'gauge');
    
    // 锁指标
    this.monitorAdapter.metric('process_locks', this.stateManager.processLocks.size, 'gauge');
    this.monitorAdapter.metric('read_write_locks', this.stateManager.readWriteLocks.size, 'gauge');
    
    // 统计指标
    const stats = this.getStats();
    this.monitorAdapter.metric('total_commands', stats.totalCommands, 'counter');
    this.monitorAdapter.metric('successful_commands', stats.successfulCommands, 'counter');
    this.monitorAdapter.metric('failed_commands', stats.failedCommands, 'counter');
  }
  
  /**
   * 开始追踪
   */
  startTrace(operationName, parentSpanId = null) {
    console.log(`🔍 开始追踪: ${operationName}, parentSpanId: ${parentSpanId}`);
    console.log(`   - monitorAdapter 状态: ${this.monitorAdapter ? '已初始化' : '未初始化'}`);
    
    if (!this.monitorAdapter) {
      console.warn('⚠️ 监控适配器未初始化，分布式追踪功能降级为模拟模式');
      return {
        traceId: 'no-trace',
        spanId: 'no-span',
        finish: async () => {
          console.log(`🔍 模拟追踪结束: ${operationName}`);
        }
      };
    }
    
    console.log(`🔍 调用真实监控适配器进行追踪: ${operationName}`);
    const trace = this.monitorAdapter.startTrace(operationName, parentSpanId);
    console.log(`✅ 追踪已开始 - traceId: ${trace.traceId}, spanId: ${trace.spanId}`);
    return trace;
  }
  
  setupSignalHandlers() {
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('uncaughtException', (error) => {
      console.error('未捕获的异常:', error);
      this.gracefulShutdown('EXCEPTION');
    });
  }
  
  setupMemoryMonitoring() {
    // 设置内存监控
    this.memoryMonitor.startMonitoring();
    
    // 注册内存清理回调
    this.memoryMonitor.registerCleanupCallback(() => {
      this.stateManager.cleanupHistory();
      return Promise.resolve();
    });
    
    // 监听内存警告
    this.memoryMonitor.on('memory-alert', (alertData) => {
      logger.warn(`内存使用警告: ${alertData.currentMemoryMB.toFixed(2)}MB`);
    });
    
    // 监听紧急清理
    this.memoryMonitor.on('emergency-cleanup', (data) => {
      logger.error(`触发紧急内存清理: ${data.memoryMB.toFixed(2)}MB`);
    });
  }
  
  async gracefulShutdown(signal) {
    console.log(`🔄 开始优雅关闭，信号: ${signal}`);
    
    // 强制保存性能数据
    if (this.stateManager.performancePersistence.enabled) {
      console.log('💾 强制保存性能数据...');
      this.stateManager.savePerformanceToDisk();
    }
    
    // 强制保存缓存数据
    if (this.stateManager.cachePersistence.enabled) {
      console.log('💾 强制保存缓存数据...');
      this.stateManager.saveCacheToDisk();
    }
    
    // 停止资源监控
    this.stateManager.stopResourceMonitoring();
    this.memoryMonitor.stopMonitoring();
    
    // 等待活跃进程完成
    if (this.stateManager.activeProcesses.size > 0) {
      const timeout = setTimeout(() => {
        console.warn('⏰ 进程等待超时，强制退出');
        process.exit(1);
      }, 10000);
      
      while (this.stateManager.activeProcesses.size > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      clearTimeout(timeout);
    }
    
    // 记录关闭事件
    if (this.auditLogger) {
      await this.logAuditEvent({
        category: 'SYSTEM',
        action: 'SHUTDOWN',
        level: 'INFO',
        details: {
          signal: signal,
          reason: 'Graceful shutdown initiated'
        }
      });
    }
    
    // 使用 Promise.allSettled 并发清理资源，提升关闭容错与速度
    const cleanupTasks = [];
    
    // 清理资源
    cleanupTasks.push(this.stateManager.errorRecovery.performCleanup());
    
    // 清理内存监控
    cleanupTasks.push(Promise.resolve().then(() => this.memoryMonitor.destroy()));
    
    // 清理错误管理器
    if (this.errorManager) {
      cleanupTasks.push(Promise.resolve().then(async () => {
        // 兼容不同错误管理器实现，安全关闭或重置统计
        if (typeof this.errorManager.shutdown === 'function') {
          await this.errorManager.shutdown();
        } else if (typeof this.errorManager.resetStats === 'function') {
          this.errorManager.resetStats();
        }
      }));
    }
    
    // 清理沙箱环境
    if (this.executor.sandboxExecutor) {
      cleanupTasks.push(this.executor.sandboxExecutor.cleanup());
    }
    
    // 清理审计日志
    if (this.auditLogger) {
      cleanupTasks.push(this.auditLogger.destroy());
    }
    
    // 清理监控
    if (this.monitor) {
      // 记录关闭事件
      if (this.monitorAdapter) {
        this.monitorAdapter.info('Test runner shutting down', {
          signal: signal,
          reason: 'Graceful shutdown'
        });
        
        // 发送最终指标
        this.monitorAdapter.metric('test_runner_shutdown_time', Date.now(), 'counter');
      }
      
      cleanupTasks.push(this.monitor.destroy());
    }
    
    // 并发执行所有清理任务
    const results = await Promise.allSettled(cleanupTasks);
    
    // 检查清理结果
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected') {
        console.warn(`⚠️ 清理任务 ${i} 失败:`, result.reason.message);
      }
    }
    
    // 清理监控定时器（确保始终清理）
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    
    console.log('✅ 优雅关闭完成');
    process.exit(0);
  }
  
  async run(args) {
    try {
      // 解析参数
      const parsedArgs = this.parseArguments(args);
      
      // 显示启动信息 - 如果是简单命令会直接退出
      this.showStartupInfo(parsedArgs);
      
      // 检查是否为简单命令，避免不必要的监控初始化
      const simpleCommands = ['--help', '-h', '--version', '-v'];
      const isSimpleCommand = args.some(arg => simpleCommands.includes(arg));
      
      if (!isSimpleCommand) {
        // 启动资源监控
        this.stateManager.startResourceMonitoring();
        
        // 初始化监控组件（仅在需要时）
        console.log('🔧 检查监控初始化方法是否存在...');
        console.log(`   - this.initializeMonitoring 类型: ${typeof this.initializeMonitoring}`);
        console.log(`   - this.initializeMonitoring 值: ${this.initializeMonitoring}`);
        
        if (typeof this.initializeMonitoring === 'function') {
          console.log('✅ 调用监控初始化方法');
          this.initializeMonitoring();
        } else {
          console.log('🔕 监控功能未启用或配置不完整，创建模拟适配器');
          // 即使监控初始化方法不存在，也创建模拟适配器
          if (typeof this.createMockMonitorAdapter === 'function') {
            this.createMockMonitorAdapter();
          } else {
            console.warn('⚠️ 模拟监控适配器方法也不存在，跳过监控初始化');
          }
        }
      }
      
      // 执行测试
      const result = await this.executeTests(parsedArgs);
      
      // 显示结果
      this.showResults(result, parsedArgs);
      // 持久化输出
      await this.persistOutput('success', result.stdout, result.stderr);

      // 统一终端输出摘要（成功路径）
      this.printTerminalSummary(result);
      
      // 测试成功后进行优雅关闭，清理所有监控定时器与资源，确保进程退出
      // 根治在成功路径上未退出导致的挂起问题
      await this.gracefulShutdown('SUCCESS');
      
      return result;
      
    } catch (error) {
      console.error('❌ 测试运行失败:', error.message);
      
      // 在失败时也输出聚合的 Jest 日志，便于定位问题
      if (error.stdout && String(error.stdout).trim().length > 0) {
        console.log(error.stdout);
      }
      if (error.stderr && String(error.stderr).trim().length > 0) {
        console.error(error.stderr);
      }
      // 持久化失败输出
      await this.persistOutput('failure', error.stdout, error.stderr);

      // 统一终端输出摘要（失败路径）
      this.printTerminalSummary(error);
      
      // 测试失败时运行安全扫描（如果配置了）
      if (CONFIG.security && CONFIG.security.scanOnTestFailure) {
        console.log('\n🔍 测试失败，运行安全扫描...');
        await this.runSecurityScan();
      }
      
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      
      process.exit(1);
    } finally {
      this.stateManager.stopResourceMonitoring();
    }
  }

  // 终端输出摘要
  printTerminalSummary(out) {
    const code = (out && typeof out.code !== 'undefined') ? out.code : null;
    const duration = (out && typeof out.duration !== 'undefined') ? out.duration : null;
    const timeoutType = (out && out.timeoutType) ? out.timeoutType : null;
    const success = (out && out.success === true && code === 0);
    const status = success ? 'PASS' : (code === 0 ? 'PASS' : (code == null || timeoutType ? 'UNKNOWN' : 'FAIL'));

    const s = (str) => (typeof str === 'string' ? str : (str == null ? '' : String(str)));
    const lastLines = this.getLastLines(`${s(out && out.stdout)}\n${s(out && out.stderr)}`, 20);

    console.log('\n—— 终端输出摘要 ——');
    console.log(`状态: ${status}`);
    console.log(`退出码: ${code == null ? 'N/A' : code}`);
    if (duration != null) console.log(`耗时: ${duration}ms`);
    if (timeoutType) console.log(`超时类型: ${timeoutType}`);
    if (lastLines.trim().length > 0) {
      console.log('最后输出片段:');
      console.log(lastLines);
    }
  }

  getLastLines(text, n = 20) {
    try {
      const lines = String(text || '').split(/\r?\n/);
      return lines.slice(Math.max(0, lines.length - n)).join('\n');
    } catch (_) {
      return '';
    }
  }
  
  parseArguments(args) {
    // 实现参数解析逻辑
    const parsed = {
      testType: 'unit',
      coverage: false,
      verbose: false,
      silent: false,
      watch: false,
      debug: false,
      timeout: CONFIG.testing ? CONFIG.testing.defaultTimeout : 30000,
      maxWorkers: CONFIG.concurrency.maxConcurrent,
      testPathPattern: null,
      testNamePattern: null,
      config: null,
      help: false,
      version: false,
      runInBand: false,
      runTestsByPath: null,
      listTests: false,
      jestHelp: false
    };
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--help' || arg === '-h') {
        parsed.help = true;
      } else if (arg === '--version' || arg === '-v') {
        parsed.version = true;
      } else if (arg === '--coverage' || arg === '-c') {
        parsed.coverage = true;
      } else if (arg === '--verbose') {
        parsed.verbose = true;
      } else if (arg === '--silent') {
        parsed.silent = true;
      } else if (arg === '--watch') {
        parsed.watch = true;
      } else if (arg === '--debug') {
        parsed.debug = true;
      } else if (arg === '--runInBand') {
        parsed.runInBand = true;
      } else if (arg === '--listTests') {
        parsed.listTests = true;
      } else if (arg === '--jestHelp') {
        parsed.jestHelp = true;
      } else if (arg.startsWith('--timeout=')) {
        parsed.timeout = parseInt(arg.split('=')[1]) || parsed.timeout;
      } else if (arg.startsWith('--maxWorkers=')) {
        parsed.maxWorkers = parseInt(arg.split('=')[1]) || parsed.maxWorkers;
      } else if (arg.startsWith('--testPathPattern=')) {
        parsed.testPathPattern = arg.split('=')[1];
      } else if (arg.startsWith('--testNamePattern=')) {
        parsed.testNamePattern = arg.split('=')[1];
      } else if (arg.startsWith('--runTestsByPath=')) {
        parsed.runTestsByPath = arg.split('=')[1];
      } else if (arg.startsWith('--config=')) {
        const configPath = arg.split('=')[1];
        // 校验配置文件路径存在性与权限
        try {
          if (!fs.existsSync(configPath)) {
            throw new Error(`配置文件不存在: ${configPath}`);
          }
          // 检查文件权限
          fs.accessSync(configPath, fs.constants.R_OK);
          parsed.config = configPath;
        } catch (error) {
          console.error(`❌ 配置文件错误: ${error.message}`);
          console.log(`💡 建议使用默认配置或检查文件路径: ${configPath}`);
          process.exit(1);
        }
      } else if (arg === 'unit' || arg === 'integration' || arg === 'e2e') {
        parsed.testType = arg;
      }
    }
    
    return parsed;
  }
  
  showStartupInfo(args) {
    if (args.help) {
      this.showHelp();
      // 帮助信息显示后直接退出，不执行后续流程
      process.exit(0);
    }
    
    if (args.version) {
      console.log(`${SCRIPT_NAME} v${VERSION}`);
      // 版本信息显示后直接退出，不执行后续流程
      process.exit(0);
    }
    
    // 检查是否为简单命令，避免不必要的监控初始化
    const simpleCommands = ['--help', '-h', '--version', '-v'];
    const isSimpleCommand = Array.isArray(args) && args.some(arg => simpleCommands.includes(arg));
    
    if (!args.silent && !isSimpleCommand) {
      console.log(`🧪 ${SCRIPT_NAME} v${VERSION} 启动中...`);
      console.log(`📊 系统信息: ${os.cpus().length} 核心, ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)}GB 内存`);
      console.log(`⚙️ 配置: 测试类型=${args.testType}, 并发=${args.maxWorkers}, 超时=${args.timeout}ms`);
    }
  }
  
  async executeTests(args) {
    if (args.help || args.version) {
      return { success: true };
    }
    
    // 开始分布式追踪 - 测试执行过程
    const trace = this.startTrace('test_execution', null);
    
    // 根据testType明确映射到对应jest配置文件
    const configMapping = {
      unit: 'jest.config.unit.cjs',
      integration: 'jest.config.integration.cjs',
      e2e: 'jest.config.e2e.cjs'
    };
    
    // 如果用户没有指定配置文件，根据测试类型使用默认配置
    if (!args.config) {
      const defaultConfig = configMapping[args.testType];
      if (defaultConfig) {
        const configPath = path.resolve(__dirname, '..', defaultConfig);
        try {
          if (fs.existsSync(configPath)) {
            args.config = configPath;
            if (!args.silent) {
              console.log(`📁 使用配置文件: ${defaultConfig}`);
            }
          } else {
            console.warn(`⚠️ 默认配置文件不存在: ${defaultConfig}`);
            console.log(`💡 建议创建文件: ${configPath}`);
            console.log(`💡 或使用 --config= 参数指定配置文件`);
          }
        } catch (error) {
          console.warn(`⚠️ 检查配置文件失败: ${error.message}`);
        }
      }
    }
    
    // 构建Jest命令
    const jestArgs = this.buildJestArgs(args);
    // 在静默模式下生成 JSON 摘要文件，便于无控制台输出时查看结果
    if (args.silent) {
      try {
        if (!fs.existsSync(this.outputDir)) {
          fs.mkdirSync(this.outputDir, { recursive: true });
        }
      } catch (_) {}
      const summaryPath = path.join(this.outputDir, `jest-summary-${Date.now()}.json`);
      jestArgs.push('--json');
      jestArgs.push('--outputFile', summaryPath);
    }
    
    // 执行测试 - 设置正确的工作目录为 backend 目录
    const projectRoot = path.resolve(__dirname, '..');
    if (!args.silent) {
      console.log(`📁 工作目录: ${projectRoot}`);
    }
    
    const startTime = Date.now();
    const result = await this.executor.executeCommand('npx', ['jest', ...jestArgs], {
      silent: args.silent,
      spawnOptions: {
        cwd: projectRoot
      }
    });
    const duration = Date.now() - startTime;
    
    // 结束追踪
    await trace.finish();

    console.log('🔍 性能数据收集诊断:');
    console.log(`   - 测试套件总执行时间: ${duration}ms`);
    const testExecStats = this.stateManager.getTestExecutionTimeStats();
    console.log(`   - 当前测试执行时间记录数: ${testExecStats.count} 个${testExecStats.type}`);
    console.log(`   - 缓存统计: hits=${this.stateManager.performanceMetrics.cacheStats.hits}, misses=${this.stateManager.performanceMetrics.cacheStats.misses}, totalRequests=${this.stateManager.performanceMetrics.cacheStats.totalRequests}`);
    console.log(`   - 真实时间指标: 测试套件数=${this.stateManager.performanceMetrics.realTimeMetrics.testSuitesExecuted}, 命令数=${this.stateManager.performanceMetrics.realTimeMetrics.commandsExecuted}`);

    // 更新测试套件执行计数和完成时间
    this.stateManager.performanceMetrics.realTimeMetrics.testSuitesExecuted++;
    this.stateManager.performanceMetrics.realTimeMetrics.lastTestSuiteEndTime = Date.now();
    this.stateManager.performanceMetrics.realTimeMetrics.lastTestSuiteDuration = duration;
    
    // 记录测试执行性能指标 - 确保这个方法被调用
    console.log('📝 调用 recordTestExecutionTime 记录测试套件执行时间');
    this.stateManager.recordTestExecutionTime('full-test-suite', duration);
    
    // 新增：尝试解析Jest输出以记录单个测试文件的执行时间
    this.analyzeJestOutputForIndividualTestTimes(result.stdout, result.stderr, duration);
    this.stateManager.recordPerformanceMetric('test_suite_duration', duration, {
      testType: args.testType,
      coverage: args.coverage,
      workers: args.maxWorkers
    });
    
    // 记录测试套件执行指标
    this.stateManager.recordPerformanceMetric('test_suite_execution', 1, {
      testType: args.testType,
      duration: duration,
      success: result.success
    });
    
    // 更新资源使用指标
    const memUsage = process.memoryUsage();
    this.stateManager.recordPerformanceMetric('memory_usage', memUsage.heapUsed / 1024 / 1024);
    this.stateManager.recordPerformanceMetric('memory_rss', memUsage.rss / 1024 / 1024);
    this.stateManager.recordPerformanceMetric('memory_external', memUsage.external / 1024 / 1024);
    
    // 更新命令统计
    this.stats.totalCommands = (this.stats.totalCommands || 0) + 1;
    if (result.success) {
      this.stats.successfulCommands = (this.stats.successfulCommands || 0) + 1;
    } else {
      this.stats.failedCommands = (this.stats.failedCommands || 0) + 1;
    }
    
    this.stateManager.performanceMetrics.resourceUsage.totalCommands = this.stats.totalCommands;
    this.stateManager.recordPerformanceMetric('total_commands', this.stats.totalCommands);
    this.stateManager.recordPerformanceMetric('successful_commands', this.stats.successfulCommands);
    this.stateManager.recordPerformanceMetric('failed_commands', this.stats.failedCommands);
    
    return result;
  }
  
  buildJestArgs(args) {
    const jestArgs = [];
    
    if (args.coverage) {
      jestArgs.push('--coverage');
    }
    
    if (args.verbose) {
      jestArgs.push('--verbose');
    }
    
    if (args.silent) {
      jestArgs.push('--silent');
    }
    
    if (args.watch) {
      jestArgs.push('--watch');
    }
    
    if (args.runInBand) {
      jestArgs.push('--runInBand');
    }
    
    if (args.listTests) {
      jestArgs.push('--listTests');
    }
    
    if (args.jestHelp) {
      jestArgs.push('--help');
    }
    
    if (args.debug) {
      jestArgs.push('--detectOpenHandles');
      jestArgs.push('--forceExit');
      jestArgs.push('--runInBand');
      // 调试模式下增加更多诊断参数
      jestArgs.push('--logHeapUsage');
      jestArgs.push('--expand');
      console.log('🔧 调试模式: 检测句柄泄漏、强制退出、串行运行');
    } else if (!args.runInBand) {
      // 只有在非调试模式且非runInBand模式下才设置 maxWorkers
      jestArgs.push('--maxWorkers', args.maxWorkers.toString());
    }
    
    if (args.testPathPattern) {
      jestArgs.push('--testPathPattern', args.testPathPattern);
    }
    
    if (args.testNamePattern) {
      jestArgs.push('--testNamePattern', args.testNamePattern);
    }
    
    if (args.runTestsByPath) {
      jestArgs.push(args.runTestsByPath);
    }
    
    if (args.config) {
      jestArgs.push('--config', args.config);
    }
    
    jestArgs.push('--testTimeout', args.timeout.toString());
    
    return jestArgs;
  }
  
  showResults(result, args) {
    if (result.success) {
      console.log('✅ 测试执行完成');
    } else {
      console.log('❌ 测试执行失败');
    }
    
    // 在 --listTests 模式下，Jest 已经将测试列表输出到 stdout，我们不需要重复输出
    // 只有在非 listTests 模式下，或者有错误输出时才输出 stdout 和 stderr
    if (!args.listTests) {
      // 输出聚合的 Jest 日志（在静默模式下尤为有用）
      // 即使静默模式，也输出关键错误信息
      if (result.stdout && result.stdout.trim().length > 0) {
        console.log(result.stdout);
      }
      if (result.stderr && result.stderr.trim().length > 0) {
        // 在静默模式下仍保留关键错误输出
        console.error(result.stderr);
      }
    } else {
      // 在 listTests 模式下，我们只输出错误信息
      if (result.stderr && result.stderr.trim().length > 0) {
        console.error(result.stderr);
      }
    }

    if (result.duration) {
      console.log(`⏱️ 执行时间: ${result.duration}ms`);
    }
    
    // 在静默模式下，如果测试失败，仍然显示关键信息
    if (!result.success && process.env.SILENT_MODE) {
      console.error('❌ 测试失败 - 检查详细日志文件获取更多信息');
    }
  }

  async persistOutput(status, stdout = '', stderr = '') {
    try {
      // 使用 fs.promises 进行异步文件操作
      if (!fs.existsSync(this.outputDir)) {
        await fs.promises.mkdir(this.outputDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = path.join(this.outputDir, `jest-${status}-${timestamp}.log`);
      const content = [
        `Status: ${status}`,
        `Time: ${new Date().toISOString()}`,
        '--- STDOUT ---',
        stdout || '',
        '--- STDERR ---',
        stderr || ''
      ].join(os.EOL);
      await fs.promises.writeFile(filePath, content, { encoding: 'utf8' });
    } catch (e) {
      // 文件系统错误不应中断测试流程，回退到控制台输出
      console.warn('⚠️ 无法写入测试输出日志:', e.message);
      console.log('回退到控制台输出:');
      console.log('STDOUT:', stdout);
      console.error('STDERR:', stderr);
    }
  }
  
  /**
   * 执行增量测试
   */
  async executeIncrementalTests(jestArgs, projectRoot, args) {
    try {
      const changedFiles = await this.getChangedTestFiles(projectRoot);
      if (changedFiles.length === 0) {
        console.log('📊 增量测试: 没有测试文件发生变化，跳过执行');
        return {
          success: true,
          stdout: 'No test files changed - incremental mode',
          stderr: '',
          duration: 0,
          code: 0
        };
      }
      
      console.log(`📊 增量测试: 运行 ${changedFiles.length} 个修改的测试文件`);
      changedFiles.forEach(file => console.log(`   - ${file}`));
      
      // 只运行修改的文件
      const incrementalArgs = [...jestArgs, ...changedFiles];
      const result = await this.executor.executeCommand('npx', ['jest', ...incrementalArgs], {
        silent: args.silent,
        useCache: true,
        spawnOptions: {
          cwd: projectRoot
        }
      });
      
      // 更新成功执行的文件时间戳
      if (result.success) {
        this.updateSpecificFileTimestamps(changedFiles);
      }
      
      return result;
    } catch (error) {
      console.warn('⚠️ 增量测试失败，回退到完整测试:', error.message);
      return null;
    }
  }
  
  /**
   * 获取修改的测试文件
   */
  async getChangedTestFiles(projectRoot) {
    const changedFiles = [];
    
    try {
      // 查找所有测试文件
      const testFiles = await this.findTestFiles(projectRoot);
      
      for (const file of testFiles) {
        const stats = await fs.promises.stat(file);
        const currentMtime = stats.mtime.getTime();
        const cachedMtime = this.stateManager.testFileTimestamps.get(file);
        
        if (!cachedMtime || currentMtime > cachedMtime) {
          changedFiles.push(file);
        }
      }
    } catch (error) {
      console.warn('获取测试文件列表失败:', error.message);
    }
    
    return changedFiles;
  }
  
  /**
   * 查找所有测试文件
   */
  async findTestFiles(projectRoot) {
    const testFiles = [];
    const testPatterns = ['**/*.test.js', '**/*.spec.js', '**/__tests__/**/*.js'];
    
    // 记录开始时间
    const startTime = Date.now();
    
    for (const pattern of testPatterns) {
      try {
        const { glob } = await import('glob');
        const files = await glob(pattern, {
          cwd: projectRoot,
          ignore: ['**/node_modules/**', '**/dist/**', '**/coverage/**']
        });
        testFiles.push(...files.map(f => path.resolve(projectRoot, f)));
      } catch (error) {
        // 如果glob不可用，使用简单文件遍历
        this.stateManager.logStructuredEvent('FILE_SEARCH', 'GLOB_UNAVAILABLE', 'WARN', {
          pattern,
          error: error.message
        });
        const files = await this.simpleFileSearch(projectRoot, pattern);
        testFiles.push(...files);
      }
    }
    
    const duration = Date.now() - startTime;
    this.stateManager.logStructuredEvent('FILE_SEARCH', 'COMPLETED', 'INFO', {
      fileCount: testFiles.length,
      duration,
      patterns: testPatterns
    });
    
    return [...new Set(testFiles)]; // 去重
  }
  
  /**
   * 简单文件搜索（回退方案）
   */
  async simpleFileSearch(dir, pattern) {
    const files = [];
    
    async function search(currentDir) {
      try {
        const items = await fs.promises.readdir(currentDir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(currentDir, item.name);
          
          if (item.isDirectory() &&
              !item.name.includes('node_modules') &&
              !item.name.includes('dist') &&
              !item.name.includes('coverage')) {
            await search(fullPath);
          } else if (item.isFile() &&
                     (item.name.endsWith('.test.js') ||
                      item.name.endsWith('.spec.js') ||
                      currentDir.includes('__tests__'))) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // 忽略权限错误等
      }
    }
    
    await search(dir);
    return files;
  }
  
  /**
   * 更新测试文件时间戳
   */
  async updateTestFileTimestamps(projectRoot) {
    try {
      const testFiles = await this.findTestFiles(projectRoot);
      for (const file of testFiles) {
        const stats = await fs.promises.stat(file);
        this.stateManager.testFileTimestamps.set(file, stats.mtime.getTime());
      }
    } catch (error) {
      console.warn('更新测试文件时间戳失败:', error.message);
    }
  }
  
  /**
   * 更新特定文件时间戳
   */
  async updateSpecificFileTimestamps(files) {
    for (const file of files) {
      try {
        const stats = await fs.promises.stat(file);
        this.stateManager.testFileTimestamps.set(file, stats.mtime.getTime());
      } catch (error) {
        // 忽略单个文件错误
      }
    }
  }

  showHelp() {
    console.log(`
${SCRIPT_NAME} v${VERSION} - 健壮性增强版

用法: node ${SCRIPT_NAME}.cjs [选项] [测试类型]

改进特性:
- 优化的命令执行频率限制
- 增强的边界条件处理
- 改进的并发安全性
- 智能错误恢复机制
- 优化的资源管理
- 命令执行结果缓存
- 增量测试执行支持

选项:
  -h, --help              显示帮助信息
  -v, --version           显示版本信息
  -c, --coverage          启用代码覆盖率
  --verbose               详细输出
  --silent                静默模式
  --watch                 监视模式
  --debug                 调试模式 (检测句柄泄漏, 强制退出, 串行运行)
  --runInBand             串行运行所有测试
  --listTests             列出所有测试但不执行
  --jestHelp              显示Jest帮助信息
  --timeout=<ms>          测试超时时间 (默认: 30000)
  --maxWorkers=<num>      最大工作线程数 (默认: CPU核心数)
  --testPathPattern=<pattern>  测试文件路径模式
  --testNamePattern=<pattern>  测试名称模式
  --runTestsByPath=<path>     运行指定路径的测试
  --config=<path>         Jest配置文件路径

环境变量:
  INCREMENTAL_TEST        启用增量测试模式 (默认: true)
  DEBUG                   启用调试输出

测试类型:
  unit                    单元测试 (默认)
  integration             集成测试
  e2e                     端到端测试

示例:
  node ${SCRIPT_NAME}.cjs                    # 运行单元测试
  node ${SCRIPT_NAME}.cjs --coverage         # 运行带覆盖率的测试
  node ${SCRIPT_NAME}.cjs integration        # 运行集成测试
  node ${SCRIPT_NAME}.cjs --testPathPattern="auth.*"  # 运行认证相关测试
  node ${SCRIPT_NAME}.cjs --debug            # 运行调试模式
  node ${SCRIPT_NAME}.cjs --runInBand        # 串行运行所有测试
  node ${SCRIPT_NAME}.cjs --listTests        # 列出所有测试但不执行
  node ${SCRIPT_NAME}.cjs --runTestsByPath="src/auth/**/*.test.js"  # 运行指定路径的测试
  INCREMENTAL_TEST=false node ${SCRIPT_NAME}.cjs  # 禁用增量测试
`);
  }
}

// 主入口
if (require.main === module) {
  const runner = new ImprovedTestRunner();
  const args = process.argv.slice(2);
  
  runner.run(args).catch(error => {
    console.error('运行失败:', error.message);
    process.exit(1);
  });
}

// 修复：确保 initializeMonitoring 方法在构造函数中正确设置
ImprovedTestRunner.prototype.initializeMonitoring = function() {
  console.log('🔧 [修复] 监控初始化开始');
  console.log('🔧 [修复] CONFIG.monitoring:', CONFIG.monitoring);
  console.log('🔧 [修复] OpenObserveMonitor:', typeof OpenObserveMonitor);
  console.log('🔧 [修复] OpenObserveAdapter:', typeof OpenObserveAdapter);
  
  if (CONFIG.monitoring && CONFIG.monitoring.enabled && CONFIG.monitoring.openobserve.enabled) {
    console.log('🔧 开始初始化监控组件...');
    console.log(`   - OpenObserve 端点: ${CONFIG.monitoring.openobserve.endpoint}`);
    console.log(`   - 组织: ${CONFIG.monitoring.openobserve.organization}`);
    console.log(`   - 用户名: ${CONFIG.monitoring.openobserve.username}`);
    
    try {
      // 检查监控组件是否可用
      if (typeof OpenObserveMonitor === 'undefined' || typeof OpenObserveAdapter === 'undefined') {
        console.warn('⚠️ 监控组件未加载，创建模拟适配器');
        this.createMockMonitorAdapter();
        return;
      }
      
      this.monitor = new OpenObserveMonitor(CONFIG.monitoring.openobserve);
      this.monitorAdapter = new OpenObserveAdapter(this.monitor);
      console.log('✅ 监控适配器创建成功');
      this.setupMonitoring();
    } catch (error) {
      console.error('❌ 监控适配器初始化失败:', error.message);
      console.error('❌ 错误堆栈:', error.stack);
      console.log('🔄 创建模拟监控适配器作为降级方案');
      this.createMockMonitorAdapter();
    }
  } else {
    console.log('🔕 监控功能已禁用或配置不完整');
    console.log(`   - monitoring.enabled: ${CONFIG.monitoring?.enabled}`);
    console.log(`   - openobserve.enabled: ${CONFIG.monitoring?.openobserve?.enabled}`);
    // 即使监控禁用，也创建模拟适配器以确保代码正常运行
    this.createMockMonitorAdapter();
  }
};

// 新增：创建模拟监控适配器
ImprovedTestRunner.prototype.createMockMonitorAdapter = function() {
  console.log('🔧 创建模拟监控适配器...');
  
  this.monitorAdapter = {
    // 模拟指标记录
    metric: function(name, value, tags = {}) {
      if (process.env.DEBUG_MONITOR) {
        console.log(`📊 [模拟监控] ${name} = ${value}, tags: ${JSON.stringify(tags)}`);
      }
    },
    
    // 模拟计数器
    counter: function(name, value, tags = {}) {
      if (process.env.DEBUG_MONITOR) {
        console.log(`🔢 [模拟监控] ${name} += ${value}, tags: ${JSON.stringify(tags)}`);
      }
    },
    
    // 模拟信息日志
    info: function(message, context = {}) {
      if (process.env.DEBUG_MONITOR) {
        console.log(`ℹ️ [模拟监控] ${message}, context: ${JSON.stringify(context)}`);
      }
    },
    
    // 模拟警告日志
    warn: function(message, context = {}) {
      console.warn(`⚠️ [模拟监控] ${message}`, context);
    },
    
    // 模拟错误日志
    error: function(message, context = {}) {
      console.error(`❌ [模拟监控] ${message}`, context);
    },
    
    // 模拟分布式追踪
    startTrace: function(operationName, parentSpanId = null) {
      console.log(`🔍 [模拟追踪] 开始: ${operationName}, parentSpanId: ${parentSpanId}`);
      return {
        traceId: `mock-trace-${Date.now()}`,
        spanId: `mock-span-${Date.now()}`,
        finish: function() {
          console.log(`🔍 [模拟追踪] 结束: ${operationName}`);
          return Promise.resolve();
        }
      };
    },
    
    // 模拟批量发送
    flush: function() {
      if (process.env.DEBUG_MONITOR) {
        console.log('🔄 [模拟监控] 批量数据已刷新');
      }
      return Promise.resolve();
    },
    
    // 模拟关闭
    destroy: function() {
      console.log('🔚 [模拟监控] 适配器已销毁');
      return Promise.resolve();
    }
  };
  
  console.log('✅ 模拟监控适配器创建完成');
  
  // 记录模拟适配器创建事件
  this.stateManager.logStructuredEvent('MONITORING', 'MOCK_ADAPTER_CREATED', 'INFO', {
    reason: 'Real monitor unavailable',
    config: {
      monitoringEnabled: CONFIG.monitoring?.enabled,
      openobserveEnabled: CONFIG.monitoring?.openobserve?.enabled
    }
  });
};

/**
 * 分析Jest输出，提取单个测试文件的执行时间 - 增强版
 */
ImprovedTestRunner.prototype.analyzeJestOutputForIndividualTestTimes = function(stdout, stderr, totalDuration) {
    console.log('🔍 [修复] 开始分析Jest输出以提取单个测试文件执行时间...');
    
    // 检查是否为 --listTests 模式（只有文件路径，没有执行时间）
    const combinedOutput = stdout + '\n' + stderr;
    const isListTestsMode = combinedOutput.includes('--listTests') ||
                           (combinedOutput.split('\n').every(line =>
                            (line.endsWith('.spec.ts') || line.endsWith('.test.ts') ||
                             line.endsWith('.spec.js') || line.endsWith('.test.js')) &&
                            !line.includes('PASS') && !line.includes('FAIL') && !line.includes('✓') && !line.includes('✗')));
    
    if (isListTestsMode) {
        console.log('🔍 [修复] 检测到 --listTests 模式，跳过执行时间分析');
        console.log('🔍 [修复] 只记录测试文件列表，不分析执行时间');
        
        const testFiles = combinedOutput.split('\n')
            .filter(line => line.trim() &&
                   (line.endsWith('.spec.ts') || line.endsWith('.test.ts') ||
                    line.endsWith('.spec.js') || line.endsWith('.test.js')))
            .map(file => file.trim());
        
        console.log(`🔍 [修复] 发现 ${testFiles.length} 个测试文件`);
        
        // 为每个测试文件记录基础信息（不记录执行时间）
        testFiles.forEach(testFile => {
            console.log(`📝 [修复] 记录测试文件: ${testFile} (LIST_TESTS_MODE)`);
            
            // 只记录文件存在，不记录执行时间
            if (!this.stateManager.performanceMetrics.testExecutionTimes.has(testFile)) {
                this.stateManager.performanceMetrics.testExecutionTimes.set(testFile, []);
            }
            
            // 记录基础指标
            this.stateManager.recordPerformanceMetric('test_file_detected', 1, {
                testFile: path.basename(testFile),
                testFilePath: testFile,
                mode: 'list_tests'
            });
        });
        
        return;
    }
    
    console.log('🔍 [修复] Jest输出样本前500字符:');
    console.log(combinedOutput.substring(0, 500));
    console.log('🔍 [修复] Jest输出总长度:', combinedOutput.length);
    
    // 使用之前已声明的 combinedOutput 变量
    const individualTestTimes = [];
    const testFileStats = {
        totalFiles: 0,
        passedFiles: 0,
        failedFiles: 0,
        totalDuration: 0
    };
    
    // 增强的测试文件匹配模式 - 支持更多实际的Jest输出格式
    const testFilePatterns = [
        // Jest 默认输出格式: PASS src/auth/auth.test.js (5.123 s)
        /(PASS|FAIL)\s+([^\s]+\.(test|spec)\.(js|ts|jsx|tsx))\s+\((\d+\.?\d*)\s*s\)/g,
        // Jest 详细模式: ✓ src/auth/auth.test.js (1234 ms)
        /[✓✗]\s+([^\s]+\.(test|spec)\.(js|ts|jsx|tsx))\s+\((\d+)\s*ms\)/g,
        // Jest JSON 输出格式
        /"name":\s*"([^"]+\.(test|spec)\.(js|ts|jsx|tsx))"/g,
        // Jest 测试套件输出
        /Test\s+Suite:\s+([^\s]+\.(test|spec)\.(js|ts|jsx|tsx))/g,
        // 文件路径模式 (回退方案)
        /([a-zA-Z0-9\/\-_]+\.(test|spec)\.(js|ts|jsx|tsx))/g
    ];
    
    let match;
    const processedFiles = new Set();
    
    // 尝试每种模式匹配
    console.log('🔍 [诊断] 开始正则表达式模式匹配...');
    for (let i = 0; i < testFilePatterns.length; i++) {
        const pattern = testFilePatterns[i];
        pattern.lastIndex = 0; // 重置正则表达式
        let matchCount = 0;
        while ((match = pattern.exec(combinedOutput)) !== null) {
            matchCount++;
            console.log(`🔍 [诊断] 模式${i} 匹配${matchCount}:`, match[0]);
            let status, testFile, duration;
            
            if (match[0].includes('✓') || match[0].includes('✗')) {
                // Jest详细模式
                status = match[0].includes('✓') ? 'PASS' : 'FAIL';
                testFile = match[1];
                duration = parseInt(match[4]) || Math.floor(totalDuration / 20);
            } else if (match[5]) {
                // Jest默认输出格式，有时间信息
                status = match[1];
                testFile = match[2];
                const rawDuration = parseFloat(match[5]);
                // 根据时间单位转换：秒转换为毫秒
                duration = rawDuration * 1000;
                // 验证时间合理性：应该在1ms到300000ms（5分钟）之间
                if (duration < 1 || duration > 300000) {
                    duration = Math.floor(totalDuration / 15);
                    estimated = true;
                }
            } else if (match[0].includes('"name"')) {
                // JSON格式
                testFile = match[1];
                status = 'UNKNOWN';
                duration = Math.floor(totalDuration / 15);
            } else if (match[0].includes('Test Suite')) {
                // 测试套件格式
                testFile = match[1];
                status = 'UNKNOWN';
                duration = Math.floor(totalDuration / 10);
            } else {
                // 简单文件路径模式
                testFile = match[1];
                status = 'UNKNOWN';
                duration = Math.floor(totalDuration / Math.max(individualTestTimes.length, 1));
                estimated = true;
            }
            
            // 过滤无效文件和重复文件
            if (!testFile || testFile.includes('node_modules') || processedFiles.has(testFile)) {
                continue;
            }
            
            processedFiles.add(testFile);
            console.log(`📝 发现测试文件: ${testFile} (${status}) - ${duration}ms`);
            
            individualTestTimes.push({
                testFile,
                status,
                duration,
                timestamp: Date.now(),
                estimated: estimated || status === 'UNKNOWN'
            });
            
            // 更新统计
            testFileStats.totalFiles++;
            if (status === 'PASS') testFileStats.passedFiles++;
            if (status === 'FAIL') testFileStats.failedFiles++;
            testFileStats.totalDuration += duration;
        }
    }
    
    // 记录单个测试文件的执行时间
    if (individualTestTimes.length > 0) {
        console.log(`📊 成功分析 ${individualTestTimes.length} 个测试文件的执行时间`);
        console.log(`📈 测试文件统计: 通过 ${testFileStats.passedFiles}, 失败 ${testFileStats.failedFiles}, 总计 ${testFileStats.totalFiles}`);
        
        individualTestTimes.forEach(({ testFile, duration, status, estimated }) => {
            const logPrefix = estimated ? '⏱️ [估算]' : '⏱️';
            console.log(`${logPrefix} 记录测试文件执行时间: ${testFile} - ${duration}ms (${status})`);
            
            // 记录详细的测试执行时间
            this.stateManager.recordTestExecutionTime(testFile, duration);
            
            // 记录更详细的性能指标
            this.stateManager.recordPerformanceMetric('individual_test_execution', duration, {
                testFile: path.basename(testFile),
                testFilePath: testFile,
                status: status,
                estimated: estimated || false,
                testType: this.inferTestType(testFile)
            });
            
            // 记录测试文件统计
            this.stateManager.recordPerformanceMetric('test_file_stats', 1, {
                status: status,
                fileType: path.extname(testFile),
                estimated: estimated || false
            });
        });
        
        // 记录整体统计
        this.stateManager.recordPerformanceMetric('test_execution_summary', testFileStats.totalFiles, {
            passed: testFileStats.passedFiles,
            failed: testFileStats.failedFiles,
            totalDuration: testFileStats.totalDuration,
            avgDuration: Math.floor(testFileStats.totalDuration / testFileStats.totalFiles)
        });
        
        // 构建真实的测试依赖图
        this.buildTestDependencyGraph(individualTestTimes.map(item => item.testFile));
    } else {
        console.log('⚠️ 无法从Jest输出中提取单个测试文件信息');
        console.log('💡 建议使用 --verbose 模式运行Jest以获得更详细的输出');
        
        // 即使没有找到具体文件，也记录一些基础信息
        this.stateManager.recordPerformanceMetric('test_execution_summary', 0, {
            passed: 0,
            failed: 0,
            totalDuration: totalDuration,
            noIndividualData: true
        });
    }
  }
  
  /**
   * 推断测试类型
   */
  ImprovedTestRunner.prototype.inferTestType = function(testFile) {
      const fileName = testFile.toLowerCase();
      
      if (fileName.includes('unit') || fileName.includes('test')) return 'unit';
      if (fileName.includes('integration')) return 'integration';
      if (fileName.includes('e2e') || fileName.includes('end-to-end')) return 'e2e';
      if (fileName.includes('component')) return 'component';
      if (fileName.includes('api')) return 'api';
      if (fileName.includes('auth')) return 'auth';
      if (fileName.includes('database') || fileName.includes('db')) return 'database';
      
      // 根据目录结构推断
      const dirPath = path.dirname(testFile).toLowerCase();
      if (dirPath.includes('unit') || dirPath.includes('test')) return 'unit';
      if (dirPath.includes('integration')) return 'integration';
      if (dirPath.includes('e2e')) return 'e2e';
      if (dirPath.includes('component')) return 'component';
      
      return 'unknown';
  }

  /**
   * 从测试文件路径中提取模块名称
   */
  ImprovedTestRunner.prototype.extractModuleName = function(testFile) {
      console.log(`🔍 [修复] 提取模块名称: ${testFile}`);
      
      try {
          // 从文件路径中提取模块名
          const normalizedPath = path.normalize(testFile);
          const pathParts = normalizedPath.split(path.sep);
          
          // 查找 src 目录后的第一个目录作为模块名
          const srcIndex = pathParts.indexOf('src');
          if (srcIndex !== -1 && srcIndex + 1 < pathParts.length) {
              const moduleName = pathParts[srcIndex + 1];
              console.log(`🔍 [修复] 提取的模块名: ${moduleName}`);
              return moduleName;
          }
          
          // 如果找不到 src 目录，使用文件名（不含扩展名）作为模块名
          const fileName = path.basename(testFile, path.extname(testFile));
          const baseName = fileName.replace(/\.(test|spec)$/, '');
          console.log(`🔍 [修复] 使用文件名作为模块名: ${baseName}`);
          return baseName;
      } catch (error) {
          console.warn(`⚠️ [修复] 提取模块名失败: ${error.message}`);
          return 'unknown';
      }
  }
  
/**
 * 构建测试依赖关系图 - 基于真实文件分析
 */
ImprovedTestRunner.prototype.buildTestDependencyGraph = function(testFiles) {
    console.log('🔄 开始构建真实的测试依赖关系图...');
    console.log(`📁 处理 ${testFiles.length} 个测试文件`);
    
    let dependencyCount = 0;
    const validTestFiles = testFiles.filter(file =>
      !file.includes('testA.js') &&
      !file.includes('testB.js') &&
      !file.includes('testC.js') &&
      !file.includes('testD.js') &&
      (file.includes('.test.js') || file.includes('.spec.js') || file.includes('.test.ts') || file.includes('.spec.ts'))
    );
    
    if (validTestFiles.length === 0) {
      console.log('⚠️ 没有发现真实的测试文件，跳过依赖图构建');
      return;
    }
    
    validTestFiles.forEach(testFile => {
      // 基于真实文件路径和目录结构推断依赖关系
      const dependencies = this.analyzeRealTestDependencies(testFile, validTestFiles);
      
      if (dependencies.length > 0) {
        console.log(`📊 测试文件 ${path.basename(testFile)} 依赖于: ${dependencies.map(dep => path.basename(dep)).join(', ')}`);
        this.stateManager.addTestDependency(testFile, dependencies);
        dependencyCount += dependencies.length;
      }
    });
    
    console.log(`✅ 真实的测试依赖关系图构建完成: ${dependencyCount} 个依赖关系`);
    
    // 记录依赖图统计
    this.stateManager.recordPerformanceMetric('test_dependency_count', dependencyCount, {
      testFileCount: validTestFiles.length,
      realDependencies: true
    });
  }
  
/**
 * 基于真实文件分析测试依赖关系
 */
ImprovedTestRunner.prototype.analyzeRealTestDependencies = function(testFile, allTestFiles) {
    const dependencies = [];
    const fileName = path.basename(testFile);
    const dirName = path.dirname(testFile);
    
    // 只处理真实的测试文件，避免模拟数据
    if (fileName.includes('testA.js') || fileName.includes('testB.js') ||
        fileName.includes('testC.js') || fileName.includes('testD.js')) {
      return dependencies;
    }
    
    // 基于目录结构的真实依赖推断
    if (dirName.includes('integration') || fileName.includes('integration')) {
      // 集成测试可能依赖于同目录下的其他集成测试
      const integrationTests = allTestFiles.filter(file =>
        (file.includes('integration') || path.dirname(file).includes('integration')) &&
        file !== testFile
      );
      dependencies.push(...integrationTests.slice(0, 2));
    }
    
    // 基于模块名称的真实依赖推断
    const moduleName = this.extractModuleName(testFile);
    if (moduleName) {
      // 查找同模块的其他测试文件
      const sameModuleTests = allTestFiles.filter(file =>
        this.extractModuleName(file) === moduleName && file !== testFile
      );
      dependencies.push(...sameModuleTests);
    }
    
    // 基于文件层次的依赖推断
    const parentDir = path.dirname(dirName);
    if (parentDir && parentDir !== '.') {
      // 查找父目录下的其他测试文件
      const parentDirTests = allTestFiles.filter(file =>
        path.dirname(path.dirname(file)) === parentDir && file !== testFile
      );
      dependencies.push(...parentDirTests.slice(0, 1));
    }
    
    // 去重并限制依赖数量，避免过于复杂
    return [...new Set(dependencies)].slice(0, 3);
  }

module.exports = { ImprovedTestRunner, StateManager, ParameterValidator, SecureCommandExecutor };