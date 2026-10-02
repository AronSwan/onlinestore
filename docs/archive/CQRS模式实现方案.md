# CQRS模式实现方案 - 基于TanStack Query设计理念

## 概述

本方案基于CQRS(Command Query Responsibility Segregation)模式，参考TanStack Query的设计理念，为caddy-style-shopping-site项目提供一个现代化的数据管理解决方案，实现真正的单一数据来源原则。

## 1. CQRS模式架构设计

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    前端应用层                                │
├─────────────────────────────────────────────────────────────┤
│  TanStack Query Client (查询状态管理)                        │
│  ├─ useQuery (查询)                                         │
│  ├─ useMutation (命令)                                      │
│  ├─ useInfiniteQuery (无限查询)                             │
│  └─ QueryClient (全局状态管理)                              │
├─────────────────────────────────────────────────────────────┤
│                    API网关层                                │
├─────────────────────────────────────────────────────────────┤
│  命令端 (Command Side)                │  查询端 (Query Side)  │
│  ├─ 命令处理器                        │  ├─ 查询处理器          │
│  ├─ 命令验证                          │  ├─ 查询优化            │
│  ├─ 业务规则验证                      │  ├─ 缓存策略            │
│  ├─ 事件发布                          │  ├─ 读取模型            │
│  └─ 写模型 (Write Model)              │  └─ 投影视图 (Projections)│
├─────────────────────────────────────────────────────────────┤
│                    事件总线                                   │
│  ├─ 事件存储                          │  ├─ 事件重放            │
│  ├─ 事件分发                          │  ├─ 快照机制            │
│  └─ 事件订阅                          │  └─ 事件版本控制        │
├─────────────────────────────────────────────────────────────┤
│                    数据存储层                                 │
│  ├─ 写数据库 (主库)                   │  ├─ 读数据库 (从库/缓存)  │
│  ├─ 事件存储                          │  ├─ 读取模型存储         │
│  └─ 快照存储                          │  └─ 搜索索引            │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心组件设计

#### 1.2.1 命令端组件

```typescript
// 命令基类
export abstract class Command {
  public readonly id: string;
  public readonly userId?: string;
  public readonly timestamp: Date;
  public readonly metadata?: Record<string, any>;

  constructor() {
    this.id = generateId();
    this.timestamp = new Date();
  }
}

// 命令处理器接口
export interface CommandHandler<TCommand extends Command, TResult = void> {
  handle(command: TCommand): Promise<TResult>;
  canHandle(command: Command): boolean;
}

// 命令总线
export class CommandBus {
  private handlers = new Map<string, CommandHandler<any>>();
  
  register<TCommand extends Command>(
    commandType: string, 
    handler: CommandHandler<TCommand>
  ): void {
    this.handlers.set(commandType, handler);
  }
  
  async execute<TCommand extends Command, TResult = void>(
    command: TCommand
  ): Promise<TResult> {
    const handler = this.handlers.get(command.constructor.name);
    if (!handler) {
      throw new Error(`No handler registered for ${command.constructor.name}`);
    }
    return handler.handle(command);
  }
}
```

#### 1.2.2 查询端组件

```typescript
// 查询基类
export abstract class Query<TResult = any> {
  public readonly id: string;
  public readonly userId?: string;
  public readonly cacheKey?: string;
  public readonly cacheTTL?: number;

  constructor() {
    this.id = generateId();
  }
}

// 查询处理器接口
export interface QueryHandler<TQuery extends Query, TResult> {
  handle(query: TQuery): Promise<TResult>;
  canHandle(query: Query): boolean;
}

// 查询总线 (参考TanStack Query设计)
export class QueryBus {
  private handlers = new Map<string, QueryHandler<any>>();
  private cache = new Map<string, { data: any; timestamp: Date; ttl: number }>();
  
  register<TQuery extends Query, TResult>(
    queryType: string, 
    handler: QueryHandler<TQuery, TResult>
  ): void {
    this.handlers.set(queryType, handler);
  }
  
  async execute<TQuery extends Query, TResult>(
    query: TQuery
  ): Promise<TResult> {
    // 检查缓存
    if (query.cacheKey) {
      const cached = this.cache.get(query.cacheKey);
      if (cached && this.isCacheValid(cached, query.cacheTTL)) {
        return cached.data;
      }
    }
    
    const handler = this.handlers.get(query.constructor.name);
    if (!handler) {
      throw new Error(`No handler registered for ${query.constructor.name}`);
    }
    
    const result = await handler.handle(query);
    
    // 缓存结果
    if (query.cacheKey) {
      this.cache.set(query.cacheKey, {
        data: result,
        timestamp: new Date(),
        ttl: query.cacheTTL || 300 // 默认5分钟
      });
    }
    
    return result;
  }
  
  private isCacheValid(cached: any, ttl?: number): boolean {
    const now = new Date();
    const cacheAge = (now.getTime() - cached.timestamp.getTime()) / 1000;
    return cacheAge < (ttl || 300);
  }
  
  // 清除缓存 (参考TanStack Query的invalidateQueries)
  invalidateCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}
```

#### 1.2.3 事件系统

```typescript
// 领域事件基类
export abstract class DomainEvent {
  public readonly id: string;
  public readonly aggregateId: string;
  public readonly version: number;
  public readonly timestamp: Date;
  public readonly metadata?: Record<string, any>;

  constructor(aggregateId: string, version: number = 1) {
    this.id = generateId();
    this.aggregateId = aggregateId;
    this.version = version;
    this.timestamp = new Date();
  }
}

// 事件存储接口
export interface EventStore {
  saveEvents(aggregateId: string, events: DomainEvent[]): Promise<void>;
  getEvents(aggregateId: string, fromVersion?: number): Promise<DomainEvent[]>;
  getEventsByType(eventType: string, fromTimestamp?: Date): Promise<DomainEvent[]>;
}

// 事件总线
export class EventBus {
  private handlers = new Map<string, Function[]>();
  
  subscribe<TEvent extends DomainEvent>(
    eventType: string, 
    handler: (event: TEvent) => Promise<void> | void
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }
  
  async publish<TEvent extends DomainEvent>(event: TEvent): Promise<void> {
    const handlers = this.handlers.get(event.constructor.name) || [];
    await Promise.all(handlers.map(handler => handler(event)));
  }
}
```

## 2. 前端TanStack Query集成

### 2.1 安装和配置

```bash
npm install @tanstack/react-query
npm install @tanstack/react-query-devtools
```

### 2.2 QueryClient配置

```typescript
// src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分钟
      cacheTime: 10 * 60 * 1000, // 10分钟
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### 2.3 API客户端封装

```typescript
// src/lib/api-client.ts
import { QueryFunction, MutationFunction } from '@tanstack/react-query';

class ApiClient {
  private baseURL: string;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }
  
  // 查询请求封装
  query<T>(endpoint: string, params?: Record<string, any>): QueryFunction<T> {
    return async ({ queryKey }) => {
      const [url, queryParams] = queryKey as [string, Record<string, any>?];
      const response = await fetch(`${this.baseURL}${url}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      
      return response.json();
    };
  }
  
  // 命令请求封装
  mutation<TData, TVariables>(endpoint: string, method: 'POST' | 'PUT' | 'DELETE' = 'POST'): MutationFunction<TData, TVariables> {
    return async (variables: TVariables) => {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(variables),
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      
      return response.json();
    };
  }
  
  private getAuthToken(): string {
    return localStorage.getItem('access_token') || '';
  }
}

export const apiClient = new ApiClient('/api');
```

### 2.4 购物车Hook实现

```typescript
// src/hooks/use-cart.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

// 购物车查询Hook
export function useCart() {
  return useQuery({
    queryKey: ['cart'],
    queryFn: apiClient.query('/cart'),
    staleTime: 2 * 60 * 1000, // 2分钟
  });
}

// 添加商品到购物车Hook
export function useAddToCart() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.mutation('/cart/items', 'POST'),
    onSuccess: () => {
      // 成功后使购物车查询失效，触发重新获取
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error) => {
      console.error('添加到购物车失败:', error);
    },
  });
}

// 更新购物车商品数量Hook
export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.mutation('/cart/items/:id', 'PUT'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

// 移除购物车商品Hook
export function useRemoveFromCart() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.mutation('/cart/items/:id', 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
```

### 2.5 用户Profile Hook实现

```typescript
// src/hooks/use-user.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

// 用户信息查询Hook
export function useUserProfile() {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: apiClient.query('/users/profile'),
    staleTime: 10 * 60 * 1000, // 10分钟
  });
}

// 更新用户信息Hook
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.mutation('/users/profile', 'PUT'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
  });
}

// 用户地址查询Hook
export function useUserAddresses() {
  return useQuery({
    queryKey: ['user', 'addresses'],
    queryFn: apiClient.query('/users/addresses'),
    staleTime: 15 * 60 * 1000, // 15分钟
  });
}

// 添加地址Hook
export function useAddAddress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.mutation('/users/addresses', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'addresses'] });
    },
  });
}
```

## 3. 后端CQRS实现

### 3.1 命令端实现

```typescript
// backend/src/cqrs/commands/cart/add-item.command.ts
export class AddItemToCartCommand extends Command {
  constructor(
    public readonly userId: string,
    public readonly productId: string,
    public readonly quantity: number,
    public readonly price: number
  ) {
    super();
  }
}

// backend/src/cqrs/handlers/cart/add-item.handler.ts
@Injectable()
export class AddItemToCartHandler implements CommandHandler<AddItemToCartCommand> {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly eventBus: EventBus
  ) {}
  
  async handle(command: AddItemToCartCommand): Promise<void> {
    const cart = await this.cartRepository.getByUserId(command.userId);
    
    cart.addItem({
      productId: command.productId,
      quantity: command.quantity,
      price: command.price
    });
    
    await this.cartRepository.save(cart);
    
    // 发布事件
    await this.eventBus.publish(new ItemAddedToCartEvent(
      cart.id,
      command.productId,
      command.quantity
    ));
  }
  
  canHandle(command: Command): boolean {
    return command instanceof AddItemToCartCommand;
  }
}
```

### 3.2 查询端实现

```typescript
// backend/src/cqrs/queries/cart/get-cart.query.ts
export class GetCartQuery extends Query<CartDto> {
  constructor(
    public readonly userId: string,
    public readonly includeProducts: boolean = false
  ) {
    super();
    this.cacheKey = `cart:${userId}:${includeProducts}`;
    this.cacheTTL = 300; // 5分钟
  }
}

// backend/src/cqrs/handlers/cart/get-cart.handler.ts
@Injectable()
export class GetCartHandler implements QueryHandler<GetCartQuery, CartDto> {
  constructor(
    private readonly cartReadModel: CartReadModel
  ) {}
  
  async handle(query: GetCartQuery): Promise<CartDto> {
    return this.cartReadModel.getByUserId(query.userId, query.includeProducts);
  }
  
  canHandle(query: Query): boolean {
    return query instanceof GetCartQuery;
  }
}
```

### 3.3 读取模型实现

```typescript
// backend/src/cqrs/read-models/cart.read-model.ts
@Injectable()
export class CartReadModel {
  constructor(
    private readonly connection: Connection,
    private readonly eventStore: EventStore
  ) {}
  
  async getByUserId(userId: string, includeProducts: boolean = false): Promise<CartDto> {
    // 从读取模型表查询
    const cart = await this.connection
      .getRepository(CartReadModelEntity)
      .findOne({ where: { userId } });
    
    if (!cart) {
      return { items: [], totalAmount: 0, itemCount: 0 };
    }
    
    let items = cart.items;
    
    // 如果需要包含产品信息
    if (includeProducts) {
      const productIds = items.map(item => item.productId);
      const products = await this.getProductsByIds(productIds);
      
      items = items.map(item => ({
        ...item,
        product: products.find(p => p.id === item.productId)
      }));
    }
    
    return {
      id: cart.id,
      userId: cart.userId,
      items,
      totalAmount: this.calculateTotalAmount(items),
      itemCount: this.calculateItemCount(items),
      updatedAt: cart.updatedAt
    };
  }
  
  private async getProductsByIds(ids: string[]): Promise<ProductDto[]> {
    // 从产品读取模型查询
    return this.connection
      .getRepository(ProductReadModelEntity)
      .findByIds(ids);
  }
  
  private calculateTotalAmount(items: CartItemDto[]): number {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
  
  private calculateItemCount(items: CartItemDto[]): number {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }
  
  // 事件处理器 - 更新读取模型
  @EventHandler(ItemAddedToCartEvent)
  async onItemAdded(event: ItemAddedToCartEvent): Promise<void> {
    const cart = await this.connection
      .getRepository(CartReadModelEntity)
      .findOne({ where: { aggregateId: event.aggregateId } });
    
    if (cart) {
      // 更新现有购物车
      const existingItem = cart.items.find(item => item.productId === event.productId);
      
      if (existingItem) {
        existingItem.quantity += event.quantity;
      } else {
        // 需要获取产品信息
        const product = await this.getProductById(event.productId);
        cart.items.push({
          productId: event.productId,
          quantity: event.quantity,
          price: product.price,
          productName: product.name
        });
      }
      
      cart.totalAmount = this.calculateTotalAmount(cart.items);
      cart.itemCount = this.calculateItemCount(cart.items);
      cart.updatedAt = new Date();
      
      await this.connection.getRepository(CartReadModelEntity).save(cart);
    }
  }
  
  private async getProductById(id: string): Promise<ProductDto> {
    return this.connection
      .getRepository(ProductReadModelEntity)
      .findOne({ where: { id } });
  }
}
```

## 4. 事件驱动更新机制

### 4.1 事件处理器

```typescript
// backend/src/cqrs/event-handlers/cart-updated.handler.ts
@Injectable()
export class CartUpdatedEventHandler {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly cacheService: CacheService
  ) {}
  
  @EventHandler(CartUpdatedEvent)
  async handle(event: CartUpdatedEvent): Promise<void> {
    // 清除相关缓存
    await this.cacheService.delete(`cart:${event.userId}:*`);
    
    // 可以通过WebSocket推送更新到前端
    await this.notifyFrontend(event.userId, {
      type: 'CART_UPDATED',
      data: await this.queryBus.execute(new GetCartQuery(event.userId))
    });
  }
  
  private async notifyFrontend(userId: string, data: any): Promise<void> {
    // WebSocket推送逻辑
  }
}
```

### 4.2 前端实时更新

```typescript
// src/hooks/use-realtime-cart.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useRealtimeCart(userId: string) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:3000/ws/cart/${userId}`);
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'CART_UPDATED') {
        // 更新本地缓存
        queryClient.setQueryData(['cart'], message.data);
      }
    };
    
    return () => {
      ws.close();
    };
  }, [userId, queryClient]);
}
```

## 5. 实施步骤

### 5.1 第一阶段：基础架构搭建

1. **安装依赖**
   ```bash
   npm install @tanstack/react-query @tanstack/react-query-devtools
   npm install @nestjs/cqrs @nestjs/event-store
   ```

2. **创建CQRS基础模块**
   - 创建Command、Query、Event基类
   - 实现CommandBus、QueryBus、EventBus
   - 设置事件存储

3. **配置TanStack Query**
   - 设置QueryClient
   - 创建API客户端封装
   - 配置React Query DevTools

### 5.2 第二阶段：购物车模块重构

1. **后端重构**
   - 实现购物车命令处理器
   - 实现购物车查询处理器
   - 创建购物车读取模型
   - 设置事件处理器

2. **前端重构**
   - 创建购物车相关Hooks
   - 替换现有CartManager
   - 实现实时更新机制

### 5.3 第三阶段：其他模块迁移

1. **用户模块**
   - 用户信息查询
   - 用户资料更新
   - 地址管理

2. **订单模块**
   - 订单创建命令
   - 订单查询
   - 订单状态更新

3. **产品模块**
   - 产品查询优化
   - 产品搜索
   - 产品推荐

### 5.4 第四阶段：优化和监控

1. **性能优化**
   - 查询优化
   - 缓存策略调整
   - 数据库读写分离

2. **监控和调试**
   - 添加性能监控
   - 错误追踪
   - 调试工具

## 6. 预期收益

### 6.1 单一数据来源实现

- **前端**：TanStack Query作为唯一的数据获取和缓存层
- **后端**：查询端作为唯一的读取数据源
- **事件**：作为数据变更的唯一通知机制

### 6.2 性能提升

- **查询优化**：专门的读取模型，针对查询优化
- **缓存策略**：多层缓存，减少数据库压力
- **实时更新**：事件驱动的实时数据同步

### 6.3 可维护性提升

- **职责分离**：命令和查询职责明确分离
- **代码组织**：更清晰的代码结构和职责划分
- **测试友好**：更容易进行单元测试和集成测试

### 6.4 扩展性提升

- **水平扩展**：读写分离，可以独立扩展
- **模块化**：每个业务模块可以独立开发和部署
- **事件驱动**：松耦合的架构，易于添加新功能

## 7. 风险评估和缓解策略

### 7.1 实施风险

- **复杂度增加**：CQRS模式增加了系统复杂度
- **数据一致性**：读写模型之间的数据一致性挑战
- **学习成本**：团队需要学习新的架构模式

### 7.2 缓解策略

- **渐进式迁移**：逐步迁移现有功能，降低风险
- **充分测试**：建立完善的测试体系
- **文档和培训**：提供详细的文档和团队培训

## 结论

通过实施基于CQRS模式和TanStack Query的解决方案，可以显著改善项目的数据管理现状，实现真正的单一数据来源原则。这种架构不仅解决了当前的数据一致性问题，还为未来的扩展和优化奠定了坚实的基础。

建议按照分阶段的方式实施，先从购物车模块开始，逐步扩展到其他模块，确保平稳过渡和风险可控。