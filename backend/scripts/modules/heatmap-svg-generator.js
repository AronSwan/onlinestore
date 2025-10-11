#!/usr/bin/env node

/**
 * 热力图SVG生成模块
 * 用途: 处理SVG热力图的生成和样式
 * @author 安全团队
 * @version 1.0.0
 * @since 2025-10-03
 */

/**
 * 生成颜色梯度（无障碍对比度优化）
 * @param {string} baseColor - 基础颜色（十六进制）
 * @param {number} count - 计数值
 * @param {number} maxCount - 最大计数值
 * @returns {Object} 包含背景色和文本颜色的对象
 */
function generateColorGradient(baseColor, count, maxCount) {
  if (count === 0) return DEFAULT_CONFIG.severityColors.empty;

  // 根据计数值调整颜色强度
  const intensity = Math.min(1, 0.6 + (count / maxCount) * 0.4);

  // 将十六进制颜色转换为RGB
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // 应用强度
  const adjustedR = Math.round(r * intensity);
  const adjustedG = Math.round(g * intensity);
  const adjustedB = Math.round(b * intensity);

  // 转换回十六进制
  return {
    bg: `#${adjustedR.toString(16).padStart(2, '0')}${adjustedG.toString(16).padStart(2, '0')}${adjustedB.toString(16).padStart(2, '0')}`,
    text: intensity > 0.5 ? '#ffffff' : '#000000',
  };
}

/**
 * 生成自适应尺寸的SVG热力图，支持多语言和无障碍设计
 * @param {Object} heatmapData - 热力图数据
 * @param {Object} config - 配置对象
 * @param {string} language - 语言代码
 * @returns {string} SVG字符串
 */
function generateSVGHeatmap(heatmapData, config, language = 'zh') {
  const labels = config.localization.labels[language] || config.localization.labels.zh;
  const systems = Object.keys(heatmapData);
  const severities =
    language === 'en' ? ['Critical', 'High', 'Medium', 'Low'] : ['严重', '高', '中', '低'];
  const { cellWidth, cellHeight, headerHeight, headerWidth, legendHeight } = config.dimensions;

  // 计算最大计数值
  const maxCount = getMaxCount(heatmapData);

  // 计算总尺寸
  const width = headerWidth + systems.length * cellWidth;
  const height = headerHeight + severities.length * cellHeight + legendHeight;

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" aria-label="${labels.heatmapTitle}">`;

  // 添加样式定义
  svg += generateSVGStyle();

  // 背景
  svg += `<rect width="${width}" height="${height}" fill="white" stroke="#ddd" stroke-width="1"/>`;

  // 表头
  svg += generateSVGHeader(systems, headerWidth, cellWidth, headerHeight, labels);

  // 严重度标签
  svg += generateSVGSeverityLabels(severities, headerWidth, cellHeight, headerHeight, labels);

  // 数据单元格
  svg += generateSVGDataCells(
    heatmapData,
    systems,
    severities,
    headerWidth,
    cellHeight,
    cellWidth,
    config,
    maxCount,
  );

  // 图例
  svg += generateSVGLegend(severities, legendHeight, config, labels);

  // 添加生成时间戳
  const timestamp = new Date().toISOString().split('T')[0];
  svg += `<text x="${width - 100}" y="${height - 5}" class="legend-item" font-size="10">${labels.updatePrefix}: ${timestamp}</text>`;

  svg += `</svg>`;
  return svg;
}

/**
 * 生成SVG样式定义
 * @returns {string} SVG样式字符串
 */
function generateSVGStyle() {
  return `
  <defs>
    <style>
      .header-text { font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; }
      .label-text { font-family: Arial, sans-serif; font-size: 14px; }
      .count-text { font-family: Arial, sans-serif; font-size: ${Math.max(10, Math.min(16, DEFAULT_CONFIG.dimensions.cellWidth / 8))}px; font-weight: bold; }
      .legend-text { font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; }
      .legend-item { font-family: Arial, sans-serif; font-size: 12px; }
      .cell { stroke: #ddd; stroke-width: 1; }
    </style>
  </defs>`;
}

/**
 * 生成SVG表头
 * @param {Array} systems - 系统数组
 * @param {number} headerWidth - 表头宽度
 * @param {number} cellWidth - 单元格宽度
 * @param {number} headerHeight - 表头高度
 * @param {Object} labels - 标签对象
 * @returns {string} SVG表头字符串
 */
function generateSVGHeader(systems, headerWidth, cellWidth, headerHeight, labels) {
  let svg = `<text x="${headerWidth / 2}" y="${headerHeight / 2 + 5}" text-anchor="middle" class="header-text">${labels.systemSeverity}</text>`;

  for (let i = 0; i < systems.length; i++) {
    const x = headerWidth + i * cellWidth + cellWidth / 2;
    svg += `<text x="${x}" y="${headerHeight / 2 + 5}" text-anchor="middle" class="header-text">${systems[i]}</text>`;
  }

  return svg;
}

/**
 * 生成SVG严重度标签
 * @param {Array} severities - 严重度数组
 * @param {number} headerWidth - 表头宽度
 * @param {number} cellHeight - 单元格高度
 * @param {number} headerHeight - 表头高度
 * @param {Object} labels - 标签对象
 * @returns {string} SVG严重度标签字符串
 */
function generateSVGSeverityLabels(severities, headerWidth, cellHeight, headerHeight, labels) {
  let svg = '';

  for (let i = 0; i < severities.length; i++) {
    const y = headerHeight + i * cellHeight + cellHeight / 2 + 5;
    svg += `<text x="${headerWidth / 2}" y="${y}" text-anchor="middle" class="label-text">${severities[i]}</text>`;
  }

  return svg;
}

/**
 * 生成SVG数据单元格
 * @param {Object} heatmapData - 热力图数据
 * @param {Array} systems - 系统数组
 * @param {Array} severities - 严重度数组
 * @param {number} headerWidth - 表头宽度
 * @param {number} cellHeight - 单元格高度
 * @param {number} cellWidth - 单元格宽度
 * @param {Object} config - 配置对象
 * @param {number} maxCount - 最大计数值
 * @returns {string} SVG数据单元格字符串
 */
function generateSVGDataCells(
  heatmapData,
  systems,
  severities,
  headerWidth,
  cellHeight,
  cellWidth,
  config,
  maxCount,
) {
  let svg = '';

  for (let i = 0; i < systems.length; i++) {
    for (let j = 0; j < severities.length; j++) {
      const system = systems[i];
      const severityMap = {
        Critical: '严重',
        High: '高',
        Medium: '中',
        Low: '低',
        严重: '严重',
        高: '高',
        中: '中',
        低: '低',
      };
      const mappedSeverity = severityMap[severities[j]];
      const count = heatmapData[system][mappedSeverity];
      const x = headerWidth + i * cellWidth;
      const y = headerHeight + j * cellHeight;

      // 使用颜色梯度和无障碍文本颜色
      const baseColor =
        count > 0 ? config.severityColors[mappedSeverity].bg : config.severityColors.empty.bg;
      const color = generateColorGradient(baseColor, count, maxCount);

      svg += `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" fill="${color.bg}" class="cell"/>`;

      if (count > 0) {
        const textX = x + cellWidth / 2;
        const textY = y + cellHeight / 2 + 5;
        svg += `<text x="${textX}" y="${textY}" text-anchor="middle" class="count-text" fill="${color.text}">${count}</text>`;
      }
    }
  }

  return svg;
}

/**
 * 生成SVG图例
 * @param {Array} severities - 严重度数组
 * @param {number} legendHeight - 图例高度
 * @param {Object} config - 配置对象
 * @param {Object} labels - 标签对象
 * @returns {string} SVG图例字符串
 */
function generateSVGLegend(severities, legendHeight, config, labels) {
  let svg = `<text x="0" y="${legendHeight - 30}" class="legend-text">${labels.legend}:</text>`;

  let legendX = 50;
  for (let i = 0; i < severities.length; i++) {
    const severityMap = {
      Critical: '严重',
      High: '高',
      Medium: '中',
      Low: '低',
      严重: '严重',
      高: '高',
      中: '中',
      低: '低',
    };
    const mappedSeverity = severityMap[severities[i]];
    const color = config.severityColors[mappedSeverity];

    svg += `<rect x="${legendX}" y="${legendHeight - 40}" width="15" height="15" fill="${color.bg}" class="cell"/>`;
    svg += `<text x="${legendX + 20}" y="${legendHeight - 30}" class="legend-item">${severities[i]}</text>`;

    legendX += 80;
  }

  return svg;
}

/**
 * 生成无数据占位SVG
 * @param {Object} config - 配置对象
 * @param {string} language - 语言代码
 * @returns {string} 无数据占位SVG字符串
 */
function generateNoDataPlaceholder(config, language = 'zh') {
  const labels = config.localization.labels[language] || config.localization.labels.zh;
  const width = 600;
  const height = 200;

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#f9f9f9" stroke="#ddd" stroke-width="1"/>
    <text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#666">
      ${labels.noDataMessage}
    </text>
  </svg>`;
}

module.exports = {
  generateColorGradient,
  generateSVGHeatmap,
  generateNoDataPlaceholder,
};
