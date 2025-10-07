const fs = require('fs');
const path = require('path');

// 需要修复的文件列表
const filesToFix = [
  'src/cart/interfaces/cart.controller.ts',
  'src/payment/payment.controller.ts',
  'src/users/interfaces/web/controllers/customer-management.controller.ts',
  'src/products/products.controller.ts'
];

function fixFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`文件不存在: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;

  // 修复重复的 success 键
  content = content.replace(
    /responses:\s*\{[^}]*success:\s*\{[^}]*\}[^}]*success:\s*\{[^}]*\}[^}]*\}/g,
    (match) => {
      changed = true;
      return match.replace(/success:\s*\{[^}]*\}[^}]*success:/, 'success:');
    }
  );

  // 修复 ApiGetResource 调用 - 从对象形式改为参数形式
  content = content.replace(
    /@ApiGetResource\(\{[^}]*summary:\s*'([^']*)'[^}]*\}\)/g,
    (match, summary) => {
      changed = true;
      return `@ApiGetResource(Object, '${summary}')`;
    }
  );

  // 修复 ApiCreateResource 调用 - 从对象形式改为参数形式
  content = content.replace(
    /@ApiCreateResource\(\{[^}]*summary:\s*'([^']*)'[^}]*\}\)/g,
    (match, summary) => {
      changed = true;
      return `@ApiCreateResource(Object, Object, '${summary}')`;
    }
  );

  // 修复 ApiUpdateResource 调用 - 从对象形式改为参数形式
  content = content.replace(
    /@ApiUpdateResource\(\{[^}]*summary:\s*'([^']*)'[^}]*\}\)/g,
    (match, summary) => {
      changed = true;
      return `@ApiUpdateResource(Object, Object, '${summary}')`;
    }
  );

  // 移除 ApiDocs 中的 example 属性
  content = content.replace(
    /example:\s*\{[^}]*\},?\s*/g,
    () => {
      changed = true;
      return '';
    }
  );

  // 修复数字响应码为 success
  content = content.replace(
    /(\d+):\s*\{/g,
    (match, code) => {
      changed = true;
      return 'success: {';
    }
  );

  // 修复 body 中缺少 type 的问题
  content = content.replace(
    /body:\s*(\w+),/g,
    (match, type) => {
      changed = true;
      return `body: { type: ${type} },`;
    }
  );

  // 修复 params 中的 method 为正确格式
  content = content.replace(
    /params:\s*\{[^}]*method:\s*\{[^}]*\}[^}]*\}/g,
    (match) => {
      changed = true;
      return `params: [{ name: 'method', description: '支付方式' }]`;
    }
  );

  // 移除 query 属性（不支持）
  content = content.replace(
    /query:\s*\{[^}]*\},?\s*/g,
    () => {
      changed = true;
      return '';
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
console.log('开始最终装饰器修复...');
filesToFix.forEach(fixFile);
console.log('最终装饰器修复完成！');