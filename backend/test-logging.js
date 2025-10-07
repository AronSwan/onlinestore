// 简单的日志系统测试脚本
require('dotenv').config();

async function testLogging() {
  try {
    console.log('开始测试日志系统...');
    
    // 测试基本的 Winston 日志功能
    const winston = require('winston');
    
    const logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: './logs/test.log' })
      ]
    });
    
    logger.info('测试信息日志');
    logger.warn('测试警告日志');
    logger.error('测试错误日志');
    
    console.log('✅ 基本日志功能测试通过');
    
    // 测试编译后的日志服务模块
     try {
       const { LoggingService } = require('./dist/src/common/logging/logging.service');
       console.log('✅ LoggingService 模块加载成功');
     } catch (error) {
       console.log('⚠️ LoggingService 模块加载失败:', error.message);
     }
    
    console.log('日志系统测试完成');
    
  } catch (error) {
    console.error('测试失败:', error.message);
    process.exit(1);
  }
}

testLogging();