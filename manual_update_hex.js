// @ts-check
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取checkpoint文件
const checkpointPath = join(__dirname, 'update_hex_checkpoint.json');
const colorSheetsPath = join(__dirname, 'color_sheets.js');

try {
  // 读取checkpoint数据
  const checkpointData = JSON.parse(readFileSync(checkpointPath, 'utf8'));
  const updatedColors = checkpointData.updatedColors;
  
  // 读取color_sheets.js文件
  let colorSheetsContent = readFileSync(colorSheetsPath, 'utf8');
  
  // 使用eval来解析colorSheets对象（更简单的方法）
  const colorSheetsMatch = colorSheetsContent.match(/const colorSheets = {[\s\S]+?};/);
  if (!colorSheetsMatch) {
    throw new Error('无法解析color_sheets.js文件中的colorSheets对象');
  }
  
  // 使用eval来安全地解析对象
  const colorSheetsStr = colorSheetsMatch[0].replace('const colorSheets = ', '');
  const colorSheets = eval('(' + colorSheetsStr.replace(/;$/g, '') + ')');
  
  // 更新前275个条目的hex值
  const colorsToUpdate = updatedColors.slice(0, 275);
  let updatedCount = 0;
  
  for (const updatedColor of colorsToUpdate) {
    const originalColor = colorSheets.colors.find(c => c.code === updatedColor.code);
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
  
  console.log(`成功更新了 ${updatedCount} 个颜色的hex值`);
  console.log(`更新范围：前 ${colorsToUpdate.length} 个颜色条目`);
  
} catch (error) {
  console.error('更新失败:', error.message);
}