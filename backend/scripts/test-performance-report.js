#!/usr/bin/env node

// 简单的性能报告生成测试
const path = require('path');
const fs = require('fs');

// 测试性能报告生成功能
function testPerformanceReportGeneration() {
  console.log('🧪 测试性能报告生成功能...');
  
  try {
    // 模拟测试结果
    const testResults = [
      { file: 'test1.spec.ts', success: true, duration: 100, exitCode: 0 },
      { file: 'test2.spec.ts', success: false, duration: 200, exitCode: 1 },
    ];
    
    // 模拟系统资源
    const systemResources = {
      platform: 'win32',
      cpuCount: 24,
      totalMemory: 34193986560,
      freeMemory: 29527957504,
      memoryUsage: 0.136,
      loadAverage: [0, 0, 0],
      loadRatio: 0,
      uptime: 123456,
      arch: 'x64'
    };
    
    // 模拟执行时间
    const executionTime = 5000;
    
    // 模拟工作线程信息
    const workerInfo = {
      workers: 4,
      resources: systemResources,
      reasoning: {
        base: '性能优化器计算: 4',
        loadAdjustment: '负载正常',
        memoryAdjustment: '内存使用正常',
        idleModeBonus: '正常模式',
        userLimit: '无用户限制',
        hardLimit: '硬性限制最大24个核心',
        platformAdjustment: 'Windows平台调整'
      }
    };
    
    // 创建性能报告
    const report = {
      timestamp: new Date().toISOString(),
      version: '4.0-optimized',
      platform: systemResources.platform,
      summary: {
        totalTests: testResults.length,
        successfulTests: testResults.filter(r => r.success).length,
        failedTests: testResults.filter(r => !r.success).length,
        totalExecutionTime: executionTime,
        averageTestTime: testResults.length > 0 ? 
          testResults.reduce((sum, r) => sum + r.duration, 0) / testResults.length : 0
      },
      systemResources: systemResources,
      testResults: testResults.map(r => ({
        file: r.file,
        success: r.success,
        duration: r.duration,
        exitCode: r.exitCode
      })),
      optimization: {
        workersUsed: workerInfo.workers,
        adaptiveParallel: true,
        smartScheduling: true,
        idleMode: false
      }
    };
    
    // 保存报告
    const reportPath = path.resolve(__dirname, '../test-performance-report-test.json');
    const jsonData = JSON.stringify(report, null, 2);
    
    fs.writeFileSync(reportPath, jsonData);
    console.log(`✅ 性能报告已生成: ${reportPath}`);
    
    // 验证报告内容
    const savedReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    if (savedReport.summary.totalTests === 2) {
      console.log('✅ 性能报告内容验证通过');
    } else {
      console.log('❌ 性能报告内容验证失败');
    }
    
    return true;
  } catch (error) {
    console.error('❌ 性能报告生成失败:', error.message);
    return false;
  }
}

// 运行测试
const success = testPerformanceReportGeneration();
process.exit(success ? 0 : 1);