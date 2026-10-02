#!/usr/bin/env node

/**
 * 告警系统配置脚本
 * 配置OpenObserve的告警规则和通知渠道
 */

const fs = require('fs');
const path = require('path');

function createAlertRules() {
  console.log('🚨 创建告警规则...');
  
  const alertRules = {
    name: 'caddy-shopping-alerts',
    description: 'Caddy购物网站告警规则',
    rules: [
      {
        name: 'HighCPUUsage',
        description: 'CPU使用率过高',
        condition: {
          query: 'SELECT rate(cpu_usage) FROM system-metrics WHERE time > NOW() - 5m',
          operator: '>',
          threshold: 80,
          aggregation: 'avg'
        },
        severity: 'warning',
        for: '2m',
        labels: {
          service: 'system',
          component: 'cpu'
        },
        annotations: {
          summary: '高CPU使用率告警',
          description: 'CPU使用率超过80%，当前值: {{value}}%'
        }
      },
      {
        name: 'HighMemoryUsage',
        description: '内存使用率过高',
        condition: {
          query: 'SELECT (1 - (memory_available / memory_total)) * 100 FROM system-metrics WHERE time > NOW() - 5m',
          operator: '>',
          threshold: 85,
          aggregation: 'avg'
        },
        severity: 'warning',
        for: '2m',
        labels: {
          service: 'system',
          component: 'memory'
        },
        annotations: {
          summary: '高内存使用率告警',
          description: '内存使用率超过85%，当前值: {{value}}%'
        }
      },
      {
        name: 'HighDiskUsage',
        description: '磁盘使用率过高',
        condition: {
          query: 'SELECT (1 - (disk_available / disk_total)) * 100 FROM system-metrics WHERE time > NOW() - 5m',
          operator: '>',
          threshold: 90,
          aggregation: 'avg'
        },
        severity: 'critical',
        for: '1m',
        labels: {
          service: 'system',
          component: 'disk'
        },
        annotations: {
          summary: '高磁盘使用率告警',
          description: '磁盘使用率超过90%，当前值: {{value}}%'
        }
      },
      {
        name: 'HighErrorRate',
        description: '应用错误率过高',
        condition: {
          query: 'SELECT count(*) FROM application-logs WHERE level = "error" AND time > NOW() - 5m',
          operator: '>',
          threshold: 10,
          aggregation: 'count'
        },
        severity: 'warning',
        for: '3m',
        labels: {
          service: 'application',
          component: 'error_rate'
        },
        annotations: {
          summary: '应用错误率过高',
          description: '过去5分钟内错误日志数量: {{value}}'
        }
      },
      {
        name: 'HighResponseTime',
        description: '应用响应时间过长',
        condition: {
          query: 'SELECT avg(response_time) FROM application-logs WHERE time > NOW() - 5m',
          operator: '>',
          threshold: 1000,
          aggregation: 'avg'
        },
        severity: 'warning',
        for: '2m',
        labels: {
          service: 'application',
          component: 'response_time'
        },
        annotations: {
          summary: '应用响应时间过长',
          description: '平均响应时间超过1秒，当前值: {{value}}ms'
        }
      },
      {
        name: 'ApplicationDown',
        description: '应用服务不可用',
        condition: {
          query: 'SELECT count(*) FROM application-logs WHERE time > NOW() - 2m',
          operator: '<',
          threshold: 1,
          aggregation: 'count'
        },
        severity: 'critical',
        for: '1m',
        labels: {
          service: 'application',
          component: 'availability'
        },
        annotations: {
          summary: '应用服务不可用',
          description: '过去2分钟内没有收到应用日志，服务可能已停止'
        }
      },
      {
        name: 'HighLoginFailureRate',
        description: '登录失败率过高',
        condition: {
          query: 'SELECT count(*) FROM business-events WHERE event_name = "login_failure" AND time > NOW() - 5m',
          operator: '>',
          threshold: 5,
          aggregation: 'count'
        },
        severity: 'warning',
        for: '3m',
        labels: {
          service: 'business',
          component: 'authentication'
        },
        annotations: {
          summary: '登录失败率过高',
          description: '过去5分钟内登录失败次数: {{value}}'
        }
      },
      {
        name: 'UnusualOrderVolume',
        description: '订单量异常',
        condition: {
          query: 'SELECT count(*) FROM business-events WHERE event_name = "order_created" AND time > NOW() - 1h',
          operator: '<',
          threshold: 1,
          aggregation: 'count'
        },
        severity: 'warning',
        for: '30m',
        labels: {
          service: 'business',
          component: 'orders'
        },
        annotations: {
          summary: '订单量异常',
          description: '过去1小时订单量异常低: {{value}}'
        }
      }
    ]
  };

  const rulesPath = path.join(__dirname, '../config/alerts/alert-rules.json');
  fs.writeFileSync(rulesPath, JSON.stringify(alertRules, null, 2));
  console.log('✓ 告警规则已创建');
}

function createNotificationChannels() {
  console.log('\n📧 创建通知渠道配置...');
  
  const notificationChannels = {
    channels: [
      {
        name: 'email-notifications',
        type: 'email',
        enabled: true,
        settings: {
          smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
          smtp_port: parseInt(process.env.SMTP_PORT) || 587,
          smtp_username: process.env.SMTP_USERNAME || 'your-email@gmail.com',
          smtp_password: process.env.SMTP_PASSWORD || 'your-app-password',
          from_address: process.env.FROM_EMAIL || 'alerts@caddy-shopping.com',
          to_addresses: [
            process.env.ADMIN_EMAIL || 'admin@caddy-shopping.com',
            process.ops_email || 'ops@caddy-shopping.com'
          ]
        },
        filters: {
          severities: ['critical', 'warning']
        }
      },
      {
        name: 'webhook-notifications',
        type: 'webhook',
        enabled: true,
        settings: {
          url: process.env.WEBHOOK_URL || 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          template: {
            text: '🚨 {{alert_name}}',
            attachments: [
              {
                color: '{{severity}}',
                fields: [
                  { title: '告警名称', value: '{{alert_name}}', short: true },
                  { title: '严重程度', value: '{{severity}}', short: true },
                  { title: '描述', value: '{{description}}', short: false },
                  { title: '时间', value: '{{timestamp}}', short: true }
                ]
              }
            ]
          }
        },
        filters: {
          severities: ['critical', 'warning']
        }
      },
      {
        name: 'teams-notifications',
        type: 'webhook',
        enabled: false,
        settings: {
          url: process.env.TEAMS_WEBHOOK_URL || 'https://outlook.office.com/webhook/YOUR-TEAMS-WEBHOOK',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          template: {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            themeColor: '{{severity_color}}',
            summary: '{{alert_name}}',
            sections: [
              {
                activityTitle: '🚨 告警通知',
                activitySubtitle: '{{alert_name}}',
                facts: [
                  { name: '严重程度', value: '{{severity}}' },
                  { name: '描述', value: '{{description}}' },
                  { name: '时间', value: '{{timestamp}}' }
                ],
                markdown: true
              }
            ]
          }
        },
        filters: {
          severities: ['critical']
        }
      }
    ],
    routing: {
      rules: [
        {
          match: {
            severity: 'critical'
          },
          channels: ['email-notifications', 'webhook-notifications', 'teams-notifications']
        },
        {
          match: {
            severity: 'warning'
          },
          channels: ['email-notifications', 'webhook-notifications']
        },
        {
          match: {
            service: 'business'
          },
          channels: ['email-notifications']
        }
      ]
    }
  };

  const channelsPath = path.join(__dirname, '../config/alerts/notification-channels.json');
  fs.writeFileSync(channelsPath, JSON.stringify(notificationChannels, null, 2));
  console.log('✓ 通知渠道配置已创建');
}

function createAlertManagementScript() {
  console.log('\n⚙️ 创建告警管理脚本...');
  
  const managementScript = `
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OPENOBSERVE_URL = process.env.OPENOBSERVE_URL || 'http://localhost:5080';
const OPENOBSERVE_ORGANIZATION = process.env.OPENOBSERVE_ORGANIZATION || 'caddy-shopping';

async function getAuthToken() {
  try {
    const response = await axios.post(\`\${OPENOBSERVE_URL}/api/auth/login\`, {
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
      \`\${OPENOBSERVE_URL}/api/\${OPENOBSERVE_ORGANIZATION}/alerts/rules\`,
      rulesConfig,
      {
        headers: {
          'Authorization': \`Bearer \${token}\`,
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
      \`\${OPENOBSERVE_URL}/api/\${OPENOBSERVE_ORGANIZATION}/alerts/channels\`,
      channelsConfig,
      {
        headers: {
          'Authorization': \`Bearer \${token}\`,
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
      \`\${OPENOBSERVE_URL}/api/\${OPENOBSERVE_ORGANIZATION}/alerts/test\`,
      testAlert,
      {
        headers: {
          'Authorization': \`Bearer \${token}\`,
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
    
    console.log('\\n🎉 告警系统配置完成！');
    console.log('📊 请在OpenObserve Web界面查看告警状态');
    
  } catch (error) {
    console.error('\\n❌ 告警系统配置失败:', error.message);
    
    if (error.response?.status === 401) {
      console.log('\\n💡 提示: 请先完成OpenObserve的初始设置');
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
`;

  const scriptPath = path.join(__dirname, 'manage-alerts.js');
  fs.writeFileSync(scriptPath, managementScript);
  console.log('✓ 告警管理脚本已创建');
}

function createAlertTestScript() {
  console.log('\n🧪 创建告警测试脚本...');
  
  const testScript = `
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
      \`\${OPENOBSERVE_URL}/api/\${OPENOBSERVE_ORGANIZATION}/application-logs/_json\`,
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
      stack: 'Error: Database connection failed\\n    at connect (db.js:45:10)',
      severity: 'critical'
    };
    
    await axios.post(
      \`\${OPENOBSERVE_URL}/api/\${OPENOBSERVE_ORGANIZATION}/application-logs/_json\`,
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
      \`\${OPENOBSERVE_URL}/api/\${OPENOBSERVE_ORGANIZATION}/business-events/_json\`,
      businessAlert,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    console.log('\\n✓ 告警模拟完成！');
    console.log('📊 请在OpenObserve Web界面查看告警状态');
    console.log('🔔 检查通知渠道是否正常工作');
    
  } catch (error) {
    console.error('❌ 告警模拟失败:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\\n💡 提示: 请先完成OpenObserve的初始设置');
      console.log('📖 参考: docs/openobserve-manual-setup-guide.md');
    }
  }
}

async function checkAlertStatus() {
  console.log('\\n🔍 检查告警状态...');
  
  try {
    const response = await axios.get(
      \`\${OPENOBSERVE_URL}/api/\${OPENOBSERVE_ORGANIZATION}/alerts\`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    console.log('✓ 告警状态检查完成');
    console.log(\`📊 当前活跃告警: \${response.data.active || 0}\`);
    console.log(\`📋 总告警规则: \${response.data.rules || 0}\`);
    
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
`;

  const testPath = path.join(__dirname, 'test-alerts.js');
  fs.writeFileSync(testPath, testScript);
  console.log('✓ 告警测试脚本已创建');
}

function createEnvironmentConfig() {
  console.log('\n⚙️ 创建环境配置文件...');
  
  const envConfig = `
# OpenObserve告警配置
OPENOBSERVE_URL=http://localhost:5080
OPENOBSERVE_ORGANIZATION=caddy-shopping
OPENOBSERVE_TOKEN=your-token-here

# 邮件通知配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=alerts@caddy-shopping.com
ADMIN_EMAIL=admin@caddy-shopping.com
OPS_EMAIL=ops@caddy-shopping.com

# Slack通知配置
WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Teams通知配置
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/YOUR-TEAMS-WEBHOOK

# 告警阈值配置
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
ERROR_RATE_THRESHOLD=10
RESPONSE_TIME_THRESHOLD=1000
`;

  const envPath = path.join(__dirname, '../.env.alerts');
  fs.writeFileSync(envPath, envConfig);
  console.log('✓ 环境配置文件已创建');
}

function main() {
  console.log('🚀 开始设置告警系统配置...');
  
  createAlertRules();
  createNotificationChannels();
  createAlertManagementScript();
  createAlertTestScript();
  createEnvironmentConfig();
  
  console.log('\n🎉 告警系统配置完成！');
  console.log('\n📋 已完成的配置:');
  console.log('  - 告警规则定义');
  console.log('  - 通知渠道配置');
  console.log('  - 告警管理脚本');
  console.log('  - 告警测试脚本');
  console.log('  - 环境配置文件');
  
  console.log('\n📝 下一步操作:');
  console.log('  1. 配置环境变量: cp .env.alerts .env');
  console.log('  2. 完成OpenObserve初始设置');
  console.log('  3. 运行告警配置脚本: node scripts/manage-alerts.js');
  console.log('  4. 运行告警测试脚本: node scripts/test-alerts.js');
  
  console.log('\n🔔 告警类型:');
  console.log('  - 系统告警: CPU、内存、磁盘使用率');
  console.log('  - 应用告警: 错误率、响应时间、服务可用性');
  console.log('  - 业务告警: 登录失败、订单异常');
  
  console.log('\n📧 通知渠道:');
  console.log('  - 邮件通知: SMTP配置');
  console.log('  - Slack通知: Webhook集成');
  console.log('  - Teams通知: Webhook集成');
}

if (require.main === module) {
  main();
}

module.exports = {
  createAlertRules,
  createNotificationChannels,
  createAlertManagementScript,
  createAlertTestScript,
  createEnvironmentConfig
};