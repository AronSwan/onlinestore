#!/usr/bin/env node
/**
 * Lint Saved Queries under docs/research/openobserve/saved-queries
 * - Required fields: name, type (promql|sql), query (string), labels (string[]), description (string), timeRange (string)
 * - Name convention: {biz}/{org}/{stream}/{purpose}-{key}-{window}-v{n}
 *   where purpose in (overview|diagnose|perf), window like 5m|10m|15m|1h|24h...
 * - Filename must equal the last path segment of "name"
 * - Extended rules:
 *   - labels: each item must be "key:value", key in whitelist [env,service,owner,region,severity], both key/value kebab|snake|alnum lowercase
 *   - timeRange: must match "now-<number><unit>" (unit in [s,m,h,d,w]) or ISO-like fallback (YYYY-MM-DD...); prefer now- form
 *   - promql query whitelist:
 *       * metric names must start with one of prefixes: verify_, domain_, email_, or be literal openobserve_up
 *       * allow functions: sum, rate, increase, histogram_quantile, topk, avg, max, min, count
 *       * treat "by" / "without" as aggregation modifiers (not functions)
 *       * disallow suspicious tokens: ; ` || &&
 *   - sql query whitelist:
 *       * must start with SELECT (case-insensitive), single statement only (no ;)
 *       * disallow keywords: DROP, DELETE, UPDATE, INSERT, ALTER, TRUNCATE, CREATE
 */
import fs from 'fs';
import path from 'path';
import process from 'process';

const root = process.cwd();
const targetDir = path.join(root, 'docs', 'research', 'openobserve', 'saved-queries');

const NAME_RE = new RegExp(
  String.raw`^[a-z0-9\-]+\/[a-z0-9_\-]+\/[a-z0-9_\-]+\/(overview|diagnose|perf)-[a-z0-9_\-]+-[0-9]+[smhdw]-v[0-9]+$`
);

// label: key:value, key in whitelist, lowercase alnum/_/-
const LABEL_KEYS = ['env', 'service', 'owner', 'region', 'severity'];
const LABEL_PAIR_RE = /^[a-z0-9_-]+:[a-z0-9_-]+$/;

// timeRange: now-<n><unit> or ISO-like
const TIMERANGE_NOW_RE = /^now-\d+[smhdw]$/i;
const TIMERANGE_ISO_RE = /^\d{4}-\d{2}-\d{2}/;

// promql allowlists
const PROMQL_ALLOWED_FUNCS = [
  'sum',
  'rate',
  'increase',
  'histogram_quantile',
  'topk',
  'avg',
  'max',
  'min',
  'count',
  'sum_over_time',
  'avg_over_time',
  'min_over_time',
  'max_over_time'
];
const PROMQL_AGGR_MODIFIERS = new Set(['by', 'without']); // not functions
// metric prefixes
const PROMQL_METRIC_PREFIXES = ['verify_', 'domain_', 'email_'];
// basic disallow
const PROMQL_DISALLOW_RE = /[`;]|(\|\|)|(\&\&)/;

// sql rules
const SQL_START_RE = /^\s*select\b/i;
const SQL_DISALLOW_RE = /\b(drop|delete|update|insert|alter|truncate|create)\b/i;
const SQL_SEMICOLON_RE = /;/;

function isString(x) { return typeof x === 'string' && x.trim().length > 0; }
function isStringArray(a) { return Array.isArray(a) && a.every((v) => typeof v === 'string' && v.length > 0); }

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
}

function validateLabels(labels) {
  const errors = [];
  if (!isStringArray(labels)) {
    errors.push('Missing or invalid "labels" (string[])');
    return errors;
  }
  for (const lab of labels) {
    if (!LABEL_PAIR_RE.test(lab)) {
      errors.push(`Label "${lab}" must be "key:value" lowercase alnum/_/-`);
      continue;
    }
    const [key] = lab.split(':', 1);
    if (!LABEL_KEYS.includes(key)) {
      errors.push(`Label key "${key}" not in whitelist: ${LABEL_KEYS.join(', ')}`);
    }
  }
  return errors;
}

function validateTimeRange(rng) {
  const errors = [];
  if (!isString(rng)) {
    errors.push('Missing or invalid "timeRange"');
    return errors;
  }
  if (!(TIMERANGE_NOW_RE.test(rng) || TIMERANGE_ISO_RE.test(rng))) {
    errors.push(`"timeRange" must be like "now-5m"/"now-1h" or ISO-8601 date (got: ${rng})`);
  }
  return errors;
}

function validatePromql(query) {
  const errors = [];
  if (!isString(query)) {
    errors.push('Missing or invalid "query" for promql');
    return errors;
  }
  if (PROMQL_DISALLOW_RE.test(query)) {
    errors.push('PromQL contains disallowed tokens (e.g., ;, `, ||, &&)');
  }
  // metric presence: require at least one allowed metric or openobserve_up
  const metricOk = /\bopenobserve_up\b/.test(query) || PROMQL_METRIC_PREFIXES.some(p => query.includes(p));
  if (!metricOk) {
    errors.push('PromQL must reference metric starting with "verify_"/"domain_"/"email_" or "openobserve_up"');
  }
  // Capture function-like tokens word( and filter out by/without (modifiers)
  const funcCalls = [...query.matchAll(/\b([a-z_][a-z0-9_]*)\s*\(/gi)]
    .map(m => m[1].toLowerCase())
    .filter(f => !PROMQL_AGGR_MODIFIERS.has(f));
  for (const f of funcCalls) {
    if (!PROMQL_ALLOWED_FUNCS.includes(f)) {
      errors.push(`PromQL function "${f}" not in allowlist: ${PROMQL_ALLOWED_FUNCS.join(', ')}`);
    }
  }
  return errors;
}

function validateSql(query) {
  const errors = [];
  if (!isString(query)) {
    errors.push('Missing or invalid "query" for sql');
    return errors;
  }
  if (!SQL_START_RE.test(query)) {
    errors.push('SQL must start with SELECT');
  }
  if (SQL_DISALLOW_RE.test(query)) {
    errors.push('SQL contains disallowed DDL/DML keywords');
  }
  if (SQL_SEMICOLON_RE.test(query)) {
    errors.push('SQL must be single-statement (no ;)');
  }
  // require time window: NOW() - INTERVAL ... or presence of start_time/end_time keywords
  const hasNowInterval = /\bnow\(\)\s*-\s*interval\b/i.test(query) || /\bnow\s*-\s*interval\b/i.test(query);
  const hasStartEnd = /\b(start_time|end_time)\b/i.test(query);
  if (!(hasNowInterval || hasStartEnd)) {
    errors.push('SQL must include a time window (e.g., "timestamp >= NOW() - INTERVAL ...") or reference start_time/end_time');
  }
  return errors;
}

function validateFile(filePath) {
  const errors = [];
  let data;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    data = JSON.parse(raw);
  } catch (e) {
    errors.push(`JSON parse error: ${e.message}`);
    return { ok: false, errors };
  }

  // Required fields
  if (!isString(data.name)) errors.push('Missing or invalid "name"');
  if (!isString(data.type) || !['promql', 'sql'].includes(data.type)) errors.push('Missing or invalid "type" (promql|sql)');
  if (!isString(data.query)) errors.push('Missing or invalid "query"');
  if (!isString(data.description)) errors.push('Missing or invalid "description"');

  // Name convention
  if (isString(data.name) && !NAME_RE.test(data.name)) {
    errors.push(`"name" does not match convention: {biz}/{org}/{stream}/{purpose}-{key}-{window}-v{n}`);
  }

  // Filename match tail of name
  const base = path.basename(filePath, '.json'); // filename without ext
  if (isString(data.name)) {
    const tail = data.name.split('/').pop();
    if (tail !== base) {
      errors.push(`Filename "${base}" must equal the tail of "name" "${tail}"`);
    }
  }

  // Extended validations
  errors.push(...validateLabels(data.labels));
  errors.push(...validateTimeRange(data.timeRange));

  if (data.type === 'promql') {
    errors.push(...validatePromql(data.query));
  } else if (data.type === 'sql') {
    errors.push(...validateSql(data.query));
  }

  return { ok: errors.length === 0, errors };
}

function main() {
  console.log(`[lint] scanning: ${path.relative(root, targetDir)}`);
  const files = listJsonFiles(targetDir);
  if (files.length === 0) {
    console.warn('[lint] no saved-query files found');
    process.exit(0);
  }

  let failed = 0;
  for (const f of files) {
    const p = path.join(targetDir, f);
    const { ok, errors } = validateFile(p);
    if (!ok) {
      failed++;
      console.error(`✖ ${path.relative(root, p)}`);
      for (const err of errors) console.error(`  - ${err}`);
    } else {
      console.log(`✔ ${path.relative(root, p)}`);
    }
  }
  if (failed > 0) {
    console.error(`[lint] failed: ${failed}/${files.length} files with errors`);
    process.exit(1);
  } else {
    console.log(`[lint] success: ${files.length} files passed`);
  }
}

main();