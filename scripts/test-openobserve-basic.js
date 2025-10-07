#!/usr/bin/env node

/**
 * OpenObserve增强版测试脚本
 * 用途：提供健壮的OpenObserve功能测试，包括健康检查、重试机制、性能监控等
 * 依赖文件：axios (通过npm包使用), openobserve-config.json (配置文件)
 * 作者：AI助手
 * 时间：2025-01-26 16:45:00
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 配置管理
class OpenObserveConfig {
  constructor(options = {}) {
    this.environment = options.environment || process.env.OPENOBSERVE_ENV || 'development';
    this.mockMode = options.mockMode || process.env.OPENOBSERVE_MOCK_MODE === 'true' || false;
    
    // 加载配置文件
    this.loadConfigFromFile();
    
    // 合并配置优先级：options > 环境变量 > 配置文件 > 默认值
    const config = this.getMergedConfig(options);
    
    this.url = config.url;
    this.organization = config.organization || 'default'; // 默认组织名称为'default'
    this.username = config.username || 'admin@example.com';
    this.password = config.password || 'ComplexPass#123';
    this.logStream = config.logStream || 'application-logs';
    this.metricsStream = config.metricsStream || 'system-metrics';
    this.timeout = config.timeout;
    this.maxRetries = config.maxRetries;
    this.indexWaitTime = config.indexWaitTime;
    this.queryLimit = config.queryLimit;
    
    // JWT token缓存
    this.authToken = null;
    this.tokenExpiry = null;
  }
  
  loadConfigFromFile() {
    const configPath = path.join(__dirname, 'openobserve-config.json');
    try {
      if (fs.existsSync(configPath)) {
        this.fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } else {
        this.fileConfig = {};
        console.log('⚠️  配置文件不存在，使用默认配置');
      }
    } catch (error) {
      console.warn('⚠️  配置文件读取失败:', error.message);
      this.fileConfig = {};
    }
  }
  
  getMergedConfig(options) {
    const envConfig = this.fileConfig[this.environment] || {};
    
    return {
      url: options.url || process.env.OPENOBSERVE_URL || envConfig.url || 'http://localhost:5080',
      organization: options.organization || process.env.OPENOBSERVE_ORGANIZATION || envConfig.organization || 'default',
      username: options.username || process.env.OPENOBSERVE_USERNAME || envConfig.username || 'admin@example.com',
      password: options.password || process.env.OPENOBSERVE_PASSWORD || envConfig.password || 'Complexpass#123',
      logStream: options.logStream || process.env.OPENOBSERVE_LOG_STREAM || envConfig.logStream || 'application-logs',
      metricsStream: options.metricsStream || process.env.OPENOBSERVE_METRICS_STREAM || envConfig.metricsStream || 'system-metrics',
      timeout: options.timeout || parseInt(process.env.OPENOBSERVE_TIMEOUT) || envConfig.timeout || 30000,
      maxRetries: options.maxRetries || parseInt(process.env.OPENOBSERVE_MAX_RETRIES) || envConfig.maxRetries || 3,
      indexWaitTime: options.indexWaitTime || parseInt(process.env.OPENOBSERVE_INDEX_WAIT_TIME) || envConfig.indexWaitTime || 2000,
      queryLimit: options.queryLimit || parseInt(process.env.OPENOBSERVE_QUERY_LIMIT) || envConfig.queryLimit || 100
    };
  }

  validate() {
    if (this.mockMode) {
      console.log('🔧 模拟模式已启用，跳过真实API调用');
      return;
    }
    
    const errors = [];
    
    if (!this.url) {
      errors.push('OPENOBSERVE_URL环境变量未设置');
    }
    
    if (!this.url.startsWith('http')) {
      errors.push('OPENOBSERVE_URL格式不正确，必须以http或https开头');
    }
    
    if (!this.organization) {
      errors.push('OPENOBSERVE_ORGANIZATION环境变量未设置');
    }
    
    if (errors.length > 0) {
      throw new Error(`配置验证失败: ${errors.join('; ')}`);
    }
    
    return true;
  }

  // 生成认证头（使用基本认证）
  getAuthHeader() {
    if (this.mockMode) {
      return {
        'Authorization': 'Basic bW9ja19tb2Rl',
        'Content-Type': 'application/json'
      };
    }
    
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
  
  getApiUrl(streamType, endpoint = '') {
    // OpenObserve的正确API端点格式应该是在请求体中指定stream参数
    // 而不是在URL路径中包含stream名称
    return `${this.url}/api/${this.organization}/_bulk`;
  }
}

let config = new OpenObserveConfig();

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

// 工具函数：性能监控
async function measureExecutionTime(fn, description) {
  const startTime = Date.now();
  const result = await fn();
  const duration = Date.now() - startTime;
  console.log(`⏱️ ${description} 耗时: ${duration}ms`);
  return { result, duration };
}

// 测试数据生成器
class TestDataGenerator {
  static generateLogs(count = 5) {
    const logs = [];
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const services = ['web-service', 'api-service', 'auth-service', 'database-service'];
    
    for (let i = 0; i < count; i++) {
      logs.push({
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        level: levels[Math.floor(Math.random() * levels.length)],
        message: `测试日志消息 ${i + 1} - ${Math.random().toString(36).substring(7)}`,
        service: services[Math.floor(Math.random() * services.length)],
        trace_id: `trace-${Math.random().toString(36).substring(2, 10)}`,
        user_id: `user-${Math.floor(Math.random() * 1000)}`,
        request_id: `req-${Math.random().toString(36).substring(2, 8)}`
      });
    }
    return { logs };
  }

  static generateMetrics(count = 3) {
    const metrics = [];
    const metricTypes = ['gauge', 'counter', 'histogram'];
    const metricNames = ['cpu_usage', 'memory_usage', 'response_time', 'error_rate'];
    
    for (let i = 0; i < count; i++) {
      metrics.push({
        timestamp: new Date().toISOString(),
        metric_name: metricNames[Math.floor(Math.random() * metricNames.length)],
        metric_type: metricTypes[Math.floor(Math.random() * metricTypes.length)],
        value: Math.random() * 100,
        labels: {
          instance: `instance-${Math.floor(Math.random() * 5)}`,
          job: `job-${Math.floor(Math.random() * 3)}`,
          environment: process.env.NODE_ENV || 'test'
        }
      });
    }
    return { metrics };
  }
}

// 健康检查
async function checkOpenObserveHealth() {
  console.log('🏥 检查OpenObserve服务健康状态...');
  
  if (config.mockMode) {
    console.log('✅ 模拟模式：OpenObserve服务健康状态正常');
    return true;
  }
  
  try {
    const headers = config.getAuthHeader();
    const response = await axios.get(`${config.url}/`, {
      timeout: config.timeout,
      headers: headers
    });
    
    if (response.status === 200) {
      console.log('✅ OpenObserve服务健康状态正常');
      return true;
    } else {
      console.log(`⚠️ OpenObserve服务状态: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ OpenObserve服务健康检查失败:', error.message);
    return false;
  }
}

// 发送测试日志
async function sendTestLogs() {
  if (config.mockMode) {
    console.log('✅ 模拟模式：日志发送成功');
    return { status: 'success', message: 'Mock mode: Logs sent successfully' };
  }
  
  // 生成测试日志数据
  const testLogData = TestDataGenerator.generateLogs(5);
  
  const apiCall = async () => {
    console.log('📝 发送测试日志到OpenObserve...');
    const headers = config.getAuthHeader();
    // 构建包含stream参数的请求体
    const requestBody = {
      stream: config.logStream,
      ...testLogData
    };
    const response = await axios.post(
      config.getApiUrl('logs'),
      requestBody,
      {
        timeout: config.timeout,
        headers: headers
      }
    );
    
    console.log('✅ 测试日志发送成功');
    return response.data;
  };
  
  return await callWithRetry(apiCall, '发送测试日志');
}

// 发送测试指标
async function sendTestMetrics() {
  if (config.mockMode) {
    console.log('✅ 模拟模式：指标发送成功');
    return { status: 'success', message: 'Mock mode: Metrics sent successfully' };
  }
  
  // 生成测试指标数据
  const testMetricsData = TestDataGenerator.generateMetrics(3);
  
  const apiCall = async () => {
    console.log('📊 发送测试指标到OpenObserve...');
    const headers = config.getAuthHeader();
    // 构建包含stream参数的请求体
    const requestBody = {
      stream: config.metricsStream,
      ...testMetricsData
    };
    const response = await axios.post(
      config.getApiUrl('metrics'),
      requestBody,
      {
        timeout: config.timeout,
        headers: headers
      }
    );
    
    console.log('✅ 测试指标发送成功');
    return response.data;
  };
  
  return await callWithRetry(apiCall, '发送测试指标');
}

// 批量发送测试数据
async function sendBatchTestData(batchSize = 10) {
  console.log(`📦 批量发送 ${batchSize} 组测试数据...`);
  
  const results = {
    logs: [],
    metrics: [],
    errors: []
  };
  
  for (let i = 0; i < batchSize; i++) {
    try {
      const logData = TestDataGenerator.generateLogs(3);
      const logResult = await sendTestLogsWithData(logData);
      results.logs.push(logResult);
      
      const metricData = TestDataGenerator.generateMetrics(2);
      const metricResult = await sendTestMetricsWithData(metricData);
      results.metrics.push(metricResult);
      
      console.log(`📊 批次 ${i + 1}/${batchSize} 发送完成`);
    } catch (error) {
      results.errors.push({
        batch: i + 1,
        error: error.message
      });
      console.error(`❌ 批次 ${i + 1} 发送失败:`, error.message);
    }
  }
  
  return results;
}

// 发送自定义日志数据
async function sendTestLogsWithData(customLogData) {
  if (config.mockMode) {
    console.log('✅ 模拟模式：自定义日志数据发送成功');
    return { success: true, message: '模拟模式：日志数据发送成功' };
  }
  
  const apiCall = async () => {
    const headers = config.getAuthHeader();
    // 构建包含stream参数的请求体
    const requestBody = {
      stream: config.logStream,
      ...customLogData
    };
    const response = await axios.post(
      config.getApiUrl('logs'),
      requestBody,
      {
        timeout: config.timeout,
        headers: headers
      }
    );
    return response.data;
  };
  
  return await callWithRetry(apiCall, '发送自定义日志数据');
}

// 发送自定义指标数据
async function sendTestMetricsWithData(customMetricsData) {
  if (config.mockMode) {
    console.log('✅ 模拟模式：自定义指标数据发送成功');
    return { success: true, message: '模拟模式：指标数据发送成功' };
  }
  
  const apiCall = async () => {
    const headers = config.getAuthHeader();
    // 构建包含stream参数的请求体
    const requestBody = {
      stream: config.metricsStream,
      ...customMetricsData
    };
    const response = await axios.post(
      config.getApiUrl('metrics'),
      requestBody,
      {
        timeout: config.timeout,
        headers: headers
      }
    );
    return response.data;
  };
  
  return await callWithRetry(apiCall, '发送自定义指标数据');
}

// 查询测试数据
async function queryTestData() {
  console.log('🔍 查询测试数据...');
  
  if (config.mockMode) {
    console.log('✅ 模拟模式：数据查询成功');
    const logData = TestDataGenerator.generateLogs(3);
    const metricsData = TestDataGenerator.generateMetrics(2);
    return { 
      logs: logData.logs,
      metrics: metricsData.metrics
    };
  }
  
  const apiCall = async () => {
    // 等待数据索引
    await new Promise(resolve => setTimeout(resolve, config.indexWaitTime));
    
    // 查询日志 - 使用正确的日志流和时间范围
    const logQuery = {
      query: {
        sql: `SELECT * FROM "${config.logStream}" WHERE _timestamp >= '2025-01-01T00:00:00Z' LIMIT ${config.queryLimit}`
      }
    };
    
    const headers = config.getAuthHeader();
    const logResponse = await axios.post(
      `${config.url}/api/${config.organization}/_search`,
      logQuery,
      {
        timeout: config.timeout,
        headers: headers
      }
    );
    
    console.log(`✅ 查询到 ${logResponse.data.hits ? logResponse.data.hits.length : 0} 条日志记录`);
    
    // 查询指标 - 使用正确的指标流和时间范围
    const metricsQuery = {
      query: {
        sql: `SELECT * FROM "${config.metricsStream}" WHERE _timestamp >= '2025-01-01T00:00:00Z' LIMIT ${config.queryLimit}`
      }
    };
    
    const metricsHeaders = config.getAuthHeader();
    const metricsResponse = await axios.post(
      `${config.url}/api/${config.organization}/_search`,
      metricsQuery,
      {
        timeout: config.timeout,
        headers: metricsHeaders
      }
    );
    
    console.log(`✅ 查询到 ${metricsResponse.data.hits ? metricsResponse.data.hits.length : 0} 条指标记录`);
    
    return {
      logs: logResponse.data.hits || [],
      metrics: metricsResponse.data.hits || []
    };
  };
  
  return await callWithRetry(apiCall, '查询测试数据');
}

// 性能测试
async function runPerformanceTest() {
  console.log('⚡ 开始性能测试...');
  
  const results = {
    healthCheck: null,
    logSend: null,
    metricsSend: null,
    query: null,
    batchSend: null
  };
  
  try {
    // 健康检查性能
    results.healthCheck = await measureExecutionTime(
      () => checkOpenObserveHealth(),
      '健康检查'
    );
    
    // 日志发送性能
    results.logSend = await measureExecutionTime(
      () => sendTestLogs(),
      '日志发送'
    );
    
    // 指标发送性能
    results.metricsSend = await measureExecutionTime(
      () => sendTestMetrics(),
      '指标发送'
    );
    
    // 查询性能
    results.query = await measureExecutionTime(
      () => queryTestData(),
      '数据查询'
    );
    
    // 批量发送性能（小批量）
    results.batchSend = await measureExecutionTime(
      () => sendBatchTestData(3),
      '批量发送(3批次)'
    );
    
    return results;
  } catch (error) {
    console.error('❌ 性能测试失败:', error.message);
    throw error;
  }
}

// 基础测试函数
async function runBasicTests() {
  console.log('🚀 开始OpenObserve基础功能测试...\n');
  
  try {
    // 验证配置
    config.validate();
    
    // 健康检查
    const isHealthy = await checkOpenObserveHealth();
    if (!isHealthy) {
      throw new Error('OpenObserve服务不可用，测试终止');
    }
    
    // 测试日志发送
    await sendTestLogs();
    
    // 测试指标发送
    await sendTestMetrics();
    
    // 测试数据查询
    const results = await queryTestData();
    
    console.log('\n🎉 OpenObserve基础功能测试完成！');
    console.log('\n📋 测试结果:');
    console.log(`  - 健康检查: ✅ 成功`);
    console.log(`  - 日志发送: ✅ 成功`);
    console.log(`  - 指标发送: ✅ 成功`);
    console.log(`  - 数据查询: ✅ 成功`);
    console.log(`  - 查询到的日志数: ${results.logs.length}`);
    console.log(`  - 查询到的指标数: ${results.metrics.length}`);
    
  } catch (error) {
    console.error('\n❌ 基础功能测试失败:', error.message);
    process.exit(1);
  }
}

// 增强版测试函数
async function runEnhancedTests() {
  console.log('🚀 开始OpenObserve增强版功能测试...\n');
  
  try {
    // 验证配置
    config.validate();
    
    console.log('📊 配置信息:');
    console.log(`  - URL: ${config.url}`);
    console.log(`  - 组织: ${config.organization}`);
    console.log(`  - 超时: ${config.timeout}ms`);
    console.log(`  - 最大重试: ${config.maxRetries}次\n`);
    
    // 健康检查
    console.log('🏥 执行健康检查...');
    const isHealthy = await checkOpenObserveHealth();
    if (!isHealthy) {
      throw new Error('OpenObserve服务不可用，测试终止');
    }
    
    // 性能测试
    console.log('⚡ 执行性能测试...');
    const performanceResults = await runPerformanceTest();
    
    // 批量发送测试
    console.log('📦 执行批量发送测试...');
    const batchResults = await sendBatchTestData(5);
    
    // 生成测试报告
    console.log('\n📈 生成详细测试报告...');
    
    console.log('\n🎉 OpenObserve增强版功能测试完成！');
    console.log('\n📋 详细测试结果:');
    console.log('\n⚡ 性能测试结果:');
    console.log(`  - 健康检查: ${performanceResults.healthCheck.duration}ms`);
    console.log(`  - 日志发送: ${performanceResults.logSend.duration}ms`);
    console.log(`  - 指标发送: ${performanceResults.metricsSend.duration}ms`);
    console.log(`  - 数据查询: ${performanceResults.query.duration}ms`);
    console.log(`  - 批量发送: ${performanceResults.batchSend.duration}ms`);
    
    console.log('\n📦 批量发送结果:');
    console.log(`  - 成功日志批次: ${batchResults.logs.length}`);
    console.log(`  - 成功指标批次: ${batchResults.metrics.length}`);
    console.log(`  - 失败批次: ${batchResults.errors.length}`);
    
    if (batchResults.errors.length > 0) {
      console.log('\n❌ 失败批次详情:');
      batchResults.errors.forEach(error => {
        console.log(`  - 批次 ${error.batch}: ${error.error}`);
      });
    }
    
    console.log('\n✅ 所有测试用例执行完成！');
    
  } catch (error) {
    console.error('\n❌ 增强版功能测试失败:', error.message);
    process.exit(1);
  }
}

// 命令行参数处理
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    mode: 'basic', // basic, enhanced, performance
    batchSize: 5,
    environment: 'development', // development, production, demo
    mockMode: false
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mode' && args[i + 1]) {
      options.mode = args[i + 1];
      i++;
    } else if (args[i] === '--batch-size' && args[i + 1]) {
      options.batchSize = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--env' && args[i + 1]) {
      options.environment = args[i + 1];
      i++;
    } else if (args[i] === '--mock') {
      options.mockMode = true;
    } else if (args[i] === '--help') {
      console.log(`
用法: node test-openobserve-basic.js [选项]

选项:
  --mode <basic|enhanced|performance>  测试模式 (默认: basic)
  --batch-size <number>               批量发送批次大小 (默认: 5)
  --env <development|production|demo>  环境配置 (默认: development)
  --mock                              启用模拟模式 (不发送真实请求)
  --help                              显示帮助信息

示例:
  node test-openobserve-basic.js --mode enhanced
  node test-openobserve-basic.js --mode performance --batch-size 10
  node test-openobserve-basic.js --env production --mock
  node test-openobserve-basic.js --env demo
      `);
      process.exit(0);
    }
  }
  
  return options;
}

// 如果直接运行此脚本
if (require.main === module) {
  const options = parseArguments();
  
  // 根据命令行参数重新创建配置实例
  config = new OpenObserveConfig({
    environment: options.environment,
    mockMode: options.mockMode
  });
  
  console.log(`🔧 配置信息:`);
  console.log(`  - 环境: ${options.environment}`);
  console.log(`  - 模式: ${options.mode}`);
  console.log(`  - 模拟模式: ${options.mockMode ? '启用' : '禁用'}`);
  console.log(`  - URL: ${config.url}\n`);
  
  switch (options.mode) {
    case 'enhanced':
      runEnhancedTests();
      break;
    case 'performance':
      // 性能测试模式
      runEnhancedTests();
      break;
    case 'basic':
    default:
      runBasicTests();
      break;
  }
}

module.exports = {
  runBasicTests,
  runEnhancedTests,
  runPerformanceTest,
  sendTestLogs,
  sendTestMetrics,
  queryTestData,
  sendBatchTestData,
  checkOpenObserveHealth,
  OpenObserveConfig,
  TestDataGenerator
};