#!/usr/bin/env node

// Minimal reproduction for IDLE and CMD timeouts using SecureCommandExecutor
// Produces quartet evidence: run.out/err, terminal-summary.json, env-snapshot.json

const fs = require('fs');
const path = require('path');

// Disable background persistence timers to keep process truly short-lived
process.env.PERFORMANCE_PERSISTENCE = 'false';
process.env.CACHE_PERSISTENCE = 'false';

const { SecureCommandExecutor, StateManager } = require('./test-runner-secure.cjs');

const projectRoot = path.resolve(__dirname, '..');
const outDir = path.join(projectRoot, 'test-output');

function ensureDir(p) {
  try { fs.mkdirSync(p, { recursive: true }); } catch (_) {}
}

function writeFileSafe(p, content) {
  try { fs.writeFileSync(p, content, 'utf8'); } catch (e) { console.error('Write failed:', p, e.message); }
}

function nowTs() {
  const d = new Date();
  const ts = d.toISOString().replace(/[:.]/g, '-');
  return ts;
}

async function runIdleRepro() {
  // Set env to trigger idle timeout at 1200ms
  process.env.IDLE_TIMEOUT_MS = '1200';
  // Avoid CMD timeout interfering
  process.env.CMD_TIMEOUT_MS = process.env.CMD_TIMEOUT_MS || '60000';

  const stateManager = new StateManager();
  const executor = new SecureCommandExecutor(stateManager);

  const start = Date.now();
  let summary = {};
  let stdout = '';
  let stderr = '';
  try {
    const result = await executor.executeNormally('node', ['-e', 'setTimeout(()=>{},5000)'], {
      silent: true,
      spawnOptions: { cwd: projectRoot }
    });
    // If it succeeds, idle timeout did not trigger
    const duration = Date.now() - start;
    stdout = result.stdout || '';
    stderr = result.stderr || '';
    summary = {
      scenario: 'IDLE',
      command: 'node -e "setTimeout(()=>{},5000)"',
      exitCode: result.code,
      durationMs: duration,
      timeoutType: result.timeoutType || null,
      verdict: result.success ? 'PASS' : 'FAIL',
      env: {
        IDLE_TIMEOUT_MS: process.env.IDLE_TIMEOUT_MS,
        CMD_TIMEOUT_MS: process.env.CMD_TIMEOUT_MS,
        NODE_ENV: process.env.NODE_ENV || null
      },
      context: {
        cwd: projectRoot,
        node: process.version,
        os: process.platform
      },
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    const duration = Date.now() - start;
    stdout = err.stdout || '';
    stderr = err.stderr || '';
    summary = {
      scenario: 'IDLE',
      command: 'node -e "setTimeout(()=>{},5000)"',
      exitCode: err.code ?? -1,
      durationMs: duration,
      timeoutType: err.timeoutType || null,
      verdict: (err.timeoutType === 'IDLE_TIMEOUT') ? 'FAIL(timeout)' : 'FAIL',
      env: {
        IDLE_TIMEOUT_MS: process.env.IDLE_TIMEOUT_MS,
        CMD_TIMEOUT_MS: process.env.CMD_TIMEOUT_MS,
        NODE_ENV: process.env.NODE_ENV || null
      },
      context: {
        cwd: projectRoot,
        node: process.version,
        os: process.platform
      },
      timestamp: new Date().toISOString()
    };
  }

  ensureDir(outDir);
  const ts = nowTs();
  writeFileSafe(path.join(outDir, `${ts}-idle-run.out`), stdout);
  writeFileSafe(path.join(outDir, `${ts}-idle-run.err`), stderr);
  writeFileSafe(path.join(outDir, `${ts}-IDLE-terminal-summary.json`), JSON.stringify(summary, null, 2));
  console.log(`[IDLE] exitCode=${summary.exitCode} duration=${summary.durationMs}ms type=${summary.timeoutType} verdict=${summary.verdict}`);
}

async function runCmdRepro() {
  // Set cmd timeout to 2000ms; ensure idle timeout large enough not to fire first
  process.env.CMD_TIMEOUT_MS = '2000';
  // Force override idle timeout to avoid interference
  process.env.IDLE_TIMEOUT_MS = '60000';

  const stateManager = new StateManager();
  const executor = new SecureCommandExecutor(stateManager);

  const start = Date.now();
  let summary = {};
  let stdout = '';
  let stderr = '';
  try {
    const result = await executor.executeNormally('node', ['-e', 'setInterval(()=>{},1000)'], {
      silent: true,
      spawnOptions: { cwd: projectRoot }
    });
    const duration = Date.now() - start;
    stdout = result.stdout || '';
    stderr = result.stderr || '';
    summary = {
      scenario: 'CMD',
      command: 'node -e "setInterval(()=>{},1000)"',
      exitCode: result.code,
      durationMs: duration,
      timeoutType: result.timeoutType || null,
      verdict: result.success ? 'PASS' : 'FAIL',
      env: {
        IDLE_TIMEOUT_MS: process.env.IDLE_TIMEOUT_MS,
        CMD_TIMEOUT_MS: process.env.CMD_TIMEOUT_MS,
        NODE_ENV: process.env.NODE_ENV || null
      },
      context: {
        cwd: projectRoot,
        node: process.version,
        os: process.platform
      },
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    const duration = Date.now() - start;
    stdout = err.stdout || '';
    stderr = err.stderr || '';
    summary = {
      scenario: 'CMD',
      command: 'node -e "setInterval(()=>{},1000)"',
      exitCode: err.code ?? -1,
      durationMs: duration,
      timeoutType: err.timeoutType || null,
      verdict: (err.timeoutType === 'CMD_TIMEOUT') ? 'FAIL(timeout)' : 'FAIL',
      env: {
        IDLE_TIMEOUT_MS: process.env.IDLE_TIMEOUT_MS,
        CMD_TIMEOUT_MS: process.env.CMD_TIMEOUT_MS,
        NODE_ENV: process.env.NODE_ENV || null
      },
      context: {
        cwd: projectRoot,
        node: process.version,
        os: process.platform
      },
      timestamp: new Date().toISOString()
    };
  }

  ensureDir(outDir);
  const ts = nowTs();
  writeFileSafe(path.join(outDir, `${ts}-cmd-run.out`), stdout);
  writeFileSafe(path.join(outDir, `${ts}-cmd-run.err`), stderr);
  writeFileSafe(path.join(outDir, `${ts}-CMD-terminal-summary.json`), JSON.stringify(summary, null, 2));
  console.log(`[CMD] exitCode=${summary.exitCode} duration=${summary.durationMs}ms type=${summary.timeoutType} verdict=${summary.verdict}`);
}

function writeEnvSnapshot() {
  const snapshot = {
    node: process.version,
    npm: null,
    os: require('os').release(),
    env: {
      IDLE_TIMEOUT_MS: process.env.IDLE_TIMEOUT_MS || null,
      CMD_TIMEOUT_MS: process.env.CMD_TIMEOUT_MS || null,
      NODE_ENV: process.env.NODE_ENV || null
    },
    cwd: projectRoot,
    timestamp: new Date().toISOString()
  };
  ensureDir(outDir);
  writeFileSafe(path.join(outDir, `${nowTs()}-env-snapshot.json`), JSON.stringify(snapshot, null, 2));
}

async function main() {
  ensureDir(outDir);
  await runIdleRepro();
  await runCmdRepro();
  writeEnvSnapshot();
}

main().catch(err => {
  console.error('Minimal reproduction failed:', err);
  process.exit(1);
});