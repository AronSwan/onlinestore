/**
 * 快速配置：OpenObserve 告警与仪表板（最小可用）
 * - 复用统一环境适配器（CommonJS），避免配置漂移
 * - 创建示例告警规则与导入基础仪表板
 */
const { OPENOBSERVE_URL, OPENOBSERVE_ORGANIZATION, OPENOBSERVE_TOKEN } = require('./openobserve/env-adapter');
const fetch = require('node-fetch');

function normBase(url) {
  return String(url).replace(/\/+$/, '');
}

async function createAlert(rule) {
  const base = normBase(OPENOBSERVE_URL);
  const res = await fetch(`${base}/api/${OPENOBSERVE_ORGANIZATION}/alerts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENOBSERVE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(rule),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Create alert failed: ${res.status} ${txt}`);
  }
}

async function importDashboard(dashboard) {
  const base = normBase(OPENOBSERVE_URL);
  const res = await fetch(`${base}/api/${OPENOBSERVE_ORGANIZATION}/dashboards/import`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENOBSERVE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dashboard),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Import dashboard failed: ${res.status} ${txt}`);
  }
}

async function main() {
  // 示例告警（与文档阈值一致）
  const alerts = [
    {
      name: 'CQRS Query p95 Latency High',
      severity: 'high',
      expr: 'p95(cqrs_query_duration_ms) > 300',
      for: '10m',
      labels: { component: 'cqrs', kind: 'query' },
      annotations: { summary: '查询 p95 超过 300ms 10分钟' },
    },
    {
      name: 'CQRS Command Error Rate',
      severity: 'critical',
      expr: 'rate(cqrs_command_total{status="error"}[5m]) / rate(cqrs_command_total[5m]) > 0.01',
      for: '5m',
      labels: { component: 'cqrs', kind: 'command' },
      annotations: { summary: '命令错误率超过 1% 5分钟' },
    },
    {
      name: 'CQRS Event DLQ',
      severity: 'critical',
      expr: 'sum(cqrs_event_dlq_total) > 0',
      for: '0m',
      labels: { component: 'cqrs', kind: 'event' },
      annotations: { summary: '事件 DLQ 出现条目' },
    },
    {
      name: 'CQRS Query Cache Hit Low',
      severity: 'medium',
      expr: 'avg(cqrs_query_cache_hit_ratio) < 0.5',
      for: '15m',
      labels: { component: 'cqrs', kind: 'query' },
      annotations: { summary: '查询缓存命中率低于 50% 15分钟' },
    },
  ];

  // 基础仪表板（示意：最小分组）
  const dashboard = {
    name: 'CQRS Overview',
    panels: [
      { title: 'Commands p95', type: 'stat', query: 'p95(cqrs_command_duration_ms)' },
      { title: 'Queries p95', type: 'stat', query: 'p95(cqrs_query_duration_ms)' },
      { title: 'Command Errors %', type: 'graph', query: 'rate(cqrs_command_total{status="error"}[5m]) / rate(cqrs_command_total[5m])' },
      { title: 'Query Cache Hit Ratio', type: 'graph', query: 'avg(cqrs_query_cache_hit_ratio)' },
      { title: 'Event DLQ', type: 'stat', query: 'sum(cqrs_event_dlq_total)' },
    ],
    tags: ['cqrs', 'observability'],
  };

  for (const a of alerts) {
    await createAlert(a);
    console.log(`[OK] alert created: ${a.name}`);
  }
  await importDashboard(dashboard);
  console.log('[OK] dashboard imported: CQRS Overview');
}

main().catch(err => {
  console.error('[ERROR] setup-alerts-and-dashboards-quick failed:', err && err.message ? err.message : err);
  process.exitCode = 1;
});