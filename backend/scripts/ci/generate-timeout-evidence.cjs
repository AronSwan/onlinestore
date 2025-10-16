#!/usr/bin/env node

// CI helper: generate IDLE/CMD timeout evidence by invoking direct-timeout-repro.cjs
// Produces timestamped quartet artifacts under backend/test-output/

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const backendRoot = path.resolve(__dirname, '..', '..');
const reproScript = path.join('scripts', 'direct-timeout-repro.cjs');
const outDir = path.join(backendRoot, 'test-output');

function ensureDir(p) {
  try { fs.mkdirSync(p, { recursive: true }); } catch (_) {}
}

function nowTs() {
  const d = new Date();
  return d.toISOString().replace(/[:.]/g, '-');
}

function findLatest(pattern) {
  const files = fs.readdirSync(outDir)
    .filter(name => pattern.test(name))
    .map(name => ({ name, mtime: fs.statSync(path.join(outDir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files.length ? files[0].name : null;
}

function main() {
  ensureDir(outDir);

  const env = {
    ...process.env,
    PERFORMANCE_PERSISTENCE: 'false',
    CACHE_PERSISTENCE: 'false'
  };

  const t0 = Date.now();
  const child = spawnSync(process.execPath, [reproScript], {
    cwd: backendRoot,
    env,
    encoding: 'utf8',
    stdio: 'pipe'
  });

  const durationMs = Date.now() - t0;
  const ts = nowTs();
  const logPath = path.join(outDir, `${ts}-ci-timeout-evidence.log`);
  fs.writeFileSync(logPath, `exitCode=${child.status}\ndurationMs=${durationMs}\n--- stdout ---\n${child.stdout || ''}\n--- stderr ---\n${child.stderr || ''}\n`, 'utf8');

  const latestIdle = findLatest(/IDLE-terminal-summary\.json$/);
  const latestCmd = findLatest(/CMD-terminal-summary\.json$/);

  const index = {
    generatedAt: new Date().toISOString(),
    durationMs,
    exitCode: child.status,
    artifacts: {
      idleSummary: latestIdle ? path.join('backend', 'test-output', latestIdle) : null,
      cmdSummary: latestCmd ? path.join('backend', 'test-output', latestCmd) : null,
      ciLog: path.join('backend', 'test-output', path.basename(logPath))
    }
  };

  fs.writeFileSync(path.join(outDir, 'timeout-evidence-index.json'), JSON.stringify(index, null, 2), 'utf8');

  const ok = Boolean(latestIdle && latestCmd);
  console.log(`[CI] Timeout evidence generated. IDLE=${latestIdle} CMD=${latestCmd}`);
  process.exit(ok ? 0 : 1);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(e); process.exit(1); }
}