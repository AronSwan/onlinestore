#!/usr/bin/env node

/**
 * 配置文件签名验证模块
 *
 * 功能：
 * 1. 生成密钥对
 * 2. 签名配置文件
 * 3. 验证配置文件签名
 *
 * @author 后端开发团队
 * @version 1.0.0
 * @since 2025-10-13
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * 生成RSA密钥对
 * @returns {Object} 包含公钥和私钥的对象
 */
function generateKeyPair() {
  try {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    return { publicKey, privateKey };
  } catch (error) {
    throw new Error(`Failed to generate key pair: ${error.message}`);
  }
}

/**
 * 签名配置文件
 * @param {string} configPath - 配置文件路径
 * @param {string} privateKeyPath - 私钥文件路径
 * @param {string} signaturePath - 签名文件输出路径
 * @returns {boolean} 签名是否成功
 */
function signConfigFile(configPath, privateKeyPath, signaturePath) {
  try {
    // 检查配置文件是否存在
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    // 读取私钥
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

    // 读取配置文件内容
    const configData = fs.readFileSync(configPath, 'utf8');

    // 使用私钥签名
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(configData);
    const signature = sign.sign(privateKey, 'hex');

    // 确保签名目录存在
    const signatureDir = path.dirname(signaturePath);
    if (!fs.existsSync(signatureDir)) {
      fs.mkdirSync(signatureDir, { recursive: true });
    }

    // 保存签名
    fs.writeFileSync(signaturePath, signature, 'utf8');

    console.log(`Signature saved to: ${signaturePath}`);
    return true;
  } catch (error) {
    console.error(`Failed to sign config file: ${error.message}`);
    return false;
  }
}

/**
 * 验证配置文件签名
 * @param {string} configPath - 配置文件路径
 * @param {string} publicKeyPath - 公钥文件路径
 * @param {string} signaturePath - 签名文件路径
 * @returns {boolean} 签名是否有效
 */
function verifyConfigFileSignature(configPath, publicKeyPath, signaturePath) {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    if (!fs.existsSync(publicKeyPath)) {
      throw new Error(`Public key file not found: ${publicKeyPath}`);
    }

    if (!fs.existsSync(signaturePath)) {
      throw new Error(`Signature file not found: ${signaturePath}`);
    }

    // 读取公钥
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

    // 读取配置文件内容
    const configData = fs.readFileSync(configPath, 'utf8');

    // 读取签名
    const signature = fs.readFileSync(signaturePath, 'utf8');

    // 使用公钥验证签名
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(configData);
    const isValid = verify.verify(publicKey, signature, 'hex');

    return isValid;
  } catch (error) {
    console.error(`Failed to verify config signature: ${error.message}`);
    return false;
  }
}

/**
 * 主函数 - 命令行接口
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'generate-keypair':
      try {
        const { publicKey, privateKey } = generateKeyPair();

        const publicKeyPath = args[1] || 'public.pem';
        const privateKeyPath = args[2] || 'private.pem';

        fs.writeFileSync(publicKeyPath, publicKey, 'utf8');
        fs.writeFileSync(privateKeyPath, privateKey, 'utf8');

        console.log(`Key pair generated successfully:`);
        console.log(`Public key: ${publicKeyPath}`);
        console.log(`Private key: ${privateKeyPath}`);
        process.exit(0);
      } catch (error) {
        console.error(`Failed to generate key pair: ${error.message}`);
        process.exit(1);
      }

    case 'sign':
      const configPath = args[1];
      const privateKeyPath = args[2];
      const signaturePath = args[3];

      if (!configPath || !privateKeyPath || !signaturePath) {
        console.error(
          'Usage: node signature-verification.js sign <config> <privateKey> <signature>',
        );
        process.exit(1);
      }

      const success = signConfigFile(configPath, privateKeyPath, signaturePath);
      process.exit(success ? 0 : 1);

    case 'verify':
      const verifyConfigPath = args[1];
      const verifyPublicKeyPath = args[2];
      const verifySignaturePath = args[3];

      if (!verifyConfigPath || !verifyPublicKeyPath || !verifySignaturePath) {
        console.error(
          'Usage: node signature-verification.js verify <config> <publicKey> <signature>',
        );
        process.exit(1);
      }

      try {
        const isValid = verifyConfigFileSignature(
          verifyConfigPath,
          verifyPublicKeyPath,
          verifySignaturePath,
        );
        console.log(`Signature is ${isValid ? 'valid' : 'invalid'}`);
        process.exit(isValid ? 0 : 1);
      } catch (error) {
        console.error(`Failed to verify signature: ${error.message}`);
        process.exit(1);
      }

    case 'help':
    default:
      console.log('Usage:');
      console.log(
        '  node signature-verification.js generate-keypair [publicKey] [privateKey]  # Generate RSA key pair',
      );
      console.log(
        '  node signature-verification.js sign <config> <privateKey> <signature>    # Sign config file',
      );
      console.log(
        '  node signature-verification.js verify <config> <publicKey> <signature>  # Verify config file signature',
      );
      console.log(
        '  node signature-verification.js help                                       # Show this help',
      );
      process.exit(1);
  }
}

// 导出函数供其他模块使用
module.exports = {
  generateKeyPair,
  signConfigFile,
  verifyConfigFileSignature,
};

// 如果直接运行此脚本，执行主函数
if (require.main === module) {
  main();
}
