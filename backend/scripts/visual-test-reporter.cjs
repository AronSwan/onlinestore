#!/usr/bin/env node

/**
 * 可视化测试报告生成器 - 生成美观的HTML测试报告
 * 支持交互式图表、代码高亮和详细分析
 */

const fs = require('fs');
const path = require('path');
const { EOL } = require('os');

// 报告配置
const ReportConfig = {
  template: {
    title: '测试报告',
    theme: 'light', // light, dark
    primaryColor: '#3b82f6',
    secondaryColor: '#10b981',
    dangerColor: '#ef4444',
    warningColor: '#f59e0b',
    infoColor: '#06b6d4'
  },
  charts: {
    enabled: true,
    library: 'chartjs', // chartjs, echarts
    types: ['pie', 'bar', 'line', 'radar']
  },
  features: {
    codeHighlighting: true,
    collapsibleSections: true,
    searchFiltering: true,
    exportFormats: ['html', 'json', 'pdf'],
    timeline: true,
    performanceMetrics: true,
    errorAnalysis: true
  }
};

class VisualTestReporter {
  constructor(options = {}) {
    this.options = {
      ...ReportConfig,
      ...options
    };
    
    this.reportData = {
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        successRate: 0,
        timestamp: new Date().toISOString()
      },
      testSuites: [],
      performanceMetrics: {
        memoryUsage: [],
        executionTime: [],
        cpuUsage: []
      },
      errors: [],
      warnings: [],
      coverage: null
    };
    
    this.templateCache = new Map();
    this.assetsPath = path.resolve(__dirname, '..', '.test-reports');
    
    // 确保资产目录存在
    this.ensureAssetsDirectory();
  }
  
  /**
   * 确保资产目录存在
   */
  ensureAssetsDirectory() {
    if (!fs.existsSync(this.assetsPath)) {
      fs.mkdirSync(this.assetsPath, { recursive: true });
    }
    
    // 创建子目录
    const subdirs = ['css', 'js', 'images'];
    subdirs.forEach(dir => {
      const dirPath = path.join(this.assetsPath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  }
  
  /**
   * 添加测试套件
   */
  addTestSuite(suiteData) {
    this.reportData.testSuites.push({
      name: suiteData.name,
      path: suiteData.path,
      duration: suiteData.duration || 0,
      tests: suiteData.tests || [],
      summary: {
        total: suiteData.tests ? suiteData.tests.length : 0,
        passed: suiteData.tests ? suiteData.tests.filter(t => t.status === 'passed').length : 0,
        failed: suiteData.tests ? suiteData.tests.filter(t => t.status === 'failed').length : 0,
        skipped: suiteData.tests ? suiteData.tests.filter(t => t.status === 'skipped').length : 0
      }
    });
    
    this.updateSummary();
  }
  
  /**
   * 添加性能指标
   */
  addPerformanceMetrics(metrics) {
    if (metrics.memoryUsage) {
      this.reportData.performanceMetrics.memoryUsage.push({
        timestamp: Date.now(),
        value: metrics.memoryUsage
      });
    }
    
    if (metrics.executionTime) {
      this.reportData.performanceMetrics.executionTime.push({
        timestamp: Date.now(),
        value: metrics.executionTime
      });
    }
    
    if (metrics.cpuUsage) {
      this.reportData.performanceMetrics.cpuUsage.push({
        timestamp: Date.now(),
        value: metrics.cpuUsage
      });
    }
  }
  
  /**
   * 添加错误
   */
  addError(error) {
    this.reportData.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      test: error.test,
      suite: error.suite
    });
  }
  
  /**
   * 添加警告
   */
  addWarning(warning) {
    this.reportData.warnings.push({
      message: warning.message,
      timestamp: new Date().toISOString(),
      test: warning.test,
      suite: warning.suite
    });
  }
  
  /**
   * 设置覆盖率数据
   */
  setCoverage(coverageData) {
    this.reportData.coverage = coverageData;
  }
  
  /**
   * 更新摘要
   */
  updateSummary() {
    let total = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let duration = 0;
    
    for (const suite of this.reportData.testSuites) {
      total += suite.summary.total;
      passed += suite.summary.passed;
      failed += suite.summary.failed;
      skipped += suite.summary.skipped;
      duration += suite.duration;
    }
    
    this.reportData.summary = {
      ...this.reportData.summary,
      total,
      passed,
      failed,
      skipped,
      duration,
      successRate: total > 0 ? Math.round((passed / total) * 100) : 0
    };
  }
  
  /**
   * 生成HTML报告
   */
  async generateHtmlReport(outputPath = null) {
    const reportPath = outputPath || path.join(this.assetsPath, `report-${Date.now()}.html`);
    
    // 生成HTML内容
    const htmlContent = this.generateHtmlContent();
    
    // 写入文件
    fs.writeFileSync(reportPath, htmlContent, 'utf8');
    
    // 复制静态资源
    await this.copyStaticAssets();
    
    return reportPath;
  }
  
  /**
   * 生成HTML内容
   */
  generateHtmlContent() {
    const { summary, testSuites, performanceMetrics, errors, warnings, coverage } = this.reportData;
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.options.template.title} - ${new Date().toLocaleDateString()}</title>
    ${this.generateStyles()}
    ${this.options.charts.enabled ? this.generateChartScripts() : ''}
</head>
<body class="${this.options.template.theme}">
    <div class="container">
        ${this.generateHeader()}
        ${this.generateSummarySection()}
        ${this.options.charts.enabled ? this.generateChartsSection() : ''}
        ${this.generateTestSuitesSection()}
        ${this.options.features.performanceMetrics ? this.generatePerformanceSection() : ''}
        ${this.options.features.errorAnalysis ? this.generateErrorAnalysisSection() : ''}
        ${coverage ? this.generateCoverageSection() : ''}
        ${this.generateFooter()}
    </div>
    ${this.generateScripts()}
</body>
</html>`;
  }
  
  /**
   * 生成样式
   */
  generateStyles() {
    const { theme, primaryColor, secondaryColor, dangerColor, warningColor, infoColor } = this.options.template;
    
    return `
<style>
    :root {
        --primary-color: ${primaryColor};
        --secondary-color: ${secondaryColor};
        --danger-color: ${dangerColor};
        --warning-color: ${warningColor};
        --info-color: ${infoColor};
        --bg-color: ${theme === 'dark' ? '#1f2937' : '#ffffff'};
        --text-color: ${theme === 'dark' ? '#f3f4f6' : '#111827'};
        --border-color: ${theme === 'dark' ? '#374151' : '#e5e7eb'};
        --card-bg: ${theme === 'dark' ? '#374151' : '#f9fafb'};
    }
    
    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }
    
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: var(--text-color);
        background-color: var(--bg-color);
    }
    
    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
    }
    
    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 1px solid var(--border-color);
    }
    
    .logo {
        font-size: 24px;
        font-weight: bold;
        color: var(--primary-color);
    }
    
    .timestamp {
        font-size: 14px;
        color: #6b7280;
    }
    
    .card {
        background-color: var(--card-bg);
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border: 1px solid var(--border-color);
    }
    
    .card-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 15px;
        color: var(--text-color);
    }
    
    .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
    }
    
    .summary-item {
        text-align: center;
        padding: 15px;
        border-radius: 8px;
        background-color: var(--card-bg);
        border: 1px solid var(--border-color);
    }
    
    .summary-value {
        font-size: 32px;
        font-weight: bold;
        margin-bottom: 5px;
    }
    
    .summary-label {
        font-size: 14px;
        color: #6b7280;
    }
    
    .success { color: var(--secondary-color); }
    .danger { color: var(--danger-color); }
    .warning { color: var(--warning-color); }
    .info { color: var(--info-color); }
    
    .progress-bar {
        width: 100%;
        height: 20px;
        background-color: var(--border-color);
        border-radius: 10px;
        overflow: hidden;
        margin: 10px 0;
    }
    
    .progress-fill {
        height: 100%;
        background-color: var(--secondary-color);
        transition: width 0.3s ease;
    }
    
    .chart-container {
        height: 300px;
        margin: 20px 0;
    }
    
    .test-suite {
        margin-bottom: 20px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        overflow: hidden;
    }
    
    .test-suite-header {
        background-color: var(--card-bg);
        padding: 15px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--border-color);
    }
    
    .test-suite-content {
        padding: 15px;
        display: none;
    }
    
    .test-suite-content.expanded {
        display: block;
    }
    
    .test-case {
        padding: 10px;
        margin-bottom: 10px;
        border-radius: 6px;
        border-left: 4px solid;
    }
    
    .test-case.passed {
        background-color: rgba(16, 185, 129, 0.1);
        border-left-color: var(--secondary-color);
    }
    
    .test-case.failed {
        background-color: rgba(239, 68, 68, 0.1);
        border-left-color: var(--danger-color);
    }
    
    .test-case.skipped {
        background-color: rgba(245, 158, 11, 0.1);
        border-left-color: var(--warning-color);
    }
    
    .error-details {
        margin-top: 10px;
        padding: 10px;
        background-color: rgba(239, 68, 68, 0.1);
        border-radius: 6px;
        font-family: monospace;
        font-size: 12px;
        white-space: pre-wrap;
    }
    
    .search-box {
        width: 100%;
        padding: 10px;
        margin-bottom: 20px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background-color: var(--card-bg);
        color: var(--text-color);
    }
    
    .collapsible {
        cursor: pointer;
    }
    
    .collapsible::after {
        content: '▼';
        float: right;
        transition: transform 0.3s ease;
    }
    
    .collapsible.collapsed::after {
        transform: rotate(-90deg);
    }
    
    .hidden {
        display: none;
    }
    
    @media (max-width: 768px) {
        .container {
            padding: 10px;
        }
        
        .summary-grid {
            grid-template-columns: repeat(2, 1fr);
        }
        
        .header {
            flex-direction: column;
            align-items: flex-start;
        }
    }
</style>`;
  }
  
  /**
   * 生成图表脚本
   */
  generateChartScripts() {
    return `
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`;
  }
  
  /**
   * 生成页头
   */
  generateHeader() {
    return `
<div class="header">
    <div class="logo">🧪 测试报告</div>
    <div class="timestamp">生成时间: ${new Date().toLocaleString()}</div>
</div>`;
  }
  
  /**
   * 生成摘要部分
   */
  generateSummarySection() {
    const { summary } = this.reportData;
    
    return `
<div class="card">
    <h2 class="card-title">测试摘要</h2>
    <div class="summary-grid">
        <div class="summary-item">
            <div class="summary-value">${summary.total}</div>
            <div class="summary-label">总测试数</div>
        </div>
        <div class="summary-item">
            <div class="summary-value success">${summary.passed}</div>
            <div class="summary-label">通过</div>
        </div>
        <div class="summary-item">
            <div class="summary-value danger">${summary.failed}</div>
            <div class="summary-label">失败</div>
        </div>
        <div class="summary-item">
            <div class="summary-value warning">${summary.skipped}</div>
            <div class="summary-label">跳过</div>
        </div>
        <div class="summary-item">
            <div class="summary-value info">${summary.duration}ms</div>
            <div class="summary-label">执行时间</div>
        </div>
        <div class="summary-item">
            <div class="summary-value ${summary.successRate >= 80 ? 'success' : summary.successRate >= 60 ? 'warning' : 'danger'}">${summary.successRate}%</div>
            <div class="summary-label">成功率</div>
        </div>
    </div>
    <div class="progress-bar">
        <div class="progress-fill" style="width: ${summary.successRate}%"></div>
    </div>
</div>`;
  }
  
  /**
   * 生成图表部分
   */
  generateChartsSection() {
    const { summary, testSuites } = this.reportData;
    
    return `
<div class="card">
    <h2 class="card-title">测试统计图表</h2>
    <div class="summary-grid">
        <div class="chart-container">
            <canvas id="statusChart"></canvas>
        </div>
        <div class="chart-container">
            <canvas id="suiteChart"></canvas>
        </div>
    </div>
</div>`;
  }
  
  /**
   * 生成测试套件部分
   */
  generateTestSuitesSection() {
    const { testSuites } = this.reportData;
    
    return `
<div class="card">
    <h2 class="card-title">测试套件</h2>
    ${this.options.features.searchFiltering ? '<input type="text" class="search-box" placeholder="搜索测试套件..." id="suiteSearch">' : ''}
    <div id="testSuites">
        ${testSuites.map((suite, index) => this.generateTestSuiteHtml(suite, index)).join('')}
    </div>
</div>`;
  }
  
  /**
   * 生成测试套件HTML
   */
  generateTestSuiteHtml(suite, index) {
    return `
<div class="test-suite" data-suite-name="${suite.name}">
    <div class="test-suite-header collapsible" onclick="toggleSuite(${index})">
        <div>
            <strong>${suite.name}</strong>
            <span class="info">(${suite.summary.passed}/${suite.summary.total} 通过)</span>
        </div>
        <div>
            <span class="info">${suite.duration}ms</span>
        </div>
    </div>
    <div class="test-suite-content" id="suite-content-${index}">
        ${suite.tests.map(test => this.generateTestCaseHtml(test)).join('')}
    </div>
</div>`;
  }
  
  /**
   * 生成测试用例HTML
   */
  generateTestCaseHtml(test) {
    return `
<div class="test-case ${test.status}">
    <div>
        <strong>${test.title}</strong>
        ${test.duration ? `<span class="info">(${test.duration}ms)</span>` : ''}
    </div>
    ${test.error ? `<div class="error-details">${test.error}</div>` : ''}
</div>`;
  }
  
  /**
   * 生成性能部分
   */
  generatePerformanceSection() {
    const { performanceMetrics } = this.reportData;
    
    return `
<div class="card">
    <h2 class="card-title">性能指标</h2>
    <div class="chart-container">
        <canvas id="performanceChart"></canvas>
    </div>
</div>`;
  }
  
  /**
   * 生成错误分析部分
   */
  generateErrorAnalysisSection() {
    const { errors, warnings } = this.reportData;
    
    return `
<div class="card">
    <h2 class="card-title">错误分析</h2>
    <div class="summary-grid">
        <div class="summary-item">
            <div class="summary-value danger">${errors.length}</div>
            <div class="summary-label">错误</div>
        </div>
        <div class="summary-item">
            <div class="summary-value warning">${warnings.length}</div>
            <div class="summary-label">警告</div>
        </div>
    </div>
    ${errors.length > 0 ? `
    <h3>错误详情</h3>
    ${errors.map(error => `
    <div class="test-case failed">
        <div><strong>${error.suite ? error.suite + ' - ' : ''}${error.test || '未知测试'}</strong></div>
        <div class="error-details">${error.message}</div>
    </div>
    `).join('')}
    ` : ''}
</div>`;
  }
  
  /**
   * 生成覆盖率部分
   */
  generateCoverageSection() {
    const { coverage } = this.reportData;
    
    return `
<div class="card">
    <h2 class="card-title">代码覆盖率</h2>
    <div class="summary-grid">
        <div class="summary-item">
            <div class="summary-value ${coverage.lines.pct >= 80 ? 'success' : coverage.lines.pct >= 60 ? 'warning' : 'danger'}">${coverage.lines.pct}%</div>
            <div class="summary-label">行覆盖率</div>
        </div>
        <div class="summary-item">
            <div class="summary-value ${coverage.functions.pct >= 80 ? 'success' : coverage.functions.pct >= 60 ? 'warning' : 'danger'}">${coverage.functions.pct}%</div>
            <div class="summary-label">函数覆盖率</div>
        </div>
        <div class="summary-item">
            <div class="summary-value ${coverage.branches.pct >= 80 ? 'success' : coverage.branches.pct >= 60 ? 'warning' : 'danger'}">${coverage.branches.pct}%</div>
            <div class="summary-label">分支覆盖率</div>
        </div>
        <div class="summary-item">
            <div class="summary-value ${coverage.statements.pct >= 80 ? 'success' : coverage.statements.pct >= 60 ? 'warning' : 'danger'}">${coverage.statements.pct}%</div>
            <div class="summary-label">语句覆盖率</div>
        </div>
    </div>
</div>`;
  }
  
  /**
   * 生成页脚
   */
  generateFooter() {
    return `
<div class="card">
    <div style="text-align: center; color: #6b7280; font-size: 14px;">
        由 <strong>测试运行器 v3.3.0</strong> 生成 | ${new Date().toLocaleString()}
    </div>
</div>`;
  }
  
  /**
   * 生成脚本
   */
  generateScripts() {
    const { summary, testSuites, performanceMetrics } = this.reportData;
    
    return `
<script>
    // 切换测试套件展开/折叠
    function toggleSuite(index) {
        const content = document.getElementById('suite-content-' + index);
        const header = content.previousElementSibling;
        
        if (content.classList.contains('expanded')) {
            content.classList.remove('expanded');
            header.classList.add('collapsed');
        } else {
            content.classList.add('expanded');
            header.classList.remove('collapsed');
        }
    }
    
    // 搜索功能
    ${this.options.features.searchFiltering ? `
    document.addEventListener('DOMContentLoaded', function() {
        const searchBox = document.getElementById('suiteSearch');
        if (searchBox) {
            searchBox.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                const suites = document.querySelectorAll('.test-suite');
                
                suites.forEach(suite => {
                    const suiteName = suite.getAttribute('data-suite-name').toLowerCase();
                    if (suiteName.includes(searchTerm)) {
                        suite.style.display = 'block';
                    } else {
                        suite.style.display = 'none';
                    }
                });
            });
        }
    });
    ` : ''}
    
    // 初始化图表
    ${this.options.charts.enabled ? `
    document.addEventListener('DOMContentLoaded', function() {
        // 状态饼图
        const statusCtx = document.getElementById('statusChart');
        if (statusCtx) {
            new Chart(statusCtx, {
                type: 'pie',
                data: {
                    labels: ['通过', '失败', '跳过'],
                    datasets: [{
                        data: [${summary.passed}, ${summary.failed}, ${summary.skipped}],
                        backgroundColor: ['#10b981', '#ef4444', '#f59e0b']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: '测试状态分布'
                        }
                    }
                }
            });
        }
        
        // 套件柱状图
        const suiteCtx = document.getElementById('suiteChart');
        if (suiteCtx) {
            new Chart(suiteCtx, {
                type: 'bar',
                data: {
                    labels: [${testSuites.map(s => `'${s.name}'`).join(',')}],
                    datasets: [{
                        label: '通过',
                        data: [${testSuites.map(s => s.summary.passed).join(',')}],
                        backgroundColor: '#10b981'
                    }, {
                        label: '失败',
                        data: [${testSuites.map(s => s.summary.failed).join(',')}],
                        backgroundColor: '#ef4444'
                    }, {
                        label: '跳过',
                        data: [${testSuites.map(s => s.summary.skipped).join(',')}],
                        backgroundColor: '#f59e0b'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            stacked: true
                        },
                        y: {
                            stacked: true
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: '测试套件结果'
                        }
                    }
                }
            });
        }
        
        // 性能图表
        const perfCtx = document.getElementById('performanceChart');
        if (perfCtx && ${performanceMetrics.memoryUsage.length > 0}) {
            new Chart(perfCtx, {
                type: 'line',
                data: {
                    labels: [${performanceMetrics.memoryUsage.map(m => `'${new Date(m.timestamp).toLocaleTimeString()}'`).join(',')}],
                    datasets: [{
                        label: '内存使用 (MB)',
                        data: [${performanceMetrics.memoryUsage.map(m => (m.value / 1024 / 1024).toFixed(2)).join(',')}],
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: '内存使用趋势'
                        }
                    }
                }
            });
        }
    });
    ` : ''}
</script>`;
  }
  
  /**
   * 复制静态资源
   */
  async copyStaticAssets() {
    // 这里可以实现复制CSS、JS、图片等静态资源
    // 为了简化，这里只是创建占位文件
    const cssPath = path.join(this.assetsPath, 'css', 'report.css');
    const jsPath = path.join(this.assetsPath, 'js', 'report.js');
    
    if (!fs.existsSync(cssPath)) {
      fs.writeFileSync(cssPath, '/* 报告样式 */', 'utf8');
    }
    
    if (!fs.existsSync(jsPath)) {
      fs.writeFileSync(jsPath, '// 报告脚本', 'utf8');
    }
  }
  
  /**
   * 生成JSON报告
   */
  generateJsonReport(outputPath = null) {
    const reportPath = outputPath || path.join(this.assetsPath, `report-${Date.now()}.json`);
    
    fs.writeFileSync(reportPath, JSON.stringify(this.reportData, null, 2), 'utf8');
    
    return reportPath;
  }
}

module.exports = {
  VisualTestReporter,
  ReportConfig
};