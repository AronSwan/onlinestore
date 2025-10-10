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

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 版本信息
const VERSION = '3.3.0';
const SCRIPT_NAME = 'test-runner-secure-improved';

// 配置常量 - 基于测试结果优化
const CONFIG = {
  // 命令执行频率限制 - 放宽限制
  COMMAND_RATE_LIMIT: {
    maxExecutions: 50,        // 增加到50次
    timeWindow: 10000,        // 10秒窗口
    cooldownPeriod: 2000      // 冷却期减少到2秒
  },
  
  // 参数验证配置 - 增强边界处理
  VALIDATION: {
    maxArgLength: 2000,       // 增加参数长度限制
    maxArgs: 50,              // 增加参数数量限制
    allowedChars: /^[a-zA-Z0-9\-_.\/\\:=, ]*$/, // 更宽松的字符集
    dangerousPatterns: [
      /[;&|`$(){}[\]]/,       // 危险字符
      /\.\.\//,               // 路径遍历
      /<script/i,             // XSS
      /\x00/,                 // NULL字节
      /\u0000-\u001f/,        // 控制字符
      /drop\s+table/i,        // SQL注入
      /rm\s+-rf/i,            // 危险命令
      /del\s+\/[sq]/i         // Windows危险命令
    ]
  },
  
  // 性能配置 - 优化资源使用
  PERFORMANCE: {
    maxMemoryMB: 512,         // 内存限制
    maxExecutionTime: 30000,  // 执行时间限制
    gcInterval: 5000,         // GC间隔
    monitorInterval: 1000     // 监控间隔
  },
  
  // 并发配置 - 改进并发处理
  CONCURRENCY: {
    maxConcurrent: Math.min(os.cpus().length, 8),
    lockTimeout: 10000,       // 锁超时
    retryAttempts: 3,         // 重试次数
    retryDelay: 1000          // 重试延迟
  }
};

// 全局状态管理
class StateManager {
  constructor() {
    this.commandHistory = new Map();
    this.activeProcesses = new Set();
    this.resourceMonitor = null;
    this.processLocks = new Map();
    this.errorRecovery = new ErrorRecoveryManager();
  }
  
  // 改进的命令频率检查
  checkCommandRate(command) {
    const now = Date.now();
    const key = command.split(' ')[0]; // 使用命令名作为key
    
    if (!this.commandHistory.has(key)) {
      this.commandHistory.set(key, []);
    }
    
    const history = this.commandHistory.get(key);
    
    // 清理过期记录
    const validHistory = history.filter(
      time => now - time < CONFIG.COMMAND_RATE_LIMIT.timeWindow
    );
    
    // 检查频率限制
    if (validHistory.length >= CONFIG.COMMAND_RATE_LIMIT.maxExecutions) {
      const oldestExecution = Math.min(...validHistory);
      const waitTime = CONFIG.COMMAND_RATE_LIMIT.timeWindow - (now - oldestExecution);
      
      if (waitTime > 0) {
        console.warn(`⚠️ 命令执行频率限制，等待 ${Math.ceil(waitTime/1000)} 秒`);
        return { allowed: false, waitTime };
      }
    }
    
    // 记录本次执行
    validHistory.push(now);
    this.commandHistory.set(key, validHistory);
    
    return { allowed: true, waitTime: 0 };
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
    
    // 设置锁超时
    setTimeout(() => {
      this.releaseLock(lockId);
    }, CONFIG.CONCURRENCY.lockTimeout);
    
    return true;
  }
  
  releaseLock(lockId) {
    return this.processLocks.delete(lockId);
  }
  
  // 资源监控
  startResourceMonitoring() {
    if (this.resourceMonitor) return;
    
    this.resourceMonitor = setInterval(() => {
      const memUsage = process.memoryUsage();
      const memMB = memUsage.heapUsed / 1024 / 1024;
      
      if (memMB > CONFIG.PERFORMANCE.maxMemoryMB) {
        console.warn(`⚠️ 内存使用过高: ${memMB.toFixed(2)}MB`);
        
        // 触发垃圾回收
        if (global.gc) {
          global.gc();
        }
        
        // 清理历史记录
        this.cleanupHistory();
      }
    }, CONFIG.PERFORMANCE.monitorInterval);
  }
  
  stopResourceMonitoring() {
    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor);
      this.resourceMonitor = null;
    }
  }
  
  cleanupHistory() {
    const now = Date.now();
    for (const [key, history] of this.commandHistory.entries()) {
      const validHistory = history.filter(
        time => now - time < CONFIG.COMMAND_RATE_LIMIT.timeWindow * 2
      );
      
      if (validHistory.length === 0) {
        this.commandHistory.delete(key);
      } else {
        this.commandHistory.set(key, validHistory);
      }
    }
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
      maxRetries: CONFIG.CONCURRENCY.retryAttempts,
      retryDelay: CONFIG.CONCURRENCY.retryDelay,
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
    
    if (args.length > CONFIG.VALIDATION.maxArgs) {
      throw new Error(`参数数量超出限制: ${args.length} > ${CONFIG.VALIDATION.maxArgs}`);
    }
    
    // 逐个验证参数
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      // 类型检查
      if (typeof arg !== 'string') {
        throw new Error(`参数 ${i} 必须是字符串: ${typeof arg}`);
      }
      
      // 长度检查
      if (arg.length > CONFIG.VALIDATION.maxArgLength) {
        throw new Error(`参数 ${i} 长度超出限制: ${arg.length} > ${CONFIG.VALIDATION.maxArgLength}`);
      }
      
      // 危险模式检查
      for (const pattern of CONFIG.VALIDATION.dangerousPatterns) {
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
  }
  
  async executeCommand(command, args = [], options = {}) {
    const fullCommand = `${command} ${args.join(' ')}`;
    
    try {
      // 参数验证
      ParameterValidator.validate([command, ...args]);
      
      // 频率检查（改进版）
      const rateCheck = this.stateManager.checkCommandRate(fullCommand);
      if (!rateCheck.allowed) {
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
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const child = spawn(command, args, {
        stdio: options.silent ? 'pipe' : 'inherit',
        timeout: CONFIG.PERFORMANCE.maxExecutionTime,
        ...options.spawnOptions
      });
      
      this.stateManager.activeProcesses.add(child.pid);
      
      let stdout = '';
      let stderr = '';
      
      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }
      
      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }
      
      child.on('close', (code) => {
        this.stateManager.activeProcesses.delete(child.pid);
        const duration = Date.now() - startTime;
        
        if (code === 0) {
          resolve({
            code,
            stdout,
            stderr,
            duration,
            success: true
          });
        } else {
          reject(new Error(`命令执行失败 (退出码: ${code}): ${stderr || '未知错误'}`));
        }
      });
      
      child.on('error', (error) => {
        this.stateManager.activeProcesses.delete(child.pid);
        reject(error);
      });
      
      // 超时处理
      setTimeout(() => {
        if (this.stateManager.activeProcesses.has(child.pid)) {
          child.kill('SIGTERM');
          setTimeout(() => {
            if (this.stateManager.activeProcesses.has(child.pid)) {
              child.kill('SIGKILL');
            }
          }, 5000);
          reject(new Error('命令执行超时'));
        }
      }, CONFIG.PERFORMANCE.maxExecutionTime);
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
    this.setupSignalHandlers();
  }
  
  setupSignalHandlers() {
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('uncaughtException', (error) => {
      console.error('未捕获的异常:', error);
      this.gracefulShutdown('EXCEPTION');
    });
  }
  
  async gracefulShutdown(signal) {
    console.log(`\n🛑 收到 ${signal} 信号，正在优雅关闭...`);
    
    // 停止资源监控
    this.stateManager.stopResourceMonitoring();
    
    // 等待活跃进程完成
    if (this.stateManager.activeProcesses.size > 0) {
      console.log(`等待 ${this.stateManager.activeProcesses.size} 个进程完成...`);
      
      const timeout = setTimeout(() => {
        console.log('强制终止剩余进程...');
        process.exit(1);
      }, 10000);
      
      while (this.stateManager.activeProcesses.size > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      clearTimeout(timeout);
    }
    
    // 清理资源
    await this.stateManager.errorRecovery.performCleanup();
    
    console.log('✅ 优雅关闭完成');
    process.exit(0);
  }
  
  async run(args) {
    try {
      // 启动资源监控
      this.stateManager.startResourceMonitoring();
      
      // 解析参数
      const parsedArgs = this.parseArguments(args);
      
      // 显示启动信息
      this.showStartupInfo(parsedArgs);
      
      // 执行测试
      const result = await this.executeTests(parsedArgs);
      
      // 显示结果
      this.showResults(result);
      
      return result;
      
    } catch (error) {
      console.error('❌ 测试运行失败:', error.message);
      
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      
      process.exit(1);
    } finally {
      this.stateManager.stopResourceMonitoring();
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
      timeout: 30000,
      maxWorkers: CONFIG.CONCURRENCY.maxConcurrent,
      testPathPattern: null,
      testNamePattern: null,
      config: null,
      help: false,
      version: false
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
      } else if (arg.startsWith('--timeout=')) {
        parsed.timeout = parseInt(arg.split('=')[1]) || parsed.timeout;
      } else if (arg.startsWith('--maxWorkers=')) {
        parsed.maxWorkers = parseInt(arg.split('=')[1]) || parsed.maxWorkers;
      } else if (arg.startsWith('--testPathPattern=')) {
        parsed.testPathPattern = arg.split('=')[1];
      } else if (arg.startsWith('--testNamePattern=')) {
        parsed.testNamePattern = arg.split('=')[1];
      } else if (arg.startsWith('--config=')) {
        parsed.config = arg.split('=')[1];
      } else if (arg === 'unit' || arg === 'integration' || arg === 'e2e') {
        parsed.testType = arg;
      }
    }
    
    return parsed;
  }
  
  showStartupInfo(args) {
    if (args.help) {
      this.showHelp();
      return;
    }
    
    if (args.version) {
      console.log(`${SCRIPT_NAME} v${VERSION}`);
      return;
    }
    
    if (!args.silent) {
      console.log(`🧪 ${SCRIPT_NAME} v${VERSION} 启动中...`);
      console.log(`📊 系统信息: ${os.cpus().length} 核心, ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)}GB 内存`);
      console.log(`⚙️ 配置: 测试类型=${args.testType}, 并发=${args.maxWorkers}, 超时=${args.timeout}ms`);
    }
  }
  
  async executeTests(args) {
    if (args.help || args.version) {
      return { success: true };
    }
    
    // 构建Jest命令
    const jestArgs = this.buildJestArgs(args);
    
    // 执行测试
    const result = await this.executor.executeCommand('npx', ['jest', ...jestArgs], {
      silent: args.silent
    });
    
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
    
    if (args.testPathPattern) {
      jestArgs.push('--testPathPattern', args.testPathPattern);
    }
    
    if (args.testNamePattern) {
      jestArgs.push('--testNamePattern', args.testNamePattern);
    }
    
    if (args.config) {
      jestArgs.push('--config', args.config);
    }
    
    jestArgs.push('--maxWorkers', args.maxWorkers.toString());
    jestArgs.push('--testTimeout', args.timeout.toString());
    
    return jestArgs;
  }
  
  showResults(result) {
    if (result.success) {
      console.log('✅ 测试执行完成');
    } else {
      console.log('❌ 测试执行失败');
    }
    
    if (result.duration) {
      console.log(`⏱️ 执行时间: ${result.duration}ms`);
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

选项:
  -h, --help              显示帮助信息
  -v, --version           显示版本信息
  -c, --coverage          启用代码覆盖率
  --verbose               详细输出
  --silent                静默模式
  --watch                 监视模式
  --timeout=<ms>          测试超时时间 (默认: 30000)
  --maxWorkers=<num>      最大工作线程数 (默认: CPU核心数)
  --testPathPattern=<pattern>  测试文件路径模式
  --testNamePattern=<pattern>  测试名称模式
  --config=<path>         Jest配置文件路径

测试类型:
  unit                    单元测试 (默认)
  integration             集成测试
  e2e                     端到端测试

示例:
  node ${SCRIPT_NAME}.cjs                    # 运行单元测试
  node ${SCRIPT_NAME}.cjs --coverage         # 运行带覆盖率的测试
  node ${SCRIPT_NAME}.cjs integration        # 运行集成测试
  node ${SCRIPT_NAME}.cjs --testPathPattern="auth.*"  # 运行认证相关测试
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

module.exports = { ImprovedTestRunner, StateManager, ParameterValidator, SecureCommandExecutor };