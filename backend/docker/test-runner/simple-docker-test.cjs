#!/usr/bin/env node

/**
 * 简化的Docker测试脚本
 * 在现有Docker环境中测试功能
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
 * 主函数
 */
async function main() {
  log('🚀 在Docker环境中测试功能', colors.bright);
  
  try {
    // 测试结果统计
    const testResults = {
      total: 0,
      passed: 0,
      failed: 0
    };
    
    // 记录测试结果
    function recordTest(name, passed, message = '') {
      testResults.total++;
      
      if (passed) {
        testResults.passed++;
        log(`✅ ${name}`, colors.green);
      } else {
        testResults.failed++;
        log(`❌ ${name}: ${message}`, colors.red);
      }
    }
    
    // 1. 测试Docker是否可用
    log('\n🐳 测试Docker环境', colors.bright);
    
    try {
      const dockerResult = await executeCommand('docker', ['--version']);
      
      if (dockerResult.exitCode === 0) {
        recordTest('Docker环境检查', true);
        log(`Docker版本: ${dockerResult.stdout.trim()}`, colors.cyan);
      } else {
        recordTest('Docker环境检查', false, 'Docker不可用');
        return;
      }
    } catch (error) {
      recordTest('Docker环境检查', false, error.message);
      return;
    }
    
    // 2. 测试Redis容器
    log('\n🔒 测试Redis容器', colors.bright);
    
    try {
      // 检查Redis容器是否运行
      const redisCheckResult = await executeCommand('docker', ['exec', 'test-runner-redis', 'redis-cli', 'ping']);
      
      if (redisCheckResult.stdout.includes('PONG')) {
        recordTest('Redis容器连接', true);
        
        // 测试Redis基本操作
        const setResult = await executeCommand('docker', [
          'exec', 'test-runner-redis', 'redis-cli', 'set', 'test-key', 'test-value'
        ]);
        
        if (setResult.exitCode === 0) {
          recordTest('Redis SET操作', true);
          
          const getResult = await executeCommand('docker', [
            'exec', 'test-runner-redis', 'redis-cli', 'get', 'test-key'
          ]);
          
          if (getResult.stdout.includes('test-value')) {
            recordTest('Redis GET操作', true);
          } else {
            recordTest('Redis GET操作', false, '值不匹配');
          }
        } else {
          recordTest('Redis SET操作', false, setResult.stderr);
        }
        
        // 测试分布式锁
        const lockResult = await executeCommand('docker', [
          'exec', 'test-runner-redis', 'redis-cli', 'set', 'test-lock', 'lock-value', 'PX', '10000', 'NX'
        ]);
        
        if (lockResult.stdout.includes('OK')) {
          recordTest('分布式锁获取', true);
          
          // 尝试再次获取同一个锁（应该失败）
          const lockResult2 = await executeCommand('docker', [
            'exec', 'test-runner-redis', 'redis-cli', 'set', 'test-lock', 'lock-value-2', 'PX', '10000', 'NX'
          ]);
          
          if (lockResult2.exitCode === 0 && lockResult2.stdout.trim() === '') {
            recordTest('分布式锁互斥', true);
          } else {
            recordTest('分布式锁互斥', false, '锁互斥失败');
          }
          
          // 释放锁
          const releaseResult = await executeCommand('docker', [
            'exec', 'test-runner-redis', 'redis-cli', 'del', 'test-lock'
          ]);
          
          if (releaseResult.stdout.includes('1')) {
            recordTest('分布式锁释放', true);
          } else {
            recordTest('分布式锁释放', false, '锁释放失败');
          }
        } else {
          recordTest('分布式锁获取', false, lockResult.stderr);
        }
        
        // 清理测试数据
        await executeCommand('docker', ['exec', 'test-runner-redis', 'redis-cli', 'del', 'test-key']);
      } else {
        recordTest('Redis容器连接', false, 'Redis不可用');
      }
    } catch (error) {
      recordTest('Redis容器测试', false, error.message);
    }
    
    // 3. 测试容器化沙箱
    log('\n🐳 测试容器化沙箱', colors.bright);
    
    try {
      // 生成随机容器名
      const { randomBytes } = require('crypto');
      const containerName = 'sandbox-test-' + randomBytes(8).toString('hex');
      
      // 创建容器
      log(`📦 创建容器: ${containerName}`, colors.blue);
      const createResult = await executeCommand('docker', [
        'create',
        '--name', containerName,
        '--rm',
        '--memory', '128m',
        '--cpus', '0.5',
        '--network', 'none',
        '--read-only',
        '--user', '1000:1000',
        'alpine:latest',
        'tail', '-f', '/dev/null'
      ]);
      
      if (createResult.exitCode === 0) {
        recordTest('容器创建', true);
        
        // 启动容器
        log('🚀 启动容器...', colors.blue);
        const startResult = await executeCommand('docker', ['start', containerName]);
        
        if (startResult.exitCode === 0) {
          recordTest('容器启动', true);
          
          // 等待容器完全启动
          await sleep(2000);
          
          // 执行命令测试
          log('🔧 执行命令: echo "Hello from container"', colors.blue);
          const execResult = await executeCommand('docker', [
            'exec',
            containerName,
            'sh', '-c', 'echo "Hello from container"'
          ]);
          
          if (execResult.stdout.includes('Hello from container')) {
            recordTest('容器命令执行', true);
          } else {
            recordTest('容器命令执行', false, '命令执行失败');
          }
          
          // 测试文件系统只读
          log('🔒 测试文件系统只读...', colors.blue);
          const touchResult = await executeCommand('docker', [
            'exec',
            containerName,
            'sh', '-c', 'touch /test.txt'
          ]);
          
          if (touchResult.exitCode !== 0) {
            recordTest('文件系统只读', true);
          } else {
            recordTest('文件系统只读', false, '文件系统不是只读');
          }
          
          // 测试网络隔离
          log('🌐 测试网络隔离...', colors.blue);
          const pingResult = await executeCommand('docker', [
            'exec',
            containerName,
            'sh', '-c', 'ping -c 1 8.8.8.8'
          ]);
          
          if (pingResult.exitCode !== 0) {
            recordTest('网络隔离', true);
          } else {
            recordTest('网络隔离', false, '网络隔离未生效');
          }
          
          // 停止容器
          log('🛑 停止容器...', colors.blue);
          const stopResult = await executeCommand('docker', ['stop', containerName]);
          
          if (stopResult.exitCode === 0) {
            recordTest('容器停止', true);
          } else {
            recordTest('容器停止', false, '容器停止失败');
          }
        } else {
          recordTest('容器启动', false, startResult.stderr);
          // 尝试清理容器
          await executeCommand('docker', ['rm', containerName]);
        }
      } else {
        recordTest('容器创建', false, createResult.stderr);
      }
    } catch (error) {
      recordTest('容器化沙箱测试', false, error.message);
    }
    
    // 4. 测试加密功能
    log('\n🔐 测试加密功能', colors.bright);
    
    try {
      const crypto = require('crypto');
      
      // 测试AES加密
      const algorithm = 'aes-256-cbc';
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update('test message', 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      if (decrypted === 'test message') {
        recordTest('AES加密解密', true);
      } else {
        recordTest('AES加密解密', false, '加密解密失败');
      }
    } catch (error) {
      recordTest('加密功能测试', false, error.message);
    }
    
    // 显示测试结果
    log('\n📊 测试结果统计', colors.bright);
    log(`总测试数: ${testResults.total}`, colors.cyan);
    log(`通过: ${testResults.passed}`, colors.green);
    log(`失败: ${testResults.failed}`, colors.red);
    
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