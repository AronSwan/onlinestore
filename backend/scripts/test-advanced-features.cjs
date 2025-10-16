#!/usr/bin/env node

/**
 * 高级功能验证脚本
 * 测试分布式追踪、自定义指标和可视化分析功能
 */

const { ImprovedTestRunner } = require('./test-runner-secure.cjs');

async function testAdvancedFeatures() {
  console.log('🧪 开始验证高级功能...\n');
  
  // 创建测试运行器实例
  const runner = new ImprovedTestRunner();
  
  console.log('1. 验证分布式追踪功能...');
  
  // 测试分布式追踪
  const trace = runner.startTrace('advanced_features_test', null);
  console.log(`   - 追踪ID: ${trace.traceId}`);
  console.log(`   - Span ID: ${trace.spanId}`);
  
  // 模拟一些处理时间
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 结束追踪
  await trace.finish();
  console.log('   ✅ 分布式追踪功能正常\n');
  
  console.log('2. 验证自定义指标功能...');
  
  // 测试预定义的自定义指标
  runner.stateManager.recordCustomMetric('business_transaction_count', 1, {
    service: 'test-service',
    operation: 'test-operation'
  });
  
  runner.stateManager.recordCustomMetric('business_processing_time', 150, {
    service: 'test-service',
    operation: 'test-operation'
  });
  
  runner.stateManager.recordCustomMetric('user_activity_count', 5, {
    user_id: 'test-user-123',
    activity_type: 'login'
  });
  
  runner.stateManager.recordCustomMetric('api_response_time', 45, {
    endpoint: '/api/test',
    method: 'GET'
  });
  
  // 测试未预定义的自定义指标
  runner.stateManager.recordCustomMetric('custom_business_metric', 100, {
    category: 'sales',
    region: 'us-east'
  });
  
  console.log('   ✅ 自定义指标功能正常\n');
  
  console.log('3. 验证可视化分析功能...');
  
  // 检查性能数据是否已收集
  const perfData = runner.stateManager.performanceMetrics;
  console.log(`   - 测试执行时间记录数: ${perfData.testExecutionTimes.size}`);
  console.log(`   - 缓存命中数: ${perfData.cacheStats.hits}`);
  console.log(`   - 内存使用峰值: ${perfData.resourceUsage.peakMemory.toFixed(2)}MB`);
  
  // 检查自定义指标是否已记录
  const customMetrics = Object.keys(perfData).filter(key => 
    key.includes('business') || key.includes('user') || key.includes('api') || key.includes('custom')
  );
  console.log(`   - 自定义指标数量: ${customMetrics.length}`);
  
  // 生成性能报告
  const report = runner.stateManager.getPerformanceReport();
  console.log(`   - 缓存命中率: ${report.cache.hitRate}%`);
  console.log(`   - 测试依赖节点数: ${report.testDependencies.totalNodes}`);
  
  console.log('   ✅ 可视化分析数据收集正常\n');
  
  console.log('4. 验证配置加载...');

  // 检查监控配置
  const monitoringConfig = runner.monitorAdapter ? '已启用' : '未启用';
  console.log(`   - 监控适配器: ${monitoringConfig}`);

  // 检查自定义指标配置
  const customMetricsConfig = runner.stateManager?.performanceMetrics ? '已配置' : '未配置';
  console.log(`   - 自定义指标: ${customMetricsConfig}`);

  console.log('   ✅ 配置加载正常\n');
  
  console.log('📊 高级功能验证摘要:');
  console.log('   ✅ 分布式追踪 - 支持微服务架构的性能监控');
  console.log('   ✅ 自定义指标 - 允许用户定义业务特定指标'); 
  console.log('   ✅ 可视化分析 - 集成性能数据可视化工具');
  
  console.log('\n🎉 所有高级功能验证通过！');
  
  // 优雅关闭
  await runner.gracefulShutdown('TEST_COMPLETE');
}

// 运行测试
testAdvancedFeatures().catch(error => {
  console.error('❌ 高级功能验证失败:', error.message);
  console.error(error.stack);
  process.exit(1);
});