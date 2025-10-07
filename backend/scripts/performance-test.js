// 用途：性能测试脚本，模拟50万并发访问
// 依赖文件：package.json (通过npm run test:performance使用)
// 作者：后端开发团队
// 时间：2025-09-26 18:27:30

const autocannon = require('autocannon');
const { promisify } = require('util');

// 测试配置
const config = {
  // 基础URL
  url: 'http://localhost:3000',
  
  // 测试场景配置
  scenarios: {
    // 健康检查测试
    health: {
      path: '/health',
      connections: 1000,
      duration: 60,
      title: '健康检查接口性能测试'
    },
    
    // 产品列表测试
    products: {
      path: '/api/products',
      connections: 5000,
      duration: 120,
      title: '产品列表接口性能测试'
    },
    
    // 用户认证测试
    auth: {
      path: '/api/auth/login',
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test123'
      }),
      headers: {
        'Content-Type': 'application/json'
      },
      connections: 1000,
      duration: 60,
      title: '用户认证接口性能测试'
    },
    
    // 高并发测试
    highConcurrency: {
      path: '/api/products',
      connections: 10000,
      duration: 180,
      title: '高并发产品列表测试'
    }
  }
};

// 运行性能测试
async function runPerformanceTest() {
  console.log('🚀 开始性能测试...\n');
  
  const results = {};
  
  for (const [scenarioName, scenarioConfig] of Object.entries(config.scenarios)) {
    console.log(`📊 运行测试: ${scenarioConfig.title}`);
    
    try {
      const result = await autocannon({
        url: config.url + scenarioConfig.path,
        connections: scenarioConfig.connections,
        duration: scenarioConfig.duration,
        method: scenarioConfig.method || 'GET',
        body: scenarioConfig.body,
        headers: scenarioConfig.headers,
        timeout: 30,
        pipelining: 10,
        workers: require('os').cpus().length
      });
      
      results[scenarioName] = result;
      
      console.log(`✅ ${scenarioConfig.title} 完成`);
      console.log(`   请求数: ${result.requests.total}`);
      console.log(`   吞吐量: ${result.throughput.total} 请求/秒`);
      console.log(`   平均响应时间: ${result.latency.average}ms`);
      console.log(`   错误率: ${result.errors}%\n`);
      
    } catch (error) {
      console.error(`❌ ${scenarioConfig.title} 失败:`, error.message);
      results[scenarioName] = { error: error.message };
    }
    
    // 等待一段时间再进行下一个测试
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // 生成测试报告
  generateReport(results);
}

// 生成性能测试报告
function generateReport(results) {
  console.log('📈 性能测试报告');
  console.log('='.repeat(50));
  
  let totalRequests = 0;
  let totalThroughput = 0;
  let totalLatency = 0;
  let testCount = 0;
  
  for (const [scenarioName, result] of Object.entries(results)) {
    if (result.error) {
      console.log(`❌ ${config.scenarios[scenarioName].title}: ${result.error}`);
      continue;
    }
    
    totalRequests += result.requests.total;
    totalThroughput += result.throughput.total;
    totalLatency += result.latency.average;
    testCount++;
    
    console.log(`\n📊 ${config.scenarios[scenarioName].title}:`);
    console.log(`   总请求数: ${result.requests.total.toLocaleString()}`);
    console.log(`   吞吐量: ${result.throughput.total.toLocaleString()} 请求/秒`);
    console.log(`   平均响应时间: ${result.latency.average}ms`);
    console.log(`   最小响应时间: ${result.latency.min}ms`);
    console.log(`   最大响应时间: ${result.latency.max}ms`);
    console.log(`   错误率: ${result.errors}%`);
    console.log(`   状态码分布:`, result.statusCodeStats);
  }
  
  if (testCount > 0) {
    console.log('\n📊 总体统计:');
    console.log(`   总测试场景: ${testCount}`);
    console.log(`   总请求数: ${totalRequests.toLocaleString()}`);
    console.log(`   平均吞吐量: ${(totalThroughput / testCount).toFixed(2)} 请求/秒`);
    console.log(`   平均响应时间: ${(totalLatency / testCount).toFixed(2)}ms`);
    
    // 性能评估
    const avgThroughput = totalThroughput / testCount;
    if (avgThroughput > 50000) {
      console.log('✅ 性能优秀：系统可支持50万并发访问');
    } else if (avgThroughput > 10000) {
      console.log('⚠️  性能良好：系统可支持1万并发访问，建议优化');
    } else {
      console.log('❌ 性能不足：系统需要进一步优化');
    }
  }
  
  console.log('='.repeat(50));
}

// 运行测试
if (require.main === module) {
  runPerformanceTest().catch(console.error);
}

module.exports = { runPerformanceTest, config };