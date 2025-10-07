#!/usr/bin/env node

/**
 * OpenObserve根用户设置脚本
 * 用于自动完成OpenObserve的初始设置
 */

const axios = require('axios');

const OPENOBSERVE_URL = 'http://localhost:5080';
const ROOT_EMAIL = 'admin@example.com';
const ROOT_PASSWORD = 'ComplexPass#123';

async function setupRootUser() {
  console.log('🔧 设置OpenObserve根用户...');
  
  try {
    // 尝试检查是否已有根用户
    console.log('📋 检查现有用户...');
    try {
      const response = await axios.post(`${OPENOBSERVE_URL}/api/auth/login`, {
        email: ROOT_EMAIL,
        password: ROOT_PASSWORD
      });
      
      if (response.data.data.token) {
        console.log('✓ 根用户已存在且可登录');
        return response.data.data.token;
      }
    } catch (loginError) {
      console.log('⚠️ 根用户登录失败，尝试创建...');
    }
    
    // 尝试创建根用户
    console.log('👤 创建根用户...');
    try {
      const createResponse = await axios.post(`${OPENOBSERVE_URL}/api/users/signup`, {
        email: ROOT_EMAIL,
        password: ROOT_PASSWORD,
        role: 'root'
      });
      
      console.log('✓ 根用户创建成功');
      
      // 再次尝试登录
      const loginResponse = await axios.post(`${OPENOBSERVE_URL}/api/auth/login`, {
        email: ROOT_EMAIL,
        password: ROOT_PASSWORD
      });
      
      console.log('✓ 根用户登录成功');
      return loginResponse.data.data.token;
      
    } catch (createError) {
      console.log('❌ 根用户创建失败:', createError.response?.data || createError.message);
      
      // 尝试其他可能的端点
      console.log('🔄 尝试其他初始化方法...');
      
      try {
        const initResponse = await axios.post(`${OPENOBSERVE_URL}/api/init`, {
          email: ROOT_EMAIL,
          password: ROOT_PASSWORD
        });
        
        console.log('✓ 初始化成功');
        
        const loginResponse = await axios.post(`${OPENOBSERVE_URL}/api/auth/login`, {
          email: ROOT_EMAIL,
          password: ROOT_PASSWORD
        });
        
        return loginResponse.data.data.token;
        
      } catch (initError) {
        console.log('❌ 初始化失败:', initError.response?.data || initError.message);
        throw initError;
      }
    }
    
  } catch (error) {
    console.error('❌ 根用户设置失败:', error.message);
    throw error;
  }
}

async function createOrganization(token) {
  console.log('\n🏢 创建组织...');
  
  try {
    const response = await axios.post(
      `${OPENOBSERVE_URL}/api/organizations`,
      {
        identifier: 'caddy-shopping',
        name: 'Caddy Shopping Site',
        settings: {
          logo: '',
          description: 'Caddy风格购物网站监控'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✓ 组织创建成功');
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 409) {
      console.log('⚠️ 组织已存在');
      return null;
    }
    console.error('❌ 组织创建失败:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 开始OpenObserve初始设置...');
    
    const token = await setupRootUser();
    await createOrganization(token);
    
    console.log('\n🎉 OpenObserve初始设置完成！');
    console.log('📋 登录信息:');
    console.log(`  URL: ${OPENOBSERVE_URL}/web/`);
    console.log(`  邮箱: ${ROOT_EMAIL}`);
    console.log(`  密码: ${ROOT_PASSWORD}`);
    console.log(`  Token: ${token}`);
    
  } catch (error) {
    console.error('\n❌ 初始设置失败:', error.message);
    console.log('\n💡 请手动访问 http://localhost:5080/web/ 完成初始设置');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  setupRootUser,
  createOrganization
};