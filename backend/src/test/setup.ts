// 用途：Jest测试环境设置文件
// 依赖文件：jest.config.js
// 作者：后端开发团队
// 时间：2025-09-26 18:35:00

import 'reflect-metadata';

// 全局测试超时设置
jest.setTimeout(30000);

// 模拟环境变量
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_USERNAME = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_DATABASE = 'test_db';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.JWT_SECRET = 'test-secret-key';

// 全局测试钩子
beforeAll(async () => {
  // 测试前的初始化逻辑
  console.log('测试环境初始化完成');
});

afterAll(async () => {
  // 测试后的清理逻辑
  console.log('测试环境清理完成');
});
