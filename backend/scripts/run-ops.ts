#!/usr/bin/env ts-node

// 用途：统一运维入口脚本（并行执行与报告聚合）
// 模块：openobserve(init/index/cleanup/e2e)、security-check、redis-connection-test
// 运行：npx ts-node backend/scripts/run-ops.ts --modules openobserve,security,infra
// 作者：后端与运维团队
// 时间：2025-10-09

import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

type ExecResult = { name: string; success: boolean; durationMs: number; detail?: any };

function execNode(script: string, args: string[] = [], env: NodeJS.ProcessEnv = {}): Promise<ExecResult> {
  return new Promise(resolve => {
    const t0 = Date.now();
    const child = spawn(process.execPath, [script, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    });
    let out = '';
    let err = '';
    child.stdout.on('data', d => (out += d.toString()));
    child.stderr.on('data', d => (err += d.toString()));
    child.on('close', code => {
      resolve({
        name: script,
        success: code === 0,
        durationMs: Date.now() - t0,
        detail: code === 0 ? out.trim() : err.trim(),
      });
    });
  });
}

// 支持 ts 脚本直接执行（ts-node 推荐）
function execTs(script: string, args: string[] = [], env: NodeJS.ProcessEnv = {}): Promise<ExecResult> {
  return new Promise(resolve => {
    const t0 = Date.now();
    const child = spawn(process.execPath, ['-r', 'ts-node/register', script, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    });
    let out = '';
    let err = '';
    child.stdout.on('data', d => (out += d.toString()));
    child.stderr.on('data', d => (err += d.toString()));
    child.on('close', code => {
      resolve({
        name: script,
        success: code === 0,
        durationMs: Date.now() - t0,
        detail: code === 0 ? out.trim() : err.trim(),
      });
    });
  });
}

function parseModulesArg(): string[] {
  const flag = process.argv.find(a => a.startsWith('--modules='));
  const list = flag ? flag.split('=')[1] : '';
  return list ? list.split(',').map(s => s.trim()).filter(Boolean) : ['openobserve', 'security', 'infra', 'docs'];
}

async function runOpenObserve(): Promise<ExecResult[]> {
  const tasks: Promise<ExecResult>[] = [
    execTs('backend/scripts/openobserve/init-cqrs-streams.ts'),
    execTs('backend/scripts/openobserve/index-maintenance.ts'),
    execTs('backend/scripts/openobserve/cleanup-old-data.ts'),
    execTs('backend/scripts/openobserve/e2e-cqrs-suite.ts'),
  ];
  return await Promise.all(tasks);
}

async function runSecurity(): Promise<ExecResult[]> {
  const tasks: Promise<ExecResult>[] = [
    execNode('backend/scripts/security-check.js', [], { DRY_RUN: 'true' }),
    execNode('backend/scripts/send-security-notification.js', [], { DRY_RUN: 'true' }),
    execNode('backend/scripts/validate-security-constants.js', [], { DRY_RUN: 'true' }),
  ];
  return await Promise.all(tasks);
}

async function runInfra(): Promise<ExecResult[]> {
  const tasks: Promise<ExecResult>[] = [
    execNode('backend/scripts/redis-connection-test.js'),
    // 如需：execNode('backend/scripts/tidb-health-check.js'),
  ];
  return await Promise.all(tasks);
}
async function runDocs(): Promise<ExecResult[]> {
  const tasks: Promise<ExecResult>[] = [
    execNode('backend/scripts/docs-consistency-manager.js'),
    execNode('backend/scripts/docs-coverage-check.js'),
    execTs('backend/scripts/docs-watcher.ts'),
  ];
  return await Promise.all(tasks);
}

function summarize(all: ExecResult[]) {
  const ok = all.filter(r => r.success).length;
  const fail = all.length - ok;
  const totalMs = all.reduce((a, b) => a + b.durationMs, 0);
  console.log('Ops Summary:', {
    total: all.length,
    success: ok,
    fail,
    durationMs: totalMs,
  });
  for (const r of all) {
    console.log(`[${r.success ? '✓' : '✗'}] ${r.name} (${r.durationMs}ms)`);
    if (!r.success) console.log('  detail:', r.detail);
  }
}


function writeReports(all: ExecResult[]) {
  const ts = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
  const outDir = join(process.cwd(), 'audit-reports');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const summary = {
    timestamp: ts.toISOString(),
    total: all.length,
    success: all.filter(r => r.success).length,
    fail: all.filter(r => !r.success).length,
    durationMs: all.reduce((a, b) => a + b.durationMs, 0),
    results: all,
  };

  const jsonPath = join(outDir, `run-ops-${stamp}.json`);
  writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf-8');

  const lines: string[] = [];
  lines.push(`# Run Ops Report (${ts.toISOString()})`);
  lines.push('');
  lines.push(`- Total: ${summary.total}`);
  lines.push(`- Success: ${summary.success}`);
  lines.push(`- Fail: ${summary.fail}`);
  lines.push(`- Duration: ${summary.durationMs} ms`);
  lines.push('');
  lines.push('## Details');
  for (const r of all) {
    lines.push(`- ${r.success ? '✅' : '❌'} ${r.name} (${r.durationMs}ms)`);
    if (!r.success && r.detail) {
      lines.push(`  - detail: \`${String(r.detail).replace(/`/g, '\\`')}\``);
    }
  }
  const mdPath = join(outDir, `run-ops-${stamp}.md`);
  writeFileSync(mdPath, lines.join('
'), 'utf-8');

  console.log(`Reports written: ${jsonPath}, ${mdPath}`);
}

async function main() {
  const modules = parseModulesArg();
  const tasks: Promise<ExecResult[]>[] = [];
  if (modules.includes('openobserve')) tasks.push(runOpenObserve());
  if (modules.includes('security')) tasks.push(runSecurity());
  if (modules.includes('infra')) tasks.push(runInfra());
  if (modules.includes('docs')) tasks.push(runDocs());

  if (tasks.length === 0) {
    console.log('No modules selected. Use --modules=openobserve,security,infra');
    process.exit(0);
  }

  const resultsGroups = await Promise.all(tasks);
  const all = resultsGroups.flat();
  summarize(all);
  writeReports(all);

  const ok = all.every(r => r.success);
  process.exit(ok ? 0 : 1);
}

if (require.main === module) {
  main().catch(e => {
    console.error('Run-ops failed:', e);
    process.exit(1);
  });
}