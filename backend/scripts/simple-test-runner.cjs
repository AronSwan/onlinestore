const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Simple Test Runner');

// 获取参数
const args = process.argv.slice(2);
console.log('Arguments:', args);

// 构建基本的Jest命令
let command = 'npx jest --config=jest.config.js';

// 如果有参数，添加到命令中
if (args.length > 0) {
  // 检查是否是测试文件模式
  const lastArg = args[args.length - 1];
  if (!lastArg.startsWith('--')) {
    command += ` --testPathPattern="${lastArg}"`;
  }
  
  // 添加其他选项
  if (args.includes('--verbose') || args.includes('-v')) {
    command += ' --verbose';
  }
}

console.log('Command to execute:', command);
console.log('Working directory:', path.resolve(__dirname, '..'));

try {
  console.log('\n🚀 Running tests...\n');
  execSync(command, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });
  console.log('\n✅ Tests completed successfully\n');
} catch (error) {
  console.error('\n❌ Tests failed');
  console.error('Exit code:', error.status);
  process.exit(1);
}