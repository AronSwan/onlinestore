# 技术债记录：安全建议重复显示问题

## 问题描述
在安全测试过程中，每次调用`validateCurrentUser`函数时都会显示安全建议，导致测试输出中出现重复的安全建议提示，影响用户体验。

## 影响范围
- 文件：`backend/scripts/security/security-test.cjs`
- 模块：`redesigned-user-validation.js`, `user-validation-advanced.cjs`
- 用户：运行安全测试的开发人员

## 优先级
- P1 - 高（影响用户体验和测试输出可读性）

## 问题分析
1. 每次调用`validateCurrentUser`函数时，都会调用`validateTestRun`函数
2. `validateTestRun`函数会显示安全建议，而不考虑是否已经显示过相同建议
3. 在测试中，我们对每个注入攻击用户名都调用了一次`validateCurrentUser`，导致多次显示相同建议

## 解决方案
1. **修改`redesigned-user-validation.js`模块**：
   - 添加全局变量跟踪最近显示的安全建议
   - 修改`validateTestRun`函数，使其能够收集建议而不是立即显示
   - 添加时间限制，避免短时间内重复显示相同建议

2. **修改`user-validation-advanced.cjs`模块**：
   - 在`validateCurrentUser`函数中默认禁用安全建议的显示
   - 确保验证结果中包含收集的安全建议

3. **修改`security-test.cjs`脚本**：
   - 添加`securityRecommendations`数组来收集所有安全建议
   - 在测试结束时统一显示收集的安全建议，并自动去重

## 实施日期
2025-10-14

## 验证方法
1. 运行安全测试：`cd backend && node scripts/security/security-test.cjs`
2. 确认测试过程中没有重复的安全建议提示
3. 确认测试结束时统一显示收集的安全建议
4. 运行建议收集测试：`cd backend && node scripts/security/test-recommendations-collection.cjs`

## 相关文档
- `backend/scripts/security/SECURITY_RECOMMENDATIONS_GUIDE.md` - 安全建议收集与显示机制指南
- `backend/scripts/security/test-recommendations-collection.cjs` - 安全建议收集和显示功能测试

## 后续建议
1. 考虑将安全建议收集机制抽象为一个独立的模块，供其他测试脚本复用
2. 添加更多的建议类型，如性能相关、资源使用相关等
3. 实现建议的持久化存储，以便跨测试会话保留建议
4. 添加建议的严重性评级，帮助用户优先处理高优先级建议

## 状态
✅ 已解决