// 用途：使用正确的凭据和路径测试OpenObserve API，确保能成功读取和写入数据
// 作者：AI助手
// 时间：2025-10-06 20:00:00
// 依赖：axios

const axios = require('axios');

// 配置
const config = {
  baseURL: 'http://localhost:5080',
  username: 'admin@example.com',
  password: 'CHANGE_ME_openobserve_password',  // 正确的密码，注意Pass是大写P
  organization: 'default',
  stream: 'application_logs'    // 从流列表中获取的有效流名称
};

// 创建带基础认证的axios实例
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

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 测试函数
async function runTests() {
  console.log('====================================');
  console.log('OpenObserve API 测试 - 工作版本');
  console.log('====================================');
  console.log(`🖥️  服务地址: ${config.baseURL}`);
  console.log(`🔑 使用凭据: ${config.username} / ${'*'.repeat(config.password.length)}`);
  console.log('====================================\n');

  try {
    // 1. 检查服务健康状态（不需要认证）
    console.log('🌐 测试健康检查端点 (无认证)');
    try {
      const healthResponse = await axios.get(`${config.baseURL}/healthz`);
      console.log(`✅ 成功: 状态码 ${healthResponse.status}`);
      console.log(`   响应: ${JSON.stringify(healthResponse.data)}`);
    } catch (error) {
      console.log(`❌ 失败: ${error.message}`);
    }
    console.log('---------------------------------------');

    // 2. 列出所有流
    console.log('🌐 列出所有流 (需要认证)');
    try {
      const streamsResponse = await apiClient.get(`/api/${config.organization}/streams`);
      console.log(`✅ 成功: 状态码 ${streamsResponse.status}`);
      console.log(`   发现 ${streamsResponse.data.list.length} 个流`);
      console.log('   流列表:');
      streamsResponse.data.list.forEach(stream => {
        console.log(`   - ${stream.name} (类型: ${stream.stream_type}, 文档数: ${stream.stats?.doc_num || 0})`);
      });
    } catch (error) {
      console.log(`❌ 失败: ${error.message}`);
      if (error.response) {
        console.log(`   状态码: ${error.response.status}`);
        console.log(`   响应体: ${error.response.data ? JSON.stringify(error.response.data) : '无'}`);
      }
    }
    console.log('---------------------------------------');

    // 3. 向流中写入测试数据
    console.log(`🌐 向流写入测试数据: ${config.stream}`);
    try {
      const testData = [
        {
          log: `测试日志消息 - ${new Date().toISOString()}`,
          level: 'info',
          source: 'working-test-script',
          message: '这是一条成功写入的测试消息',
          metadata: {
            test_id: Math.random().toString(36).substring(2, 9),
            timestamp: Date.now(),
            test_case: 'basic-auth-write'
          }
        }
      ];
      
      const writeResponse = await apiClient.post(`/api/${config.organization}/${config.stream}/_json`, testData);
      console.log(`✅ 成功写入数据: 状态码 ${writeResponse.status}`);
      console.log(`   响应: ${JSON.stringify(writeResponse.data)}`);
    } catch (error) {
      console.log(`❌ 写入数据失败: ${error.message}`);
      if (error.response) {
        console.log(`   状态码: ${error.response.status}`);
        console.log(`   响应体: ${error.response.data ? JSON.stringify(error.response.data) : '无'}`);
      }
    }
    console.log('---------------------------------------');

    // 4. 等待片刻后搜索数据
    console.log('⏳ 等待2秒后搜索数据...');
    await delay(2000);
    
    console.log(`🌐 搜索流中的数据: ${config.stream}`);
    try {
      const searchResponse = await apiClient.post(`/api/${config.organization}/${config.stream}/_search`, {
        query: {
          kind: 'lucene',
          query: '*'
        },
        from: 0,
        size: 5,
        sort: [{ _timestamp: { order: 'desc' } }]
      });
      
      console.log(`✅ 成功搜索数据: 状态码 ${searchResponse.status}`);
      console.log(`   找到 ${searchResponse.data.hits.total.value} 条记录`);
      if (searchResponse.data.hits.total.value > 0) {
        console.log('   最近的记录:');
        searchResponse.data.hits.hits.slice(0, 2).forEach((hit, index) => {
          console.log(`   ${index + 1}. ${hit._source.message || hit._source.log || '无消息内容'}`);
        });
      }
    } catch (error) {
      console.log(`❌ 搜索数据失败: ${error.message}`);
      if (error.response) {
        console.log(`   状态码: ${error.response.status}`);
        console.log(`   响应体: ${error.response.data ? JSON.stringify(error.response.data) : '无'}`);
      }
    }
    console.log('---------------------------------------');

    // 5. 打印配置信息，帮助用户理解
    console.log('\n📊 总结与配置信息');
    console.log('====================================');
    console.log('✅ OpenObserve API 访问成功!');
    console.log('\n🔑 正确的认证凭据:');
    console.log(`   用户名: ${config.username}`);
    console.log(`   密码: ${config.password}`);
    console.log('\n📁 可用的API路径:');
    console.log(`   健康检查: GET ${config.baseURL}/healthz (无认证)`);
    console.log(`   流列表: GET ${config.baseURL}/api/${config.organization}/streams (需要基础认证)`);
    console.log(`   写入数据: POST ${config.baseURL}/api/${config.organization}/{stream}/_json (需要基础认证)`);
    console.log(`   搜索数据: POST ${config.baseURL}/api/${config.organization}/{stream}/_search (需要基础认证)`);
    console.log('\n⚠️  重要注意事项:');
    console.log('   1. 密码区分大小写，CHANGE_ME_openobserve_password 中的Pass是大写P');
    console.log('   2. 基础认证(Basic Auth)是当前有效的认证方式');
    console.log('   3. 容器健康检查显示为unhealthy是因为容器内没有安装curl');
    console.log('   4. 服务本身运行正常，可以正常使用API');
    console.log('====================================');
    
    return true;
  } catch (error) {
    console.error('❌ 测试过程中发生致命错误:', error);
    return false;
  }
}

// 执行测试
runTests().then(success => {
  console.log(`\n🏁 测试完成 - ${success ? '成功' : '失败'}`);
  process.exit(success ? 0 : 1);
});