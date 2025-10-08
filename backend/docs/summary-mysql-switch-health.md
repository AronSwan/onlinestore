项目综述：后端切换到 MySQL 与健康检查

目标
- 切换后端到 MySQL，运行必要迁移，确保服务可启动。
- 诊断并修复健康检查异常，确认核心依赖（DB/Redis）稳定可用。

当前状态
- 后端已在生产模式运行（端口 `3002`，MySQL+Redis，搜索禁用）。
- `GET http://localhost:3002/api/health` 返回 `HTTP 500`（响应体为空），需继续定位失败检查项。

已完成事项
- 停止先前开发服务器以避免端口冲突。
- 生产构建完成，生成 `dist` 并可启动生产模式。
- Redis 验证通过：容器 `caddy-redis` 正常，端口 `6379` 映射通畅，`redis-cli PING` 返回 `PONG`。
- 修复迁移执行方式：使用 `NODE_ENV=production`，通过 `scripts/run-migrations.js` 加载 `dist` 的 JS 迁移。
- 执行 `schema` 迁移成功（包含 `CreateAuditLogs20251001000006` 等），核心表结构创建/确认到位。
- 在 `caddy_shopping_db` 中创建并确认 `audit_logs` 表存在。
- 启动后端（生产模式）并禁用搜索模块（`SEARCH_ENABLED=false`），避免外部搜索依赖导致启动失败。

未完成事项
- 健康检查总览端点 `/api/health` 仍返回 `HTTP 500`，需定位具体失败的健康检查器（可能为外部 API、消息系统或严格依赖）。
- 索引优化迁移失败：`OptimizeIndexes20250930000000` 报错 `Duplicate key name 'idx_users_email_status'`，需清理重复索引后重试。
- 健康子端点不一致：`/api/health/liveness` 与 `/health` 返回 `HTTP 404`，需确认健康路由前缀与控制器挂载路径。
- 尚未对所有依赖检查项（健康模块中的依赖检查器）做逐项验证与降级策略配置。

关键配置与环境
- 数据库：`DB_TYPE=mysql`，`DB_HOST=127.0.0.1`，`DB_PORT=3307`，`DB_USERNAME=caddy_app`，`DB_PASSWORD=caddy_app_pass`，`DB_DATABASE=caddy_shopping_db`。
- Redis：`REDIS_ENABLED=true`，`REDIS_HOST=127.0.0.1`，`REDIS_PORT=6379`。
- 搜索：`SEARCH_ENABLED=false`（暂时禁用，避免外部依赖阻塞启动）。
- 端口：`PORT=3002`（生产模式）。

相关文件与操作
- 迁移脚本：`backend/scripts/run-migrations.js`（使用已编译的数据源运行 TypeORM 迁移）。
- 数据源配置：`backend/src/database/data-source.ts`（按 `NODE_ENV` 切换迁移路径：`src`/`dist`）。
- 数据库变更：`schema` 迁移已执行；`audit_logs` 表已创建；索引优化迁移待处理。
- 应用源代码未修改；主要为运行命令与数据库变更。

证据与日志摘要
- 迁移成功列表：
  - `CreateUsers20251001000001`
  - `CreateUsersReceiveAddress20251001000002`
  - `CreateBasicRegionInfo20251001000003`
  - `CreateUsersSession20251001000004`
  - `CreateCustomerManagementTables20251001000005`
  - `CreateAuditLogs20251001000006`
- 迁移失败：`OptimizeIndexes20250930000000`（重复索引键名）。
- 启动日志：禁用搜索后应用可运行；健康端点仍返回 500。

建议与后续步骤
- 精准定位失败检查项：访问（或暴露）依赖检查端点，如 `/api/health/dependencies`；或提升健康模块日志级别，查看 `HealthCheckService`、`DependencyCheckersService` 的错误详情。
- 临时放宽健康检查：通过环境变量关闭非关键依赖检查（如外部 API、消息系统），仅保留 DB/Redis；或使用健康模块的配置（`health.*`）降低严格度，先恢复 200。
- 处理重复索引：在 MySQL 中删除重复索引（如 `idx_users_email_status`），然后重跑 `OptimizeIndexes20250930000000` 迁移，以消除结构性冲突。
- 如需搜索能力：后续再启用并配置可用的搜索后端（MeiliSearch/Zinc），并确认其健康检查通过。

附注
- 预览链接：`http://localhost:3002/api/health`（当前返回 500）。
- 若需我继续执行：可逐项运行健康检查器并输出失败明细，或编写 SQL 脚本移除重复索引后重试迁移。