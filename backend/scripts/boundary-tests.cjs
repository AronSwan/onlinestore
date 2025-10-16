#!/usr/bin/env node

/**
 * 边界条件测试套件 - 全面的边界情况测试
 */

const ErrorManager = require('./error-manager.cjs');
const MemoryMonitor = require('./memory-monitor.cjs');
const { StandardError, ErrorTypes, ErrorSeverity } = require('./error-handler.cjs');

class BoundaryTestSuite {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose || false,
      stopOnFailure: options.stopOnFailure || false,
      timeout: options.timeout || 30000,
      ...options
    };
    
    this.errorManager = new ErrorManager();
    this.memoryMonitor = new MemoryMonitor();
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
  }
  
  /**
   * 运行所有边界测试
   */
  async runAllTests() {
    console.log('🧪 开始边界条件测试...\n');
    
    const testSuites = [
      { name: '内存边界测试', tests: this.getMemoryBoundaryTests() },
      { name: '参数边界测试', tests: this.getParameterBoundaryTests() },
      { name: '并发边界测试', tests: this.getConcurrencyBoundaryTests() },
      { name: '错误处理边界测试', tests: this.getErrorHandlingBoundaryTests() }
    ];
    
    for (const suite of testSuites) {
      await this.runTestSuite(suite.name, suite.tests);
    }
    
    this.printSummary();
    return this.testResults;
  }
  
  /**
   * 运行测试套件
   */
  async runTestSuite(suiteName, tests) {
    console.log(`📋 ${suiteName}`);
    console.log('─'.repeat(50));
    
    for (const test of tests) {
      await this.runSingleTest(test);
    }
    
    console.log('');
  }
  
  /**
   * 运行单个测试
   */
  async runSingleTest(test) {
    this.testResults.total++;
    
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), this.options.timeout);
      });
      
      await Promise.race([test.fn(), timeoutPromise]);
      
      this.testResults.passed++;
      console.log(`  ✅ ${test.name}`);
      
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({
        testName: test.name,
        error: error.message,
        stack: error.stack
      });
      
      console.log(`  ❌ ${test.name}: ${error.message}`);
      
      if (this.options.stopOnFailure) {
        throw error;
      }
    }
  }
  
  /**
   * 获取内存边界测试
   */
  getMemoryBoundaryTests() {
    return [
      {
        name: '内存监控器初始化',
        fn: async () => {
          const monitor = new MemoryMonitor();
          if (!monitor.startMonitoring()) {
            throw new Error('Failed to start memory monitoring');
          }
          monitor.stopMonitoring();
        }
      },
      {
        name: '内存阈值触发测试',
        fn: async () => {
          const monitor = new MemoryMonitor({
            maxMemoryMB: 1,
            cleanupThresholdMB: 0.5
          });
          
          const memorySnapshot = {
            timestamp: Date.now(),
            heapUsed: 2,
            heapTotal: 3,
            rss: 4
          };
          
          monitor.handleMemoryThresholds(memorySnapshot);
        }
      }
    ];
  }
  
  /**
   * 获取参数边界测试
   */
  getParameterBoundaryTests() {
    return [
      {
        name: '空参数测试',
        fn: async () => {
          const error = new StandardError('', ErrorTypes.VALIDATION_ERROR);
          if (error.message !== '') {
            throw new Error('Empty string not handled correctly');
          }
        }
      },
      {
        name: '极大参数测试',
        fn: async () => {
          const largeString = 'x'.repeat(10000);
          const error = new StandardError(largeString, ErrorTypes.VALIDATION_ERROR);
          
          if (error.message.length !== 10000) {
            throw new Error('Large parameter handling failed');
          }
        }
      }
    ];
  }
  
  /**
   * 获取并发边界测试
   */
  getConcurrencyBoundaryTests() {
    return [
      {
        name: '高并发错误处理',
        fn: async () => {
          const errorManager = new ErrorManager();
          const promises = [];
          
          for (let i = 0; i < 50; i++) {
            promises.push(
              errorManager.handleError(new Error(`Concurrent error ${i}`))
            );
          }
          
          const results = await Promise.allSettled(promises);
          const failed = results.filter(r => r.status === 'rejected');
          
          if (failed.length > 0) {
            throw new Error(`${failed.length} concurrent operations failed`);
          }
        }
      }
    ];
  }
  
  /**
   * 获取错误处理边界测试
   */
  getErrorHandlingBoundaryTests() {
    return [
      {
        name: '错误分类测试',
        fn: async () => {
          const errorManager = new ErrorManager();
          
          const testCases = [
            { message: 'memory error', expectedType: ErrorTypes.MEMORY_ERROR },
            { message: 'timeout occurred', expectedType: ErrorTypes.COMMAND_TIMEOUT },
            { message: 'validation failed', expectedType: ErrorTypes.VALIDATION_ERROR },
            { message: 'permission denied', expectedType: ErrorTypes.PERMISSION_DENIED }
          ];
          
          for (const testCase of testCases) {
            const error = new Error(testCase.message);
            const standardError = errorManager.standardizeError(error);
            
            if (standardError.type !== testCase.expectedType) {
              throw new Error(`Error classification failed for: ${testCase.message}`);
            }
          }
        }
      }
    ];
  }
  
  /**
   * 打印测试摘要
   */
  printSummary() {
    console.log('📊 测试结果摘要');
    console.log('═'.repeat(50));
    console.log(`总测试数: ${this.testResults.total}`);
    console.log(`通过: ${this.testResults.passed}`);
    console.log(`失败: ${this.testResults.failed}`);
    console.log(`跳过: ${this.testResults.skipped}`);
    
    if (this.testResults.failed > 0) {
      console.log('\n❌ 失败的测试:');
      this.testResults.errors.forEach(error => {
        console.log(`  - ${error.testName}: ${error.error}`);
      });
    }
    
    const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(2);
    console.log(`\n成功率: ${successRate}%`);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const suite = new BoundaryTestSuite({ verbose: true });
  suite.runAllTests().catch(console.error);
}

module.exports = BoundaryTestSuite;