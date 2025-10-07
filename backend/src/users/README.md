# 用户管理模块 (DDD架构)

## 架构概述

本模块采用领域驱动设计(DDD)架构，将用户管理功能分为四个主要层次：

### 1. 领域层 (Domain Layer)
- **聚合根**: `UserAggregate` - 封装用户核心业务逻辑
- **实体**: `UserBasicInfo`, `UserSecurity` - 用户基本信息和安全信息
- **值对象**: `UserId`, `Email`, `Password` - 不可变的对象
- **领域事件**: `UserRegisteredEvent`, `UserProfileUpdatedEvent`, `UserPasswordChangedEvent`

### 2. 应用层 (Application Layer)
- **命令**: `RegisterUserCommand`, `UpdateUserProfileCommand`, `ChangeUserPasswordCommand`
- **查询**: `GetUserByIdQuery`, `GetUsersQuery`
- **应用服务**: `UserRegistrationService`, `UserProfileService`, `UserPasswordService`, `UserQueryService`

### 3. 基础设施层 (Infrastructure Layer)
- **仓储实现**: `TypeOrmUserRepository` - TypeORM实现
- **实体映射**: `UserEntity` - 数据库实体

### 4. 接口层 (Interface Layer)
- **控制器**: `UserController` - REST API端点

## 核心功能

### 用户注册
- 邮箱格式验证
- 密码强度验证
- 用户名唯一性检查
- 自动发布用户注册事件

### 用户资料管理
- 基本信息更新（用户名、头像、手机号）
- 密码更改（需验证当前密码）
- 账户激活/停用

### 安全特性
- 密码加密存储
- 登录失败次数限制
- 账户自动锁定机制
- 登录统计记录

### 查询功能
- 按ID查询用户
- 分页查询用户列表
- 按邮箱/用户名查询
- 用户统计信息

## 技术特点

### DDD优势
1. **业务逻辑集中**: 所有用户相关业务逻辑集中在聚合根中
2. **数据一致性**: 通过聚合根保证数据一致性边界
3. **可测试性**: 领域对象易于单元测试
4. **可维护性**: 清晰的架构分层，职责分离

### 安全设计
1. **值对象验证**: 邮箱、密码等值对象内置验证逻辑
2. **密码安全**: 密码加密存储和验证
3. **账户保护**: 登录失败保护和自动锁定

### 扩展性
1. **事件驱动**: 通过领域事件支持系统扩展
2. **仓储抽象**: 支持多种数据存储实现
3. **CQRS模式**: 命令和查询分离，优化读写性能

## 使用示例

### 注册用户
```typescript
const command = new RegisterUserCommand(
  'user@example.com',
  'username',
  'password123',
  'avatar.jpg',
  '13800138000'
);
const user = await commandBus.execute(command);
```

### 更新资料
```typescript
const command = new UpdateUserProfileCommand(
  1,
  'new_username',
  'new_avatar.jpg',
  '13900139000'
);
const user = await commandBus.execute(command);
```

### 查询用户
```typescript
const query = new GetUserByIdQuery(1);
const user = await queryBus.execute(query);
```

## 从temp_congomall借鉴的有益经验

1. **DDD架构模式**: 采用清晰的领域驱动设计分层
2. **聚合根设计**: 用户作为聚合根封装业务逻辑
3. **值对象应用**: 邮箱、密码等作为值对象确保数据完整性
4. **事件驱动**: 通过领域事件实现松耦合
5. **仓储模式**: 抽象数据访问层，支持多种存储实现

## 后续优化方向

1. **集成真实加密库**: 替换临时密码哈希实现
2. **添加缓存层**: 优化查询性能
3. **完善测试覆盖**: 增加单元测试和集成测试
4. **监控集成**: 添加性能监控和日志记录
5. **API文档**: 完善Swagger文档