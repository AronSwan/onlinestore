# Docker沙箱测试环境设置指南

## 当前环境状态

- **Docker状态**: 不可用 (500 Internal Server Error)
- **测试策略**: 使用模拟环境进行沙箱测试
- **测试目标**: 验证test-runner-secure.cjs的沙箱功能

## 目录结构

```
backend/scripts/
├── .test-output/                    # 测试输出目录
│   ├── sandbox-test-report.json     # 沙箱测试报告
│   └── docker-simulation-test-report.json
├── test-runner-secure.cjs           # 主测试运行器
├── test-runner-secure-sandbox-test.cjs      # 沙箱测试套件
├── test-runner-secure-docker-simulation.cjs # Docker模拟测试
└── docker-sandbox-test-setup.md     # 本文件
```

## 测试配置文件

### 沙箱配置
- 内存限制: 128MB
- CPU时间限制: 10秒
- 文件大小限制: 1MB
- 网络访问: 禁止

### 安全限制
- 阻止危险命令: rm, sudo, chmod, kill等
- 阻止路径遍历攻击
- 阻止网络访问

## 测试场景

1. **基本命令执行测试**
   - 验证沙箱环境中的基本命令执行功能

2. **危险命令阻止测试**
   - 验证危险命令被正确阻止

3. **资源限制测试**
   - 内存限制
   - CPU时间限制
   - 文件大小限制

4. **网络限制测试**
   - 验证网络访问被阻止

## 运行测试

### 模拟环境测试
```bash
cd backend/scripts
node test-runner-secure-docker-simulation.cjs
```

### 沙箱功能测试
```bash
cd backend/scripts
node test-runner-secure-sandbox-test.cjs
```

## 预期结果

- 所有安全限制测试通过
- 资源限制功能正常工作
- 网络隔离功能正常
- 测试通过率: 100%

## 故障排除

### Docker问题
如果Docker服务不可用：
1. 重启Docker Desktop服务
2. 检查Docker Desktop日志
3. 重新安装Docker Desktop（如果需要）

### 测试失败
1. 检查测试输出目录权限
2. 验证Node.js版本兼容性
3. 检查系统资源限制

## 下一步

1. 修复Docker环境问题
2. 在真实Docker环境中运行测试
3. 集成到CI/CD流程