#!/usr/bin/env node

/**
 * 直接测试分布式锁功能
 */

const { spawn } = require('child_process');
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
  log('🚀 直接测试分布式锁功能', colors.bright);
  
  try {
    // 检查Redis是否可用
    log('🔍 检查Redis可用性...', colors.blue);
    let redisAvailable = false;
    try {
      const redisResult = await executeCommand('docker', ['exec', 'test-runner-redis', 'redis-cli', '-p', '6379', 'ping']);
      redisAvailable = redisResult.stdout.includes('PONG');
    } catch (error) {
      log('❌ Redis不可用', colors.red);
      return;
    }
    
    if (!redisAvailable) {
      log('❌ Redis不可用，跳过测试', colors.red);
      return;
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

// 测试基本的Redis操作
async function testRedis() {
  try {
    // 测试SET和GET
    await redis.set('test-key', 'test-value');
    const value = await redis.get('test-key');
    
    if (value === 'test-value') {
      console.log('✅ Redis SET/GET操作成功');
    } else {
      console.log('❌ Redis SET/GET操作失败');
      return false;
    }
    
    // 测试SET NX选项
    const result = await redis.set('test-lock-key', 'lock-value', 'PX', 5000, 'NX');
    
    if (result === 'OK') {
      console.log('✅ Redis SET NX操作成功');
    } else {
      console.log('❌ Redis SET NX操作失败');
      return false;
    }
    
    // 测试第二次SET NX（应该失败）
    const result2 = await redis.set('test-lock-key', 'lock-value-2', 'PX', 5000, 'NX');
    
    if (result2 === null) {
      console.log('✅ Redis SET NX第二次操作失败（预期行为）');
    } else {
      console.log('❌ Redis SET NX第二次操作成功（不应该发生）');
      return false;
    }
    
    // 测试DEL
    const deleted = await redis.del('test-lock-key');
    
    if (deleted === 1) {
      console.log('✅ Redis DEL操作成功');
    } else {
      console.log('❌ Redis DEL操作失败');
      return false;
    }
    
    // 清理测试数据
    await redis.del('test-key');
    
    return true;
  } catch (error) {
    console.log('❌ Redis测试异常:', error.message);
    return false;
  }
}

// 测试分布式锁
async function testDistributedLock() {
  try {
    // 获取锁
    const identifier = randomBytes(16).toString('hex');
    const result = await redis.set('distributed-lock-test', identifier, 'PX', 10000, 'NX');
    
    if (result === 'OK') {
      console.log('✅ 分布式锁获取成功');
    } else {
      console.log('❌ 分布式锁获取失败');
      return false;
    }
    
    // 验证锁值
    const lockValue = await redis.get('distributed-lock-test');
    
    if (lockValue === identifier) {
      console.log('✅ 分布式锁值验证成功');
    } else {
      console.log('❌ 分布式锁值验证失败');
      return false;
    }
    
    // 尝试获取同一个锁（应该失败）
    const identifier2 = randomBytes(16).toString('hex');
    const result2 = await redis.set('distributed-lock-test', identifier2, 'PX', 10000, 'NX');
    
    if (result2 === null) {
      console.log('✅ 第二次获取分布式锁失败（预期行为）');
    } else {
      console.log('❌ 第二次获取分布式锁成功（不应该发生）');
      return false;
    }
    
    // 使用Lua脚本释放锁
    const luaScript = \`
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    \`;
    
    const releaseResult = await redis.eval(luaScript, 1, 'distributed-lock-test', identifier);
    
    if (releaseResult === 1) {
      console.log('✅ 分布式锁释放成功');
    } else {
      console.log('❌ 分布式锁释放失败');
      return false;
    }
    
    // 验证锁已释放
    const lockValueAfterRelease = await redis.get('distributed-lock-test');
    
    if (lockValueAfterRelease === null) {
      console.log('✅ 分布式锁释放验证成功');
    } else {
      console.log('❌ 分布式锁释放验证失败');
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('❌ 分布式锁测试异常:', error.message);
    return false;
  }
}

// 执行测试
async function runTests() {
  console.log('🔒 开始测试Redis基本操作...');
  const redisSuccess = await testRedis();
  
  if (redisSuccess) {
    console.log('\\n🔒 开始测试分布式锁...');
    const lockSuccess = await testDistributedLock();
    
    if (lockSuccess) {
      console.log('\\n✅ 所有分布式锁测试通过');
    } else {
      console.log('\\n❌ 分布式锁测试失败');
    }
  } else {
    console.log('\\n❌ Redis基本操作测试失败');
  }
  
  await redis.quit();
}

runTests().catch(error => {
  console.log('❌ 测试执行异常:', error.message);
  redis.quit();
});
`;
    
    const testScriptPath = path.join(process.cwd(), '.test-distributed-lock-simple.js');
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
    
    log('\n📊 测试结果:', colors.bright);
    log(result.stdout, colors.cyan);
    
    if (result.stderr) {
      log(`错误信息: ${result.stderr}`, colors.red);
    }
    
    const passed = result.exitCode === 0 && result.stdout.includes('✅ 所有分布式锁测试通过');
    
    if (passed) {
      log('\n✅ 分布式锁测试通过', colors.green);
    } else {
      log('\n❌ 分布式锁测试失败', colors.red);
    }
    
  } catch (error) {
    log(`\n❌ 测试执行失败: ${error.message}`, colors.red);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}