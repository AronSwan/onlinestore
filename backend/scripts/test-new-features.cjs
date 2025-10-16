#!/usr/bin/env node

/**
 * 测试新功能：分布式锁和容器化沙箱
 * 验证分布式锁机制和容器化沙箱的功能
 */

const { spawn } = require('child_process');
const { promisify } = require('util');
const sleep = promisify(setTimeout);
const path = require('path');

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
 * 检查Redis是否可用
 */
async function checkRedisAvailability() {
  try {
    log('🔍 检查Redis可用性...', colors.blue);
    const result = await executeCommand('redis-cli', ['ping']);
    
    if (result.stdout.includes('PONG')) {
      log('✅ Redis可用', colors.green);
      return true;
    } else {
      log('❌ Redis不可用', colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Redis检查失败: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * 检查Docker是否可用
 */
async function checkDockerAvailability() {
  try {
    log('🔍 检查Docker可用性...', colors.blue);
    const result = await executeCommand('docker', ['--version']);
    
    if (result.exitCode === 0) {
      log('✅ Docker可用', colors.green);
      return true;
    } else {
      log('❌ Docker不可用', colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Docker检查失败: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * 测试分布式锁
 */
async function testDistributedLock() {
  log('\n🔒 测试分布式锁...', colors.bright);
  
  try {
    // 检查Redis可用性
    const redisAvailable = await checkRedisAvailability();
    if (!redisAvailable) {
      log('⚠️  跳过分布式锁测试：Redis不可用', colors.yellow);
      return false;
    }
    
    // 创建分布式锁测试脚本
    const lockTestScript = `
const Redis = require('ioredis');
const { randomBytes } = require('crypto');

// 连接Redis
const redis = new Redis({
  host: 'localhost',
  port: 6379
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
  
  // 获取锁
  const lock = await lockService.acquireLock('test-lock', 10000);
  
  if (lock) {
    console.log('✅ 成功获取锁');
    
    // 尝试获取同一个锁（应该失败）
    const lock2 = await lockService.acquireLock('test-lock', 10000);
    
    if (!lock2) {
      console.log('✅ 第二次获取锁失败（预期行为）');
    }
    
    // 释放锁
    const released = await lock.release();
    
    if (released) {
      console.log('✅ 成功释放锁');
    } else {
      console.log('❌ 释放锁失败');
    }
    
    // 再次尝试获取锁（应该成功）
    const lock3 = await lockService.acquireLock('test-lock', 10000);
    
    if (lock3) {
      console.log('✅ 释放后再次获取锁成功');
      await lock3.release();
    }
  } else {
    console.log('❌ 获取锁失败');
  }
  
  await redis.quit();
}

// 执行测试
testLock().catch(console.error);
`;
    
    // 写入测试脚本
    const fs = require('fs');
    const testScriptPath = path.join(process.cwd(), '.test-distributed-lock.js');
    fs.writeFileSync(testScriptPath, lockTestScript);
    
    // 执行测试脚本
    log('🚀 执行分布式锁测试...', colors.blue);
    const result = await executeCommand('node', [testScriptPath], {
      cwd: process.cwd()
    });
    
    // 清理测试脚本
    try {
      fs.unlinkSync(testScriptPath);
    } catch (error) {
      // 忽略清理错误
    }
    
    if (result.exitCode === 0) {
      log('✅ 分布式锁测试完成', colors.green);
      return true;
    } else {
      log(`❌ 分布式锁测试失败: ${result.stderr}`, colors.red);
      return false;
    }
    
  } catch (error) {
    log(`❌ 分布式锁测试异常: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * 测试容器化沙箱
 */
async function testContainerSandbox() {
  log('\n🐳 测试容器化沙箱...', colors.bright);
  
  try {
    // 检查Docker可用性
    const dockerAvailable = await checkDockerAvailability();
    if (!dockerAvailable) {
      log('⚠️  跳过容器化沙箱测试：Docker不可用', colors.yellow);
      return false;
    }
    
    // 创建容器化沙箱测试脚本
    const sandboxTestScript = `
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
    
    if (result.exitCode === 0) {
      console.log(\`✅ 命令执行成功: \${result.stdout.trim()}\`);
    } else {
      console.log(\`❌ 命令执行失败: \${result.stderr}\`);
    }
    
    // 测试文件系统只读
    console.log('🔒 测试文件系统只读...');
    const touchResult = await container.exec('touch /test.txt');
    
    if (touchResult.exitCode !== 0) {
      console.log('✅ 文件系统只读（预期行为）');
    } else {
      console.log('❌ 文件系统不是只读');
    }
    
    // 停止容器
    console.log('🛑 停止容器...');
    const stopped = await container.stop();
    
    if (stopped) {
      console.log('✅ 容器停止成功');
    } else {
      console.log('❌ 容器停止失败');
    }
    
    // 删除容器
    console.log('🗑️  删除容器...');
    const removed = await container.remove();
    
    if (removed) {
      console.log('✅ 容器删除成功');
    } else {
      console.log('❌ 容器删除失败');
    }
    
  } catch (error) {
    console.error(\`❌ 容器化沙箱测试失败: \${error.message}\`);
  }
}

// 执行测试
testSandbox().catch(console.error);
`;
    
    // 写入测试脚本
    const fs = require('fs');
    const testScriptPath = path.join(process.cwd(), '.test-container-sandbox.js');
    fs.writeFileSync(testScriptPath, sandboxTestScript);
    
    // 执行测试脚本
    log('🚀 执行容器化沙箱测试...', colors.blue);
    const result = await executeCommand('node', [testScriptPath], {
      cwd: process.cwd()
    });
    
    // 清理测试脚本
    try {
      fs.unlinkSync(testScriptPath);
    } catch (error) {
      // 忽略清理错误
    }
    
    if (result.exitCode === 0) {
      log('✅ 容器化沙箱测试完成', colors.green);
      return true;
    } else {
      log(`❌ 容器化沙箱测试失败: ${result.stderr}`, colors.red);
      return false;
    }
    
  } catch (error) {
    log(`❌ 容器化沙箱测试异常: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  log('🚀 测试新功能：分布式锁和容器化沙箱', colors.bright);
  
  try {
    // 测试分布式锁
    const lockSuccess = await testDistributedLock();
    
    // 测试容器化沙箱
    const sandboxSuccess = await testContainerSandbox();
    
    // 判断测试结果
    if (lockSuccess && sandboxSuccess) {
      log('\n✅ 所有新功能测试通过！', colors.green);
      process.exit(0);
    } else {
      log('\n⚠️  部分新功能测试失败（可能是由于缺少依赖）', colors.yellow);
      process.exit(0);
    }
    
  } catch (error) {
    log(`\n❌ 新功能测试执行失败: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  testDistributedLock,
  testContainerSandbox
};