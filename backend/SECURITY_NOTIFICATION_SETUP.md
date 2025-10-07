# 安全通知设置指南

## 概述

安全通知系统可以在CI/CD流程中发送Slack和邮件通知，及时通知团队安全检查的结果。本指南将帮助您配置和使用这些通知功能。

## 支持的通知类型

1. **成功通知** - 当所有安全检查通过时发送
2. **警告通知** - 当发现非关键安全问题时发送
3. **错误通知** - 当发现关键安全问题或检查失败时发送

## 配置方法

### 方法一：使用配置文件

1. 复制示例配置文件：
   ```bash
   cp .security-notification-config.example.json .security-notification-config.json
   ```

2. 编辑配置文件，填入您的通知设置：
   ```json
   {
     "slack": {
       "enabled": true,
       "webhookUrl": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
       "channel": "#security-alerts",
       "username": "Security Bot",
       "iconEmoji": ":warning:"
     },
     "email": {
       "enabled": true,
       "smtpHost": "smtp.gmail.com",
       "smtpPort": 587,
       "secure": false,
       "auth": {
         "user": "your-email@gmail.com",
         "pass": "your-app-password"
       },
       "from": "security-alerts@yourcompany.com",
       "to": [
         "security-team@yourcompany.com",
         "dev-team@yourcompany.com"
       ]
     }
   }
   ```

### 方法二：使用环境变量

您也可以使用环境变量配置通知，这在CI/CD环境中特别有用：

#### Slack通知环境变量

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SLACK_CHANNEL=#security-alerts
```

#### 邮件通知环境变量

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=security-alerts@yourcompany.com
EMAIL_TO=security-team@yourcompany.com,dev-team@yourcompany.com
```

#### 项目信息环境变量

```bash
PROJECT_NAME=Caddy Shopping Backend
REPORT_URL=https://github.com/your-org/your-repo/actions/runs/12345
```

## Slack设置

### 创建Slack Webhook

1. 登录到您的Slack工作区
2. 导航到 https://api.slack.com/apps
3. 点击"Create New App" -> "From scratch"
4. 给应用命名，选择您的Slack工作区
5. 在"Features"部分，点击"Incoming Webhooks"
6. 激活"Incoming Webhooks"
7. 点击"Add New Webhook to Workspace"
8. 选择要发送通知的频道
9. 复制Webhook URL

### 配置Slack通知

将Webhook URL添加到配置文件或环境变量中。

## 邮件设置

### Gmail设置

1. 启用两步验证
2. 生成应用专用密码：
   - 访问 https://myaccount.google.com/apppasswords
   - 选择"邮件"和设备类型
   - 复制生成的密码
3. 使用应用专用密码作为SMTP_PASS

### 其他邮件服务

大多数邮件服务提供商都支持SMTP。请参考您的提供商的文档获取SMTP服务器设置。

## 手动发送通知

您可以使用以下命令手动发送通知：

```bash
# 发送成功通知
npm run security:notify-success

# 发送警告通知
npm run security:notify-warning

# 发送错误通知
npm run security:notify-error -- --message="自定义错误消息"
```

## 故障排除

### 通知未发送

1. 检查配置文件或环境变量是否正确设置
2. 确认Slack Webhook URL或邮件SMTP设置有效
3. 查看CI/CD日志中的错误信息

### Slack通知格式问题

1. 确保Slack频道存在且机器人有权限发送消息
2. 检查Webhook URL是否有效

### 邮件发送失败

1. 检查SMTP服务器设置
2. 确认用户名和密码正确
3. 检查防火墙是否阻止SMTP连接

## 最佳实践

1. **使用环境变量**：在CI/CD环境中使用环境变量而不是配置文件存储敏感信息
2. **测试通知**：在正式使用前测试通知功能
3. **限制通知频率**：避免过于频繁的通知导致团队疲劳
4. **自定义消息**：根据团队需求自定义通知消息

## 安全注意事项

1. **保护敏感信息**：不要在代码仓库中提交包含密码的配置文件
2. **使用最小权限**：为通知服务分配最小必要的权限
3. **定期更新凭据**：定期更新Webhook URL和邮件密码

## 示例通知

### Slack成功通知示例

```
✅ 安全检查通过

项目: Caddy Shopping Backend
分支: main
提交: abc1234
时间: 2025-10-03 17:30:00
通过检查: 25
```

### 邮件警告通知示例

当发现安全问题时，邮件通知将包含以下内容：
- 问题列表
- 问题严重度
- 修复建议
- 相关文档链接

## 更多信息

如需更多信息，请参考：
- [Slack API文档](https://api.slack.com/)
- [Nodemailer文档](https://nodemailer.com/)
- [GitHub Actions文档](https://docs.github.com/en/actions)