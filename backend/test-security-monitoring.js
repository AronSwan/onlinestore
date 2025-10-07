const axios = require('axios');

// 配置
const API_BASE_URL = 'http://localhost:3000/api/security';

// 测试函数
async function testSecurityMonitoring() {
  console.log('开始测试安全监控系统...\n');

  try {
    // 1. 测试健康检查
    console.log('1. 测试健康检查接口...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('健康检查结果:', JSON.stringify(healthResponse.data, null, 2));
    console.log('✅ 健康检查测试通过\n');

    // 2. 测试获取仪表板数据
    console.log('2. 测试获取仪表板数据...');
    const dashboardResponse = await axios.get(`${API_BASE_URL}/dashboard`);
    console.log('仪表板数据概览:');
    console.log(`- 总漏洞数: ${dashboardResponse.data.data.stats.total}`);
    console.log(`- 严重漏洞: ${dashboardResponse.data.data.stats.critical}`);
    console.log(`- 高危漏洞: ${dashboardResponse.data.data.stats.high}`);
    console.log(`- 中危漏洞: ${dashboardResponse.data.data.stats.medium}`);
    console.log(`- 低危漏洞: ${dashboardResponse.data.data.stats.low}`);
    console.log(`- 最后更新: ${dashboardResponse.data.data.lastUpdated}`);
    console.log('✅ 仪表板数据测试通过\n');

    // 3. 测试获取漏洞统计
    console.log('3. 测试获取漏洞统计...');
    const statsResponse = await axios.get(`${API_BASE_URL}/stats`);
    console.log('漏洞统计结果:', JSON.stringify(statsResponse.data.data.byStatus, null, 2));
    console.log('✅ 漏洞统计测试通过\n');

    // 4. 测试获取漏洞趋势
    console.log('4. 测试获取漏洞趋势...');
    const trendResponse = await axios.get(`${API_BASE_URL}/trend`);
    console.log(`趋势数据点数: ${trendResponse.data.data.length}`);
    if (trendResponse.data.data.length > 0) {
      console.log('最新趋势数据:', JSON.stringify(trendResponse.data.data[trendResponse.data.data.length - 1], null, 2));
    }
    console.log('✅ 漏洞趋势测试通过\n');

    // 5. 测试获取热力图数据
    console.log('5. 测试获取热力图数据...');
    const heatmapResponse = await axios.get(`${API_BASE_URL}/heatmap`);
    console.log(`热力图数据点数: ${heatmapResponse.data.data.length}`);
    if (heatmapResponse.data.data.length > 0) {
      console.log('热力图数据示例:', JSON.stringify(heatmapResponse.data.data.slice(0, 3), null, 2));
    }
    console.log('✅ 热力图数据测试通过\n');

    // 6. 测试获取完整漏洞数据
    console.log('6. 测试获取完整漏洞数据...');
    const vulnerabilitiesResponse = await axios.get(`${API_BASE_URL}/vulnerabilities`);
    console.log(`漏洞总数: ${vulnerabilitiesResponse.data.data.vulnerabilities.length}`);
    if (vulnerabilitiesResponse.data.data.vulnerabilities.length > 0) {
      console.log('漏洞示例:', JSON.stringify(vulnerabilitiesResponse.data.data.vulnerabilities[0], null, 2));
    }
    console.log('✅ 完整漏洞数据测试通过\n');

    // 7. 测试导出报告
    console.log('7. 测试导出报告...');
    const exportResponse = await axios.get(`${API_BASE_URL}/export`, {
      responseType: 'arraybuffer'
    });
    console.log(`导出报告大小: ${exportResponse.data.byteLength} 字节`);
    console.log('✅ 导出报告测试通过\n');

    console.log('🎉 所有测试通过！安全监控系统运行正常。');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else if (error.request) {
      console.error('请求失败，请检查后端服务是否已启动');
    } else {
      console.error('请求配置错误:', error.config);
    }
  }
}

// 执行测试
testSecurityMonitoring();