#!/usr/bin/env node

// Render a concise Markdown summary of the latest IDLE/CMD timeout evidence
// Reads backend/test-output/timeout-evidence-index.json and the two summary files

const fs = require('fs');
const path = require('path');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function toAbs(backendRoot, relOrAbs) {
  // Normalize Windows backslashes from index
  let normalized = relOrAbs.replace(/\\/g, '/');
  if (path.isAbsolute(normalized)) return normalized;
  // Strip leading 'backend/' or 'backend\' robustly
  normalized = normalized.replace(/^backend[\/]/, '');
  return path.resolve(backendRoot, normalized);
}

function safe(val, def = '') { return (val === null || val === undefined) ? def : String(val); }

function renderRow(title, summary) {
  const type = safe(summary.timeoutType);
  const scenario = safe(summary.scenario);
  const exitCode = safe(summary.exitCode);
  const durationMs = safe(summary.durationMs);
  const cmd = safe(summary.command);
  const match = (scenario && type) ? (scenario.toUpperCase().startsWith('IDLE') ? type === 'IDLE_TIMEOUT' : type === 'CMD_TIMEOUT') : false;
  const idleEnv = summary.env?.IDLE_TIMEOUT_MS ?? 'n/a';
  const cmdEnv = summary.env?.CMD_TIMEOUT_MS ?? 'n/a';
  return `- ${title}: exitCode ${exitCode}, duration ${durationMs}ms, timeoutType ${type}, typeMatch ${match ? 'yes' : 'no'}\n  - scenario ${scenario}; env IDLE_TIMEOUT_MS=${idleEnv}, CMD_TIMEOUT_MS=${cmdEnv}\n  - command: \`${cmd}\``;
}

function main() {
  const backendRoot = path.resolve(__dirname, '..', '..');
  const outDir = path.join(backendRoot, 'test-output');
  const indexPath = path.join(outDir, 'timeout-evidence-index.json');
  if (!fs.existsSync(indexPath)) {
    console.log('## Timeout Evidence Summary');
    const note = process.env.SUMMARY_NOTE;
    if (note) console.log(note);
    console.log('- No index found at `backend/test-output/timeout-evidence-index.json`.');
    process.exit(0);
  }

  const index = readJson(indexPath);
  const idleRel = index.artifacts?.idleSummary;
  const cmdRel = index.artifacts?.cmdSummary;
  const logRel = index.artifacts?.ciLog;

  const idlePath = idleRel ? toAbs(backendRoot, idleRel) : null;
  const cmdPath = cmdRel ? toAbs(backendRoot, cmdRel) : null;
  const logPath = logRel ? toAbs(backendRoot, logRel) : null;

  const idle = idlePath && fs.existsSync(idlePath) ? readJson(idlePath) : null;
  const cmd = cmdPath && fs.existsSync(cmdPath) ? readJson(cmdPath) : null;

  console.log('## Timeout Evidence Summary');
  const note = process.env.SUMMARY_NOTE;
  if (note) console.log(note);
  console.log(`- generatedAt: \`${safe(index.generatedAt)}\``);
  console.log(`- durationMs: \`${safe(index.durationMs)}\`, exitCode: \`${safe(index.exitCode)}\``);

  if (idle) {
    console.log(renderRow('IDLE', idle));
  } else {
    console.log('- IDLE: summary missing');
  }

  if (cmd) {
    console.log(renderRow('CMD', cmd));
  } else {
    console.log('- CMD: summary missing');
  }

  console.log('\n### Artifacts');
  console.log(`- Index: \`backend/test-output/timeout-evidence-index.json\``);
  if (idleRel) console.log(`- IDLE summary: \`${idleRel}\``);
  if (cmdRel) console.log(`- CMD summary: \`${cmdRel}\``);
  if (logRel) console.log(`- Log: \`${logRel}\``);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(e); process.exit(1); }
}