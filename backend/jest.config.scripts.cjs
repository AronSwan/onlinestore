/**
 * Jest配置用于脚本测试
 * 专门用于测试scripts目录下的JavaScript文件
 */

module.exports = {
  moduleFileExtensions: ['js', 'json'],
  rootDir: '.',
  testMatch: [
    '**/scripts/**/*.test.js',
    '**/scripts/**/*.spec.js',
    '**/scripts/**/__tests__/**/*.js'
  ],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|p-retry|is-network-error)/)'
  ],
  collectCoverageFrom: [
    'scripts/**/*.js',
    '!**/*.d.ts',
    '!**/test/**',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  coverageDirectory: './coverage-scripts',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup-scripts.js'],
  setupFiles: ['<rootDir>/test/jest.env.cjs'],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10
    }
  },
  testTimeout: 30000,
  maxWorkers: '50%',
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  moduleNameMapper: {
    '^uuid$': '<rootDir>/test/mocks/uuid.cjs',
    '^p-retry$': '<rootDir>/test/mocks/p-retry.cjs',
    '^is-network-error$': '<rootDir>/test/mocks/is-network-error.cjs',
  },
};