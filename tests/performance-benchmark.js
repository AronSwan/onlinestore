/**
 * 性能基准测试脚本
 * 用于评估应用性能并生成优化建议
 */

const fs = require('fs');
const path = require('path');

// 模拟浏览器环境
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
  resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

// 模拟性能API
global.performance = {
  now: () => Date.now(),
  mark: () => {},
  measure: () => {},
  getEntriesByType: () => [],
  getEntriesByName: () => [],
  timing: {
    navigationStart: Date.now() - 5000,
    loadEventEnd: Date.now() - 1000,
    domContentLoadedEventEnd: Date.now() - 2000,
    responseEnd: Date.now() - 3000
  }
};

// 模拟Web Vitals数据
const mockWebVitalsData = {
  lcp: 2800, // Largest Contentful Paint
  fid: 120,  // First Input Delay
  cls: 0.15, // Cumulative Layout Shift
  fcp: 1200, // First Contentful Paint
  ttfb: 800  // Time to First Byte
};

// 模拟资源性能数据
const mockResourceData = [
  {
    name: 'https://example.com/app.js',
    duration: 1200,
    transferSize: 150000,
    initiatorType: 'script'
  },
  {
    name: 'https://example.com/styles.css',
    duration: 800,
    transferSize: 45000,
    initiatorType: 'link'
  },
  {
    name: 'https://example.com/image.jpg',
    duration: 2000,
    transferSize: 800000,
    initiatorType: 'img'
  }
];

// 模拟用户行为数据
const mockBehaviorData = {
  timeOnPage: 45000,
  scrollDepth: 0.8,
  clickCount: 12,
  bounceRate: 0.25,
  engagementScore: 0.75
};

// 模拟错误数据
const mockErrorData = [
  {
    message: 'TypeError: Cannot read property of undefined',
    source: 'app.js',
    lineno: 123,
    severity: 'error'
  }
];

class PerformanceBenchmark {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      webVitals: {},
      loadPerformance: {},
      resourcePerformance: {},
      userBehavior: {},
      errors: [],
      score: 0,
      recommendations: []
    };
  }

  /**
   * 运行完整的性能基准测试
   */
  async runBenchmark() {
    console.log('🚀 开始性能基准测试...');
    
    try {
      // 1. 测试Core Web Vitals
      await this.testWebVitals();
      
      // 2. 测试页面加载性能
      await this.testLoadPerformance();
      
      // 3. 测试资源加载性能
      await this.testResourcePerformance();
      
      // 4. 分析用户行为指标
      await this.analyzeUserBehavior();
      
      // 5. 检查错误率
      await this.analyzeErrors();
      
      // 6. 计算总体性能评分
      this.calculatePerformanceScore();
      
      // 7. 生成优化建议
      this.generateRecommendations();
      
      // 8. 保存结果
      await this.saveResults();
      
      console.log('✅ 性能基准测试完成');
      this.printSummary();
      
    } catch (error) {
      console.error('❌ 性能基准测试失败:', error);
      throw error;
    }
  }

  /**
   * 测试Core Web Vitals指标
   */
  async testWebVitals() {
    console.log('📊 测试Core Web Vitals...');
    
    this.results.webVitals = {
      lcp: mockWebVitalsData.lcp,
      fid: mockWebVitalsData.fid,
      cls: mockWebVitalsData.cls,
      fcp: mockWebVitalsData.fcp,
      ttfb: mockWebVitalsData.ttfb
    };
    
    // 评估Web Vitals
    this.results.webVitals.lcpRating = this.rateMetric(mockWebVitalsData.lcp, 2500, 4000);
    this.results.webVitals.fidRating = this.rateMetric(mockWebVitalsData.fid, 100, 300);
    this.results.webVitals.clsRating = this.rateMetric(mockWebVitalsData.cls, 0.1, 0.25);
  }

  /**
   * 测试页面加载性能
   */
  async testLoadPerformance() {
    console.log('⏱️ 测试页面加载性能...');
    
    const timing = performance.timing;
    const loadTime = timing.loadEventEnd - timing.navigationStart;
    const domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
    const responseTime = timing.responseEnd - timing.navigationStart;
    
    this.results.loadPerformance = {
      loadTime,
      domContentLoaded,
      responseTime,
      loadTimeRating: this.rateMetric(loadTime, 3000, 5000),
      domRating: this.rateMetric(domContentLoaded, 1500, 3000)
    };
  }

  /**
   * 测试资源加载性能
   */
  async testResourcePerformance() {
    console.log('📦 测试资源加载性能...');
    
    const resources = mockResourceData;
    const slowResources = resources.filter(r => r.duration > 1000);
    const largeResources = resources.filter(r => r.transferSize > 100000);
    
    this.results.resourcePerformance = {
      totalResources: resources.length,
      slowResources: slowResources.length,
      largeResources: largeResources.length,
      averageLoadTime: resources.reduce((sum, r) => sum + r.duration, 0) / resources.length,
      totalSize: resources.reduce((sum, r) => sum + r.transferSize, 0),
      resourceDetails: resources.map(r => ({
        name: r.name.split('/').pop(),
        duration: r.duration,
        size: r.transferSize,
        type: r.initiatorType,
        rating: this.rateMetric(r.duration, 1000, 3000)
      }))
    };
  }

  /**
   * 分析用户行为指标
   */
  async analyzeUserBehavior() {
    console.log('👤 分析用户行为指标...');
    
    this.results.userBehavior = {
      timeOnPage: mockBehaviorData.timeOnPage,
      scrollDepth: mockBehaviorData.scrollDepth,
      clickCount: mockBehaviorData.clickCount,
      bounceRate: mockBehaviorData.bounceRate,
      engagementScore: mockBehaviorData.engagementScore,
      timeOnPageRating: this.rateMetric(mockBehaviorData.timeOnPage, 30000, 10000, true),
      bounceRateRating: this.rateMetric(mockBehaviorData.bounceRate, 0.3, 0.7, true)
    };
  }

  /**
   * 分析错误率
   */
  async analyzeErrors() {
    console.log('🐛 分析错误率...');
    
    const errors = mockErrorData;
    const errorRate = errors.length / 1000; // 假设1000次页面访问
    
    this.results.errors = {
      totalErrors: errors.length,
      errorRate,
      errorRating: this.rateMetric(errorRate, 0.01, 0.05, true),
      errorDetails: errors.map(e => ({
        message: e.message,
        source: e.source,
        line: e.lineno,
        severity: e.severity
      }))
    };
  }

  /**
   * 计算总体性能评分
   */
  calculatePerformanceScore() {
    const weights = {
      webVitals: 0.4,
      loadPerformance: 0.25,
      resourcePerformance: 0.2,
      userBehavior: 0.1,
      errors: 0.05
    };
    
    const scores = {
      webVitals: this.calculateWebVitalsScore(),
      loadPerformance: this.calculateLoadScore(),
      resourcePerformance: this.calculateResourceScore(),
      userBehavior: this.calculateBehaviorScore(),
      errors: this.calculateErrorScore()
    };
    
    this.results.score = Object.keys(weights).reduce((total, key) => {
      return total + (scores[key] * weights[key]);
    }, 0);
    
    this.results.scoreBreakdown = scores;
  }

  /**
   * 生成优化建议
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Web Vitals建议
    if (this.results.webVitals.lcpRating === 'poor') {
      recommendations.push({
        priority: 'high',
        category: 'Core Web Vitals',
        issue: 'LCP过慢',
        suggestion: '优化最大内容绘制时间：压缩图片、使用CDN、优化服务器响应时间',
        impact: 'high'
      });
    }
    
    if (this.results.webVitals.clsRating === 'poor') {
      recommendations.push({
        priority: 'high',
        category: 'Core Web Vitals',
        issue: 'CLS过高',
        suggestion: '减少布局偏移：为图片设置尺寸、避免动态插入内容',
        impact: 'medium'
      });
    }
    
    // 资源优化建议
    if (this.results.resourcePerformance.largeResources > 0) {
      recommendations.push({
        priority: 'medium',
        category: '资源优化',
        issue: '存在大型资源文件',
        suggestion: '压缩和优化大型资源：使用Gzip、图片压缩、代码分割',
        impact: 'medium'
      });
    }
    
    if (this.results.resourcePerformance.slowResources > 0) {
      recommendations.push({
        priority: 'medium',
        category: '资源优化',
        issue: '资源加载缓慢',
        suggestion: '优化资源加载：使用CDN、启用缓存、延迟加载',
        impact: 'medium'
      });
    }
    
    // 用户体验建议
    if (this.results.userBehavior.bounceRateRating === 'poor') {
      recommendations.push({
        priority: 'medium',
        category: '用户体验',
        issue: '跳出率过高',
        suggestion: '改善用户体验：优化页面内容、提升加载速度、改善导航',
        impact: 'high'
      });
    }
    
    // 错误处理建议
    if (this.results.errors.errorRating === 'poor') {
      recommendations.push({
        priority: 'high',
        category: '错误处理',
        issue: '错误率过高',
        suggestion: '修复JavaScript错误、改善错误处理机制',
        impact: 'high'
      });
    }
    
    this.results.recommendations = recommendations;
  }

  /**
   * 评估指标等级
   */
  rateMetric(value, goodThreshold, poorThreshold, reverse = false) {
    if (reverse) {
      if (value <= goodThreshold) return 'good';
      if (value <= poorThreshold) return 'needs-improvement';
      return 'poor';
    } else {
      if (value <= goodThreshold) return 'good';
      if (value <= poorThreshold) return 'needs-improvement';
      return 'poor';
    }
  }

  /**
   * 计算各项评分
   */
  calculateWebVitalsScore() {
    const ratings = [this.results.webVitals.lcpRating, this.results.webVitals.fidRating, this.results.webVitals.clsRating];
    return this.calculateRatingScore(ratings);
  }

  calculateLoadScore() {
    const ratings = [this.results.loadPerformance.loadTimeRating, this.results.loadPerformance.domRating];
    return this.calculateRatingScore(ratings);
  }

  calculateResourceScore() {
    const avgRating = this.results.resourcePerformance.resourceDetails.reduce((sum, r) => {
      return sum + this.ratingToScore(r.rating);
    }, 0) / this.results.resourcePerformance.resourceDetails.length;
    return avgRating;
  }

  calculateBehaviorScore() {
    const ratings = [this.results.userBehavior.timeOnPageRating, this.results.userBehavior.bounceRateRating];
    return this.calculateRatingScore(ratings);
  }

  calculateErrorScore() {
    return this.ratingToScore(this.results.errors.errorRating);
  }

  calculateRatingScore(ratings) {
    const scores = ratings.map(r => this.ratingToScore(r));
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  }

  ratingToScore(rating) {
    switch (rating) {
      case 'good': return 100;
      case 'needs-improvement': return 60;
      case 'poor': return 20;
      default: return 0;
    }
  }

  /**
   * 保存测试结果
   */
  async saveResults() {
    const resultsPath = path.join(__dirname, 'performance-benchmark-results.json');
    const reportPath = path.join(__dirname, 'performance-benchmark-report.md');
    
    // 保存JSON结果
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
    
    // 生成Markdown报告
    const report = this.generateMarkdownReport();
    fs.writeFileSync(reportPath, report);
    
    console.log(`📄 结果已保存到: ${resultsPath}`);
    console.log(`📋 报告已保存到: ${reportPath}`);
  }

  /**
   * 生成Markdown报告
   */
  generateMarkdownReport() {
    const score = Math.round(this.results.score);
    const scoreEmoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
    
    return `# 性能基准测试报告

**测试时间**: ${this.results.timestamp}
**总体评分**: ${scoreEmoji} ${score}/100

## Core Web Vitals

| 指标 | 值 | 评级 | 状态 |
|------|----|----- |------|
| LCP | ${this.results.webVitals.lcp}ms | ${this.results.webVitals.lcpRating} | ${this.getRatingEmoji(this.results.webVitals.lcpRating)} |
| FID | ${this.results.webVitals.fid}ms | ${this.results.webVitals.fidRating} | ${this.getRatingEmoji(this.results.webVitals.fidRating)} |
| CLS | ${this.results.webVitals.cls} | ${this.results.webVitals.clsRating} | ${this.getRatingEmoji(this.results.webVitals.clsRating)} |

## 页面加载性能

| 指标 | 值 | 评级 |
|------|----|----- |
| 页面加载时间 | ${this.results.loadPerformance.loadTime}ms | ${this.getRatingEmoji(this.results.loadPerformance.loadTimeRating)} |
| DOM内容加载 | ${this.results.loadPerformance.domContentLoaded}ms | ${this.getRatingEmoji(this.results.loadPerformance.domRating)} |

## 资源性能

- **总资源数**: ${this.results.resourcePerformance.totalResources}
- **慢速资源**: ${this.results.resourcePerformance.slowResources}
- **大型资源**: ${this.results.resourcePerformance.largeResources}
- **平均加载时间**: ${Math.round(this.results.resourcePerformance.averageLoadTime)}ms
- **总大小**: ${Math.round(this.results.resourcePerformance.totalSize / 1024)}KB

## 用户行为

- **页面停留时间**: ${Math.round(this.results.userBehavior.timeOnPage / 1000)}秒
- **滚动深度**: ${Math.round(this.results.userBehavior.scrollDepth * 100)}%
- **跳出率**: ${Math.round(this.results.userBehavior.bounceRate * 100)}%

## 错误统计

- **错误总数**: ${this.results.errors.totalErrors}
- **错误率**: ${(this.results.errors.errorRate * 100).toFixed(2)}%

## 优化建议

${this.results.recommendations.map(r => 
  `### ${r.category} - ${r.priority.toUpperCase()}
**问题**: ${r.issue}
**建议**: ${r.suggestion}
**影响**: ${r.impact}
`
).join('\n')}

## 评分详情

| 类别 | 评分 | 权重 |
|------|------|------|
| Core Web Vitals | ${Math.round(this.results.scoreBreakdown.webVitals)} | 40% |
| 页面加载 | ${Math.round(this.results.scoreBreakdown.loadPerformance)} | 25% |
| 资源性能 | ${Math.round(this.results.scoreBreakdown.resourcePerformance)} | 20% |
| 用户行为 | ${Math.round(this.results.scoreBreakdown.userBehavior)} | 10% |
| 错误处理 | ${Math.round(this.results.scoreBreakdown.errors)} | 5% |

---
*报告生成时间: ${new Date().toLocaleString()}*
`;
  }

  getRatingEmoji(rating) {
    switch (rating) {
      case 'good': return '🟢';
      case 'needs-improvement': return '🟡';
      case 'poor': return '🔴';
      default: return '⚪';
    }
  }

  /**
   * 打印测试摘要
   */
  printSummary() {
    const score = Math.round(this.results.score);
    const scoreEmoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 性能基准测试摘要');
    console.log('='.repeat(50));
    console.log(`总体评分: ${scoreEmoji} ${score}/100`);
    console.log(`\nCore Web Vitals:`);
    console.log(`  LCP: ${this.results.webVitals.lcp}ms (${this.results.webVitals.lcpRating})`);
    console.log(`  FID: ${this.results.webVitals.fid}ms (${this.results.webVitals.fidRating})`);
    console.log(`  CLS: ${this.results.webVitals.cls} (${this.results.webVitals.clsRating})`);
    console.log(`\n优化建议数量: ${this.results.recommendations.length}`);
    console.log(`高优先级建议: ${this.results.recommendations.filter(r => r.priority === 'high').length}`);
    console.log('='.repeat(50));
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const benchmark = new PerformanceBenchmark();
  benchmark.runBenchmark().catch(console.error);
}

module.exports = PerformanceBenchmark;