# 已知不修清单（Known-Won't-Fix）

> 本仓库为无人维护的演示项目。以下为**明确不修**的已知事项（非路线图、非待办）——
> 历史过程文档与详细修复方案已从工作树移除，完整上下文见 git 历史与 `docs/remediation-ledger.md`。
> 若有人 fork 接手，按 `docs/safety.md` 的规则落点与锁作为安全基线起步。

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
- **28 条 SPA 死链**：/about /privacy /terms 等页面从未存在
- **前端 Playwright 套件**：5 个 spec 端口漂移（5173 vs 4173）+ 标题断言过期，弃管
- **依赖残留**：生产树 22 项（0 critical / 8 high，全为间接依赖）；swagger 内嵌 js-yaml@5.3.0（dump-only 路径不可达）
- **JWT_SECRET 开发回退为已知固定值**：生产黑名单拒启，开发共钥风险已知
- **Casdoor 前端直连未启用**（后端代理链路在）；邮箱验证为本地降级；AI 助手未接线
- **通知 test/bulk 内联 body 无 DTO**（admin-only 缓解）；前端 URL 值无协议限制（转义有、协议白名单无）
- **Redis 缺失时启动日志刷屏**（降级语义正确）；OpenObserve/监控栈未部署

- **假遥测与卫生债（已知不修）**：logAuditLog 伪 id/getAuditLogs 恒空、MetricsInterceptor 双注册、时序攻击空壳测试×2、security-monitoring 四端点硬编码 success:true、新旧 CacheService 双轨、D8 僵尸命令四件（config:generate/file:.. 自引用/PM2 入口漂移/scripts 包边界）、webpack 生产 source-map、孤儿模块四控制器（见 safety.md 支付行警示）
- **挂账区（产品决策类，永不自动开工）**：logout 服务端令牌黑名单 / verify-code 邮件 provider 选型 / 实体收敛触发器（真实 MySQL 部署时） / register 返回语义（201+token vs 纯 201）/ 中文用户名支持
- **实战检验挂账（2026-10-04 实战检验反查组三席+修复记录）**：① audit 写操作覆盖不全——上传 201 无审计行、失败尝试（403/404）零痕迹、ip 恒空串，随 M3 管理界面一并补；② 真实安全响应头（X-Frame-Options/nosniff 经 HTTP 头而非 meta）随 F4 login CSP 收紧一并做（login.html 三个无效 meta 已删）；③ cart.js 游客态调 /api/cart/items/guest 得 401 属正确拦截，前端静默化处理随"购物车服务端同步"挂账项；④ checkNameImage 词表外包型红拦报文措辞与事实不符（P3，js/shared/integrity-rules.js 已修叠词过拦，报文待润色）；⑤ 上传端点无配额/频控（admin-only 已缓解）；⑥ **PATCH /api/products/:id 带 images（string[]）触发 TypeORM 跨一对多 500**（M1 遗留，DTO 字段灌 repository.update 直撞关系列；admin UI 已规避不传并注释；正确修法=update 前剥离关系字段或实现多图画廊写入，随 product_images 表启用一并做）
- **实战检验战果（同轮，已修不复存在）**：游客图标劫持（bindUserIconClick 绑容器+内联脚本无条件跳 login 双根因）、搜索建议 [object Object]、缓存 TTL 毫秒/秒单位错位（全站缓存 0 命中，修复后 miss→hit→hit 实测）、引擎在线 isActive 两回流面、@ApiQuery 三行失实、上传 polyglot（结构完整性校验补齐）、M4 叠结构词过拦假阳性
- **审计改判记录（2026-10-04 反查席）**：里程碑一竣工验收"13/13 通过零 P0"改判为"范围内达标，活站带 1 P1+2 P2"——方法以代码存在+视觉尺寸为主、缺交互与运行态行为验证；上轮审计对 jest"零偏差"表述未充分披露 44=环境型失败数。改判教训入 remediation-ledger：**验收必须含交互级实测（点击行为/缓存命中/运行态）**，纸面"类名都在"不等于"契约活着"
- **服务运维**：本地双服务起停已固化为 `bash scripts/dev.sh start|stop|status|restart`（后端启动 60-90s 属外部依赖重试所致，非故障；vite 绑 IPv6，探测用 localhost）

## 若真要接手（非承诺）

安全基线：`docs/safety.md`（规则→落点→锁）；验证：README"验证"节三命令；
整改全程记录：`docs/remediation-ledger.md`；密钥一律重生成（历史提交中存在旧密钥，开启 GitHub secret scanning 已做）。
