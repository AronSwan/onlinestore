#!/usr/bin/env node

/**
 * 模拟OpenObserve设置完成脚本
 * 用于演示阶段二的核心功能迁移流程
 */

const fs = require('fs');
const path = require('path');

// 模拟OpenObserve配置状态
const mockOpenObserveConfig = {
  status: 'configured',
  organization: 'caddy-shopping',
  streams: [
    {
      name: 'application-logs',
      type: 'logs',
      status: 'active',
      retention: '30d'
    },
    {
      name: 'system-metrics',
      type: 'metrics',
      status: 'active',
      retention: '90d'
    },
    {
      name: 'request-traces',
      type: 'traces',
      status: 'active',
      retention: '7d'
    },
    {
      name: 'business-events',
      type: 'logs',
      status: 'active',
      retention: '365d'
    }
  ],
  endpoints: {
    logs: 'http://localhost:5080/api/caddy-shopping/application-logs/_json',
    metrics: 'http://localhost:5080/api/caddy-shopping/system-metrics/_json',
    traces: 'http://localhost:5080/api/caddy-shopping/request-traces/_json',
    events: 'http://localhost:5080/api/caddy-shopping/business-events/_json'
  }
};

function saveMockConfig() {
  console.log('📝 保存模拟OpenObserve配置...');
  
  const configPath = path.join(__dirname, '../config/openobserve-config.json');
  const configDir = path.dirname(configPath);
  
  // 确保配置目录存在
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  fs.writeFileSync(configPath, JSON.stringify(mockOpenObserveConfig, null, 2));
  console.log('✓ 配置已保存到:', configPath);
  
  return mockOpenObserveConfig;
}

function generateIntegrationScripts() {
  console.log('\n🔧 生成集成脚本...');
  
  // 生成Winston日志传输器配置
  const winstonTransportConfig = `
const winston = require('winston');
const axios = require('axios');

class OpenObserveTransport extends winston.Transport {
  constructor(options) {
    super(options);
    this.options = options;
    this.endpoint = options.endpoint;
    this.batchSize = options.batchSize || 10;
    this.buffer = [];
    this.flushInterval = options.flushInterval || 5000;
    
    // 定期刷新缓冲区
    setInterval(() => this.flush(), this.flushInterval);
  }
  
  log(info, callback) {
    this.buffer.push({
      timestamp: new Date().toISOString(),
      level: info.level,
      message: info.message,
      service: this.options.service || 'unknown',
      ...info.meta
    });
    
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
    
    callback();
  }
  
  async flush() {
    if (this.buffer.length === 0) return;
    
    const batch = [...this.buffer];
    this.buffer = [];
    
    try {
      await axios.post(this.endpoint, batch, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${this.options.token}\`
        }
      });
      console.log(\`✓ 发送 \${batch.length} 条日志到OpenObserve\`);
    } catch (error) {
      console.error('❌ 发送日志失败:', error.message);
      // 重新加入缓冲区
      this.buffer.unshift(...batch);
    }
  }
}

module.exports = OpenObserveTransport;
`;
  
  fs.writeFileSync(
    path.join(__dirname, '../backend/src/logging/openobserve-transport.js'),
    winstonTransportConfig
  );
  console.log('✓ Winston传输器配置已生成');
  
  // 生成Prometheus指标配置
  const prometheusConfig = `
# Prometheus配置用于OpenObserve
global:
  scrape_interval: 15s
  evaluation_interval: 15s

remote_write:
  - url: "http://localhost:5080/api/caddy-shopping/system-metrics/_json"
    headers:
      Content-Type: "application/json"
      Authorization: "Bearer YOUR_OPENOBSERVE_TOKEN"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
    
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
      
  - job_name: 'caddy-shopping-app'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s
`;
  
  const prometheusDir = path.join(__dirname, '../docker/prometheus');
  if (!fs.existsSync(prometheusDir)) {
    fs.mkdirSync(prometheusDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(prometheusDir, 'prometheus-openobserve.yml'),
    prometheusConfig
  );
  console.log('✓ Prometheus配置已生成');
}

function generateDashboardConfigs() {
  console.log('\n📊 生成仪表板配置...');
  
  // 系统监控仪表板
  const systemDashboard = {
    title: '系统监控仪表板',
    panels: [
      {
        title: 'CPU使用率',
        type: 'timeseries',
        targets: [
          {
            query: 'SELECT rate(cpu_usage) FROM system-metrics WHERE time > NOW() - 1h'
          }
        ]
      },
      {
        title: '内存使用率',
        type: 'timeseries',
        targets: [
          {
            query: 'SELECT rate(memory_usage) FROM system-metrics WHERE time > NOW() - 1h'
          }
        ]
      },
      {
        title: '磁盘使用率',
        type: 'gauge',
        targets: [
          {
            query: 'SELECT disk_usage FROM system-metrics ORDER BY time DESC LIMIT 1'
          }
        ]
      }
    ]
  };
  
  // 应用性能仪表板
  const appDashboard = {
    title: '应用性能监控仪表板',
    panels: [
      {
        title: '请求响应时间',
        type: 'timeseries',
        targets: [
          {
            query: 'SELECT avg(response_time) FROM application-logs WHERE time > NOW() - 1h'
          }
        ]
      },
      {
        title: '错误率',
        type: 'timeseries',
        targets: [
          {
            query: 'SELECT count(*) FROM application-logs WHERE level = "error" AND time > NOW() - 1h'
          }
        ]
      },
      {
        title: '请求量',
        type: 'timeseries',
        targets: [
          {
            query: 'SELECT count(*) FROM application-logs WHERE time > NOW() - 1h GROUP BY time(1m)'
          }
        ]
      }
    ]
  };
  
  const dashboardDir = path.join(__dirname, '../config/dashboards');
  if (!fs.existsSync(dashboardDir)) {
    fs.mkdirSync(dashboardDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(dashboardDir, 'system-monitoring.json'),
    JSON.stringify(systemDashboard, null, 2)
  );
  
  fs.writeFileSync(
    path.join(dashboardDir, 'application-performance.json'),
    JSON.stringify(appDashboard, null, 2)
  );
  
  console.log('✓ 仪表板配置已生成');
}

function main() {
  console.log('🚀 模拟OpenObserve设置完成...');
  
  const config = saveMockConfig();
  generateIntegrationScripts();
  generateDashboardConfigs();
  
  console.log('\n🎉 模拟设置完成！');
  console.log('\n📋 已生成的配置:');
  console.log('  - OpenObserve配置文件');
  console.log('  - Winston日志传输器');
  console.log('  - Prometheus指标配置');
  console.log('  - 仪表板配置');
  
  console.log('\n📝 下一步操作:');
  console.log('  1. 手动完成OpenObserve Web界面初始设置');
  console.log('  2. 运行日志系统集成脚本');
  console.log('  3. 配置Prometheus指标发送');
  console.log('  4. 导入仪表板配置');
  console.log('  5. 设置告警规则');
  
  console.log('\n📖 详细指南请参考: docs/openobserve-manual-setup-guide.md');
}

if (require.main === module) {
  main();
}

module.exports = {
  saveMockConfig,
  generateIntegrationScripts,
  generateDashboardConfigs
};