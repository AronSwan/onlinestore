const { spawn } = require('child_process');
const crypto = require('crypto');

/**
 * 安全命令执行器
 */
class SecureCommandExecutor {
  constructor() {
    this.executionHistory = [];
    this.rateLimiter = new Map();
  }

  async executeCommand(command, args = [], options = {}) {
    const startTime = Date.now();
    const commandId = crypto.randomUUID();
    
    // 速率限制检查
    if (!this.checkRateLimit(command)) {
      throw new Error(`命令 ${command} 执行频率过高`);
    }
    
    // 安全检查
    this.validateCommand(command, args);
    
    try {
      const result = await this.runCommand(command, args, {
        timeout: options.timeout || 60000,
        cwd: options.cwd || __dirname,
        env: { ...process.env, ...options.env },
        maxBuffer: 10 * 1024 * 1024 // 10MB
      });
      
      const duration = Date.now() - startTime;
      
      this.executionHistory.push({
        commandId,
        command,
        args,
        success: true,
        duration,
        timestamp: Date.now()
      });
      
      return { success: true, output: result, duration, commandId };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.executionHistory.push({
        commandId,
        command,
        args,
        success: false,
        error: error.message,
        duration,
        timestamp: Date.now()
      });
      
      return { success: false, error: error.message, duration, commandId };
    }
  }

  validateCommand(command, args) {
    // 危险命令黑名单
    const dangerousCommands = [
      'rm', 'del', 'format', 'fdisk', 'mkfs', 'dd',
      'shutdown', 'reboot', 'halt', 'poweroff',
      'chmod', 'chown', 'su', 'sudo'
    ];
    
    if (dangerousCommands.includes(command)) {
      throw new Error(`危险命令被阻止: ${command}`);
    }
    
    // 参数安全检查
    const dangerousPatterns = [
      /[;&|`$(){}[\]]/,
      /\.\.\//,
      /\/etc\/passwd/,
      /\/dev\/null/,
      />\s*\/dev/
    ];
    
    args.forEach(arg => {
      if (typeof arg === 'string') {
        dangerousPatterns.forEach(pattern => {
          if (pattern.test(arg)) {
            throw new Error(`危险参数模式: ${pattern}`);
          }
        });
      }
    });
  }

  checkRateLimit(command) {
    const now = Date.now();
    const key = `cmd_${command}`;
    const limit = 10; // 每分钟最多10次
    const window = 60000; // 1分钟窗口
    
    if (!this.rateLimiter.has(key)) {
      this.rateLimiter.set(key, []);
    }
    
    const timestamps = this.rateLimiter.get(key);
    
    // 清理过期记录
    while (timestamps.length > 0 && now - timestamps[0] > window) {
      timestamps.shift();
    }
    
    if (timestamps.length >= limit) {
      return false;
    }
    
    timestamps.push(now);
    return true;
  }

  runCommand(command, args, options) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        ...options,
        stdio: 'pipe'
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      const timeout = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error('命令执行超时'));
      }, options.timeout);
      
      child.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`命令执行失败 (退出代码: ${code}): ${stderr}`));
        }
      });
      
      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }
}

module.exports = SecureCommandExecutor;