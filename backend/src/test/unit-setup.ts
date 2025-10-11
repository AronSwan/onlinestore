// 单元测试设置文件
// 这个文件用于配置Jest单元测试环境

// 设置测试超时
jest.setTimeout(30000);

// 全局测试环境设置
beforeAll(() => {
  // 在测试前设置全局变量
  process.env.NODE_ENV = 'test';
});

// 全局测试清理
afterAll(() => {
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
