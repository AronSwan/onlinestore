# 支付域陈旧问题最优实践调研（2026-10-10）

三席带网研调研员（渠道对接与验签 / 幂等并发事件可靠性 / 退款权限与错误契约），全部论断带出处原文锚定（正文标注"原文锚定"=抓到整页逐字引用；"摘要锚定"=搜索摘要中的原文片段）。访问日期均为 2026-10-10。本文件为决策用浓缩版；三席全卷在 git 历史与本文件出处清单。

## 结论总表（每题：成熟方案 / 先进方案 / 本仓裁决）

### 1. 退款权限：谁有权点退款
- 成熟（Stripe）：退款纯商户侧动作，买家不可发起（官方客服页明文）。
- 先进（Shopify）：买家 request → 商家 approve 两级；returnCreate 保留"外部已审批"一级捷径。Amazon 自动退款=商家预授权规则引擎，非买家权限。
- **本仓裁决：admin-only 直退**。买家自助无审批直退三家主流平台零先例。一人店两级审批="自己批自己"，零制衡收益；买家诉求走人工渠道。执行状态机照 Stripe 留全（pending/succeeded/failed+failure_reason）——缺它=失败退款被当成功。

### 2. 支付数据可见性
- 成熟（Stripe）：资源属主模型+商户内角色分级（View Only/Refund Analyst/Administrator）。
- OWASP API1:2023 BOLA：本仓三查询端点即教科书式 BOLA（认证≠授权）。
- **本仓裁决：buyer 强制 `WHERE userId=JWT sub`，admin cross-scope**（现有 owner-or-admin guard 范式直接套）。不建新角色。

### 3. RBAC 选型
- 现行 NestJS 官方=@nestjs/authorization policy 制；casbin 国内生态成熟但学习/缓存成本真实。
- **本仓裁决：全不引**。两角色+个位数规则撑不起策略引擎；现有 guard 十几行覆盖。角色超两种再迁。

### 4. 并发双退（P0-1）
- 关键事实：**TypeORM 对 sqlite 不支持悲观锁**（官方锁支持表空白格→LockNotSupportedOnGivenDriverError）；TiDB 悲观事务默认开、SELECT FOR UPDATE 可用。@VersionColumn 乐观锁是两阶段通吃的唯一数据库级防线。
- 同侪教训：Medusa issue #16681 实证"失败删退款行+重试换幂等键"=双退事故模式（"a double refund is money out the door"），其修复方向=退款行与幂等键同生命周期。
- **本仓裁决：三件套——幂等键唯一索引（DB 裁决并发首建）+ @VersionColumn 乐观锁（治盲写覆盖与双退竞态）+ runExclusiveWrite 保留为进程内优化层而非唯一防线**（重启失忆、迁多连接即失效，调研明确"维持其为唯一防线"列入不推荐）。

### 5. 幂等标准
- Stripe 语义=事实标准（IETF draft 已 Expired，无 RFC）：首次存响应、重放返同响应、同键异参 422。
- **本仓裁决：简化子集——唯一约束挡首写+重复请求读已存记录返回**；同键异参报 409。不做响应快照表（小仓成本函数）。

### 6. 事件丢失（"落库后 emit"窗口+监听器异常被吞）
- 成熟：transactional outbox（microservices.io 原文：与业务同事务写 outbox 表+独立进程发布，至少一次+消费者幂等）；polling publisher 是 CDC/Debezium 的轻量等价（Debezium 官方博客自认小规模不合适）。
- @nestjs/event-emitter suppressErrors **默认 true**（源码 JSDoc 逐字），异常只进日志不进 filter——B2 席审计发现与源码互证。
- **本仓裁决：自建单表 outbox+@Cron 轮询发布**（同库同事务在 sqlite 阶段天然成立，迁 TiDB 照搬）；不引 Kafka/第三库（无 broker 需求）。立即项：关键监听器 `@OnEvent(...,{suppressErrors:false})`。

### 7. 退款明细建模
- 成熟（Stripe/Shopify 双印证）：独立 Refund 对象挂支付下、多笔部分退款并列、总额≤原单。
- 硬事实：跨行"累计≤实付"在 sqlite（CHECK 禁子查询）与 TiDB（无触发器+CHECK 默认关）**均无法声明式表达**→守卫必须应用层+锁咬合。
- **本仓裁决：独立 refunds 表淘汰 metadata JSON 列**；可选 refunded_total 冗余列（Stripe amount_refunded 模型）使守卫单行可判。

### 8. 渠道对接
- **支付宝**：官方 alipay-sdk（npm 4.14.0，Node≥18，维护中）；checkNotifySignV2/raw body；ACK=状态落库后返回纯文本 `success`；官方重试 25h×8 次（4m/10m/10m/1h/2h/6h/15h）→必须有主动查单兜底。
- **微信**：官方无 Node SDK（仅 Java/PHP/Go）。社区 wechatpay-node-v3 单人停更风险；wechatpay-axios-plugin 相对稳。**裁决：自实现 v3 验签+解密核心**（RSA-SHA256 平台证书验签串三行含\n、AES-256-GCM 解密、时间戳容差 300s、平台证书<12h 轮换、5 秒内应答 200+{"code":"SUCCESS"}），以 wechatpay-axios-plugin 为参考实现。
- **聚合路线：不成立**。Stripe 不面向大陆主体（官方声明）；Adyen 无大陆牌照借道易宝；国内聚合（收钱吧）需企业资质+商务签约且回调仍要验签（省渠道差异不省验签工程）；BeeCloud 沉寂=单点风险前车之鉴。
- **credit-card 假 stub：删**（单币种 CNY 本地部署无外卡渠道）。
- **crypto 手动流自造 HMAC 最低合格线**（Stripe/Standard Webhooks 底线五条）：签完整 raw body 或全部业务字段/时间戳进签+≤5min 容差/唯一 id 或 nonce 进签+落库去重/常数时间比较/密钥轮换双活。现方案五条全不满足。

### 9. 错误契约（状态码表）
- Stripe 惯例：403=角色权限不足；**404 合并"不存在"与"不归你"（resource_missing 防枚举）**；400=参数校验；409=状态冲突；**网关退款失败≠HTTP 错误**（退款记录 status=failed+failure_reason）。
- RFC 9457 对具体状态码无 normative 规定（只管错误体形状）——本仓已采 problem+json，状态码按下表执行。
- **本仓裁决表**：401 JWT 无效｜403 buyer 打 admin 端点｜404 不存在或非本人（合并）｜400 参数/精度校验｜409 状态冲突/幂等键异参｜退款网关失败→记录状态非 HTTP 5xx｜未预期 500。全局 filter+业务异常类清零裸 Error→500。

## 明确不推荐清单（三席合并）
买家自助直退（零先例）/casbin、CASL、@nestjs/authorization 现阶段/Stripe、Adyen、国内聚合路线/维持 runExclusiveWrite 为唯一防线/sqlite 触发器与 CHECK 做累计守卫（TiDB 路径必死）/Debezium、Kafka、BullMQ 中间件/Medusa"失败删退款行"模式（实证双退）/第三方 outbox 库现阶段/wechatpay-node-v3 长期依赖/Saleor 式外置支付 App（过度工程）/RFC 9457 注册表全家桶。

## 出处（主要）
- Stripe: docs.stripe.com/api/idempotent_requests、/api/errors、/error-codes、/refunds、/api/refunds/object、/webhooks（签名规范全文）、/get-started/account/teams/roles
- IETF: datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header（Expired）
- RFC 9457: rfc-editor.org/rfc/rfc9457.html（全文）
- TypeORM: typeorm.io/docs/entity/entities（@VersionColumn）、/docs/query-builder/select-query-builder（锁支持表：sqlite 悲观锁空白）
- TiDB: docs.pingcap.com/tidb/stable/pessimistic-transaction、/constraints（CHECK 默认关 v7.2.0+）、/mysql-compatibility
- SQLite: sqlite.org/lang_createtable.html（CHECK 禁子查询）
- outbox: microservices.io/patterns/data/transactional-outbox.html（全文）
- @nestjs/event-emitter: github.com/nestjs/event-emitter（on-event-options.interface.ts 源码 suppressErrors 默认 true）
- NestJS 授权现状: github.com/nestjs/docs.nestjs.com/blob/master/content/security/authorization.md（policy 制）
- 支付宝: npm alipay-sdk 4.14.0、github.com/alipay/alipay-sdk-nodejs-all、opendocs.alipay.com（签名规范/异步通知 25h×8 次/success 应答，部分经搜索缓存）
- 微信支付: pay.weixin.qq.com（v3 签名验证/AES-256-GCM/平台证书轮换<12h/300s 容差/5 秒应答）
- 聚合: stripe.com/zh-my/lp/china-cross-border（不面向大陆声明）、doc.shouqianba.com、pingxx.com
- Medusa: docs.medusajs.com（payment-provider/getWebhookActionAndData/event 模块）、github.com/medusajs/medusa/issues/16681（双退反例全文）
- Saleor: docs.saleor.io（payment-apps/task-queue/transactions）
- Shopify: shopify.dev/docs/api/admin-rest/latest/resources/refund、/admin-graphql/latest/objects/Return（状态机原句）
- OWASP: api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization（BOLA）
- Standard Webhooks: github.com/standard-webhooks/standard-webhooks（规范全文）

## 查证限制（调研员诚信披露摘）
支付宝/微信部分页面为 JS 渲染经搜索缓存引用（逐处标注）；两个微信社区库发布时间为 tarball 时间戳推断；event-driven.io 正文抓取失败降级摘要；outbox 三个 NestJS 库活跃度未深查；个人/小微商户（无营业执照）开通渠道可行性未调研。
