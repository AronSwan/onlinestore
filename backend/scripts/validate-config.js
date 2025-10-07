// 用途：配置验证脚本，用于在启动前验证所有配置
// 依赖文件：../src/config/configuration.validator.ts
// 作者：后端开发团队
// 时间：2025-09-30

require('ts-node/register');

const { ConfigurationValidator } = require('../src/config/configuration.validator');

console.log('🔍 开始验证配置...\n');

try {
  const validation = ConfigurationValidator.validateAll();
  const report = ConfigurationValidator.generateConfigReport();
  
  console.log(report);
  
  if (!validation.isValid) {
    console.error('❌ 配置验证失败，请修复上述错误后再启动应用');
    process.exit(1);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️  配置验证通过，但存在警告，建议修复');
  } else {
    console.log('✅ 配置验证通过，所有配置项正常');
  }
  
  process.exit(0);
} catch (error) {
  console.error('❌ 配置验证过程中发生错误:');
  console.error(error.message);
  process.exit(1);
}