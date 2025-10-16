# 安全建议收集与显示机制

## 概述

本系统实现了智能的安全建议收集与显示机制，避免了在测试过程中重复显示相同建议的问题。

## 工作原理

### 建议收集
- 在每次用户验证过程中，系统会收集相关的安全建议
- 建议被存储在内存中，而不是立即显示
- 相同的建议会被自动去重

### 建议显示
- 所有收集的建议会在测试结束时统一显示
- 建议按照优先级排序（高、中、低）
- 每个建议包含类型、消息和原因信息

## 建议类型

### 用户相关 (user)
- 触发条件：当前用户为特权用户（root或Administrator）
- 优先级：高
- 示例："当前用户为特权用户，建议使用非特权用户运行测试"

### 测试相关 (test)
- 触发条件：测试可能对系统造成高影响
- 优先级：高
- 示例："测试可能对系统造成高影响"

### 环境相关 (environment)
- 触发条件：当前环境未隔离且测试影响不是低级别
- 优先级：中
- 示例："建议在隔离环境中运行测试"

## 配置选项

### 在代码中配置
```javascript
const config = {
  showRecommendations: false, // 禁用立即显示建议
  collectRecommendations: true  // 启用收集建议
};

const result = validateCurrentUser(config);
```

### 强制显示建议
```javascript
const config = {
  forceShowRecommendations: true // 强制显示建议，忽略时间限制
};
```

## 技术实现

### 核心模块
- `redesigned-user-validation.js`: 提供安全建议生成和收集功能
- `user-validation-advanced.cjs`: 提供与旧代码兼容的接口
- `security-test.cjs`: 实现建议的统一显示

### 关键函数
- `provideSecurityRecommendations()`: 生成安全建议
- `validateTestRun()`: 验证测试运行并收集建议
- `validateCurrentUser()`: 验证当前用户并返回建议

## 故障排除

### 问题：建议没有显示
- 检查`showRecommendations`选项是否被设置为`false`
- 确认`collectRecommendations`选项是否被设置为`true`
- 验证建议是否被正确收集（检查返回结果中的`recommendations`字段）

### 问题：建议重复显示
- 系统会自动去重相同类型的建议
- 如果仍然出现重复，检查建议的`type`和`message`字段是否完全一致

## 最佳实践

1. 在测试脚本中使用`collectRecommendations: true`选项
2. 在测试结束时统一显示所有收集的建议
3. 为不同类型的测试提供不同的配置
4. 记录建议的来源和上下文，便于调试

## 示例代码

```javascript
// 收集安全建议
const result = validateCurrentUser({
  enableAdvancedFeatures: true,
  collectRecommendations: true
});

// 处理收集的建议
if (result.recommendations && result.recommendations.length > 0) {
  console.log('\n=== 安全建议 ===');
  result.recommendations.forEach((rec, index) => {
    const priority = rec.priority === 'high' ? '🔴' : 
                    rec.priority === 'medium' ? '🟡' : '🟢';
    console.log(`${priority} ${index + 1}. ${rec.message}`);
    console.log(`   原因: ${rec.reason}`);
    console.log(`   类型: ${rec.type}`);
  });
}