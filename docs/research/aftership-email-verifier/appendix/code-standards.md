# 代码示例标准化指南

## 目录
- [概述](#概述)
- [Go代码示例标准](#go代码示例标准)
- [TypeScript代码示例标准](#typescript代码示例标准)
- [配置文件标准](#配置文件标准)
- [命令行示例标准](#命令行示例标准)
- [文档代码块格式](#文档代码块格式)

## 概述

本文档定义了AfterShip Email Verifier文档中所有代码示例和配置示例的标准化格式，确保文档的一致性和可读性。

### 目标
- 提供一致的代码示例格式
- 确保代码示例的可执行性
- 提高文档的可读性和专业性
- 减少代码示例中的错误

### 适用范围
- 所有Markdown文档中的代码示例
- 配置文件示例
- 命令行示例
- API响应示例

## Go代码示例标准

### 基本格式

```go
// 包导入
package main

import (
    "context"
    "fmt"
    "time"
    
    emailverifier "github.com/AfterShip/email-verifier"
)

// 常量定义
const (
    DefaultTimeout = 5 * time.Second
    MaxRetries     = 3
)

// 类型定义
type VerificationResult struct {
    Email     string    `json:"email"`
    Reachable string    `json:"reachable"`
    Timestamp time.Time `json:"timestamp"`
}

// 函数定义
func verifyEmail(email string) (*VerificationResult, error) {
    // 创建验证器
    verifier := emailverifier.NewVerifier().
        EnableSMTPCheck().
        ConnectTimeout(DefaultTimeout)
    
    // 执行验证
    result, err := verifier.Verify(email)
    if err != nil {
        return nil, fmt.Errorf("verification failed: %w", err)
    }
    
    // 构造返回结果
    return &VerificationResult{
        Email:     email,
        Reachable: result.Reachable,
        Timestamp: time.Now(),
    }, nil
}

// 主函数
func main() {
    // 示例邮箱
    email := "user@example.com"
    
    // 执行验证
    result, err := verifyEmail(email)
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }
    
    // 输出结果
    fmt.Printf("Email: %s, Reachable: %s\n", result.Email, result.Reachable)
}
```

### 错误处理标准

```go
// 标准错误处理模式
func verifyEmailWithRetry(email string) (*VerificationResult, error) {
    var lastErr error
    
    for attempt := 0; attempt < MaxRetries; attempt++ {
        result, err := verifyEmail(email)
        if err == nil {
            return result, nil
        }
        
        lastErr = err
        
        // 根据错误类型决定是否重试
        if !isRetryableError(err) {
            break
        }
        
        // 指数退避
        backoff := time.Duration(1<<uint(attempt)) * time.Second
        time.Sleep(backoff)
    }
    
    return nil, fmt.Errorf("verification failed after %d attempts: %w", MaxRetries, lastErr)
}

// 错误分类函数
func isRetryableError(err error) bool {
    // 根据错误类型判断是否可重试
    if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
        return true
    }
    
    // 其他可重试的错误类型
    return false
}
```

### 注释标准

```go
// Package verifier provides email verification functionality.
//
// The verifier supports multiple verification methods including syntax validation,
// MX record checking, and SMTP verification.
package verifier

// Verifier provides email verification functionality.
//
// The Verifier struct encapsulates all configuration and state needed for
// email verification operations.
type Verifier struct {
    // client is the HTTP client used for API requests
    client *http.Client
    
    // cache stores verification results to improve performance
    cache Cache
    
    // config contains verifier configuration
    config Config
}

// NewVerifier creates a new Verifier instance with default configuration.
//
// Example:
//     verifier := NewVerifier()
//     result, err := verifier.Verify("user@example.com")
//
// Returns:
//   *Verifier: A new verifier instance
//   error: Any error that occurred during initialization
func NewVerifier(opts ...Option) (*Verifier, error) {
    // 实现细节
}
```

## TypeScript代码示例标准

### 基本格式

```typescript
// 导入语句
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

// 接口定义
export interface VerificationResult {
  email: string;
  reachable: 'yes' | 'no' | 'unknown';
  syntax: SyntaxInfo;
  has_mx_records: boolean;
  disposable: boolean;
  role_account: boolean;
  free: boolean;
}

export interface SyntaxInfo {
  username: string;
  domain: string;
  valid: boolean;
}

// 类型定义
export type VerificationStatus = 'success' | 'error' | 'timeout';

// 类定义
@Injectable()
export class EmailVerificationService {
  private readonly http: AxiosInstance;
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(private readonly configService: ConfigService) {
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
   * console.log(result.reachable); // 'yes' | 'no' | 'unknown'
   * ```
   */
  async verify(email: string): Promise<VerificationResult> {
    // 参数验证
    if (!this.isValidEmailFormat(email)) {
      throw new BadRequestException('Invalid email format');
    }
    
    try {
      // 执行验证
      const response = await this.http.get<VerificationResult>(
        `/v1/${encodeURIComponent(email)}/verification`
      );
      
      return response.data;
    } catch (error) {
      // 错误处理
      this.logger.error(`Email verification failed: ${email}`, error.stack);
      throw new ServiceException(`Verification failed: ${error.message}`);
    }
  }

  /**
   * 验证邮箱格式
   * 
   * @param email 邮箱地址
   * @returns 是否为有效格式
   */
  private isValidEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 创建HTTP客户端
   * 
   * @returns 配置好的HTTP客户端
   */
  private createHttpClient(): AxiosInstance {
    return axios.create({
      baseURL: this.configService.get<string>('EMAIL_VERIFIER_API_BASE'),
      timeout: this.configService.get<number>('EMAIL_VERIFIER_API_TIMEOUT_MS', 10000),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
```

### 错误处理标准

```typescript
// 自定义错误类
export class VerificationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'VerificationError';
  }
}

// 错误处理装饰器
export function handleVerificationErrors(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    try {
      return await originalMethod.apply(this, args);
    } catch (error) {
      if (error.response) {
        // HTTP错误
        const { status, data } = error.response;
        throw new VerificationError(
          data.message || 'API request failed',
          `HTTP_${status}`,
          { status, data }
        );
      } else if (error.request) {
        // 网络错误
        throw new VerificationError(
          'Network error occurred',
          'NETWORK_ERROR',
          { originalError: error.message }
        );
      } else {
        // 其他错误
        throw new VerificationError(
          error.message,
          'UNKNOWN_ERROR',
          { originalError: error }
        );
      }
    }
  };

  return descriptor;
}
```

### 注释标准

```typescript
/**
 * 邮箱验证服务
 * 
 * 提供邮箱地址验证功能，支持语法验证、MX记录检查和SMTP验证。
 * 
 * @example
 * ```typescript
 * // 创建服务实例
 * const service = new EmailVerificationService(configService);
 * 
 * // 验证邮箱
 * const result = await service.verify('user@example.com');
 * console.log(result.reachable);
 * ```
 */
export class EmailVerificationService {
  /**
   * 验证邮箱地址
   * 
   * 执行完整的邮箱验证流程，包括语法检查、MX记录验证和SMTP验证。
   * 
   * @param email - 要验证的邮箱地址
   * @param options - 可选的验证选项
   * @returns 验证结果Promise
   * 
   * @throws {BadRequestException} 当邮箱格式无效时
   * @throws {ServiceException} 当验证服务不可用时
   * @throws {TimeoutException} 当验证超时时
   * 
   * @example
   * ```typescript
   * try {
   *   const result = await service.verify('user@example.com', {
   *     timeout: 5000,
   *     useCache: true
   *   });
   *   console.log(`验证结果: ${result.reachable}`);
   * } catch (error) {
   *   console.error(`验证失败: ${error.message}`);
   * }
   * ```
   */
  async verify(
    email: string, 
    options: VerificationOptions = {}
  ): Promise<VerificationResult> {
    // 实现细节
  }
}
```

## 配置文件标准

### YAML配置文件

```yaml
# 应用配置文件
app:
  name: "email-verifier"
  version: "1.0.0"
  environment: "production"
  
# 服务器配置
server:
  host: "0.0.0.0"
  port: 8080
  timeout: 30s
  
# 数据库配置
database:
  type: "postgresql"
  host: "localhost"
  port: 5432
  username: "email_verifier"
  password: "${DB_PASSWORD}"
  database: "email_verification"
  ssl: true
  pool:
    min: 5
    max: 20
    idle_timeout: 300s

# 邮箱验证配置
verification:
  # SMTP配置
  smtp:
    enabled: true
    timeout: 10s
    connect_timeout: 5s
    operation_timeout: 8s
    
  # 缓存配置
  cache:
    type: "redis"
    ttl: 1800s
    unknown_ttl: 600s
    
  # 代理配置
  proxy:
    enabled: true
    url: "socks5://proxy.example.com:1080"
    timeout: 5s
    
  # 限流配置
  rate_limit:
    global_limit: 200
    domain_limit: 3
    burst_limit: 6

# 日志配置
logging:
  level: "info"
  format: "json"
  output: "stdout"
  
  # 日志文件配置
  file:
    enabled: true
    path: "/var/log/email-verifier/app.log"
    max_size: "100MB"
    max_files: 10
    rotate: "daily"

# 监控配置
monitoring:
  # Prometheus指标
  metrics:
    enabled: true
    path: "/metrics"
    port: 9090
    
  # 健康检查
  health:
    enabled: true
    path: "/health"
    
  # 分布式追踪
  tracing:
    enabled: true
    type: "jaeger"
    endpoint: "http://jaeger:14268/api/traces"
```

### JSON配置文件

```json
{
  "app": {
    "name": "email-verifier",
    "version": "1.0.0",
    "environment": "production"
  },
  "server": {
    "host": "0.0.0.0",
    "port": 8080,
    "timeout": "30s"
  },
  "verification": {
    "smtp": {
      "enabled": true,
      "timeout": "10s",
      "connect_timeout": "5s",
      "operation_timeout": "8s"
    },
    "cache": {
      "type": "redis",
      "ttl": "1800s",
      "unknown_ttl": "600s"
    },
    "proxy": {
      "enabled": true,
      "url": "socks5://proxy.example.com:1080",
      "timeout": "5s"
    },
    "rate_limit": {
      "global_limit": 200,
      "domain_limit": 3,
      "burst_limit": 6
    }
  }
}
```

### 环境变量文件

```bash
# 应用环境变量
APP_NAME=email-verifier
APP_VERSION=1.0.0
APP_ENV=production

# 服务器配置
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
SERVER_TIMEOUT=30s

# 数据库配置
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=email_verifier
DB_PASSWORD=your_password_here
DB_DATABASE=email_verification
DB_SSL=true

# 邮箱验证配置
SMTP_ENABLED=true
SMTP_TIMEOUT=10s
SMTP_CONNECT_TIMEOUT=5s
SMTP_OPERATION_TIMEOUT=8s

CACHE_TYPE=redis
CACHE_TTL=1800
CACHE_UNKNOWN_TTL=600

PROXY_ENABLED=true
PROXY_URL=socks5://proxy.example.com:1080
PROXY_TIMEOUT=5s

RATE_LIMIT_GLOBAL=200
RATE_LIMIT_DOMAIN=3
RATE_LIMIT_BURST=6

# 日志配置
LOG_LEVEL=info
LOG_FORMAT=json
LOG_OUTPUT=stdout

# 监控配置
METRICS_ENABLED=true
METRICS_PATH=/metrics
METRICS_PORT=9090

HEALTH_ENABLED=true
HEALTH_PATH=/health
```

## 命令行示例标准

### 基本命令格式

```bash
# 基本命令格式：命令 [选项] [参数]

# 安装依赖
go get github.com/AfterShip/email-verifier

# 构建应用
go build -o bin/email-verifier ./cmd/server

# 运行应用
./bin/email-verifier --config config.yaml

# 带环境变量运行
DB_PASSWORD=secret ./bin/email-verifier
```

### Docker命令示例

```bash
# 构建Docker镜像
docker build -t email-verifier:latest .

# 运行Docker容器
docker run -d \
  --name email-verifier \
  -p 8080:8080 \
  -e DB_PASSWORD=secret \
  -v $(pwd)/config.yaml:/app/config.yaml \
  email-verifier:latest

# Docker Compose运行
docker-compose up -d

# 查看容器日志
docker logs -f email-verifier

# 进入容器调试
docker exec -it email-verifier /bin/sh
```

### Kubernetes命令示例

```bash
# 应用Kubernetes配置
kubectl apply -f k8s/

# 查看部署状态
kubectl get deployments -n email-verifier

# 查看Pod日志
kubectl logs -f deployment/email-verifier -n email-verifier

# 扩容部署
kubectl scale deployment email-verifier --replicas=3 -n email-verifier

# 更新部署
kubectl set image deployment/email-verifier \
  email-verifier=email-verifier:v1.1.0 -n email-verifier
```

## 文档代码块格式

### 代码块标记

```markdown
# Go代码示例
```go
// Go代码内容
```

# TypeScript代码示例
```typescript
// TypeScript代码内容
```

# 配置文件示例
```yaml
# YAML配置内容
```

# 命令行示例
```bash
# 命令行内容
```

# API响应示例
```json
// JSON响应内容
```
```

### 代码块标题和描述

```markdown
以下是一个完整的邮箱验证示例：

```go
package main

import (
    "fmt"
    emailverifier "github.com/AfterShip/email-verifier"
)

func main() {
    // 创建验证器
    verifier := emailverifier.NewVerifier().
        EnableSMTPCheck().
        ConnectTimeout(5 * time.Second)
    
    // 验证邮箱
    result, err := verifier.Verify("user@example.com")
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }
    
    // 输出结果
    fmt.Printf("Email: %s, Reachable: %s\n", result.Email, result.Reachable)
}
```

执行上述代码将输出以下结果：

```
Email: user@example.com, Reachable: yes
```
```

### 代码高亮和注释

```markdown
// 关键配置项
```yaml
verification:
  smtp:
    enabled: true      # 启用SMTP验证
    timeout: 10s       # SMTP超时时间
  cache:
    ttl: 1800s        # 缓存生存时间
    unknown_ttl: 600s  # 未知结果缓存时间
```

// 重要代码行
```typescript
// 创建验证器并配置SMTP验证
const verifier = newVerifier()
  .enableSMTPCheck()     // 启用SMTP验证
  .setTimeout(10000)      // 设置超时时间
  .setProxy(proxyUrl);    // 设置代理
```
```

### 代码块内联格式

```markdown
在代码中使用 `emailverifier.NewVerifier()` 创建验证器实例。

配置文件中的 `verification.smtp.enabled` 选项控制是否启用SMTP验证。

使用 `docker run -d --name email-verifier` 命令以后台模式运行容器。
```

## 总结

遵循本指南中的标准，可以确保文档中的代码示例和配置示例具有一致性和专业性。这些标准有助于：

1. 提高代码示例的可读性和可理解性
2. 确保代码示例的可执行性和正确性
3. 提供统一的错误处理和注释风格
4. 简化代码示例的维护和更新

所有文档贡献者都应遵循本指南中的标准，以保持文档的整体质量和一致性。