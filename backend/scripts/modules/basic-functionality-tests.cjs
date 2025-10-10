/**
 * 基础功能测试模块
 */
class BasicFunctionalityTests {
  constructor(collector, executor, config) {
    this.collector = collector;
    this.executor = executor;
    this.config = config;
    this.category = '基础功能测试';
  }

  async runTests() {
    const tests = [
      {
        name: '帮助信息显示',
        args: ['--help'],
        expectSuccess: true
      },
      {
        name: '版本信息显示',
        args: ['--version'],
        expectSuccess: true
      },
      {
        name: '默认单元测试',
        args: ['--unit', '--dry-run'],
        expectSuccess: true
      },
      {
        name: '覆盖率测试',
        args: ['--coverage', '--dry-run'],
        expectSuccess: true
      },
      {
        name: '详细输出模式',
        args: ['--verbose', '--dry-run'],
        expectSuccess: true
      },
      {
        name: '静默模式',
        args: ['--silent', '--dry-run'],
        expectSuccess: true
      },
      {
        name: '集成测试模式',
        args: ['--integration', '--dry-run'],
        expectSuccess: true
      },
      {
        name: '端到端测试模式',
        args: ['--e2e', '--dry-run'],
        expectSuccess: true
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
        ...test.args
      ], { timeout: 30000 });
      
      const duration = Date.now() - startTime;
      
      if (result.success === test.expectSuccess) {
        this.collector.addResult(this.category, test.name, 'PASS', { 
          duration,
          details: { output: result.output?.substring(0, 200) }
        });
      } else {
        this.collector.addResult(this.category, test.name, 'FAIL', {
          duration,
          error: `期望 ${test.expectSuccess ? '成功' : '失败'}，实际 ${result.success ? '成功' : '失败'}`,
          details: { output: result.output?.substring(0, 200) }
        });
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.collector.addResult(this.category, test.name, 'FAIL', {
        duration,
        error: error.message
      });
    }
  }
}

module.exports = BasicFunctionalityTests;