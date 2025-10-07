/**
 * 用户行为分析系统测试脚本
 * 测试用户行为数据收集、处理和分析功能
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

class UserBehaviorAnalyticsTest {
  constructor() {
    this.config = {
      openobserveUrl: process.env.OPENOBSERVE_URL || 'http://localhost:5080',
      organization: process.env.OPENOBSERVE_ORGANIZATION || 'default',
      token: process.env.OPENOBSERVE_TOKEN || '',
      userBehaviorStream: process.env.USER_BEHAVIOR_STREAM || 'user-behavior',
      businessEventsStream: process.env.BUSINESS_EVENTS_STREAM || 'business-events',
      testTimeout: 30000
    };
    
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
    
    this.testSessionId = this.generateSessionId();
    this.testUserId = 'test-user-' + Date.now();
  }

  /**
   * 执行完整的用户行为分析测试
   */
  async runTests() {
    console.log('🧪 开始用户行为分析系统测试...');
    console.log('=====================================');
    
    const startTime = performance.now();
    
    try {
      // 1. 基础连接测试
      await this.testConnection();
      
      // 2. 数据流测试
      await this.testStreams();
      
      // 3. 页面浏览事件测试
      await this.testPageViewEvents();
      
      // 4. 点击事件测试
      await this.testClickEvents();
      
      // 5. 滚动事件测试
      await this.testScrollEvents();
      
      // 6. 表单事件测试
      await this.testFormEvents();
      
      // 7. 自定义事件测试
      await this.testCustomEvents();
      
      // 8. 转化事件测试
      await this.testConversionEvents();
      
      // 9. 性能事件测试
      await this.testPerformanceEvents();
      
      // 10. 数据查询测试
      await this.testDataQueries();
      
      // 11. 聚合分析测试
      await this.testAggregationAnalysis();
      
      // 12. 实时分析测试
      await this.testRealTimeAnalysis();
      
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      
      this.printTestSummary(duration);
      
    } catch (error) {
      console.error('❌ 测试执行失败:', error.message);
      throw error;
    }
  }

  /**
   * 测试基础连接
   */
  async testConnection() {
    console.log('\n📡 测试基础连接...');
    
    await this.runTest('OpenObserve连接测试', async () => {
      const response = await axios.get(`${this.config.openobserveUrl}/health`, {
        timeout: 5000
      });
      
      if (response.status !== 200) {
        throw new Error(`健康检查失败: ${response.status}`);
      }
      
      return response.data;
    });
  }

  /**
   * 测试数据流
   */
  async testStreams() {
    console.log('\n📊 测试数据流...');
    
    await this.runTest('用户行为数据流存在性测试', async () => {
      const response = await axios.get(
        `${this.config.openobserveUrl}/api/${this.config.organization}/streams`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`
          }
        }
      );
      
      const streams = response.data.list || [];
      const userBehaviorStream = streams.find(s => s.name === this.config.userBehaviorStream);
      
      if (!userBehaviorStream) {
        throw new Error(`用户行为数据流不存在: ${this.config.userBehaviorStream}`);
      }
      
      return userBehaviorStream;
    });

    await this.runTest('业务事件数据流存在性测试', async () => {
      const response = await axios.get(
        `${this.config.openobserveUrl}/api/${this.config.organization}/streams`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`
          }
        }
      );
      
      const streams = response.data.list || [];
      const businessEventsStream = streams.find(s => s.name === this.config.businessEventsStream);
      
      if (!businessEventsStream) {
        throw new Error(`业务事件数据流不存在: ${this.config.businessEventsStream}`);
      }
      
      return businessEventsStream;
    });
  }

  /**
   * 测试页面浏览事件
   */
  async testPageViewEvents() {
    console.log('\n📄 测试页面浏览事件...');
    
    await this.runTest('页面浏览事件发送测试', async () => {
      const pageViewEvent = this.createPageViewEvent();
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.userBehaviorStream}/_json`,
        { events: [pageViewEvent] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`页面浏览事件发送失败: ${response.status}`);
      }
      
      return response.data;
    });
  }

  /**
   * 测试点击事件
   */
  async testClickEvents() {
    console.log('\n🖱️ 测试点击事件...');
    
    await this.runTest('点击事件发送测试', async () => {
      const clickEvent = this.createClickEvent();
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.userBehaviorStream}/_json`,
        { events: [clickEvent] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`点击事件发送失败: ${response.status}`);
      }
      
      return response.data;
    });
  }

  /**
   * 测试滚动事件
   */
  async testScrollEvents() {
    console.log('\n📜 测试滚动事件...');
    
    await this.runTest('滚动事件发送测试', async () => {
      const scrollEvent = this.createScrollEvent();
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.userBehaviorStream}/_json`,
        { events: [scrollEvent] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`滚动事件发送失败: ${response.status}`);
      }
      
      return response.data;
    });
  }

  /**
   * 测试表单事件
   */
  async testFormEvents() {
    console.log('\n📝 测试表单事件...');
    
    await this.runTest('表单提交事件发送测试', async () => {
      const formSubmitEvent = this.createFormSubmitEvent();
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.userBehaviorStream}/_json`,
        { events: [formSubmitEvent] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`表单提交事件发送失败: ${response.status}`);
      }
      
      return response.data;
    });

    await this.runTest('表单字段事件发送测试', async () => {
      const fieldFocusEvent = this.createFieldFocusEvent();
      const fieldBlurEvent = this.createFieldBlurEvent();
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.userBehaviorStream}/_json`,
        { events: [fieldFocusEvent, fieldBlurEvent] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`表单字段事件发送失败: ${response.status}`);
      }
      
      return response.data;
    });
  }

  /**
   * 测试自定义事件
   */
  async testCustomEvents() {
    console.log('\n🎯 测试自定义事件...');
    
    await this.runTest('自定义事件发送测试', async () => {
      const customEvent = this.createCustomEvent();
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.userBehaviorStream}/_json`,
        { events: [customEvent] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`自定义事件发送失败: ${response.status}`);
      }
      
      return response.data;
    });
  }

  /**
   * 测试转化事件
   */
  async testConversionEvents() {
    console.log('\n💰 测试转化事件...');
    
    await this.runTest('转化事件发送测试', async () => {
      const conversionEvent = this.createConversionEvent();
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.businessEventsStream}/_json`,
        { events: [conversionEvent] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`转化事件发送失败: ${response.status}`);
      }
      
      return response.data;
    });
  }

  /**
   * 测试性能事件
   */
  async testPerformanceEvents() {
    console.log('\n⚡ 测试性能事件...');
    
    await this.runTest('性能事件发送测试', async () => {
      const performanceEvent = this.createPerformanceEvent();
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.userBehaviorStream}/_json`,
        { events: [performanceEvent] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`性能事件发送失败: ${response.status}`);
      }
      
      return response.data;
    });
  }

  /**
   * 测试数据查询
   */
  async testDataQueries() {
    console.log('\n🔍 测试数据查询...');
    
    // 先发送测试数据
    const testEvents = [
      this.createPageViewEvent(),
      this.createClickEvent(),
      this.createCustomEvent()
    ];
    
    await axios.post(
      `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.userBehaviorStream}/_json`,
      { events: testEvents },
      {
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // 等待数据处理
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await this.runTest('基础查询测试', async () => {
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: {
            sql: `SELECT * FROM ${this.config.userBehaviorStream} WHERE sessionId = '${this.testSessionId}' LIMIT 10`
          },
          start_time: new Date(Date.now() - 60000).toISOString(),
          end_time: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.data.hits || response.data.hits.length === 0) {
        throw new Error('查询结果为空');
      }
      
      return response.data.hits;
    });

    await this.runTest('聚合查询测试', async () => {
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: {
            sql: `SELECT eventType, COUNT(*) as event_count FROM ${this.config.userBehaviorStream} WHERE timestamp >= now() - INTERVAL '1 hour' GROUP BY eventType ORDER BY event_count DESC`
          },
          start_time: new Date(Date.now() - 3600000).toISOString(),
          end_time: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.hits || [];
    });
  }

  /**
   * 测试聚合分析
   */
  async testAggregationAnalysis() {
    console.log('\n📊 测试聚合分析...');
    
    await this.runTest('页面浏览聚合分析测试', async () => {
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: {
            sql: `SELECT pageUrl, COUNT(*) as page_views, COUNT(DISTINCT sessionId) as unique_sessions FROM ${this.config.userBehaviorStream} WHERE eventType = 'page_view' AND timestamp >= now() - INTERVAL '1 hour' GROUP BY pageUrl ORDER BY page_views DESC LIMIT 10`
          },
          start_time: new Date(Date.now() - 3600000).toISOString(),
          end_time: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.hits || [];
    });

    await this.runTest('用户会话聚合分析测试', async () => {
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: {
            sql: `SELECT sessionId, MIN(timestamp) as session_start, MAX(timestamp) as session_end, COUNT(*) as events FROM ${this.config.userBehaviorStream} WHERE timestamp >= now() - INTERVAL '1 hour' GROUP BY sessionId ORDER BY session_start DESC LIMIT 10`
          },
          start_time: new Date(Date.now() - 3600000).toISOString(),
          end_time: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.hits || [];
    });
  }

  /**
   * 测试实时分析
   */
  async testRealTimeAnalysis() {
    console.log('\n⏱️ 测试实时分析...');
    
    await this.runTest('实时数据流测试', async () => {
      // 发送实时事件
      const realTimeEvent = this.createPageViewEvent();
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.userBehaviorStream}/_json`,
        { events: [realTimeEvent] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // 等待短暂时间
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 查询最新数据
      const queryResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: {
            sql: `SELECT COUNT(*) as recent_events FROM ${this.config.userBehaviorStream} WHERE timestamp >= now() - INTERVAL '5 minutes'`
          },
          start_time: new Date(Date.now() - 300000).toISOString(),
          end_time: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return queryResponse.data.hits || [];
    });
  }

  /**
   * 运行单个测试
   */
  async runTest(testName, testFunction) {
    this.testResults.total++;
    
    try {
      const startTime = performance.now();
      const result = await testFunction();
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      
      this.testResults.passed++;
      this.testResults.details.push({
        name: testName,
        status: 'PASSED',
        duration,
        result
      });
      
      console.log(`  ✅ ${testName} (${duration}ms)`);
      
    } catch (error) {
      this.testResults.failed++;
      this.testResults.details.push({
        name: testName,
        status: 'FAILED',
        error: error.message
      });
      
      console.log(`  ❌ ${testName}: ${error.message}`);
    }
  }

  /**
   * 创建页面浏览事件
   */
  createPageViewEvent() {
    return {
      eventType: 'page_view',
      timestamp: Date.now(),
      sessionId: this.testSessionId,
      userId: this.testUserId,
      pageUrl: 'https://example.com/test-page',
      pageTitle: '测试页面',
      referrer: 'https://google.com',
      userAgent: 'Mozilla/5.0 (Test Browser)',
      screenResolution: '1920x1080',
      viewportSize: '1200x800',
      language: 'zh-CN',
      timezone: 'Asia/Shanghai'
    };
  }

  /**
   * 创建点击事件
   */
  createClickEvent() {
    return {
      eventType: 'click',
      timestamp: Date.now(),
      sessionId: this.testSessionId,
      userId: this.testUserId,
      pageUrl: 'https://example.com/test-page',
      element: {
        tagName: 'button',
        id: 'test-button',
        className: 'btn btn-primary',
        text: '测试按钮',
        href: null,
        type: 'button',
        name: null,
        value: null
      },
      position: {
        x: 300,
        y: 200,
        pageX: 300,
        pageY: 200
      },
      parentElement: {
        tagName: 'div',
        id: 'test-container',
        className: 'container'
      }
    };
  }

  /**
   * 创建滚动事件
   */
  createScrollEvent() {
    return {
      eventType: 'scroll',
      timestamp: Date.now(),
      sessionId: this.testSessionId,
      userId: this.testUserId,
      pageUrl: 'https://example.com/test-page',
      scrollDepth: 50,
      scrollTop: 500,
      scrollHeight: 2000,
      clientHeight: 800
    };
  }

  /**
   * 创建表单提交事件
   */
  createFormSubmitEvent() {
    return {
      eventType: 'form_submit',
      timestamp: Date.now(),
      sessionId: this.testSessionId,
      userId: this.testUserId,
      pageUrl: 'https://example.com/test-page',
      form: {
        id: 'test-form',
        className: 'form',
        action: '/submit',
        method: 'POST',
        fields: [
          { name: 'email', value: 'test@example.com' },
          { name: 'name', value: 'Test User' }
        ],
        fieldCount: 2
      }
    };
  }

  /**
   * 创建字段焦点事件
   */
  createFieldFocusEvent() {
    return {
      eventType: 'field_focus',
      timestamp: Date.now(),
      sessionId: this.testSessionId,
      userId: this.testUserId,
      pageUrl: 'https://example.com/test-page',
      field: {
        name: 'email',
        type: 'email',
        id: 'email-field',
        className: 'form-control',
        required: true,
        placeholder: '请输入邮箱'
      }
    };
  }

  /**
   * 创建字段失焦事件
   */
  createFieldBlurEvent() {
    return {
      eventType: 'field_blur',
      timestamp: Date.now(),
      sessionId: this.testSessionId,
      userId: this.testUserId,
      pageUrl: 'https://example.com/test-page',
      field: {
        name: 'email',
        type: 'email',
        id: 'email-field',
        value: 'test@example.com',
        length: 16
      }
    };
  }

  /**
   * 创建自定义事件
   */
  createCustomEvent() {
    return {
      eventType: 'custom_event',
      timestamp: Date.now(),
      sessionId: this.testSessionId,
      userId: this.testUserId,
      pageUrl: 'https://example.com/test-page',
      eventName: 'product_view',
      eventData: {
        product_id: 'prod-123',
        product_name: '测试产品',
        category: 'electronics',
        price: 99.99
      }
    };
  }

  /**
   * 创建转化事件
   */
  createConversionEvent() {
    return {
      eventType: 'conversion',
      timestamp: Date.now(),
      sessionId: this.testSessionId,
      userId: this.testUserId,
      pageUrl: 'https://example.com/checkout',
      conversionType: 'purchase',
      conversionValue: 99.99,
      metadata: {
        product_id: 'prod-123',
        quantity: 1,
        payment_method: 'credit_card',
        order_id: 'order-' + Date.now()
      }
    };
  }

  /**
   * 创建性能事件
   */
  createPerformanceEvent() {
    return {
      eventType: 'performance',
      timestamp: Date.now(),
      sessionId: this.testSessionId,
      userId: this.testUserId,
      pageUrl: 'https://example.com/test-page',
      timing: {
        dnsLookup: 50,
        tcpConnect: 100,
        serverResponse: 200,
        domProcessing: 300,
        pageLoad: 800,
        domInteractive: 600,
        firstPaint: 400,
        firstContentfulPaint: 500
      },
      navigation: {
        type: 0,
        redirectCount: 0
      },
      resources: [
        {
          name: 'https://example.com/style.css',
          type: 'css',
          duration: 100,
          size: 50000,
          startTime: 200
        },
        {
          name: 'https://example.com/script.js',
          type: 'javascript',
          duration: 150,
          size: 100000,
          startTime: 300
        }
      ]
    };
  }

  /**
   * 生成会话ID
   */
  generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * 打印测试摘要
   */
  printTestSummary(duration) {
    console.log('\n📋 测试摘要');
    console.log('=====================================');
    console.log(`⏱️ 总耗时: ${duration}ms`);
    console.log(`📊 总测试数: ${this.testResults.total}`);
    console.log(`✅ 通过测试: ${this.testResults.passed}`);
    console.log(`❌ 失败测试: ${this.testResults.failed}`);
    console.log(`📈 成功率: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(2)}%`);
    
    if (this.testResults.failed > 0) {
      console.log('\n❌ 失败的测试:');
      this.testResults.details
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n📊 详细结果:');
    this.testResults.details.forEach(test => {
      const status = test.status === 'PASSED' ? '✅' : '❌';
      const duration = test.duration ? ` (${test.duration}ms)` : '';
      console.log(`  ${status} ${test.name}${duration}`);
    });
    
    if (this.testResults.failed === 0) {
      console.log('\n🎉 所有测试通过！用户行为分析系统运行正常。');
    } else {
      console.log('\n⚠️ 部分测试失败，请检查配置和连接。');
    }
    
    console.log('\n🔗 测试数据查询:');
    console.log(`  会话ID: ${this.testSessionId}`);
    console.log(`  用户ID: ${this.testUserId}`);
    console.log(`  查询链接: ${this.config.openobserveUrl}/web/#/streams?stream=${this.config.userBehaviorStream}`);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const test = new UserBehaviorAnalyticsTest();
  test.runTests().catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}

module.exports = UserBehaviorAnalyticsTest;