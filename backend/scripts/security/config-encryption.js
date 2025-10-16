#!/usr/bin/env node

/**
 * 配置文件加密存储模块
 *
 * 功能：
 * 1. 加密配置文件
 * 2. 解密配置文件
 * 3. 管理加密密钥
 * 4. 提供加密配置读取接口
 *
 * @author 后端开发团队
 * @version 1.0.0
 * @since 2025-10-13
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 加密配置
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16, // 128 bits
  tagLength: 16, // 128 bits
  encoding: 'base64',
};

// 密钥存储配置
const KEY_STORAGE_CONFIG = {
  keyDir: path.join(os.homedir(), '.test-monitor'),
  keyFile: 'encryption.key',
  saltFile: 'encryption.salt',
};

/**
 * 生成随机密钥
 */
function generateKey() {
  return crypto.randomBytes(ENCRYPTION_CONFIG.keyLength);
}

/**
 * 生成随机盐值
 */
function generateSalt() {
  return crypto.randomBytes(16);
}

/**
 * 从密码和盐值派生密钥
 */
function deriveKeyFromPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, ENCRYPTION_CONFIG.keyLength, 'sha256');
}

/**
 * 获取或创建加密密钥
 */
function getOrCreateEncryptionKey(password) {
  try {
    // 确保密钥目录存在
    if (!fs.existsSync(KEY_STORAGE_CONFIG.keyDir)) {
      fs.mkdirSync(KEY_STORAGE_CONFIG.keyDir, { recursive: true, mode: 0o700 });
    }

    const keyPath = path.join(KEY_STORAGE_CONFIG.keyDir, KEY_STORAGE_CONFIG.keyFile);
    const saltPath = path.join(KEY_STORAGE_CONFIG.keyDir, KEY_STORAGE_CONFIG.saltFile);

    // 如果密钥和盐值已存在，直接返回
    if (fs.existsSync(keyPath) && fs.existsSync(saltPath)) {
      const salt = fs.readFileSync(saltPath);
      return deriveKeyFromPassword(password, salt);
    }

    // 生成新的盐值
    const salt = generateSalt();

    // 从密码派生密钥
    const key = deriveKeyFromPassword(password, salt);

    // 保存盐值
    fs.writeFileSync(saltPath, salt, { mode: 0o600 });

    return key;
  } catch (error) {
    throw new Error(`Failed to get or create encryption key: ${error.message}`);
  }
}

/**
 * 加密数据
 */
function encryptData(data, key) {
  try {
    // 生成随机IV
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);

    // 创建加密器
    const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
    cipher.setAAD(Buffer.from('test-monitor-config', 'utf8'));

    // 加密数据
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', ENCRYPTION_CONFIG.encoding);
    encrypted += cipher.final(ENCRYPTION_CONFIG.encoding);

    // 获取认证标签
    const tag = cipher.getAuthTag();

    // 组合IV、标签和加密数据
    const result = {
      iv: iv.toString(ENCRYPTION_CONFIG.encoding),
      tag: tag.toString(ENCRYPTION_CONFIG.encoding),
      data: encrypted,
    };

    return result;
  } catch (error) {
    throw new Error(`Failed to encrypt data: ${error.message}`);
  }
}

/**
 * 解密数据
 */
function decryptData(encryptedData, key) {
  try {
    // 解析加密数据
    const iv = Buffer.from(encryptedData.iv, ENCRYPTION_CONFIG.encoding);
    const tag = Buffer.from(encryptedData.tag, ENCRYPTION_CONFIG.encoding);
    const data = encryptedData.data;

    // 创建解密器
    const decipher = crypto.createDecipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
    decipher.setAAD(Buffer.from('test-monitor-config', 'utf8'));
    decipher.setAuthTag(tag);

    // 解密数据
    let decrypted = decipher.update(data, ENCRYPTION_CONFIG.encoding, 'utf8');
    decrypted += decipher.final('utf8');

    // 解析JSON
    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error(`Failed to decrypt data: ${error.message}`);
  }
}

/**
 * 加密配置文件
 */
function encryptConfigFile(configPath, encryptedConfigPath, password) {
  try {
    // 检查配置文件是否存在
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    // 读取配置文件
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // 获取或创建加密密钥
    const salt = generateSalt();
    const key = deriveKeyFromPassword(password, salt);

    // 加密配置数据
    const encryptedData = encryptData(configData, key);

    // 将盐值添加到加密数据中
    encryptedData.salt = salt.toString(ENCRYPTION_CONFIG.encoding);

    // 确保目标目录存在
    const targetDir = path.dirname(encryptedConfigPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 写入加密配置文件
    fs.writeFileSync(encryptedConfigPath, JSON.stringify(encryptedData, null, 2), { mode: 0o600 });

    console.log(`Config file encrypted: ${encryptedConfigPath}`);
    return true;
  } catch (error) {
    console.error(`Failed to encrypt config file: ${error.message}`);
    return false;
  }
}

/**
 * 解密配置文件
 */
function decryptConfigFile(encryptedConfigPath, password) {
  try {
    // 检查加密配置文件是否存在
    if (!fs.existsSync(encryptedConfigPath)) {
      throw new Error(`Encrypted config file not found: ${encryptedConfigPath}`);
    }

    // 读取加密配置文件
    const encryptedData = JSON.parse(fs.readFileSync(encryptedConfigPath, 'utf8'));

    // 从加密数据中获取盐值
    if (!encryptedData.salt) {
      throw new Error('Salt not found in encrypted config file');
    }

    const salt = Buffer.from(encryptedData.salt, ENCRYPTION_CONFIG.encoding);

    // 使用相同的盐值派生密钥
    const key = deriveKeyFromPassword(password, salt);

    // 解密配置数据
    const configData = decryptData(encryptedData, key);

    return configData;
  } catch (error) {
    throw new Error(`Failed to decrypt config file: ${error.message}`);
  }
}

/**
 * 读取配置文件（支持加密和非加密）
 */
function readConfigFile(configPath, password) {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    // 尝试直接读取（非加密）
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      // 如果直接读取失败，尝试解密
      if (password) {
        return decryptConfigFile(configPath, password);
      }
      throw new Error(`Failed to read config file: ${error.message}`);
    }
  } catch (error) {
    throw new Error(`Failed to read config file: ${error.message}`);
  }
}

/**
 * 检查配置文件是否已加密
 */
function isConfigFileEncrypted(configPath) {
  try {
    if (!fs.existsSync(configPath)) {
      return false;
    }

    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return data.iv && data.tag && data.data;
  } catch (error) {
    return false;
  }
}

/**
 * 主函数 - 命令行接口
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // 默认路径
  const defaultConfigPath = path.join(__dirname, '../test-monitor.config.json');
  const defaultEncryptedConfigPath = path.join(__dirname, '../test-monitor.config.encrypted');

  // 从环境变量获取密码
  const password = process.env.CONFIG_ENCRYPTION_PASSWORD;

  if (!password && command !== 'help') {
    console.error(
      'Encryption password is required. Set CONFIG_ENCRYPTION_PASSWORD environment variable.',
    );
    process.exit(1);
  }

  switch (command) {
    case 'encrypt':
      const configPath = args[1] || defaultConfigPath;
      const encryptedConfigPath = args[2] || defaultEncryptedConfigPath;

      console.log(`Encrypting config file: ${configPath}`);
      const success = encryptConfigFile(configPath, encryptedConfigPath, password);
      process.exit(success ? 0 : 1);

    case 'decrypt':
      const decryptPath = args[1] || defaultEncryptedConfigPath;

      try {
        console.log(`Decrypting config file: ${decryptPath}`);
        const configData = decryptConfigFile(decryptPath, password);
        console.log(JSON.stringify(configData, null, 2));
        process.exit(0);
      } catch (error) {
        console.error(`Decryption failed: ${error.message}`);
        process.exit(1);
      }

    case 'read':
      const readPath = args[1] || defaultConfigPath;

      try {
        console.log(`Reading config file: ${readPath}`);
        const configData = readConfigFile(readPath, password);
        console.log(JSON.stringify(configData, null, 2));
        process.exit(0);
      } catch (error) {
        console.error(`Read failed: ${error.message}`);
        process.exit(1);
      }

    case 'check':
      const checkPath = args[1] || defaultConfigPath;
      const isEncrypted = isConfigFileEncrypted(checkPath);
      console.log(`Config file is ${isEncrypted ? 'encrypted' : 'not encrypted'}`);
      process.exit(0);

    case 'help':
    default:
      console.log('Usage:');
      console.log(
        '  CONFIG_ENCRYPTION_PASSWORD=<password> node config-encryption.js encrypt [config] [encrypted]  # Encrypt config file',
      );
      console.log(
        '  CONFIG_ENCRYPTION_PASSWORD=<password> node config-encryption.js decrypt [encrypted]              # Decrypt config file',
      );
      console.log(
        '  CONFIG_ENCRYPTION_PASSWORD=<password> node config-encryption.js read [config]                   # Read config file (encrypted or plain)',
      );
      console.log(
        '  node config-encryption.js check [config]                                                         # Check if config file is encrypted',
      );
      process.exit(1);
  }
}

// 导出函数供其他模块使用
module.exports = {
  generateKey,
  generateSalt,
  deriveKeyFromPassword,
  getOrCreateEncryptionKey,
  encryptData,
  decryptData,
  encryptConfigFile,
  decryptConfigFile,
  readConfigFile,
  isConfigFileEncrypted,
};

// 如果直接运行此脚本，执行主函数
if (require.main === module) {
  main();
}
