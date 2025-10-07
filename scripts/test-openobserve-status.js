#!/usr/bin/env node

/**
 * OpenObserve状态检查脚本
 */

const axios = require('axios');

const OPENOBSERVE_URL = 'http://localhost:5080';

async function checkStatus() {
  console.log('🔍 检查OpenObserve状态...');
  
  try {
    // 检查Web界面
    console.log('📱 检查Web界面...');
    const webResponse = await axios.get(`${OPENOBSERVE_URL}/web/`);
    console.log('✓ Web界面可访问');
    
    // 检查配置
    console.log('⚙️ 检查配置...');
    const configResponse = await axios.get(`${OPENOBSERVE_URL}/config`);
    console.log('✓ 配置可访问:', configResponse.data.version);
    
    // 检查是否需要初始化
    console.log('🔐 检查认证状态...');
    try {
      const authResponse = await axios.post(`${OPENOBSERVE_URL}/api/auth/login`, {
        email: 'admin@example.com',
        password: 'ComplexPass#123'
      });
      console.log('✓ 认证成功');
      console.log('Token:', authResponse.data.data.token);
      return authResponse.data.data.token;
    } catch (authError) {
      console.log('⚠️ 认证失败:', authError.response?.status, authError.response?.data);
      
      // 尝试检查用户状态
      try {
        const usersResponse = await axios.get(`${OPENOBSERVE_URL}/api/users`);
        console.log('✓ 用户列表可访问，可能不需要认证');
      } catch (usersError) {
        console.log('❌ 用户列表不可访问，需要初始化');
      }
      
      return null;
    }
  } catch (error) {
    console.error('❌ 状态检查失败:', error.message);
    throw error;
  }
}

async function testDefaultStream() {
  console.log('\n📊 测试默认数据流...');
  
  try {
    // 尝试发送测试数据到默认流
    const testData = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'OpenObserve测试消息',
      service: 'test-service'
    };
    
    const response = await axios.post(
      `${OPENOBSERVE_URL}/api/default/test-stream/_json`,
      testData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✓ 测试数据发送成功');
    return true;
  } catch (error) {
    console.log('⚠️ 测试数据发送失败:', error.response?.status, error.response?.data || error.message);
    return false;
  }
}

async function main() {
  try {
    const token = await checkStatus();
    await testDefaultStream();
    
    if (token) {
      console.log('\n🎉 OpenObserve已准备就绪，可以开始数据流配置！');
    } else {
      console.log('\n⚠️ OpenObserve可能需要通过Web界面进行初始设置');
      console.log('请访问 http://localhost:5080/web/ 完成初始设置');
    }
  } catch (error) {
    console.error('\n❌ 检查失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  checkStatus,
  testDefaultStream
};