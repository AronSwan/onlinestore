#!/usr/bin/env node

/**
 * 通知服务模块
 * 用途: 在CI/CD中添加Slack/邮件通知机制
 * @author 安全团队
 * @version 1.0.0
 * @since 2025-10-03
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { getSlack, getEmail } = require('./openobserve-adapter');

// 默认配置
const DEFAULT_CONFIG = {
  slack: {
    enabled: false,
    webhookUrl: '',
    channel: '#security-alerts',
    username: 'Security Bot',
    iconEmoji: ':warning:'
  },
  email: {
    enabled: false,
    smtpHost: '',
    smtpPort: 587,
    secure: false,
    auth: {
      user: '',
      pass: ''
    },
    from: '',
    to: []
  },
  templates: {
    success: {
      slack: {
        text: '✅ 安全检查通过',
        color: 'good'
      },
      email: {
        subject: '✅ 安全检查通过',
        template: 'success'
      }
    },
    warning: {
      slack: {
        text: '⚠️ 安全检查发现问题',
        color: 'warning'
      },
      email: {
        subject: '⚠️ 安全检查发现问题',
        template: 'warning'
      }
    },
    error: {
      slack: {
        text: '❌ 安全检查失败',
        color: 'danger'
      },
      email: {
        subject: '❌ 安全检查失败',
        template: 'error'
      }
    }
  }
};

/**
 * 通知服务类
 */
class NotificationService {
  constructor(options = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options };
    // 适配器合并（仅在现有值为空时填充，保留env兜底）
    try {
      const slackSdk = getSlack();
      if (slackSdk && typeof slackSdk === 'object') {
        this.config.slack.webhookUrl = this.config.slack.webhookUrl || slackSdk.webhookUrl || '';
        this.config.slack.channel = this.config.slack.channel || slackSdk.channel || '#security-alerts';
        this.config.slack.username = this.config.slack.username || slackSdk.username || 'Security Bot';
        this.config.slack.iconEmoji = this.config.slack.iconEmoji || slackSdk.iconEmoji || ':warning:';
      }
      const mail = getEmail();
      if (mail && typeof mail === 'object') {
        this.config.email.smtpHost = this.config.email.smtpHost || mail.smtpHost || (process.env.SMTP_HOST || '');
        this.config.email.smtpPort = this.config.email.smtpPort || Number(mail.smtpPort || (process.env.SMTP_PORT || 587));
        this.config.email.secure = this.config.email.secure || Boolean(mail.secure || false);
        const user = (this.config.email.auth && this.config.email.auth.user) || mail.user || (process.env.SMTP_USER || '');
        const pass = (this.config.email.auth && this.config.email.auth.pass) || mail.pass || (process.env.SMTP_PASS || '');
        this.config.email.auth = { user, pass };
        this.config.email.from = this.config.email.from || mail.from || (process.env.SMTP_FROM || 'security@example.com');
        const toList = Array.isArray(this.config.email.to) ? this.config.email.to : [];
        const mailTo = Array.isArray(mail.to) ? mail.to : (mail.to ? String(mail.to).split(',').map(s => s.trim()).filter(Boolean) : []);
        const envTo = process.env.SMTP_TO ? String(process.env.SMTP_TO).split(',').map(s => s.trim()).filter(Boolean) : [];
        this.config.email.to = toList.length ? toList : (mailTo.length ? mailTo : envTo);
      }
    } catch (_) {
      // 适配器不可用时静默回退
    }
    this.initTemplates();
  }

  /**
   * 初始化模板
   */
  initTemplates() {
    this.templatesDir = path.join(__dirname, '..', 'templates');
    
    // 确保模板目录存在
    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
      
      // 创建默认模板
      this.createDefaultTemplates();
    }
  }

  /**
   * 创建默认模板
   */
  createDefaultTemplates() {
    // 创建成功邮件模板
    const successEmailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>安全检查通过</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #28a745; color: white; padding: 10px 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
    .footer { background-color: #f1f1f1; padding: 10px 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; font-size: 12px; color: #666; }
    .success { color: #28a745; font-weight: bold; }
    .details { margin-top: 20px; }
    .details table { width: 100%; border-collapse: collapse; }
    .details th, .details td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .details th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ 安全检查通过</h1>
    </div>
    <div class="content">
      <p>安全检查已成功完成，未发现严重问题。</p>
      
      <div class="details">
        <h2>检查详情</h2>
        <table>
          <tr>
            <th>项目</th>
            <td>{{projectName}}</td>
          </tr>
          <tr>
            <th>分支</th>
            <td>{{branch}}</td>
          </tr>
          <tr>
            <th>提交</th>
            <td>{{commitHash}}</td>
          </tr>
          <tr>
            <th>执行时间</th>
            <td>{{timestamp}}</td>
          </tr>
          <tr>
            <th>检查通过数</th>
            <td class="success">{{passedChecks}}</td>
          </tr>
        </table>
      </div>
    </div>
    <div class="footer">
      <p>此邮件由安全检查系统自动发送。请勿直接回复。</p>
    </div>
  </div>
</body>
</html>
    `;
    
    // 创建警告邮件模板
    const warningEmailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>安全检查发现问题</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #ffc107; color: #333; padding: 10px 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
    .footer { background-color: #f1f1f1; padding: 10px 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; font-size: 12px; color: #666; }
    .warning { color: #856404; font-weight: bold; }
    .issue { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin-bottom: 10px; border-radius: 4px; }
    .issue-title { font-weight: bold; margin-bottom: 5px; }
    .details { margin-top: 20px; }
    .details table { width: 100%; border-collapse: collapse; }
    .details th, .details td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .details th { background-color: #f2f2f2; }
    .btn { display: inline-block; background-color: #ffc107; color: #333; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ 安全检查发现问题</h1>
    </div>
    <div class="content">
      <p>安全检查已完成，发现 <span class="warning">{{warningCount}}</span> 个需要关注的问题。</p>
      
      <div class="issues">
        <h2>问题列表</h2>
        {{#issues}}
        <div class="issue">
          <div class="issue-title">{{title}}</div>
          <div>严重度: {{severity}}</div>
          <div>规则: {{ruleId}}</div>
          <div>位置: {{location}}</div>
        </div>
        {{/issues}}
      </div>
      
      <div class="details">
        <h2>检查详情</h2>
        <table>
          <tr>
            <th>项目</th>
            <td>{{projectName}}</td>
          </tr>
          <tr>
            <th>分支</th>
            <td>{{branch}}</td>
          </tr>
          <tr>
            <th>提交</th>
            <td>{{commitHash}}</td>
          </tr>
          <tr>
            <th>执行时间</th>
            <td>{{timestamp}}</td>
          </tr>
        </table>
      </div>
      
      <div style="text-align: center; margin-top: 20px;">
        <a href="{{reportUrl}}" class="btn">查看完整报告</a>
      </div>
    </div>
    <div class="footer">
      <p>此邮件由安全检查系统自动发送。请勿直接回复。</p>
    </div>
  </div>
</body>
</html>
    `;
    
    // 创建错误邮件模板
    const errorEmailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>安全检查失败</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #dc3545; color: white; padding: 10px 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
    .footer { background-color: #f1f1f1; padding: 10px 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; font-size: 12px; color: #666; }
    .error { color: #721c24; font-weight: bold; }
    .error-message { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
    .details { margin-top: 20px; }
    .details table { width: 100%; border-collapse: collapse; }
    .details th, .details td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .details th { background-color: #f2f2f2; }
    .btn { display: inline-block; background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ 安全检查失败</h1>
    </div>
    <div class="content">
      <div class="error-message">
        <p class="error">安全检查执行过程中发生错误:</p>
        <p>{{errorMessage}}</p>
      </div>
      
      <div class="details">
        <h2>检查详情</h2>
        <table>
          <tr>
            <th>项目</th>
            <td>{{projectName}}</td>
          </tr>
          <tr>
            <th>分支</th>
            <td>{{branch}}</td>
          </tr>
          <tr>
            <th>提交</th>
            <td>{{commitHash}}</td>
          </tr>
          <tr>
            <th>执行时间</th>
            <td>{{timestamp}}</td>
          </tr>
        </table>
      </div>
      
      <div style="text-align: center; margin-top: 20px;">
        <a href="{{reportUrl}}" class="btn">查看完整报告</a>
      </div>
    </div>
    <div class="footer">
      <p>此邮件由安全检查系统自动发送。请勿直接回复。</p>
    </div>
  </div>
</body>
</html>
    `;
    
    // 写入模板文件
    fs.writeFileSync(path.join(this.templatesDir, 'success.html'), successEmailTemplate);
    fs.writeFileSync(path.join(this.templatesDir, 'warning.html'), warningEmailTemplate);
    fs.writeFileSync(path.join(this.templatesDir, 'error.html'), errorEmailTemplate);
  }

  /**
   * 发送Slack通知
   * @param {string} type - 通知类型 (success, warning, error)
   * @param {Object} data - 通知数据
   * @returns {Promise<boolean>} 是否发送成功
   */
  async sendSlackNotification(type, data) {
    if (!this.config.slack.enabled || !this.config.slack.webhookUrl) {
      console.log('Slack通知未启用或未配置Webhook URL');
      return false;
    }
    
    try {
      const template = this.config.templates[type].slack;
      const payload = {
        channel: this.config.slack.channel,
        username: this.config.slack.username,
        icon_emoji: this.config.slack.iconEmoji,
        attachments: [
          {
            color: template.color,
            title: template.text,
            fields: this.formatSlackFields(data),
            footer: 'Security Dashboard',
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      };
      
      const result = await this.sendHttpRequest(this.config.slack.webhookUrl, 'POST', payload);
      return result;
    } catch (error) {
      console.error(`发送Slack通知失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 格式化Slack字段
   * @param {Object} data - 数据对象
   * @returns {Array} 格式化后的字段数组
   */
  formatSlackFields(data) {
    const fields = [];
    
    if (data.projectName) {
      fields.push({
        title: '项目',
        value: data.projectName,
        short: true
      });
    }
    
    if (data.branch) {
      fields.push({
        title: '分支',
        value: data.branch,
        short: true
      });
    }
    
    if (data.commitHash) {
      fields.push({
        title: '提交',
        value: data.commitHash.substring(0, 7),
        short: true
      });
    }
    
    if (data.timestamp) {
      fields.push({
        title: '时间',
        value: new Date(data.timestamp).toLocaleString(),
        short: true
      });
    }
    
    if (data.passedChecks !== undefined) {
      fields.push({
        title: '通过检查',
        value: data.passedChecks.toString(),
        short: true
      });
    }
    
    if (data.warningCount !== undefined) {
      fields.push({
        title: '警告数量',
        value: data.warningCount.toString(),
        short: true
      });
    }
    
    if (data.errorCount !== undefined) {
      fields.push({
        title: '错误数量',
        value: data.errorCount.toString(),
        short: true
      });
    }
    
    if (data.reportUrl) {
      fields.push({
        title: '报告链接',
        value: `<${data.reportUrl}|查看报告>`,
        short: false
      });
    }
    
    if (data.errorMessage) {
      fields.push({
        title: '错误信息',
        value: data.errorMessage,
        short: false
      });
    }
    
    return fields;
  }

  /**
   * 发送邮件通知
   * @param {string} type - 通知类型 (success, warning, error)
   * @param {Object} data - 通知数据
   * @returns {Promise<boolean>} 是否发送成功
   */
  async sendEmailNotification(type, data) {
    if (!this.config.email.enabled || !this.config.email.smtpHost) {
      console.log('邮件通知未启用或未配置SMTP服务器');
      return false;
    }
    
    try {
      const template = this.config.templates[type].email;
      const htmlContent = this.generateEmailHtml(template.template, data);
      
      const emailData = {
        from: this.config.email.from,
        to: this.config.email.to.join(', '),
        subject: template.subject,
        html: htmlContent
      };
      
      const result = await this.sendEmail(emailData);
      return result;
    } catch (error) {
      console.error(`发送邮件通知失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 生成邮件HTML内容
   * @param {string} templateName - 模板名称
   * @param {Object} data - 数据对象
   * @returns {string} HTML内容
   */
  generateEmailHtml(templateName, data) {
    const templatePath = path.join(this.templatesDir, `${templateName}.html`);
    
    if (!fs.existsSync(templatePath)) {
      return `<p>模板文件不存在: ${templatePath}</p>`;
    }
    
    let html = fs.readFileSync(templatePath, 'utf8');
    
    // 简单的模板替换（实际项目中可以使用更强大的模板引擎）
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, value);
    }
    
    // 处理条件块和循环（简化实现）
    if (data.issues && Array.isArray(data.issues)) {
      const issuesHtml = data.issues.map(issue => {
        let issueHtml = html.match(/{{#issues}}([\s\S]*?){{\/issues}}/)[1];
        for (const [key, value] of Object.entries(issue)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          issueHtml = issueHtml.replace(regex, value);
        }
        return issueHtml;
      }).join('');
      
      html = html.replace(/{{#issues}}[\s\S]*?{{\/issues}}/, issuesHtml);
    }
    
    return html;
  }

  /**
   * 发送HTTP请求
   * @param {string} url - 请求URL
   * @param {string} method - 请求方法
   * @param {Object} data - 请求数据
   * @returns {Promise<boolean>} 是否请求成功
   */
  sendHttpRequest(url, method, data) {
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https://');
      const httpModule = isHttps ? https : http;
      
      const postData = JSON.stringify(data);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = httpModule.request(url, options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(true);
          } else {
            reject(new Error(`HTTP请求失败: ${res.statusCode} ${responseData}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(postData);
      req.end();
    });
  }

  /**
   * 发送邮件
   * @param {Object} emailData - 邮件数据
   * @returns {Promise<boolean>} 是否发送成功
   */
  sendEmail(emailData) {
    return new Promise((resolve, reject) => {
      // 这里简化实现，实际项目中应该使用nodemailer等专业库
      console.log('发送邮件:', emailData);
      
      // 模拟发送邮件
      setTimeout(() => {
        resolve(true);
      }, 100);
    });
  }

  /**
   * 发送通知
   * @param {string} type - 通知类型 (success, warning, error)
   * @param {Object} data - 通知数据
   * @returns {Promise<Object>} 发送结果
   */
  async sendNotification(type, data) {
    const results = {
      slack: { sent: false, error: null },
      email: { sent: false, error: null }
    };
    
    // 发送Slack通知
    try {
      results.slack.sent = await this.sendSlackNotification(type, data);
    } catch (error) {
      results.slack.error = error.message;
    }
    
    // 发送邮件通知
    try {
      results.email.sent = await this.sendEmailNotification(type, data);
    } catch (error) {
      results.email.error = error.message;
    }
    
    return results;
  }
}

module.exports = {
  NotificationService,
  DEFAULT_CONFIG
};