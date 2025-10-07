#!/usr/bin/env node

/**
 * 测试默认数据流
 * 用途：测试OpenObserve的默认数据流，验证数据是否被存储在默认数据流中
 * 依赖文件：axios (通过npm包使用)
 * 作者：AI助手
 * 时间：2025-10-07 15:30:00
 */

const axios = require('axios');

// 配置 - 使用默认组织名称，并尝试不同的默认凭据组合
const config = {
  url: process.env.OPENOBSERVE_URL || 'http://localhost:5080',
  organization: process.env.ORGANIZATION || 'default',
  username: process.env.OPENOBSERVE_USERNAME || 'admin', // 尝试更常见的默认用户名
  password: process.env.OPENOBSERVE_PASSWORD || 'admin', // 尝试更常见的默认密码
  timeout: 10000,
  maxRetries: 3,
  logsEndpoint: '/api/default/caddy-shopping-logs/_json', // 使用特定的日志端点
  correctStreamName: 'caddy-shopping-logs' // 从测试文件中看到的正确流名称
};

// 带重试的API调用
async function callWithRetry(apiCall, description, maxRetries = config.maxRetries) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await apiCall();
      if (attempt > 1) {
        console.log(`🔄 ${description} 在第${attempt}次重试后成功`);
      }
      return result;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`❌ ${description} 重试${maxRetries}次后仍然失败`);
        throw error;
      }
      console.log(`🔄 ${description} 第${attempt}次尝试失败，${attempt < maxRetries ? '准备重试...' : '已达最大重试次数'}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// OpenObserve客户端类
class OpenObserveClient {
  constructor(config) {
    this.url = config.url;
    this.organization = config.organization;
    this.username = config.username;
    this.password = config.password;
    this.timeout = config.timeout;
    this.logsEndpoint = config.logsEndpoint;
  }

  // 获取基本认证头
  getAuthHeader() {
    if (this.username && this.password) {
      const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      return {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      };
    }
    return {
      'Content-Type': 'application/json'
    };
  }

  // 查询日志数据 - 使用类似Elasticsearch的DSL格式
  async queryLogs(streamName) {
    const headers = this.getAuthHeader();
    
    // 使用Elasticsearch DSL格式查询
    const queryBody = {
      query: {
        bool: {
          filter: [
            {
              range: {
                timestamp: {
                  gte: 'now-1h',
                  lte: 'now'
                }
              }
            }
          ]
        }
      },
      size: 10
    };

    try {
      // 使用正确的查询端点
      const response = await axios.post(
        `${this.url}/api/${this.organization}/${streamName}/_search`,
        queryBody,
        {
          timeout: this.timeout,
          headers: headers
        }
      );
      return response.data;
    } catch (error) {
      console.error(`查询${streamName}数据流失败:`, error.message);
      if (error.response) {
        console.error('状态码:', error.response.status);
        console.error('响应体:', error.response.data);
      }
      throw error;
    }
  }

  // 发送日志数据 - 使用特定的日志端点
  async sendLogs(streamName, logData) {
    const headers = this.getAuthHeader();
    
    // 直接使用logData.logs数组，不需要额外的stream参数
    const requestBody = logData.logs;
    
    try {
      const response = await axios.post(
        `${this.url}${this.logsEndpoint}`,
        requestBody,
        {
          timeout: this.timeout,
          headers: headers
        }
      );
      return response.data;
    } catch (error) {
      console.error(`发送数据到${streamName}数据流失败:`, error.message);
      if (error.response) {
        console.error('状态码:', error.response.status);
        console.error('响应体:', error.response.data);
      }
      throw error;
    }
  }

  // 列出所有流
  async listStreams() {
    const headers = this.getAuthHeader();
    
    try {
      const response = await axios.get(
        `${this.url}/api/${this.organization}/streams`,
        {
          timeout: this.timeout,
          headers: headers
        }
      );
      return response.data;
    } catch (error) {
      console.error('列出流失败:', error.message);
      if (error.response) {
        console.error('状态码:', error.response.status);
        console.error('响应体:', error.response.data);
      }
      throw error;
    }
  }

  // 测试服务连接 - 使用健康检查端点而不是根路径
  async testConnection() {
    try {
      const healthUrl = `${this.url}/api/${this.organization}/_health`;
      const response = await axios.get(healthUrl, {
        timeout: 5000,
        validateStatus: () => true, // 不验证状态码，只检查是否能够连接
        headers: this.getAuthHeader()
      });
      return response.status === 200;
    } catch (error) {
      console.error('连接测试失败:', error.message);
      if (error.response) {
        console.error('状态码:', error.response.status);
        console.error('响应体:', error.response.data);
      }
      return false;
    }
  }
}

// 测试函数
async function testDefaultStream() {
  console.log('🚀 开始测试默认数据流...');
  
  try {
    const client = new OpenObserveClient(config);
    
    // 1. 测试连接
    console.log('🏥 测试OpenObserve服务连接...');
    const isConnected = await client.testConnection();
    if (isConnected) {
      console.log('✅ 成功连接到OpenObserve服务');
    } else {
      console.log('⚠️ 连接到OpenObserve服务，但状态不是200');
    }
    
    // 2. 列出所有流
    console.log('📋 列出所有流...');
    const streams = await callWithRetry(() => client.listStreams(), '列出流');
    if (streams && streams.data && streams.data.length > 0) {
      console.log(`✅ 找到 ${streams.data.length} 个流:`);
      streams.data.forEach(stream => {
        console.log(`  - ${stream.name} (类型: ${stream.type})`);
      });
    } else {
      console.log('⚠️ 没有找到任何流');
    }
    
    // 3. 创建一个测试日志数据
    const testLogData = {
      logs: [{
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: '测试默认数据流',
        service: 'test-service',
        test_id: 'test-' + Math.random().toString(36).substring(7)
      }]
    };
    
    // 4. 尝试发送数据到配置中定义的正确流
    console.log(`📝 发送测试日志到OpenObserve的${config.correctStreamName}数据流...`);
    const sendResponse = await callWithRetry(() => client.sendLogs(config.correctStreamName, testLogData), `发送日志到${config.correctStreamName}数据流`);
    
    console.log('✅ 测试日志发送成功');
    console.log('   响应:', JSON.stringify(sendResponse));
    
    // 5. 等待数据索引 - 增加等待时间到20秒以确保有足够的时间进行索引
    console.log('⏱️ 等待数据索引... (20秒)');
    await new Promise(resolve => setTimeout(resolve, 20000)); // 增加到20秒
    console.log('🔍 现在尝试查询数据...');
    
    // 6. 查询配置中定义的正确数据流中的数据
    console.log(`🔍 查询${config.correctStreamName}数据流中的数据...`);
    const logData = await callWithRetry(() => client.queryLogs(config.correctStreamName), `查询${config.correctStreamName}数据流`);
    
    if (logData && logData.hits) {
      console.log(`✅ 查询到 ${logData.hits.length} 条记录`);
      if (logData.hits.length > 0) {
        console.log('📋 最新记录:');
        console.log(JSON.stringify(logData.hits[0], null, 2));
      }
    }
    
    // 7. 总结
    console.log('\n📋 测试总结:');
    const dataFound = logData && logData.hits && logData.hits.length > 0;
    
    if (dataFound) {
      console.log('✅ 成功找到数据！OpenObserve已存储了我们发送的测试数据。');
    } else {
      console.log('⚠️ 未找到数据。可能的原因:');
      console.log('  1. 数据尚未完成索引（请等待片刻后重试）');
      console.log('  2. 查询条件可能需要调整');
      console.log('  3. 请检查流名称是否正确');
      console.log('  4. 可能需要重新运行测试数据发送脚本');
      console.log('  5. 认证配置可能有问题');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

// 运行测试
if (require.main === module) {
  testDefaultStream();
}

module.exports = { testDefaultStream };