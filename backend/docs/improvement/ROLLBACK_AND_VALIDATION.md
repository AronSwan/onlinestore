# 回滚与验证策略

目的：确保改动可灰度发布、出现异常可快速回滚，并有完备的验证清单。

## 一、灰度发布

- 在 staging 环境先发布，开启访问日志与健康探针观测 24 小时
- 关键指标：启动成功率、健康检查成功率、错误日志频率、主要 API 成功率

## 二、回滚策略

- 模块系统改动回滚：保留上一版本 package.json 与 tsconfig.json 备份；提供脚本一键切换 CJS/ESM
- Docker 镜像回滚：保留稳定镜像 tag；CI 手动触发回滚
- Swagger 引入方式回滚：保留 require 与 import 双实现分支

## 三、验证清单（发布前）

- 构建与镜像：npm ci、npm run build 成功；Docker build/run 成功，容器日志正常
- 运行时：/api/health 返回 200；/api/docs 可访问并试用；Winston 日志正常
- 安全与规范：Lint 通过；security:check 无 high/critical；npm audit 无高风险
- 测试与覆盖率：单测通过；覆盖率不低于基线（lines ≥ 15% 起步，逐步提升）

### 性能与安全门槛（融合外部方案）
- 性能验收
  - API 平均响应时间下降 40%（按基线对比）；关键接口 P95 < 100ms（阶段目标）；并发 1000+ 压测通过
  - 慢查询阈值与报警（maxQueryExecutionTime < 1s）；缓存命中率与失效策略抽检（L1/L2）
- 安全验收
  - MFA/TOTP 启用率 100%；RBAC 权限矩阵验证；限流头部校验（X-RateLimit-*）
  - 敏感字段加密/脱敏抽样检查；安全事件采集与告警规则生效

## 四、发布后监控（24–48h）

- 指标：CPU、内存、响应时间、错误率、健康检查
- 触发条件：指标异常、错误日志激增、接口 5xx 增加时自动告警并评估回滚

### 集群级校验（K8s/镜像）
- 探针路径一致性：/api/health 与 /api/health/ready
- HPA 行为策略验证（缩放窗口、策略阈值）
- 镜像安全：Trivy 扫描通过后方可发布（作为 Release Gate）