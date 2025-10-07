
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
