# 架构与源码结构（加强版）

核心文件与职责
- verifier.go：核心 Verifier 类型与主流程（配置、Verify 入口、Reachable 计算、自动更新调度控制）。
  - 可配置项：smtpCheckEnabled、catchAllCheckEnabled、domainSuggestEnabled、gravatarCheckEnabled、fromEmail、helloName、proxyURI、connectTimeout、operationTimeout、apiVerifiers（厂商API路径）。
- smtp.go：SMTP 验证实现（并发拨号全部 MX，超时控制；RCPT 随机地址进行 catch-all 检测；具体用户名的投递可达性判定）。
- mx.go：MX 记录查询（net.LookupMX），返回 HasMXRecord 与 MX 列表。
- address.go：邮箱语法解析（用户名/域名），配合 constants/util。
- misc.go：Free Provider/Role/Disposable 等辅助校验。
- gravatar.go：Gravatar 查询（可选），网络往返。
- suggestion.go / metadata_suggestion.go：域名拼写建议（如 gmai.com -> gmail.com）。
- metadata_disposable.go（~3.1MB）/ metadata_free.go / metadata_role.go：内置元数据；加载后驻留内存。
- schedule.go：定时调度（time.Ticker + goroutine），用于自动更新一次性域名清单。
- handler.go：updateDisposableDomains 实现（HTTP 拉取 JSON 清单，原子性与一致性需注意）。
- error.go / constants.go / util.go：错误语义、常量与工具方法。

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