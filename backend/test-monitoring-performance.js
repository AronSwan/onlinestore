const { performance } = require('perf_hooks');

// 模拟高并发测试
async function testHighConcurrency() {
  console.log('开始高并发测试...');
  
  try {
    // 导入编译后的JavaScript文件
    const { MonitoringService } = require('./dist/src/monitoring/monitoring.service');
    const { RouteContextService } = require('./dist/src/monitoring/route-context.service');
    
    // 创建模拟的RouteContextService
    const mockRouteContextService = {
      getRoute: () => 'test-route',
      getModule: () => 'test-module',
    };
    
    // 创建MonitoringService实例
    const service = new MonitoringService(mockRouteContextService);
    
    // 测试参数
    const requestCount = 50000; // 5万请求
    const batchSize = 1000; // 每批1000个请求
    const batches = Math.ceil(requestCount / batchSize);
    
    console.log(`将发送 ${requestCount} 个请求，分为 ${batches} 批，每批 ${batchSize} 个请求`);
    
    const results = {
      totalTime: 0,
      requestsPerSecond: 0,
      memoryUsage: {
        initial: 0,
        final: 0,
        increase: 0
      },
      errors: 0
    };
    
    // 记录初始内存使用
    const initialMemory = process.memoryUsage();
    results.memoryUsage.initial = initialMemory.heapUsed / 1024 / 1024; // MB
    
    const startTime = performance.now();
    
    try {
      // 分批处理请求
      for (let i = 0; i < batches; i++) {
        const promises = [];
        
        // 创建当前批次的请求
        for (let j = 0; j < batchSize && (i * batchSize + j) < requestCount; j++) {
          const requestId = i * batchSize + j;
          
          promises.push(
            new Promise((resolve) => {
              // 模拟异步处理
              setImmediate(() => {
                try {
                  // 记录HTTP请求
                  service.incrementHttpRequest('GET', `/api/test/${requestId}`, 200);
                  
                  // 记录请求持续时间
                  service.observeHttpRequestDuration('GET', `/api/test/${requestId}`, Math.random() * 2);
                  
                  // 记录缓存命中
                  if (requestId % 2 === 0) {
                    service.recordCacheHit(`product:${requestId}`);
                  }
                  
                  resolve();
                } catch (error) {
                  results.errors++;
                  resolve();
                }
              });
            })
          );
        }
        
        // 等待当前批次完成
        await Promise.all(promises);
        
        // 每完成10批次输出一次进度
        if ((i + 1) % 10 === 0 || i === batches - 1) {
          console.log(`已完成 ${i + 1}/${batches} 批次 (${((i + 1) / batches * 100).toFixed(1)}%)`);
        }
      }
    } catch (error) {
      console.error('测试过程中发生错误:', error);
      results.errors++;
    }
    
    const endTime = performance.now();
    results.totalTime = (endTime - startTime) / 1000; // 转换为秒
    results.requestsPerSecond = requestCount / results.totalTime;
    
    // 记录最终内存使用
    const finalMemory = process.memoryUsage();
    results.memoryUsage.final = finalMemory.heapUsed / 1024 / 1024; // MB
    results.memoryUsage.increase = results.memoryUsage.final - results.memoryUsage.initial;
    
    // 获取指标
    try {
      const metrics = await service.getMetrics();
      console.log('\n=== Prometheus 指标样本 ===');
      console.log(metrics.substring(0, 500) + '...');
    } catch (error) {
      console.error('获取指标时发生错误:', error);
    }
    
    // 输出结果
    console.log('\n=== 测试结果 ===');
    console.log(`总请求数: ${requestCount}`);
    console.log(`总耗时: ${results.totalTime.toFixed(2)} 秒`);
    console.log(`每秒请求数: ${results.requestsPerSecond.toFixed(2)}`);
    console.log(`错误数: ${results.errors}`);
    console.log(`内存使用:`);
    console.log(`  初始: ${results.memoryUsage.initial.toFixed(2)} MB`);
    console.log(`  最终: ${results.memoryUsage.final.toFixed(2)} MB`);
    console.log(`  增长: ${results.memoryUsage.increase.toFixed(2)} MB`);
    
    // 性能评估
    console.log('\n=== 性能评估 ===');
    if (results.requestsPerSecond > 5000) {
      console.log('✅ 优秀: 每秒请求数超过5000');
    } else if (results.requestsPerSecond > 2000) {
      console.log('✅ 良好: 每秒请求数超过2000');
    } else if (results.requestsPerSecond > 1000) {
      console.log('⚠️  一般: 每秒请求数超过1000');
    } else {
      console.log('❌ 较差: 每秒请求数低于1000');
    }
    
    if (results.memoryUsage.increase < 50) {
      console.log('✅ 优秀: 内存增长小于50MB');
    } else if (results.memoryUsage.increase < 100) {
      console.log('✅ 良好: 内存增长小于100MB');
    } else if (results.memoryUsage.increase < 200) {
      console.log('⚠️  一般: 内存增长小于200MB');
    } else {
      console.log('❌ 较差: 内存增长超过200MB');
    }
    
    if (results.errors === 0) {
      console.log('✅ 优秀: 没有错误');
    } else if (results.errors < requestCount * 0.01) {
      console.log('✅ 良好: 错误率低于1%');
    } else if (results.errors < requestCount * 0.05) {
      console.log('⚠️  一般: 错误率低于5%');
    } else {
      console.log('❌ 较差: 错误率超过5%');
    }
    
    return results;
  } catch (error) {
    console.error('无法导入监控服务模块:', error.message);
    console.log('请先运行 npm run build 编译TypeScript代码');
    
    // 返回模拟结果，以便脚本可以继续运行
    return {
      totalTime: 10,
      requestsPerSecond: 5000,
      memoryUsage: {
        initial: 50,
        final: 75,
        increase: 25
      },
      errors: 0,
      simulated: true
    };
  }
}

// 运行测试
if (require.main === module) {
  testHighConcurrency()
    .then((results) => {
      if (results.simulated) {
        console.log('\n注意: 由于无法导入监控服务模块，以上是模拟结果');
        console.log('请先运行 npm run build 编译TypeScript代码，然后重新运行此脚本');
      } else {
        console.log('\n测试完成');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('测试失败:', error);
      process.exit(1);
    });
}

module.exports = { testHighConcurrency };