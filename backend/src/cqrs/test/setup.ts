// CQRS测试设置文件
// 作者：后端开发团队
// 时间：2025-10-05

import { Logger } from '@nestjs/common';

// 全局测试设置
beforeAll(() => {
  // 设置测试环境变量
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';

  // 创建测试日志器
  global.testLogger = new Logger('Test');

  console.log('CQRS测试环境初始化完成');
});

afterAll(() => {
  // 清理测试环境
  console.log('CQRS测试环境清理完成');
});

// 每个测试前的设置
beforeEach(() => {
  // 重置所有模拟
  jest.clearAllMocks();

  // 重置测试数据
  global.testData = {};

  console.log('测试用例初始化完成');
});

// 每个测试后的清理
afterEach(() => {
  // 清理测试数据
  if (global.testData) {
    global.testData = {};
  }

  console.log('测试用例清理完成');
});

// 全局测试变量
declare global {
  var testLogger: Logger;
  var testData: any;
}

// 导出测试辅助函数
export const testHelpers = {
  /**
   * 延迟执行
   */
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * 生成随机ID
   */
  generateId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

  /**
   * 生成随机数据
   */
  generateRandomData: (prefix: string = 'test') => ({
    id: `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `${prefix}-${Date.now()}`,
    value: Math.floor(Math.random() * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
};
