
const axios = require('axios');

const OPENOBSERVE_URL = 'http://localhost:5080';
const OPENOBSERVE_ORGANIZATION = 'caddy-shopping';

async function simulateAlerts() {
  console.log('🧪 模拟告警场景...');
  
  try {
    // 模拟高CPU使用率
    console.log('📊 模拟高CPU使用率告警...');
    const cpuAlert = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'CPU使用率过高',
      service: 'system-monitor',
      metric_name: 'cpu_usage',
      metric_value: 85.5,
      threshold: 80,
      severity: 'warning'
    };
    
    await axios.post(
      `${OPENOBSERVE_URL}/api/${OPENOBSERVE_ORGANIZATION}/application-logs/_json`,
      cpuAlert,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    // 模拟应用错误
    console.log('📱 模拟应用错误告警...');
    const appError = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: '数据库连接失败',
      service: 'caddy-shopping-app',
      error_code: 'DB_CONNECTION_ERROR',
      stack: 'Error: Database connection failed\n    at connect (db.js:45:10)',
      severity: 'critical'
    };
    
    await axios.post(
      `${OPENOBSERVE_URL}/api/${OPENOBSERVE_ORGANIZATION}/application-logs/_json`,
      appError,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    // 模拟业务异常
    console.log('💼 模拟业务异常告警...');
    const businessAlert = {
      timestamp: new Date().toISOString(),
      event_type: 'security_alert',
      event_name: 'suspicious_login',
      user_id: 'unknown-user',
      ip_address: '192.168.1.100',
      properties: {
        login_attempts: 5,
        failed_reason: 'invalid_password'
      },
      severity: 'warning'
    };
    
    await axios.post(
      `${OPENOBSERVE_URL}/api/${OPENOBSERVE_ORGANIZATION}/business-events/_json`,
      businessAlert,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    console.log('\n✓ 告警模拟完成！');
    console.log('📊 请在OpenObserve Web界面查看告警状态');
    console.log('🔔 检查通知渠道是否正常工作');
    
  } catch (error) {
    console.error('❌ 告警模拟失败:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 提示: 请先完成OpenObserve的初始设置');
      console.log('📖 参考: docs/openobserve-manual-setup-guide.md');
    }
  }
}

async function checkAlertStatus() {
  console.log('\n🔍 检查告警状态...');
  
  try {
    const response = await axios.get(
      `${OPENOBSERVE_URL}/api/${OPENOBSERVE_ORGANIZATION}/alerts`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    console.log('✓ 告警状态检查完成');
    console.log(`📊 当前活跃告警: ${response.data.active || 0}`);
    console.log(`📋 总告警规则: ${response.data.rules || 0}`);
    
  } catch (error) {
    console.error('❌ 告警状态检查失败:', error.response?.data || error.message);
  }
}

async function main() {
  await simulateAlerts();
  await checkAlertStatus();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  simulateAlerts,
  checkAlertStatus
};
