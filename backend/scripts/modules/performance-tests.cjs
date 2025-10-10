/**
 * 性能测试模块
 */
class PerformanceTests {
  constructor(collector, executor, config) {
    this.collector = collector;
    this.executor = executor;
    this.config = config;
    this.category = '性能测试';
  }

  async runTests() {
    await this.testExecutionSpeed();
    await this.testMemoryUsage();
    await this.testCpuUsage();
    await this.testLargeFileHandling();
    await this.testManyFilesHandling();
  }

  async testExecutionSpeed() {
    const testName = '执行速度测试';
    const startTime = Date.now();
    
    try {
      const result = await this.executor.executeCommand('node', [
        this.config.TARGET_SCRIPT,
        '--unit',
        '--dry-run'
      ], { timeout: 30000 });
      
      const duration = Date.now() - startTime;
      
      // 期望在5秒内完成
      if (duration < 5000 && result.success) {
        this.collector.addResult(this.category, testName, 'PASS', { 
          duration,
          metrics: { executionTime: duration }
        });
      } else if (duration >= 5000) {
        this.collector.addResult(this.category, testName, 'WARN', {
          duration,
          error: `执行时间过长: ${duration}ms`,
          metrics: { executionTime: duration }
        });
      } else {
        this.collector.addResult(this.category, testName, 'FAIL', {
          duration,
          error: '执行失败',
          metrics: { executionTime: duration }
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

  async testMemoryUsage() {
    const testName = '内存使用测试';
    const startTime = Date.now();
    const initialMemory = process.memoryUsage().heapUsed;
    
    try {
      const result = await this.executor.executeCommand('node', [
        this.config.TARGET_SCRIPT,
        '--coverage',
        '--dry-run'
      ], { timeout: 30000 });
      
      const duration = Date.now() - startTime;
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryDelta = finalMemory - initialMemory;
      
      // 期望内存增长不超过100MB
      if (memoryDelta < 100 * 1024 * 1024 && result.success) {
        this.collector.addResult(this.category, testName, 'PASS', { 
          duration,
          metrics: { 
            memoryDelta: memoryDelta,
            memoryDeltaMB: (memoryDelta / 1024 / 1024).toFixed(2)
          }
        });
      } else if (memoryDelta >= 100 * 1024 * 1024) {
        this.collector.addResult(this.category, testName, 'WARN', {
          duration,
          error: `内存使用过多: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`,
          metrics: { 
            memoryDelta: memoryDelta,
            memoryDeltaMB: (memoryDelta / 1024 / 1024).toFixed(2)
          }
        });
      } else {
        this.collector.addResult(this.category, testName, 'FAIL', {
          duration,
          error: '执行失败'
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

  async testCpuUsage() {
    const testName = 'CPU使用测试';
    const startTime = Date.now();
    const initialCpu = process.cpuUsage();
    
    try {
      const result = await this.executor.executeCommand('node', [
        this.config.TARGET_SCRIPT,
        '--integration',
        '--dry-run'
      ], { timeout: 30000 });
      
      const duration = Date.now() - startTime;
      const finalCpu = process.cpuUsage(initialCpu);
      const totalCpuTime = finalCpu.user + finalCpu.system;
      
      // CPU时间不应超过实际时间的2倍（考虑多核）
      if (totalCpuTime < duration * 2000 && result.success) { // 转换为微秒
        this.collector.addResult(this.category, testName, 'PASS', { 
          duration,
          metrics: { 
            cpuTime: totalCpuTime,
            cpuTimeMs: (totalCpuTime / 1000).toFixed(2)
          }
        });
      } else {
        this.collector.addResult(this.category, testName, 'WARN', {
          duration,
          error: `CPU使用时间: ${(totalCpuTime / 1000).toFixed(2)}ms`,
          metrics: { 
            cpuTime: totalCpuTime,
            cpuTimeMs: (totalCpuTime / 1000).toFixed(2)
          }
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

  async testLargeFileHandling() {
    const testName = '大文件处理测试';
    const startTime = Date.now();
    
    try {
      // 使用一个较大的测试路径模式
      const largePattern = 'test'.repeat(100);
      
      const result = await this.executor.executeCommand('node', [
        this.config.TARGET_SCRIPT,
        '--testPathPattern', largePattern,
        '--dry-run'
      ], { timeout: 30000 });
      
      const duration = Date.now() - startTime;
      
      if (result.success) {
        this.collector.addResult(this.category, testName, 'PASS', { duration });
      } else {
        this.collector.addResult(this.category, testName, 'FAIL', {
          duration,
          error: '大文件处理失败'
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

  async testManyFilesHandling() {
    const testName = '多文件处理测试';
    const startTime = Date.now();
    
    try {
      // 测试处理多个文件模式
      const result = await this.executor.executeCommand('node', [
        this.config.TARGET_SCRIPT,
        '--testPathPattern', '**/*.{js,ts,jsx,tsx,spec.js,test.js}',
        '--dry-run'
      ], { timeout: 45000 });
      
      const duration = Date.now() - startTime;
      
      if (result.success) {
        this.collector.addResult(this.category, testName, 'PASS', { duration });
      } else {
        this.collector.addResult(this.category, testName, 'FAIL', {
          duration,
          error: '多文件处理失败'
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

module.exports = PerformanceTests;