/**
 * 安全性测试模块
 */
class SecurityTests {
  constructor(collector, executor, config) {
    this.collector = collector;
    this.executor = executor;
    this.config = config;
    this.category = '安全性测试';
  }

  async runTests() {
    const tests = [
      {
        name: '路径遍历攻击防护',
        args: ['--testPathPattern', '../../../etc/passwd'],
        expectSuccess: false
      },
      {
        name: '命令注入防护',
        args: ['--testNamePattern', '; rm -rf /'],
        expectSuccess: false
      },
      {
        name: '特殊字符过滤',
        args: ['--testPathPattern', '$(whoami)'],
        expectSuccess: false
      },
      {
        name: '反引号执行防护',
        args: ['--config', '`cat /etc/passwd`'],
        expectSuccess: false
      },
      {
        name: '管道操作防护',
        args: ['--testNamePattern', 'test | cat /etc/passwd'],
        expectSuccess: false
      },
      {
        name: '重定向攻击防护',
        args: ['--testPathPattern', 'test > /dev/null'],
        expectSuccess: false
      },
      {
        name: '环境变量注入防护',
        args: ['--testNamePattern', '$HOME'],
        expectSuccess: false
      },
      {
        name: 'Unicode控制字符防护',
        args: ['--testPathPattern', 'test\u0000null'],
        expectSuccess: false
      },
      {
        name: '长度限制测试',
        args: ['--testPathPattern', 'x'.repeat(10000)],
        expectSuccess: false
      },
      {
        name: 'SQL注入模式防护',
        args: ['--testNamePattern', "'; DROP TABLE users; --"],
        expectSuccess: false
      },
      {
        name: 'XSS模式防护',
        args: ['--testPathPattern', '<script>alert("xss")</script>'],
        expectSuccess: false
      },
      {
        name: '文件包含攻击防护',
        args: ['--config', '/etc/passwd'],
        expectSuccess: false
      },
      {
        name: '目录遍历防护',
        args: ['--testPathPattern', '..\\..\\..\\windows\\system32'],
        expectSuccess: false
      },
      {
        name: 'NULL字节注入防护',
        args: ['--testNamePattern', 'test\x00.exe'],
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
        ...test.args
      ], { timeout: 10000 });
      
      const duration = Date.now() - startTime;
      
      if (result.success === test.expectSuccess) {
        this.collector.addResult(this.category, test.name, 'PASS', { duration });
      } else {
        this.collector.addResult(this.category, test.name, 'FAIL', {
          duration,
          error: `安全检查失败: 期望 ${test.expectSuccess ? '成功' : '失败'}，实际 ${result.success ? '成功' : '失败'}`
        });
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // 对于安全测试，期望的错误是正常的
      if (!test.expectSuccess) {
        this.collector.addResult(this.category, test.name, 'PASS', { 
          duration,
          details: { blockedAttack: test.args.join(' ') }
        });
      } else {
        this.collector.addResult(this.category, test.name, 'FAIL', {
          duration,
          error: error.message
        });
      }
    }
  }
}

module.exports = SecurityTests;