/* global Utils */
/**
 * 性能监控和错误追踪模块
 * 提供页面性能监控、错误收集、用户行为分析等功能
 */

// 性能监控常量定义
const PERFORMANCE_CONSTANTS = {
  // 默认配置
  DEFAULT_SAMPLE_RATE: 1.0,
  DEFAULT_MAX_ERRORS: 50,
  DEFAULT_MAX_PERFORMANCE_ENTRIES: 100,
  DEFAULT_REPORT_INTERVAL: 30000, // 30秒

  // 性能阈值
  THRESHOLDS: {
    LOAD_TIME_GOOD: 1000,    // 1秒
    LOAD_TIME_FAIR: 2000,    // 2秒
    LOAD_TIME_POOR: 3000,    // 3秒
    LCP_GOOD: 2500,          // 2.5秒
    FID_GOOD: 100,           // 100毫秒
    CLS_GOOD: 0.1,           // 0.1
    ERROR_SCORE_MULTIPLIER: 5,
    MAX_ERROR_PENALTY: 30,
    SLOW_RESOURCE_SCORE_MULTIPLIER: 3,
    MAX_SLOW_RESOURCE_PENALTY: 20,
    LCP_PENALTY: 15,
    FID_PENALTY: 10,
    CLS_PENALTY: 10
  },

  // 用户行为追踪
  BEHAVIOR: {
    SCROLL_THROTTLE: 100,     // 滚动节流时间
    MOUSEMOVE_THROTTLE: 500,  // 鼠标移动节流时间
    STATS_UPDATE_INTERVAL: 10000, // 统计更新间隔
    TEXT_TRUNCATE_LENGTH: 50  // 文本截断长度
  },

  // 资源监控
  RESOURCE: {
    SLOW_RESOURCE_THRESHOLD: 1000, // 慢资源阈值
    MAX_URL_LENGTH: 200            // URL最大长度
  }
};
class PerformanceMonitor {
  /**
     * 创建性能监控器实例
     * @param {Object} options - 配置选项
     * @param {boolean} options.enablePerformanceMonitoring - 是否启用性能监控
     * @param {boolean} options.enableErrorTracking - 是否启用错误追踪
     * @param {boolean} options.enableUserBehaviorTracking - 是否启用用户行为追踪
     * @param {boolean} options.enableResourceMonitoring - 是否启用资源监控
     * @param {number} options.sampleRate - 采样率
     * @param {number} options.maxErrors - 最大错误数量
     * @param {number} options.maxPerformanceEntries - 最大性能条目数量
     * @param {number} options.reportInterval - 报告间隔（毫秒）
     */
  constructor(options = {}) {
    // 使用统一配置模块
    const defaultConfig = window.config?.getModule('performance') || window.CONSTANTS?.PERFORMANCE || {
      enablePerformanceMonitoring: true,
      enableErrorTracking: true,
      enableUserBehaviorTracking: true,
      enableResourceMonitoring: true,
      sampleRate: PERFORMANCE_CONSTANTS.DEFAULT_SAMPLE_RATE,
      maxErrors: PERFORMANCE_CONSTANTS.DEFAULT_MAX_ERRORS,
      maxPerformanceEntries: PERFORMANCE_CONSTANTS.DEFAULT_MAX_PERFORMANCE_ENTRIES,
      reportInterval: PERFORMANCE_CONSTANTS.DEFAULT_REPORT_INTERVAL
    };

    this.options = {
      ...defaultConfig,
      ...options
    };

    this.performanceData = {
      pageLoad: {},
      navigation: {},
      resources: [],
      userTiming: [],
      vitals: {}
    };

    this.errors = [];
    this.userBehavior = [];
    this.behaviorStats = {
      clicks: 0,
      scrolls: 0,
      keystrokes: 0,
      mouseMovements: 0,
      pageViews: 0,
      timeOnPage: 0,
      bounceRate: 0,
      engagementScore: 0
    };
    this.sessionStartTime = Date.now();
    this.lastActivityTime = Date.now();
    this.isInitialized = false;
    this.isDestroyed = false;
    this.reportTimer = null;
    this.slowResources = [];

    this.init();
  }

  /**
     * 初始化性能监控
     */
  init() {
    if (this.isInitialized) {return;}

    try {
      if (this.options.enablePerformanceMonitoring) {
        this.initPerformanceMonitoring();
      }

      if (this.options.enableErrorTracking) {
        this.initErrorTracking();
      }

      if (this.options.enableUserBehaviorTracking) {
        this.initUserBehaviorTracking();
      }

      if (this.options.enableResourceMonitoring) {
        this.initResourceMonitoring();
      }

      this.initWebVitals();
      this.startPeriodicReporting();

      this.isInitialized = true;
      console.log('PerformanceMonitor initialized successfully');
    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError(error, {
          context: 'PerformanceMonitor initialization',
          severity: 'high',
          category: 'performance',
          userMessage: '性能监控初始化失败'
        });
      } else {
        console.error('Failed to initialize PerformanceMonitor:', error);
      }
    }
  }

  /**
     * 初始化性能监控
     */
  initPerformanceMonitoring() {
    // 监控页面加载性能
    if (window.performance && window.performance.timing) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          this.collectPageLoadMetrics();
        }, 0);
      });
    }

    // 监控导航性能
    if (window.performance && window.performance.getEntriesByType) {
      this.collectNavigationMetrics();
    }

    // 使用 Performance Observer 监控性能条目
    if (window.PerformanceObserver) {
      this.initPerformanceObserver();
    }
  }

  /**
     * 收集页面加载指标
     * 包括页面加载时间、DOM解析时间、资源加载时间等关键性能指标
     * @private
     */
  collectPageLoadMetrics() {
    try {
      // 验证性能API可用性
      if (!window.performance || !window.performance.timing) {
        console.warn('Performance timing API not available');
        return;
      }

      const timing = window.performance.timing;
      const navigation = window.performance.navigation;

      // 验证timing对象的有效性
      if (!timing.navigationStart || timing.navigationStart <= 0) {
        console.warn('Invalid navigation start time');
        return;
      }

      // 安全地计算时间差，确保不为负值
      const safeDiff = (end, start) => {
        if (!end || !start || end < start) {return 0;}
        return Math.max(0, end - start);
      };

      this.performanceData.pageLoad = {
        // DNS 查询时间
        dnsLookup: safeDiff(timing.domainLookupEnd, timing.domainLookupStart),
        // TCP 连接时间
        tcpConnect: safeDiff(timing.connectEnd, timing.connectStart),
        // SSL 握手时间
        sslHandshake: timing.secureConnectionStart > 0 ?
          safeDiff(timing.connectEnd, timing.secureConnectionStart) : 0,
        // 请求响应时间
        requestResponse: safeDiff(timing.responseEnd, timing.requestStart),
        // DOM 解析时间
        domParsing: safeDiff(timing.domContentLoadedEventStart, timing.responseEnd),
        // 资源加载时间
        resourceLoading: safeDiff(timing.loadEventStart, timing.domContentLoadedEventEnd),
        // 总加载时间
        totalLoadTime: safeDiff(timing.loadEventEnd, timing.navigationStart),
        // 首次内容绘制时间
        firstContentfulPaint: this.getFirstContentfulPaint(),
        // 最大内容绘制时间
        largestContentfulPaint: this.getLargestContentfulPaint(),
        // 导航类型
        navigationType: navigation ? navigation.type : 0,
        // 重定向次数
        redirectCount: navigation ? navigation.redirectCount : 0,
        // 时间戳
        timestamp: Date.now()
      };

      // 验证收集到的数据的合理性
      this.validatePageLoadMetrics(this.performanceData.pageLoad);

      this.logPerformanceData('Page Load Metrics', this.performanceData.pageLoad);
    } catch (error) {
      console.error('Error collecting page load metrics:', error);
      this.logError({
        type: 'performance',
        message: 'Failed to collect page load metrics',
        stack: error.stack,
        timestamp: Date.now()
      });
    }
  }

  /**
     * 收集导航指标
     */
  collectNavigationMetrics() {
    const entries = window.performance.getEntriesByType('navigation');
    if (entries.length > 0) {
      const nav = entries[0];
      this.performanceData.navigation = {
        dnsLookup: nav.domainLookupEnd - nav.domainLookupStart,
        tcpConnect: nav.connectEnd - nav.connectStart,
        requestResponse: nav.responseEnd - nav.requestStart,
        domProcessing: nav.domContentLoadedEventEnd - nav.responseEnd,
        loadComplete: nav.loadEventEnd - nav.loadEventStart,
        transferSize: nav.transferSize,
        encodedBodySize: nav.encodedBodySize,
        decodedBodySize: nav.decodedBodySize,
        timestamp: Date.now()
      };
    }
  }

  /**
     * 初始化 Performance Observer
     */
  initPerformanceObserver() {
    // 监控资源加载
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.collectResourceMetrics(entry);
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError(error, {
          context: 'Resource observer initialization',
          severity: 'medium',
          category: 'performance',
          userMessage: '资源监控不支持'
        });
      } else {
        console.warn('Resource observer not supported:', error);
      }
    }

    // 监控用户自定义时间
    try {
      const measureObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            this.performanceData.userTiming.push({
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime,
              timestamp: Date.now()
            });
          }
        }
      });
      measureObserver.observe({ entryTypes: ['measure'] });
    } catch (error) {
      if (window.errorUtils) {
        window.errorUtils.handleError(error, {
          context: 'Measure observer initialization',
          severity: 'medium',
          category: 'performance',
          userMessage: '性能测量监控不支持'
        });
      } else {
        console.warn('Measure observer not supported:', error);
      }
    }
  }

  /**
     * 收集资源加载指标
     */
  collectResourceMetrics(entry) {
    if (this.performanceData.resources.length >= this.options.maxPerformanceEntries) {
      this.performanceData.resources.shift(); // 移除最旧的条目
    }

    const resourceData = {
      name: entry.name,
      type: this.getResourceType(entry.name),
      duration: entry.duration,
      size: entry.transferSize,
      encodedSize: entry.encodedBodySize,
      decodedSize: entry.decodedBodySize,
      startTime: entry.startTime,
      responseEnd: entry.responseEnd,
      timestamp: Date.now()
    };

    this.performanceData.resources.push(resourceData);

    // 检查慢资源 - 使用配置的阈值
    const slowThreshold = window.config?.get('performance.thresholds.slowResource') ||
            window.CONSTANTS?.PERFORMANCE?.THRESHOLDS?.SLOW_RESOURCE || 1000;
    if (entry.duration > slowThreshold) {
      this.logSlowResource(resourceData);
    }
  }

  /**
     * 获取资源类型
     */
  getResourceType(url) {
    const extension = url.split('.').pop().toLowerCase();
    const typeMap = {
      'js': 'script',
      'css': 'stylesheet',
      'jpg': 'image',
      'jpeg': 'image',
      'png': 'image',
      'gif': 'image',
      'svg': 'image',
      'webp': 'image',
      'woff': 'font',
      'woff2': 'font',
      'ttf': 'font',
      'eot': 'font'
    };
    return typeMap[extension] || 'other';
  }

  /**
     * 初始化错误跟踪
     * 监听JavaScript错误、Promise拒绝和资源加载错误
     * @private
     */
  initErrorTracking() {
    // 错误频率限制映射 - 使用配置的限制
    this.errorFrequencyMap = new Map();
    this.maxErrorsPerMinute = window.config?.get('performance.errorLimits.maxErrorsPerMinute') ||
            window.CONSTANTS?.PERFORMANCE?.ERROR_LIMITS?.MAX_ERRORS_PER_MINUTE || 10;

    // 监控 JavaScript 错误
    window.addEventListener('error', (event) => {
      try {
        // 验证事件对象
        if (!event || typeof event !== 'object') {
          console.warn('Invalid error event received');
          return;
        }

        const errorInfo = {
          type: 'javascript',
          message: this.sanitizeErrorMessage(event.message || 'Unknown error'),
          filename: this.sanitizeUrl(event.filename || 'unknown'),
          lineno: Number.isInteger(event.lineno) ? event.lineno : 0,
          colno: Number.isInteger(event.colno) ? event.colno : 0,
          stack: event.error && event.error.stack ? this.sanitizeStack(event.error.stack) : null,
          timestamp: Date.now(),
          url: this.sanitizeUrl(window.location.href),
          userAgent: navigator.userAgent || 'unknown'
        };

        // 检查错误频率限制
        if (this.shouldLogError(errorInfo)) {
          this.logError(errorInfo);
        }
      } catch (handlerError) {
        console.error('Error in JavaScript error handler:', handlerError);
      }
    });

    // 监控 Promise 拒绝
    window.addEventListener('unhandledrejection', (event) => {
      try {
        // 验证事件对象
        if (!event || typeof event !== 'object') {
          console.warn('Invalid unhandledrejection event received');
          return;
        }

        const reason = event.reason;
        let message = 'Unhandled Promise Rejection';
        let stack = null;

        // 安全地提取错误信息
        if (reason) {
          if (typeof reason === 'string') {
            message = this.sanitizeErrorMessage(reason);
          } else if (reason instanceof Error) {
            message = this.sanitizeErrorMessage(reason.message || reason.toString());
            stack = reason.stack ? this.sanitizeStack(reason.stack) : null;
          } else if (typeof reason === 'object' && reason.toString) {
            message = this.sanitizeErrorMessage(reason.toString());
          }
        }

        const errorInfo = {
          type: 'promise',
          message: message,
          stack: stack,
          timestamp: Date.now(),
          url: this.sanitizeUrl(window.location.href),
          userAgent: navigator.userAgent || 'unknown'
        };

        // 检查错误频率限制
        if (this.shouldLogError(errorInfo)) {
          this.logError(errorInfo);
        }
      } catch (handlerError) {
        console.error('Error in Promise rejection handler:', handlerError);
      }
    });

    // 监控资源加载错误
    window.addEventListener('error', (event) => {
      try {
        // 只处理资源加载错误，不处理脚本错误
        if (event.target && event.target !== window) {
          const target = event.target;
          const source = target.src || target.href || 'unknown';

          const errorInfo = {
            type: 'resource',
            message: `Failed to load resource: ${this.sanitizeUrl(source)}`,
            element: target.tagName || 'unknown',
            source: this.sanitizeUrl(source),
            timestamp: Date.now(),
            url: this.sanitizeUrl(window.location.href)
          };

          // 检查错误频率限制
          if (this.shouldLogError(errorInfo)) {
            this.logError(errorInfo);
          }
        }
      } catch (handlerError) {
        if (window.errorUtils) {
          window.errorUtils.handleError(handlerError, {
            context: 'Resource error handler',
            severity: 'medium',
            category: 'performance',
            userMessage: '资源错误处理失败'
          });
        } else {
          console.error('Error in resource error handler:', handlerError);
        }
      }
    }, true);
  }

  /**
     * 记录错误
     */
  logError(errorData) {
    try {
      // 验证错误数据对象
      if (!errorData || typeof errorData !== 'object') {
        console.warn('Invalid error data provided to logError');
        return;
      }

      // 验证必需字段
      if (!errorData.type || !errorData.message) {
        console.warn('Error data missing required fields (type, message)');
        return;
      }

      // 为错误信息添加唯一ID
      errorData.id = Utils.generateErrorId();

      // 添加错误严重级别
      errorData.severity = this.getErrorSeverity(errorData);

      // 限制错误日志数量，避免内存溢出
      if (this.errors.length >= this.options.maxErrors) {
        this.errors.shift(); // 移除最旧的错误
      }

      this.errors.push(errorData);

      // 在开发环境下输出详细错误信息
      if (this.options.debug) {
        console.group(`🚨 Performance Monitor Error [${errorData.type}] - ${errorData.severity}`);
        console.error('Error Details:', errorData);
        console.groupEnd();
      } else {
        console.error('Error tracked:', errorData);
      }

      // 对于严重错误，考虑额外处理
      if (errorData.severity === 'critical') {
        this.handleCriticalError(errorData);
      }

      // 可以在这里发送错误到服务器
      this.reportError(errorData);

    } catch (logError) {
      // 防止错误记录本身出错导致无限循环
      console.error('Failed to log error:', logError);
    }
  }

  /**
     * 初始化用户行为跟踪
     * 监听用户的点击、滚动、键盘输入等交互行为
     * @private
     */
  initUserBehaviorTracking() {
    this.initClickTracking();
    this.initVisibilityTracking();
    this.initScrollTracking();
    this.initKeyboardTracking();
    this.initMouseTracking();
    this.initPageUnloadTracking();
    this.initPeriodicStatsUpdate();
  }

  /**
   * 初始化点击事件跟踪
   * @private
   */
  initClickTracking() {
    document.addEventListener('click', (event) => {
      this.behaviorStats.clicks++;
      this.lastActivityTime = Date.now();

      this.trackUserAction('click', {
        element: event.target.tagName,
        className: event.target.className,
        id: event.target.id,
        text: event.target.textContent ? event.target.textContent.substring(0, PERFORMANCE_CONSTANTS.BEHAVIOR.TEXT_TRUNCATE_LENGTH) : '',
        x: event.clientX,
        y: event.clientY,
        timestamp: Date.now()
      });
    });
  }

  /**
   * 初始化页面可见性跟踪
   * @private
   */
  initVisibilityTracking() {
    document.addEventListener('visibilitychange', () => {
      const isHidden = document.hidden;

      this.trackUserAction('visibility', {
        hidden: isHidden,
        timestamp: Date.now()
      });

      if (isHidden) {
        this.updateTimeOnPage();
      }
    });
  }

  /**
   * 初始化滚动事件跟踪
   * @private
   */
  initScrollTracking() {
    let scrollTimeout;
    let lastScrollY = 0;

    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.behaviorStats.scrolls++;
        this.lastActivityTime = Date.now();

        const scrollDirection = window.scrollY > lastScrollY ? 'down' : 'up';
        const scrollDepth = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);

        this.trackUserAction('scroll', {
          scrollY: window.scrollY,
          scrollX: window.scrollX,
          direction: scrollDirection,
          depth: scrollDepth,
          timestamp: Date.now()
        });

        lastScrollY = window.scrollY;
      }, PERFORMANCE_CONSTANTS.BEHAVIOR.SCROLL_THROTTLE);
    });
  }

  /**
   * 初始化键盘事件跟踪
   * @private
   */
  initKeyboardTracking() {
    document.addEventListener('keydown', (event) => {
      this.behaviorStats.keystrokes++;
      this.lastActivityTime = Date.now();

      this.trackUserAction('keydown', {
        key: event.key,
        code: event.code,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        timestamp: Date.now()
      });
    });
  }

  /**
   * 初始化鼠标移动事件跟踪
   * @private
   */
  initMouseTracking() {
    let mouseMoveTimeout;

    document.addEventListener('mousemove', (event) => {
      clearTimeout(mouseMoveTimeout);
      mouseMoveTimeout = setTimeout(() => {
        this.behaviorStats.mouseMovements++;
        this.lastActivityTime = Date.now();

        this.trackUserAction('mousemove', {
          x: event.clientX,
          y: event.clientY,
          timestamp: Date.now()
        });
      }, PERFORMANCE_CONSTANTS.BEHAVIOR.MOUSEMOVE_THROTTLE);
    });
  }

  /**
   * 初始化页面卸载事件跟踪
   * @private
   */
  initPageUnloadTracking() {
    window.addEventListener('beforeunload', () => {
      this.updateTimeOnPage();
      this.calculateEngagementMetrics();
    });
  }

  /**
   * 初始化定期统计数据更新
   * @private
   */
  initPeriodicStatsUpdate() {
    setInterval(() => {
      this.updateBehaviorStats();
    }, PERFORMANCE_CONSTANTS.BEHAVIOR.STATS_UPDATE_INTERVAL);
  }

  /**
     * 追踪用户行为
     */
  trackUserAction(action, data) {
    if (Math.random() > this.options.sampleRate) {
      return; // 采样控制
    }

    this.userBehavior.push({
      action,
      ...data,
      sessionId: this.getSessionId(),
      url: window.location.href
    });

    // 限制数据量
    if (this.userBehavior.length > 1000) {
      this.userBehavior = this.userBehavior.slice(-500);
    }
  }

  /**
     * 更新页面停留时间
     */
  updateTimeOnPage() {
    this.behaviorStats.timeOnPage = Date.now() - this.sessionStartTime;
  }

  /**
     * 更新行为统计
     */
  updateBehaviorStats() {
    this.updateTimeOnPage();
    this.calculateEngagementMetrics();

    // 检查用户是否活跃
    const inactiveTime = Date.now() - this.lastActivityTime;
    if (inactiveTime > 30000) { // 30秒无活动视为不活跃
      this.trackUserAction('inactive', {
        inactiveTime,
        timestamp: Date.now()
      });
    }
  }

  /**
     * 计算参与度指标
     */
  calculateEngagementMetrics() {
    const timeOnPageMinutes = this.behaviorStats.timeOnPage / 60000;
    const totalActions = this.behaviorStats.clicks + this.behaviorStats.scrolls + this.behaviorStats.keystrokes;

    // 计算参与度评分 (0-100)
    let engagementScore = 0;

    // 时间因子 (最多30分)
    engagementScore += Math.min(timeOnPageMinutes * 2, 30);

    // 交互因子 (最多40分)
    engagementScore += Math.min(totalActions * 0.5, 40);

    // 滚动深度因子 (最多20分)
    const maxScrollDepth = this.getMaxScrollDepth();
    engagementScore += Math.min(maxScrollDepth * 0.2, 20);

    // 页面浏览因子 (最多10分)
    engagementScore += Math.min(this.behaviorStats.pageViews * 2, 10);

    this.behaviorStats.engagementScore = Math.round(engagementScore);

    // 计算跳出率 (如果停留时间少于10秒且交互少于3次，视为跳出)
    if (timeOnPageMinutes < 0.17 && totalActions < 3) {
      this.behaviorStats.bounceRate = 100;
    } else {
      this.behaviorStats.bounceRate = 0;
    }
  }

  /**
     * 获取最大滚动深度
     */
  getMaxScrollDepth() {
    const scrollActions = this.userBehavior.filter(action => action.action === 'scroll');
    if (scrollActions.length === 0) {return 0;}

    return Math.max(...scrollActions.map(action => action.depth || 0));
  }

  /**
     * 获取用户行为分析报告
     */
  getUserBehaviorAnalysis() {
    this.updateBehaviorStats();

    const timeOnPageMinutes = Math.round(this.behaviorStats.timeOnPage / 60000 * 100) / 100;
    const totalActions = this.behaviorStats.clicks + this.behaviorStats.scrolls + this.behaviorStats.keystrokes;

    return {
      summary: {
        timeOnPage: timeOnPageMinutes,
        totalActions,
        engagementScore: this.behaviorStats.engagementScore,
        bounceRate: this.behaviorStats.bounceRate,
        maxScrollDepth: this.getMaxScrollDepth()
      },
      detailed: {
        clicks: this.behaviorStats.clicks,
        scrolls: this.behaviorStats.scrolls,
        keystrokes: this.behaviorStats.keystrokes,
        mouseMovements: this.behaviorStats.mouseMovements,
        pageViews: this.behaviorStats.pageViews
      },
      patterns: this.analyzeUserPatterns(),
      heatmap: this.generateClickHeatmap(),
      timeline: this.generateActionTimeline()
    };
  }

  /**
     * 分析用户行为模式
     */
  analyzeUserPatterns() {
    const patterns = {
      mostActiveHour: null,
      averageSessionLength: 0,
      preferredInteractionType: null,
      scrollingBehavior: null,
      clickPatterns: []
    };

    // 分析最活跃时间
    const hourlyActivity = {};
    this.userBehavior.forEach(action => {
      const hour = new Date(action.timestamp).getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });

    if (Object.keys(hourlyActivity).length > 0) {
      patterns.mostActiveHour = Object.keys(hourlyActivity).reduce((a, b) =>
        hourlyActivity[a] > hourlyActivity[b] ? a : b
      );
    }

    // 分析交互类型偏好
    const actionCounts = {
      click: this.behaviorStats.clicks,
      scroll: this.behaviorStats.scrolls,
      keyboard: this.behaviorStats.keystrokes
    };

    patterns.preferredInteractionType = Object.keys(actionCounts).reduce((a, b) =>
      actionCounts[a] > actionCounts[b] ? a : b
    );

    // 分析滚动行为
    const scrollActions = this.userBehavior.filter(action => action.action === 'scroll');
    if (scrollActions.length > 0) {
      const avgScrollSpeed = scrollActions.reduce((sum, action, index) => {
        if (index === 0) {return 0;}
        const timeDiff = action.timestamp - scrollActions[index - 1].timestamp;
        const scrollDiff = Math.abs(action.scrollY - scrollActions[index - 1].scrollY);
        return sum + (scrollDiff / timeDiff);
      }, 0) / (scrollActions.length - 1);

      patterns.scrollingBehavior = {
        speed: avgScrollSpeed,
        frequency: scrollActions.length,
        maxDepth: this.getMaxScrollDepth()
      };
    }

    // 分析点击模式
    const clickActions = this.userBehavior.filter(action => action.action === 'click');
    const clickTargets = {};
    clickActions.forEach(action => {
      const target = action.element;
      clickTargets[target] = (clickTargets[target] || 0) + 1;
    });

    patterns.clickPatterns = Object.entries(clickTargets)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([target, count]) => ({ target, count }));

    return patterns;
  }

  /**
     * 生成点击热力图数据
     */
  generateClickHeatmap() {
    const clickActions = this.userBehavior.filter(action => action.action === 'click');
    const heatmapData = [];

    clickActions.forEach(action => {
      heatmapData.push({
        x: action.x,
        y: action.y,
        intensity: 1
      });
    });

    // 合并相近的点击位置
    const mergedData = [];
    const threshold = 50; // 50像素内的点击合并

    heatmapData.forEach(point => {
      const existing = mergedData.find(p =>
        Math.abs(p.x - point.x) < threshold && Math.abs(p.y - point.y) < threshold
      );

      if (existing) {
        existing.intensity++;
      } else {
        mergedData.push({ ...point });
      }
    });

    return mergedData;
  }

  /**
     * 生成行为时间线
     */
  generateActionTimeline() {
    const timeline = [];
    const timeSlots = {};
    const slotDuration = 60000; // 1分钟为一个时间段

    this.userBehavior.forEach(action => {
      const slot = Math.floor((action.timestamp - this.sessionStartTime) / slotDuration);
      if (!timeSlots[slot]) {
        timeSlots[slot] = {
          startTime: this.sessionStartTime + slot * slotDuration,
          actions: []
        };
      }
      timeSlots[slot].actions.push(action.action);
    });

    Object.values(timeSlots).forEach(slot => {
      const actionCounts = {};
      slot.actions.forEach(action => {
        actionCounts[action] = (actionCounts[action] || 0) + 1;
      });

      timeline.push({
        time: slot.startTime,
        totalActions: slot.actions.length,
        actionBreakdown: actionCounts
      });
    });

    return timeline.sort((a, b) => a.time - b.time);
  }

  /**
     * 初始化资源监控
     */
  initResourceMonitoring() {
    // 监控内存使用
    if (window.performance && window.performance.memory) {
      setInterval(() => {
        this.collectMemoryMetrics();
      }, 10000); // 每10秒收集一次内存数据
    }
  }

  /**
     * 收集内存指标
     */
  collectMemoryMetrics() {
    if (window.performance && window.performance.memory) {
      const memory = window.performance.memory;
      this.performanceData.memory = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        timestamp: Date.now()
      };
    }
  }

  /**
     * 初始化 Web Vitals 监控
     */
  initWebVitals() {
    // 监控 Largest Contentful Paint (LCP)
    this.observeLCP();

    // 监控 First Input Delay (FID)
    this.observeFID();

    // 监控 Cumulative Layout Shift (CLS)
    this.observeCLS();
  }

  /**
     * 监控 Largest Contentful Paint
     */
  observeLCP() {
    if (window.PerformanceObserver) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.performanceData.vitals.lcp = {
            value: lastEntry.startTime,
            timestamp: Date.now()
          };
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('LCP observer not supported:', error);
      }
    }
  }

  /**
     * 监控 First Input Delay
     */
  observeFID() {
    if (window.PerformanceObserver) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.performanceData.vitals.fid = {
              value: entry.processingStart - entry.startTime,
              timestamp: Date.now()
            };
          }
        });
        observer.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.warn('FID observer not supported:', error);
      }
    }
  }

  /**
     * 监控 Cumulative Layout Shift
     */
  observeCLS() {
    if (window.PerformanceObserver) {
      try {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          this.performanceData.vitals.cls = {
            value: clsValue,
            timestamp: Date.now()
          };
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS observer not supported:', error);
      }
    }
  }

  /**
     * 获取 First Contentful Paint
     */
  getFirstContentfulPaint() {
    if (window.performance && window.performance.getEntriesByType) {
      const entries = window.performance.getEntriesByType('paint');
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      return fcpEntry ? fcpEntry.startTime : null;
    }
    return null;
  }

  /**
     * 获取 Largest Contentful Paint
     */
  getLargestContentfulPaint() {
    if (window.performance && window.performance.getEntriesByType) {
      const entries = window.performance.getEntriesByType('largest-contentful-paint');
      return entries.length > 0 ? entries[entries.length - 1].startTime : null;
    }
    return null;
  }

  /**
     * 开始定期报告
     */
  startPeriodicReporting() {
    this.reportTimer = setInterval(() => {
      this.generateReport();
    }, this.options.reportInterval);
  }

  /**
     * 生成性能报告
     */
  generateReport() {
    const report = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      performance: this.performanceData,
      errors: this.errors.slice(-10), // 最近10个错误
      userBehavior: this.userBehavior.slice(-50), // 最近50个用户行为
      summary: this.generateSummary()
    };

    console.log('Performance Report:', report);
    return report;
  }

  /**
     * 生成性能摘要
     */
  generateSummary() {
    const summary = {
      pageLoadTime: this.performanceData.pageLoad.totalLoadTime || 0,
      errorCount: this.errors.length,
      slowResourceCount: this.performanceData.resources.filter(r => r.duration > PERFORMANCE_CONSTANTS.RESOURCE.SLOW_RESOURCE_THRESHOLD).length,
      memoryUsage: this.performanceData.memory ? this.performanceData.memory.usedJSHeapSize : 0,
      vitals: this.performanceData.vitals
    };

    // 性能评分
    summary.score = this.calculatePerformanceScore(summary);

    return summary;
  }

  /**
     * 计算性能评分
     */
  calculatePerformanceScore(summary) {
    let score = 100;

    // 使用性能阈值常量
    const thresholds = PERFORMANCE_CONSTANTS.THRESHOLDS;

    // 页面加载时间评分
    if (summary.pageLoadTime > thresholds.LOAD_TIME_POOR) {score -= 20;}
    else if (summary.pageLoadTime > thresholds.LOAD_TIME_FAIR) {score -= 10;}
    else if (summary.pageLoadTime > thresholds.LOAD_TIME_GOOD) {score -= 5;}

    // 错误数量评分
    score -= Math.min(summary.errorCount * thresholds.ERROR_SCORE_MULTIPLIER, thresholds.MAX_ERROR_PENALTY);

    // 慢资源评分
    score -= Math.min(summary.slowResourceCount * thresholds.SLOW_RESOURCE_SCORE_MULTIPLIER, thresholds.MAX_SLOW_RESOURCE_PENALTY);

    // Web Vitals 评分
    if (summary.vitals.lcp && summary.vitals.lcp.value > thresholds.LCP_GOOD) {score -= thresholds.LCP_PENALTY;}
    if (summary.vitals.fid && summary.vitals.fid.value > thresholds.FID_GOOD) {score -= thresholds.FID_PENALTY;}
    if (summary.vitals.cls && summary.vitals.cls.value > thresholds.CLS_GOOD) {score -= thresholds.CLS_PENALTY;}

    return Math.max(score, 0);
  }

  /**
     * 记录慢资源
     * 包含完整的参数验证和错误处理
     * @param {Object} resourceData - 资源数据对象
     */
  logSlowResource(resourceData) {
    try {
      // 参数验证
      if (!resourceData || typeof resourceData !== 'object') {
        console.warn('Invalid resource data provided to logSlowResource');
        return;
      }

      if (!resourceData.name || typeof resourceData.name !== 'string') {
        console.warn('Invalid resource name provided to logSlowResource');
        return;
      }

      if (typeof resourceData.duration !== 'number' || resourceData.duration < 0 || !isFinite(resourceData.duration)) {
        console.warn(`Invalid duration provided: ${resourceData.duration}`);
        return;
      }

      // 检查实例状态
      if (this.isDestroyed) {
        console.warn('Cannot log slow resource: PerformanceMonitor is destroyed');
        return;
      }

      // 初始化慢资源数组（防御性编程）
      if (!Array.isArray(this.slowResources)) {
        this.slowResources = [];
      }

      // 检查重复记录（防止同一资源短时间内重复记录）
      const recentDuplicate = this.slowResources.find(resource =>
        resource.name === resourceData.name &&
                resource.type === resourceData.type &&
                (Date.now() - resource.timestamp) < 1000 // 1秒内的重复记录
      );

      if (recentDuplicate) {
        console.debug(`Duplicate slow resource record ignored: ${resourceData.name}`);
        return;
      }

      // 创建资源记录
      const resourceRecord = {
        name: resourceData.name.substring(0, 200), // 限制名称长度
        duration: Math.round(resourceData.duration * 100) / 100, // 保留两位小数
        type: resourceData.type ? resourceData.type.substring(0, 50) : 'unknown', // 限制类型长度
        size: resourceData.size || 0,
        timestamp: Date.now(),
        url: window.location.href.substring(0, 100) // 记录页面URL（限制长度）
      };

      this.slowResources.push(resourceRecord);

      // 限制数组大小，防止内存泄漏
      const maxSlowResources = 100;
      if (this.slowResources.length > maxSlowResources) {
        // 移除最旧的记录
        this.slowResources.shift();
      }

      // 记录严重的性能问题
      if (resourceData.duration > 5000) { // 超过5秒
        console.warn(`Critical slow resource detected: ${resourceData.name} (${resourceData.duration}ms)`);

        // 可选：触发严重性能问题的回调
        if (typeof this.onCriticalSlowResource === 'function') {
          try {
            this.onCriticalSlowResource(resourceRecord);
          } catch (callbackError) {
            console.error('Error in critical slow resource callback:', callbackError);
          }
        }
      }

      console.warn('Slow resource detected:', resourceRecord);

    } catch (error) {
      console.error('Error in logSlowResource:', error);
      // 降级处理：至少记录基本信息
      try {
        console.warn(`Slow resource (fallback): ${resourceData?.name || 'unknown'} - ${resourceData?.duration || 0}ms`);
      } catch (fallbackError) {
        console.error('Critical error in logSlowResource fallback:', fallbackError);
      }
    }
  }

  /**
     * 报告错误
     */
  reportError(errorData) {
    // 这里可以发送错误到服务器
    // 示例：发送到错误收集服务
    fetch('/api/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(errorData)
    }).catch(err => {
      console.error('Failed to report error:', err);
    });
  }

  /**
     * 记录性能数据
     */
  logPerformanceData(label, data) {
    console.log(`[Performance] ${label}:`, data);
  }

  /**
     * 获取会话ID
     */
  getSessionId() {
    let sessionId = sessionStorage.getItem('performanceSessionId');
    if (!sessionId) {
      sessionId = Utils.generateSessionId();
      sessionStorage.setItem('performanceSessionId', sessionId);
    }
    return sessionId;
  }

  /**
     * 获取性能数据
     * 包含数据验证和安全处理
     * @returns {Object} 性能数据对象
     */
  getPerformanceData() {
    try {
      // 检查实例状态
      if (this.isDestroyed) {
        console.warn('Cannot get performance data: PerformanceMonitor is destroyed');
        return null;
      }

      // 安全地获取各项数据，提供默认值
      const safePerformanceData = this.performanceData || {};
      const safeErrors = Array.isArray(this.errors) ? this.errors : [];
      const safeUserBehavior = Array.isArray(this.userBehavior) ? this.userBehavior : [];
      const safeSlowResources = Array.isArray(this.slowResources) ? this.slowResources : [];

      // 数据清理和验证
      const cleanedData = {
        pageLoad: this.sanitizePageLoadMetrics(safePerformanceData.pageLoad || {}),
        navigation: this.sanitizeNavigationMetrics(safePerformanceData.navigation || {}),
        resources: this.sanitizeResourceMetrics(safePerformanceData.resources || []),
        userTiming: this.sanitizeUserTiming(safePerformanceData.userTiming || []),
        vitals: this.sanitizeVitals(safePerformanceData.vitals || {}),
        memory: this.sanitizeMemoryMetrics(safePerformanceData.memory || {}),
        errors: this.sanitizeErrors(safeErrors),
        userBehavior: this.sanitizeUserBehaviorData(safeUserBehavior),
        slowResources: this.sanitizeSlowResourcesData(safeSlowResources),
        timestamp: Date.now(),
        sessionId: this.getSessionId(),
        userAgent: this.sanitizeUserAgent(),
        url: window.location.href.substring(0, 200)
      };

      // 验证数据完整性
      if (!this.validatePerformanceData(cleanedData)) {
        console.warn('Performance data validation failed');
        return null;
      }

      return cleanedData;

    } catch (error) {
      console.error('Error getting performance data:', error);

      // 降级处理：返回基本数据
      try {
        return {
          pageLoad: {},
          navigation: {},
          resources: [],
          userTiming: [],
          vitals: {},
          memory: {},
          errors: [],
          userBehavior: [],
          slowResources: [],
          timestamp: Date.now(),
          error: 'Data collection failed'
        };
      } catch (fallbackError) {
        console.error('Critical error in getPerformanceData fallback:', fallbackError);
        return null;
      }
    }
  }

  /**
     * 清理页面加载指标数据
     * @param {Object} metrics - 原始指标数据
     * @returns {Object} 清理后的指标数据
     */
  sanitizePageLoadMetrics(metrics) {
    try {
      const sanitized = {};

      // 定义允许的数值字段
      const numericFields = ['dnsLookup', 'tcpConnect', 'sslHandshake', 'requestResponse', 'domParsing', 'resourceLoading', 'totalLoadTime', 'firstContentfulPaint', 'largestContentfulPaint'];

      numericFields.forEach(field => {
        if (typeof metrics[field] === 'number' && isFinite(metrics[field]) && metrics[field] >= 0) {
          sanitized[field] = Math.round(metrics[field] * 100) / 100; // 保留两位小数
        }
      });

      // 处理其他字段
      if (typeof metrics.navigationType === 'number') {
        sanitized.navigationType = metrics.navigationType;
      }
      if (typeof metrics.redirectCount === 'number') {
        sanitized.redirectCount = metrics.redirectCount;
      }
      if (typeof metrics.timestamp === 'number') {
        sanitized.timestamp = metrics.timestamp;
      }

      return sanitized;
    } catch (error) {
      console.error('Error sanitizing page load metrics:', error);
      return {};
    }
  }

  /**
     * 清理导航指标数据
     * @param {Object} metrics - 原始导航指标数据
     * @returns {Object} 清理后的导航指标数据
     */
  sanitizeNavigationMetrics(metrics) {
    try {
      const sanitized = {};
      const numericFields = ['dnsLookup', 'tcpConnect', 'requestResponse', 'domProcessing', 'loadComplete', 'transferSize', 'encodedBodySize', 'decodedBodySize'];

      numericFields.forEach(field => {
        if (typeof metrics[field] === 'number' && isFinite(metrics[field]) && metrics[field] >= 0) {
          sanitized[field] = Math.round(metrics[field] * 100) / 100;
        }
      });

      if (typeof metrics.timestamp === 'number') {
        sanitized.timestamp = metrics.timestamp;
      }

      return sanitized;
    } catch (error) {
      console.error('Error sanitizing navigation metrics:', error);
      return {};
    }
  }

  /**
     * 清理资源指标数据
     * @param {Array} resources - 原始资源数据
     * @returns {Array} 清理后的资源数据
     */
  sanitizeResourceMetrics(resources) {
    try {
      if (!Array.isArray(resources)) {
        return [];
      }

      return resources
        .filter(resource => resource && typeof resource === 'object')
        .slice(-50) // 只保留最近50条记录
        .map(resource => ({
          name: typeof resource.name === 'string' ? resource.name.substring(0, 200) : 'unknown',
          type: typeof resource.type === 'string' ? resource.type.substring(0, 50) : 'unknown',
          duration: typeof resource.duration === 'number' && isFinite(resource.duration) ? resource.duration : 0,
          size: typeof resource.size === 'number' && isFinite(resource.size) ? resource.size : 0,
          timestamp: typeof resource.timestamp === 'number' ? resource.timestamp : Date.now()
        }));
    } catch (error) {
      console.error('Error sanitizing resource metrics:', error);
      return [];
    }
  }

  /**
     * 清理用户时间数据
     * @param {Array} userTiming - 原始用户时间数据
     * @returns {Array} 清理后的用户时间数据
     */
  sanitizeUserTiming(userTiming) {
    try {
      if (!Array.isArray(userTiming)) {
        return [];
      }

      return userTiming
        .filter(timing => timing && typeof timing === 'object')
        .slice(-30) // 只保留最近30条记录
        .map(timing => ({
          name: typeof timing.name === 'string' ? timing.name.substring(0, 100) : 'unknown',
          duration: typeof timing.duration === 'number' && isFinite(timing.duration) ? timing.duration : 0,
          startTime: typeof timing.startTime === 'number' && isFinite(timing.startTime) ? timing.startTime : 0,
          timestamp: typeof timing.timestamp === 'number' ? timing.timestamp : Date.now()
        }));
    } catch (error) {
      console.error('Error sanitizing user timing:', error);
      return [];
    }
  }

  /**
     * 清理Web Vitals数据
     * @param {Object} vitals - 原始Web Vitals数据
     * @returns {Object} 清理后的Web Vitals数据
     */
  sanitizeVitals(vitals) {
    try {
      const sanitized = {};

      ['lcp', 'fid', 'cls'].forEach(vital => {
        if (vitals[vital] && typeof vitals[vital] === 'object') {
          if (typeof vitals[vital].value === 'number' && isFinite(vitals[vital].value)) {
            sanitized[vital] = {
              value: vitals[vital].value,
              timestamp: typeof vitals[vital].timestamp === 'number' ? vitals[vital].timestamp : Date.now()
            };
          }
        }
      });

      return sanitized;
    } catch (error) {
      console.error('Error sanitizing vitals:', error);
      return {};
    }
  }

  /**
     * 清理内存指标数据
     * @param {Object} memory - 原始内存数据
     * @returns {Object} 清理后的内存数据
     */
  sanitizeMemoryMetrics(memory) {
    try {
      const sanitized = {};
      const memoryFields = ['usedJSHeapSize', 'totalJSHeapSize', 'jsHeapSizeLimit'];

      memoryFields.forEach(field => {
        if (typeof memory[field] === 'number' && isFinite(memory[field]) && memory[field] >= 0) {
          sanitized[field] = memory[field];
        }
      });

      if (typeof memory.timestamp === 'number') {
        sanitized.timestamp = memory.timestamp;
      }

      return sanitized;
    } catch (error) {
      console.error('Error sanitizing memory metrics:', error);
      return {};
    }
  }

  /**
     * 清理用户行为数据
     * @param {Array} behavior - 原始行为数据
     * @returns {Array} 清理后的行为数据
     */
  sanitizeUserBehaviorData(behavior) {
    try {
      if (!Array.isArray(behavior)) {
        return [];
      }

      return behavior
        .filter(item => item && typeof item === 'object')
        .slice(-50) // 只保留最近50条记录
        .map(item => ({
          action: typeof item.action === 'string' ? item.action.substring(0, 50) : 'unknown',
          timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now(),
          element: typeof item.element === 'string' ? item.element.substring(0, 50) : '',
          x: typeof item.x === 'number' ? item.x : 0,
          y: typeof item.y === 'number' ? item.y : 0
        }));
    } catch (error) {
      console.error('Error sanitizing user behavior:', error);
      return [];
    }
  }

  /**
     * 清理错误数据
     * @param {Array} errors - 原始错误数据
     * @returns {Array} 清理后的错误数据
     */
  sanitizeErrors(errors) {
    try {
      if (!Array.isArray(errors)) {
        return [];
      }

      return errors
        .filter(error => error && typeof error === 'object')
        .slice(-20) // 只保留最近20条错误记录
        .map(error => ({
          id: typeof error.id === 'string' ? error.id.substring(0, 50) : 'unknown',
          type: typeof error.type === 'string' ? error.type.substring(0, 50) : 'unknown',
          message: typeof error.message === 'string' ? error.message.substring(0, 200) : 'Unknown error',
          filename: typeof error.filename === 'string' ? error.filename.substring(0, 100) : '',
          lineno: typeof error.lineno === 'number' ? error.lineno : 0,
          colno: typeof error.colno === 'number' ? error.colno : 0,
          timestamp: typeof error.timestamp === 'number' ? error.timestamp : Date.now(),
          severity: typeof error.severity === 'string' ? error.severity.substring(0, 20) : 'unknown'
        }));
    } catch (error) {
      console.error('Error sanitizing errors:', error);
      return [];
    }
  }

  /**
     * 清理慢资源数据
     * @param {Array} resources - 原始资源数据
     * @returns {Array} 清理后的资源数据
     */
  sanitizeSlowResourcesData(resources) {
    try {
      if (!Array.isArray(resources)) {
        return [];
      }

      return resources
        .filter(resource => resource && typeof resource === 'object')
        .slice(-30) // 只保留最近30条慢资源记录
        .map(resource => ({
          name: typeof resource.name === 'string' ? resource.name.substring(0, 200) : 'unknown',
          duration: typeof resource.duration === 'number' && isFinite(resource.duration) ? resource.duration : 0,
          type: typeof resource.type === 'string' ? resource.type.substring(0, 50) : 'unknown',
          size: typeof resource.size === 'number' && isFinite(resource.size) ? resource.size : 0,
          timestamp: typeof resource.timestamp === 'number' ? resource.timestamp : Date.now()
        }));
    } catch (error) {
      console.error('Error sanitizing slow resources:', error);
      return [];
    }
  }

  /**
     * 清理用户代理字符串
     * @returns {string} 清理后的用户代理字符串
     */
  sanitizeUserAgent() {
    try {
      if (typeof navigator !== 'undefined' && navigator.userAgent) {
        return navigator.userAgent.substring(0, 200);
      }
      return 'Unknown';
    } catch (error) {
      console.error('Error sanitizing user agent:', error);
      return 'Unknown';
    }
  }

  /**
     * 验证性能数据的完整性
     * @param {Object} data - 性能数据
     * @returns {boolean} 验证结果
     */
  validatePerformanceData(data) {
    try {
      if (!data || typeof data !== 'object') {
        return false;
      }

      // 检查必需字段
      const requiredFields = ['pageLoad', 'navigation', 'resources', 'userTiming', 'vitals', 'errors', 'userBehavior', 'timestamp'];
      for (const field of requiredFields) {
        if (!(field in data)) {
          console.warn(`Missing required field in performance data: ${field}`);
          return false;
        }
      }

      // 检查数据类型
      if (typeof data.pageLoad !== 'object' ||
                typeof data.navigation !== 'object' ||
                !Array.isArray(data.resources) ||
                !Array.isArray(data.userTiming) ||
                typeof data.vitals !== 'object' ||
                !Array.isArray(data.errors) ||
                !Array.isArray(data.userBehavior) ||
                typeof data.timestamp !== 'number') {
        console.warn('Invalid data types in performance data');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating performance data:', error);
      return false;
    }
  }

  /**
     * 获取错误数据
     */
  getErrors() {
    return this.errors;
  }

  /**
     * 获取用户行为数据
     */
  getUserBehavior() {
    return this.userBehavior;
  }

  /**
     * 获取用户行为统计
     */
  getBehaviorStats() {
    this.updateBehaviorStats();
    return this.behaviorStats;
  }

  /**
     * 清除数据
     */
  clearData() {
    this.performanceData = {
      pageLoad: {},
      navigation: {},
      resources: [],
      userTiming: [],
      vitals: {}
    };
    this.errors = [];
    this.userBehavior = [];
  }

  /**
     * 销毁监控器
     */
  destroy() {
    try {
      // 设置销毁标志
      this.isDestroyed = true;

      if (this.reportTimer) {
        clearInterval(this.reportTimer);
        this.reportTimer = null;
      }

      // 清理事件监听器
      this.removeEventListeners();

      // 清理数据
      this.clearData();

      // 清理频率限制映射
      if (this.errorFrequencyMap) {
        this.errorFrequencyMap.clear();
      }

      // 清理慢资源数组
      if (Array.isArray(this.slowResources)) {
        this.slowResources.length = 0;
      }

      this.isInitialized = false;
      console.log('PerformanceMonitor destroyed successfully');
    } catch (error) {
      console.error('Error destroying PerformanceMonitor:', error);
    }
  }

  /**
     * 移除事件监听器
     */
  removeEventListeners() {
    // 注意：由于addEventListener使用的是匿名函数，
    // 实际项目中应该保存函数引用以便正确移除
    // 这里只是示例性的清理
    try {
      // 清理可能的observer
      if (this.resourceObserver) {
        this.resourceObserver.disconnect();
        this.resourceObserver = null;
      }
      if (this.measureObserver) {
        this.measureObserver.disconnect();
        this.measureObserver = null;
      }
      if (this.lcpObserver) {
        this.lcpObserver.disconnect();
        this.lcpObserver = null;
      }
      if (this.fidObserver) {
        this.fidObserver.disconnect();
        this.fidObserver = null;
      }
      if (this.clsObserver) {
        this.clsObserver.disconnect();
        this.clsObserver = null;
      }
    } catch (error) {
      console.error('Error removing event listeners:', error);
    }
  }

  /**
     * 检查是否应该记录错误（频率限制）
     */
  shouldLogError(errorInfo) {
    try {
      const errorKey = `${errorInfo.type}_${errorInfo.message}`;
      const now = Date.now();
      const oneMinute = 60000;

      if (!this.errorFrequencyMap.has(errorKey)) {
        this.errorFrequencyMap.set(errorKey, { count: 1, firstOccurrence: now });
        return true;
      }

      const errorData = this.errorFrequencyMap.get(errorKey);

      // 如果超过一分钟，重置计数
      if (now - errorData.firstOccurrence > oneMinute) {
        this.errorFrequencyMap.set(errorKey, { count: 1, firstOccurrence: now });
        return true;
      }

      // 检查频率限制
      if (errorData.count < this.maxErrorsPerMinute) {
        errorData.count++;
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error in shouldLogError:', error);
      return true; // 出错时默认记录
    }
  }

  /**
     * 清理错误消息
     */
  sanitizeErrorMessage(message) {
    if (typeof message !== 'string') {
      return 'Invalid error message';
    }
    // 限制消息长度，防止过长的错误消息
    return message.substring(0, 500);
  }

  /**
     * 清理URL
     */
  sanitizeUrl(url) {
    if (typeof url !== 'string') {
      return 'unknown';
    }
    try {
      // 移除敏感信息（如查询参数中的token等）
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch (error) {
      return url.substring(0, PERFORMANCE_CONSTANTS.RESOURCE.MAX_URL_LENGTH); // 如果URL解析失败，截断长度
    }
  }

  /**
     * 清理堆栈信息
     */
  sanitizeStack(stack) {
    if (typeof stack !== 'string') {
      return null;
    }
    // 限制堆栈长度
    return stack.substring(0, 2000);
  }

  /**
     * 获取错误严重级别
     */
  getErrorSeverity(errorInfo) {
    if (!errorInfo || !errorInfo.type) {
      return 'unknown';
    }

    switch (errorInfo.type) {
    case 'javascript':
      // 根据错误消息判断严重程度
      if (errorInfo.message && errorInfo.message.toLowerCase().includes('out of memory')) {
        return 'critical';
      }
      return 'high';
    case 'promise':
      return 'medium';
    case 'resource':
      return 'low';
    case 'performance':
      return 'medium';
    default:
      return 'unknown';
    }
  }

  /**
     * 处理严重错误
     */
  handleCriticalError(errorInfo) {
    try {
      console.error('Critical error detected:', errorInfo);
      // 可以在这里添加特殊处理逻辑，如立即上报、用户通知等
    } catch (error) {
      console.error('Error handling critical error:', error);
    }
  }

  /**
     * 验证页面加载指标的合理性
     */
  validatePageLoadMetrics(metrics) {
    try {
      const warnings = [];

      // 检查异常值
      if (metrics.totalLoadTime > 60000) { // 超过60秒
        warnings.push('Extremely long page load time detected');
      }

      if (metrics.dnsLookup > 5000) { // DNS查询超过5秒
        warnings.push('Slow DNS lookup detected');
      }

      if (metrics.requestResponse > 30000) { // 请求响应超过30秒
        warnings.push('Slow server response detected');
      }

      if (warnings.length > 0) {
        console.warn('Performance warnings:', warnings);
      }
    } catch (error) {
      console.error('Error validating page load metrics:', error);
    }
  }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
} else {
  window.PerformanceMonitor = PerformanceMonitor;
}

// 自动初始化（如果在浏览器环境中）
if (typeof window !== 'undefined') {
  // 等待 DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.performanceMonitor = new PerformanceMonitor();
    });
  } else {
    window.performanceMonitor = new PerformanceMonitor();
  }
}
