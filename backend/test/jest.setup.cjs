// Jest setup file
// This file is executed once before all test files

// Set test environment variables
process.env.NODE_ENV = 'test';

// Configure default timeout for async operations
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore logs during tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Setup global test utilities
global.testUtils = {
  // Add any global test utilities here
  createMockConfigService: () => ({
    get: jest.fn(),
  }),
  createMockCacheService: () => ({
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  }),
};
