const fs = require('fs');
const path = require('path');

// 需要修复的文件列表
const filesToFix = [
  'src/cart/interfaces/cart.controller.ts',
  'src/payment/payment.controller.ts',
  'src/users/interfaces/web/controllers/customer-management.controller.ts'
];

function fixFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`文件不存在: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;

  // 修复 ApiGetResource 调用 - 需要两个参数
  content = content.replace(
    /@ApiGetResource\(Object,\s*'[^']*'\)/g,
    (match) => {
      changed = true;
      const summary = match.match(/'([^']*)'/)[1];
      return `@ApiGetResource(Object, '${summary}')`;
    }
  );

  // 修复 ApiCreateResource 调用 - 需要三个参数
  content = content.replace(
    /@ApiCreateResource\(\{[^}]*summary:\s*'([^']*)'[^}]*\}\)/g,
    (match, summary) => {
      changed = true;
      return `@ApiCreateResource(Object, Object, '${summary}')`;
    }
  );

  // 修复 ApiUpdateResource 调用 - 需要三个参数
  content = content.replace(
    /@ApiUpdateResource\(\{[^}]*summary:\s*'([^']*)'[^}]*\}\)/g,
    (match, summary) => {
      changed = true;
      return `@ApiUpdateResource(Object, Object, '${summary}')`;
    }
  );

  // 修复 ApiDocs 中的 example 和数字响应码
  content = content.replace(
    /body:\s*\{[^}]*example:\s*\{[^}]*\}[^}]*\}/g,
    (match) => {
      changed = true;
      const typeMatch = match.match(/type:\s*(\w+)/);
      const descMatch = match.match(/description:\s*'([^']*)'/);
      const type = typeMatch ? typeMatch[1] : 'Object';
      const desc = descMatch ? descMatch[1] : '请求体';
      return `body: { type: ${type}, description: '${desc}' }`;
    }
  );

  // 修复响应中的数字键
  content = content.replace(
    /responses:\s*\{[^}]*(\d+):\s*\{[^}]*\}[^}]*\}/g,
    (match) => {
      changed = true;
      return match.replace(/(\d+):/g, 'success:');
    }
  );

  if (changed) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`已修复: ${filePath}`);
  } else {
    console.log(`无需修复: ${filePath}`);
  }
}

// 执行修复
console.log('开始修复装饰器...');
filesToFix.forEach(fixFile);
console.log('装饰器修复完成！');