#!/usr/bin/env node

/**
 * OpenObserve 部署和测试脚本
 * 用于部署 OpenObserve 到 Docker 并测试监控功能
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

// 配置
const config = {
  composeFile: path.join(__dirname, '../docker/openobserve/docker-compose.yml'),
  openobserveUrl: 'http://localhost:5080',
  username: 'admin@example.com',
  password: process.env.OPENOBSERVE_PASSWORD || 'CHANGE_ME_openobserve_password',
  organization: 'default',
  streamName: 'test-runner-metrics',
  maxWaitTime: 120000, // 2分钟
  checkInterval: 5000 // 5秒
};

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
 * 执行命令并返回结果
 */
async function execCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    log(`执行命令: ${command} ${args.join(' ')}`, colors.cyan);
    
    const child = spawn(command, args, {
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
    
    let stdout = '';
    let stderr = '';
    
    if (options.silent) {
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
    }
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`命令执行失败，退出码: ${code}\n${stderr}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 检查 Docker 是否运行
 */
async function checkDocker() {
  try {
    await execCommand('docker', ['--version'], { silent: true });
    log('✅ Docker 已安装', colors.green);
    return true;
  } catch (error) {
    log('❌ Docker 未安装或未运行', colors.red);
    log('请安装 Docker 并确保其正在运行', colors.yellow);
    return false;
  }
}

/**
 * 检查 Docker Compose 是否可用
 */
async function checkDockerCompose() {
  try {
    await execCommand('docker-compose', ['--version'], { silent: true });
    log('✅ Docker Compose 已安装', colors.green);
    return true;
  } catch (error) {
    try {
      // 尝试使用 docker compose (新版本)
      await execCommand('docker', ['compose', 'version'], { silent: true });
      log('✅ Docker Compose (新版本) 已安装', colors.green);
      // 使用新版本的命令
      global.useDockerCompose = false;
      return true;
    } catch (innerError) {
      log('❌ Docker Compose 未安装', colors.red);
      log('请安装 Docker Compose', colors.yellow);
      return false;
    }
  }
}

/**
 * 部署 OpenObserve
 */
async function deployOpenObserve() {
  try {
    log('\n🚀 开始部署 OpenObserve...', colors.bright);
    
    // 检查 compose 文件是否存在
    if (!fs.existsSync(config.composeFile)) {
      throw new Error(`Docker Compose 文件不存在: ${config.composeFile}`);
    }
    
    // 停止并删除现有容器
    log('停止现有容器...', colors.yellow);
    try {
      if (global.useDockerCompose !== false) {
        await execCommand('docker-compose', ['-f', config.composeFile, 'down'], { silent: true });
      } else {
        await execCommand('docker', ['compose', '-f', config.composeFile, 'down'], { silent: true });
      }
    } catch (error) {
      // 忽略错误，可能是容器不存在
    }
    
    // 启动容器
    log('启动 OpenObserve 容器...', colors.yellow);
    if (global.useDockerCompose !== false) {
      await execCommand('docker-compose', ['-f', config.composeFile, 'up', '-d'], { silent: true });
    } else {
      await execCommand('docker', ['compose', '-f', config.composeFile, 'up', '-d'], { silent: true });
    }
    
    log('✅ OpenObserve 容器已启动', colors.green);
    return true;
  } catch (error) {
    log(`❌ 部署失败: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * 等待 OpenObserve 启动
 */
async function waitForOpenObserve() {
  try {
    log('\n⏳ 等待 OpenObserve 启动...', colors.bright);
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < config.maxWaitTime) {
      try {
        // 使用 curl 检查健康状态 - 尝试多个路径
        let healthy = false;
        
        try {
          await execCommand('curl', ['-s', '-f', `${config.openobserveUrl}/health`], { silent: true });
          healthy = true;
        } catch (e) {
          try {
            await execCommand('curl', ['-s', '-f', `${config.openobserveUrl}/api/health`], { silent: true });
            healthy = true;
          } catch (e2) {
            try {
              await execCommand('curl', ['-s', '-f', `${config.openobserveUrl}/web/health`], { silent: true });
              healthy = true;
            } catch (e3) {
              // 最后尝试，只检查是否有响应
              await execCommand('curl', ['-s', `${config.openobserveUrl}/web`], { silent: true });
              healthy = true;
            }
          }
        }
        
        if (healthy) {
          log('✅ OpenObserve 已启动并健康', colors.green);
          return true;
        }
      } catch (error) {
        // 服务还未就绪，继续等待
        log(`等待中... (${Math.round((Date.now() - startTime) / 1000)}秒)`, colors.yellow);
        await sleep(config.checkInterval);
      }
    }
    
    log('❌ OpenObserve 启动超时', colors.red);
    return false;
  } catch (error) {
    log(`❌ 等待失败: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * 创建测试流
 */
async function createTestStream() {
  try {
    log('\n📝 创建测试流...', colors.bright);
    
    const streamData = {
      name: config.streamName,
      storage_type: 'local',
      schema: [
        {
          name: 'timestamp',
          type: 'Timestamp'
        },
        {
          name: 'level',
          type: 'String'
        },
        {
          name: 'message',
          type: 'String'
        },
        {
          name: 'metric_name',
          type: 'String'
        },
        {
          name: 'metric_value',
          type: 'Float'
        }
      ]
    };
    
    const response = await execCommand('curl', [
      '-s', '-X', 'POST',
      '-H', 'Content-Type: application/json',
      '-H', `Authorization: Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
      '-d', JSON.stringify(streamData),
      `${config.openobserveUrl}/api/${config.organization}/streams`
    ], { silent: true });
    
    log('✅ 测试流已创建', colors.green);
    return true;
  } catch (error) {
    log(`❌ 创建流失败: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * 测试发送数据
 */
async function testSendData() {
  try {
    log('\n📤 测试发送数据...', colors.bright);
    
    // 导入 OpenObserve 监控组件
    const { OpenObserveMonitor, OpenObserveAdapter } = require('./openobserve-monitor.cjs');
    
    // 创建监控实例
    const monitor = new OpenObserveMonitor({
      connection: {
        endpoint: config.openobserveUrl,
        organization: config.organization,
        username: config.username,
        password: config.password,
        timeout: 10000
      },
      batching: {
        enabled: false
      },
      defaultStream: config.streamName
    });
    
    // 创建适配器
    const adapter = new OpenObserveAdapter(monitor);
    
    // 测试发送日志
    adapter.info('测试日志消息', { component: 'test-runner', test: true });
    adapter.warn('测试警告消息', { component: 'test-runner', test: true });
    adapter.error('测试错误消息', { component: 'test-runner', test: true });
    
    // 测试发送指标
    adapter.metric('test_counter', 1, 'counter', { component: 'test-runner' });
    adapter.metric('test_gauge', 42.5, 'gauge', { component: 'test-runner' });
    adapter.metric('test_histogram', 100, 'histogram', { component: 'test-runner' });
    
    // 等待数据发送
    await sleep(2000);
    
    // 清理
    await monitor.destroy();
    
    log('✅ 数据发送测试完成', colors.green);
    return true;
  } catch (error) {
    log(`❌ 数据发送测试失败: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * 验证数据是否已接收
 */
async function verifyData() {
  try {
    log('\n🔍 验证数据是否已接收...', colors.bright);
    
    // 查询最近的数据
    const query = {
      query: {
        sql: `SELECT * FROM "${config.streamName}" ORDER BY timestamp DESC LIMIT 10`,
        start_time: (Date.now() - 300000).toString(), // 5分钟前
        end_time: Date.now().toString()
      }
    };
    
    const response = await execCommand('curl', [
      '-s', '-X', 'POST',
      '-H', 'Content-Type: application/json',
      '-H', `Authorization: Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
      '-d', JSON.stringify(query),
      `${config.openobserveUrl}/api/${config.organization}/_search`
    ], { silent: true });
    
    const result = JSON.parse(response.stdout);
    
    if (result.hits && result.hits.length > 0) {
      log(`✅ 找到 ${result.hits.length} 条记录`, colors.green);
      
      // 显示最近的几条记录
      result.hits.slice(0, 3).forEach((hit, index) => {
        log(`记录 ${index + 1}:`, colors.cyan);
        log(`  时间戳: ${new Date(parseInt(hit.timestamp)).toISOString()}`, colors.cyan);
        log(`  级别: ${hit.level}`, colors.cyan);
        log(`  消息: ${hit.message}`, colors.cyan);
        if (hit.metric_name) {
          log(`  指标: ${hit.metric_name} = ${hit.metric_value}`, colors.cyan);
        }
      });
      
      return true;
    } else {
      log('❌ 未找到任何记录', colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ 验证数据失败: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * 显示访问信息
 */
function showAccessInfo() {
  log('\n🌐 访问信息:', colors.bright);
  log(`OpenObserve Web UI: ${config.openobserveUrl}`, colors.blue);
  log(`用户名: ${config.username}`, colors.blue);
  log(`密码: ${config.password}`, colors.blue);
  log(`组织: ${config.organization}`, colors.blue);
  
  log('\n📊 查看测试数据:', colors.bright);
  log(`1. 访问 Web UI: ${config.openobserveUrl}`, colors.yellow);
  log(`2. 登录使用上述凭据`, colors.yellow);
  log(`3. 选择组织: ${config.organization}`, colors.yellow);
  log(`4. 在左侧菜单选择 "Streams"`, colors.yellow);
  log(`5. 查找并点击流: ${config.streamName}`, colors.yellow);
  log(`6. 查看接收到的测试数据`, colors.yellow);
}

/**
 * 清理资源
 */
async function cleanup() {
  try {
    log('\n🧹 清理资源...', colors.bright);
    
    if (global.useDockerCompose !== false) {
      await execCommand('docker-compose', ['-f', config.composeFile, 'down'], { silent: true });
    } else {
      await execCommand('docker', ['compose', '-f', config.composeFile, 'down'], { silent: true });
    }
    
    log('✅ 清理完成', colors.green);
  } catch (error) {
    log(`❌ 清理失败: ${error.message}`, colors.red);
  }
}

/**
 * 主函数
 */
async function main() {
  log('🚀 OpenObserve 部署和测试脚本', colors.bright);
  
  // 解析命令行参数
  const args = process.argv.slice(2);
  const cleanupOnly = args.includes('--cleanup');
  const skipCleanup = args.includes('--skip-cleanup');
  
  try {
    // 如果只是清理，则执行清理并退出
    if (cleanupOnly) {
      await cleanup();
      return;
    }
    
    // 检查依赖
    if (!await checkDocker()) {
      process.exit(1);
    }
    
    if (!await checkDockerCompose()) {
      process.exit(1);
    }
    
    // 部署 OpenObserve
    if (!await deployOpenObserve()) {
      process.exit(1);
    }
    
    // 等待 OpenObserve 启动
    if (!await waitForOpenObserve()) {
      process.exit(1);
    }
    
    // 创建测试流
    if (!await createTestStream()) {
      process.exit(1);
    }
    
    // 测试发送数据
    if (!await testSendData()) {
      process.exit(1);
    }
    
    // 验证数据
    if (!await verifyData()) {
      process.exit(1);
    }
    
    // 显示访问信息
    showAccessInfo();
    
    log('\n✅ 所有测试通过！', colors.green);
    
    // 如果不跳过清理，则清理资源
    if (!skipCleanup) {
      log('\n按 Ctrl+C 保留容器，或等待 10 秒后自动清理...', colors.yellow);
      
      // 等待用户中断或超时
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          log('\n⏰ 超时，开始清理...', colors.yellow);
          cleanup().then(resolve);
        }, 10000);
        
        process.on('SIGINT', () => {
          clearTimeout(timeout);
          log('\n👋 保留容器，手动清理请运行:', colors.yellow);
          log(`node ${__filename} --cleanup`, colors.yellow);
          resolve();
        });
      });
    }
    
  } catch (error) {
    log(`❌ 脚本执行失败: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  deployOpenObserve,
  waitForOpenObserve,
  testSendData,
  verifyData,
  cleanup
};