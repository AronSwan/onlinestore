# 专属闸触发表（quality-charter v1.4 闸门节附件）

效力源出纲领"闸门"节。行级增改免修订三同步，但须同 commit 留痕（日期+动机+行变更摘要）；增删闸类、改三道阶段闸本体、本表载定义或严重度=实质修订走三同步；本表与正文冲突正文赢即改。

| 触发条件（改动面命中即挂） | 查验动作（证据附 commit 或验收卷） |
|---|---|
| package.json / package-lock 变更 | `npm ls invalid=0` + `npm ci --dry-run` exit 0 |
| schema / 迁移文件变更 | `migration:show` 输出附卷 + 方言核对（批内验收级） |
| .env / .env.example 变更 | 两文件逐键对账 diff 附卷 |
| 新增页面 / 部署物变更（html/Dockerfile/compose/k8s） | 部署面互相对账（部署清单立件前，以 docker//k8s/ 目录 + Dockerfile COPY 面对账代位；部署清单随部署对账批立件） |
| 模块挂载状态变更（app.module.ts） | safety.md 对应行复核（双向：safety.md 表内自注同款） |

留痕区（行级变更记录，同 commit）：
- 2026-10-10 立表（v1.4 立法批）：首批五行 + 部署清单代位句（泰斗席二断链修补）。
