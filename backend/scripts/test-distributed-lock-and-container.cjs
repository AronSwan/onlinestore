#!/usr/bin/env node

/**
 * 分布式锁和容器化沙箱实测脚本
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
 * 测试分布式锁
 */
async function testDistributedLock() {
  log('\n🔒 测试分布式锁功能', colors.bright);
  
  try {
    // 检查Redis是否可用
    log('🔍 检查Redis可用性...', colors.blue);
    let redisAvailable = false;
    try {
      const redisResult = await executeCommand('docker', ['exec', 'test-runner-redis', 'redis-cli', '-p', '6379', 'ping']);
      redisAvailable = redisResult.stdout.includes('PONG');
    } catch (error) {
      log('❌ Redis不可用', colors.red);
      return false;
    }
    
    if (!redisAvailable) {
      log('❌ Redis不可用，跳过分布式锁测试', colors.red);
      return false;
    }
    
    log('✅ Redis可用', colors.green);
    
    // 创建分布式锁测试脚本
    const lockTestScript = `
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
        },
        
        async extend(newTtl) {
          const luaScript = \`
            if redis.call("GET", KEYS[1]) == ARGV[1] then
              return redis.call("PEXPIRE", KEYS[1], ARGV[2])
            else
              return 0
            end
          \`;
          
          const result = await redis.eval(luaScript, 1, key, identifier, newTtl);
          return result === 1;
        }
      };
    }
    
    return null;
  }
  
  async createReadWriteLock(keyPrefix) {
    const readLockKey = \`\${keyPrefix}:read\`;
    const writeLockKey = \`\${keyPrefix}:write\`;
    const readCountKey = \`\${keyPrefix}:read_count\`;
    
    return {
      async readLock() {
        const readIdentifier = randomBytes(16).toString('hex');
        const readLock = await this.acquireLock(readLockKey, 30000);
        
        if (readLock) {
          // 增加读计数
          await redis.incr(readCountKey);
          await redis.expire(readCountKey, 30);
          
          return {
            ...readLock,
            async release() {
              const released = await readLock.release();
              if (released) {
                // 减少读计数
                const count = await redis.decr(readCountKey);
                if (count <= 0) {
                  await redis.del(readCountKey);
                }
              }
              return released;
            }
          };
        }
        
        return null;
      },
      
      async writeLock() {
        // 检查是否有活跃的读锁
        const readCount = await redis.get(readCountKey);
        if (readCount && parseInt(readCount, 10) > 0) {
          throw new Error('Cannot acquire write lock while read locks are active');
        }
        
        return this.acquireLock(writeLockKey, 30000);
      }
    };
  }
}

// 测试分布式锁
async function testLock() {
  const lockService = new DistributedLock(redis);
  
  console.log('🔒 测试基本分布式锁...');
  
  // 获取锁
  const lock = await lockService.acquireLock('test-lock', 10000);
  
  if (lock) {
    console.log('✅ 成功获取锁');
    
    // 尝试获取同一个锁（应该失败）
    const lock2 = await lockService.acquireLock('test-lock', 10000);
    
    if (!lock2) {
      console.log('✅ 第二次获取锁失败（预期行为）');
    } else {
      console.log('❌ 第二次获取锁成功（不应该发生）');
      await lock2.release();
      return false;
    }
    
    // 测试锁延长
    const extended = await lock.extend(20000);
    if (extended) {
      console.log('✅ 锁延长成功');
    } else {
      console.log('❌ 锁延长失败');
    }
    
    // 释放锁
    const released = await lock.release();
    
    if (released) {
      console.log('✅ 成功释放锁');
    } else {
      console.log('❌ 释放锁失败');
      return false;
    }
    
    // 再次尝试获取锁（应该成功）
    const lock3 = await lockService.acquireLock('test-lock', 10000);
    
    if (lock3) {
      console.log('✅ 释放后再次获取锁成功');
      await lock3.release();
    } else {
      console.log('❌ 释放后再次获取锁失败');
      return false;
    }
  } else {
    console.log('❌ 获取锁失败');
    return false;
  }
  
  // 测试读写锁
  console.log('\\n📚 测试读写锁...');
  const rwLockService = await lockService.createReadWriteLock('test-rw');
  
  // 获取读锁
  const readLock1 = await rwLockService.readLock();
  if (readLock1) {
    console.log('✅ 成功获取第一个读锁');
  } else {
    console.log('❌ 获取第一个读锁失败');
    return false;
  }
  
  // 获取第二个读锁（应该成功）
  const readLock2 = await rwLockService.readLock();
  if (readLock2) {
    console.log('✅ 成功获取第二个读锁');
  } else {
    console.log('❌ 获取第二个读锁失败');
    return false;
  }
  
  // 尝试获取写锁（应该失败）
  try {
    const writeLock = await rwLockService.writeLock();
    if (writeLock) {
      console.log('❌ 在有读锁的情况下获取写锁成功（不应该发生）');
      await writeLock.release();
      return false;
    }
  } catch (error) {
    console.log('✅ 在有读锁的情况下获取写锁失败（预期行为）');
  }
  
  // 释放读锁
  await readLock1.release();
  await readLock2.release();
  
  // 再次尝试获取写锁（应该成功）
  try {
    const writeLock = await rwLockService.writeLock();
    if (writeLock) {
      console.log('✅ 释放所有读锁后获取写锁成功');
      await writeLock.release();
    } else {
      console.log('❌ 释放所有读锁后获取写锁失败');
      return false;
    }
  } catch (error) {
    console.log('❌ 释放所有读锁后获取写锁失败');
    return false;
  }
  
  return true;
}

// 执行测试
testLock().then(success => {
  if (success) {
    console.log('✅ 分布式锁测试通过');
  } else {
    console.log('❌ 分布式锁测试失败');
  }
  redis.quit();
}).catch(error => {
  console.log('❌ 分布式锁测试异常:', error.message);
  redis.quit();
});
`;
    
    const testScriptPath = path.join(process.cwd(), '.test-distributed-lock.js');
    fs.writeFileSync(testScriptPath, lockTestScript);
    
    log('🚀 执行分布式锁测试...', colors.blue);
    const result = await executeCommand('node', [testScriptPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_PATH: path.join(process.cwd(), 'node_modules')
      },
      timeout: 15000
    });
    
    // 清理测试脚本
    try {
      fs.unlinkSync(testScriptPath);
    } catch (error) {
      // 忽略清理错误
    }
    
    const passed = result.exitCode === 0 && result.stdout.includes('✅ 分布式锁测试通过');
    
    if (passed) {
      log('✅ 分布式锁测试通过', colors.green);
    } else {
      log('❌ 分布式锁测试失败', colors.red);
      if (result.stderr) {
        log(`错误信息: ${result.stderr}`, colors.red);
      }
    }
    
    return passed;
  } catch (error) {
    log(`❌ 分布式锁测试异常: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * 测试容器化沙箱
 */
async function testContainerSandbox() {
  log('\n🐳 测试容器化沙箱功能', colors.bright);
  
  try {
    // 检查Docker是否可用
    log('🔍 检查Docker可用性...', colors.blue);
    const dockerResult = await executeCommand('docker', ['--version']);
    
    if (dockerResult.exitCode !== 0) {
      log('❌ Docker不可用，跳过容器化沙箱测试', colors.red);
      return false;
    }
    
    log('✅ Docker可用', colors.green);
    
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
      return false;
    }
    
    // 测试文件系统只读
    console.log('🔒 测试文件系统只读...');
    const touchResult = await container.exec('touch /test.txt');
    
    if (touchResult.exitCode !== 0) {
      console.log('✅ 文件系统只读（预期行为）');
    } else {
      console.log('❌ 文件系统不是只读');
      return false;
    }
    
    // 测试资源限制
    console.log('📊 测试资源限制...');
    const memResult = await container.exec('cat /sys/fs/cgroup/memory/memory.limit_in_bytes');
    if (memResult.exitCode === 0) {
      const limitBytes = parseInt(memResult.stdout.trim());
      const limitMB = Math.round(limitBytes / 1024 / 1024);
      console.log(\`✅ 内存限制: \${limitMB}MB\`);
    }
    
    // 测试网络隔离
    console.log('🌐 测试网络隔离...');
    const pingResult = await container.exec('ping -c 1 8.8.8.8');
    if (pingResult.exitCode !== 0) {
      console.log('✅ 网络隔离生效（预期行为）');
    } else {
      console.log('⚠️  网络隔离未生效');
    }
    
    // 停止容器
    console.log('🛑 停止容器...');
    const stopped = await container.stop();
    
    if (stopped) {
      console.log('✅ 容器停止成功');
    } else {
      console.log('❌ 容器停止失败');
      return false;
    }
    
    // 删除容器
    console.log('🗑️  删除容器...');
    const removed = await container.remove();
    
    if (removed) {
      console.log('✅ 容器删除成功');
    } else {
      console.log('❌ 容器删除失败');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(\`❌ 容器化沙箱测试失败: \${error.message}\`);
    return false;
  }
}

// 执行测试
testSandbox().then(success => {
  if (success) {
    console.log('✅ 容器化沙箱测试通过');
  } else {
    console.log('❌ 容器化沙箱测试失败');
  }
}).catch(error => {
  console.log('❌ 容器化沙箱测试异常:', error.message);
});
`;
    
    const testScriptPath = path.join(process.cwd(), '.test-container-sandbox.js');
    fs.writeFileSync(testScriptPath, sandboxTestScript);
    
    log('🚀 执行容器化沙箱测试...', colors.blue);
    const result = await executeCommand('node', [testScriptPath], {
      cwd: process.cwd(),
      timeout: 30000
    });
    
    // 清理测试脚本
    try {
      fs.unlinkSync(testScriptPath);
    } catch (error) {
      // 忽略清理错误
    }
    
    const passed = result.exitCode === 0 && result.stdout.includes('✅ 容器化沙箱测试通过');
    
    if (passed) {
      log('✅ 容器化沙箱测试通过', colors.green);
    } else {
      log('❌ 容器化沙箱测试失败', colors.red);
      if (result.stderr) {
        log(`错误信息: ${result.stderr}`, colors.red);
      }
    }
    
    return passed;
  } catch (error) {
    log(`❌ 容器化沙箱测试异常: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  log('🚀 分布式锁和容器化沙箱实测', colors.bright);
  
  try {
    // 测试分布式锁
    const lockSuccess = await testDistributedLock();
    
    // 测试容器化沙箱
    const sandboxSuccess = await testContainerSandbox();
    
    // 显示测试结果
    log('\n📊 测试结果统计', colors.bright);
    log(`分布式锁测试: ${lockSuccess ? '✅ 通过' : '❌ 失败'}`, lockSuccess ? colors.green : colors.red);
    log(`容器化沙箱测试: ${sandboxSuccess ? '✅ 通过' : '❌ 失败'}`, sandboxSuccess ? colors.green : colors.red);
    
    if (lockSuccess && sandboxSuccess) {
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