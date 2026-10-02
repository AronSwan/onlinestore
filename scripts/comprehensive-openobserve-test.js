// OpenObserve连接测试脚本
// 用途：全面测试OpenObserve的认证和API功能
// 作者：AI助手
// 时间：2025-12-03 15:30:00

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 配置参数
const config = {
  url: 'http://localhost:5080',
  organization: 'default',
  stream: 'caddy-shopping-logs',
  timeout: 10000
};

// 定义要测试的凭据组合
const credentialsList = [
  { username: 'admin@example.com', password: 'CHANGE_ME_openobserve_password', description: '推荐组合（docker-compose中定义的）' },
  { username: 'admin@example.com', password: 'CHANGE_ME_openobserve_password', description: '大写Pass版本' },
  { username: 'admin@openobserve.com', password: 'admin', description: '备选组合2' },
  { username: 'admin', password: 'admin', description: '备选组合3' },
  { username: 'root', password: 'root@example.com', description: '备选组合4' },
  { username: 'admin@example.com', password: 'admin123', description: '在test-openobserve.js中使用的组合' }
];

// 定义要测试的端点
const endpoints = [
  { path: '/', name: '根路径', method: 'get' },
  { path: '/api/_health', name: '全局健康检查', method: 'get' },
  { path: '/api/default/_health', name: '组织健康检查', method: 'get' },
  { path: '/api/default/streams', name: '流列表', method: 'get' },
  { path: `/api/${config.organization}/${config.stream}/_search`, name: '搜索API', method: 'post', data: {
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
  }}
];

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 获取认证头
function getAuthHeader(username, password) {
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  return {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json'
  };
}

// 测试单个凭据组合
async function testCredentials(credentials) {
  console.log(`\n🔑 测试凭据组合: ${credentials.username} / ${credentials.password}`);
  console.log(`   描述: ${credentials.description}`);
  
  const headers = getAuthHeader(credentials.username, credentials.password);
  let successCount = 0;
  
  for (const endpoint of endpoints) {
    const url = `${config.url}${endpoint.path}`;
    console.log(`\n🌐 测试端点: ${endpoint.name} (${url})`);
    
    try {
      let response;
      if (endpoint.method === 'get') {
        response = await axios.get(url, { headers, timeout: config.timeout });
      } else if (endpoint.method === 'post') {
        response = await axios.post(url, endpoint.data || {}, { headers, timeout: config.timeout });
      }
      
      console.log(`✅ 成功: 状态码 ${response.status}`);
      if (response.status === 200) {
        console.log(`   响应内容类型: ${typeof response.data}`);
        if (typeof response.data === 'object' && Object.keys(response.data).length > 0) {
          console.log(`   响应键数量: ${Object.keys(response.data).length}`);
          // 只显示部分关键信息，避免输出过多
          if (endpoint.path.includes('/streams')) {
            console.log(`   流数量: ${Array.isArray(response.data) ? response.data.length : '未知'}`);
          } else if (endpoint.path.includes('/_search')) {
            console.log(`   匹配记录数: ${response.data.hits ? response.data.hits.total?.value || 0 : 0}`);
          }
        }
      }
      successCount++;
    } catch (error) {
      console.log(`❌ 失败: ${error.message}`);
      if (error.response) {
        console.log(`   状态码: ${error.response.status}`);
        console.log(`   响应体: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.log(`   无响应: 服务器没有返回任何响应`);
      }
    }
    
    // 避免请求过于频繁
    await delay(500);
  }
  
  console.log(`\n📊 凭据组合测试结果: ${successCount}/${endpoints.length} 端点成功`);
  return successCount > 0;
}

// 主函数
async function main() {
  console.log('🚀 开始OpenObserve连接测试...');
  console.log(`🌐 OpenObserve服务: ${config.url}`);
  
  // 先检查基本连接性
  try {
    const pingResponse = await axios.get(`${config.url}/`, { timeout: 5000 });
    console.log(`✅ 基本连接测试成功: 状态码 ${pingResponse.status}`);
  } catch (error) {
    console.log(`❌ 基本连接测试失败: ${error.message}`);
    console.log('💡 提示: 请确保OpenObserve服务正在运行，端口正确');
    process.exit(1);
  }
  
  let anySuccessful = false;
  
  // 测试所有凭据组合
  for (const credentials of credentialsList) {
    const success = await testCredentials(credentials);
    if (success) anySuccessful = true;
  }
  
  // 输出总结
  console.log('\n📋 测试总结');
  console.log('====================');
  
  if (!anySuccessful) {
    console.log('❌ 所有凭据组合测试失败！');
    console.log('\n💡 建议的解决步骤:');
    console.log('1. 确保OpenObserve服务正在运行: docker ps | grep openobserve');
    console.log('2. 查看容器日志: docker logs shopping-openobserve');
    console.log('3. 尝试重置OpenObserve:');
    console.log('   docker-compose -f backend/docker/openobserve/docker-compose.yml down');
    console.log('   docker volume rm openobserve_data');
    console.log('   docker-compose -f backend/docker/openobserve/docker-compose.yml up -d');
    console.log('   node scripts/init-openobserve-streams.js');
  } else {
    console.log('✅ 至少有一个凭据组合测试成功！');
  }
}

// 运行主函数
main().catch(error => {
  console.error('❌ 测试过程中发生错误:', error);
});