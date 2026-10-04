# Safety

> 本页列出本仓库**在代码里强制执行**的每条安全规则及其确切落点（模块与路径），
> 以及它靠什么测试或脚本锁住。写法参照 anthropics/commerce-agents 的 safety.md：
> 规则只有落到"哪个文件强制"才算数——注释写了、参数加了但没接线的，不算。
> 路径均相对仓库根；`backend/` 省略前缀时指 `backend/src/`。

## 代码强制的规则

| 规则 | 强制落点 | 锁 |
|---|---|---|
| **登录才能动数据。** users/cart/notifications/logging/monitoring/alerts 为类级 `JwtAuthGuard`；orders/search 为方法级；cache 的写路由方法级（**cache 的 GET stats/health 保持匿名**——只读健康数据）。 | `auth/guards/jwt-auth.guard.ts`；各控制器 `@UseGuards` | `common/guards/authorization-wiring.spec.ts`（覆盖 users/orders 全路由/cart 类级/cache 写路由/通知/搜索/logging/monitoring/alerts；一审实验证伪过旧表述后已扩） |
| **本人或管理员。** 购物车按 `:customerUserId`、用户资料按 `:id`、订单列表按 `:userId` 做归属比对（fail-closed 字符串严格比较，缺参 403）；订单详情按 `order.userId`、通知单条按 `notification.userId`、通知列表按 query 的 `userId` 在 handler 内比对。 | `cart/interfaces/cart-owner.guard.ts`、`common/guards/owner-or-admin.guard.ts`（`@OwnerParam` 声明参数名，缺声明显式拒绝）；orders/notification 控制器 handler | 接线锁（部分）+ `owner-or-admin.guard.spec.ts`（9 用例）+ **`notification-behavior.spec.ts`（行为锁：删比对逻辑即红）** + 冒烟三态矩阵 |
| **角色以数据库为准。** JWT 载荷里的 `role` 不被信任，`validate()` 回读用户表的 `role`；令牌签名密钥丢失不等于拿到管理员。 | `auth/strategies/jwt.strategy.ts` | `jwt.strategy.spec.ts`；伪造 admin 令牌实测 403（台账 2026-10-03） |
| **刷新令牌不能当访问令牌。** refresh 签发时打 `typ:'refresh'` 标，策略层见到即拒。 | `auth/auth.service.ts`（签发）、`auth/strategies/jwt.strategy.ts`（拒绝） | `auth.service.spec.ts`；实测 401 |
| **金额、单价、快照、归属全由服务端决定。** 下单时 `userId` 一律取令牌主体，`unitPrice/totalAmount` 按商品现价×数量服务端重算，商品快照服务端落库；请求体里的金额字段被忽略。 | `orders/orders.controller.ts` `create`（归属绑定）、`orders/orders.service.ts` `create`（定价循环）、`orders/dto/order.dto.ts`（DTO：数量 `@IsInt @Min(1)`、items `@ArrayMinSize(1)`） | `orders.service.spec.ts`（55 用例）；实测：篡价 0.01→落库 100、劫持 userId→归属令牌主体 |
| **收不了钱也改不了价。** 支付模块不接线；回调无 `x-signature` 头直接 400，验签失败拒绝；网关密钥缺失 fail-closed 拒签，不拼 `&secret=undefined`。 | `payment/payment.controller.ts`、`payment/gateways/crypto-gateway.service.ts`、`gopay-gateway.service.ts` | `payment/gateways/payment-gateways.spec.ts`（5 用例）；不接线由 `app.module.ts` 结构保证（PaymentModule 无 import；**孤儿模块 aggregation/performance/circuit-breaker/security-monitoring 同样未接线且无守卫——接线前必须先挂 Guard**） |
| **密码只存一次哈希、不出现在任何响应里。** `users.service` 的 create/update 各自哈希一次（rounds 12，调用方传明文）；订单 findById/findByUserId/findAll 三处全部剥离 `user.password`（一审发现 findAll 漏剥已补）。 | `users/users.service.ts`、`orders/orders.service.ts` 三方法 | `auth.service.spec.ts`；实测 admin 列表/详情响应零 password |
| **暴破会被闸。** 全局 `ThrottlerModule`（300/分/IP）+ 登录 5/分、注册 3/分、验证码 3/分。 | `app.module.ts`（全局 Guard）、`auth/auth.controller.ts`、`auth/verify-code/verify-code.controller.ts` 的 `@Throttle` | 实测登录第 6 发 429（台账多轮复验） |
| **报错不泄内构。** 非 HttpException 一律固定文案"服务器内部错误"，堆栈只留服务端日志；领域"不存在"异常统一 404、"已存在"统一 409。 | `common/filters/global-exception.filter.ts`（全 app 兜底固定文案+404/409 转译；一审修正主落点）、`logging/filters/logging-exception.filter.ts`（仅 logging 面） | `logging-exception.filter.spec.ts`；实测匿名 500 响应 230 字节零堆栈 |
| **密钥不能是公开已知值。** 生产启动时 `JWT_SECRET`/`ENCRYPTION_KEY` 对照已知不安全值黑名单（含 `0123…cdef` 与 `CHANGE_ME` 前缀），命中即拒绝启动。**两钥回退不同**：ENCRYPTION_KEY 开发回退为每次随机生成；JWT_SECRET 开发回退仍是已知固定值（`dev-jwt-secret-key-…`，仅生产拒启——开发环境共钥风险已知并接受）。 | `main.ts`（JWT 黑名单）、`config/unified-master.config.ts`（ENCRYPTION 黑名单+随机回退） | 实测：公开密钥值生产拒启（两类文案均复现） |
| **跨源不反射。** CORS 全环境显式白名单（默认 localhost:3000/5173），不再 `origin:true`。 | `main.ts` `enableCors` | 实测：恶意 Origin 零 ACAO 反射、白名单放行 |
| **管理面写操作仅管理员。** 用户建号/删除/禁用、告警规则增删、缓存重置/清空、搜索引擎切换、通知群发、热门词注入——全部 `@Roles(Role.ADMIN)` + `RolesGuard`。 | users/alerts/cache/search/notification 控制器方法级装饰器 | 接线锁（一审已扩至 test/bulk/switch/reinitialize/flush/reset）；实测普通用户 403×N |
| **身份不在参数里。** 归属一律取 `req.user.sub`（JWT 主体），任何请求体或路径声明的 userId 都会被覆盖或比对拒绝。 | orders controller `create`（覆盖）、三个守卫/handler（比对） | 见"本人或管理员"行 |
| **前端渲染转义。** 订单/购物车/资料模板插值经 `escapeHtml`（`& < > " '` 五字符）。**注意**：纯转义不含 URL 协议限制（`javascript:` 之类经由图片 src 注入的面未覆盖——风险依赖后端数据可信，挂账 BACKLOG）。 | `js/utils/escape-html.js`、`js/orders.js`/`js/cart.js`/`js/profile-manager.js` | 无自动锁（HTML 页序人工保证：工具脚本在消费方之前）；注入 payload 实测纯文本 |
| **登录页不执行注入。** 通知组件 DOM API + `textContent`；OAuth provider 走白名单映射，未知值固定文案；state 校验三条件显式拒绝（双方皆空不放行）。 | `js/login-utils.js`、`js/oauth-handler.js` | payload 实测纯文本（台账 2026-10-02） |
| **接口不收白名单外的字段。** 全局 `ValidationPipe(forbidNonWhitelisted)`；users/orders/notifications/verify-code 的 DTO 带完整 class-validator 装饰器（密码复杂度、枚举、长度、`@IsInt`）。 | `main.ts`（全局管道）+ 各 `dto/*.ts`（orders 的 PATCH 已接线 UpdateOrderData——一审补） | 实测：PUT 夹带 `role` 400、非法 `sendType` 400、超长 title 400。**例外**：通知 test/bulk 的内联 body 类型无 DTO（admin-only 缓解，挂账） |
| **依赖树可复现。** `npm ci` 必须可用；锁文件与 package.json 不允许脱节。 | `package-lock.json`（批 1 升级后重锁） | `npm ci --dry-run` exit 0（台账口径） |
| **Casdoor 角色不直落库。** IdP 返回的角色一律映射为普通用户；admin 永远不经第三方登录产生。 | `auth/auth-proxy.service.ts` `ensureUserExists` | 代码级（外部 IdP 未接通，无法运行时验证） |

| **非法路由参数直接 400。** 订单/通知 `:id` 走 `ParseIntPipe`；不存在资源 404。 | `orders/orders.controller.ts`、`notification/notification.controller.ts` | `notification-behavior.spec.ts`（404 分支）；实测 |
| **禁用用户令牌即刻失效。** `validate()` 回读 `isActive`，禁用即 401。 | `auth/strategies/jwt.strategy.ts` | `jwt.strategy.spec.ts` |
| **JWT 载荷最小形状校验。** exp 强制未来时、sub/email/role 形状不符即 401。 | `auth/strategies/jwt.strategy.ts`（`isValidPayload`） | 同上 |
| **库存乐观锁防超卖。** 订单项库存按 `version` 条件更新，竞态命中 0 行即回滚。 | `orders/orders.service.ts` create（updateResult.affected 检查） | `orders.service.spec.ts`（并发用例） |
| **安全响应头。** helmet 全局挂载（生产 CSP 开启）。 | `main.ts` | 构建产物检查 |
| **登录失败计数第二轨。** Redis 就绪时按邮箱计数，5 次/10 分钟触发验证码门槛。 | `auth/auth.service.ts` login（Redis 就绪守卫） | `auth.service.spec.ts`（失败计数用例） |
| **上传只收真图片且名字由服务端起。** 商品图上传按 magic bytes 裁决（jpeg=FF D8 FF / png=89 50 4E 47 / webp=RIFF....WEBP，不信 mimetype 不信扩展名）+扩展名白名单 .jpg/.jpeg/.png/.webp+5MB 双闸（Multer limits+handler 复查）；文件名服务端时间戳+随机生成，绝不使用客户端文件名，落盘经 path.resolve 锁定在仓库根 `images/products/`（防路径穿越；`.env UPLOAD_DEST` 是无关残留不使用）。路由 admin-only。 | `products/products.controller.ts` `uploadImage`（FileInterceptor+detectImageExt） | `products/products-upload.spec.ts`（伪装/超限/无文件/落盘目录用例）+ 接线锁 |

## 靠流程/文档约束的（非代码强制）

- **归档件不回引**：历史归档已从工作树移除（git 历史可考）；如从历史复活任何归档件，须先过本页对应规则的接线锁。
- **演示边界**：README 顶部横幅声明"演示项目勿原样部署"；支付未接线、监控未部署、e2e 套件弃管（清单见 `docs/BACKLOG.md`）。
- **台账纪律**：每次改动记 `docs/remediation-ledger.md`；勘误用追加行不改写。

## 一个部署上线前必须先做的事

对照 `docs/BACKLOG.md` 清完全部**开放安全项**区块，轮换全部密钥（JWT/ENCRYPTION/DB/Redis），
给 MySQL 生产库补 `synchronize:false` + 迁移对齐，再重读本页。
