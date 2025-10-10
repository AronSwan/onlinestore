// 修复模块引用问题
let pathsToModuleNameMapper;
let compilerOptions;

try {
  // 尝试使用ts-jest/utils
  pathsToModuleNameMapper = require('ts-jest/utils').pathsToModuleNameMapper;
  compilerOptions = require('./tsconfig.json');
} catch (error) {
  // 如果ts-jest/utils不可用，使用备用方案
  console.warn('⚠️ ts-jest/utils不可用，使用备用路径映射');
  
  // 手动定义路径映射
  pathsToModuleNameMapper = (paths, prefix) => {
    const result = {};
    for (const [key, value] of Object.entries(paths)) {
      const regexKey = key.replace(/\*/, '(.*)');
      const mappedPath = value[0].replace(/\*/, '$1');
      result[regexKey] = `${prefix}${mappedPath}`;
    }
    return result;
  };
  
  // 尝试获取tsconfig.json
  try {
    compilerOptions = require('./tsconfig.json');
  } catch (tsError) {
    console.warn('⚠️ 无法加载tsconfig.json，使用默认配置');
    compilerOptions = {
      paths: {
        '@/*': ['src/*'],
        '@test/*': ['test/*'],
        '@config/*': ['src/config/*'],
        '@common/*': ['src/common/*'],
        '@modules/*': ['src/modules/*']
      }
    };
  }
}

module.exports = {
  displayName: 'test',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  
  // 路径映射 - 修复配置名称
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/',
  }),
  
  // 测试文件匹配模式
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)',
  ],
  
  // 转换模式
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  
  // 忽略转换的文件
  transformIgnorePatterns: [
    'node_modules/(?!.*\\.mjs$)',
  ],
  
  // 模块文件扩展名
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // 覆盖率配置
  collectCoverage: false, // 默认不收集覆盖率，可通过参数启用
  collectCoverageFrom: [
    'src/**/*.(ts|tsx)',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.mock.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // 设置文件
  setupFilesAfterEnv: ['<rootDir>/src/test/test-setup.ts'],
  
  // 全局变量
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  
  // 模块路径映射
  modulePaths: ['<rootDir>/src', '<rootDir>/test'],
  
  // 清理模拟
  clearMocks: true,
  restoreMocks: true,
  
  // 测试超时
  testTimeout: 30000,
  
  // 详细输出
  verbose: false,
  
  // 错误阈值
  errorOnDeprecated: true,
  
  // 缓存
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // 最大工作进程数
  maxWorkers: '50%',
  
  // 测试序列化器
  snapshotSerializers: [],
  
  // 测试环境选项
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
  
  // 模拟配置
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    
    // 模拟外部模块
    '^redis$': '<rootDir>/test/mocks/redis.mock.ts',
    '^bcrypt$': '<rootDir>/test/mocks/bcrypt.mock.ts',
    '^@nestjs/redis$': '<rootDir>/test/mocks/nestjs-redis.mock.ts',
    '^winston$': '<rootDir>/test/mocks/winston.mock.ts',
    '^nest-winston$': '<rootDir>/test/mocks/nest-winston.mock.ts',
  },
  
  // 项目配置
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.unit.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/test/unit-setup.ts'],
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/**/*.integration.spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/test/integration-setup.ts'],
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/test/e2e-setup.ts'],
      testTimeout: 60000, // E2E测试需要更长时间
    },
  ],
};