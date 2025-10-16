#!/usr/bin/env ts-node

// 用途：端到端集成测试（初始化 -> 发送数据 -> 查询校验 -> 汇总结果）
// 作者：后端开发团队
// 时间：2025-10-09

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';
import { EnvironmentAdapter } from '../../src/config/environment-adapter';
import { setTimeout as sleep } from 'timers/promises';
import { setTimeout as setTimer } from 'timers';

type TestResult = { name: string; success: boolean; detail?: any };

let exitWatchdog: NodeJS.Timeout | null = null;

function setupSignalHandlers() {
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

function gracefulShutdown(signal: string) {
  try {
    // 清理退出看门狗
  } finally {
    if (exitWatchdog) {
      clearTimeout(exitWatchdog);
      exitWatchdog = null;
    }
    process.exit(0);
  }
}

async function headers(token: string) {
  return {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json',
  };
}

async function initStreams(baseUrl: string, organization: string, token: string): Promise<TestResult> {
  const streams = [
    { name: 'cqrs-commands', type: 'logs' as const },
    { name: 'cqrs-queries', type: 'logs' as const },
    { name: 'cqrs-events', type: 'logs' as const },
    { name: 'cqrs-metrics', type: 'metrics' as const },
    { name: 'traces', type: 'traces' as const },
  ];
  const url = \`\${baseUrl}/api/\${organization}/streams\`;
  try {
    for (const s of streams) {
      const res = await fetch(url, {
        method: 'POST',
        headers: await headers(token),
        body: JSON.stringify({ name: s.name, stream_type: s.type }),
      });
      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 409 && txt.includes('already exists')) continue;
        throw new Error(\`Create stream \${s.name} failed: \${res.status} \${txt}\`);
      }
    }
    return { name: 'init-streams', success: true };
  } catch (e) {
    return { name: 'init-streams', success: false, detail: e instanceof Error ? e.message : e };
  }
}

async function sendSample(baseUrl: string, organization: string, token: string): Promise<TestResult> {
  const now = new Date();
  const mkTs = (n: number) => new Date(now.getTime() + n * 1000).toISOString();
  const cmds = Array.from({ length: 10 }, (_, i) => ({
    timestamp: mkTs(i),
    level: i % 5 === 0 ? 'ERROR' : 'INFO',
    service: 'backend',
    source: 'apiserver',
    type: 'CreateOrder',
    id: \`cmd-\${i}\`,
    status: i % 5 === 0 ? 'error' : 'success',
    duration_ms: 100 + Math.random() * 400,
    handler: 'CreateOrderHandler',
  }));
  try {
    const url = \`\${baseUrl}/api/\${organization}/cqrs-commands/_json\`;
    const res = await fetch(url, {
      method: 'POST',
      headers: await headers(token),
      body: JSON.stringify(cmds),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(\`Send sample failed: \${res.status} \${txt}\`);
    }
    return { name: 'send-sample', success: true };
  } catch (e) {
    return { name: 'send-sample', success: false, detail: e instanceof Error ? e.message : e };
  }
}

async function queryValidate(baseUrl: string, organization: string, token: string): Promise<TestResult> {
  // 等待后台处理
  await sleep(3000);

  const sql = `
    SELECT type, status, avg(duration_ms) AS avg_duration, count(*) AS cnt
    FROM "cqrs-commands"
    WHERE timestamp >= NOW() - INTERVAL 1 HOUR
    GROUP BY type, status
    ORDER BY avg_duration DESC
    LIMIT 5
  `;
  const url = \`\${baseUrl}/api/\${organization}/_search?type=SQL&sql=\${encodeURIComponent(sql)}\`;
  try {
    const res = await fetch(url, { headers: await headers(token) });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(\`Query failed: \${res.status} \${txt}\`);
    }
    const data = await res.json();
    const hits = data?.hits ?? [];
    const ok = Array.isArray(hits) && hits.length > 0 && typeof hits[0]?.avg_duration === 'number';
    return { name: 'query-validate', success: ok, detail: hits.slice(0, 3) };
  } catch (e) {
    return { name: 'query-validate', success: false, detail: e instanceof Error ? e.message : e };
  }
}

async function main(): Promise<void> {
  const t0 = performance.now();
  const { baseUrl, organization, token } = EnvironmentAdapter.getOpenObserve();
  if (!baseUrl || !organization || !token) {
    console.error('✗ Missing OPENOBSERVE config (url/org/token)');
    process.exit(1);
  }

  setupSignalHandlers();
  exitWatchdog = setTimer(() => {
    console.error('[EXIT WATCHDOG] E2E 未在预期时间内退出，执行保护性退出');
    process.exit(2);
  }, 15000);

  const results: TestResult[] = [];
  results.push(await initStreams(baseUrl, organization, token));
  results.push(await sendSample(baseUrl, organization, token));
  results.push(await queryValidate(baseUrl, organization, token));

  const ok = results.every(r => r.success);
  const duration = (performance.now() - t0).toFixed(2);
  console.log('E2E Summary:', results);
  console.log(ok ? \`✓ E2E passed in \${duration}ms\` : \`✗ E2E failed in \${duration}ms\`);

  if (!ok) {
    if (exitWatchdog) {
      clearTimeout(exitWatchdog);
      exitWatchdog = null;
    }
    process.exit(1);
  }
  if (exitWatchdog) {
    clearTimeout(exitWatchdog);
    exitWatchdog = null;
  }
  process.exit(0);
}

if (require.main === module) {
  main();
}