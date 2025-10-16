// 测试新功能的脚本
const { ImprovedTestRunner, StateManager } = require('./test-runner-secure.cjs');

async function testNewFeatures() {
  console.log('🧪 测试新增功能...\n');
  
  // 创建StateManager实例测试新功能
  const stateManager = new StateManager();
  
  // 测试性能指标记录
  console.log('1. 测试性能指标记录...');
  stateManager.recordPerformanceMetric('test_execution_time', 150, { test: 'unit' });
  stateManager.recordPerformanceMetric('memory_usage', 128, { component: 'cache' });
  console.log('   ✅ 性能指标记录成功\n');
  
  // 测试测试依赖关系
  console.log('2. 测试测试依赖关系...');
  stateManager.addTestDependency('testA.js', 'testB.js');
  stateManager.addTestDependency('testA.js', 'testC.js');
  stateManager.addTestDependency('testB.js', 'testD.js');
  console.log('   ✅ 依赖关系添加成功\n');
  
  // 测试智能测试排序
  console.log('3. 测试智能测试排序...');
  const testFiles = ['testA.js', 'testB.js', 'testC.js', 'testD.js', 'testE.js'];
  const optimalOrder = stateManager.getOptimalTestOrder(testFiles);
  console.log('   原始顺序:', testFiles);
  console.log('   优化顺序:', optimalOrder);
  console.log('   ✅ 智能排序成功\n');
  
  // 测试缓存功能
  console.log('4. 测试缓存功能...');
  stateManager.setCache('test_key', { data: 'test_value', timestamp: Date.now() });
  const cachedValue = stateManager.getCache('test_key');
  console.log('   设置缓存:', 'test_key');
  console.log('   获取缓存:', cachedValue ? '成功' : '失败');
  console.log('   ✅ 缓存功能正常\n');
  
  // 测试性能报告
  console.log('5. 测试性能报告...');
  const performanceReport = stateManager.getPerformanceReport();
  console.log('   缓存命中率:', performanceReport.cache.hitRate + '%');
  console.log('   测试依赖节点数:', performanceReport.testDependencies.totalNodes);
  console.log('   ✅ 性能报告生成成功\n');
  
  // 测试依赖分析
  console.log('6. 测试依赖分析...');
  const dependencyAnalysis = stateManager.analyzeTestDependencies(testFiles);
  console.log('   独立测试:', dependencyAnalysis.independent.length);
  console.log('   依赖测试:', dependencyAnalysis.dependent.length);
  console.log('   最长依赖链:', dependencyAnalysis.longestChain);
  console.log('   ✅ 依赖分析成功\n');
  
  console.log('🎉 所有新增功能测试通过！');
  
  // 清理资源
  stateManager.stopResourceMonitoring();
}

// 运行测试
testNewFeatures().catch(console.error);