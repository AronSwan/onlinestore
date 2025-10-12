const base = require('./jest.config.cjs');

module.exports = {
  ...base,
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  setupFiles: ['<rootDir>/test/jest.env.cjs'],
  testTimeout: 60000,
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^test/(.*)$': '<rootDir>/test/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^uuid$': '<rootDir>/test/mocks/uuid.cjs',
    '^p-retry$': '<rootDir>/test/mocks/p-retry.cjs',
    '^is-network-error$': '<rootDir>/test/mocks/is-network-error.cjs',
  },
};