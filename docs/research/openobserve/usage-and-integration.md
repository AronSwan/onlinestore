# 使用与集成（含 Node/Nest 接入示例）

HTTP Ingest（Node）
```ts
import axios from 'axios';

async function ingest(records: any[]) {
  const base = process.env.OO_BASE_URL || 'http://openobserve:5080';
  const org = process.env.OO_ORG || 'default';
  const stream = process.env.OO_STREAM || 'email_verification';
  const token = process.env.OO_TOKEN || '';
  const url = `${base}/api/${org}/${stream}/_json`;
  await axios.post(url, records, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 5000,
  });
}
```

Nest 集成要点
- 在 Service 中封装上报客户端；在业务路径（成功/错误）均上报。
- 采集字段包含时间戳、域/邮箱、reachable、latency_ms、错误类型，便于仪表与告警。

示例记录
```json
[
  {
    "timestamp": "2025-10-09T01:00:00.000Z",
    "source": "apiserver",
    "kind": "verify_result",
    "email": "user@example.org",
    "domain": "example.org",
    "reachable": "yes",
    "latency_ms": 120
  },
  {
    "timestamp": "2025-10-09T01:00:01.000Z",
    "source": "apiserver",
    "kind": "verify_error",
    "email": "user@example.org",
    "error": "timeout"
  }
]
```

仪表与告警
- 仪表：latency_ms 分布、reachable 比例、错误类别时序、域热点。
- 告警：unknown 比例阈值、超时率阈值、某域错误激增、Ingest 失败率上升。

与本项目的结合
- 已提供 nest-integration-examples.md 的 OpenObserve 客户端示例；建议复用，统一指标字段。