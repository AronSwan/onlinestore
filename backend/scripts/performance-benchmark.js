#!/usr/bin/env node

/**
 * 性能基准测试
 *
 * 功能：
 * 1. 性能基准测试落地 (PERF-3.3.5)
 * 2. 添加性能对比功能
 * 3. 实现性能报告生成
 * 4. 提供性能优化建议
 *
 * @author 架构师团队
 * @version 1.0.0
 * @since 2025-10-12
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const os = require('os');

// 导入测试目标
const { CacheManager } = require('./cache-manager');
const { IOOptimizer } = require('./io-optimizer');
const { SmartScheduler } = require('./smart-scheduler');

// 配置常量
const BENCHMARK_RESULTS_DIR = path.join(__dirname, 'benchmark-results');
const BASELINE_FILE = path.join(BENCHMARK_RESULTS_DIR, 'baseline.json');

/**
 * 性能基准测试类
 */
class PerformanceBenchmark {
  constructor(options = {}) {
    // 默认配置
    this.config = {
      iterations: options.iterations || 100,
      warmupIterations: options.warmupIterations || 10,
      outputFormat: options.outputFormat || 'json', // json, csv, html
      compareWithBaseline: options.compareWithBaseline !== false,
      generateReport: options.generateReport !== false,
      ...options,
    };

    // 确保结果目录存在
    this.ensureResultsDirectory();

    // 基准数据
    this.baselineData = this.loadBaselineData();

    // 当前测试结果
    this.currentResults = {};

    // 性能指标
    this.metrics = {
      timestamp: new Date().toISOString(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpu: os.cpus()[0].model,
        cores: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
      },
      benchmarks: {},
    };
  }

  /**
   * 确保结果目录存在
   */
  ensureResultsDirectory() {
    if (!fs.existsSync(BENCHMARK_RESULTS_DIR)) {
      fs.mkdirSync(BENCHMARK_RESULTS_DIR, { recursive: true });
    }
  }

  /**
   * 加载基线数据
   */
  loadBaselineData() {
    try {
      if (fs.existsSync(BASELINE_FILE)) {
        return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
      }
    } catch (error) {
      console.error('Failed to load baseline data:', error.message);
    }

    return null;
  }

  /**
   * 保存基线数据
   */
  saveBaselineData() {
    try {
      fs.writeFileSync(BASELINE_FILE, JSON.stringify(this.metrics, null, 2));
      console.log(`Baseline data saved to: ${BASELINE_FILE}`);
    } catch (error) {
      console.error('Failed to save baseline data:', error.message);
    }
  }

  /**
   * 运行所有基准测试
   */
  async runAllBenchmarks() {
    console.log('🚀 开始性能基准测试...\n');

    try {
      // 1. 缓存管理器基准测试
      await this.benchmarkCacheManager();

      // 2. I/O优化器基准测试
      await this.benchmarkIOOptimizer();

      // 3. 智能调度器基准测试
      await this.benchmarkSmartScheduler();

      // 4. 系统性能基准测试
      await this.benchmarkSystemPerformance();

      // 生成报告
      if (this.config.generateReport) {
        await this.generateReport();
      }

      console.log('\n✅ 所有基准测试完成');
      this.printSummary();

      return this.metrics;
    } catch (error) {
      console.error('\n❌ 基准测试失败:', error.message);
      throw error;
    }
  }

  /**
   * 缓存管理器基准测试
   */
  async benchmarkCacheManager() {
    console.log('📊 测试缓存管理器性能...');

    const cacheManager = new CacheManager({ maxEntries: 1000 });
    const results = {
      name: 'CacheManager',
      tests: {},
    };

    // 测试1: 缓存设置性能
    results.tests.set = await this.runBenchmark(
      'Cache Set',
      async () => {
        const key = `test-key-${Math.random()}`;
        const value = { data: 'test data', timestamp: Date.now() };
        cacheManager.set('benchmark', key, value);
      },
      this.config.iterations,
    );

    // 测试2: 缓存获取性能
    results.tests.get = await this.runBenchmark(
      'Cache Get',
      async () => {
        const key = `test-key-${Math.random()}`;
        cacheManager.get('benchmark', key);
      },
      this.config.iterations,
    );

    // 测试3: LRU驱逐性能
    results.tests.evict = await this.runBenchmark(
      'Cache Evict',
      async () => {
        // 填满缓存
        for (let i = 0; i < 1100; i++) {
          cacheManager.set('benchmark', `evict-key-${i}`, { data: i });
        }
      },
      10,
    ); // 较少迭代，因为这是重量级操作

    this.metrics.benchmarks.cacheManager = results;

    // 清理资源
    cacheManager.cleanup();

    console.log(`  ✅ 缓存管理器测试完成`);
  }

  /**
   * I/O优化器基准测试
   */
  async benchmarkIOOptimizer() {
    console.log('💾 测试I/O优化器性能...');

    const ioOptimizer = new IOOptimizer();
    const testDir = path.join(BENCHMARK_RESULTS_DIR, 'io-test');
    const testFile = path.join(testDir, 'test-file.txt');
    const testData = 'x'.repeat(1024 * 10); // 10KB测试数据

    // 确保测试目录存在
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const results = {
      name: 'IOOptimizer',
      tests: {},
    };

    // 测试1: 文件写入性能
    results.tests.write = await this.runBenchmark(
      'File Write',
      async () => {
        await ioOptimizer.writeFile(testFile, testData);
      },
      this.config.iterations,
    );

    // 测试2: 文件读取性能
    results.tests.read = await this.runBenchmark(
      'File Read',
      async () => {
        await ioOptimizer.readFile(testFile);
      },
      this.config.iterations,
    );

    // 测试3: 批量写入性能
    const files = [];
    for (let i = 0; i < 10; i++) {
      files.push(path.join(testDir, `batch-file-${i}.txt`));
    }

    results.tests.batchWrite = await this.runBenchmark(
      'Batch Write',
      async () => {
        const fileMap = new Map();
        for (const file of files) {
          fileMap.set(file, testData);
        }
        await ioOptimizer.writeFiles(fileMap);
      },
      10,
    ); // 较少迭代，因为这是重量级操作

    // 测试4: 批量读取性能
    results.tests.batchRead = await this.runBenchmark(
      'Batch Read',
      async () => {
        await ioOptimizer.readFiles(files);
      },
      10,
    ); // 较少迭代，因为这是重量级操作

    this.metrics.benchmarks.ioOptimizer = results;

    // 清理测试文件
    try {
      for (const file of files) {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      }
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
      if (fs.existsSync(testDir)) {
        fs.rmdirSync(testDir);
      }
    } catch (error) {
      console.error('Failed to cleanup test files:', error.message);
    }

    console.log(`  ✅ I/O优化器测试完成`);
  }

  /**
   * 智能调度器基准测试
   */
  async benchmarkSmartScheduler() {
    console.log('⚡ 测试智能调度器性能...');

    const scheduler = new SmartScheduler({ maxConcurrency: 5 });
    const results = {
      name: 'SmartScheduler',
      tests: {},
    };

    // 测试1: 任务提交性能
    results.tests.submit = await this.runBenchmark(
      'Task Submit',
      async () => {
        const taskId = `task-${Math.random()}`;
        scheduler.submitTask(taskId, async () => {
          // 模拟短暂任务
          await new Promise(resolve => setTimeout(resolve, 10));
          return { result: taskId };
        });
      },
      this.config.iterations,
    );

    // 测试2: 任务执行性能
    results.tests.execute = await this.runBenchmark(
      'Task Execute',
      async () => {
        const taskId = `execute-task-${Math.random()}`;
        return new Promise(resolve => {
          scheduler.submitTask(taskId, async () => {
            return { result: taskId };
          });

          // 监听任务完成
          const handler = task => {
            if (task.id === taskId) {
              scheduler.removeListener('taskCompleted', handler);
              resolve();
            }
          };
          scheduler.on('taskCompleted', handler);
        });
      },
      50,
    ); // 较少迭代，因为需要等待任务完成

    this.metrics.benchmarks.smartScheduler = results;

    // 清理资源
    scheduler.cleanup();

    console.log(`  ✅ 智能调度器测试完成`);
  }

  /**
   * 系统性能基准测试
   */
  async benchmarkSystemPerformance() {
    console.log('🖥️ 测试系统性能...');

    const results = {
      name: 'System',
      tests: {},
    };

    // 测试1: CPU密集型操作
    results.tests.cpuIntensive = await this.runBenchmark(
      'CPU Intensive',
      async () => {
        // 计算素数
        const n = 1000;
        const primes = [];

        for (let i = 2; i <= n; i++) {
          let isPrime = true;

          for (let j = 2; j <= Math.sqrt(i); j++) {
            if (i % j === 0) {
              isPrime = false;
              break;
            }
          }

          if (isPrime) {
            primes.push(i);
          }
        }

        return primes.length;
      },
      10,
    ); // 较少迭代，因为这是重量级操作

    // 测试2: 内存密集型操作
    results.tests.memoryIntensive = await this.runBenchmark(
      'Memory Intensive',
      async () => {
        // 创建大型数组
        const size = 10000;
        const array = new Array(size);

        for (let i = 0; i < size; i++) {
          array[i] = {
            id: i,
            data: new Array(100).fill(0).map(() => Math.random()),
            timestamp: Date.now(),
          };
        }

        // 对数组进行排序
        array.sort((a, b) => a.id - b.id);

        return array.length;
      },
      10,
    ); // 较少迭代，因为这是重量级操作

    // 测试3: I/O密集型操作
    results.tests.ioIntensive = await this.runBenchmark(
      'I/O Intensive',
      async () => {
        // 读写临时文件
        const tempFile = path.join(BENCHMARK_RESULTS_DIR, 'temp-io-test.txt');
        const data = 'x'.repeat(1024 * 100); // 100KB

        await fs.promises.writeFile(tempFile, data);
        return await fs.promises.readFile(tempFile);
      },
      10,
    ); // 较少迭代，因为这是重量级操作

    this.metrics.benchmarks.system = results;

    console.log(`  ✅ 系统性能测试完成`);
  }

  /**
   * 运行基准测试
   */
  async runBenchmark(name, fn, iterations) {
    console.log(`    运行 ${name} 基准测试 (${iterations} 次迭代)...`);

    // 预热
    for (let i = 0; i < this.config.warmupIterations; i++) {
      await fn();
    }

    // 实际测试
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    // 计算统计数据
    times.sort((a, b) => a - b);

    const min = times[0];
    const max = times[times.length - 1];
    const mean = times.reduce((sum, time) => sum + time, 0) / times.length;
    const median = times[Math.floor(times.length / 2)];
    const p95 = times[Math.floor(times.length * 0.95)];
    const p99 = times[Math.floor(times.length * 0.99)];

    const result = {
      name,
      iterations,
      min,
      max,
      mean,
      median,
      p95,
      p99,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `      平均: ${mean.toFixed(2)}ms, 中位数: ${median.toFixed(2)}ms, P95: ${p95.toFixed(2)}ms`,
    );

    return result;
  }

  /**
   * 生成报告
   */
  async generateReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let reportPath;

    if (this.config.outputFormat === 'json') {
      reportPath = path.join(BENCHMARK_RESULTS_DIR, `benchmark-${timestamp}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(this.metrics, null, 2));
    } else if (this.config.outputFormat === 'csv') {
      reportPath = path.join(BENCHMARK_RESULTS_DIR, `benchmark-${timestamp}.csv`);
      await this.generateCSVReport(reportPath);
    } else if (this.config.outputFormat === 'html') {
      reportPath = path.join(BENCHMARK_RESULTS_DIR, `benchmark-${timestamp}.html`);
      await this.generateHTMLReport(reportPath);
    }

    console.log(`\n📋 基准测试报告已生成: ${reportPath}`);

    return reportPath;
  }

  /**
   * 生成CSV报告
   */
  async generateCSVReport(filePath) {
    let csv =
      'Category,Test,Iterations,Min (ms),Max (ms),Mean (ms),Median (ms),P95 (ms),P99 (ms),Timestamp\n';

    for (const [categoryName, category] of Object.entries(this.metrics.benchmarks)) {
      for (const [testName, test] of Object.entries(category.tests)) {
        csv += `${categoryName},${testName},${test.iterations},${test.min.toFixed(2)},${test.max.toFixed(2)},${test.mean.toFixed(2)},${test.median.toFixed(2)},${test.p95.toFixed(2)},${test.p99.toFixed(2)},${test.timestamp}\n`;
      }
    }

    fs.writeFileSync(filePath, csv);
  }

  /**
   * 生成HTML报告
   */
  async generateHTMLReport(filePath) {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>性能基准测试报告</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        .system-info {
            background: #f9f9f9;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .system-info h3 {
            margin-top: 0;
        }
        .system-info table {
            width: 100%;
            border-collapse: collapse;
        }
        .system-info th, .system-info td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .benchmark-section {
            margin-bottom: 40px;
        }
        .benchmark-section h2 {
            color: #2c3e50;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }
        .benchmark-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .benchmark-table th, .benchmark-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .benchmark-table th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        .chart-container {
            position: relative;
            height: 400px;
            margin: 20px 0;
        }
        .comparison {
            color: #e74c3c;
            font-weight: bold;
        }
        .improvement {
            color: #27ae60;
            font-weight: bold;
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
        <h1>🚀 性能基准测试报告</h1>
        <p>生成时间: ${this.metrics.timestamp}</p>
    </div>
    
    <div class="system-info">
        <h3>系统信息</h3>
        <table>
            <tr><th>平台</th><td>${this.metrics.system.platform} (${this.metrics.system.arch})</td></tr>
            <tr><th>CPU</th><td>${this.metrics.system.cpu}</td></tr>
            <tr><th>核心数</th><td>${this.metrics.system.cores}</td></tr>
            <tr><th>总内存</th><td>${(this.metrics.system.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB</td></tr>
            <tr><th>可用内存</th><td>${(this.metrics.system.freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB</td></tr>
        </table>
    </div>
    
    ${this.generateBenchmarkSections()}
    
    <div class="footer">
        <p>报告自动生成 - Performance Benchmark v1.0.0</p>
    </div>
    
    <script>
        ${this.generateChartScripts()}
    </script>
</body>
</html>
    `;

    fs.writeFileSync(filePath, html);
  }

  /**
   * 生成基准测试部分
   */
  generateBenchmarkSections() {
    let sections = '';

    for (const [categoryName, category] of Object.entries(this.metrics.benchmarks)) {
      sections += `
    <div class="benchmark-section">
        <h2>${category.name}</h2>
        <table class="benchmark-table">
            <tr>
                <th>测试</th>
                <th>迭代次数</th>
                <th>最小值 (ms)</th>
                <th>最大值 (ms)</th>
                <th>平均值 (ms)</th>
                <th>中位数 (ms)</th>
                <th>P95 (ms)</th>
                <th>P99 (ms)</th>
                ${this.baselineData ? '<th>对比基线</th>' : ''}
            </tr>
      `;

      for (const [testName, test] of Object.entries(category.tests)) {
        let comparison = '';

        if (
          this.baselineData &&
          this.baselineData.benchmarks[categoryName] &&
          this.baselineData.benchmarks[categoryName].tests[testName]
        ) {
          const baselineTest = this.baselineData.benchmarks[categoryName].tests[testName];
          const diff = (((test.mean - baselineTest.mean) / baselineTest.mean) * 100).toFixed(2);

          if (diff > 0) {
            comparison = `<span class="comparison">+${diff}%</span>`;
          } else {
            comparison = `<span class="improvement">${diff}%</span>`;
          }
        }

        sections += `
            <tr>
                <td>${test.name}</td>
                <td>${test.iterations}</td>
                <td>${test.min.toFixed(2)}</td>
                <td>${test.max.toFixed(2)}</td>
                <td>${test.mean.toFixed(2)}</td>
                <td>${test.median.toFixed(2)}</td>
                <td>${test.p95.toFixed(2)}</td>
                <td>${test.p99.toFixed(2)}</td>
                ${this.baselineData ? `<td>${comparison}</td>` : ''}
            </tr>
        `;
      }

      sections += `
        </table>
        <div class="chart-container">
            <canvas id="${categoryName}-chart"></canvas>
        </div>
    </div>
      `;
    }

    return sections;
  }

  /**
   * 生成图表脚本
   */
  generateChartScripts() {
    let scripts = '';

    for (const [categoryName, category] of Object.entries(this.metrics.benchmarks)) {
      const labels = Object.keys(category.tests);
      const data = Object.values(category.tests).map(test => test.mean);

      scripts += `
        // ${categoryName} 图表
        const ${categoryName}Ctx = document.getElementById('${categoryName}-chart').getContext('2d');
        new Chart(${categoryName}Ctx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(labels)},
                datasets: [{
                    label: '平均执行时间 (ms)',
                    data: ${JSON.stringify(data)},
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '时间 (ms)'
                        }
                    }
                }
            }
        });
      `;
    }

    return scripts;
  }

  /**
   * 打印摘要
   */
  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 基准测试摘要');
    console.log('='.repeat(50));

    for (const [categoryName, category] of Object.entries(this.metrics.benchmarks)) {
      console.log(`\n${category.name}:`);

      for (const [testName, test] of Object.entries(category.tests)) {
        let comparison = '';

        if (
          this.baselineData &&
          this.baselineData.benchmarks[categoryName] &&
          this.baselineData.benchmarks[categoryName].tests[testName]
        ) {
          const baselineTest = this.baselineData.benchmarks[categoryName].tests[testName];
          const diff = (((test.mean - baselineTest.mean) / baselineTest.mean) * 100).toFixed(2);

          if (diff > 0) {
            comparison = ` (+${diff}%)`;
          } else {
            comparison = ` (${diff}%)`;
          }
        }

        console.log(`  ${test.name}: ${test.mean.toFixed(2)}ms${comparison}`);
      }
    }

    console.log('\n' + '='.repeat(50));
  }

  /**
   * 保存为基线
   */
  saveAsBaseline() {
    this.saveBaselineData();
    console.log('当前测试结果已保存为基线数据');
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 解析命令行参数
    const args = process.argv.slice(2);
    const command = args[0];
    const options = {};

    if (command === 'run') {
      // 解析选项
      for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--iterations=')) {
          options.iterations = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--format=')) {
          options.outputFormat = arg.split('=')[1];
        } else if (arg === '--no-baseline') {
          options.compareWithBaseline = false;
        } else if (arg === '--save-baseline') {
          options.saveBaseline = true;
        }
      }

      // 创建基准测试实例
      const benchmark = new PerformanceBenchmark(options);

      // 运行基准测试
      const results = await benchmark.runAllBenchmarks();

      // 保存为基线
      if (options.saveBaseline) {
        benchmark.saveAsBaseline();
      }

      return results;
    } else {
      console.log('用法:');
      console.log('  node performance-benchmark.js run [选项]');
      console.log('');
      console.log('选项:');
      console.log('  --iterations=<数量>    设置迭代次数');
      console.log('  --format=<格式>       设置输出格式 (json, csv, html)');
      console.log('  --no-baseline          不与基线数据对比');
      console.log('  --save-baseline        保存为基线数据');
    }
  } catch (error) {
    console.error('基准测试错误:', error.message);
    process.exit(1);
  }
}

// 导出类供测试使用
module.exports = {
  PerformanceBenchmark,
};

// 如果直接运行此脚本，执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
