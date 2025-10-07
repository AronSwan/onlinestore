#!/usr/bin/env node

/**
 * 简化配置测试脚本
 * 用途：验证后端配置文件是否正确
 * 作者：后端开发团队
 * 版本：v1.0.0
 * 时间：2025-10-05
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 开始测试后端配置...');

// 测试1: 检查环境变量文件
console.log('\n📋 测试1: 检查环境变量文件');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env 文件存在');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredVars = [
    'NODE_ENV',
    'PORT',
    'DB_TYPE',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'CORS_ORIGINS'
  ];
  
  const missingVars = requiredVars.filter(varName => {
    const regex = new RegExp(`^${varName}=`);
    const lines = envContent.split('\n');
    return !lines.some(line => line.trim().match(regex));
  });
  
  if (missingVars.length === 0) {
    console.log('✅ 所有必要的环境变量都已配置');
  } else {
    console.log(`❌ 缺少必要的环境变量: ${missingVars.join(', ')}`);
  }
} else {
  console.log('❌ .env 文件不存在');
}

// 测试2: 检查关键配置值
console.log('\n📋 测试2: 检查关键配置值');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // 检查配置项
  const checks = [
    { name: 'NODE_ENV', pattern: /^NODE_ENV=(development|production|test)$/, description: '环境变量必须为 development, production 或 test' },
    { name: 'PORT', pattern: /^PORT=\d+$/, description: '端口必须为数字' },
    { name: 'DB_TYPE', pattern: /^DB_TYPE=(sqlite|postgres|mysql|tidb)$/, description: '数据库类型必须为 sqlite, postgres, mysql 或 tidb' },
    { name: 'JWT_SECRET', pattern: /^JWT_SECRET=.+$/, description: 'JWT 密钥必须配置' },
    { name: 'ENCRYPTION_KEY', pattern: /^ENCRYPTION_KEY=.+$/, description: '加密密钥必须配置' },
    { name: 'CORS_ORIGINS', pattern: /^CORS_ORIGINS=.+$/, description: 'CORS 源必须配置' }
  ];
  
  console.log('\n🔍 配置验证结果:');
  let allValid = true;
  
  checks.forEach(check => {
    const lines = envContent.split('\n');
    const match = lines.find(line => line.trim().match(check.pattern));
    if (match) {
      const value = match.split('=')[1];
      console.log(`✅ ${check.name}: ${value}`);
    } else {
      console.log(`❌ ${check.name}: ${check.description}`);
      allValid = false;
    }
  });
  
  if (allValid) {
    console.log('\n✅ 所有配置验证通过');
  } else {
    console.log('\n❌ 部分配置验证失败');
  }
}

// 测试3: 检查数据库配置
console.log('\n📋 测试3: 检查数据库配置');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // 提取数据库配置
  const dbTypeMatch = envContent.match(/^DB_TYPE=(.+)$/m);
  const dbDatabaseMatch = envContent.match(/^DB_DATABASE=(.+)$/m);
  
  if (dbTypeMatch && dbDatabaseMatch) {
    const dbType = dbTypeMatch[1];
    const dbDatabase = dbDatabaseMatch[1];
    
    console.log(`✅ 数据库类型: ${dbType}`);
    console.log(`✅ 数据库路径: ${dbDatabase}`);
    
    if (dbType === 'sqlite') {
      const dataDir = path.dirname(dbDatabase);
      if (fs.existsSync(dataDir)) {
        console.log(`✅ 数据目录存在: ${dataDir}`);
      } else {
        console.log(`⚠️  数据目录不存在: ${dataDir}`);
      }
    }
    
    // 检查同步配置
    const syncMatch = envContent.match(/^DB_SYNCHRONIZE=(.+)$/m);
    if (syncMatch) {
      const sync = syncMatch[1] === 'true';
      console.log(`✅ 同步模式: ${sync ? '开启' : '关闭'}`);
    }
  }
}

// 测试4: 检查Redis配置
console.log('\n📋 测试4: 检查Redis配置');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const redisHostMatch = envContent.match(/^REDIS_HOST=(.+)$/m);
  const redisPortMatch = envContent.match(/^REDIS_PORT=(.+)$/m);
  const redisDbMatch = envContent.match(/^REDIS_DB=(.+)$/m);
  
  if (redisHostMatch && redisPortMatch && redisDbMatch) {
    console.log(`✅ Redis 主机: ${redisHostMatch[1]}`);
    console.log(`✅ Redis 端口: ${redisPortMatch[1]}`);
    console.log(`✅ Redis 数据库: ${redisDbMatch[1]}`);
    
    // 检查购物车配置
    const cartDbMatch = envContent.match(/^CART_REDIS_DB=(.+)$/m);
    if (cartDbMatch) {
      console.log(`✅ 购物车数据库: ${cartDbMatch[1]}`);
    }
  }
}

// 测试5: 检查文件上传配置
console.log('\n📋 测试5: 检查文件上传配置');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const uploadDestMatch = envContent.match(/^UPLOAD_DEST=(.+)$/m);
  const maxFileSizeMatch = envContent.match(/^MAX_FILE_SIZE=(.+)$/m);
  
  if (uploadDestMatch && maxFileSizeMatch) {
    console.log(`✅ 上传目录: ${uploadDestMatch[1]}`);
    const maxSize = parseInt(maxFileSizeMatch[1]);
    console.log(`✅ 最大文件大小: ${maxSize}字节 (${(maxSize / 1024 / 1024).toFixed(2)}MB)`);
    
    // 检查目录是否存在
    if (fs.existsSync(uploadDestMatch[1])) {
      console.log(`✅ 上传目录存在`);
    } else {
      console.log(`⚠️  上传目录不存在: ${uploadDestMatch[1]}`);
    }
  }
}

// 测试6: 检查日志配置
console.log('\n📋 测试6: 检查日志配置');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const logFileMatch = envContent.match(/^LOG_FILE=(.+)$/m);
  const logLevelMatch = envContent.match(/^LOG_LEVEL=(.+)$/m);
  
  if (logFileMatch && logLevelMatch) {
    console.log(`✅ 日志文件: ${logFileMatch[1]}`);
    console.log(`✅ 日志级别: ${logLevelMatch[1]}`);
    
    // 检查日志目录
    const logDir = path.dirname(logFileMatch[1]);
    if (fs.existsSync(logDir)) {
      console.log(`✅ 日志目录存在: ${logDir}`);
    } else {
      console.log(`⚠️  日志目录不存在: ${logDir}`);
    }
  }
}

// 测试7: 检查安全配置
console.log('\n📋 测试7: 检查安全配置');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const jwtSecretMatch = envContent.match(/^JWT_SECRET=(.+)$/m);
  const encryptionKeyMatch = envContent.match(/^ENCRYPTION_KEY=(.+)$/m);
  const corsOriginsMatch = envContent.match(/^CORS_ORIGINS=(.+)$/m);
  
  if (jwtSecretMatch) {
    const jwtSecret = jwtSecretMatch[1];
    if (jwtSecret.length >= 32) {
      console.log(`✅ JWT 密钥: 符合安全要求 (${jwtSecret.length}字符)`);
    } else {
      console.log(`❌ JWT 密钥: 不符合安全要求 (至少32字符)`);
    }
  }
  
  if (encryptionKeyMatch) {
    const encryptionKey = encryptionKeyMatch[1];
    if (encryptionKey.length >= 32) {
      console.log(`✅ 加密密钥: 符合安全要求 (${encryptionKey.length}字符)`);
    } else {
      console.log(`❌ 加密密钥: 不符合安全要求 (至少32字符)`);
    }
  }
  
  if (corsOriginsMatch) {
    console.log(`✅ CORS 源: ${corsOriginsMatch[1]}`);
  }
}

// 测试8: 检查必要目录
console.log('\n📋 测试8: 检查必要目录');
const requiredDirs = [
  { path: path.join(__dirname, '..', 'data'), description: '数据目录' },
  { path: path.join(__dirname, '..', 'logs'), description: '日志目录' },
  { path: path.join(__dirname, '..', 'uploads'), description: '上传目录' }
];

requiredDirs.forEach(dir => {
  if (fs.existsSync(dir.path)) {
    console.log(`✅ ${dir.description}: 存在`);
  } else {
    console.log(`⚠️  ${dir.description}: 不存在 (${dir.path})`);
  }
});

console.log('\n🎯 配置测试完成！');
console.log('\n📝 建议:');
console.log('1. 确保所有必要的目录都存在 (data, logs, uploads)');
console.log('2. 检查Redis和数据库服务是否正在运行');
console.log('3. 验证端口是否被占用');
console.log('4. 根据需要调整配置参数');
