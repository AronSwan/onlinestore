# Test Runner Secure 验证测试

本目录包含用于验证 `test-runner-secure.cjs` 核心功能的测试套件。

## 测试文件

1. `test-runner-secure.validation-tests.cjs` - 主要验证测试套件，包含所有功能测试
2. `test-runner-secure.validation-tests-docker.cjs` - Docker环境专用验证测试套件，专注于环境限制的功能
3. `Dockerfile.validation-tests` - 用于构建Docker测试环境的Dockerfile

## 本地环境运行

在本地环境中，可以运行主要验证测试套件：

```bash
node backend/scripts/test-runner-secure.validation-tests.cjs
```

这将运行所有测试，包括：
- 参数验证器测试 (8个)
- 状态管理器测试 (6个)
- 安全命令执行器测试 (3个)
- 资源管理测试 (1个)
- 边界条件测试 (3个)

总计21个测试，其中2个由于环境限制无法完全测试（命令执行和沙箱判断）。

## Docker环境运行

对于完整的功能验证，包括环境限制的功能，可以在Docker环境中运行测试：

### 构建Docker镜像

```bash
docker build -f backend/scripts/Dockerfile.validation-tests -t test-runner-secure-validation backend/scripts/
```

### 运行Docker容器

```bash
docker run --rm test-runner-secure-validation
```

这将运行Docker环境专用验证测试套件，专注于测试：
- 命令执行
- 沙箱判断
- 错误分类

## 测试结果解读

### 本地环境测试结果

本地环境测试报告包含以下部分：
- **通过**: 成功的测试数量
- **失败**: 失败的测试数量
- **环境限制**: 由于环境限制无法完全测试的测试数量
- **通过率**: 基于非环境限制测试的通过率

### Docker环境测试结果

Docker环境测试报告包含：
- **通过**: 成功的测试数量
- **失败**: 失败的测试数量
- **通过率**: 所有测试的通过率

## 测试覆盖范围

### 参数验证器
- 正常参数验证
- 参数长度边界
- 参数长度超限检测
- 命令注入防护
- 路径遍历防护
- 超时值边界检查
- 工作线程数边界检查
- 冲突参数检测

### 状态管理器
- 命令频率限制正常情况
- 读写锁获取
- 读锁操作
- 写锁操作
- 通用锁获取
- 资源监控启动

### 安全命令执行器
- 命令执行（Docker环境中完全测试）
- 沙箱判断（Docker环境中完全测试）
- 错误分类

### 资源管理
- 历史记录清理

### 边界条件
- 空参数数组
- 最大参数数量
- 超出最大参数数量

## 故障排除

### 本地环境测试失败

如果本地环境测试失败，请检查：
1. Node.js版本是否兼容
2. 所有依赖是否正确安装
3. 文件权限是否正确

### Docker环境测试失败

如果Docker环境测试失败，请检查：
1. Docker是否正确安装和运行
2. 镜像是否成功构建
3. 容器是否有足够的权限执行命令

## 报告文件

测试运行后会生成详细的JSON报告文件：
- 本地环境：`validation-test-report-comprehensive.json`
- Docker环境：`validation-test-report-docker.json`

这些报告包含每个测试的详细结果，包括：
- 测试名称
- 成功状态
- 错误信息（如果有）
- 期望结果和实际结果
- 执行时间