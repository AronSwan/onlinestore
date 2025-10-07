/**
 * 高级查询分析系统测试脚本
 * 测试高级查询、聚合和分析功能
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

class AdvancedQueryAnalyticsTest {
  constructor() {
    this.config = {
      openobserveUrl: process.env.OPENOBSERVE_URL || 'http://localhost:5080',
      organization: process.env.OPENOBSERVE_ORGANIZATION || 'default',
      token: process.env.OPENOBSERVE_TOKEN || '',
      queryLogStream: process.env.QUERY_LOG_STREAM || 'query-log',
      savedQueryStream: process.env.SAVED_QUERY_STREAM || 'saved-query',
      testTimeout: 30000
    };
    
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
    
    this.testQueryId = this.generateQueryId();
  }

  /**
   * 执行完整的高级查询分析测试
   */
  async runTests() {
    console.log('🧪 开始高级查询分析系统测试...');
    console.log('=====================================');
    
    const startTime = performance.now();
    
    try {
      // 1. 基础连接测试
      await this.testConnection();
      
      // 2. 数据流测试
      await this.testStreams();
      
      // 3. 基础查询测试
      await this.testBasicQueries();
      
      // 4. 聚合查询测试
      await this.testAggregationQueries();
      
      // 5. 时间序列查询测试
      await this.testTimeSeriesQueries();
      
      // 6. 过滤查询测试
      await this.testFilterQueries();
      
      // 7. 排序查询测试
      await this.testSortingQueries();
      
      // 8. 查询模板测试
      await this.testQueryTemplates();
      
      // 9. 保存查询测试
      await this.testSavedQueries();
      
      // 10. 缓存功能测试
      await this.testCachingFunctionality();
      
      // 11. 查询性能测试
      await this.testQueryPerformance();
      
      // 12. 数据导出测试
      await this.testDataExport();
      
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
    
    await this.runTest('查询日志数据流存在性测试', async () => {
      const response = await axios.get(
        `${this.config.openobserveUrl}/api/${this.config.organization}/streams`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`
          }
        }
      );
      
      const streams = response.data.list || [];
      const queryLogStream = streams.find(s => s.name === this.config.queryLogStream);
      
      if (!queryLogStream) {
        throw new Error(`查询日志数据流不存在: ${this.config.queryLogStream}`);
      }
      
      return queryLogStream;
    });

    await this.runTest('保存的查询数据流存在性测试', async () => {
      const response = await axios.get(
        `${this.config.openobserveUrl}/api/${this.config.organization}/streams`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`
          }
        }
      );
      
      const streams = response.data.list || [];
      const savedQueryStream = streams.find(s => s.name === this.config.savedQueryStream);
      
      if (!savedQueryStream) {
        throw new Error(`保存的查询数据流不存在: ${this.config.savedQueryStream}`);
      }
      
      return savedQueryStream;
    });
  }

  /**
   * 测试基础查询
   */
  async testBasicQueries() {
    console.log('\n🔍 测试基础查询...');
    
    await this.runTest('简单SELECT查询测试', async () => {
      const query = "SELECT * FROM application-logs WHERE timestamp >= now() - INTERVAL '1 hour' LIMIT 10";
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: { sql: query },
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
      
      return response.data;
    });

    await this.runTest('COUNT聚合查询测试', async () => {
      const query = "SELECT COUNT(*) as total_count FROM application-logs WHERE timestamp >= now() - INTERVAL '1 hour'";
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: { sql: query },
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
      
      return response.data;
    });
  }

  /**
   * 测试聚合查询
   */
  async testAggregationQueries() {
    console.log('\n📊 测试聚合查询...');
    
    await this.runTest('GROUP BY聚合查询测试', async () => {
      const query = "SELECT level, COUNT(*) as count FROM application-logs WHERE timestamp >= now() - INTERVAL '1 hour' GROUP BY level";
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: { sql: query },
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
      
      return response.data;
    });

    await this.runTest('AVG聚合查询测试', async () => {
      const query = "SELECT AVG(duration) as avg_duration FROM request-traces WHERE timestamp >= now() - INTERVAL '1 hour'";
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: { sql: query },
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
      
      return response.data;
    });

    await this.runTest('百分位数查询测试', async () => {
      const query = "SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY duration) as p95_duration FROM request-traces WHERE timestamp >= now() - INTERVAL '1 hour'";
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: { sql: query },
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
      
      return response.data;
    });
  }

  /**
   * 测试时间序列查询
   */
  async testTimeSeriesQueries() {
    console.log('\n⏰ 测试时间序列查询...');
    
    await this.runTest('时间桶聚合查询测试', async () => {
      const query = "SELECT time_bucket('5 minute', timestamp) as time_bucket, COUNT(*) as count FROM application-logs WHERE timestamp >= now() - INTERVAL '1 hour' GROUP BY time_bucket ORDER BY time_bucket";
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: { sql: query },
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
      
      return response.data;
    });
  }

  /**
   * 测试过滤查询
   */
  async testFilterQueries() {
    console.log('\n🔍 测试过滤查询...');
    
    await this.runTest('WHERE条件过滤测试', async () => {
      const query = "SELECT * FROM application-logs WHERE level = 'ERROR' AND timestamp >= now() - INTERVAL '1 hour' LIMIT 10";
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: { sql: query },
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
      
      return response.data;
    });

    await this.runTest('LIKE条件过滤测试', async () => {
      const query = "SELECT * FROM application-logs WHERE message LIKE '%error%' AND timestamp >= now() - INTERVAL '1 hour' LIMIT 10";
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: { sql: query },
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
      
      return response.data;
    });

    await this.runTest('IN条件过滤测试', async () => {
      const query = "SELECT * FROM application-logs WHERE level IN ('ERROR', 'WARN') AND timestamp >= now() - INTERVAL '1 hour' LIMIT 10";
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: { sql: query },
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
      
      return response.data;
    });
  }

  /**
   * 测试排序查询
   */
  async testSortingQueries() {
    console.log('\n📊 测试排序查询...');
    
    await this.runTest('ORDER BY排序测试', async () => {
      const query = "SELECT * FROM application-logs WHERE timestamp >= now() - INTERVAL '1 hour' ORDER BY timestamp DESC LIMIT 10";
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: { sql: query },
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
      
      return response.data;
    });

    await this.runTest('多字段排序测试', async () => {
      const query = "SELECT * FROM application-logs WHERE timestamp >= now() - INTERVAL '1 hour' ORDER BY level ASC, timestamp DESC LIMIT 10";
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: { sql: query },
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
      
      return response.data;
    });
  }

  /**
   * 测试查询模板
   */
  async testQueryTemplates() {
    console.log('\n📝 测试查询模板...');
    
    await this.runTest('页面浏览统计模板测试', async () => {
      const template = "SELECT pageUrl, COUNT(*) as page_views FROM {{stream}} WHERE timestamp >= {{startTime}} AND timestamp <= {{endTime}} GROUP BY pageUrl ORDER BY page_views DESC LIMIT {{limit}}";
      const query = template
        .replace(/\{\{stream\}\}/g, 'application-logs')
        .replace(/\{\{startTime\}\}/g, "now() - INTERVAL '1 hour'")
        .replace(/\{\{endTime\}\}/g, 'now()')
        .replace(/\{\{limit\}\}/g, '10');
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: { sql: query },
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
      
      return response.data;
    });

    await this.runTest('用户会话分析模板测试', async () => {
      const template = "SELECT sessionId, MIN(timestamp) as session_start, MAX(timestamp) as session_end, COUNT(*) as events FROM {{stream}} WHERE timestamp >= {{startTime}} AND timestamp <= {{endTime}} GROUP BY sessionId ORDER BY session_start DESC LIMIT {{limit}}";
      const query = template
        .replace(/\{\{stream\}\}/g, 'application-logs')
        .replace(/\{\{startTime\}\}/g, "now() - INTERVAL '1 hour'")
        .replace(/\{\{endTime\}\}/g, 'now()')
        .replace(/\{\{limit\}\}/g, '10');
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: { sql: query },
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
      
      return response.data;
    });
  }

  /**
   * 测试保存的查询
   */
  async testSavedQueries() {
    console.log('\n💾 测试保存的查询...');
    
    // 先保存一个查询
    const savedQuery = {
      name: 'test_saved_query',
      description: '测试保存的查询',
      query: "SELECT level, COUNT(*) as count FROM application-logs WHERE timestamp >= now() - INTERVAL '1 hour' GROUP BY level",
      streams: ['application-logs'],
      timeRange: { start: 'now-1h', end: 'now' },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await this.runTest('保存查询测试', async () => {
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/${this.config.savedQueryStream}/_json`,
        { queries: [savedQuery] },
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status !== 200) {
        throw new Error(`保存查询失败: ${response.status}`);
      }
      
      return response.data;
    });

    await this.runTest('获取保存的查询测试', async () => {
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: {
            sql: `SELECT * FROM ${this.config.savedQueryStream} WHERE name = 'test_saved_query' LIMIT 1`
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
        throw new Error('未找到保存的查询');
      }
      
      return response.data.hits[0];
    });
  }

  /**
   * 测试缓存功能
   */
  async testCachingFunctionality() {
    console.log('\n💾 测试缓存功能...');
    
    const query = "SELECT COUNT(*) as count FROM application-logs WHERE timestamp >= now() - INTERVAL '1 hour'";
    
    await this.runTest('查询缓存测试', async () => {
      // 第一次查询
      const startTime1 = performance.now();
      const response1 = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: { sql: query },
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
      const endTime1 = performance.now();
      const duration1 = endTime1 - startTime1;
      
      // 第二次查询（应该更快，如果缓存生效）
      const startTime2 = performance.now();
      const response2 = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: { sql: query },
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
      const endTime2 = performance.now();
      const duration2 = endTime2 - startTime2;
      
      return {
        firstQuery: { duration: duration1, result: response1.data },
        secondQuery: { duration: duration2, result: response2.data },
        cacheEffect: duration2 < duration1
      };
    });
  }

  /**
   * 测试查询性能
   */
  async testQueryPerformance() {
    console.log('\n⚡ 测试查询性能...');
    
    await this.runTest('简单查询性能测试', async () => {
      const query = "SELECT COUNT(*) as count FROM application-logs WHERE timestamp >= now() - INTERVAL '1 hour'";
      
      const startTime = performance.now();
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: { sql: query },
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
      
      return {
        duration,
        resultCount: response.data.hits?.length || 0,
        response: response.data
      };
    });

    await this.runTest('复杂查询性能测试', async () => {
      const query = "SELECT level, COUNT(*) as count, AVG(timestamp) as avg_timestamp FROM application-logs WHERE timestamp >= now() - INTERVAL '1 hour' GROUP BY level ORDER BY count DESC";
      
      const startTime = performance.now();
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: { sql: query },
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
      
      return {
        duration,
        resultCount: response.data.hits?.length || 0,
        response: response.data
      };
    });
  }

  /**
   * 测试数据导出
   */
  async testDataExport() {
    console.log('\n📤 测试数据导出...');
    
    await this.runTest('JSON格式导出测试', async () => {
      const query = "SELECT level, COUNT(*) as count FROM application-logs WHERE timestamp >= now() - INTERVAL '1 hour' GROUP BY level";
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: { sql: query },
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
      
      // 模拟导出为JSON
      const jsonData = JSON.stringify(response.data, null, 2);
      
      return {
        format: 'json',
        size: jsonData.length,
        data: jsonData
      };
    });

    await this.runTest('CSV格式导出测试', async () => {
      const query = "SELECT level, COUNT(*) as count FROM application-logs WHERE timestamp >= now() - INTERVAL '1 hour' GROUP BY level";
      
      const response = await axios.post(
        `${this.config.openobserveUrl}/api/${this.config.organization}/_search`,
        {
          query: { sql: query },
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
      
      // 模拟导出为CSV
      const data = response.data.hits || [];
      let csvData = 'level,count\n';
      data.forEach(row => {
        csvData += `${row.level},${row.count}\n`;
      });
      
      return {
        format: 'csv',
        size: csvData.length,
        data: csvData
      };
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
   * 生成查询ID
   */
  generateQueryId() {
    return 'query_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
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
      console.log('\n🎉 所有测试通过！高级查询分析系统运行正常。');
    } else {
      console.log('\n⚠️ 部分测试失败，请检查配置和连接。');
    }
    
    console.log('\n🔗 测试数据查询:');
    console.log(`  查询ID: ${this.testQueryId}`);
    console.log(`  查询日志流: ${this.config.queryLogStream}`);
    console.log(`  保存的查询流: ${this.config.savedQueryStream}`);
    console.log(`  查询链接: ${this.config.openobserveUrl}/web/#/streams?stream=${this.config.queryLogStream}`);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const test = new AdvancedQueryAnalyticsTest();
  test.runTests().catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}

module.exports = AdvancedQueryAnalyticsTest;