// 用途：测试后端API基本功能
// 依赖文件：无
// 作者：AI助手
// 时间：2025-09-29 03:15:00

const http = require('http');

// 测试健康检查端点
function testHealthEndpoint() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      console.log(`✅ 健康检查端点响应状态码: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`📊 响应内容: ${data}`);
        resolve({ statusCode: res.statusCode, data: data });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ 健康检查失败: ${error.message}`);
      reject(error);
    });

    req.on('timeout', () => {
      console.log('⏰ 请求超时');
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.end();
  });
}

// 测试API根端点
function testRootEndpoint() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      console.log(`✅ API根端点响应状态码: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`📊 响应内容: ${data}`);
        resolve({ statusCode: res.statusCode, data: data });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ API根端点测试失败: ${error.message}`);
      reject(error);
    });

    req.on('timeout', () => {
      console.log('⏰ 请求超时');
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.end();
  });
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试后端API...\n');
  
  try {
    // 等待服务器启动
    console.log('⏳ 等待服务器启动...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 测试健康检查端点
    console.log('\n📋 测试健康检查端点...');
    await testHealthEndpoint();
    
    // 测试API根端点
    console.log('\n📋 测试API根端点...');
    await testRootEndpoint();
    
    console.log('\n🎉 所有测试完成！');
    
  } catch (error) {
    console.log(`\n💥 测试失败: ${error.message}`);
    console.log('💡 提示: 请确保后端服务正在运行，并且数据库服务已启动');
  }
}

// 运行测试
runTests();