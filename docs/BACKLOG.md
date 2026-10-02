# onlinestore 整改 BACKLOG

> 目标位置：仓库 `docs/BACKLOG.md`（本文为交付稿，执行时提交至该路径）。

## 0. 说明

- **来源**：2026-10-02 七轮审计整改（三官方案 → 仲裁 → 三席审计 v1.0 → 两席复审 v1.1 → v1.2 → 三轮两席复核 → v1.3 存档）。
- **范围**：精简执行版已覆盖 **Day 0-3**（基底合流 + 安全合围最小集 + 交付收口，均已落地提交）；本清单收录 v1.3 中**未被 Day 0-3 采纳的其余全部工作项**，是这些工作的唯一执行依据。
- **自足性**：每条含"一句话问题 + 符号锚 + 修法 + 验证 + 量级"。锚点一律用函数/文件/配置键等符号坐标，不依赖裸行号；个别条目附"参照 v1.3 存档"仅作历史注，**任何条目开工前无需回溯其他文档**。
- **量级**：S ≤ 半天；M ≤ 2 天；L > 2 天。
- **优先级**：P1 安全收尾 → P2 功能与卫生 → P3 地基与运维；组内按价值排序（安全性影响面 × 用户可感知度）。
- **通用纪律**：每批过 G1（tsc 双配置零错）/ G2（单测基线只升不降）/ G7（分项提交、信息与 diff 对账）；守卫类改动引发的 spec 适配须在提交信息单列"守卫适配"清单，不占 G2 豁免。

---

## P1 安全收尾（8 项）

### 攻防审计残留（2026-10-03 无情审计发现，本轮已修主体、余项挂账）· 【S/M】
- **订单创建防篡改（V13 余项）**：归属已绑 req.user.sub；余 totalAmount/items[].unitPrice 仍客户端可控——服务端须按商品现价重算；order_items.productSnapshot 非空列导致创建 500（功能 bug，修好当天必须同时落价格重算防"替他人下单+改价"复活）。锚：orders.controller create + orders.service create
- **Casdoor 角色白名单**：auth-proxy ensureUserExists 直落 IdP 角色，接通即提权入口——须显式映射白名单（IdP 角色≠本地 admin）
- **影子控制器**：users/interfaces/web/controllers/user.controller.ts 与 cqrs/examples 的 @Controller('users') 是未接线死代码但内含无归属校验的 PATCH/:id 与改密——接线前必须先加固或删除
- **监控面 ApiKey 方案**：本轮监控 GET 已 admin-only；如需给 Prometheus 抓取器用，改 ApiKeyGuard（X-API-Key）而非放开 JWT
- **POST /api/users DTO 补装饰器时同步评估**：当前因 CreateUserDto 无装饰器而"砖"（安全上 fail-closed）；补齐时保持 admin-only（已挂）并审视 role 字段是否应收紧
### S6-full · 六横切面控制器全量守卫与 admin 分级 【M】
- **问题**：六横切面控制器读路由仍匿名可达；Day 2 精简版已给管理写面挂 Guard（alert 5/notification test+bulk/cache 2/search 管理面 3），但 **POST /api/notifications（根创建）、POST /api/search/history、POST /api/search/popular、POST /api/products/:id/view、logging.controller 的 11 个匿名 ingest POST（含 flush 落盘）** 仍无守卫（验收审计补记）。
- **锚**：`backend/src` 内零 `@UseGuards` 的控制器（audit_head 实测 19 件、约百级路由装饰器，覆盖审计所指六横切面）：`monitoring/monitoring.controller.ts`、`monitoring/alert.controller.ts`、`address/address.controller.ts`、`common/monitoring/security-monitoring.controller.ts`、`common/circuit-breaker/circuit-breaker.controller.ts`、`bff/bff.controller.ts`、`notification/notification.controller.ts`、`cache/cache.controller.ts`、`aggregation/aggregation.controller.ts`、`performance/performance.controller.ts` 等；现成可复用件 `auth/guards/jwt-auth.guard.ts`（JwtAuthGuard）、`auth/guards/roles.guard.ts` / `auth/guards/enhanced-rbac.guard.ts`（角色分级）。
- **修法**：全量路由挂 JwtAuthGuard；管理/监控/熔断类再叠加 RolesGuard/EnhancedRbacGuard 做 admin 分级（角色判定来自用户实体的 role 字段）；health 类端点如需匿名，用显式 @Public 白名单。存量 spec 适配按上列"守卫适配"纪律单列清单。
- **验证**：匿名 curl 打任一原裸奔路由得 401；普通用户打 admin 路由得 403；G2 单测基线不降。

### S8 · Casdoor OAuth state 改 HMAC 签名 【S】
- **问题**：Casdoor 登录的 state 用 `Math.random()` 生成且回调完全不校验，state 保护形同虚设，可构造回调伪造。
- **锚**：`backend/src/auth/auth-proxy.service.ts` 的 `getCasdoorLoginUrl()`（state 生成与 authorize URL 拼接处）和 `handleCasdoorCallback(code, state)`（未做任何 state 校验）；前端 `js/casdoor-config.js` 已有 `casdoor_auth_state` 的 sessionStorage 存取逻辑可复用。
- **修法**：state 改为 `HMAC-SHA256(服务端密钥, nonce+时间戳)` 签名串；回调时验签 + 时效窗（如 10 分钟）+ 一次性消费（已用 state 拒绝），任一失败返回 401。
- **验证**：篡改/过期/重放的 state 回调均被拒，正常 Casdoor 链路（G4 浏览器注册→登录）不回归。

### S9 · password select:false + 全局序列化器 【S】
- **问题**：用户密码哈希可随实体查询漏进响应与日志；前端还残留明文密码 console.log。
- **锚**：`backend/src/users/infrastructure/persistence/typeorm/user.entity.ts` 的 password `@Column`（无 `select:false`；对照 `backend/src/users/entities/user.entity.ts` 已有 `@Exclude` 的双轨差异）；全局 `ClassSerializerInterceptor` 未注册（`backend/src/main.ts` 的 `bootstrap()` 只挂了 Logging/Metrics/FileUpload 拦截器）；`js/auth.js` 的 `console.log("loginPassword:"/"registerPassword:"/"registerConfirmPassword:")` 三处。
- **修法**：infrastructure 实体 password 列加 `select:false`（登录校验处显式 addSelect），main.ts 注册全局 ClassSerializerInterceptor，删除前端三处明文密码日志。
- **验证**：任一用户类接口响应与日志中 grep 不到密码（哈希/明文皆无）；登录注册链路不回归。

### D9-full · 支付验签工程化 【M】
- **问题**：Day 2 精简版已做 gateway fail-closed 与验签强制，但验签逻辑仍散落在业务路径里，无常量时间比较、无独立模块、无负向用例，易被后续改动悄悄退化。
- **锚**：`backend/src/payment/payment.controller.ts` 的 `@Post('callback/:method')` → `handleCallback`；`backend/src/payment/payment.service.ts` 的 `handlePaymentCallback()`；`backend/src/payment/gateways/crypto-gateway.service.ts` 构造器（`apiSecret = configService.get('CRYPTO_API_SECRET') || undefined`）与签名拼接处（`...join('&') + '&secret=${apiSecret}'`，undefined 时拼出 `&secret=undefined` 可离线伪造）。
- **修法**：抽独立 PaymentSignatureVerifier：按支付方式注册验签器，统一走 `crypto.timingSafeEqual` 常量时间比较，密钥缺失在启动期即拒绝注册该网关；回调先验签后入业务；补伪造/重放/缺密钥三类负向单测。
- **验证**：G5 攻击矩阵支付拒 payload 全拒；移除 CRYPTO_API_SECRET 后应用拒绝启动而非静默降级。

### S11 · log-analytics 参数白名单与参数化 【M】
- **问题**：日志分析查询把外部传入的 filters 直接字符串拼进 SQL，构成注入面。
- **锚**：`backend/src/logging/log-analytics.service.ts` 的 `buildStatsQuery()`（`AND level = '${filters.level}'` 式拼接）及同文件其余 `build*Query` 私有方法。
- **修法**：filters 只接受白名单字段（level/userId/时间窗等），字段值走查询参数绑定而非插值；越界字段静默丢弃并记审计。
- **验证**：filters 携带 `' OR 1=1 --` 类 payload 时返回空结果或 400，且无 SQL 报错日志。

### PR5b（含 S12 收口）· 渲染层 attribute/onclick XSS 白名单层 【M】
- **问题**：Day 2 精简版只做了 text 层转义（escape-html），attribute 与内联 onclick 层注入面仍开——渲染字符串直接拼进 `onclick` 属性，用户数据可逃逸出引号执行任意表达式。
- **锚**：`js/cart.js` 商品行模板的内联 `onclick="cartManager.removeItem('${item.productSkuId}')"` 拼接及同类渲染点（`js/orders.js`、`js/wishlist.js` 的列表渲染）；开工前置 = 安全官先产出注入用例清单的 attribute/onclick 层（两层清单的第二层，text 层已在 Day 2 验收）。
- **修法**：列表渲染改事件委托（容器级 addEventListener + `data-*` 传参，杜绝字符串拼 handler）；确需内联的建立 onclick 函数名白名单（仅登记过的函数 + 经转义校验的参数）；与 K3 的 CSP 配置会签联动。
- **验证**：G5 攻击矩阵 attribute 层 payload（onerror/onload/onclick 注入）全部不执行；购物车/订单/收藏交互不回归。

### S13 · Swagger 收敛 + 日志 query 脱敏 【S】
- **问题**：Swagger 非生产全开放、每次启动把 openapi.json 落盘进仓库；两个日志拦截器记录完整 URL 含 query，token/密码类参数会进日志。
- **锚**：`backend/src/main.ts` 的 `SwaggerModule.setup('api/docs', ...)` 与紧随其后的 `fs.writeFileSync(docs/openapi.json)`（开关条件 `NODE_ENV !== 'production' || ENABLE_SWAGGER === 'true'`）；`backend/src/common/interceptors/logging.interceptor.ts` 与 `backend/src/common/interceptors/request-logging.interceptor.ts` 的 URL 记录处。
- **修法**：Swagger 默认关闭（仅显式 env 开启），删除 openapi.json 落盘逻辑并把它从版本库移除；拦截器落日志前对 query 做键名脱敏（token/password/secret/key/code 类掩码）。
- **验证**：生产模式启动无 /api/docs 响应、无 openapi.json 生成；日志样本中 query 敏感键已掩码。

### S10 · CSRF 摆设删除 【S】
- **问题**：CSRF 只有常量定义和"名字长度校验"，无任何真实防护，属误导性摆设代码。
- **锚**：`backend/src/common/security/security.constants.ts` 的 `CSRF_COOKIE_NAME`（`process.env.CSRF_COOKIE_NAME || 'csrf-token'`）及 `backend/src/common/config/config-validation.service.ts` 中对它的名称长度校验段。
- **修法**：删除占位常量与伪校验（鉴权全线走 Bearer token、无 cookie 会话，本就无 CSRF 面），在 README 安全说明里写明这一判断；不留"看起来有防护"的死代码。
- **验证**：全库 grep `CSRF_COOKIE_NAME` 无引用残留；tsc 双配置零错。

---

## P2 功能与卫生（12 项）

### D5 · OwnerOrAdminGuard 横向越权 + 双前缀修正 【M】
- **问题**：users/orders 资源无属主校验（本人之外资源可读改）；两个控制器路由双前缀（实际路径与前端调用漂移）。
- **锚**：新建 `backend/src/auth/guards/owner-or-admin.guard.ts`（比对 JWT userId 与资源属主，admin 放行；可参照 `roles.guard.ts` 实现风格）；双前缀两处 = `backend/src/users/users.profile.controller.ts` 的 `@Controller('api/users/profile')` 与 `backend/src/address/interfaces/address.controller.ts` 的 `@Controller('api/customer-user')`（与全局前缀叠加后成双前缀）；users/orders 服务层按 id 直查无属主过滤。
- **修法**：OwnerOrAdminGuard 挂到 users/orders/address 的资源路由（`:id` 类）；两处 @Controller 前缀改单段，同步核对前端调用路径。
- **验证**：他人资源 403 / admin 旁路 200 / 本人 200 / 匿名 401（即 G4' 矩阵，见 P3 测试债）。

### PR4 · 购物车三层断裂修复 【M/L】
- **问题**：前端 cart.js、后端 cart 控制器、localStorage 三层契约不一致，登录态购物车加载与游客→登录合并断裂。
- **锚**：`js/cart.js` 的 `loadCart()` / `updateItemQuantity()` / 加购流程（fetch `'/api/cart'`，期望响应 `{cart:[...]}`、字段 productId/productSkuId/productName/productPrice/productQuantity）；`backend/src/cart/interfaces/cart.controller.ts`（`@Controller('cart')`）的 DTO 与响应形状；localStorage 键 `reich_cart`。
- **修法**：先出 **cart 参数化契约**（字段/响应形状/鉴权头/错误码，后端官签字物），前端按契约对齐；实现游客车→登录车合并（服务端 merge 端点，或客户端合并后整体提交）。
- **验证**：登录加购→登出→再登录购物车内容保持；购物车刷新场景（`.github/workflows/e2e-cart-refresh.yml` 同口径）不丢单。

### PR3 · profile 页完整原子包 【M】
- **问题**：Day 1 只修了 init 即崩的最小版（loadUserInfo 死调用）；profile 页仍缺登出入口联动，且多个提交方法打向后端不存在/不匹配的路由。
- **锚**：`js/profile-manager.js` 的方法群（`loadUserData` / `getCurrentUser` / `loadAddresses` / `handleBasicInfoSubmit` / `handlePreferencesSubmit` / `handleAddressSubmit` / `handlePasswordSubmit` / `setDefaultAddress` / `deleteAddress`）与 `profile.html`。
- **修法**：逐方法与后端真实路由对账——存在者对齐契约，不存在者移除或诚实降级提示（F5c 完整版）；补未登录访问 profile 的跳转与登出后的状态清理（与 PR6 联动）。
- **验证**：登录态遍历 profile 各表单提交无 404/500；未登录访问跳 login.html。

### PR8 · Casdoor 单按钮改造 + F13 邮箱验证完整降级 【M】
- **问题**：登录页多协议入口中只有 Casdoor 线可通（死入口 Day 2 已砍），但 Casdoor 按钮未收敛为主入口；邮箱验证线无后端支撑却仍有 UI 残留。
- **锚**：`login.html` 的 `#casdoor-login` 按钮与验证码容器；`js/casdoor-auth-service.js` / `js/casdoor-config.js` / `js/oauth-handler.js`；`js/email-verification.js` / `js/email-verification-client.js` / `js/advanced-email-verifier.js`；`index.html` 原 casdoor 探测与参数拼接死协议块（若 Day 2 砍入口时未删净，此处删净）。
- **修法**：登录页收敛为 Casdoor 单按钮（加载/错误状态诚实展示，前置 = 后端官交付 Casdoor 回调 token 形状确认）；邮箱验证完整降级 = 注册后展示"邮箱验证暂未开通"状态条 + 后端能力开关，移除死表单与假提交。
- **验证**：浏览器走 Casdoor 登录全链路成功；邮箱验证线 UI 与后端能力一致，无假提交入口。

### PR6 · 登出闭环 【S】
- **问题**：登出只清了部分 localStorage 键——sessionStorage 副本、userId 与 casdoor 键族全部残留，且无服务端登出调用。
- **锚**：`js/navigation-icons.js` 的 logout-btn 点击处理（现仅 removeItem localStorage 的 userLoggedIn/userEmail/token/refreshToken）；登录写入处 `js/auth.js`（两存储 × userLoggedIn/userEmail/token/refreshToken/userId）；casdoor 键族 `js/casdoor-config.js`（casdoor_tokens / casdoor_user / casdoor_auth_state）；服务端 `backend/src/auth/auth-proxy.service.ts` 已有 `casdoorLogout()` 可复用。
- **修法**：登出统一清理两存储全部会话键（含 userId 与 casdoor 键族），并调用服务端登出端点（补 REST 出口或复用 casdoorLogout）；token 黑名单不做（挂账区，见文末）。
- **验证**：登出后两存储无任何会话键、刷新页面不恢复登录态、Network 可见服务端登出请求。

### D6-余件 · 七项遗留（v1.3 原⑥⑦已在 Day 1 完成，不在此列）【M】
- **问题**：D6 除 openobserve-env warn 与 redis-health spec（已完成）外，尚余七件后端卫生债。
- **子项**（各带锚/修法/验证）：
  1. **verify-code DTO 正规化**：锚 `backend/src/auth/verify-code/verify-code.controller.ts` 内联的 `class VerifyCodeSendDto`（无 class-validator 装饰器）；修法 = 移独立 DTO + 全局 ValidationPipe 白名单校验；验证 = 畸形 payload 400。
  2. **验证码发送上限**：锚同控制器 `send` 端点（无任何频控）；修法 = 按邮箱/IP 计数上限 + ThrottlerGuard；验证 = 超限得 429。
  3. **logAuditLog 真实化**：锚 `backend/src/monitoring/monitoring.service.ts` 的 `logAuditLog()`（现仅 debug 日志 + 伪造 `audit_${Date.now()}` id 返回 success）与 `getAuditLogs()`；修法 = 落真实审计存储（表或 openobserve 管道），查询同步真实化；验证 = 写入后可查回。
  4. **UnifiedCache 注入收编**：锚 `backend/src/common/cache/cache.service.ts`（旧 CacheService）与 `backend/src/cache/unified-cache.service.ts`（UnifiedCacheService）双轨并存，消费方（`cart/cart.service.ts`、address 树、`cache/enhanced-cache.service.ts`、`cache-strategies/`）接入不一；修法 = 统一注入 UnifiedCacheService、退役旧轨；验证 = grep 无旧 CacheService 消费方。
  5. **指标双注册删除**：锚 `backend/src/main.ts` 的 `bootstrap()` 中 `app.useGlobalInterceptors(new MetricsInterceptor(...))` 与 `backend/src/monitoring/monitoring.module.ts` 的 `{ provide: APP_INTERCEPTOR, useClass: MetricsInterceptor }` 重复注册；修法 = 删 main.ts 处、保留 DI 注册（参照 v1.3 存档勘误：坐标曾误记 ：113，实为 MetricsInterceptor 注册行）；验证 = 同一请求指标只计一次（/metrics 对比前后差值）。
  6. **假测试 ×2 处置**：锚 `backend/src/auth/auth.controller.spec.ts` 的 `it('should prevent timing attacks on login')`（双 mock 同异常、零时序断言的空壳）与 `backend/src/common/security/encryption.service.spec.ts`（crypto 整体 mock 后 timingSafeEqual 空转）；修法 = 删或改真断言（不接受为凑数保留）；验证 = 相关 spec 要么不存在、要么断言真实行为。
  7. **监控假成功诚实化**：锚 `backend/src/common/monitoring/security-monitoring.controller.ts` 多处硬编码 `success: true` 端点、`backend/src/monitoring/alert.controller.ts` 同类；修法 = 返回真实执行结果或显式 not-implemented；验证 = 无"恒 success:true"端点残留。

### PR2 · 死代码归档（25 JS + 17 CSS + main.js 死分支）【M】
- **问题**：js 树 43 文件仅 18 活、css 33 仅 16 活，共 25 JS + 17 CSS 死代码压仓；main.js 另有六处死分支。
- **锚**：`js/` 与 `css/` 树中未被四个页面（`index.html`/`login.html`/`orders.html`/`profile.html`）script/link 引用且无动态 import 的文件（含 `js/_archive/` 既有归档区核对）；`js/main.js` 的 `setupNavigation()` 内六处引用不存在页面/DOM 或永假条件的分支；基线脚本 `scripts/check-frontend-assets.py`（G3 门）。
- **修法**：死文件移入 `docs/archive/dead-code/`（加警示头），main.js 死分支删净；check-frontend-assets.py 按归档后新基数更新并在台账记录。
- **验证**：G3 脚本 exit 0 且新基数记档；四页核心功能与 F15 用例不回归。

### PR7 · 视觉一致性五件 【M】
- **问题**：CSS 变量双真值、Tailwind CDN 无 SRI、外链占位图、搜索组件三实例并行、生产构建出 source-map。
- **锚**：`css/variables/complete-variables.css`（`--gold-standard` 等设计令牌应唯一真值源）与同目录 `complete-variables_backup_before_optimization_*.css` 备份副本、页面内联 style 双轨；`index.html` 的 `https://cdn.tailwindcss.com` script 标签（无 integrity，同页 font-awesome 已带 SRI 可对照）；`index.html` 同时加载 `js/product-search/index.js`、`js/product-search/enhanced-search-component.js` 并内联动态 import（三实例）；`webpack.config.js` 的 `devtool: isProduction ? 'source-map' : 'inline-source-map'`（对照 `vite.config.js` 生产已关 sourcemap）。
- **修法**：变量收敛单一源并删备份副本；Tailwind 加 SRI 或本地化打包；外链占位图换本地静态资源；搜索组件收敛单实例；webpack 生产 devtool 改 false 或 hidden-source-map。
- **验证**：同名变量全站单值；页面无无 SRI 第三方 script 与第三方占位图请求；dist 产物无可用 source-map。

### D7 · drift 文档化 + 枚举收敛 + 孤儿模块声明 【M】
- **问题**：实体/枚举多轨漂移无记录，未接线模块无声明（接线即匿名暴露）。
- **锚**：user 实体三份定义并行（`backend/src/users/entities/user.entity.ts`、`backend/src/users/infrastructure/entities/user.entity.ts`、`backend/src/users/infrastructure/persistence/typeorm/user.entity.ts`，密码列行为互不一致）；重复枚举 `export enum` 同名多处（PaymentStatus ×6、UserRole ×5、PaymentMethod ×3、OrderStatus/RefundStatus/SecurityEventType 等 ×2）；孤儿模块 `backend/src/gateway/`、`backend/src/bff/`、`backend/src/aggregation/` 及 payment 控制器暴露面。
- **修法**：docs/ 落 drift 清单（三实体差异 + 收敛路径，真修触发器挂账）；枚举收敛为单一源定义 + 其余位置 re-export；backend/README 增"孤儿模块不接线"声明（v1.3 A11 决策）。
- **验证**：全库同名枚举单定义（或单一 re-export 链）；README 有孤儿模块与 drift 章节。

### D8 · 断链与僵尸清理四件 【S】
- **问题**：四个僵尸配置/脚本会误导执行者与 CI。
- **锚**：`backend/package.json` 的 `"config:generate": "copy .env.master .env.example"`（Windows-only 且会把主配置泄进示例文件）；同文件 `"caddy-style-shopping-site": "file:.."` 自引用依赖；`backend/ecosystem.config.js`（PM2 入口与实际启动方式漂移）；`scripts/package.json`（独立依赖边界游离于根/后端之外）。
- **修法**：config:generate 删除或改跨平台且不读 .env.master；去掉 file:.. 自引用；PM2 入口与 README 启动方式对齐或声明弃用后删除；scripts 依赖并回根/后端 package.json。
- **验证**：`npm run` 列表无僵尸命令；`npm ls` 无自引用；pm2 配置可用或已删。

### F14 · G4 浏览器跑道 【S】
- **问题**：缺自起前后端的浏览器测试跑道，浏览器级门禁无法脚本化执行。
- **锚**：`vite.config.js` 的 `server` 块（port 5173，无 proxy）；`playwright.config.cjs` 与 `e2e.config.js` 双配置并存（后者 preview 服务 dist/，而 vite build input 仅 index.html、dist 无 login.html，跑道不可用）。
- **修法**：vite server.proxy 增 `'/api': 'http://localhost:3000'`；`playwright.config.cjs` 的 webServer 改数组——前端条目 vite dev（5173）+ 后端条目 `npm run start --prefix backend`（nest start 单次编译运行，DB=sqlite 默认自动建库、Redis 缺失降级不阻断）；**钉死唯一入口 = playwright.config.cjs，禁用/删除 e2e.config.js**。
- **验证**：`npx playwright test` 能自起前后端，用例内请求 `/api` 代理可达。

### F15 · 浏览器注册→登录用例 【S】
- **问题**：认证主链路无浏览器级回归用例（Phase 0 未建跑道，精简版亦未补）。
- **锚**：`tests/e2e/`（现有 `basic-navigation.spec.js`，新增 `auth-register-login.spec.js`）；依赖 F14 跑道。
- **修法**：用例 = 勾选 agree-terms → 每用例唯一凭据 `reg$(Date.now())@test.local`（解决并行 worker 撞车）提交注册 → 断言成功并跳登录 → 用同凭据登录成功。
- **验证**：`npx playwright test --project=chromium tests/e2e/auth-register-login.spec.js` 绿，纳入 G4 门。

---

## P3 地基与运维（7 项）

### K5 · CI 复活与依赖更新基建 【M】
- **追加**：backend-openobserve / ci-light-security-scan / e2e-cart-refresh 三个工作流已于 2026-10-03 改 workflow_dispatch（恒红止血）——依赖修复（openobserve 部署 / cart-refresh 用例选择器更新）后恢复自动触发；ci-light-security-scan 恢复 PR 扫描。
- **追加（验收审计）**：ci.yml deploy-staging/deploy-production 段引用已归档的 backend/k8s/staging|production（合并 main 即断）；docker-validation.yml 引用已整体归档的 docker-validation-scripts/——K5 清理工作流时一并处置（删或改触发分支）。
- **问题**：CI 已红十周（安装段根因 D1 锁文件已于 Day 2 重锁修复，流水线三段仍需各自修通）；依赖更新双配置失真；README badge 撒谎。
- **锚**：`.github/workflows/ci.yml`（安装/构建/测试三段）；`.dependabot/config.yml`（Dependabot v1 已废弃格式，需迁移）；根目录 `renovate.json`（含废弃 preset 与无效字段，需三修）；`README.md` 头部 CI/CodeQL/dependency-check/sbom-sign 四 badge（工作流实际状态与 badge 不符）；`.github/workflows/secrets-check.yml`（已随 T1 历史收编合入，此后改动归本项，需确认在 CI 实跑而非摆设）。
- **修法**：三件套逐段修绿（npm ci 可复现 → tsc → jest 单测）；Dependabot 迁移 v1 config.yml → `.github/dependabot.yml` v2 格式后删除旧文件；Renovate 三修（按当前 schema 校验：废弃 preset 如 config:base、无效字段、失效账号/排期类）；badge 与真实工作流逐一核真（死了的摘除）；secrets-check 挂入必过 job。
- **验证**：ci.yml 全绿；badge 与 actions 实况一致；两份依赖更新配置通过各自官方校验。

### D2 · 依赖三批次升级 【L】
- **问题**：backend 107 漏洞（critical 4）、根目录 34（critical 1）。
- **锚**：`backend/package.json`（现值：axios ^1.12.2、typeorm ^0.3.27、mysql2 ^3.15.1、joi ^18.0.1、@nestjs/common ^11.1.6）与根 `package.json`。
- **修法**：**批 1**（生产树 critical/high 清零）：axios→1.20.x、typeorm→0.3.31、mysql2→3.24.x、joi→18.2.9、@nestjs/*→11.1.18；**批 2**（major 跨越）：@opentelemetry/* 全家、sqlite3（major 或迁 better-sqlite3）、nodemailer major；**批 3**：@types 系列迁移 + 根目录四个构建期依赖迁 devDependencies。每批独立提交并过 G1/G2/G6。
- **验证**：npm audit 生产树 critical/high = 0；`npm ci --dry-run` exit 0（G6）；单测基线不降。

### K3 · 镜像与 nginx 加固 【M】
- **问题**：密钥随镜像层分发、nginx 无安全头/CSP、LB 无 TLS。
- **锚**：`backend/src/payment/microservices/gopay-service/Dockerfile` 的 `COPY --from=builder /app/.env* ./`（.env 进镜像层）；根目录与 `backend/.dockerignore` 缺失项（node_modules/.git/.env* 类）；`docker/nginx/frontend.conf`（无安全头/CSP）；`docker/nginx/nginx-lb.conf`（无 TLS 终结）；根目录 `nginx-security.conf`（与实际加载路径脱节的孤儿配置）。
- **修法**：gopay 删 .env COPY 改构建参数/运行时挂载；补齐 .dockerignore；frontend.conf 加 HSTS/X-Frame-Options/X-Content-Type-Options/CSP（安全官会签，与 PR5b 联动）；nginx-lb 配 TLS；nginx-security.conf 并入实际加载链或删除。
- **验证**：`docker history` 无 .env 层；响应头带安全头集；LB 经 https 可访问。

### K6 · workflow action 引用安全 【S】
- **问题**：全部 workflow 用裸 tag 引用 action（无 SHA 锁定，供应链可劫持），存在退役/版本错配 action，secrets 以内联表达式直传。
- **锚**：`.github/workflows/*.yml` 的 `uses:`（如 `actions/checkout@v4`、`github/codeql-action/analyze@v3` 与 `upload-sarif@v2` 混用等 15 个工作流文件全集）；`${{ secrets.* }}` 内联传参点。
- **修法**：全部 uses 改 commit SHA 锁定；退役/错配版本（如 upload-sarif@v2）统一到当前版；secrets 改经 `env:` 中转再引用。
- **验证**：grep `uses:` 无裸 tag 引用；CI 全绿。

### K2-full · compose 收敛（20 → 3 套）【M】
- **追加（验收审计）**：①六个枚举外残骸脚本仍引用已归档 compose，同批归档：backend/scripts/{start-openobserve.sh, quick-fix-openobserve.sh, init-openobserve-streams.js, deploy.sh, deploy.ps1, deploy-and-test-redis.cjs}；②根 k8s/search/（9 文件）决策：README-K8S-SEARCH 引用它为活文档——保留则 README 措辞需澄清"backend/k8s 已归档、k8s/search 保留"，或一并归档并修文档链接；③现行文档指向归档 compose 的链接清理（backend/docs/DISTRIBUTED_TRACING.md、backend/docker/README.md、docs/docker-deployment-verification-report.md 等）。
- **问题**：全仓 20 套 compose 端口互相漂移且无一绑 127.0.0.1（Day 3 只做了归档与主 compose 三处修）。
- **锚**：全仓 docker-compose*.yml 共 20 件（audit_head 实测：`backend/docker/` 树 5、backend 根 4、`docker/` 3、仓库根 5、`docker-validation-scripts/` 1、backend/scripts 与 backend/src/payment 各 1）；引用方脚本 = `docker-validation-scripts/` 与 `backend/scripts/` 内 yml/js。
- **修法**：收敛至 3 套（主 `docker-compose.yml`、`docker-compose.dev.yml`、观测栈一套），其余 17 套移 `docs/archive/deployments/`（警示头）；保留套端口统一绑 127.0.0.1 并出端口真值表；引用方脚本改指向保留套或随归档声明。
- **验证**：compose 文件计数 = 3；每套 `docker compose config` 可解析；端口无 0.0.0.0 直暴。

### 测试债-T · backend e2e 弃管声明与收编评估 【M】
- **问题**：backend/test 的 e2e spec 完全不在门禁内，既无弃管记录也无收编计划。
- **锚**：`backend/test/*.e2e-spec.ts`（app/auth/auth-security/cart-payment-integration/health/orders/payment/products/products.integration 九件 + `backend/test/security/payment-security.spec.ts`；v1.3 口径记 14 个 spec，开工时以目录实测清点为准并更正台账）；`backend/package.json` 的 `test:e2e`（jest.config.e2e.cjs）。
- **修法**：先在整改台账登记"e2e 弃管声明"（范围/原因/风险），再评估收编——挑认证与购物车主链先行入 CI，环境依赖重（DB/Redis/外部服务）的标记隔离跳过；排期绑定 K5 的 CI 复活。
- **验证**：台账有声明条目；收编部分在 CI 稳定绿。

### 测试债-G4' · 越权矩阵（D5 完成后启用）【S】
- **问题**：横向越权无固定回归矩阵。
- **锚**：D5 的 OwnerOrAdminGuard 覆盖路由（users/orders/address 资源端点）；矩阵脚本挂主控门禁脚本族。
- **修法**：curl 四行矩阵——本人 200 / 他人 403 / admin 旁路 200 / 匿名 401，凭据用唯一模板（用户名 `auditor$(date +%s)` / 邮箱 `aud$(date +%s)@test.local`，DB 重置 = 删 `backend/data/*.db` 由 sqlite 自动重建），结果记台账。
- **验证**：D5 合入后矩阵全绿，并纳入此后每批门禁。

---

## 挂账区（产品决策类，暂不开工）

| # | 事项 | 现状与触发条件 |
|---|---|---|
| 1 | **logout 服务端 token 黑名单**（v1.3 A6） | 单实例演示站暂缓；PR6 只做基础服务端登出 + 键清理。触发：多实例部署或 token 泄漏应急。 |
| 2 | **verify-code 邮件 provider 选型** | D6-余件①②（DTO+上限）先落地；需要真实发信能力时再选型（SMTP/第三方）。 |
| 3 | **D7 迁移真修触发器** | drift 本期只文档化；触发条件建议：用户实体三轨任一需要改字段时，顺手收敛为单轨。 |
| 4 | **register 返回 201 语义修正** | 现行为 200 + 自动登录（返回双 token）为既定契约（v1.3 A9），改 RESTful 语义需同步前端与用例。 |
| 5 | **中文用户名支持**（A12 反向） | 前后端已统一 `^[a-zA-Z0-9_]{3,20}$`；放开中文需后端 RegisterDto + 前端 validateName/pattern/文案三处联动，属产品决策。 |

---

*本清单 27 项 + 挂账 5 项。编制：整改小组 BACKLOG 起草员，2026-10-02。锚点坐标以 `onlinestore_audit_head` 工作树（v1.3 审计基线）实测校准；执行分支 `remediation/2026-10-02` 上如坐标漂移，以符号锚（函数/文件/配置键）重新定位。*
