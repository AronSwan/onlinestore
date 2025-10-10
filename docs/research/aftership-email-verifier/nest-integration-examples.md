# Nest 集成示例（apiserver + Redis 缓存 + Bull 批量 + OpenObserve 监控）
> 说明：本仓库标准环境变量命名为 OPENOBSERVE_*；本文示例中的 OO_* 为历史兼容写法，生产代码请使用 OPENOBSERVE_URL / OPENOBSERVE_ORGANIZATION / OPENOBSERVE_TOKEN 等标准变量。

## 目录
- [架构设计与集成模式](#架构设计与集成模式)
- [服务层设计最佳实践](#服务层设计最佳实践)
- [Service 实现示例](#service-实现示例)
- [Controller 实现示例](#controller-实现示例)
- [批量处理 Worker 实现](#批量处理-worker-实现)
- [OpenObserve 监控接入](#openobserve-监控接入)
- [环境变量配置](#环境变量配置)
- [Nginx 与网关限流](#nginx-与网关限流)

## 架构设计与集成模式

### 1. 核心集成模式
- **直接调用**：创建 Verifier 实例，直接调用验证方法
- **服务封装**：封装为 Nest Service，提供统一的验证接口
- **API接口**：通过 Controller 暴露 REST API，支持微服务架构
- **事件驱动**：集成消息队列，实现异步验证处理

### 2. 设计模式应用
- **工厂模式**：Verifier实例创建和管理
- **策略模式**：验证策略的灵活组合
- **装饰器模式**：验证结果的缓存和监控
- **观察者模式**：验证状态变更通知

### 3. 性能优化策略
- **连接池管理**：SMTP连接复用和生命周期管理
- **缓存机制**：多级缓存设计（内存、Redis、分布式缓存）
- **并发控制**：域级并发限制和全局资源管理
- **异步处理**：非阻塞IO和批量处理优化

## 服务层设计最佳实践

### 1. 服务封装模式
```typescript
/**
 * 邮箱验证服务
 *
 * 功能：提供统一的邮箱验证接口，集成缓存、监控和错误处理
 * 特性：
 * - 多级缓存支持
 * - 错误分类处理
 * - 性能监控集成
 * - 降级策略
 */
@Injectable()
export class EmailVerificationService {
  private http: AxiosInstance;
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    private configService: ConfigService
  ) {
    this.http = this.createHttpClient();
  }

  /**
   * 验证邮箱地址
   *
   * @param email 要验证的邮箱地址
   * @returns 验证结果
   *
   * @example
   * ```typescript
   * const result = await service.verify('user@example.com');
   * console.log(result.reachable); // yes/no/unknown
   * ```
   */
  async verify(email: string): Promise<VerificationResult> {
    // 参数验证
    if (!email || !this.isValidEmailFormat(email)) {
      throw new BadRequestException('Invalid email format');
    }
    
    const key = this.cacheKey(email);
    const cached = await this.cache.get<VerificationResult>(key);
    if (cached) {
      this.logger.debug(`Cache hit for email: ${email}`);
      return { ...cached, fromCache: true };
    }

    try {
      const startTime = Date.now();
      const resp = await this.http.get<VerificationResult>(
        `/v1/${encodeURIComponent(email)}/verification`
      );
      
      // 响应状态验证
      if (resp.status !== 200) {
        throw new ServiceException(`API returned status: ${resp.status}`);
      }
      
      const ret = resp.data;
      
      // 结果验证
      if (!ret.email || !ret.syntax) {
        throw new ServiceException('Invalid API response format');
      }
      
      // 缓存策略
      const ttl = this.calculateTTL(ret);
      await this.cache.set(key, ret, ttl);
      
      // 性能监控
      const duration = Date.now() - startTime;
      this.recordMetrics(email, ret, duration);
      
      return ret;
    } catch (err: any) {
      // 详细的错误分类和处理
      this.handleVerificationError(email, err);
      
      // 降级策略
      return this.getFallbackResult(email, err);
    }
  }

  private isValidEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private calculateTTL(result: VerificationResult): number {
    // 根据验证结果类型设置不同的TTL
    if (result.reachable === 'unknown') {
      return Number(process.env.EMAIL_VERIFY_TTL_UNKNOWN_SEC || '600') * 1000;
    }
    return Number(process.env.EMAIL_VERIFY_TTL_SEC || '1800') * 1000;
  }

  private recordMetrics(email: string, result: VerificationResult, duration: number): void {
    // 记录性能指标到监控系统
    this.logger.log(`Email verification completed: ${email}, reachable: ${result.reachable}, duration: ${duration}ms`);
    // 实际实现中应发送到 OpenObserve 或其他监控系统
  }

  private handleVerificationError(email: string, error: any): void {
    // 错误分类和处理
    this.logger.error(`Email verification failed: ${email}`, error.stack);
    // 实际实现中应发送错误报告到监控系统
  }

  private getFallbackResult(email: string, error: any): VerificationResult {
    // 降级策略：返回最小可用结果
    return {
      email,
      reachable: 'unknown',
      syntax: { username: '', domain: '', valid: false },
      has_mx_records: false,
      disposable: false,
      role_account: false,
      free: false,
    };
  }

  private createHttpClient(): AxiosInstance {
    return axios.create({
      baseURL: process.env.EMAIL_VERIFIER_API_BASE || 'http://apiserver:8080',
      timeout: Number(process.env.EMAIL_VERIFIER_API_TIMEOUT_MS || '10000'),
    });
  }

  private cacheKey(email: string): string {
    return `email_verify:${email.toLowerCase()}`;
  }
}
```

### 2. 配置管理策略
- **环境配置**：不同环境的参数调优
- **动态配置**：运行时配置更新和热重载
- **配置验证**：配置参数的完整性和有效性检查

### 3. 错误处理机制
- **异常分类**：网络异常、配置异常、业务异常等
- **重试策略**：指数退避和熔断机制
- **降级方案**：验证失败时的业务兜底策略

## Controller 实现示例

以下是一个完整的 Controller 实现，包含限流、参数验证和错误处理：

```typescript
/**
 * 邮箱验证控制器
 *
 * 功能：暴露 REST API 接口，处理邮箱验证请求
 * 特性：
 * - 请求限流
 * - 参数验证
 * - 统一错误响应
 * - API 文档集成
 */
@Controller('email-verification')
@UseGuards(ThrottlerGuard) // 建议在模块里配置 { ttl: 60, limit: 120 }
@ApiTags('email-verification')
export class EmailVerificationController {
  private readonly logger = new Logger(EmailVerificationController.name);

  constructor(
    private readonly emailService: EmailVerificationService,
    private readonly metricsService: MetricsService
  ) {}

  /**
   * 验证单个邮箱地址
   *
   * @param email 要验证的邮箱地址
   * @returns 验证结果
   */
  @Get(':email/verification')
  @ApiOperation({ summary: '验证邮箱地址' })
  @ApiParam({ name: 'email', description: '要验证的邮箱地址' })
  @ApiResponse({ status: 200, description: '验证成功', type: VerificationResult })
  @ApiResponse({ status: 400, description: '无效的邮箱格式' })
  @ApiResponse({ status: 429, description: '请求过于频繁' })
  async verify(@Param('email') email: string): Promise<VerificationResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.emailService.verify(email);
      
      // 记录成功指标
      this.metricsService.recordSuccess(email, result, Date.now() - startTime);
      
      return result;
    } catch (error) {
      // 记录失败指标
      this.metricsService.recordError(email, error, Date.now() - startTime);
      
      throw error;
    }
  }

  /**
   * 批量验证邮箱地址
   *
   * @param batchDto 批量验证请求
   * @returns 批量验证结果
   */
  @Post('batch-verification')
  @ApiOperation({ summary: '批量验证邮箱地址' })
  @ApiBody({ type: BatchVerificationDto })
  @ApiResponse({ status: 200, description: '批量验证成功', type: BatchVerificationResult })
  @ApiResponse({ status: 400, description: '请求参数无效' })
  async batchVerify(@Body() batchDto: BatchVerificationDto): Promise<BatchVerificationResult> {
    // 将任务添加到队列进行异步处理
    const job = await this.emailQueue.add('batch-verify', {
      emails: batchDto.emails,
      options: batchDto.options
    });

    return {
      jobId: job.id,
      status: 'queued',
      total: batchDto.emails.length,
      estimatedTime: this.estimateProcessingTime(batchDto.emails.length)
    };
  }

  /**
   * 查询批量验证任务状态
   *
   * @param jobId 任务ID
   * @returns 任务状态和结果
   */
  @Get('batch-verification/:jobId')
  @ApiOperation({ summary: '查询批量验证任务状态' })
  @ApiParam({ name: 'jobId', description: '任务ID' })
  async getBatchStatus(@Param('jobId') jobId: string): Promise<BatchJobStatus> {
    const job = await this.emailQueue.getJob(jobId);
    
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return {
      id: job.id,
      status: await job.getState(),
      progress: job.progress(),
      data: job.returnvalue,
      error: job.failedReason
    };
  }

  private estimateProcessingTime(emailCount: number): string {
    // 基于历史数据估算处理时间
    const avgTimePerEmail = 500; // 毫秒
    const totalMs = emailCount * avgTimePerEmail;
    const seconds = Math.ceil(totalMs / 1000);
    
    if (seconds < 60) {
      return `${seconds}秒`;
    }
    
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}分钟`;
  }
}
```

## 批量处理 Worker 实现

以下是一个完整的 Bull Worker 实现，包含限流、错误处理和进度报告：

```typescript
/**
 * 邮箱批量验证处理器
 *
 * 功能：处理批量邮箱验证任务，支持限流和进度报告
 * 特性：
 * - 智能限流
 * - 错误分类处理
 * - 进度报告
 * - 结果缓存
 */
@Processor('email-cleaning')
export class EmailCleaningWorker {
  private readonly logger = new Logger(EmailCleaningWorker.name);
  
  // 域级限流器映射
  private readonly domainLimiters = new Map<string, RateLimiter>();
  
  // 全局限流器
  private readonly globalLimiter = new RateLimiter({
    rate: Number(process.env.GLOBAL_RATE_LIMIT || '200'),
    burst: Number(process.env.GLOBAL_BURST_LIMIT || '400')
  });

  constructor(
    private readonly emailService: EmailVerificationService,
    private readonly metricsService: MetricsService,
    @InjectRepository(VerificationResult)
    private readonly resultRepository: Repository<VerificationResult>
  ) {}

  /**
   * 处理批量验证任务
   *
   * @param job 批量验证任务
   * @returns 验证结果汇总
   */
  @Process('batch-verify')
  async handleBatch(job: Job<BatchVerificationJob>): Promise<BatchVerificationResult> {
    const { emails, options } = job.data;
    const startTime = Date.now();
    
    this.logger.log(`Starting batch verification for ${emails.length} emails`);
    
    const results: VerificationResult[] = [];
    const errors: VerificationError[] = [];
    
    // 按域名分组，优化验证效率
    const emailGroups = this.groupEmailsByDomain(emails);
    
    let processedCount = 0;
    
    for (const [domain, domainEmails] of emailGroups) {
      // 获取或创建域级限流器
      const domainLimiter = this.getDomainLimiter(domain);
      
      for (const email of domainEmails) {
        try {
          // 全局限流
          await this.globalLimiter.wait();
          
          // 域级限流
          await domainLimiter.wait();
          
          // 验证邮箱
          const result = await this.emailService.verify(email);
          results.push(result);
          
          // 保存结果到数据库（可选）
          if (options?.persistResults) {
            await this.resultRepository.save(result);
          }
          
        } catch (error) {
          const verificationError: VerificationError = {
            email,
            error: error.message,
            timestamp: new Date(),
            type: this.classifyError(error)
          };
          
          errors.push(verificationError);
          this.logger.warn(`Email verification failed: ${email}`, error.stack);
        }
        
        // 更新进度
        processedCount++;
        if (processedCount % 10 === 0) {
          const progress = (processedCount / emails.length) * 100;
          await job.progress(progress);
          
          this.logger.debug(`Batch verification progress: ${progress.toFixed(2)}%`);
        }
      }
    }
    
    const duration = Date.now() - startTime;
    
    // 记录批量处理指标
    this.metricsService.recordBatchMetrics(emails.length, results.length, errors.length, duration);
    
    this.logger.log(`Batch verification completed: ${results.length} success, ${errors.length} errors, ${duration}ms`);
    
    return {
      total: emails.length,
      success: results.length,
      errors: errors.length,
      results,
      errors,
      duration,
      timestamp: new Date()
    };
  }

  /**
   * 按域名分组邮箱
   */
  private groupEmailsByDomain(emails: string[]): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    
    for (const email of emails) {
      const domain = email.split('@')[1]?.toLowerCase();
      if (domain) {
        if (!groups.has(domain)) {
          groups.set(domain, []);
        }
        groups.get(domain)!.push(email);
      }
    }
    
    return groups;
  }

  /**
   * 获取或创建域级限流器
   */
  private getDomainLimiter(domain: string): RateLimiter {
    if (!this.domainLimiters.has(domain)) {
      this.domainLimiters.set(domain, new RateLimiter({
        rate: Number(process.env.DOMAIN_RATE_LIMIT || '3'),
        burst: Number(process.env.DOMAIN_BURST_LIMIT || '6')
      }));
    }
    return this.domainLimiters.get(domain)!;
  }

  /**
   * 分类错误类型
   */
  private classifyError(error: any): string {
    if (error.code === 'ECONNREFUSED') return 'connection_refused';
    if (error.code === 'ETIMEDOUT') return 'timeout';
    if (error.response?.status === 429) return 'rate_limited';
    if (error.response?.status >= 500) return 'server_error';
    return 'unknown';
  }
}
```

## OpenObserve 监控接入

### 监控指标和日志上报建议

- **路由层指标**：
  - `verify_latency_ms`：验证延迟分布
  - `verify_status`：验证状态枚举（success/error）
  - `reachable_enum`：可达性结果分布（yes/no/unknown）
  - 按域名聚合的指标

- **Worker 指标**：
  - `batch_success_rate`：批量成功率
  - `unknown_ratio`：未知结果比例
  - `error_type_distribution`：错误类别分布
  - `processing_throughput`：处理吞吐量

### OpenObserve 客户端实现

```typescript
/**
 * OpenObserve 监控客户端
 *
 * 功能：向 OpenObserve 发送日志和指标数据
 * 特性：
 * - 批量发送优化
 * - 错误重试机制
 * - 数据格式标准化
 */
@Injectable()
export class OpenObserveClient {
  private readonly logger = new Logger(OpenObserveClient.name);
  private readonly batchSize = Number(process.env.OO_BATCH_SIZE || '100');
  private readonly buffer: Record<string, any>[] = [];
  private flushTimer: NodeJS.Timeout;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    // 定期刷新缓冲区
    this.flushTimer = setInterval(() => this.flush(), 5000);
  }

  /**
   * 记录验证结果
   */
  async recordVerificationResult(
    email: string,
    result: VerificationResult,
    duration: number
  ): Promise<void> {
    const record = {
      timestamp: new Date().toISOString(),
      email: this.maskEmail(email),
      domain: this.extractDomain(email),
      reachable: result.reachable,
      has_mx_records: result.has_mx_records,
      disposable: result.disposable,
      role_account: result.role_account,
      free: result.free,
      latency_ms: duration,
      source: 'email-verifier-service',
      kind: 'verify_result',
      version: process.env.APP_VERSION || '1.0.0'
    };

    this.addToBuffer(record);
  }

  /**
   * 记录验证错误
   */
  async recordVerificationError(
    email: string,
    error: Error,
    duration: number
  ): Promise<void> {
    const record = {
      timestamp: new Date().toISOString(),
      email: this.maskEmail(email),
      domain: this.extractDomain(email),
      error_code: error.code || 'unknown',
      error_message: error.message,
      error_type: this.classifyError(error),
      latency_ms: duration,
      source: 'email-verifier-service',
      kind: 'verify_error',
      version: process.env.APP_VERSION || '1.0.0'
    };

    this.addToBuffer(record);
  }

  /**
   * 添加记录到缓冲区
   */
  private addToBuffer(record: Record<string, any>): void {
    this.buffer.push(record);
    
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * 刷新缓冲区到 OpenObserve
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const records = [...this.buffer];
    this.buffer.length = 0; // 清空缓冲区

    try {
      await this.sendToOpenObserve(records);
      this.logger.debug(`Sent ${records.length} records to OpenObserve`);
    } catch (error) {
      this.logger.error('Failed to send records to OpenObserve', error.stack);
      
      // 错误重试：将记录放回缓冲区
      this.buffer.unshift(...records);
    }
  }

  /**
   * 发送数据到 OpenObserve
   */
  private async sendToOpenObserve(records: Record<string, any>[]): Promise<void> {
    const url = `${this.configService.get('OO_BASE_URL')}/api/${this.configService.get('OO_ORG')}/${this.configService.get('OO_STREAM')}/_json`;
    
    await firstValueFrom(
      this.httpService.post(url, records, {
        headers: {
          'Authorization': `Bearer ${this.configService.get('OO_TOKEN')}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000,
      })
    );
  }

  /**
   * 邮箱地址脱敏
   */
  private maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    if (username.length <= 3) {
      return `${username[0]}***@${domain}`;
    }
    return `${username.substring(0, 2)}***@${domain}`;
  }

  /**
   * 销毁时清理资源
   */
  onModuleDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(); // 最后一次刷新
  }
}
```

## 环境变量配置

```bash
# Email Verifier API 配置
EMAIL_VERIFIER_API_BASE=http://apiserver:8080
EMAIL_VERIFIER_API_TIMEOUT_MS=10000

# 缓存配置
EMAIL_VERIFY_TTL_SEC=1800
EMAIL_VERIFY_TTL_UNKNOWN_SEC=600
EMAIL_VERIFY_NEG_CACHE_SEC=60

# 限流配置
GLOBAL_RATE_LIMIT=200
GLOBAL_BURST_LIMIT=400
DOMAIN_RATE_LIMIT=3
DOMAIN_BURST_LIMIT=6

# OpenObserve 配置
OO_BASE_URL=http://openobserve:5080
OO_ORG=default
OO_STREAM=email_verification
OO_TOKEN=YOUR_OPENOBSERVE_TOKEN
OO_BATCH_SIZE=100

# 应用配置
APP_VERSION=1.0.0
LOG_LEVEL=info
```

## Nginx 与网关限流

### Nginx 配置示例

```nginx
# /etc/nginx/conf.d/email-verifier.conf
# 基本限流：每秒10请求，burst 20
limit_req_zone $binary_remote_addr zone=ev_zone:10m rate=10r/s;

server {
    listen 80;
    server_name verifier.example.com;

    # 简单的Basic Auth（可选）或换成JWT/ApiKey校验
    auth_basic "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;

    location /v1/ {
        limit_req zone=ev_zone burst=20 nodelay;

        proxy_pass http://127.0.0.1:8080;
        proxy_connect_timeout 5s;
        proxy_read_timeout 10s;

        # 头部透传/隐藏
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 健康检查端点
    location /healthz {
        proxy_pass http://127.0.0.1:8080/healthz;
        access_log off;
    }

    # API 文档
    location /docs {
        proxy_pass http://127.0.0.1:8080/docs;
    }
}
```

### 安全建议

- 对外暴露 apiserver：使用 Nginx 作为反向代理
- 在 Nest 内部使用 @nestjs/throttler 做二次防护
- 对接 OpenObserve：确保接收端口 5080 可达，Token 管理安全
- 切勿将敏感配置写入代码仓库明文
```