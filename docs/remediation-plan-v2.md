# onlinestore 整改方案 v2.0（精简执行版）

本版取代 v1.3（已存档：`onlinestore-整改方案-v1.3-存档.md`），按反过拟合三席判决重构：v1.3 为一个 0 star、未 push 的演示站配置了五角色流程、多重审批物与门禁激活体系，属过度投入。v2.0 压缩为三层——一次性执行卡（Day 0-3，命令级，用完即弃）、耐久层（不变量+裁决+BACKLOG 指针）、停机规则。本文自足：全部技术细节要么写在卡内，要么明确归 BACKLOG，无跨文件指针。

## 0. 已定事实（直接采用）

- 仓库：GitHub AronSwan/onlinestore（0 star，未 push）。整改分支 `remediation/2026-10-02`，基线 SHA=515fdc7（improvements/2026-10-02 tip，4 提交）。
- 冻结补丁已物化于 ZCodeProject：`frozen-2026-10-02T1645.patch`（sha256 `ceb473f123d58f34de4cf422a83d5ff9068ad093386699b2b167fd69d44dcf9b`，22 文件 +434/-247）与 `frozen-jwt.strategy.spec.ts`（sha256 `abdf8a1281c6eb923efb5b1b6cd88e76e42f1a8ff9f04728e900c039604ab79f`）。**patch 含全部工作区差异**：其中 `backend/docs/openapi.json` 仅 CRLF 行尾噪声、`docs/dependency-update-report.json` 为审计产物，均不入合流（apply 排除法见 Day 0 第 3 步）。
- 环境：improvements/2026-10-02 已被 analysis worktree 占用（建区必须 `-b`）；audit_head 工作树是冻结态同构副本（node_modules junction 源）；backend 用 sqlite 默认零 env 可跑；Redis 缺失降级不阻断。

## 1. 第一层 · 一次性执行卡（Day 0-3）

每个工作项给：锚点（自定位 grep）｜修法｜验证。行号仅出现在"冻结态证据"括号注里（参照系=515fdc7+冻结补丁态）。

### Day 0 · 建区合流（30 分钟）

```bash
# 1) 建区（在 audit_head 执行，不触碰 analysis；improvements 分支被占，必须 -b）
git -C C:/Users/Administrator/onlinestore_audit_head worktree add C:/Users/Administrator/onlinestore_remediation -b remediation/2026-10-02 improvements/2026-10-02

# 2) node_modules（junction 指向 audit_head 同构副本，先例验证零干扰）
cmd //c mklink /J C:\Users\Administrator\onlinestore_remediation\backend\node_modules C:\Users\Administrator\onlinestore_audit_head\backend\node_modules
#   备选：cd C:/Users/Administrator/onlinestore_remediation/backend && npm install --legacy-peer-deps --no-save && git checkout -- package-lock.json

# 3) 冻结补丁 apply（--exclude 排除两个噪声文件，等效于 22 文件白名单法；
#    若改从 audit_head 重新导出补丁，先 git -C .../onlinestore_audit_head checkout -- backend/docs/openapi.json 清行尾噪声）
sha256sum C:/Users/Administrator/ZCodeProject/frozen-2026-10-02T1645.patch   # 期望值=§0 第 2 条 ceb473f1... 全值
sha256sum C:/Users/Administrator/ZCodeProject/frozen-jwt.strategy.spec.ts   # 期望值=§0 第 2 条 abdf8a12... 全值
cd C:/Users/Administrator/onlinestore_remediation
git apply --exclude=backend/docs/openapi.json --exclude=docs/dependency-update-report.json C:/Users/Administrator/ZCodeProject/frozen-2026-10-02T1645.patch
cp C:/Users/Administrator/ZCodeProject/frozen-jwt.strategy.spec.ts backend/src/auth/strategies/jwt.strategy.spec.ts

# 4) 提交（= remediation 分支合流基线），随后创建 docs/remediation-ledger.md（批次/结果/豁免三字段）
git add -A && git commit -m "chore: apply frozen 2026-10-02T1645 patch (22 files) + jwt.strategy.spec.ts (excl. openapi.json CRLF noise, dependency-update-report.json)"
```

### Day 1 · 核心为真（~1.5 天，每项一提交）

- **D3 登录双 bcrypt**｜锚：`grep -n "hash(" backend/src/auth/auth.service.ts backend/src/users/users.service.ts`（冻结态证据：auth.service.ts:111 register() 预哈希；users.service.ts:38 create() 再哈希；:147 update() rounds 10）｜修法：register() 内删预哈希，create() 为注册链路唯一哈希点，rounds 全局统一 12（含 update()）｜验证：curl 注册→登录 200（整改前登录 500）。
- **D4 FirstName VO 回归**｜锚：`grep -n "new FirstName" backend/src/users/infrastructure/repositories/typeorm-enhanced-users.repository.ts`（冻结态 :294）｜修法：FirstName 值对象加静态 fromPersisted() 免校验重建，持久层读取改走该工厂｜验证：用户名含数字时 GET /users/:id 返回 200（整改前恒 500）。
- **F12 注册四件套**｜锚：`grep -n "JSON.stringify({ name" js/auth.js` + `grep -n "validateName\|validatePassword" js/auth.js` + `grep -n "pattern=\|支持中文" login.html`（冻结态：auth.js:481 payload 发 name；:298 密码 ≥6；:305 validateName 仅查非空；login.html:192 novalidate、:207 pattern 含中文区间）｜修法：①payload name→username ②validatePassword 对齐后端 ≥8+复杂度 ③validateName 改 `^[a-zA-Z0-9_]{3,20}$` 字符集+长度真实校验（novalidate 下 pattern 属性运行时零约束，validateName 才是执行点；pattern 属性同步改，仅作文档）④帮助文案删"和中文"｜验证：浏览器注册（勾选同意条款）→登录全通。
- **F1 profile 页即崩**｜锚：`grep -n "loadUserInfo\|loadUserData" js/profile-manager.js`（冻结态 :19/:24 调用不存在的 loadUserInfo；:47 才有 loadUserData）｜修法：改调 loadUserData，init 首行加 checkAuth()｜验证：登录后打开 profile 页无 ReferenceError、正常渲染。
- **F2 首页搜索/移动菜单失效**｜锚：`grep -n "searchBtn\|mobileMenuBtn" js/navigation-icons.js index.html`（冻结态 navigation-icons.js:242/:269 与 index.html:660/:679 内联版互 toggle 抵消）｜修法：删 navigation-icons.js 两处绑定，保留 index.html 内联版｜验证：搜索面板与移动菜单可正常开合。
- **D6.6 openobserve-env 加载期 throw**｜锚：`grep -n "throw" backend/src/common/openobserve-env.ts`（冻结态 :49，logging.module×2 spec 根因）｜修法：非 production 改 console.warn｜验证：logging 两个失败 spec 转绿。
- **D6.7 redis-health spec 撞生产校验**｜锚：`git ls-files "*redis-health*.spec.ts"` 后对命中文件 `grep -n "NODE_ENV\|JWT_SECRET"`（spec 自设 production 且缺合规密钥，撞 unified-master.config.ts:350）｜修法：补合规测试密钥（JWT_SECRET ≥32 字符；若再撞 ENCRYPTION_KEY 长度校验同补 64 字符测试值）｜验证：redis-health spec 转绿（Redis 缺失降级不阻断）。

日末验证：`cd backend && npm run test:unit`（全绿，实测计数记入 ledger 为新基线，此后只升不降）→ `npx tsc --noEmit -p tsconfig.json && npx tsc --noEmit -p tsconfig.spec.json` → curl 注册→登录冒烟（凭据 `u$(date +%s)` / `u$(date +%s)@test.local`）。

### Day 2 · 拆雷（每项 ≤1h，每项一提交）

- **S1 登录页反射 XSS**｜锚：`grep -n "innerHTML" js/login-utils.js js/oauth-handler.js`（冻结态 login-utils.js:62/:112、oauth-handler.js:101）｜修法：改 textContent；error/provider 插值过白名单再渲染｜验证：`login.html?error=<img src=x onerror=alert(1)>` 不执行。
- **S2 OAuth state fail-open**｜锚：`grep -n "state" js/oauth-handler.js`（冻结态 :59-61 仅三值齐全才比对）｜修法：state 缺失/无 session 记录/值不匹配任一即拒绝并中断回调｜验证：篡改 query 中 state → 拒绝页。
- **S4 匿名 500 泄堆栈**｜锚：`grep -n "stack" backend/src/logging/filters/logging-exception.filter.ts`（冻结态 :36-39）｜修法：响应只留 statusCode+message（堆栈仅进服务端日志），补一个断言响应无 stack 的 spec｜验证：匿名 500 响应体无堆栈/绝对路径。
- **S5-min ENCRYPTION_KEY 公开已知**｜锚：`grep -rn "ENCRYPTION_KEY" docker-compose.yml .env.example backend/src/config/unified-master.config.ts`（三处同值硬编码；生产校验只查长度）｜修法：删三处硬编码同值（.env.example 改占位提示），生产校验加已知值黑名单，开发回退值改随机生成｜验证：设黑名单值启动 → 拒绝启动。
- **S3-min 全站零限流**｜锚：`grep -n "Throttle" backend/src/auth/auth.controller.ts`（冻结态 :49/:57 limit 1500/60；ThrottlerGuard 未注册，@Throttle 是哑装饰器）｜修法：app.module 注册 ThrottlerModule+APP_GUARD(ThrottlerGuard)（现成写法 backend/src/app-minimal.module.ts），登录/注册 @Throttle 5 次/分｜验证：登录 6 连发 → 429。
- **S7 CORS 凭据反射**｜锚：`grep -n "enableCors" backend/src/main.ts`（冻结态 :147）｜修法：origin 改显式白名单（非生产默认 localhost:5173/3000），credentials 下禁通配｜验证：`curl -H "Origin: https://evil.example"` 响应无 ACAO 头。
- **P1-min 支付可离线伪造**｜锚：`grep -n "secret" backend/src/payment/controllers/payment.controller.ts backend/src/payment/gateways/crypto-gateway.service.ts`（secret 可 undefined 拼 `&secret=undefined`）｜修法：secret 缺失 fail-closed，回调验签强制（无/错签名 403）；支付模块保持不接线｜验证：单测模拟 secret 缺失与错签名均拒绝。
- **S6-min 匿名写路由**｜锚：`git grep -L "UseGuards" -- "backend/src/**/*.controller.ts"`，对命中文件逐个 `grep -lE "@(Post|Put|Patch|Delete)\("` 筛含写路由者（冻结态 9 文件，六个横切面控制器——cache/circuit-breaker/degradation/aggregation/openobserve-backup/alert 类——在其中）｜修法：写路由挂 @UseGuards(JwtAuthGuard)，管理面再加 admin RolesGuard；GET 读路由暂留挂账｜验证：匿名 POST 原可写路由 → 401；因守卫被适配的 spec 在提交信息单列"守卫适配"。
- **F5-min 假功能砍除**｜锚：`grep -n "google\|github" login.html` + `grep -n "fetch(" js/email-verification.js js/profile-manager.js`（约 20 个 fetch 打向后端不存在路由）｜修法：删 Google/GitHub 登录按钮；邮箱验证远程调用改本地回退（提示演示站未接邮件）；profile 打向假端点的按钮禁用+提示未实现｜验证：相关页面无 404 噪音、无假入口。
- **F7-min 渲染层转义**｜锚：`grep -n "innerHTML" js/orders.js js/cart.js`（冻结态 orders.js:393/:529/:540、cart.js:555 等）｜修法：新建 js/utils/escape-html.js（escapeHtml），orders/cart 模板拼接统一过转义｜验证：商品/订单名注入 `<img onerror>` 显示为字面量不执行。
- **F9 订单页假象**｜锚：`grep -n "cancelOrder\|normalizeApiOrders\|invoice" js/orders.js`｜修法：cancelOrder 失败走真实错误提示（不假成功）；normalizeApiOrders 过滤 null 记录；发票入口移除（invoiceUrl 已停止生成）｜验证：取消不存在订单显示后端真实错误。
- **D1 依赖重锁**｜锚：`grep -n "typedoc\|remark" backend/package.json`（冻结态 :206-214 九个 devDeps 不在 lock，npm ci 必挂）｜修法：删 9 个 typedoc/remark 系 devDeps，`cd backend && HTTPS_PROXY=http://127.0.0.1:7890 npm install --package-lock-only` 重生成 lock｜验证：`npm ci --dry-run` exit 0。

日末验证：同 Day 1 三件 + `cd backend && npm ci --dry-run`（exit 0）。

### Day 3 · 诚实层（~0.5 天）

- **README 演示声明**｜修法：顶部横幅"演示项目，勿原样部署"+已知限制块五条：支付未接线；鉴权演示级（读路由仍匿名）；依赖漏洞已知未全修；e2e 不维护；k8s 与多余 compose 已归档 docs/archive/｜验证：横幅在最顶、五条齐全。
- **部署面瘦身**｜锚：`git ls-files | grep -iE "compose.*ya?ml"`（全仓 20 套）+ `ls backend/k8s`｜修法：backend/k8s 与多余 compose 变体 git mv 至 docs/archive/（k8s→docs/archive/k8s/，compose 变体→docs/archive/deployments/，保留根 docker-compose.yml）；主 compose 修三处——redis 加 requirepass、数据面端口绑 127.0.0.1、ENCRYPTION_KEY 改 `${ENCRYPTION_KEY:?missing}` 插值；引用旧 env 的脚本同批处理或一并归档｜验证：`docker compose config` 通过；缺 ENCRYPTION_KEY 时启动即报错退出。
- **smoke 脚本入库**｜修法：scripts/smoke.sh——起后端（`npm run start --prefix backend`，sqlite 零 env 自动建库）→注册→登录→带 token GET 本人 cart 期望 200→匿名 GET cart 期望 401；凭据 `smoke$(date +%s)` / `smoke$(date +%s)@test.local`｜验证：`bash scripts/smoke.sh` exit 0。
- **push 或归档裁决（用户决定，收尾项）**｜分支 A push：`git push -u origin remediation/2026-10-02` 并开 PR（描述引用本文件+ledger），此后以 PR review 为准；分支 B 归档：不 push，`git tag -a remediation-2026-10-02 -m "v2.0 remediation complete"`，ledger 记"未 push 归档"终态，分支与 tag 本地留档随时可恢复。

## 2. 第二层 · 耐久层

### 2.1 工程不变量（18 条）

①密码哈希单点：全链路唯一 bcrypt 位置，rounds 全局一致。②fail-closed：state 校验、回调验签、密钥缺失，任一不满足即拒绝，不放行不降级。③密钥不得为公开已知值：生产校验除长度外必须含已知值黑名单。④装饰器≠生效：@Throttle/@Roles 一律行为探针验证（看 429/403 实响），不只看注解。⑤零 Guard 控制器即缺陷：控制器上线必须过 Guard 检查。⑥错误响应不泄堆栈与绝对路径。⑦敏感字段（password/token/secret）不出库、不出日志。⑧后端是表单校验单一事实源；前端 novalidate 下 pattern 属性零约束，真实执行点是 JS 校验函数。⑨测试基线只升不降；假测试（空壳/假断言）必改真或删。⑩门禁与修复物理对齐：验收某行为前，该行为的修复必须已落地。⑪npm ci --dry-run exit 0 是依赖同构判据（lock 与 package.json 一致）。⑫引导脚本 env 契约：必填缺失即退、生产拒跑、幂等。⑬诚实 UI：无假按钮、无假成功、不存在的能力不渲染入口。⑭调用不存在的函数=炸弹：新代码引用的函数先验证存在。⑮未接线模块显式声明（README 已知限制块）。⑯提交可审计可回滚：小批量、信息与 diff 对账、git status 干净。⑰执行留痕：docs/remediation-ledger.md 简单台账，批次/结果/豁免三字段即可。⑱并行凭据唯一性（时间戳模板）+DB 可重建（sqlite 删库自动重建）。

### 2.2 仍有效裁决记录（每条一行）

- k8s 清单归档 docs/archive/k8s/，不做修复。
- 诚实 UI：后端不存在的功能砍 UI 或禁用+提示，不造假成功。
- 假测试（空壳断言）删或改真，不接受基线数字保护。
- 孤儿模块（支付/Gateway/BFF/Aggregation）本期不接线，README 声明。
- 注册用户名规则前端收敛后端（`^[a-zA-Z0-9_]{3,20}$`），中文用户名列产品挂账。
- register 返回双 token（注册即登录）为既定行为，与冻结补丁一致。

### 2.3 BACKLOG 指针

挂账项（中文用户名、S6 读路由守卫、logout 服务端黑名单、D2 剩余依赖漏洞、D5 横向越权全量、e2e/CI 复活、F4 死代码清理等）统一收录 `onlinestore-BACKLOG.md`（另一席产出；入仓后位于 docs/BACKLOG.md）。本方案不重复维护挂账清单。

## 3. 第三层 · 结尾声明（停机规则）

本方案为一次性执行令。执行期发现的问题：直接修+记 ledger（docs/remediation-ledger.md 三字段），不再修订本方案、不再开方案审计。唯一重审触发条件：结构性变更≥15%（工作项或执行顺序的增删改达到本方案体量的 15%）；低于阈值一律"修+记"，不改方案。
