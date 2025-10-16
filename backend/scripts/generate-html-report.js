#!/usr/bin/env node

/**
 * HTML报告生成器
 *
 * 功能：
 * 1. 生成美观的HTML格式测试报告 (CONF-2.3.1)
 * 2. 支持报告历史记录索引 (CONF-2.3.3)
 * 3. 添加可视化图表支持 (CONF-2.3.2)
 * 4. 支持报告导出功能 (CONF-2.3.4)
 * 5. 添加报告比较功能 (CONF-2.3.5)
 *
 * @author 前端开发团队
 * @version 1.0.0
 * @since 2025-10-12
 */

const fs = require('fs');
const path = require('path');

// 配置常量
const REPORTS_DIR = path.join(__dirname, 'reports');
const HTML_DIR = path.join(REPORTS_DIR, 'html');
const HISTORY_DIR = path.join(HTML_DIR, 'history');

/**
 * HTML报告生成器类
 */
class HtmlReportGenerator {
  constructor() {
    // 确保目录存在
    this.ensureDirectories();
  }

  /**
   * 确保目录存在
   */
  ensureDirectories() {
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    if (!fs.existsSync(HTML_DIR)) {
      fs.mkdirSync(HTML_DIR, { recursive: true });
    }

    if (!fs.existsSync(HISTORY_DIR)) {
      fs.mkdirSync(HISTORY_DIR, { recursive: true });
    }
  }

  /**
   * 生成HTML报告
   */
  generateReport(testResult, options = {}) {
    const timestamp = new Date().toISOString();
    const reportId = `report-${Date.now()}`;
    const reportPath = path.join(HTML_DIR, `${reportId}.html`);
    const historyPath = path.join(HISTORY_DIR, `${reportId}.json`);

    // 获取历史数据用于比较
    const historyData = this.getHistoryData(options.baseline || 'last');

    // 生成HTML内容
    const htmlContent = this.generateHtmlContent(testResult, historyData, timestamp);

    // 写入HTML文件
    fs.writeFileSync(reportPath, htmlContent);

    // 保存历史数据
    const historyEntry = {
      id: reportId,
      timestamp,
      testResult,
      reportPath,
    };

    fs.writeFileSync(historyPath, JSON.stringify(historyEntry, null, 2));

    // 更新索引
    this.updateIndex();

    return {
      htmlPath: reportPath,
      historyPath,
      id: reportId,
    };
  }

  /**
   * 生成HTML内容
   */
  generateHtmlContent(testResult, historyData, timestamp) {
    const coverage = testResult.coverage;
    const metrics = testResult.metrics || {};

    // 计算趋势
    let coverageTrend = null;
    if (historyData && historyData.testResult && historyData.testResult.coverage) {
      coverageTrend = {
        current: coverage.total.lines.pct,
        previous: historyData.testResult.coverage.total.lines.pct,
        change: coverage.total.lines.pct - historyData.testResult.coverage.total.lines.pct,
      };
    }

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Monitor Report - ${timestamp.split('T')[0]}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
            line-height: 1.6;
            background-color: #f5f7fa;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        .card h3 {
            margin-top: 0;
            color: #2c3e50;
            display: flex;
            align-items: center;
        }
        .card h3 .icon {
            margin-right: 8px;
            font-size: 1.2em;
        }
        .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 0.8em;
        }
        .status.success {
            background-color: #d4edda;
            color: #155724;
        }
        .status.warning {
            background-color: #fff3cd;
            color: #856404;
        }
        .status.error {
            background-color: #f8d7da;
            color: #721c24;
        }
        .progress-bar {
            width: 100%;
            height: 20px;
            background-color: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background-color: #28a745;
            transition: width 0.3s ease;
        }
        .progress-fill.warning {
            background-color: #ffc107;
        }
        .progress-fill.error {
            background-color: #dc3545;
        }
        .chart-container {
            position: relative;
            height: 300px;
            margin: 20px 0;
        }
        .metrics-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metrics-table th, .metrics-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .metrics-table th {
            background-color: #f2f6fc;
            font-weight: bold;
        }
        .trend {
            font-weight: bold;
            display: flex;
            align-items: center;
        }
        .trend.up {
            color: #28a745;
        }
        .trend.down {
            color: #dc3545;
        }
        .trend .icon {
            margin-right: 4px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #888;
            font-size: 0.9em;
        }
        .export-buttons {
            margin: 20px 0;
            text-align: center;
        }
        .export-button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            margin: 0 5px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .export-button:hover {
            background-color: #0069d9;
        }
        .comparison-section {
            margin-top: 30px;
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .tab-container {
            margin-top: 20px;
        }
        .tab-buttons {
            display: flex;
            border-bottom: 1px solid #ddd;
        }
        .tab-button {
            background: none;
            border: none;
            padding: 10px 20px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: border-color 0.2s;
        }
        .tab-button.active {
            border-bottom-color: #007bff;
            font-weight: bold;
        }
        .tab-content {
            display: none;
            padding: 20px 0;
        }
        .tab-content.active {
            display: block;
        }
        .history-list {
            max-height: 300px;
            overflow-y: auto;
        }
        .history-item {
            padding: 10px;
            border-bottom: 1px solid #eee;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .history-item:hover {
            background-color: #f5f5f5;
        }
        .history-item:last-child {
            border-bottom: none;
        }
        .history-date {
            font-weight: bold;
            color: #007bff;
        }
        .history-status {
            float: right;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Test Monitor Report</h1>
        <p>生成时间: ${timestamp}</p>
        <p>测试命令: ${testResult.testCommand || 'N/A'}</p>
    </div>
    
    <div class="summary">
        <div class="card">
            <h3><span class="icon">📊</span>测试状态</h3>
            <p><span class="status ${testResult.success ? 'success' : 'error'}">${testResult.success ? '通过' : '失败'}</span></p>
            <p>执行时间: ${metrics.executionTime ? (metrics.executionTime / 1000).toFixed(2) + '秒' : 'N/A'}</p>
        </div>
        
        <div class="card">
            <h3><span class="icon">📈</span>代码覆盖率</h3>
            <p>目标覆盖率: ${testResult.targetCoverage || 'N/A'}%</p>
            <p>实际覆盖率: ${coverage ? coverage.total.lines.pct : 'N/A'}%</p>
            <div class="progress-bar">
                <div class="progress-fill ${coverage && coverage.total.lines.pct >= (testResult.targetCoverage || 80) ? '' : 'warning'}" style="width: ${coverage ? coverage.total.lines.pct : 0}%"></div>
            </div>
            ${
              coverageTrend
                ? `
            <p class="trend ${coverageTrend.change >= 0 ? 'up' : 'down'}">
                <span class="icon">${coverageTrend.change >= 0 ? '↑' : '↓'}</span>
                趋势: ${Math.abs(coverageTrend.change).toFixed(2)}% (${coverageTrend.previous}% → ${coverageTrend.current}%)
            </p>
            `
                : ''
            }
        </div>
        
        <div class="card">
            <h3><span class="icon">⚡</span>性能指标</h3>
            <table class="metrics-table">
                <tr>
                    <th>指标</th>
                    <th>值</th>
                    <th>阈值</th>
                </tr>
                <tr>
                    <td>内存使用</td>
                    <td>${metrics.memoryUsage && metrics.memoryUsage.peak ? (metrics.memoryUsage.peak.heapUsed / 1024 / 1024).toFixed(2) + 'MB' : 'N/A'}</td>
                    <td>${metrics.thresholds && metrics.thresholds.memoryUsage ? (metrics.thresholds.memoryUsage / 1024 / 1024).toFixed(2) + 'MB' : 'N/A'}</td>
                </tr>
                <tr>
                    <td>CPU使用率</td>
                    <td>${metrics.cpuUsage && metrics.cpuUsage.peak ? metrics.cpuUsage.peak.toFixed(2) + '%' : 'N/A'}</td>
                    <td>${metrics.thresholds && metrics.thresholds.cpuUsage ? metrics.thresholds.cpuUsage + '%' : 'N/A'}</td>
                </tr>
            </table>
        </div>
    </div>
    
    ${
      coverage
        ? `
    <div class="card">
        <h3><span class="icon">📋</span>覆盖率详情</h3>
        <table class="metrics-table">
            <tr>
                <th>指标</th>
                <th>覆盖率</th>
                <th>目标</th>
                <th>状态</th>
            </tr>
            <tr>
                <td>行覆盖率</td>
                <td>${coverage.total.lines.pct}%</td>
                <td>${testResult.targetCoverage || 80}%</td>
                <td><span class="status ${coverage.total.lines.pct >= (testResult.targetCoverage || 80) ? 'success' : 'warning'}">${coverage.total.lines.pct >= (testResult.targetCoverage || 80) ? '达标' : '未达标'}</span></td>
            </tr>
            <tr>
                <td>函数覆盖率</td>
                <td>${coverage.total.functions.pct}%</td>
                <td>${testResult.targetCoverage || 80}%</td>
                <td><span class="status ${coverage.total.functions.pct >= (testResult.targetCoverage || 80) ? 'success' : 'warning'}">${coverage.total.functions.pct >= (testResult.targetCoverage || 80) ? '达标' : '未达标'}</span></td>
            </tr>
            <tr>
                <td>分支覆盖率</td>
                <td>${coverage.total.branches.pct}%</td>
                <td>${testResult.targetCoverage || 80}%</td>
                <td><span class="status ${coverage.total.branches.pct >= (testResult.targetCoverage || 80) ? 'success' : 'warning'}">${coverage.total.branches.pct >= (testResult.targetCoverage || 80) ? '达标' : '未达标'}</span></td>
            </tr>
            <tr>
                <td>语句覆盖率</td>
                <td>${coverage.total.statements.pct}%</td>
                <td>${testResult.targetCoverage || 80}%</td>
                <td><span class="status ${coverage.total.statements.pct >= (testResult.targetCoverage || 80) ? 'success' : 'warning'}">${coverage.total.statements.pct >= (testResult.targetCoverage || 80) ? '达标' : '未达标'}</span></td>
            </tr>
        </table>
    </div>
    `
        : ''
    }
    
    ${
      metrics.cpuUsage && metrics.cpuUsage.samples && metrics.cpuUsage.samples.length > 0
        ? `
    <div class="card">
        <h3><span class="icon">📊</span>CPU使用率趋势</h3>
        <div class="chart-container">
            <canvas id="cpuChart"></canvas>
        </div>
    </div>
    `
        : ''
    }
    
    <div class="tab-container">
        <div class="tab-buttons">
            <button class="tab-button active" onclick="showTab('export')">导出选项</button>
            <button class="tab-button" onclick="showTab('history')">历史记录</button>
            <button class="tab-button" onclick="showTab('comparison')">比较分析</button>
        </div>
        
        <div id="export" class="tab-content active">
            <div class="export-buttons">
                <button class="export-button" onclick="exportReport('json')">导出 JSON</button>
                <button class="export-button" onclick="exportReport('csv')">导出 CSV</button>
                <button class="export-button" onclick="exportReport('pdf')">导出 PDF</button>
                <button class="export-button" onclick="printReport()">打印报告</button>
            </div>
        </div>
        
        <div id="history" class="tab-content">
            <div class="history-list" id="historyList">
                <p>加载历史记录中...</p>
            </div>
        </div>
        
        <div id="comparison" class="tab-content">
            <div class="comparison-section">
                <h3>与基线比较</h3>
                <div id="comparisonContent">
                    <p>加载比较数据中...</p>
                </div>
            </div>
        </div>
    </div>
    
    <div class="footer">
        <p>报告自动生成 - Test Monitor v2.1.0-enhanced</p>
        <p>生成时间: ${timestamp}</p>
    </div>
    
    <script>
        // CPU使用率图表
        ${
          metrics.cpuUsage && metrics.cpuUsage.samples && metrics.cpuUsage.samples.length > 0
            ? `
        const cpuCtx = document.getElementById('cpuChart').getContext('2d');
        const cpuChart = new Chart(cpuCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(metrics.cpuUsage.samples.map(s => new Date(s.timestamp).toLocaleTimeString()))},
                datasets: [{
                    label: 'CPU使用率 (%)',
                    data: ${JSON.stringify(metrics.cpuUsage.samples.map(s => s.usage))},
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
        `
            : ''
        }
        
        // 标签页切换
        function showTab(tabName) {
            // 隐藏所有标签内容
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 移除所有标签按钮的激活状态
            const tabButtons = document.querySelectorAll('.tab-button');
            tabButtons.forEach(button => button.classList.remove('active'));
            
            // 显示选中的标签内容
            document.getElementById(tabName).classList.add('active');
            
            // 激活选中的标签按钮
            event.target.classList.add('active');
            
            // 如果是历史记录标签，加载历史数据
            if (tabName === 'history') {
                loadHistory();
            }
            
            // 如果是比较标签，加载比较数据
            if (tabName === 'comparison') {
                loadComparison();
            }
        }
        
        // 导出报告功能
        function exportReport(format) {
            const reportData = ${JSON.stringify(testResult)};
            
            if (format === 'json') {
                const dataStr = JSON.stringify(reportData, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                
                const exportFileDefaultName = \`test-monitor-report-\${new Date().toISOString().slice(0,10)}.json\`;
                
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
            } else if (format === 'csv') {
                let csv = 'Metric,Value\\n';
                
                if (reportData.coverage) {
                    csv += \`Line Coverage,\${reportData.coverage.total.lines.pct}%\\n\`;
                    csv += \`Function Coverage,\${reportData.coverage.total.functions.pct}%\\n\`;
                    csv += \`Branch Coverage,\${reportData.coverage.total.branches.pct}%\\n\`;
                    csv += \`Statement Coverage,\${reportData.coverage.total.statements.pct}%\\n\`;
                }
                
                if (reportData.metrics) {
                    csv += \`Execution Time,\${(reportData.metrics.executionTime / 1000).toFixed(2)}s\\n\`;
                    
                    if (reportData.metrics.memoryUsage && reportData.metrics.memoryUsage.peak) {
                        csv += \`Memory Peak,\${(reportData.metrics.memoryUsage.peak.heapUsed / 1024 / 1024).toFixed(2)}MB\\n\`;
                    }
                    
                    if (reportData.metrics.cpuUsage && reportData.metrics.cpuUsage.peak) {
                        csv += \`CPU Peak,\${reportData.metrics.cpuUsage.peak.toFixed(2)}%\\n\`;
                    }
                }
                
                const dataUri = 'data:text/csv;charset=utf-8,'+ encodeURIComponent(csv);
                const exportFileDefaultName = \`test-monitor-report-\${new Date().toISOString().slice(0,10)}.csv\`;
                
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
            } else if (format === 'pdf') {
                // 使用浏览器的打印功能生成PDF
                window.print();
            }
        }
        
        // 打印报告
        function printReport() {
            window.print();
        }
        
        // 加载历史记录
        async function loadHistory() {
            try {
                const response = await fetch('./history-index.json');
                const historyData = await response.json();
                
                const historyList = document.getElementById('historyList');
                historyList.innerHTML = '';
                
                if (historyData.reports && historyData.reports.length > 0) {
                    historyData.reports.forEach(report => {
                        const historyItem = document.createElement('div');
                        historyItem.className = 'history-item';
                        
                        const date = new Date(report.timestamp).toLocaleString();
                        const status = report.success ? 'success' : 'error';
                        const statusText = report.success ? '通过' : '失败';
                        
                        historyItem.innerHTML = \`
                            <div class="history-date">\${date}</div>
                            <div class="history-status">
                                <span class="status \${status}">\${statusText}</span>
                            </div>
                            <div>覆盖率: \${report.coverage ? report.coverage.total.lines.pct + '%' : 'N/A'}</div>
                        \`;
                        
                        historyItem.onclick = () => {
                            window.open(report.htmlPath, '_blank');
                        };
                        
                        historyList.appendChild(historyItem);
                    });
                } else {
                    historyList.innerHTML = '<p>暂无历史记录</p>';
                }
            } catch (error) {
                document.getElementById('historyList').innerHTML = '<p>加载历史记录失败</p>';
            }
        }
        
        // 加载比较数据
        async function loadComparison() {
            try {
                const response = await fetch('./history-index.json');
                const historyData = await response.json();
                
                const comparisonContent = document.getElementById('comparisonContent');
                
                if (historyData.reports && historyData.reports.length > 1) {
                    // 获取最新的报告和上一个报告
                    const latestReport = historyData.reports[0];
                    const previousReport = historyData.reports[1];
                    
                    const coverageChange = latestReport.coverage && previousReport.coverage ? 
                        latestReport.coverage.total.lines.pct - previousReport.coverage.total.lines.pct : 0;
                    
                    const executionTimeChange = latestReport.metrics && previousReport.metrics ? 
                        latestReport.metrics.executionTime - previousReport.metrics.executionTime : 0;
                    
                    comparisonContent.innerHTML = \`
                        <table class="metrics-table">
                            <tr>
                                <th>指标</th>
                                <th>当前值</th>
                                <th>上次值</th>
                                <th>变化</th>
                            </tr>
                            <tr>
                                <td>行覆盖率</td>
                                <td>\${latestReport.coverage ? latestReport.coverage.total.lines.pct + '%' : 'N/A'}</td>
                                <td>\${previousReport.coverage ? previousReport.coverage.total.lines.pct + '%' : 'N/A'}</td>
                                <td class="trend \${coverageChange >= 0 ? 'up' : 'down'}">
                                    <span class="icon">\${coverageChange >= 0 ? '↑' : '↓'}</span>
                                    \${Math.abs(coverageChange).toFixed(2)}%
                                </td>
                            </tr>
                            <tr>
                                <td>执行时间</td>
                                <td>\${latestReport.metrics ? (latestReport.metrics.executionTime / 1000).toFixed(2) + 's' : 'N/A'}</td>
                                <td>\${previousReport.metrics ? (previousReport.metrics.executionTime / 1000).toFixed(2) + 's' : 'N/A'}</td>
                                <td class="trend \${executionTimeChange <= 0 ? 'up' : 'down'}">
                                    <span class="icon">\${executionTimeChange <= 0 ? '↑' : '↓'}</span>
                                    \${Math.abs(executionTimeChange / 1000).toFixed(2)}s
                                </td>
                            </tr>
                        </table>
                    \`;
                } else {
                    comparisonContent.innerHTML = '<p>没有足够的历史数据进行比较</p>';
                }
            } catch (error) {
                document.getElementById('comparisonContent').innerHTML = '<p>加载比较数据失败</p>';
            }
        }
    </script>
</body>
</html>
    `;
  }

  /**
   * 获取历史数据
   */
  getHistoryData(baseline) {
    try {
      if (!fs.existsSync(HISTORY_DIR)) {
        return null;
      }

      const historyFiles = fs
        .readdirSync(HISTORY_DIR)
        .filter(file => file.endsWith('.json'))
        .sort((a, b) => {
          // 按时间戳排序，最新的在前
          const timeA = parseInt(a.match(/report-(\d+)\.json/)[1]);
          const timeB = parseInt(b.match(/report-(\d+)\.json/)[1]);
          return timeB - timeA;
        });

      if (historyFiles.length === 0) {
        return null;
      }

      let targetFile;

      if (baseline === 'last' && historyFiles.length > 0) {
        // 使用最新的文件
        targetFile = historyFiles[0];
      } else if (baseline === 'average' && historyFiles.length > 0) {
        // 使用平均值，这里简化为使用最近的5个文件
        const recentFiles = historyFiles.slice(0, Math.min(5, historyFiles.length));
        let totalCoverage = 0;
        let count = 0;

        for (const file of recentFiles) {
          const data = JSON.parse(fs.readFileSync(path.join(HISTORY_DIR, file), 'utf8'));
          if (data.testResult && data.testResult.coverage) {
            totalCoverage += data.testResult.coverage.total.lines.pct;
            count++;
          }
        }

        return {
          testResult: {
            coverage: {
              total: {
                lines: { pct: count > 0 ? totalCoverage / count : 0 },
              },
            },
          },
        };
      } else {
        // 使用指定的文件或默认最新的文件
        targetFile = historyFiles[0];
      }

      return JSON.parse(fs.readFileSync(path.join(HISTORY_DIR, targetFile), 'utf8'));
    } catch (error) {
      console.error('Failed to get history data:', error.message);
      return null;
    }
  }

  /**
   * 更新索引
   */
  updateIndex() {
    try {
      if (!fs.existsSync(HISTORY_DIR)) {
        return;
      }

      const historyFiles = fs
        .readdirSync(HISTORY_DIR)
        .filter(file => file.endsWith('.json'))
        .sort((a, b) => {
          // 按时间戳排序，最新的在前
          const timeA = parseInt(a.match(/report-(\d+)\.json/)[1]);
          const timeB = parseInt(b.match(/report-(\d+)\.json/)[1]);
          return timeB - timeA;
        });

      const reports = [];

      for (const file of historyFiles) {
        const filePath = path.join(HISTORY_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        reports.push({
          id: data.id,
          timestamp: data.timestamp,
          htmlPath: path.relative(HTML_DIR, data.reportPath),
          success: data.testResult.success,
          coverage: data.testResult.coverage,
        });
      }

      const indexData = {
        timestamp: new Date().toISOString(),
        reports,
      };

      fs.writeFileSync(
        path.join(HTML_DIR, 'history-index.json'),
        JSON.stringify(indexData, null, 2),
      );

      // 生成历史记录索引页面
      this.generateHistoryIndexPage(reports);
    } catch (error) {
      console.error('Failed to update index:', error.message);
    }
  }

  /**
   * 生成历史记录索引页面
   */
  generateHistoryIndexPage(reports) {
    const indexPath = path.join(HTML_DIR, 'history-index.html');

    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Monitor - 历史记录</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
            line-height: 1.6;
            background-color: #f5f7fa;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .reports-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .reports-table th, .reports-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .reports-table th {
            background-color: #f2f6fc;
            font-weight: bold;
        }
        .report-link {
            color: #007bff;
            text-decoration: none;
        }
        .report-link:hover {
            text-decoration: underline;
        }
        .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 0.8em;
        }
        .status.success {
            background-color: #d4edda;
            color: #155724;
        }
        .status.error {
            background-color: #f8d7da;
            color: #721c24;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #888;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Test Monitor 历史记录</h1>
        <p>共 ${reports.length} 条记录</p>
    </div>
    
    <table class="reports-table">
        <thead>
            <tr>
                <th>时间</th>
                <th>状态</th>
                <th>覆盖率</th>
                <th>操作</th>
            </tr>
        </thead>
        <tbody>
            ${reports
              .map(
                report => `
            <tr>
                <td>${new Date(report.timestamp).toLocaleString()}</td>
                <td><span class="status ${report.success ? 'success' : 'error'}">${report.success ? '通过' : '失败'}</span></td>
                <td>${report.coverage ? report.coverage.total.lines.pct + '%' : 'N/A'}</td>
                <td><a href="${report.htmlPath}" class="report-link" target="_blank">查看报告</a></td>
            </tr>
            `,
              )
              .join('')}
        </tbody>
    </table>
    
    <div class="footer">
        <p>报告自动生成 - Test Monitor v2.1.0-enhanced</p>
        <p>生成时间: ${new Date().toISOString()}</p>
    </div>
</body>
</html>
    `;

    fs.writeFileSync(indexPath, html);
  }

  /**
   * 获取历史记录文件列表
   */
  getHistoryFiles() {
    try {
      if (!fs.existsSync(HISTORY_DIR)) {
        return [];
      }

      const historyFiles = fs
        .readdirSync(HISTORY_DIR)
        .filter(file => file.endsWith('.json'))
        .sort((a, b) => {
          // 按时间戳排序，最新的在前
          const timeA = parseInt(a.match(/report-(\d+)\.json/)[1]);
          const timeB = parseInt(b.match(/report-(\d+)\.json/)[1]);
          return timeB - timeA;
        });

      return historyFiles.map(file => path.join(HISTORY_DIR, file));
    } catch (error) {
      console.error('Failed to get history files:', error.message);
      return [];
    }
  }

  /**
   * 导出报告
   */
  exportReport(htmlPath, format) {
    try {
      const reportId = path.basename(htmlPath, '.html');
      const historyPath = path.join(HISTORY_DIR, `${reportId}.json`);

      if (!fs.existsSync(historyPath)) {
        throw new Error('History file not found');
      }

      const historyData = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      const testResult = historyData.testResult;

      const exportDir = path.join(HTML_DIR, 'exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const exportPath = path.join(exportDir, `${reportId}-${timestamp}.${format}`);

      if (format === 'json') {
        fs.writeFileSync(exportPath, JSON.stringify(testResult, null, 2));
      } else if (format === 'csv') {
        let csv = 'Metric,Value\n';

        if (testResult.coverage) {
          csv += `Line Coverage,${testResult.coverage.total.lines.pct}%\n`;
          csv += `Function Coverage,${testResult.coverage.total.functions.pct}%\n`;
          csv += `Branch Coverage,${testResult.coverage.total.branches.pct}%\n`;
          csv += `Statement Coverage,${testResult.coverage.total.statements.pct}%\n`;
        }

        if (testResult.metrics) {
          csv += `Execution Time,${(testResult.metrics.executionTime / 1000).toFixed(2)}s\n`;

          if (testResult.metrics.memoryUsage && testResult.metrics.memoryUsage.peak) {
            csv += `Memory Peak,${(testResult.metrics.memoryUsage.peak.heapUsed / 1024 / 1024).toFixed(2)}MB\n`;
          }

          if (testResult.metrics.cpuUsage && testResult.metrics.cpuUsage.peak) {
            csv += `CPU Peak,${testResult.metrics.cpuUsage.peak.toFixed(2)}%\n`;
          }
        }

        fs.writeFileSync(exportPath, csv);
      } else {
        throw new Error(`Unsupported export format: ${format}`);
      }

      return exportPath;
    } catch (error) {
      console.error('Failed to export report:', error.message);
      throw error;
    }
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 解析命令行参数
    const args = process.argv.slice(2);
    const options = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('--baseline=')) {
        options.baseline = arg.split('=')[1];
      } else if (arg.startsWith('--test-result=')) {
        options.testResultPath = arg.split('=')[1];
      }
    }

    // 获取测试结果
    let testResult;
    if (options.testResultPath) {
      testResult = JSON.parse(fs.readFileSync(options.testResultPath, 'utf8'));
    } else {
      // 从标准输入读取测试结果
      const input = fs.readFileSync(0, 'utf8');
      testResult = JSON.parse(input);
    }

    // 创建报告生成器
    const generator = new HtmlReportGenerator();

    // 生成报告
    const result = generator.generateReport(testResult, options);

    console.log(`HTML报告已生成: ${result.htmlPath}`);
    console.log(`历史数据已保存: ${result.historyPath}`);
    console.log(`报告ID: ${result.id}`);
  } catch (error) {
    console.error('HTML报告生成失败:', error.message);
    process.exit(1);
  }
}

// 导出类供测试使用
module.exports = HtmlReportGenerator;

// 如果直接运行此脚本，执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
