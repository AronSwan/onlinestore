# 后端改进 Issue 清单（可直接转为任务）

> 说明：按里程碑分解为可执行 Issue。每项包含目标、动机、涉及文件、验收标准（DoD）、估时、风险、依赖、Owner、状态。可复制到项目管理工具。

---

## M1 缓存与一致性（P0）

### 1. 移除全局 CacheInterceptor
- 目标：避免鉴权/个性化 GET 响应被错误缓存
- 动机：降低跨用户数据污染与过期数据风险
- 涉及文件：`src/app.module.ts`
- 验收标准：App 层不再全局启用 `CacheInterceptor`
- 估时：0.5 天
- 风险：首页等公共 GET 性能暂时下降
- 依赖：无
- Owner：TBD
- 状态：Backlog

### 2. 仅公共只读 GET 使用缓存
- 目标：对商品列表/分类等公共资源启用精细缓存
- 动机：在安全前提下提升读性能与命中率
- 涉及文件：各公共 GET 控制器（如 `src/products/products.controller.ts`）
- 验收标准：为公共路由配置 `CacheKey`/`CacheTTL` 或自定义策略，鉴权路由不缓存
- 估时：1 天
- 风险：TTL 过长导致数据不新鲜
- 依赖：Issue 1
- Owner：TBD
- 状态：Backlog

### 3. 鉴权响应使用用户隔离缓存键或禁用缓存
- 目标：确保用户私有数据不被共享缓存污染
- 动机：合规与数据隔离
- 涉及文件：鉴权相关控制器（如 `src/orders/orders.controller.ts`, `src/users/users.controller.ts`）
- 验收标准：鉴权路由禁用缓存，或缓存键包含用户标识（如 `sub`）
- 估时：0.5 天
- 风险：键设计不当导致命中率低
- 依赖：Issue 2
- Owner：TBD
- 状态：Backlog

### 4. 订单创建纳入数据库事务
- 目标：订单与库存扣减原子化，失败回滚
- 动机：防止部分成功导致数据不一致
- 涉及文件：`src/orders/orders.service.ts`
- 验收标准：使用 TypeORM `QueryRunner`/事务包裹创建与扣减；错误回滚验证通过
- 估时：1 天
- 风险：事务增加锁持有时间
- 依赖：无
- Owner：TBD
- 状态：Backlog

### 5. 热门商品库存扣减使用条件更新
- 目标：防止超卖（原子条件更新）
- 动机：并发高峰下保证库存不为负
- 涉及文件：`src/orders/orders.service.ts`
- 验收标准：`UPDATE ... SET stock=stock-? WHERE id=? AND stock>=?`，以受影响行数判定成功；并发测试无超卖
- 估时：1 天
- 风险：某些数据库版本优化不佳
- 依赖：Issue 4
- Owner：TBD
- 状态：Backlog

### 6. Product 增加 VersionColumn 乐观锁
- 目标：通过版本冲突避免写覆盖
- 动机：提升数据一致性与并发写安全
- 涉及文件：`src/products/entities/product.entity.ts`, 相关更新逻辑
- 验收标准：新增 `@VersionColumn()` 并在写路径处理冲突重试或失败
- 估时：0.5 天
- 风险：冲突率高时影响吞吐
- 依赖：Issue 4/5
- Owner：TBD
- 状态：Backlog

### 7. 订单创建幂等等（Idempotency-Key）
- 目标：防重复提交导致重复订单
- 动机：网络重试/前端多次点击保护
- 涉及文件：`src/orders/orders.controller.ts`/`orders.service.ts`
- 验收标准：基于请求头或参数的幂等键在 TTL 内只创建一次
- 估时：1 天
- 风险：键碰撞与存储开销（Redis）
- 依赖：Issue 2（缓存/Redis）
- Owner：TBD
- 状态：Backlog

---

## M2 限流与防刷（P0）

### 8. 路由分组下调限流参数
- 目标：根据路由组（公开/API/Auth）设置保守阈值
- 动机：在攻击或峰值下保护服务
- 涉及文件：`src/config/performance.config.ts`, `src/app.module.ts`
- 验收标准：不同路由组限流可配置并生效，校验通过
- 估时：0.5 天
- 风险：过低影响体验
- 依赖：无
- Owner：TBD
- 状态：Backlog

### 9. 登录/注册失败验证码
- 目标：抑制撞库与暴力破解
- 动机：保护账户安全
- 涉及文件：`src/auth/auth.controller.ts`（或网关层）
- 验收标准：失败阈值触发验证码校验流程
- 估时：1 天
- 风险：集成复杂度提升
- 依赖：Issue 8
- Owner：TBD
- 状态：Backlog

### 10. 按 IP 与按用户双维度限流
- 目标：更精细的防刷策略
- 动机：兼顾匿名与已登录用户场景
- 涉及文件：`src/app.module.ts`（自定义 Guard/Decorator）
- 验收标准：双维度限流统计与拦截验证通过
- 估时：1 天
- 风险：实现复杂、需监控支撑
- 依赖：Issue 8
- Owner：TBD
- 状态：Backlog

---

## M3 观测与告警（P1）

### 11. requestId/traceId 注入与日志串联
- 目标：端到端定位问题
- 动机：缩短故障排查时间
- 涉及文件：`src/common/logger/winston.config.ts`, 中间件
- 验收标准：每请求日志包含 `requestId/traceId`，跨服务可串联
- 估时：0.5 天
- 风险：字段遗漏影响可观测性
- 依赖：无
- Owner：TBD
- 状态：Backlog

### 12. Prometheus/OpenTelemetry 指标暴露
- 目标：QPS、错误率、P95/P99、队列深度监控
- 动机：容量规划与故障预警
- 涉及文件：监控模块或中间件
- 验收标准：指标端点/导出可被采集，阈值告警配置完成
- 估时：1.5 天
- 风险：性能开销与采集稳定性
- 依赖：Issue 11
- Owner：TBD
- 状态：Backlog

### 13. Redis 降级结构化告警
- 目标：生产降级不可忽视
- 动机：避免分布式缓存不一致
- 涉及文件：`src/cache/cache.module.ts`
- 验收标准：Redis 连接失败触发结构化告警并标记降级状态
- 估时：0.5 天
- 风险：噪声告警
- 依赖：无
- Owner：TBD
- 状态：Backlog

---

## M4 测试与压测（P1）

### 14. 并发扣减库存 e2e 测试
- 目标：验证无超卖与事务正确性
- 动机：保障核心交易路径
- 涉及文件：`test/app.e2e-spec.ts` 或新增 e2e
- 验收标准：并发场景通过，错误回滚验证
- 估时：1 天
- 风险：测试环境数据准备复杂
- 依赖：Issue 4/5/6
- Owner：TBD
- 状态：Backlog

### 15. 缓存键策略与失效路径测试
- 目标：验证缓存命中与失效的正确性
- 动机：避免脏读与不一致
- 涉及文件：服务层/控制器集成测试
- 验收标准：命中率符合预期，变更触发缓存失效
- 估时：0.5 天
- 风险：测试脆弱
- 依赖：Issue 2/3
- Owner：TBD
- 状态：Backlog

### 16. 1.5k 并发压测脚本与报告
- 目标：验证性能目标与瓶颈
- 动机：上线前容量评估
- 涉及文件：`tests/perf/load-test.spec.js`, `perf.config.js`
- 验收标准：报告包含 P95/P99、错误率、资源使用与建议
- 估时：1 天
- 风险：环境与数据差异影响结论
- 依赖：Issue 11/12
- Owner：TBD
- 状态：Backlog

---

## M5 安全与配置（P2）

### 17. DTO `class-validator` 全覆盖
- 目标：输入校验覆盖所有 DTO
- 动机：减少无效/恶意输入
- 涉及文件：各 DTO 文件
- 验收标准：关键字段具备类型与范围校验，单测通过
- 估时：1 天
- 风险：请求失败率短期上升
- 依赖：无
- Owner：TBD
- 状态：Backlog

### 18. 生产禁用默认敏感配置
- 目标：强制提供 JWT/DB/Redis 等敏感配置
- 动机：避免误用默认值
- 涉及文件：`src/config/configuration.ts`
- 验收标准：生产环境无默认值路径，Joi 校验强约束
- 估时：0.5 天
- 风险：部署初期失败率上升
- 依赖：无
- Owner：TBD
- 状态：Backlog

### 19. CORS 域名白名单与安全头
- 目标：收紧跨域与提升安全头配置
- 动机：防止 CSRF/XSS 相关风险
- 涉及文件：`src/main.ts`, CORS 配置
- 验收标准：仅可信域可访问，安全头覆盖完善
- 估时：0.5 天
- 风险：第三方集成受影响
- 依赖：无
- Owner：TBD
- 状态：Backlog

---

## M6 健康与日志（P2）

### 20. 健康检查去敏与读写分离检测
- 目标：健康端点不暴露敏感，增加 DB 读写检查
- 动机：兼顾安全与完整性
- 涉及文件：`src/health/health.controller.ts`
- 验收标准：生产返回去敏信息；读写节点检查通过
- 估时：0.5 天
- 风险：检查耗时增加
- 依赖：无
- Owner：TBD
- 状态：Backlog

### 21. HTTP 访问日志中间件
- 目标：记录请求方法、路径、状态码、耗时、requestId
- 动机：排障与审计
- 涉及文件：日志中间件与 `winston` 配置
- 验收标准：访问日志规范输出并按日滚动
- 估时：0.5 天
- 风险：日志量增加
- 依赖：Issue 11
- Owner：TBD
- 状态：Backlog

### 22. 日志滚动与 PII 脱敏
- 目标：统一滚动策略并脱敏敏感信息
- 动机：合规与存储控制
- 涉及文件：`src/common/logger/winston.config.ts`
- 验收标准：错误/综合日志滚动配置一致，敏感字段脱敏
- 估时：0.5 天
- 风险：脱敏规则遗漏
- 依赖：Issue 21
- Owner：TBD
- 状态：Backlog

---

## 备注
- 可用状态枚举：Backlog / In Progress / Done / Blocked
- 建议在创建 Issue 时补充：里程碑、标签（安全/性能/架构/测试）、Sprint、子任务划分