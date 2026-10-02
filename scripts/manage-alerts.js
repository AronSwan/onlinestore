
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const { env } = require('./openobserve/env-adapter.js');
const OPENOBSERVE_URL = env.url;
const OPENOBSERVE_ORGANIZATION = env.organization;

async function getAuthToken() {
  try {
    const response = await axios.post(`${OPENOBSERVE_URL}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'CHANGE_ME_openobserve_password'
    });
    return response.data.data.token;
  } catch (error) {
    console.error('获取认证令牌失败:', error.message);
    throw error;
  }
}

async function createAlertRules(token) {
  try {
    const rulesConfig = JSON.parse(fs.readFileSync(
      path.join(__dirname, '../config/alerts/alert-rules.json'), 'utf8'
    ));
    
    const response = await axios.post(
      `${OPENOBSERVE_URL}/api/${OPENOBSERVE_ORGANIZATION}/alerts/rules`,
      rulesConfig,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✓ 告警规则创建成功');
    return response.data;
  } catch (error) {
    console.error('❌ 告警规则创建失败:', error.response?.data || error.message);
    throw error;
  }
}

async function createNotificationChannels(token) {
  try {
    const channelsConfig = JSON.parse(fs.readFileSync(
      path.join(__dirname, '../config/alerts/notification-channels.json'), 'utf8'
    ));
    
    const response = await axios.post(
      `${OPENOBSERVE_URL}/api/${OPENOBSERVE_ORGANIZATION}/alerts/channels`,
      channelsConfig,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✓ 通知渠道创建成功');
    return response.data;
  } catch (error) {
    console.error('❌ 通知渠道创建失败:', error.response?.data || error.message);
    throw error;
  }
}

async function testAlert(token) {
  try {
    const testAlert = {
      name: 'Test Alert',
      description: '这是一个测试告警',
      severity: 'info',
      timestamp: new Date().toISOString(),
      labels: {
        test: 'true'
      },
      annotations: {
        summary: '测试告警',
        description: '验证告警系统是否正常工作'
      }
    };
    
    const response = await axios.post(
      `${OPENOBSERVE_URL}/api/${OPENOBSERVE_ORGANIZATION}/alerts/test`,
      testAlert,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✓ 测试告警发送成功');
    return response.data;
  } catch (error) {
    console.error('❌ 测试告警发送失败:', error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 开始配置告警系统...');
  
  try {
    const token = await getAuthToken();
    
    await createAlertRules(token);
    await createNotificationChannels(token);
    await testAlert(token);
    
    console.log('\n🎉 告警系统配置完成！');
    console.log('📊 请在OpenObserve Web界面查看告警状态');
    
  } catch (error) {
    console.error('\n❌ 告警系统配置失败:', error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 提示: 请先完成OpenObserve的初始设置');
      console.log('📖 参考: docs/openobserve-manual-setup-guide.md');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  createAlertRules,
  createNotificationChannels,
  testAlert
};
