/**
 * 注册流程性能监控模块
 * 提供性能指标收集、分析和报告功能
 * @author AI Assistant
 * @version 1.0
 * @date 2025-01-12
 */

class PerformanceMonitor {
  constructor(options = {}) {
    this.config = {
      // 监控配置
      enableRealTimeMonitoring: options.enableRealTimeMonitoring !== false,
      enableMetricsCollection: options.enableMetricsCollection !== false,
      enablePerformanceAlerts: options.enablePerformanceAlerts !== false,

      // 性能阈值
      responseTimeThreshold: options.responseTimeThreshold || 3000, // 3秒
      errorRateThreshold: options.errorRateThreshold || 0.05, // 5%
      throughputThreshold: options.throughputThreshold || 100, // 每分钟100次

      // 数据保留
      metricsRetentionPeriod: options.metricsRetentionPeriod || 86400000, // 24小时
      samplingRate: options.samplingRate || 1.0, // 100%采样

      // 报告配置
      reportInterval: options.reportInterval || 300000, // 5分钟
      enableDetailedReports: options.enableDetailedReports !== false,

      ...options
    };

    // 性能指标存储
    this.metrics = {
      // 响应时间指标
      responseTimes: [],
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,

      // 吞吐量指标
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      throughputPerMinute: 0,

      // 错误率指标
      errorRate: 0,
      errorTypes: new Map(),

      // 资源使用指标
      memoryUsage: [],
      cpuUsage: [],

      // 用户体验指标
      userSatisfactionScore: 0,
      abandonmentRate: 0
    };

    // 实时监控数据
    this.realTimeData = {
      activeRequests: new Map(),
      recentMetrics: [],
      alerts: [],
      performanceEvents: []
    };

    // 性能分析器
    this.analyzer = {
      trends: new Map(),
      patterns: new Map(),
      anomalies: [],
      recommendations: []
    };

    // 定时器
    this.timers = {
      metricsCollection: null,
      reportGeneration: null,
      dataCleanup: null
    };

    // 初始化
    this.initialize();
  }

  /**
   * 初始化性能监控器
   */
  initialize() {
    try {
      this.setupMetricsCollection();
      this.setupReportGeneration();
      this.setupDataCleanup();
      this.setupPerformanceObserver();

      if (this.config.enableRealTimeMonitoring) {
        this.startRealTimeMonitoring();
      }

      console.log('PerformanceMonitor initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PerformanceMonitor:', error);
      throw error;
    }
  }

  /**
   * 设置指标收集
   */
  setupMetricsCollection() {
    if (!this.config.enableMetricsCollection) { return; }

    this.timers.metricsCollection = setInterval(() => {
      this.collectSystemMetrics();
      this.analyzePerformanceTrends();
    }, 60000); // 每分钟收集一次
  }

  /**
   * 设置报告生成
   */
  setupReportGeneration() {
    this.timers.reportGeneration = setInterval(() => {
      this.generatePerformanceReport();
      this.checkPerformanceAlerts();
    }, this.config.reportInterval);
  }

  /**
   * 设置数据清理
   */
  setupDataCleanup() {
    this.timers.dataCleanup = setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000); // 每小时清理一次
  }

  /**
   * 设置性能观察器
   */
  setupPerformanceObserver() {
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processPerformanceEntry(entry);
          }
        });

        observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error);
      }
    }
  }

  /**
   * 开始请求监控
   */
  startRequest(requestId, operation, metadata = {}) {
    const startTime = performance.now();

    this.realTimeData.activeRequests.set(requestId, {
      operation,
      startTime,
      metadata,
      status: 'active'
    });

    // 记录性能标记
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${operation}-start-${requestId}`);
    }

    return requestId;
  }

  /**
   * 结束请求监控
   */
  endRequest(requestId, success = true, error = null, result = null) {
    const request = this.realTimeData.activeRequests.get(requestId);
    if (!request) { return; }

    const endTime = performance.now();
    const duration = endTime - request.startTime;

    // 记录性能标记和测量
    if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
      performance.mark(`${request.operation}-end-${requestId}`);
      performance.measure(
        `${request.operation}-duration-${requestId}`,
        `${request.operation}-start-${requestId}`,
        `${request.operation}-end-${requestId}`
      );
    }

    // 更新指标
    this.updateMetrics({
      operation: request.operation,
      duration,
      success,
      error,
      result,
      metadata: request.metadata
    });

    // 移除活跃请求
    this.realTimeData.activeRequests.delete(requestId);

    // 检查性能阈值
    this.checkPerformanceThresholds(request.operation, duration, success);

    return {
      operation: request.operation,
      duration,
      success,
      timestamp: endTime
    };
  }

  /**
   * 更新性能指标
   */
  updateMetrics(data) {
    const { operation, duration, success, error } = data;

    // 更新请求计数
    this.metrics.requestCount++;
    if (success) {
      this.metrics.successCount++;
    } else {
      this.metrics.errorCount++;

      // 记录错误类型
      const errorType = error?.name || 'UnknownError';
      const currentCount = this.metrics.errorTypes.get(errorType) || 0;
      this.metrics.errorTypes.set(errorType, currentCount + 1);
    }

    // 更新响应时间
    this.metrics.responseTimes.push({
      operation,
      duration,
      timestamp: Date.now(),
      success
    });

    // 计算统计指标
    this.calculateStatistics();

    // 记录实时数据
    this.realTimeData.recentMetrics.push({
      operation,
      duration,
      success,
      timestamp: Date.now()
    });

    // 限制实时数据大小
    if (this.realTimeData.recentMetrics.length > 1000) {
      this.realTimeData.recentMetrics = this.realTimeData.recentMetrics.slice(-500);
    }
  }

  /**
   * 计算统计指标
   */
  calculateStatistics() {
    const recentResponses = this.metrics.responseTimes.slice(-100); // 最近100次请求

    if (recentResponses.length === 0) { return; }

    // 计算平均响应时间
    const totalTime = recentResponses.reduce((sum, item) => sum + item.duration, 0);
    this.metrics.averageResponseTime = totalTime / recentResponses.length;

    // 计算百分位数
    const sortedTimes = recentResponses.map(item => item.duration).sort((a, b) => a - b);
    this.metrics.p95ResponseTime = this.calculatePercentile(sortedTimes, 95);
    this.metrics.p99ResponseTime = this.calculatePercentile(sortedTimes, 99);

    // 计算错误率
    this.metrics.errorRate = this.metrics.requestCount > 0
      ? this.metrics.errorCount / this.metrics.requestCount
      : 0;

    // 计算吞吐量（每分钟请求数）
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = this.realTimeData.recentMetrics.filter(
      metric => metric.timestamp > oneMinuteAgo
    );
    this.metrics.throughputPerMinute = recentRequests.length;
  }

  /**
   * 计算百分位数
   */
  calculatePercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) { return 0; }

    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * 检查性能阈值
   */
  checkPerformanceThresholds(operation, duration, _success) {
    const alerts = [];

    // 检查响应时间阈值
    if (duration > this.config.responseTimeThreshold) {
      alerts.push({
        type: 'SLOW_RESPONSE',
        operation,
        duration,
        threshold: this.config.responseTimeThreshold,
        timestamp: Date.now(),
        severity: duration > this.config.responseTimeThreshold * 2 ? 'HIGH' : 'MEDIUM'
      });
    }

    // 检查错误率阈值
    if (this.metrics.errorRate > this.config.errorRateThreshold) {
      alerts.push({
        type: 'HIGH_ERROR_RATE',
        errorRate: this.metrics.errorRate,
        threshold: this.config.errorRateThreshold,
        timestamp: Date.now(),
        severity: 'HIGH'
      });
    }

    // 检查吞吐量阈值
    if (this.metrics.throughputPerMinute < this.config.throughputThreshold) {
      alerts.push({
        type: 'LOW_THROUGHPUT',
        throughput: this.metrics.throughputPerMinute,
        threshold: this.config.throughputThreshold,
        timestamp: Date.now(),
        severity: 'MEDIUM'
      });
    }

    // 添加告警
    alerts.forEach(alert => this.addAlert(alert));
  }

  /**
   * 添加性能告警
   */
  addAlert(alert) {
    this.realTimeData.alerts.push(alert);

    // 限制告警数量
    if (this.realTimeData.alerts.length > 100) {
      this.realTimeData.alerts = this.realTimeData.alerts.slice(-50);
    }

    // 触发告警事件
    if (this.config.enablePerformanceAlerts) {
      this.dispatchAlert(alert);
    }
  }

  /**
   * 分发性能告警
   */
  dispatchAlert(alert) {
    const event = new CustomEvent('performance-alert', {
      detail: alert
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }

    console.warn('Performance Alert:', alert);
  }

  /**
   * 收集系统指标
   */
  collectSystemMetrics() {
    try {
      // 收集内存使用情况
      if (typeof performance !== 'undefined' && performance.memory) {
        this.metrics.memoryUsage.push({
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit,
          timestamp: Date.now()
        });
      }

      // 限制历史数据大小
      if (this.metrics.memoryUsage.length > 1440) { // 24小时数据
        this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-720);
      }
    } catch (error) {
      console.warn('Failed to collect system metrics:', error);
    }
  }

  /**
   * 分析性能趋势
   */
  analyzePerformanceTrends() {
    const recentMetrics = this.realTimeData.recentMetrics.slice(-100);
    if (recentMetrics.length < 10) { return; }

    // 分析响应时间趋势
    const responseTrend = this.calculateTrend(
      recentMetrics.map(m => ({ x: m.timestamp, y: m.duration }))
    );

    this.analyzer.trends.set('responseTime', {
      direction: responseTrend > 0 ? 'increasing' : 'decreasing',
      slope: responseTrend,
      timestamp: Date.now()
    });

    // 检测异常
    this.detectAnomalies(recentMetrics);
  }

  /**
   * 计算趋势斜率
   */
  calculateTrend(dataPoints) {
    if (dataPoints.length < 2) { return 0; }

    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, point) => sum + point.x, 0);
    const sumY = dataPoints.reduce((sum, point) => sum + point.y, 0);
    const sumXY = dataPoints.reduce((sum, point) => sum + point.x * point.y, 0);
    const sumXX = dataPoints.reduce((sum, point) => sum + point.x * point.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return isNaN(slope) ? 0 : slope;
  }

  /**
   * 检测性能异常
   */
  detectAnomalies(metrics) {
    const durations = metrics.map(m => m.duration);
    const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / durations.length;
    const stdDev = Math.sqrt(variance);

    const threshold = mean + 2 * stdDev; // 2σ阈值

    metrics.forEach(metric => {
      if (metric.duration > threshold) {
        this.analyzer.anomalies.push({
          type: 'RESPONSE_TIME_ANOMALY',
          value: metric.duration,
          threshold,
          timestamp: metric.timestamp,
          operation: metric.operation
        });
      }
    });

    // 限制异常记录数量
    if (this.analyzer.anomalies.length > 100) {
      this.analyzer.anomalies = this.analyzer.anomalies.slice(-50);
    }
  }

  /**
   * 生成性能报告
   */
  generatePerformanceReport() {
    const report = {
      timestamp: Date.now(),
      period: this.config.reportInterval,

      // 基础指标
      metrics: {
        totalRequests: this.metrics.requestCount,
        successfulRequests: this.metrics.successCount,
        failedRequests: this.metrics.errorCount,
        errorRate: this.metrics.errorRate,
        averageResponseTime: this.metrics.averageResponseTime,
        p95ResponseTime: this.metrics.p95ResponseTime,
        p99ResponseTime: this.metrics.p99ResponseTime,
        throughputPerMinute: this.metrics.throughputPerMinute
      },

      // 错误分析
      errors: {
        totalErrors: this.metrics.errorCount,
        errorTypes: Object.fromEntries(this.metrics.errorTypes),
        topErrors: this.getTopErrors()
      },

      // 性能趋势
      trends: Object.fromEntries(this.analyzer.trends),

      // 异常检测
      anomalies: this.analyzer.anomalies.slice(-10), // 最近10个异常

      // 告警信息
      alerts: this.realTimeData.alerts.slice(-20), // 最近20个告警

      // 系统资源
      systemMetrics: {
        memoryUsage: this.metrics.memoryUsage.slice(-1)[0] || null
      },

      // 性能建议
      recommendations: this.generateRecommendations()
    };

    // 触发报告事件
    this.dispatchReportEvent(report);

    return report;
  }

  /**
   * 获取错误排行
   */
  getTopErrors() {
    return Array.from(this.metrics.errorTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
  }

  /**
   * 生成性能建议
   */
  generateRecommendations() {
    const recommendations = [];

    // 响应时间建议
    if (this.metrics.averageResponseTime > this.config.responseTimeThreshold * 0.8) {
      recommendations.push({
        type: 'PERFORMANCE',
        priority: 'HIGH',
        message: '平均响应时间接近阈值，建议优化性能',
        suggestion: '考虑优化数据库查询、减少网络请求或使用缓存'
      });
    }

    // 错误率建议
    if (this.metrics.errorRate > this.config.errorRateThreshold * 0.5) {
      recommendations.push({
        type: 'RELIABILITY',
        priority: 'HIGH',
        message: '错误率较高，需要改善系统稳定性',
        suggestion: '检查错误日志，修复常见错误，增强错误处理'
      });
    }

    // 吞吐量建议
    if (this.metrics.throughputPerMinute < this.config.throughputThreshold * 0.7) {
      recommendations.push({
        type: 'CAPACITY',
        priority: 'MEDIUM',
        message: '系统吞吐量较低，可能需要扩容',
        suggestion: '考虑增加服务器资源或优化并发处理能力'
      });
    }

    return recommendations;
  }

  /**
   * 分发报告事件
   */
  dispatchReportEvent(report) {
    const event = new CustomEvent('performance-report', {
      detail: report
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }

    if (this.config.enableDetailedReports) {
      console.log('Performance Report:', report);
    }
  }

  /**
   * 检查性能告警
   */
  checkPerformanceAlerts() {
    const recentAlerts = this.realTimeData.alerts.filter(
      alert => Date.now() - alert.timestamp < 300000 // 5分钟内
    );

    const highSeverityAlerts = recentAlerts.filter(alert => alert.severity === 'HIGH');

    if (highSeverityAlerts.length > 0) {
      console.warn(`检测到 ${highSeverityAlerts.length} 个高严重性性能告警`);
    }
  }

  /**
   * 清理过期指标
   */
  cleanupOldMetrics() {
    const cutoffTime = Date.now() - this.config.metricsRetentionPeriod;

    // 清理响应时间数据
    this.metrics.responseTimes = this.metrics.responseTimes.filter(
      item => item.timestamp > cutoffTime
    );

    // 清理实时指标
    this.realTimeData.recentMetrics = this.realTimeData.recentMetrics.filter(
      metric => metric.timestamp > cutoffTime
    );

    // 清理内存使用数据
    this.metrics.memoryUsage = this.metrics.memoryUsage.filter(
      item => item.timestamp > cutoffTime
    );

    // 清理告警数据
    this.realTimeData.alerts = this.realTimeData.alerts.filter(
      alert => alert.timestamp > cutoffTime
    );
  }

  /**
   * 处理性能条目
   */
  processPerformanceEntry(entry) {
    if (entry.entryType === 'measure' && entry.name.includes('registration')) {
      this.realTimeData.performanceEvents.push({
        name: entry.name,
        duration: entry.duration,
        startTime: entry.startTime,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 开始实时监控
   */
  startRealTimeMonitoring() {
    // 监控活跃请求超时
    setInterval(() => {
      const now = performance.now();
      const timeoutThreshold = 30000; // 30秒超时

      for (const [requestId, request] of this.realTimeData.activeRequests) {
        if (now - request.startTime > timeoutThreshold) {
          this.addAlert({
            type: 'REQUEST_TIMEOUT',
            requestId,
            operation: request.operation,
            duration: now - request.startTime,
            timestamp: Date.now(),
            severity: 'HIGH'
          });

          // 移除超时请求
          this.realTimeData.activeRequests.delete(requestId);
        }
      }
    }, 10000); // 每10秒检查一次
  }

  /**
   * 获取实时性能数据
   */
  getRealTimeMetrics() {
    return {
      activeRequests: this.realTimeData.activeRequests.size,
      recentMetrics: this.realTimeData.recentMetrics.slice(-20),
      currentThroughput: this.metrics.throughputPerMinute,
      averageResponseTime: this.metrics.averageResponseTime,
      errorRate: this.metrics.errorRate,
      alerts: this.realTimeData.alerts.slice(-10)
    };
  }

  /**
   * 获取性能摘要
   */
  getPerformanceSummary() {
    return {
      status: this.getOverallStatus(),
      metrics: {
        totalRequests: this.metrics.requestCount,
        successRate: this.metrics.requestCount > 0
          ? (this.metrics.successCount / this.metrics.requestCount) * 100
          : 0,
        averageResponseTime: this.metrics.averageResponseTime,
        throughput: this.metrics.throughputPerMinute
      },
      health: {
        responseTimeHealth: this.metrics.averageResponseTime < this.config.responseTimeThreshold ? 'GOOD' : 'POOR',
        errorRateHealth: this.metrics.errorRate < this.config.errorRateThreshold ? 'GOOD' : 'POOR',
        throughputHealth: this.metrics.throughputPerMinute > this.config.throughputThreshold ? 'GOOD' : 'POOR'
      }
    };
  }

  /**
   * 获取整体状态
   */
  getOverallStatus() {
    const recentAlerts = this.realTimeData.alerts.filter(
      alert => Date.now() - alert.timestamp < 300000 // 5分钟内
    );

    const highSeverityAlerts = recentAlerts.filter(alert => alert.severity === 'HIGH');

    if (highSeverityAlerts.length > 0) {
      return 'CRITICAL';
    } else if (recentAlerts.length > 0) {
      return 'WARNING';
    }
    return 'HEALTHY';

  }

  /**
   * 重置性能监控器
   */
  reset() {
    // 重置指标
    this.metrics = {
      responseTimes: [],
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      throughputPerMinute: 0,
      errorRate: 0,
      errorTypes: new Map(),
      memoryUsage: [],
      cpuUsage: [],
      userSatisfactionScore: 0,
      abandonmentRate: 0
    };

    // 重置实时数据
    this.realTimeData = {
      activeRequests: new Map(),
      recentMetrics: [],
      alerts: [],
      performanceEvents: []
    };

    // 重置分析器
    this.analyzer = {
      trends: new Map(),
      patterns: new Map(),
      anomalies: [],
      recommendations: []
    };
  }

  /**
   * 销毁性能监控器
   */
  destroy() {
    // 清理定时器
    Object.values(this.timers).forEach(timer => {
      if (timer) { clearInterval(timer); }
    });

    // 重置数据
    this.reset();
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
}

if (typeof window !== 'undefined') {
  window.PerformanceMonitor = PerformanceMonitor;
}
