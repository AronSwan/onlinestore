# Docker 沙箱测试指南

## 概述

本指南详细介绍了如何在 Docker 环境中测试 `test-runner-secure.cjs` 的沙箱功能。沙箱测试旨在验证安全命令执行器在隔离环境中的行为，包括资源限制、安全限制和网络限制。

## 文件结构

```
backend/scripts/
├── Dockerfile.test-runner-secure          # Docker 镜像构建文件
├── docker-compose.test-runner-secure.yml   # Docker Compose 配置文件
├── test-runner-secure-sandbox-test.cjs     # 沙箱测试脚本
├── run-docker-sandbox-test.sh              # Linux/macOS 运行脚本
├── run-docker-sandbox-test.ps1             # Windows PowerShell 运行脚本
└── DOCKER_SANDBOX_TEST_GUIDE.md            # 本指南文档
```

## 测试内容

### 1. 基本命令执行测试
验证沙箱环境中的基本命令执行功能，确保正常命令可以正确执行。

### 2. 安全限制测试
验证沙箱环境中的安全限制功能，包括：
- 危险命令阻止
- 路径遍历阻止
- 命令注入防护

### 3. 资源限制测试
验证沙箱环境中的资源限制功能，包括：
- 内存限制
- CPU 时间限制
- 文件大小限制

### 4. 网络限制测试
验证沙箱环境中的网络限制功能，确保无法访问外部网络。

## 快速开始

### 使用 Linux/macOS

1. 确保已安装 Docker 并正在运行
2. 进入脚本目录：
   ```bash
   cd backend/scripts
   ```
3. 运行测试：
   ```bash
   chmod +x run-docker-sandbox-test.sh
   ./run-docker-sandbox-test.sh
   ```

### 使用 Windows

1. 确保已安装 Docker Desktop 并正在运行
2. 进入脚本目录：
   ```powershell
   cd backend\scripts
   ```
3. 运行测试：
   ```powershell
   .\run-docker-sandbox-test.ps1
   ```

## 详细使用说明

### 命令行选项

#### Linux/macOS (bash)

```bash
./run-docker-sandbox-test.sh [选项]
```

选项：
- `-h, --help`: 显示帮助信息
- `-p, --privileged`: 使用特权模式运行测试
- `-b, --build`: 重新构建 Docker 镜像
- `-c, --clean`: 清理测试容器和镜像
- `-l, --logs`: 查看测试日志
- `-r, --report`: 显示测试报告

#### Windows (PowerShell)

```powershell
.\run-docker-sandbox-test.ps1 [选项]
```

选项：
- `-Help`: 显示帮助信息
- `-Privileged`: 使用特权模式运行测试
- `-Build`: 重新构建 Docker 镜像
- `-Clean`: 清理测试容器和镜像
- `-Logs`: 查看测试日志
- `-Report`: 显示测试报告

### 示例用法

#### 基本测试

运行标准沙箱测试：
```bash
# Linux/macOS
./run-docker-sandbox-test.sh

# Windows
.\run-docker-sandbox-test.ps1
```

#### 特权模式测试

运行特权模式沙箱测试（用于对比）：
```bash
# Linux/macOS
./run-docker-sandbox-test.sh -p

# Windows
.\run-docker-sandbox-test.ps1 -Privileged
```

#### 重新构建镜像

重新构建 Docker 镜像并运行测试：
```bash
# Linux/macOS
./run-docker-sandbox-test.sh -b

# Windows
.\run-docker-sandbox-test.ps1 -Build
```

#### 查看测试报告

查看最新测试报告：
```bash
# Linux/macOS
./run-docker-sandbox-test.sh -r

# Windows
.\run-docker-sandbox-test.ps1 -Report
```

#### 清理测试环境

清理测试容器和镜像：
```bash
# Linux/macOS
./run-docker-sandbox-test.sh -c

# Windows
.\run-docker-sandbox-test.ps1 -Clean
```

## 测试报告

测试完成后，会生成一个 JSON 格式的测试报告，保存在 `backend/.test-output/sandbox-test-report.json`。

报告包含以下信息：
- 环境信息（Node.js 版本、平台、用户等）
- 测试摘要（总测试数、通过数、失败数、通过率、耗时）
- 详细测试结果（每个测试的成功状态、错误信息等）

## 自定义测试

如果需要自定义测试配置，可以修改 `test-runner-secure-sandbox-test.cjs` 文件中的测试参数，例如：

```javascript
// 资源限制配置
const sandboxExecutor = new SandboxExecutor({
  resourceLimits: {
    maxMemoryMB: 128,      // 内存限制（MB）
    maxCpuTime: 10,         // CPU 时间限制（秒）
    maxFileSize: 1024 * 1024, // 文件大小限制（字节）
    maxOpenFiles: 50,       // 最大打开文件数
    maxProcesses: 5         // 最大进程数
  },
  // ... 其他配置
});
```

## 故障排除

### Docker 相关问题

1. **Docker 未安装**
   - 错误信息：`Docker未安装，请先安装Docker`
   - 解决方案：安装 Docker Desktop 或 Docker Engine

2. **Docker 未运行**
   - 错误信息：`Docker未运行，请先启动Docker`
   - 解决方案：启动 Docker Desktop 或 Docker 服务

3. **镜像构建失败**
   - 错误信息：`镜像构建失败`
   - 解决方案：检查 Dockerfile 和脚本文件是否存在语法错误

### 测试相关问题

1. **测试超时**
   - 解决方案：增加测试超时时间或检查测试脚本是否有死循环

2. **权限错误**
   - 解决方案：确保脚本文件有执行权限（Linux/macOS）

3. **文件路径错误**
   - 解决方案：确保在正确的目录中运行脚本

## 高级用法

### 使用 Docker Compose

除了使用提供的运行脚本，还可以直接使用 Docker Compose：

```bash
cd backend/scripts

# 运行标准测试
docker-compose -f docker-compose.test-runner-secure.yml run --rm test-runner-secure-sandbox

# 运行特权模式测试
docker-compose -f docker-compose.test-runner-secure.yml run --rm test-runner-secure-sandbox-privileged
```

### 手动构建和运行

1. 构建镜像：
   ```bash
   cd backend
   docker build -f scripts/Dockerfile.test-runner-secure -t test-runner-secure:test .
   ```

2. 运行容器：
   ```bash
   docker run --rm \
     -v "$(pwd)/scripts:/app/scripts:ro" \
     -v "$(pwd)/.test-output:/app/.test-output" \
     -e NODE_ENV=test \
     test-runner-secure:test
   ```

## 注意事项

1. **资源消耗**：沙箱测试可能会消耗较多系统资源，建议在具有足够资源的系统上运行。

2. **测试隔离**：每个测试都在独立的容器中运行，确保测试之间不会相互影响。

3. **特权模式**：特权模式测试主要用于对比，展示沙箱限制的效果，不建议在生产环境中使用。

4. **网络限制**：默认情况下，沙箱测试会阻止所有网络访问，包括内部网络。

## 扩展测试

如果需要添加更多测试用例，可以修改 `test-runner-secure-sandbox-test.cjs` 文件，在 `run` 方法中添加新的测试：

```javascript
// 添加新测试
await this.test('新测试名称', async () => {
  // 测试逻辑
  return true; // 或 false
}, true);
```

## 结论

Docker 沙箱测试提供了一种安全、隔离的方式来验证 `test-runner-secure.cjs` 的沙箱功能。通过这些测试，可以确保沙箱环境中的安全限制和资源限制正常工作，提高系统的安全性和可靠性。