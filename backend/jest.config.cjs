module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testMatch: ['**/*.spec.ts', '**/*.test.ts', '**/*.spec.js', '**/*.test.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|p-retry|is-network-error|@nestjs/bull|@nestjs/bull-shared)/)'
  ],
  testPathIgnorePatterns: [
    // email-verification 是独立 Express 服务(compose email-verifier 容器)的
    // 自测——jest29 与其考古 mock 写法不合,归服务自身口径
    '<rootDir>/email-verification/'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.spec.json' }],
  },
  collectCoverageFrom: [
    '<rootDir>/**/*.{ts,js}',
    '!**/*.d.ts',
    '!**/test/**',
    '!**/node_modules/**',
    '!../dist/**',
    '!../coverage/**'
  ],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
    '^test/(.*)$': '<rootDir>/../test/$1',
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/../test/setup.ts'],
  setupFiles: ['<rootDir>/../test/jest.env.cjs'],
  coverageThreshold: {
    global: {
      branches: 11,
      functions: 9,
      lines: 15,
      statements: 15
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
};