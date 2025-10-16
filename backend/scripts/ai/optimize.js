#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const prettier = require('prettier');

let unified, remarkParse, remarkStringify, remarkGfm, remarkSlug, remarkNormalize;
try {
  unified = require('unified');
  remarkParse = require('remark-parse');
  remarkStringify = require('remark-stringify');
  remarkGfm = require('remark-gfm');
  remarkSlug = require('remark-slug');
  // remark-normalize-headings 可选
  try {
    remarkNormalize = require('remark-normalize-headings');
  } catch {
    remarkNormalize = null;
  }
} catch (e) {
  unified = null;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function isMarkdown(name) {
  return name.toLowerCase().endsWith('.md');
}

function formatMarkdown(content) {
  // 使用 Prettier 进行统一格式化
  try {
    return prettier.format(content, { parser: 'markdown' });
  } catch {
    return content;
  }
}

function transformMarkdown(content) {
  if (!unified) return content;
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkSlug)
    .use(remarkStringify, { bullet: '-', fences: true, listItemIndent: 'one' });
  if (remarkNormalize) {
    processor.use(remarkNormalize);
  }
  try {
    const file = processor.processSync(content);
    return String(file);
  } catch {
    return content;
  }
}

function walk(dir) {
  const results = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results.push(...walk(full));
    } else if (stat.isFile() && isMarkdown(name)) {
      results.push(full);
    }
  }
  return results;
}

function main() {
  const docsDir = path.resolve(__dirname, '../../docs');
  const generatedDir = path.join(docsDir, 'generated', 'ai');
  ensureDir(generatedDir);

  const targets = [];
  const typedocDir = path.join(generatedDir, 'typedoc');
  if (fs.existsSync(typedocDir)) {
    targets.push(...walk(typedocDir));
  }
  const apiMd = path.join(generatedDir, 'api.md');
  if (fs.existsSync(apiMd)) {
    targets.push(apiMd);
  }

  let changed = 0;
  let processed = 0;
  const changeLog = [];

  for (const file of targets) {
    const before = fs.readFileSync(file, 'utf8');
    let after = transformMarkdown(before);
    after = formatMarkdown(after);
    processed++;
    if (after !== before) {
      fs.writeFileSync(file, after, 'utf8');
      changed++;
      changeLog.push(`- ${path.relative(generatedDir, file)}`);
    }
  }

  const suggestionsPath = path.join(generatedDir, 'optimization-suggestions.md');
  const now = new Date().toISOString();
  const suggestions = [
    `# 文档优化建议`,
    ``,
    `- 时间: ${now}`,
    `- 处理文件: ${processed} 个`,
    `- 修改文件: ${changed} 个`,
    ``,
    `## 已应用的优化`,
    `- 使用 Remark 管道 (GFM/Slug${remarkNormalize ? '/NormalizeHeadings' : ''}) 进行结构化处理`,
    `- 使用 Prettier 统一 Markdown 格式`,
    ``,
    `## 下一步建议`,
    '- 在 `typedoc.json` 中维护入口以减少噪音并提升文档可读性',
    `- 在控制器/服务上补充 TSDoc 注释 (@remarks/@example) 提升生成质量`,
    `- 如有跨页链接，建议引入链接校验 (remark-validate-links) 并在 CI 中报告`,
    ``,
    `## 修改文件列表`,
    ...(changeLog.length > 0 ? changeLog : ['- 无修改']),
    ``,
  ].join('\n');
  fs.writeFileSync(suggestionsPath, suggestions, { encoding: 'utf8' });

  console.log(`[docs:ai:optimize] 已处理 ${processed} 个 Markdown 文件，修改 ${changed} 个。`);
  console.log(`[docs:ai:optimize] 建议文档已生成: ${suggestionsPath}`);
}

main();