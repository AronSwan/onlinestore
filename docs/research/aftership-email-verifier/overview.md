# 概览

- 项目：AfterShip/email-verifier
- 语言/生态：Go
- 许可：MIT
- 目标：在不发送邮件的情况下进行邮箱地址验证与可达性评估（Syntax、MX、SMTP、Disposable、Free Provider、Role Account、Gravatar、Typo建议、Reachability 等）。
- 亮点：
  - 支持多维度校验（语法、DNS、SMTP、黑白名单元数据）。
  - 可选启用 SMTP 实时验证（默认关闭，因多数 ISP 封锁 25 端口）。
  - 支持 SOCKS4/4a/5 代理，提升在受限网络下的验证能力。
  - 可自动更新一次性邮箱域名列表（EnableAutoUpdateDisposable）。
  - 提供简单的自托管 API 参考脚本（cmd/apiserver）。

核心使用方式：
- `NewVerifier()` 初始化，按需启用功能：`EnableSMTPCheck()`, `DisableCatchAllCheck()`, `Proxy(...)`, `EnableAutoUpdateDisposable()`, `EnableDomainSuggest()`
- `Verify(email)` 一次性完成综合校验
- `CheckSMTP(domain, username)` 进行 SMTP 维度单独检查
- `IsDisposable(domain)`、`SuggestDomain(domain)` 等便捷方法

适用场景：
- 注册/订阅表单邮箱验证
- 营销/通知邮件名单清洗（提升投递成功率）
- 安全风控（一次性邮箱、角色邮箱识别）