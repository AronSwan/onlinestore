# 功能与API（加强版）

## 目录
- [功能架构概述](#功能架构概述)
- [验证功能模块](#验证功能模块)
- [核心类型与配置](#核心类型与配置)
- [核心方法](#核心方法)
- [自托管 API](#自托管-api)
- [使用注意](#使用注意)

## 功能架构概述

AfterShip Email Verifier 提供了全面的邮箱验证功能，采用模块化设计，支持灵活的配置选项。验证流程遵循分层验证策略，从基础语法验证到高级SMTP验证。

## 验证功能模块

### 1. 基础验证功能
- **语法校验（Syntax）**：username/domain 提取与合法性判定，基于RFC标准验证邮箱格式
- **MX 校验（DNS）**：域名是否具备有效 MX 记录，确保邮件服务器可达性
- **SMTP 验证（可选）**：HostExists、CatchAll、Deliverable、FullInbox、Disabled 等状态检测

### 2. 高级验证功能
- **Disposable/Free/Role 检测**：纯函数判定，基于内置大清单与辅助逻辑
- **Gravatar 查询（可选）**：辅助活跃度判断，增强用户体验
- **Reachability**：综合 SMTP 与开关状态，输出 unknown/yes/no
- **Typo 建议**：SuggestDomain，或在 Verify 中通过 EnableDomainSuggest 开启

## 核心类型与配置

### 1. Verifier 配置选项
- **功能开关**：smtpCheckEnabled / catchAllCheckEnabled / domainSuggestEnabled / gravatarCheckEnabled
- **连接参数**：fromEmail / helloName / proxyURI
- **超时控制**：connectTimeout / operationTimeout（默认 10s）
- **API验证器**：apiVerifiers（当前含 Yahoo 校验器）

### 2. 验证结果结构
- **Result**：Email、Reachable（unknown/yes/no）、Syntax、SMTP、Gravatar、Suggestion、Disposable、RoleAccount、Free、HasMxRecords
- **SMTP状态**：HostExists、FullInbox、CatchAll、Deliverable、Disabled

功能维度

重要类型与字段（摘要）
- Verifier：
  - smtpCheckEnabled / catchAllCheckEnabled / domainSuggestEnabled / gravatarCheckEnabled
  - fromEmail / helloName / proxyURI
  - connectTimeout / operationTimeout（默认 10s）
  - apiVerifiers（当前含 Yahoo 校验器）
- Result：
  - Email、Reachable（unknown/yes/no）、Syntax、SMTP、Gravatar、Suggestion、Disposable、RoleAccount、Free、HasMxRecords
- SMTP：
  - HostExists、FullInbox、CatchAll、Deliverable、Disabled

核心方法
```go
verifier := emailverifier.NewVerifier().
  EnableSMTPCheck().
  // EnableAPIVerifier(YAHOO)  // 需要时启用厂商API校验，注意配额与策略
  EnableDomainSuggest().
  EnableAutoUpdateDisposable().
  Proxy("socks5://user:pass@127.0.0.1:1080?timeout=5s").
  ConnectTimeout(5 * time.Second).
  OperationTimeout(8 * time.Second)

ret, err := verifier.Verify("user@example.org")
if err != nil { /* 处理错误 */ }

mx, err := verifier.CheckMX("example.org")
smtp, err := verifier.CheckSMTP("example.org", "user")
isDEA := verifier.IsDisposable("example.org")
suggest := verifier.SuggestDomain("gmai.com")
```

自托管 API（参考）
- 路径：cmd/apiserver
- 接口：GET https://{host}/v1/{email}/verification
- 提示：示例性质，生产需加入限流、缓存、重试、观测与告警。

使用注意
- 若 ISP 封锁 25 端口，EnableSMTPCheck 将导致超时；建议使用 Proxy 或 EnableAPIVerifier（有配额风险）。
- Reachability 在 smtpCheckEnabled=false 或 CatchAll=true 时代码会返回 unknown。需要用业务策略处理 unknown。