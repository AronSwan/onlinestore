// 测试配置读取
require('dotenv').config();

console.log('Environment Variables:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '[REDACTED]' : 'undefined');
console.log('JWT_ALGORITHM:', process.env.JWT_ALGORITHM);
console.log('JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN);
console.log('JWT_PRIVATE_KEY:', process.env.JWT_PRIVATE_KEY ? '[REDACTED]' : 'undefined');
console.log('JWT_PUBLIC_KEY:', process.env.JWT_PUBLIC_KEY ? '[REDACTED]' : 'undefined');

// 导入配置
const { createMasterConfiguration } = require('./dist/src/config/unified-master.config');
const configuration = createMasterConfiguration();

console.log('\nParsed Configuration:');
console.log('jwt.secret:', configuration.jwt.secret ? '[REDACTED]' : 'undefined');
console.log('jwt.algorithm:', configuration.jwt.algorithm);
console.log('jwt.expiresIn:', configuration.jwt.expiresIn);
console.log('jwt.privateKey:', configuration.jwt.privateKey ? '[REDACTED]' : 'undefined');
console.log('jwt.publicKey:', configuration.jwt.publicKey ? '[REDACTED]' : 'undefined');