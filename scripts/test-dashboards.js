
const axios = require('axios');

const OPENOBSERVE_URL = 'http://localhost:5080';
const OPENOBSERVE_ORGANIZATION = 'caddy-shopping';

async function testDashboardData() {
  console.log('🧪 测试仪表板数据...');
  
  try {
    // 测试系统指标数据
    console.log('📊 测试系统指标...');
    const systemResponse = await axios.get(
      `${OPENOBSERVE_URL}/api/${OPENOBSERVE_ORGANIZATION}/system-metrics/_search`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          query: { match_all: {} },
          size: 5,
          sort: [{ timestamp: { order: 'desc' } }]
        }
      }
    );
    console.log(`✓ 系统指标数据: ${systemResponse.data.hits?.total?.value || 0} 条记录`);
    
    // 测试应用日志数据
    console.log('📱 测试应用日志...');
    const appResponse = await axios.get(
      `${OPENOBSERVE_URL}/api/${OPENOBSERVE_ORGANIZATION}/application-logs/_search`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          query: { match_all: {} },
          size: 5,
          sort: [{ timestamp: { order: 'desc' } }]
        }
      }
    );
    console.log(`✓ 应用日志数据: ${appResponse.data.hits?.total?.value || 0} 条记录`);
    
    // 测试业务事件数据
    console.log('💼 测试业务事件...');
    const businessResponse = await axios.get(
      `${OPENOBSERVE_URL}/api/${OPENOBSERVE_ORGANIZATION}/business-events/_search`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          query: { match_all: {} },
          size: 5,
          sort: [{ timestamp: { order: 'desc' } }]
        }
      }
    );
    console.log(`✓ 业务事件数据: ${businessResponse.data.hits?.total?.value || 0} 条记录`);
    
    console.log('\n🎉 仪表板数据测试完成！');
    console.log('📊 请访问 OpenObserve Web界面查看仪表板数据');
    
  } catch (error) {
    console.error('❌ 数据测试失败:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 提示: 请先完成OpenObserve的初始设置');
      console.log('📖 参考: docs/openobserve-manual-setup-guide.md');
    }
  }
}

if (require.main === module) {
  testDashboardData().catch(console.error);
}

module.exports = { testDashboardData };
