
const { recordLoginAttempt, recordOrder, recordCartOperation } = require('../backend/src/middleware/metrics');

async function testMetrics() {
  console.log('🧪 测试指标系统...');
  
  // 测试用户登录指标
  recordLoginAttempt(true, 'test-user-123');
  recordLoginAttempt(false, 'test-user-456');
  recordLoginAttempt(true, 'test-user-789');
  
  // 测试订单指标
  recordOrder('completed', 'credit_card');
  recordOrder('pending', 'paypal');
  recordOrder('failed', 'bank_transfer');
  
  // 测试购物车指标
  recordCartOperation('add', 'test-user-123');
  recordCartOperation('remove', 'test-user-456');
  recordCartOperation('update', 'test-user-789');
  recordCartOperation('clear', 'test-user-123');
  
  console.log('✓ 指标测试完成');
  console.log('📊 请访问 http://localhost:3000/metrics 查看指标数据');
  console.log('📈 请在OpenObserve中查看system-metrics数据流');
}

if (require.main === module) {
  testMetrics().catch(console.error);
}

module.exports = { testMetrics };
