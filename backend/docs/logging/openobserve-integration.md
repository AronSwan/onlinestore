# OpenObserve集成指南

## 概述

本文档介绍如何将后端日志系统与OpenObserve集成，实现集中式日志管理和分析。

## 更新记录（2025-10-09）

- 传输器输出字段标准化：错误对象统一序列化为 `error_name`、`error_message`、`error_stack`。
- 保留完整业务字段：日志 payload 合并业务字段（如 `category`、`action`、`businessContext`、`tags`、`traceId`、`spanId`），避免丢失。
- 安全展开 meta：当 `meta` 未定义时不再触发展开异常，确保缓冲与批量发送稳定。
- 查询兼容性建议：如仪表盘或查询依赖旧错误字段名，请同步更新到新字段以获得更完整的错误上下文。

## 功能特性

- ✅ 支持OpenObserve REST API
- ✅ 批量日志传输（减少网络开销）
- ✅ 压缩传输（节省带宽）
- ✅ 认证支持（Token/Basic Auth）
- ✅ 重试机制（网络故障恢复）
- ✅ 健康检查（连接状态监控）
- ✅ 统计查询（日志分析）

## 快速开始

### 1. 环境配置

复制示例配置文件：
```bash
cp .env.openobserve.example .env.openobserve
```

编辑`.env.openobserve`文件：
```env
# 启用OpenObserve
LOGGING_OPENOBSERVE_ENABLED=true

# OpenObserve服务器地址
LOGGING_OPENOBSERVE_URL=http://localhost:5080

# 组织名称
LOGGING_OPENOBSERVE_ORGANIZATION=default

# 流名称
LOGGING_OPENOBSERVE_STREAM=application-logs

# 认证Token（推荐）
LOGGING_OPENOBSERVE_TOKEN=your-token-here

# 或使用用户名密码
# LOGGING_OPENOBSERVE_USERNAME=admin
# LOGGING_OPENOBSERVE_PASSWORD=password
```

### 2. 启动OpenObserve

使用Docker快速启动OpenObserve：
```bash
docker run -d \
  --name openobserve \
  -p 5080:5080 \
  -v openobserve_data:/data \
  public.ecr.aws/zinclabs/openobserve:latest
```

### 3. 配置应用

在应用启动时加载OpenObserve配置：
```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggingService } from './common/logging/logging.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 启用OpenObserve日志
  const loggingService = app.get(LoggingService);
  await loggingService.healthCheck();
  
  await app.listen(3000);
}
bootstrap();
```

## 配置详解

### 基本配置

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `LOGGING_OPENOBSERVE_ENABLED` | `false` | 启用OpenObserve传输 |
| `LOGGING_OPENOBSERVE_URL` | `http://localhost:5080` | OpenObserve服务器地址 |
| `LOGGING_OPENOBSERVE_ORGANIZATION` | `default` | 组织名称 |
| `LOGGING_OPENOBSERVE_STREAM` | `application-logs` | 流名称 |

### 认证配置

**方式1：Token认证（推荐）**
```env
LOGGING_OPENOBSERVE_TOKEN=your-jwt-token
```

**方式2：用户名密码认证**
```env
LOGGING_OPENOBSERVE_USERNAME=admin
LOGGING_OPENOBSERVE_PASSWORD=password
```

### 性能配置

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `LOGGING_OPENOBSERVE_BATCH_SIZE` | `100` | 批量发送大小 |
| `LOGGING_OPENOBSERVE_FLUSH_INTERVAL` | `5000` | 刷新间隔（毫秒） |
| `LOGGING_OPENOBSERVE_COMPRESSION` | `true` | 启用压缩 |
| `LOGGING_OPENOBSERVE_TIMEOUT` | `10000` | 请求超时（毫秒） |
| `LOGGING_OPENOBSERVE_RETRY_COUNT` | `3` | 重试次数 |
| `LOGGING_OPENOBSERVE_RETRY_DELAY` | `1000` | 重试延迟（毫秒） |

## 使用示例

### 1. 基础日志记录

```typescript
import { Injectable } from '@nestjs/common';
import { LoggingService } from '../common/logging/logging.service';

@Injectable()
export class UserService {
  constructor(private loggingService: LoggingService) {}

  async createUser(userData: any) {
    try {
      this.loggingService.info('Creating new user', {
        userId: userData.id,
        email: userData.email,
        action: 'user.create'
      });

      // 业务逻辑
      const user = await this.userRepository.save(userData);

      this.loggingService.info('User created successfully', {
        userId: user.id,
        action: 'user.created'
      });

      return user;
    } catch (error) {
      this.loggingService.error('Failed to create user', error, {
        userId: userData.id,
        email: userData.email,
        action: 'user.create.failed'
      });
      throw error;
    }
  }
}
```

### 2. HTTP请求日志

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggingService } from '../common/logging/logging.service';

@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  constructor(private loggingService: LoggingService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      
      this.loggingService.logHttpRequest(
        req.method,
        req.url,
        res.statusCode,
        responseTime,
        req.headers['user-agent'],
        req.ip,
        (req as any).user?.id,
        req.headers['content-length'] ? parseInt(req.headers['content-length']) : undefined,
        res.get('content-length') ? parseInt(res.get('content-length')) : undefined,
        req.headers as Record<string, string>
      );
    });

    next();
  }
}
```

### 3. 数据库操作日志

```typescript
import { Injectable } from '@nestjs/common';
import { LoggingService } from '../common/logging/logging.service';

@Injectable()
export class DatabaseService {
  constructor(private loggingService: LoggingService) {}

  async query(sql: string, params: any[] = []) {
    const startTime = Date.now();
    
    try {
      const result = await this.connection.query(sql, params);
      const duration = Date.now() - startTime;
      
      this.loggingService.logDatabaseQuery(sql, duration, params);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.loggingService.error('Database query failed', error, {
        query: sql,
        duration,
        paramCount: params.length
      });
      throw error;
    }
  }
}
```

## 监控和调试

### 1. 健康检查

```typescript
import { Controller, Get } from '@nestjs/common';
import { LoggingService } from './common/logging/logging.service';

@Controller('health')
export class HealthController {
  constructor(private loggingService: LoggingService) {}

  @Get('logging')
  async checkLoggingHealth() {
    const health = await this.loggingService.healthCheck();
    return health;
  }
}
```

### 2. 统计查询

```typescript
import { Injectable } from '@nestjs/common';
import { OpenObserveConfigService } from './common/logging/openobserve.config';

@Injectable()
export class LogAnalyticsService {
  constructor(private openObserveConfig: OpenObserveConfigService) {}

  async getLogStatistics() {
    const stats = await this.openObserveConfig.getStatistics({
      from: 'now-1h',
      to: 'now'
    });
    return stats;
  }
}
```

### 3. 连接测试

```typescript
import { Command } from 'nestjs-command';
import { OpenObserveConfigService } from './common/logging/openobserve.config';

export class TestOpenObserveCommand {
  constructor(private openObserveConfig: OpenObserveConfigService) {}

  @Command({ command: 'test:openobserve', describe: 'Test OpenObserve connection' })
  async testConnection() {
    const result = await this.openObserveConfig.testConnection();
    console.log('OpenObserve Connection Test:');
    console.log(`Success: ${result.success}`);
    console.log(`Message: ${result.message}`);
    if (result.responseTime) {
      console.log(`Response Time: ${result.responseTime}ms`);
    }
  }
}
```

## 故障排除

### 常见问题

1. **连接失败**
   - 检查OpenObserve服务器是否运行
   - 验证URL和端口配置
   - 检查防火墙设置

2. **认证失败**
   - 验证Token或用户名密码
   - 检查权限设置
   - 确认组织存在

3. **日志丢失**
   - 检查批量大小配置
   - 查看网络连接状态
   - 验证流配置

4. **性能问题**
   - 调整批量大小和刷新间隔
   - 启用压缩减少带宽
   - 增加超时时间

### 调试模式

启用调试日志查看详细传输信息：
```env
LOGGING_LEVEL=debug
```

## 最佳实践

1. **生产环境配置**
   ```env
   # 启用压缩和批量处理
   LOGGING_OPENOBSERVE_COMPRESSION=true
   LOGGING_OPENOBSERVE_BATCH_SIZE=500
   LOGGING_OPENOBSERVE_FLUSH_INTERVAL=30000

   # 增加重试和超时
   LOGGING_OPENOBSERVE_RETRY_COUNT=5
   LOGGING_OPENOBSERVE_TIMEOUT=30000
   ```

2. **安全配置**
   - 使用HTTPS加密传输
   - 定期轮换认证Token
   - 限制访问权限

3. **监控配置**
   - 设置告警规则
   - 监控磁盘空间
   - 定期备份日志

## 相关文件

- `src/common/logging/logging.service.ts` - 主日志服务
- `src/common/logging/openobserve.config.ts` - OpenObserve配置
- `.env.openobserve.example` - 环境变量示例

## 参考链接

- [OpenObserve官方文档](https://openobserve.ai/docs)
- [NestJS日志文档](https://docs.nestjs.com/techniques/logger)
- [Winston文档](https://github.com/winstonjs/winston)