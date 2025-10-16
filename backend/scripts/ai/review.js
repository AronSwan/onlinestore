#!/usr/bin/env node
/**
 * AI 文档审查脚本（markdownlint + cspell 汇总）
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function log(msg) {
  console.log(`[docs:ai:review] ${msg}`);
}

const projectRoot = path.resolve(path.join(__dirname, '..', '..'));
const aiDir = path.join(projectRoot, 'docs', 'generated', 'ai');

if (!fs.existsSync(aiDir)) {
  fs.mkdirSync(aiDir, { recursive: true });
}

function runCmd(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    cwd: projectRoot,
    shell: true,
    encoding: 'utf8',
    ...opts,
  });
  return res;
}

function markdownlintAll() {
  log('运行 markdownlint...');
  const mdFilesGlob = 'docs/generated/ai/**/*.md';
  const configPath = path.join(projectRoot, 'docs', 'quality', 'markdownlint.json');
  const args = ['npx', 'markdownlint', mdFilesGlob];
  if (fs.existsSync(configPath)) {
    args.push('--config');
    args.push(configPath);
  }
  const result = runCmd(args.join(' '), []);
  return result;
}

function cspellAll() {
  log('运行 cspell...');
  const mdFilesGlob = 'docs/generated/ai/**/*.md';
  const configPath = path.join(projectRoot, 'docs', 'quality', 'cspell.json');
  const args = ['npx', 'cspell', mdFilesGlob];
  if (fs.existsSync(configPath)) {
    args.push('--config');
    args.push(configPath);
  }
  const result = runCmd(args.join(' '), []);
  return result;
}

function writeReport(mdRes, spellRes) {
  const reportPath = path.join(aiDir, 'review-report.txt');
  const lines = [];
  lines.push(`[docs:ai:review] 时间: ${new Date().toISOString()}`);
  lines.push('=== markdownlint 结果 ===');
  if (mdRes.status === 0) {
    lines.push('格式检查通过');
  } else {
    lines.push(mdRes.stdout || mdRes.stderr || '格式问题存在');
  }
  lines.push('');
  lines.push('=== cspell 结果 ===');
  if (spellRes.status === 0) {
    lines.push('拼写检查通过');
  } else {
    lines.push(spellRes.stdout || spellRes.stderr || '拼写问题存在');
  }
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
  log(`写入审查报告: ${path.relative(projectRoot, reportPath)}`);
}

function main() {
  try {
    const md = markdownlintAll();
    const sp = cspellAll();
    writeReport(md, sp);
  } catch (e) {
    console.error('审查过程发生错误:', e);
    process.exitCode = 1;
  }
}

main();