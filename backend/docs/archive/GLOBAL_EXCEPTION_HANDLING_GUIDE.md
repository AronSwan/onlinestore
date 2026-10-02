# 🛡️ 全局异常处理机制指南

> **创建时间**: 2025-10-07  
> **目标**: 实现统一、可靠的全局异常处理机制  
> **状态**: ✅ 已完成

## 📋 异常处理架构概述

### 1. 核心组件
- ✅ `GlobalExceptionFilter` - 全局异常过滤器
- ✅ `EnhancedBusinessException` - 增强业务异常类
- ✅ `LoggingInterceptor` - 日志拦截器
- ✅ `FileUploadInterceptor` - 文件上传安全拦截器
- ✅ `ExceptionsModule` - 异常处理模块

### 2. 异常处理流程
1. **异常捕获**: GlobalExceptionFilter捕获所有异常
2. **异常分类**: 根据异常类型进行分类处理
3. **错误码映射**: 将异常映射到统一错误码
4. **日志记录**: 记录结构化错误日志
5. **响应格式化**: 返回标准化的错误响应

## 🔧 异常处理实现

### 1. 全局异常过滤器

GlobalExceptionFilter负责捕获和处理所有异常：

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    // 构建错误上下文
    const errorContext: ErrorContext = {
      requestId: (request as any).requestId,
      traceId: (request as any).traceId,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
      userId: (request as any).user?.id,
    };

    // 根据异常类型处理
    if (exception instanceof EnhancedBusinessException) {
      // 处理业务异常
    } else if (exception instanceof HttpException) {
      // 处理HTTP异常
    } else {
      // 处理未知异常
    }
  }
}
```

### 2. 增强业务异常类

EnhancedBusinessException提供统一的业务异常处理：

```typescript
export class EnhancedBusinessException extends HttpException {
  public readonly errorCode: ErrorCode;
  public readonly category: string;
  public readonly details?: ErrorDetail[];
  public readonly context?: ErrorContext;
  public readonly cause: Error;
  public readonly retryable: boolean;
  public readonly timestamp: string;

  constructor(
    errorCode: ErrorCode,
    message?: string,
    details?: ErrorDetail[],
    context?: ErrorContext,
    cause?: Error,
    retryable: boolean = false,
  ) {
    // 构建标准化错误响应
    const response = {
      success: false,
      errorCode,
      category,
      message: message || EnhancedBusinessException.getDefaultMessage(errorCode),
      details,
      context,
      retryable,
      timestamp,
    };

    super(response, getHttpStatusFromErrorCode(errorCode));
  }
}
```

### 3. 错误码系统

使用统一的错误码系统，基于HTTP状态码 + 业务模块 + 具体错误：

```typescript
export const ERROR_CODES = {
  // 通用错误 (400xxx)
  VALIDATION_ERROR: '40000001',
  INVALID_PARAMETER: '40000002',
  
  // 认证授权错误 (401xxx, 403xxx)
  UNAUTHORIZED: '40106001',
  FORBIDDEN: '40306001',
  
  // 用户模块错误 (404xxx, 409xxx)
  USER_NOT_FOUND: '40401001',
  USER_ALREADY_EXISTS: '40901001',
  
  // 系统错误 (500xxx)
  INTERNAL_SERVER_ERROR: '50008001',
  DATABASE_ERROR: '50008002',
} as const;
```

## 📊 异常处理效果

### 1. 统一错误响应格式

所有异常都返回统一的错误响应格式：

```json
{
  "success": false,
  "errorCode": "40401001",
  "category": "business",
  "message": "用户不存在",
  "details": [
    {
      "field": "userId",
      "value": "12345"
    }
  ],
  "context": {
    "requestId": "req_123456789",
    "timestamp": "2025-10-07T18:55:00.000Z",
    "path": "/api/users/12345",
    "method": "GET"
  },
  "retryable": false,
  "timestamp": "2025-10-07T18:55:00.000Z"
}
```

### 2. 结构化错误日志

所有异常都记录结构化日志，便于分析和监控：

```json
{
  "level": "warn",
  "message": "GET /api/users/12345 - 40401001",
  "errorCode": "40401001",
  "category": "business",
  "message": "用户不存在",
  "details": [
    {
      "field": "userId",
      "value": "12345"
    }
  ],
  "context": {
    "requestId": "req_123456789",
    "timestamp": "2025-10-07T18:55:00.000Z",
    "path": "/api/users/12345",
    "method": "GET"
  },
  "retryable": false,
  "stack": "Error: 用户不存在\n    at ...",
  "cause": "..."
}
```

## 🚀 使用指南

### 1. 抛出业务异常

在业务逻辑中使用EnhancedBusinessException：

```typescript
import { EnhancedBusinessException, ERROR_CODES } from '../common/exceptions';

// 方法1：直接构造
throw new EnhancedBusinessException(
  ERROR_CODES.USER_NOT_FOUND,
  '用户不存在',
  [{ field: 'userId', value: userId }],
  { requestId, traceId }
);

// 方法2：使用静态工厂方法
throw EnhancedBusinessException.userNotFound(userId, { requestId, traceId });

// 方法3：带原因的异常
throw EnhancedBusinessException.databaseError(
  'user_find',
  error,
  { requestId, traceId }
);
```

### 2. 自定义异常处理

在特定模块中可以自定义异常处理逻辑：

```typescript
import { Catch, ExceptionFilter } from '@nestjs/common';
import { EnhancedBusinessException } from '../common/exceptions';

@Catch(EnhancedBusinessException)
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: EnhancedBusinessException, host: ArgumentsHost) {
    // 自定义处理逻辑
    // 可以调用全局过滤器或完全自定义
  }
}
```

### 3. 异常中间件

可以创建异常处理中间件进行预处理：

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ExceptionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 添加请求ID
    req.requestId = this.generateRequestId();
    
    // 添加追踪ID
    req.traceId = this.getTraceId(req);
    
    next();
  }
}
```

## 📋 最佳实践

### 1. 异常分类
- **业务异常**: 使用EnhancedBusinessException
- **验证异常**:使用ValidationPipe和自定义验证器
- **系统异常**: 由全局过滤器自动处理

### 2. 错误码设计
- 使用统一的错误码系统
- 错误码应该具有可读性
- 错误码应该包含足够的上下文信息

### 3. 日志记录
- 记录足够的上下文信息
- 使用结构化日志格式
- 区分不同级别的日志

### 4. 错误响应
- 提供有用的错误信息
- 避免暴露敏感信息
- 保持一致的响应格式

## 🔧 扩展和自定义

### 1. 添加新的错误码

在error-codes.ts中添加新的错误码：

```typescript
export const ERROR_CODES = {
  // 现有错误码...
  
  // 新增错误码
  CUSTOM_ERROR: '40000010',
} as const;
```

### 2. 自定义异常类

可以创建自定义异常类继承EnhancedBusinessException：

```typescript
export class CustomBusinessException extends EnhancedBusinessException {
  constructor(
    errorCode: ErrorCode,
    message?: string,
    details?: ErrorDetail[],
    context?: ErrorContext,
    cause?: Error,
  ) {
    super(errorCode, message, details, context, cause);
    
    // 自定义逻辑
  }
}
```

### 3. 自定义拦截器

可以创建自定义拦截器增强异常处理：

```typescript
@Injectable()
export class CustomInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 前置处理
    return next.handle().pipe(
      catchError(error => {
        // 异常处理
        throw error;
      })
    );
  }
}
```

## 📞 结论

全局异常处理机制已成功实现，提供了：
- ✅ 统一的异常处理流程
- ✅ 标准化的错误响应格式
- ✅ 结构化的错误日志记录
- ✅ 可扩展的错误码系统
- ✅ 灵活的异常分类和处理

这套异常处理机制不仅提高了系统的可靠性，还改善了开发和调试体验，为后续的监控和运维工作奠定了坚实基础。

---

**实现完成时间**: 2025-10-07  
**实现人员**: 后端开发团队  
**验证人员**: 系统架构师