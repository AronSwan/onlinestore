const os = require('os');

/**
 * 测试结果收集器
 */
class TestResultCollector {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
    this.systemMetrics = {
      initialMemory: process.memoryUsage(),
      initialCpu: process.cpuUsage(),
      peakMemory: 0,
      peakCpu: 0
    };
  }

  addResult(category, testName, status, details = {}) {
    const result = {
      category,
      testName,
      status, // 'PASS', 'FAIL', 'WARN', 'SKIP'
      timestamp: Date.now(),
      duration: details.duration || 0,
      error: details.error || null,
      metrics: details.metrics || {},
      details: details.details || {}
    };
    
    this.results.push(result);
    
    // 更新系统指标
    const currentMemory = process.memoryUsage().heapUsed;
    const currentCpu = process.cpuUsage();
    
    if (currentMemory > this.systemMetrics.peakMemory) {
      this.systemMetrics.peakMemory = currentMemory;
    }
    
    this.systemMetrics.peakCpu = Math.max(
      this.systemMetrics.peakCpu,
      currentCpu.user + currentCpu.system
    );
    
    return result;
  }

  getStats() {
    const totalTests = this.results.length;
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARN').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    
    return {
      total: totalTests,
      passed,
      failed,
      warnings,
      skipped,
      passRate: totalTests > 0 ? (passed / totalTests * 100).toFixed(2) : 0,
      duration: Date.now() - this.startTime,
      systemMetrics: this.systemMetrics
    };
  }

  generateReport() {
    const stats = this.getStats();
    const report = {
      summary: stats,
      testResults: this.results,
      categories: this.getCategoryStats(),
      recommendations: this.generateRecommendations(),
      timestamp: new Date().toISOString(),
      environment: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem()
      }
    };
    
    return report;
  }

  getCategoryStats() {
    const categories = {};
    this.results.forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = { total: 0, passed: 0, failed: 0, warnings: 0 };
      }
      categories[result.category].total++;
      if (result.status === 'PASS') categories[result.category].passed++;
      else if (result.status === 'FAIL') categories[result.category].failed++;
      else if (result.status === 'WARN') categories[result.category].warnings++;
    });
    
    return categories;
  }

  generateRecommendations() {
    const recommendations = [];
    const stats = this.getStats();
    
    if (stats.passRate < 90) {
      recommendations.push({
        type: 'CRITICAL',
        message: `测试通过率较低 (${stats.passRate}%)，需要修复失败的测试用例`
      });
    }
    
    if (this.systemMetrics.peakMemory > 1024 * 1024 * 1024) {
      recommendations.push({
        type: 'WARNING',
        message: `内存使用超过限制 (${(this.systemMetrics.peakMemory / 1024 / 1024).toFixed(2)}MB)`
      });
    }
    
    const failedCategories = Object.entries(this.getCategoryStats())
      .filter(([_, stats]) => stats.failed > 0)
      .map(([category, _]) => category);
    
    if (failedCategories.length > 0) {
      recommendations.push({
        type: 'INFO',
        message: `以下测试类别需要关注: ${failedCategories.join(', ')}`
      });
    }
    
    return recommendations;
  }
}

module.exports = TestResultCollector;