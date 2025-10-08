# 实践示例（日志/指标/追踪上报）

Node/JS 写入示例（HTTP Ingest）
```ts
import axios from 'axios';
export async function ooIngest(records: any[]) {
  const base = process.env.OO_BASE_URL || 'http://openobserve:5080';
  const org = process.env.OO_ORG || 'default';
  const stream = process.env.OO_STREAM || 'email_verification';
  const token = process.env.OO_TOKEN || '';
  const url = `${base}/api/${org}/${stream}/_json`;
  await axios.post(url, records, { headers: { Authorization: `Bearer ${token}` } });
}
```

示例：上报 Email 验证批量任务指标
```ts
await ooIngest([
  { timestamp: new Date().toISOString(), kind: 'batch_start', job_id: 'job-123', size: 10000 },
  { timestamp: new Date().toISOString(), kind: 'metric', name: 'unknown_ratio', value: 0.28 },
  { timestamp: new Date().toISOString(), kind: 'metric', name: 'timeout_rate', value: 0.06 },
  { timestamp: new Date().toISOString(), kind: 'domain_hotspot', domain: 'yahoo.com', errors: 120 },
  { timestamp: new Date().toISOString(), kind: 'batch_end', job_id: 'job-123', duration_ms: 1800000 }
]);
```

仪表建议
- 任务级：开始/结束、耗时、处理量。
- 质量级：unknown 比例、超时率、错误类别。
- 域热点：按域与错误计数的排行。

告警建议
- unknown_ratio > 0.3（5分钟窗口）
- timeout_rate > 0.1
- 单域错误计数激增（环比翻倍）