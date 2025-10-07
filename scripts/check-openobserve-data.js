// 用途：检查OpenObserve中是否存储了测试数据
// 依赖文件：无
// 作者：AI助手
// 时间：2025-10-06 18:40:00

const axios = require('axios');

// 配置信息 - 直接在脚本中定义，不依赖dotenv
// 注意：这里硬编码用户名和密码，确保与docker-compose.openobserve.yml中的配置一致
const config = {
  url: process.env.OPENOBSERVE_URL || 'http://localhost:5080',
  organization: process.env.ORGANIZATION || 'default',
  username: 'admin@example.com', // 硬编码为docker-compose中设置的用户名
  password: 'ComplexPass#123',   // 硬编码为docker-compose中设置的密码
  logStream: process.env.LOG_STREAM || 'application-logs', // 使用默认的流名称
  metricsStream: process.env.METRICS_STREAM || 'system-metrics', // 使用默认的流名称
  timeout: 10000,
  maxRetries: 3,
  queryLimit: 100
};

// 工具函数：带重试的API调用
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

// 工具函数
class OpenObserveClient {
  constructor(config) {
    this.url = config.url;
    this.organization = config.organization;
    this.username = config.username;
    this.password = config.password;
    this.logStream = config.logStream;
    this.metricsStream = config.metricsStream;
    this.timeout = config.timeout;
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

  // 查询日志数据 - 使用SQL语法
  async queryLogs() {
    const headers = this.getAuthHeader();
    
    // 构建查询请求体，使用SQL语法
    const queryBody = {
      query: {
        sql: `SELECT * FROM "${this.logStream}" WHERE _timestamp >= '2025-01-01T00:00:00Z' LIMIT 100`
      }
    };

    try {
      const response = await axios.post(
        `${this.url}/api/${this.organization}/_search`, // 使用正确的查询端点
        queryBody,
        {
          timeout: this.timeout,
          headers: headers
        }
      );
      return response.data;
    } catch (error) {
      console.error('查询日志失败:', error.message);
      if (error.response) {
        console.error('状态码:', error.response.status);
        console.error('响应体:', error.response.data);
      }
      return null;
    }
  }

  // 查询指标数据 - 使用SQL语法
  async queryMetrics() {
    const headers = this.getAuthHeader();
    
    // 构建查询请求体，使用SQL语法
    const queryBody = {
      query: {
        sql: `SELECT * FROM "${this.metricsStream}" WHERE _timestamp >= '2025-01-01T00:00:00Z' LIMIT 100`
      }
    };

    try {
      const response = await axios.post(
        `${this.url}/api/${this.organization}/_search`, // 使用正确的查询端点
        queryBody,
        {
          timeout: this.timeout,
          headers: headers
        }
      );
      return response.data;
    } catch (error) {
      console.error('查询指标失败:', error.message);
      if (error.response) {
        console.error('状态码:', error.response.status);
        console.error('响应体:', error.response.data);
      }
      return null;
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
      return null;
    }
  }
}

// 主函数
async function checkData() {
  console.log('🔍 开始检查OpenObserve数据存储情况...');
  console.log('\n🔧 配置信息:');
  console.log(`  - URL: ${config.url}`);
  console.log(`  - 组织: ${config.organization}`);
  console.log(`  - 用户名: ${config.username}`);
  console.log(`  - 日志流: ${config.logStream}`);
  console.log(`  - 指标流: ${config.metricsStream}`);

  const client = new OpenObserveClient(config);

  // 测试基本连接（不使用health端点，因为它返回404）
  console.log('\n🏥 测试OpenObserve服务连接...');
  try {
    // 尝试连接到根URL来验证服务是否可达
    const response = await axios.get(`${config.url}`, { 
      timeout: 5000,
      validateStatus: () => true // 不验证状态码，只检查是否能够连接
    });
    console.log('✅ 成功连接到OpenObserve服务');
  } catch (error) {
    console.error('❌ 无法连接到OpenObserve服务:', error.message);
    return;
  }

  // 列出所有流，确认我们的流是否存在
  console.log('\n📋 列出所有流...');
  const streams = await callWithRetry(() => client.listStreams(), '列出流');
  if (streams) {
    console.log('✅ 流列表获取成功');
    if (streams.data && streams.data.length > 0) {
      console.log(`  找到 ${streams.data.length} 个流:`);
      streams.data.forEach(stream => {
        console.log(`  - ${stream.name} (类型: ${stream.type})`);
      });
    } else {
      console.log('  没有找到任何流');
    }
  }

  // 查询日志数据 - 使用带重试的API调用
  console.log('\n📝 查询最近的日志数据...');
  const logData = await callWithRetry(() => client.queryLogs(), '查询日志数据');
  if (logData && logData.hits) {
    console.log(`✅ 日志查询成功，找到 ${logData.hits.length} 条记录`);
    if (logData.hits.length > 0) {
      console.log('  最新的3条日志:');
      logData.hits.slice(0, 3).forEach((log, index) => {
        console.log(`  ${index + 1}.`, JSON.stringify(log).substring(0, 150) + '...');
      });
    }
  }

  // 查询指标数据 - 使用带重试的API调用
  console.log('\n📊 查询最近的指标数据...');
  const metricsData = await callWithRetry(() => client.queryMetrics(), '查询指标数据');
  if (metricsData && metricsData.hits) {
    console.log(`✅ 指标查询成功，找到 ${metricsData.hits.length} 条记录`);
    if (metricsData.hits.length > 0) {
      console.log('  最新的3条指标:');
      metricsData.hits.slice(0, 3).forEach((metric, index) => {
        console.log(`  ${index + 1}.`, JSON.stringify(metric).substring(0, 150) + '...');
      });
    }
  }

  // 总结
  console.log('\n📋 检查总结:');
  const logFound = logData && logData.hits && logData.hits.length > 0;
  const metricsFound = metricsData && metricsData.hits && metricsData.hits.length > 0;
  
  if (logFound || metricsFound) {
    console.log('✅ 成功找到数据！OpenObserve已存储了我们发送的测试数据。');
    if (logFound) {
      console.log(`  - 日志记录数: ${logData.hits.length}`);
    }
    if (metricsFound) {
      console.log(`  - 指标记录数: ${metricsData.hits.length}`);
    }
  } else {
    console.log('⚠️ 未找到数据。可能的原因:');
    console.log('  1. 数据尚未完成索引（请等待片刻后重试）');
    console.log('  2. 查询条件可能需要调整');
    console.log('  3. 请检查流名称是否正确');
    console.log('  4. 可能需要重新运行测试数据发送脚本');
    console.log('  5. 认证配置可能有问题');
  }
}

// 运行检查
checkData().catch(err => {
  console.error('❌ 检查过程中发生错误:', err);
});