const fs = require('fs');
const path = require('path');

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    return null;
  }
}

function hasPlaceholder(text) {
  if (!text) return false;
  const needles = [
    '占位',
    '占位生成脚本',
    '占位审查',
    '优化建议（占位）',
    'placeholder'
  ];
  return needles.some((n) => text.includes(n));
}

function log(msg) {
  console.log(msg);
}

function main() {
  const args = process.argv.slice(2);
  const failOnPlaceholder = args.includes('--fail-on-placeholder');

  const baseDir = path.resolve(__dirname, '../../docs/generated/ai');
  const targets = [
    path.join(baseDir, 'README.md'),
    path.join(baseDir, 'review-report.txt'),
    path.join(baseDir, 'optimization-suggestions.md'),
  ];

  let found = [];
  for (const file of targets) {
    const content = readFileSafe(file);
    const isPlaceholder = hasPlaceholder(content);
    log(`[docs:ai:check] ${file} ` + (content ? 'found' : 'missing') + (isPlaceholder ? ' (placeholder detected)' : ''));
    if (isPlaceholder) {
      found.push(file);
    }
  }

  if (found.length > 0) {
    log(`⚠️ 检测到占位产物 ${found.length} 个：\n- ` + found.join('\n- '));
    if (failOnPlaceholder) {
      log('❌ 当前启用了 --fail-on-placeholder，退出码 1。请尽快替换为真实逻辑。');
      process.exit(1);
    } else {
      log('ℹ️ 未启用失败开关，仅提示。');
    }
  } else {
    log('✅ 未检测到占位产物。');
  }
}

main();