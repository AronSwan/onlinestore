# 低质量代码全面普查·五席卷宗（2026-10-10）

口径：只读普查；全部计数附复现命令（各席原卷备查）；存量挂账与新发现分列。对象=backend/src（非spec 192文件/28380行）+ 前端 js/（28文件/12118行）+ css/（13文件/6642行）+ 测试/基建配置。

## 一、总判

全仓质量面**两极分明**：主流 CRUD/鉴权/支付域错误契约已在规范轨（4xx 异常与裸 Error 用量持平 112:112；payment 域错误类/守卫由 W-3 立起）；**债集中在"脚手架期产物未清偿"与"双侧各自演进无对账"两大病根**。新发现中 4 项达高危级。

## 二、高危新发现（不入任何既有挂账，首次入账）

1. **登录主路径无界等待**（席2）：captcha.service 两处+auth-proxy.service 五处 HTTP 调用无 timeout（且用废弃 .toPromise()）——外部认证服务挂死则登录全挂死。对照面：nominatim/crypto/Redis/TiDB 均已设界，独 captcha/auth-proxy 裸奔。
2. **验证码从未真正发出**（席2）：verify-code.service memoryStore 存后无出口（TODO: integrate real mail provider），注册/登录验证形同虚设；同族通知三渠道（push/email/sms）全为 setTimeout 假实现——9 条 TODO 无任何挂账覆盖 → 立新批"通知域集成刀"。
3. **email-verification.js XSS 活口**（席3）：API 返回 message 直插 innerHTML（该文件未接入 escapeHtml 管线）；叠加 token+refreshToken 明文 localStorage——注入即窃凭证。死口 1（showEmailVerificationNotice 裸插 email）。
4. **枚举双轨再添两组**（席1）：OrderStatus×2（entity 版含 PAID 被 W-3 联动使用；enums 版无 PAID 且全仓零引用=影子死轨，值域已分歧）；UserRole×2+Role×1（三轨，GUEST 仅 Role 有）。归一批原只圈 payment 域，未扫全仓。
5. **orders 事务内事件外发（幽灵事件）**（席2）：orders.service create 事务回调体内 publishOrderCreatedEvent 未 await 即发——事务回滚则事件已外发（payment 域同类病已修，orders 同源病漏网）。

## 三、各面计数总汇（复现命令在各席原卷）

| 面 | 计数 | 定性 | 归批 |
|---|---|---|---|
| any 残留 | 119 次/114 行（地板守住无回升；nestjs-adapter 单文件占 18%） | 存量 | 随死件清理批 |
| 裸 Error 业务拒绝 | 112 处（约 1/3 业务面误用→500；search 三件套 35 处集中） | 高 | W-1刀3 扩容+域错误规范 |
| catch 分类 | 203 块：A吞11/B静默降级92/C不分类58/D合理42；最重=products 六处空 catch 吞缓存失效（脏读窗口） | 高 | W-1刀3（清单已分级） |
| 漂浮 promise | 无意 0（13 处抽验全假阳性；全库 .catch 托底 16 处惯例成型） | **结清** | 刀2 该子项销账 |
| 无界外部等待 | 5 面：Meili/Zinc/Redpanda（挂账内）+captcha/auth-proxy（新） | 高 | 瘦身刀+auth 小刀 |
| 危险默认值 | 124 处模式/业务字段 19/抽验 10 中洗白 3（支付 2+营收统计 1）；另发现 popular-search 计数本身系伪造数据 | 中高 | 支付批+刀3 |
| 巨型文件/方法 | >800 行文件 1（products.service 1155）；>80 行方法 8（update 238 行居首）——products 上帝类成立 | 中高 | 新债：products 分层立项 |
| 复制粘贴族 | 后端 5 族（支付策略三胞胎/密码剥离三连/搜索引擎平行/DTO 三轨/埋点 58 处）+前端 5 族（鉴权态四写/价格格式三写/OAuth 双实现/回退商品四写/loading 双写）≈650 行 | 中 | 各批分收 |
| DTO 密码下限分歧 | RegisterDto min8 vs CreateUserDto min6（同名约束两种下限） | **语义裁决** | 待用户 |
| 未使用导出 | 366 中 120 零引用（≈110 实候选）：含整模块死件 2（vulnerability-status 服务含 101 行 mock 审计日志生成器/email-verification TS 适配器 562 行悬空） | 中 | 死件清理批（2 死件去留待裁） |
| 死选择器 | 70/431 class 零引用（≈102/1049 规则=9.7%；orders.css 56/161=35% 最重）；order-timeline 全族命名分裂（js 用 order-detail-timeline，css 定义 order-timeline——**订单详情时间线无样式已上线 dist**） | 中高 | W-2 死代码批+对齐裁决 |
| 魔法色值 | 非令牌 hex 67（裸 34+fallback 25）+rgb~32；product-search-enhanced.css 外来色板独占 62%；fallback 漂移 6 组 | 中 | W-2刀1 stylelint |
| 断点混乱 | 宽度阈值 9 种并存；main.css 同文件 min/max 同值边界重叠；三套边界约定 | 中 | W-2刀1 |
| !important/z-index | 27 处（23/27 标准模式合理）；z 六档令牌基本落地无冲突 | 低 | 随联动退役 |
| 前端死代码 | 14 零引用函数 ≈260 行（OAuth 死双实现/toast 漏删/幻想 MX 检查）；存储键 15 个无命名空间 11 个 | 中 | W-2刀5 扩容 |
| 弱断言 | 50/802=6.2% 纯弱；脚手架 12；占位套件 1（app.controller.spec 测 1+1=2） | 中 | W-4 顺手清 |
| mock 漂移 | phantom 方法 9（monitoring 4+redpanda 5）+签名过期 1+死工厂 1（test-setup-helper 按想象接口造，真实类演进后无回访） | 中 | W-4 加刀 |
| e2e | 6 套件 110 用例全部打不到现路由（前缀死/路径死/控制器不存在）；文件头零"旧契约勿信"标记 | 高（存量） | W-4刀1 |
| 配置卫生 | 死键 10（OPENOBSERVE 系）/未文档化键 171/208/Joi 覆盖 34/208/**NaN 风险键 5**（DB 连接池参数未设即 NaN） | 中高 | 新批"env 对账单" |
| 部署 | k8s meili v1.7.4 vs compose v1.54.3（跨 47 minor）；未钉镜像 4；compose 死键 3；前端 Dockerfile 漏拷 5 页 | 中 | 部署对账批 |
| 死配置/散件 | 死件 4+死双份 2+backend 根散件 18（test-*.js/html 等） | 中 | W-4刀5 扩容 |

## 四、结清与健全面（不预设立场的对面）

漂浮 promise 0/事务吞错 0（7 事务点回滚全完整）/process.exit 2 处均引导期合理/backend spec 零 skip/only/前端转义纪律六文件成型（47 innerHTML 点 41 已护）/toast 已归一/admin apiFetch 集中封装成型/z-index 六档无冲突/!important 无滥用/scripts 退出码纪律好。

## 五、病根三类（跨席归纳）

1. **脚手架未清偿**：mock 支付策略注册进活工厂、通知三渠道假实现、验证码无出口、占位 spec、死库存 css——"能演示"后集成清单未执行。
2. **双侧无对账**：js↔css 命名分裂、example↔代码键漂移、k8s↔compose 版本漂移、mock↔真实接口 phantom——产物写完即冻结，真实面演进无同步钩。
3. **归一不彻底**：枚举归一只圈 payment、密码规则三轨、回退商品四写——归一运动半途而废。

## 六、待用户裁决（空白呈报）

1. 密码下限：min 8（RegisterDto/RegisterUserDto）vs min 6（CreateUserDto）——哪个是本店正确规则？
2. email-verification TS 适配器（562 行悬空）：接线启用 or 删除（独立 Express 服务现状保留）？
3. 前端 Dockerfile 漏拷 5 页（admin/product/profile/privacy/returns）：死页面该删 or 漏拷该补？
4. order-timeline 命名分裂对齐方向：js 侧活（order-detail-timeline）→ css 侧 8 类改名跟随？还是反向？
