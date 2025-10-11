const base = require('./jest.config.cjs');

module.exports = {
  ...base,
  rootDir: 'src',
  testMatch: ['**/*.integration.spec.ts'],
};