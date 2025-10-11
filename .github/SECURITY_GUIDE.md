# 密钥和敏感文件保护指南

## 概述

本项目配置了多层安全防护机制，防止敏感文件（如 SSH 密钥、证书、.env 文件等）被意外提交到 Git 仓库。

## 🛡️ 安全防护层级

### 1. `.gitignore` 配置
项目根目录的 `.gitignore` 文件已配置以下规则来忽略敏感文件：

- **SSH 密钥**: `*.pem`, `*.key`, `*_rsa`, `*_ed25519`, `*_nopass*` 等
- **证书文件**: `*.crt`, `*.cer`, `*.p12`, `*.pfx`
- **环境变量文件**: `.env`, `.env.local`, `.env.production`
- **令牌文件**: `*.token`, `*.secret`
- **项目特定密钥**: `onlinestore_nopass_ed25519`

### 2. Git Pre-commit 钩子（本地检查）
在提交前自动检查并阻止敏感文件的提交。

**安装方法：**

Linux/MacOS:
```bash
cd .github/hooks
chmod +x install-hooks.sh
./install-hooks.sh
```

Windows:
```cmd
cd .github\hooks
install-hooks.bat
```

或者手动安装：
```bash
# Linux/MacOS/Git Bash
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**检查项目：**
- ✅ SSH 私钥文件
- ✅ .env 环境变量文件
- ✅ 证书和令牌文件
- ✅ 文件内容中的凭证模式

### 3. GitHub Actions 工作流（远程检查）
在 PR 和 Push 到主分支时自动运行安全检查。

**工作流文件**: `.github/workflows/secrets-check.yml`

**检查内容：**
- 🔍 扫描文件名是否匹配敏感文件模式
- 🔍 检查文件内容中的密钥和凭证
- 🔍 使用 TruffleHog 扫描已验证的秘密
- 🔍 使用 GitGuardian 进行深度扫描（可选）

## 🚨 被阻止的文件类型

### SSH 密钥文件
- `*.pem` - PEM 格式私钥
- `*.key` - 通用密钥文件
- `*.ppk` - PuTTY 私钥
- `*_rsa`, `*_dsa`, `*_ecdsa`, `*_ed25519` - SSH 密钥算法文件
- `*_nopass*` - 无密码保护的密钥
- `id_rsa*`, `id_dsa*`, `id_ecdsa*`, `id_ed25519*` - 标准 SSH 密钥名称

### 环境变量文件
- `.env` - 主环境变量文件
- `.env.local` - 本地环境变量
- `.env.production` - 生产环境变量
- `.env.development.local` - 开发环境本地变量
- `.env.test.local` - 测试环境本地变量

**✅ 允许提交**: `.env.example` - 模板文件（不含真实凭证）

### 证书文件
- `*.crt` - 证书文件
- `*.cer` - DER 编码证书
- `*.p12` - PKCS#12 证书
- `*.pfx` - 个人信息交换文件

### 令牌和密钥文件
- `*.token` - 令牌文件
- `*.secret` - 密钥文件
- `*-token.txt` - 令牌文本文件
- `*-secret.txt` - 密钥文本文件

### 项目特定文件
- `onlinestore_nopass_ed25519` - 项目 SSH 密钥
- `onlinestore_nopass_ed25519.pub` - 项目 SSH 公钥

## 📋 使用最佳实践

### 1. 使用环境变量模板
创建 `.env.example` 文件作为模板：
```bash
# .env.example
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_username
DB_PASSWORD=your_password_here
JWT_SECRET=your_jwt_secret_here
```

实际的 `.env` 文件包含真实凭证，不应提交到 Git。

### 2. 存储敏感文件
敏感文件应该：
- ✅ 存储在项目根目录（已在 .gitignore 中）
- ✅ 使用环境变量或密钥管理服务
- ✅ 在服务器上手动配置
- ❌ 不要提交到 Git 仓库

### 3. SSH 密钥管理
```bash
# 生成新密钥（推荐使用密码保护）
ssh-keygen -t ed25519 -C "your_email@example.com"

# 密钥文件位置
~/.ssh/id_ed25519        # 标准位置
./onlinestore_nopass_ed25519  # 项目特定位置（已在 .gitignore 中）
```

### 4. 如果意外提交了敏感文件

**立即行动：**
1. **旋转凭证** - 立即更改所有暴露的密码、密钥和令牌
2. **从 Git 历史中删除** - 使用以下方法之一：

   ```bash
   # 方法 1: 使用 git filter-branch（适用于少量文件）
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/sensitive/file" \
     --prune-empty --tag-name-filter cat -- --all
   
   # 方法 2: 使用 BFG Repo-Cleaner（推荐，更快）
   # 下载 BFG: https://rtyley.github.io/bfg-repo-cleaner/
   java -jar bfg.jar --delete-files sensitive-file.key
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   
   # 强制推送（谨慎使用）
   git push origin --force --all
   git push origin --force --tags
   ```

3. **通知团队** - 告知所有团队成员重新克隆仓库

## 🔧 绕过安全检查（仅在必要时）

如果您确定某个文件是安全的，可以临时绕过检查：

```bash
# 绕过 pre-commit 钩子（不推荐）
git commit --no-verify -m "Your commit message"
```

⚠️ **警告**: 绕过安全检查可能导致敏感信息泄露。仅在您完全确定文件安全时使用。

## 📊 GitHub Actions 检查状态

在提交 PR 或推送到主分支后，检查 GitHub Actions 的运行状态：

1. 访问您的 PR 页面
2. 查看 "Checks" 选项卡
3. 确认 "Secrets and Sensitive Files Check" 通过

如果检查失败：
- 查看详细错误信息
- 移除触发警报的文件
- 更新 `.gitignore`
- 重新提交

## 🆘 获取帮助

如果遇到问题：

1. **检查 .gitignore**: 确保敏感文件已被正确忽略
2. **查看钩子日志**: Pre-commit 钩子会显示详细错误信息
3. **查看 GitHub Actions 日志**: 在 Actions 选项卡查看详细扫描结果
4. **联系团队**: 向项目维护者寻求帮助

## 📚 相关资源

- [GitHub: 从仓库中删除敏感数据](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Git Hooks 文档](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [TruffleHog 文档](https://github.com/trufflesecurity/trufflehog)
- [GitGuardian 文档](https://www.gitguardian.com/)

## ✅ 检查清单

在提交代码前，确保：

- [ ] 没有包含真实的 SSH 私钥
- [ ] 没有包含 `.env` 文件（使用 `.env.example` 代替）
- [ ] 没有包含证书或令牌文件
- [ ] 代码中没有硬编码的密码或 API 密钥
- [ ] 已安装并测试了 pre-commit 钩子
- [ ] GitHub Actions 检查已通过

---

**记住**: 安全是每个人的责任。保护敏感信息，保护项目安全！🔒
