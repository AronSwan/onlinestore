# API 实践（cmd/apiserver 部署与网关限流）

## 目录
- [API设计与最佳实践](#api设计与最佳实践)
- [部署与运维](#部署与运维)
- [构建与运行](#构建与运行)
- [Nginx 反向代理与限流示例](#nginx-反向代理与限流示例)
- [网关层策略建议](#网关层策略建议)
- [后端实践建议](#后端实践建议)
- [部署与运维](#部署与运维-1)

## API设计与最佳实践

### 1. 核心API设计原则
- **RESTful设计**：遵循REST API最佳实践，资源导向的URL设计
- **版本管理**：清晰的API版本控制策略
- **错误处理**：统一的错误响应格式和HTTP状态码
- **文档化**：OpenAPI/Swagger文档自动生成

### 2. 性能优化策略
- **缓存策略**：多级缓存设计（客户端、CDN、服务端）
- **限流机制**：API限流和配额管理
- **异步处理**：批量请求的异步处理和回调机制
- **压缩传输**：响应数据压缩和分页优化

### 3. 安全最佳实践
- **认证授权**：API密钥、OAuth2、JWT等多种认证方式
- **数据保护**：HTTPS加密传输，敏感数据脱敏
- **输入验证**：严格的参数验证和SQL注入防护
- **审计日志**：完整的API调用审计和监控

## 部署与运维

### 1. 部署架构
- **微服务架构**：API网关、服务发现、负载均衡
- **容器化部署**：Docker容器化，Kubernetes编排
- **高可用设计**：多可用区部署，自动故障转移

### 2. 监控告警
- **性能监控**：响应时间、吞吐量、错误率监控
- **业务监控**：验证成功率、未知邮箱比例等业务指标
- **告警策略**：多级告警阈值和通知机制

目标

一、构建与运行（示例）
```sh
# 进入仓库根目录（此处为参考路径，实际以你部署目录为准）
cd /path/to/email-verifier

# 构建 apiserver
go build -o bin/apiserver ./cmd/apiserver

# 运行（示例端口）
./bin/apiserver -port 8080
# API: GET http://127.0.0.1:8080/v1/{email}/verification
```

二、Nginx 反向代理与限流示例
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
    }

    # 健康检查端点（若apiserver支持）
    location /healthz {
        proxy_pass http://127.0.0.1:8080/healthz;
    }
}
```
- 说明：
  - limit_req_zone：基于客户端IP限速；可改为基于API Key或用户ID。
  - auth_basic：基础鉴权示例。生产可替换为更安全的机制。
  - 超时：与后端 apiserver 超时参数协同。

三、网关层策略建议
- 限流分级：全局/租户/IP 维度限速，防止集中打点。
- 重试与熔断：对5xx/超时设置合理重试与熔断，避免雪崩。
- 缓存：对高频域的 MX/DEA结果，可在网关前置缓存（若业务允许）。
- 观测：接入访问日志与指标（qps、4xx/5xx、延迟分布）。

四、后端（apiserver）实践建议
- 接口鉴权：API Key / JWT / 传入签名校验。
- 并发与限流：后端也应设置域级/全局并发上限，避免对端被视为异常。
- 缓存层：MX/DEA/SMTP结果短TTL缓存；失败负缓存与退避。
- 配置化：代理URI、超时、是否启用SMTP/ catch-all、是否启用APIVerifier等通过配置文件/环境变量管理。
- 观测与告警：接入 OpenObserve（HTTP Ingest 或 OTEL），采集 verify_latency、reachable 分布、错误类别；unknown 比例与超时率设阈值告警。
  - Ingest（HTTP）示例：POST http://openobserve:5080/api/{org}/{stream}/_json，Header: Authorization: Bearer {token}
  - 建议 stream=email_verification，字段含 email/domain/reachable/latency_ms/kind（result/error）

五、部署与运维
- 进程管理：systemd/PM2/Supervisor（按环境选择），确保崩溃自启。
- 滚动升级：双节点/蓝绿部署，保障服务可用。
- 安全：证书管理（HTTPS）、鉴权密钥保密、最小权限原则。

更多
- 使用与集成详见 [usage-and-integration.md](usage-and-integration.md)
- 性能与可扩展性详见 [performance-and-scalability.md](performance-and-scalability.md)