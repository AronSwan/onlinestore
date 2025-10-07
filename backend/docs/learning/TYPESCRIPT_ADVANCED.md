# TypeScript 进阶指南

## 📋 概述
本文档深入探讨 TypeScript 高级特性和在 Caddy Style Shopping 项目中的最佳实践。

## 🔧 高级类型系统

### 条件类型
```typescript
// 条件类型示例
type IsString<T> = T extends string ? true : false;
type A = IsString<'hello'>; // true
type B = IsString<123>; // false
```

### 映射类型
```typescript
// 将对象所有属性变为可选
type Partial<T> = {
  [P in keyof T]?: T[P];
};

// 将对象所有属性变为只读
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};
```

## 🏗️ 泛型编程

### 泛型约束
```typescript
interface HasLength {
  length: number;
}

function logLength<T extends HasLength>(arg: T): void {
  console.log(arg.length);
}
```

### 泛型工具类型
```typescript
// 提取函数返回类型
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// 提取函数参数类型
type Parameters<T> = T extends (...args: infer P) => any ? P : never;
```

## 📊 装饰器应用

### 方法装饰器
```typescript
function LogExecutionTime(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = function (...args: any[]) {
    const start = performance.now();
    const result = method.apply(this, args);
    const end = performance.now();
    
    console.log(`${propertyName} executed in ${end - start}ms`);
    return result;
  };
}

class UserService {
  @LogExecutionTime
  async findUser(id: string) {
    // 业务逻辑
  }
}
```

### 类装饰器
```typescript
function Injectable(options?: { scope?: 'singleton' | 'transient' }) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      // 依赖注入逻辑
    };
  };
}

@Injectable({ scope: 'singleton' })
class CacheService {
  // 服务实现
}
```

## 🔒 类型安全实践

### 严格的空值检查
```typescript
// 启用严格模式
{
  "compilerOptions": {
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noImplicitReturns": true
  }
}

// 安全处理可选值
function safeGet<T>(value: T | undefined, defaultValue: T): T {
  return value ?? defaultValue;
}
```

### 类型守卫
```typescript
function isString(value: any): value is string {
  return typeof value === 'string';
}

function processValue(value: string | number) {
  if (isString(value)) {
    // TypeScript 知道 value 是 string
    return value.toUpperCase();
  } else {
    // TypeScript 知道 value 是 number
    return value.toFixed(2);
  }
}
```

## 📈 性能优化

### 类型推断优化
```typescript
// 避免不必要的类型断言
// 不推荐
const data = JSON.parse(jsonString) as UserData;

// 推荐：使用类型守卫
function isUserData(data: any): data is UserData {
  return data && typeof data.id === 'string';
}

const data = JSON.parse(jsonString);
if (isUserData(data)) {
  // 安全使用 data
}
```

### 模块优化
```typescript
// 使用 const enum 优化性能
const enum UserRole {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest'
}

// 编译后会被内联，减少运行时开销
```

## 📚 学习资源
- [TypeScript 官方文档](https://www.typescriptlang.org/docs)
- [TypeScript 深入理解](https://basarat.gitbook.io/typescript)
- [TypeScript 设计模式](https://github.com/torokmark/design_patterns_in_typescript)

*最后更新: 2025年10月5日*