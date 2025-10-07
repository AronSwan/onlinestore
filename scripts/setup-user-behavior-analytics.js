/**
 * 用户行为分析系统设置脚本
 * 配置和部署用户行为分析功能
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class UserBehaviorAnalyticsSetup {
  constructor() {
    this.config = {
      openobserveUrl: process.env.OPENOBSERVE_URL || 'http://localhost:5080',
      organization: process.env.OPENOBSERVE_ORGANIZATION || 'default',
      token: process.env.OPENOBSERVE_TOKEN || '',
      userBehaviorStream: process.env.USER_BEHAVIOR_STREAM || 'user-behavior',
      businessEventsStream: process.env.BUSINESS_EVENTS_STREAM || 'business-events',
      retention: process.env.ANALYTICS_RETENTION || '90d'
    };
  }

  /**
   * 执行完整的用户行为分析设置
   */
  async setup() {
    console.log('📊 开始设置用户行为分析系统...');
    
    try {
      // 1. 验证OpenObserve连接
      await this.verifyOpenObserveConnection();
      
      // 2. 创建用户行为数据流
      await this.createUserBehaviorStreams();
      
      // 3. 配置前端分析脚本
      await this.configureFrontendAnalytics();
      
      // 4. 配置后端分析服务
      await this.configureBackendAnalytics();
      
      // 5. 创建用户行为分析仪表板
      await this.createUserBehaviorDashboard();
      
      // 6. 测试用户行为分析功能
      await this.testUserBehaviorAnalytics();
      
      // 7. 生成配置文件
      await this.generateConfigFiles();
      
      console.log('✅ 用户行为分析系统设置完成');
      this.printSetupSummary();
      
    } catch (error) {
      console.error('❌ 用户行为分析系统设置失败:', error.message);
      throw error;
    }
  }

  /**
   * 验证OpenObserve连接
   */
  async verifyOpenObserveConnection() {
    console.log('📡 验证OpenObserve连接...');
    
    try {
      const response = await axios.get(`${this.config.openobserveUrl}/health`, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        console.log('✅ OpenObserve连接正常');
      } else {
        throw new Error(`OpenObserve健康检查失败: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`无法连接到OpenObserve: ${error.message}`);
    }
  }

  /**
   * 创建用户行为数据流
   */
  async createUserBehaviorStreams() {
    console.log('📊 创建用户行为数据流...');
    
    const streams = [
      {
        name: this.config.userBehaviorStream,
        type: 'logs',
        retention: this.config.retention,
        description: '用户行为数据'
      },
      {
        name: this.config.businessEventsStream,
        type: 'logs',
        retention: this.config.retention,
        description: '业务事件数据'
      }
    ];

    for (const stream of streams) {
      try {
        const response = await axios.post(
          `${this.config.openobserveUrl}/api/${this.config.organization}/streams`,
          stream,
          {
            headers: {
              'Authorization': `Bearer ${this.config.token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`✅ 数据流创建成功: ${stream.name}`);
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`ℹ️ 数据流已存在: ${stream.name}`);
        } else {
          throw new Error(`创建数据流失败 ${stream.name}: ${error.message}`);
        }
      }
    }
  }

  /**
   * 配置前端分析脚本
   */
  async configureFrontendAnalytics() {
    console.log('🌐 配置前端分析脚本...');
    
    // 创建前端分析配置
    const frontendConfig = {
      openobserveUrl: this.config.openobserveUrl,
      organization: this.config.organization,
      token: this.config.token,
      streamName: this.config.userBehaviorStream,
      batchSize: 10,
      flushInterval: 5000,
      enableClickTracking: true,
      enableScrollTracking: true,
      enableFormTracking: true,
      enablePageViewTracking: true,
      enablePerformanceTracking: true
    };

    // 生成前端配置文件
    const configDir = path.join(__dirname, '../config/analytics');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const configPath = path.join(configDir, 'frontend-analytics-config.json');
    fs.writeFileSync(configPath, JSON.stringify(frontendConfig, null, 2));
    console.log(`✅ 前端配置文件已生成: ${configPath}`);

    // 生成前端集成代码
    const integrationCode = this.generateFrontendIntegrationCode(frontendConfig);
    const integrationPath = path.join(configDir, 'frontend-integration.html');
    fs.writeFileSync(integrationPath, integrationCode);
    console.log(`✅ 前端集成代码已生成: ${integrationPath}`);
  }

  /**
   * 配置后端分析服务
   */
  async configureBackendAnalytics() {
    console.log('⚙️ 配置后端分析服务...');
    
    // 创建后端分析配置
    const backendConfig = {
      openobserveUrl: this.config.openobserveUrl,
      organization: this.config.organization,
      token: this.config.token,
      userBehaviorStream: this.config.userBehaviorStream,
      businessEventsStream: this.config.businessEventsStream,
      analyticsRetention: this.config.retention,
      enableRealTimeProcessing: true,
      enableAggregation: true,
      aggregationInterval: 60000
    };

    // 生成后端配置文件
    const configDir = path.join(__dirname, '../config/analytics');
    const configPath = path.join(configDir, 'backend-analytics-config.json');
    fs.writeFileSync(configPath, JSON.stringify(backendConfig, null, 2));
    console.log(`✅ 后端配置文件已生成: ${configPath}`);

    // 生成后端服务启动脚本
    const startupScript = this.generateBackendStartupScript(backendConfig);
    const scriptPath = path.join(__dirname, '../scripts/start-analytics-service.js');
    fs.writeFileSync(scriptPath, startupScript);
    console.log(`✅ 后端服务启动脚本已生成: ${scriptPath}`);
  }

  /**
   * 创建用户行为分析仪表板
   */
  async createUserBehaviorDashboard() {
    console.log('📈 创建用户行为分析仪表板...');
    
    try {
      const dashboardPath = path.join(__dirname, '../config/dashboards/user-behavior-analytics.json');
      
      if (!fs.existsSync(dashboardPath)) {
        throw new Error(`仪表板配置文件不存在: ${dashboardPath}`);
      }

      const dashboardConfig = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
      
      // 导入仪表板到OpenObserve
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/dashboards`,
        dashboardConfig,
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ 用户行为分析仪表板创建成功: ${response.data.id}`);
    } catch (error) {
      console.warn(`⚠️ 仪表板创建失败: ${error.message}`);
    }
  }

  /**
   * 测试用户行为分析功能
   */
  async testUserBehaviorAnalytics() {
    console.log('🧪 测试用户行为分析功能...');
    
    try {
      // 发送测试用户行为数据
      const testEvent = {
        eventType: 'page_view',
        timestamp: Date.now(),
        sessionId: this.generateSessionId(),
        userId: 'test-user',
        pageUrl: 'https://example.com/test',
        pageTitle: '测试页面',
        referrer: 'https://example.com',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        screenResolution: '1920x1080',
        viewportSize: '1200x800',
        language: 'zh-CN'
      };

      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.userBehaviorStream}/_json`,
        { events: [testEvent] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        console.log('✅ 用户行为数据发送测试成功');
      } else {
        throw new Error(`用户行为数据发送失败: ${response.status}`);
      }

      // 等待数据处理
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 验证数据是否到达
      const queryResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: {
            sql: `SELECT * FROM ${this.config.userBehaviorStream} WHERE sessionId = '${testEvent.sessionId}' LIMIT 1`
          },
          start_time: new Date(Date.now() - 60000).toISOString(),
          end_time: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (queryResponse.data.hits && queryResponse.data.hits.length > 0) {
        console.log('✅ 用户行为数据查询验证成功');
      } else {
        console.warn('⚠️ 用户行为数据查询验证失败 - 数据可能还在处理中');
      }

    } catch (error) {
      throw new Error(`用户行为分析功能测试失败: ${error.message}`);
    }
  }

  /**
   * 生成配置文件
   */
  async generateConfigFiles() {
    console.log('📝 生成配置文件...');
    
    // 生成环境变量文件
    const envContent = `
# 用户行为分析配置
OPENOBSERVE_URL=${this.config.openobserveUrl}
OPENOBSERVE_ORGANIZATION=${this.config.organization}
OPENOBSERVE_TOKEN=${this.config.token}
USER_BEHAVIOR_STREAM=${this.config.userBehaviorStream}
BUSINESS_EVENTS_STREAM=${this.config.businessEventsStream}
ANALYTICS_RETENTION=${this.config.retention}

# 前端分析配置
USER_BEHAVIOR_BATCH_SIZE=10
USER_BEHAVIOR_FLUSH_INTERVAL=5000
USER_BEHAVIOR_ENABLE_CLICK_TRACKING=true
USER_BEHAVIOR_ENABLE_SCROLL_TRACKING=true
USER_BEHAVIOR_ENABLE_FORM_TRACKING=true
USER_BEHAVIOR_ENABLE_PAGE_VIEW_TRACKING=true
USER_BEHAVIOR_ENABLE_PERFORMANCE_TRACKING=true

# 后端分析配置
ANALYTICS_ENABLE_REAL_TIME_PROCESSING=true
ANALYTICS_ENABLE_AGGREGATION=true
ANALYTICS_AGGREGATION_INTERVAL=60000
`;

    const envPath = path.join(__dirname, '../config/analytics/.env.analytics');
    fs.writeFileSync(envPath, envContent.trim());
    console.log(`✅ 环境变量文件已生成: ${envPath}`);

    // 生成Docker Compose配置
    const dockerComposeConfig = this.generateDockerComposeConfig();
    const dockerPath = path.join(__dirname, '../docker-compose.analytics.yml');
    fs.writeFileSync(dockerPath, dockerComposeConfig);
    console.log(`✅ Docker Compose配置已生成: ${dockerPath}`);

    // 生成README文档
    const readmeContent = this.generateReadmeContent();
    const readmePath = path.join(__dirname, '../docs/user-behavior-analytics-guide.md');
    fs.writeFileSync(readmePath, readmeContent);
    console.log(`✅ README文档已生成: ${readmePath}`);
  }

  /**
   * 生成前端集成代码
   */
  generateFrontendIntegrationCode(config) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>用户行为分析集成示例</title>
</head>
<body>
    <h1>用户行为分析集成示例</h1>
    <p>这是一个展示如何集成用户行为分析功能的示例页面。</p>
    
    <button id="test-button">测试按钮</button>
    <form id="test-form">
        <input type="text" name="test-input" placeholder="测试输入">
        <button type="submit">提交</button>
    </form>

    <!-- 用户行为分析脚本 -->
    <script>
        // 配置用户行为分析
        window.USER_BEHAVIOR_CONFIG = ${JSON.stringify(config, null, 2)};
    </script>
    <script src="/js/analytics/user-behavior-analytics.js"></script>
    
    <script>
        // 示例：追踪自定义事件
        document.getElementById('test-button').addEventListener('click', function() {
            if (window.userBehaviorAnalytics) {
                window.userBehaviorAnalytics.trackCustomEvent('button_click', {
                    button_id: 'test-button',
                    button_text: '测试按钮'
                });
            }
        });
        
        // 示例：追踪转化事件
        document.getElementById('test-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (window.userBehaviorAnalytics) {
                window.userBehaviorAnalytics.trackConversion('form_submission', 1, {
                    form_id: 'test-form',
                    form_data: 'test-data'
                });
            }
        });
        
        // 示例：追踪用户路径
        if (window.userBehaviorAnalytics) {
            window.userBehaviorAnalytics.trackUserPath('page_visit', 'example_page', {
                source: 'direct',
                campaign: 'test_campaign'
            });
        }
    </script>
</body>
</html>`;
  }

  /**
   * 生成后端服务启动脚本
   */
  generateBackendStartupScript(config) {
    return `/**
 * 用户行为分析服务启动脚本
 */

const UserBehaviorService = require('../backend/src/analytics/user-behavior-service');

// 配置
const config = ${JSON.stringify(config, null, 2)};

// 创建并启动服务
const analyticsService = new UserBehaviorService(config);

async function startService() {
    try {
        await analyticsService.initialize();
        console.log('📊 用户行为分析服务已启动');
        
        // 监听事件
        analyticsService.on('userBehaviorEvent', (event) => {
            console.log('收到用户行为事件:', event.eventType);
        });
        
        analyticsService.on('error', (error) => {
            console.error('用户行为分析服务错误:', error);
        });
        
        // 定期输出统计信息
        setInterval(() => {
            const stats = analyticsService.getRealTimeAnalytics();
            console.log('📊 实时统计:', stats);
        }, 30000); // 每30秒输出一次
        
    } catch (error) {
        console.error('启动用户行为分析服务失败:', error);
        process.exit(1);
    }
}

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('🔄 正在关闭用户行为分析服务...');
    analyticsService.stop();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🔄 正在关闭用户行为分析服务...');
    analyticsService.stop();
    process.exit(0);
});

// 启动服务
startService();
`;
  }

  /**
   * 生成Docker Compose配置
   */
  generateDockerComposeConfig() {
    return `version: '3.8'

services:
  user-behavior-analytics:
    build:
      context: .
      dockerfile: Dockerfile.analytics
    container_name: shopping-user-behavior-analytics
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - OPENOBSERVE_URL=${this.config.openobserveUrl}
      - OPENOBSERVE_ORGANIZATION=${this.config.organization}
      - OPENOBSERVE_TOKEN=${this.config.token}
      - USER_BEHAVIOR_STREAM=${this.config.userBehaviorStream}
      - BUSINESS_EVENTS_STREAM=${this.config.businessEventsStream}
      - ANALYTICS_RETENTION=${this.config.retention}
    volumes:
      - ./logs:/app/logs
    networks:
      - shopping-network
    depends_on:
      - openobserve

networks:
  shopping-network:
    external: true
`;
  }

  /**
   * 生成README文档
   */
  generateReadmeContent() {
    return `# 用户行为分析系统使用指南

## 概述

用户行为分析系统提供了全面的用户行为数据收集、分析和可视化功能，帮助您深入了解用户如何与您的网站互动。

## 功能特性

### 前端功能
- **页面浏览追踪**: 自动追踪页面访问和浏览行为
- **点击事件追踪**: 记录用户点击行为和位置
- **滚动深度追踪**: 监控用户页面滚动情况
- **表单交互追踪**: 记录表单填写和提交行为
- **性能监控**: 收集页面加载和性能数据
- **用户路径分析**: 追踪用户在网站中的导航路径
- **转化追踪**: 记录业务转化事件

### 后端功能
- **实时数据处理**: 实时处理和分析用户行为数据
- **数据聚合**: 定期聚合和分析用户行为指标
- **用户会话分析**: 分析用户会话时长和行为模式
- **转化漏斗分析**: 分析用户转化路径和漏斗效果
- **地理位置分析**: 分析用户地理分布情况
- **设备分析**: 分析用户使用的设备和浏览器

## 快速开始

### 1. 前端集成

在HTML页面中添加以下代码：

\`\`\`html
<!-- 配置用户行为分析 -->
<script>
window.USER_BEHAVIOR_CONFIG = {
    openobserveUrl: 'http://localhost:5080',
    organization: 'default',
    token: 'your-token-here',
    streamName: 'user-behavior',
    batchSize: 10,
    flushInterval: 5000,
    enableClickTracking: true,
    enableScrollTracking: true,
    enableFormTracking: true,
    enablePageViewTracking: true,
    enablePerformanceTracking: true
};
</script>

<!-- 加载用户行为分析脚本 -->
<script src="/js/analytics/user-behavior-analytics.js"></script>
\`\`\`

### 2. 自定义事件追踪

\`\`\`javascript
// 追踪自定义事件
window.userBehaviorAnalytics.trackCustomEvent('button_click', {
    button_id: 'purchase-button',
    product_id: 'prod-123',
    category: 'ecommerce'
});

// 追踪转化事件
window.userBehaviorAnalytics.trackConversion('purchase', 99.99, {
    product_id: 'prod-123',
    quantity: 1,
    payment_method: 'credit_card'
});

// 追踪用户路径
window.userBehaviorAnalytics.trackUserPath('product_view', 'product_page', {
    product_id: 'prod-123',
    category: 'electronics',
    source: 'search'
});
\`\`\`

### 3. 后端服务启动

\`\`\`bash
# 启动用户行为分析服务
node scripts/start-analytics-service.js

# 或使用Docker
docker-compose -f docker-compose.analytics.yml up -d
\`\`\`

## 配置选项

### 前端配置

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| openobserveUrl | string | 'http://localhost:5080' | OpenObserve服务地址 |
| organization | string | 'default' | 组织名称 |
| token | string | '' | 认证令牌 |
| streamName | string | 'user-behavior' | 数据流名称 |
| batchSize | number | 10 | 批量发送大小 |
| flushInterval | number | 5000 | 发送间隔(毫秒) |
| enableClickTracking | boolean | true | 启用点击追踪 |
| enableScrollTracking | boolean | true | 启用滚动追踪 |
| enableFormTracking | boolean | true | 启用表单追踪 |
| enablePageViewTracking | boolean | true | 启用页面浏览追踪 |
| enablePerformanceTracking | boolean | true | 启用性能追踪 |

### 后端配置

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| openobserveUrl | string | 'http://localhost:5080' | OpenObserve服务地址 |
| organization | string | 'default' | 组织名称 |
| token | string | '' | 认证令牌 |
| userBehaviorStream | string | 'user-behavior' | 用户行为数据流 |
| businessEventsStream | string | 'business-events' | 业务事件数据流 |
| analyticsRetention | string | '90d' | 数据保留期 |
| enableRealTimeProcessing | boolean | true | 启用实时处理 |
| enableAggregation | boolean | true | 启用数据聚合 |
| aggregationInterval | number | 60000 | 聚合间隔(毫秒) |

## 数据字段说明

### 页面浏览事件

\`\`\`json
{
    "eventType": "page_view",
    "timestamp": 1699123456789,
    "sessionId": "session_abc123",
    "userId": "user_456",
    "pageUrl": "https://example.com/products",
    "pageTitle": "产品页面",
    "referrer": "https://google.com",
    "userAgent": "Mozilla/5.0...",
    "screenResolution": "1920x1080",
    "viewportSize": "1200x800",
    "language": "zh-CN"
}
\`\`\`

### 点击事件

\`\`\`json
{
    "eventType": "click",
    "timestamp": 1699123456789,
    "sessionId": "session_abc123",
    "userId": "user_456",
    "pageUrl": "https://example.com/products",
    "element": {
        "tagName": "button",
        "id": "purchase-btn",
        "className": "btn btn-primary",
        "text": "立即购买"
    },
    "position": {
        "x": 300,
        "y": 200,
        "pageX": 300,
        "pageY": 200
    }
}
\`\`\`

### 转化事件

\`\`\`json
{
    "eventType": "conversion",
    "timestamp": 1699123456789,
    "sessionId": "session_abc123",
    "userId": "user_456",
    "pageUrl": "https://example.com/checkout",
    "conversionType": "purchase",
    "conversionValue": 99.99,
    "metadata": {
        "product_id": "prod-123",
        "quantity": 1,
        "payment_method": "credit_card"
    }
}
\`\`\`

## 仪表板使用

系统提供了以下仪表板：

1. **用户行为分析仪表板**
   - 实时概览
   - 页面浏览趋势
   - 热门页面TOP10
   - 用户会话分析
   - 设备类型分布
   - 转化漏斗
   - 用户路径分析
   - 点击热力图
   - 滚动深度分布
   - 表单交互分析
   - 性能指标
   - 地理分布

## API接口

### 获取实时分析数据

\`\`\`javascript
const analytics = await userBehaviorService.getRealTimeAnalytics();
console.log(analytics);
\`\`\`

### 获取聚合分析数据

\`\`\`javascript
const analytics = await userBehaviorService.getAggregatedAnalytics('1h');
console.log(analytics);
\`\`\`

## 最佳实践

1. **合理设置采样率**: 在高流量网站上，适当调整采样率以控制数据量
2. **保护用户隐私**: 对敏感数据进行脱敏处理
3. **优化批量发送**: 根据网络情况调整批量大小和发送间隔
4. **监控数据质量**: 定期检查数据完整性和准确性
5. **合理设置保留期**: 根据业务需求和存储成本设置数据保留期

## 故障排除

### 常见问题

1. **数据未显示在仪表板中**
   - 检查OpenObserve连接是否正常
   - 验证认证令牌是否正确
   - 确认数据流是否存在

2. **前端脚本加载失败**
   - 检查脚本路径是否正确
   - 确认配置参数是否有效
   - 查看浏览器控制台错误信息

3. **后端服务启动失败**
   - 检查环境变量配置
   - 确认OpenObserve服务可访问
   - 查看服务日志错误信息

### 调试方法

1. 启用详细日志记录
2. 使用浏览器开发者工具检查网络请求
3. 查看OpenObserve日志
4. 使用测试脚本验证功能

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基础用户行为追踪
- 提供实时分析功能
- 集成OpenObserve数据存储

## 支持

如有问题或建议，请联系技术支持团队。
`;
  }

  /**
   * 生成会话ID
   */
  generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * 打印设置摘要
   */
  printSetupSummary() {
    console.log('\n📋 用户行为分析系统设置摘要:');
    console.log('=====================================');
    console.log(`🔗 OpenObserve URL: ${this.config.openobserveUrl}`);
    console.log(`🏢 组织: ${this.config.organization}`);
    console.log(`📊 用户行为数据流: ${this.config.userBehaviorStream}`);
    console.log(`💼 业务事件数据流: ${this.config.businessEventsStream}`);
    console.log(`⏰ 数据保留期: ${this.config.retention}`);
    console.log('\n📁 生成的文件:');
    console.log(`  - config/analytics/frontend-analytics-config.json`);
    console.log(`  - config/analytics/backend-analytics-config.json`);
    console.log(`  - config/analytics/frontend-integration.html`);
    console.log(`  - config/analytics/.env.analytics`);
    console.log(`  - scripts/start-analytics-service.js`);
    console.log(`  - docker-compose.analytics.yml`);
    console.log(`  - docs/user-behavior-analytics-guide.md`);
    console.log('\n🚀 下一步操作:');
    console.log('  1. 在HTML页面中集成前端分析脚本');
    console.log('  2. 启动后端分析服务: node scripts/start-analytics-service.js');
    console.log('  3. 访问OpenObserve查看用户行为分析仪表板');
    console.log('  4. 根据业务需求配置自定义事件追踪');
    console.log('\n📖 使用指南:');
    console.log('  - 查看文档: docs/user-behavior-analytics-guide.md');
    console.log('  - 前端集成示例: config/analytics/frontend-integration.html');
    console.log('  - 后端服务配置: config/analytics/backend-analytics-config.json');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const setup = new UserBehaviorAnalyticsSetup();
  setup.setup().catch(error => {
    console.error('设置失败:', error);
    process.exit(1);
  });
}

module.exports = UserBehaviorAnalyticsSetup;