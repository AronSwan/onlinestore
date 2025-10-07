#!/usr/bin/env node

// 用途：测试运行脚本
// 依赖文件：package.json, jest.config.js
// 作者：后端开发团队
// 时间：2025-10-02 00:00:00

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// CommonJS中的 __dirname 直接可用

// 解析命令行参数
const args = process.argv.slice(2);
const options = {
  coverage: false,
  watch: false,
  e2e: false,
  unit: false,
  component: false,
  integration: false,
  verbose: false,
  testPathPattern: undefined,
  updateSnapshot: false,
};

// 解析参数
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--coverage':
    case '-c':
      options.coverage = true;
      break;
    case '--watch':
    case '-w':
      options.watch = true;
      break;
    case '--e2e':
      options.e2e = true;
      break;
    case '--unit':
    case '-u':
      options.unit = true;
      break;
    case '--component':
      options.component = true;
      break;
    case '--integration':
    case '-i':
      options.integration = true;
      break;
    case '--verbose':
    case '-v':
      options.verbose = true;
      break;
    case '--updateSnapshot':
      options.updateSnapshot = true;
      break;
    case '--help':
    case '-h':
      showHelp();
      process.exit(0);
      break;
    default:
      if (arg.startsWith('--')) {
        console.error(`❌ 未知参数: ${arg}`);
        console.error('使用 --help 查看可用选项');
        process.exit(1);
      } else {
        // 假设是测试路径模式，验证输入
        if (arg.trim().length === 0) {
          console.error('❌ 测试路径模式不能为空');
          process.exit(1);
        }
        options.testPathPattern = arg;
      }
  }
}

// 如果没有指定测试类型，默认运行单元测试
if (!options.unit && !options.e2e && !options.component && !options.integration) {
  options.unit = true;
}

function showHelp() {
  console.log(`
测试运行脚本

用法: node scripts/test-runner.js [选项] [测试路径模式]

选项:
  -c, --coverage        生成测试覆盖率报告
  -w, --watch           监视模式运行测试
  -u, --unit            运行单元测试 (默认)
  -e, --e2e             运行端到端测试
      --component       运行组件测试
  -i, --integration     运行集成测试
  -v, --verbose         详细输出
      --updateSnapshot  更新快照
  -h, --help            显示帮助信息

示例:
  node scripts/test-runner.js                    # 运行单元测试
  node scripts/test-runner.js --coverage          # 运行单元测试并生成覆盖率报告
  node scripts/test-runner.js --e2e               # 运行端到端测试
  node scripts/test-runner.js --unit --watch      # 监视模式运行单元测试
  node scripts/test-runner.js --integration       # 运行集成测试
  node scripts/test-runner.js auth.service.spec   # 运行特定测试文件
`);
}

function buildJestCommand(testType) {
  let command = 'npx jest';
  const configOptions = [];

  // 根据测试类型设置配置
  switch (testType) {
    case 'e2e':
      configOptions.push('--config=test/jest-e2e.json');
      break;
    case 'component':
      configOptions.push('--config=jest.config.cjs');
      configOptions.push('--testPathPatterns=".*\\.component\\.spec\\.ts$"');
      break;
    case 'integration':
      configOptions.push('--config=jest.config.cjs');
      configOptions.push('--testPathPatterns=".*\\.integration\\.spec\\.ts$"');
      break;
    case 'unit':
    default:
      configOptions.push('--config=jest.config.cjs');
      configOptions.push('--testPathPatterns=".*\\.(spec|test)\\.ts$"');
      configOptions.push('--testPathIgnorePatterns=".*\\.e2e-spec\\.ts$"');
      break;
  }

  // 添加通用选项
  if (options.coverage) {
    configOptions.push('--coverage');
  }

  if (options.watch) {
    configOptions.push('--watch');
  }

  if (options.verbose) {
    configOptions.push('--verbose');
  }

  if (options.updateSnapshot) {
    configOptions.push('--updateSnapshot');
  }

  if (options.testPathPattern) {
    // 确保测试路径模式被正确引用
    configOptions.push(`--testPathPatterns="${options.testPathPattern}"`);
  }

  // 组合命令
  if (configOptions.length > 0) {
    command += ' ' + configOptions.join(' ');
  }

  return command;
}

function runCommand(command, description) {
  console.log(`\n🚀 ${description}`);
  console.log(`执行命令: ${command}\n`);
  
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..')
    });
    console.log(`\n✅ ${description} 完成\n`);
    return true;
  } catch (error) {
    console.error(`\n❌ ${description} 失败`);
    if (error.status) {
      console.error(`退出代码: ${error.status}`);
    }
    if (error.signal) {
      console.error(`信号: ${error.signal}`);
    }
    if (error.stderr) {
      console.error(`错误输出: ${error.stderr}`);
    }
    console.error('');
    return false;
  }
}

// 环境检查函数
function checkEnvironment() {
  const backendDir = path.resolve(__dirname, '..');
  
  // 检查package.json
  const packageJsonPath = path.join(backendDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ 未找到 package.json 文件');
    return false;
  }
  
  // 检查jest配置
  const jestConfigPath = path.join(backendDir, 'jest.config.cjs');
  if (!fs.existsSync(jestConfigPath)) {
    console.error('❌ 未找到 jest.config.cjs 文件');
    return false;
  }
  
  // 检查e2e配置（如果需要运行e2e测试）
  if (options.e2e) {
    const e2eConfigPath = path.join(backendDir, 'test', 'jest-e2e.json');
    if (!fs.existsSync(e2eConfigPath)) {
      console.error('❌ 未找到 test/jest-e2e.json 文件');
      return false;
    }
  }
  
  return true;
}

// 主函数
function main() {
  console.log('🧪 开始运行测试...\n');
  
  // 环境检查
  console.log('🔍 开始环境检查...');
  if (!checkEnvironment()) {
    console.error('❌ 环境检查失败，无法继续执行测试');
    process.exit(1);
  }
  console.log('✅ 环境检查通过');

  const testTypes = [];
  if (options.unit) testTypes.push('unit');
  if (options.component) testTypes.push('component');
  if (options.integration) testTypes.push('integration');
  if (options.e2e) testTypes.push('e2e');

  let allPassed = true;

  // 按顺序运行不同类型的测试
  const startTime = Date.now();
  
  for (const testType of testTypes) {
    const command = buildJestCommand(testType);
    let description = '';

    switch (testType) {
      case 'unit':
        description = '运行单元测试';
        break;
      case 'component':
        description = '运行组件测试';
        break;
      case 'integration':
        description = '运行集成测试';
        break;
      case 'e2e':
        description = '运行端到端测试';
        break;
    }

    const testStartTime = Date.now();
    const passed = runCommand(command, description);
    const testDuration = Date.now() - testStartTime;
    
    console.log(`⏱️  ${description} 耗时: ${(testDuration / 1000).toFixed(2)}秒`);
    
    if (!passed) {
      allPassed = false;
      
      // 如果不是监视模式，测试失败则停止
      if (!options.watch) {
        console.log('💥 测试失败，停止执行');
        process.exit(1);
      }
    }
  }
  
  const totalDuration = Date.now() - startTime;

  if (allPassed) {
    console.log(`🎉 所有测试通过！总耗时: ${(totalDuration / 1000).toFixed(2)}秒`);
  } else {
    console.log(`⚠️ 部分测试失败，总耗时: ${(totalDuration / 1000).toFixed(2)}秒`);
    if (!options.watch) {
      process.exit(1);
    }
  }
}

// 运行主函数
main();