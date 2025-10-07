#!/usr/bin/env node

/**
 * 日志系统集成脚本
 * 配置Winston日志传输器连接OpenObserve
 */

const fs = require('fs');
const path = require('path');

function updateWinstonConfig() {
  console.log('🔧 更新Winston日志配置...');
  
  const winstonConfig = `
const winston = require('winston');
const OpenObserveTransport = require('./logging/openobserve-transport');
const config = require('../../config/openobserve-config.json');

// 创建OpenObserve传输器
const openobserveTransport = new OpenObserveTransport({
  endpoint: config.endpoints.logs,
  token: process.env.OPENOBSERVE_TOKEN || 'your-token-here',
  service: 'caddy-shopping-app',
  batchSize: 10,
  flushInterval: 5000
});

// 创建日志器
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'caddy-shopping-app',
    version: process.env.APP_VERSION || '1.0.0'
  },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // 文件输出
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
    
    // OpenObserve输出
    openobserveTransport
  ]
});

// 生产环境配置
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/production.log',
    level: 'warn'
  }));
}

module.exports = logger;
`;

  const configPath = path.join(__dirname, '../backend/src/config/winston.js');
  fs.writeFileSync(configPath, winstonConfig);
  console.log('✓ Winston配置已更新');
}

function createLoggerMiddleware() {
  console.log('\n🌐 创建Express日志中间件...');
  
  const middlewareCode = `
const logger = require('../config/winston');

// 请求日志中间件
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // 记录请求开始
  logger.info('Request started', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    requestId: req.id || generateRequestId()
  });
  
  // 监听响应结束
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    
    logger[logLevel]('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      requestId: req.id || generateRequestId()
    });
  });
  
  next();
};

// 错误日志中间件
const errorLogger = (err, req, res, next) => {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    requestId: req.id || generateRequestId()
  });
  
  next(err);
};

// 生成请求ID
function generateRequestId() {
  return \`req-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
}

module.exports = {
  requestLogger,
  errorLogger
};
`;

  const middlewarePath = path.join(__dirname, '../backend/src/middleware/logger.js');
  fs.writeFileSync(middlewarePath, middlewareCode);
  console.log('✓ 日志中间件已创建');
}

function updateAppConfig() {
  console.log('\n📱 更新应用配置...');
  
  // 更新package.json添加必要的依赖
  const packageJsonPath = path.join(__dirname, '../package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // 添加必要的依赖
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }
    
    packageJson.dependencies.winston = '^3.8.2';
    packageJson.dependencies.axios = '^1.12.2';
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✓ package.json已更新');
  }
  
  // 创建环境变量配置文件
  const envConfig = `
# OpenObserve配置
OPENOBSERVE_URL=http://localhost:5080
OPENOBSERVE_ORGANIZATION=caddy-shopping
OPENOBSERVE_TOKEN=your-token-here

# 日志配置
LOG_LEVEL=info
NODE_ENV=development
APP_VERSION=1.0.0

# 应用配置
PORT=3000
`;

  const envPath = path.join(__dirname, '../.env.example');
  fs.writeFileSync(envPath, envConfig);
  console.log('✓ 环境变量配置已创建');
}

function createTestScript() {
  console.log('\n🧪 创建日志测试脚本...');
  
  const testScript = `
const logger = require('../backend/src/config/winston');

async function testLogging() {
  console.log('🧪 测试日志系统...');
  
  // 测试不同级别的日志
  logger.debug('这是一条调试日志', { 
    component: 'test',
    action: 'debug_test' 
  });
  
  logger.info('这是一条信息日志', { 
    component: 'test',
    action: 'info_test',
    user_id: 'test-user-123'
  });
  
  logger.warn('这是一条警告日志', { 
    component: 'test',
    action: 'warn_test',
    warning_type: 'performance'
  });
  
  logger.error('这是一条错误日志', { 
    component: 'test',
    action: 'error_test',
    error_code: 'TEST_ERROR',
    stack: new Error('测试错误').stack
  });
  
  // 模拟业务事件日志
  logger.info('用户登录', {
    event_type: 'user_action',
    event_name: 'login',
    user_id: 'test-user-123',
    session_id: 'test-session-456',
    ip_address: '127.0.0.1',
    user_agent: 'test-agent'
  });
  
  logger.info('商品浏览', {
    event_type: 'user_action',
    event_name: 'product_view',
    user_id: 'test-user-123',
    product_id: 'prod-123',
    category: 'electronics'
  });
  
  // 等待日志发送
  await new Promise(resolve => setTimeout(resolve, 6000));
  
  console.log('✓ 日志测试完成');
  console.log('📊 请检查OpenObserve Web界面查看日志数据');
}

if (require.main === module) {
  testLogging().catch(console.error);
}

module.exports = { testLogging };
`;

  const testPath = path.join(__dirname, 'test-logging.js');
  fs.writeFileSync(testPath, testScript);
  console.log('✓ 日志测试脚本已创建');
}

function main() {
  console.log('🚀 开始设置日志系统集成...');
  
  updateWinstonConfig();
  createLoggerMiddleware();
  updateAppConfig();
  createTestScript();
  
  console.log('\n🎉 日志系统集成设置完成！');
  console.log('\n📋 已完成的配置:');
  console.log('  - Winston日志配置');
  console.log('  - Express日志中间件');
  console.log('  - 应用依赖更新');
  console.log('  - 环境变量配置');
  console.log('  - 日志测试脚本');
  
  console.log('\n📝 下一步操作:');
  console.log('  1. 安装依赖: npm install winston axios');
  console.log('  2. 配置OpenObserve认证令牌');
  console.log('  3. 在Express应用中集成日志中间件');
  console.log('  4. 运行测试脚本: node scripts/test-logging.js');
  
  console.log('\n🔧 集成示例:');
  console.log('  const { requestLogger, errorLogger } = require("./middleware/logger");');
  console.log('  app.use(requestLogger);');
  console.log('  app.use(errorLogger);');
}

if (require.main === module) {
  main();
}

module.exports = {
  updateWinstonConfig,
  createLoggerMiddleware,
  updateAppConfig,
  createTestScript
};