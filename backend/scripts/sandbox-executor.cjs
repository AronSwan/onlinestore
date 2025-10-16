#!/usr/bin/env node

/**
 * 沙箱执行器 - 提供安全的命令执行环境
 * 实现资源限制、权限控制和隔离机制
 */

const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { StandardError, ErrorTypes, ErrorSeverity } = require('./error-handler.cjs');

// 沙箱配置
const SandboxConfig = {
  // 资源限制
  resourceLimits: {
    maxMemoryMB: 256,
    maxCpuTime: 30, // 秒
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxOpenFiles: 100,
    maxProcesses: 10
  },
  
  // 安全限制
  securityLimits: {
    allowedPaths: [
      '/tmp',
      '/var/tmp',
      process.cwd(),
      path.join(os.tmpdir(), 'test-runner-sandbox')
    ],
    blockedCommands: [
      'rm', 'rmdir', 'del', 'format', 'fdisk',
      'sudo', 'su', 'passwd', 'chmod', 'chown',
      'iptables', 'netstat', 'ss', 'lsof',
      'kill', 'killall', 'pkill', 'systemctl',
      'service', 'init', 'shutdown', 'reboot',
      'mount', 'umount', 'dd', 'nc', 'ncat'
    ],
    blockedPatterns: [
      /[;&|`$]/,          // 防止命令注入（移除括号，允许在Node.js中使用）
      /\.\.\//,           // 防止路径遍历
      />\/dev\/(sd|hd)/,  // 防止磁盘操作
      /\/etc\//,          // 防止系统配置修改
      /\/proc\//,         // 防止进程信息访问
      /\/sys\//           // 防止系统信息访问
    ]
  },
  
  // 网络限制
  networkLimits: {
    allowNetwork: false,
    allowedHosts: [],
    allowedPorts: [],
    blockOutgoing: true
  }
};

class SandboxExecutor {
  constructor(options = {}) {
    this.options = {
      ...SandboxConfig,
      ...options,
      resourceLimits: {
        ...SandboxConfig.resourceLimits,
        ...options.resourceLimits
      },
      securityLimits: {
        ...SandboxConfig.securityLimits,
        ...options.securityLimits
      },
      networkLimits: {
        ...SandboxConfig.networkLimits,
        ...options.networkLimits
      }
    };
    
    this.sandboxDir = this.createSandboxDirectory();
    this.activeProcesses = new Set();
    this.processStats = {
      totalExecuted: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      securityViolations: 0,
      resourceViolations: 0
    };
  }
  
  /**
   * 创建沙箱目录
   */
  createSandboxDirectory() {
    const sandboxDir = path.join(os.tmpdir(), `test-runner-sandbox-${Date.now()}-${Math.random().toString(36).substring(2)}`);
    
    try {
      fs.mkdirSync(sandboxDir, { recursive: true, mode: 0o700 });
      
      // 创建沙箱子目录
      const subdirs = ['tmp', 'work', 'output'];
      subdirs.forEach(dir => {
        fs.mkdirSync(path.join(sandboxDir, dir), { recursive: true, mode: 0o700 });
      });
      
      return sandboxDir;
    } catch (error) {
      throw new StandardError(
        `Failed to create sandbox directory: ${error.message}`,
        ErrorTypes.SYSTEM_ERROR,
        ErrorSeverity.HIGH
      );
    }
  }
  
  /**
   * 验证命令安全性
   */
  validateCommand(command, args = []) {
    const fullCommand = `${command} ${args.join(' ')}`;
    
    // 检查被阻止的命令
    if (this.options.securityLimits.blockedCommands.includes(command)) {
      throw new StandardError(
        `Command "${command}" is not allowed in sandbox`,
        ErrorTypes.SECURITY_VIOLATION,
        ErrorSeverity.CRITICAL,
        { command, reason: 'blocked-command' }
      );
    }
    
    // 检查危险模式
    for (const pattern of this.options.securityLimits.blockedPatterns) {
      if (pattern.test(fullCommand)) {
        throw new StandardError(
          `Command contains dangerous pattern: ${pattern}`,
          ErrorTypes.SECURITY_VIOLATION,
          ErrorSeverity.CRITICAL,
          { command, pattern: pattern.toString() }
        );
      }
    }
    
    // 检查参数中的路径
    for (const arg of args) {
      if (this.containsUnsafePath(arg)) {
        throw new StandardError(
          `Argument contains unsafe path: ${arg}`,
          ErrorTypes.SECURITY_VIOLATION,
          ErrorSeverity.HIGH,
          { argument: arg }
        );
      }
    }
    
    return true;
  }
  
  /**
   * 检查是否包含不安全的路径
   */
  containsUnsafePath(arg) {
    // 检查路径遍历
    if (arg.includes('../') || arg.includes('..\\')) {
      return true;
    }
    
    // 检查绝对路径是否在允许范围内
    if (path.isAbsolute(arg)) {
      const isAllowed = this.options.securityLimits.allowedPaths.some(allowedPath =>
        arg.startsWith(allowedPath)
      );
      return !isAllowed;
    }
    
    return false;
  }
  
  /**
   * 执行沙箱命令
   */
  async execute(command, args = [], options = {}) {
    try {
      // 验证命令安全性
      this.validateCommand(command, args);
      
      // 准备执行环境
      const execOptions = this.prepareExecutionEnvironment(options);
      
      // 执行命令
      const result = await this.executeInSandbox(command, args, execOptions);
      
      // 更新统计信息
      this.processStats.totalExecuted++;
      if (result.success) {
        this.processStats.successfulExecutions++;
      } else {
        this.processStats.failedExecutions++;
      }
      
      return result;
      
    } catch (error) {
      this.processStats.totalExecuted++;
      
      if (error.type === ErrorTypes.SECURITY_VIOLATION) {
        this.processStats.securityViolations++;
      }
      
      throw error;
    }
  }
  
  /**
   * 准备执行环境
   */
  prepareExecutionEnvironment(options = {}) {
    const execOptions = {
      cwd: path.join(this.sandboxDir, 'work'),
      env: this.createSandboxEnvironment(),
      uid: options.uid,
      gid: options.gid,
      // 资源限制
      maxBuffer: this.options.resourceLimits.maxFileSize,
      timeout: this.options.resourceLimits.maxCpuTime * 1000,
      // 安全选项
      detached: false,
      windowsHide: true
    };
    
    // 在支持的平台上设置额外的安全选项
    if (process.platform !== 'win32') {
      execOptions.uid = options.uid || process.getuid();
      execOptions.gid = options.gid || process.getgid();
      
      // 设置进程组
      execOptions.detached = true;
    }
    
    return execOptions;
  }
  
  /**
   * 创建沙箱环境变量
   */
  createSandboxEnvironment() {
    const env = { ...process.env };
    
    // 限制环境变量
    const allowedEnvVars = [
      'PATH', 'HOME', 'USER', 'SHELL', 'LANG', 'LC_ALL',
      'NODE_ENV', 'NODE_PATH', 'DEBUG'
    ];
    
    const sandboxEnv = {};
    allowedEnvVars.forEach(key => {
      if (env[key]) {
        sandboxEnv[key] = env[key];
      }
    });
    
    // 添加沙箱特定环境变量
    sandboxEnv.SANDBOX = 'true';
    sandboxEnv.SANDBOX_DIR = this.sandboxDir;
    sandboxEnv.TMPDIR = path.join(this.sandboxDir, 'tmp');
    sandboxEnv.HOME = path.join(this.sandboxDir, 'work');
    
    return sandboxEnv;
  }
  
  /**
   * 在沙箱中执行命令
   */
  async executeInSandbox(command, args, execOptions) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      // 在Windows上处理.cmd/.bat文件
      const isWin = process.platform === 'win32';
      const resolvedCommand = (isWin && command === 'npx') ? 'npx.cmd' : command;
      
      if (isWin && /\.cmd$|\.bat$/i.test(resolvedCommand)) {
        execOptions.shell = true;
      }
      
      const child = spawn(resolvedCommand, args, execOptions);
      this.activeProcesses.add(child.pid);
      
      let stdout = '';
      let stderr = '';
      
      // 设置输出处理
      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
          // 限制输出大小
          if (stdout.length > this.options.resourceLimits.maxFileSize) {
            child.kill('SIGTERM');
          }
        });
      }
      
      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
          // 限制错误输出大小
          if (stderr.length > this.options.resourceLimits.maxFileSize / 10) {
            child.kill('SIGTERM');
          }
        });
      }
      
      // 资源监控
      const resourceMonitor = setInterval(() => {
        this.checkResourceUsage(child);
      }, 1000);
      
      // 处理进程退出
      child.on('close', (code, signal) => {
        clearInterval(resourceMonitor);
        this.activeProcesses.delete(child.pid);
        
        const duration = Date.now() - startTime;
        
        if (signal === 'SIGTERM' || signal === 'SIGKILL') {
          reject(new StandardError(
            `Process terminated due to resource limits or security violation`,
            ErrorTypes.RESOURCE_EXHAUSTED,
            ErrorSeverity.HIGH,
            { signal, duration }
          ));
          return;
        }
        
        resolve({
          code,
          stdout,
          stderr,
          duration,
          success: code === 0,
          pid: child.pid
        });
      });
      
      // 处理错误
      child.on('error', (error) => {
        clearInterval(resourceMonitor);
        this.activeProcesses.delete(child.pid);
        
        reject(new StandardError(
          `Process execution failed: ${error.message}`,
          ErrorTypes.COMMAND_FAILED,
          ErrorSeverity.HIGH,
          { originalError: error }
        ));
      });
      
      // 设置超时
      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 5000);
      }, execOptions.timeout);
      
      child.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }
  
  /**
   * 检查资源使用情况
   */
  checkResourceUsage(child) {
    if (!child || child.killed) return;
    
    try {
      // 在支持的平台上检查进程资源使用
      if (process.platform !== 'win32') {
        const stats = fs.statSync(`/proc/${child.pid}/stat`);
        // 这里可以添加更详细的资源检查逻辑
      }
    } catch (error) {
      // 无法获取进程信息，可能进程已退出
    }
  }
  
  /**
   * 清理沙箱环境
   */
  async cleanup() {
    // 终止所有活跃进程
    for (const pid of this.activeProcesses) {
      try {
        process.kill(pid, 'SIGTERM');
        setTimeout(() => {
          try {
            process.kill(pid, 'SIGKILL');
          } catch (_) {}
        }, 5000);
      } catch (_) {}
    }
    
    // 等待进程终止
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 清理沙箱目录
    try {
      fs.rmSync(this.sandboxDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup sandbox directory: ${error.message}`);
    }
  }
  
  /**
   * 获取沙箱统计信息
   */
  getStats() {
    return {
      ...this.processStats,
      activeProcesses: this.activeProcesses.size,
      sandboxDir: this.sandboxDir,
      config: this.options
    };
  }
  
  /**
   * 重置统计信息
   */
  resetStats() {
    this.processStats = {
      totalExecuted: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      securityViolations: 0,
      resourceViolations: 0
    };
  }
}

module.exports = {
  SandboxExecutor,
  SandboxConfig
};