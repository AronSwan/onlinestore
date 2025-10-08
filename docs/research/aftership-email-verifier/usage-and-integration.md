# 使用与集成（加强版）

安装
```sh
go get -u github.com/AfterShip/email-verifier
```

生产级初始化示例（含超时、代理、API 校验、禁用 catch-all）
```go
import (
  "time"
  emailverifier "github.com/AfterShip/email-verifier"
)

func newVerifier() *emailverifier.Verifier {
  v := emailverifier.NewVerifier().
    EnableSMTPCheck().
    DisableCatchAllCheck().         // 更可控的延迟，但失去 catch-all 筛选
    EnableDomainSuggest().
    EnableAutoUpdateDisposable().
    ConnectTimeout(5 * time.Second).
    OperationTimeout(8 * time.Second)

  // 若 25 端口受限，建议使用代理或改走 API Verifier
  v = v.Proxy("socks5://user:pass@127.0.0.1:1080?timeout=5s")

  // 厂商 API 校验（当前看到 Yahoo 支持）
  _ = v.EnableAPIVerifier(emailverifier.YAHOO) // 注意配额与策略，失败需降级

  return v
}
```

错误处理与结果语义
- SMTP 错误：可能出现 connection refused / timeout / 550 5.1.1 等，库会通过 ParseSMTPError 归一化错误语义（ErrFullInbox、ErrNotAllowed、ErrServerUnavailable 等）。
- Reachability：
  - smtpCheckEnabled=false => unknown
  - Deliverable=true => yes
  - CatchAll=true => unknown
  - 其他 => no
- 业务规则建议：
  - unknown：允许注册但在发信阶段做二次确认或延后清洗。
  - no：引导用户修正邮箱或走备用联系方式。

缓存与限流（批量清洗）
- 缓存：
  - MX/域级属性：TTL 1–6 小时。
  - SMTP（Deliverable）：TTL 10–60 分钟；unknown 更短（5–10 分钟）。
  - 失败负缓存：30–120 秒 + 抖动。
- 限流：
  - 域级并发 ≤3；全局并发 ≤200（示例值，按资源与目标域行为调优）。
  - 对代理侧也应限流与健康检查。

批量清洗示例（含缓存/限流/告警占位）
```go
package main

import (
  "fmt"
  "sync"
  "time"

  emailverifier "github.com/AfterShip/email-verifier"
  "golang.org/x/time/rate"
)

// 简易TTL缓存结构（示例）
type cacheEntry[T any] struct {
  val   T
  expire time.Time
}
type ttlCache[T any] struct {
  mu sync.RWMutex
  m  map[string]cacheEntry[T]
}
func newTTLCache[T any]() *ttlCache[T] { return &ttlCache[T]{m: make(map[string]cacheEntry[T])} }
func (c *ttlCache[T]) get(key string) (T, bool) {
  c.mu.RLock(); defer c.mu.RUnlock()
  e, ok := c.m[key]
  var zero T
  if !ok || time.Now().After(e.expire) { return zero, false }
  return e.val, true
}
func (c *ttlCache[T]) set(key string, val T, ttl time.Duration) {
  c.mu.Lock(); defer c.mu.Unlock()
  c.m[key] = cacheEntry[T]{val: val, expire: time.Now().Add(ttl)}
}

func main() {
  v := emailverifier.NewVerifier().
    EnableSMTPCheck().
    DisableCatchAllCheck().
    ConnectTimeout(5 * time.Second).
    OperationTimeout(8 * time.Second)
  // 可选代理：
  // v = v.Proxy("socks5://user:pass@127.0.0.1:1080?timeout=5s")

  emails := []string{"a@example.org", "b@yahoo.com", "c@gmail.com"} // 批量名单
  // 全局限流：每秒 100 次请求（示例）
  limiter := rate.NewLimiter(rate.Limit(100), 200)
  // 域级并发计数（简单示例）
  domainLocks := sync.Map{}

  // 缓存：域级属性（MX/DEA等）与 SMTP 结果
  domainCache := newTTLCache[*emailverifier.Mx]()      // MX 结果
  smtpCache := newTTLCache[*emailverifier.SMTP]()      // SMTP结果（Deliverable/CatchAll等）
  resCache := newTTLCache[*emailverifier.Result]()     // 整体验证结果

  var wg sync.WaitGroup
  for _, email := range emails {
    wg.Add(1)
    go func(email string) {
      defer wg.Done()

      // 限流
      if err := limiter.Wait(context.Background()); err != nil {
        // 告警占位：记录限流等待异常
        fmt.Println("rate limit wait error:", err)
        return
      }

      // 读取结果缓存
      if ret, ok := resCache.get(email); ok {
        fmt.Println("cached result:", email, ret.Reachable)
        return
      }

      // 简单域级并发控制（占位逻辑）
      domain := v.ParseAddress(email).Domain
      muAny, _ := domainLocks.LoadOrStore(domain, &sync.Mutex{})
      mu := muAny.(*sync.Mutex)
      mu.Lock()
      defer mu.Unlock()

      // MX 缓存示例
      if _, ok := domainCache.get(domain); !ok {
        mx, err := v.CheckMX(domain)
        if err == nil {
          domainCache.set(domain, mx, 2*time.Hour)
        }
      }

      // 验证
      ret, err := v.Verify(email)
      if err != nil {
        // 告警占位：记录错误类型统计（如超时/拒绝）
        fmt.Println("verify error:", email, err)
        return
      }

      // SMTP 缓存（根据结果类型设不同TTL）
      ttl := 30 * time.Minute
      if ret.Reachable == "unknown" {
        ttl = 10 * time.Minute
      }
      if ret.SMTP != nil {
        smtpCache.set(email, ret.SMTP, ttl)
      }
      resCache.set(email, ret, ttl)

      fmt.Println("result:", email, ret.Reachable)
    }(email)
  }
  wg.Wait()
}
```

观测与告警（占位建议）
- 采集指标：verify_latency、MX/SMTP 成功率、unknown比例、错误类型分布、代理健康。
- 告警阈值：unknown 比例上升、超时率提升、connection refused 超过阈值、代理失败率高。
- 日志：保留必要语义码与掩码信息，避免敏感数据泄露。

更多：API 实践见 [api-practice.md](api-practice.md)