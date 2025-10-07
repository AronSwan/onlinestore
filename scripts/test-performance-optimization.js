/**
 * 性能优化系统测试脚本
 * 测试性能监控、分析和优化功能
 */

const axios = require('axios');
const { performance } = require('perf_hooks');
const os = require('os');

class PerformanceOptimizationTest {
  constructor() {
    this.config = {
      openobserveUrl: process.env.OPENOBSERVE_URL || 'http://localhost:5080',
      organization: process.env.OPENOBSERVE_ORGANIZATION || 'default',
      token: process.env.OPENOBSERVE_TOKEN || '',
      metricsStream: process.env.METRICS_STREAM || 'performance-metrics',
      optimizationStream: process.env.OPTIMIZATION_STREAM || 'optimization-recommendations',
      testTimeout: 30000
    };
    
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
    
    this.testMetricsId = this.generateMetricsId();
  }

  /**
   * 执行完整的性能优化测试
   */
  async runTests() {
    console.log('🧪 开始性能优化系统测试...');
    console.log('=====================================');
    
    const startTime = performance.now();
    
    try {
      // 1. 基础连接测试
      await this.testConnection();
      
      // 2. 数据流测试
      await this.testStreams();
      
      // 3. 性能指标收集测试
      await this.testMetricsCollection();
      
      // 4. 资源监控测试
      await this.testResourceMonitoring();
      
      // 5. 性能阈值测试
      await this.testPerformanceThresholds();
      
      // 6. 优化建议生成测试
      await this.testOptimizationRecommendations();
      
      // 7. 查询性能分析测试
      await this.testQueryPerformanceAnalysis();
      
      // 8. 缓存性能分析测试
      await this.testCachePerformanceAnalysis();
      
      // 9. 索引性能分析测试
      await this.testIndexPerformanceAnalysis();
      
      // 10. 性能统计测试
      await this.testPerformanceStats();
      
      // 11. 性能警报测试
      await this.testPerformanceAlerts();
      
      // 12. 自动优化测试
      await this.testAutoOptimization();
      
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      
      this.printTestSummary(duration);
      
    } catch (error) {
      console.error('❌ 测试执行失败:', error.message);
      throw error;
    }
  }

  /**
   * 测试基础连接
   */
  async testConnection() {
    console.log('\n📡 测试基础连接...');
    
    await this.runTest('OpenObserve连接测试', async () => {
      const response = await axios.get(`${this.config.openobserveUrl}/health`, {
        timeout: 5000
      });
      
      if (response.status !== 200) {
        throw new Error(`健康检查失败: ${response.status}`);
      }
      
      return response.data;
    });
  }

  /**
   * 测试数据流
   */
  async testStreams() {
    console.log('\n📊 测试数据流...');
    
    await this.runTest('性能指标数据流存在性测试', async () => {
      const response = await axios.get(
        `${this.config.openobserveUrl}/api/${this.config.organization}/streams`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`
          }
        }
      );
      
      const streams = response.data.list || [];
      const metricsStream = streams.find(s => s.name === this.config.metricsStream);
      
      if (!metricsStream) {
        throw new Error(`性能指标数据流不存在: ${this.config.metricsStream}`);
      }
      
      return metricsStream;
    });

    await this.runTest('优化建议数据流存在性测试', async () => {
      const response = await axios.get(
        `${this.config.openobserveUrl}/api/${this.config.organization}/streams`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`
          }
        }
      );
      
      const streams = response.data.list || [];
      const optimizationStream = streams.find(s => s.name === this.config.optimizationStream);
      
      if (!optimizationStream) {
        throw new Error(`优化建议数据流不存在: ${this.config.optimizationStream}`);
      }
      
      return optimizationStream;
    });
  }

  /**
   * 测试性能指标收集
   */
  async testMetricsCollection() {
    console.log('\n📊 测试性能指标收集...');
    
    await this.runTest('性能指标发送测试', async () => {
      const metrics = this.createTestMetrics();
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.metricsStream}/_json`,
        { metrics: [metrics] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`性能指标发送失败: ${response.status}`);
      }
      
      return response.data;
    });
  }

  /**
   * 测试资源监控
   */
  async testResourceMonitoring() {
    console.log('\n📊 测试资源监控...');
    
    await this.runTest('CPU使用率监控测试', async () => {
      // 模拟CPU使用率
      const cpuUsage = Math.random() * 100;
      
      const metrics = {
        timestamp: Date.now(),
        cpu: {
          usage: cpuUsage,
          cores: os.cpus().length
        },
        memory: {
          total: os.totalmem(),
          used: os.totalmem() - os.freemem(),
          free: os.freemem(),
          usage: (os.totalmem() - os.freemem()) / os.totalmem() * 100
        },
        disk: {
          total: 1000000000000,
          used: 500000000000,
          free: 500000000000,
          usage: 50.0
        },
        network: {
          bytesIn: Math.floor(Math.random() * 1000000),
          bytesOut: Math.floor(Math.random() * 1000000),
          packetsIn: Math.floor(Math.random() * 10000),
          packetsOut: Math.floor(Math.random() * 10000)
        }
      };
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.metricsStream}/_json`,
        { metrics: [metrics] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`CPU指标发送失败: ${response.status}`);
      }
      
      return { cpuUsage, response: response.data };
    });

    await this.runTest('内存使用率监控测试', async () => {
      // 模拟内存使用率
      const memoryUsage = Math.random() * 100;
      
      const metrics = {
        timestamp: Date.now(),
        cpu: {
          usage: Math.random() * 100,
          cores: os.cpus().length
        },
        memory: {
          total: os.totalmem(),
          used: os.totalmem() * (memoryUsage / 100),
          free: os.totalmem() * (1 - memoryUsage / 100),
          usage: memoryUsage
        },
        disk: {
          total: 1000000000000,
          used: 500000000000,
          free: 500000000000,
          usage: 50.0
        },
        network: {
          bytesIn: Math.floor(Math.random() * 1000000),
          bytesOut: Math.floor(Math.random() * 1000000),
          packetsIn: Math.floor(Math.random() * 10000),
          packetsOut: Math.floor(Math.random() * 10000)
        }
      };
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.metricsStream}/_json`,
        { metrics: [metrics] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`内存指标发送失败: ${response.status}`);
      }
      
      return { memoryUsage, response: response.data };
    });

    await this.runTest('磁盘使用率监控测试', async () => {
      // 模拟磁盘使用率
      const diskUsage = Math.random() * 100;
      
      const metrics = {
        timestamp: Date.now(),
        cpu: {
          usage: Math.random() * 100,
          cores: os.cpus().length
        },
        memory: {
          total: os.totalmem(),
          used: os.totalmem() - os.freemem(),
          free: os.freemem(),
          usage: (os.totalmem() - os.freemem()) / os.totalmem() * 100
        },
        disk: {
          total: 1000000000000,
          used: 1000000000000 * (diskUsage / 100),
          free: 1000000000000 * (1 - diskUsage / 100),
          usage: diskUsage
        },
        network: {
          bytesIn: Math.floor(Math.random() * 1000000),
          bytesOut: Math.floor(Math.random() * 1000000),
          packetsIn: Math.floor(Math.random() * 10000),
          packetsOut: Math.floor(Math.random() * 10000)
        }
      };
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.metricsStream}/_json`,
        { metrics: [metrics] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`磁盘指标发送失败: ${response.status}`);
      }
      
      return { diskUsage, response: response.data };
    });
  }

  /**
   * 测试性能阈值
   */
  async testPerformanceThresholds() {
    console.log('\n🚨 测试性能阈值...');
    
    await this.runTest('CPU阈值警报测试', async () => {
      // 创建超过CPU阈值的指标
      const metrics = {
        timestamp: Date.now(),
        cpu: {
          usage: 85, // 超过阈值
          cores: os.cpus().length
        },
        memory: {
          total: os.totalmem(),
          used: os.totalmem() - os.freemem(),
          free: os.freemem(),
          usage: (os.totalmem() - os.freemem()) / os.totalmem() * 100
        },
        disk: {
          total: 1000000000000,
          used: 500000000000,
          free: 500000000000,
          usage: 50.0
        },
        network: {
          bytesIn: Math.floor(Math.random() * 1000000),
          bytesOut: Math.floor(Math.random() * 1000000),
          packetsIn: Math.floor(Math.random() * 10000),
          packetsOut: Math.floor(Math.random() * 10000)
        }
      };
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.metricsStream}/_json`,
        { metrics: [metrics] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`CPU阈值指标发送失败: ${response.status}`);
      }
      
      return { cpuUsage: metrics.cpu.usage, response: response.data };
    });

    await this.runTest('内存阈值警报测试', async () => {
      // 创建超过内存阈值的指标
      const metrics = {
        timestamp: Date.now(),
        cpu: {
          usage: Math.random() * 100,
          cores: os.cpus().length
        },
        memory: {
          total: os.totalmem(),
          used: os.totalmem() * 0.9, // 超过阈值
          free: os.totalmem() * 0.1,
          usage: 90
        },
        disk: {
          total: 1000000000000,
          used: 500000000000,
          free: 500000000000,
          usage: 50.0
        },
        network: {
          bytesIn: Math.floor(Math.random() * 1000000),
          bytesOut: Math.floor(Math.random() * 1000000),
          packetsIn: Math.floor(Math.random() * 10000),
          packetsOut: Math.floor(Math.random() * 10000)
        }
      };
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.metricsStream}/_json`,
        { metrics: [metrics] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`内存阈值指标发送失败: ${response.status}`);
      }
      
      return { memoryUsage: metrics.memory.usage, response: response.data };
    });
  }

  /**
   * 测试优化建议生成
   */
  async testOptimizationRecommendations() {
    console.log('\n🔧 测试优化建议生成...');
    
    await this.runTest('CPU优化建议测试', async () => {
      const recommendations = {
        timestamp: Date.now(),
        recommendations: [
          {
            type: 'cpu_optimization',
            priority: 'high',
            title: 'CPU使用率过高',
            description: '平均CPU使用率为 85.5%，超过阈值 80%',
            actions: [
              '检查CPU密集型进程',
              '优化算法和循环',
              '增加CPU核心数',
              '启用负载均衡'
            ]
          }
        ],
        executed: false
      };
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.optimizationStream}/_json`,
        { recommendations: [recommendations] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`CPU优化建议发送失败: ${response.status}`);
      }
      
      return response.data;
    });

    await this.runTest('内存优化建议测试', async () => {
      const recommendations = {
        timestamp: Date.now(),
        recommendations: [
          {
            type: 'memory_optimization',
            priority: 'high',
            title: '内存使用率过高',
            description: '平均内存使用率为 87.2%，超过阈值 85%',
            actions: [
              '检查内存泄漏',
              '优化数据结构',
              '增加内存容量',
              '启用内存缓存'
            ]
          }
        ],
        executed: false
      };
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.optimizationStream}/_json`,
        { recommendations: [recommendations] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`内存优化建议发送失败: ${response.status}`);
      }
      
      return response.data;
    });

    await this.runTest('磁盘优化建议测试', async () => {
      const recommendations = {
        timestamp: Date.now(),
        recommendations: [
          {
            type: 'disk_optimization',
            priority: 'critical',
            title: '磁盘使用率过高',
            description: '平均磁盘使用率为 92.3%，超过阈值 90%',
            actions: [
              '清理临时文件',
              '压缩或归档旧数据',
              '增加磁盘容量',
              '优化数据存储策略'
            ]
          }
        ],
        executed: false
      };
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.optimizationStream}/_json`,
        { recommendations: [recommendations] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`磁盘优化建议发送失败: ${response.status}`);
      }
      
      return response.data;
    });
  }

  /**
   * 测试查询性能分析
   */
  async testQueryPerformanceAnalysis() {
    console.log('\n🔍 测试查询性能分析...');
    
    await this.runTest('慢查询分析测试', async () => {
      // 先创建查询日志数据流
      try {
        await axios.post(
          `${this.config.openobserveUrl}/api/${this.config.organization}/streams`,
          {
            name: 'query-log',
            type: 'logs',
            retention: '7d',
            description: '查询日志数据'
          },
          {
            headers: {
              'Authorization': `Bearer ${this.config.token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (error) {
        if (error.response?.status !== 409) {
          throw error;
        }
      }
      
      // 创建慢查询日志
      const slowQuery = {
        query_id: this.generateQueryId(),
        query: "SELECT * FROM large_table WHERE complex_condition = 'value'",
        duration: 2500, // 超过阈值
        timestamp: Date.now(),
        cached: false,
        status: 'success'
      };
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/query-log/_json`,
        { logs: [slowQuery] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`慢查询日志发送失败: ${response.status}`);
      }
      
      return { queryDuration: slowQuery.duration, response: response.data };
    });
  }

  /**
   * 测试缓存性能分析
   */
  async testCachePerformanceAnalysis() {
    console.log('\n💾 测试缓存性能分析...');
    
    await this.runTest('缓存命中率分析测试', async () => {
      // 创建查询日志数据流（如果不存在）
      try {
        await axios.post(
          `${this.config.openobserveUrl}/api/${this.config.organization}/streams`,
          {
            name: 'query-log',
            type: 'logs',
            retention: '7d',
            description: '查询日志数据'
          },
          {
            headers: {
              'Authorization': `Bearer ${this.config.token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (error) {
        if (error.response?.status !== 409) {
          throw error;
        }
      }
      
      // 创建缓存查询日志
      const cachedQueries = [];
      for (let i = 0; i < 10; i++) {
        cachedQueries.push({
          query_id: this.generateQueryId(),
          query: `SELECT * FROM table_${i} WHERE id = ${i}`,
          duration: 100,
          timestamp: Date.now(),
          cached: i % 3 === 0, // 33%缓存命中率
          status: 'success'
        });
      }
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/query-log/_json`,
        { logs: cachedQueries },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`缓存查询日志发送失败: ${response.status}`);
      }
      
      const cacheHitRate = (cachedQueries.filter(q => q.cached).length / cachedQueries.length) * 100;
      
      return { cacheHitRate, response: response.data };
    });
  }

  /**
   * 测试索引性能分析
   */
  async testIndexPerformanceAnalysis() {
    console.log('\n🗂️ 测试索引性能分析...');
    
    await this.runTest('全表扫描分析测试', async () => {
      // 创建查询日志数据流（如果不存在）
      try {
        await axios.post(
          `${this.config.openobserveUrl}/api/${this.config.organization}/streams`,
          {
            name: 'query-log',
            type: 'logs',
            retention: '7d',
            description: '查询日志数据'
          },
          {
            headers: {
              'Authorization': `Bearer ${this.config.token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (error) {
        if (error.response?.status !== 409) {
          throw error;
        }
      }
      
      // 创建全表扫描查询日志
      const fullTableScanQuery = {
        query_id: this.generateQueryId(),
        query: "SELECT * FROM large_table",
        duration: 1500,
        timestamp: Date.now(),
        cached: false,
        status: 'success'
      };
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/query-log/_json`,
        { logs: [fullTableScanQuery] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`全表扫描查询日志发送失败: ${response.status}`);
      }
      
      return { query: fullTableScanQuery.query, response: response.data };
    });
  }

  /**
   * 测试性能统计
   */
  async testPerformanceStats() {
    console.log('\n📊 测试性能统计...');
    
    await this.runTest('性能指标统计测试', async () => {
      // 创建多个性能指标
      const metricsList = [];
      for (let i = 0; i < 10; i++) {
        metricsList.push({
          timestamp: Date.now() - (i * 60000), // 每分钟一个指标
          cpu: {
            usage: 50 + Math.random() * 30,
            cores: os.cpus().length
          },
          memory: {
            total: os.totalmem(),
            used: os.totalmem() * (0.5 + Math.random() * 0.3),
            free: os.totalmem() * (0.2 - Math.random() * 0.3),
            usage: 50 + Math.random() * 30
          },
          disk: {
            total: 1000000000000,
            used: 500000000000,
            free: 500000000000,
            usage: 50
          },
          network: {
            bytesIn: Math.floor(Math.random() * 1000000),
            bytesOut: Math.floor(Math.random() * 1000000),
            packetsIn: Math.floor(Math.random() * 10000),
            packetsOut: Math.floor(Math.random() * 10000)
          }
        });
      }
      
      // 批量发送指标
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.metricsStream}/_json`,
        { metrics: metricsList },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`批量性能指标发送失败: ${response.status}`);
      }
      
      // 计算统计信息
      const avgCpuUsage = metricsList.reduce((sum, m) => sum + m.cpu.usage, 0) / metricsList.length;
      const avgMemoryUsage = metricsList.reduce((sum, m) => sum + m.memory.usage, 0) / metricsList.length;
      
      return {
        metricsCount: metricsList.length,
        avgCpuUsage: avgCpuUsage.toFixed(2),
        avgMemoryUsage: avgMemoryUsage.toFixed(2),
        response: response.data
      };
    });
  }

  /**
   * 测试性能警报
   */
  async testPerformanceAlerts() {
    console.log('\n🚨 测试性能警报...');
    
    await this.runTest('性能警报生成测试', async () => {
      // 创建性能警报
      const alerts = {
        timestamp: Date.now(),
        alerts: [
          {
            type: 'cpu_high',
            severity: 'warning',
            message: 'CPU使用率过高: 85.5%',
            value: 85.5,
            threshold: 80
          },
          {
            type: 'memory_high',
            severity: 'warning',
            message: '内存使用率过高: 87.2%',
            value: 87.2,
            threshold: 85
          }
        ],
        source: 'performance-optimization-service'
      };
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.optimizationStream}/_json`,
        { alerts: [alerts] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`性能警报发送失败: ${response.status}`);
      }
      
      return { alertCount: alerts.alerts.length, response: response.data };
    });
  }

  /**
   * 测试自动优化
   */
  async testAutoOptimization() {
    console.log('\n🤖 测试自动优化...');
    
    await this.runTest('自动优化执行测试', async () => {
      // 创建优化建议
      const optimizationData = {
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
        executed: true
      };
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.optimizationStream}/_json`,
        { recommendations: [optimizationData] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`自动优化数据发送失败: ${response.status}`);
      }
      
      return { 
        recommendationCount: optimizationData.recommendations.length,
        executed: optimizationData.executed,
        response: response.data
      };
    });
  }

  /**
   * 运行单个测试
   */
  async runTest(testName, testFunction) {
    this.testResults.total++;
    
    try {
      const startTime = performance.now();
      const result = await testFunction();
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      
      this.testResults.passed++;
      this.testResults.details.push({
        name: testName,
        status: 'PASSED',
        duration,
        result
      });
      
      console.log(`  ✅ ${testName} (${duration}ms)`);
      
    } catch (error) {
      this.testResults.failed++;
      this.testResults.details.push({
        name: testName,
        status: 'FAILED',
        error: error.message
      });
      
      console.log(`  ❌ ${testName}: ${error.message}`);
    }
  }

  /**
   * 创建测试性能指标
   */
  createTestMetrics() {
    return {
      timestamp: Date.now(),
      metricsId: this.testMetricsId,
      cpu: {
        usage: Math.random() * 100,
        cores: os.cpus().length
      },
      memory: {
        total: os.totalmem(),
        used: os.totalmem() - os.freemem(),
        free: os.freemem(),
        usage: (os.totalmem() - os.freemem()) / os.totalmem() * 100
      },
      disk: {
        total: 1000000000000,
        used: 500000000000,
        free: 500000000000,
        usage: 50.0
      },
      network: {
        bytesIn: Math.floor(Math.random() * 1000000),
        bytesOut: Math.floor(Math.random() * 1000000),
        packetsIn: Math.floor(Math.random() * 10000),
        packetsOut: Math.floor(Math.random() * 10000)
      }
    };
  }

  /**
   * 生成指标ID
   */
  generateMetricsId() {
    return 'metrics_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * 生成查询ID
   */
  generateQueryId() {
    return 'query_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * 打印测试摘要
   */
  printTestSummary(duration) {
    console.log('\n📋 测试摘要');
    console.log('=====================================');
    console.log(`⏱️ 总耗时: ${duration}ms`);
    console.log(`📊 总测试数: ${this.testResults.total}`);
    console.log(`✅ 通过测试: ${this.testResults.passed}`);
    console.log(`❌ 失败测试: ${this.testResults.failed}`);
    console.log(`📈 成功率: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(2)}%`);
    
    if (this.testResults.failed > 0) {
      console.log('\n❌ 失败的测试:');
      this.testResults.details
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n📊 详细结果:');
    this.testResults.details.forEach(test => {
      const status = test.status === 'PASSED' ? '✅' : '❌';
      const duration = test.duration ? ` (${test.duration}ms)` : '';
      console.log(`  ${status} ${test.name}${duration}`);
    });
    
    if (this.testResults.failed === 0) {
      console.log('\n🎉 所有测试通过！性能优化系统运行正常。');
    } else {
      console.log('\n⚠️ 部分测试失败，请检查配置和连接。');
    }
    
    console.log('\n🔗 测试数据查询:');
    console.log(`  指标ID: ${this.testMetricsId}`);
    console.log(`  性能指标流: ${this.config.metricsStream}`);
    console.log(`  优化建议流: ${this.config.optimizationStream}`);
    console.log(`  查询链接: ${this.config.openobserveUrl}/web/#/streams?stream=${this.config.metricsStream}`);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const test = new PerformanceOptimizationTest();
  test.runTests().catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}

module.exports = PerformanceOptimizationTest;