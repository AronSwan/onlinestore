# 性能与可扩展性（深度版）

本文基于源码分析（verifier.go、smtp.go、mx.go、schedule.go、handler.go）与变更记录（CHANGELOG），聚焦于真实实现细节与生产优化建议。

一、关键性能行为与耗时来源
- SMTP 验证是主要耗时点
  - 并发拨号：smtp.go 的 newSMTPClient 会对所有 MX 记录“并发尝试连接”，第一个成功的连接会赢得并关闭其他连接。这显著降低平均连接时间，但在网络差或目标域 MX 多时会增加瞬时并发与对端压力。
  - 双重超时：Verifier 暴露两个超时参数
    - ConnectTimeout（默认 10s）：建立 TCP 连接的上限。
    - OperationTimeout（默认 10s）：EHLO/MAIL FROM/RCPT 等SMTP操作的读写截止时间。
  - catch-all 检测：启用时会额外进行一次 RCPT TO 随机地址，若对端返回 550 5.1.1 等，判定非 catch-all；否则维持 CatchAll=true。该步骤引入一次额外往返与潜在限速风险。
  - 用户名校验：在非 catch-all 且传入 username 的情况下，再对具体邮箱做 RCPT，决定 Deliverable。多一步往返。
  - 代理开销：Proxy 使用 x/net/proxy ContextDialer，带来额外连接建立成本及代理队列拥塞风险；但可绕过 ISP 25 端口封锁。
- MX 查询（net.LookupMX）
  - 单次 DNS 查询通常很快，但在高并发批量场景是可观测的成本；应考虑结果缓存与公共域名共享。
- 语法/元数据/Gravatar
  - 语法解析与 util 操作为 CPU 内存低成本。
  - 元数据（一次性/免费/角色）为内存主导；disposable 元数据体量较大（metadata_disposable.go ~3.1MB）。
  - Gravatar HTTP 请求在启用时增加网络往返与潜在限速开销。

二、并发模型与背压
- 并发拨号策略
  - 对所有 MX 并发拨号（goroutine + channel），“先到先得”。优点是降低尾延迟，缺点是瞬时连接数可能膨胀。
  - 生产建议：在批量校验时，引入“域级并发上限”和“总并发上限”，例如使用 worker pool 控制每域最多 N 次并发验证、全局最多 M 并发任务。
- Catch-all 与用户名校验
  - 在启用 catch-all 情况下，如果判定为 catch-all，会直接返回，不进行具体用户名 RCPT，这降低额外开销。
  - 如果禁用 catch-all（DisableCatchAllCheck），则永远不会额外随机 RCPT，延迟更可控，但 Reachable 结果更依赖具体用户名 RCPT 成功。
- API Verifier（Yahoo/Gmail）
  - 代码中通过 apiVerifiers 走“厂商 API”路径（目前实现了 Yahoo）。这能避免端口25问题并提升稳定性，但有速率限制与服务策略风险。请谨慎用于生产、加入重试/降级与配额管理。

三、缓存与数据复用
- MX 与域级属性缓存
  -  MX 查询结果（HasMXRecord、MX 列表）对同域短期稳定，建议加 TTL 缓存，减少 DNS 压力与提升吞吐。
  - Free/Role/Disposable 判断为纯函数，可直接缓存域级结果（注意自动更新 Disposable 时需要失效）。
- SMTP 结果缓存
  - 对 Deliverable 的结论可按短 TTL 缓存，以降低重复 RCPT；但需考虑目标域策略变化与缓存污染风险（建议区分“肯定不可达”与“未知”不同 TTL）。
- 失败缓存与抖动
  - 对 connection refused/超时等失败进行短暂负缓存，避免雪崩式重试。

四、调度与大规模数据
- 自动更新一次性域名（EnableAutoUpdateDisposable）
  - schedule.go 使用 time.Ticker + goroutine 进行周期更新，handler.go 中 updateDisposableDomains 会覆盖 disposableSyncDomains（并保留用户追加的 additionalDisposableDomains）。
  - 性能与一致性建议：
    - 更新周期默认 24h，可根据场景缩短但注意来源频率与网络开销。
    - 更新函数当前非原子替换（先 Range 删除，再 Store），在高并发读取下可能短暂不一致；如需严格一致性，可在外层用读写锁或使用“生成新 map 后整体替换”的策略。
  - 元数据体量
    - metadata_disposable.go 约 3.1MB，加载后驻留内存；在容器内需预估内存使用并限制副本数量或启用精简模式（如仅按需加载）。

五、代理与网络调优
- 代理 URI 示例：socks5://user:password@127.0.0.1:1080?timeout=5s
  - timeout 参数影响 DialContext 超时；与 Verifier.ConnectTimeout/OperationTimeout协同调优，建议：
    - ConnectTimeout：3–5s（可根据网络提升到 10s），批量时更短更好，避免堆积。
    - OperationTimeout：5–10s，避免 EHLO/RCPT 卡死。
- ISP 封锁 25 端口
  - 若无法开放，优先使用代理或改走 API Verifier；否则 SMTP 检查会“直到超时再返回”，影响尾延迟。

六、可观测性与指标
- 建议采集的指标与日志
  - 指标：
    - verify_total/verify_latency_ms 分布、MX 查询耗时、SMTP 连接耗时与成功率、catch-all 命中率、deliverable 命中率、reachable 枚举比例。
    - error 分类计数（connection refused、timeout、550 5.1.1、not allowed 等）。
    - 代理侧指标（队列等待、连接失败率）。
  - 日志：
    - 每步错误的精简语义码（smtp.error 已内置），避免记录敏感信息（代理凭证、完整服务响应）。
- 追踪
  - 在批量清洗作业中加入 trace/span，标注域级与邮箱级上下文，便于定位热点域与问题MX。

七、基准测试方法（建议）
- 单域基准
  - 准备 1/3/5 个 MX 的域，分别测试无代理与代理情况下的 Connect 与 Verify 延迟分布。
  - 关闭/开启 catch-all 检测对平均耗时与 unknown 比例的影响。
- 批量基准
  - 1万/10万邮箱名册，设置 worker 数（如 50/100/200），对不同 TTL 缓存策略进行 A/B 测试，观察吞吐（emails/sec）与错误率。
- 目标域类型
  - 常见免费域（gmail、yahoo）、企业域（多个MX）、带防护的域（限速/反爬），分别统计性能与结果分布。

八、生产优化清单
- 超时与并发
  - ConnectTimeout/OperationTimeout按网络特性收敛（如 3–5s/5–8s）。
  - Worker pool 控制域级与全局并发上限（例如每域≤3、全局≤200）。
- 缓存
  - MX/域维度属性 TTL=1–6小时，SMTP 结果 TTL=10–60分钟（unknown 设置更短）。
  - 失败短负缓存（30–120秒）+抖动、退避。
- 策略与降级
  - 在未知（unknown）情况下结合业务规则（例如允许注册但延后发信进行二次确认）。
  - 无法 SMTP 的环境：关闭 SMTP 检查，依赖 Syntax/MX/Disposable/Free/Role +风控。
- API Verifier 使用
  - 配额管理、速率限制、失败回退至传统 SMTP/或直接标注 unknown。
- 代理与网络
  - 代理池与健康检查；不同地区多点代理分发，降低单点拥塞。
- 资源与部署
  - 预估元数据内存（尤其 disposable），容器限制内存与CPU，分片任务与水平扩展。
- 观测与告警
  - 针对 error 类别、超时率、unknown比例、代理故障设置告警阈值。

九、注意事项与版本变化
- CHANGELOG 中的性能相关更新：
  - v1.1.0：Result 结构尺寸优化（96→80），ParseAddress 返回值改为值类型改善内存局部性。
  - v1.3.2：改用 x/net/proxy 修复 SOCKS5 使用问题。
  - v1.3.x：catchAll 检测可选化，减少额外往返与阻塞可能。
  - v1.4.0：HasMXRecord判断优化；支持通过 API 验证（Yahoo），在不可用 25 端口时性能与稳定性更好，但有配额限制风险。

总结
- 性能瓶颈集中于 SMTP 连接与RCPT操作，库本身通过并发拨号与超时控制优化尾延迟；但批量生产需辅以“并发限流、缓存、失败退避、代理池与可观测性”才能获得稳定高吞吐。
- 在受限网络环境下，建议关闭或降级 SMTP 检查，或采用 API Verifier 并做好配额与降级策略。