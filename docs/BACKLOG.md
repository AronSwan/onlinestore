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
- **审美轮挂账（2026-10-04 审美改进组+审计组记录）**：① 导航"男士"入口 7 处（index/orders/profile/login/_header-template）指向 index.html，站点已无男士品类——入口可点通、非死链，去留属产品决策；② seed id1 spec"头层牛皮"图不可证（不矛盾，备案）；③ js/product-search/product-search-manager.js 未接线死代码（无任何页面引用），其 mock 词表（智能手表/蓝牙耳机等）不到达用户，随死代码清理批次处理；④ jest 44-46 个环境依赖型失败（Redis/OpenObserve 类）在 HEAD 既有，专项处理

## 若真要接手（非承诺）

安全基线：`docs/safety.md`（规则→落点→锁）；验证：README"验证"节三命令；
整改全程记录：`docs/remediation-ledger.md`；密钥一律重生成（历史提交中存在旧密钥，开启 GitHub secret scanning 已做）。
