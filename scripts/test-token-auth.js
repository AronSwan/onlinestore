// 用途：使用令牌认证方式测试OpenObserve API
// 作者：AI助手
// 时间：2025-10-06 19:40:00
// 依赖：axios

const axios = require('axios');

// 配置
const config = {
  baseURL: 'http://localhost:5080',
  username: 'admin@example.com',
  password: 'CHANGE_ME_openobserve_password',  // 正确的密码，注意Pass是大写P
  organization: 'default',
  stream: 'application-logs'    // 从配置文件中选择一个有效的流名称
};

// 创建基础axios实例（不包含认证）
const baseClient = axios.create({
  baseURL: config.baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 获取认证令牌
async function getAuthToken() {
  try {
    console.log(`🔑 正在使用凭据获取访问令牌: ${config.username} / ${'*'.repeat(config.password.length)}`);
    const response = await baseClient.post('/api/login', {
      email: config.username,
      password: config.password
    });
    
    if (response.data && response.data.token) {
      console.log(`✅ 成功获取访问令牌: ${response.data.token.substring(0, 10)}...`);
      return response.data.token;
    } else {
      throw new Error('未在响应中找到令牌');
    }
  } catch (error) {
    console.error('❌ 获取访问令牌失败:');
    if (error.response) {
      console.error(`   状态码: ${error.response.status}`);
      console.error(`   响应体: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(`   错误: ${error.message}`);
    }
    throw error;
  }
}

// 创建带令牌认证的axios实例
function createTokenClient(token) {
  return axios.create({
    baseURL: config.baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
}

// 测试的端点列表
const endpoints = [
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
  },
  { path: '/api/default/health', name: '组织健康检查', method: 'get' },
  { path: '/api/users', name: '用户列表', method: 'get' }
];

// 测试单个端点
async function testEndpoint(client, endpoint) {
  try {
    const startTime = Date.now();
    let response;
    
    console.log(`🌐 测试端点: ${endpoint.name} (${config.baseURL}${endpoint.path})`);
    
    if (endpoint.method === 'get') {
      response = await client.get(endpoint.path);
    } else if (endpoint.method === 'post') {
      response = await client.post(endpoint.path, endpoint.data || {});
    }
    
    const endTime = Date.now();
    
    console.log(`✅ 成功: 状态码 ${response.status}`);
    console.log(`   响应时间: ${endTime - startTime}ms`);
    console.log(`   响应内容类型: ${typeof response.data}`);
    if (typeof response.data === 'object') {
      console.log(`   响应体大小: ${JSON.stringify(response.data).length} 字节`);
      // 打印响应的前200个字符
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

// 测试向流中写入数据
async function testWriteData(client) {
  try {
    const testData = {
      log: `测试日志消息 - ${new Date().toISOString()}`,
      level: 'info',
      source: 'test-script',
      message: '这是一条测试消息，用于验证OpenObserve写入功能',
      metadata: {
        test_id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now()
      }
    };
    
    console.log(`🌐 向流写入测试数据: ${config.stream}`);
    const response = await client.post(`/api/${config.organization}/${config.stream}/_json`, [testData]);
    
    console.log(`✅ 成功写入数据: 状态码 ${response.status}`);
    console.log(`   响应: ${JSON.stringify(response.data)}`);
    console.log('---------------------------------------');
    
    return true;
  } catch (error) {
    console.log(`❌ 写入数据失败: ${error.message}`);
    if (error.response) {
      console.log(`   状态码: ${error.response.status}`);
      console.log(`   响应体: ${JSON.stringify(error.response.data)}`);
    }
    console.log('---------------------------------------');
    
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('====================================');
  console.log('开始测试OpenObserve令牌认证');
  console.log('====================================');
  console.log(`🖥️  OpenObserve服务: ${config.baseURL}`);
  console.log(`🔍 测试 ${endpoints.length} 个端点`);
  console.log('====================================\n');

  try {
    // 1. 获取认证令牌
    const token = await getAuthToken();
    
    // 2. 创建带令牌的客户端
    const tokenClient = createTokenClient(token);
    
    // 3. 测试端点
    const results = [];
    
    for (const endpoint of endpoints) {
      const result = await testEndpoint(tokenClient, endpoint);
      results.push(result);
      await delay(500); // 每个请求之间延迟500ms
    }
    
    // 4. 测试写入数据
    const writeSuccess = await testWriteData(tokenClient);
    
    // 5. 等待片刻后再次搜索，查看是否能找到刚刚写入的数据
    if (writeSuccess) {
      console.log('⏳ 等待2秒后搜索刚刚写入的数据...');
      await delay(2000);
      
      const searchAfterWrite = await testEndpoint(tokenClient, endpoints[1]); // 再次测试搜索端点
      results.push({...searchAfterWrite, endpoint: `${searchAfterWrite.endpoint} (写入后)`});
    }
    
    // 6. 生成测试报告
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
      .reduce((sum, r) => sum + r.responseTime, 0) / Math.max(successCount, 1);
    
    console.log(`⚡ 平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`📝 令牌认证: 成功`);
    console.log(`📊 数据写入: ${writeSuccess ? '成功' : '失败'}`);
    console.log('====================================');
    
    return successCount > 0;
  } catch (error) {
    console.error('❌ 测试过程中发生致命错误:', error);
    return false;
  }
}

// 执行测试
runAllTests().then(success => {
  console.log(`\n🏁 测试完成 - ${success ? '通过' : '失败'}`);
  process.exit(success ? 0 : 1);
});