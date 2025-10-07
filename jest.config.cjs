/** @type {import('jest').Config} */
module.exports = {
  // 根目录作为测试总管：本地默认委派软配置；CI 可直接调用 backend 硬配置脚本
  projects: ['<rootDir>/backend/jest.soft.config.cjs'],
};