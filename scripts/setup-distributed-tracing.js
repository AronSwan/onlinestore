/**
 * 分布式追踪系统设置脚本
 * 配置和测试OpenTelemetry追踪集成
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class DistributedTracingSetup {
  constructor() {
    this.config = {
      openobserveUrl: process.env.OPENOBSERVE_URL || 'http://localhost:5080',
      organization: process.env.OPENOBSERVE_ORGANIZATION || 'default',
      token: process.env.OPENOBSERVE_TOKEN || '',
      serviceName: process.env.SERVICE_NAME || 'caddy-shopping-backend',
      environment: process.env.NODE_ENV || 'development'
    };
    
    this.streams = {
      traces: 'request-traces',
      logs: 'application-logs',
      metrics: 'system-metrics'
    };
  }

  /**
   * 执行完整的分布式追踪设置
   */
  async setup() {
    console.log('🔍 开始设置分布式追踪系统...');
    
    try {
      // 1. 验证OpenObserve连接
      await this.verifyOpenObserveConnection();
      
      // 2. 创建追踪数据流
      await this.createTracingStreams();
      
      // 3. 配置OpenTelemetry环境
      await this.configureOpenTelemetry();
      
      // 4. 创建追踪仪表板
      await this.createTracingDashboard();
      
      // 5. 测试追踪功能
      await this.testTracingFunctionality();
      
      // 6. 生成配置文件
      await this.generateConfigFiles();
      
      console.log('✅ 分布式追踪系统设置完成');
      this.printSetupSummary();
      
    } catch (error) {
      console.error('❌ 分布式追踪系统设置失败:', error.message);
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
   * 创建追踪数据流
   */
  async createTracingStreams() {
    console.log('📊 创建追踪数据流...');
    
    const streams = [
      {
        name: this.streams.traces,
        type: 'traces',
        retention: '7d',
        description: '分布式追踪数据'
      },
      {
        name: this.streams.logs,
        type: 'logs',
        retention: '30d',
        description: '应用程序日志'
      },
      {
        name: this.streams.metrics,
        type: 'metrics',
        retention: '90d',
        description: '系统指标'
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
   * 配置OpenTelemetry环境
   */
  async configureOpenTelemetry() {
    console.log('⚙️ 配置OpenTelemetry环境...');
    
    // 创建OpenTelemetry配置目录
    const configDir = path.join(__dirname, '../config/tracing');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // 生成OpenTelemetry配置文件
    const otelConfig = {
      service: {
        name: this.config.serviceName,
        version: '1.0.0',
        environment: this.config.environment
      },
      exporter: {
        otlp: {
          endpoint: `${this.config.openobserveUrl}/api/${this.config.organization}/traces`,
          headers: {
            'Authorization': `Bearer ${this.config.token}`
          },
          protocol: 'http/protobuf'
        }
      },
      sampler: {
        type: this.config.environment === 'production' ? 'traceidratio' : 'always_on',
        argument: this.config.environment === 'production' ? 0.1 : 1.0
      },
      resource: {
        attributes: {
          'service.name': this.config.serviceName,
          'service.version': '1.0.0',
          'deployment.environment': this.config.environment,
          'host.name': require('os').hostname()
        }
      }
    };

    const configPath = path.join(configDir, 'opentelemetry-config.json');
    fs.writeFileSync(configPath, JSON.stringify(otelConfig, null, 2));
    console.log(`✅ OpenTelemetry配置文件已生成: ${configPath}`);

    // 生成环境变量文件
    const envContent = `
# OpenTelemetry配置
OTEL_SERVICE_NAME=${this.config.serviceName}
OTEL_SERVICE_VERSION=1.0.0
OTEL_EXPORTER_OTLP_ENDPOINT=${this.config.openobserveUrl}/api/${this.config.organization}/traces
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer ${this.config.token}
OTEL_RESOURCE_ATTRIBUTES=service.name=${this.config.serviceName},service.version=1.0.0,deployment.environment=${this.config.environment}
OTEL_TRACES_SAMPLER=${this.config.environment === 'production' ? 'traceidratio' : 'always_on'}
OTEL_TRACES_SAMPLER_ARG=${this.config.environment === 'production' ? '0.1' : '1.0'}

# OpenObserve配置
OPENOBSERVE_URL=${this.config.openobserveUrl}
OPENOBSERVE_ORGANIZATION=${this.config.organization}
OPENOBSERVE_TOKEN=${this.config.token}
OPENOBSERVE_STREAM_TRACES=${this.streams.traces}
OPENOBSERVE_STREAM_LOGS=${this.streams.logs}
OPENOBSERVE_STREAM_METRICS=${this.streams.metrics}
`;

    const envPath = path.join(configDir, '.env.tracing');
    fs.writeFileSync(envPath, envContent.trim());
    console.log(`✅ 环境变量文件已生成: ${envPath}`);
  }

  /**
   * 创建追踪仪表板
   */
  async createTracingDashboard() {
    console.log('📈 创建追踪仪表板...');
    
    try {
      const dashboardPath = path.join(__dirname, '../config/dashboards/distributed-tracing.json');
      
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
      
      console.log(`✅ 追踪仪表板创建成功: ${response.data.id}`);
    } catch (error) {
      console.warn(`⚠️ 仪表板创建失败: ${error.message}`);
    }
  }

  /**
   * 测试追踪功能
   */
  async testTracingFunctionality() {
    console.log('🧪 测试追踪功能...');
    
    try {
      // 发送测试追踪数据
      const testTrace = {
        trace_id: this.generateTraceId(),
        span_id: this.generateSpanId(),
        parent_span_id: null,
        operation_name: 'test.operation',
        service_name: this.config.serviceName,
        start_time: Date.now() * 1000000, // 纳秒
        end_time: (Date.now() + 100) * 1000000, // 纳秒
        duration: 100000000, // 纳秒
        status_code: 1,
        status_message: 'OK',
        tags: {
          'test.trace': 'true',
          'environment': this.config.environment
        },
        logs: [
          {
            timestamp: Date.now() * 1000000,
            fields: {
              message: '测试追踪日志',
              level: 'INFO'
            }
          }
        ]
      };

      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.streams.traces}/_json`,
        { traces: [testTrace] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        console.log('✅ 追踪数据发送测试成功');
      } else {
        throw new Error(`追踪数据发送失败: ${response.status}`);
      }

      // 等待数据处理
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 验证数据是否到达
      const queryResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: {
            sql: `SELECT * FROM ${this.streams.traces} WHERE trace_id = '${testTrace.trace_id}' LIMIT 1`
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
        console.log('✅ 追踪数据查询验证成功');
      } else {
        console.warn('⚠️ 追踪数据查询验证失败 - 数据可能还在处理中');
      }

    } catch (error) {
      throw new Error(`追踪功能测试失败: ${error.message}`);
    }
  }

  /**
   * 生成配置文件
   */
  async generateConfigFiles() {
    console.log('📝 生成配置文件...');
    
    // 生成package.json依赖
    const dependencies = {
      "@opentelemetry/api": "^1.4.1",
      "@opentelemetry/sdk-node": "^0.41.2",
      "@opentelemetry/auto-instrumentations-node": "^0.44.0",
      "@opentelemetry/exporter-otlp-http": "^0.41.2",
      "@opentelemetry/sdk-trace-base": "^1.18.1",
      "@opentelemetry/resources": "^1.18.1",
      "@opentelemetry/semantic-conventions": "^1.18.1"
    };

    const packageJsonPath = path.join(__dirname, '../package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // 添加依赖
      if (!packageJson.dependencies) {
        packageJson.dependencies = {};
      }
      
      Object.assign(packageJson.dependencies, dependencies);
      
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('✅ package.json依赖已更新');
    }

    // 生成启动脚本
    const startupScript = `#!/bin/bash
# 分布式追踪启动脚本

echo "🔍 启动分布式追踪系统..."

# 加载环境变量
source config/tracing/.env.tracing

# 安装依赖
echo "📦 安装OpenTelemetry依赖..."
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-otlp-http

# 启动应用
echo "🚀 启动应用..."
node -r ./backend/src/tracing/opentelemetry-config.js backend/src/app.js
`;

    const scriptPath = path.join(__dirname, '../scripts/start-with-tracing.sh');
    fs.writeFileSync(scriptPath, startupScript);
    
    // 设置执行权限 (在Unix系统上)
    try {
      fs.chmodSync(scriptPath, '755');
    } catch (error) {
      // 忽略权限设置错误
    }
    
    console.log(`✅ 启动脚本已生成: ${scriptPath}`);
  }

  /**
   * 生成追踪ID
   */
  generateTraceId() {
    return Math.random().toString(16).substr(2, 32);
  }

  /**
   * 生成Span ID
   */
  generateSpanId() {
    return Math.random().toString(16).substr(2, 16);
  }

  /**
   * 打印设置摘要
   */
  printSetupSummary() {
    console.log('\n📋 分布式追踪系统设置摘要:');
    console.log('=====================================');
    console.log(`🔗 OpenObserve URL: ${this.config.openobserveUrl}`);
    console.log(`🏢 组织: ${this.config.organization}`);
    console.log(`🎯 服务名称: ${this.config.serviceName}`);
    console.log(`🌍 环境: ${this.config.environment}`);
    console.log(`📊 追踪数据流: ${this.streams.traces}`);
    console.log(`📝 日志数据流: ${this.streams.logs}`);
    console.log(`📈 指标数据流: ${this.streams.metrics}`);
    console.log('\n📁 生成的文件:');
    console.log(`  - config/tracing/opentelemetry-config.json`);
    console.log(`  - config/tracing/.env.tracing`);
    console.log(`  - scripts/start-with-tracing.sh`);
    console.log('\n🚀 下一步操作:');
    console.log('  1. 安装依赖: npm install');
    console.log('  2. 启动应用: ./scripts/start-with-tracing.sh');
    console.log('  3. 访问OpenObserve: http://localhost:5080');
    console.log('  4. 查看追踪仪表板: 分布式追踪监控');
    console.log('\n📖 使用指南:');
    console.log('  - 在应用中使用 TracingUtils.createCustomSpan() 创建自定义span');
    console.log('  - 使用 TracingUtils.recordBusinessEvent() 记录业务事件');
    console.log('  - 使用 TracingUtils.recordError() 记录错误信息');
    console.log('  - 前端集成: 引入 js/tracing/frontend-tracing.js');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const setup = new DistributedTracingSetup();
  setup.setup().catch(error => {
    console.error('设置失败:', error);
    process.exit(1);
  });
}

module.exports = DistributedTracingSetup;