// 用途：探索OpenObserve API端点和认证方式
// 作者：AI助手
// 时间：2025-10-06 19:50:00
// 依赖：axios

const axios = require('axios');

// 配置
const config = {
  baseURL: 'http://localhost:5080',
  username: 'admin@example.com',
  password: 'ComplexPass#123'  // 正确的密码，注意Pass是大写P
};

// 要探索的API路径列表
const pathsToExplore = [
  '/api/v1/login',
  '/api/v1/auth',
  '/api/auth/login',
  '/api/signin',
  '/login',
  '/oauth/token',
  '/api/health',
  '/api/v1/health',
  '/healthz',
  '/api/v1/streams',
  '/api/v1/default/streams',
  '/api/default/streams'  // 之前测试成功的路径
];

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 测试一个API路径，尝试多种认证方式
async function explorePath(path) {
  console.log(`\n🔍 探索路径: ${path}`);
  console.log('====================================');
  
  // 1. 无认证
  try {
    const client = axios.create({ baseURL: config.baseURL, timeout: 5000 });
    const response = await client.get(path);
    console.log('✅ 无认证访问成功');
    console.log(`   状态码: ${response.status}`);
    console.log(`   响应内容类型: ${typeof response.data}`);
    if (typeof response.data === 'object') {
      console.log(`   响应体大小: ${JSON.stringify(response.data).length} 字节`);
      const preview = JSON.stringify(response.data).substring(0, 150);
      console.log(`   响应预览: ${preview}${preview.length >= 150 ? '...' : ''}`);
    }
  } catch (error) {
    console.log('❌ 无认证访问失败');
    if (error.response) {
      console.log(`   状态码: ${error.response.status}`);
      console.log(`   响应体: ${error.response.data ? String(error.response.data).substring(0, 100) : '无'}`);
    }
  }
  
  // 2. 基础认证
  try {
    const client = axios.create({
      baseURL: config.baseURL,
      timeout: 5000,
      auth: {
        username: config.username,
        password: config.password
      }
    });
    const response = await client.get(path);
    console.log('✅ 基础认证访问成功');
    console.log(`   状态码: ${response.status}`);
    console.log(`   响应内容类型: ${typeof response.data}`);
    if (typeof response.data === 'object') {
      console.log(`   响应体大小: ${JSON.stringify(response.data).length} 字节`);
      const preview = JSON.stringify(response.data).substring(0, 150);
      console.log(`   响应预览: ${preview}${preview.length >= 150 ? '...' : ''}`);
    }
  } catch (error) {
    console.log('❌ 基础认证访问失败');
    if (error.response) {
      console.log(`   状态码: ${error.response.status}`);
      console.log(`   响应体: ${error.response.data ? String(error.response.data).substring(0, 100) : '无'}`);
    }
  }
  
  // 3. 尝试POST登录请求
  if (path.includes('login') || path.includes('auth')) {
    try {
      const client = axios.create({ baseURL: config.baseURL, timeout: 5000 });
      const response = await client.post(path, {
        email: config.username,
        password: config.password
      });
      console.log('✅ POST登录请求成功');
      console.log(`   状态码: ${response.status}`);
      console.log(`   响应内容类型: ${typeof response.data}`);
      if (typeof response.data === 'object') {
        console.log(`   响应体大小: ${JSON.stringify(response.data).length} 字节`);
        const preview = JSON.stringify(response.data).substring(0, 150);
        console.log(`   响应预览: ${preview}${preview.length >= 150 ? '...' : ''}`);
      }
    } catch (error) {
      console.log('❌ POST登录请求失败');
      if (error.response) {
        console.log(`   状态码: ${error.response.status}`);
        console.log(`   响应体: ${error.response.data ? String(error.response.data).substring(0, 100) : '无'}`);
      }
    }
  }
}

// 运行所有探索
async function runExploration() {
  console.log('====================================');
  console.log('开始探索OpenObserve API端点');
  console.log('====================================');
  console.log(`🖥️  OpenObserve服务: ${config.baseURL}`);
  console.log(`🔍 探索 ${pathsToExplore.length} 个潜在API路径`);
  console.log('====================================');

  for (const path of pathsToExplore) {
    await explorePath(path);
    await delay(1000); // 每个请求之间延迟1秒
  }

  console.log('\n====================================');
  console.log('🏁 API探索完成');
  console.log('====================================');
}

// 执行探索
runExploration().catch(error => {
  console.error('❌ 探索过程中发生错误:', error);
});