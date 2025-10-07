// @ts-check
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 文件路径
const checkpointPath = join(__dirname, 'update_hex_checkpoint.json');
const colorSheetsPath = join(__dirname, 'color_sheets.js');

/**
 * 增量更新hex值到color_sheets.js
 */
async function incrementalUpdate() {
  try {
    // 检查checkpoint文件是否存在
    if (!existsSync(checkpointPath)) {
      console.log('未找到checkpoint文件，请先运行update_hex.js搜集数据');
      return;
    }

    // 读取checkpoint数据
    const checkpointData = JSON.parse(readFileSync(checkpointPath, 'utf8'));
    const updatedColors = checkpointData.updatedColors || [];
    
    if (updatedColors.length === 0) {
      console.log('checkpoint文件中没有颜色数据');
      return;
    }

    // 读取color_sheets.js文件
    let colorSheetsContent = readFileSync(colorSheetsPath, 'utf8');
    
    // 解析colorSheets对象
    const colorSheetsMatch = colorSheetsContent.match(/const colorSheets = {[\s\S]+?};/);
    if (!colorSheetsMatch) {
      throw new Error('无法解析color_sheets.js文件中的colorSheets对象');
    }

    const colorSheetsStr = colorSheetsMatch[0];
    const colorSheets = JSON.parse(colorSheetsStr.replace('const colorSheets = ', '').replace(/;$/g, ''));

    // 更新hex值
    let updatedCount = 0;
    const originalColors = colorSheets.colors;
    
    for (const updatedColor of updatedColors) {
      const originalColor = originalColors.find(c => c.code === updatedColor.code);
      if (originalColor && originalColor.hex !== updatedColor.hex) {
        originalColor.hex = updatedColor.hex;
        updatedCount++;
      }
    }

    // 更新文件内容
    const updatedContent = colorSheetsContent.replace(
      /const colorSheets = {[\s\S]+?};/,
      `const colorSheets = ${JSON.stringify(colorSheets, null, 2)};`
    );

    // 写入文件
    writeFileSync(colorSheetsPath, updatedContent, 'utf8');

    console.log(`增量更新完成！`);
    console.log(`更新了 ${updatedCount} 个颜色的hex值`);
    console.log(`总处理颜色数: ${updatedColors.length}`);
    console.log(`最后更新时间: ${checkpointData.lastUpdate || '未知'}`);

    // 生成更新报告
    const reportContent = `
# PANTONE颜色增量更新报告
生成时间: ${new Date().toLocaleString()}

## 更新统计
- 总颜色数: ${updatedColors.length}
- 成功更新: ${updatedCount}
- 更新率: ${((updatedCount / updatedColors.length) * 100).toFixed(2)}%

## 更新详情
- 最后处理时间: ${checkpointData.lastUpdate || '未知'}
- 数据来源: update_hex_checkpoint.json
`;

    writeFileSync('pantone_incremental_update_report.md', reportContent, 'utf8');
    console.log('更新报告已生成: pantone_incremental_update_report.md');

  } catch (error) {
    console.error('增量更新失败:', error.message);
  }
}

// 执行增量更新
incrementalUpdate().catch(console.error);