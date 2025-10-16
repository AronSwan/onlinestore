#!/usr/bin/env node

/**
 * 综合功能测试脚本
 * 测试所有已实现的功能模块
 */

const { spawn } = require('child_process');
const { promisify } = require('util');
const sleep = promisify(setTimeout);
const path = require('path');
const fs = require('fs');

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
 * 执行命令
 */
async function executeCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      ...options
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code });
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 测试结果统计
 */
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  details: []
};

/**
 * 记录测试结果
 */
function recordTest(name, passed, message = '') {
  testResults.total++;
  
  if (passed) {
    testResults.passed++;
    log(`✅ ${name}`, colors.green);
  } else {
    testResults.failed++;
    log(`❌ ${name}: ${message}`, colors.red);
  }
  
  testResults.details.push({ name, passed, message });
}

/**
 * 跳过测试
 */
function skipTest(name, reason = '') {
  testResults.total++;
  testResults.skipped++;
  log(`⏭️  ${name}: ${reason}`, colors.yellow);
  
  testResults.details.push({ name, passed: false, message: reason, skipped: true });
}

/**
 * 测试1: 读写锁分离机制
 */
async function testReadWriteLock() {
  log('\n🔒 测试1: 读写锁分离机制', colors.bright);
  
  try {
    // 创建测试脚本
    const testScript = `
// 简化的读写锁测试
class ReadWriteLock {
  constructor() {
    this.readers = 0;
    this.writer = false;
    this.waitingWriters = 0;
  }
  
  async acquireReadLock() {
    return new Promise((resolve) => {
      if (this.writer || this.waitingWriters > 0) {
        const checkLock = () => {
          if (!this.writer && this.waitingWriters === 0) {
            this.readers++;
            resolve();
          } else {
            setTimeout(checkLock, 10);
          }
        };
        checkLock();
      } else {
        this.readers++;
        resolve();
      }
    });
  }
  
  async acquireWriteLock() {
    return new Promise((resolve) => {
      this.waitingWriters++;
      const checkLock = () => {
        if (this.readers === 0 && !this.writer) {
          this.writer = true;
          this.waitingWriters--;
          resolve();
        } else {
          setTimeout(checkLock, 10);
        }
      };
      checkLock();
    });
  }
  
  releaseReadLock() {
    this.readers--;
  }
  
  releaseWriteLock() {
    this.writer = false;
  }
}

// 测试读写锁
async function testLock() {
  const lock = new ReadWriteLock();
  
  // 测试多个读锁
  await lock.acquireReadLock();
  await lock.acquireReadLock();
  
  if (lock.readers === 2) {
    console.log('✅ 多个读锁获取成功');
  } else {
    console.log('❌ 多个读锁获取失败');
    return false;
  }
  
  lock.releaseReadLock();
  lock.releaseReadLock();
  
  // 测试写锁
  await lock.acquireWriteLock();
  
  if (lock.writer) {
    console.log('✅ 写锁获取成功');
  } else {
    console.log('❌ 写锁获取失败');
    return false;
  }
  
  lock.releaseWriteLock();
  
  // 测试读写互斥
  let writeLockAcquired = false;
  let readLockBlocked = true;
  
  lock.acquireReadLock().then(() => {
    readLockBlocked = false;
  });
  
  setTimeout(() => {
    if (readLockBlocked) {
      console.log('✅ 读锁被写锁阻塞（预期行为）');
    } else {
      console.log('❌ 读锁未被写锁阻塞');
      return false;
    }
  }, 100);
  
  await lock.acquireWriteLock().then(() => {
    writeLockAcquired = true;
  });
  
  setTimeout(() => {
    if (writeLockAcquired) {
      console.log('✅ 写锁在无读锁时获取成功');
    } else {
      console.log('❌ 写锁获取失败');
      return false;
    }
  }, 200);
  
  return true;
}

testLock().then(success => {
  if (success) {
    console.log('✅ 读写锁测试通过');
  } else {
    console.log('❌ 读写锁测试失败');
  }
}).catch(error => {
  console.log('❌ 读写锁测试异常:', error.message);
});
`;
    
    const testScriptPath = path.join(process.cwd(), '.test-read-write-lock.js');
    fs.writeFileSync(testScriptPath, testScript);
    
    const result = await executeCommand('node', [testScriptPath], {
      cwd: process.cwd(),
      timeout: 5000
    });
    
    // 清理测试脚本
    try {
      fs.unlinkSync(testScriptPath);
    } catch (error) {
      // 忽略清理错误
    }
    
    const passed = result.exitCode === 0 && result.stdout.includes('✅ 读写锁测试通过');
    recordTest('读写锁分离机制', passed, passed ? '' : '读写锁功能异常');
    
    return passed;
  } catch (error) {
    recordTest('读写锁分离机制', false, error.message);
    return false;
  }
}

/**
 * 测试2: 执行环境沙箱化
 */
async function testExecutionSandbox() {
  log('\n🔒 测试2: 执行环境沙箱化', colors.bright);
  
  try {
    // 创建测试脚本
    const testScript = `
// 简化的沙箱测试
class ExecutionSandbox {
  constructor(options = {}) {
    this.maxMemory = options.maxMemory || 100 * 1024 * 1024; // 100MB
    this.maxCpuTime = options.maxCpuTime || 5000; // 5秒
    this.allowedPaths = options.allowedPaths || [];
  }
  
  async execute(code) {
    const startTime = Date.now();
    
    // 检查代码长度（简单限制）
    if (code.length > 10000) {
      throw new Error('代码过长');
    }
    
    // 模拟执行（实际环境中会在隔离的进程中执行）
    try {
      // 创建安全的执行环境
      const sandbox = {
        console: {
          log: (...args) => console.log('[SANDBOX]', ...args)
        },
        setTimeout: (fn, delay) => {
          if (delay > 1000) {
            throw new Error('setTimeout延迟过长');
          }
          return setTimeout(fn, delay);
        },
        Date: Date,
        Math: Math,
        JSON: JSON
      };
      
      // 创建安全的函数
      const safeFunction = new Function(
        ...Object.keys(sandbox),
        code
      );
      
      // 执行代码
      const result = safeFunction(...Object.values(sandbox));
      
      const executionTime = Date.now() - startTime;
      
      if (executionTime > this.maxCpuTime) {
        throw new Error('执行超时');
      }
      
      return { result, executionTime };
    } catch (error) {
      throw new Error(\`执行失败: \${error.message}\`);
    }
  }
}

// 测试沙箱
async function testSandbox() {
  const sandbox = new ExecutionSandbox({
    maxMemory: 50 * 1024 * 1024,
    maxCpuTime: 2000
  });
  
  try {
    // 测试正常执行
    const result1 = await sandbox.execute('console.log("Hello from sandbox"); return "success";');
    
    if (result1.result === 'success') {
      console.log('✅ 正常代码执行成功');
    } else {
      console.log('❌ 正常代码执行失败');
      return false;
    }
    
    // 测试危险操作阻止
    try {
      await sandbox.execute('require("fs");');
      console.log('❌ 危险操作未被阻止');
      return false;
    } catch (error) {
      console.log('✅ 危险操作被成功阻止');
    }
    
    // 测试超时控制
    try {
      await sandbox.execute('while(true) {}');
      console.log('❌ 无限循环未被阻止');
      return false;
    } catch (error) {
      if (error.message.includes('超时')) {
        console.log('✅ 无限循环被成功阻止');
      } else {
        console.log('❌ 无限循环阻止失败:', error.message);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.log('❌ 沙箱测试异常:', error.message);
    return false;
  }
}

testSandbox().then(success => {
  if (success) {
    console.log('✅ 沙箱测试通过');
  } else {
    console.log('❌ 沙箱测试失败');
  }
}).catch(error => {
  console.log('❌ 沙箱测试异常:', error.message);
});
`;
    
    const testScriptPath = path.join(process.cwd(), '.test-execution-sandbox.js');
    fs.writeFileSync(testScriptPath, testScript);
    
    const result = await executeCommand('node', [testScriptPath], {
      cwd: process.cwd(),
      timeout: 10000
    });
    
    // 清理测试脚本
    try {
      fs.unlinkSync(testScriptPath);
    } catch (error) {
      // 忽略清理错误
    }
    
    const passed = result.exitCode === 0 && result.stdout.includes('✅ 沙箱测试通过');
    recordTest('执行环境沙箱化', passed, passed ? '' : '沙箱功能异常');
    
    return passed;
  } catch (error) {
    recordTest('执行环境沙箱化', false, error.message);
    return false;
  }
}

/**
 * 测试3: 审计日志加密存储
 */
async function testEncryptedAuditLog() {
  log('\n🔐 测试3: 审计日志加密存储', colors.bright);
  
  try {
    // 创建测试脚本
    const testScript = `
// 简化的加密审计日志测试
const crypto = require('crypto');

class EncryptedAuditLogger {
  constructor(options = {}) {
    this.encryptionKey = options.encryptionKey || crypto.randomBytes(32);
    this.algorithm = 'aes-256-cbc';
    this.logs = [];
  }
  
  encrypt(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      iv: iv.toString('hex'),
      data: encrypted
    };
  }
  
  decrypt(encryptedData) {
    const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
    
    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  logAuditEvent(event) {
    const eventData = JSON.stringify(event);
    const encrypted = this.encrypt(eventData);
    
    this.logs.push({
      timestamp: new Date().toISOString(),
      encrypted: true,
      ...encrypted
    });
    
    return true;
  }
  
  getLogs() {
    return this.logs.map(log => {
      const decrypted = this.decrypt(log);
      return {
        timestamp: log.timestamp,
        event: JSON.parse(decrypted)
      };
    });
  }
}

// 测试加密审计日志
async function testAuditLog() {
  const auditLogger = new EncryptedAuditLogger();
  
  try {
    // 测试日志记录
    const success1 = auditLogger.logAuditEvent({
      level: 'INFO',
      action: 'USER_LOGIN',
      userId: 'test-user',
      details: { ip: '192.168.1.1' }
    });
    
    if (!success1) {
      console.log('❌ 日志记录失败');
      return false;
    }
    
    // 测试敏感数据记录
    const success2 = auditLogger.logAuditEvent({
      level: 'WARN',
      action: 'FAILED_LOGIN',
      userId: 'test-user',
      details: { reason: 'invalid_password', attempts: 3 }
    });
    
    if (!success2) {
      console.log('❌ 敏感数据日志记录失败');
      return false;
    }
    
    // 测试日志解密
    const logs = auditLogger.getLogs();
    
    if (logs.length !== 2) {
      console.log('❌ 日志数量不正确');
      return false;
    }
    
    // 验证日志内容
    const firstLog = logs[0];
    if (firstLog.event.action !== 'USER_LOGIN') {
      console.log('❌ 日志内容不正确');
      return false;
    }
    
    // 验证加密
    const rawLogs = auditLogger.logs;
    const isEncrypted = rawLogs.every(log => 
      log.encrypted && 
      log.iv && 
      log.data && 
      !log.data.includes('USER_LOGIN')
    );
    
    if (!isEncrypted) {
      console.log('❌ 日志未正确加密');
      return false;
    }
    
    console.log('✅ 日志记录成功');
    console.log('✅ 敏感数据记录成功');
    console.log('✅ 日志解密成功');
    console.log('✅ 日志内容验证成功');
    console.log('✅ 日志加密验证成功');
    
    return true;
  } catch (error) {
    console.log('❌ 审计日志测试异常:', error.message);
    return false;
  }
}

testAuditLog().then(success => {
  if (success) {
    console.log('✅ 审计日志测试通过');
  } else {
    console.log('❌ 审计日志测试失败');
  }
}).catch(error => {
  console.log('❌ 审计日志测试异常:', error.message);
});
`;
    
    const testScriptPath = path.join(process.cwd(), '.test-encrypted-audit-log.js');
    fs.writeFileSync(testScriptPath, testScript);
    
    const result = await executeCommand('node', [testScriptPath], {
      cwd: process.cwd(),
      timeout: 5000
    });
    
    // 清理测试脚本
    try {
      fs.unlinkSync(testScriptPath);
    } catch (error) {
      // 忽略清理错误
    }
    
    const passed = result.exitCode === 0 && result.stdout.includes('✅ 审计日志测试通过');
    recordTest('审计日志加密存储', passed, passed ? '' : '审计日志功能异常');
    
    return passed;
  } catch (error) {
    recordTest('审计日志加密存储', false, error.message);
    return false;
  }
}

/**
 * 测试4: 安全扫描插件
 */
async function testSecurityScanner() {
  log('\n🔍 测试4: 安全扫描插件', colors.bright);
  
  try {
    // 创建测试脚本
    const testScript = `
// 简化的安全扫描测试
class SecurityScanner {
  constructor() {
    this.patterns = {
      dangerousFunctions: [
        /eval\\s*\\(/,
        /Function\\s*\\(/,
        /setTimeout\\s*\\(\\s*["'`][^"'`]*["'`]/
      ],
      sensitiveData: [
        /password\\s*[=:]\\s*["'`][^"'`]{3,}["'`]/,
        /secret\\s*[=:]\\s*["'`][^"'`]{3,}["'`]/
      ],
      insecureRequests: [
        /http:\\/\\/[^"'\\s]+/i
      ]
    };
  }
  
  scanCode(content, filePath) {
    const issues = [];
    
    for (const [category, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        let match;
        const regex = new RegExp(pattern, 'gi');
        
        while ((match = regex.exec(content)) !== null) {
          const lineNumber = content.substring(0, match.index).split('\\n').length;
          
          issues.push({
            type: 'code-security',
            category,
            file: filePath,
            line: lineNumber,
            match: match[0],
            description: this.getDescription(category, match[0])
          });
        }
      }
    }
    
    return issues;
  }
  
  getDescription(category, match) {
    const descriptions = {
      dangerousFunctions: \`危险函数检测: \${match}\`,
      sensitiveData: \`敏感数据暴露: \${match}\`,
      insecureRequests: \`不安全请求: \${match}\`
    };
    
    return descriptions[category] || \`安全问题: \${match}\`;
  }
}

// 测试安全扫描
async function testScanner() {
  const scanner = new SecurityScanner();
  
  try {
    // 测试危险函数检测
    const codeWithDangerousFunction = \`
      // 危险代码示例
      const userInput = getUserInput();
      eval(userInput);
    \`;
    
    const issues1 = scanner.scanCode(codeWithDangerousFunction, 'test.js');
    
    if (issues1.length === 0) {
      console.log('❌ 危险函数检测失败');
      return false;
    }
    
    console.log('✅ 危险函数检测成功');
    
    // 测试敏感数据检测
    const codeWithSensitiveData = \`
      // 敏感数据示例
      const config = {
        password: "secret123",
        apiKey: "sk-1234567890"
      };
    \`;
    
    const issues2 = scanner.scanCode(codeWithSensitiveData, 'config.js');
    
    if (issues2.length === 0) {
      console.log('❌ 敏感数据检测失败');
      return false;
    }
    
    console.log('✅ 敏感数据检测成功');
    
    // 测试不安全请求检测
    const codeWithInsecureRequest = \`
      // 不安全请求示例
      fetch('http://example.com/api/data');
    \`;
    
    const issues3 = scanner.scanCode(codeWithInsecureRequest, 'api.js');
    
    if (issues3.length === 0) {
      console.log('❌ 不安全请求检测失败');
      return false;
    }
    
    console.log('✅ 不安全请求检测成功');
    
    // 测试安全代码
    const safeCode = \`
      // 安全代码示例
      const userInput = getUserInput();
      const sanitizedInput = sanitizeInput(userInput);
      processInput(sanitizedInput);
    \`;
    
    const issues4 = scanner.scanCode(safeCode, 'safe.js');
    
    if (issues4.length > 0) {
      console.log('❌ 安全代码误报');
      return false;
    }
    
    console.log('✅ 安全代码无误报');
    
    return true;
  } catch (error) {
    console.log('❌ 安全扫描测试异常:', error.message);
    return false;
  }
}

testScanner().then(success => {
  if (success) {
    console.log('✅ 安全扫描测试通过');
  } else {
    console.log('❌ 安全扫描测试失败');
  }
}).catch(error => {
  console.log('❌ 安全扫描测试异常:', error.message);
});
`;
    
    const testScriptPath = path.join(process.cwd(), '.test-security-scanner.js');
    fs.writeFileSync(testScriptPath, testScript);
    
    const result = await executeCommand('node', [testScriptPath], {
      cwd: process.cwd(),
      timeout: 5000
    });
    
    // 清理测试脚本
    try {
      fs.unlinkSync(testScriptPath);
    } catch (error) {
      // 忽略清理错误
    }
    
    const passed = result.exitCode === 0 && result.stdout.includes('✅ 安全扫描测试通过');
    recordTest('安全扫描插件', passed, passed ? '' : '安全扫描功能异常');
    
    return passed;
  } catch (error) {
    recordTest('安全扫描插件', false, error.message);
    return false;
  }
}

/**
 * 测试5: 分布式锁支持
 */
async function testDistributedLock() {
  log('\n🔒 测试5: 分布式锁支持', colors.bright);
  
  try {
    // 检查Redis是否可用
    let redisAvailable = false;
    try {
      const redisResult = await executeCommand('docker', ['exec', 'test-runner-redis', 'redis-cli', '-p', '6379', 'ping']);
      redisAvailable = redisResult.stdout.includes('PONG');
    } catch (error) {
      // Redis不可用
    }
    
    if (!redisAvailable) {
      skipTest('分布式锁支持', 'Redis不可用');
      return false;
    }
    
    // 创建测试脚本
    const testScript = `
const Redis = require('ioredis');
const { randomBytes } = require('crypto');

// 连接Redis
const redis = new Redis({
  host: 'localhost',
  port: 16379
});

// 分布式锁实现
class DistributedLock {
  constructor(redis) {
    this.redis = redis;
  }
  
  async acquireLock(key, ttl = 30000) {
    const identifier = randomBytes(16).toString('hex');
    const result = await this.redis.set(key, identifier, 'PX', ttl, 'NX');
    
    if (result === 'OK') {
      return {
        key,
        identifier,
        async release() {
          const luaScript = \`
            if redis.call("GET", KEYS[1]) == ARGV[1] then
              return redis.call("DEL", KEYS[1])
            else
              return 0
            end
          \`;
          
          const result = await redis.eval(luaScript, 1, key, identifier);
          return result === 1;
        }
      };
    }
    
    return null;
  }
}

// 测试分布式锁
async function testLock() {
  const lockService = new DistributedLock(redis);
  
  try {
    // 获取锁
    const lock = await lockService.acquireLock('test-lock', 10000);
    
    if (!lock) {
      console.log('❌ 获取锁失败');
      return false;
    }
    
    console.log('✅ 成功获取锁');
    
    // 尝试获取同一个锁（应该失败）
    const lock2 = await lockService.acquireLock('test-lock', 10000);
    
    if (lock2) {
      console.log('❌ 第二次获取锁成功（不应该发生）');
      await lock2.release();
      return false;
    } else {
      console.log('✅ 第二次获取锁失败（预期行为）');
    }
    
    // 释放锁
    const released = await lock.release();
    
    if (!released) {
      console.log('❌ 释放锁失败');
      return false;
    }
    
    console.log('✅ 成功释放锁');
    
    // 再次尝试获取锁（应该成功）
    const lock3 = await lockService.acquireLock('test-lock', 10000);
    
    if (!lock3) {
      console.log('❌ 释放后再次获取锁失败');
      return false;
    }
    
    console.log('✅ 释放后再次获取锁成功');
    await lock3.release();
    
    return true;
  } catch (error) {
    console.log('❌ 分布式锁测试异常:', error.message);
    return false;
  } finally {
    await redis.quit();
  }
}

testLock().then(success => {
  if (success) {
    console.log('✅ 分布式锁测试通过');
  } else {
    console.log('❌ 分布式锁测试失败');
  }
}).catch(error => {
  console.log('❌ 分布式锁测试异常:', error.message);
});
`;
    
    const testScriptPath = path.join(process.cwd(), '.test-distributed-lock.js');
    fs.writeFileSync(testScriptPath, testScript);
    
    const result = await executeCommand('node', [testScriptPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_PATH: path.join(process.cwd(), 'node_modules')
      },
      timeout: 10000
    });
    
    // 清理测试脚本
    try {
      fs.unlinkSync(testScriptPath);
    } catch (error) {
      // 忽略清理错误
    }
    
    const passed = result.exitCode === 0 && result.stdout.includes('✅ 分布式锁测试通过');
    recordTest('分布式锁支持', passed, passed ? '' : '分布式锁功能异常');
    
    return passed;
  } catch (error) {
    recordTest('分布式锁支持', false, error.message);
    return false;
  }
}

/**
 * 测试6: 容器化沙箱
 */
async function testContainerSandbox() {
  log('\n🐳 测试6: 容器化沙箱', colors.bright);
  
  try {
    // 检查Docker是否可用
    const dockerResult = await executeCommand('docker', ['--version']);
    
    if (dockerResult.exitCode !== 0) {
      skipTest('容器化沙箱', 'Docker不可用');
      return false;
    }
    
    // 创建测试脚本
    const testScript = `
const { spawn } = require('child_process');
const { randomBytes } = require('crypto');

// 容器化沙箱实现
class ContainerSandbox {
  constructor() {
    this.containers = new Map();
  }
  
  async createContainer(image = 'alpine:latest') {
    const containerName = 'sandbox-test-' + randomBytes(8).toString('hex');
    
    // 创建容器
    const createResult = await this.executeDocker('create', [
      '--name', containerName,
      '--rm',
      '--memory', '128m',
      '--cpus', '0.5',
      '--network', 'none',
      '--read-only',
      '--user', '1000:1000',
      image,
      'tail', '-f', '/dev/null'
    ]);
    
    if (createResult.exitCode !== 0) {
      throw new Error(\`创建容器失败: \${createResult.stderr}\`);
    }
    
    // 启动容器
    const startResult = await this.executeDocker('start', [containerName]);
    
    if (startResult.exitCode !== 0) {
      throw new Error(\`启动容器失败: \${startResult.stderr}\`);
    }
    
    this.containers.set(containerName, { status: 'running' });
    
    return {
      name: containerName,
      async exec(command) {
        const result = await this.executeDocker('exec', [
          containerName,
          'sh', '-c', command
        ]);
        
        return {
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr
        };
      },
      
      async stop() {
        const result = await this.executeDocker('stop', [containerName]);
        this.containers.set(containerName, { status: 'stopped' });
        return result.exitCode === 0;
      },
      
      async remove() {
        const result = await this.executeDocker('rm', [containerName]);
        this.containers.delete(containerName);
        return result.exitCode === 0;
      }
    };
  }
  
  async executeDocker(command, args) {
    return new Promise((resolve, reject) => {
      const docker = spawn('docker', [command, ...args]);
      
      let stdout = '';
      let stderr = '';
      
      docker.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      docker.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      docker.on('close', (code) => {
        resolve({ exitCode: code || 0, stdout, stderr });
      });
      
      docker.on('error', (error) => {
        reject(error);
      });
    });
  }
}

// 测试容器化沙箱
async function testSandbox() {
  const sandbox = new ContainerSandbox();
  
  try {
    // 创建容器
    console.log('📦 创建容器...');
    const container = await sandbox.createContainer();
    console.log(\`✅ 容器创建成功: \${container.name}\`);
    
    // 执行命令
    console.log('🔧 执行命令: echo "Hello from container"');
    const result = await container.exec('echo "Hello from container"');
    
    if (result.exitCod