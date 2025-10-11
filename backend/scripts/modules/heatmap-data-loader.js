#!/usr/bin/env node

/**
 * 热力图数据加载模块
 * 用途: 处理漏洞数据的加载、验证和转换
 * @author 安全团队
 * @version 1.0.0
 * @since 2025-10-03
 */

const fs = require('fs');
const path = require('path');

/**
 * 从JSON数据源加载漏洞数据
 * @param {string} filePath - JSON文件路径
 * @returns {Array} 标准化的漏洞数据数组
 * @throws {Error} 当文件不存在或格式不正确时抛出错误
 */
function loadVulnerabilitiesFromJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`数据源文件不存在: ${filePath}`);
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // 验证数据结构
    if (!data.vulnerabilities || !Array.isArray(data.vulnerabilities)) {
      throw new Error('数据源格式不正确：缺少vulnerabilities数组');
    }

    // 转换为统一格式
    return data.vulnerabilities.map(vuln => ({
      id: vuln.id || '',
      title: vuln.title || '',
      system: mapToSystem(vuln.title || '', DEFAULT_CONFIG.systemMapping),
      severity: vuln.severity || '低',
      cvss: vuln.cvss || 0,
      status: vuln.status || '未知',
      owner: vuln.owner || '',
      priority: vuln.priority || '',
      businessImpact: vuln.businessImpact || '',
      firstFound: vuln.firstFound || '',
      targetDate: vuln.targetDate || '',
    }));
  } catch (error) {
    console.error(`从JSON加载数据失败: ${error.message}`);
    throw error;
  }
}

/**
 * 使用配置字典映射到系统
 * @param {string} title - 漏洞标题
 * @param {Object} systemMapping - 系统映射配置
 * @returns {string} 映射后的系统名称
 */
function mapToSystem(title, systemMapping) {
  if (!title) return '其他';

  // 按优先级排序系统
  const sortedSystems = Object.entries(systemMapping)
    .filter(([_, config]) => config.keywords.length > 0)
    .sort((a, b) => a[1].priority - b[1].priority);

  // 查找匹配的系统
  for (const [systemName, config] of sortedSystems) {
    for (const keyword of config.keywords) {
      if (title.toLowerCase().includes(keyword.toLowerCase())) {
        return systemName;
      }
    }
  }

  return '其他';
}

/**
 * 按系统和严重度分组漏洞数据
 * @param {Array} vulnerabilities - 漏洞数据数组
 * @param {Object} config - 配置对象
 * @returns {Object} 分组后的数据
 */
function groupBySystemAndSeverity(vulnerabilities, config) {
  const severities = ['严重', '高', '中', '低'];
  const systems = Object.keys(config.systemMapping);

  const heatmapData = {};

  // 初始化所有系统和严重度的计数
  for (const system of systems) {
    heatmapData[system] = {};
    for (const severity of severities) {
      heatmapData[system][severity] = 0;
    }
  }

  // 统计漏洞数量
  for (const vuln of vulnerabilities) {
    if (heatmapData[vuln.system] && heatmapData[vuln.system][vuln.severity] !== undefined) {
      heatmapData[vuln.system][vuln.severity]++;
    }
  }

  return heatmapData;
}

/**
 * 计算最大计数值
 * @param {Object} heatmapData - 热力图数据
 * @returns {number} 最大计数值
 */
function getMaxCount(heatmapData) {
  let maxCount = 0;
  for (const system of Object.keys(heatmapData)) {
    for (const severity of Object.keys(heatmapData[system])) {
      maxCount = Math.max(maxCount, heatmapData[system][severity]);
    }
  }
  return maxCount;
}

module.exports = {
  loadVulnerabilitiesFromJson,
  mapToSystem,
  groupBySystemAndSeverity,
  getMaxCount,
};
