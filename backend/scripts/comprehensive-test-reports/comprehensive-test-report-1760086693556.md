# test-runner-secure.cjs 综合测试报告

## 测试概览
- **报告版本**: 3.0
- **测试时间**: 2025-10-10T08:58:13.556Z
- **执行时长**: 12.84 分钟
- **测试平台**: win32 (x64)
- **Node.js版本**: v22.20.0
- **CPU**: 24 核心 - Intel(R) Xeon(R) CPU E5-2673 v3 @ 2.40GHz
- **内存**: 32609MB 总计, 17864MB 可用
- **系统负载**: 0.00, 0.00, 0.00

## 测试总结
- **总测试数**: 47
- **通过数**: 41
- **失败数**: 6
- **跳过数**: 0
- **警告数**: 0
- **整体通过率**: 87.23%

## 模块测试结果

### basic
- **状态**: ❌ 失败
- **测试数**: 3
- **通过数**: 0
- **失败数**: 3
- **跳过数**: 0
- **警告数**: 0
- **通过率**: 0%
- **执行时长**: 1.24 秒
- **报告路径**: D:\onlinestore\backend\scripts\comprehensive-test-reports\basic-report-1760085924595.json

### robustness
- **状态**: ❌ 失败
- **测试数**: 13
- **通过数**: 13
- **失败数**: 0
- **跳过数**: 0
- **警告数**: 0
- **通过率**: 100%
- **执行时长**: 300.02 秒
- **报告路径**: D:\onlinestore\backend\scripts\comprehensive-test-reports\robustness-report-1760086226617.json

**错误信息**: 命令超时并被强制终止 (300000ms)...

### enhanced
- **状态**: ❌ 失败
- **测试数**: 10
- **通过数**: 8
- **失败数**: 2
- **跳过数**: 0
- **警告数**: 0
- **通过率**: 80%
- **执行时长**: 300.01 秒
- **报告路径**: D:\onlinestore\backend\scripts\comprehensive-test-reports\enhanced-report-1760086528644.json

**错误信息**: 命令超时并被强制终止 (300000ms)...

### faultTolerance
- **状态**: ❌ 失败
- **测试数**: 9
- **通过数**: 8
- **失败数**: 1
- **跳过数**: 0
- **警告数**: 0
- **通过率**: 88.89%
- **执行时长**: 138.30 秒
- **报告路径**: D:\onlinestore\backend\scripts\comprehensive-test-reports\faultTolerance-report-1760086668952.json

### integration
- **状态**: ❌ 失败
- **测试数**: 12
- **通过数**: 12
- **失败数**: 0
- **跳过数**: 0
- **警告数**: 0
- **通过率**: 0%
- **执行时长**: 20.59 秒
- **报告路径**: D:\onlinestore\backend\scripts\comprehensive-test-reports\integration-report-1760086691552.json

## 改进建议

### 1. 测试通过率有提升空间 [🟡 中优先级]
- **类别**: overall
- **描述**: 当前通过率为 87.23%，建议关注失败的测试用例。

### 2. basic 模块测试失败 [🔴 高优先级]
- **类别**: module
- **描述**: 检查 basic 模块的错误日志，修复导致测试失败的问题。

### 3. robustness 模块测试失败 [🔴 高优先级]
- **类别**: module
- **描述**: 检查 robustness 模块的错误日志，修复导致测试失败的问题。

### 4. enhanced 模块测试失败 [🔴 高优先级]
- **类别**: module
- **描述**: 检查 enhanced 模块的错误日志，修复导致测试失败的问题。

### 5. faultTolerance 模块测试失败 [🔴 高优先级]
- **类别**: module
- **描述**: 检查 faultTolerance 模块的错误日志，修复导致测试失败的问题。

### 6. integration 模块测试失败 [🔴 高优先级]
- **类别**: module
- **描述**: 检查 integration 模块的错误日志，修复导致测试失败的问题。

## 结论

✅ **良好**: test-runner-secure.cjs 通过了 87.23% 的测试，基本满足健壮性要求。

⚠️ **注意**: 存在高优先级问题，建议优先处理。

---
*报告生成时间: 2025-10-10T08:58:13.557Z*
*测试套件版本: 3.0*