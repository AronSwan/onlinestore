const base = require('./jest.config.cjs');
// 过滤掉基础配置中的 testMatch，避免与 testRegex 冲突
const { testMatch: _ignoredTestMatch, ...baseWithoutTestMatch } = base;

module.exports = {
  ...baseWithoutTestMatch,
  // 使用 src 作为根目录
  rootDir: 'src',
  // 使用正则匹配并排除 integration 后缀 - 修复重复执行问题
  testRegex: '(^.*(?<!\\.integration)\\.(spec|test)\\.ts$)',
  // 明确禁用 testMatch 以避免重复匹配
  testMatch: undefined,
  // 在单测中使用 CommonJS 变换，避免 ESM 冲突
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  extensionsToTreatAsEsm: [],
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.spec.json',
      useESM: false,
      isolatedModules: true,
      diagnostics: { warnOnly: true },
    },
  },
  setupFilesAfterEnv: [
    '<rootDir>/test/setup.ts',
    '<rootDir>/test/unit-setup.ts'
  ],
  // 确保没有项目配置导致重复执行
  projects: undefined,
};