# Nest 集成示例（apiserver + Redis 缓存 + Bull 批量 + OpenObserve 监控）

前提
- apiserver 已部署并暴露 GET http://apiserver:8080/v1/{email}/verification
- Redis 已可用（用于缓存与队列）
- OpenObserve 已部署（参考 https://github.com/openobserve/openobserve），具备 Ingest Token

一、Service：调用 apiserver + Redis 缓存 + 错误语义映射
```ts
// src/email-verification/email-verifier.service.ts
import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

type VerifyResult = {
  email: string;
  reachable: 'unknown' | 'yes' | 'no';
  syntax: { username: string; domain: string; valid: boolean };
  has_mx_records: boolean;
  disposable: boolean;
  role_account: boolean;
  free: boolean;
  smtp?: { host_exists: boolean; full_inbox: boolean; catch_all: boolean; deliverable: boolean; disabled: boolean };
  gravatar?: any;
  suggestion?: string;
};

@Injectable()
export class EmailVerifierService {
  private http: AxiosInstance;

  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {
    this.http = axios.create({
      baseURL: process.env.EMAIL_VERIFIER_API_BASE || 'http://apiserver:8080',
      timeout: Number(process.env.EMAIL_VERIFIER_API_TIMEOUT_MS || '10000'),
    });
  }

  private cacheKey(email: string) {
    return `email_verify:${email.toLowerCase()}`;
  }

  async verify(email: string): Promise<VerifyResult> {
    const key = this.cacheKey(email);
    const cached = await this.cache.get<VerifyResult>(key);
    if (cached) return cached;

    try {
      const resp = await this.http.get<VerifyResult>(`/v1/${encodeURIComponent(email)}/verification`);
      const ret = resp.data;

      // TTL 策略：unknown 更短
      const ttlSec = ret.reachable === 'unknown' ? Number(process.env.EMAIL_VERIFY_TTL_UNKNOWN_SEC || '600')
                                                 : Number(process.env.EMAIL_VERIFY_TTL_SEC || '1800');
      await this.cache.set(key, ret, ttlSec * 1000);
      return ret;
    } catch (err: any) {
      // 简化错误语义映射与短期负缓存（避免抖动雪崩）
      const ttlSec = Number(process.env.EMAIL_VERIFY_NEG_CACHE_SEC || '60');
      const fallback: VerifyResult = {
        email,
        reachable: 'unknown',
        syntax: { username: '', domain: '', valid: false },
        has_mx_records: false,
        disposable: false,
        role_account: false,
        free: false,
      };
      await this.cache.set(key, fallback, ttlSec * 1000);
      // OpenObserve 上报错误（见下文监控部分）
      throw err;
    }
  }
}
```

二、Controller：暴露内部接口（可加 Throttler）
```ts
// src/email-verification/email-verification.controller.ts
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { EmailVerifierService } from './email-verifier-service';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('email-verification')
@UseGuards(ThrottlerGuard) // 建议在模块里配置 { ttl: 60, limit: 120 }
export class EmailVerificationController {
  constructor(private readonly svc: EmailVerifierService) {}

  @Get(':email/verification')
  async verify(@Param('email') email: string) {
    return this.svc.verify(email);
  }
}
```

三、批量清洗 Worker：Bull 队列 + 限流 + 缓存占位
```ts
// src/email-verification/email-verification.worker.ts
import { Process, Processor } from '@nestjs/bull';
import { EmailVerifierService } from './email-verifier-service';
import { Job } from 'bull';
import { RateLimiter } from '../common/rate-limiter/rate-limiter'; // 假设已有简单令牌桶实现

@Processor('email-cleaning')
export class EmailCleaningWorker {
  private limiter = new RateLimiter({ rate: 200, burst: 400 }); // QPS 与突发按需调整

  constructor(private readonly svc: EmailVerifierService) {}

  @Process('batch-verify')
  async handle(job: Job<{ emails: string[] }>) {
    const { emails } = job.data;
    const results: any[] = [];
    for (const email of emails) {
      await this.limiter.wait(); // 全局限流
      try {
        const ret = await this.svc.verify(email);
        results.push({ email, reachable: ret.reachable });
      } catch (e) {
        results.push({ email, reachable: 'unknown', error: 'verify_failed' });
      }
    }
    return { count: results.length, results };
  }
}
```

四、OpenObserve 监控接入
- 指标/日志上报建议：
  - 路由层：记录 verify_latency_ms、status、reachable 枚举；按域名聚合。
  - Worker：批量成功率、unknown 比例、错误类别分布。
- Node 程序上报到 OpenObserve 的两种方式：
  1) 使用 OpenObserve HTTP Ingest（推荐）
  2) 通过 OpenTelemetry（若已有 OTLP 配置）再转发到 OpenObserve

HTTP Ingest 示例（日志/指标混合）
```ts
// src/common/openobserve/openobserve.client.ts
import axios from 'axios';

export class OpenObserveClient {
  constructor(
    private readonly base = process.env.OO_BASE_URL || 'http://openobserve:5080',
    private readonly org = process.env.OO_ORG || 'default',
    private readonly stream = process.env.OO_STREAM || 'email_verification',
    private readonly token = process.env.OO_TOKEN || '',
  ) {}

  async ingest(records: Record<string, any>[]) {
    const url = `${this.base}/api/${this.org}/${this.stream}/_json`;
    await axios.post(url, records, {
      headers: { Authorization: `Bearer ${this.token}` },
      timeout: 5000,
    });
  }
}
```

在 Service 中上报示例（成功与错误）
```ts
// 示例：在 EmailVerifierService.verify 里调用
const oo = new OpenObserveClient();
const t0 = Date.now();
const resp = await this.http.get<VerifyResult>(`/v1/${encodeURIComponent(email)}/verification`);
const latency = Date.now() - t0;
await oo.ingest([{
  timestamp: new Date().toISOString(),
  email,
  domain: resp.data.syntax?.domain || '',
  reachable: resp.data.reachable,
  has_mx_records: resp.data.has_mx_records,
  latency_ms: latency,
  source: 'apiserver',
  kind: 'verify_result'
}]);
// 错误路径：在 catch 里
await oo.ingest([{
  timestamp: new Date().toISOString(),
  email,
  error: (err?.code || 'unknown'),
  source: 'apiserver',
  kind: 'verify_error'
}]);
```

OpenObserve 仪表建议
- 建立 dashboard：
  - 指标：latency_ms 直方图、reachable 比例、错误类别 timeseries（按域聚合）。
  - 源：stream=email_verification，kind=verify_result/verify_error。
- 告警规则：
  - unknown 比例 > 30%（5分钟窗口）
  - 超时率 > 10%（req_total vs error_timeout）
  - 某域错误激增（单域 error count 突升）

五、环境变量建议
```
EMAIL_VERIFIER_API_BASE=http://apiserver:8080
EMAIL_VERIFIER_API_TIMEOUT_MS=10000
EMAIL_VERIFY_TTL_SEC=1800
EMAIL_VERIFY_TTL_UNKNOWN_SEC=600
EMAIL_VERIFY_NEG_CACHE_SEC=60

OO_BASE_URL=http://openobserve:5080
OO_ORG=default
OO_STREAM=email_verification
OO_TOKEN=YOUR_OPENOBSERVE_TOKEN
```

六、Nginx 与网关限流
- 对外暴露 apiserver：参考 api-practice.md 的 Nginx 配置；在 Nest 内部也使用 @nestjs/throttler 做二次防护。
- 对接 OpenObserve：确保 OpenObserve 接收端口 5080 可达，Token 管理安全（切勿写入代码仓库明文）。
```