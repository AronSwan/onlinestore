#!/usr/bin/env node

/**
 * CI/CD自动化配置签名脚本
 *
 * 功能：
 * 1. 在CI/CD流程中自动签名配置文件
 * 2. 验证签名
 * 3. 处理多签名场景
 * 4. 集成到CI/CD流水线
 *
 * @author 后端开发团队
 * @version 1.0.0
 * @since 2025-10-12
 */

const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

// 导入高级签名管理器
const {
  AutoSignatureManager,
  KeyManager,
  MultiSignatureManager,
} = require('../security/advanced-signature-manager');

// 配置
const CONFIG = {
  scriptDir: __dirname,
  rootDir: path.join(__dirname, '../..'),
  configPath: path.join(__dirname, '../../scripts/test-monitor.config.json'),
  signers: process.env.CONFIG_SIGNERS ? process.env.CONFIG_SIGNERS.split(',') : null,
  minSignaturesRequired: parseInt(process.env.MIN_SIGNATURES_REQUIRED) || 2,
  enableMultiSignature: process.env.ENABLE_MULTI_SIGNATURE === 'true',
  ciEnvironment: process.env.CI || 'local',
  buildNumber: process.env.BUILD_NUMBER || process.env.GITHUB_RUN_NUMBER || 'local-' + Date.now(),
};

/**
 * 日志函数
 */
function log(level, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] [${CONFIG.ciEnvironment}] ${message}`);
}

/**
 * 检查先决条件
 */
function checkPrerequisites() {
  log('INFO', 'Checking prerequisites...');

  // 检查配置文件是否存在
  if (!fs.existsSync(CONFIG.configPath)) {
    throw new Error(`Config file not found: ${CONFIG.configPath}`);
  }

  // 检查是否在CI环境中
  if (CONFIG.ciEnvironment !== 'local') {
    log('INFO', `Running in CI environment: ${CONFIG.ciEnvironment}`);
    log('INFO', `Build number: ${CONFIG.buildNumber}`);
  }

  log('INFO', 'Prerequisites check passed');
}

/**
 * 初始化签名管理器
 */
function initializeSignatureManagers() {
  log('INFO', 'Initializing signature managers...');

  const keyManager = new KeyManager();
  const multiSignatureManager = new MultiSignatureManager(keyManager);
  const autoSignatureManager = new AutoSignatureManager(keyManager, multiSignatureManager);

  log('INFO', `Current key ID: ${keyManager.currentKeyId}`);

  return { keyManager, multiSignatureManager, autoSignatureManager };
}

/**
 * 执行签名流程
 */
function performSigning(autoSignatureManager) {
  log('INFO', 'Starting automated signing process...');

  // 检查是否需要密钥轮换
  if (autoSignatureManager.keyManager.shouldRotateKey()) {
    log('INFO', 'Key rotation needed, performing rotation...');
    const newKeyId = autoSignatureManager.keyManager.rotateKey();
    log('INFO', `Key rotated. New key ID: ${newKeyId}`);
  }

  // 执行签名
  const success = autoSignatureManager.startAutoSigning(CONFIG.configPath, CONFIG.signers);

  if (!success) {
    throw new Error('Automated signing process failed');
  }

  log('INFO', 'Automated signing process completed successfully');
}

/**
 * 验证签名
 */
function verifySignatures(autoSignatureManager) {
  log('INFO', 'Verifying signatures...');

  // 获取最新的签名ID
  const signaturesDir = path.join(__dirname, '../../scripts/signatures');
  const signatureFiles = fs
    .readdirSync(signaturesDir)
    .filter(file => file.endsWith('.json'))
    .sort((a, b) => {
      // 按时间戳排序，最新的在前
      const matchA = a.match(/sig-(\d+)/);
      const matchB = b.match(/sig-(\d+)/);

      if (!matchA || !matchB) {
        return a.localeCompare(b);
      }

      const timeA = parseInt(matchA[1]);
      const timeB = parseInt(matchB[1]);
      return timeB - timeA;
    });

  if (signatureFiles.length === 0) {
    throw new Error('No signature files found');
  }

  const latestSignatureFile = signatureFiles[0];
  const signatureId = latestSignatureFile.replace('.json', '');

  log('INFO', `Verifying signature with ID: ${signatureId}`);

  try {
    if (CONFIG.enableMultiSignature && CONFIG.signers && CONFIG.signers.length > 1) {
      // 验证多签名
      autoSignatureManager.multiSignatureManager.verifyMultiSignatures(
        CONFIG.configPath,
        signatureId,
      );
      log('INFO', 'Multi-signature verification successful');
    } else {
      // 验证单签名
      const { verifyConfigFileSignature } = require('../security/signature-verification');
      const currentKeyId = autoSignatureManager.keyManager.currentKeyId;
      const publicKeyPath = path.join(__dirname, '../../scripts/keys', `${currentKeyId}.pub`);
      const signaturePath = `${CONFIG.configPath}.sig`;

      const isValid = verifyConfigFileSignature(CONFIG.configPath, publicKeyPath, signaturePath);

      if (!isValid) {
        throw new Error('Signature verification failed');
      }

      log('INFO', 'Single signature verification successful');
    }
  } catch (error) {
    log('ERROR', `Signature verification failed: ${error.message}`);
    throw error;
  }
}

/**
 * 生成签名报告
 */
function generateSignatureReport(autoSignatureManager) {
  log('INFO', 'Generating signature report...');

  const report = {
    timestamp: new Date().toISOString(),
    environment: CONFIG.ciEnvironment,
    buildNumber: CONFIG.buildNumber,
    configPath: CONFIG.configPath,
    keyId: autoSignatureManager.keyManager.currentKeyId,
    signers: CONFIG.signers || [autoSignatureManager.keyManager.currentKeyId],
    multiSignatureEnabled: CONFIG.enableMultiSignature,
    minSignaturesRequired: CONFIG.minSignaturesRequired,
    signatureVerification: 'passed',
  };

  // 保存报告
  const reportPath = path.join(
    __dirname,
    '../../scripts/reports',
    `signature-report-${CONFIG.buildNumber}.json`,
  );

  // 确保报告目录存在
  const reportsDir = path.dirname(reportPath);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  log('INFO', `Signature report generated: ${reportPath}`);

  return reportPath;
}

/**
 * 上传签名报告到构件存储
 */
function uploadSignatureReport(reportPath) {
  if (CONFIG.ciEnvironment === 'local') {
    log('INFO', 'Skipping report upload in local environment');
    return;
  }

  log('INFO', 'Uploading signature report to artifact storage...');

  // 这里是上传报告到构件存储的占位符实现
  // 实际实现取决于CI/CD系统

  if (CONFIG.ciEnvironment === 'github') {
    // GitHub Actions示例
    try {
      // 使用GitHub CLI上传构件
      execSync(`gh artifact upload "signature-report-${CONFIG.buildNumber}.json" "${reportPath}"`, {
        stdio: 'inherit',
      });
      log('INFO', 'Signature report uploaded to GitHub Actions artifacts');
    } catch (error) {
      log('WARN', `Failed to upload report to GitHub Actions: ${error.message}`);
    }
  } else if (CONFIG.ciEnvironment === 'jenkins') {
    // Jenkins示例
    try {
      // 使用Jenkins构件存储
      const artifactDir = path.join(process.env.WORKSPACE || '.', 'signature-artifacts');
      if (!fs.existsSync(artifactDir)) {
        fs.mkdirSync(artifactDir, { recursive: true });
      }

      const artifactPath = path.join(artifactDir, `signature-report-${CONFIG.buildNumber}.json`);
      fs.copyFileSync(reportPath, artifactPath);

      log('INFO', `Signature report copied to Jenkins artifacts: ${artifactPath}`);
    } catch (error) {
      log('WARN', `Failed to copy report to Jenkins artifacts: ${error.message}`);
    }
  } else {
    log('WARN', `Unknown CI environment: ${CONFIG.ciEnvironment}, skipping report upload`);
  }
}

/**
 * 主函数
 */
function main() {
  try {
    log('INFO', 'Starting CI/CD automated config signing process');
    log('INFO', `Config file: ${CONFIG.configPath}`);
    log('INFO', `Signers: ${CONFIG.signers ? CONFIG.signers.join(', ') : 'default'}`);
    log('INFO', `Multi-signature enabled: ${CONFIG.enableMultiSignature}`);

    // 检查先决条件
    checkPrerequisites();

    // 初始化签名管理器
    const { autoSignatureManager } = initializeSignatureManagers();

    // 执行签名流程
    performSigning(autoSignatureManager);

    // 验证签名
    verifySignatures(autoSignatureManager);

    // 生成签名报告
    const reportPath = generateSignatureReport(autoSignatureManager);

    // 上传签名报告到构件存储
    uploadSignatureReport(reportPath);

    log('INFO', 'CI/CD automated config signing process completed successfully');
    process.exit(0);
  } catch (error) {
    log('ERROR', `CI/CD automated config signing process failed: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本，执行主函数
if (require.main === module) {
  main();
}

// 导出函数供其他模块使用
module.exports = {
  checkPrerequisites,
  initializeSignatureManagers,
  performSigning,
  verifySignatures,
  generateSignatureReport,
  uploadSignatureReport,
};
