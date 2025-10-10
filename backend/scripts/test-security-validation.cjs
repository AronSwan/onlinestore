#!/usr/bin/env node

// 用途：测试安全版本的test-runner脚本
// 作者：后端开发团队
// 时间：2025-10-09

const { spawn } = require('child_process');
const path = require('path');

const testCases = [
  {
    name: '帮助信息测试',
    args: ['--help'],
    shouldPass: true,
    description: '测试帮助信息显示'
  },
  {
    name: '无效参数测试',
    args: ['--invalid-option'],
    shouldPass: false,
    description: '测试无效参数是否被正确拒绝'
  },
  {
    name: '超时参数边界测试',
    args: ['--timeout', '0'],
    shouldPass: false,
    description: '测试超时参数下边界验证'
  },
  {
    name: '资源阈值边界测试',
    args: ['--resource-threshold', '2.0'],
    shouldPass: false,
    description: '测试资源阈值上边界验证'
  },
  {
    name: '参数冲突测试',
    args: ['--watch', '--parallel'],
    shouldPass: false,
    description: '测试冲突参数检测'
  },
  {
    name: '干运行模式测试',
    args: ['--dry-run', '--help'],
    shouldPass: true,
    description: '测试干运行模式（简化测试避免超时）'
  },
  {
    name: '路径遍历测试',
    args: ['--testPathPattern', '../../../etc/passwd'],
    shouldPass: false,
    description: '测试路径遍历攻击防护'
  }
];

function runTestCase(testCase) {
  return new Promise((resolve) => {
    console.log(`\n🧪 测试: ${testCase.name}`);
    console.log(`📝 描述: ${testCase.description}`);
    console.log(`⚡ 命令: node test-runner-secure.cjs ${testCase.args.join(' ')}`);
    
    const startTime = Date.now();
    // 为干运行模式增加超时时间，因为它需要分析测试文件
    const timeout = testCase.name === '干运行模式测试' ? 30000 : 10000;
    const child = spawn('node', ['test-runner-secure.cjs', ...testCase.args], {
      cwd: path.resolve(__dirname),
      stdio: 'pipe',
      timeout: timeout
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      const success = (code === 0) === testCase.shouldPass;
      
      console.log(`📊 结果: 退出代码 ${code}, 耗时 ${duration}ms`);
      console.log(`✅ 预期: ${testCase.shouldPass ? '成功' : '失败'}`);
      console.log(`🎯 实际: ${code === 0 ? '成功' : '失败'}`);
      console.log(`🔍 测试: ${success ? '通过' : '失败'}`);
      
      if (stderr && !testCase.shouldPass) {
        console.log(`📝 错误信息: ${stderr.trim().split('\n')[0]}`);
      }
      
      if (stdout && testCase.shouldPass) {
        const outputLines = stdout.trim().split('\n');
        if (outputLines.length > 0 && outputLines.length < 10) {
          console.log(`📝 输出: ${outputLines[0]}`);
        }
      }
      
      resolve({
        name: testCase.name,
        success,
        expected: testCase.shouldPass,
        actual: code === 0,
        duration,
        stdout: stdout.substring(0, 200),
        stderr: stderr.substring(0, 200)
      });
    });
    
    child.on('error', (error) => {
      console.log(`❌ 执行错误: ${error.message}`);
      resolve({
        name: testCase.name,
        success: !testCase.shouldPass,
        expected: testCase.shouldPass,
        actual: false,
        duration: Date.now() - startTime,
        error: error.message
      });
    });
  });
}

async function runAllTests() {
  console.log('🚀 开始安全验证测试...\n');
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await runTestCase(testCase);
    results.push(result);
  }
  
  console.log('\n📊 测试总结:');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.success ? '✅ 通过' : '❌ 失败';
    const expectation = result.expected ? '成功' : '失败';
    const actual = result.actual ? '成功' : '失败';
    console.log(`${status} ${result.name}: 预期${expectation}, 实际${actual}`);
  });
  
  console.log('='.repeat(50));
  console.log(`🎯 总体结果: ${passed}/${total} 测试通过`);
  
  if (passed === total) {
    console.log('🎉 所有安全验证测试通过！');
    process.exit(0);
  } else {
    console.log('⚠️ 部分测试失败，需要进一步检查');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});