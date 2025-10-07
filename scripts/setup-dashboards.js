#!/usr/bin/env node

/**
 * 基础仪表板创建脚本
 * 在OpenObserve中创建系统监控、应用性能和业务指标仪表板
 */

const fs = require('fs');
const path = require('path');

function createSystemDashboard() {
  console.log('🖥️ 创建系统监控仪表板...');
  
  const systemDashboard = {
    id: 'system-monitoring',
    title: '系统监控仪表板',
    description: '系统资源监控和性能指标',
    tags: ['system', 'monitoring'],
    panels: [
      {
        id: 1,
        title: 'CPU使用率',
        type: 'timeseries',
        gridPos: { x: 0, y: 0, w: 12, h: 8 },
        targets: [
          {
            query: 'SELECT rate(cpu_usage) FROM system-metrics WHERE time > NOW() - 1h GROUP BY time(1m), instance',
            legendFormat: '{{instance}}'
          }
        ],
        options: {
          legend: { displayMode: 'list', placement: 'bottom' },
          tooltip: { mode: 'single', sort: 'none' }
        }
      },
      {
        id: 2,
        title: '内存使用率',
        type: 'timeseries',
        gridPos: { x: 12, y: 0, w: 12, h: 8 },
        targets: [
          {
            query: 'SELECT rate(memory_usage) FROM system-metrics WHERE time > NOW() - 1h GROUP BY time(1m), instance',
            legendFormat: '{{instance}}'
          }
        ],
        options: {
          legend: { displayMode: 'list', placement: 'bottom' },
          tooltip: { mode: 'single', sort: 'none' }
        }
      },
      {
        id: 3,
        title: '磁盘使用率',
        type: 'gauge',
        gridPos: { x: 0, y: 8, w: 6, h: 8 },
        targets: [
          {
            query: 'SELECT disk_usage FROM system-metrics ORDER BY time DESC LIMIT 1',
            legendFormat: 'Disk Usage'
          }
        ],
        options: {
          reduceOptions: { values: false, calcs: ['lastNotNull'] },
          thresholds: {
            steps: [
              { color: 'green', value: null },
              { color: 'yellow', value: 70 },
              { color: 'red', value: 90 }
            ]
          }
        }
      },
      {
        id: 4,
        title: '网络流量',
        type: 'timeseries',
        gridPos: { x: 6, y: 8, w: 18, h: 8 },
        targets: [
          {
            query: 'SELECT rate(network_in) FROM system-metrics WHERE time > NOW() - 1h GROUP BY time(1m), instance',
            legendFormat: 'In - {{instance}}'
          },
          {
            query: 'SELECT rate(network_out) FROM system-metrics WHERE time > NOW() - 1h GROUP BY time(1m), instance',
            legendFormat: 'Out - {{instance}}'
          }
        ],
        options: {
          legend: { displayMode: 'list', placement: 'bottom' }
        }
      },
      {
        id: 5,
        title: '系统负载',
        type: 'timeseries',
        gridPos: { x: 0, y: 16, w: 24, h: 8 },
        targets: [
          {
            query: 'SELECT system_load FROM system-metrics WHERE time > NOW() - 1h GROUP BY time(1m), instance',
            legendFormat: 'Load - {{instance}}'
          }
        ]
      }
    ],
    time: { from: 'now-1h', to: 'now' },
    refresh: '30s'
  };

  const dashboardPath = path.join(__dirname, '../config/dashboards/system-monitoring.json');
  fs.writeFileSync(dashboardPath, JSON.stringify(systemDashboard, null, 2));
  console.log('✓ 系统监控仪表板已创建');
}

function createApplicationDashboard() {
  console.log('\n📱 创建应用性能监控仪表板...');
  
  const appDashboard = {
    id: 'application-performance',
    title: '应用性能监控仪表板',
    description: '应用程序性能指标和健康状态',
    tags: ['application', 'performance'],
    panels: [
      {
        id: 1,
        title: '请求响应时间',
        type: 'timeseries',
        gridPos: { x: 0, y: 0, w: 12, h: 8 },
        targets: [
          {
            query: 'SELECT histogram_quantile(0.50, rate(app_http_request_duration_seconds_bucket[5m])) FROM system-metrics WHERE time > NOW() - 1h GROUP BY time(1m)',
            legendFormat: '50th percentile'
          },
          {
            query: 'SELECT histogram_quantile(0.95, rate(app_http_request_duration_seconds_bucket[5m])) FROM system-metrics WHERE time > NOW() - 1h GROUP BY time(1m)',
            legendFormat: '95th percentile'
          },
          {
            query: 'SELECT histogram_quantile(0.99, rate(app_http_request_duration_seconds_bucket[5m])) FROM system-metrics WHERE time > NOW() - 1h GROUP BY time(1m)',
            legendFormat: '99th percentile'
          }
        ],
        options: {
          legend: { displayMode: 'list', placement: 'bottom' },
          tooltip: { mode: 'multi', sort: 'desc' }
        }
      },
      {
        id: 2,
        title: '请求量',
        type: 'timeseries',
        gridPos: { x: 12, y: 0, w: 12, h: 8 },
        targets: [
          {
            query: 'SELECT rate(app_http_requests_total[5m]) FROM system-metrics WHERE time > NOW() - 1h GROUP BY time(1m), method',
            legendFormat: '{{method}}'
          }
        ],
        options: {
          legend: { displayMode: 'list', placement: 'bottom' }
        }
      },
      {
        id: 3,
        title: '错误率',
        type: 'timeseries',
        gridPos: { x: 0, y: 8, w: 12, h: 8 },
        targets: [
          {
            query: 'SELECT rate(app_http_requests_total{status_code=~"5.."}[5m]) / rate(app_http_requests_total[5m]) * 100 FROM system-metrics WHERE time > NOW() - 1h GROUP BY time(1m)',
            legendFormat: '5xx Error Rate'
          },
          {
            query: 'SELECT rate(app_http_requests_total{status_code=~"4.."}[5m]) / rate(app_http_requests_total[5m]) * 100 FROM system-metrics WHERE time > NOW() - 1h GROUP BY time(1m)',
            legendFormat: '4xx Error Rate'
          }
        ],
        options: {
          legend: { displayMode: 'list', placement: 'bottom' },
          yAxes: [
            { max: 100, min: 0, show: true, label: 'Error Rate (%)' }
          ]
        }
      },
      {
        id: 4,
        title: '活跃连接数',
        type: 'timeseries',
        gridPos: { x: 12, y: 8, w: 12, h: 8 },
        targets: [
          {
            query: 'SELECT app_active_connections FROM system-metrics WHERE time > NOW() - 1h GROUP BY time(1m)',
            legendFormat: 'Active Connections'
          }
        ]
      },
      {
        id: 5,
        title: 'HTTP状态码分布',
        type: 'piechart',
        gridPos: { x: 0, y: 16, w: 12, h: 8 },
        targets: [
          {
            query: 'SELECT count(*) FROM application-logs WHERE time > NOW() - 1h GROUP BY status_code',
            legendFormat: '{{status_code}}'
          }
        ],
        options: {
          legend: { displayMode: 'list', placement: 'right' },
          reduceOptions: { values: false, calcs: ['lastNotNull'] }
        }
      },
      {
        id: 6,
        title: '最慢的API端点',
        type: 'table',
        gridPos: { x: 12, y: 16, w: 12, h: 8 },
        targets: [
          {
            query: 'SELECT route, avg(response_time) as avg_response_time, count(*) as request_count FROM application-logs WHERE time > NOW() - 1h GROUP BY route ORDER BY avg_response_time DESC LIMIT 10',
            legendFormat: '{{route}}'
          }
        ],
        options: {
          showHeader: true,
          sortBy: [{ desc: true, displayName: 'Avg Response Time' }]
        }
      }
    ],
    time: { from: 'now-1h', to: 'now' },
    refresh: '30s'
  };

  const dashboardPath = path.join(__dirname, '../config/dashboards/application-performance.json');
  fs.writeFileSync(dashboardPath, JSON.stringify(appDashboard, null, 2));
  console.log('✓ 应用性能监控仪表板已创建');
}

function createBusinessDashboard() {
  console.log('\n💼 创建业务指标监控仪表板...');
  
  const businessDashboard = {
    id: 'business-metrics',
    title: '业务指标监控仪表板',
    description: '业务关键指标和用户行为分析',
    tags: ['business', 'metrics'],
    panels: [
      {
        id: 1,
        title: '用户登录趋势',
        type: 'timeseries',
        gridPos: { x: 0, y: 0, w: 12, h: 8 },
        targets: [
          {
            query: 'SELECT count(*) FROM business-events WHERE event_name = "login" AND time > NOW() - 24h GROUP BY time(1h)',
            legendFormat: '成功登录'
          },
          {
            query: 'SELECT count(*) FROM application-logs WHERE event_name = "login_failure" AND time > NOW() - 24h GROUP BY time(1h)',
            legendFormat: '登录失败'
          }
        ],
        options: {
          legend: { displayMode: 'list', placement: 'bottom' }
        }
      },
      {
        id: 2,
        title: '订单量统计',
        type: 'timeseries',
        gridPos: { x: 12, y: 0, w: 12, h: 8 },
        targets: [
          {
            query: 'SELECT count(*) FROM business-events WHERE event_name = "order_created" AND time > NOW() - 24h GROUP BY time(1h)',
            legendFormat: '创建订单'
          },
          {
            query: 'SELECT count(*) FROM business-events WHERE event_name = "order_completed" AND time > NOW() - 24h GROUP BY time(1h)',
            legendFormat: '完成订单'
          }
        ],
        options: {
          legend: { displayMode: 'list', placement: 'bottom' }
        }
      },
      {
        id: 3,
        title: '最热门商品',
        type: 'table',
        gridPos: { x: 0, y: 8, w: 12, h: 8 },
        targets: [
          {
            query: 'SELECT properties.product_name, count(*) as view_count FROM business-events WHERE event_name = "product_view" AND time > NOW() - 24h GROUP BY properties.product_name ORDER BY view_count DESC LIMIT 10',
            legendFormat: '{{properties.product_name}}'
          }
        ],
        options: {
          showHeader: true,
          sortBy: [{ desc: true, displayName: 'View Count' }]
        }
      },
      {
        id: 4,
        title: '支付方式分布',
        type: 'piechart',
        gridPos: { x: 12, y: 8, w: 12, h: 8 },
        targets: [
          {
            query: 'SELECT properties.payment_method, count(*) FROM business-events WHERE event_name = "order_completed" AND time > NOW() - 24h GROUP BY properties.payment_method',
            legendFormat: '{{properties.payment_method}}'
          }
        ],
        options: {
          legend: { displayMode: 'list', placement: 'right' }
        }
      },
      {
        id: 5,
        title: '购物车操作统计',
        type: 'timeseries',
        gridPos: { x: 0, y: 16, w: 24, h: 8 },
        targets: [
          {
            query: 'SELECT count(*) FROM business-events WHERE event_name = "cart_add" AND time > NOW() - 24h GROUP BY time(1h)',
            legendFormat: '添加商品'
          },
          {
            query: 'SELECT count(*) FROM business-events WHERE event_name = "cart_remove" AND time > NOW() - 24h GROUP BY time(1h)',
            legendFormat: '移除商品'
          },
          {
            query: 'SELECT count(*) FROM business-events WHERE event_name = "cart_clear" AND time > NOW() - 24h GROUP BY time(1h)',
            legendFormat: '清空购物车'
          }
        ],
        options: {
          legend: { displayMode: 'list', placement: 'bottom' }
        }
      }
    ],
    time: { from: 'now-24h', to: 'now' },
    refresh: '1m'
  };

  const dashboardPath = path.join(__dirname, '../config/dashboards/business-metrics.json');
  fs.writeFileSync(dashboardPath, JSON.stringify(businessDashboard, null, 2));
  console.log('✓ 业务指标监控仪表板已创建');
}

function createDashboardImportScript() {
  console.log('\n📤 创建仪表板导入脚本...');
  
  const importScript = `
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OPENOBSERVE_URL = process.env.OPENOBSERVE_URL || 'http://localhost:5080';
const OPENOBSERVE_ORGANIZATION = process.env.OPENOBSERVE_ORGANIZATION || 'caddy-shopping';
const OPENOBSERVE_TOKEN = process.env.OPENOBSERVE_TOKEN || 'your-token-here';

async function getAuthToken() {
  try {
    const response = await axios.post(\`\${OPENOBSERVE_URL}/api/auth/login\`, {
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
      \`\${OPENOBSERVE_URL}/api/\${OPENOBSERVE_ORGANIZATION}/dashboards\`,
      dashboardConfig,
      {
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(\`✓ 仪表板导入成功: \${dashboardConfig.title}\`);
    return response.data;
  } catch (error) {
    console.error(\`❌ 仪表板导入失败: \${path.basename(dashboardPath)}\`, error.response?.data || error.message);
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
        console.log(\`⚠️ 仪表板文件不存在: \${dashboardPath}\`);
      }
    }
    
    console.log('\\n🎉 所有仪表板导入完成！');
    console.log('📊 请访问 OpenObserve Web界面查看仪表板');
    
  } catch (error) {
    console.error('\\n❌ 仪表板导入失败:', error.message);
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
`;

  const importPath = path.join(__dirname, 'import-dashboards.js');
  fs.writeFileSync(importPath, importScript);
  console.log('✓ 仪表板导入脚本已创建');
}

function createDashboardTestScript() {
  console.log('\n🧪 创建仪表板测试脚本...');
  
  const testScript = `
const axios = require('axios');

const OPENOBSERVE_URL = 'http://localhost:5080';
const OPENOBSERVE_ORGANIZATION = 'caddy-shopping';

async function testDashboardData() {
  console.log('🧪 测试仪表板数据...');
  
  try {
    // 测试系统指标数据
    console.log('📊 测试系统指标...');
    const systemResponse = await axios.get(
      \`\${OPENOBSERVE_URL}/api/\${OPENOBSERVE_ORGANIZATION}/system-metrics/_search\`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          query: { match_all: {} },
          size: 5,
          sort: [{ timestamp: { order: 'desc' } }]
        }
      }
    );
    console.log(\`✓ 系统指标数据: \${systemResponse.data.hits?.total?.value || 0} 条记录\`);
    
    // 测试应用日志数据
    console.log('📱 测试应用日志...');
    const appResponse = await axios.get(
      \`\${OPENOBSERVE_URL}/api/\${OPENOBSERVE_ORGANIZATION}/application-logs/_search\`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          query: { match_all: {} },
          size: 5,
          sort: [{ timestamp: { order: 'desc' } }]
        }
      }
    );
    console.log(\`✓ 应用日志数据: \${appResponse.data.hits?.total?.value || 0} 条记录\`);
    
    // 测试业务事件数据
    console.log('💼 测试业务事件...');
    const businessResponse = await axios.get(
      \`\${OPENOBSERVE_URL}/api/\${OPENOBSERVE_ORGANIZATION}/business-events/_search\`,
      {
        headers: { 'Content-Type': 'application/json' },
        data: {
          query: { match_all: {} },
          size: 5,
          sort: [{ timestamp: { order: 'desc' } }]
        }
      }
    );
    console.log(\`✓ 业务事件数据: \${businessResponse.data.hits?.total?.value || 0} 条记录\`);
    
    console.log('\\n🎉 仪表板数据测试完成！');
    console.log('📊 请访问 OpenObserve Web界面查看仪表板数据');
    
  } catch (error) {
    console.error('❌ 数据测试失败:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\\n💡 提示: 请先完成OpenObserve的初始设置');
      console.log('📖 参考: docs/openobserve-manual-setup-guide.md');
    }
  }
}

if (require.main === module) {
  testDashboardData().catch(console.error);
}

module.exports = { testDashboardData };
`;

  const testPath = path.join(__dirname, 'test-dashboards.js');
  fs.writeFileSync(testPath, testScript);
  console.log('✓ 仪表板测试脚本已创建');
}

function main() {
  console.log('🚀 开始创建基础仪表板...');
  
  createSystemDashboard();
  createApplicationDashboard();
  createBusinessDashboard();
  createDashboardImportScript();
  createDashboardTestScript();
  
  console.log('\n🎉 基础仪表板创建完成！');
  console.log('\n📋 已创建的仪表板:');
  console.log('  - 系统监控仪表板');
  console.log('  - 应用性能监控仪表板');
  console.log('  - 业务指标监控仪表板');
  
  console.log('\n📝 下一步操作:');
  console.log('  1. 完成OpenObserve初始设置');
  console.log('  2. 运行导入脚本: node scripts/import-dashboards.js');
  console.log('  3. 运行测试脚本: node scripts/test-dashboards.js');
  console.log('  4. 在OpenObserve Web界面查看仪表板');
  
  console.log('\n🔗 仪表板访问:');
  console.log('  - 系统监控: CPU、内存、磁盘、网络');
  console.log('  - 应用性能: 响应时间、错误率、请求量');
  console.log('  - 业务指标: 用户行为、订单统计、商品分析');
}

if (require.main === module) {
  main();
}

module.exports = {
  createSystemDashboard,
  createApplicationDashboard,
  createBusinessDashboard,
  createDashboardImportScript,
  createDashboardTestScript
};