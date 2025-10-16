#!/usr/bin/env node

/**
 * 调试Test Monitor问题
 */

const { UnifiedTestMonitor } = require('./test-monitor.cjs');

console.log('开始调试Test Monitor...');

try {
  // 创建一个最小化的Test Monitor实例
  const monitor = new UnifiedTestMonitor({
    testCommand: 'echo "test"',
    logLevel: 'DEBUG',
    security: {
      commandWhitelist: ['echo'],
      userValidation: {
        enabled: false
      }
    },
    features: {
      security: {
        enabled: false
      },
      performance: {
        enabled: false
      },
      notifications: {
        enabled: false
      },
      reports: {
        enabled: false
      },
      config: {
        hotReload: false
      }
    }
  });
  
  console.log('Test Monitor实例创建成功');
  
  // 测试日志敏感信息脱敏功能
  console.log('测试日志敏感信息脱敏功能...');
  
  const passwordMessage = 'User login with password="secret123" successful';
  const sanitizedPassword = monitor.sanitizeLogMessage(passwordMessage);
  console.log(`密码脱敏测试: ${sanitizedPassword.includes('password="***"') ? '通过' : '失败'}`);
  
  const apiKeyMessage = 'API request with api_key=abc123def456 completed';
  const sanitizedApiKey = monitor.sanitizeLogMessage(apiKeyMessage);
  console.log(`API密钥脱敏测试: ${sanitizedApiKey.includes('api_key="***"') ? '通过' : '失败'}`);
  
  const tokenMessage = 'Authentication with token=xyz789abc123 successful';
  const sanitizedToken = monitor.sanitizeLogMessage(tokenMessage);
  console.log(`令牌脱敏测试: ${sanitizedToken.includes('token="***"') ? '通过' : '失败'}`);
  
  const pathMessage = `Reading file from /Users/johnsmith/config.json`;
  const sanitizedPath = monitor.sanitizeLogMessage(pathMessage);
  console.log(`路径脱敏测试: ${sanitizedPath.includes('/Users/***/') ? '通过' : '失败'}`);
  
  const winPathMessage = `Reading file from C:\\Users\\janesmith\\config.json`;
  const sanitizedWinPath = monitor.sanitizeLogMessage(winPathMessage);
  console.log(`Windows路径脱敏测试: ${sanitizedWinPath.includes('C:\\Users\\***\\') ? '通过' : '失败'}`);
  
  console.log('调试完成');
} catch (error) {
  console.error('调试过程中出错:', error.message);
  console.error('错误堆栈:', error.stack);
}