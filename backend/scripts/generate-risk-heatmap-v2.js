#!/usr/bin/env node

/**
 * 风险热力图生成脚本 V2 (重构版)
 * 用途: 根据结构化漏洞数据生成风险热力图
 * 使用方法:
 *   npm run security:heatmap:v2
 * @author 安全团队
 * @version 2.1.0
 * @since 2025-10-03
 */

const fs = require('fs');
const path = require('path');

// 导入模块化组件
const {
  loadVulnerabilitiesFromJson,
  mapToSystem,
  groupBySystemAndSeverity,
  getMaxCount,
} = require('./modules/heatmap-data-loader');
const {
  generateColorGradient,
  generateSVGHeatmap,
  generateNoDataPlaceholder,
} = require('./modules/heatmap-svg-generator');
const {
  updateHeatmapSection,
  validateHeatmapSection,
} = require('./modules/heatmap-document-updater');

// 项目根目录
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 默认配置
const DEFAULT_CONFIG = {
  // 多语言支持和锚点配置
  localization: {
    // 支持的语言
    supportedLanguages: ['zh', 'en'],
    // 默认语言
    defaultLanguage: 'zh',
    // 标题和标签的多语言映射
    labels: {
      zh: {
        heatmapTitle: '风险热力图',
        systemSeverity: '系统/严重度',
        legend: '图例',
        critical: '严重',
        high: '高',
        medium: '中',
        low: '低',
        updatePrefix: '更新',
        dataSource: '数据来源',
        updateFrequency: '更新频率',
        owner: '负责人',
        generateScript: '生成脚本',
        triggerConditions: '触发条件',
        outputLocation: '输出位置',
        ciIntegration: 'CI集成',
        noDataMessage: '暂无漏洞数据',
        errorLoadingData: '加载漏洞数据时出错',
      },
      en: {
        heatmapTitle: 'Risk Heatmap',
        systemSeverity: 'System/Severity',
        legend: 'Legend',
        critical: 'Critical',
        high: 'High',
        medium: 'Medium',
        low: 'Low',
        updatePrefix: 'Updated',
        dataSource: 'Data Source',
        updateFrequency: 'Update Frequency',
        owner: 'Owner',
        generateScript: 'Generate Script',
        triggerConditions: 'Trigger Conditions',
        outputLocation: 'Output Location',
        ciIntegration: 'CI Integration',
        noDataMessage: 'No vulnerability data available',
        errorLoadingData: 'Error loading vulnerability data',
      },
    },
    // 锚点配置（支持多种可能的标题）
    anchors: {
      heatmapSection: ['## 风险热力图', '## Risk Heatmap', '## 风险热力图 ', '## Risk Heatmap '],
      // 自动生成内容标记
      autoGenStart: '<!-- 自动生成内容开始 -->',
      autoGenEnd: '<!-- 自动生成内容结束 -->',
      autoGenStartEn: '<!-- Auto-generated content start -->',
      autoGenEndEn: '<!-- Auto-generated content end -->',
    },
  },
  // 系统分类字典，支持多标签和优先级
  systemMapping: {
    性能问题: {
      keywords: ['索引', '查询', '性能', '缓存', '优化', 'performance', 'index', 'query', 'cache'],
      priority: 1,
      color: '#43a047',
      aliases: ['性能', 'Performance'],
    },
    支付系统: {
      keywords: ['支付', '交易', '结算', '账单', 'payment', 'transaction', 'billing'],
      priority: 2,
      color: '#e53935',
      aliases: ['支付', 'Payment'],
    },
    认证授权: {
      keywords: [
        '认证',
        '角色',
        'JWT',
        '授权',
        '登录',
        '权限',
        '守卫',
        'auth',
        'authentication',
        'authorization',
        'login',
        'role',
      ],
      priority: 3,
      color: '#fb8c00',
      aliases: ['认证', 'Auth'],
    },
    数据安全: {
      keywords: [
        '密码',
        '用户',
        '数据',
        '敏感',
        '加密',
        '解密',
        'password',
        'user',
        'data',
        'encryption',
      ],
      priority: 4,
      color: '#fdd835',
      aliases: ['数据', 'Data'],
    },
    其他: {
      keywords: [],
      priority: 5,
      color: '#1e88e5',
      aliases: ['其他', 'Other'],
    },
  },
  // 严重度颜色映射（无障碍对比度优化）
  severityColors: {
    严重: { bg: '#d32f2f', text: '#ffffff' },
    高: { bg: '#f57c00', text: '#ffffff' },
    中: { bg: '#fbc02d', text: '#000000' },
    低: { bg: '#388e3c', text: '#ffffff' },
    empty: { bg: '#f5f5f5', text: '#000000' },
    Critical: { bg: '#d32f2f', text: '#ffffff' },
    High: { bg: '#f57c00', text: '#ffffff' },
    Medium: { bg: '#fbc02d', text: '#000000' },
    Low: { bg: '#388e3c', text: '#ffffff' },
  },
  // 热力图尺寸配置
  dimensions: {
    cellWidth: 120,
    cellHeight: 40,
    headerHeight: 30,
    headerWidth: 100,
    legendHeight: 50,
  },
  // 数据源配置
  dataSource: {
    primary: 'data/security-vulnerabilities.json',
    fallback: 'SECURITY_VULNERABILITY_TRACKING.md',
  },
};

/**
 * 加载漏洞数据
 * @param {Object} config - 配置对象
 * @returns {Array} 漏洞数据数组
 */
async function loadVulnerabilityData(config) {
  try {
    // 读取结构化漏洞数据
    const dataSourcePath = path.join(PROJECT_ROOT, config.dataSource.primary);
    let vulnerabilities = [];

    try {
      vulnerabilities = loadVulnerabilitiesFromJson(dataSourcePath);
      console.log(`从JSON数据源加载了 ${vulnerabilities.length} 个漏洞`);
    } catch (error) {
      console.warn(`从JSON数据源加载失败，尝试使用备用数据源: ${error.message}`);

      // 如果JSON数据源失败，尝试使用Markdown数据源
      const { parseVulnerabilities } = require('./generate-risk-heatmap.js');
      const fallbackPath = path.join(PROJECT_ROOT, config.dataSource.fallback);

      if (fs.existsSync(fallbackPath)) {
        const content = fs.readFileSync(fallbackPath, 'utf8');
        vulnerabilities = parseVulnerabilities(content);
        console.log(`从Markdown备用数据源加载了 ${vulnerabilities.length} 个漏洞`);
      } else {
        console.error(`所有数据源都不可用`);
      }
    }

    return vulnerabilities;
  } catch (error) {
    console.error(`加载漏洞数据失败: ${error.message}`);
    throw error;
  }
}

/**
 * 处理热力图生成
 * @param {Array} vulnerabilities - 漏洞数据数组
 * @param {Object} config - 配置对象
 * @param {string} language - 语言代码
 * @returns {Object} 生成结果
 */
function processHeatmapGeneration(vulnerabilities, config, language) {
  const labels = config.localization.labels[language] || config.localization.labels.zh;

  // 检查是否有漏洞数据
  if (vulnerabilities.length === 0) {
    console.log(`没有漏洞数据，生成占位图`);

    // 确保输出目录存在
    const docsDir = path.join(PROJECT_ROOT, 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    // 生成无数据占位图
    const svg = generateNoDataPlaceholder(config, language);
    const outputPath = path.join(docsDir, 'security-risk-heatmap.svg');
    fs.writeFileSync(outputPath, svg);

    console.log(`${labels.heatmapTitle}占位图已生成: ${outputPath}`);
    return { success: true, outputPath, hasData: false };
  }

  // 按系统和严重度分组
  const heatmapData = groupBySystemAndSeverity(vulnerabilities, config);

  // 生成SVG热力图
  const svg = generateSVGHeatmap(heatmapData, config, language);

  // 确保输出目录存在
  const docsDir = path.join(PROJECT_ROOT, 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // 保存到文档目录
  const outputPath = path.join(docsDir, 'security-risk-heatmap.svg');
  fs.writeFileSync(outputPath, svg);

  console.log(`${labels.heatmapTitle}已生成: ${outputPath}`);
  console.log(`系统分布: ${Object.keys(heatmapData).join(', ')}`);

  // 输出统计信息
  const statistics = {};
  for (const system of Object.keys(heatmapData)) {
    const systemTotal = Object.values(heatmapData[system]).reduce((sum, count) => sum + count, 0);
    if (systemTotal > 0) {
      console.log(`${system}: ${systemTotal} 个漏洞`);
      statistics[system] = systemTotal;
    }
  }

  return {
    success: true,
    outputPath,
    hasData: true,
    heatmapData,
    statistics,
  };
}

/**
 * 更新文档
 * @param {string} svgPath - SVG图片路径
 * @param {Object} config - 配置对象
 * @param {string} language - 语言代码
 * @returns {boolean} 是否更新成功
 */
function updateDocumentation(svgPath, config, language) {
  const labels = config.localization.labels[language] || config.localization.labels.zh;

  try {
    // 更新追踪表中的热力图部分，保留用户自定义备注
    const trackingPath = path.join(PROJECT_ROOT, 'SECURITY_VULNERABILITY_TRACKING.md');
    if (fs.existsSync(trackingPath)) {
      const content = fs.readFileSync(trackingPath, 'utf8');
      const relativeSvgPath = 'docs/security-risk-heatmap.svg';
      const updatedContent = updateHeatmapSection(content, relativeSvgPath, language);

      fs.writeFileSync(trackingPath, updatedContent);
      console.log(`已更新漏洞追踪表中的${labels.heatmapTitle}部分`);
      return true;
    } else {
      console.warn(`漏洞追踪表文件不存在: ${trackingPath}`);
      return false;
    }
  } catch (error) {
    console.error(`更新文档失败: ${error.message}`);
    return false;
  }
}

/**
 * 处理错误情况
 * @param {Error} error - 错误对象
 * @param {Object} config - 配置对象
 * @param {string} language - 语言代码
 */
function handleError(error, config, language) {
  console.error(`生成风险热力图失败: ${error.message}`);
  console.error(error.stack);

  // 生成错误占位图
  const docsDir = path.join(PROJECT_ROOT, 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const labels = config.localization.labels[language] || config.localization.labels.zh;
  const errorSvg = `<svg width="600" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="600" height="200" fill="#ffebee" stroke="#f44336" stroke-width="1"/>
    <text x="300" y="100" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#d32f2f">
      ${labels.errorLoadingData}: ${error.message}
    </text>
  </svg>`;

  const outputPath = path.join(docsDir, 'security-risk-heatmap.svg');
  fs.writeFileSync(outputPath, errorSvg);

  console.log(`已生成错误占位图: ${outputPath}`);
}

/**
 * 主函数，支持多语言和配置选项
 * @param {Object} options - 选项对象
 */
async function generateRiskHeatmap(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options.config };
  const language = options.language || config.localization.defaultLanguage;

  try {
    // 加载漏洞数据
    const vulnerabilities = await loadVulnerabilityData(config);

    // 处理热力图生成
    const result = processHeatmapGeneration(vulnerabilities, config, language);

    if (result.success) {
      // 更新文档
      updateDocumentation(path.relative(PROJECT_ROOT, result.outputPath), config, language);
    }

    return result;
  } catch (error) {
    handleError(error, config, language);
    process.exit(1);
  }
}

// 运行生成
if (require.main === module) {
  generateRiskHeatmap();
}

// 导出模块
module.exports = {
  generateRiskHeatmap,
  loadVulnerabilitiesFromJson,
  mapToSystem,
  groupBySystemAndSeverity,
  generateColorGradient,
  getMaxCount,
  generateSVGHeatmap,
  generateNoDataPlaceholder,
  updateHeatmapSection,
  validateHeatmapSection,
  DEFAULT_CONFIG,
};
