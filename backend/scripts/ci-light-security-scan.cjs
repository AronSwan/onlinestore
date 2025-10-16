#!/usr/bin/env node
/**
 * 轻量安全扫描（CI 用）
 * - 仅运行必要规则，避免噪声
 * - 输出可读报告（JSON + Markdown）
 * - 在发现关键（Critical）问题时失败，其余情况不阻断合并
 */

const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function run() {
  const { SecurityScannerPlugin } = require('./security-scanner-plugin.cjs');

  const projectPath = path.resolve(__dirname, '..'); // 仅扫描 backend，降低噪音

  // 统一的轻量初始化策略
  const scanner = new SecurityScannerPlugin({
    codeSecurity: {
      enabled: true,
      excludedFiles: [
        '**/node_modules/**',
        '**/.test-output/**',
        '**/.test-cache/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/reports/**',
        '**/playwright-report/**',
        '**/test-results/**',
        '**/test-output/**',
        '**/.jest-unit-results.json'
      ],
      patterns: {
        dangerousFunctions: [/eval\s*\(/, /Function\s*\(/],
        sensitiveData: [/password\s*[=:]\s*["'`][^"'`]{3,}["'`]/],
        insecureRequests: [/http:\/\//],
        weakCrypto: [/md5\s*\(/]
      }
    },
    dependencySecurity: {
      enabled: false // 关闭重量级依赖扫描，避免环境依赖与噪声
    },
    configSecurity: {
      enabled: true,
      checks: {
        filePermissions: {
          maxReadableByOthers: ['*.env', '*.yml', '*.yaml'],
          maxWritableByOthers: ['*.env', '*.json'],
          maxExecutableByOthers: ['*.sh', '*.bat', '*.cmd']
        },
        sensitiveFiles: ['.env', 'config.json'],
        insecureConfigs: []
      }
    },
    networkSecurity: {
      enabled: false // 关闭网络扫描，避免非必要噪声
    }
  });

  console.log('🔒 运行轻量安全扫描（CI）...');
  const results = await scanner.runFullScan(projectPath);

  const reportsDir = path.join(projectPath, 'reports', 'security', 'ci-light');
  ensureDir(reportsDir);

  // 写入 JSON 报告
  const jsonPath = path.join(reportsDir, 'report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), 'utf8');

  // 生成 Markdown 摘要
  const mdLines = [];
  mdLines.push('# 轻量安全扫描报告 (CI)');
  mdLines.push('');
  mdLines.push(`- 扫描起止: ${results.scanTime.start} → ${results.scanTime.end}`);
  mdLines.push(`- 耗时: ${results.scanTime.duration}ms`);
  mdLines.push(`- 总问题: ${results.summary.total}`);
  mdLines.push(`- 严重(Critical): ${results.summary.critical}`);
  mdLines.push(`- 高危(High): ${results.summary.high}`);
  mdLines.push(`- 中危(Medium): ${results.summary.medium}`);
  mdLines.push(`- 低危(Low): ${results.summary.low}`);
  mdLines.push(`- 风险分数: ${results.summary.riskScore}/100`);
  mdLines.push('');
  mdLines.push('## 类别摘要');
  for (const [category, result] of Object.entries(results.results)) {
    mdLines.push(`- ${category}: total=${result.summary.total}, critical=${result.summary.critical}, high=${result.summary.high}, medium=${result.summary.medium}, low=${result.summary.low}`);
  }
  mdLines.push('');
  if (results.recommendations && results.recommendations.length) {
    mdLines.push('## 建议');
    for (const rec of results.recommendations) {
      mdLines.push(`- ${rec}`);
    }
  }
  const mdPath = path.join(reportsDir, 'summary.md');
  fs.writeFileSync(mdPath, mdLines.join('\n'), 'utf8');

  // 控制 CI 失败策略：存在 Critical 或 High 问题时失败
  if (results.summary.critical > 0 || results.summary.high > 0) {
    console.log('🚨 发现关键或高危安全问题，阻断合并。');
    console.log(`📄 报告: ${jsonPath}`);
    process.exit(1);
  }

  console.log('✅ 轻量安全扫描完成（无关键问题）。');
  console.log(`📄 报告: ${jsonPath}`);
  process.exit(0);
}

run().catch((err) => {
  console.error('安全扫描执行失败:', err && err.message ? err.message : err);
  process.exit(1);
});