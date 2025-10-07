/**
 * 性能优化系统设置脚本
 * 配置和部署性能优化功能
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class PerformanceOptimizationSetup {
  constructor() {
    this.config = {
      openobserveUrl: process.env.OPENOBSERVE_URL || 'http://localhost:5080',
      organization: process.env.OPENOBSERVE_ORGANIZATION || 'default',
      token: process.env.OPENOBSERVE_TOKEN || '',
      metricsStream: process.env.METRICS_STREAM || 'performance-metrics',
      optimizationStream: process.env.OPTIMIZATION_STREAM || 'optimization-recommendations',
      retention: process.env.PERFORMANCE_RETENTION || '30d'
    };
  }

  /**
   * 执行完整的性能优化设置
   */
  async setup() {
    console.log('⚡ 开始设置性能优化系统...');
    
    try {
      // 1. 验证OpenObserve连接
      await this.verifyOpenObserveConnection();
      
      // 2. 创建性能数据流
      await this.createPerformanceStreams();
      
      // 3. 配置性能优化服务
      await this.configurePerformanceOptimizationService();
      
      // 4. 创建性能优化仪表板
      await this.createPerformanceOptimizationDashboard();
      
      // 5. 测试性能优化功能
      await this.testPerformanceOptimization();
      
      // 6. 生成配置文件
      await this.generateConfigFiles();
      
      console.log('✅ 性能优化系统设置完成');
      this.printSetupSummary();
      
    } catch (error) {
      console.error('❌ 性能优化系统设置失败:', error.message);
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
   * 创建性能数据流
   */
  async createPerformanceStreams() {
    console.log('📊 创建性能数据流...');
    
    const streams = [
      {
        name: this.config.metricsStream,
        type: 'metrics',
        retention: this.config.retention,
        description: '性能指标数据'
      },
      {
        name: this.config.optimizationStream,
        type: 'logs',
        retention: this.config.retention,
        description: '优化建议数据'
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
   * 配置性能优化服务
   */
  async configurePerformanceOptimizationService() {
    console.log('⚙️ 配置性能优化服务...');
    
    // 创建性能优化配置
    const performanceConfig = {
      openobserveUrl: this.config.openobserveUrl,
      organization: this.config.organization,
      token: this.config.token,
      metricsStream: this.config.metricsStream,
      optimizationStream: this.config.optimizationStream,
      enableAutoOptimization: true,
      optimizationInterval: 300000, // 5分钟
      enableResourceMonitoring: true,
      resourceMonitoringInterval: 60000, // 1分钟
      enableQueryOptimization: true,
      enableCacheOptimization: true,
      enableIndexOptimization: true,
      thresholds: {
        cpuUsage: 80,
        memoryUsage: 85,
        diskUsage: 90,
        queryResponseTime: 2000,
        cacheHitRate: 80,
        errorRate: 5
      }
    };

    // 生成配置文件
    const configDir = path.join(__dirname, '../config/performance');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const configPath = path.join(configDir, 'performance-optimization-config.json');
    fs.writeFileSync(configPath, JSON.stringify(performanceConfig, null, 2));
    console.log(`✅ 性能优化配置文件已生成: ${configPath}`);

    // 生成服务启动脚本
    const startupScript = this.generatePerformanceServiceStartupScript(performanceConfig);
    const scriptPath = path.join(__dirname, '../scripts/start-performance-service.js');
    fs.writeFileSync(scriptPath, startupScript);
    console.log(`✅ 性能服务启动脚本已生成: ${scriptPath}`);
  }

  /**
   * 创建性能优化仪表板
   */
  async createPerformanceOptimizationDashboard() {
    console.log('📈 创建性能优化仪表板...');
    
    try {
      const dashboardPath = path.join(__dirname, '../config/dashboards/performance-optimization.json');
      
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
      
      console.log(`✅ 性能优化仪表板创建成功: ${response.data.id}`);
    } catch (error) {
      console.warn(`⚠️ 仪表板创建失败: ${error.message}`);
    }
  }

  /**
   * 测试性能优化功能
   */
  async testPerformanceOptimization() {
    console.log('🧪 测试性能优化功能...');
    
    try {
      // 发送测试性能指标
      const testMetrics = {
        timestamp: Date.now(),
        cpu: {
          usage: 45.5,
          cores: 4
        },
        memory: {
          total: 8589934592, // 8GB
          used: 4294967296, // 4GB
          free: 4294967296, // 4GB
          usage: 50.0
        },
        disk: {
          total: 1000000000000, // 1TB
          used: 500000000000, // 500GB
          free: 500000000000, // 500GB
          usage: 50.0
        },
        network: {
          bytesIn: 1024000,
          bytesOut: 512000,
          packetsIn: 1024,
          packetsOut: 512
        }
      };

      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.metricsStream}/_json`,
        { metrics: [testMetrics] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        console.log('✅ 性能指标发送测试成功');
      } else {
        throw new Error(`性能指标发送失败: ${response.status}`);
      }

      // 等待数据处理
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 验证数据是否到达
      const queryResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: {
            sql: `SELECT * FROM ${this.config.metricsStream} WHERE timestamp = ${testMetrics.timestamp} LIMIT 1`
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
        console.log('✅ 性能指标查询验证成功');
      } else {
        console.warn('⚠️ 性能指标查询验证失败 - 数据可能还在处理中');
      }

      // 测试优化建议
      await this.testOptimizationRecommendations();

    } catch (error) {
      throw new Error(`性能优化功能测试失败: ${error.message}`);
    }
  }

  /**
   * 测试优化建议
   */
  async testOptimizationRecommendations() {
    console.log('🔧 测试优化建议...');
    
    try {
      const testRecommendations = {
        timestamp: Date.now(),
        recommendations: [
          {
            type: 'cpu_optimization',
            priority: 'medium',
            title: 'CPU使用率优化',
            description: 'CPU使用率略高，建议优化算法',
            actions: ['优化循环', '减少计算量']
          },
          {
            type: 'memory_optimization',
            priority: 'low',
            title: '内存使用优化',
            description: '内存使用正常，可进一步优化',
            actions: ['检查内存泄漏', '优化数据结构']
          }
        ],
        executed: false
      };

      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.optimizationStream}/_json`,
        { recommendations: [testRecommendations] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        console.log('✅ 优化建议发送测试成功');
      } else {
        throw new Error(`优化建议发送失败: ${response.status}`);
      }

    } catch (error) {
      console.warn(`⚠️ 优化建议测试失败: ${error.message}`);
    }
  }

  /**
   * 生成配置文件
   */
  async generateConfigFiles() {
    console.log('📝 生成配置文件...');
    
    // 生成环境变量文件
    const envContent = `
# 性能优化配置
OPENOBSERVE_URL=${this.config.openobserveUrl}
OPENOBSERVE_ORGANIZATION=${this.config.organization}
OPENOBSERVE_TOKEN=${this.config.token}
METRICS_STREAM=${this.config.metricsStream}
OPTIMIZATION_STREAM=${this.config.optimizationStream}
PERFORMANCE_RETENTION=${this.config.retention}

# 性能优化服务配置
PERFORMANCE_ENABLE_AUTO_OPTIMIZATION=true
PERFORMANCE_OPTIMIZATION_INTERVAL=300000
PERFORMANCE_ENABLE_RESOURCE_MONITORING=true
PERFORMANCE_RESOURCE_MONITORING_INTERVAL=60000
PERFORMANCE_ENABLE_QUERY_OPTIMIZATION=true
PERFORMANCE_ENABLE_CACHE_OPTIMIZATION=true
PERFORMANCE_ENABLE_INDEX_OPTIMIZATION=true

# 性能阈值
PERFORMANCE_THRESHOLD_CPU_USAGE=80
PERFORMANCE_THRESHOLD_MEMORY_USAGE=85
PERFORMANCE_THRESHOLD_DISK_USAGE=90
PERFORMANCE_THRESHOLD_QUERY_RESPONSE_TIME=2000
PERFORMANCE_THRESHOLD_CACHE_HIT_RATE=80
PERFORMANCE_THRESHOLD_ERROR_RATE=5
`;

    const envPath = path.join(__dirname, '../config/performance/.env.performance');
    fs.writeFileSync(envPath, envContent.trim());
    console.log(`✅ 环境变量文件已生成: ${envPath}`);

    // 生成Docker Compose配置
    const dockerComposeConfig = this.generateDockerComposeConfig();
    const dockerPath = path.join(__dirname, '../docker-compose.performance.yml');
    fs.writeFileSync(dockerPath, dockerComposeConfig);
    console.log(`✅ Docker Compose配置已生成: ${dockerPath}`);

    // 生成性能优化指南
    const guideContent = this.generatePerformanceOptimizationGuide();
    const guidePath = path.join(__dirname, '../docs/performance-optimization-guide.md');
    fs.writeFileSync(guidePath, guideContent);
    console.log(`✅ 性能优化指南已生成: ${guidePath}`);

    // 生成系统调优脚本
    const tuningScript = this.generateSystemTuningScript();
    const scriptPath = path.join(__dirname, '../scripts/system-tuning.sh');
    fs.writeFileSync(scriptPath, tuningScript);
    console.log(`✅ 系统调优脚本已生成: ${scriptPath}`);
  }

  /**
   * 生成性能服务启动脚本
   */
  generatePerformanceServiceStartupScript(config) {
    return `/**
 * 性能优化服务启动脚本
 */

const PerformanceOptimizationService = require('../backend/src/performance/performance-optimization-service');

// 配置
const config = ${JSON.stringify(config, null, 2)};

// 创建并启动服务
const performanceService = new PerformanceOptimizationService(config);

async function startService() {
    try {
        await performanceService.initialize();
        console.log('⚡ 性能优化服务已启动');
        
        // 监听性能警报
        performanceService.on('performanceAlert', (alerts) => {
            console.log('🚨 性能警报:', alerts);
        });
        
        // 监听优化建议
        performanceService.on('optimizationRecommendations', (recommendations) => {
            console.log('🔧 优化建议:', recommendations.recommendations.length, '条');
        });
        
        // 监听资源指标收集
        performanceService.on('resourceMetricsCollected', (metrics) => {
            console.log('📊 资源指标已收集:', {
                cpu: metrics.cpu.usage.toFixed(2) + '%',
                memory: metrics.memory.usage.toFixed(2) + '%',
                disk: metrics.disk.usage.toFixed(2) + '%'
            });
        });
        
        // 定期输出性能统计
        setInterval(() => {
            const stats = performanceService.getPerformanceStats();
            console.log('📈 性能统计:', stats);
        }, 300000); // 每5分钟输出一次
        
    } catch (error) {
        console.error('启动性能优化服务失败:', error);
        process.exit(1);
    }
}

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('🔄 正在关闭性能优化服务...');
    performanceService.stop();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🔄 正在关闭性能优化服务...');
    performanceService.stop();
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
  performance-optimization:
    build:
      context: .
      dockerfile: Dockerfile.performance
    container_name: shopping-performance-optimization
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - OPENOBSERVE_URL=${this.config.openobserveUrl}
      - OPENOBSERVE_ORGANIZATION=${this.config.organization}
      - OPENOBSERVE_TOKEN=${this.config.token}
      - METRICS_STREAM=${this.config.metricsStream}
      - OPTIMIZATION_STREAM=${this.config.optimizationStream}
      - PERFORMANCE_RETENTION=${this.config.retention}
      - PERFORMANCE_ENABLE_AUTO_OPTIMIZATION=true
      - PERFORMANCE_OPTIMIZATION_INTERVAL=300000
      - PERFORMANCE_ENABLE_RESOURCE_MONITORING=true
      - PERFORMANCE_RESOURCE_MONITORING_INTERVAL=60000
      - PERFORMANCE_ENABLE_QUERY_OPTIMIZATION=true
      - PERFORMANCE_ENABLE_CACHE_OPTIMIZATION=true
      - PERFORMANCE_ENABLE_INDEX_OPTIMIZATION=true
      - PERFORMANCE_THRESHOLD_CPU_USAGE=80
      - PERFORMANCE_THRESHOLD_MEMORY_USAGE=85
      - PERFORMANCE_THRESHOLD_DISK_USAGE=90
      - PERFORMANCE_THRESHOLD_QUERY_RESPONSE_TIME=2000
      - PERFORMANCE_THRESHOLD_CACHE_HIT_RATE=80
      - PERFORMANCE_THRESHOLD_ERROR_RATE=5
    volumes:
      - ./config/performance:/app/config/performance
      - ./logs:/app/logs
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
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
   * 生成性能优化指南
   */
  generatePerformanceOptimizationGuide() {
    return `# 性能优化系统使用指南

## 概述

性能优化系统提供了全面的系统性能监控、分析和优化功能，帮助您识别性能瓶颈并自动生成优化建议。

## 功能特性

### 资源监控
- **CPU监控**: 实时监控CPU使用率和核心数
- **内存监控**: 监控内存使用情况，包括总量、已用和可用内存
- **磁盘监控**: 监控磁盘使用率和空间
- **网络监控**: 监控网络IO，包括字节数和包数

### 性能分析
- **查询性能分析**: 分析慢查询和查询响应时间
- **缓存性能分析**: 监控缓存命中率和效率
- **索引性能分析**: 识别全表扫描和索引使用情况
- **资源使用趋势**: 分析资源使用历史和趋势

### 自动优化
- **自动优化建议**: 基于性能数据自动生成优化建议
- **性能警报**: 当资源使用超过阈值时发出警报
- **优化历史**: 记录所有优化建议和执行情况
- **阈值配置**: 可配置的性能阈值

## 快速开始

### 1. 启动性能优化服务

\`\`\`bash
# 启动性能优化服务
node scripts/start-performance-service.js

# 或使用Docker
docker-compose -f docker-compose.performance.yml up -d
\`\`\`

### 2. 查看性能指标

\`\`\`javascript
const PerformanceOptimizationService = require('./backend/src/performance/performance-optimization-service');

// 创建性能优化服务实例
const service = new PerformanceOptimizationService({
  openobserveUrl: 'http://localhost:5080',
  organization: 'default',
  token: 'your-token-here'
});

// 初始化服务
await service.initialize();

// 获取性能指标
const metrics = service.getPerformanceMetrics('1h');
console.log(metrics);
\`\`\`

### 3. 获取优化建议

\`\`\`javascript
// 获取优化建议
const recommendations = service.getOptimizationRecommendations(20);
console.log(recommendations);

// 手动执行优化
await service.executeOptimization();
\`\`\`

## 配置选项

### 基础配置

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| openobserveUrl | string | 'http://localhost:5080' | OpenObserve服务地址 |
| organization | string | 'default' | 组织名称 |
| token | string | '' | 认证令牌 |
| metricsStream | string | 'performance-metrics' | 性能指标数据流 |
| optimizationStream | string | 'optimization-recommendations' | 优化建议数据流 |

### 监控配置

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| enableAutoOptimization | boolean | true | 启用自动优化 |
| optimizationInterval | number | 300000 | 优化间隔(毫秒) |
| enableResourceMonitoring | boolean | true | 启用资源监控 |
| resourceMonitoringInterval | number | 60000 | 资源监控间隔(毫秒) |
| enableQueryOptimization | boolean | true | 启用查询优化 |
| enableCacheOptimization | boolean | true | 启用缓存优化 |
| enableIndexOptimization | boolean | true | 启用索引优化 |

### 性能阈值

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| cpuUsage | number | 80 | CPU使用率阈值(%) |
| memoryUsage | number | 85 | 内存使用率阈值(%) |
| diskUsage | number | 90 | 磁盘使用率阈值(%) |
| queryResponseTime | number | 2000 | 查询响应时间阈值(毫秒) |
| cacheHitRate | number | 80 | 缓存命中率阈值(%) |
| errorRate | number | 5 | 错误率阈值(%) |

## 优化建议类型

### CPU优化
当CPU使用率超过阈值时，系统会生成CPU优化建议：

\`\`\`json
{
  "type": "cpu_optimization",
  "priority": "high",
  "title": "CPU使用率过高",
  "description": "平均CPU使用率为 85.5%，超过阈值 80%",
  "actions": [
    "检查CPU密集型进程",
    "优化算法和循环",
    "增加CPU核心数",
    "启用负载均衡"
  ]
}
\`\`\`

### 内存优化
当内存使用率超过阈值时，系统会生成内存优化建议：

\`\`\`json
{
  "type": "memory_optimization",
  "priority": "high",
  "title": "内存使用率过高",
  "description": "平均内存使用率为 87.2%，超过阈值 85%",
  "actions": [
    "检查内存泄漏",
    "优化数据结构",
    "增加内存容量",
    "启用内存缓存"
  ]
}
\`\`\`

### 磁盘优化
当磁盘使用率超过阈值时，系统会生成磁盘优化建议：

\`\`\`json
{
  "type": "disk_optimization",
  "priority": "critical",
  "title": "磁盘使用率过高",
  "description": "平均磁盘使用率为 92.3%，超过阈值 90%",
  "actions": [
    "清理临时文件",
    "压缩或归档旧数据",
    "增加磁盘容量",
    "优化数据存储策略"
  ]
}
\`\`\`

### 查询优化
当查询响应时间超过阈值时，系统会生成查询优化建议：

\`\`\`json
{
  "type": "query_optimization",
  "priority": "high",
  "title": "发现慢查询",
  "description": "在过去1小时内发现 5 个慢查询，平均响应时间超过 2000ms",
  "actions": [
    "优化查询语句",
    "添加适当的索引",
    "限制查询结果集",
    "使用查询缓存"
  ],
  "details": [...]
}
\`\`\`

### 缓存优化
当缓存命中率低于阈值时，系统会生成缓存优化建议：

\`\`\`json
{
  "type": "cache_optimization",
  "priority": "medium",
  "title": "缓存命中率过低",
  "description": "缓存命中率为 65.5%，低于阈值 80%",
  "actions": [
    "增加缓存容量",
    "优化缓存策略",
    "调整缓存过期时间",
    "预热常用数据"
  ]
}
\`\`\`

### 索引优化
当发现全表扫描时，系统会生成索引优化建议：

\`\`\`json
{
  "type": "index_optimization",
  "priority": "medium",
  "title": "发现全表扫描",
  "description": "在过去1小时内发现 3 个可能的全表扫描查询",
  "actions": [
    "为常用查询字段添加索引",
    "优化查询条件",
    "使用覆盖索引",
    "定期分析查询计划"
  ],
  "details": [...]
}
\`\`\`

## API接口

### 获取性能指标

\`\`\`http
GET /api/performance/metrics?timeRange=1h
\`\`\`

**查询参数**:
- \`timeRange\`: 时间范围 (1h, 6h, 24h, 7d)

**响应**:
\`\`\`json
{
  "metrics": [
    {
      "timestamp": 1699123456789,
      "cpu": {
        "usage": 45.5,
        "cores": 4
      },
      "memory": {
        "total": 8589934592,
        "used": 4294967296,
        "free": 4294967296,
        "usage": 50.0
      },
      "disk": {
        "total": 1000000000000,
        "used": 500000000000,
        "free": 500000000000,
        "usage": 50.0
      },
      "network": {
        "bytesIn": 1024000,
        "bytesOut": 512000,
        "packetsIn": 1024,
        "packetsOut": 512
      }
    }
  ]
}
\`\`\`

### 获取优化建议

\`\`\`http
GET /api/performance/recommendations?limit=20
\`\`\`

**查询参数**:
- \`limit\`: 返回记录数 (默认: 50)

**响应**:
\`\`\`json
{
  "recommendations": [
    {
      "timestamp": 1699123456789,
      "recommendations": [
        {
          "type": "cpu_optimization",
          "priority": "high",
          "title": "CPU使用率过高",
          "description": "平均CPU使用率为 85.5%",
          "actions": [...]
        }
      ],
      "executed": false
    }
  ]
}
\`\`\`

### 手动执行优化

\`\`\`http
POST /api/performance/optimize
\`\`\`

**响应**:
\`\`\`json
{
  "status": "success",
  "message": "性能优化执行完成",
  "recommendations": [...]
}
\`\`\`

### 获取性能统计

\`\`\`http
GET /api/performance/stats
\`\`\`

**响应**:
\`\`\`json
{
  "avgCpuUsage": "45.50",
  "avgMemoryUsage": "52.30",
  "avgDiskUsage": "48.75",
  "maxCpuUsage": "78.90",
  "maxMemoryUsage": "85.20",
  "maxDiskUsage": "55.60",
  "alertCount": 2,
  "recommendationCount": 15
}
\`\`\`

### 更新性能阈值

\`\`\`http
PUT /api/performance/thresholds
\`\`\`

**请求体**:
\`\`\`json
{
  "cpuUsage": 85,
  "memoryUsage": 90,
  "diskUsage": 95,
  "queryResponseTime": 3000,
  "cacheHitRate": 85,
  "errorRate": 10
}
\`\`\`

**响应**:
\`\`\`json
{
  "status": "success",
  "message": "性能阈值已更新",
  "thresholds": {
    "cpuUsage": 85,
    "memoryUsage": 90,
    "diskUsage": 95,
    "queryResponseTime": 3000,
    "cacheHitRate": 85,
    "errorRate": 10
  }
}
\`\`\`

## 系统调优建议

### 操作系统级别优化

1. **内核参数调优**
   \`\`\`bash
   # 增加文件描述符限制
   echo 'fs.file-max = 65535' >> /etc/sysctl.conf
   
   # 优化网络参数
   echo 'net.core.rmem_max = 16777216' >> /etc/sysctl.conf
   echo 'net.core.wmem_max = 16777216' >> /etc/sysctl.conf
   echo 'net.ipv4.tcp_rmem = 4096 87380 16777216' >> /etc/sysctl.conf
   echo 'net.ipv4.tcp_wmem = 4096 65536 16777216' >> /etc/sysctl.conf
   
   # 应用配置
   sysctl -p
   \`\`\`

2. **文件系统优化**
   \`\`\`bash
   # 使用noatime选项挂载文件系统
   mount -o remount,noatime /
   
   # 优化SSD
   echo 'noop' > /sys/block/sda/queue/scheduler
   \`\`\`

3. **内存管理优化**
   \`\`\`bash
   # 调整swap使用策略
   echo 'vm.swappiness = 10' >> /etc/sysctl.conf
   
   # 优化内存回收
   echo 'vm.vfs_cache_pressure = 50' >> /etc/sysctl.conf
   \`\`\`

### 应用级别优化

1. **Node.js优化**
   \`\`\`bash
   # 增加内存限制
   export NODE_OPTIONS="--max-old-space-size=4096"
   
   # 启用集群模式
   export UV_THREADPOOL_SIZE=16
   \`\`\`

2. **数据库优化**
   \`\`\`sql
   -- 优化PostgreSQL配置
   ALTER SYSTEM SET shared_buffers = '256MB';
   ALTER SYSTEM SET effective_cache_size = '1GB';
   ALTER SYSTEM SET work_mem = '4MB';
   ALTER SYSTEM SET maintenance_work_mem = '64MB';
   
   -- 重新加载配置
   SELECT pg_reload_conf();
   \`\`\`

3. **缓存优化**
   \`\`\`bash
   # Redis配置优化
   echo 'maxmemory 512mb' >> /etc/redis/redis.conf
   echo 'maxmemory-policy allkeys-lru' >> /etc/redis/redis.conf
   \`\`\`

## 监控和警报

### 性能警报

系统会在以下情况下发出性能警报：

1. **CPU使用率超过阈值**
2. **内存使用率超过阈值**
3. **磁盘使用率超过阈值**
4. **查询响应时间超过阈值**
5. **缓存命中率低于阈值**
6. **错误率超过阈值**

### 警报处理

1. **查看警报详情**
   \`\`\`javascript
   performanceService.on('performanceAlert', (alerts) => {
     console.log('性能警报:', alerts);
     
     // 处理警报
     alerts.forEach(alert => {
       switch (alert.type) {
         case 'cpu_high':
           // 处理CPU高使用率警报
           break;
         case 'memory_high':
           // 处理内存高使用率警报
           break;
         // ... 其他警报类型
       }
     });
   });
   \`\`\`

2. **自动执行优化**
   \`\`\`javascript
   // 启用自动优化
   const service = new PerformanceOptimizationService({
     enableAutoOptimization: true,
     optimizationInterval: 300000 // 5分钟
   });
   \`\`\`

## 最佳实践

### 1. 性能监控
- 定期检查性能指标
- 设置合理的性能阈值
- 监控长期性能趋势
- 及时响应性能警报

### 2. 优化建议
- 定期查看优化建议
- 优先处理高优先级建议
- 记录优化执行结果
- 验证优化效果

### 3. 系统调优
- 根据业务需求调整配置
- 定期更新系统和软件
- 监控调优效果
- 建立性能基线

### 4. 容量规划
- 监控资源使用趋势
- 预测资源需求
- 提前规划扩容
- 建立容量预警机制

## 故障排除

### 常见问题

1. **性能指标收集失败**
   - 检查OpenObserve连接
   - 验证认证令牌
   - 确认数据流存在

2. **优化建议生成失败**
   - 检查查询权限
   - 验证数据可用性
   - 查看错误日志

3. **资源监控不准确**
   - 检查监控间隔设置
   - 验证系统权限
   - 更新监控工具

### 调试方法

1. 启用详细日志记录
2. 检查系统资源状态
3. 验证配置参数
4. 测试手动优化

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基础性能监控
- 提供自动优化建议
- 支持性能警报功能

## 支持

如有问题或建议，请联系技术支持团队。
`;
  }

  /**
   * 生成系统调优脚本
   */
  generateSystemTuningScript() {
    return `#!/bin/bash
# 系统性能调优脚本

echo "🚀 开始系统性能调优..."

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
  echo "请使用root权限运行此脚本"
  exit 1
fi

# 备份原始配置
echo "📋 备份原始配置..."
cp /etc/sysctl.conf /etc/sysctl.conf.backup.$(date +%Y%m%d_%H%M%S)

# 内核参数优化
echo "🔧 优化内核参数..."

# 增加文件描述符限制
echo "fs.file-max = 65535" >> /etc/sysctl.conf

# 网络参数优化
echo "net.core.rmem_max = 16777216" >> /etc/sysctl.conf
echo "net.core.wmem_max = 16777216" >> /etc/sysctl.conf
echo "net.ipv4.tcp_rmem = 4096 87380 16777216" >> /etc/sysctl.conf
echo "net.ipv4.tcp_wmem = 4096 65536 16777216" >> /etc/sysctl.conf
echo "net.ipv4.tcp_congestion_control = bbr" >> /etc/sysctl.conf

# 内存管理优化
echo "vm.swappiness = 10" >> /etc/sysctl.conf
echo "vm.vfs_cache_pressure = 50" >> /etc/sysctl.conf
echo "vm.dirty_ratio = 15" >> /etc/sysctl.conf
echo "vm.dirty_background_ratio = 5" >> /etc/sysctl.conf

# 应用配置
echo "🔄 应用内核参数..."
sysctl -p

# 文件系统优化
echo "📁 优化文件系统..."

# 检查是否为SSD
if [ -d /sys/block/sda/queue ]; then
  scheduler=$(cat /sys/block/sda/queue/scheduler)
  if [[ "$scheduler" == *"deadline"* ]] || [[ "$scheduler" == *"noop"* ]]; then
    echo "noop" > /sys/block/sda/queue/scheduler
    echo "✅ SSD调度器已设置为noop"
  fi
fi

# 优化文件描述符限制
echo "🔧 优化文件描述符限制..."
echo "* soft nofile 65535" >> /etc/security/limits.conf
echo "* hard nofile 65535" >> /etc/security/limits.conf

# Node.js优化
echo "🟢 优化Node.js环境..."
echo "export NODE_OPTIONS=\"--max-old-space-size=4096\"" >> /etc/environment
echo "export UV_THREADPOOL_SIZE=16" >> /etc/environment

# 清理系统缓存
echo "🧹 清理系统缓存..."
sync
echo 3 > /proc/sys/vm/drop_caches

# 设置ulimit
echo "🔧 设置ulimit..."
ulimit -n 65535
ulimit -u 32768

# 检查系统状态
echo "📊 检查系统状态..."
echo "CPU信息:"
lscpu | grep "Model name"
echo "内存信息:"
free -h
echo "磁盘信息:"
df -h

# 检查服务状态
echo "🔍 检查服务状态..."
if command -v docker &> /dev/null; then
  echo "Docker服务状态:"
  systemctl status docker --no-pager -l
fi

if command -v nginx &> /dev/null; then
  echo "Nginx服务状态:"
  systemctl status nginx --no-pager -l
fi

if command -v node &> /dev/null; then
  echo "Node.js版本:"
  node --version
fi

echo "✅ 系统性能调优完成"
echo "📝 建议重启系统以确保所有更改生效"

# 生成调优报告
echo "📄 生成调优报告..."
REPORT_FILE="/tmp/system-tuning-report-$(date +%Y%m%d_%H%M%S).txt"

{
  echo "系统性能调优报告"
  echo "==================="
  echo "调优时间: $(date)"
  echo "系统信息: $(uname -a)"
  echo ""
  echo "内核参数优化:"
  grep -E "(fs.file-max|net.core|net.ipv4|vm\\.)" /etc/sysctl.conf
  echo ""
  echo "文件描述符限制:"
  grep -E "nofile" /etc/security/limits.conf
  echo ""
  echo "系统资源:"
  echo "CPU: $(lscpu | grep "Model name" | cut -d':' -f2- | xargs)"
  echo "内存: $(free -h | grep Mem | awk '{print $2}')"
  echo "磁盘: $(df -h / | tail -1 | awk '{print $2}')"
  echo ""
  echo "建议重启系统以确保所有更改生效"
} > "$REPORT_FILE"

echo "📋 调优报告已生成: $REPORT_FILE"
echo "🔄 请运行 'reboot' 重启系统"
`;
  }

  /**
   * 打印设置摘要
   */
  printSetupSummary() {
    console.log('\n📋 性能优化系统设置摘要:');
    console.log('=====================================');
    console.log(`🔗 OpenObserve URL: ${this.config.openobserveUrl}`);
    console.log(`🏢 组织: ${this.config.organization}`);
    console.log(`📊 性能指标数据流: ${this.config.metricsStream}`);
    console.log(`🔧 优化建议数据流: ${this.config.optimizationStream}`);
    console.log(`⏰ 数据保留期: ${this.config.retention}`);
    console.log('\n📁 生成的文件:');
    console.log(`  - config/performance/performance-optimization-config.json`);
    console.log(`  - config/performance/.env.performance`);
    console.log(`  - scripts/start-performance-service.js`);
    console.log(`  - scripts/system-tuning.sh`);
    console.log(`  - docker-compose.performance.yml`);
    console.log(`  - docs/performance-optimization-guide.md`);
    console.log('\n🚀 下一步操作:');
    console.log('  1. 启动性能优化服务: node scripts/start-performance-service.js');
    console.log('  2. 运行系统调优脚本: sudo bash scripts/system-tuning.sh');
    console.log('  3. 访问OpenObserve查看性能优化仪表板');
    console.log('  4. 根据优化建议进行系统调优');
    console.log('\n📖 使用指南:');
    console.log('  - 性能优化指南: docs/performance-optimization-guide.md');
    console.log('  - 系统调优脚本: scripts/system-tuning.sh');
    console.log('  - 性能配置: config/performance/performance-optimization-config.json');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const setup = new PerformanceOptimizationSetup();
  setup.setup().catch(error => {
    console.error('设置失败:', error);
    process.exit(1);
  });
}

module.exports = PerformanceOptimizationSetup;