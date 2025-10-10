#!/usr/bin/env node

/**
 * test-runner-secure.cjs 验证测试套件
 * 针对改进版本的专门验证测试
 */

const { ImprovedTestRunner, StateManager, ParameterValidator, SecureCommandExecutor } = require('./test-runner-secure.improved.cjs');
const fs = require('fs');
const path = require('path');

class ValidationTestSuite {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }
  
  async runAllTests() {
    console.log('🧪 开始验证测试套件...\n');
    
    // 测试类别
    await this.testParameterValidation();
    await this.testStateManager();
    await this.testSecureCommandExecutor();
    await this.testErrorRecovery();
    await this.testConcurrencyHandling();
    await this.testResourceManagement();
    await this.testBoundaryConditions();
    
    this.generateReport();
  }
  
  async testParameterValidation() {
    console.log('📋 测试参数验证器...');
    
    // 正常参数测试
    this.test('正常参数验证', () => {
      const validArgs = ['--coverage', '--verbose', 'unit'];
      return ParameterValidator.validate(validArgs);
    });
    
    // 边界条件测试
    this.test('参数长度边界', () => {
      const longArg = '--testPathPattern=' + 'x'.repeat(1980); // 确保在限制内
      return ParameterValidator.validate([longArg]);
    });
    
    this.test('参数长度超限检测', () => {
      const tooLongArg = '--testPathPattern=' + 'x'.repeat(2001);
      try {
        ParameterValidator.validate([tooLongArg]);
        return false;
      } catch (error) {
        return error.message.includes('长度超出限制');
      }
    });
    
    // 危险模式检测
    this.test('命令注入防护', () => {
      try {
        ParameterValidator.validate(['--testNamePattern=test; rm -rf /']);
        return false;
      } catch (error) {
        return error.message.includes('危险模式');
      }
    });
    
    this.test('路径遍历防护', () => {
      try {
        ParameterValidator.validate(['--testPathPattern=../../../etc/passwd']);
        return false;
      } catch (error) {
        return error.message.includes('危险模式');
      }
    });
    
    // 数值边界测试
    this.test('超时值边界检查', () => {
      try {
        ParameterValidator.validate(['--timeout=3600001']); // 超出范围
        return false;
      } catch (error) {
        return error.message.includes('超出范围');
      }
    });
    
    this.test('工作线程数边界检查', () => {
      try {
        ParameterValidator.validate(['--maxWorkers=999']); // 超出范围
        return false;
      } catch (error) {
        return error.message.includes('超出范围');
      }
    });
    
    // 参数冲突检测
    this.test('冲突参数检测', () => {
      try {
        ParameterValidator.validate(['--silent', '--verbose']);
        return false;
      } catch (error) {
        return error.message.includes('冲突');
      }
    });
  }
  
  async testStateManager() {
    console.log('🔧 测试状态管理器...');
    
    const stateManager = new StateManager();
    
    // 命令频率限制测试
    this.test('命令频率限制正常情况', () => {
      const result = stateManager.checkCommandRate('node test.js');
      return result.allowed === true;
    });
    
    // 进程锁测试
    this.test('进程锁获取', () => {
      const lockId = 'test-lock-' + Date.now();
      const acquired = stateManager.acquireLock(lockId);
      stateManager.releaseLock(lockId);
      return acquired === true;
    });
    
    this.test('进程锁冲突检测', () => {
      const lockId = 'test-lock-conflict';
      const first = stateManager.acquireLock(lockId);
      const second = stateManager.acquireLock(lockId);
      stateManager.releaseLock(lockId);
      return first === true && second === false;
    });
    
    // 资源监控测试
    this.test('资源监控启动', () => {
      stateManager.startResourceMonitoring();
      const hasMonitor = stateManager.resourceMonitor !== null;
      stateManager.stopResourceMonitoring();
      return hasMonitor;
    });
  }
  
  async testSecureCommandExecutor() {
    console.log('🛡️ 测试安全命令执行器...');
    
    const stateManager = new StateManager();
    const executor = new SecureCommandExecutor(stateManager);
    
    // 基本命令执行测试
    this.test('基本命令执行', async () => {
      try {
        const result = await executor.executeCommand('node', ['--version'], { silent: true });
        return result.success === true;
      } catch (error) {
        return false;
      }
    });
    
    // 参数验证集成测试
    this.test('危险命令拒绝', async () => {
      try {
        await executor.executeCommand('node', ['--eval', 'process.exit(1)'], { silent: true });
        return false;
      } catch (error) {
        return error.message.includes('危险模式');
      }
    });
  }
  
  async testErrorRecovery() {
    console.log('🔄 测试错误恢复机制...');
    
    const stateManager = new StateManager();
    const errorRecovery = stateManager.errorRecovery;
    
    this.test('错误恢复策略设置', () => {
      return errorRecovery.recoveryStrategies.has('COMMAND_FAILED');
    });
    
    this.test('清理功能', async () => {
      try {
        await errorRecovery.performCleanup();
        return true;
      } catch (error) {
        return false;
      }
    });
  }
  
  async testConcurrencyHandling() {
    console.log('⚡ 测试并发处理...');
    
    const stateManager = new StateManager();
    
    // 并发锁测试
    this.test('并发锁管理', () => {
      const promises = [];
      let successCount = 0;
      
      for (let i = 0; i < 5; i++) {
        promises.push(new Promise(resolve => {
          if (stateManager.acquireLock('concurrent-test')) {
            successCount++;
            setTimeout(() => {
              stateManager.releaseLock('concurrent-test');
              resolve();
            }, 10);
          } else {
            resolve();
          }
        }));
      }
      
      return Promise.all(promises).then(() => successCount === 1);
    });
  }
  
  async testResourceManagement() {
    console.log('💾 测试资源管理...');
    
    const stateManager = new StateManager();
    
    this.test('历史记录清理', () => {
      // 添加一些历史记录
      stateManager.commandHistory.set('test-cmd', [Date.now() - 20000]);
      stateManager.cleanupHistory();
      return !stateManager.commandHistory.has('test-cmd');
    });
  }
  
  async testBoundaryConditions() {
    console.log('🎯 测试边界条件...');
    
    // 空参数测试
    this.test('空参数数组', () => {
      try {
        return ParameterValidator.validate([]);
      } catch (error) {
        return false;
      }
    });
    
    // 最大参数数量测试
    this.test('最大参数数量', () => {
      const maxArgs = new Array(50).fill('--verbose');
      try {
        return ParameterValidator.validate(maxArgs);
      } catch (error) {
        return false;
      }
    });
    
    this.test('超出最大参数数量', () => {
      const tooManyArgs = new Array(51).fill('--verbose');
      try {
        ParameterValidator.validate(tooManyArgs);
        return false;
      } catch (error) {
        return error.message.includes('参数数量超出限制');
      }
    });
  }
  
  test(name, testFn) {
    try {
      const startTime = Date.now();
      const result = testFn();
      
      if (result instanceof Promise) {
        return result.then(actualResult => {
          const duration = Date.now() - startTime;
          this.recordResult(name, actualResult, null, duration);
          return actualResult;
        }).catch(error => {
          const duration = Date.now() - startTime;
          this.recordResult(name, false, error, duration);
          return false;
        });
      } else {
        const duration = Date.now() - startTime;
        this.recordResult(name, result, null, duration);
        return result;
      }
    } catch (error) {
      this.recordResult(name, false, error, 0);
      return false;
    }
  }
  
  recordResult(name, success, error, duration) {
    const status = success ? '✅' : '❌';
    console.log(`  ${status} ${name} (${duration}ms)`);
    
    this.results.push({
      name,
      success,
      error: error ? error.message : null,
      duration
    });
  }
  
  generateReport() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n📊 验证测试报告');
    console.log('='.repeat(50));
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过: ${passedTests} (${(passedTests/totalTests*100).toFixed(1)}%)`);
    console.log(`失败: ${failedTests} (${(failedTests/totalTests*100).toFixed(1)}%)`);
    console.log(`总耗时: ${totalDuration}ms`);
    
    if (failedTests > 0) {
      console.log('\n❌ 失败的测试:');
      this.results.filter(r => !r.success).forEach(result => {
        console.log(`  - ${result.name}: ${result.error}`);
      });
    }
    
    // 保存详细报告
    const reportPath = path.join(__dirname, 'validation-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        passRate: (passedTests/totalTests*100).toFixed(1),
        duration: totalDuration
      },
      results: this.results,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log(`\n📄 详细报告已保存到: ${reportPath}`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 所有验证测试通过！改进版本健壮性良好。');
    } else {
      console.log('\n⚠️ 部分测试失败，需要进一步改进。');
    }
  }
}

// 主入口
if (require.main === module) {
  const suite = new ValidationTestSuite();
  suite.runAllTests().catch(error => {
    console.error('验证测试失败:', error);
    process.exit(1);
  });
}

module.exports = ValidationTestSuite;