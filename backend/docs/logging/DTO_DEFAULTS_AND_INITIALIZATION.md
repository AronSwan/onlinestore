# DTO 默认值与构造初始化指南（严格类型兼容）

## 背景

当 `strictNullChecks` 打开后，DTO 字段若未显式初始化，容易在运行时出现 `undefined/null` 边界问题；同时测试场景常以部分对象或 `plain object` 传入，易与运行时 Pipe 转换不一致。

本指南提供一致的默认值策略与构造方式，确保：
- 控制器层输入类型安全；
- 保持 `ValidationPipe`（`transform: true`）的转换行为；
- 测试可用最小对象但不破坏运行时校验。

## 统一策略

- DTO 字段使用“明确初始化”或“只读必填 + 可选字段默认值”两类策略：
  - 必填字段：构造函数入参必给；
  - 可选字段：在构造时或工厂方法中填充默认值（例如空字符串、空数组、`{}、false、0` 等）。
- 提供 `createFromInput(input: InputInterface): Dto` 工厂以桥接控制器输入接口与 DTO：
  - 控制器方法签名使用 `InputInterface`，内部调用工厂产生 DTO；
  - 保持 `ValidationPipe` 的转换（`transform: true`）与白名单（`whitelist: true`）行为。

## 示例

```ts
// 输入接口（控制器方法签名使用）
export interface TrackPageViewInput {
  sessionId: string;
  page: string;
  userId?: string;
}

// DTO（用于业务与验证）
export class PageViewDto {
  sessionId!: string; // 必填
  page!: string;      // 必填
  userId: string = ''; // 可选，默认空字符串

  static createFromInput(input: TrackPageViewInput): PageViewDto {
    const dto = new PageViewDto();
    dto.sessionId = input.sessionId;
    dto.page = input.page;
    dto.userId = input.userId ?? '';
    return dto;
  }
}

// 控制器用法
@Post('page-view')
trackPageView(@Body() input: TrackPageViewInput, @Req() req: Request) {
  const dto = PageViewDto.createFromInput(input);
  // 后续仍由 ValidationPipe 校验 dto
  // ...业务逻辑
}
```

## 默认值建议表

- 字符串：`''`
- 数值：`0`
- 布尔：`false`
- 对象：`{}`（浅对象）
- 数组：`[]`
- 可选嵌套对象：使用空对象并在访问前做存在性判断

## 测试兼容

- 单元测试传入 `InputInterface` 的最小对象即可，由工厂方法补齐默认值；
- 若测试直传 DTO，建议使用工厂 `createFromInput` 或测试辅助构造器（fixture/factory）。

## 落地建议

1. 为所有 `logging.controller.ts` 使用的 DTO 添加 `createFromInput` 工厂；
2. 控制器方法签名优先采用输入接口，内部统一构造 DTO；
3. 对照字段分类（必填/可选）检查默认值是否合理。

## 相关文件

- `backend/src/logging/logging.controller.ts`
- `backend/src/logging/dto/logging.dto.ts`
- `backend/src/main.ts`（ValidationPipe 全局配置）