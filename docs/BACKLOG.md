# 已知不修清单（Known-Won't-Fix）

> 本仓库为无人维护的演示项目。以下为**明确不修**的已知事项（非路线图、非待办）——
> 历史过程文档与详细修复方案已从工作树移除，完整上下文见 git 历史与 `docs/remediation-ledger.md`。
> 若有人 fork 接手，按 `docs/safety.md` 的规则落点与锁作为安全基线起步。

## 不修项

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

## 若真要接手（非承诺）

安全基线：`docs/safety.md`（规则→落点→锁）；验证：README"验证"节三命令；
整改全程记录：`docs/remediation-ledger.md`；密钥一律重生成（历史提交中存在旧密钥，开启 GitHub secret scanning 已做）。
