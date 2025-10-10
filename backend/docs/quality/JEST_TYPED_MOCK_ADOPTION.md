# Jest Typed Mock 采用率

## 概述

该指标用于衡量项目中对“类型安全的 Jest Mock 工厂”的采用比例，目标是减少未类型化 `jest.fn()` 带来的断言误差与运行时隐患。

- 基线工具：`backend/src/logging/test/typed-mock-factory.ts` 的 `createMockedFunction<T>()`
- 采纳定义：测试文件中优先使用类型化工厂或显式泛型的 `jest.Mocked<...>`，避免裸 `jest.fn()` 无类型信息。

## 指标口径

- 统计范围：`backend/src` 与 `backend/test` 下所有 `*.spec.ts`、`*.test.ts`
- 口径定义：
  - 采用：出现 `createMockedFunction<T>()`、`jest.Mocked<...>`、或具有完整类型注释的 Mock 工厂
  - 未采用：存在裸 `jest.fn()` 且无类型信息
- 计算方式：`采用文件数 / 总测试文件数`

## 度量方法（建议）

- 脚本扫描（示例关键模式）：
  - 采用模式：`createMockedFunction<`, `jest.Mocked<`
  - 未采用模式：`jest.fn()`（且同文件无采用模式）
- 报表输出：生成 `adoption-report.json`，包含文件列表与采用状态

## 阶段目标

- 近期目标：≥ 60%
- 季度目标：≥ 85%
- 最终目标：≈ 100%

## 推进清单

- 将公共 Mock 工厂提取到 `test-utils` 并在各模块统一引用
- 在新测试模板中默认使用类型化 Mock
- 在评审检查表中加入“Typed Mock 采用”项

## 风险与收益

- 收益：类型安全提升、断言稳定、重构友好
- 风险：初期改造成本增加、需要团队约定与习惯迁移

## 参考

- `backend/src/logging/TEST_EXECUTION_GUIDE.md`
- `backend/src/logging/LOGGING_MODULE_VERIFICATION_REPORT.md`