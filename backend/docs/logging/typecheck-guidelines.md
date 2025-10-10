# Logging 模块类型检查与联合类型断言指南

本文档为后续开发提供参考，涵盖联合类型安全收窄实践、跨目录依赖配置、验证步骤，以及本次修复的实现方式与验证记录。

## 后续建议

- 在其他模块若也存在联合类型返回值的断言，参考本次写法进行安全收窄：
  - 使用 `in` 操作符进行类型守卫：`if ('data' in result) { /* 安全访问 result.data */ }`
  - 在测试断言中统一使用：`expect('data' in result && result.data).toBeDefined()` 和 `expect('data' in result && Array.isArray(result.data)).toBe(true)`
- 若新增对 `../common/*` 的其他子目录依赖，及时将路径加入 `backend/src/logging/tsconfig.strict.json` 的 `include` 字段，并再次运行类型检查验证。

## 验证

- 运行 `npm run -s typecheck:logging`，退出码为 0，类型检查通过。

## 实现方式（本次修复）

- 检索 logging 相关 spec 文件并定位剩余直接访问 `result.data` 的断言。
- 统一替换为通过 `in` 操作符收窄的安全检查。
- 补充 `backend/README.md` 的“类型检查常见问题”条目，记录约定与建议。
- 检查 `backend/src/logging/tsconfig.strict.json` 的 `include`，目前无新增跨目录依赖需要补充。

## 参考与链接

- `backend/README.md` → “类型检查常见问题（Logging 模块）”
- `backend/src/logging/tsconfig.strict.json` → `include` 路径维护
- `backend/docs/quality/typed-mock-adoption.md` → Typed Mock 采纳度量与重构建议

## 扩展到其他模块（Orders/Payment）

- 通用守卫：在 `src/common/helpers/response.guard.ts` 提供 `isSuccessResponse(res)` 与 `hasData(res)`，用于对 `{ success: boolean; data?: T }` 响应进行安全收窄。
- Payment 示例：将 `response.success && response.data` 替换为 `if (isSuccessResponse(response)) { /* 安全访问 response.data */ }`。
  - 已在 `payment/strategies/gopay.strategy.ts` 应用。
- Orders 说明：当前返回值多为具体实体或 DTO。若引入第三方查询或联合类型返回，请复用上述守卫进行访问。
- 推广步骤：
  - 审查模块内是否存在联合类型的直接字段访问。
  - 引入并使用守卫进行收窄，避免在错误分支访问不存在的字段。
  - 运行 `npm run -s typecheck` 验证变更。