module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testMatch: ['**/*.spec.ts', '**/*.test.ts', '**/*.spec.js', '**/*.test.js'],
  transformIgnorePatterns: [
    // Windows 路径是反斜杠——正则须兼容两种分隔符，否则放行名单永不生效
    'node_modules[\\/](?!(uuid|p-retry|is-network-error|@nestjs)[\\/])'
  ],
  testPathIgnorePatterns: [
    // email-verification 是独立 Express 服务(compose email-verifier 容器)的
    // 自测——jest29 与其考古 mock 写法不合,归服务自身口径
    '<rootDir>/email-verification/'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.spec.json' }],
    // Nest 12 ESM-only 包在 jest CJS 沙箱不可 require——@swc/jest 编译为 CJS
    // （swc 原生处理 ESM+import.meta；babel 无官方 import.meta 转译）
    '^.+\\.m?js$': ['@swc/jest', { jsc: { target: 'es2022' }, module: { type: 'commonjs' } }],
  },
  collectCoverageFrom: [
    '<rootDir>/**/*.{ts,js}',
    '!**/*.d.ts',
    '!**/test/**',
    '!**/node_modules/**',
    // C1席: email-verification 测试被排除但源码计入分母——13.3% 永零死重,对称排除
    '!**/email-verification/**',
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