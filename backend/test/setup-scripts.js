/**
 * 脚本测试的全局设置
 * 用于设置测试环境变量和全局配置
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.CONFIG_KEY_PASSPHRASE = 'TestPassphrase123!@#';

// 设置全局超时
jest.setTimeout(30000);

// 全局测试配置
global.testConfig = {
  keysDir: './test-keys',
  signaturesDir: './test-signatures',
  keyHistoryDir: './test-keys/history',
  trustStoreDir: './test-trust',
  keyRotationInterval: 1000,
  minSignaturesRequired: 2,
  enforceStrongPassphrase: true,
  minPassphraseLength: 16,
  isProduction: false,
  isWindows: false
};

// 清理测试目录的函数
global.cleanupTestDirectories = () => {
  const fs = require('fs');
  const path = require('path');
  
  const dirs = [
    global.testConfig.keysDir,
    global.testConfig.signaturesDir,
    global.testConfig.keyHistoryDir,
    global.testConfig.trustStoreDir
  ];
  
  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Failed to clean up directory ${dir}: ${error.message}`);
      }
    }
  }
};

// 设置测试环境的函数
global.setupTestEnvironment = () => {
  const fs = require('fs');
  const path = require('path');
  
  global.cleanupTestDirectories();
  
  // 创建测试目录
  const dirs = [
    global.testConfig.keysDir,
    global.testConfig.signaturesDir,
    global.testConfig.keyHistoryDir,
    global.testConfig.trustStoreDir
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
};

// 在每个测试文件运行前执行
beforeAll(() => {
  console.log('Setting up test environment for scripts...');
});

// 在每个测试文件运行后执行
afterAll(() => {
  console.log('Cleaning up test environment for scripts...');
  global.cleanupTestDirectories();
});