#!/usr/bin/env node
// Typed Mock Adoption measurement script
// Scans test files for usage of createMockedFunction<T> and jest.Mocked<...>,
// computes adoption rate, and emits adoption-report.json for CI trend tracking.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const TEST_DIR = path.join(ROOT, 'test');
const OUTPUT_DIR = path.join(ROOT, 'test-results');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'adoption-report.json');

const TEST_FILE_REGEX = /\.(spec|test)\.ts$/i;
const ADOPT_PATTERNS = [
  /createMockedFunction\s*</,
  /jest\.Mocked\s*</,
  /jest\.MockedFunction\s*</,
];
const BARE_JEST_FN = /jest\.fn\s*\(/g;

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (TEST_FILE_REGEX.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const patternsFound = ADOPT_PATTERNS.filter(p => p.test(content)).map(p => p.source);
  const bareMatches = content.match(BARE_JEST_FN) || [];
  const hasBareJestFn = bareMatches.length > 0;
  const adopted = patternsFound.length > 0;
  const rel = filePath.replace(ROOT + path.sep, '').split(path.sep).join('/');
  return { file: rel, adopted, hasBareJestFn, bareJestFnCount: bareMatches.length, patternsFound };
}

function summarize(files) {
  const totalFiles = files.length;
  const adoptedFiles = files.filter(f => f.adopted).length;
  const notAdoptedFiles = files.filter(f => !f.adopted && f.hasBareJestFn).length;
  const bareJestFnOccurrences = files.reduce((sum, f) => sum + (f.bareJestFnCount || 0), 0);
  const adoptionRate = totalFiles > 0 ? +(adoptedFiles / totalFiles).toFixed(4) : 0;

  // Module breakdown (simple heuristic by path segments)
  const modules = ['src/logging', 'src/products', 'src/orders', 'src/payment', 'src/messaging'];
  const breakdown = {};
  for (const mod of modules) {
    const modFiles = files.filter(f => f.file.startsWith(mod));
    const modTotal = modFiles.length;
    const modAdopted = modFiles.filter(f => f.adopted).length;
    const modNotAdopted = modFiles.filter(f => !f.adopted && f.hasBareJestFn).length;
    breakdown[mod] = {
      total: modTotal,
      adopted: modAdopted,
      notAdopted: modNotAdopted,
      rate: modTotal > 0 ? +(modAdopted / modTotal).toFixed(4) : 0,
    };
  }

  return { totalFiles, adoptedFiles, notAdoptedFiles, bareJestFnOccurrences, adoptionRate, modules: breakdown };
}

function main() {
  const srcTests = walk(SRC_DIR);
  const testTests = walk(TEST_DIR);
  const testFiles = [...srcTests, ...testTests];
  const analyzed = testFiles.map(analyzeFile);
  const summary = summarize(analyzed);
  const report = {
    timestamp: new Date().toISOString(),
    root: path.basename(ROOT),
    summary,
    files: analyzed,
  };

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));

  // Console summary for CI logs
  console.log(`[Typed Mock Adoption] Total: ${summary.totalFiles}, Adopted: ${summary.adoptedFiles}, Rate: ${summary.adoptionRate}`);
  console.log(`  Untyped jest.fn() occurrences: ${summary.bareJestFnOccurrences}`);
  for (const [mod, stats] of Object.entries(summary.modules)) {
    console.log(`  - ${mod}: total=${stats.total}, adopted=${stats.adopted}, rate=${stats.rate}`);
  }
  console.log(`Report written to: ${OUTPUT_FILE}`);
}

main();