
/**
 * 更新main.js文件的脚本
 * 
 * 使用方法：
 * 1. 运行此脚本备份并更新main.js文件
 * 2. 重启开发服务器测试更新
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 文件路径
const mainJsPath = path.join(__dirname, 'js', 'main.js');
const backupPath = path.join(__dirname, 'js', 'main.js.backup');
const integrationPath = path.join(__dirname, 'js', 'nav-highlight-integration.js');

// 备份main.js文件
function backupMainJs() {
  try {
    fs.copyFileSync(mainJsPath, backupPath);
    console.log('main.js文件已备份到 main.js.backup');
    return true;
  } catch (error) {
    console.error('备份main.js文件失败:', error);
    return false;
  }
}

// 更新main.js文件
function updateMainJs() {
  try {
    // 读取原始main.js文件
    const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
    
    // 读取集成脚本
    const integrationContent = fs.readFileSync(integrationPath, 'utf8');
    
    // 创建新的main.js内容
    const newMainJsContent = `
// AI-generated: Navigation highlight optimization integration
// Source: Integrated by AI assistant for improved performance; Timestamp: ${new Date().toISOString()}

// 引入导航高亮集成脚本
${integrationContent}

// 原始main.js内容（注释掉以避免冲突）
/*
${mainJsContent}
*/

// 初始化导航高亮功能
document.addEventListener('DOMContentLoaded', function() {
  // 使用优化版本的导航高亮功能
  const navHighlight = initNavigationHighlight({
    useOptimizedVersion: true,
    enableDebugMode: false,
    autoCleanup: true
  });
  
  if (navHighlight) {
    console.log('导航高亮功能已初始化，版本:', navHighlight.version);
  }
  
  // 初始化其他功能...
  // 这里可以添加其他初始化代码
});
    `;
    
    // 写入新的main.js文件
    fs.writeFileSync(mainJsPath, newMainJsContent);
    console.log('main.js文件已更新');
    return true;
  } catch (error) {
    console.error('更新main.js文件失败:', error);
    return false;
  }
}

// 恢复main.js文件
function restoreMainJs() {
  try {
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, mainJsPath);
      console.log('main.js文件已恢复');
      return true;
    } else {
      console.error('未找到main.js备份文件');
      return false;
    }
  } catch (error) {
    console.error('恢复main.js文件失败:', error);
    return false;
  }
}

// 主函数
function main() {
  const action = process.argv[2];
  
  switch (action) {
    case 'backup':
      backupMainJs();
      break;
    case 'update':
      if (backupMainJs()) {
        updateMainJs();
      }
      break;
    case 'restore':
      restoreMainJs();
      break;
    default:
      console.log('用法: node update-main.js [backup|update|restore]');
      console.log('  backup  - 备份main.js文件');
      console.log('  update  - 更新main.js文件');
      console.log('  restore - 恢复main.js文件');
      break;
  }
}

// 执行主函数
main();
  