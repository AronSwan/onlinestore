/**
 * 性能优化器 - 自动分析性能数据并提供优化建议
 */
class PerformanceOptimizer {
  /**
     * 构造函数 - 初始化性能优化器
     * 设置性能阈值和监控数组
     */
  constructor() {
    // 性能阈值常量定义
    this.PERFORMANCE_CONSTANTS = {
      // Core Web Vitals阈值
      LCP_GOOD_THRESHOLD: 2500,
      LCP_POOR_THRESHOLD: 4000,
      FID_GOOD_THRESHOLD: 100,
      FID_POOR_THRESHOLD: 300,
      CLS_GOOD_THRESHOLD: 0.1,
      CLS_POOR_THRESHOLD: 0.25,

      // 页面加载时间阈值
      LOAD_TIME_GOOD: 3000,
      LOAD_TIME_POOR: 5000,
      DOM_CONTENT_LOADED_GOOD: 1500,
      DOM_CONTENT_LOADED_POOR: 3000,
      FIRST_PAINT_GOOD: 1000,
      FIRST_PAINT_POOR: 2000,

      // 资源加载时间阈值
      RESOURCE_LOAD_TIME_GOOD: 1000,
      RESOURCE_LOAD_TIME_POOR: 3000,

      // 资源大小阈值
      RESOURCE_SIZE_GOOD: 100000,
      RESOURCE_SIZE_POOR: 500000,

      // 用户行为阈值
      TIME_ON_PAGE_GOOD: 30000,
      TIME_ON_PAGE_POOR: 10000,

      // 跳出率阈值
      BOUNCE_RATE_GOOD: 0.3,
      BOUNCE_RATE_POOR: 0.7,

      // 错误率阈值
      ERROR_RATE_GOOD: 0.01,
      ERROR_RATE_POOR: 0.05,

      // 内存阈值
      MEMORY_THRESHOLD: 200000,

      // 性能评分阈值
      PERFORMANCE_SCORE_THRESHOLD: 25
    };

    // 定义各种性能指标的阈值标准
    this.thresholds = {
      // Core Web Vitals 阈值 (Google标准)
      lcp: {
        good: window.MAGIC_NUMBERS?.LCP_GOOD_THRESHOLD || this.PERFORMANCE_CONSTANTS.LCP_GOOD_THRESHOLD,
        poor: window.MAGIC_NUMBERS?.LCP_POOR_THRESHOLD || this.PERFORMANCE_CONSTANTS.LCP_POOR_THRESHOLD
      },    // Largest Contentful Paint
      fid: {
        good: window.MAGIC_NUMBERS?.FID_GOOD_THRESHOLD || this.PERFORMANCE_CONSTANTS.FID_GOOD_THRESHOLD,
        poor: window.MAGIC_NUMBERS?.FID_POOR_THRESHOLD || this.PERFORMANCE_CONSTANTS.FID_POOR_THRESHOLD
      },      // First Input Delay
      cls: {
        good: window.MAGIC_NUMBERS?.CLS_GOOD_THRESHOLD || this.PERFORMANCE_CONSTANTS.CLS_GOOD_THRESHOLD,
        poor: window.MAGIC_NUMBERS?.CLS_POOR_THRESHOLD || this.PERFORMANCE_CONSTANTS.CLS_POOR_THRESHOLD
      },     // Cumulative Layout Shift

      // 其他性能指标阈值
      loadTime: {
        good: window.MAGIC_NUMBERS?.LOAD_TIME_GOOD || this.PERFORMANCE_CONSTANTS.LOAD_TIME_GOOD,
        poor: window.MAGIC_NUMBERS?.LOAD_TIME_POOR || this.PERFORMANCE_CONSTANTS.LOAD_TIME_POOR
      },           // 页面加载时间
      domContentLoaded: {
        good: window.MAGIC_NUMBERS?.DOM_CONTENT_LOADED_GOOD || this.PERFORMANCE_CONSTANTS.DOM_CONTENT_LOADED_GOOD,
        poor: window.MAGIC_NUMBERS?.DOM_CONTENT_LOADED_POOR || this.PERFORMANCE_CONSTANTS.DOM_CONTENT_LOADED_POOR
      },   // DOM内容加载时间
      firstPaint: {
        good: window.MAGIC_NUMBERS?.FIRST_PAINT_GOOD || this.PERFORMANCE_CONSTANTS.FIRST_PAINT_GOOD,
        poor: window.MAGIC_NUMBERS?.FIRST_PAINT_POOR || this.PERFORMANCE_CONSTANTS.FIRST_PAINT_POOR
      },         // 首次绘制时间

      // 资源加载阈值
      resourceLoadTime: {
        good: window.MAGIC_NUMBERS?.RESOURCE_LOAD_TIME_GOOD || this.PERFORMANCE_CONSTANTS.RESOURCE_LOAD_TIME_GOOD,
        poor: window.MAGIC_NUMBERS?.RESOURCE_LOAD_TIME_POOR || this.PERFORMANCE_CONSTANTS.RESOURCE_LOAD_TIME_POOR
      },   // 资源加载时间
      resourceSize: {
        good: window.MAGIC_NUMBERS?.RESOURCE_SIZE_GOOD || this.PERFORMANCE_CONSTANTS.RESOURCE_SIZE_GOOD,
        poor: window.MAGIC_NUMBERS?.RESOURCE_SIZE_POOR || this.PERFORMANCE_CONSTANTS.RESOURCE_SIZE_POOR
      },   // 资源大小 (100KB, 500KB)

      // 用户行为阈值
      bounceRate: {
        good: window.MAGIC_NUMBERS?.BOUNCE_RATE_GOOD || this.PERFORMANCE_CONSTANTS.BOUNCE_RATE_GOOD,
        poor: window.MAGIC_NUMBERS?.BOUNCE_RATE_POOR || this.PERFORMANCE_CONSTANTS.BOUNCE_RATE_POOR
      },           // 跳出率
      timeOnPage: {
        good: window.MAGIC_NUMBERS?.TIME_ON_PAGE_GOOD || this.PERFORMANCE_CONSTANTS.TIME_ON_PAGE_GOOD,
        poor: window.MAGIC_NUMBERS?.TIME_ON_PAGE_POOR || this.PERFORMANCE_CONSTANTS.TIME_ON_PAGE_POOR
      },       // 页面停留时间 (30秒, 10秒)
      errorRate: {
        good: window.MAGIC_NUMBERS?.ERROR_RATE_GOOD || this.PERFORMANCE_CONSTANTS.ERROR_RATE_GOOD,
        poor: window.MAGIC_NUMBERS?.ERROR_RATE_POOR || this.PERFORMANCE_CONSTANTS.ERROR_RATE_POOR
      }           // 错误率 (1%, 5%)
    };

    // 初始化监控数组
    this.alerts = [];              // 性能警报
    this.suggestions = [];         // 优化建议
    this.autoOptimizations = [];   // 自动优化记录

    this.init();
  }

  /**
     * 初始化性能优化器
     * 设置定期检查和事件监听
     */
  init() {
    // 定期检查性能指标 - 每30秒执行一次分析
    setInterval(() => {
      this.analyzePerformance();
    }, window.MAGIC_NUMBERS?.PERFORMANCE_CHECK_INTERVAL || 30000);

    // 设置性能事件监听器
    this.setupPerformanceListeners();
  }

  /**
     * 设置性能监听器
     * 监听各种性能相关事件
     */
  setupPerformanceListeners() {
    // 监听资源加载错误 (图片、脚本、样式等)
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleResourceError(event);
      }
    });

    // 监听未处理的Promise拒绝 (异步错误)
    window.addEventListener('unhandledrejection', (event) => {
      this.handleUnhandledRejection(event);
    });

    // 监听页面可见性变化 (用户切换标签页时)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.analyzePerformance();
      }
    });
  }

  /**
     * 执行完整的性能分析
     * 收集数据并进行各项性能指标分析
     */
  analyzePerformance() {
    // 收集性能数据和用户行为数据
    const performanceData = this.collectPerformanceData();
    const behaviorData = this.collectBehaviorData();

    // 清除之前的警报
    this.clearPreviousAlerts();

    // 执行各项性能分析
    this.analyzeCoreWebVitals(performanceData);      // Core Web Vitals分析
    this.analyzeLoadPerformance(performanceData);    // 页面加载性能分析
    this.analyzeResourcePerformance(performanceData); // 资源性能分析
    this.analyzeBehaviorMetrics(behaviorData);       // 用户行为分析
    this.analyzeBehaviorMetrics(behaviorData);

    // 分析错误率
    this.analyzeErrorMetrics(performanceData);

    // 生成优化建议
    this.generateOptimizationSuggestions(performanceData, behaviorData);

    // 触发自动优化
    this.triggerAutoOptimizations();

    // 发送警报
    this.sendAlerts();
  }

  /**
     * 收集性能数据
     * 从性能监控器获取各种性能指标数据
     * @returns {Object|null} 包含性能数据的对象，如果监控器不可用则返回null
     * @returns {Object} returns.webVitals - Core Web Vitals数据
     * @returns {Object} returns.loadMetrics - 页面加载指标
     * @returns {Array} returns.resourceMetrics - 资源性能指标
     * @returns {Array} returns.errorMetrics - 错误指标
     */
  collectPerformanceData() {
    if (window.performanceMonitor) {
      const data = window.performanceMonitor.getPerformanceData();
      return {
        webVitals: data.vitals || {},
        loadMetrics: data.pageLoad || {},
        resourceMetrics: data.resources || [],
        errorMetrics: window.performanceMonitor.getErrors() || []
      };
    }
    return null;
  }

  /**
     * 收集用户行为数据
     * 从性能监控器获取用户行为统计信息
     * @returns {Object|null} 用户行为数据对象，如果监控器不可用则返回null
     */
  collectBehaviorData() {
    if (window.performanceMonitor) {
      return window.performanceMonitor.getBehaviorStats();
    }
    return null;
  }

  /**
     * 分析Core Web Vitals指标
     * 检查LCP、FID、CLS等关键性能指标并生成相应的警报和建议
     * @param {Object} data - 性能数据对象
     * @param {Object} data.webVitals - Core Web Vitals数据
     * @param {number} data.webVitals.lcp - 最大内容绘制时间
     * @param {number} data.webVitals.fid - 首次输入延迟
     * @param {number} data.webVitals.cls - 累积布局偏移
     */
  analyzeCoreWebVitals(data) {
    if (!data || !data.webVitals) { return; }

    const { lcp, fid, cls } = data.webVitals;

    // LCP 分析
    if (lcp > this.thresholds.lcp.poor) {
      this.addAlert('critical', 'LCP过慢', `最大内容绘制时间为${lcp}ms，严重影响用户体验`);
      this.addSuggestion('high', 'LCP优化', [
        '优化图片加载：使用WebP格式，添加适当的尺寸',
        '减少服务器响应时间',
        '移除阻塞渲染的资源',
        '使用CDN加速静态资源'
      ]);
    } else if (lcp > this.thresholds.lcp.good) {
      this.addAlert('warning', 'LCP需要改进', `最大内容绘制时间为${lcp}ms，有优化空间`);
    }

    // FID 分析
    if (fid > this.thresholds.fid.poor) {
      this.addAlert('critical', 'FID过高', `首次输入延迟为${fid}ms，用户交互响应慢`);
      this.addSuggestion('high', 'FID优化', [
        '减少JavaScript执行时间',
        '分割长任务',
        '使用Web Workers处理复杂计算',
        '延迟加载非关键JavaScript'
      ]);
    }

    // CLS 分析
    if (cls > this.thresholds.cls.poor) {
      this.addAlert('critical', 'CLS过高', `累积布局偏移为${cls}，页面布局不稳定`);
      this.addSuggestion('high', 'CLS优化', [
        '为图片和视频设置明确的尺寸属性',
        '避免在现有内容上方插入内容',
        '使用transform动画而非改变布局的动画',
        '预留广告和嵌入内容的空间'
      ]);
    }
  }

  /**
     * 分析页面加载性能
     * 检查页面加载时间、DOM内容加载时间、首次绘制时间等指标
     * @param {Object} data - 性能数据对象
     * @param {Object} data.loadMetrics - 页面加载指标
     * @param {number} data.loadMetrics.loadTime - 页面加载时间
     * @param {number} data.loadMetrics.domContentLoaded - DOM内容加载时间
     * @param {number} data.loadMetrics.firstPaint - 首次绘制时间
     */
  analyzeLoadPerformance(data) {
    if (!data || !data.loadMetrics) { return; }

    const { loadTime, domContentLoaded: _domContentLoaded, firstPaint: _firstPaint } = data.loadMetrics;

    if (loadTime > this.thresholds.loadTime.poor) {
      this.addAlert('warning', '页面加载慢', `页面加载时间为${loadTime}ms`);
      this.addSuggestion('medium', '加载优化', [
        '启用Gzip压缩',
        '优化CSS和JavaScript文件',
        '使用浏览器缓存',
        '减少HTTP请求数量'
      ]);
    }

    if (_firstPaint > this.thresholds.firstPaint.poor) {
      this.addAlert('warning', '首次绘制慢', `首次绘制时间为${_firstPaint}ms`);
      this.addSuggestion('medium', '渲染优化', [
        '内联关键CSS',
        '移除阻塞渲染的资源',
        '优化字体加载',
        '使用资源预加载'
      ]);
    }
  }

  /**
     * 分析资源性能
     * 检查资源加载时间和文件大小，识别慢加载和大文件问题
     * @param {Object} data - 性能数据对象
     * @param {Array} data.resourceMetrics - 资源性能指标数组
     */
  analyzeResourcePerformance(data) {
    if (!data || !data.resourceMetrics) { return; }

    const resources = data.resourceMetrics;

    // 分析慢加载资源
    const slowResources = resources.filter(resource =>
      resource.duration > this.thresholds.resourceLoadTime.poor
    );

    if (slowResources.length > 0) {
      this.addAlert('warning', '资源加载慢', `发现${slowResources.length}个慢加载资源`);
      this.addSuggestion('medium', '资源优化', [
        '压缩大文件',
        '使用CDN',
        '实现资源懒加载',
        '优化图片格式和尺寸'
      ]);
    }

    // 分析大文件
    const largeResources = resources.filter(resource =>
      resource.transferSize > this.thresholds.resourceSize.poor
    );

    if (largeResources.length > 0) {
      this.addAlert('info', '发现大文件', `${largeResources.length}个文件超过500KB`);
      this.addSuggestion('low', '文件大小优化', [
        '压缩图片和视频',
        '分割大的JavaScript文件',
        '移除未使用的代码',
        '使用现代图片格式'
      ]);
    }
  }

  /**
     * 分析用户行为指标
     * 检查用户参与度、交互频率等行为数据
     * @param {Object} data - 用户行为数据对象
     * @param {number} data.timeOnPage - 页面停留时间
     * @param {Array} data.interactions - 用户交互记录
     * @param {number} data.scrollDepth - 滚动深度
     */
  analyzeBehaviorMetrics(data) {
    if (!data) { return; }

    const { timeOnPage, interactions, scrollDepth: _scrollDepth } = data;

    // 分析跳出率（基于页面停留时间）
    if (timeOnPage < this.thresholds.timeOnPage.poor) {
      this.addAlert('warning', '用户参与度低', `平均页面停留时间仅${Math.round(timeOnPage / 1000)}秒`);
      this.addSuggestion('high', '用户体验优化', [
        '改进页面加载速度',
        '优化内容布局和可读性',
        '添加交互元素',
        '改进导航体验'
      ]);
    }

    // 分析交互频率
    if (interactions && interactions.length < 5) {
      this.addAlert('info', '交互频率低', '用户交互次数较少');
      this.addSuggestion('medium', '交互优化', [
        '添加更多交互元素',
        '改进按钮和链接的可见性',
        '优化表单体验',
        '添加引导提示'
      ]);
    }
  }

  /**
     * 分析错误指标
     * 检查JavaScript错误和资源加载错误的数量
     * @param {Object} data - 性能数据对象
     * @param {Object} data.errorMetrics - 错误指标对象
     * @param {Array} data.errorMetrics.jsErrors - JavaScript错误数组
     * @param {Array} data.errorMetrics.resourceErrors - 资源错误数组
     */
  analyzeErrorMetrics(data) {
    if (!data || !data.errorMetrics) { return; }

    const { jsErrors, resourceErrors } = data.errorMetrics;
    const totalErrors = jsErrors.length + resourceErrors.length;

    if (totalErrors > 10) {
      this.addAlert('critical', '错误率高', `发现${totalErrors}个错误`);
      this.addSuggestion('critical', '错误修复', [
        '修复JavaScript错误',
        '检查资源链接',
        '添加错误处理机制',
        '实现优雅降级'
      ]);
    }
  }

  /**
     * 生成优化建议
     * 基于性能数据和用户行为数据生成个性化的优化建议
     * @param {Object} performanceData - 性能数据对象
     * @param {Object} behaviorData - 用户行为数据对象
     */
  generateOptimizationSuggestions(performanceData, _behaviorData) {
    // 基于数据生成个性化建议
    const suggestions = [];

    // 图片优化建议
    if (this.hasImagePerformanceIssues(performanceData)) {
      suggestions.push({
        type: 'image',
        priority: 'high',
        title: '图片优化',
        actions: [
          '转换为WebP格式',
          '实现响应式图片',
          '添加图片懒加载',
          '压缩图片文件'
        ]
      });
    }

    // JavaScript优化建议
    if (this.hasJavaScriptPerformanceIssues(performanceData)) {
      suggestions.push({
        type: 'javascript',
        priority: 'medium',
        title: 'JavaScript优化',
        actions: [
          '代码分割和懒加载',
          '移除未使用的代码',
          '使用现代JavaScript语法',
          '优化第三方库'
        ]
      });
    }

    // 缓存优化建议
    suggestions.push({
      type: 'caching',
      priority: 'medium',
      title: '缓存策略优化',
      actions: [
        '设置适当的缓存头',
        '使用Service Worker',
        '实现离线功能',
        '优化缓存策略'
      ]
    });

    this.suggestions = this.suggestions.concat(suggestions);
  }

  /**
     * 触发自动优化
     * 自动应用一些安全的性能优化措施
     */
  triggerAutoOptimizations() {
    // 自动应用一些安全的优化
    this.autoOptimizeImages();
    this.autoOptimizeScripts();
    this.autoOptimizeCaching();
  }

  /**
     * 自动优化图片
     * 为折叠线以下的图片自动添加懒加载属性
     */
  autoOptimizeImages() {
    // 自动为图片添加loading="lazy"
    const images = document.querySelectorAll('img:not([loading])');
    images.forEach(img => {
      if (this.isImageBelowFold(img)) {
        img.setAttribute('loading', 'lazy');
        this.addAutoOptimization('为图片添加懒加载属性');
      }
    });
  }

  /**
     * 自动优化脚本
     * 为非关键脚本自动添加defer属性以提高页面加载性能
     */
  autoOptimizeScripts() {
    // 延迟加载非关键脚本
    const scripts = document.querySelectorAll('script[src]:not([async]):not([defer])');
    scripts.forEach(script => {
      if (!this.isCriticalScript(script.src)) {
        script.setAttribute('defer', '');
        this.addAutoOptimization('为非关键脚本添加defer属性');
      }
    });
  }

  /**
     * 自动优化缓存
     * 预加载关键资源以提高页面性能
     */
  autoOptimizeCaching() {
    // 预加载关键资源
    const criticalResources = this.identifyCriticalResources();
    criticalResources.forEach(resource => {
      if (!document.querySelector(`link[href="${resource}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource;
        link.as = this.getResourceType(resource);
        document.head.appendChild(link);
        this.addAutoOptimization(`预加载关键资源: ${resource}`);
      }
    });
  }

  // 辅助方法
  /**
     * 检查是否存在图片性能问题
     * 判断是否有图片加载时间超过1秒或文件大小超过200KB
     * @param {Object} data - 性能数据对象
     * @param {Array} data.resourceMetrics - 资源性能指标数组
     * @returns {boolean} 如果存在图片性能问题返回true，否则返回false
     */
  hasImagePerformanceIssues(data) {
    if (!data || !data.resourceMetrics) { return false; }
    return data.resourceMetrics.some(resource =>
      resource.name.match(/\.(jpg|jpeg|png|gif)$/i) &&
      (resource.duration > 1000 || resource.transferSize > this.PERFORMANCE_CONSTANTS.MEMORY_THRESHOLD)
    );
  }

  /**
     * 检查是否存在JavaScript性能问题
     * 判断是否有脚本加载时间超过500毫秒
     * @param {Object} data - 性能数据对象
     * @param {Array} data.resourceMetrics - 资源性能指标数组
     * @returns {boolean} 如果存在JavaScript性能问题返回true，否则返回false
     */
  hasJavaScriptPerformanceIssues(data) {
    if (!data || !data.resourceMetrics) { return false; }
    return data.resourceMetrics.some(resource =>
      resource.name.match(/\.js$/i) &&
      resource.duration > 500
    );
  }

  /**
     * 检查图片是否在折叠线以下
     * 判断图片是否在当前视口之外（需要滚动才能看到）
     * @param {HTMLImageElement} img - 图片元素
     * @returns {boolean} 如果图片在折叠线以下返回true，否则返回false
     */
  isImageBelowFold(img) {
    const rect = img.getBoundingClientRect();
    return rect.top > window.innerHeight;
  }

  /**
     * 判断脚本是否为关键脚本
     * 检查脚本URL是否匹配关键脚本模式
     * @param {string} src - 脚本的URL
     * @returns {boolean} 如果是关键脚本返回true，否则返回false
     */
  isCriticalScript(src) {
    const criticalPatterns = [
      /jquery/i,
      /bootstrap/i,
      /main/i,
      /app/i
    ];
    return criticalPatterns.some(pattern => pattern.test(src));
  }

  /**
     * 识别关键资源
     * 识别页面中的关键CSS和其他重要资源
     * @returns {Array<string>} 关键资源URL数组
     */
  identifyCriticalResources() {
    // 识别关键资源（CSS、字体等）
    const resources = [];

    // 关键CSS
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      if (link.href.includes('main') || link.href.includes('critical')) {
        resources.push(link.href);
      }
    });

    return resources;
  }

  /**
     * 获取资源类型
     * 根据URL扩展名判断资源类型
     * @param {string} url - 资源URL
     * @returns {string} 资源类型（style、script、font、image或fetch）
     */
  getResourceType(url) {
    if (url.match(/\.(css)$/i)) { return 'style'; }
    if (url.match(/\.(js)$/i)) { return 'script'; }
    if (url.match(/\.(woff|woff2|ttf|otf)$/i)) { return 'font'; }
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) { return 'image'; }
    return 'fetch';
  }

  /**
     * 添加警报
     * 向警报列表中添加新的性能警报
     * @param {string} level - 警报级别（critical、warning、info等）
     * @param {string} title - 警报标题
     * @param {string} message - 警报消息
     */
  addAlert(level, title, message) {
    this.alerts.push({
      level,
      title,
      message,
      timestamp: Date.now()
    });
  }

  /**
     * 添加优化建议
     * 向建议列表中添加新的性能优化建议
     * @param {string} priority - 建议优先级（high、medium、low、critical）
     * @param {string} title - 建议标题
     * @param {Array<string>} actions - 具体的优化操作列表
     */
  addSuggestion(priority, title, actions) {
    this.suggestions.push({
      priority,
      title,
      actions,
      timestamp: Date.now()
    });
  }

  /**
     * 添加自动优化记录
     * 记录已执行的自动优化操作
     * @param {string} description - 优化操作描述
     */
  addAutoOptimization(description) {
    this.autoOptimizations.push({
      description,
      timestamp: Date.now()
    });
  }

  /**
     * 清除之前的警报
     * 清除超过5分钟的旧警报和建议，保持数据的时效性
     */
  clearPreviousAlerts() {
    // 清除超过5分钟的警报
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    this.alerts = this.alerts.filter(alert => alert.timestamp > fiveMinutesAgo);
    this.suggestions = this.suggestions.filter(suggestion => suggestion.timestamp > fiveMinutesAgo);
  }

  /**
     * 发送警报
     * 将收集到的性能警报发送到控制台并触发自定义事件
     */
  sendAlerts() {
    // 发送警报到控制台或外部系统
    this.alerts.forEach(alert => {
      if (window.errorUtils) {
        window.errorUtils.handleError(new Error(`[性能警报] ${alert.title}: ${alert.message}`), {
          context: 'PerformanceOptimizer.generateReport',
          severity: 'warning',
          category: 'performance',
          userMessage: `性能警报: ${alert.title}`,
          metadata: { alert }
        });
      } else {
        console.warn(`[性能警报] ${alert.title}: ${alert.message}`);
      }
    });

    // 触发自定义事件
    if (this.alerts.length > 0) {
      window.dispatchEvent(new CustomEvent('performanceAlert', {
        detail: { alerts: this.alerts }
      }));
    }

    if (this.suggestions.length > 0) {
      window.dispatchEvent(new CustomEvent('performanceSuggestion', {
        detail: { suggestions: this.suggestions }
      }));
    }
  }

  // 公共API
  /**
     * 获取当前警报列表
     * @returns {Array<Object>} 警报对象数组
     */
  getAlerts() {
    return this.alerts;
  }

  /**
     * 获取当前优化建议列表
     * @returns {Array<Object>} 建议对象数组
     */
  getSuggestions() {
    return this.suggestions;
  }

  /**
     * 获取自动优化记录列表
     * @returns {Array<Object>} 自动优化记录数组
     */
  getAutoOptimizations() {
    return this.autoOptimizations;
  }

  /**
     * 获取性能评分
     * 基于Core Web Vitals和错误数量计算综合性能评分
     * @returns {number} 性能评分（0-100分）
     */
  getPerformanceScore() {
    const data = this.collectPerformanceData();
    if (!data) { return 0; }

    let score = 100;

    // 基于Core Web Vitals计算分数
    const { lcp, fid, cls } = data.webVitals || {};

    if (lcp > this.thresholds.lcp.poor) { score -= 30; }
    else if (lcp > this.thresholds.lcp.good) { score -= 15; }

    if (fid > this.thresholds.fid.poor) { score -= this.PERFORMANCE_CONSTANTS.PERFORMANCE_SCORE_THRESHOLD; }
    else if (fid > this.thresholds.fid.good) { score -= 10; }

    if (cls > this.thresholds.cls.poor) { score -= this.PERFORMANCE_CONSTANTS.PERFORMANCE_SCORE_THRESHOLD; }
    else if (cls > this.thresholds.cls.good) { score -= 10; }

    // 基于错误数量扣分
    const errorCount = (data.errorMetrics?.jsErrors?.length || 0) +
      (data.errorMetrics?.resourceErrors?.length || 0);
    score -= Math.min(errorCount * 2, 20);

    return Math.max(score, 0);
  }

  /**
     * 生成性能报告
     * 生成包含评分、警报、建议和摘要的完整性能报告
     * @returns {Object} 性能报告对象
     * @returns {number} returns.timestamp - 报告生成时间戳
     * @returns {number} returns.score - 性能评分
     * @returns {Array} returns.alerts - 警报列表
     * @returns {Array} returns.suggestions - 建议列表
     * @returns {Array} returns.autoOptimizations - 自动优化记录
     * @returns {Object} returns.summary - 报告摘要
     */
  generateReport() {
    return {
      timestamp: Date.now(),
      score: this.getPerformanceScore(),
      alerts: this.alerts,
      suggestions: this.suggestions,
      autoOptimizations: this.autoOptimizations,
      summary: this.generateSummary()
    };
  }

  /**
     * 生成报告摘要
     * 统计各类问题和优化机会的数量
     * @returns {Object} 报告摘要对象
     * @returns {number} returns.criticalIssues - 严重问题数量
     * @returns {number} returns.warnings - 警告数量
     * @returns {number} returns.optimizationOpportunities - 高优先级优化机会数量
     * @returns {number} returns.autoOptimizationsApplied - 已应用的自动优化数量
     */
  generateSummary() {
    const criticalAlerts = this.alerts.filter(alert => alert.level === 'critical').length;
    const warningAlerts = this.alerts.filter(alert => alert.level === 'warning').length;
    const highPrioritySuggestions = this.suggestions.filter(s => s.priority === 'high').length;

    return {
      criticalIssues: criticalAlerts,
      warnings: warningAlerts,
      optimizationOpportunities: highPrioritySuggestions,
      autoOptimizationsApplied: this.autoOptimizations.length
    };
  }
}

// 初始化性能优化器
if (typeof window !== 'undefined') {
  window.performanceOptimizer = new PerformanceOptimizer();

  // 监听性能警报事件
  window.addEventListener('performanceAlert', (event) => {
    console.group('🚨 性能警报');
    event.detail.alerts.forEach(alert => {
      if (window.errorUtils) {
        window.errorUtils.handleError(new Error(`${alert.title}: ${alert.message}`), {
          context: 'PerformanceOptimizer.eventListener',
          severity: 'warning',
          category: 'performance',
          userMessage: alert.title,
          metadata: { alert }
        });
      } else {
        console.warn(`${alert.title}: ${alert.message}`);
      }
    });
    console.groupEnd();
  });

  // 监听优化建议事件
  window.addEventListener('performanceSuggestion', (event) => {
    console.group('💡 优化建议');
    event.detail.suggestions.forEach(suggestion => {
      console.info(`${suggestion.title}:`);
      suggestion.actions.forEach(action => {
        console.info(`  • ${action}`);
      });
    });
    console.groupEnd();
  });
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceOptimizer;
}
