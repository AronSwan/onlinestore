/**
 * 并发测试模块
 */
class ConcurrencyTests {
  constructor(collector, executor, config) {
    this.collector = collector;
    this.executor = executor;
    this.config = config;
    this.category = '并发测试';
  }

  async runTests() {
    await this.testConcurrentExecution();
    await this.testRaceConditions();
    await this.testResourceContention();
    await this.testDeadlockPrevention();
  }

  async testConcurrentExecution() {
    const testName = '并发执行测试';
    const startTime = Date.now();
    
    try {
      // 同时启动多个测试进程
      const promises = [];
      const concurrentCount = 3;
      
      for (let i = 0; i < concurrentCount; i++) {
        promises.push(
          this.executor.executeCommand('node', [
            this.config.TARGET_SCRIPT,
            '--unit',
            '--dry-run'
          ], { timeout: 30000 })
        );
      }
      
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      const successCount = results.filter(r => r.success).length;
      
      if (successCount === concurrentCount) {
        this.collector.addResult(this.category, testName, 'PASS', { 
          duration,
          metrics: { 
            concurrentCount,
            successCount,
            averageTime: duration / concurrentCount
          }
        });
      } else {
        this.collector.addResult(this.category, testName, 'FAIL', {
          duration,
          error: `并发执行失败: ${successCount}/${concurrentCount} 成功`,
          metrics: { concurrentCount, successCount }
        });
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.collector.addResult(this.category, testName, 'FAIL', {
        duration,
        error: error.message
      });
    }
  }

  async testRaceConditions() {
    const testName = '竞态条件测试';
    const startTime = Date.now();
    
    try {
      // 快速连续启动多个进程测试竞态条件
      const promises = [];
      const raceCount = 5;
      
      for (let i = 0; i < raceCount; i++) {
        // 不等待，立即启动下一个
        promises.push(
          this.executor.executeCommand('node', [
            this.config.TARGET_SCRIPT,
            '--coverage',
            '--dry-run'
          ], { timeout: 20000 })
        );
      }
      
      const results = await Promise.allSettled(promises);
      const duration = Date.now() - startTime;
      
      const successCount = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;
      
      // 至少应该有一半成功
      if (successCount >= Math.floor(raceCount / 2)) {
        this.collector.addResult(this.category, testName, 'PASS', { 
          duration,
          metrics: { 
            raceCount,
            successCount,
            failureCount: raceCount - successCount
          }
        });
      } else {
        this.collector.addResult(this.category, testName, 'WARN', {
          duration,
          error: `竞态条件处理不佳: ${successCount}/${raceCount} 成功`,
          metrics: { raceCount, successCount }
        });
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.collector.addResult(this.category, testName, 'FAIL', {
        duration,
        error: error.message
      });
    }
  }

  async testResourceContention() {
    const testName = '资源竞争测试';
    const startTime = Date.now();
    
    try {
      // 测试多个进程同时访问相同资源
      const promises = [];
      const contentionCount = 4;
      
      for (let i = 0; i < contentionCount; i++) {
        promises.push(
          this.executor.executeCommand('node', [
            this.config.TARGET_SCRIPT,
            '--integration',
            '--max-workers', '1', // 限制工作线程，增加资源竞争
            '--dry-run'
          ], { timeout: 25000 })
        );
      }
      
      const results = await Promise.allSettled(promises);
      const duration = Date.now() - startTime;
      
      const successCount = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;
      
      // 资源竞争情况下，期望大部分仍能成功
      if (successCount >= contentionCount - 1) {
        this.collector.addResult(this.category, testName, 'PASS', { 
          duration,
          metrics: { 
            contentionCount,
            successCount,
            resourceEfficiency: (successCount / contentionCount * 100).toFixed(2)
          }
        });
      } else {
        this.collector.addResult(this.category, testName, 'WARN', {
          duration,
          error: `资源竞争处理效果不佳: ${successCount}/${contentionCount} 成功`,
          metrics: { contentionCount, successCount }
        });
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.collector.addResult(this.category, testName, 'FAIL', {
        duration,
        error: error.message
      });
    }
  }

  async testDeadlockPrevention() {
    const testName = '死锁预防测试';
    const startTime = Date.now();
    
    try {
      // 创建可能导致死锁的场景
      const promise1 = this.executor.executeCommand('node', [
        this.config.TARGET_SCRIPT,
        '--watch', // 可能会持续运行
        '--dry-run'
      ], { timeout: 10000 }); // 较短超时
      
      const promise2 = this.executor.executeCommand('node', [
        this.config.TARGET_SCRIPT,
        '--parallel',
        '--dry-run'
      ], { timeout: 10000 });
      
      const results = await Promise.allSettled([promise1, promise2]);
      const duration = Date.now() - startTime;
      
      // 检查是否有进程超时（可能的死锁指示）
      const timeoutCount = results.filter(r => 
        r.status === 'rejected' && r.reason.message.includes('超时')
      ).length;
      
      if (timeoutCount === 0) {
        this.collector.addResult(this.category, testName, 'PASS', { 
          duration,
          metrics: { 
            processCount: 2,
            timeoutCount,
            deadlockFree: true
          }
        });
      } else {
        this.collector.addResult(this.category, testName, 'WARN', {
          duration,
          error: `检测到可能的死锁: ${timeoutCount} 个进程超时`,
          metrics: { processCount: 2, timeoutCount }
        });
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.collector.addResult(this.category, testName, 'FAIL', {
        duration,
        error: error.message
      });
    }
  }
}

module.exports = ConcurrencyTests;