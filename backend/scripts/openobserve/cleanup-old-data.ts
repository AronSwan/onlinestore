#!/usr/bin/env ts-node

// 用途：OpenObserve 数据清理与保留策略检查（非破坏性）
// 作者：后端开发团队
// 时间：2025-10-09

import fetch from 'node-fetch';
import { EnvironmentAdapter } from '../../src/config/environment-adapter';

type StreamType = 'logs' | 'metrics' | 'traces';

interface StreamInfo {
  name: string;
  type: StreamType;
}

const TARGET_STREAMS: StreamInfo[] = [
  { name: 'cqrs-commands', type: 'logs' },
  { name: 'cqrs-queries', type: 'logs' },
  { name: 'cqrs-events', type: 'logs' },
  { name: 'cqrs-metrics', type: 'metrics' },
  { name: 'traces', type: 'traces' },
];

async function getHeaders(token: string) {
  return {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json',
  };
}

async function getStreamSettings(baseUrl: string, organization: string, token: string, stream: string): Promise<any | null> {
  const url = \`\${baseUrl}/api/\${organization}/streams/\${stream}\`;
  try {
    const res = await fetch(url, { headers: await getHeaders(token) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function updateRetention(baseUrl: string, organization: string, token: string, stream: string, days: number): Promise<boolean> {
  // 注意：不同版本的 OpenObserve 可能使用 PATCH/PUT，不同字段名。
  // 本脚本尝试 PATCH 一个常见的保留字段，如 retention_days。
  const url = \`\${baseUrl}/api/\${organization}/streams/\${stream}\`;
  const body = { retention_days: days };
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: await getHeaders(token),
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function checkStreamVolume(baseUrl: string, organization: string, token: string, stream: string): Promise<number | null> {
  // 尝试查询最近24小时内的样本量，作为体量参考
  const sql = encodeURIComponent(\`
    SELECT COUNT(*) as cnt
    FROM "\${stream}"
    WHERE timestamp >= NOW() - INTERVAL 24 HOUR
  \`);
  const url = \`\${baseUrl}/api/\${organization}/_search?type=SQL&sql=\${sql}\`;
  try {
    const res = await fetch(url, { headers: await getHeaders(token) });
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data?.hits?.[0];
    return typeof hit?.cnt === 'number' ? hit.cnt : null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const { baseUrl, organization, token } = EnvironmentAdapter.getOpenObserve();
  if (!baseUrl || !organization || !token) {
    console.error('✗ Missing OPENOBSERVE config (url/org/token)');
    process.exit(1);
  }

  const retentionDays = process.env.OPENOBSERVE_RETENTION_DAYS ? parseInt(process.env.OPENOBSERVE_RETENTION_DAYS, 10) : undefined;
  console.log('Starting OpenObserve cleanup & retention check...');
  console.log(\`Base: \${baseUrl} | Org: \${organization} | RetentionDays:\${retentionDays ?? 'not-set'}\`);

  for (const s of TARGET_STREAMS) {
    console.log(\`- Stream \${s.name} (\${s.type})\`);
    const settings = await getStreamSettings(baseUrl, organization, token, s.name);
    const volume24h = await checkStreamVolume(baseUrl, organization, token, s.name);

    console.log('  Current settings:', settings ?? '(unavailable)');
    console.log('  24h volume:', volume24h ?? '(unknown)');

    if (typeof retentionDays === 'number' && retentionDays > 0) {
      const ok = await updateRetention(baseUrl, organization, token, s.name, retentionDays);
      console.log(ok ? '  ✓ retention updated' : '  ⚠ retention update failed (API may differ by version)');
    } else {
      console.log('  ℹ retention not changed (OPENOBSERVE_RETENTION_DAYS unset)');
    }
  }

  console.log('✓ Cleanup & retention check completed (non-destructive)');
}

if (require.main === module) {
  main();
}