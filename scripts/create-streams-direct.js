#!/usr/bin/env node

/**
 * 直接创建OpenObserve数据流脚本
 * 绕过认证，直接向默认组织发送数据来创建数据流
 */

const axios = require('axios');

const OPENOBSERVE_URL = 'http://localhost:5080';

// 数据流配置
const streams = [
  {
    name: 'application-logs',
    type: 'logs',
    sampleData: {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: '应用程序日志测试消息',
      service: 'web-app',
      trace_id: 'test-trace-id',
      span_id: 'test-span-id',
      user_id: 'test-user',
      request_id: 'test-request',
      ip_address: '127.0.0.1',
      user_agent: 'test-agent',
      response_time: 100,
      status_code: 200
    }
  },
  {
    name: 'system-metrics',
    type: 'metrics',
    sampleData: {
      timestamp: new Date().toISOString(),
      metric_name: 'cpu_usage',
      metric_type: 'gauge',
      value: 75.5,
      labels: {
        instance: 'localhost',
        job: 'node-exporter'
      },
      instance: 'localhost:9100',
      job: 'node-exporter'
    }
  },
  {
    name: 'request-traces',
    type: 'traces',
    sampleData: {
      timestamp: new Date().toISOString(),
      trace_id: 'test-trace-123',
      span_id: 'test-span-456',
      parent_span_id: 'test-parent-789',
      operation_name: 'GET /api/products',
      service_name: 'web-app',
      duration: 150,
      status: 'ok',
      tags: {
        'http.method': 'GET',
        'http.status_code': '200'
      },
      logs: []
    }
  },
  {
    name: 'business-events',
    type: 'logs',
    sampleData: {
      timestamp: new Date().toISOString(),
      event_type: 'user_action',
      event_name: 'product_view',
      user_id: 'test-user-123',
      session_id: 'test-session-456',
      properties: {
        product_id: 'prod-123',
        category: 'electronics'
      },
      source: 'web-app',
      version: '1.0.0'
    }
  }
];

async function createStreamByData(streamConfig) {
  console.log(`📊 创建数据流: ${streamConfig.name}`);
  
  try {
    // 通过发送数据来创建数据流
    const response = await axios.post(
      `${OPENOBSERVE_URL}/api/default/${streamConfig.name}/_json`,
      streamConfig.sampleData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✓ 数据流创建成功: ${streamConfig.name}`);
    console.log(`  响应状态: ${response.status}`);
    console.log(`  响应数据:`, response.data);
    return true;
  } catch (error) {
    console.log(`❌ 数据流创建失败: ${streamConfig.name}`);
    console.log(`  错误状态: ${error.response?.status}`);
    console.log(`  错误信息:`, error.response?.data || error.message);
    return false;
  }
}

async function verifyStream(streamName) {
  console.log(`🔍 验证数据流: ${streamName}`);
  
  try {
    const response = await axios.get(
      `${OPENOBSERVE_URL}/api/default/${streamName}/_search`,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          query: {
            match_all: {}
          },
          size: 1
        }
      }
    );
    
    console.log(`✓ 数据流验证成功: ${streamName}`);
    console.log(`  搜索结果: ${response.data.hits?.total?.value || 0} 条记录`);
    return true;
  } catch (error) {
    console.log(`❌ 数据流验证失败: ${streamName}`);
    console.log(`  错误信息:`, error.response?.data || error.message);
    return false;
  }
}

async function listStreams() {
  console.log('\n📋 列出所有数据流...');
  
  try {
    const response = await axios.get(`${OPENOBSERVE_URL}/api/default/streams`);
    console.log('✓ 数据流列表获取成功:');
    response.data.list?.forEach(stream => {
      console.log(`  - ${stream.name} (${stream.type})`);
    });
    return response.data.list || [];
  } catch (error) {
    console.log('❌ 数据流列表获取失败:', error.response?.data || error.message);
    return [];
  }
}

async function main() {
  console.log('🚀 开始直接创建OpenObserve数据流...');
  
  try {
    // 创建数据流
    console.log('\n📊 创建数据流...');
    let successCount = 0;
    
    for (const stream of streams) {
      const success = await createStreamByData(stream);
      if (success) successCount++;
      
      // 等待一下再创建下一个
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n📈 创建结果: ${successCount}/${streams.length} 个数据流创建成功`);
    
    // 验证数据流
    console.log('\n🔍 验证数据流...');
    for (const stream of streams) {
      await verifyStream(stream.name);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 列出所有数据流
    await listStreams();
    
    console.log('\n🎉 OpenObserve数据流配置完成！');
    
  } catch (error) {
    console.error('\n❌ 配置失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  createStreamByData,
  verifyStream,
  listStreams
};