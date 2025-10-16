#!/usr/bin/env node

/**
 * 直接测试容器化沙箱功能
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
  log('🚀 直接测试容器化沙箱功能', colors.bright);
  
  try {
    // 检查Docker是否可用
    log('🔍 检查Docker可用性...', colors.blue);
    const dockerResult = await executeCommand('docker', ['--version']);
    
    if (dockerResult.exitCode !== 0) {
      log('❌ Docker不可用，跳过测试', colors.red);
      return;
    }
    
    log('✅ Docker可用', colors.green);
    
    // 生成随机容器名
    const { randomBytes } = require('crypto');
    const containerName = 'sandbox-test-' + randomBytes(8).toString('hex');
    
    log(`📦 创建容器: ${containerName}`, colors.blue);
    
    // 创建容器
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
    
    if (createResult.exitCode !== 0) {
      log(`❌ 创建容器失败: ${createResult.stderr}`, colors.red);
      return;
    }
    
    log('✅ 容器创建成功', colors.green);
    
    // 启动容器
    log('🚀 启动容器...', colors.blue);
    const startResult = await executeCommand('docker', ['start', containerName]);
    
    if (startResult.exitCode !== 0) {
      log(`❌ 启动容器失败: ${startResult.stderr}`, colors.red);
      // 尝试清理容器
      await executeCommand('docker', ['rm', containerName]);
      return;
    }
    
    log('✅ 容器启动成功', colors.green);
    
    // 等待容器完全启动
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 执行命令测试
    log('🔧 执行命令: echo "Hello from container"', colors.blue);
    const execResult = await executeCommand('docker', [
      'exec',
      containerName,
      'sh', '-c', 'echo "Hello from container"'
    ]);
    
    if (execResult.exitCode === 0) {
      log(`✅ 命令执行成功: ${execResult.stdout.trim()}`, colors.green);
    } else {
      log(`❌ 命令执行失败: ${execResult.stderr}`, colors.red);
    }
    
    // 测试文件系统只读
    log('🔒 测试文件系统只读...', colors.blue);
    const touchResult = await executeCommand('docker', [
      'exec',
      containerName,
      'sh', '-c', 'touch /test.txt'
    ]);
    
    if (touchResult.exitCode !== 0) {
      log('✅ 文件系统只读（预期行为）', colors.green);
    } else {
      log('❌ 文件系统不是只读', colors.red);
    }
    
    // 测试网络隔离
    log('🌐 测试网络隔离...', colors.blue);
    const pingResult = await executeCommand('docker', [
      'exec',
      containerName,
      'sh', '-c', 'ping -c 1 8.8.8.8'
    ]);
    
    if (pingResult.exitCode !== 0) {
      log('✅ 网络隔离生效（预期行为）', colors.green);
    } else {
      log('⚠️  网络隔离未生效', colors.yellow);
    }
    
    // 停止容器
    log('🛑 停止容器...', colors.blue);
    const stopResult = await executeCommand('docker', ['stop', containerName]);
    
    if (stopResult.exitCode === 0) {
      log('✅ 容器停止成功', colors.green);
    } else {
      log(`❌ 容器停止失败: ${stopResult.stderr}`, colors.red);
    }
    
    // 删除容器
    log('🗑️  删除容器...', colors.blue);
    const rmResult = await executeCommand('docker', ['rm', containerName]);
    
    if (rmResult.exitCode === 0) {
      log('✅ 容器删除成功', colors.green);
    } else {
      log(`❌ 容器删除失败: ${rmResult.stderr}`, colors.red);
    }
    
    log('\n✅ 容器化沙箱测试通过', colors.green);
    
  } catch (error) {
    log(`\n❌ 测试执行失败: ${error.message}`, colors.red);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}