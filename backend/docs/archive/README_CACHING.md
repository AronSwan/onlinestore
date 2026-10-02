# 后端缓存策略

本项目的缓存策略遵循“仅公共只读 GET 接口使用缓存、鉴权接口不缓存”的原则，旨在在保证数据一致性的同时提升热门和列表查询的性能。

## 使用范围

- 公共只读 GET：允许使用 `CacheInterceptor`，默认按完整请求 URL（含查询参数）作为键。
- 鉴权接口（需 `JwtAuthGuard` 或 `RolesGuard`）：不启用缓存，避免用户态数据一致性问题。

## 现状与配置

- `products.controller.ts`
  - `GET /api/products`：`CacheInterceptor` + `CacheTTL(30)`，用于商品列表。
  - `GET /api/products/popular`：`CacheInterceptor` + `CacheTTL(60)`，用于热门商品。
  - `GET /api/products/:id`：`CacheInterceptor` + `CacheTTL(60)`，用于商品详情。
- `orders.controller.ts` / `users.controller.ts` / `auth.controller.ts`
  - 所有需鉴权的接口均未使用 `CacheInterceptor`。

## 服务内手动缓存

- `products.service.ts`
  - 详情：键 `product:${id}`，TTL 300 秒。
  - 热门：键 `popular:products`，TTL 600 秒。

说明：控制器层 `CacheInterceptor` 与服务层 `cacheManager` 为同一底层缓存（Redis/InMemory），但键空间不同，目的在于分别优化 HTTP 层与内部查询。两者不会相互覆盖；如需统一可在未来收敛为服务层缓存并移除控制器层缓存。

## 缓存键与命名规则

- 控制器层：默认键为请求完整 URL，包含查询字符串，适合列表与筛选场景。
- 服务层：显式字符串键，推荐命名：`<domain>:<resource>[:<id>|<variant>]`。
  - 例如：`product:123`、`popular:products`、`category:12:products`。

## 失效与一致性

- 商品数据写操作（创建、更新、上下架、删除）后应失效：
  - `product:${id}`（详情）
  - `popular:products`（若与销量/热度相关）
  - 可能影响的列表页 URL 键（如 `/api/products?page=*&limit=*`），建议通过事件触发批量删除或缩短 TTL。
- 订单相关接口不缓存，并在服务层通过事务/条件更新保证库存一致性，避免超卖。

## 接受标准（DoD）

- 仅公共 GET 接口启用缓存；鉴权接口未使用 `CacheInterceptor`。
- 公共接口具备显式 `CacheTTL`，默认 30–60 秒，热门与详情不超过 10 分钟。
- 服务层缓存键命名统一，TTL 与业务新鲜度匹配。
- 商品写操作能触发相关键失效（若尚未实现，记录为后续任务）。

## 后续改进建议

- 将控制器层缓存迁移/收敛到服务层，统一键空间与 TTL。
- 在 `products.service.ts` 的更新/删除中加入缓存失效逻辑。
- 为缓存命中率与回源率添加基础指标与日志（命中/未命中计数）。
提示：命中/未命中指标的 `route`/`module` 标签由路由拦截器统一注入，无需在业务代码中显式传递。后续可考虑为 DB 查询与缓存命中增加更细粒度标签（例如 `operation=update|delete`，以及复杂聚合的子类型如 `subtype=count|sum|topN`），便于在 Prometheus 中做更精确的维度分析。