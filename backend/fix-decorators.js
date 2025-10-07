const fs = require('fs');
const path = require('path');

// 递归查找所有 .ts 文件
function findTsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('dist')) {
      findTsFiles(fullPath, files);
    } else if (item.endsWith('.controller.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// 修复装饰器的函数
function fixDecorators(content) {
  // 修复 @ApiGetResource 调用
  content = content.replace(
    /@ApiGetResource\(\{[\s\S]*?\}\)/g,
    '@ApiGetResource(Object, \'API接口\')'
  );
  
  // 修复 @ApiCreateResource 调用
  content = content.replace(
    /@ApiCreateResource\(\{[\s\S]*?\}\)/g,
    '@ApiCreateResource(Object, Object, \'创建资源\')'
  );
  
  // 修复 @ApiUpdateResource 调用
  content = content.replace(
    /@ApiUpdateResource\(\{[\s\S]*?\}\)/g,
    '@ApiUpdateResource(Object, Object, \'更新资源\')'
  );
  
  // 修复 @ApiDeleteResource 调用
  content = content.replace(
    /@ApiDeleteResource\(\{[\s\S]*?\}\)/g,
    '@ApiDeleteResource(\'删除资源\')'
  );
  
  // 修复 @ApiPaginatedQuery 调用
  content = content.replace(
    /@ApiPaginatedQuery\(\{[\s\S]*?\}\)/g,
    '@ApiPaginatedQuery(Object, \'分页查询\')'
  );
  
  return content;
}

// 主函数
function main() {
  const srcDir = path.join(__dirname, 'src');
  const tsFiles = findTsFiles(srcDir);
  
  console.log(`找到 ${tsFiles.length} 个控制器文件`);
  
  let fixedCount = 0;
  
  for (const file of tsFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const fixedContent = fixDecorators(content);
      
      if (content !== fixedContent) {
        fs.writeFileSync(file, fixedContent);
        console.log(`修复: ${file}`);
        fixedCount++;
      }
    } catch (error) {
      console.error(`处理文件 ${file} 时出错:`, error.message);
    }
  }
  
  console.log(`\n总共修复了 ${fixedCount} 个文件`);
}

main();