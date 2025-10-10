#!/usr/bin/env ts-node

// 用途：OpenObserve 索引/查询维护建议（只读统计，不做破坏性操作）
// 作者：后端开发团队
// 时间：2025-10-09

import fetch from 'node-fetch';
import { EnvironmentAdapter } from '../../src/config/environment-adapter';

interface Suggestion {
  stream: string;
  message: string;
  detail?: any;
}

const TARGET_STREAMS = ['cqrs-commands', 'cqrs-queries', 'cqrs-events', 'cqrs-metrics', 'traces'];

async function getHeaders(token: string) {
  return {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json',
  };
}

async function runSQL(baseUrl: string, organization: string, token: string, sql: string): Promise<any | null> {
  const url = \`\${baseUrl}/api/\${organization}/_search?type=SQL&sql=\${encodeURIComponent(sql)}\`;
  try {
    const res = await fetch(url, { headers: await getHeaders(token) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function analyzeCardinality(baseUrl: string, organization: string, token: string, stream: string): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];
  const sql = \`
    SELECT COUNT(DISTINCT type) as type_cardinality,
           COUNT(DISTINCT handler) as handler_cardinality,
           COUNT(DISTINCT status) as status_cardinality
    FROM "\${stream}"
    WHERE timestamp >= NOW() - INTERVAL 24 HOUR
  \`;
  const data = await runSQL(baseUrl, organization, token, sql);
  const hit = data?.hits?.[0] ?? {};

  if (hit.type_cardinality > 1000) {
    suggestions.push({ stream, message: '字段 type 基数很高，建议聚合/降采样或按模块拆分流', detail: { type_cardinality: hit.type_cardinality } });
  }
  if (hit.handler_cardinality > 1000) {
    suggestions.push({ stream, message: '字段 handler 基数很高，建议规范 handler 命名或添加映射字典', detail: { handler_cardinality: hit.handler_cardinality } });
  }
  if (hit.status_cardinality > 10) {
    suggestions.push({ stream, message: '字段 status 种类多，建议统一成功/失败状态与错误码', detail: { status_cardinality: hit.status_cardinality } });
  }

  return suggestions;
}

async function analyzeLatency(baseUrl: string, organization: string, token: string, stream: string): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];
  // 统一查询 duration_ms 的统计，如不存在则跳过
  const sql = \`
    SELECT avg(duration_ms) as avg_dur, max(duration_ms) as max_dur
    FROM "\${stream}"
    WHERE timestamp >= NOW() - INTERVAL 24 HOUR
  \`;
  const data = await runSQL(baseUrl, organization, token, sql);
  const hit = data?.hits?.[0] ?? {};
  if (hit.avg_dur && hit.avg_dur > 500) {
    suggestions.push({ stream, message: '平均延迟较高(>500ms)，建议检查下游依赖/并发策略/SWR 策略', detail: { avg: hit.avg_dur, max: hit.max_dur } });
  }
  return suggestions;
}

async function main(): Promise<void> {
  const { baseUrl, organization, token } = EnvironmentAdapter.getOpenObserve();
  if (!baseUrl || !organization || !token) {
    console.error('✗ Missing OPENOBSERVE config (url/org/token)');
    process.exit(1);
  }

  console.log('Starting OpenObserve index/maintenance suggestions...');
  const all: Suggestion[] = [];
  for (const stream of TARGET_STREAMS) {
    console.log(\`- Analyzing \${stream}\`);
    const cards = await analyzeCardinality(baseUrl, organization, token, stream);
    const lats = await analyzeLatency(baseUrl, organization, token, stream);
    all.push(...cards, ...lats);
  }

  if (all.length === 0) {
    console.log('✓ No maintenance suggestions at this time');
  } else {
    console.log('⚠ Suggestions:');
    for (const s of all) {
      console.log(\`  [\${s.stream}] \${s.message}\`, s.detail ? JSON.stringify(s.detail) : '');
    }
  }

  console.log('✓ Index maintenance analysis completed');
}

if (require.main === module) {
  main();
}