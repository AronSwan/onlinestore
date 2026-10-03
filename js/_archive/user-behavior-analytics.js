/**
 * 用户行为分析系统
 * 收集、分析和可视化用户行为数据
 */

class UserBehaviorAnalytics {
  constructor(config = {}) {
    this.config = {
      openobserveUrl: config.openobserveUrl || 'http://localhost:5080',
      organization: config.organization || 'default',
      token: config.token || '',
      streamName: config.streamName || 'user-behavior',
      batchSize: config.batchSize || 10,
      flushInterval: config.flushInterval || 5000,
      enableClickTracking: config.enableClickTracking !== false,
      enableScrollTracking: config.enableScrollTracking !== false,
      enableFormTracking: config.enableFormTracking !== false,
      enablePageViewTracking: config.enablePageViewTracking !== false,
      enablePerformanceTracking: config.enablePerformanceTracking !== false,
      ...config
    };
    
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.events = [];
    this.isInitialized = false;
    this.flushTimer = null;
    
    // 页面性能数据
    this.pageLoadTime = null;
    this.scrollDepth = 0;
    this.clickPositions = [];
    this.formInteractions = [];
    
    // 用户路径数据
    this.pageViews = [];
    this.currentSessionStart = Date.now();
    this.lastActivityTime = Date.now();
  }

  /**
   * 初始化用户行为分析系统
   */
  async initialize() {
    try {
      // 设置用户信息
      this.setUserInfo();
      
      // 设置事件监听器
      this.setupEventListeners();
      
      // 启动批量发送定时器
      this.startFlushTimer();
      
      // 记录页面加载事件
      if (this.config.enablePageViewTracking) {
        this.trackPageView();
      }
      
      // 记录性能数据
      if (this.config.enablePerformanceTracking) {
        this.trackPerformance();
      }
      
      this.isInitialized = true;
      console.log(`📊 用户行为分析系统已初始化 - 会话: ${this.sessionId}`);
      
    } catch (error) {
      console.error('用户行为分析系统初始化失败:', error);
    }
  }

  /**
   * 设置用户信息
   */
  setUserInfo(userId = null) {
    // 从localStorage或cookie获取用户ID
    this.userId = userId || localStorage.getItem('userId') || this.getUserIdFromCookie() || null;
    
    if (this.userId) {
      localStorage.setItem('userId', this.userId);
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 点击事件追踪
    if (this.config.enableClickTracking) {
      document.addEventListener('click', this.handleClick.bind(this), true);
    }
    
    // 滚动事件追踪
    if (this.config.enableScrollTracking) {
      window.addEventListener('scroll', this.throttle(this.handleScroll.bind(this), 500));
    }
    
    // 表单事件追踪
    if (this.config.enableFormTracking) {
      document.addEventListener('submit', this.handleFormSubmit.bind(this), true);
      document.addEventListener('focus', this.handleFormFocus.bind(this), true);
      document.addEventListener('blur', this.handleFormBlur.bind(this), true);
    }
    
    // 页面可见性变化
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // 页面卸载
    window.addEventListener('beforeunload', this.handlePageUnload.bind(this));
    
    // 用户活动检测
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, this.updateLastActivity.bind(this), true);
    });
  }

  /**
   * 追踪页面浏览
   */
  trackPageView(pageUrl = null, referrer = null) {
    const pageView = {
      eventType: 'page_view',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      pageUrl: pageUrl || window.location.href,
      pageTitle: document.title,
      referrer: referrer || document.referrer,
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    
    this.pageViews.push(pageView);
    this.addEvent(pageView);
  }

  /**
   * 追踪点击事件
   */
  handleClick(event) {
    const element = event.target;
    const clickData = {
      eventType: 'click',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      pageUrl: window.location.href,
      element: {
        tagName: element.tagName.toLowerCase(),
        id: element.id,
        className: element.className,
        text: element.textContent?.substring(0, 100),
        href: element.href,
        type: element.type,
        name: element.name,
        value: element.value
      },
      position: {
        x: event.clientX,
        y: event.clientY,
        pageX: event.pageX,
        pageY: event.pageY
      },
      parentElement: {
        tagName: element.parentElement?.tagName.toLowerCase(),
        id: element.parentElement?.id,
        className: element.parentElement?.className
      }
    };
    
    this.clickPositions.push({ x: event.clientX, y: event.clientY, timestamp: Date.now() });
    this.addEvent(clickData);
  }

  /**
   * 追踪滚动事件
   */
  handleScroll() {
    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const clientHeight = window.innerHeight;
    
    const scrollPercentage = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
    
    // 只记录滚动深度达到25%、50%、75%、100%的时刻
    const milestones = [25, 50, 75, 90, 100];
    if (milestones.includes(scrollPercentage) && scrollPercentage > this.scrollDepth) {
      this.scrollDepth = scrollPercentage;
      
      const scrollData = {
        eventType: 'scroll',
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId: this.userId,
        pageUrl: window.location.href,
        scrollDepth: scrollPercentage,
        scrollTop: scrollTop,
        scrollHeight: scrollHeight,
        clientHeight: clientHeight
      };
      
      this.addEvent(scrollData);
    }
  }

  /**
   * 追踪表单提交
   */
  handleFormSubmit(event) {
    const form = event.target;
    const formData = new FormData(form);
    const formFields = [];
    
    for (let [key, value] of formData.entries()) {
      // 脱敏处理，不记录敏感信息
      if (this.isSensitiveField(key)) {
        value = '[REDACTED]';
      }
      formFields.push({ name: key, value });
    }
    
    const formSubmitData = {
      eventType: 'form_submit',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      pageUrl: window.location.href,
      form: {
        id: form.id,
        className: form.className,
        action: form.action,
        method: form.method,
        fields: formFields,
        fieldCount: formFields.length
      }
    };
    
    this.formInteractions.push(formSubmitData);
    this.addEvent(formSubmitData);
  }

  /**
   * 追踪表单字段焦点
   */
  handleFormFocus(event) {
    const field = event.target;
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(field.tagName)) return;
    
    const focusData = {
      eventType: 'field_focus',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      pageUrl: window.location.href,
      field: {
        name: field.name,
        type: field.type,
        id: field.id,
        className: field.className,
        required: field.required,
        placeholder: field.placeholder
      }
    };
    
    this.addEvent(focusData);
  }

  /**
   * 追踪表单字段失焦
   */
  handleFormBlur(event) {
    const field = event.target;
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(field.tagName)) return;
    
    const value = this.isSensitiveField(field.name) ? '[REDACTED]' : field.value;
    
    const blurData = {
      eventType: 'field_blur',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      pageUrl: window.location.href,
      field: {
        name: field.name,
        type: field.type,
        id: field.id,
        value: value,
        length: field.value.length
      }
    };
    
    this.addEvent(blurData);
  }

  /**
   * 追踪页面可见性变化
   */
  handleVisibilityChange() {
    const visibilityData = {
      eventType: 'visibility_change',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      pageUrl: window.location.href,
      hidden: document.hidden,
      visibilityState: document.visibilityState
    };
    
    this.addEvent(visibilityData);
  }

  /**
   * 追踪页面卸载
   */
  handlePageUnload() {
    // 计算会话时长
    const sessionDuration = Date.now() - this.currentSessionStart;
    
    const unloadData = {
      eventType: 'page_unload',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      pageUrl: window.location.href,
      sessionDuration: sessionDuration,
      scrollDepth: this.scrollDepth,
      clickCount: this.clickPositions.length,
      formInteractions: this.formInteractions.length,
      pageViews: this.pageViews.length
    };
    
    // 立即发送数据
    this.addEvent(unloadData);
    this.flushEvents(true);
  }

  /**
   * 追踪性能数据
   */
  trackPerformance() {
    if (!performance.timing) return;
    
    const timing = performance.timing;
    const navigation = performance.navigation;
    
    const performanceData = {
      eventType: 'performance',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      pageUrl: window.location.href,
      timing: {
        dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
        tcpConnect: timing.connectEnd - timing.connectStart,
        serverResponse: timing.responseEnd - timing.requestStart,
        domProcessing: timing.domComplete - timing.domLoading,
        pageLoad: timing.loadEventEnd - timing.navigationStart,
        domInteractive: timing.domInteractive - timing.navigationStart,
        firstPaint: this.getFirstPaintTime(),
        firstContentfulPaint: this.getFirstContentfulPaintTime()
      },
      navigation: {
        type: navigation.type,
        redirectCount: navigation.redirectCount
      },
      resources: this.getResourceTiming()
    };
    
    this.addEvent(performanceData);
  }

  /**
   * 追踪自定义事件
   */
  trackCustomEvent(eventName, eventData = {}) {
    const customEventData = {
      eventType: 'custom_event',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      pageUrl: window.location.href,
      eventName: eventName,
      eventData: eventData
    };
    
    this.addEvent(customEventData);
  }

  /**
   * 追踪用户路径
   */
  trackUserPath(action, target, metadata = {}) {
    const pathData = {
      eventType: 'user_path',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      pageUrl: window.location.href,
      action: action,
      target: target,
      metadata: metadata
    };
    
    this.addEvent(pathData);
  }

  /**
   * 追踪转化事件
   */
  trackConversion(conversionType, conversionValue = 0, metadata = {}) {
    const conversionData = {
      eventType: 'conversion',
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      pageUrl: window.location.href,
      conversionType: conversionType,
      conversionValue: conversionValue,
      metadata: metadata
    };
    
    this.addEvent(conversionData);
  }

  /**
   * 添加事件到队列
   */
  addEvent(event) {
    this.events.push(event);
    this.updateLastActivity();
    
    // 如果达到批量大小，立即发送
    if (this.events.length >= this.config.batchSize) {
      this.flushEvents();
    }
  }

  /**
   * 发送事件到OpenObserve
   */
  async flushEvents(isSync = false) {
    if (this.events.length === 0) return;
    
    const eventsToSend = [...this.events];
    this.events = [];
    
    const payload = {
      events: eventsToSend,
      metadata: {
        sessionId: this.sessionId,
        userId: this.userId,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      }
    };
    
    try {
      if (isSync) {
        // 同步发送（用于页面卸载）
        this.sendSync(payload);
      } else {
        // 异步发送
        await this.sendAsync(payload);
      }
    } catch (error) {
      console.error('发送用户行为数据失败:', error);
      // 重新加入队列
      this.events.unshift(...eventsToSend);
    }
  }

  /**
   * 异步发送数据
   */
  async sendAsync(payload) {
    const response = await fetch(`${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.streamName}/_json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.token}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`发送失败: ${response.status}`);
    }
    
    console.log(`📊 发送${payload.events.length}个用户行为事件`);
  }

  /**
   * 同步发送数据
   */
  sendSync(payload) {
    // 使用navigator.sendBeacon进行同步发送
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.streamName}/_json?authorization=${this.config.token}`,
        blob
      );
    } else {
      // 降级到XMLHttpRequest
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.streamName}/_json`, false);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${this.config.token}`);
      xhr.send(JSON.stringify(payload));
    }
  }

  /**
   * 启动批量发送定时器
   */
  startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.config.flushInterval);
  }

  /**
   * 停止批量发送定时器
   */
  stopFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * 更新最后活动时间
   */
  updateLastActivity() {
    this.lastActivityTime = Date.now();
  }

  /**
   * 获取首次绘制时间
   */
  getFirstPaintTime() {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : 0;
  }

  /**
   * 获取首次内容绘制时间
   */
  getFirstContentfulPaintTime() {
    const paintEntries = performance.getEntriesByType('paint');
    const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return firstContentfulPaint ? firstContentfulPaint.startTime : 0;
  }

  /**
   * 获取资源加载时间
   */
  getResourceTiming() {
    const resourceEntries = performance.getEntriesByType('resource');
    return resourceEntries.map(entry => ({
      name: entry.name,
      type: this.getResourceType(entry.name),
      duration: entry.duration,
      size: entry.transferSize || 0,
      startTime: entry.startTime
    }));
  }

  /**
   * 获取资源类型
   */
  getResourceType(url) {
    if (url.match(/\.(css)$/)) return 'css';
    if (url.match(/\.(js)$/)) return 'javascript';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    return 'other';
  }

  /**
   * 检查是否为敏感字段
   */
  isSensitiveField(fieldName) {
    const sensitiveFields = [
      'password', 'passwd', 'secret', 'token', 'key',
      'credit', 'card', 'ssn', 'social', 'bank',
      'email', 'phone', 'mobile', 'address'
    ];
    
    return sensitiveFields.some(field => 
      fieldName.toLowerCase().includes(field)
    );
  }

  /**
   * 从Cookie获取用户ID
   */
  getUserIdFromCookie() {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'userId') {
        return value;
      }
    }
    return null;
  }

  /**
   * 生成会话ID
   */
  generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * 节流函数
   */
  throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;
    return function (...args) {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }

  /**
   * 获取当前会话统计
   */
  getSessionStats() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: this.currentSessionStart,
      duration: Date.now() - this.currentSessionStart,
      lastActivityTime: this.lastActivityTime,
      pageViews: this.pageViews.length,
      clickCount: this.clickPositions.length,
      formInteractions: this.formInteractions.length,
      scrollDepth: this.scrollDepth,
      eventsQueued: this.events.length
    };
  }

  /**
   * 销毁分析实例
   */
  destroy() {
    this.stopFlushTimer();
    this.flushEvents(true);
    this.isInitialized = false;
  }
}

// 创建全局实例
window.userBehaviorAnalytics = new UserBehaviorAnalytics();

// 自动初始化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 从配置中获取设置
    const config = window.USER_BEHAVIOR_CONFIG || {};
    
    await window.userBehaviorAnalytics.initialize(config);
    
    console.log('✅ 用户行为分析系统启动成功');
  } catch (error) {
    console.error('❌ 用户行为分析系统启动失败:', error);
  }
});

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UserBehaviorAnalytics };
}