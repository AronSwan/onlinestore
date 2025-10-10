const os = require('os');

/**
 * 边界条件测试模块
 */
class BoundaryConditionTests {
  constructor(collector, executor, config) {
    this.collector = collector;
    this.executor = executor;
    this.config = config;
    this.category = '边界条件测试';
  }

  async runTests() {
    const tests = [
      {
        name: '空参数列表',
        args: [],
        expectSuccess: true
      },
      {
        name: '超长参数',
        args: ['--testPathPattern', 'x'.repeat(1000)],
        expectSuccess: false
      },
      {
        name: '特殊字符参数',
        args: ['--testNamePattern', '测试中文字符'],
        expectSuccess: true
      },
      {
        name: '无效参数组合',
        args: ['--watch', '--parallel'],
        expectSuccess: false
      },
      {
        name: '超时边界值',
        args: ['--timeout', '1'],
        expectSuccess: true
      },
      {
        name: '超时超出范围',
        args: ['--timeout', '999999'],
        expectSuccess: false
      },
      {
        name: '最大工作线程数',
        args: ['--max-workers', String(os.cpus().length * 2)],
        expectSuccess: true
      },
      {
        name: '工作线程数超出范围',
        args: ['--max-workers', '999'],
        expectSuccess: false
      },
      {
        name: '资源阈值边界',
        args: ['--resource-threshold', '0.1'],
        expectSuccess: true
      },
      {
        name: '资源阈值超出范围',
        args: ['--resource-threshold', '2.0'],
        expectSuccess: false
      },
      {
        name: '零值测试',
        args: ['--timeout', '0'],
        expectSuccess: false
      },
      {
        name: '负数测试',
        args: ['--max-workers', '-1'],
        expectSuccess: false
      },
      {
        name: '浮点数边界',
        args: ['--resource-threshold', '0.999999'],
        expectSuccess: true
      },
      {
        name: '极小值测试',
        args: ['--timeout', '0.001'],
        expectSuccess: false
      }
    ];
    
    for (const test of tests) {
      await this.runSingleTest(test);
    }
  }

  async runSingleTest(test) {
    const startTime = Date.now();
    
    try {
      const result = await this.executor.executeCommand('node', [
        this.config.TARGET_SCRIPT,
        ...test.args,
        '--dry-run'
      ], { timeout: 15000 });
      
      const duration = Date.now() - startTime;
      
      if (result.success === test.expectSuccess) {
        this.collector.addResult(this.category, test.name, 'PASS', { duration });
      } else {
        this.collector.addResult(this.category, test.name, 'FAIL', {
          duration,
          error: `期望 ${test.expectSuccess ? '成功' : '失败'}，实际 ${result.success ? '成功' : '失败'}`
        });
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // 对于期望失败的测试，超时或错误可能是正常的
      if (!test.expectSuccess && (error.message.includes('超时') || error.message.includes('失败'))) {
        this.collector.addResult(this.category, test.name, 'PASS', { duration });
      } else {
        this.collector.addResult(this.category, test.name, 'FAIL', {
          duration,
          error: error.message
        });
      }
    }
  }
}

module.exports = BoundaryConditionTests;