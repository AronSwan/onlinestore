/**
 * 性能优化服务
 * 提供系统性能监控、优化和调优功能
 */

const axios = require('axios');
const { EventEmitter } = require('events');
const os = require('os');
const fs = require('fs');
const path = require('path');

class PerformanceOptimizationService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // 统一环境适配器桥接（优先使用 dist，失败则回退 env）
    let adapterOO = null;
    try {
      const { getOpenObserve } = require('../config/environment-adapter.js');
      adapterOO = getOpenObserve();
    } catch (_) {}
    
    this.config = {
      openobserveUrl: (adapterOO && adapterOO.baseUrl) || (config.openobserveUrl || 'http://localhost:5080'),
      organization: (adapterOO && adapterOO.organization) || (config.organization || 'default'),
      token: (adapterOO && adapterOO.token) || (config.token || ''),
      metricsStream: config.metricsStream || 'performance-metrics',
      optimizationStream: config.optimizationStream || 'optimization-recommendations',
      enableAutoOptimization: config.enableAutoOptimization !== false,
      optimizationInterval: config.optimizationInterval || 300000, // 5分钟
      enableResourceMonitoring: config.enableResourceMonitoring !== false,
      resourceMonitoringInterval: config.resourceMonitoringInterval || 60000, // 1分钟
      enableQueryOptimization: config.enableQueryOptimization !== false,
      enableCacheOptimization: config.enableCacheOptimization !== false,
      enableIndexOptimization: config.enableIndexOptimization !== false,
      ...config
    };
    
    this.isInitialized = false;
    this.optimizationTimer = null;
    this.resourceMonitoringTimer = null;
    this.performanceMetrics = new Map();
    this.optimizationHistory = [];
    this.resourceUsageHistory = [];
    this.queryPerformanceHistory = [];
    
    // 性能阈值
    this.thresholds = {
      cpuUsage: 80, // CPU使用率阈值(%)
      memoryUsage: 85, // 内存使用率阈值(%)
      diskUsage: 90, // 磁盘使用率阈值(%)
      queryResponseTime: 2000, // 查询响应时间阈值(ms)
      cacheHitRate: 80, // 缓存命中率阈值(%)
      errorRate: 5 // 错误率阈值(%)
    };
  }

  /**
   * 初始化性能优化服务
   */
  async initialize() {
    try {
      // 验证OpenObserve连接
      await this.verifyConnection();
      
      // 创建性能数据流
      await this.createPerformanceStreams();
      
      // 加载历史性能数据
      await this.loadHistoricalData();
      
      // 启动资源监控
      if (this.config.enableResourceMonitoring) {
        this.startResourceMonitoring();
      }
      
      // 启动自动优化
      if (this.config.enableAutoOptimization) {
        this.startAutoOptimization();
      }
      
      this.isInitialized = true;
      console.log('⚡ 性能优化服务已初始化');
      
    } catch (error) {
      console.error('性能优化服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 验证OpenObserve连接
   */
  async verifyConnection() {
    const response = await axios.get(`${this.config.openobserveUrl}/health`, {
      timeout: 5000
    });
    
    if (response.status !== 200) {
      throw new Error(`OpenObserve连接失败: ${response.status}`);
    }
  }

  /**
   * 创建性能数据流
   */
  async createPerformanceStreams() {
    const streams = [
      {
        name: this.config.metricsStream,
        type: 'metrics',
        retention: '30d',
        description: '性能指标数据'
      },
      {
        name: this.config.optimizationStream,
        type: 'logs',
        retention: '90d',
        description: '优化建议数据'
      }
    ];

    for (const stream of streams) {
      try {
        await axios.post(
          `${this.config.openobserveUrl}/api/${this.config.organization}/streams`,
          stream,
          {
            headers: {
              'Authorization': `Bearer ${this.config.token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log(`✅ 性能数据流创建成功: ${stream.name}`);
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`ℹ️ 性能数据流已存在: ${stream.name}`);
        } else {
          throw new Error(`创建性能数据流失败 ${stream.name}: ${error.message}`);
        }
      }
    }
  }

  /**
   * 加载历史性能数据
   */
  async loadHistoricalData() {
    try {
      // 查询最近的性能指标
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: {
            sql: `SELECT * FROM ${this.config.metricsStream} WHERE timestamp >= now() - INTERVAL '24 hours' ORDER BY timestamp DESC LIMIT 1000`
          },
          start_time: new Date(Date.now() - 86400000).toISOString(),
          end_time: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const metrics = response.data.hits || [];
      metrics.forEach(metric => {
        this.performanceMetrics.set(metric.timestamp, metric);
      });
      
      console.log(`📊 已加载 ${metrics.length} 条历史性能数据`);
    } catch (error) {
      console.warn('⚠️ 加载历史性能数据失败:', error.message);
    }
  }

  /**
   * 启动资源监控
   */
  startResourceMonitoring() {
    this.resourceMonitoringTimer = setInterval(async () => {
      try {
        await this.collectResourceMetrics();
      } catch (error) {
        console.error('资源监控失败:', error);
      }
    }, this.config.resourceMonitoringInterval);
    
    console.log('📊 资源监控已启动');
  }

  /**
   * 收集资源指标
   */
  async collectResourceMetrics() {
    const timestamp = Date.now();
    
    // 获取CPU使用率
    const cpuUsage = await this.getCpuUsage();
    
    // 获取内存使用率
    const memoryUsage = this.getMemoryUsage();
    
    // 获取磁盘使用率
    const diskUsage = await this.getDiskUsage();
    
    // 获取网络IO
    const networkIO = await this.getNetworkIO();
    
    const resourceMetrics = {
      timestamp,
      cpu: {
        usage: cpuUsage,
        cores: os.cpus().length
      },
      memory: {
        total: os.totalmem(),
        used: os.totalmem() - os.freemem(),
        free: os.freemem(),
        usage: memoryUsage
      },
      disk: diskUsage,
      network: networkIO
    };
    
    // 保存到内存
    this.performanceMetrics.set(timestamp, resourceMetrics);
    
    // 保存到历史记录
    this.resourceUsageHistory.push(resourceMetrics);
    
    // 保持历史记录大小
    if (this.resourceUsageHistory.length > 1440) { // 24小时的分钟数
      this.resourceUsageHistory = this.resourceUsageHistory.slice(-720);
    }
    
    // 发送到OpenObserve
    await this.sendMetricsToOpenObserve(resourceMetrics);
    
    // 检查性能阈值
    this.checkPerformanceThresholds(resourceMetrics);
    
    // 发出事件
    this.emit('resourceMetricsCollected', resourceMetrics);
  }

  /**
   * 获取CPU使用率
   */
  async getCpuUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = endUsage.user + endUsage.system;
        const cpuPercent = (totalUsage / 1000000) * 100; // 转换为百分比
        resolve(Math.min(cpuPercent, 100));
      }, 100);
    });
  }

  /**
   * 获取内存使用率
   */
  getMemoryUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    return (usedMem / totalMem) * 100;
  }

  /**
   * 获取磁盘使用率
   */
  async getDiskUsage() {
    try {
      const stats = fs.statSync('.');
      // 简化实现，实际应该使用更精确的磁盘使用率计算
      return {
        total: 1000000000, // 1GB模拟值
        used: 500000000,   // 500MB模拟值
        free: 500000000,   // 500MB模拟值
        usage: 50           // 50%模拟值
      };
    } catch (error) {
      return {
        total: 0,
        used: 0,
        free: 0,
        usage: 0
      };
    }
  }

  /**
   * 获取网络IO
   */
  async getNetworkIO() {
    // 简化实现，实际应该使用更精确的网络IO计算
    return {
      bytesIn: Math.floor(Math.random() * 1000000),
      bytesOut: Math.floor(Math.random() * 1000000),
      packetsIn: Math.floor(Math.random() * 10000),
      packetsOut: Math.floor(Math.random() * 10000)
    };
  }

  /**
   * 发送指标到OpenObserve
   */
  async sendMetricsToOpenObserve(metrics) {
    try {
      await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.metricsStream}/_json`,
        { metrics: [metrics] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('发送性能指标失败:', error);
    }
  }

  /**
   * 检查性能阈值
   */
  checkPerformanceThresholds(metrics) {
    const alerts = [];
    
    // 检查CPU使用率
    if (metrics.cpu.usage > this.thresholds.cpuUsage) {
      alerts.push({
        type: 'cpu_high',
        severity: 'warning',
        message: `CPU使用率过高: ${metrics.cpu.usage.toFixed(2)}%`,
        value: metrics.cpu.usage,
        threshold: this.thresholds.cpuUsage
      });
    }
    
    // 检查内存使用率
    if (metrics.memory.usage > this.thresholds.memoryUsage) {
      alerts.push({
        type: 'memory_high',
        severity: 'warning',
        message: `内存使用率过高: ${metrics.memory.usage.toFixed(2)}%`,
        value: metrics.memory.usage,
        threshold: this.thresholds.memoryUsage
      });
    }
    
    // 检查磁盘使用率
    if (metrics.disk.usage > this.thresholds.diskUsage) {
      alerts.push({
        type: 'disk_high',
        severity: 'critical',
        message: `磁盘使用率过高: ${metrics.disk.usage.toFixed(2)}%`,
        value: metrics.disk.usage,
        threshold: this.thresholds.diskUsage
      });
    }
    
    // 如果有警报，发出事件
    if (alerts.length > 0) {
      this.emit('performanceAlert', alerts);
      
      // 记录警报
      this.logPerformanceAlerts(alerts);
    }
  }

  /**
   * 记录性能警报
   */
  async logPerformanceAlerts(alerts) {
    try {
      const alertData = {
        timestamp: Date.now(),
        alerts: alerts,
        source: 'performance-optimization-service'
      };
      
      await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.optimizationStream}/_json`,
        { alerts: [alertData] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('记录性能警报失败:', error);
    }
  }

  /**
   * 启动自动优化
   */
  startAutoOptimization() {
    this.optimizationTimer = setInterval(async () => {
      try {
        await this.performAutoOptimization();
      } catch (error) {
        console.error('自动优化失败:', error);
      }
    }, this.config.optimizationInterval);
    
    console.log('🔧 自动优化已启动');
  }

  /**
   * 执行自动优化
   */
  async performAutoOptimization() {
    const timestamp = Date.now();
    const recommendations = [];
    
    // 分析资源使用情况
    const resourceAnalysis = this.analyzeResourceUsage();
    if (resourceAnalysis.recommendations.length > 0) {
      recommendations.push(...resourceAnalysis.recommendations);
    }
    
    // 分析查询性能
    if (this.config.enableQueryOptimization) {
      const queryAnalysis = await this.analyzeQueryPerformance();
      if (queryAnalysis.recommendations.length > 0) {
        recommendations.push(...queryAnalysis.recommendations);
      }
    }
    
    // 分析缓存性能
    if (this.config.enableCacheOptimization) {
      const cacheAnalysis = await this.analyzeCachePerformance();
      if (cacheAnalysis.recommendations.length > 0) {
        recommendations.push(...cacheAnalysis.recommendations);
      }
    }
    
    // 分析索引性能
    if (this.config.enableIndexOptimization) {
      const indexAnalysis = await this.analyzeIndexPerformance();
      if (indexAnalysis.recommendations.length > 0) {
        recommendations.push(...indexAnalysis.recommendations);
      }
    }
    
    if (recommendations.length > 0) {
      const optimizationData = {
        timestamp,
        recommendations,
        executed: false
      };
      
      // 保存到历史记录
      this.optimizationHistory.push(optimizationData);
      
      // 保持历史记录大小
      if (this.optimizationHistory.length > 1000) {
        this.optimizationHistory = this.optimizationHistory.slice(-500);
      }
      
      // 发送到OpenObserve
      await this.sendOptimizationRecommendations(optimizationData);
      
      // 发出事件
      this.emit('optimizationRecommendations', optimizationData);
      
      console.log(`🔧 生成了 ${recommendations.length} 条优化建议`);
    }
  }

  /**
   * 分析资源使用情况
   */
  analyzeResourceUsage() {
    const recommendations = [];
    const recentMetrics = this.resourceUsageHistory.slice(-10); // 最近10次监控
    
    if (recentMetrics.length === 0) {
      return { recommendations };
    }
    
    // 计算平均CPU使用率
    const avgCpuUsage = recentMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / recentMetrics.length;
    if (avgCpuUsage > this.thresholds.cpuUsage) {
      recommendations.push({
        type: 'cpu_optimization',
        priority: 'high',
        title: 'CPU使用率过高',
        description: `平均CPU使用率为 ${avgCpuUsage.toFixed(2)}%，超过阈值 ${this.thresholds.cpuUsage}%`,
        actions: [
          '检查CPU密集型进程',
          '优化算法和循环',
          '增加CPU核心数',
          '启用负载均衡'
        ]
      });
    }
    
    // 计算平均内存使用率
    const avgMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.memory.usage, 0) / recentMetrics.length;
    if (avgMemoryUsage > this.thresholds.memoryUsage) {
      recommendations.push({
        type: 'memory_optimization',
        priority: 'high',
        title: '内存使用率过高',
        description: `平均内存使用率为 ${avgMemoryUsage.toFixed(2)}%，超过阈值 ${this.thresholds.memoryUsage}%`,
        actions: [
          '检查内存泄漏',
          '优化数据结构',
          '增加内存容量',
          '启用内存缓存'
        ]
      });
    }
    
    // 计算平均磁盘使用率
    const avgDiskUsage = recentMetrics.reduce((sum, m) => sum + m.disk.usage, 0) / recentMetrics.length;
    if (avgDiskUsage > this.thresholds.diskUsage) {
      recommendations.push({
        type: 'disk_optimization',
        priority: 'critical',
        title: '磁盘使用率过高',
        description: `平均磁盘使用率为 ${avgDiskUsage.toFixed(2)}%，超过阈值 ${this.thresholds.diskUsage}%`,
        actions: [
          '清理临时文件',
          '压缩或归档旧数据',
          '增加磁盘容量',
          '优化数据存储策略'
        ]
      });
    }
    
    return { recommendations };
  }

  /**
   * 分析查询性能
   */
  async analyzeQueryPerformance() {
    const recommendations = [];
    
    try {
      // 查询慢查询
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: {
            sql: `SELECT query, duration, timestamp FROM query-log WHERE duration > ${this.thresholds.queryResponseTime} AND timestamp >= now() - INTERVAL '1 hour' ORDER BY duration DESC LIMIT 10`
          },
          start_time: new Date(Date.now() - 3600000).toISOString(),
          end_time: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const slowQueries = response.data.hits || [];
      if (slowQueries.length > 0) {
        recommendations.push({
          type: 'query_optimization',
          priority: 'high',
          title: '发现慢查询',
          description: `在过去1小时内发现 ${slowQueries.length} 个慢查询，平均响应时间超过 ${this.thresholds.queryResponseTime}ms`,
          actions: [
            '优化查询语句',
            '添加适当的索引',
            '限制查询结果集',
            '使用查询缓存'
          ],
          details: slowQueries
        });
      }
    } catch (error) {
      console.warn('查询性能分析失败:', error.message);
    }
    
    return { recommendations };
  }

  /**
   * 分析缓存性能
   */
  async analyzeCachePerformance() {
    const recommendations = [];
    
    try {
      // 查询缓存命中率
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: {
            sql: `SELECT COUNT(CASE WHEN cached = true THEN 1 END) as cached_count, COUNT(*) as total_count FROM query-log WHERE timestamp >= now() - INTERVAL '1 hour'`
          },
          start_time: new Date(Date.now() - 3600000).toISOString(),
          end_time: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const cacheData = response.data.hits?.[0] || {};
      const { cached_count = 0, total_count = 0 } = cacheData;
      
      if (total_count > 0) {
        const cacheHitRate = (cached_count / total_count) * 100;
        
        if (cacheHitRate < this.thresholds.cacheHitRate) {
          recommendations.push({
            type: 'cache_optimization',
            priority: 'medium',
            title: '缓存命中率过低',
            description: `缓存命中率为 ${cacheHitRate.toFixed(2)}%，低于阈值 ${this.thresholds.cacheHitRate}%`,
            actions: [
              '增加缓存容量',
              '优化缓存策略',
              '调整缓存过期时间',
              '预热常用数据'
            ]
          });
        }
      }
    } catch (error) {
      console.warn('缓存性能分析失败:', error.message);
    }
    
    return { recommendations };
  }

  /**
   * 分析索引性能
   */
  async analyzeIndexPerformance() {
    const recommendations = [];
    
    try {
      // 查询全表扫描
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: {
            sql: `SELECT query, timestamp FROM query-log WHERE query LIKE '%SELECT *%' AND timestamp >= now() - INTERVAL '1 hour' LIMIT 10`
          },
          start_time: new Date(Date.now() - 3600000).toISOString(),
          end_time: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const fullTableScans = response.data.hits || [];
      if (fullTableScans.length > 0) {
        recommendations.push({
          type: 'index_optimization',
          priority: 'medium',
          title: '发现全表扫描',
          description: `在过去1小时内发现 ${fullTableScans.length} 个可能的全表扫描查询`,
          actions: [
            '为常用查询字段添加索引',
            '优化查询条件',
            '使用覆盖索引',
            '定期分析查询计划'
          ],
          details: fullTableScans
        });
      }
    } catch (error) {
      console.warn('索引性能分析失败:', error.message);
    }
    
    return { recommendations };
  }

  /**
   * 发送优化建议到OpenObserve
   */
  async sendOptimizationRecommendations(optimizationData) {
    try {
      await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.optimizationStream}/_json`,
        { recommendations: [optimizationData] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('发送优化建议失败:', error);
    }
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(timeRange = '1h') {
    const endTime = Date.now();
    const startTime = endTime - this.parseTimeRange(timeRange);
    
    const metrics = [];
    for (const [timestamp, metric] of this.performanceMetrics.entries()) {
      if (timestamp >= startTime && timestamp <= endTime) {
        metrics.push(metric);
      }
    }
    
    return metrics.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 获取优化建议
   */
  getOptimizationRecommendations(limit = 50) {
    return this.optimizationHistory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * 获取资源使用历史
   */
  getResourceUsageHistory(limit = 1440) {
    return this.resourceUsageHistory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    const recentMetrics = this.resourceUsageHistory.slice(-10);
    
    if (recentMetrics.length === 0) {
      return {
        avgCpuUsage: 0,
        avgMemoryUsage: 0,
        avgDiskUsage: 0,
        maxCpuUsage: 0,
        maxMemoryUsage: 0,
        maxDiskUsage: 0,
        alertCount: 0,
        recommendationCount: 0
      };
    }
    
    const avgCpuUsage = recentMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / recentMetrics.length;
    const avgMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.memory.usage, 0) / recentMetrics.length;
    const avgDiskUsage = recentMetrics.reduce((sum, m) => sum + m.disk.usage, 0) / recentMetrics.length;
    
    const maxCpuUsage = Math.max(...recentMetrics.map(m => m.cpu.usage));
    const maxMemoryUsage = Math.max(...recentMetrics.map(m => m.memory.usage));
    const maxDiskUsage = Math.max(...recentMetrics.map(m => m.disk.usage));
    
    return {
      avgCpuUsage: avgCpuUsage.toFixed(2),
      avgMemoryUsage: avgMemoryUsage.toFixed(2),
      avgDiskUsage: avgDiskUsage.toFixed(2),
      maxCpuUsage: maxCpuUsage.toFixed(2),
      maxMemoryUsage: maxMemoryUsage.toFixed(2),
      maxDiskUsage: maxDiskUsage.toFixed(2),
      alertCount: this.optimizationHistory.filter(o => 
        o.recommendations.some(r => r.priority === 'critical')
      ).length,
      recommendationCount: this.optimizationHistory.reduce((sum, o) => sum + o.recommendations.length, 0)
    };
  }

  /**
   * 解析时间范围
   */
  parseTimeRange(timeRange) {
    const ranges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    
    return ranges[timeRange] || ranges['1h'];
  }

  /**
   * 手动执行优化
   */
  async executeOptimization() {
    console.log('🔧 手动执行性能优化...');
    
    try {
      await this.performAutoOptimization();
      console.log('✅ 性能优化执行完成');
    } catch (error) {
      console.error('❌ 性能优化执行失败:', error);
      throw error;
    }
  }

  /**
   * 更新性能阈值
   */
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('📊 性能阈值已更新:', this.thresholds);
  }

  /**
   * 停止服务
   */
  stop() {
    if (this.resourceMonitoringTimer) {
      clearInterval(this.resourceMonitoringTimer);
      this.resourceMonitoringTimer = null;
    }
    
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = null;
    }
    
    this.isInitialized = false;
    console.log('⚡ 性能优化服务已停止');
  }
}

module.exports = PerformanceOptimizationService;