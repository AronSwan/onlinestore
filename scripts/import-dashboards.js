
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const { env } = require('./openobserve/env-adapter.js');
const OPENOBSERVE_URL = env.url;
const OPENOBSERVE_ORGANIZATION = env.organization;
const OPENOBSERVE_TOKEN = env.token || 'your-token-here';

async function getAuthToken() {
  try {
    const response = await axios.post(`${OPENOBSERVE_URL}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'ComplexPass#123'
    });
    return response.data.data.token;
  } catch (error) {
    console.error('获取认证令牌失败:', error.message);
    throw error;
  }
}

async function importDashboard(dashboardPath, token) {
  try {
    const dashboardConfig = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
    
    const response = await axios.post(
      `${OPENOBSERVE_URL}/api/${OPENOBSERVE_ORGANIZATION}/dashboards`,
      dashboardConfig,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✓ 仪表板导入成功: ${dashboardConfig.title}`);
    return response.data;
  } catch (error) {
    console.error(`❌ 仪表板导入失败: ${path.basename(dashboardPath)}`, error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 开始导入仪表板...');
  
  try {
    const token = await getAuthToken();
    
    const dashboardDir = path.join(__dirname, '../config/dashboards');
    const dashboards = [
      'system-monitoring.json',
      'application-performance.json',
      'business-metrics.json'
    ];
    
    for (const dashboard of dashboards) {
      const dashboardPath = path.join(dashboardDir, dashboard);
      if (fs.existsSync(dashboardPath)) {
        await importDashboard(dashboardPath, token);
      } else {
        console.log(`⚠️ 仪表板文件不存在: ${dashboardPath}`);
      }
    }
    
    console.log('\n🎉 所有仪表板导入完成！');
    console.log('📊 请访问 OpenObserve Web界面查看仪表板');
    
  } catch (error) {
    console.error('\n❌ 仪表板导入失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  importDashboard,
  getAuthToken
};
