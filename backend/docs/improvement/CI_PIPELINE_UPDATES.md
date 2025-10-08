# CI 流水线更新清单

目的：将工程质量门槛前移，确保每次改动都满足构建、测试、安全与健康要求。

## 必要 Job

1. Setup
   - Node 18.x
   - npm ci
   - 缓存 node_modules（按 lockfile hash）

2. Lint
   - npm run lint
   - 阈值：无 error；warn 可接受但需记录

3. Build
   - npm run build
   - 产物：dist/** 作为后续 Docker 构建输入或参考

4. Test
   - npm run test:ci（或 npm run test 与 coverage）
   - 覆盖率检查：阈值不低于 jest.config.cjs 的 global 设置；计划分阶段提升

5. Security
   - npm run security:check:optimized
   - 失败条件：--fail-on=high 或 critical
   - 输出：JSON/SARIF 报告归档

6. Docker
   - docker build（使用修订后的 Dockerfile）
   - docker run -p 3000:3000，等待健康探针通过
   - 健康检查：curl http://localhost:3000/api/health 期待 200

7. Artifacts & Publish
   - 归档：测试报告、覆盖率、lint 输出、安全报告、openapi.json
   - 镜像：推送到 registry（staging 分支或带 commit sha tag）

## 并行与门槛增强（融合外部方案）

- 并行化与缓存
  - Actions 并行 Quality/Unit/Integration；setup-node 启用 npm 缓存；buildx 多平台镜像
- 镜像安全门槛
  - Trivy 镜像扫描（SARIF 上传）作为 Release Gate；出现 high/critical 阻断合并
- 性能基线与压测
  - 增加 perf:baseline 作业（autocannon/clinic）；关键接口 P95 阈值告警；基线对比输出到 PR
- 环境验证
  - Staging 部署 + E2E 必须通过；Production 部署后自动探针验证；失败自动触发回滚提示
- K8s 探针一致性
  - Manifests 探针路径统一 /api/health 与 /api/health/ready；HPA 指标与行为策略校验

## 失败门槛（Release Gate）

- 任意 Job 失败整体失败；禁止合并到主分支
- 安全扫描出现 high/critical 阻断
- 健康检查不通过阻断；性能基线不达标需人工审查

## 仓库与分支策略

- feature 分支合并前必须通过上述 Job
- main 分支启用受保护策略，必须成功通过 CI