# 🚀 快速安全设置指南

## 第一次克隆项目后的必要步骤

### 1. 安装 Git 安全钩子（5秒）

这将防止您意外提交敏感文件（SSH密钥、.env文件等）。

**Linux/MacOS/Git Bash:**
```bash
cd .github/hooks
chmod +x install-hooks.sh
./install-hooks.sh
```

**Windows:**
```cmd
cd .github\hooks
install-hooks.bat
```

### 2. 创建本地环境变量文件

**不要修改或提交 `.env` 文件！** 使用 `.env.example` 作为模板：

```bash
# 复制模板
cp .env.example .env

# 编辑 .env 文件，填入您的真实凭证
# 此文件已在 .gitignore 中，不会被提交
```

### 3. 验证安全配置

测试 Git 钩子是否正常工作：

```bash
# 尝试添加一个测试密钥文件（应该被阻止）
touch test_id_rsa
git add test_id_rsa
git commit -m "test"

# 如果看到错误提示，说明安全钩子工作正常！
# 记得删除测试文件
rm test_id_rsa
```

## ✅ 完成！

您现在已经配置好安全防护。从现在开始：

- ✅ Git 会在提交前自动检查敏感文件
- ✅ GitHub Actions 会在 PR 中进行二次检查
- ✅ 您的本地 `.env` 和密钥文件不会被意外提交

## 📚 更多信息

详细文档：[完整安全指南](SECURITY_GUIDE.md)

## 🆘 需要帮助？

如果遇到问题，请查看 [SECURITY_GUIDE.md](SECURITY_GUIDE.md) 或联系团队。
