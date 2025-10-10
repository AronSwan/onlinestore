/**
 * OpenObserve 数据流初始化脚本
 * 用途：创建 OpenObserve 中所需的数据流（streams）
 * 依赖：Node.js, axios
 * 使用方法：node scripts/init-openobserve-streams.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { getOpenObserve } = require('./modules/openobserve-adapter');

// 从环境变量或默认值获取配置
const { baseUrl: ADAPTER_URL, organization: ADAPTER_ORG, token: ADAPTER_TOKEN } = getOpenObserve();
const OPENOBSERVE_URL = ADAPTER_URL || (process.env.OPENOBSERVE_URL || 'http://localhost:5080');
const OPENOBSERVE_ORG = ADAPTER_ORG || (process.env.OPENOBSERVE_ORGANIZATION || 'default');
const OPENOBSERVE_TOKEN = ADAPTER_TOKEN || process.env.OPENOBSERVE_TOKEN;
const OPENOBSERVE_USERNAME = process.env.OPENOBSERVE_USERNAME;
const OPENOBSERVE_PASSWORD = process.env.OPENOBSERVE_PASSWORD;

// 获取认证头
function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (OPENOBSERVE_TOKEN) {
    headers['Authorization'] = `Bearer ${OPENOBSERVE_TOKEN}`;
    return headers;
  }

  if (OPENOBSERVE_USERNAME && OPENOBSERVE_PASSWORD) {
    const credentials = Buffer.from(`${OPENOBSERVE_USERNAME}:${OPENOBSERVE_PASSWORD}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
    return headers;
  }

  return headers;
}

// 创建数据流
async function createStream(streamName, streamConfig) {
  try {
    const response = await axios.post(
      `${OPENOBSERVE_URL}/api/${OPENOBSERVE_ORG}/streams`,
      {
        name: streamName,
        ...streamConfig,
      },
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      }
    );
    
    console.log(`✅ Stream '${streamName}' created successfully`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log(`ℹ️  Stream '${streamName}' already exists`);
      return;
    }
    console.error(`❌ Failed to create stream '${streamName}':`, error.response?.data || error.message);
    throw error;
  }
}

// 创建组织（如果不存在）
async function ensureOrganization() {
  try {
    const response = await axios.get(
      `${OPENOBSERVE_URL}/api/organizations`,
      {
        headers: getAuthHeaders(),
        timeout: 10000,
      }
    );

    const orgExists = response.data.some(org => org.identifier === OPENOBSERVE_ORG);
    
    if (!orgExists) {
      console.log(`🔧 Creating organization '${OPENOBSERVE_ORG}'...`);
      await axios.post(
        `${OPENOBSERVE_URL}/api/organizations`,
        {
          identifier: OPENOBSERVE_ORG,
          name: OPENOBSERVE_ORG,
        },
        {
          headers: getAuthHeaders(),
          timeout: 10000,
        }
      );
      console.log(`✅ Organization '${OPENOBSERVE_ORG}' created successfully`);
    } else {
      console.log(`ℹ️  Organization '${OPENOBSERVE_ORG}' already exists`);
    }
  } catch (error) {
    console.error(`❌ Failed to ensure organization:`, error.response?.data || error.message);
    throw error;
  }
}

// 主初始化函数
async function initializeStreams() {
  console.log('🚀 Initializing OpenObserve streams...');
  
  try {
    // 首先确保组织存在
    await ensureOrganization();

    // 定义数据流配置
    const streams = [
      {
        name: 'application-logs',
        description: 'Application logs from caddy shopping site',
        schema: {
          timestamp: 'string',
          level: 'string',
          message: 'string',
          service: 'string',
          environment: 'string',
          version: 'string',
          host: 'string',
          pid: 'number',
          traceId: 'string',
          spanId: 'string',
          userId: 'string',
          requestId: 'string',
          method: 'string',
          url: 'string',
          statusCode: 'number',
          responseTime: 'number',
          userAgent: 'string',
          ip: 'string',
        },
        settings: {
          max_query_range: '7d',
          partition_keys: ['service', 'environment'],
          full_text_search_keys: ['message'],
        },
      },
      {
        name: 'traces',
        description: 'Distributed tracing data',
        schema: {
          trace_id: 'string',
          span_id: 'string',
          parent_span_id: 'string',
          operation_name: 'string',
          start_time: 'number',
          duration: 'number',
          tags: 'object',
          status: 'number',
          service_name: 'string',
          resource: 'object',
          timestamp: 'string',
        },
        settings: {
          max_query_range: '7d',
          partition_keys: ['service_name'],
          full_text_search_keys: ['operation_name'],
        },
      },
      {
        name: 'metrics',
        description: 'Application metrics and performance data',
        schema: {
          metric_name: 'string',
          value: 'number',
          labels: 'object',
          timestamp: 'string',
          service: 'string',
          environment: 'string',
        },
        settings: {
          max_query_range: '30d',
          partition_keys: ['metric_name', 'service'],
          full_text_search_keys: ['metric_name'],
        },
      },
      {
        name: 'business-events',
        description: 'Business events and analytics',
        schema: {
          event_type: 'string',
          user_id: 'string',
          timestamp: 'string',
          properties: 'object',
          service: 'string',
          environment: 'string',
        },
        settings: {
          max_query_range: '90d',
          partition_keys: ['event_type', 'user_id'],
          full_text_search_keys: ['event_type'],
        },
      },
      {
        name: 'security-events',
        description: 'Security and audit events',
        schema: {
          event_type: 'string',
          severity: 'string',
          user_id: 'string',
          ip: 'string',
          user_agent: 'string',
          timestamp: 'string',
          details: 'object',
        },
        settings: {
          max_query_range: '365d',
          partition_keys: ['event_type', 'severity'],
          full_text_search_keys: ['event_type', 'user_id'],
        },
      },
      {
        name: 'http-requests',
        description: 'HTTP request logs and metrics',
        schema: {
          method: 'string',
          url: 'string',
          status_code: 'number',
          response_time: 'number',
          user_id: 'string',
          ip: 'string',
          user_agent: 'string',
          timestamp: 'string',
          service: 'string',
        },
        settings: {
          max_query_range: '30d',
          partition_keys: ['method', 'status_code'],
          full_text_search_keys: ['url'],
        },
      },
      {
        name: 'database-queries',
        description: 'Database query logs and performance',
        schema: {
          query: 'string',
          operation: 'string',
          table: 'string',
          duration: 'number',
          affected_rows: 'number',
          timestamp: 'string',
          service: 'string',
        },
        settings: {
          max_query_range: '30d',
          partition_keys: ['operation', 'table'],
          full_text_search_keys: ['query'],
        },
      },
    ];

    // 创建所有数据流
    for (const stream of streams) {
      await createStream(stream.name, stream);
    }

    console.log('🎉 All streams initialized successfully');
    console.log('\n📊 Stream Summary:');
    streams.forEach(stream => {
      console.log(`  - ${stream.name}: ${stream.description}`);
    });

    console.log('\n🌐 Access OpenObserve:');
    console.log(`  Web UI: ${OPENOBSERVE_URL}`);
    console.log(`  API: ${OPENOBSERVE_URL}/api`);
    console.log(`  Organization: ${OPENOBSERVE_ORG}`);

  } catch (error) {
    console.error('❌ Failed to initialize streams:', error.message);
    process.exit(1);
  }
}

// 检查 OpenObserve 连接
async function checkConnection() {
  try {
    const response = await axios.get(
      `${OPENOBSERVE_URL}/api/_health`,
      {
        timeout: 5000,
      }
    );
    
    if (response.status === 200) {
      console.log('✅ OpenObserve is running and healthy');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Cannot connect to OpenObserve:', error.message);
    console.log('\n💡 Make sure OpenObserve is running:');
    console.log('  docker-compose -f docker/openobserve/docker-compose.yml up -d');
    return false;
  }
}

// 主执行函数
async function main() {
  console.log('🔍 Checking OpenObserve connection...');
  
  const isConnected = await checkConnection();
  if (!isConnected) {
    process.exit(1);
  }

  await initializeStreams();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = {
  initializeStreams,
  createStream,
  ensureOrganization,
  checkConnection,
};