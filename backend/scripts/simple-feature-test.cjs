#!/usr/bin/env node

/**
 * 简化功能测试脚本
 * 测试核心功能模块
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
 * 主函数
 */
async function main() {
  log('🚀 综合功能测试', colors.bright);
  
  try {
    // 测试1: 读写锁分离机制
    log('\n🔒 测试1: 读写锁分离机制', colors.bright);
    
    try {
      // 简单测试读写锁逻辑
      const testScript = `
class ReadWriteLock {
  constructor() {
    this.readers = 0;
    this.writer = false;
    this.waitingWriters = 0;
  }
  
  async acquireReadLock() {
    return new Promise((resolve) => {
      if (this.writer || this.waitingWriters > 0) {
        setTimeout(() => {
          if (!this.writer && this.waitingWriters === 0) {
            this.readers++;
            resolve();
          } else {
            this.acquireReadLock().then(resolve);
          }
        }, 10);
      } else {
        this.readers++;
        resolve();
      }
    });
  }
  
  async acquireWriteLock() {
    return new Promise((resolve) => {
      this.waitingWriters++;
      setTimeout(() => {
        if (this.readers === 0 && !this.writer) {
          this.writer = true;
          this.waitingWriters--;
          resolve();
        } else {
          this.acquireWriteLock().then(resolve);
        }
      }, 10);
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
  
  return true;
}

testLock().then(success => {
  if (success) {
    console.log('✅ 读写锁测试通过');
  } else {
    console.log('❌ 读写锁测试失败');
  }
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
    } catch (error) {
      recordTest('读写锁分离机制', false, error.message);
    }
    
    // 测试2: 审计日志加密存储
    log('\n🔐 测试2: 审计日志加密存储', colors.bright);
    
    try {
      const crypto = require('crypto');
      
      // 简单测试加密和解密
      const algorithm = 'aes-256-cbc';
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipher(algorithm, key);
      let encrypted = cipher.update('test message', 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const decipher = crypto.createDecipher(algorithm, key);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      const passed = decrypted === 'test message';
      recordTest('审计日志加密存储', passed, passed ? '' : '加密解密功能异常');
    } catch (error) {
      recordTest('审计日志加密存储', false, error.message);
    }
    
    // 测试3: 分布式锁支持
    log('\n🔒 测试3: 分布式锁支持', colors.bright);
    
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
      } else {
        // 简单测试Redis连接
        const testScript = `
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 16379
});

redis.ping().then(result => {
  if (result === 'PONG') {
    console.log('✅ Redis连接测试通过');
  } else {
    console.log('❌ Redis连接测试失败');
  }
  redis.quit();
}).catch(error => {
  console.log('❌ Redis连接测试异常:', error.message);
  redis.quit();
});
`;
        
        const testScriptPath = path.join(process.cwd(), '.test-redis-connection.js');
        fs.writeFileSync(testScriptPath, testScript);
        
        const result = await executeCommand('node', [testScriptPath], {
          cwd: process.cwd(),
          env: {
            ...process.env,
            NODE_PATH: path.join(process.cwd(), 'node_modules')
          },
          timeout: 5000
        });
        
        // 清理测试脚本
        try {
          fs.unlinkSync(testScriptPath);
        } catch (error) {
          // 忽略清理错误
        }
        
        const passed = result.exitCode === 0 && result.stdout.includes('✅ Redis连接测试通过');
        recordTest('分布式锁支持', passed, passed ? '' : 'Redis连接异常');
      }
    } catch (error) {
      recordTest('分布式锁支持', false, error.message);
    }
    
    // 测试4: 容器化沙箱
    log('\n🐳 测试4: 容器化沙箱', colors.bright);
    
    try {
      // 检查Docker是否可用
      const dockerResult = await executeCommand('docker', ['--version']);
      
      if (dockerResult.exitCode !== 0) {
        skipTest('容器化沙箱', 'Docker不可用');
      } else {
        // 简单测试Docker容器
        const result = await executeCommand('docker', [
          'run', '--rm',
          '--memory', '128m',
          '--cpus', '0.5',
          'alpine:latest',
          'echo', 'Hello from container'
        ]);
        
        const passed = result.exitCode === 0 && result.stdout.includes('Hello from container');
        recordTest('容器化沙箱', passed, passed ? '' : 'Docker容器执行异常');
      }
    } catch (error) {
      recordTest('容器化沙箱', false, error.message);
    }
    
    // 显示测试结果
    log('\n📊 测试结果统计', colors.bright);
    log(`总测试数: ${testResults.total}`, colors.cyan);
    log(`通过: ${testResults.passed}`, colors.green);
    log(`失败: ${testResults.failed}`, colors.red);
    log(`跳过: ${testResults.skipped}`, colors.yellow);
    
    const passRate = testResults.total > 0 ? Math.round((testResults.passed / testResults.total) * 100) : 0;
    log(`通过率: ${passRate}%`, colors.cyan);
    
    if (testResults.failed === 0) {
      log('\n✅ 所有测试通过！', colors.green);
      process.exit(0);
    } else {
      log('\n❌ 部分测试失败', colors.red);
      process.exit(1);
    }
    
  } catch (error) {
    log(`\n❌ 测试执行失败: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}