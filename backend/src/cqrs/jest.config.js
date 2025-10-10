// CQRS模块Jest配置
// 作者：后端开发团队
// 时间：2025-10-05

module.exports = {
  displayName: 'CQRS',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: [
    '<rootDir>/src/cqrs/**/*.spec.ts',
    '<rootDir>/src/cqrs/**/*.test.ts',
    '<rootDir>/test/**/*.spec.ts',
    '<rootDir>/test/**/*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    '<rootDir>/src/cqrs/**/*.ts',
    '!<rootDir>/src/cqrs/**/*.d.ts',
    '!<rootDir>/src/cqrs/index.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@cqrs/(.*)$': '<rootDir>/src/cqrs/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 10000,
};
