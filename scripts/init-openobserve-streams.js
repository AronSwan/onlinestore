#!/usr/bin/env node

/**
 * OpenObserve数据流初始化脚本
 * 用于创建和配置OpenObserve中的数据流
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 配置参数
const OPENOBSERVE_URL = process.env.OPENOBSERVE_URL || 'http://localhost:5080';
const OPENOBSERVE_ORGANIZATION = process.env.OPENOBSERVE_ORGANIZATION || 'default';
const OPENOBSERVE_ROOT_USER_EMAIL = process.env.OPENOBSERVE_ROOT_USER_EMAIL || 'admin@example.com';
const OPENOBSERVE_ROOT_USER_PASSWORD = process.env.OPENOBSERVE_ROOT_USER_PASSWORD || 'CHANGE_ME_openobserve_password';

// 数据流配置
const streams = [
  {
    name: 'application-logs',
    type: 'logs',
    retention: '30d',
    description: '应用程序日志数据流',
    schema: {
      timestamp: 'string',
      level: 'string',
      message: 'string',
      service: 'string',
      trace_id: 'string',
      span_id: 'string',
      user_id: 'string',
      request_id: 'string',
      ip_address: 'string',
      user_agent: 'string',
      response_time: 'number',
      status_code: 'number'
    }
  },
  {
    name: 'system-metrics',
    type: 'metrics',
    retention: '90d',
    description: '系统指标数据流',
    schema: {
      timestamp: 'string',
      metric_name: 'string',
      metric_type: 'string',
      value: 'number',
      labels: 'object',
      instance: 'string',
      job: 'string'
    }
  },
  {
    name: 'request-traces',
    type: 'traces',
    retention: '7d',
    description: '请求追踪数据流',
    schema: {
      timestamp: 'string',
      trace_id: 'string',
      span_id: 'string',
      parent_span_id: 'string',
      operation_name: 'string',
      service_name: 'string',
      duration: 'number',
      status: 'string',
      tags: 'object',
      logs: 'array'
    }
  },
  {
    name: 'business-events',
    type: 'logs',
    retention: '365d',
    description: '业务事件数据流',
    schema: {
      timestamp: 'string',
      event_type: 'string',
      event_name: 'string',
      user_id: 'string',
      session_id: 'string',
      properties: 'object',
      source: 'string',
      version: 'string'
    }
  }
];

// 获取认证令牌
async function getAuthToken() {
  try {
    const response = await axios.post(`${OPENOBSERVE_URL}/api/auth/login`, {
      email: OPENOBSERVE_ROOT_USER_EMAIL,
      password: OPENOBSERVE_ROOT_USER_PASSWORD
    });
    
    return response.data.data.token;
  } catch (error) {
    console.error('获取认证令牌失败:', error.message);
    throw error;
  }
}

// 创建数据流
async function createStream(authToken, streamConfig) {
  try {
    const response = await axios.post(
      `${OPENOBSERVE_URL}/api/${OPENOBSERVE_ORGANIZATION}/streams`,
      streamConfig,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✓ 成功创建数据流: ${streamConfig.name}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 409) {
      console.log(`⚠ 数据流已存在: ${streamConfig.name}`);
      return null;
    }
    console.error(`✗ 创建数据流失败: ${streamConfig.name}`, error.message);
    throw error;
  }
}

// 验证数据流
async function verifyStream(authToken, streamName) {
  try {
    const response = await axios.get(
      `${OPENOBSERVE_URL}/api/${OPENOBSERVE_ORGANIZATION}/streams/${streamName}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    console.log(`✓ 数据流验证成功: ${streamName}`);
    return response.data;
  } catch (error) {
    console.error(`✗ 数据流验证失败: ${streamName}`, error.message);
    throw error;
  }
}

// 主函数
async function initStreams() {
  console.log('🚀 开始初始化OpenObserve数据流...');
  
  try {
    // 获取认证令牌
    console.log('📝 获取认证令牌...');
    const authToken = await getAuthToken();
    console.log('✓ 认证令牌获取成功');
    
    // 创建数据流
    console.log('\n📊 创建数据流...');
    for (const stream of streams) {
      await createStream(authToken, stream);
    }
    
    // 验证数据流
    console.log('\n🔍 验证数据流...');
    for (const stream of streams) {
      await verifyStream(authToken, stream.name);
    }
    
    console.log('\n🎉 OpenObserve数据流初始化完成！');
    console.log('\n📋 已创建的数据流:');
    streams.forEach(stream => {
      console.log(`  - ${stream.name} (${stream.type}) - ${stream.description}`);
    });
    
  } catch (error) {
    console.error('\n❌ 初始化失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initStreams();
}

module.exports = {
  initStreams,
  streams
};