# 部署残骸归档（2026-10-02）

> ⚠️ **已归档**：本目录收纳散落的 compose 变体与一次性部署/验证脚本，**不代表当前部署方式**，不再维护。现行编排只保留仓库根目录三套：`docker-compose.yml`（主）、`docker-compose.local.yml`、`docker-compose.openobserve.yml`。缺口与修复方案见 [`docs/BACKLOG.md`](../../BACKLOG.md)。

## compose 变体（17 套，按原相对路径存放）

| 归档位置 | 原位置 | 说明 |
| --- | --- | --- |
| `docker-compose.dev.yml` / `docker-compose.partial.yml` | 仓库根 | 根目录多余变体 |
| `docker/docker-compose.email-verifier*.yml`（3 套） | `docker/` | email-verifier 专用变体 |
| `docker-validation-scripts/docker-compose.yml` | `docker-validation-scripts/` | 验证脚本自用编排 |
| `backend/docker-compose{,.simple,.test-monitor,.tracing}.yml`（4 套） | `backend/` | 后端目录多余变体 |
| `backend/docker/{openobserve,redis,redpanda,test-runner}/docker-compose.yml`（4 套） | `backend/docker/*/` | 中间件专用变体 |
| `backend/docker/docker-compose.tidb.yml` | `backend/docker/` | TiDB 变体 |
| `backend/scripts/docker-compose.test-runner-secure.yml` | `backend/scripts/` | 沙箱测试自用 |
| `backend/src/payment/docker-compose.yml` | `backend/src/payment/` | 误入源码目录的变体 |

## 部署/验证脚本（12 个，`scripts/` 子目录按来源存放）

- 原根 `scripts/`：`docker-deploy.sh`、`docker-deployment-validator{.sh,.ps1,-simple.ps1}`、`deploy-email-verifier.sh`、`deploy-enhanced-email-verifier{,-v2}.sh`、`comprehensive-openobserve-test.js`
- 原 `backend/scripts/`（存于 `scripts/backend/`）：`deploy-and-test-openobserve.cjs`、`run-docker-sandbox-test.{sh,ps1}`
- 原 `docker-validation-scripts/`（存于 `scripts/docker-validation-scripts/`）：`utils.sh`（引用本归档中的 `docker-validation-scripts/docker-compose.yml`）

注意：`docker-validation-scripts/` 原位仍留有 9 个通用验证脚本（被已失效的 `.github/workflows/docker-validation.yml` 引用，该工作流触发分支 `main` 不存在），处置见 BACKLOG K5。
