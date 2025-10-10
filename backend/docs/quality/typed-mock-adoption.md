# Typed Mock 采纳度量与实践

本文档描述在后端代码库中推广“类型化 Mock”（Typed Mock）的度量方法、运行方式、CI 展示以及重构指南，帮助团队持续提升测试的类型安全与可维护性。

## 目标与范围
- 提升测试中 Mock 的类型安全，减少未类型化的 `jest.fn()` 使用。
- 统一 `QueryBuilder` 等复杂对象的 Mock 方式，降低散乱定义与链式断言风险。
- 在 CI 中可视化采纳率与未替换的 `jest.fn()` 计数，便于优先级排序与跟踪。

涵盖的模式示例：
- `createMockedFunction<T>()` 等工厂方法，用于替代裸 `jest.fn()`。
- `jest.MockedFunction<typeof fn>` 等类型约束。
- `createMockQueryBuilder()`，用于 TypeORM `QueryBuilder` 的链式、可类型推断的 Mock。

## 本地运行与输出
- 本地运行命令：
  ```bash
  cd backend
  npm run metrics:typed-mock
  ```
- 生成报告位置：`backend/test-results/adoption-report.json`
- 报告主要字段（示例解析）：
  - `summary.totalFiles`：统计范围内的测试文件总数。
  - `summary.adoptedFiles`：已采用类型化 Mock 的文件数。
  - `summary.adoptionRate`：采纳率（`adoptedFiles / totalFiles`）。
  - `summary.bareJestFnOccurrences`：未类型化的 `jest.fn()` 出现次数总计。
  - `summary.modules`：模块维度的采纳明细（如 `src/logging`、`src/products` 等）。
  - `files[]`：逐文件指标（含 `bareJestFnCount` 与识别到的类型化模式）。

## CI 集成与可视化
- 工作流：`.github/workflows/typed-mock-adoption.yml`
- Step Summary 展示：
  - 总采纳率与文件数：`adopted/total` 与百分比。
  - 模块分解：各模块的采纳统计。
  - 未替换的 `jest.fn()` 出现次数：用于发现热点与优先治理点。
- 工件（Artifacts）：`typed-mock-adoption-report`，内含 `adoption-report.json`，可供历史对比与外部分析。

## 重构指南（建议优先级）
- 高频依赖优先：如 `logging`、`products` 中复用率高的服务和工具类，率先替换为类型化 Mock。
- 不稳定断言优先：优先治理易碎的链式断言与宽松匹配。
- 迁移 `QueryBuilder`：将散落的链式 `jest.fn().mockReturnThis()` 替换为 `createMockQueryBuilder()`，确保方法链与返回值类型一致。
- 支付模块：为 `PaymentStrategy`、`QueryRunner`、`DataSource` 等引入 `createMockedFunction` 与类型约束，减少隐式 any。

## 约定与最佳实践
- 尽量以 `createMockedFunction`、`jest.MockedFunction` 等类型化方式定义 Mock。
- 对于 TypeORM `QueryBuilder` 的链式场景，统一使用 `createMockQueryBuilder()` 工厂，减少手写链式 `mockReturnThis()`。
- 保持 Mock 复用：将常用的工厂置于 `backend/test/utils/`，跨测试文件共享。

## 常见问题
- 采纳率没有提升？
  - 检查是否仍存在大量裸 `jest.fn()`，或是否未使用类型工厂替换。
  - 核对度量脚本是否包含目标模块（`scripts/typed-mock-adoption.cjs`）。
- 链式断言类型不匹配？
  - 优先使用 `createMockQueryBuilder()`，避免手写链式方法导致返回类型不一致。

## 维护与扩展
- 度量脚本位置：`backend/scripts/typed-mock-adoption.cjs`。
- 可扩展项：
  - 新增识别模式（如更多工厂方法与类型别名）。
  - 输出更细粒度的断言稳定性指标（如链式调用长度、断言数量）。
  - 在报告中加入历史趋势图（由 CI Artifact 下载后外部生成）。

## 快速清单
- 运行度量：`npm run metrics:typed-mock`。
- 查看报告：`backend/test-results/adoption-report.json` 或 CI Step Summary。
- 优先重构：高频依赖、链式 QueryBuilder、支付策略与数据源。
- 统一工厂：`createMockedFunction` 与 `createMockQueryBuilder`。