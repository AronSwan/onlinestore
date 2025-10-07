// OpenObserve连接测试脚本
const axios = require('axios');

// 配置参数
const config = {
  url: 'http://localhost:5080',
  organization: 'default',
  stream: 'caddy-shopping-logs',
  username: 'admin@example.com',
  password: 'admin123',
  timeout: 10000
};

// 测试连接函数
async function testConnection() {
  console.log('🔍 开始测试OpenObserve连接...');
  
  try {
    // 1. 测试健康检查端点
    console.log('📊 测试健康检查端点...');
    const healthUrl = `${config.url}/api/${config.organization}/_health`;
    
    const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    const headers = {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    };

    const healthResponse = await axios.get(healthUrl, { headers, timeout: config.timeout });
    console.log('✅ 健康检查成功:', healthResponse.status, healthResponse.data);

    // 2. 测试API端点
    console.log('📡 测试API端点...');
    const apiUrl = `${config.url}/api/${config.organization}/${config.stream}/_json`;
    
    const testLog = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'OpenObserve连接测试日志',
      service: 'caddy-shopping-api',
      environment: 'development',
      version: '1.0.0',
      host: require('os').hostname(),
      pid: process.pid
    };

    const apiResponse = await axios.post(apiUrl, [testLog], { headers, timeout: config.timeout });
    console.log('✅ API端点测试成功:', apiResponse.status);

    // 3. 测试查询功能
    console.log('🔍 测试查询功能...');
    const searchUrl = `${config.url}/api/${config.organization}/${config.stream}/_search`;
    
    const searchQuery = {
      query: {
        bool: {
          filter: [
            {
              range: {
                timestamp: {
                  gte: 'now-1h',
                  lte: 'now'
                }
              }
            }
          ]
        }
      },
      size: 10
    };

    const searchResponse = await axios.post(searchUrl, searchQuery, { headers, timeout: config.timeout });
    console.log('✅ 查询功能测试成功:', searchResponse.status);
    console.log('📊 查询结果数量:', searchResponse.data.hits?.total?.value || 0);

    console.log('\n🎉 OpenObserve连接测试完成！所有功能正常。');
    return { success: true, message: 'OpenObserve连接测试成功' };

  } catch (error) {
    console.error('❌ OpenObserve连接测试失败:', error.message);
    
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    
    return { success: false, message: error.message };
  }
}

// 运行测试
testConnection().then(result => {
  console.log('\n📋 测试结果:', result);
  process.exit(result.success ? 0 : 1);
});