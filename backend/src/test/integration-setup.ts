// 集成测试设置文件
// 这个文件用于配置Jest集成测试环境

// 设置测试超时
jest.setTimeout(60000); // 集成测试需要更长时间

// 全局测试环境设置
beforeAll(async () => {
  // 在测试前设置全局变量
  process.env.NODE_ENV = 'test';

  // 可以在这里设置测试数据库或其他外部服务
});

// 全局测试清理
afterAll(async () => {
  // 测试后清理
});

// 每个测试文件执行前的设置
beforeEach(() => {
  // 重置模拟
  jest.clearAllMocks();
});

// 每个测试文件执行后的清理
afterEach(() => {
  // 清理
});
