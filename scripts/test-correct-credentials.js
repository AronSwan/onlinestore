// 用途：使用正确的凭据组合测试OpenObserve认证
// 作者：AI助手
// 时间：2025-10-06 19:30:00
// 依赖：axios

const axios = require('axios');

// 从环境变量中获取的正确凭据组合
const config = {
  baseURL: 'http://localhost:5080',
  username: 'admin@example.com',
  password: 'CHANGE_ME_openobserve_password',  // 注意这里的Pass是大写P
  organization: 'default',
  stream: 'caddy-shopping-logs'
};

// 创建axios实例，配置基本认证
const apiClient = axios.create({
  baseURL: config.baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  auth: {
    username: config.username,
    password: config.password
  }
});

// 测试的端点列表
const endpoints = [
  { path: '/', name: '根路径', method: 'get' },
  { path: '/health', name: '健康检查', method: 'get' },
  { path: '/api/_health', name: 'API健康检查', method: 'get' },
  { path: '/api/default/_health', name: '组织健康检查', method: 'get' },
  { path: '/api/default/streams', name: '流列表', method: 'get' },
  { 
    path: `/api/${config.organization}/${config.stream}/_search`, 
    name: '搜索API', 
    method: 'post',
    data: {
      query: {
        kind: 'lucene',
        query: '*'
      },
      from: 0,
      size: 10,
      sort: [{ _timestamp: { order: 'desc' } }]
    }
  }
];

// 延迟函数，防止请求过快
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 测试单个端点
async function testEndpoint(endpoint) {
  try {
    const startTime = Date.now();
    let response;
    
    console.log(`🌐 测试端点: ${endpoint.name} (${config.baseURL}${endpoint.path})`);
    console.log(`🔑 使用凭据: ${config.username} / ${'*'.repeat(config.password.length)}`);
    
    if (endpoint.method === 'get') {
      response = await apiClient.get(endpoint.path);
    } else if (endpoint.method === 'post') {
      response = await apiClient.post(endpoint.path, endpoint.data || {});
    }
    
    const endTime = Date.now();
    
    console.log(`✅ 成功: 状态码 ${response.status}`);
    console.log(`   响应时间: ${endTime - startTime}ms`);
    console.log(`   响应内容类型: ${typeof response.data}`);
    if (typeof response.data === 'object') {
      console.log(`   响应体大小: ${JSON.stringify(response.data).length} 字节`);
      // 打印响应的前100个字符
      const preview = JSON.stringify(response.data).substring(0, 200);
      console.log(`   响应预览: ${preview}${preview.length >= 200 ? '...' : ''}`);
    } else {
      console.log(`   响应预览: ${String(response.data).substring(0, 200)}...`);
    }
    console.log('---------------------------------------');
    
    return {
      success: true,
      endpoint: endpoint.name,
      status: response.status,
      responseTime: endTime - startTime
    };
  } catch (error) {
    console.log(`❌ 失败: ${error.message}`);
    if (error.response) {
      console.log(`   状态码: ${error.response.status}`);
      console.log(`   响应体: ${error.response.data ? JSON.stringify(error.response.data) : '无'}`);
    }
    console.log('---------------------------------------');
    
    return {
      success: false,
      endpoint: endpoint.name,
      error: error.message
    };
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('====================================');
  console.log('开始测试OpenObserve认证 - 使用正确的凭据');
  console.log('====================================');
  console.log(`🖥️  OpenObserve服务: ${config.baseURL}`);
  console.log(`🔍 测试 ${endpoints.length} 个端点`);
  console.log('====================================\n');

  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    await delay(500); // 每个请求之间延迟500ms
  }

  // 生成测试报告
  console.log('\n📊 测试报告');
  console.log('====================================');
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ 成功: ${successCount}/${results.length}`);
  
  if (successCount < results.length) {
    console.log('❌ 失败的端点:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.endpoint}: ${r.error}`);
    });
  }
  
  // 计算平均响应时间
  const avgResponseTime = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.responseTime, 0) / successCount;
  
  if (successCount > 0) {
    console.log(`⚡ 平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
  }
  
  console.log('====================================');
  
  return successCount > 0;
}

// 执行测试
runAllTests().then(success => {
  console.log(`\n🏁 测试完成 - ${success ? '通过' : '失败'}`);
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ 测试执行过程中发生错误:', error);
  process.exit(1);
});