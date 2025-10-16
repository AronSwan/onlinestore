#!/usr/bin/env node

// Copy the latest IDLE/CMD summaries and index into backend/test-output/latest/

const fs = require('fs');
const path = require('path');

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function ensureDir(p) { try { fs.mkdirSync(p, { recursive: true }); } catch (_) {} }
function toAbs(backendRoot, relOrAbs) {
  let normalized = relOrAbs.replace(/\\/g, '/');
  if (path.isAbsolute(normalized)) return normalized;
  // Strip leading 'backend/' or 'backend\' robustly
  normalized = normalized.replace(/^backend[\/]/, '');
  return path.resolve(backendRoot, normalized);
}

function copyFile(src, destDir) {
  const name = path.basename(src);
  const dest = path.join(destDir, name);
  fs.copyFileSync(src, dest);
  return dest;
}

function main() {
  const backendRoot = path.resolve(__dirname, '..', '..');
  const outDir = path.join(backendRoot, 'test-output');
  const latestDir = path.join(outDir, 'latest');
  ensureDir(latestDir);

  const indexPath = path.join(outDir, 'timeout-evidence-index.json');
  if (!fs.existsSync(indexPath)) {
    console.error('[CI] timeout-evidence-index.json not found. Nothing to collect.');
    process.exit(1);
  }

  const index = readJson(indexPath);
  const idleRel = index.artifacts?.idleSummary;
  const cmdRel = index.artifacts?.cmdSummary;
  const logRel = index.artifacts?.ciLog;

  const idlePath = idleRel ? toAbs(backendRoot, idleRel) : null;
  const cmdPath = cmdRel ? toAbs(backendRoot, cmdRel) : null;
  const logPath = logRel ? toAbs(backendRoot, logRel) : null;

  console.log(`[CI] Paths -> idle: ${idlePath} exists=${idlePath ? fs.existsSync(idlePath) : false}`);
  console.log(`[CI] Paths -> cmd: ${cmdPath} exists=${cmdPath ? fs.existsSync(cmdPath) : false}`);
  console.log(`[CI] Paths -> log: ${logPath} exists=${logPath ? fs.existsSync(logPath) : false}`);

  // Copy index as index.json for convenience
  fs.copyFileSync(indexPath, path.join(latestDir, 'index.json'));

  let copied = [];
  if (idlePath && fs.existsSync(idlePath)) copied.push(copyFile(idlePath, latestDir));
  if (cmdPath && fs.existsSync(cmdPath)) copied.push(copyFile(cmdPath, latestDir));
  if (logPath && fs.existsSync(logPath)) copied.push(copyFile(logPath, latestDir));

  console.log(`[CI] Collected latest evidence: ${copied.map(p => path.basename(p)).join(', ')}`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(e); process.exit(1); }
}