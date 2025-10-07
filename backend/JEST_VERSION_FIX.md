# Jest 版本不匹配问题修复指南

## 问题概述
后端项目存在严重的依赖版本不匹配问题，主要体现在：
- Jest 版本：package.json 要求 ^29.8.0，实际安装 29.7.0
- ts-jest 版本：package.json 要求 ^29.5.5，实际安装 29.4.4
- 其他几乎所有依赖都存在类似问题

## 解决方案

### 方案一：完整重新安装（推荐）
```bash
cd backend
rm -rf node_modules
rm package-lock.json
npm install --legacy-peer-deps
```

### 方案二：强制更新特定包
```bash
cd backend
npm install jest@^29.8.0 ts-jest@^29.5.5 ajv-cli@^5.0.0 --save-dev --legacy-peer-deps
```

### 方案三：修复兼容性问题
如果不想升级，可以临时修改 package.json：
```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "ts-jest": "^29.4.4"
  }
}
```

## 验证修复
```bash
cd backend
npm ls jest
npm ls ts-jest
npm run test
```

## 预防措施
1. 使用 `npm ci` 而不是 `npm install` 在 CI/CD 中
2. 定期运行 `npm audit` 检查安全问题
3. 使用 `npm outdated` 检查过期依赖
4. 考虑使用 `package-lock.json` 锁定版本

## 注意事项
- 使用 `--legacy-peer-deps` 标志处理 peer dependency 警告
- 某些包可能需要 Node.js 版本升级
- 建议在升级后运行完整测试套件