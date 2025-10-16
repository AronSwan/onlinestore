const fs = require('fs');
const content = \# Test Runner Secure 增强文档

## 概述

本文档描述了对 test-runner-secure.cjs 脚本的增强功能，添加了新的参数支持，提高了测试运行的灵活性。

## 新增参数

### 1. --runInBand

**描述**：串行运行所有测试，而不是并行运行。

**用途**：
- 调试测试间的依赖问题
- 运行资源密集型测试
- 避免并发竞争条件

**示例**：
\\\ash
# 直接使用脚本
node scripts/test-runner-secure.cjs --runInBand

# 使用 npm 脚本
npm run test:idle
\\\

### 2. --listTests

**描述**：列出所有测试文件但不执行测试。

**用途**：
- 查看项目中所有可用的测试
- 快速统计测试数量
- 生成测试报告

**示例**：
\\\ash
# 直接使用脚本
node scripts/test-runner-secure.cjs --listTests

# 使用 npm 脚本
npm run test:analysis
\\\

### 3. --jestHelp

**描述**：显示 Jest 帮助信息。

**用途**：
- 查看 Jest 支持的所有参数
- 了解 Jest 的使用方法
- 调试 Jest 配置问题

**示例**：
\\\ash
# 直接使用脚本
node scripts/test-runner-secure.cjs --jestHelp

# 使用 npm 脚本
npm run test:validate
\\\

### 4. --runTestsByPath

**描述**：运行指定路径的测试。

**用途**：
- 运行特定模块的测试
- 调试特定测试文件
- 在 CI/CD 中运行部分测试

**示例**：
\\\ash
# 直接使用脚本
node scripts/test-runner-secure.cjs --runTestsByPath=\
src/auth/**/*.spec.ts\

# 使用 npm 脚本
npm run test:perf
\\\

## NPM 脚本

以下是在 package.json 中添加的新脚本：

\\\json
{
  \scripts\: {
    \test:perf\: \node
scripts/test-runner-secure.cjs
--runTestsByPath=test/performance/**/*.spec.ts\,
    \test:idle\: \node
scripts/test-runner-secure.cjs
--runInBand\,
    \test:analysis\: \node
scripts/test-runner-secure.cjs
--listTests\,
    \test:validate\: \node
scripts/test-runner-secure.cjs
--jestHelp\
  }
}
\\\

## 参数冲突处理

脚本会自动处理以下参数冲突：

1. \--runInBand\ 与 \--maxWorkers\ 冲突：
   - 当使用 \--runInBand\ 时，脚本不会添加 \--maxWorkers\ 参数
   - 这确保了测试真正串行运行

2. \--debug\ 模式：
   - 自动启用 \--runInBand\
   - 添加 \--detectOpenHandles\ 和 \--forceExit\ 参数
   - 增加更多诊断参数

## 使用场景

### 1. 调试测试问题

当遇到测试问题时，可以使用以下组合：

\\\ash
# 串行运行测试，便于调试
npm run test:idle

# 查看所有可用测试
npm run test:analysis

# 运行特定模块的测试
node scripts/test-runner-secure.cjs --runTestsByPath=\src/auth/**/*.spec.ts\ --runInBand
\\\

### 2. CI/CD 集成

在 CI/CD 环境中，可以使用以下策略：

\\\ash
# 先列出所有测试
npm run test:analysis

# 然后运行关键测试
npm run test:idle

# 或者运行特定路径的测试
npm run test:perf
\\\

### 3. 性能测试

对于性能测试，建议使用：

\\\ash
# 串行运行，避免相互干扰
npm run test:idle

# 或者只运行性能相关的测试
node scripts/test-runner-secure.cjs --runTestsByPath=\test/performance/**/*.spec.ts\
\\\

## 故障排除

### 1. 参数不生效

如果发现参数不生效，请检查：

1. 参数名称是否正确
2. 参数值是否有效
3. 是否有参数冲突

### 2. 测试路径不存在

如果使用 \--runTestsByPath\ 指定的路径不存在，脚本会：

1. 显示警告信息
2. 回退到运行所有测试
3. 继续执行，不会中断

### 3. 性能问题

如果遇到性能问题：

1. 使用 \--runInBand\ 串行运行
2. 减少并发数：\--maxWorkers=1\
3. 运行特定测试而不是全部测试

## 向后兼容性

所有新参数都是可选的，不会影响现有脚本的使用方式。现有脚本和 CI/CD 流程无需修改即可继续工作。

## 后续改进

1. 添加更多 Jest 参数的支持
2. 实现测试结果的可视化报告
3. 添加测试性能分析功能
4. 支持更灵活的测试路径匹配模式
\;

try {
  fs.writeFileSync('docs/testing/test-runner-secure-enhancement.md', content, 'utf8');
  console.log('文件创建成功');
} catch (error) {
  console.error('文件创建失败:', error.message);
}

