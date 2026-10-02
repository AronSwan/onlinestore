# 文件命名保护机制

## 目的

本机制旨在**防止生成奇怪名称的文件**，如包含特殊字符（括号、引号、空格等）的文件名，确保项目文件系统的整洁和安全。通过提供安全的文件操作包装函数，自动检查文件名和路径的安全性，阻止任何不安全的文件创建或修改操作。

## 功能特点

1. **文件名安全性检查**：验证文件名是否只包含安全字符（字母、数字、下划线、连字符、点）
2. **完整路径检查**：检查整个文件路径中的每个部分是否都安全
3. **安全文件操作包装**：提供安全的文件写入、追加、创建等函数
4. **操作监控与日志记录**：记录尝试使用不安全文件名的操作
5. **工作区清理功能**：可自动清理工作区中已存在的不安全文件名文件

## 文件结构

- `file_name_protection.cjs` - 核心保护机制实现
- `test_file_protection.cjs` - 功能测试脚本
- `file_security.log` - 安全事件日志（自动生成）
- `FILE_NAME_PROTECTION_README.md` - 本说明文档

## 集成方法

### 1. 直接使用安全文件操作函数

在项目中需要创建或修改文件时，使用`file_name_protection.js`中提供的安全函数替代原生的`fs`模块函数：

```javascript
const { safeWriteFile, safeAppendFile, safeWriteJsonFile } = require('./file_name_protection.cjs');

// 安全地写入文件
await safeWriteFile('path/to/safe-file.js', '文件内容');

// 安全地写入JSON文件
await safeWriteJsonFile('path/to/config.json', { key: 'value' });
```

### 2. 在现有文件操作前进行安全检查

对于已有的文件操作代码，可以在操作前使用安全检查函数：

```javascript
const { isSafePath, monitorFileOperation } = require('./file_name_protection.cjs');
const fs = require('fs');

function safeCustomFileOperation(filePath, content) {
    // 检查路径安全性
    if (!isSafePath(filePath)) {
        monitorFileOperation(filePath, 'custom_operation');
        throw new Error(`不安全的文件路径: ${filePath}`);
    }
    
    // 进行原有的文件操作
    fs.writeFileSync(filePath, content);
}
```

### 3. 定期清理工作区

可以定期运行清理功能来删除工作区中可能存在的不安全文件名文件：

```javascript
const { cleanUnsafeFiles } = require('./file_name_protection.cjs');

// 清理当前目录
const cleanedFiles = await cleanUnsafeFiles(__dirname);
console.log(`清理了 ${cleanedFiles.length} 个不安全文件`);
```

也可以直接从命令行运行清理功能：

```bash
node file_name_protection.cjs [工作区目录路径]
```

## 安全文件名规则

本机制定义的安全文件名必须满足以下条件：

- 只能包含以下字符：
  - 字母（a-z, A-Z）
  - 数字（0-9）
  - 下划线（_）
  - 连字符（-）
  - 点（.）
- 文件名长度不能超过255个字符
- 文件名不能为空

以下是**不安全的文件名示例**（将被阻止）：
- `({` - 包含特殊字符
- `file with spaces.txt` - 包含空格
- `file"with"quotes.js` - 包含引号
- `<html>.html` - 包含尖括号
- `file|with|pipes.js` - 包含管道符
- 过长的文件名（超过255字符）

## 测试机制

运行测试脚本来验证保护机制的有效性：

```bash
node test_file_protection.cjs
```

测试脚本会验证以下功能：
- 文件名安全性检查
- 路径安全性检查
- 安全文件写入功能
- 文件操作监控功能

## 日志记录

所有被阻止的不安全文件操作都会记录到`file_security.log`文件中，包含以下信息：
- 时间戳
- 操作类型
- 被阻止的文件路径

## 注意事项

1. 集成本机制后，请确保项目中的所有文件操作都通过安全包装函数进行
2. 定期检查`file_security.log`文件，了解是否有尝试使用不安全文件名的操作
3. 对于第三方库生成的文件，也应当进行安全性检查
4. 在团队开发中，建议将本机制作为项目规范的一部分强制执行

## 自定义扩展

如需修改安全文件名规则，可以编辑`file_name_protection.js`中的`SAFE_FILENAME_REGEX`正则表达式：

```javascript
// 自定义安全文件名正则表达式
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9_\-\.]{1,255}$/;
```

## 维护与更新

- 定期更新本机制以适应新的安全需求
- 在项目CI/CD流程中集成本机制，确保所有代码提交都符合文件名规范
- 对团队成员进行培训，了解安全文件名的重要性

---

作者：AI Assistant
创建时间：2025-09-26 13:37:00
版本：1.0.0