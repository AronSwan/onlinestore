# 后端改进优化行动计划

目标：消除构建与运行不一致的问题，提升部署可用性与工程质量，保证安全与可观测性不退化。

时间窗：T+7 天完成高优先级；T+21 天完成中优先级；低优先级进入长期维护。

负责人占位：Owner(Backend)、Reviewer(DevOps)、Approver(TechLead)

## 一、优先级与里程碑

- P0（高优先级，T+7 完成）
  1. 模块系统一致性（ESM/CJS统一）与运行时 require 修复
  2. Dockerfile 构建与健康检查修复（安装 devDeps、prune、健康检查路径 /api/health）
  3. Swagger extraModels 引入方式修正（避免运行时 require 或统一 CJS）
  4. ESLint 忽略规则冲突修复（test 目录不被忽略）
  5. ValidationPipe 非标准配置项移除（启用隐式转换）

- P1（中优先级，T+21 完成）
  1. 生产环境配置管理策略落地（环境变量 + Secret/ConfigMap，移除镜像内 .env）
  2. CORS 头与统一配置管理（允许必要扩展头；配置集中化）
  3. Express 版本兼容性评估（Nest 平台抽象下 5.x 风险评估/退回 4.x）
  4. README 初始化流程与 TypeORM 迁移统一（优先使用 migration:run）

- P2（低优先级，持续）
  1. 单测覆盖率阈值逐步提升
  2. 安全检查与报告自动化周期任务
  3. 文档一致性与覆盖率持续改进

## 二、关键成果指标（KPI）

- 构建与部署：主分支可在 CI 中完成构建与镜像发布；健康检查通过率 100%
- 测试质量：单测通过率 ≥ 95%；覆盖率阈值逐步提升（lines ≥ 30% 第一阶段）
- 安全与规范：Lint 零严重错误；安全扫描无 high/critical
- 可观测性：日志与健康检查端点稳定，APIs swagger 发布正常

### 与外部主方案的量化目标对齐
- 文件组织：根级文件减少至 <20
- 性能：API 平均响应时间 -40%，并发能力提升至 1000+ 用户
- 构建：构建时间 -60%（≈ 2 分钟）
- 质量：ESLint评分 ≥ 9.8；测试覆盖率阶段性提升目标 ≥ 98%

## 三、实施路线图（简要）

- Day 1–2：模块系统统一、Swagger 引入方案调整、ESLint/ValidationPipe 修复
- Day 3–4：Dockerfile 修订、镜像构建测试、健康检查端到端验证
- Day 5–7：CI 更新、配置管理落地（移除镜像 .env）、文档与 README 修订
- Day 8–21：CORS/Express 兼容性处理、覆盖率与安全阈值提升

### 12周阶段性路线（融合主方案）
- Week 1–2 文件结构与文档归档；初步数据库索引与查询优化
- Week 3–4 多级缓存（L1/L2）、分页与压缩、性能基线与压测建立
- Week 5–6 代码质量与严格 TS 配置、并行测试与质量门槛提升
- Week 7–8 架构解耦与事件驱动增强（CQRS/领域事件）
- Week 9–10 构建与测试工具优化、CI 并行和缓存
- Week 11–12 监控与告警完善、HPA 与蓝绿/滚动发布演练

## 四、风险与缓解

- ESM/CJS 切换影响测试与打包：预先在分支内完成端到端验证与回滚脚本
- Docker 镜像体积变动与启动行为改变：分环境灰度并监控启动时日志与健康
- Swagger DTO 引入方式调整：提前编译检查，验证路由生成与 UI 功能

## 五、交付与验收

- 每项变更附带 PR、变更日志与验证步骤
- CI 阶段门槛通过（构建、测试、lint、安全、健康）
- TechLead 审批合并；发布后 24h 监控与问题回溯

## 六、阶段任务细化（融合性能/安全/部署细项）
- 性能（Week 3–4）
  - 解决 N+1；批量 relations 查询；复合索引（cart/order/product）
  - L1 内存 + L2 Redis 双层缓存；游标分页与压缩；响应标准化拦截器
- 安全（Week 5–8）
  - JWT 增强（issuer/audience/jti 黑名单/设备指纹）
  - 实施 MFA/TOTP；RBAC 权限矩阵；Redis 滑窗限流；输入清理
  - 字段级加密与脱敏；安全事件监控与告警
- 部署与CI/CD（持续）
  - GitHub Actions 并行化与缓存；Trivy 镜像安全扫描门槛
  - Docker 多阶段；K8s 滚动/蓝绿；HPA 自动扩缩容；Prometheus 告警
  - 探针路径统一 /api/health 与 /api/health/ready