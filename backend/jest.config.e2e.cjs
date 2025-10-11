const base = require('./jest.config.cjs');

module.exports = {
  ...base,
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/e2e-setup.ts'],
  testTimeout: 60000,
};