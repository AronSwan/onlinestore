#!/usr/bin/env node

/**
 * 安全通知发送脚本
 * 用途: 在CI/CD中发送Slack/邮件通知
 * 使用方法:
 *   npm run security:notify-success
 *   npm run security:notify-warning
 *   npm run security:notify-error
 * @author 安全团队
 * @version 1.0.0
 * @since 2025-10-03
 */

const path = require('path');
const fs = require('fs');
const { NotificationService } = require('./modules/notification-service');
const { getSlack, getEmail } = require('./modules/openobserve-adapter');

// 项目根目录
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 默认配置
const DEFAULT_CONFIG = {
  configFile: '.security-notification-config.json',
  reportFile: 'security-report.json',
  validationReportFile: 'validation-report.json'
};

/**
 * 加载通知配置
 * @param {string} configFile - 配置文件路径
 * @returns {Object} 通知配置
 */
function loadNotificationConfig(configFile) {
  const configPath = path.join(PROJECT_ROOT, configFile);
  
  if (!fs.existsSync(configPath)) {
    console.warn(`通知配置文件不存在: ${configPath}`);
    return {
      slack: {
        enabled: false,
        // 统一读取 Slack 配置
        ...getSlack(),
        webhookUrl: undefined,
        channel: (getSlack().channel || process.env.SLACK_CHANNEL || '#security-alerts'),
        username: (getSlack().username || 'Security Bot'),
        iconEmoji: ':warning:'
      },
      email: {
        enabled: false,
        // 统一读取 Email 配置
        ...getEmail(),
        smtpHost: undefined,
        smtpPort: parseInt((getEmail().smtpPort || process.env.SMTP_PORT || '587')),
        secure: String(getEmail().secure || process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
        auth: {
          user: (getEmail().auth && getEmail().auth.user) ? getEmail().auth.user : (process.env.SMTP_USER || ''),
          pass: (getEmail().auth && getEmail().auth.pass) ? getEmail().auth.pass : (process.env.SMTP_PASS || '')
        },
        from: (getEmail().from || process.env.EMAIL_FROM || ''),
        to: (() => {
          const fromAdapter = Array.isArray(getEmail().to) ? getEmail().to : (getEmail().to ? String(getEmail().to).split(',').map(s => s.trim()).filter(Boolean) : []);
          const fromEnv = (process.env.EMAIL_TO || '').split(',').map(s => s.trim()).filter(Boolean);
          return fromAdapter.length ? fromAdapter : fromEnv;
        })()
      }
    };
  }
  
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configContent);
  } catch (error) {
    console.error(`加载通知配置失败: ${error.message}`);
    process.exit(1);
  }
}

/**
 * 加载报告数据
 * @param {string} reportFile - 报告文件路径
 * @returns {Object|null} 报告数据
 */
function loadReportData(reportFile) {
  const reportPath = path.join(PROJECT_ROOT, reportFile);
  
  if (!fs.existsSync(reportPath)) {
    console.warn(`报告文件不存在: ${reportPath}`);
    return null;
  }
  
  try {
    const reportContent = fs.readFileSync(reportPath, 'utf8');
    return JSON.parse(reportContent);
  } catch (error) {
    console.error(`加载报告数据失败: ${error.message}`);
    return null;
  }
}

/**
 * 准备通知数据
 * @param {string} type - 通知类型
 * @param {Object} options - 选项对象
 * @returns {Object} 通知数据
 */
function prepareNotificationData(type, options = {}) {
  const reportData = loadReportData(options.reportFile || DEFAULT_CONFIG.reportFile);
  const validationData = loadReportData(options.validationReportFile || DEFAULT_CONFIG.validationReportFile);
  
  // 基础数据
  const data = {
    projectName: process.env.PROJECT_NAME || 'Caddy Shopping Backend',
    branch: process.env.GITHUB_REF_NAME || process.env.BRANCH || 'unknown',
    commitHash: process.env.GITHUB_SHA || process.env.COMMIT_HASH || 'unknown',
    timestamp: new Date().toISOString(),
    reportUrl: process.env.REPORT_URL || `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  };
  
  // 根据类型添加特定数据
  switch (type) {
    case 'success':
      data.passedChecks = reportData?.results?.length || 0;
      break;
      
    case 'warning':
      data.warningCount = 0;
      data.errorCount = 0;
      data.issues = [];
      
      if (reportData?.results) {
        for (const result of reportData.results) {
          if (result.status === 'warning') {
            data.warningCount++;
          } else if (result.status === 'error') {
            data.errorCount++;
          }
          
          if (result.status === 'warning' || result.status === 'error') {
            data.issues.push({
              title: result.title || result.ruleId || '未知问题',
              severity: result.severity || 'unknown',
              ruleId: result.ruleId || 'unknown',
              location: result.location || 'unknown'
            });
          }
        }
      }
      
      // 如果没有问题但有验证警告
      if (data.warningCount === 0 && validationData?.warnings?.length > 0) {
        data.warningCount = validationData.warnings.length;
        data.issues = validationData.warnings.map(warning => ({
          title: warning || '配置警告',
          severity: 'warning',
          ruleId: 'validation',
          location: 'security-constants'
        }));
      }
      break;
      
    case 'error':
      data.errorMessage = options.errorMessage || '安全检查执行失败';
      
      // 尝试从报告或验证报告中获取错误信息
      if (reportData?.error) {
        data.errorMessage = reportData.error;
      } else if (validationData?.errors?.length > 0) {
        data.errorMessage = validationData.errors.join('; ');
      }
      break;
  }
  
  return data;
}

/**
 * 主函数
 * @param {Object} options - 选项对象
 */
async function sendSecurityNotification(options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };
  
  try {
    // 解析命令行参数
    const args = process.argv.slice(2);
    let type = 'success'; // 默认类型
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--type' && i + 1 < args.length) {
        type = args[++i];
      } else if (arg === '--config' && i + 1 < args.length) {
        config.configFile = args[++i];
      } else if (arg === '--report' && i + 1 < args.length) {
        config.reportFile = args[++i];
      } else if (arg === '--validation' && i + 1 < args.length) {
        config.validationReportFile = args[++i];
      } else if (arg === '--message' && i + 1 < args.length) {
        options.errorMessage = args[++i];
      }
    }
    
    // 验证通知类型
    const validTypes = ['success', 'warning', 'error'];
    if (!validTypes.includes(type)) {
      console.error(`无效的通知类型: ${type}。有效类型: ${validTypes.join(', ')}`);
      process.exit(1);
    }
    
    console.log(`发送${type}类型安全通知...`);
    
    // 加载通知配置
    const notificationConfig = loadNotificationConfig(config.configFile);
    
    // 准备通知数据
    const notificationData = prepareNotificationData(type, options);
    
    // 创建通知服务
    const notificationService = new NotificationService(notificationConfig);
    
    // 发送通知
    const results = await notificationService.sendNotification(type, notificationData);
    
    // 输出结果
    console.log('\n通知发送结果:');
    console.log(`Slack: ${results.slack.sent ? '✅ 成功' : '❌ 失败'}`);
    if (results.slack.error) {
      console.log(`  错误: ${results.slack.error}`);
    }
    
    console.log(`邮件: ${results.email.sent ? '✅ 成功' : '❌ 失败'}`);
    if (results.email.error) {
      console.log(`  错误: ${results.email.error}`);
    }
    
    // 如果所有通知都失败，则退出码为1
    if (!results.slack.sent && !results.email.sent) {
      console.error('所有通知发送失败');
      process.exit(1);
    }
    
    console.log('通知发送完成');
  } catch (error) {
    console.error(`发送通知失败: ${error.message}`);
    process.exit(1);
  }
}

// 运行通知发送
if (require.main === module) {
  sendSecurityNotification();
}

module.exports = { sendSecurityNotification };