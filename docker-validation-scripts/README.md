# Docker配置验证脚本 (改进版)

本目录包含用于验证Docker配置文件正确性和一致性的脚本集合，旨在确保所有Docker相关配置文件能够正常协同工作，避免配置冲突。

## 改进内容

### 相比初版的主要改进

1. **Docker命令兼容性** - 支持`docker compose` v2和`docker-compose` v1自动检测
2. **自动发现文件** - 自动搜索所有Docker Compose文件，无需硬编码列表
3. **端口解析增强** - 支持多种端口格式，包括带协议、变量插值等
4. **环境变量检查完善** - 支持字典格式、env_file引用、默认值语法
5. **新增验证脚本** - 网络一致性、卷冲突、健康检查、资源限制验证
6. **跨平台支持** - 统一临时目录处理，更好的Windows兼容性
7. **报告改进** - 更详细的报告格式，更好的CI集成

## 文件说明

### 核心工具

- **utils.sh** - 通用工具函数库，包含所有脚本共享的功能

### 核心验证脚本

- **docker-syntax-validation-v2.sh** - 验证所有Docker Compose文件的语法正确性
- **port-conflict-detection-v2.sh** - 检测服务端口冲突
- **env-consistency-check-v2.sh** - 验证环境变量在各服务间的一致性

### 新增验证脚本

- **network-consistency-check.sh** - 验证网络配置一致性
- **volume-conflict-detection.sh** - 检测卷映射冲突
- **health-check-validation.sh** - 验证健康检查配置
- **resource-limit-check.sh** - 检查资源限制配置

### 综合验证脚本

- **comprehensive-docker-validation-v2.sh** - Bash版本的综合验证脚本（Linux/macOS）
- **comprehensive-docker-validation-v2.ps1** - PowerShell版本的综合验证脚本（Windows）

### 文档

- **README-v2.md** - 改进版使用说明（本文件）
- **docker-validation-plan.md** - 详细的验证方案设计文档

## 使用方法

### 前提条件

1. 安装Docker和Docker Compose
2. 确保Docker服务正在运行
3. 对于Windows用户，需要安装WSL或Git Bash来执行Shell脚本

### 快速开始

#### 在Linux/macOS上

```bash
# 给脚本添加执行权限
chmod +x validation-scripts/*.sh

# 运行综合验证
./validation-scripts/comprehensive-docker-validation.sh
```

#### 在Windows上

```powershell
# 运行PowerShell版本的综合验证
.\validation-scripts\comprehensive-docker-validation-v2.ps1
```

### 单独运行验证脚本

#### 语法验证

```bash
# Linux/macOS
./validation-scripts/docker-syntax-validation-v2.sh

# Windows (使用WSL或Git Bash)
bash validation-scripts/docker-syntax-validation-v2.sh
```

#### 端口冲突检测

```bash
# Linux/macOS
./validation-scripts/port-conflict-detection-v2.sh

# Windows
bash validation-scripts/port-conflict-detection-v2.sh
```

#### 环境变量一致性检查

```bash
# Linux/macOS
./validation-scripts/env-consistency-check-v2.sh

# Windows
bash validation-scripts/env-consistency-check-v2.sh
```

#### 网络一致性检查

```bash
# Linux/macOS
./validation-scripts/network-consistency-check.sh

# Windows
bash validation-scripts/network-consistency-check.sh
```

#### 卷冲突检测

```bash
# Linux/macOS
./validation-scripts/volume-conflict-detection.sh

# Windows
bash validation-scripts/volume-conflict-detection.sh
```

#### 健康检查验证

```bash
# Linux/macOS
./validation-scripts/health-check-validation.sh

# Windows
bash validation-scripts/health-check-validation.sh
```

#### 资源限制检查

```bash
# Linux/macOS
./validation-scripts/resource-limit-check.sh

# Windows
bash validation-scripts/resource-limit-check.sh
```

## 验证项目

### 1. 语法正确性
- 验证所有Docker Compose文件的YAML语法
- 检查服务配置的正确性
- 确保文件格式符合Docker Compose规范

### 2. 端口冲突检测
- 检查主机端口是否被多个服务占用
- 验证端口映射的正确性
- 支持多种端口格式解析
- 确保容器端口与主机端口映射合理

### 3. 环境变量一致性
- 检查关键环境变量在各服务间的一致性
- 支持数组和字典格式解析
- 验证env_file引用和环境变量引用
- 处理默认值语法 ${VAR:-default}

### 4. 网络配置一致性
- 验证网络配置的正确性
- 检查网络子网冲突
- 确保服务网络连接正确
- 验证默认网络配置

### 5. 服务依赖关系
- 验证服务依赖关系的正确性
- 检查依赖服务是否存在
- 确保启动顺序合理

### 6. 卷映射冲突检测
- 检查主机卷映射冲突
- 验证命名卷配置的正确性
- 检查卷权限配置
- 识别未使用的命名卷

### 7. 健康检查配置
- 验证健康检查端点的可用性
- 检查健康检查端口与服务端口一致性
- 验证健康检查参数合理性
- 统计健康检查覆盖率

### 8. 资源限制合理性
- 检查CPU和内存限制配置
- 验证资源分配的合理性
- 检查资源预留不超过限制
- 提供资源使用建议

## 验证报告

验证完成后，会生成一个详细的Markdown报告文件：`docker-validation-report.md`

报告包含以下内容：
- 验证概述（时间、人员、范围）
- 各项验证的详细结果
- 问题总结和统计
- 修复建议
- 下一步行动计划

## 高级功能

### 自动发现Docker Compose文件

脚本会自动搜索以下位置的Docker Compose文件：
- 根目录下的`docker-compose*.yml`和`docker-compose*.yaml`文件
- 子目录中的`docker-compose.yml`文件

### Docker命令兼容性

脚本会自动检测并使用可用的Docker Compose命令：
- 优先使用`docker compose`（v2）
- 回退到`docker-compose`（v1）

### 跨平台支持

- Linux/macOS：使用Bash脚本
- Windows：提供PowerShell版本的脚本
- 统一的临时目录处理

## 集成到CI/CD

### GitHub Actions示例

```yaml
name: Docker Configuration Validation

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  docker-validation:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Docker
      uses: docker-practice/actions-setup-docker@master
    
    - name: Install jq and yq (robust)
      run: |
        sudo apt-get update
        sudo apt-get install -y jq || true
        sudo apt-get install -y python3-pip || true
        # Try multiple methods to install yq
        sudo snap install yq || sudo apt-get install -y yq || pip3 install yq || sudo wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 && sudo chmod +x /usr/local/bin/yq
        yq --version || echo "yq installation fallback may be needed"
    - name: Validate Docker configurations
      env:
        VALIDATION_ENV_PRECEDENCE: env_base,env_file,environment
      run: |
        chmod +x ./validation-scripts/*.sh
        ./validation-scripts/comprehensive-docker-validation.sh
    - name: Upload validation report (on failure)
      uses: actions/upload-artifact@v2
      if: failure()
      with:
        name: docker-validation-report
        path: docker-validation-report.md
```

### Git Hooks示例

```bash
#!/bin/sh
# .git/hooks/pre-commit

echo "执行Docker配置验证..."
./validation-scripts/comprehensive-docker-validation.sh

if [ $? -ne 0 ]; then
    echo "Docker配置验证失败，请修复问题后再提交"
    echo "详细报告请查看: docker-validation-report.md"
    exit 1
fi
```

## 故障排除

### 常见问题

1. **权限错误**
   ```bash
   chmod +x validation-scripts/*.sh
   ```

2. **Docker不可用**
   - 确保Docker服务正在运行
   - 检查Docker和Docker Compose是否已添加到PATH

3. **Windows执行问题**
   - 安装WSL或Git Bash
   - 使用PowerShell版本的脚本

4. **jq未安装**
   - Ubuntu/Debian: `sudo apt-get install jq`
   - CentOS/RHEL: `sudo yum install jq`
   - macOS: `brew install jq`

5. **bc未安装**（资源限制检查需要）
   - Ubuntu/Debian: `sudo apt-get install bc`
   - CentOS/RHEL: `sudo yum install bc`
   - macOS: `brew install bc`

### 调试模式

可以通过修改脚本启用详细输出：

```bash
# 在脚本开头添加
set -x  # 启用调试模式

# 或者在执行时
bash -x validation-scripts/docker-syntax-validation-v2.sh
```

## 自定义配置

### 添加新的验证脚本

1. 在`validation-scripts`目录下创建新的脚本文件
2. 按照`docker-syntax-validation-v2.sh`的格式编写脚本
3. 确保脚本返回适当的退出码（0表示成功，非0表示失败）
4. 在`comprehensive-docker-validation-v2.sh`中添加新脚本到`VALIDATION_SCRIPTS`数组

### 修改验证规则

每个验证脚本都可以根据项目需求进行自定义：

- 修改`KEY_ENV_VARS`数组来添加更多需要检查的环境变量
- 调整自动发现文件的逻辑来适应特定的项目结构
- 修改验证逻辑来适应特定的项目需求

## 性能优化

### 并行执行

对于大型项目，可以考虑并行执行验证脚本以提高性能：

```bash
# 使用xargs并行执行
find validation-scripts -name "*-validation-v2.sh" | xargs -I {} -P 4 bash {}
```

### 缓存Docker配置

脚本会自动缓存Docker配置解析结果，避免重复解析同一文件。

## 贡献指南

1. 发现新的验证需求时，创建相应的验证脚本
2. 确保新脚本遵循现有的格式和约定
3. 更新文档说明新功能
4. 测试脚本在各种环境下的兼容性

## 版本历史

### v2.0 (当前版本)
- 支持Docker Compose v2和v1自动检测
- 自动发现Docker Compose文件
- 增强端口解析逻辑
- 完善环境变量检查
- 新增网络、卷、健康检查、资源限制验证
- 改进跨平台支持
- 优化报告格式

### v1.0 (初始版本)
- 基本语法验证
- 端口冲突检测
- 环境变量一致性检查

## 许可证

本验证脚本集合遵循项目的整体许可证。