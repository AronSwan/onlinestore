module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testMatch: ['**/*.spec.ts', '**/*.test.ts', '**/*.spec.js', '**/*.test.js'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|p-retry|is-network-error)/)'
  ],
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
    '^uuid$': '<rootDir>/../test/mocks/uuid.cjs',
    '^p-retry$': '<rootDir>/../test/mocks/p-retry.cjs',
    '^is-network-error$': '<rootDir>/../test/mocks/is-network-error.cjs',
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