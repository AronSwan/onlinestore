#!/usr/bin/env node

/**
 * 热力图文档更新模块
 * 用途: 处理文档中热力图部分的更新和维护
 * @author 安全团队
 * @version 1.0.0
 * @since 2025-10-03
 */

/**
 * 保留用户自定义备注的热力图段落更新，支持多语言和多种锚点
 * @param {string} content - 文档内容
 * @param {string} svgPath - SVG图片路径
 * @param {string} language - 语言代码
 * @returns {string} 更新后的文档内容
 */
function updateHeatmapSection(content, svgPath, language = 'zh') {
  const config = DEFAULT_CONFIG.localization;
  const labels = config.labels[language] || config.labels.zh;
  const anchors = config.anchors;
  
  // 创建多种可能的锚点匹配模式
  const anchorPatterns = anchors.heatmapSection.map(anchor => {
    // 转义特殊字符并创建正则表达式
    const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`${escaped}\\n([\\s\\S]*?)(?=\\n## |\\n$)`);
  });
  
  // 尝试匹配任何一种锚点模式
  let match = null;
  let matchedPattern = null;
  
  for (const pattern of anchorPatterns) {
    match = content.match(pattern);
    if (match) {
      matchedPattern = pattern;
      break;
    }
  }
  
  // 生成默认热力图段落
  const defaultSection = generateDefaultHeatmapSection(svgPath, labels, anchors);
  
  if (match) {
    // 如果找到现有部分，保留用户自定义备注
    const existingSection = match[0];
    
    // 检查是否有任何一种自动生成内容标记
    const autoGenPatterns = [
      new RegExp(`${anchors.autoGenStart}[\\s\\S]*?${anchors.autoGenEnd}`),
      new RegExp(`${anchors.autoGenStartEn}[\\s\\S]*?${anchors.autoGenEndEn}`)
    ];
    
    let autoGenMatch = null;
    let usedAnchor = null;
    
    for (const pattern of autoGenPatterns) {
      autoGenMatch = existingSection.match(pattern);
      if (autoGenMatch) {
        usedAnchor = pattern.source.includes('Auto-generated') ? 'en' : 'zh';
        break;
      }
    }
    
    if (autoGenMatch) {
      // 如果有标记，只替换标记之间的内容
      return updateSectionWithMarkers(existingSection, matchedPattern, svgPath, labels, anchors, usedAnchor);
    } else {
      // 如果没有标记，添加标记并替换图片链接
      return updateSectionWithoutMarkers(existingSection, matchedPattern, svgPath, labels, anchors);
    }
  } else {
    // 如果没有找到现有部分，添加默认部分
    return content + '\n\n' + defaultSection;
  }
}

/**
 * 生成默认热力图段落
 * @param {string} svgPath - SVG图片路径
 * @param {Object} labels - 标签对象
 * @param {Object} anchors - 锚点配置
 * @returns {string} 默认热力图段落字符串
 */
function generateDefaultHeatmapSection(svgPath, labels, anchors) {
  return `## ${labels.heatmapTitle}

![${labels.heatmapTitle}](${svgPath})

**${labels.dataSource}**: 结构化漏洞数据 (data/security-vulnerabilities.json)
**${labels.updateFrequency}**: 每日自动更新
**${labels.owner}**: 安全团队
**${labels.generateScript}**: \`scripts/generate-risk-heatmap-v2.js\`
**${labels.triggerConditions}**: 
- 每日UTC 00:00自动执行
- 漏洞状态变更时自动执行
- 手动执行: \`npm run security:heatmap:v2\`
**${labels.outputLocation}**: \`${svgPath}\`
**${labels.ciIntegration}**: 在\`.github/workflows/security-dashboard.yml\`中配置

${anchors.autoGenStart}
${anchors.autoGenEnd}`;
}

/**
 * 更新带有标记的部分
 * @param {string} existingSection - 现有部分
 * @param {RegExp} matchedPattern - 匹配的模式
 * @param {string} svgPath - SVG图片路径
 * @param {Object} labels - 标签对象
 * @param {Object} anchors - 锚点配置
 * @param {string} usedAnchor - 使用的锚点
 * @returns {string} 更新后的内容
 */
function updateSectionWithMarkers(existingSection, matchedPattern, svgPath, labels, anchors, usedAnchor) {
  const userContent = existingSection.replace(
    new RegExp(`${usedAnchor === 'en' ? anchors.autoGenStartEn : anchors.autoGenStart}[\\s\\S]*?${usedAnchor === 'en' ? anchors.autoGenEndEn : anchors.autoGenEnd}`),
    ''
  );
  
  const startMarker = usedAnchor === 'en' ? anchors.autoGenStartEn : anchors.autoGenStart;
  const endMarker = usedAnchor === 'en' ? anchors.autoGenEndEn : anchors.autoGenEnd;
  const newAutoGenContent = `${startMarker}
![${labels.heatmapTitle}](${svgPath})
${endMarker}`;
  
  return existingSection.replace(matchedPattern, userContent + newAutoGenContent);
}

/**
 * 更新不带标记的部分
 * @param {string} existingSection - 现有部分
 * @param {RegExp} matchedPattern - 匹配的模式
 * @param {string} svgPath - SVG图片路径
 * @param {Object} labels - 标签对象
 * @param {Object} anchors - 锚点配置
 * @returns {string} 更新后的内容
 */
function updateSectionWithoutMarkers(existingSection, matchedPattern, svgPath, labels, anchors) {
  // 尝试匹配各种可能的图片链接格式
  const imagePatterns = [
    new RegExp(`!\\[${labels.heatmapTitle}\\]\\(docs\\/security-risk-heatmap\\.svg\\)`),
    new RegExp(`!\\[风险热力图\\]\\(docs\\/security-risk-heatmap\\.svg\\)`),
    new RegExp(`!\\[Risk Heatmap\\]\\(docs\\/security-risk-heatmap\\.svg\\)`)
  ];
  
  let updatedSection = existingSection;
  for (const pattern of imagePatterns) {
    updatedSection = updatedSection.replace(pattern, `![${labels.heatmapTitle}](${svgPath})`);
  }
  
  // 添加自动生成标记
  const ciPattern = new RegExp(`(\\*\\*${labels.ciIntegration}\\*\\*:.*)`);
  const markedSection = updatedSection.replace(
    ciPattern,
    `$1\n\n${anchors.autoGenStart}\n${anchors.autoGenEnd}`
  );
  
  return markedSection;
}

/**
 * 验证文档中的热力图部分
 * @param {string} content - 文档内容
 * @param {string} language - 语言代码
 * @returns {Object} 验证结果
 */
function validateHeatmapSection(content, language = 'zh') {
  const labels = DEFAULT_CONFIG.localization.labels[language] || DEFAULT_CONFIG.localization.labels.zh;
  const anchors = DEFAULT_CONFIG.localization.anchors;
  
  // 检查是否有热力图部分
  const hasHeatmapSection = anchors.heatmapSection.some(anchor => {
    const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`${escaped}`);
    return pattern.test(content);
  });
  
  // 检查是否有自动生成标记
  const hasAutoGenMarkers = 
    content.includes(anchors.autoGenStart) && content.includes(anchors.autoGenEnd) ||
    content.includes(anchors.autoGenStartEn) && content.includes(anchors.autoGenEndEn);
  
  // 检查是否有图片链接
  const hasImageLink = content.includes(`![${labels.heatmapTitle}](`);
  
  return {
    hasHeatmapSection,
    hasAutoGenMarkers,
    hasImageLink,
    isValid: hasHeatmapSection && hasAutoGenMarkers && hasImageLink
  };
}

module.exports = {
  updateHeatmapSection,
  validateHeatmapSection
};