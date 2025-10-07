// CQRS模块Jest配置
// 作者：后端开发团队
// 时间：2025-10-05

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/cqrs'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.spec.ts', '**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/cqrs/**/*.ts',
    '!src/cqrs/**/*.d.ts',
    '!src/cqrs/**/*.spec.ts',
    '!src/cqrs/**/*.test.ts',
  ],
  coverageDirectory: 'coverage/cqrs',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 10000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
