/**
 * 环境变量加载模块
 * 用途: 处理环境变量文件的加载
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 项目根目录
const PROJECT_ROOT = path.resolve(__dirname, '../..');
// 记录已加载的环境文件路径（用于报告元数据）
let loadedEnvFile = null;

/**
 * 加载环境变量文件
 * @param {string} envFile 环境文件名
 * @param {boolean} override 是否覆盖已存在的环境变量
 * @returns {boolean} 是否成功加载
 */
function loadEnvFile(envFile, override = false) {
  const envPath = path.join(PROJECT_ROOT, envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override });
    if (!loadedEnvFile) loadedEnvFile = envFile;
    return true;
  }
  return false;
}

/**
 * 按优先级链式加载环境变量文件
 * @param {Array} envFiles 环境变量文件路径数组，按优先级从高到低排序
 * @returns {string|boolean} 成功加载的文件路径或false
 */
function loadEnvChain(envFiles) {
  for (const envFile of envFiles) {
    if (loadEnvFile(envFile, false)) {
      return envFile;
    }
  }
  return false;
}

module.exports = {
  loadEnvFile,
  loadEnvChain,
  loadedEnvFile: () => loadedEnvFile,
  PROJECT_ROOT,
};
