
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
