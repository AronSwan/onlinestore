#!/usr/bin/env node

/**
 * 安全检查脚本 (增强版)
 * 用途: 自动化执行安全检查清单中的检查项
 * 使用方法:
 *   npm run security:check
 *   npm run security:check -- --category=auth
 *   npm run security:check -- --rule=jwt-expiration
 *   npm run security:check -- --format=json --output=security-report.json
 *   npm run security:check -- --fail-on=high
 *   npm run security:check -- --ci --fail-on=high
 *   npm run security:check -- --env-file=.env.test
 * @author 安全团队
 * @version 1.1.0
 * @since 2025-10-03
 */

// 导入模块化组件
const { loadEnvFile, loadedEnvFile } = require('./modules/env-loader');
const { parseExemptionComments, hasValidExemption } = require('./modules/exemption-parser');
const { SECURITY_RULES } = require('./modules/security-rules');
const { SECURITY_CATEGORIES } = require('./modules/security-categories');
const { runSecurityChecks } = require('./modules/check-runner');
const { generateOutput, shouldFail, getExitCode } = require('./modules/output-formatter');
const { parseArgs } = require('./modules/args-parser');

// 错误类型定义
class SecurityCheckError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'SecurityCheckError';
    this.code = code;
    this.details = details;
  }
}

// 错误代码枚举
const ERROR_CODES = {
  CONFIG_ERROR: 'CONFIG_ERROR',
  RULE_EXECUTION_ERROR: 'RULE_EXECUTION_ERROR',
  OUTPUT_GENERATION_ERROR: 'OUTPUT_GENERATION_ERROR',
  FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
};

/**
 * 错误处理函数
 * @param {Error} error - 错误对象
 * @param {Object} options - 选项对象
 * @param {Object} context - 上下文信息
 */
function handleError(error, options = {}, context = {}) {
  // 确定错误类型
  let securityError;
  if (error instanceof SecurityCheckError) {
    securityError = error;
  } else {
    // 根据错误消息确定错误类型
    let code = ERROR_CODES.RULE_EXECUTION_ERROR;
    if (error.message.includes('ENOENT') || error.message.includes('file not found')) {
      code = ERROR_CODES.FILE_SYSTEM_ERROR;
    } else if (error.message.includes('timeout')) {
      code = ERROR_CODES.TIMEOUT_ERROR;
    } else if (error.message.includes('validation')) {
      code = ERROR_CODES.VALIDATION_ERROR;
    }

    securityError = new SecurityCheckError(error.message, code, {
      originalError: error,
      ...context,
    });
  }

  // 记录错误
  logError(securityError, options);

  // 在CI模式下生成错误报告
  if (options.ci) {
    generateErrorReport(securityError, options);
  }

  return securityError;
}

/**
 * 记录错误信息
 * @param {SecurityCheckError} error - 安全检查错误
 * @param {Object} options - 选项对象
 */
function logError(error, options) {
  const timestamp = new Date().toISOString();
  const logLevel = options.ci ? 'error' : 'error';

  console.error(`[${timestamp}] [${logLevel}] ${error.name}: ${error.message}`);
  console.error(`错误代码: ${error.code}`);

  if (error.details && Object.keys(error.details).length > 0) {
    console.error('错误详情:');
    Object.entries(error.details).forEach(([key, value]) => {
      console.error(`  ${key}: ${value}`);
    });
  }

  // 在非CI模式下显示堆栈跟踪
  if (!options.ci && error.details.originalError && error.details.originalError.stack) {
    console.error('堆栈跟踪:');
    console.error(error.details.originalError.stack);
  }
}

/**
 * 生成错误报告
 * @param {SecurityCheckError} error - 安全检查错误
 * @param {Object} options - 选项对象
 */
function generateErrorReport(error, options) {
  try {
    const fs = require('fs');
    const path = require('path');

    const reportPath = options.errorReportPath || 'security-error-report.json';
    const report = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        details: error.details,
      },
      options: {
        category: options.category,
        rule: options.rule,
        format: options.format,
        output: options.output,
        failOn: options.failOn,
        ci: options.ci,
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.error(`错误报告已生成: ${reportPath}`);
  } catch (reportError) {
    console.error('生成错误报告失败:', reportError.message);
  }
}

/**
 * 验证选项
 * @param {Object} options - 选项对象
 * @throws {SecurityCheckError} 当选项无效时抛出错误
 */
function validateOptions(options) {
  // 验证类别
  if (options.category && !SECURITY_CATEGORIES.includes(options.category)) {
    throw new SecurityCheckError(
      `无效的类别: ${options.category}。有效类别: ${SECURITY_CATEGORIES.join(', ')}`,
      ERROR_CODES.VALIDATION_ERROR,
      { providedCategory: options.category, validCategories: SECURITY_CATEGORIES },
    );
  }

  // 验证规则
  if (options.rule && !SECURITY_RULES[options.rule]) {
    throw new SecurityCheckError(`无效的规则: ${options.rule}`, ERROR_CODES.VALIDATION_ERROR, {
      providedRule: options.rule,
      validRules: Object.keys(SECURITY_RULES),
    });
  }

  // 验证格式
  const validFormats = ['json', 'sarif', 'table', 'markdown'];
  if (options.format && !validFormats.includes(options.format)) {
    throw new SecurityCheckError(
      `无效的格式: ${options.format}。有效格式: ${validFormats.join(', ')}`,
      ERROR_CODES.VALIDATION_ERROR,
      { providedFormat: options.format, validFormats },
    );
  }

  // 验证失败阈值
  const validFailOn = ['low', 'medium', 'high', 'critical'];
  if (options.failOn && !validFailOn.includes(options.failOn)) {
    throw new SecurityCheckError(
      `无效的失败阈值: ${options.failOn}。有效阈值: ${validFailOn.join(', ')}`,
      ERROR_CODES.VALIDATION_ERROR,
      { providedFailOn: options.failOn, validFailOn },
    );
  }
}

/**
 * 设置超时处理
 * @param {number} timeout - 超时时间（毫秒）
 * @param {Function} callback - 回调函数
 * @returns {Promise} 带超时的Promise
 */
function withTimeout(timeout, callback) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new SecurityCheckError(`操作超时 (${timeout}ms)`, ERROR_CODES.TIMEOUT_ERROR, { timeout }),
      );
    }, timeout);

    callback()
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * 主函数
 * @param {Object} options - 选项对象
 */
async function runSecurityChecksMain(options = {}) {
  try {
    // 验证选项
    validateOptions(options);

    // 设置默认超时时间（5分钟）
    const timeout = options.timeout || 5 * 60 * 1000;

    // 运行安全检查（带超时）
    const checkResult = await withTimeout(timeout, async () => {
      return await runSecurityChecks(options);
    });

    // 生成输出
    try {
      generateOutput(checkResult, options);
    } catch (outputError) {
      throw new SecurityCheckError(
        `生成输出失败: ${outputError.message}`,
        ERROR_CODES.OUTPUT_GENERATION_ERROR,
        { originalError: outputError, outputPath: options.output },
      );
    }

    // 确保文件写入完成
    if (options.output) {
      try {
        const fs = require('fs');
        fs.fsyncSync(fs.openSync(options.output, 'r+'));
      } catch (fileError) {
        throw new SecurityCheckError(
          `文件同步失败: ${fileError.message}`,
          ERROR_CODES.FILE_SYSTEM_ERROR,
          { originalError: fileError, outputPath: options.output },
        );
      }
    }

    // 检查是否应该失败
    const shouldFailResult = shouldFail(checkResult.results, options.failOn);

    if (shouldFailResult) {
      const exitCode = getExitCode(checkResult.results, options.failOn);
      console.log(`安全检查失败，退出代码: ${exitCode}`);
      // 使用setTimeout确保所有异步操作完成
      setTimeout(() => process.exit(exitCode), 100);
    } else {
      console.log('安全检查完成');
    }
  } catch (error) {
    const securityError = handleError(error, options, {
      phase: 'main',
      timestamp: new Date().toISOString(),
    });

    process.exit(1);
  }
}

// 未捕获异常处理
process.on('uncaughtException', error => {
  const securityError = handleError(
    error,
    {},
    {
      phase: 'uncaughtException',
      timestamp: new Date().toISOString(),
    },
  );
  process.exit(1);
});

// 未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  const securityError = handleError(
    error,
    {},
    {
      phase: 'unhandledRejection',
      timestamp: new Date().toISOString(),
      promise: promise.toString(),
    },
  );
  process.exit(1);
});

// 运行检查
if (require.main === module) {
  const options = parseArgs();
  runSecurityChecksMain(options);
}

// 导出模块
module.exports = {
  runSecurityChecks: runSecurityChecksMain,
  SECURITY_RULES,
  SECURITY_CATEGORIES,
  SecurityCheckError,
  ERROR_CODES,
};
