const UniquenessChecker = require('./js/uniqueness-checker');

console.log('=== 调试用户唯一性检查器 ===');

const checker = new UniquenessChecker({
  storageKey: 'debug_users'
});

console.log('1. 初始状态:');
console.log('用户列表:', checker.getRegisteredUsers());
console.log('统计信息:', checker.getStatistics());

console.log('\n2. 添加测试用户:');
const users = [
  {
    id: 'expired1',
    status: 'reserved',
    expiresAt: new Date(Date.now() - 1000).toISOString()
  },
  {
    id: 'valid1',
    status: 'reserved',
    expiresAt: new Date(Date.now() + 300000).toISOString()
  },
  {
    id: 'active1',
    status: 'active'
  }
];
checker.saveUsers(users);
console.log('保存后用户列表:', checker.getRegisteredUsers());
console.log('保存后统计信息:', checker.getStatistics());

console.log('\n3. 测试过期预留清理:');
checker.cleanupExpiredReservations().then(result => {
  console.log('清理结果:', result);
  console.log('清理后用户列表:', checker.getRegisteredUsers());
  console.log('清理后统计信息:', checker.getStatistics());
}).catch(error => {
  console.error('清理失败:', error);
});

console.log('\n4. 测试确认过期预留:');
checker.confirmReservation('expired1', {}).then(result => {
  console.log('确认结果:', result);
}).catch(error => {
  console.log('预期错误:', error.message);
});