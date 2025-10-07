#!/usr/bin/env node

/**
 * JWT RSA密钥对生成工具
 * 用于生成RS256算法所需的RSA私钥和公钥
 * 
 * 使用方法：
 * node scripts/generate-jwt-keys.js
 * 
 * 输出：
 * - private.key: RSA私钥文件
 * - public.key: RSA公钥文件
 * - .env.jwt: 环境变量配置示例
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 确保keys目录存在
const keysDir = path.join(__dirname, '..', 'keys');
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

console.log('🔐 生成JWT RSA密钥对...');

// 生成RSA密钥对
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048, // 密钥长度
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// 保存私钥
const privateKeyPath = path.join(keysDir, 'private.key');
fs.writeFileSync(privateKeyPath, privateKey);
console.log(`✅ 私钥已保存到: ${privateKeyPath}`);

// 保存公钥
const publicKeyPath = path.join(keysDir, 'public.key');
fs.writeFileSync(publicKeyPath, publicKey);
console.log(`✅ 公钥已保存到: ${publicKeyPath}`);

// 生成环境变量配置示例
const envContent = `# JWT RS256 配置
# 将以下内容添加到你的 .env 文件中

JWT_ALGORITHM=RS256

# 私钥（用于签名JWT）
JWT_PRIVATE_KEY="${privateKey.replace(/\n/g, '\\n')}"

# 公钥（用于验证JWT）
JWT_PUBLIC_KEY="${publicKey.replace(/\n/g, '\\n')}"

# 注意：在生产环境中，建议使用文件路径而不是直接在环境变量中存储密钥
# 例如：
# JWT_PRIVATE_KEY_PATH=/path/to/private.key
# JWT_PUBLIC_KEY_PATH=/path/to/public.key
`;

const envPath = path.join(keysDir, '.env.jwt');
fs.writeFileSync(envPath, envContent);
console.log(`✅ 环境变量配置示例已保存到: ${envPath}`);

console.log('\n🎉 JWT RSA密钥对生成完成！');
console.log('\n📋 下一步操作：');
console.log('1. 将 keys/.env.jwt 中的内容复制到你的 .env 文件');
console.log('2. 确保私钥文件的安全性（不要提交到版本控制）');
console.log('3. 在生产环境中使用安全的密钥管理服务');
console.log('\n⚠️  安全提醒：');
console.log('- 私钥必须保密，不要泄露给任何人');
console.log('- 不要将私钥提交到Git仓库');
console.log('- 定期轮换密钥以提高安全性');