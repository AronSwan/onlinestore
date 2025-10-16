#!/usr/bin/env node

/**
 * Test Monitor 启动脚本
 *
 * 使用方法:
 * node start-test-monitor.js [选项]
 *
 * 选项:
 * --type=<type>          监控器类型 (secure, enhanced)
 * --env=<environment>    环境 (development, staging, production)
 * --config=<path>        配置文件路径
 * --once                 只运行一次
 * --interval=<minutes>   定时运行间隔(分钟)
 * --help                 显示帮助信息
 */

const path = require('path');
const fs = require('fs');

// 解析命令行参数
const args = process.argv.slice(2);
const options = {};

for (const arg of args) {
  if (arg.startsWith('--type=')) {
    options.type = arg.split('=')[1];
  } else if (arg.startsWith('--env=')) {
    options.env = arg.split('=')[1];
  } else if (arg.startsWith('--config=')) {
    options.configPath = arg.split('=')[1];
  } else if (arg.startsWith('--mode=')) {
    options.mode = arg.split('=')[1];
  } else if (arg.startsWith('--testCommand=')) {
    options.testCommand = arg.split('=')[1];
  } else if (arg === '--once') {
    options.once = true;
  } else if (arg.startsWith('--interval=')) {
    options.intervalMinutes = parseInt(arg.split('=')[1]);
  } else if (arg === '--help') {
    showHelp();
    process.exit(0);
  }
}

// 显示帮助信息
function showHelp() {
  console.log(`
Test Monitor 启动脚本

使用方法:
  node start-test-monitor.js [选项]

选项:
  --type=<type>          监控器类型 (secure, enhanced, unified)
  --env=<environment>    环境 (development, staging, production)
  --config=<path>        配置文件路径
  --once                 只运行一次
  --interval=<minutes>   定时运行间隔(分钟)
  --help                 显示帮助信息

示例:
  # 运行安全增强版，只执行一次
  node start-test-monitor.js --type=secure --once

  # 运行功能增强版，使用生产环境配置，每30分钟运行一次
  node start-test-monitor.js --type=enhanced --env=production --interval=30

  # 运行统一版，安全模式，只执行一次
  node start-test-monitor.js --type=unified --mode=security --once

  # 运行统一版，完整模式，使用生产环境配置，每30分钟运行一次
  node start-test-monitor.js --type=unified --mode=full --env=production --interval=30

  # 使用自定义配置文件
  node start-test-monitor.js --type=enhanced --config=./custom-config.json
`);
}

// 加载配置
function loadConfig(configPath, env) {
  let config = {};

  // 加载默认配置
  const defaultConfigPath = path.join(__dirname, 'test-monitor.config.json');
  if (fs.existsSync(defaultConfigPath)) {
    config = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf8'));
  }

  // 加载环境特定配置
  if (env && config.config && config.config.environments && config.config.environments[env]) {
    const envConfigPath = config.config.environments[env];
    if (fs.existsSync(envConfigPath)) {
      const envConfig = JSON.parse(fs.readFileSync(envConfigPath, 'utf8'));
      config = { ...config, ...envConfig };
    }
  }

  // 加载自定义配置
  if (configPath && fs.existsSync(configPath)) {
    const customConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config = { ...config, ...customConfig };
  }

  return config;
}

// 主函数
async function main() {
  try {
    // 设置默认值
    const monitorType = options.type || 'unified';
    const env = options.env || 'development';
    const configPath = options.config || path.join(__dirname, 'test-monitor.config.json');
    const mode = options.mode || 'full';

    // 加载配置
    const config = loadConfig(configPath, env);

    // 根据模式调整功能开关
    if (monitorType === 'unified' && mode) {
      switch (mode) {
        case 'security':
          config.features = {
            security: { enabled: true, pathValidation: true, signatureVerification: true },
            performance: { enabled: false, monitoring: false, thresholds: false },
            notifications: { enabled: false, all: false },
            reports: { enabled: true, html: false, json: true, history: false, export: false },
            config: { hotReload: false },
          };
          break;
        case 'performance':
          config.features = {
            security: { enabled: true, pathValidation: true, signatureVerification: false },
            performance: { enabled: true, monitoring: true, thresholds: true },
            notifications: { enabled: true, all: false },
            reports: { enabled: true, html: true, json: true, history: true, export: true },
            config: { hotReload: true },
          };
          break;
        case 'full':
        default:
          // 使用默认配置，启用所有功能
          break;
      }
    }

    // 设置环境
    if (env) {
      config.config = config.config || {};
      config.config.current = env;
    }

    // 覆盖测试命令（如果通过命令行参数提供）
    if (options.testCommand) {
      config.testCommand = options.testCommand;
    }

    // 选择监控器
    let Monitor;
    if (monitorType === 'secure') {
      Monitor = require('./test-monitor-improved-secure.js');
    } else if (monitorType === 'enhanced') {
      Monitor = require('./test-monitor-enhanced.js');
    } else if (monitorType === 'unified') {
      Monitor = require('./test-monitor.cjs').UnifiedTestMonitor;
    } else {
      throw new Error(
        `Invalid monitor type: ${monitorType}. Use 'secure', 'enhanced' or 'unified'.`,
      );
    }

    // 创建监控器实例
    const monitor = new Monitor(config);

    console.log(
      `Starting ${monitorType} Test Monitor with ${env} environment${monitorType === 'unified' && mode ? ` (${mode} mode)` : ''}...`,
    );

    if (options.once) {
      // 只运行一次
      const result = await monitor.run();

      // 如果测试失败，退出码为1
      if (!result.testResult.success) {
        process.exit(1);
      }
    } else {
      // 定时运行
      const intervalMinutes = options.intervalMinutes || 60;
      const intervalMs = intervalMinutes * 60 * 1000;

      console.log(`Running monitor with ${intervalMinutes} minute interval...`);

      // 立即运行一次
      await monitor.run();

      // 设置定时器
      const intervalId = setInterval(async () => {
        try {
          await monitor.run();
        } catch (error) {
          console.error('Monitor run failed:', error.message);
        }
      }, intervalMs);

      // 处理进程退出
      process.on('SIGINT', () => {
        console.log('\nReceived SIGINT, cleaning up...');
        clearInterval(intervalId);
        monitor.cleanup();
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        console.log('\nReceived SIGTERM, cleaning up...');
        clearInterval(intervalId);
        monitor.cleanup();
        process.exit(0);
      });

      // 保持进程运行
      process.stdin.resume();
    }
  } catch (error) {
    console.error('Failed to start Test Monitor:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本，执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
