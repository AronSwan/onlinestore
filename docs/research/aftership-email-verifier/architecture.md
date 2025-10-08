# 架构与源码结构（加强版）

## 目录
- [项目架构概述](#项目架构概述)
- [核心架构组件与设计模式](#核心架构组件与设计模式)
- [架构特点与设计模式应用](#架构特点与设计模式应用)
- [关键数据结构](#关键数据结构)
- [调用链与控制流](#调用链与控制流)
- [并发与定时机制](#并发与定时机制)
- [注意点](#注意点)

## 项目架构概述

AfterShip Email Verifier 是一个用 Go 语言编写的邮箱验证库，采用模块化设计，具有清晰的职责分离和优秀的设计模式应用。

## 核心架构组件与设计模式

### 1. 验证器核心 (Verifier)
- **文件**: `verifier.go` - 核心 Verifier 类型与主流程
- **职责**: 协调所有验证流程，提供统一的验证接口
- **设计模式**: 门面模式 (Facade Pattern)
- **可配置项**: smtpCheckEnabled、catchAllCheckEnabled、domainSuggestEnabled、gravatarCheckEnabled、fromEmail、helloName、proxyURI、connectTimeout、operationTimeout、apiVerifiers（厂商API路径）

### 2. 验证模块
- **语法验证**: `address.go` - 邮箱格式验证，用户名/域名分离
- **MX记录验证**: `mx.go` - DNS MX记录检查（net.LookupMX）
- **SMTP验证**: `smtp.go` - 邮件服务器连接验证（并发拨号全部 MX，超时控制）
- **元数据验证**: 
  - `metadata_disposable.go` - 一次性邮箱检测（~3.1MB内置数据）
  - `metadata_free.go` - 免费邮箱服务商检测
  - `metadata_role.go` - 角色邮箱检测
  - `misc.go` - 辅助校验逻辑

### 3. 辅助模块
- **Gravatar集成**: `gravatar.go` - Gravatar头像检测（可选）
- **域名建议**: `suggestion.go` / `metadata_suggestion.go` - 拼写纠错（如 gmai.com -> gmail.com）
- **定时调度**: `schedule.go` - 自动更新一次性域名清单（time.Ticker + goroutine）
- **数据更新**: `handler.go` - updateDisposableDomains 实现（HTTP 拉取 JSON 清单）
- **错误处理**: `error.go` - 统一的错误处理机制
- **工具函数**: `constants.go` / `util.go` - 常量定义和通用工具

## 架构特点与设计模式应用

### 1. 模块化设计
- 每个验证功能独立封装，高内聚低耦合
- 易于扩展和维护，支持选择性启用功能
- 配置驱动，通过配置选项控制验证行为

### 2. 设计模式应用
#### 建造者模式 (Builder Pattern)
```go
verifier := emailverifier.
    NewVerifier().
    EnableSMTPCheck().
    EnableAutoUpdateDisposable().
    Proxy("socks5://proxy:1080")
```

#### 策略模式 (Strategy Pattern)
- 不同的验证策略可以灵活组合
- 支持自定义验证规则和验证流程

#### 观察者模式 (Observer Pattern)
- 支持验证过程中的事件监听
- 便于监控和日志记录

### 3. 并发安全设计
- 线程安全的验证器实例
- 适当的锁机制（sync.RWMutex）
- 避免竞态条件，确保数据一致性

关键数据结构
- Verifier：
  - 超时：connectTimeout（建立连接）、operationTimeout（SMTP命令读写），默认均为 10s。
  - apiVerifiers：厂商 API 校验器（当前内置 YAHOO；Gmail在 CHANGELOG 提及但主干内仅看到 Yahoo 实现文件）。
- Result：
  - Email、Reachable（unknown/yes/no）、Syntax、SMTP、Gravatar、Suggestion、Disposable、RoleAccount、Free、HasMxRecords。
- SMTP：
  - HostExists、FullInbox、CatchAll、Deliverable、Disabled。

调用链与控制流（Verify）
1) ParseAddress -> Syntax.Valid 否则返回。
2) 域级属性：IsFreeDomain、IsRoleAccount、IsDisposable。
3) 若 Disposable=true，跳过 MX/SMTP。
4) CheckMX(domain) -> HasMxRecords。
5) CheckSMTP(domain, username)：
   - 若 smtpCheckEnabled=false，返回 nil；否则并发拨号全部 MX，首个成功的连接继续流程。
   - Hello(helloName) -> Mail(fromEmail)。
   - 若启用 catch-all：对随机用户执行 Rcpt，解析错误语义（如 550 5.1.1），决定 CatchAll/FullInbox/Disabled 等，再决定是否跳过具体用户名校验。
   - 非 catch-all 且 username 非空：Rcpt(email) 判定 Deliverable。
6) Reachable：基于 SMTP（deliverable/ catch-all）与 smtpCheckEnabled 计算 unknown/yes/no。
7) 可选：CheckGravatar / SuggestDomain。

并发与定时
- 并发拨号：对所有 MX goroutine 并发 Dial，首个成功者赢；其余连接关闭。降低尾延迟，但提高瞬时并发。
- 定时更新：EnableAutoUpdateDisposable() 会先拉取一次清单，再启动 24h 定时任务；Stop 则停止 Ticker。

注意点
- 代理：Proxy("socks5://...") 支持 socks4/4a/5；与超时参数协同调优。
- API Verifier：走厂商 API（当前看到 Yahoo），避免 25 端口问题，但有配额与策略风险。
- 元数据体量：disposable 清单较大，需评估内存占用与副本数量。