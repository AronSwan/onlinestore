/**
 * 分布式追踪系统测试脚本
 * 测试OpenTelemetry追踪功能的完整性和性能
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

class DistributedTracingTest {
  constructor() {
    this.config = {
      openobserveUrl: process.env.OPENOBSERVE_URL || 'http://localhost:5080',
      organization: process.env.OPENOBSERVE_ORGANIZATION || 'default',
      token: process.env.OPENOBSERVE_TOKEN || '',
      serviceName: process.env.SERVICE_NAME || 'caddy-shopping-backend',
      testTimeout: 30000
    };
    
    this.streams = {
      traces: 'request-traces',
      logs: 'application-logs',
      metrics: 'system-metrics'
    };
    
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  /**
   * 执行完整的分布式追踪测试
   */
  async runTests() {
    console.log('🧪 开始分布式追踪系统测试...');
    console.log('=====================================');
    
    const startTime = performance.now();
    
    try {
      // 1. 基础连接测试
      await this.testConnection();
      
      // 2. 数据流测试
      await this.testStreams();
      
      // 3. 追踪数据发送测试
      await this.testTraceDataSending();
      
      // 4. 追踪数据查询测试
      await this.testTraceDataQuery();
      
      // 5. 性能测试
      await this.testPerformance();
      
      // 6. 错误处理测试
      await this.testErrorHandling();
      
      // 7. 采样策略测试
      await this.testSamplingStrategy();
      
      // 8. 跨服务追踪测试
      await this.testCrossServiceTracing();
      
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
    
    await this.runTest('追踪数据流存在性测试', async () => {
      const response = await axios.get(
        `${this.config.openobserveUrl}/api/${this.config.organization}/streams`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`
          }
        }
      );
      
      const streams = response.data.list || [];
      const traceStream = streams.find(s => s.name === this.streams.traces);
      
      if (!traceStream) {
        throw new Error(`追踪数据流不存在: ${this.streams.traces}`);
      }
      
      return traceStream;
    });
  }

  /**
   * 测试追踪数据发送
   */
  async testTraceDataSending() {
    console.log('\n📤 测试追踪数据发送...');
    
    await this.runTest('单个追踪数据发送测试', async () => {
      const testTrace = this.createTestTrace('single.test');
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.streams.traces}/_json`,
        { traces: [testTrace] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`发送失败: ${response.status}`);
      }
      
      return response.data;
    });

    await this.runTest('批量追踪数据发送测试', async () => {
      const traces = [];
      for (let i = 0; i < 10; i++) {
        traces.push(this.createTestTrace(`batch.test.${i}`));
      }
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.streams.traces}/_json`,
        { traces },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`批量发送失败: ${response.status}`);
      }
      
      return response.data;
    });
  }

  /**
   * 测试追踪数据查询
   */
  async testTraceDataQuery() {
    console.log('\n🔍 测试追踪数据查询...');
    
    // 先发送测试数据
    const testTrace = this.createTestTrace('query.test');
    await axios.post(
      `${this.config.openobserveUrl}/api/${this.config.organization}/${this.streams.traces}/_json`,
      { traces: [testTrace] },
      {
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // 等待数据处理
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await this.runTest('追踪数据查询测试', async () => {
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: {
            sql: `SELECT * FROM ${this.streams.traces} WHERE trace_id = '${testTrace.trace_id}' LIMIT 1`
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
      
      return response.data.hits[0];
    });

    await this.runTest('聚合查询测试', async () => {
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: {
            sql: `SELECT service_name, count(*) as trace_count, avg(duration) as avg_duration FROM ${this.streams.traces} WHERE timestamp >= now() - INTERVAL '1 hour' GROUP BY service_name`
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
   * 测试性能
   */
  async testPerformance() {
    console.log('\n⚡ 测试性能...');
    
    await this.runTest('追踪数据发送性能测试', async () => {
      const traceCount = 100;
      const startTime = performance.now();
      
      const traces = [];
      for (let i = 0; i < traceCount; i++) {
        traces.push(this.createTestTrace(`performance.test.${i}`));
      }
      
      await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.streams.traces}/_json`,
        { traces },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const throughput = (traceCount / (duration / 1000)).toFixed(2);
      
      console.log(`  📊 发送${traceCount}条追踪数据耗时: ${duration.toFixed(2)}ms`);
      console.log(`  📊 吞吐量: ${throughput} traces/秒`);
      
      return { duration, throughput };
    });

    await this.runTest('查询性能测试', async () => {
      const startTime = performance.now();
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: {
            sql: `SELECT service_name, operation_name, avg(duration) as avg_duration, count(*) as count FROM ${this.streams.traces} WHERE timestamp >= now() - INTERVAL '1 hour' GROUP BY service_name, operation_name ORDER BY avg_duration DESC LIMIT 10`
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
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`  📊 复杂查询耗时: ${duration.toFixed(2)}ms`);
      console.log(`  📊 返回结果数: ${response.data.hits?.length || 0}`);
      
      return { duration, resultCount: response.data.hits?.length || 0 };
    });
  }

  /**
   * 测试错误处理
   */
  async testErrorHandling() {
    console.log('\n❌ 测试错误处理...');
    
    await this.runTest('无效追踪数据处理测试', async () => {
      try {
        const invalidTrace = {
          // 缺少必要字段
          operation_name: 'invalid.test'
        };
        
        await axios.post(
          `${this.config.openobserveUrl}/api/${this.config.organization}/${this.streams.traces}/_json`,
          { traces: [invalidTrace] },
          {
            headers: {
              'Authorization': `Bearer ${this.config.token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        throw new Error('应该拒绝无效数据');
      } catch (error) {
        if (error.response?.status >= 400) {
          return '正确拒绝了无效数据';
        }
        throw error;
      }
    });

    await this.runTest('认证错误处理测试', async () => {
      try {
        await axios.post(
          `${this.config.openobserveUrl}/api/${this.config.organization}/${this.streams.traces}/_json`,
          { traces: [this.createTestTrace('auth.test')] },
          {
            headers: {
              'Authorization': 'Bearer invalid-token',
              'Content-Type': 'application/json'
            }
          }
        );
        
        throw new Error('应该拒绝无效认证');
      } catch (error) {
        if (error.response?.status === 401) {
          return '正确处理了认证错误';
        }
        throw error;
      }
    });
  }

  /**
   * 测试采样策略
   */
  async testSamplingStrategy() {
    console.log('\n🎯 测试采样策略...');
    
    await this.runTest('采样率测试', async () => {
      const traceCount = 100;
      const traces = [];
      
      for (let i = 0; i < traceCount; i++) {
        traces.push(this.createTestTrace(`sampling.test.${i}`));
      }
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.streams.traces}/_json`,
        { traces },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // 等待数据处理
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 查询实际存储的追踪数量
      const queryResponse = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: {
            sql: `SELECT count(*) as stored_count FROM ${this.streams.traces} WHERE operation_name LIKE 'sampling.test.%'`
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
      
      const storedCount = queryResponse.data.hits?.[0]?.stored_count || 0;
      const samplingRate = (storedCount / traceCount * 100).toFixed(2);
      
      console.log(`  📊 发送追踪数: ${traceCount}`);
      console.log(`  📊 存储追踪数: ${storedCount}`);
      console.log(`  📊 实际采样率: ${samplingRate}%`);
      
      return { sent: traceCount, stored: storedCount, samplingRate };
    });
  }

  /**
   * 测试跨服务追踪
   */
  async testCrossServiceTracing() {
    console.log('\n🔗 测试跨服务追踪...');
    
    await this.runTest('跨服务追踪链路测试', async () => {
      const traceId = this.generateTraceId();
      const parentSpanId = this.generateSpanId();
      
      // 创建父span
      const parentTrace = this.createTestTrace('parent.service', traceId, parentSpanId);
      
      // 创建子span
      const childTrace = this.createTestTrace('child.service', traceId, this.generateSpanId(), parentSpanId);
      
      // 发送追踪数据
      await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.streams.traces}/_json`,
        { traces: [parentTrace, childTrace] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // 等待数据处理
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 查询追踪链路
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: {
            sql: `SELECT * FROM ${this.streams.traces} WHERE trace_id = '${traceId}' ORDER BY start_time`
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
      
      if (!response.data.hits || response.data.hits.length < 2) {
        throw new Error('跨服务追踪链路不完整');
      }
      
      return response.data.hits;
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
   * 创建测试追踪数据
   */
  createTestTrace(operationName, traceId = null, spanId = null, parentSpanId = null) {
    const now = Date.now();
    
    return {
      trace_id: traceId || this.generateTraceId(),
      span_id: spanId || this.generateSpanId(),
      parent_span_id: parentSpanId,
      operation_name: operationName,
      service_name: this.config.serviceName,
      start_time: now * 1000000, // 纳秒
      end_time: (now + Math.random() * 1000) * 1000000, // 纳秒
      duration: Math.floor(Math.random() * 1000000000), // 纳秒
      status_code: 1,
      status_message: 'OK',
      tags: {
        'test.trace': 'true',
        'environment': process.env.NODE_ENV || 'development',
        'http.method': 'GET',
        'http.url': '/api/test',
        'http.status_code': 200
      },
      logs: [
        {
          timestamp: now * 1000000,
          fields: {
            message: `测试追踪日志: ${operationName}`,
            level: 'INFO'
          }
        }
      ]
    };
  }

  /**
   * 生成追踪ID
   */
  generateTraceId() {
    return Math.random().toString(16).substr(2, 32);
  }

  /**
   * 生成Span ID
   */
  generateSpanId() {
    return Math.random().toString(16).substr(2, 16);
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
      console.log('\n🎉 所有测试通过！分布式追踪系统运行正常。');
    } else {
      console.log('\n⚠️ 部分测试失败，请检查配置和连接。');
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const test = new DistributedTracingTest();
  test.runTests().catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}

module.exports = DistributedTracingTest;