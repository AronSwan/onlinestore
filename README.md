[![CI](https://github.com/AronSwan/onlinestore/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/AronSwan/onlinestore/actions/workflows/ci.yml)
[![CodeQL](https://github.com/AronSwan/onlinestore/actions/workflows/codeql-analysis.yml/badge.svg?branch=master)](https://github.com/AronSwan/onlinestore/actions/workflows/codeql-analysis.yml)
[![依赖安全检查](https://github.com/AronSwan/onlinestore/actions/workflows/dependency-check.yml/badge.svg?branch=master)](https://github.com/AronSwan/onlinestore/actions/workflows/dependency-check.yml)
[![SBOM & 签名](https://github.com/AronSwan/onlinestore/actions/workflows/sbom-sign.yml/badge.svg?branch=master)](https://github.com/AronSwan/onlinestore/actions/workflows/sbom-sign.yml)

# Reich 在线商店（电商演示项目）

> ⚠️ **演示项目，无人维护，请勿原样部署**：本仓库为学习/演示用途的电商原型。支付未接线（回调验签 fail-closed）；后端核心链路经多轮审计与 988 项单测验证（见下方"验证"三命令，任何人可复跑）；已知不修事项见 `docs/BACKLOG.md`（已知不修清单，非路线图）。

静态 HTML/JS 前端 + NestJS 后端的电商演示站，用于功能演示与工程实践。不含真实支付通道与商户能力。

## 验证（三条命令，任何人可复跑）

```bash
cd backend && npx tsc --noEmit -p tsconfig.json && npx tsc --noEmit -p tsconfig.spec.json && npm run test:unit
cd backend && npm run build && PORT=3000 node dist/src/main.js &   # 另开终端: bash scripts/smoke.sh
python3 scripts/check-frontend-assets.py
```

依赖审计：`cd backend && npm audit --package-lock-only --omit=dev`（当前：22 项 / 0 critical / 8 high）。

## 当前状态

| 模块 | 状态 | 说明 |
| --- | --- | --- |
| 健康检查 | 可用 | `GET /api/health`（另有 `backend/src/health` 模块） |
| 注册 / 登录 | 可用 | `/api/auth/*`，JWT（访问令牌默认 15m，刷新 7d） |
| 商品 | 可用 | `/api/products` |
| 购物车 | 后端路由可用 / 前端同步未打通 | 后端购物车路由已挂 `JwtAuthGuard` + `CartOwnerGuard`（见 `backend/src/cart/interfaces/cart.controller.ts`）：`customerUserId` 必须等于认证用户 JWT `sub`，不一致一律 403（越权拦截）；前端 gap 是 `js/cart.js` 仍在调用不存在的 `/api/cart` 根路由，失败后静默回退本地购物车。接通需按 `/api/cart/items/{sub}` 契约改造前端（携带认证令牌，body 需 `productSkuId` 等 SKU 域字段） |
| 订单 | 可用 | `/api/orders`；前端带演示回退（后端不可用时使用本地演示数据） |
| 支付 | 演示 / 未完成 | `backend/src/payment` 各策略（alipay / wechat-pay / credit-card）实现为 TODO；回调验签 fail-closed（校验失败即拒绝） |
| AI 助手 | 演示 / 未接线 | 仓库内是规则式（非大模型）演示代码（如 `js/nextchat-advanced-unified.js`），未挂载到任何页面；旧版 README 宣称的"NextChat 多模态 AI 助手"与现实不符 |
| OpenObserve 监控 | 未部署 | compose 片段与 example 模板齐全（`docker-compose.openobserve.yml`、`backend/.env.openobserve.example`），仓库内无实际部署 |

## 快速开始

### 后端（默认 SQLite，零外部依赖）

```bash
cd backend
npm install
npm run start:dev      # http://localhost:3000/api/health
```

- 默认数据库为 SQLite（`DB_TYPE=sqlite`，参考 `backend/.env.example`），首次启动自动生成库文件（`backend/data/*.db`，已加入 `.gitignore`，不入库）。
- 需要切换 Postgres / Redis / TiDB 时，复制 `backend/.env.example` 为 `backend/.env`（后端按 `.env.local` → `.env` → `../.env` 顺序加载），或参考 `backend/.env.example` 与 `docker-compose.yml`。

### 前端

```bash
# 方式一：任意静态服务器（页面通过同源 /api 访问后端，需自备反向代理 /api -> http://localhost:3000）
npx http-server -p 8080

# 方式二：docker compose（frontend 服务即 nginx：静态资源 + /api 反代到 backend:3000）
# 三步（根目录执行）：
cp .env.example .env      # 1) 生成环境配置
# 2) 在 .env 中填入真实密钥：JWT_SECRET 与 ENCRYPTION_KEY 用 `openssl rand -hex 32` 生成
#    （ENCRYPTION_KEY 需恰好 64 个十六进制字符）；POSTGRES_PASSWORD、REDIS_PASSWORD 亦为必填
#    （redis 已启用 --requirepass，REDIS_PASSWORD 缺失时 compose 直接拒启）
docker compose up -d frontend backend   # 3) 起服务，入口 http://localhost（80/443 对外，数据面端口仅绑 127.0.0.1）
```

## 目录结构

```
├── index.html / login.html / orders.html / profile.html   # 静态页面
├── js/  css/  images/                                     # 前端资源
├── backend/                # NestJS 后端（src/ 按模块划分：auth、products、cart、orders、payment、health 等）
│   ├── docs/               # 后端现行文档
│   └── data/               # SQLite 库文件（仅本地，不入库）
├── docs/                   # 项目文档（safety.md 安全规则总账、BACKLOG 已知不修清单）
├── docker-compose.yml / docker-compose.local.yml / docker-compose.openobserve.yml   # 现行编排仅此三套（frontend / backend / postgres / redis / nginx-lb 等）
├── docker/  scripts/       # 运行配置与运维脚本（冒烟自测：scripts/smoke.sh）
└── tests/                  # Playwright 前端测试
```

## 测试

- 后端：`cd backend && npm run test:unit`（988 个用例 / 52 个套件，2026-10-02 本机全绿，可复跑）
- 冒烟自测：`bash scripts/smoke.sh`（需后端已在本机运行，默认 3000 端口，`PORT=xxxx` 可指定；覆盖 健康检查 → 注册 → 登录 → 带凭据购物车 → 匿名 401 → 错误密码 401）
- 后端安全检查：全新 clone 后需先 `cp backend/.env.test.example backend/.env.test`（`npm run security:check:test` 依赖该文件，`.env.test` 不入库）
- 前端：`npm test`（Playwright，部分用例需要后端在本地运行）

## 已知限制与改进路线

- 已验证可用的后端链路：健康检查、注册、登录、购物车（参数化路由 `/api/cart/items/{sub}`，挂 `JwtAuthGuard` + `CartOwnerGuard`）、订单——经 988 项单测与 `scripts/smoke.sh` 冒烟验证；差距集中在前端接通与下列各项。
- 支付为演示态：策略层 TODO，未接真实网关；回调验签 fail-closed。
- 购物车前端同步未打通：后端购物车的 `customerUserId` 键即认证用户 JWT `sub`（有意决策，越权 403）；差距在前端——`js/cart.js` 仍在调用不存在的 `/api/cart` 根路由，失败后静默回退本地存储。接通需按 `/api/cart/items/{sub}` 契约改造前端（携带认证令牌，body 需 `productSkuId` 等 SKU 域字段）。
- AI 助手是规则式演示代码，与页面未接线，无后端会话支持。
- 监控栈（Prometheus / Grafana / OpenObserve）只有配置与编排，未部署。
- 部署残骸（缺陷 k8s 清单、17 套 compose 变体、一次性部署脚本）与全部历史过程文档已从工作树移除——git 历史（提交 6e55ecc/90a1cd8 及本仓库 log）可完整追溯；根目录仅保留 `docker-compose.yml`（主）、`docker-compose.local.yml`、`docker-compose.openobserve.yml` 三套。
- 仍保留在原位的专项文档：`README-SEARCH.md`、`README-K8S-SEARCH.md`（历史搜索方案文档），以及 `docs/`、`backend/docs/` 下的现行文档。

## 安全提示

- **安全规则总账**：[`docs/safety.md`](docs/safety.md)——每条规则的确切代码落点与锁（规则→文件映射，参照 Anthropic commerce-agents 的 safety 文档体例）。
- 仓库内所有 `.env*` 文件均为消毒后的模板：`.env.example` 与 `.env.test` 类模板使用 `test_password` / `your_*` 类占位符，其余已消毒文件使用 `CHANGE_ME_*` 占位符（键与非敏感配置保留）。**生产部署必须通过环境注入真实密钥**：`JWT_SECRET`（≥32 字符）、`ENCRYPTION_KEY`（32 字节）、数据库 / Redis / 监控密码等。
- `.gitignore` 已收口：`**/.env.*`（保留 `*.env.example` 类模板例外）、`*.sqlite`、`backend/data/*.db`、`*.sarif`、Jest 运行结果等不再入库。
- 历史提交中仍可能残留旧的密钥或数据文件；若仓库公开，请另行审计 git 历史（不在本 README 范围内）。

## 相关入口

- 后端 API 文档：`backend/docs/API_DOCUMENTATION.md`
- 搜索服务集成：`README-SEARCH.md`；K8s 搜索部署：`README-K8S-SEARCH.md`
- CI / 安全工作流：`.github/workflows/`
- 运维与排障：`docs/operations.md`、`docs/troubleshooting-maintenance-guide.md`
