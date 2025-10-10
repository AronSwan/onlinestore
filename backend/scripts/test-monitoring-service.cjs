#!/usr/bin/env node

// 用途：测试监控和报告服务
// 依赖文件：无
// 作者：后端开发团队
// 时间：2025-10-09
// 版本：v1.0

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class TestMonitoringService {
  constructor(options = {}) {
    this.openObserveUrl = options.openObserveUrl || 'http://localhost:5080';
    this.openObserveUsername = options.openObserveUsername || 'admin@example.com';
    this.openObservePassword = options.openObservePassword || 'ComplexPass#123';
    this.enabled = options.enabled !== false;
    this.reportDir = options.reportDir || path.resolve(__dirname, '..', '.test-reports');
    
    // 确保报告目录存在
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * 发送测试指标到 OpenObserve
   * @param {Object} metrics - 测试指标
   * @returns {Promise<boolean>} 是否成功
   */
  async sendMetricsToOpenObserve(metrics) {
    if (!this.enabled) {
      console.log('📊 监控服务已禁用，跳过指标发送');
      return false;
    }

    try {
      const payload = {
        stream: 'test-metrics',
        timestamp: Date.now() * 1000000, // 转换为纳秒
        records: [this.formatMetrics(metrics)]
      };

      // 模拟发送到 OpenObserve
      console.log('📊 发送测试指标到 OpenObserve:', this.openObserveUrl);
      console.log('📊 指标数据:', JSON.stringify(payload, null, 2));

      // 实际实现中，这里会发送 HTTP 请求
      // const response = await fetch(`${this.openObserveUrl}/api/${payload.stream}/_json`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Basic ${Buffer.from(`${this.openObserveUsername}:${this.openObservePassword}`).toString('base64')}`
      //   },
      //   body: JSON.stringify(payload)
      // });

      // if (!response.ok) {
      //   throw new Error(`OpenObserve API 错误: ${response.status} ${response.statusText}`);
      // }

      return true;
    } catch (error) {
      console.error('❌ 发送测试指标失败:', error.message);
      return false;
    }
  }

  /**
   * 格式化指标数据
   * @param {Object} metrics - 原始指标数据
   * @returns {Object} 格式化后的指标数据
   */
  formatMetrics(metrics) {
    const formatted = {
      test_id: metrics.testId || this.generateId(),
      test_type: metrics.testType || 'unknown',
      test_name: metrics.testName || 'unknown',
      duration_ms: metrics.duration || 0,
      exit_code: metrics.exitCode || 0,
      success: metrics.success || false,
      timestamp: new Date(metrics.timestamp || Date.now()).toISOString(),
      environment: metrics.environment || 'development',
      node_version: metrics.nodeVersion || process.version,
      platform: metrics.platform || process.platform,
      arch: metrics.arch || process.arch,
      cpu_count: metrics.cpuCount || require('os').cpus().length,
      memory_usage: metrics.memoryUsage || {},
      from_cache: metrics.fromCache || false
    };

    // 添加额外的指标
    if (metrics.coverage) {
      formatted.coverage_lines = metrics.coverage.lines || 0;
      formatted.coverage_functions = metrics.coverage.functions || 0;
      formatted.coverage_branches = metrics.coverage.branches || 0;
      formatted.coverage_statements = metrics.coverage.statements || 0;
    }

    if (metrics.performance) {
      formatted.performance_cpu_usage = metrics.performance.cpuUsage || 0;
      formatted.performance_memory_peak = metrics.performance.memoryPeak || 0;
      formatted.performance_disk_io = metrics.performance.diskIO || 0;
    }

    return formatted;
  }

  /**
   * 生成唯一 ID
   * @returns {string} 唯一 ID
   */
  generateId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * 生成测试报告
   * @param {Object} reportData - 报告数据
   * @returns {string} 报告文件路径
   */
  generateTestReport(reportData) {
    const reportId = this.generateId();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFileName = `test-report-${timestamp}-${reportId}.json`;
    const reportFilePath = path.join(this.reportDir, reportFileName);

    const report = {
      reportId,
      timestamp: new Date().toISOString(),
      summary: reportData.summary || {},
      tests: reportData.tests || [],
      environment: this.getEnvironmentInfo(),
      systemInfo: this.getSystemInfo(),
      recommendations: reportData.recommendations || [],
      performanceAnalysis: this.analyzePerformance(reportData.tests || []),
      coverageAnalysis: this.analyzeCoverage(reportData.tests || []),
      generatedBy: 'test-monitoring-service v1.0'
    };

    try {
      fs.writeFileSync(reportFilePath, JSON.stringify(report, null, 2));
      console.log(`📋 测试报告已生成: ${reportFilePath}`);
      
      // 生成 HTML 报告
      this.generateHtmlReport(report);
      
      return reportFilePath;
    } catch (error) {
      console.error('❌ 生成测试报告失败:', error.message);
      return null;
    }
  }

  /**
   * 生成 HTML 测试报告
   * @param {Object} reportData - 报告数据
   */
  generateHtmlReport(reportData) {
    const htmlReportFileName = reportData.reportId + '.html';
    const htmlReportFilePath = path.join(this.reportDir, htmlReportFileName);

    const html = this.createHtmlReport(reportData);

    try {
      fs.writeFileSync(htmlReportFilePath, html);
      console.log(`📋 HTML 测试报告已生成: ${htmlReportFilePath}`);
    } catch (error) {
      console.error('❌ 生成 HTML 测试报告失败:', error.message);
    }
  }

  /**
   * 创建 HTML 报告内容
   * @param {Object} reportData - 报告数据
   * @returns {string} HTML 内容
   */
  createHtmlReport(reportData) {
    const { summary, tests, recommendations, performanceAnalysis, coverageAnalysis } = reportData;

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试报告 - ${new Date().toLocaleString()}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #495057; }
        .summary-card .value { font-size: 2em; font-weight: bold; color: #007bff; }
        .test-list { margin-top: 30px; }
        .test-item { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; }
        .test-item.failed { border-left-color: #dc3545; }
        .test-item h4 { margin: 0 0 5px 0; }
        .test-item .duration { color: #6c757d; font-size: 0.9em; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-top: 30px; }
        .recommendations h3 { margin-top: 0; color: #856404; }
        .recommendations ul { margin: 0; padding-left: 20px; }
        .chart { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .chart h3 { margin-top: 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 测试报告</h1>
            <p>生成时间: ${new Date(reportData.timestamp).toLocaleString()}</p>
            <p>报告 ID: ${reportData.reportId}</p>
        </div>
        
        <div class="content">
            <div class="summary">
                <div class="summary-card">
                    <h3>总测试数</h3>
                    <div class="value">${summary.total || 0}</div>
                </div>
                <div class="summary-card">
                    <h3>成功</h3>
                    <div class="value" style="color: #28a745;">${summary.success || 0}</div>
                </div>
                <div class="summary-card">
                    <h3>失败</h3>
                    <div class="value" style="color: #dc3545;">${summary.failure || 0}</div>
                </div>
                <div class="summary-card">
                    <h3>成功率</h3>
                    <div class="value">${summary.successRate || '0%'}</div>
                </div>
                <div class="summary-card">
                    <h3>总耗时</h3>
                    <div class="value">${summary.totalDuration || '0s'}</div>
                </div>
            </div>

            ${performanceAnalysis ? `
            <div class="chart">
                <h3>📊 性能分析</h3>
                <p>平均耗时: ${(performanceAnalysis.avgDuration / 1000).toFixed(2)}s</p>
                <p>最长耗时: ${(performanceAnalysis.maxDuration / 1000).toFixed(2)}s</p>
                <p>最短耗时: ${(performanceAnalysis.minDuration / 1000).toFixed(2)}s</p>
            </div>
            ` : ''}

            ${coverageAnalysis ? `
            <div class="chart">
                <h3>📈 覆盖率分析</h3>
                <p>代码行覆盖率: ${coverageAnalysis.lines || 'N/A'}</p>
                <p>函数覆盖率: ${coverageAnalysis.functions || 'N/A'}</p>
                <p>分支覆盖率: ${coverageAnalysis.branches || 'N/A'}</p>
                <p>语句覆盖率: ${coverageAnalysis.statements || 'N/A'}</p>
            </div>
            ` : ''}

            <div class="test-list">
                <h2>📋 测试详情</h2>
                ${tests.map(test => `
                <div class="test-item ${test.success ? '' : 'failed'}">
                    <h4>${test.testName || test.description || '未知测试'}</h4>
                    <p>类型: ${test.type || 'unknown'}</p>
                    <p class="duration">耗时: ${(test.duration / 1000).toFixed(2)}s</p>
                    ${test.error ? `<p class="error">错误: ${test.error}</p>` : ''}
                </div>
                `).join('')}
            </div>

            ${recommendations && recommendations.length > 0 ? `
            <div class="recommendations">
                <h3>💡 优化建议</h3>
                <ul>
                    ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
        </div>

        <div class="footer">
            <p>由 test-monitoring-service v1.0 生成</p>
            <p>环境信息: ${reportData.environment?.NODE_ENV || 'development'} | ${reportData.systemInfo?.platform || 'unknown'}</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 获取环境信息
   * @returns {Object} 环境信息
   */
  getEnvironmentInfo() {
    return {
      NODE_ENV: process.env.NODE_ENV || 'development',
      CI: process.env.CI || false,
      COVERAGE: process.env.COVERAGE || false,
      PARALLEL: process.env.PARALLEL || false
    };
  }

  /**
   * 获取系统信息
   * @returns {Object} 系统信息
   */
  getSystemInfo() {
    const os = require('os');
    return {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      cpuCount: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime(),
      loadavg: os.loadavg()
    };
  }

  /**
   * 分析性能数据
   * @param {Array} tests - 测试结果数组
   * @returns {Object} 性能分析结果
   */
  analyzePerformance(tests) {
    if (!tests || tests.length === 0) {
      return null;
    }

    const durations = tests.map(t => t.duration || 0);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    
    return {
      avgDuration: totalDuration / tests.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      totalDuration,
      performanceIssues: tests.filter(t => (t.duration || 0) > 30000).length // 超过30秒的测试
    };
  }

  /**
   * 分析覆盖率数据
   * @param {Array} tests - 测试结果数组
   * @returns {Object} 覆盖率分析结果
   */
  analyzeCoverage(tests) {
    if (!tests || tests.length === 0) {
      return null;
    }

    const coverageTests = tests.filter(t => t.coverage);
    if (coverageTests.length === 0) {
      return null;
    }

    const totalCoverage = coverageTests.reduce((acc, test) => {
      const cov = test.coverage;
      acc.lines += cov.lines || 0;
      acc.functions += cov.functions || 0;
      acc.branches += cov.branches || 0;
      acc.statements += cov.statements || 0;
      return acc;
    }, { lines: 0, functions: 0, branches: 0, statements: 0 });

    return {
      lines: (totalCoverage.lines / coverageTests.length).toFixed(2) + '%',
      functions: (totalCoverage.functions / coverageTests.length).toFixed(2) + '%',
      branches: (totalCoverage.branches / coverageTests.length).toFixed(2) + '%',
      statements: (totalCoverage.statements / coverageTests.length).toFixed(2) + '%'
    };
  }

  /**
   * 检查性能回归
   * @param {Object} currentMetrics - 当前指标
   * @param {Object} baselineMetrics - 基准指标
   * @returns {Object} 回归检测结果
   */
  checkPerformanceRegression(currentMetrics, baselineMetrics) {
    if (!baselineMetrics) {
      return { hasRegression: false, reason: '无基准数据' };
    }

    const regressions = [];
    
    // 检查执行时间
    if (currentMetrics.duration > baselineMetrics.duration * 1.2) {
      regressions.push({
        type: 'duration',
        current: currentMetrics.duration,
        baseline: baselineMetrics.duration,
        increase: `${((currentMetrics.duration / baselineMetrics.duration - 1) * 100).toFixed(2)}%`
      });
    }
    
    // 检查内存使用
    if (currentMetrics.memoryUsage && baselineMetrics.memoryUsage) {
      const currentMem = currentMetrics.memoryUsage.heapUsed || 0;
      const baselineMem = baselineMetrics.memoryUsage.heapUsed || 0;
      
      if (currentMem > baselineMem * 1.3) {
        regressions.push({
          type: 'memory',
          current: currentMem,
          baseline: baselineMem,
          increase: `${((currentMem / baselineMem - 1) * 100).toFixed(2)}%`
        });
      }
    }
    
    return {
      hasRegression: regressions.length > 0,
      regressions,
      severity: regressions.length > 2 ? 'high' : regressions.length > 0 ? 'medium' : 'low'
    };
  }

  /**
   * 触发告警
   * @param {string} alertType - 告警类型
   * @param {Object} alertData - 告警数据
   * @returns {Promise<boolean>} 是否成功
   */
  async triggerAlert(alertType, alertData) {
    console.log(`🚨 触发告警 [${alertType}]:`, JSON.stringify(alertData, null, 2));

    try {
      // 发送告警到 OpenObserve
      const alertPayload = {
        stream: 'test-alerts',
        timestamp: Date.now() * 1000000,
        records: [{
          alert_type: alertType,
          alert_data: alertData,
          timestamp: new Date().toISOString(),
          severity: this.getAlertSeverity(alertType),
          environment: process.env.NODE_ENV || 'development'
        }]
      };

      await this.sendMetricsToOpenObserve(alertPayload);

      // 可以在这里添加其他告警渠道，如邮件、Slack 等
      // await this.sendEmailAlert(alertType, alertData);
      // await this.sendSlackAlert(alertType, alertData);

      return true;
    } catch (error) {
      console.error('❌ 触发告警失败:', error.message);
      return false;
    }
  }

  /**
   * 获取告警严重程度
   * @param {string} alertType - 告警类型
   * @returns {string} 严重程度
   */
  getAlertSeverity(alertType) {
    const severityMap = {
      'TEST_FAILURE': 'high',
      'PERFORMANCE_REGRESSION': 'medium',
      'COVERAGE_DROP': 'medium',
      'TIMEOUT': 'high',
      'SYSTEM_ERROR': 'critical'
    };
    
    return severityMap[alertType] || 'low';
  }

  /**
   * 清理过期报告
   * @param {number} retentionDays - 保留天数
   */
  cleanupExpiredReports(retentionDays = 7) {
    try {
      const files = fs.readdirSync(this.reportDir);
      const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
      
      let cleanedCount = 0;
      
      files.forEach(file => {
        const filePath = path.join(this.reportDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      });
      
      if (cleanedCount > 0) {
        console.log(`🧹 清理了 ${cleanedCount} 个过期测试报告`);
      }
    } catch (error) {
      console.error('❌ 清理过期报告失败:', error.message);
    }
  }
}

module.exports = TestMonitoringService;