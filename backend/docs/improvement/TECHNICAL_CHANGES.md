# 技术改动细则与执行指南

本文件为具体技术改动的逐项说明与实施要点，用于开发与评审。

## 1. 模块系统一致性

- 现状：package.json "type": "module"，tsconfig "module": "commonjs"，main.ts 中存在 require(...)。
- 方案 A（推荐，改动小）：统一为 CommonJS 运行时
  - 修改 package.json：
    - 将 "type": "module" 改为 "type": "commonjs" 或删除该字段
  - 保持 tsconfig.module = "commonjs"
  - 保留 main.ts 中 require 的使用（Swagger extraModels）
  - Jest：如出现 ESM 相关冲突，去除 extensionsToTreatAsEsm 或关闭 useESM

- 方案 B（ESM 全面化，工作量大）：统一为 ESM
  - tsconfig.module = "ESNext"
  - main.ts 中 require 改为 import 或 createRequire
  - 调整 ts-jest、jest 配置以支持 ESM

## 2. Swagger extraModels 引入

- 在 DTO 上使用 @ApiExtraModels 或在 main.ts 直接类引用：
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ApiResponseDto, ErrorResponseDto, PaginatedResponseDto],
  });

## 3. Dockerfile 修订（关键）

- 构建阶段需要 devDependencies（nest build 依赖 @nestjs/cli 等）
- builder 阶段：复制 nest-cli.json；RUN npm ci；RUN npm run build；RUN npm prune --production
- 运行阶段：不复制 .env；HEALTHCHECK 指向 /api/health；使用非 root 用户与 dumb-init

## 4. 健康检查路径修复

- Dockerfile 中 HEALTHCHECK 由 /health 改为 /api/health
- 与 app.setGlobalPrefix('api') 一致

## 5. ESLint 配置冲突修正

- 从 ignores 移除 'test/'，保留 node_modules、dist、coverage 等忽略项

## 6. ValidationPipe 非标准项

- 移除 validateCustomDecorators；如需隐式转换：
  transformOptions: { enableImplicitConversion: true }

## 7. 配置管理与安全

- 不在镜像内复制 .env；使用环境变量或 K8s Secret/ConfigMap；部署文档同步更新

## 8. CORS 头与统一配置

- 统一定义允许来源、方法与头部（如 X-Requested-With、X-Trace-Id）；生产用白名单

## 9. Express 版本兼容性

- 评估 Nest 平台在 5.x 的兼容性；必要时回退至 4.x

## 10. README 与迁移流程统一

- 优先使用 TypeORM migration:run；直连 SQL 初始化仅作为附录说明

## 11. 性能技术融合（来自性能方案）
- 数据库查询与索引
  - 解决 N+1：relations 批量查询；为 cart/order/product 建立复合索引
  - 连接池参数：connectionLimit、acquireTimeout、idleTimeout、maxQueryExecutionTime
- 分页与响应
  - 游标分页 + 标准分页双轨；CacheInterceptor + CacheTTL；响应压缩阈值 1KB；标准化响应拦截器
- 缓存策略
  - L1 内存 TTL（如 60s）与过期清理；L2 Redis setex 与 keys 失效；更新后按模式失效

## 12. 安全技术融合（来自安全方案）
- 认证与授权
  - JWT 增强（issuer/audience/jti 黑名单/设备指纹）；MFA 支持 TOTP/SMS/Email；RBAC 权限守卫与装饰器
- API 防护
  - Redis 滑动窗口限流（动态配额：认证/匿名/API端点）；输入清理（XSS/SQL/路径遍历）；统一错误与审计日志
- 数据保护
  - 字段级加密（AES-GCM）与脱敏服务；合规检查（GDPR/SOC2 目标）

## 13. 部署与运行融合（来自部署方案）
- CI/CD
  - Actions 并行（质量/单测/集成）；缓存 npm；Trivy 镜像扫描（SARIF）作为 Release Gate
- 容器与集群
  - Docker 多阶段（builder/deps/runtime）；K8s 滚动/蓝绿；HPA 指标（CPU/内存/请求速率）
  - Prometheus ServiceMonitor 与告警；探针路径统一 /api/health 与 /api/health/ready

## 验证点（每项改动都需验证）

- 构建：npm run build 成功
- 单测：npm run test 通过，覆盖率不下降
- Lint：npm run lint 无严重错误
- 安全：security:check 无 high/critical
- 性能：API 平均响应 -40%，慢查询减少；压测基线达标
- 部署：/api/health 正常；镜像 Trivy 通过；K8s 滚动/蓝绿验证