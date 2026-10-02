[![CI](https://github.com/AronSwan/onlinestore/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/AronSwan/onlinestore/actions/workflows/ci.yml)
[![CodeQL](https://github.com/AronSwan/onlinestore/actions/workflows/codeql-analysis.yml/badge.svg?branch=master)](https://github.com/AronSwan/onlinestore/actions/workflows/codeql-analysis.yml)
[![依赖安全检查](https://github.com/AronSwan/onlinestore/actions/workflows/dependency-check.yml/badge.svg?branch=master)](https://github.com/AronSwan/onlinestore/actions/workflows/dependency-check.yml)
[![SBOM & 签名](https://github.com/AronSwan/onlinestore/actions/workflows/sbom-sign.yml/badge.svg?branch=master)](https://github.com/AronSwan/onlinestore/actions/workflows/sbom-sign.yml)

# Reich 在线商店（电商演示项目）

静态 HTML/JS 前端 + NestJS 后端的电商演示站，用于功能演示与工程实践。不含真实支付通道与商户能力。

## 当前状态

| 模块 | 状态 | 说明 |
| --- | --- | --- |
| 健康检查 | 可用 | `GET /api/health`（另有 `backend/src/health` 模块） |
| 注册 / 登录 | 可用 | `/api/auth/*`，JWT（访问令牌默认 15m，刷新 7d） |
| 商品 | 可用 | `/api/products` |
| 购物车 | 后端路由可用 / 前端同步未对齐 | 后端为参数化路由（`GET /api/cart/items/:customerUserId` 等，见 `backend/src/cart`），未挂认证守卫；前端为本地购物车，服务端同步因身份映射与 SKU 契约未对齐而静默降级 |
| 订单 | 可用 | `/api/orders`；前端带演示回退（后端不可用时使用本地演示数据） |
| 支付 | 演示 / 未完成 | `backend/src/payment` 各策略（alipay / wechat-pay / credit-card）实现为 TODO；回调验签 fail-closed（校验失败即拒绝） |
| AI 助手 | 演示 / 未接线 | 仓库内是规则式（非大模型）演示代码（如 `js/nextchat-advanced-unified.js`），未挂载到任何页面；旧版 README 宣称的"NextChat 多模态 AI 助手"与现实不符 |
| OpenObserve 监控 | 未部署 | 配置与 compose 片段齐全（`.env.openobserve*`、`docker-compose.openobserve.yml`），仓库内无实际部署 |

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
docker compose up -d frontend backend
```

## 目录结构

```
├── index.html / login.html / orders.html / profile.html   # 静态页面
├── js/  css/  images/                                     # 前端资源
├── backend/                # NestJS 后端（src/ 按模块划分：auth、products、cart、orders、payment、health 等）
│   ├── docs/               # 后端现行文档；docs/archive/ 为历史报告归档
│   └── data/               # SQLite 库文件（仅本地，不入库）
├── docs/                   # 项目文档；archive/ 为历史过程文档归档
├── docker-compose*.yml     # 本地编排（frontend / backend / postgres / redis / nginx-lb 等）
├── k8s/  docker/  scripts/ # 部署配置与脚本
└── tests/                  # Playwright 前端测试
```

## 测试

- 后端：`cd backend && npm run test:unit`（Jest 单测基线 905 个用例，2026-10-02 在本机全绿，可复跑）
- 前端：`npm test`（Playwright，部分用例需要后端在本地运行）

## 已知限制与改进路线

- 支付为演示态：策略层 TODO，未接真实网关；回调验签 fail-closed。
- 购物车服务端同步未打通：后端购物车以 `customerUserId`（顾客域 ID，与认证用户 `User.id` 是两套身份）+ `productSkuId`（SKU 域）为键，前端只有认证令牌和商品 ID，缺少身份映射与 SKU 数据模型。打通前需要先做身份映射设计与商品 SKU 化，当前前端同步失败时静默回退本地存储。
- AI 助手是规则式演示代码，与页面未接线，无后端会话支持。
- 监控栈（Prometheus / Grafana / OpenObserve）只有配置与编排，未部署。
- 大量历史过程文档（优化报告、修复记录、方案稿）已移入 `docs/archive/` 与 `backend/docs/archive/`，仅作历史参考，不代表当前系统行为，其中的相对链接可能失效。
- 仍保留在原位的专项文档：`README-SEARCH.md`、`README-K8S-SEARCH.md`（被 `k8s/search/README.md` 引用），以及 `docs/`、`backend/docs/` 下的现行文档。

## 安全提示

- 仓库内所有 `.env*` 文件均为消毒后的模板：`.env.example` 与 `.env.test` 类模板使用 `test_password` / `your_*` 类占位符，其余已消毒文件使用 `CHANGE_ME_*` 占位符（键与非敏感配置保留）。**生产部署必须通过环境注入真实密钥**：`JWT_SECRET`（≥32 字符）、`ENCRYPTION_KEY`（32 字节）、数据库 / Redis / 监控密码等。
- `.gitignore` 已收口：`**/.env.*`（保留 `*.env.example` 类模板例外）、`*.sqlite`、`backend/data/*.db`、`*.sarif`、Jest 运行结果等不再入库。
- 历史提交中仍可能残留旧的密钥或数据文件；若仓库公开，请另行审计 git 历史（不在本 README 范围内）。

## 相关入口

- 后端 API 文档：`backend/docs/API_DOCUMENTATION.md`
- 搜索服务集成：`README-SEARCH.md`；K8s 搜索部署：`README-K8S-SEARCH.md`
- CI / 安全工作流：`.github/workflows/`
- 运维与排障：`docs/operations.md`、`docs/troubleshooting-maintenance-guide.md`
