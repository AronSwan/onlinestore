/**
 * 前端分布式追踪系统
 * 基于OpenTelemetry Web标准实现前端追踪
 */

class FrontendTracing {
  constructor(config = {}) {
    this.config = {
      serviceName: config.serviceName || 'caddy-shopping-frontend',
      serviceVersion: config.serviceVersion || '1.0.0',
      environment: config.environment || 'development',
      openobserveUrl: config.openobserveUrl || 'http://localhost:5080',
      organization: config.organization || 'default',
      token: config.token || '',
      samplingRatio: config.samplingRatio || (config.environment === 'production' ? 0.1 : 1.0),
      ...config
    };
    
    this.tracer = null;
    this.contextManager = null;
    this.spanProcessor = null;
    this.isInitialized = false;
    
    // 存储当前活动的span
    this.activeSpans = new Map();
    
    // 存储用户会话信息
    this.sessionInfo = {
      sessionId: this.generateSessionId(),
      userId: null,
      startTime: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
  }

  /**
   * 初始化前端追踪系统
   */
  async initialize() {
    try {
      // 检查浏览器是否支持必要的API
      if (!window.fetch || !window.performance) {
        console.warn('浏览器不支持必要的API，追踪功能可能受限');
      }

      // 初始化OpenTelemetry Web追踪
      await this.initializeOpenTelemetry();
      
      // 设置全局错误处理
      this.setupGlobalErrorHandling();
      
      // 设置性能监控
      this.setupPerformanceMonitoring();
      
      // 设置用户交互追踪
      this.setupUserInteractionTracking();
      
      // 设置页面导航追踪
      this.setupNavigationTracking();
      
      this.isInitialized = true;
      console.log(`🔍 前端追踪系统已初始化 - 服务: ${this.config.serviceName}`);
      
    } catch (error) {
      console.error('前端追踪系统初始化失败:', error);
    }
  }

  /**
   * 初始化OpenTelemetry Web追踪
   */
  async initializeOpenTelemetry() {
    // 动态加载OpenTelemetry Web包
    if (!window.opentelemetry) {
      await this.loadOpenTelemetryScripts();
    }

    const { trace, context, propagation } = window.opentelemetry;
    
    // 创建简单的span处理器
    this.spanProcessor = new SimpleSpanProcessor({
      exporter: new OTLPTraceExporter({
        url: `${this.config.openobserveUrl}/api/${this.config.organization}/traces`,
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json'
        }
      })
    });

    // 创建追踪器
    this.tracer = trace.getTracer(this.config.serviceName, this.config.serviceVersion);
    this.contextManager = context;
    
    // 设置传播器
    propagation.setGlobalPropagator(new CompositePropagator({
      propagators: [
        new W3CTraceContextPropagator(),
        new W3CBaggagePropagator()
      ]
    }));
  }

  /**
   * 动态加载OpenTelemetry Web脚本
   */
  async loadOpenTelemetryScripts() {
    const scripts = [
      'https://cdn.jsdelivr.net/npm/@opentelemetry/api@1.4.1/dist/opentelemetry-api.min.js',
      'https://cdn.jsdelivr.net/npm/@opentelemetry/sdk-web@1.8.1/dist/opentelemetry-sdk-web.min.js',
      'https://cdn.jsdelivr.net/npm/@opentelemetry/exporter-otlp-http@1.8.1/dist/opentelemetry-exporter-otlp-http.min.js',
      'https://cdn.jsdelivr.net/npm/@opentelemetry/propagator-b3@1.8.1/dist/opentelemetry-propagator-b3.min.js',
      'https://cdn.jsdelivr.net/npm/@opentelemetry/propagator-jaeger@1.8.1/dist/opentelemetry-propagator-jaeger.min.js'
    ];

    for (const script of scripts) {
      await this.loadScript(script);
    }
  }

  /**
   * 加载脚本
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * 创建页面加载span
   */
  createPageLoadSpan() {
    if (!this.isInitialized) return;

    const span = this.tracer.startSpan('page.load', {
      attributes: {
        'page.url': window.location.href,
        'page.title': document.title,
        'page.referrer': document.referrer,
        'user.agent': navigator.userAgent,
        'user.session_id': this.sessionInfo.sessionId,
        'user.id': this.sessionInfo.userId,
        'performance.navigation_start': performance.timing.navigationStart,
        'performance.dom_content_loaded': performance.timing.domContentLoadedEventEnd,
        'performance.load_complete': performance.timing.loadEventEnd
      }
    });

    // 计算页面加载时间
    if (performance.timing) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      span.setAttribute('page.load_time_ms', loadTime);
    }

    span.end();
  }

  /**
   * 创建用户交互span
   */
  createUserInteractionSpan(element, action, attributes = {}) {
    if (!this.isInitialized) return;

    const span = this.tracer.startSpan(`user.interaction.${action}`, {
      attributes: {
        'ui.element': element.tagName.toLowerCase(),
        'ui.element_id': element.id,
        'ui.element_class': element.className,
        'ui.element_text': element.textContent?.substring(0, 100),
        'ui.action': action,
        'ui.x': attributes.x || 0,
        'ui.y': attributes.y || 0,
        'user.session_id': this.sessionInfo.sessionId,
        'user.id': this.sessionInfo.userId,
        'page.url': window.location.href,
        ...attributes
      }
    });

    span.end();
    return span;
  }

  /**
   * 创建API调用span
   */
  createApiSpan(url, method, options = {}) {
    if (!this.isInitialized) return;

    const span = this.tracer.startSpan(`http.${method.toLowerCase()}`, {
      attributes: {
        'http.method': method,
        'http.url': url,
        'http.scheme': window.location.protocol.slice(0, -1),
        'http.host': window.location.host,
        'user.session_id': this.sessionInfo.sessionId,
        'user.id': this.sessionInfo.userId,
        'api.request_id': options.requestId || this.generateTraceId()
      }
    });

    return span;
  }

  /**
   * 创建业务事件span
   */
  createBusinessEventSpan(eventName, eventData = {}) {
    if (!this.isInitialized) return;

    const span = this.tracer.startSpan(`business.event.${eventName}`, {
      attributes: {
        'business.event.name': eventName,
        'business.event.data': JSON.stringify(eventData),
        'user.session_id': this.sessionInfo.sessionId,
        'user.id': this.sessionInfo.userId,
        'page.url': window.location.href,
        'timestamp': new Date().toISOString()
      }
    });

    span.addEvent('business_event', {
      'event.name': eventName,
      'event.data': JSON.stringify(eventData),
      'timestamp': new Date().toISOString()
    });

    span.end();
    return span;
  }

  /**
   * 创建错误span
   */
  createErrorSpan(error, context = {}) {
    if (!this.isInitialized) return;

    const span = this.tracer.startSpan('error.frontend', {
      attributes: {
        'error.name': error.name,
        'error.message': error.message,
        'error.stack': error.stack,
        'error.context': JSON.stringify(context),
        'user.session_id': this.sessionInfo.sessionId,
        'user.id': this.sessionInfo.userId,
        'page.url': window.location.href
      }
    });

    span.recordException(error);
    span.setStatus({ code: 2, message: error.message }); // SpanStatusCode.ERROR
    span.end();
  }

  /**
   * 设置全局错误处理
   */
  setupGlobalErrorHandling() {
    // 捕获JavaScript错误
    window.addEventListener('error', (event) => {
      this.createErrorSpan(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'javascript_error'
      });
    });

    // 捕获Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.createErrorSpan(event.reason, {
        type: 'unhandled_promise_rejection',
        promise: event.promise
      });
    });
  }

  /**
   * 设置性能监控
   */
  setupPerformanceMonitoring() {
    // 监控页面加载性能
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.createPageLoadSpan();
        this.collectPerformanceMetrics();
      }, 1000);
    });

    // 监控长任务
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask') {
            const span = this.tracer.startSpan('performance.longtask', {
              attributes: {
                'performance.duration_ms': entry.duration,
                'performance.start_time': entry.startTime,
                'user.session_id': this.sessionInfo.sessionId
              }
            });
            span.end();
          }
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    }
  }

  /**
   * 设置用户交互追踪
   */
  setupUserInteractionTracking() {
    // 追踪点击事件
    document.addEventListener('click', (event) => {
      const element = event.target;
      const action = 'click';
      
      this.createUserInteractionSpan(element, action, {
        x: event.clientX,
        y: event.clientY,
        button: event.button
      });
    });

    // 追踪表单提交
    document.addEventListener('submit', (event) => {
      const form = event.target;
      this.createUserInteractionSpan(form, 'form_submit', {
        form_action: form.action,
        form_method: form.method
      });
    });

    // 追踪输入事件
    document.addEventListener('input', (event) => {
      const element = event.target;
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        this.createUserInteractionSpan(element, 'input', {
          input_type: element.type,
          input_name: element.name
        });
      }
    });
  }

  /**
   * 设置页面导航追踪
   */
  setupNavigationTracking() {
    // 追踪页面卸载
    window.addEventListener('beforeunload', () => {
      const span = this.tracer.startSpan('page.unload', {
        attributes: {
          'page.url': window.location.href,
          'page.duration_ms': Date.now() - this.sessionInfo.startTime,
          'user.session_id': this.sessionInfo.sessionId
        }
      });
      span.end();
    });

    // 追踪历史导航
    window.addEventListener('popstate', (event) => {
      const span = this.tracer.startSpan('page.navigation', {
        attributes: {
          'navigation.type': 'popstate',
          'page.url': window.location.href,
          'user.session_id': this.sessionInfo.sessionId
        }
      });
      span.end();
    });
  }

  /**
   * 收集性能指标
   */
  collectPerformanceMetrics() {
    if (!performance.getEntriesByType) return;

    // 收集导航计时
    const navigationEntries = performance.getEntriesByType('navigation');
    if (navigationEntries.length > 0) {
      const nav = navigationEntries[0];
      const span = this.tracer.startSpan('performance.navigation', {
        attributes: {
          'performance.dom_complete': nav.domComplete,
          'performance.dom_interactive': nav.domInteractive,
          'performance.load_event_end': nav.loadEventEnd,
          'performance.response_end': nav.responseEnd,
          'performance.request_start': nav.requestStart,
          'user.session_id': this.sessionInfo.sessionId
        }
      });
      span.end();
    }

    // 收集资源加载计时
    const resourceEntries = performance.getEntriesByType('resource');
    resourceEntries.forEach(entry => {
      const span = this.tracer.startSpan('performance.resource', {
        attributes: {
          'resource.name': entry.name,
          'resource.type': entry.initiatorType,
          'resource.duration_ms': entry.duration,
          'resource.size_bytes': entry.transferSize || 0,
          'user.session_id': this.sessionInfo.sessionId
        }
      });
      span.end();
    });
  }

  /**
   * 拦截fetch API以添加追踪
   */
  interceptFetch() {
    if (!window.fetch) return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [url, options = {}] = args;
      const method = options.method || 'GET';
      
      const span = this.createApiSpan(url, method, options);
      const startTime = Date.now();

      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;

        if (span) {
          span.setAttribute('http.status_code', response.status);
          span.setAttribute('http.response_time_ms', duration);
          span.setAttribute('response.content_length', response.headers.get('content-length') || 0);
          
          if (response.status >= 400) {
            span.setStatus({ code: 2, message: `HTTP ${response.status}` });
          }
          
          span.end();
        }

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        if (span) {
          span.recordException(error);
          span.setAttribute('http.response_time_ms', duration);
          span.setStatus({ code: 2, message: error.message });
          span.end();
        }

        throw error;
      }
    };
  }

  /**
   * 设置用户信息
   */
  setUserInfo(userId, userInfo = {}) {
    this.sessionInfo.userId = userId;
    this.sessionInfo.userInfo = userInfo;
  }

  /**
   * 生成会话ID
   */
  generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * 生成追踪ID
   */
  generateTraceId() {
    return 'trace_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * 获取当前追踪上下文
   */
  getCurrentTraceContext() {
    if (!this.isInitialized) return null;
    
    const { trace, context } = window.opentelemetry;
    const currentSpan = trace.getSpan(context.active());
    
    if (!currentSpan) return null;
    
    return {
      traceId: currentSpan.spanContext().traceId,
      spanId: currentSpan.spanContext().spanId,
      traceFlags: currentSpan.spanContext().traceFlags
    };
  }

  /**
   * 添加追踪头到请求
   */
  addTraceHeaders(headers = {}) {
    const traceContext = this.getCurrentTraceContext();
    if (!traceContext) return headers;

    const { propagation } = window.opentelemetry;
    const carrier = {};
    
    propagation.inject(carrier, headers);
    
    return {
      ...headers,
      ...carrier
    };
  }
}

// 简单的span处理器实现
class SimpleSpanProcessor {
  constructor({ exporter }) {
    this.exporter = exporter;
    this.spans = [];
  }

  onStart(span) {
    // 可以在这里添加span开始时的处理逻辑
  }

  onEnd(span) {
    this.spans.push(span);
    
    // 批量导出span
    if (this.spans.length >= 10) {
      this.export();
    }
  }

  async export() {
    if (this.spans.length === 0) return;
    
    try {
      await this.exporter.export(this.spans);
      this.spans = [];
    } catch (error) {
      console.error('导出span失败:', error);
    }
  }
}

// 简单的导出器实现
class OTLPTraceExporter {
  constructor({ url, headers }) {
    this.url = url;
    this.headers = headers;
  }

  async export(spans) {
    const payload = {
      resourceSpans: spans.map(span => ({
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'caddy-shopping-frontend' } },
            { key: 'service.version', value: { stringValue: '1.0.0' } }
          ]
        },
        scopeSpans: [{
          spans: [span]
        }]
      }))
    };

    try {
      await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('发送追踪数据失败:', error);
    }
  }
}

// 简单的传播器实现
class CompositePropagator {
  constructor({ propagators }) {
    this.propagators = propagators;
  }

  inject(context, carrier) {
    this.propagators.forEach(propagator => {
      if (propagator.inject) {
        propagator.inject(context, carrier);
      }
    });
  }

  extract(context, carrier) {
    return this.propagators.reduce((acc, propagator) => {
      if (propagator.extract) {
        return propagator.extract(acc, carrier);
      }
      return acc;
    }, context);
  }
}

class W3CTraceContextPropagator {
  inject(context, carrier) {
    // 简化实现
    carrier.traceparent = '00-' + Math.random().toString(16).substr(2, 32) + '-' + Math.random().toString(16).substr(2, 16) + '-01';
  }

  extract(context, carrier) {
    return context;
  }
}

class W3CBaggagePropagator {
  inject(context, carrier) {
    // 简化实现
  }

  extract(context, carrier) {
    return context;
  }
}

// 创建全局实例
window.frontendTracing = new FrontendTracing();

// 自动初始化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 从配置中获取设置
    const config = window.OPENOBSERVE_CONFIG || {};
    
    await window.frontendTracing.initialize(config);
    
    // 拦截fetch API
    window.frontendTracing.interceptFetch();
    
    console.log('✅ 前端追踪系统启动成功');
  } catch (error) {
    console.error('❌ 前端追踪系统启动失败:', error);
  }
});

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FrontendTracing };
}