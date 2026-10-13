# 已知不修清单（Known-Won't-Fix）

> 本仓库为无人维护的演示项目。以下为**明确不修**的已知事项（非路线图、非待办）——
> 历史过程文档与详细修复方案已从工作树移除，完整上下文见 git 历史与 `docs/remediation-ledger.md`。
> 若有人 fork 接手，按 `docs/safety.md` 的规则落点与锁作为安全基线起步。

## 记账规则（2026-10-07 用户令"账本同步需要重视起来"后立）

1. **出口数字必对实数**：任何要写进 commit/对话/报告的计数（移交 N 项、测试绿 N 个）先对本账程序化清点（编号 grep/计数），禁心算估数。
2. **下账必留痕**：结案条目用 ~~删除线~~ 划销+注明下账日期与指针（哪次施工/哪项裁决）；禁止只在对话或 commit 里口头宣称结案而账面不动。
3. **数字三件套**：测试/性能数字引用必须同时带 ①仓内可复现命令 ②日期 ③口径限定语（runner/工况/条件），缺一不写——无锚数字一律作废（先例：bfdbde8"契约95绿+抽验40绿"已作废）。（v1.4 立法批扩："仓内可复现命令"指命令文本随卷宗文本入仓，"复现命令在各席原卷"不满足本条；辖域扩至一切承重计数（普查/审计卷宗同辖）。过程性证据（截图/中间产物）仓外+离场自清不变。）
4. **移交批次编号**：新增移交批次写明"移交下批（日期+来源）"并给条目连续编号；对外报总数时按批次求和后再出口。
5. **挂账"有期"三选一（v1.4 立法批，纲领判据 4/5 配套）**：挂账行必含 ①已排期批名+该批计划实列锚 ②日期 ③可判定触发事件（须附到来方式——排期或外部触发器，永不到来的事件非合格锚），三选一外加"为什么不做"；三者皆无=无效挂账（整改两问①未过）。每逢阶段性验收，过期未触发项重定期或升级裁决，禁静默续挂（周期机制归账本治理批 M1 域，其落地前以"阶段性验收"事件锚执行）。
6. **观察行（单例观察项专用，v1.4 立法批）**：单例观察项不入挂账区、不带期，入本账"观察区"独立小节。行格式=现象一句+判"单例"依据（触发条件/最硬反例之答）+记录日期+升级触发线（何种同构复发即升格挂账行并补三选一，谓词先行写明）。同构现象第二次出现时观察行自动升格挂账行（同病分账互引同步触发）；无升级触发线的观察行=未落账视同静默蒸发。观察行不计入挂账/移交对外计数。观察区对账随账本治理批周期执行。

## 观察区（v1.4 立法批立，规则 6；单例观察项专用，不带期不计数）

- 后端进程单次无日志死亡（升级批双盲审计遗留+W-3 批同款）——判单例依据：仅一次且未复现、归因不唯一；记录 2026-10-09；升级触发线：再出现同形无日志死亡即升格挂账行（谓词=进程退出码非零且无对应日志行）。
- cart count 与 summary.totalItems 口径不一致（前端未消费 count）——判单例依据：无消费方=无实害面；记录 2026-10-07（#3 批遗留）；升级触发线：前端开始消费 count 字段即升格。


**【验收整改批 2026-10-10】**(五席验收归案, P1 三项当场整改+ P2/P3/账务入账)

- P1-1 ✅ verify-code service 漏洞修复（service 守门 typeof+长度/memoryStore 10k 上限+定时清理/maskMail 日志脱敏）

- P1-2 ✅ common-passwords.data 头注释 off-by-1 勘正（9997→9996 实测）

- P1-3 ✅ MAIL_HOST Joi `when(MAIL_PROVIDER, {is:'smtp|sendgrid', then:Joi.required()})` smtp 缺 host 启动 fail-fast（验收 C 席 Item1b）

- P2-1 ✅ 429 抛对象含 retryAfter 数字（filter line 96 已支持透传为 Retry-After 响应头）

- P2-2 ⏳ SENDGRID_API_KEY 入 Joi schema（已立，邮件批余量保留 apiKey 配置位）

- 软项 → 转入账本观察/挂账行：

  - **挂账行**：sms.service 2 处 TODO + push.service 3 处 TODO — 归"通知域集成刀补刀（短信/推送通道）"，期=W-1 刀 2/3 之后或独立小刀（已立批量通知通道被本批未触动的事实，下批开工时强制走账本读取再施工）；升级触发线=任一通道被新批接真时本行下账

  - **挂账行**：safety.md:17 接线类批必查条款——2026-10-10 立法批已落（"接线/卸载模块施工批验收必含本表对应行复核"，charter 闸门节与触发表同源联动），期=已入法（无需再开；本行仅记档）

  - **挂账行**：审计 c/接 e 抓出的 specs 类缺口——"存量 8 位密码账户登录兼容 spec 无回归断言"（验收 C 席 #3），期=下次 auth 域相关批时补，升级触发线=任一开发者在 login 路径加 validatePasswordForCreation 调用时本行下账

  - **观察行**：cadence 报 "verify-code memoryStore 跨进程/多实例无共享态（目前单实例 OK）" — 判单例依据：单实例部署现状；升级触发线=多实例/迁 Redis 需求时升格挂账行

- 验收批 P 严重度标：本批定性为 **P1**（五席实修三项 P1 资金/数据/安全面向，已当场闭环）



**【系统整改批 2026-10-10】**(用户令"系统正确负责任"——验收 E 席查 7 处真桩未做"病根+同类全扫",按纲领 V1.4 第 5 条两问系统性治本)

- 整改 1（通知域同病全扫）✅ 2026-10-10: SMS/Push service 改 provider 配置闸门(同 email 模式)——provider=none 默认日志模式零外发;provider=aliyun|tencent|firebase|jpush|getui 需 SDK(未装即 throw ProviderNotConfiguredError——勘误@找茬批:实为首次 send 时 throw 非 startup fail-fast)。Joi schema+config 暴露+spec 5 例(模式切换+throw 锚定)三道闸全过位

- 整改 2（messaging 死端点同病全扫）⏳ 挂账: 全仓事件 emit 端点 = payment-application.service.ts 4 处(payment.order.created/succeeded/failed/refund.created);@OnEvent 消费端 = orders/payment-events.listener.ts 2 处(payment.succeeded/failed)= 真实消费;messaging/ 目录 0 个 @OnEvent + 2 个文件 4 处含(找茬批勘正——原误记 5 个文件)"模拟异步处理"setTimeout——既无 producer 触发亦无 consumer 监听,4 处桩是死端点
  - **治本方向**: 删 messaging 死文件 OR 配真事件源(Redpanda 有 3 个真实使用点(notification.controller×2+notification.consumer×1——双盲审 A1 席勘正,原误记零使用)) OR 整并入 EventEmitter 现有路径——决策权归用户
  - 期=用户决;升级触发线=用户选方向后即开"事件流对账批",施工时强制先扫 emit 端与 @OnEvent 端对称再动工

- 整改 3（短密码登录兼容 spec 夹固）⏳ 挂账（验收 C 席 #3 升级）: 补 1 例 spec,bcrypt.compare mock 8 位哈希 + 断言 200——夹固"login 路径不校验策略"契约;升级触发线=任一开发者在 login 路径加 validatePasswordForCreation 调用时本行下账

- 整改 4（外部依赖账本化）⏳ 挂账: 通知域接入批需四件齐——SDK 选型+npm 安装+sms/push service 补实现+卷宗;阿里云邮件推送账号已等用户申请。账本已立"外部依赖账本"小节,触发线=任一真接批开工前强制四件核对

- 整改 5（占位实现注册进活工厂的同病全扫）已扫描结果: 4 类真桩——通知域 SMS/Push(整改 1)+messaging 4 处(整改 2)。仓内"模拟异步处理 setTimeout" 模式 grep 命中 4 处,均在 messaging 死端点中,无其他生产路径



## 外部依赖账本（双盲审 P1 整改落地，2026-10-10——原宣称已立但全仓不存在，三席共中虚报）

通知域+发信系统的硬前置——每项记状态/触发线/责任人，真接前四件核对（选型+安装+实现+卷宗）。

| 外部依赖 | 状态 | 触发线/升级判据 | 责任人 |
|---|---|---|---|
| 阿里云邮件推送（DirectMail）账号+MAIL_* 全套 | 待申请 | 用户去阿里云开"邮件推送"（营业执照申请，免费 200 封/日）；到手填 MAIL_PROVIDER=smtp+MAIL_HOST/USER/PASS/FROM 即真发 | 用户 |
| SMS SDK（阿里云/腾讯云） | 待选型+安装 | 选一→npm i SDK→sms.service.ts:33 throw 替换真实现→本行下账 | 用户选/施工 |
| Push SDK（Firebase/极光/个推） | 待选型+安装 | 同上 | 用户选/施工 |
| AccessKey 凭证管理 | 套餐前置 | 发信/短信/推送共用，单独管理 | 用户 |

## 双盲审整改批（2026-10-10，用户令"双盲审组每组多agents严格盲审"后四席归案）

**组间交叉高置信采纳**（P1 三项=3/2 席共中;P2 三项=交叉/变异实证——共 6 项,找茬批勘正）：
- ✅ P1 外部依赖账本虚报→本批落地（上方小节）
- ✅ P1 "启动 fail-fast"失实→**勘误**：provider≠none 时 throw 在首次 send 调用时（非启动期）；被 processNotification catch 转 NotificationStatus.FAILED——应用不挂不崩，行为安全但文档失真已勘正
- ✅ P1 谓词漏扫两处→**入账**：notification.consumer.ts:24 TODO（活消费端 no-op 分发——有活生产者 POST /notifications/test）+redpanda.service.ts:330 queryMessages 占位返[]（有活调用方 order-events.service.ts:172）——归"通知域集成刀补刀"挂账批
- ✅ P2 ProviderNotConfiguredError 立类（原注释/spec 标题提及但类不存在）
- ✅ P2 none 模式 spec 补断言（变异 M1 证假绿——补 logger spy 锚定）
- ✅ P2 BACKLOG 计数勘正两处（上文已勘）
- P3 挂账：~~sendOnce channel 死参数~~(已删@cd4ba28,找茬批划线)/bulk 缺逐件隔离/.env.example 缺 9 键(MAIL×6+SMS/PUSH/SENDGRID——找茬批扩正)/sendVerificationCode 文案变更未申报——归通知域接入批顺手清

### 订单快照批开工（2026-10-11，用户裁决 A+开工令）

- **方案 v4 定稿**（三席调研+三席审核全卷=docs/order-snapshot-research.md）：五收口/每单哈希链+git 森林锚/四项对账+第三域漂移/PII 出哈希面+ANONYMIZED 事件行/保存期 3-10-30 年分层/fail-closed/工期阶段 0-4 五段(下限和 6.0+风险缓冲=6.5-7.5 天)
- **用户裁决**：注销用户历史订单=骨架保留+PII 脱敏（A）——3/10/30 年保存期优先，个保法以脱敏满足
- **阶段 0 完成**：tag order-snapshots/start✅；verify:audit ESM 断点复活✅（1603 条链首尾相扣，dist 无毒化——标记文件被历史清理批误删而 nest-cli 排除条款仍在，恢复即活）；全卷归档✅
- **排期声明**：快照批先于 W-1 刀2/刀3；顺带修 census⑤（orders 事务内事件外发）；支付批一/退款回写挂账行加"必须经 update() 单调用收口"注

### 订单快照批·双盲审 A1+B1 归案整改（2026-10-11，里程碑1审后）

- ✅ PII 哈希定案回写正身卷（B1——snapshot JSON 整列入哈希，#25 读时脱敏使 PII 不可变）
- ✅ operator 归因透传（B1——update() 加 snapshotContext 可选参数；markPaymentSucceeded/Failed 传 SYSTEM_LISTENER+correlationId）
- ✅ dumps/ 入 .gitignore（B1 卫生项）
- ✅ 0cf6f94 prettier 8 error 修复（A1 范围外移交项）
- ⏳ **P2-1 生产建表缺口**（A1）：order_snapshots 无迁移文件——生产 synchronize=false 下首 INSERT 即 fail-closed 全中断。期=阶段1余量（CLUSTERED 迁移与 create()/delete() 收口同批）
- ⏳ **P2-2 appendSnapshot 零直接测试**（A1）：最高风险逻辑（原生 SQL/MAX+1/两步写哈希/零变化跳过）全被 mock 掩蔽。期=阶段1余量（backfill 时补真库 spec——repository.spec 先例 :memory:）
- ⏳ P3 挂账：appendSnapshot 无运行时守卫拒互斥外调用/occurredAt 秒级格式 vs audit .SSS/buildPayload items 无 Array.isArray 守卫/update 返回值丢 user 关系/spec buildPayload 是真实现的复制品（mock 漂移隐患）
- **A1 总判"dev/test 里程碑可交付"**+两附带条件（①生产禁行直至迁移落地②appendSnapshot 测试覆盖债须偿还）
- **A1 承重断言全部复验对上**：46/873/tsc 0/eslint 0/verify:audit 1603 链 7ebc9f6e 实测吻合

### 自洽及反过拟合小组归案整改（2026-10-11，两席——里程碑1审后第三轮）

**席A（自洽）+ 席B（反过拟合）双席归案。总评：修因成色高，失分集中在"宣称与实况的缝隙"。**

- ✅ **P1-1 census⑤ 原发点打回重修**（席B）：create() 的 publishOrderCreatedEvent 仍在事务回调体内（orders.service.ts:191），三处宣称"已修"失实。已外移到互斥块返回后+spec 补 setImmediate 等。**本批最重发现——census 点名的原始位置被漏，只修了 update 侧两个 status 事件。**
- ⏳ **P1（席A F1）链核双端加载声明失实**：order-snapshot-chain.ts 头注释宣称可 strip-types 加载，实测 orders/ 目录无 ESM 标记即抛 SyntaxError。阶段 2 verify:orders 通道开工前必修。期=阶段 2 前置。
- ⏳ **P2（席A F2）B1 整改零断言保护**：operator 归因透传（snapshotContext）全被 mock 掩蔽，回退后 75 测试仍绿。期=阶段 1 余量（appendSnapshot 真库 spec 同批）。
- ⏳ **P2（席B）哈希 Date 分支字节不稳定**：TiDB/mysql2 回读 Date，String(Date)=TZ/locale 依赖字节；audit 先例 formatCanonicalDate 被引用未使用。**方言 drift——spec 与 dev 全绿但生产分支既零测试又实现有缺陷。**期=P2-1 迁移同批。
- ⏳ **P2（席B）FOR UPDATE 防线为注释非代码**：注释宣称"TiDB 由调用方 FOR UPDATE+主键冲突兜底"，全仓 grep 无 setLock/pessimistic。期=阶段 1 余量。
- ⏳ **P2（席B）字节不变护栏自言反复**：spec 无 64-hex 字面常量，全部用当前实现自算。#29 任务书"断言 headHash 常量"未落实。期=阶段 1 余量。
- P3 入账：correlationId 语义漂移(merchantOrderId 非 paymentOrderId)/8 键序无设计锚/spec fixture .SSS vs 写侧秒级/update 返回丢 user+观测消失未标注/mock 复制品 drift/prevHash NULL 兜底不 fail-closed/六档边界文档缺口/列名风格迁移耦合/dev 主库尚无 order_snapshots 表

### 低质量代码检查小组归案标注（2026-10-11，两席——只查只标注不修）

**席C（简明/重复/可读）评分：6.5/10；席D（性能/并发/低效）评分：6.0/10。**

**真冗余（最高价值——席C C-2）**：
- ⚠️ `src/orders/enums/order.enums.ts`（25 行）**全文冗余且值集合与 entity 不一致**：同模块 `entities/order.entity.ts:22-36` 定义 `OrderStatus/PaymentStatus`，`enums/order.enums.ts:1-25` 又定义一份——两边并存且**互斥字段不同**（entity 有 `PAID` 无 `PROCESSING/REFUNDED`，enums 反之）。生产零引用（grep 全仓零命中）。是**真定时炸弹**——任何依 enums 版本的代码会因 entity 不同而炸，依赖反之。期=阶段 1 余量同批治本（清理残留 + 修正值集合），治本路径=删 enums/order.enums.ts 整体，迁 PaymentMethod 至 entities/（PaymentMethod 仍有引用），OrderStatus/PaymentStatus 单源 entity。

**真并发病（席D P0/C5）**：
- ⚠️ `create()` 不写 v1 genesis 快照——链完整性 bug。期=阶段 1 余量同批治本（create() 收口时一并落 v1，与 delete() 软删 + user-deletion 同一 commit）。

**真性能/并发隐患（席D）**：
- C1 MAX+1 并发（FOR UPDATE 防线注释悬空）——期=阶段 1 余量（真库 spec 同批补）
- C4 runExclusiveWrite 全局写串行（TiDB 1 路/秒）——期=迁移同批（拆桶到表键哈希分桶）
- X1 二级索引 DDL 缺迁移文件（索引活在 TS 元数据层）——期=P2-1 迁移同批
- I4 computeChangedFields 算两次——期=任一批修（同批单笔写精简）

**可合并（席C C-1/C-3/C-6）**：
- `update()`/`updateStatus()` 35 行重复——挂账（updateStatus 是 spec 测试驱动器，合并改 spec 路径）
- markPayment* 5×2 行模板——可合并
- `payment:` 魔字符串 2 处——可提取常量

**过期 API（席C B-4）**：`String.prototype.substr` 弃用建议（recommend substring/slice）——挂账，可改 `slice(2, 11)`。

**review-批内** 已发现的"硬编码 5 收口"非真硬编码——设计点是 `SnapshotOperatorType` 枚举六档，调用端按上下文显式拼装（管理员/系统监听/支付回调等），多态抽离收益<维护成本。

**性能/资源量化（席D）**：
- 30 单/日×5 更新/3 年=16 万行（~250 MB，SQLite OK）
- 1 000 单/日×5/3 年=550 万行（~8 GB，**方案无 TTL/归档策略——待补**）
- update() 累计延迟：SQLite ×3（~1ms→3-4ms）/ TiDB ×2（~20-30ms→50-70ms）

**索引评估**：
- 文档 #31 承诺 (operator_type, occurred_at) 二级索引——**与端点诉求不匹配**（现无任何跨单快照读取端点）。X3 实证 (orderId, version) 复合主键已覆盖全部现有读侧查询；如非必要——**索引 #31 多余**，建之浪费维护成本。

### 双盲审第二轮归案标注（2026-10-13，审 4 批系统治本）

两席归案。三承重级折扣（双盲 A）——本批已当场修：
- ✅ 算 1 次真兑现：changedFields 缓存变量在 line 172 INSERT 构造复用（line 178 直接引用，不再二次 computeChangedFields 调）——短路判与 INSERT 构造共用
- ✅ migration dead code 清：删 isMysql 变量及其冗余 SELECT 1
- ✅ dumps/ 真入 .gitignore（双盲B1批 0cf6f94 仅提了 __pycache__/dumps/ 作用域错——本批补 dumps/+库 dump 卫生项）

余下待修/挂账续属：
- ⏳ **FOR UPDATE genesis 路径盲区**（双盲A 抓）：v=1 时 SELECT 无行可锁→并发双事务同 MAX=1→双 INSERT(v=1)→PK 唯一约束兜底→user 视角偶发 500/409。可加 "ON DUPLICATE 冲突重试（最稳 PK 兜底语义）"——非未修，是兜底语义的精细化。期=阶段 1 余量真库 spec 同批治本。
- ⏳ **PG 方言独立分支+JSON 列退化**（双盲B 抓）：当前 else 走 SQLite 形（TEXT+双引号标识符+INTEGER）——PG 接受 SQL 但 JSON 列退化为 TEXT 而非 JSONB。期=PG 部署前独立批。
- ⏳ **TiDB CLUSTERED 显式落实**（v4.1 #P3-7 抓）：DDL 文本"PRIMARY KEY (orderId, version)" 未带 CLUSTERED；功能等价（InnoDB/TiDB 默认聚簇）但与方案文本直接抵触。期=DDL 补 commit。
- ⏳ **数字三件套口径限定语**：本批 commit message 已附"46 套件=backend/jest.config.cjs 全量(2026-10-13)"，下次批保持。
- ~~**F2 ESM 通道修**~~（**已修@2026-10-13**：链核挪 orders/snapshot/ 子目录+自带 ESM 标记+nest-cli brace 排除+tsconfig rewriteRelativeImportExtensions+jest spec 通道剥后缀；探针=strip-types 裸加载绑定完整 PASS；dist 防毒化=find dist -name package.json 空）
- ⏳ 真库 appendSnapshot spec / 二级索引按需 / 日期分支 formatCanonical / 拆分写串行（挂账续）

## 不修项

**开放安全项（有缓解、未根治——fork 接手者优先看）**：
- Casdoor OAuth state 用 Math.random 且回调不验 state（auth-proxy.service.ts）——IdP 未接通属休眠，接通前必须先修
- user 实体 password 列无 select:false、全局无 ClassSerializerInterceptor（热路径已在 service 层剥离缓解）；js/auth.js 仍有密码框 DOM console.log
- log-analytics SQL 字符串拼接注入面（已收 admin-only 缓解，参数化未做）
- Swagger 非生产默认开且 openapi.json 落盘；日志 query 脱敏未做；CSRF 模板占位符原样存活
- gopay Dockerfile COPY .env* 入镜像层；nginx 安全头/TLS 未做；workflows 全裸 tag 未锁 SHA
- Tailwind CDN 无 SRI（同页 font-awesome 有，反差自证）

- **支付未接线**：策略层 fail-closed（缺签名/验签失败即拒），无真实网关对接
- **前端购物车服务端同步**：`js/cart.js` 调 `/api/cart` 根路由（不存在），本地优先模式（见 safety.md 标注）
- **首页"加入购物袋"按钮无数据源**：购物车内容经订单页"再来一单"或控制台填充
- ~~**28 条 SPA 死链**~~（**已下账 2026-10-06 收官审计**：第四轮 C11 假门收敛+M7 footer 死链降纯文字+returns.html 真链落成，问题不复存在）
- ~~**首页"加入购物袋"按钮无数据源**~~（**已下账 2026-10-06 收官审计**：F7 bento+M3 后第四轮施工，按钮挂 API 渲染卡片与 FALLBACK 双路，加购反馈系统 B1 全链实测）
- **前端 Playwright 套件**：5 个 spec 端口漂移（5173 vs 4173）+ 标题断言过期，弃管
- **nav-button 僵尸三件退役（2026-10-06 Playwright 测试升级席）**：nav-button-hover-test-optimized(294 行)/nav-button-smooth-hover-test(758 行)/nav-button-state-fix-test(617 行)整体删除（git 历史即归档，fe12d55 为删除前最后存活版）。考古结论：三件针对已退役的 .navbar-luxury/.nav-link-luxury/data-state 旧导航体系（腕表珠宝/香水/手袋），其中两件已带 2026-10-03 skip 标记、state-fix 件仍在跑=烂尾红×4（退役前基线实测 6 failed）；存活行为（hover 态切换语义→site-header.js 的 .site-nav a 下划线 scaleX + aria-current）已重锚为 tests/site-header-nav.spec.js（41 行）。同批退役的还有 cart-refresh.spec.js 的 Blob URL 释放断言域（[data-cart-icon] 图标 svgBlobUrl 切换机制已随 F4 归一消亡，全仓 grep 零命中）
- **依赖残留**：生产树 22 项（0 critical / 8 high，全为间接依赖）；swagger 内嵌 js-yaml@5.3.0（dump-only 路径不可达）
- **JWT_SECRET 开发回退为已知固定值**：生产黑名单拒启，开发共钥风险已知
- **Casdoor 前端直连未启用**（后端代理链路在）；邮箱验证为本地降级；AI 助手未接线
- **通知 test/bulk 内联 body 无 DTO**（admin-only 缓解）；前端 URL 值无协议限制（转义有、协议白名单无）
- **Redis 缺失时启动日志刷屏**（降级语义正确）；OpenObserve/监控栈未部署

- **假遥测与卫生债（已知不修）**：logAuditLog 伪 id/getAuditLogs 恒空、MetricsInterceptor 双注册、时序攻击空壳测试×2、security-monitoring 四端点硬编码 success:true、新旧 CacheService 双轨、D8 僵尸命令四件（config:generate/file:.. 自引用/PM2 入口漂移/scripts 包边界）、webpack 生产 source-map、孤儿模块四控制器（见 safety.md 支付行警示）
- **挂账区（产品决策类，永不自动开工）**：logout 服务端令牌黑名单 / verify-code 邮件 provider 选型 / 实体收敛触发器（真实 MySQL 部署时） / register 返回语义（201+token vs 纯 201）/ 中文用户名支持
- **M6 台账哈希链生产化挂账（2026-10-05）**：backfill-audit-chain.mjs 为 SQLite 方言（node:sqlite），真实 MySQL/TiDB 部署时需按同一定序规则（createTime ASC, id ASC）另写重锚脚本后跑生产迁移 20261005000001；--anchor 的 git commit 人工执行，CI 自动挂账为可选演进不静默
- **M3 双盲审修复批挂账（2026-10-05，四席裁定 P2 记账）**：① audit verify 端点（GET /audit/verify）全表读 audit_logs 无上限——行数增长后单请求内存/延迟无界（admin-only 缓解，增量校验或游标分页随归档策略一并做）；② 商品图 404 无 onerror 回退——坏图地址渲染为裂图（img 加 onerror 换占位图，随前端图片组件打磨）；③ audit_logs 永久增长存储代价——链式台账不参与滚动清理（删行即断链，四席裁定真链史留存），归档/分表策略挂账
- **M3 双盲审修复批已知限制声明（2026-10-05）**：① 锚窗口无界——锚行之后到下一锚之间的增删（直接改库）机器不可检，verify 的 PENDING_ANCHOR 输出已附提示"锚定间隙内的增删需人工 git diff 兜底"；② 全局写互斥（backend/src/common/db-write-mutex.ts）为进程级单队列——单实例 sqlite 是正确层，多实例写同一 sqlite 文件需文件锁或迁 PG；未注册 app.module 的 address/payment 服务事务若激活须先接入 runExclusiveWrite；③ PG 部署形态下该互斥无害只是多余串行（不改变正确性，可保留或降级直通）；④ 并发下单冲突面语义化后：库存不足=400、乐观锁竞争=409（重试可解）；高频同品竞争下吞吐受 sqlite 单写者串行约束（方言固有）
- **实战检验挂账（2026-10-04 实战检验反查组三席+修复记录）**：① audit 写操作覆盖不全——上传 201 无审计行、失败尝试（403/404）零痕迹、ip 恒空串，随 M3 管理界面一并补；② 真实安全响应头（X-Frame-Options/nosniff 经 HTTP 头而非 meta）随 F4 login CSP 收紧一并做（login.html 三个无效 meta 已删）；③ cart.js 游客态调 /api/cart/items/guest 得 401 属正确拦截，前端静默化处理随"购物车服务端同步"挂账项；④ checkNameImage 词表外包型红拦报文措辞与事实不符（P3，js/shared/integrity-rules.js 已修叠词过拦，报文待润色）；⑤ 上传端点无配额/频控（admin-only 已缓解）；⑥ **PATCH /api/products/:id 带 images（string[]）触发 TypeORM 跨一对多 500**（M1 遗留，DTO 字段灌 repository.update 直撞关系列；admin UI 已规避不传并注释；正确修法=update 前剥离关系字段或实现多图画廊写入，随 product_images 表启用一并做）
- **实战检验战果（同轮，已修不复存在）**：游客图标劫持（bindUserIconClick 绑容器+内联脚本无条件跳 login 双根因）、搜索建议 [object Object]、缓存 TTL 毫秒/秒单位错位（全站缓存 0 命中，修复后 miss→hit→hit 实测）、引擎在线 isActive 两回流面、@ApiQuery 三行失实、上传 polyglot（结构完整性校验补齐）、M4 叠结构词过拦假阳性
- **审计改判记录（2026-10-04 反查席）**：里程碑一竣工验收"13/13 通过零 P0"改判为"范围内达标，活站带 1 P1+2 P2"——方法以代码存在+视觉尺寸为主、缺交互与运行态行为验证；上轮审计对 jest"零偏差"表述未充分披露 44=环境型失败数。改判教训入 remediation-ledger：**验收必须含交互级实测（点击行为/缓存命中/运行态）**，纸面"类名都在"不等于"契约活着"
- **修复批已知限制补登（2026-10-05 四修批遗漏补记，Y2 盲审 P2-1 裁定）**：① 条件 UPDATE 与普通 update 两语句无事务包裹——崩溃窗口存在部分写可能（选型可辩，admin-only 低危）；② 软删品（isActive=false）仍可被 PATCH 改价（上架语义与价格语义解耦，未做门禁）；③ PATCH 未提交 tags 时不回扫存量 tags 的禁用词（写面已修，存量脏数据治理另列）；④ 跨书写系统同形字（西里尔 о↔拉丁 o）需 confusables 映射表，不引库；⑤ 片假名长音符 U+30FC（ー，Lm 类）仍可用于拆词——剥它误伤合法日文，挂账待裁；⑥ 感叹号面与词表面不对称：可见标点混排"！·！"不折叠不命中多感叹号（三修行为一致非回归，两层分工所致）；⑦ toNumberOrNull 的 HTTP 面由 @IsNumber 前置拦截，直调面宽松形态已收紧但 service 直接调用方的对象构造契约依赖键存在性
- **五修批已知限制补登（2026-10-05 四席盲审终局裁定）**：① tags 数组无总量上限（单元素 50 字已闸，100×50=5KB 合法，挂账产品决策）；② isActive 无 @IsBoolean（预存：任意字符串落库，admin-only 可逆，随下次 DTO 打磨）；③ tags/mainImage 的 null=清除语义与四字段 null=未提交在 DTO 内不对称（声明：tags:null 静默清空为既有语义）；④ ³/①/½ 类 NFKC 折数字与 \p{N} 数字注入面属白名单固有取舍（禁用词全为 \p{L} 汉字，数字注入不增风险，声明不治理）；⑤ 事件模式面无 originalPrice 字段（事件契约既有形状）；⑥ factCard 值本身不过 lintCopy（事实卡是选词面非自由文本，词表冲突另管）；⑦ 遗留脏数据（含禁用词的存量）任何 PATCH 被闸冻结至洗白——fail-closed 特性非缺陷，如实声明；⑧ 希腊问号 U+037E/数学字母表/全角字母等 \p{L} 内字符可拆词——白名单固有面（与禁用词同族字符才有拆词意义，中文禁用词不受影响，声明）
- **里程碑二审计挂账（2026-10-04 收官审计 P2 项）**：① noscript 降级模式下移动 375px 的 .site-nav 塌 0 宽（分类导航不可达，brand/登录/订单链接仍在）——降级路径边缘场景，随下次 noscript 兜底打磨；② login-enhanced.js 覆写 login-utils 密码强度条 DOM（存量，两侧行为一致，bars 类 safelist 已备）；③ dist 里 entry CSS 被 vite 命名为 site-header-*.css（内容正确，命名归一属构建美化）；④ jest 环境型失败验收口径注明 **44±2 抖动带**（同机三跑两见 46，差异全在 config/cqrs/email/logging/redis 五个基础设施套件，代码域零失败——防未来验收误判）；⑤ admin.html 的 .hidden !important 已加纲领声明注释（JS 开关工具类语义，非压症状）
- **权益批验收记账（2026-10-06 收官验收 P1+P2）**：① P1 audit 脱敏机制空转——AuditInterceptor 全仓从未注册，注销事件零审计行、[已注销] 历史零条、3s 补脱敏为死代码；带审计历史账号（admin）注销会使 recordHash 失配需重锚——上线前必修（注册拦截器或删死代码+重锚机制）；② 级联断裂面——notifications（494 行活表）/payments/users_receive_address 三表不在 DELETE 级联（当前零孤儿，上线前补）；③ PDP footer 两列仍是未开通降纯文字过时假话（privacy 已成文/邮箱已有占位）——下批顺修+经营者块补 PDP；④ gucci 残留三处库内文档（.codebuddy/backend docs——非产品面）；⑤ profile-manager 440 行删行塌陷（工艺）；⑥ orders JSON-LD 缺尾句号
- **正题批战果（2026-10-07 务实排序前五+wishlist 保险，全量 chromium 56 过/0 败/2 跳·workers=2·2.0m）**：① A1 两端字符集对齐（[^A-Za-z0-9]→[@$!%*?&]，Reich2026# 死亡路径闭合）；② B8 跨 SKU flush（旧窗 toast 不再被吞）；③ 登录/注册腰斩 toast 删除（400ms 跳转下不可读的冗余反馈）；④ 游客订单态收起假交互面（#orderControls 隐藏/展开恢复，a-lane 回归锁随行为重锚 toBeVisible→toBeAttached——有意变化按纲领第 5 条如实标注）；⑤ 三页页脚隐私政策死文本激活真链；⑥ wishlist 损坏自愈守卫（与 cart 同款）
- **回炉批战果（2026-10-07 求真务实组四席审正题批后回炉，全量 chromium 数字见 commit）**：① P1 回炉（四席共中）：撤 orders.html #orderControls 烤死的默认 hidden——登录用户搜索/筛选 100% 蒸发的未申报回归闭合（js 游客态动态隐藏已覆盖动机，html 出厂不该带状态）；② a-lane 重锚收窄（三席共中）：index 探针恢复 toBeVisible（旧改超动机弱化），orders 单点 attached+#orderControls 游客态 toBeHidden 真锁，托付指针虚指（"A9 管"失实）修正；③ A9b 新锁：seed 登录态断言 #orderControls 可见（防同类回归——假 token 401 路径走 loadDemoData 不隐藏）；④ 小件三件：spec 陈旧注释（"一闪即走"场景已死）/cart.js 120ms 出场缓冲注释+叠放后果声明/注册错误文案列六类白名单；⑤ 记账勘正：终验③划销（qty "02" 死于正题批归一化，漏划）/profile-manager 三处勘正一处/挂账口径数修正
- **密码口径全域归一挂账（2026-10-07 求真务实组两席共中，回炉批立项）**：A1 对齐的只是注册闸——页内仍有三套并存：① login-enhanced.js:385 强度计 symbols 类含 #（"Reich2026#"被评"很好的密码"却被闸拒，自相矛盾反馈）；② login-utils.js:349 旧强度函数 [^A-Za-z0-9] 第三口径；③ 改密端 update-user.dto.ts:21-22 全串字符类限制（Reich@2026# 注册两端过、改密 400——纪检席观察）。四口径一次归一，随下批 auth 域施工
- **双盲验收修复批战果（2026-10-07 阶段性双盲四席裁决后，全量 chromium 数字见 commit）**：① P1×2 同根修（X1/X2 共中）——normalizeApiOrders 归一边界统一 String：后端自增数值 id 旧写保留数值致两条死路（搜索 toLowerCase 抛 TypeError 列表永不过滤；动作钮 onclick 字符串与严格等值失配五处静默死钮——详情/再购/发票/退货/取消），一处修两 P1（pre-existing 7016f2e 起即有，双盲验收落在回炉批宣称面内抓出）；② 注册错误文案重写（X1 F2"六类"实为七个符号计数错+Y2"与后端一致"工程腔）——"密码至少 8 位，需包含大写字母、小写字母和数字，符号可用 @ $ ! % * ? &（其余符号暂不支持）"；③ A9c 新锁——route 拦截注入数值 id 订单走完整真管道（fetch→normalize→过滤→渲染），搜索有果/无果+零 pageerror，锁住归一化层（单跑 10.2s 绿）；④ 记账归属勘正（qty 归一化归功 7d4cf70）
- **MeiliSearch 引擎接线战果（2026-10-07 用户裁决 A 方案，全量 chromium 58 过/0 败/2 跳·workers=2·引擎在线）**：架构考古发现项目自带双引擎搜索层（MeiliSearch 主+Zinc 备，策略模式+健康检查+自动降级）从未通电——Docker 缺失（Desktop 残迹）改走官方 Windows 单文件 v1.7.4（gh-proxy 镜像下载，115MB；ghproxy.net 给过 14.5MB 截断废件）；backend/.env 接线 SEARCH_PROVIDER=meilisearch；**存量同步缺口补齐**：原代码只有商品增改时增量索引、无存量入口（引擎"摆设"的根因之一），立 scripts/reindex-meili.mjs（形状与 transformProductForIndexing 逐字段一致）灌 6 件；启停固化 scripts/meili.sh（PowerShell 环境变量大小写冲突坑：需 env -u 清 proxy 族）。链路实测：引擎直搜中文命中✓/后端 /api/products/search 走引擎（前端查询层本就调此端点——零改动吃上引擎）/建议接口活且自带 <strong> 高亮与热度（minCharacters=2，A8 当年"形状不匹配"的接口现返回 [{text,popularity,highlight}] 数组）。.gitignore 遮蔽 115MB 本地件
- **搜索层移交下批（2026-10-07 A 方案验证后立项）**：① 建议层前端切回决策——现前端建议走词池内存过滤（A8 方案，永远可用），后端建议接口现已提供高亮+热度排序（更优但依赖引擎活）；混合方案（API 优先+词池兜底）待下批裁决施工；~~② Zinc 备引擎零验证——compose 定义在但从未跑过（本机无 Docker，验证需另寻路径）~~（**已下账@2026-10-07 Zinc 实测批**：v1.0.0-beta3 Windows 单文件起+灌 6 件+后端 v0.x 搜索 DSL 全兼容（match/手袋 4 hits/错字容错生效）；**发现并修复健康端点版本漂移**——后端 /api/health 在 1.0 返 404，healthCheck 改双端点探测（旧 /api/health+新 /healthz）；**降级链大考通过**——杀 Meili→38s 后搜索仍 200 且错字"手代"命中手袋排第一（区分于 SQL 兜底），fallbackStrategy 实战首证；scripts/zinc.sh+reindex-zinc.mjs 固化）；③ 商品上下架/删除的索引同步仅 create/update 两路挂了钩（products.service:242/:701），删除路径未查；④ meili 容器方案 vs 本地 exe 双轨并存——compose 的 meilisearch 服务定义与本机 exe 模式二选一收口
- **Zinc 备引擎实测战果（2026-10-07 用户令"测试zinc"，全量数字见 commit）**：起（gh-proxy 下载 v1.0.0-beta3 Windows tar.gz 18.9MB）/灌（reindex-zinc.mjs 6 件）/搜（后端 search_type:match DSL 全兼容+错字容错）/健康端点漂移修复（zincsearch.service.ts healthCheck 双端点——/api/health 旧版+/healthz 新版，nest build 后生效）/降级链大考（杀 Meili→30s 监控切 Zinc→错字查询命中+相关性排序工作=真切换非 SQL 兜底）/Meili 复活回主。双引擎互备至此全通
- **MeiliSearch 升级批战果（2026-10-07 用户令"升级"，全量 chromium 58 过/0 败/2 跳·workers=2·v1.54.3 在线）**：v1.7.4（compose 钉的两年前版本）→v1.54.3（2026-10-01 发布当前稳定线）。下载 336MB 断点续传两次（600s 超时踩一次）；索引格式跨 47 版直接弃旧数据目录重灌（reindex 脚本 6 件 10 秒）；**质量对比无破坏**——手袋1/皮革5/渐变手袋1 全同基线，"包"4→6 更宽、"手代"2→1 更准（容错聚焦化），全部 0-2ms；后端 API 端到端活；compose 镜像同步拉齐 v1.54.3；旧二进制留 .bak 本地（gitignore 遮蔽）。升级收益兑现：两年安全/性能修复+混合检索与 MCP 端点等新能力在库
- **"智能且快"搜索批战果（2026-10-07 用户令"我们需要智能且快的搜索效果"，全量 chromium 58 过/0 败/2 跳·workers=2）**：语义+拼音+混合检索三件落地。① **语义向量**：EmbeddingService（transformers.js+bge-small-zh-v1.5 q8 量化 24MB 本地模型，CPU 推理 10-20ms/条）——商品入库带向量（name+description）、查询带向量走 Meili hybrid（semanticRatio 0.5，embedders=userProvided 512）；模型不可用自动降级纯关键词。② **实测质变**："能装东西的"0→6 件（第一名渐变褶皱手袋）、错字"手代"命中手袋第一名、稳态端到端 14-18ms（首查 142ms 含模型懒加载）——智能与快同时达标。③ **拼音建议**：pinyin-pro UMD 本地 vendor（324KB），建议层三档拼音评分（首字母前缀 sd/全拼前缀 shoudai/全拼包含），实测 shoudai→手袋、boshidun→黑皮波士顿包。④ 施工坑五记：npm postinstall 需 ComSpec（本 shell 空）；transformers.js Node 端不走代理且 HF_ENDPOINT 失效→模型本地化；settings 类端点 v1.54 用 PATCH；ESM import 按**文件位置**解析（reindex 移入 backend/scripts）；CRLF 行尾让一切跨行 str.replace 静默失配（本轮 MISS×3 全因它）。存量灌数=backend/scripts/reindex-meili.mjs（带向量版）
- **语义搜索真相案（2026-10-07 夜，重派Y1验收席戳破+协调者三小时诊断，全量 chromium 58 过/0 败/2 跳·workers=2）**："智能且快"批的后端语义路径**从未工作过**——历次"端到端验证"全是复合假阳性（详见下），三处隐藏 bug 当夜修复后 q= 真路径全通（错字/口语/拼音/英文全 6 件命中，稳态 19-39ms）。
  - **假阳性机理**：后端搜索只认 `q=` 参数，协调者历次验证用 `keyword=`（不被 controller 读取）→ 无关键词分支返回**未过滤全目录** → "6 件命中"的表象；另一路（q= 真调用）Meili 403 密钥错 → 静默降级 SQLite LIKE → "手袋"返回 1 件也有结果——两条假象叠加，四批施工（Meili 接线/Zinc/升级/智能快）的后端层验证全部失真
  - **三处根因**：① Zinc SSRF 防护 host:port 对比 bug（allowedHost 含端口 vs hostname 不含→永不相等，**Zinc 搜索从第一天被自家防护拦死**——zincsearch.service isValidUrl，已修 host 同口径）；② Meili settings 端点 PUT→405（v1.54 只收 PATCH，**initializeIndexSettings 从未成功**→filterable 空→带 filter 查询 400，已修全部改 PATCH）；③ Meili 密钥 fallback 'masterKey' 与实际不符（仓内两个独立 ConfigModule.forRoot，unified-master 的 load 不保证到达服务——已加 process.env 兜底链）
  - **方法论教训（重大，入记忆）**：验证必须用真实调用面（前端实际发的参数/头部）+ 降级路径必须可观测（静默 catch 是假阳性温床）；"有结果"≠"走到了你要验证的那条路"
  - **连带修正**：Meili 索引 settings 手动补配（searchable/filterable/sortable 齐，直连带 filter hybrid 200）
- **UI 热心用户批 P1 施工（2026-10-07，全量 chromium 58 过/0 败/2 跳·workers=2）**：四席审查（移动党/购物流程党/强迫症/美学党）60+ 条中 P1 十件落地——①iOS 缩放坑三处（login/register 输入框 12→16px、waitlist 邮箱框 14→16px——<16px 聚焦即自动放大整页）；②"（示例数据）"四字摘除（信任自我拆台，product.js:211）；③价格格式双轨收口（~~formatPrice 补千分位 ¥300,296.50 可读~~【虚报勘正@修复循环：千分位当时 node-replace 静默失败未落盘——验收三席实证无代码，修复循环真写入并实测 ¥300,296.50 ✓】+ 网格统一走 formatPrice + 修双 ¥ bug：模板硬编码 ¥+formatPrice 已带 ¥）；④密码强度计字符集与闸门同口径（login-enhanced.js symbols 类改 [@$!%*?&]——旧集含 # 等闸门拒收符号，强度计说"很好"却被拒）；⑤showError 补 focus+scrollIntoView（提交失败静默不聚焦，十年网龄测三次才注册成功）；⑥订单页错误按状态码分文案（session-expired/server-error/network-error 三态——旧写把后端故障说成"尚未登录"误导已登录用户）；⑦首页骨架接入（.skeleton CSS 建好全站零引用→boot 注 3 卡占位，API 在途期实测骨架 3 块+aria-busy，消灭 0px 空洞+1249px 跳动）；⑧移动端吸底标签栏（js/shared/mobile-tabbar.js 七页注入：首页/手袋/袋[打开购物袋+角标同源]/我的，桌面 @media 隐藏）；⑨orders 搜索钮 18×18→44px（全站最小点击物）；⑩双色款颜色选择器（product.js variantPicker——描述含"X与Y(两色可选|各一只)"触发两枚 chip 纯前端选择+CSS，实测双色糖果链条包出薄荷绿/樱花粉两 chip、单色款 0 chip）
- **UI P1 修复循环战果（2026-10-08 双盲验收四席不通过后，全量 chromium 58 过/0 败/2 跳·workers=2）**：九件修复——①千分位真写入（¥1,000/¥300,296.50/¥1,234,567.89 实测）；②showError focus+scrollIntoView 真写入（实测聚焦到 login-password）；③iOS 缩放真修（enhanced-responsive.css 三断点 12/14px 全改 16px——旧修被后载 CSS 反杀 390 实测仍 12px，现 16px ✓）；④手袋 tab 改指 index.html#featured-collections（与桌面同落地，裸 product.html 落售罄空态三席共中）；⑤network-error 传参断链接通（"网络不太顺"文案实测出现）；⑥徽标 SVG 保活（改 .demo-badge-text 子元素只更新文字不再覆写图标）；⑦PDP 双吸底避让（atc-bar ≤768px 上浮 62px 让出 tabbar，elementFromPoint 命中 tabbar ✓+toast 抬升同步 131px A7 锁过）；⑧tabbar 角标冷载补点亮（注入后读 reich_cart 补显，实测 3 件显"3"）；⑨颜色正则修复（字面 s→s，Candy与Mint 触发 ✓）+色名 escapeHtml（属性注入面收口）。**施工纪律教训（重大）**：node-replace 无 MISS 检查=静默假成功——两件虚报（千分位/showError）均为 replace 失败+假 done+未实测就 commit 的完整链条；修复循环全部改用 Edit 工具+逐件浏览器实测
- **UI P2 批战果（2026-10-08 P2 前 10 件，全量 chromium 57 过/1 败/2 跳·workers=2——败件 m4 两色可选隔离过属抖动带）**：①F4 登录态头部统一（markLoggedInUser 补 href 改指 profile——旧写已登录用户钮仍指 login.html，回头客主场最伤）②搜索空态消静默（乱词输入建议框空白→"没找到「词」——试试 手袋/链条包/波士顿"，消"点了没反应"）③清空袋子钮扩 44px（旧 28px 破坏性操作难按准；两步确认语义已在 js 层）④心愿单文案改口（"存在这台设备上，换设备需重新收藏"——旧写"随时能找到"过诺）⑤跑马灯 11px→13px+袋内商品名/价→14px+按钮 min-height 44px ⑥PDP 收藏计数硬编码→"真实的喜爱无需数字背书"（信任诚实化）⑦页脚联系我们→mailto 活链 ⑧全站主按钮补 :active pressed 态（0.97 缩放——旧仅 20 条 vs hover 98 条）⑨login 邮箱/密码补 enterkeyhint=next/go+autocapitalize=none（iOS 键盘体验）⑩建议加图价（数据面有 productPool 现成——本批未做，需建议项结构改造，记下批）
- **服务运维**：本地双服务起停已固化为 `bash scripts/dev.sh start|stop|status|restart`（后端启动 60-90s 属外部依赖重试所致，非故障；vite 绑 IPv6，探测用 localhost）
- **流程体验官轮⑥审移交下批（2026-10-06 四席盲审 P2/P3 记账）**：~~① X1/X2 共中·A1 两端字符集矛盾残留——注册前端允许 `[^A-Za-z0-9]` 任意特殊字符、后端只收 `[@$!%*?&]`（`Reich2026#` 前端过后端 400），且 flow-experience spec 注释"前后端同规则一致"失实（js/auth.js:316-325 vs backend auth.dto.ts RegisterDto）——下批对齐字符集+改注释~~（**已下账@2026-10-07 正题批**：js/auth.js validatePassword 特殊字符类对齐 [@$!%*?&]（backend auth.dto.ts @Matches 同款）+flow-experience spec 注释改真口径）；~~② Y1·B8 跨 SKU 吞 toast——500ms 窗内异 SKU 连加，后钮 clear 前钮 pending timer，前一只的 toast 整条被吞（修法=异 SKU 先 flush 旧窗再开新窗）~~（**已下账@2026-10-07 正题批**：cart.js else 分支补 flush——旧窗 toast 照常发出再开新窗）；③ Y2·单发加购 toast 迟到 ~620-750ms（旧版 ~120ms）——建议首击即出 toast、窗内续击就地改写同一条为"已加入 N 件"；④ X2·清空袋子后撤销复活单品——删 A→清空→点残留撤销→袋冒回 A（数据态一致但语义可辩，裁决卷未覆盖此交叉，产品决策）；⑤ X2·失败登录也种 last_email（写于 fetch 之前，共享机器预填污染面，B3 裁决未授权失败路径落笔）；⑥ Y2·量词分裂——"已加入 N 件"用"件"，全站既定量词是"只"（"总有一只先背"/"又放进一只"）；⑦ Y2·"随时在看"病句（应为"随时能看"，wishlist.js 副句）；⑧ Y2·"结算暂未开放"换掉全场最俏皮的"还没开门"——可两全为"暂未开门"；⑨ Y1/Y2 共中·页脚真链接与纯文字同色（--text-secondary≡--ink-soft，区分全押下划线）+小号链接触高 17px<24px 底线；~~⑩ Y1·游客态订单搜索框+筛选标签未随引导态收起（假交互面）~~（**已下账@2026-10-07 正题批**：orders.html #orderControls+showGuestState 隐藏/展开恢复；a-lane 回归锁随行为变化重锚（toBeVisible→toBeAttached））；~~⑪ Y1·登录/注册成功 toast 被 400ms 跳转腰斩不可读~~（**已下账@2026-10-07 正题批**：删两处腰斩 toast（auth.js 登录/注册侧）——跳转本身即成功反馈）；~~⑫ Y1·页脚"隐私政策"作死文本而 privacy.html 实存~~（**已下账@2026-10-07 正题批**：三页页脚死文本激活为真链（privacy.html））；⑬ X1·m3"B8 前后时序"潜伏耦合——m3"同款二次加购"锁隐性依赖 dismiss+再击 >500ms，快机器上撞 B8 合并窗会误红（当前绿）；⑭ X1·m4 oracle 内部化灰区——期望值读 sessionStorage 内部快照（注释已声明理由）；⑮ X1·perf 阈值放宽 2.5×/5× 后锁强度降为"数量级冒烟"（有口径有日期非静默，引用时勿当性能验收）；⑯ X1·pre-existing·localStorage 写满（QuotaExceeded）时加购零反馈静默死——saveCart() 无守卫；⑰ Y2·离线 40 词表永不参与词池成功时的补位（"托特/马鞍/云朵"行业词两端不命中）；⑱ X2·A8 词池 limit=50 硬上限——>50 件店建议层+同义词补齐将静默截断；⑲ X2·单字"包"建议列表浮出裸标签词条"手袋"（tag 入池化妆品级）
- **B11 时长冲突裁决记录（2026-10-06 ⑥审修复循环）**：裁决"取消收藏分量轻于添加——时长短/无按钮"中"时长短"与 toast 组件 5000ms 下限红线（js/shared/toast.js:178 Math.max 强制，罗马"移动端单手 4s 不够"）冲突——**用户裁决 B（2026-10-06）：维持 5.2s 不破例，红线终局**，"轻"由无按钮单要素承载，结案
- **⑥审修复循环战果（2026-10-06，已修待复核）**：① X2 P1 登录态袋蒸发——loadCart 的 `data.cart||[]` 对两个后端（NestJS 分页 DTO/mock {items}）恒得 [] 覆写本地，改本地优先（合法非空+形状守卫+本地空才补水）；② Y1 P1 袋行布局破碎——.item-image grid-area:image 悬空别名甩隐式末列（缩略图挤到 ×钮之后/名称压 72px 竖排），删别名规则+补 .item-image img 约束；③ X1/X2 共中 404 死重试翻倍——syncToServer 对 4xx 也返回 false 触发 1.2s 重试，改仅网络异常/5xx 可重试；④ X2 菜单直入 stale stash 劫持——stash 半无来源守门（TTL 内任何 index 加载消费卡点击快照），两半统一 back_forward/referrer 守门；⑤ 注释债两件——A3 spec 陈旧"已知红"战况留言更新为已转绿、cart.js m3"落点后 120ms 出 toast"时序口径随 B8 合并窗更新
- **⑥审复核轮移交下批（2026-10-06 复核四席 P2/P3 记账）**：~~① 三席同指·PDP 页内品牌链直回 index 消费 stash（refFromPdp=真放行，"点 logo 回顶部"的用户预期与"送回列表原位"存预期差，且新加载页高不足时回位钳位 873≠1200）——design-sanctioned 灰区，产品口味待用户裁决（修法方向=stash 半只认 isBack 或图片就位后二次钳位）~~（**已下账 2026-10-07 用户裁决 A**：stash/leave 统一只认 back_forward，品牌链落页首——施工见⑥审终判施工条，求真席复测相符）；② X2·跨标签袋覆写——无 storage 事件监听，旧内存标签页加购全量覆写 reich_cart 静默抹除他 tab 新件（本地优先单写者架构固有限制）；③ Y1·.cart-item/.cart-item-image 跨文件三重定义全靠加载序兜底（main.css:2654 display:flex 与 cart.css:328 display:grid 同特异性对打，main.css:2663 的 80px flex 时代规则为死代码泄漏）——未来任何页面颠倒 CSS 序即塌回 flex，清债非阻塞；④ X1·cart-refresh spec 并行负载下 stable 检查 30s 超时抖动（隔离/复跑均绿，与已记档 44±2 抖动带同类）——**抖动族补记（2026-10-07 求真席/对账席实证）**：同族还有 m2-cart-panel ①⑤（页装配 30s 超时）与 flow-experience A7（移动 toast 几何，两采样 2/2 败）及 m5-pdp 禁忌核验（1/2 败），定向复跑均过——满载并行下"计时/装配敏感件各败一、隔离即绿"为类属性，勿按单件归因。族成员补记（2026-10-07 回炉批，对账席）：+flow-experience A4 七页活钮（默认并行败/定向过）；⑤ Y2·注册路径无"记住我"入口（session-only 登录）与登录页双档隐性不对称，既有设计记档备知觉
- **⑥审续修战果（2026-10-06 复核后当轮收口，待终验）**：① 移动端袋行续修——图盒随断点轨同步缩（≤768px 56px/≤480px 48px，须置基线规则后同特异性后写者胜）+.qty-hint 绝对定位出流（旧 flex-basis:100% 撑 auto 轨至 193px 致名栏 49px≈3 字/行），390 实测 overlap -8px（8px 间距=设计 gap）、名栏细指针 176px/粗指针 124px（两档均达标）、步进列 86px；② 形状守卫首项制改 every() 全项（混合数组半生吞致徽章 NaN，两席共中）；③ loadCartSync/游客兜底损坏 JSON 自愈（旧裸 parse 抛穿构造器=整模块死亡全站加购死钮，X2 F1）
- **⑥审终验移交下批（2026-10-06 终验四席 P2/P3 记账）**：① X1·wishlist.js:32 构造器同族裸 parse（**半下账@2026-10-07 正题批**：wishlist.js 已加损坏自愈守卫——try/catch+非数组清坏数据；profile-manager.js 真裸 parse 仅 :156 一处仍挂（286/314 父提交已带守卫——求真席 P2-1 勘正"三处"系沿用终验原话未复核），随下次 profile 域施工）；② X2·隐私态分裂两件存量——setItem 抛错时 addToCart 先 push 内存后 saveCart 抛致内存/徽章/存储三方分裂（saveCart 无守卫，与旧⑯同根）；getItem 抛错时 loadCart 旧行无守卫致 initAsync 未捕获拒绝徽章停默认态；~~③ X1·本地读侧 qty 字符串 "2"→徽章 "02"/"021" 拼接（pre-existing，过滤已挡异族但合法项的 qty 类型未归一）~~（**已下账@2026-10-07 回炉批**：务实席实测种子字符串 qty "3" 徽章显 "3" 非 "03"——归一化实由求真务实轮施工 7d4cf70 落地（map Number 后 filter），本条随修消解但账面漏划【归属勘正@同日双盲验收：原注误写"正题批"，X2 P2-1 抓出】）；④ Y2·损坏自愈全程静默——若求至善可 toast 补一句"袋子数据坏了，已从空袋重新开始"（不阻塞）；⑤ Y1·qty=999 长 hint 双侧溢出锚盒（罕见态观感）+`:has` 让位 hover 圆角内侧微月牙（1× 不可见）；⑥ X1·node --test 根目录裸跑卡扫描（backend 树大），需显式文件列表；⑦ X1·scripts/security-check.test.js 是 jest 风文件被 node --test 扫到报错（7016f2e 旧件 pre-existing）
- **⑥审终验收口战果（2026-10-06 当轮收口，全量 chromium 56 过/0 败/2 跳·workers=2 基线）**：① qty-hint 特异性收口——数字读数规则加 :not(.qty-hint)（Y1/Y2 共中：hint 实渲 15px/600 深墨 vs 设计 11px muted，收口后实测 11px/400/muted 归位，19px 让位预算欠账 3px 同步消解）；② loadCartSync 错型判+异族过滤——"abc"/null/{} 错型按空袋自愈、合法数组混异族项逐件滤除（X2 P2-a"共 NaN 件+僵尸行 UI 不可删"收口；实测 '"abc"' 自愈/混合袋滤至 1 件）；③ 服务端形状守卫补算术字段判（X1 P2-2：有 sku 无 qty 变异 DTO 也致 NaN）
- **⑥审终判施工（2026-10-06 用户裁决落定）**：裁决二 A——PDP 页内点品牌链回 index 落页首：referrer 二级证据退役（refFromPdp 变量删除），stash/leave 快照两半统一只认 back_forward；旧放行路径的"落列表中段"与"图片未载完钳位 873≠1200"（X1 实测）一并消解。裁决一 B——B11 维持 5.2s 不破 toast 红线（结案见上条）。下账明细（2026-10-07 求真务实轮·对账席 D1 勘正"三项"表述）：本次结案下账的移交项=**复核轮移交①一件**（其"钳位半"与"直入语义半"同属该条，随裁决 A 一并消解）；批1⑬ m3×B8 潜伏耦合、批1⑭ m4 oracle 灰区为相邻项**未下账**仍挂
- **求真务实轮战果（2026-10-07 四席：求真/务实/对账/纪检，施工批）**：① qty 归一化（务实席实锤：字符串型数量 "3" 的合法件被 filter 整件丢弃——UI 隐身+存储残留+袋变更后永久清除）——loadCartSync 改先 map 归一化（Number()+Number.isFinite 门）再 filter，探针实测 "3"→3 救回、异族项照滤；② flow-experience A1 测试号自删止血（对账席 D3：库内 118 存活号主源=本件每跑漏一个 reich.a1.*）——测试末尾 DELETE /api/users/me（失败容忍不判红），单跑绿+库 118/170 未增长实证；③ 工作树清理——6 个套件副作用未提交文件复原（backend/scripts/security 报告 JSON 时间戳 churn）+11 个 .tmp-* 席位证据目录删除；④ 修账四件——复核轮①划线销账/终验战果补 runner+跳过数/"三项下账"表述勘正为一件/95-40 裸奔数字勘误（见下）
- **数字勘误（2026-10-07 求真务实轮，纪检席 P2-1+求真席 P2-3+对账席 D7 三席交叉）**：bfdbde8 commit message 中"契约95绿+抽验40绿"在全仓无可定位套件名/命令/文档锚，**不可复核，引用一律作废**——当时口径为后端 jest 全量与回归抽验脚本的即时输出，未留复现路径；此后一切测试数字引用以仓内可复现命令（npx playwright test --project=chromium --workers=2 / node --test <显式文件列表>）+当日日期为准。同批勘正："移交 26 项"系漏数复核轮 5 件，**移交实数核定为 31**（批1 19+复核 5+终验 7），本条后划销 1 件，现挂 30
- **求真务实轮移交下批（2026-10-07）**：① 演示库清存——users 表 118 存活号几乎全为审计/测试残留（reich.a1.*×50/fraud_*/Tamperer/reich.y2.*/x2probe_a 等 2026-10-02 起累积）+orders 13 条审计残留订单（收件人"求真audit/Fraud Squad"等）；products 6 件干净；止血已做（A1 自删），存量需 admin 批量清理脚本（产品数据操作，单独做）。清点复现（2026-10-07，制度审查组·合规席 P2-4 补）：`node -e "const{DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('backend/data/dev_caddy_shopping.db',{readOnly:true});console.log(db.prepare('SELECT COUNT(*) c,MAX(id) m FROM users').get(), db.prepare(\"SELECT COUNT(*) c FROM users WHERE email LIKE 'reich.a1.%'\").get(), db.prepare('SELECT COUNT(*) c FROM orders').get());db.close()"`（输出 {c:118,m:170} {c:50} {c:13}）；② backend/scripts/security 下 6 个已跟踪测试产物文件每次套件跑即重写（时间戳+性能数字 churn）——长期方案二选一：git rm 改 gitignore 或提交一次锁基线，下批定；③ 席位证据纪律——多轮审计在仓根遗留 .tmp-* 目录（本轮已清 11 个），后续席位任务书应强制"证据一律仓外+离场自清"；④ qty 归一化的服务端半——补水分支 every 守卫未做同款归一化（当前不可达分支，务实席定档防御，若未来后端真回 cart 键再做）
- **务实排序基准（2026-10-07 务实席独立排序，供下批开工次序参考——原账面顺序偏重措辞轻于可用性）**：前五=批1①（A1 字符集矛盾，注册阻塞级）＞批1②（跨 SKU 吞 toast，本链回归）＞批1⑪（成功 toast 被 400ms 跳转腰斩，100% 触发）＞批1⑩（游客订单页假交互面，100% 可见）＞批1⑫（隐私政策死文本，一行 href）；文案三件（批1⑥⑦⑧）后置；wishlist 裸 parse（终验①）优先于全部文案件但让位于前五；B11/stash 类裁决额度件不再立项


## 双盲审计收口批（2026-10-08 六席盲审后施工）

**审计口径**：3 组×2 席独立盲审（死码判定/运行态黑盒/构建完整性），不锚定 commit 宣称。P0 零；P1 六项已施工清零，P2/P3 顺手项随批清理。

**承重陈述勘误（本批施工自带，三处）**：
- 9bda6bc 称"tsconfig.spec.json 摘除指向 src/logging 的 typeRoots"——CRLF 致 replace 静默失败，diff 无该 hunk，本批已真摘除
- 9bda6bc 称"users CQRS 层类文件从未入库"——实为 84c8ebb 所删（取证时路径尾斜杠+子目录双误）；重写方向不变，陈述失实
- 9bda6bc 称"data-source.ts 全仓零消费"——漏扫 backend/scripts/run-migrations.js 动态 require；该脚本无 npm/CI 入口且官方迁移路径（migration:run -d src/config/typeorm.config.ts）健在，脚本已随批删除，账实对齐

**挂账（双盲审发现，未随批施工）**：
- ~~中文关键词 DB 降级 LIKE 0 命中~~（**翻案销账 2026-10-08 挂账复核**：sqlite 直查 LIKE '%渐变%'/'%褶皱%'/'%手袋%' 全命中，API 层正确 UTF-8 编码全命中；唯一 0 命中的是 GBK 字节串 %BD%A5%B1%E4——即 B2 席自己 Git Bash 终端发出的编码。服务端无 bug，误报根因=审计席终端编码，B2 报告曾记录该 GBK 请求但未连点）
- GlobalExceptionFilter 结构化错误形状（errorCode/category）随 fbf4f91 误删未恢复：依赖链（enhanced-business.exception/error-codes/domain errors）全灭+前端零消费旧形状，若未来需要结构化错误契约按当期需求新写
- ~~服务端购物车与前端 localStorage 永不相通~~（**已下账 2026-10-08 挂账系统修复批**：syncToServer 重写为全量对账——GET 拉服务端袋按 SKU diff 后 POST/PUT/DELETE 收敛，本地袋仍是唯一真相源；loadCart 补水键对齐分页 DTO 的 items（换设备恢复激活）。施工中连带修复后端两个存量 bug：removeCartItem 把条目 id 当 skuId 查致 DELETE 永远静默 no-op（200 假成功）；updateCartItem 忽略路径 cartItemId 按 body.skuId 定位且 DTO 必填 skuId 拒合法改量请求。repository 增 findByUserIdAndItemId（uid+id 定位防越权删改）。验证=浏览器全链：登录补水/加购 POST/同量跳过，curl 验 PUT 改量/DELETE 真删/403 越权，cart spec 33/33 绿）；cart count(行数) 与 summary.totalItems(件数) 口径不一致（前端未消费 count，保留记档）
- ~~backend/docs/HEALTH_CHECK.md 整篇重写~~（**已下账 2026-10-08 挂账复核批**：764 行虚构教程重写为对齐现实的 70 行（真实端点/守卫/验证命令）；同批发现并删除 monitoring 下两个零挂载死 controller（metrics.controller/health.controller，/api/metrics 404 实证））
- 根 docs/openapi.json 为陈旧导出（含 17 个已删 /api/logging/* 端点），活性 spec 以 /api/docs 运行时生成为准


### 挂账#3 加固批（2026-10-08 双盲六席严格审核后施工）

双盲组（协议算法/黑盒破坏/行为等价/测试盲区/安全攻击/工艺横切 六席）对 f3037ec 的对抗审核：P0 一项+P1 五项+P2/P3 一批。本批全部施工：

- ~~P0 批量删除 IDOR~~：removeBatch 补 (uid,id) 双键过滤（A 用自己 token+自己路径 uid+body 塞他人条目 id 可删空他人袋——三席独立实证，复验 200 但 B 袋完好）
- ~~P1 软删+唯一索引死区~~：删后重加同 SKU 永久 500（四席实证）——addItemToCart 增软删行查询与原地复活路径，复验 201 且量取本次值
- ~~P1 窗口不一致~~：loadCart 无 limit(默认20) vs sync 500——换设备大袋补水 20 条后对账 DELETE 其余（实测 500 丢 480）→ 统一 500+翻页拉尽
- ~~P1 跨账号串袋~~：logout 不清袋+A 的袋 POST 进 B 账户 → reich_cart_owner 属主绑定，读侧不匹配按空袋
- ~~P1 并发对账翻倍~~：syncInProgress 死字段真用化（互斥+尾随补发）
- ~~P1 loadCart 绕过归一化~~：历史字符串 qty 致徽章"03"+POST 400 永久失同步 → 返回前统一归一化
- 语义批：PUT 不存在 404（原500）/数量上限 400（原500）/qty 小数 400（原可落库 1.5）/null 防御/429 归可重试/fetch 6s 超时/补水条目补 addedAt
- 测试批：service 层零回归力补齐（新增 cart-application.service.spec 10 例守新契约：按路径 id 定位/404/上限400/IDOR 回归/软删复活）；controller spec 三处编造断言改真
- 文档批：README 三处过期口径更新；cart-domain.service.ts 死重复文件删除
- 施工中自伤一处已修：@Injectable 被插类隔开致 CartDomainService 失去 DI 元数据（EADDRINUSE 掩盖下的 not-injected，启动即现）——装饰器归位

**遗留挂账（多席指出、本批不修，产品决策级）**：多设备语义=最后活跃设备独裁（本地唯一真相源架构固有，双设备交替互删）；summary totalValue≡selectedValue（calculateCartTotal 内嵌 selectFlag 过滤，存量）；select-all 端点 body 无 DTO 校验（'banana' 静默落库）；DELETE 不存在 200 幂等语义与 PUT 404 不对称（有意保留：对账重试安全）；补水 shapeOk 全项苛刻在驱动返字符串数量的漂移场景会拒收整袋（当前 TS 驱动返回 number 不可达）。

验证（2026-10-08，复现命令随项）：V1 复活 201/量=本次值；V2 IDOR 200 但 B 袋完好；V3 PUT 404/qty1.5 400/null 200 不炸；cart 套件 43/43 绿（33+新10）；tsc EXIT=0；node --check 过。


### 电商基本模块恢复批（2026-10-08 用户令"电商网站该有的基本模块要有"）

**教训（承重）**：清理战役中期起用"代码消费面"判据删模块，误删了 payment（支付，8215 行真实现）/address（收货地址，3385 行）/basic-data（行政区划，97 行）/notification（通知中心，570 行）——它们当年未挂载（被当死码的原因），但属电商基本模块，产品功能完整性判据高于代码可达性判据（同用户"功能不减"四连令）。git 历史全程可恢复，本批全部捞回。

**恢复+挂载**：五件 git checkout（含 email-verification——独立 Express 服务，compose email-verifier 容器用，不进 Nest）；app.module 挂 PaymentModule/AddressModule/BasicDataModule/NotificationModule + EventEmitterModule.forRoot()；app.module 实体注册列表补四模块 glob（此前 No metadata 假活——address/payment 的 health 端点不触 DB 掩盖了实体未注册）。

**依赖归位（版本考古）**：@nestjs/cqrs@11（12.x ESM-only+peer common@12 冲突）/@nestjs/bull@11+bull@4（12.x 同病，jest parse 炸）/@nestjs/event-emitter/uuid 装回；common/security 四件+redis-utils 撑回；ENCRYPTION_KEY 轮换为合规 64-hex（.env 不入 git）。

**端点实测**：/api/address/health 200、/api/api/payment/health 200（双前缀系历史命名）、/api/notifications 401 守卫、/api/api/basics-data/region/all 200（空数据集——region 表待导入数据）。jest 809 例 807 绿（2 败环境带）。

**挂账**：region 行政区划数据导入；payment/address/notification 的前端接线（当前前端无调用面——模块恢复为后端能力，接线属产品迭代）；email-verification 服务容器化启动验证（需 docker）。


### 升级批双盲审计收口（2026-10-09 六席严格履职后施工）

六席（兼容性/数据层/黑盒/性能/测试保真/残留收口）审升级两波。P0×2 仲裁：cart 中文损坏销案（node 纯 UTF-8 全链码点无损，B1 席 GitBash curl GBK 客户端编码所致）；后端进程单次无日志死亡挂账观察（未复现，归因不唯一）。

**施工清单（全落地）**：suggestions 缺 q 500→空建议；address queue/status 挂死（bull 在 Redis 缺席 promise 永不落定）→3s race 降级 400；products/search 的 tags 参数漏解构（service 层能力在、controller 丢弃恒全量）→接线；依赖卫生（@babel 三死件+sqlite3 卸、ts-jest 29.4.14 消 TS6 peer 违约、better-sqlite3 降 12.x 消 typeorm peer 违约，npm ls invalid 158→0）；busyTimeout 死配置→顶层 timeout（better-sqlite3 驱动只读顶层）；migration 脚本→typeorm-ts-node-commonjs（裸 CLI 不加载 .ts，A1/A2 双席实证）；.env.example 对齐 better-sqlite3；.env.test 创建（消 2 存量红）；coverage 分母对称排除 email-verification（13.3% 永零死重）；jest.config.unit.cjs 双断修复；Node 声明面对齐 26（Dockerfile×3/CI×3/.nvmrc×2/engines）；前端升级（vite 8/eslint 10/cssnano 9/globals 17/postcss-preset-env 11/sharp 0.35/playwright 1.64）。

**勘误（升级批 commit 内承重陈述）**：'Windows 路径反斜杠使 transformIgnorePatterns 永不匹配'系误诊——jest-config 对该模式自动做分隔符归一（normalize.js:752），旧病根是放行名单广度不足（只放 bull 不放整个 @nestjs），C1 席实测证伪我 commit 里的"破案"叙事。

**挂账**：tailwind 3→4（配置体系重写级，前端样式基建，单独战役）；TS7（node10 resolution+ignoreDeprecations 跑道到期，须先迁 bundler resolution）；better-sqlite3 同步驱动并发串行化（B2 量化：search 按位线性排队边际 15ms/位——数据量放大后吞吐绑定点，迁 postgres/TiDB 时自然解除）；migration:show 会建空 migrations 表+9 个 0.3 迁移全未跑的重放风险（真实库靠 synchronize）；后端进程单次死亡观察项；audit 链化写在 typeorm1 组合下零流量覆盖。

验证（2026-10-09 全实测）：**jest 809/809 首次满绿**（.env.test 补齐治最后 2 环境带）；build 0 错；npm ls invalid=0；修复项复验 suggestions []/queue 3s 400/tags 过滤生效/中文 UTF-8 无损；冒烟五端点+vite8 全 200。


### 反过拟合及自洽四席审计遗留挂账（2026-10-09）
- **closePayment 网关侧关闭缺口**：PaymentStrategy 接口无 close 方法，adapter no-op 本地关单——网关侧会话仍可支付（迟到成功回调可翻转已关订单）。修法=补 close 进接口或各策略 NotImplemented（功能批）
- ~~**退款链两缺陷（实践席）**：①退款明细 metadata.refunds 被 toAggregate 硬编码 [] 确定性覆盖丢失；②聚合无累计退款额≤订单额守卫+传统策略假退款 stub——资金语义缺陷（功能批）~~（**①②已修@2026-10-09 支付域根因批**，commits aeb5b73 起 5 连；"传统策略假退款 stub"子项仍挂——策略层退款未接真网关）
- **枚举四套归一**：PaymentStatus 全仓 4 套同名枚举值域不齐（domain 大写/entity 小写/orders 双轨含 paid）+PaymentMethod 双轨——CLOSED↔cancelled 往返有损，refunded 被降级清除（专项批）
- **回调协议文档缺签名方案**：README_NEW_PAYMENT_CONTROLLER.md 无 x-signature 头/HMAC-SHA256/PAYMENT_SIGNATURE_SECRET 配置说明——外部按文档无法构造可通过验签的请求
- **adapter 层零测试覆盖**：x-signature 合并方向已修但无 spec 锁（crypto 走另一条验签链 CRYPTO_API_SECRET 亦无 spec）
- **e2e 双侧旧契约**：cart-payment-integration.e2e-spec 打 /api/v1 全旧形状在活跃匹配集；basic-navigation 全 skip 骨架
- **q/search 旧参已裁弃用**（非双收）：Swagger 已标注——外部迁移期（自洽B P1-1 措辞修正落账）

### 支付域根因修复批 W-3（2026-10-09，用户令"系统正确,不可盲目,宁可有把握再修"）

六步依赖序施工，每步独立验证（tsc+专属spec）后 commit：

1. **aeb5b73 退款明细持久化读回**：toAggregate 硬编码 []→restoreRefunds 对称 save() 写入形状；NaN 金额显式拦截（Money 校验对 NaN 失明，不拦则守卫比较恒 false 被绕）。往返 spec 4 例。
2. **退款域守卫三连+409**：RefundNotAllowed/CurrencyMismatch/Overpaid 三域错误；累计占额口径=非 FAILED 均占（在途防并发超退）；余额基准=实付 paidAmount；最小单位整数比较（0.1+0.2 尾差防线）。业务拒绝不再冒充 500。spec 9 例。
3. **支付→订单回写监听**：全仓 @OnEvent 零监听→payment.succeeded/failed→订单 paymentStatus 镜像；merchantOrderId 解析=orderNumber→纯数字 id 双唯一键；幂等（paidAt 保首写）。spec 6 例（含真实事件总线走线）。
4. **金额校验双侧闸+toMinorUnits fail-closed**：创建侧站内单金额须与总额最小单位零容差相等（0.01 元刷单链封死）；回写侧 markPaymentSucceeded 携金额不符拒写；ETH 18 位 factor 超安全整数改抛错不静默失真。PaymentModule→OrdersModule 接线（无环）。spec +14。
5+6. **状态机守卫+回调时序+写互斥**：markAsSucceeded 同网关重放 no-op/异网关抛（首写胜出）；成功后失败回调不可抹收款态；已收款单不可关闭；回调重排为"排他查改存→互斥外发事件"；同步路径补发 payment.succeeded；支付写段接入 runExclusiveWrite（M3 批"支付激活前须接入"义务兑现）（**勘误@十席审计:实际仅回调/sync 两路径接入,退款/关闭/创建三路径未接——G1-A1 席指出**）。spec +11。

**验证**：9 套件 157 例全绿（jest --config=jest.config.cjs --testPathPattern "src/orders|src/payment"，2026-10-09；**口径勘误@十席审计:复现须带 --no-cache --runInBand——默认并行/陈旧缓存下随机假红,C1/C2/D2 三席实测**）；tsc -b 0 错；build 0 错；真实引导自起"Nest application successfully started"+115 路由全映射无环（端口 3778? 否——3777 被旧实例占用 errno -4091，Nest 侧完成、listen 层环境件）。

**挂账（本批新增/保留）**：
- 策略层退款 stub 未接真网关（传统三策略 createRefund 假实现）
- closePayment 网关侧会话关闭缺口仍在（域守卫已挡"已收款被关闭"，但关闭后网关侧仍可支付→迟到成功回调按"钱真到账"语义可翻转 CLOSED——有意行为，转账语义优先，已注记）
- order.status 是否随支付联动→**用户裁决中**（凭据：陈 e2e 曾期望 status='paid' 联动；后端零消费方不联动不破坏）
- e2e 旧契约（/api/v1+信封）修复仍属 W-4 批
- 回调控制器对 STATE_CONFLICT_ACK 的 ACK 形状（{code,message} 200）未对账 RFC9457 豁免清单口径

### 支付域 W-3 批双盲十席审计（2026-10-09，用户令"不预设立场无情审核"）

5 组 10 席（域逻辑×2/持久化并发×2/契约集成×2/测试保真×2/安全资金×2），盲于施工叙事。多席观测到的"并发会话编辑"经查=D1 席受控变异实验的并发可见性，末态 porcelain 空（净树）。净树复现：9 套件 157/157 绿（--no-cache --runInBand）+tsc 0 错。

**P0（多席独立共识+协调者第一手复核坐实）**：
1. **退款路径无互斥**（G1-A1/G1-A2/B1/B2/E1 五席独立中，B2 throwaway worktree 实测复现"网关退 200/账面记 100/丢一笔"）：createRefund 查-守卫-网关-存全程锁外+save 对 metadata.refunds 整组覆盖+无版本列——并发双退双双过守卫、后写覆盖前写、后续守卫按失真账面放行。
2. **退款端点无归属/角色校验**（E1/E2+复核坐实）：任意 JWT 用户可对他人支付单发起真实网关退款；叠加查询端点 IDOR 三处（GET orders/:id、batch-query、merchant-orders——E2 P1）构成发现面。E2 注：operatorId 实取 JWT 非 body（此点无洞）。

**P1**：close 路径无互斥（迟到回调可被陈旧 close 覆盖成 cancelled，G1-A2/B2/E1）；订单镜像 markPaymentFailed 无终态守卫（PAID 可被翻 FAILED，G1-A2/C2）；回调"落库后 emit"窗口+监听器异常被 suppressErrors 静默吞+补偿路径封死（B2 源码级证据）；rawData 验签不覆盖 outTradeNo/receiptAmount 顶层迁移字段（E1）；回调按最新单路由忽略自带 gatewayOrderId——跨笔重放守卫失效（E1/C2/G1-A2）；sync 补发事件/409、close 409 零测试（D2——本批新行为无回归锚）；address/user-deletion 四处裸事务未入互斥且模块已激活=互斥头注释与现实不符（B2）；三策略 queryPayment 恒 success→sync 无凭据生产 SUCCEEDED 记录（E1/C2，缓解：paidAmount=0 被金额闸/退款基准拦）。

**P2 摘**：idempotencyKey 聚合创建即丢（幂等检查死路+无唯一索引，B1+复核坐实）；'支付订单不存在'×4 路径 500（其中 GET 端点 Swagger 已声明 404 直接矛盾，C1）；Money 精度/币种业务拒绝冒充 500+ETH 退款永久 500（C1/G1-A1/E1）；回调 receiptAmount 零约束（负/多精度→SYSTEM_ERROR 冒充，缺省→paidAmount=0 两域分叉，C1/E1/G1-A2）；可退基准=回调 receiptAmount 零核对（G1-A1）；退款零幂等键（G1-A1）；损坏行两静默面：非数组/非法日期串不告警（B1）；回调端点 forbidNonWhitelisted 与网关超集字段天然冲突→混合契约（C1）；409 detail 泄露他人订单总额/单号（C1）；D1 变异实验两假绿（emit 互斥位置未锁/createPaymentOrder save 未断言，11/13 变异真锁）；sync 陈旧读覆盖首写口径；DTO Max 999999.99 vs totalAmount decimal(10,2) 上限错配（C1）。

**P3 摘**：CLOSED↔cancelled 往返漂移/坏行永生无自愈/fromMinorUnits 不对称/close 幂等缺失+迟到成功 closedAt 残留/refund.created 零监听（付→全额退→订单仍 PAID）/外部商户号可无界造 SUCCEEDED 记录污染统计/jest 陈旧缓存可产假绿假红（门禁须 --no-cache）/幂等命中先于金额校验的顺序行为零断言。

**已验证无恙面（十席正面结论摘）**：单线程守卫矩阵全边界实测通过（含 0.1+0.2 尾差/JPY/BTC/USDT）；验签 fail-closed 链（无 secret 零可达）；模块图无环+@OnEvent 注册链源码级验证；orderNumber 与数字 id 键域不相交；金额闸双侧数学一致无误放；回调互斥形状正确（查改存整段+emit 锁外防自锁）；变异实验 11/13 真锁（原病灶/累计守卫/幂等首写/金额闸/fail-closed/409 翻译全锁住）；D2 原样复现 157/157 与账本宣称一致。

**待用户裁决项（空白呈报，未预填）**：P0-1 修法（整段入互斥/加版本列/叠加）、P0-2 退款权限语义（owner 自助/admin-only/owner-or-admin）、查询 IDOR 修复口径（admin 可见域）、404/精度 500 家族是否并入下批。

**用户裁决（2026-10-10）**：
- ①"订单状态随支付联动"→**联动**（推翻调研倾向的不联动）。落地语义：支付成功且
  - **快照批排期注（2026-10-11 双盲B1补）**：批一联动/退款回写施工时**必须经 orders.service.update() 单调用收口**（快照批五收口契约——另开直写=快照缺口）过金额闸→order.status PENDING→PAID（守卫：已 PAID 幂等；CONFIRMED/SHIPPED/DELIVERED 不回退；CANCELLED 不联动+告警留痕——钱到已取消单走人工/退款通道）；支付失败不动 order.status（枚举无对应态），paymentStatus=failed 照旧。与陈 e2e 期望（status='paid'+paymentStatus 联动）一致。随支付批一落地。
- ②支付三批修复整体**留坑**（用户令 2026-10-10），停工待令。

### 三大批施工总案（2026-10-10 用户令"着手准备施工"；勘察重测@当日）

**勘察修正**：console 87✓/catch 197(原估198)/onclick=真码17+测试残留1(backend/test-simple-file-reading.html 疑垃圾件待删)/stylelint 零配置零依赖(549错系定调会临时配置跑出——批内第一步立配置)/陈旧文件头60/CONTRIBUTING+ADR 均缺/e2e 6套件全旧契约。

**排期注（2026-10-11）**：订单快照批（阶段1）先于本批刀2/刀3 动 orders.service——同文件冲突，快照批完工后再开。

**W-1 写法批（backend，动机=定调会写法席八条）** 分四刀按风险升序：
- 刀1 console→Logger（87处/约20文件）：Nest 管理类→this.logger.*;main.ts 引导期与 typeorm 迁移(CLI 无DI)按惯例保留 console 并注记规则;参数签名 1:1(log/error(msg,stack)/warn/debug 兼容)。
- 刀2 async 修正（77处重勘中:无 await 的 async/漂浮 promise/async 构造器）。
- 刀3 catch 样板清理（197处:分类=该抛的吞掉/该记的漏记/重复包裹,逐类不盲改——反过拟合红线）。
- 刀4 config 分域+魔法数字（config/ 现 6 文件,原"12文件"口径含根域配置重核）。
每刀独立 commit+tsc+jest(src/orders|src/payment 口径 --no-cache --runInBand)+eslint 改动文件 --no-fix 零 error(第三道闸,2026-10-10 验收D席立法)+动机映射。

**W-2 前端批（动机=视觉席+定调会）**：刀1 stylelint 配置立档+首跑真实基线(tokens.css 冻结条款=只测不改或单列豁免)+--fix 机械类;刀2 onclick 17处迁事件监听(cart.js 3/orders.js 13/email-verification 1——模板串内嵌 onclick,迁 data-*+委托);刀3 auth-state.js 统一;刀4 热门搜索面板+建议池修复(后端缓存污染病根);刀5 残留件清理(test-simple-file-reading.html 等)。

**W-4 测试与文档批**：刀1 e2e 重写对齐现行契约(/api/payment/orders 等+裸 DTO+problem+json,6套件);刀2 CONTRIBUTING.md;刀3 ADR 目录(首批补录:RFC9457 决策/tokens 冻结/gopay 删除/better-sqlite3 选型/写互斥);刀4 备份双轨脚本;刀5 文件头60个清理(错乱时间戳统一为真实最近变更或删头注)。

**闸门纪律（v1.4 起通用三道闸正身=docs/quality-charter.md 闸门节,本行只记本三批特有约束）**：支付域文件在本三批中如被 console/文件头类机械刀触及=允许(独立动机 hunk),支付语义一律不碰(留坑令);改动域→套件映射=W-1刀2/3(backend 全域)/W-2(前端)/W-4(backend 全域+e2e 独立配置),未列改动域按全量。
### 影子施工者处置（用户裁决 B，2026-10-10 执行完毕）

**案情**：10-09 23:45~00:01 一非本会话编排的执行体（git 作者=ZCode Agent；本工作区 cron/offpeak 全空；stash"seatC/F3"命名对不上我方席位——疑似前会话遗留后台 agent）在仓库活动：提交 62669a0（150 行并发回归 spec，**带红测试提交**——测试先行实现未写完即死）+ 在途未提交乐观锁桥半成品（6 文件+101 行，方向与调研推荐一致但未经审查）+ diag.spec.ts 残留。全部活动早于用户留坑令，非抗令。

**处置（B）**：①在途半成品+diag 封存 stash@{0}（标签含恢复指引）②git revert 62669a0（b7ac2a8，纯历史追加不重写）③验证：支付+订单 9 套件 157/157 绿+tsc 0=支付域精确回到 W-3 终态。旧 stash"seatC-partial"原样保留（证据+已隔离）。若未来重启支付批一，stash@{0} 的乐观锁方向可按冷审标准重新评估后再用，不直接采信。
### 阶段性验收（2026-10-10 专家组五席，用户令"严格验收"）

五席=A数字核验/B刀1质量/C支付域完整性/D仓库健康/E运行态（E席agent超时，协调者补位实测）。

**总判定：通过（带整改，整改已当场落地）**。
- A席：承重数字全真（157/836/87=77+10/stash 6文件+101行+diag/revert ±150/50+27 处逐点精确复现）。偏差三处：①"全仓非豁免归零"仅 .ts 口径（email-verification .js 域另有 48 处 console——独立 Express 服务，归 W-2/W-4 范畴另立）②验收清单转述"spec 钉点随迁 4 文件"实为 4 例 2 文件（commit message 自记无误，呈报转述错）③文件头"60"三次测量 60/63/64 口径不可精确复现（W-4 刀 5 施工时以实测为准）。
- B席：刀 1 八项全 PASS（this 绑定/两参语义经 Nest 12.1.2 源码级核验/级别保真/行为无漂移/豁免合理/支付两文件纯机械）。P2-1：两处 spec console suppressor 未随迁（Logger 走 stderr，suppressor 失效漏噪声不破测试）——列入 W-1 后续刀。P3×4 卫生项。
- C席：支付语义变化=0；revert 字节级回基线（git diff 23a6c98 b7ac2a8 空）；stash 清点属实；157 复现。差异面 5 文件 vs 期望 3 文件（orders.service 3 处+其 spec 2 spy 随迁属全仓刀令正常扫面，机械类，任务书期望面写窄了）。
- D席：5 PASS+1 FAIL——**lint 债 335 错（本阶段引入，未入账）→ 已当场整改**（eslint --fix 纯格式，0 errors 复验+tsc 0+836 全绿，commit 见 lint 整改提交）。**口径勘误：远端恢复底线≠768c671，实况 origin/master=84c8ebb（最后 push 2026-10-08 04:11，本地 ahead 47；本阶段 15 提交零推送）**。P2：三个纯 docs 提交 message 无动机正文。P3×4。
- E席（补位）：build 0 错；引导自起"Nest application successfully started"+115 路由全映射；Bootstrap 上下文日志成型（配置警告带 [Bootstrap] 前缀=刀 1 迁移生效实证）；零 TypeError/undefined。注：进程启动到 NestFactory 约 90 秒（Meili/Zinc 连接尝试阻塞在 import 期——先于 Nest 计时，非本阶段引入，观察项）。

**闸门纪律修正**：阶段闸门自 tsc+jest 两道加为三道（+eslint 改动文件 --no-fix 零 error）。
**验收后新债入账**：suppressors 随迁缺口(P2)/远端底线口径更新(P2,本条已正)/docs 提交动机正文规范(P2)/P3 卫生四项。
### 系统性整改令落实（2026-10-10 用户令"整改或修复必须是系统性的不短视的"→纲领 v1.3）

**整改两问入宪**（quality-charter v1.3 第 5 条增补）：①病根修了吗（闸门/模式/约定进流程）②同类面全扫了吗。治标可并行，治本同批落地或入账有期。

**升格整改① spec 消声器（验收 P2-1"往后排"→当场系统性修）**：
- 同类面全扫结果=4 处（B 席点名 2 + redis-health 陈年 2——后者该服务历来走 Logger，console 消声器从未生效过）。
- 病根=实现侧日志统一走 Nest Logger 后 console 侧消声器整类失效。
- 治本=test/utils/nest-logger-silence.ts 统一模式（钉 Logger.prototype 六级方法）+四处全迁；断言型钉点仍钉服务实例（既有模式不变）。
- 验证=3 套件 130 例绿+噪声残留 0（'Cache get/set/delete error'从 jest 输出消失=拦截生效实证）+闸门自恰（迁移文件自身 18 格式错当场清零）。

**升格整改② 启动时长（验收"留观"→当场病根诊断）**：
- 干净基线实测（无并发负载）：进程起跑→首条 Nest 日志 **43 秒**；其中 app.module import 链 **23.2 秒**（分账：@nestjs/core 3.6s/typeorm 2.5s/kafkajs 1s/meilisearch SDK 等重依赖加载+模块顶层代码 redis 2s/search-manager 2.2s/redpanda 1.6s+级联）+NestFactory 实例化约 15s。
- 验收时的 90 秒=43 秒基线+当时 D 席全量回归并发抢占（ contender 实证）。
- 结论：**非本阶段引入**（10-09 快启动那次未测起跑点，缺口疑一直存在）；E 席"90 秒"非新病。
- 修法入账（启动瘦身刀，归 W-1刀2 async/或独立小刀）：重客户端（Meili/Zinc/Redpanda/Redis）连接从 import/构造期移 onModuleInit+有界超时；不与当前批混做（盲改模块初始化无测试护航=另一种短视）。
- 环境注记：Windows Defender 对 dist 首次加载的扫描税为环境项，不进代码账。
### 低质量代码全面普查（2026-10-10 五席，用户令；全卷=docs/quality-census-2026-10-10.md）

五席（后端写法/健壮性/前端JS/CSS/测试基建）只读普查，全部计数带复现命令。总判：主流面在规范轨，债集中"脚手架未清偿+双侧无对账+归一不彻底"三病根。

**高危新发现入账**：①captcha+auth-proxy 无界等待（登录主路径）②验证码从未真发出+通知三渠道全假（立新批"通知域集成刀"）③email-verification.js XSS 活口+token 明文关联 ④枚举双轨再添 OrderStatus×2（影子轨零引用）+UserRole×3——归一批范围扩全仓 ⑤orders 事务内事件外发（幽灵事件，payment 同源病漏网）——**快照批阶段1顺带修**（事件发布移互斥块返回后，方案v4.1§写入纪律，双盲B1补注）。

**关键计数**：catch 203 块分级完毕（A11/B92/C58/D42——刀3施工清单就绪）/裸 Error 112 处 1/3 业务面误用/未使用导出 120（含 2 整模块死件）/死 class 70（orders.css 35%）/断点 9 种并存/弱断言 6.2%/mock phantom 9/env 死键 10+未文档 171+NaN 键 5/k8s meili v1.7.4 vs compose v1.54.3/前端 Dockerfile 漏拷 5 页/backend 散件 18。

**结清销账**：漂浮 promise=0（刀2 该子项结清）；事务吞错 0；skip/only 0。

**新批注册**：通知域集成刀（9 TODO 假实现）/env 对账单批（死键+缺键+NaN）/部署对账批（k8s/compose/漏拷页）/products 分层批（上帝类 1155 行）/死件清理批扩容（2 死模块+110 导出+18 散件+14 前端死函数+70 死 class）。

**待裁决 4 项**（呈报中）：密码下限 6vs8/email-verification 适配器去留/Dockerfile 漏拷 5 页死活/order-timeline 对齐方向。
### 用户四裁决+法规组审核+双调研（2026-10-10）

**裁决执行**：③镜像补 5 页（d6bca83）/④时间线对齐=css 跟 js（bd3f18a，我方意见：js 活面改之伤广、css 零引用改之零险，类目 8:8 全对齐）。

**裁决①密码（对齐业界严格标准线）——调研定谳待施工**：NIST SP 800-63B-4（2025-07-31 Final）单因素 SHALL=15+禁组合规则+强制泄露黑名单；OWASP=8(MFA)/15(无)；平台实测无一强制 15（Google 推荐 12/Microsoft 推荐 14/GitHub 8|15 双轨/Apple 8+组合）。**工程取档 A：min 12+max 64+全删组合规则+服务端 HIBP 黑名单+登录端免策略校验+bcrypt 72 字节防截断**（12 系对 NIST 单因素 15 的申报偏离：业界无 15 先例；改 15 只动单源常量一处）。仓内校验点 8 处全清单在手（含 PASSWORD_REGEX 实为 UpdateUserDto 活规则+3 死 DTO），施工归新批"密码标准批"。**login 端 MinLength(8) 挡存量用户系现存缺陷同批修**。

**裁决②邮件验证（接上写好）——调研推翻前提，呈报改道**：562 行适配器做的是"地址可达性校验"而非"邮箱所有权验证"——且整条 Express 链现状=容器里跑正则（客户端调的 /v1/{email}/verification 端点容器根本没有，永远降级）；真正该接的是 verify-code 线（从未真发）。**建议改道方案 C**：nodemailer 接进 notification 发信内核（MAIL_* 配置已有壳无消费者）+verify-code 补全（Redis 化/尝试上限/单次使用/重发冷却）+地址校验域维持独立容器现状（遵 10-09"不进 Nest"裁决，与"接适配器"字面令相抵故呈报待确认）。SMTP 选型：阿里云 DirectMail>腾讯云 SES>QQ SMTP(联调)。

**法规组审核（两席）判定**：两问骨架立住，六维各有病——**修正案包 17 条**（A 席 12+B 席 G1-G5，合并去重后待立 v1.4）：P1 级=闸门正身归 charter（现无住所）/同类面边界按病根签名划定（B席实证：消声器按语法谓词扫漏了同文件 2 处直接赋值式+1 陷阱面）/safety.md PaymentModule 失真（app.module 已挂载而文档称未接线）/入账有期定义（三选一：批名+锚/日期/触发事件，B席实证启动瘦身刀锚批错位）。B席三案模拟：lint 治本当时仅账面未进流程（本条已当场修）/消声器问②按病类未过（谓词病，修正案 G1）/启动诊断期不合格。**账本机制病 M1-M8**（无对账周期/锚无 fire 义务/同病分账无互引等）——挂账：期=W-4 批（锚=本总案 W-4 节），W-4 施工时立账本治理小节；此前以"阶段性验收"事件锚执行周期复查（v1.4 立法批钉死,原'W-4 或独立小刀'歧义销）。**v1.4 已于 2026-10-10 泰斗三席再议后立法（用户令链：抗辩式审核→法学泰斗小组再议）**。

**新 P1（快修执行时抓出）**：vite 生产构建在 HEAD 上即坏（terser 配置了未装，升级批 e208ab6 遗漏）——2f1a657 补装修复；升级批"vite8 全 200"验证口径勘误（preview 冒烟≠生产构建），前端闸门自此=真 build。

**census 复现命令未入仓自违记账规则 3**（A席抓）——五席命令补录归 W-4 文档批。
## 若真要接手（非承诺）

安全基线：`docs/safety.md`（规则→落点→锁）；验证：README"验证"节三命令；
整改全程记录：`docs/remediation-ledger.md`；密钥一律重生成（历史提交中存在旧密钥，开启 GitHub secret scanning 已做）。

## 挂账总览（2026-10-13 阶段性验收·用户令"梳理挂账条目"后立）

> 11 债 + 4 观察行（不含原 2026-10-09 观察区 2 条）。按"是否阻断上 prod"+"严重度"+"触发事件紧迫度"分三档。

### 🔴 第一档：阻断上 prod（2026-10-20 前必查）

| 债号 | 问题 | 触发事件 | 截止 | 排期锚 |
|------|------|----------|------|--------|
| **债-10** | R3=1：9 快照无审计日志（真合规问题）| 准备上 production 之前必查 | **2026-10-20** | 待定"snapshot 写审计接入"批 |
| **债-11** | drift=1：支付成功但订单未标已付（真业务 bug）| 用户工单进入时（已发生则 P0）| **2026-10-20** | 待定"支付回调订单状态同步"批 |

### 🟡 第二档：准备上 prod 前必补

| 债号 | 问题 | 触发事件 | 排期锚 |
|------|------|----------|--------|
| **债-1** | control plane 零 spec（5 端点 + read service + reconcile）| 准备上 production/staging 前 | 待定"control-plane spec 批" |
| **债-4** | P2-J getSnapshots 分页无 max cap + totalCount | 准备上生产 + 单 history > 50 时 | 与债-1 同批 |
| **债-5** | 性能数字未独立复测（big 库 50000 行 bench 未跑）| 准备上生产压测前 | 待定"perf bench 批"（与债-6 合并）|

### 🟢 第三档：阶段 5 / 后续批施工

| 债号 | 问题 | 触发事件 | 排期锚 |
|------|------|----------|--------|
| **债-6** | 阶段 1 余量 5 项（全未动）| 阶段 5 启动时 | "阶段 1 余量批" |
| **债-2** | P1-E 读取侧补偿非系统性 | PG/TiDB 切换时 | 待定 |
| **债-3** | findById 仍拉全字段 | findOne 接入 P2 清理时 | 待定 |
| **债-7** | 60d0f6d 失实动机历史 | 首次 PR/移交前 | 待定 |
| **债-8** | R1=30 订单缺 genesis（dev 库存量）| 阶段 5 启动时 | 与债-6 合并 |
| **债-9** | R2=1 快照与 orders 不一致（dev 库玩具夹具）| dev 库快照被新生成覆盖时 | — |

### 观察行（4 条，规则 6 不计数）

| 主题 | 升级触发线（谓词）|
|------|---------------------|
| commit message 数字失实无三件套 | 再出现"未独立复测即写入 commit message 的承重数字" |
| 共享模块抽出后 caller 仍手抄同源 | 再发现"新批抽出后 ≥1 caller 仍手写 ≥5 行同源逻辑" |
| cart count 与 summary.totalItems 口径不一致 | 前端开始消费 count 字段 |
| 后端进程单次无日志死亡 | 再出现同形无日志死亡 |

### 排期汇总（按批名）

| 批名 | 含债 | 状态 |
|------|------|------|
| "阶段 1 余量批" | 债-6、债-5（perf 部分）、债-8 | **未立项** |
| "control-plane spec 批" | 债-1、债-4 | **未立项** |
| "snapshot 写审计接入批" | 债-10 | **未立项**（🔴 阻断）|
| "支付回调订单状态同步批" | 债-11 | **未立项**（🔴 阻断）|
| "perf bench 批"（与阶段 1 余量合并）| 债-5 | **未立项** |
| "PG/TiDB 切换准备批" | 债-2 | **未立项** |
| "findOne 性能债清理批" | 债-3 | **未立项** |
| "首次 PR/移交批" | 债-7 | **未立项** |

### 总览数字

- **挂账总数**：11 条
- **🔴 阻断上 prod**：2 条（债-10、债-11）
- **🟡 准备上 prod 前必补**：3 条（债-1、债-4、债-5）
- **🟢 阶段 5/后续**：6 条（债-2/3/6/7/8/9）
- **观察行**：4 条（2 本会话新增 + 2 原 2026-10-09）
- **未立项批数**：8 个
- **最早截止日**：2026-10-20（债-10、债-11）

### 分档原则

**工具层修因 ≠ 系统正确负责任**：
- 工具层（P1-C / P2-H / P2-M）= 把"假报"变"真报"——本会话整改批的工作
- 底层数据/业务（债-8/9/10/11）= 工具暴露的真问题——**需要另外的施工方**：业务侧/DB 侧/代码侧
- 两者**不可混淆**——本会话上一轮自审时误把"工具修了"算"系统正确负责任"，未区分

---

### 低质量检查组 + 阶段性验收（2026-10-13 阶段 3+4 整改后挂账）

**【挂账批：阶段 3+4 production-readiness 债】**（2026-10-13 用户令"是否真的做到了系统正确负责任"后立）

**已知未做**（双盲审 X1/X2/Y1/Y2 + 低质量检查 A/B 席抓出 + 自审承认；整改批 `dd0f92e` / `774188e` / `6ee77fa` / `b46cb78` 仅治症状未治根因）：

- **债-1** control plane 零 spec（order-snapshot.controller 5 端点 / order-snapshot-read.service / reconcile-orders.mjs 全无 spec）——为什么不做：本会话已用 jest 89/89 + tsc 0 + 3 脚本跑验替代，但纯函数测盖不住 HTTP/真库集成路径；生产切换前必补。**触发事件** = 准备上 production/staging 真环境前；**排期锚** = 待定新批"control-plane spec 批"（用户裁批名时排入）。【为什么不做+触发事件+排期锚，三选一齐】

- **债-2** P1-E 修是"读取侧补偿"非系统性（TypeORM 水合对象 vs 写侧原生字符串不对称，verifyChain 读取侧转原生）——为什么不做：根治方案=统一约定写/读都用同一形态（如全存对象+`canonicalValue` 内判形态），影响全仓所有读写点，超本会话范围。**触发事件** = 准备引入 PG/TiDB 方言切换时（届时写/读形态差异会暴露在多 dialect 下）。【触发事件】

- **债-3** OrdersService.findById 仍 `relations: { items: true, user: true }`（P2-F 只补了 snapshot controller 的 findOwnership 调用，orders.controller.findOne 仍在用）——为什么不做：findById 是 orders controller 主接口，签名变更涉及面广，需评估"是否所有 caller 都需要 relations"。**触发事件** = orders.controller.findOne 接入 P2 性能债清理时（应同时复审 findById 签名）。【触发事件】

- **债-4** P2-J getSnapshots 分页无 max cap + 无 totalCount——为什么不做：完整分页需 cursor/total + max limit（防止 take=1000000 攻击）+ 响应包装。**触发事件** = 准备上生产 + 单 history > 50 阈值时。**排期锚** = 待定"control-plane spec 批"同批（与债-1 共批）。【排期锚+触发事件】

- **债-5** 性能数字未独立复测（B 席报 396/408/1698ms 等，本会话仅"通过/不通过"未跑 bench）——为什么不做：本会话内真库 perf bench 需要 30MB+ 合成库搭建（30 分钟以上），超本会话范围。**触发事件** = 准备上生产压测前。**排期锚** = 待定"perf bench 批"（与阶段 1 余量"P0 真库测试基建"合并）。【排期锚+触发事件】

- **债-6** 阶段 1 余量 5 项全未动（真库 appendSnapshot spec / 二级索引按需 / 日期分支 formatCanonical / 拆分写串行 / PG 方言）——为什么不做：每项均需独立施工，本会话范围止于"阶段 3+4 主体+整改"。**排期锚** = "阶段 1 余量批"（commit message 已挂账若干次但无独立批名）。**触发事件** = 阶段 5 启动时。**日期** = 截止下次阶段性验收前。【排期锚+触发事件+日期】

- **债-7** commit 60d0f6d 含失实动机 "F-003 busy-wait→setTimeout"（父树无 busy-wait）已改注释 + P2-N 勘正，但 git 历史永久——为什么不做：git 历史不可改，但需在 PR 描述 / 移交文档里加"勘正注"。**触发事件** = 准备做首次代码移交/PR 时（移交文档须含本条勘正）。【触发事件】

**已知 partial 修复**（P2-F 同病已部分治）：

- P2-F：findOwnership 投影 id+userId 仅补了 order-snapshot.controller 4 handler 入口；orders.controller.findOne 仍走 findById（见债-3）。

**观察行**（单例观察项，规则 6；不计数不入挂账）：

- commit message 数字失实（"70% 重复代码消" / "5 端点" / "F-003 busy-wait"）——判单例依据：均为本会话批内自产未独立验证即写入；记录 2026-10-13；升级触发线：再出现"未独立复测即写入 commit message 的承重数字"即升格挂账行（谓词=数字无复现命令三件套即入账）。
- P2-K formatAnchorHeader 调命令参数化后，verify-audit-chain.mjs 仍手写锚行解析（未切 parseAnchorLine）——判单例依据：仅 audit 端一处未切；记录 2026-10-13；升级触发线：再发现"共享模块抽出但部分 caller 仍手抄同源实现"即升格挂账行（谓词=新批抽出后≥1 caller 仍手写 ≥ 5 行同源逻辑）。

**总债数**：7 条挂账（债-1~债-7）+ 2 条观察行。

**下批准备动作**：
1. 阶段 1 余量批立项（合并债-6 + 债-5 性能 bench 部分）
2. control-plane spec 批立项（合并债-1 + 债-4）
3. PG/TiDB 切换准备时合并债-2
4. 首次 PR/移交前补债-7 勘正注


### Reconcile 结果系统正确负责任化（2026-10-13 用户令"reconcile 结果是否挂账或系统正确负责任地修复"后立）

**【挂账批：reconcile:orders 真问题未修清单】**

整改批 `dd0f92e` / `774188e` 只把工具说真话（P1-C/P2-H/P2-M），但工具暴露的 4 个真问题（R1/R2/R3/drift）一个都没修也没挂账。本批补挂账：

- **债-8** R1=30 订单缺 genesis 快照——为什么不做：30 单全在 orders 表但 order_snapshots 表无对应行；本批为 dev 库存量（功能上线前数据），需业务侧决策"回填还是接受"。代码层无 bug。**触发事件** = 阶段 5 启动时（届时需决定是 backfill 还是排除这 30 单）。**排期锚** = 与"阶段 1 余量批"（债-6）合并施工（用真库测试基建 backfill 工具）。【三选一齐+为什么不做】

- **债-9** R2=1 快照数据与 orders 不一致——为什么不做：dev 库 9 快照的 orderId 值（1/2/3）跟 orders.id（2/3/4...）不重合 + 快照 JSON 不含 paymentStatus 字段；dev 库玩具夹具问题，生产快照含 paymentStatus 且 orderId 严格匹配。**触发事件** = dev 库快照数据被新生成覆盖时（届时自动解决）。【触发事件】

- **债-10** R3=1 9 快照无对应审计日志——为什么不做：🔴 **真合规问题**。当前 order_snapshots 有 9 行写入但 audit_logs 表对 orders/snapshot 操作 0 行——快照写入路径**未触发审计**。dev 库现场，prod 切换前必须确认 snapshot 写入是否走 audit 中间件。代码层需查 `order-snapshot.service.ts.appendSnapshot` 是否调 audit（或其上游 service 调）。**触发事件** = 准备上 production 之前必查（合规阻断）。**排期锚** = 待定"snapshot 写审计接入"批（独立小刀）。**日期** = 2026-10-20 前必须有答案（决定是否能上 prod）。【三选一齐】

- **债-11** drift=1 支付成功但订单未标"已付"——为什么不做：🔴 **真业务 bug**。paymentId `PAY_MV0V2RBY_8N10U4_D579BAF6` 状态 success，但对应订单 ORD1791544037238r5v62x9ly（id=199）payment_status 仍 pending。支付事件回调**未触发订单状态更新**或回写逻辑有 bug。需查 `payment-events.listener.ts` 是否调 `ordersService.updateStatus`。**触发事件** = 用户报告"付了款但订单还显示待付"工单进入时（已发生则变 P0）。**排期锚** = 待定"支付回调订单状态同步"批。**日期** = 与债-10 同（2026-10-20 前）。【三选一齐】

**未挂账不修的 R4=OK**：工具正常报告，无问题。

**工具 vs 底层问题 区分原则**（本批反思，下批施工时引此为基线）：
- 工具层修因（P1-C / P2-H / P2-M）= 整改批 774188e 的工作，把"假报"变"真报"。
- 底层数据/业务问题（债-8/9/10/11）= 工具暴露的真问题，需要另外的"业务侧 / DB 侧 / 代码侧"施工。
- 两者**不可混淆**——本会话上一轮自审时误把"工具修了"算"系统正确负责任"，未区分。本批立此原则。

### 13:17 双盲审+低质量检查系统正确性复审（2026-10-13 用户令后立）

**【挂账批：双盲审 P1 治标型未挂账补挂】**

15 条 P1+P2+P3 修复 9 条治本（60%）+ 6 条治标（40%）。5 条 P1 中 3 条治标：P1-A / P1-C / P1-E 均挂账；P2-J 治标型挂账；P2-N 部分治本挂账。**唯一未挂账治标型：**

- **债-12** P1-A 治标——maskSnapshotPii 加 `if (inner) 走内层` 分支是补旁路——根因（rowToPayload 输出形态与 mask 函数输入形态耦合，缺统一约定）未解——下次 rowToPayload 形态变（新增字段、嵌套层级调整、items 数组嵌入 PII 等）都要回头改 mask 函数。**根治方案**：抽 `SnapshotEnvelope<T>` 类型 + mask 改类型化（`maskEnvelope(envelope, isAdmin)` / `maskFlatSnapshot(payload, isAdmin)` 显式二选一）——消除"按运行时形状猜分支"的隐式契约。**触发事件** = 新增 snapshot 字段或形态调整时。**排期锚** = 与债-1 "control-plane spec 批" 同批（届时 spec 也会暴露此契约）。【三选一齐+为什么不做】

**复审数字**（按"系统正确"标准）：
- P1 治本 2/5 = 40%（P1-B、P1-D 真治本；P1-A、P1-C、P1-E 治标挂账）
- P2 治本 6/9 ≈ 67%（P2-F/G/H/I/K/L/M 真治本；P2-J、N 部分挂账）
- P3 治本 1/1 = 100%
- **总治本率 9/15 = 60%**

**未修未挂账的双盲审 P1**（13:17 那批）：0
**治标型已挂账**：6 条（债-2/4/7/10/11/12）
**已治本**：9 条

**下批执行原则**（基线）：
- 治本型=完成态，可验收
- 治标型=未完成态，挂账 + 排期 + 触发器三选一后才能结清
- 不允许"治标=完成"出现在 stage 完成报告里（避免再次出现"工具修了=系统正确"的混淆）

### 债-10/11 根因复盘（2026-10-13 用户令"严肃细致科学地查"后立）

**债-11 根因（精确到代码行）**：
- **触发位置**：`payment-application.service.ts:213-307` `handlePaymentCallback`（支付回调接收路径）
- **缺失闸门**：line 269-274 `paymentOrder.markAsSucceeded(dto.gatewayOrderId, Money.create(dto.receiptAmount || 0, ...))` 直接信任网关返回的 `dto.receiptAmount`——未与 `internalOrder.totalAmount` 对比
- **对比**：下单路径 line 137-148 **有**金额闸（`Math.round(expectedMinor) !== Math.round(requestedMinor)` 拒）
- **W-3 修复盲点**：W-3 ④ 修了创建支付订单的金额校验，**未修接收回调的金额校验**——不对称漏洞
- **drift=1 实测**：order.totalAmount=897 元，payment.amount=0.01 元（金额差 89700 倍）；payment 域标 success → 事件发 → listener 闸正确拒 → 订单保持 pending → drift
- **修法方案**：在 `handlePaymentCallback` line 269 之后加与 line 137-148 同模式的金额校验（拉 ordersService.findOrderByMerchantOrderId + 对比 minor units）；命中后 throw ConflictException 不标 success。30 行代码。

**债-10 根因（精确到代码行）**：
- **触发位置**：`order-snapshot.service.ts:1-23` 头注释明文禁令
- **明文禁令**："绝不调 AuditService.log（自带互斥+独立事务=嵌套自锁死，C 坑A）"
- **不对称证据**：
  - `orders.service.ts:218` `await this.auditService.log(...)` — orders 域其他操作都走 audit
  - `orders.service.spec.ts:388-446` 5 处 `mockAuditService.log` 断言 — 域其他操作入审计有 spec 守
  - 但 snapshot 写入路径**完全无 audit** — 0 行 0 spec
- **根因**：早期三席为防嵌套事务自锁死，明文禁 snapshot 调 audit
- **治本路径**：把 `AuditService.log` 改为接受 `EntityManager` 参数（同事务提交模式）→ 消除"嵌套自锁"理由 → 重走三席审核撤销禁令
- **修法风险**：🔴 高——涉及三席原裁定撤销，必须经三席重审
- **临时方案**（不过三席也能上 prod 的兜底）：在 `OrderSnapshotService.appendSnapshot` 返回前用 `setImmediate` 异步调 auditService.log（独立事务，不影响快照事务）——但这会引入"快照成功但 audit 失败"的不一致风险

**下一步施工顺序**：
1. 债-11 优先（30 行代码，零风险，立刻可上）→ 治本率达 100%
2. 债-10 排三席重审（涉及明文禁令撤销）→ 治本方案 = audit 改同事务模式
3. 债-11 修完后跑 `reconcile-orders.mjs` 验 drift=0
4. 债-10 修完后跑 `reconcile-orders.mjs` 验 R3=0（新增 orders/snapshot 审计行）

### 债-11 治本落地（2026-10-13，commit 6f6c215）

**【债-11 代码层已治本】**

修法：`handlePaymentCallback` 加金额闸（payment-application.service.ts）+ catch 透传 ConflictException + 3 条新 spec。

**治本率** = 100%（仅代码层）。所有未来金额不匹配的第三方回调**都会被拒绝**——drift 现象在产线上无法再发生。

**已确认遗留事项**（dev 库历史脏数据，**修复前**产生，闸不影响历史数据）：
- dev 库 1 处 drift=1（order.totalAmount=897 元 vs payment.amount=0.01 元）仍存在
- 0.01 元支付是修复前 callback 路径缺闸时标为 success 的
- 闸**不**能清除历史 drift——需数据回填

**【挂账：债-13 drift=1 数据回填】**
- **债-13** dev 库 1 处 drift=1（order=199, payment=PAY_MV0V2RBY_8N10U4_D579BAF6）数据回填——为什么不做：业务侧需决定"接受 0.01 元为真实支付"（订单 total_amount 改为 0.01）还是"标记该支付异常退款"（orders.payment_status='failed'，payments.status='refunded'）；本批是代码闸治本，不含业务侧决策。**触发事件** = dev 库 snapshot 模块对账时 drift 不归零（这是事实）→ 业务侧启动"清理历史脏数据"批时。**排期锚** = "drift 数据回填批"（独立小刀）。【三选一齐+为什么不做】

