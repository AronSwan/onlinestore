# AuthManager巨型类拆分计划

## 重构目标
按照美团SOLID原则要求，将291行的AuthManager巨型类拆分为职责单一的专职类，消除违反单一职责原则的代码坏味道。

## 问题分析

### 当前违反的设计原则
- **单一职责原则(SRP)违反**: AuthManager承担了认证、会话管理、UI交互、API集成、密码安全等多种职责
- **开闭原则(OCP)违反**: 新增认证方式需要修改AuthManager主类
- **依赖倒置原则(DIP)违反**: 直接依赖具体实现类而非抽象接口

### 识别的代码坏味道
- **SMELL-AUTH-001**: 巨型类(291行)，包含8个不同职责的方法
- **SMELL-AUTH-002**: 过度耦合，AuthManager直接管理UI、API、会话等
- **SMELL-AUTH-003**: 违反单一职责，一个类承担了整个认证流程的所有环节

## 拆分方案设计

### 目标架构(符合美团分层标准)
```
js/auth/
├── core/                    # 核心业务层
│   ├── AuthService.js       # 认证业务逻辑
│   ├── SessionManager.js    # 会话管理
│   └── PermissionChecker.js # 权限检查
├── ui/                      # UI交互层
│   └── AuthUI.js           # 认证相关UI操作
├── api/                     # API集成层
│   └── AuthAPI.js          # 认证API调用
├── security/                # 安全工具层
│   └── PasswordSecurity.js # 密码安全处理
└── AuthManager.js          # 门面模式主控制器(重构后)
```

### 类职责分配

#### 1. AuthService (核心认证业务)
- 职责: 认证流程编排、业务规则验证
- 方法: login(), register(), logout(), changePassword()
- 依赖: SessionManager, AuthAPI, PasswordSecurity

#### 2. SessionManager (会话管理)
- 职责: 用户会话的创建、验证、销毁
- 方法: createSession(), getCurrentSession(), isSessionValid(), clearSession()
- 依赖: 无

#### 3. PermissionChecker (权限检查)
- 职责: 用户权限验证、角色检查
- 方法: checkPermission(), hasRole(), canAccess()
- 依赖: SessionManager

#### 4. AuthUI (UI交互)
- 职责: 认证相关的UI状态更新、消息显示
- 方法: showLoadingState(), showSuccessMessage(), updateUIForLoggedInUser()
- 依赖: 无

#### 5. AuthAPI (API集成)
- 职责: 与后端认证API的通信
- 方法: authenticate(), register(), logout(), changePassword()
- 依赖: 无

#### 6. PasswordSecurity (密码安全)
- 职责: 密码加密、强度验证
- 方法: hashPassword(), validatePasswordStrength()
- 依赖: 无

#### 7. AuthManager (门面控制器-重构后)
- 职责: 协调各专职类，提供统一接口
- 方法: init(), login(), register(), logout(), getCurrentUser(), isLoggedIn()
- 依赖: AuthService, AuthUI

## 重构步骤

### 步骤1: 创建专职类目录结构
```bash
mkdir -p js/auth/core
mkdir -p js/auth/ui  
mkdir -p js/auth/api
mkdir -p js/auth/security
```

### 步骤2: 提取SessionManager类
- 从AuthManager中提取会话管理相关方法
- 创建 `js/auth/core/SessionManager.js`
- 实现会话的CRUD操作

### 步骤3: 提取AuthAPI类
- 从AuthManager中提取API调用相关方法
- 创建 `js/auth/api/AuthAPI.js`
- 封装所有后端认证API调用

### 步骤4: 提取PasswordSecurity类
- 从AuthManager中提取密码安全相关方法
- 创建 `js/auth/security/PasswordSecurity.js`
- 实现密码加密和验证逻辑

### 步骤5: 提取AuthUI类
- 从AuthManager中提取UI交互相关方法
- 创建 `js/auth/ui/AuthUI.js`
- 封装所有认证相关的UI操作

### 步骤6: 创建PermissionChecker类
- 新建权限检查专职类
- 创建 `js/auth/core/PermissionChecker.js`
- 实现权限验证逻辑

### 步骤7: 创建AuthService类
- 提取核心认证业务逻辑
- 创建 `js/auth/core/AuthService.js`
- 编排认证流程，调用各专职类

### 步骤8: 重构AuthManager主类
- 重写AuthManager为门面模式
- 移除具体实现，仅保留接口协调
- 依赖注入各专职类

### 步骤9: 更新测试用例
- 为每个专职类编写单元测试
- 更新AuthManager的集成测试
- 确保测试覆盖率≥100%(核心模块)

## 预期收益

### 代码质量提升
- 圈复杂度: 从15降至≤8(每个类)
- 代码行数: 主类从291行降至≤100行
- 职责单一: 每个类仅承担一种职责

### 可维护性提升
- 新增认证方式仅需扩展AuthService
- UI变更仅影响AuthUI类
- API变更仅影响AuthAPI类

### 可测试性提升
- 每个类可独立测试
- Mock依赖更容易
- 测试用例更聚焦

## 风险控制

### 回滚方案
- 保留原AuthManager为auth-manager.backup.js
- 每个拆分步骤独立提交
- 测试失败立即回滚到上一个稳定版本

### 兼容性保证
- 保持AuthManager公共接口不变
- 全局实例window.authManager继续可用
- 渐进式重构，不影响现有调用

### 测试策略
- 每个专职类100%单元测试覆盖
- AuthManager集成测试覆盖所有场景
- 端到端测试验证完整认证流程