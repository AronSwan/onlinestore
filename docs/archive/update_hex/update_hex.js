#!/usr/bin/env node

/**
 * Pantone颜色HEX值更新工具
 * 
 * 用途：本工具用于批量更新Pantone颜色的HEX值，支持断点续传和失败重试功能。
 * 通过访问Qtccolor网站获取最新的HEX值，并更新到本地JSON文件中。
 * 
 * 主要功能：
 * 1. 批量更新Pantone颜色的HEX值
 * 2. 支持断点续传，中断后可以继续处理
 * 3. 支持失败重试，提高更新成功率
 * 4. 生成更新报告，统计更新结果
 * 5. 支持命令行参数，灵活控制处理流程
 * 
 * 使用方法：
 * - 更新所有颜色：node update_hex.js update
 * - 显示统计信息：node update_hex.js stats
 * - 重试失败颜色：node update_hex.js retry
 * 
 * 依赖文件：puppeteer, fs, path
 * 
 * 作者：AI Assistant
 * 时间：2025-09-26 16:17:21
 */

// @ts-check
/* eslint-disable */

import { readFileSync, writeFileSync, existsSync, unlinkSync, appendFileSync, readdirSync, statSync, mkdirSync, promises as fsPromises } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';

// TypeScript类型声明
/** @typedef {import('puppeteer-core').Browser} Browser */
/** @typedef {import('puppeteer-core').Page} Page */
/** @typedef {import('puppeteer-core').ElementHandle} ElementHandle */

// 默认统计信息
/**
 * 创建默认的统计信息对象
 * @param {number} totalColors - 总颜色数，默认为0
 * @returns {Object} 包含默认统计信息的对象
 */
function defaultStats(totalColors = 0) {
  return {
    total: totalColors,
    updated: 0,
    failed: 0,
    skipped: 0,
    failedCodes: []
  };
}

// 配置常量
const CONFIG = {
  // 浏览器配置
  BROWSER: {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--disable-infobars',
      '--disable-web-security'
    ]
  },
  
  // 页面配置
  PAGE: {
    defaultTimeout: 60000,
    defaultNavigationTimeout: 60000,
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  },
  
  // 重试配置
  RETRY: {
    maxRetries: 3,
    retryDelay: 5000,
    maxBrowserRetries: 3
  },
  
  // 并发配置
  CONCURRENCY: {
    maxConcurrentBrowsers: 3,
    maxConcurrentPages: 5,
    requestDelay: 2000
  },
  
  // 文件路径
  FILES: {
    checkpoint: 'update_hex_checkpoint.json',
    report: 'pantone_hex_update_report.md'
  }
};

// 获取当前文件路径
const __filename = process.argv[1];
const __dirname = dirname(__filename);

// 日志文件路径
const logFilePath = join(__dirname, 'update_hex.log');

// 日志系统 - 终端只显示必要信息，详细信息写入日志文件
// 定义哪些级别的日志应该在终端显示
const terminalVisibleLevels = ['ERROR', 'WARN', 'SUCCESS'];
// 定义哪些消息关键字应该在终端显示（即使级别是INFO）
const terminalVisibleKeywords = ['开始', '完成', '成功', '失败', '错误', '警告', '✅', '❌', '⚠️'];

// 日志级别枚举
const LogLevel = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

// 当前日志级别
const currentLogLevel = LogLevel.INFO;

/**
 * 结构化日志记录
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 * @param {Object} data - 附加数据
 */
function structuredLog(level, message, data = {}) {
  // 检查日志级别
  const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
  if (levels.indexOf(level) > levels.indexOf(currentLogLevel)) {
    return;
  }
  
  // 创建日志条目
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level,
    message: message,
    data: data
  };
  
  // 判断是否应该在终端显示
  let showInTerminal = terminalVisibleLevels.includes(level);
  
  // 如果级别是INFO，检查消息中是否包含关键字
  if (!showInTerminal && level === 'INFO') {
    showInTerminal = terminalVisibleKeywords.some(keyword => message.includes(keyword));
  }
  
  // 输出到控制台（仅必要信息）
  const logMessage = `[${logEntry.timestamp}] [${level}] ${message}`;
  if (showInTerminal) {
    if (level === LogLevel.ERROR) {
      console.error(logMessage, data);
    } else if (level === LogLevel.WARN) {
      console.warn(logMessage, data);
    } else {
      console.log(logMessage, data);
    }
  }
  
  // 写入日志文件（所有信息都写入）
  try {
    const logLine = JSON.stringify(logEntry) + '\n';
    appendFileSync('./update_hex.log', logLine, 'utf8');
  } catch (error) {
    console.error('写入日志文件失败:', error);
  }
}

/**
 * 记录错误日志
 * @param {string} message - 错误消息
 * @param {Error|null} error - 错误对象
 */
function logError(message, error = null) {
  const errorData = error ? {
    name: error.name,
    message: error.message,
    stack: error.stack
  } : {};
  
  structuredLog(LogLevel.ERROR, message, errorData);
}

/**
 * 记录警告日志
 * @param {string} message - 警告消息
 * @param {Object} data - 附加数据
 */
function logWarning(message, data = {}) {
  structuredLog(LogLevel.WARN, message, data);
}

/**
 * 记录信息日志
 * @param {string} message - 信息消息
 * @param {Object} data - 附加数据
 */
function logInfo(message, data = {}) {
  structuredLog(LogLevel.INFO, message, data);
}

/**
 * 记录调试日志
 * @param {string} message - 调试消息
 * @param {Object} data - 附加数据
 */
function logDebug(message, data = {}) {
  structuredLog(LogLevel.DEBUG, message, data);
}

/**
 * 日志记录系统 - 提供统一的日志记录功能
 * 支持多级别日志记录，包括控制台输出和文件写入
 * @param {string} message - 日志消息
 * @param {string} level - 日志级别 (INFO, WARN, ERROR, DEBUG)
 */
function log(message, level = 'INFO') {
  switch (level) {
    case 'ERROR':
      logError(message);
      break;
    case 'WARN':
      logWarning(message);
      break;
    case 'DEBUG':
      logDebug(message);
      break;
    default:
      logInfo(message);
  }
}

// 全局错误分类处理机制
/**
 * 错误类型枚举
 * 用于分类处理不同类型的错误，提供针对性的恢复策略
 */
const ErrorType = {
  // 网络相关错误
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  
  // 浏览器相关错误
  BROWSER_CRASH: 'BROWSER_CRASH',
  PAGE_CRASH: 'PAGE_CRASH',
  ELEMENT_NOT_FOUND: 'ELEMENT_NOT_FOUND',
  
  // 数据相关错误
  DATA_PARSE_ERROR: 'DATA_PARSE_ERROR',
  DATA_VALIDATION_ERROR: 'DATA_VALIDATION_ERROR',
  DATA_INTEGRITY_ERROR: 'DATA_INTEGRITY_ERROR',
  
  // 文件系统错误
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_PERMISSION_ERROR: 'FILE_PERMISSION_ERROR',
  FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',
  
  // 配置错误
  CONFIG_ERROR: 'CONFIG_ERROR',
  PARAMETER_ERROR: 'PARAMETER_ERROR',
  
  // 未知错误
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * 错误分类器
 * 根据错误特征将错误分类到不同的类型
 * @param {Error} error - 错误对象
 * @param {string} context - 错误发生的上下文
 * @returns {string} 错误类型
 */
function classifyError(error, context = '') {
  if (!error || !(error instanceof Error)) {
    return ErrorType.UNKNOWN_ERROR;
  }
  
  const errorMessage = error.message || '';
  const errorName = error.name || '';
  
  // 网络相关错误
  if (errorMessage.includes('ENOTFOUND') || 
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ECONNRESET') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('network error')) {
    return ErrorType.NETWORK_ERROR;
  }
  
  // 超时错误
  if (errorMessage.includes('timeout') || 
      errorMessage.includes('TimeoutError') ||
      errorName === 'TimeoutError') {
    return ErrorType.TIMEOUT_ERROR;
  }
  
  // 浏览器崩溃错误
  if (errorMessage.includes('Browser closed') ||
      errorMessage.includes('Browser disconnected') ||
      errorMessage.includes('Session closed') ||
      errorMessage.includes('Target closed')) {
    return ErrorType.BROWSER_CRASH;
  }
  
  // 页面崩溃错误
  if (errorMessage.includes('Page crashed') ||
      errorMessage.includes('Inspected target navigated or closed')) {
    return ErrorType.PAGE_CRASH;
  }
  
  // 元素未找到错误
  if (errorMessage.includes('failed to find element') ||
      errorMessage.includes('node is either not visible or not an HTMLElement') ||
      errorMessage.includes('Cannot find context with specified id')) {
    return ErrorType.ELEMENT_NOT_FOUND;
  }
  
  // 数据解析错误
  if (errorMessage.includes('Unexpected token') ||
      errorMessage.includes('JSON.parse') ||
      errorMessage.includes('SyntaxError') ||
      context.includes('parse')) {
    return ErrorType.DATA_PARSE_ERROR;
  }
  
  // 数据验证错误
  if (errorMessage.includes('validation') ||
      errorMessage.includes('invalid') ||
      context.includes('validate')) {
    return ErrorType.DATA_VALIDATION_ERROR;
  }
  
  // 文件未找到错误
  if (errorMessage.includes('ENOENT') ||
      errorMessage.includes('no such file') ||
      errorMessage.includes('file not found')) {
    return ErrorType.FILE_NOT_FOUND;
  }
  
  // 文件权限错误
  if (errorMessage.includes('EACCES') ||
      errorMessage.includes('permission denied')) {
    return ErrorType.FILE_PERMISSION_ERROR;
  }
  
  // 配置错误
  if (errorMessage.includes('configuration') ||
      errorMessage.includes('config') ||
      context.includes('config')) {
    return ErrorType.CONFIG_ERROR;
  }
  
  // 参数错误
  if (errorMessage.includes('parameter') ||
      errorMessage.includes('argument') ||
      errorMessage.includes('must be') ||
      context.includes('parameter')) {
    return ErrorType.PARAMETER_ERROR;
  }
  
  // 默认为未知错误
  return ErrorType.UNKNOWN_ERROR;
}

/**
 * 错误处理器映射
 * 根据错误类型提供相应的处理策略
 */
const errorHandlers = {
  /**
   * 处理网络错误
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   * @returns {Object} 处理结果
   */
  [ErrorType.NETWORK_ERROR]: (error, context = {}) => {
    logError('网络错误发生', error);
    
    // 网络错误通常可以通过重试解决
    return {
      shouldRetry: true,
      retryDelay: CONFIG.RETRY.retryDelay * 2, // 网络错误等待更长时间
      message: '网络连接问题，将稍后重试',
      action: 'wait_and_retry'
    };
  },
  
  /**
   * 处理超时错误
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   * @returns {Object} 处理结果
   */
  [ErrorType.TIMEOUT_ERROR]: (error, context = {}) => {
    logError('操作超时', error);
    
    // 超时错误可以重试，但可能需要调整超时时间
    return {
      shouldRetry: true,
      retryDelay: CONFIG.RETRY.retryDelay,
      message: '操作超时，将重试',
      action: 'retry_with_longer_timeout',
      timeoutMultiplier: context.timeoutMultiplier || 1.5
    };
  },
  
  /**
   * 处理浏览器崩溃错误
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   * @returns {Object} 处理结果
   */
  [ErrorType.BROWSER_CRASH]: (error, context = {}) => {
    logError('浏览器崩溃', error);
    
    // 浏览器崩溃需要重新创建浏览器实例
    return {
      shouldRetry: true,
      retryDelay: CONFIG.RETRY.retryDelay,
      message: '浏览器实例崩溃，将重新创建',
      action: 'recreate_browser',
      browserPool: context.browserPool
    };
  },
  
  /**
   * 处理页面崩溃错误
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   * @returns {Object} 处理结果
   */
  [ErrorType.PAGE_CRASH]: (error, context = {}) => {
    logError('页面崩溃', error);
    
    // 页面崩溃需要重新创建页面
    return {
      shouldRetry: true,
      retryDelay: CONFIG.RETRY.retryDelay,
      message: '页面崩溃，将重新创建',
      action: 'recreate_page',
      pageManager: context.pageManager
    };
  },
  
  /**
   * 处理元素未找到错误
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   * @returns {Object} 处理结果
   */
  [ErrorType.ELEMENT_NOT_FOUND]: (error, context = {}) => {
    logError('页面元素未找到', error);
    
    // 元素未找到可能需要等待或跳过
    return {
      shouldRetry: context.shouldRetry !== false, // 默认可以重试
      retryDelay: CONFIG.RETRY.retryDelay,
      message: '页面元素未找到，将重试或跳过',
      action: 'wait_and_retry_or_skip',
      maxRetries: 2 // 元素未找到重试次数限制
    };
  },
  
  /**
   * 处理数据解析错误
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   * @returns {Object} 处理结果
   */
  [ErrorType.DATA_PARSE_ERROR]: (error, context = {}) => {
    logError('数据解析错误', error);
    
    // 数据解析错误通常无法通过重试解决
    return {
      shouldRetry: false,
      message: '数据解析失败，无法重试',
      action: 'skip_and_log',
      skipItem: context.skipItem
    };
  },
  
  /**
   * 处理数据验证错误
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   * @returns {Object} 处理结果
   */
  [ErrorType.DATA_VALIDATION_ERROR]: (error, context = {}) => {
    logError('数据验证错误', error);
    
    // 数据验证错误通常无法通过重试解决
    return {
      shouldRetry: false,
      message: '数据验证失败，无法重试',
      action: 'skip_and_log',
      skipItem: context.skipItem
    };
  },
  
  /**
   * 处理文件未找到错误
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   * @returns {Object} 处理结果
   */
  [ErrorType.FILE_NOT_FOUND]: (error, context = {}) => {
    logError('文件未找到', error);
    
    // 文件未找到错误通常无法通过重试解决
    return {
      shouldRetry: false,
      message: '文件未找到，无法重试',
      action: 'terminate_or_skip',
      terminate: context.terminate !== false // 默认终止程序
    };
  },
  
  /**
   * 处理文件权限错误
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   * @returns {Object} 处理结果
   */
  [ErrorType.FILE_PERMISSION_ERROR]: (error, context = {}) => {
    logError('文件权限错误', error);
    
    // 文件权限错误通常无法通过重试解决
    return {
      shouldRetry: false,
      message: '文件权限不足，无法重试',
      action: 'terminate',
      terminate: true
    };
  },
  
  /**
   * 处理配置错误
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   * @returns {Object} 处理结果
   */
  [ErrorType.CONFIG_ERROR]: (error, context = {}) => {
    logError('配置错误', error);
    
    // 配置错误通常无法通过重试解决
    return {
      shouldRetry: false,
      message: '配置错误，无法重试',
      action: 'terminate',
      terminate: true
    };
  },
  
  /**
   * 处理参数错误
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   * @returns {Object} 处理结果
   */
  [ErrorType.PARAMETER_ERROR]: (error, context = {}) => {
    logError('参数错误', error);
    
    // 参数错误通常无法通过重试解决
    return {
      shouldRetry: false,
      message: '参数错误，无法重试',
      action: 'terminate',
      terminate: true
    };
  },
  
  /**
   * 处理未知错误
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   * @returns {Object} 处理结果
   */
  [ErrorType.UNKNOWN_ERROR]: (error, context = {}) => {
    logError('未知错误', error);
    
    // 未知错误默认可以重试一次
    return {
      shouldRetry: true,
      retryDelay: CONFIG.RETRY.retryDelay,
      message: '发生未知错误，将尝试重试',
      action: 'retry_once',
      maxRetries: 1 // 未知错误只重试一次
    };
  }
};

/**
 * 全局错误处理函数
 * 根据错误类型调用相应的处理策略
 * @param {Error} error - 错误对象
 * @param {Object} context - 上下文信息
 * @returns {Object} 处理结果
 */
function handleError(error, context = {}) {
  // 分类错误
  const errorType = classifyError(error, context.context);
  
  // 获取对应的处理器
  const handler = errorHandlers[errorType];
  
  if (handler) {
    // 调用错误处理器
    const result = handler(error, context);
    
    // 添加错误类型信息
    result.errorType = errorType;
    
    return result;
  }
  
  // 如果没有找到对应的处理器，返回默认处理结果
  return {
    shouldRetry: false,
    message: '没有找到对应的错误处理器',
    action: 'terminate',
    terminate: true,
    errorType: ErrorType.UNKNOWN_ERROR
  };
}

/**
 * 检查颜色是否需要更新
 * @param {Object} color - 颜色对象
 * @param {Object} existingColor - 现有颜色对象（可选）
 * @returns {boolean} 是否需要更新
 */
function needsUpdate(color, existingColor = null) {
  // 如果没有现有颜色，需要更新
  if (!existingColor) {
    return true;
  }
  
  // 如果没有HEX值，需要更新
  if (!color.hex || color.hex.trim() === '') {
    return true;
  }
  
  // 如果现有颜色没有HEX值，需要更新
  if (!existingColor.hex || existingColor.hex.trim() === '') {
    return true;
  }
  
  // 如果HEX值不同，需要更新
  if (color.hex !== existingColor.hex) {
    return true;
  }
  
  // 如果没有更新时间，需要更新
  if (!color.lastUpdated) {
    return true;
  }
  
  // 如果超过一定时间未更新（例如30天），需要更新
  if (color.lastUpdated) {
    const lastUpdated = new Date(color.lastUpdated);
    const now = new Date();
    const daysSinceUpdate = (Number(now) - Number(lastUpdated)) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate > 30) {
      return true;
    }
  }
  
  return false;
}

/**
 * 获取需要更新的颜色列表
 * @param {Array} colors - 所有颜色列表
 * @param {Array} existingColors - 现有颜色列表
 * @returns {Array} 需要更新的颜色列表
 */
function getColorsToUpdate(colors, existingColors) {
  // 创建现有颜色的映射，便于快速查找
  const existingColorsMap = new Map();
  for (const color of existingColors) {
    existingColorsMap.set(color.code, color);
  }
  
  // 筛选需要更新的颜色
  const colorsToUpdate = [];
  for (const color of colors) {
    const existingColor = existingColorsMap.get(color.code);
    if (needsUpdate(color, existingColor)) {
      colorsToUpdate.push({
        ...color,
        existingColor: existingColor || null
      });
    }
  }
  
  return colorsToUpdate;
}

/**
 * 性能指标收集器
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      colorsProcessed: 0,
      colorsUpdated: 0,
      colorsFailed: 0,
      averageProcessingTime: 0,
      browserInstancesCreated: 0,
      browserInstancesClosed: 0,
      memoryUsage: /** @type {Array<{timestamp: number, rss: number, heapTotal: number, heapUsed: number, external: number}>} */ ([]),
      errorRates: /** @type {Array<{timestamp: number, rate: number}>} */ ([])
    };
    
    // 启动定期监控
    this.startMonitoring();
  }
  
  /**
   * 启动定期监控
   */
  startMonitoring() {
    // 每30秒收集一次性能指标
    this.monitorInterval = setInterval(() => {
      this.collectMetrics();
    }, 30000);
  }
  
  /**
   * 收集性能指标
   */
  collectMetrics() {
    // 收集内存使用情况
    const memoryUsage = process.memoryUsage();
    this.metrics.memoryUsage.push({
      timestamp: Date.now(),
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external
    });
    
    // 保持最近20条记录
    if (this.metrics.memoryUsage.length > 20) {
      this.metrics.memoryUsage.shift();
    }
    
    // 计算错误率
    const totalProcessed = this.metrics.colorsProcessed;
    const totalFailed = this.metrics.colorsFailed;
    const errorRate = totalProcessed > 0 ? totalFailed / totalProcessed : 0;
    
    this.metrics.errorRates.push({
      timestamp: Date.now(),
      rate: errorRate
    });
    
    // 保持最近20条记录
    if (this.metrics.errorRates.length > 20) {
      this.metrics.errorRates.shift();
    }
    
    log(`性能指标: 已处理 ${this.metrics.colorsProcessed} 个颜色，成功率 ${((1 - errorRate) * 100).toFixed(2)}%`);
  }
  
  /**
   * 更新处理统计
   * @param {boolean} success - 是否成功
   * @param {number} processingTime - 处理时间（毫秒）
   */
  updateProcessingStats(success, processingTime) {
    this.metrics.colorsProcessed++;
    
    if (success) {
      this.metrics.colorsUpdated++;
    } else {
      this.metrics.colorsFailed++;
    }
    
    // 更新平均处理时间
    const currentAvg = this.metrics.averageProcessingTime;
    const count = this.metrics.colorsProcessed;
    this.metrics.averageProcessingTime = (currentAvg * (count - 1) + processingTime) / count;
  }
  
  /**
   * 浏览器实例创建
   */
  browserCreated() {
    this.metrics.browserInstancesCreated++;
  }
  
  /**
   * 浏览器实例关闭
   */
  browserClosed() {
    this.metrics.browserInstancesClosed++;
  }
  
  /**
   * 获取性能报告
   * @returns {Object} 性能报告
   */
  getReport() {
    const uptime = Date.now() - this.metrics.startTime;
    const uptimeMinutes = Math.floor(uptime / 60000);
    
    const latestMemory = /** @type {{rss: number, heapTotal: number, heapUsed: number, external: number}} */ (this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] || { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 });
    const latestErrorRate = /** @type {{rate: number}} */ (this.metrics.errorRates[this.metrics.errorRates.length - 1] || { rate: 0 });
    
    return {
      uptime: `${uptimeMinutes} 分钟`,
      colorsProcessed: this.metrics.colorsProcessed,
      colorsUpdated: this.metrics.colorsUpdated,
      colorsFailed: this.metrics.colorsFailed,
      successRate: this.metrics.colorsProcessed > 0 ? 
        ((this.metrics.colorsUpdated / this.metrics.colorsProcessed) * 100).toFixed(2) + '%' : '0%',
      averageProcessingTime: `${this.metrics.averageProcessingTime.toFixed(2)} 毫秒`,
      browserInstances: {
        created: this.metrics.browserInstancesCreated,
        closed: this.metrics.browserInstancesClosed,
        active: this.metrics.browserInstancesCreated - this.metrics.browserInstancesClosed
      },
      memoryUsage: {
        rss: `${(latestMemory.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(latestMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(latestMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`
      },
      currentErrorRate: `${(latestErrorRate.rate * 100).toFixed(2)}%`
    };
  }
  
  /**
   * 停止监控
   */
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }
}

// 创建全局性能监控实例
const performanceMonitor = new PerformanceMonitor();

// 全局错误恢复机制
/**
 * 错误恢复策略枚举
 * 定义不同的错误恢复策略
 */
const RecoveryStrategy = {
  // 立即重试
  RETRY_IMMEDIATELY: 'RETRY_IMMEDIATELY',
  
  // 延迟重试
  RETRY_WITH_DELAY: 'RETRY_WITH_DELAY',
  
  // 指数退避重试
  RETRY_WITH_EXPONENTIAL_BACKOFF: 'RETRY_WITH_EXPONENTIAL_BACKOFF',
  
  // 重新创建资源
  RECREATE_RESOURCE: 'RECREATE_RESOURCE',
  
  // 跳过当前操作
  SKIP_CURRENT: 'SKIP_CURRENT',
  
  // 回退到安全状态
  FALLBACK_TO_SAFE_STATE: 'FALLBACK_TO_SAFE_STATE',
  
  // 终止程序
  TERMINATE: 'TERMINATE'
};

/**
 * 错误恢复管理器
 * 管理错误恢复策略和执行恢复操作
 */
class ErrorRecoveryManager {
  constructor() {
    this.recoveryAttempts = new Map(); // 记录错误恢复尝试次数
    this.recoveryStats = {
      totalErrors: 0,
      recoveredErrors: 0,
      unrecoveredErrors: 0,
      recoveryStrategiesUsed: {}
    };
  }
  
  /**
   * 执行错误恢复
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   * @param {Function} operation - 需要重试的操作
   * @returns {Promise<any>} 恢复结果
   */
  async recover(error, context = {}, operation = null) {
    // 获取错误处理结果
    const errorResult = handleError(error, context);
    
    // 更新错误统计
    this.recoveryStats.totalErrors++;
    
    // 记录错误恢复尝试
    const errorKey = this.getErrorKey(error, context);
    const attempts = this.recoveryAttempts.get(errorKey) || 0;
    this.recoveryAttempts.set(errorKey, attempts + 1);
    
    // 记录使用的恢复策略
    const strategy = this.determineRecoveryStrategy(errorResult, attempts);
    this.recoveryStats.recoveryStrategiesUsed[strategy] = 
      (this.recoveryStats.recoveryStrategiesUsed[strategy] || 0) + 1;
    
    log(`尝试恢复错误: ${errorResult.message}, 策略: ${strategy}, 尝试次数: ${attempts + 1}`);
    
    // 执行恢复策略
    try {
      const result = await this.executeRecoveryStrategy(strategy, errorResult, context, operation);
      
      // 恢复成功
      this.recoveryStats.recoveredErrors++;
      log(`错误恢复成功: ${errorResult.message}`);
      
      return result;
    } catch (recoveryError) {
      // 恢复失败
      this.recoveryStats.unrecoveredErrors++;
      logError(`错误恢复失败: ${recoveryError.message}`, recoveryError);
      
      // 如果恢复失败，尝试降级策略
      if (strategy !== RecoveryStrategy.TERMINATE) {
        log('尝试降级恢复策略...');
        return await this.fallbackRecovery(errorResult, context, operation);
      }
      
      // 如果已经是终止策略，抛出错误
      throw recoveryError;
    }
  }
  
  /**
   * 获取错误唯一标识
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   * @returns {string} 错误唯一标识
   */
  getErrorKey(error, context) {
    const errorType = classifyError(error, context.context);
    const location = context.location || 'unknown';
    return `${errorType}:${location}`;
  }
  
  /**
   * 确定恢复策略
   * @param {Object} errorResult - 错误处理结果
   * @param {number} attempts - 已尝试次数
   * @returns {string} 恢复策略
   */
  determineRecoveryStrategy(errorResult, attempts) {
    // 如果错误处理结果中指定了策略，使用指定策略
    if (errorResult.action) {
      switch (errorResult.action) {
        case 'wait_and_retry':
          return attempts < 3 ? RecoveryStrategy.RETRY_WITH_DELAY : RecoveryStrategy.TERMINATE;
        case 'retry_with_longer_timeout':
          return attempts < 2 ? RecoveryStrategy.RETRY_WITH_DELAY : RecoveryStrategy.TERMINATE;
        case 'recreate_browser':
          return RecoveryStrategy.RECREATE_RESOURCE;
        case 'recreate_page':
          return RecoveryStrategy.RECREATE_RESOURCE;
        case 'wait_and_retry_or_skip':
          return attempts < 2 ? RecoveryStrategy.RETRY_WITH_DELAY : RecoveryStrategy.SKIP_CURRENT;
        case 'skip_and_log':
          return RecoveryStrategy.SKIP_CURRENT;
        case 'terminate_or_skip':
          return errorResult.terminate ? RecoveryStrategy.TERMINATE : RecoveryStrategy.SKIP_CURRENT;
        case 'terminate':
          return RecoveryStrategy.TERMINATE;
        case 'retry_once':
          return attempts < 1 ? RecoveryStrategy.RETRY_IMMEDIATELY : RecoveryStrategy.TERMINATE;
      }
    }
    
    // 默认策略：指数退避重试
    return attempts < 3 ? RecoveryStrategy.RETRY_WITH_EXPONENTIAL_BACKOFF : RecoveryStrategy.TERMINATE;
  }
  
  /**
   * 执行恢复策略
   * @param {string} strategy - 恢复策略
   * @param {Object} errorResult - 错误处理结果
   * @param {Object} context - 上下文信息
   * @param {Function} operation - 需要重试的操作
   * @returns {Promise<any>} 恢复结果
   */
  async executeRecoveryStrategy(strategy, errorResult, context, operation) {
    switch (strategy) {
      case RecoveryStrategy.RETRY_IMMEDIATELY:
        return await this.retryImmediately(operation, context);
        
      case RecoveryStrategy.RETRY_WITH_DELAY:
        return await this.retryWithDelay(operation, context, errorResult.retryDelay || CONFIG.RETRY.retryDelay);
        
      case RecoveryStrategy.RETRY_WITH_EXPONENTIAL_BACKOFF:
        return await this.retryWithExponentialBackoff(operation, context);
        
      case RecoveryStrategy.RECREATE_RESOURCE:
        return await this.recreateResource(errorResult, context, operation);
        
      case RecoveryStrategy.SKIP_CURRENT:
        return await this.skipCurrent(errorResult, context);
        
      case RecoveryStrategy.FALLBACK_TO_SAFE_STATE:
        return await this.fallbackToSafeState(errorResult, context);
        
      case RecoveryStrategy.TERMINATE:
        return await this.terminate(errorResult, context);
        
      default:
        throw new Error(`未知的恢复策略: ${strategy}`);
    }
  }
  
  /**
   * 立即重试
   * @param {Function} operation - 需要重试的操作
   * @param {Object} context - 上下文信息
   * @returns {Promise<any>} 重试结果
   */
  async retryImmediately(operation, context) {
    if (!operation) {
      throw new Error('没有提供可重试的操作');
    }
    
    return await operation(context);
  }
  
  /**
   * 延迟重试
   * @param {Function} operation - 需要重试的操作
   * @param {Object} context - 上下文信息
   * @param {number} delay - 延迟时间（毫秒）
   * @returns {Promise<any>} 重试结果
   */
  async retryWithDelay(operation, context, delay) {
    if (!operation) {
      throw new Error('没有提供可重试的操作');
    }
    
    // 等待指定时间
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return await operation(context);
  }
  
  /**
   * 指数退避重试
   * @param {Function} operation - 需要重试的操作
   * @param {Object} context - 上下文信息
   * @returns {Promise<any>} 重试结果
   */
  async retryWithExponentialBackoff(operation, context) {
    if (!operation) {
      throw new Error('没有提供可重试的操作');
    }
    
    const errorKey = this.getErrorKey(new Error('Exponential backoff'), context);
    const attempts = this.recoveryAttempts.get(errorKey) || 0;
    
    // 计算退避时间：baseDelay * 2^attempt
    const baseDelay = CONFIG.RETRY.retryDelay;
    const delay = Math.min(baseDelay * Math.pow(2, attempts), CONFIG.RETRY.maxRetryDelay);
    
    log(`指数退避重试，等待 ${delay} 毫秒`);
    
    // 等待计算出的时间
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return await operation(context);
  }
  
  /**
   * 重新创建资源
   * @param {Object} errorResult - 错误处理结果
   * @param {Object} context - 上下文信息
   * @param {Function} operation - 需要重试的操作
   * @returns {Promise<any>} 重试结果
   */
  async recreateResource(errorResult, context, operation) {
    // 根据错误类型重新创建资源
    switch (errorResult.errorType) {
      case ErrorType.BROWSER_CRASH:
        if (context.browserPool) {
          // 重新创建浏览器实例
          log('重新创建浏览器实例');
          await context.browserPool.forceCloseAll();
          await context.browserPool.initialize();
        }
        break;
        
      case ErrorType.PAGE_CRASH:
        if (context.pageManager) {
          // 重新创建页面
          log('重新创建页面');
          // 这里应该有页面重新创建的逻辑
        }
        break;
        
      default:
        log('无法识别需要重新创建的资源类型');
    }
    
    // 重新执行操作
    if (operation) {
      return await operation(context);
    }
    
    return { success: true, message: '资源重新创建成功' };
  }
  
  /**
   * 跳过当前操作
   * @param {Object} errorResult - 错误处理结果
   * @param {Object} context - 上下文信息
   * @returns {Promise<Object>} 跳过结果
   */
  async skipCurrent(errorResult, context) {
    log(`跳过当前操作: ${errorResult.message}`);
    
    // 如果有需要跳过的项目，记录下来
    if (errorResult.skipItem && context.skipCallback) {
      await context.skipCallback(errorResult.skipItem);
    }
    
    return { success: false, skipped: true, message: '已跳过当前操作' };
  }
  
  /**
   * 回退到安全状态
   * @param {Object} errorResult - 错误处理结果
   * @param {Object} context - 上下文信息
   * @returns {Promise<Object>} 回退结果
   */
  async fallbackToSafeState(errorResult, context) {
    log('回退到安全状态');
    
    // 执行清理操作
    if (context.cleanup) {
      await context.cleanup();
    }
    
    // 保存当前状态
    if (context.saveState) {
      await context.saveState();
    }
    
    return { success: false, fallback: true, message: '已回退到安全状态' };
  }
  
  /**
   * 终止程序
   * @param {Object} errorResult - 错误处理结果
   * @param {Object} context - 上下文信息
   * @returns {Promise<never>} 永不返回
   */
  async terminate(errorResult, context) {
    logError(`终止程序: ${errorResult.message}`);
    
    // 执行清理操作
    if (context.cleanup) {
      await context.cleanup();
    }
    
    // 保存当前状态
    if (context.saveState) {
      await context.saveState();
    }
    
    // 输出错误恢复统计
    this.logRecoveryStats();
    
    // 终止程序
    process.exit(1);
  }
  
  /**
   * 降级恢复
   * @param {Object} errorResult - 错误处理结果
   * @param {Object} context - 上下文信息
   * @param {Function} operation - 需要重试的操作
   * @returns {Promise<any>} 降级恢复结果
   */
  async fallbackRecovery(errorResult, context, operation) {
    log('执行降级恢复策略');
    
    // 尝试跳过当前操作
    try {
      return await this.skipCurrent(errorResult, context);
    } catch (skipError) {
      logError('跳过操作失败', skipError);
    }
    
    // 如果跳过也失败，尝试回退到安全状态
    try {
      return await this.fallbackToSafeState(errorResult, context);
    } catch (fallbackError) {
      logError('回退到安全状态失败', fallbackError);
    }
    
    // 如果所有降级策略都失败，终止程序
    return await this.terminate(errorResult, context);
  }
  
  /**
   * 记录错误恢复统计
   */
  logRecoveryStats() {
    const { totalErrors, recoveredErrors, unrecoveredErrors, recoveryStrategiesUsed } = this.recoveryStats;
    const recoveryRate = totalErrors > 0 ? ((recoveredErrors / totalErrors) * 100).toFixed(2) : 0;
    
    log('===== 错误恢复统计 =====');
    log(`总错误数: ${totalErrors}`);
    log(`已恢复错误数: ${recoveredErrors}`);
    log(`未恢复错误数: ${unrecoveredErrors}`);
    log(`错误恢复率: ${recoveryRate}%`);
    log('使用的恢复策略:');
    
    for (const [strategy, count] of Object.entries(recoveryStrategiesUsed)) {
      log(`  ${strategy}: ${count} 次`);
    }
    
    log('========================');
  }
  
  /**
   * 获取错误恢复统计
   * @returns {Object} 错误恢复统计
   */
  getRecoveryStats() {
    return { ...this.recoveryStats };
  }
  
  /**
   * 重置错误恢复统计
   */
  resetStats() {
    this.recoveryAttempts.clear();
    this.recoveryStats = {
      totalErrors: 0,
      recoveredErrors: 0,
      unrecoveredErrors: 0,
      recoveryStrategiesUsed: {}
    };
  }
}

// 创建全局错误恢复管理器实例
const errorRecoveryManager = new ErrorRecoveryManager();

/**
 * 浏览器连接池管理 - 管理多个浏览器实例以提高并发性能
 * 实现浏览器实例的复用，减少启动开销，提高处理效率
 */
class BrowserPool {
  /**
   * 构造函数
   * @param {Object} options - 浏览器池配置选项
   * @param {number} options.maxBrowsers - 最大浏览器实例数
   * @param {Object} options.browserOptions - 浏览器启动选项
   */
  constructor(options = { maxBrowsers: 3, browserOptions: {} }) {
    const { maxBrowsers = 3, browserOptions = {} } = options;
    this.maxBrowsers = maxBrowsers;
    this.browserOptions = { ...CONFIG.BROWSER, ...browserOptions };
    this.browsers = [];
    this.availableBrowsers = [];
    this.busyBrowsers = new Set();
    
    // 浏览器实例复用计数
    this.usageCount = new Map();
    this.maxUsageCount = 10; // 每个浏览器实例最大使用次数
    
    // 健康检查定时器
    this.healthCheckInterval = null;
    
    // 资源清理相关
    this.resourceId = `browser-pool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.isRegistered = false;
    
    this.initPromise = this.initialize();
  }

  /**
   * 初始化浏览器池
   * 创建指定数量的浏览器实例并加入连接池
   * @returns {Promise<void>}
   */
  async initialize() {
    log(`正在初始化浏览器池，最大实例数: ${this.maxBrowsers}`);
    
    // 注册到全局资源清理系统
    this.registerForCleanup();
    
    try {
      for (let i = 0; i < this.maxBrowsers; i++) {
        const browser = await this.createBrowser();
        this.browsers.push(browser);
        this.availableBrowsers.push(browser);
        log(`✅ 浏览器实例 ${i + 1}/${this.maxBrowsers} 启动成功`);
      }
      log('✅ 浏览器池初始化完成');
    } catch (error) {
      logError('❌ 浏览器池初始化失败', error);
      throw error;
    }
  }

  /**
   * 注册到全局资源清理系统
   */
  registerForCleanup() {
    if (this.isRegistered) {
      return;
    }
    
    try {
      // 注册浏览器池资源
      resourceCleaner.registerResource(
        this.resourceId,
        ResourceType.BROWSER_POOL,
        this,
        (browserPool) => this.cleanupResources(),
        {
          priority: 10, // 高优先级，浏览器资源需要优先清理
          timeout: 10000, // 10秒超时
          retryCount: 2 // 最多重试2次
        }
      );
      
      this.isRegistered = true;
      log(`浏览器池已注册到全局资源清理系统，ID: ${this.resourceId}`);
    } catch (error) {
      logError('注册浏览器池到资源清理系统失败', error);
    }
  }

  /**
   * 从全局资源清理系统注销
   */
  unregisterFromCleanup() {
    if (!this.isRegistered) {
      return;
    }
    
    try {
      resourceCleaner.unregisterResource(this.resourceId);
      this.isRegistered = false;
      log(`浏览器池已从全局资源清理系统注销，ID: ${this.resourceId}`);
    } catch (error) {
      logError('从资源清理系统注销浏览器池失败', error);
    }
  }

  /**
   * 清理所有资源
   * 由全局资源清理系统调用
   * @returns {Promise<void>}
   */
  async cleanupResources() {
    log('开始清理浏览器池资源...');
    
    try {
      // 停止健康检查
      this.stopHealthCheck();
      
      // 强制关闭所有浏览器实例
      this.forceCloseAll();
      
      // 清理内部状态
      this.browsers = [];
      this.availableBrowsers = [];
      this.busyBrowsers.clear();
      this.usageCount.clear();
      
      log('✅ 浏览器池资源清理完成');
    } catch (error) {
      logError('清理浏览器池资源时出错', error);
      throw error;
    }
  }

  /**
   * 创建单个浏览器实例
   * 包含重试机制，确保浏览器启动成功
   * @returns {Promise<Browser>} 浏览器实例
   */
  async createBrowser() {
    let retryCount = 0;
    const maxRetries = CONFIG.RETRY.maxBrowserRetries;
    
    while (retryCount < maxRetries) {
      try {
        const browser = await puppeteer.launch(this.browserOptions);
        performanceMonitor.browserCreated(); // 通知性能监控系统
        return browser;
      } catch (error) {
        retryCount++;
        logError(`浏览器启动失败 (尝试 ${retryCount}/${maxRetries}): ${error.message}`, error);
        if (retryCount >= maxRetries) {
          throw new Error(`达到最大重试次数，无法启动浏览器: ${error.message}`);
        }
        log(`等待 ${CONFIG.RETRY.retryDelay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY.retryDelay));
      }
    }
  }

  /**
   * 获取浏览器实例，如果连接池中没有可用实例则等待
   * @returns {Promise<Browser>} 浏览器实例
   */
  async getBrowser() {
    return await this.acquireBrowser();
  }

  /**
   * 获取可用的浏览器实例
   * 如果没有可用实例，会等待直到有实例被释放
   * @returns {Promise<Browser>} 浏览器实例
   */
  async acquireBrowser() {
    await this.initPromise;
    
    // 等待有可用的浏览器
    while (this.availableBrowsers.length === 0) {
      log('所有浏览器实例都在使用中，等待释放...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const browser = this.availableBrowsers.pop();
    this.busyBrowsers.add(browser);
    
    // 更新使用计数
    const count = this.usageCount.get(browser) || 0;
    this.usageCount.set(browser, count + 1);
    
    log(`从池中获取浏览器实例，当前使用次数: ${count + 1}`);
    return browser;
  }

  /**
   * 释放浏览器实例回连接池
   * 将使用完毕的浏览器实例标记为可用状态
   */
  releaseBrowser(browser) {
    // 检查浏览器实例使用次数
    const usageCount = this.usageCount.get(browser) || 0;
    
    // 如果使用次数超过阈值，关闭浏览器实例
    if (usageCount >= this.maxUsageCount) {
      log(`浏览器实例使用次数达到上限 (${usageCount})，正在关闭...`);
      this.busyBrowsers.delete(browser);
      this.usageCount.delete(browser);
      
      try {
        browser.close();
        performanceMonitor.browserClosed();
        log('浏览器实例已关闭');
      } catch (error) {
        logError('关闭浏览器实例时出错: ' + error.message, error);
      }
      
      return;
    }
    
    // 原有代码继续...
    if (this.busyBrowsers.has(browser)) {
      this.busyBrowsers.delete(browser);
      this.availableBrowsers.push(browser);
      log(`浏览器实例已释放回池中，当前使用次数: ${usageCount}`);
    }
  }

  /**
   * 关闭所有浏览器实例
   * 清理资源，确保所有浏览器实例正确关闭
   * @returns {Promise<void>}
   */
  async closeAll() {
    log('正在关闭所有浏览器实例...');
    const closePromises = this.browsers.map(browser => 
      browser.close().catch(error => logError('关闭浏览器失败', error))
    );
    await Promise.all(closePromises);
    this.browsers = [];
    this.availableBrowsers = [];
    this.busyBrowsers.clear();
    this.usageCount.clear();
    
    // 从资源清理系统注销
    this.unregisterFromCleanup();
    
    log('✅ 所有浏览器实例已关闭');
  }

  /**
   * 强制关闭所有浏览器实例，不等待 Promise 完成
   * 用于紧急情况下的快速资源清理
   */
  forceCloseAll() {
    log('正在强制关闭所有浏览器实例...');
    for (const browser of this.browsers) {
      try {
        browser.process().kill('SIGKILL');
        performanceMonitor.browserClosed();
      } catch (error) {
        logError('强制关闭浏览器失败: ' + error.message, error);
      }
    }
    this.browsers = [];
    this.availableBrowsers = [];
    this.busyBrowsers.clear();
    this.usageCount.clear();
    
    // 从资源清理系统注销
    this.unregisterFromCleanup();
    
    log('✅ 所有浏览器实例已强制关闭');
  }

  /**
   * 获取资源状态信息
   * 用于全局资源清理系统监控资源状态
   * @returns {Object} 资源状态信息
   */
  getResourceStatus() {
    return {
      id: this.resourceId,
      type: ResourceType.BROWSER_POOL,
      isRegistered: this.isRegistered,
      totalBrowsers: this.browsers.length,
      availableBrowsers: this.availableBrowsers.length,
      busyBrowsers: this.busyBrowsers.size,
      maxBrowsers: this.maxBrowsers,
      healthCheckRunning: this.healthCheckInterval !== null,
      usageStats: Array.from(this.usageCount.entries()).map(([browser, count]) => ({
        browserId: browser.process().pid,
        usageCount: count,
        isMaxUsage: count >= this.maxUsageCount
      }))
    };
  }

  /**
   * 停止健康检查
   * 清理健康检查相关的定时器和资源
   */
  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      log('浏览器池健康检查已停止');
    }
  }

  /**
   * 启动健康检查机制
   * 定期检查浏览器实例的健康状态，发现问题及时处理
   * @returns {void}
   */
  startHealthCheck() {
    // 每60秒检查一次浏览器实例的健康状态
    this.healthCheckInterval = setInterval(async () => {
      log('正在执行浏览器池健康检查...');
      
      // 检查所有浏览器实例
      for (let i = this.browsers.length - 1; i >= 0; i--) {
        const browser = this.browsers[i];
        
        try {
          // 检查浏览器进程是否仍在运行
          const process = browser.process();
          if (!process || process.killed) {
            log(`浏览器实例 ${i} 进程已异常终止，正在移除...`);
            
            // 从池中移除
            this.browsers.splice(i, 1);
            const availableIndex = this.availableBrowsers.indexOf(browser);
            if (availableIndex !== -1) {
              this.availableBrowsers.splice(availableIndex, 1);
            }
            this.busyBrowsers.delete(browser);
            this.usageCount.delete(browser);
            
            // 创建新的浏览器实例替换
            try {
              const newBrowser = await this.createBrowser();
              this.browsers.push(newBrowser);
              this.availableBrowsers.push(newBrowser);
              log(`✅ 已创建新的浏览器实例替换异常实例`);
            } catch (error) {
              logError('创建替换浏览器实例失败', error);
            }
            
            continue;
          }
          
          // 检查浏览器实例的连接状态
          const pages = await browser.pages().catch(() => []);
          if (pages.length === 0) {
            log(`浏览器实例 ${i} 没有可用页面，可能已断开连接`);
            
            // 尝试重新连接
            try {
              await browser.newPage();
              log(`✅ 浏览器实例 ${i} 重新连接成功`);
            } catch (error) {
              logError(`浏览器实例 ${i} 重新连接失败，正在关闭...`, error);
              
              // 关闭并移除
              try {
                await browser.close();
                performanceMonitor.browserClosed();
              } catch (closeError) {
                logError('关闭异常浏览器实例失败', closeError);
              }
              
              // 从池中移除
              this.browsers.splice(i, 1);
              const availableIndex = this.availableBrowsers.indexOf(browser);
              if (availableIndex !== -1) {
                this.availableBrowsers.splice(availableIndex, 1);
              }
              this.busyBrowsers.delete(browser);
              this.usageCount.delete(browser);
              
              // 创建新的浏览器实例替换
              try {
                const newBrowser = await this.createBrowser();
                this.browsers.push(newBrowser);
                this.availableBrowsers.push(newBrowser);
                log(`✅ 已创建新的浏览器实例替换异常实例`);
              } catch (createError) {
                logError('创建替换浏览器实例失败', createError);
              }
            }
          }
        } catch (error) {
          logError(`检查浏览器实例 ${i} 健康状态时出错`, error);
        }
      }
      
      log(`✅ 浏览器池健康检查完成，当前实例数: ${this.browsers.length}`);
    }, 60000); // 每60秒检查一次
    
    log('✅ 浏览器池健康检查已启动');
  }
}

// 断点续传状态文件路径 - 统一使用CONFIG配置
const checkpointFilePath = join(__dirname, CONFIG.FILES.checkpoint);

// 读取color_sheets.js文件
const colorSheetsPath = join(__dirname, 'color_sheets.js');
let colorSheetsContent = readFileSync(colorSheetsPath, 'utf8');

// 解析颜色数据
const colorSheetsMatch = colorSheetsContent.match(/const colorSheets = {[\s\S]+?};/);
if (!colorSheetsMatch) {
  console.error('无法解析color_sheets.js文件中的colorSheets对象');
  process.exit(1);
}

// 更健壮的解析方法
/**
 * 解析color_sheets.js文件中的colorSheets对象
 * 该函数使用多阶段处理方法来确保正确解析复杂的JavaScript对象结构
 * 包括移除注释、标准化键名和值格式、处理特殊字符等步骤
 * @param {string} content - color_sheets.js文件的完整内容
 * @returns {Object} 解析后的colorSheets对象，包含colors数组
 * @throws {Error} 当解析失败时抛出详细错误信息
 */
function parseColorSheets(content) {
  // 输入参数验证
  if (typeof content !== 'string') {
    throw new Error('parseColorSheets函数的content参数必须是字符串类型');
  }
  
  if (!content || content.trim() === '') {
    throw new Error('parseColorSheets函数的content参数不能为空');
  }

  // 1. 提取 colorSheets 对象定义部分
  const match = content.match(/const colorSheets\s*=\s*({[\s\S]*?});/);
  if (!match || !match[1]) {
    throw new Error('无法定位 colorSheets 对象');
  }

  // 2. 分阶段处理内容
  let objStr = match[1]
    // 移除所有注释
    .replace(/\/\/.*?\n/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // 处理键名
    .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
    // 处理字符串值
    .replace(/:[\s]*'([^']+)'/g, ': "$1"')
    .replace(/:[\s]*"([^"]+)"/g, ': "$1"')
    // 修复特殊字符
    .replace(/\\/g, '\\\\')
    // 修复数组和对象末尾的多余逗号
    .replace(/,\s*([\]}])/g, '$1');

  // 3. 尝试解析
  try {
    const result = JSON.parse(objStr);
    if (!result.colors || !Array.isArray(result.colors)) {
      throw new Error('解析成功但colors不是有效数组');
    }
    return result;
  } catch (e) {
    // 4. 更详细的错误报告
    console.error('解析color_sheets.js失败:', e.message);
    const errorContext = objStr.substring(
      Math.max(0, (e.position || 0) - 50),
      Math.min(objStr.length, (e.position || 0) + 50)
    );
    console.log('错误位置上下文:', errorContext);
    console.log('问题行内容:', objStr.split('\n')[e.lineNumber || 0]);
    process.exit(1);
  }
}

const colorSheets = parseColorSheets(colorSheetsMatch[0]);

// 全局资源清理机制
/**
 * 资源类型枚举
 * 定义不同类型的资源，便于分类管理
 */
const ResourceType = {
  // 浏览器相关资源
  BROWSER: 'BROWSER',
  PAGE: 'PAGE',
  BROWSER_POOL: 'BROWSER_POOL',
  
  // 文件相关资源
  FILE_STREAM: 'FILE_STREAM',
  FILE_HANDLE: 'FILE_HANDLE',
  
  // 网络相关资源
  HTTP_REQUEST: 'HTTP_REQUEST',
  WEBSOCKET: 'WEBSOCKET',
  
  // 定时器资源
  TIMEOUT: 'TIMEOUT',
  INTERVAL: 'INTERVAL',
  
  // 事件监听器
  EVENT_LISTENER: 'EVENT_LISTENER',
  
  // 内存资源
  BUFFER: 'BUFFER',
  ARRAY_BUFFER: 'ARRAY_BUFFER',
  
  // 其他资源
  CUSTOM: 'CUSTOM'
};

/**
 * 资源清理管理器
 * 管理应用程序中的所有资源，确保在程序退出或异常情况下正确释放资源
 */
class ResourceCleaner {
  constructor() {
    this.resources = new Map(); // 存储所有注册的资源
    this.cleanupHooks = new Set(); // 存储清理钩子函数
    this.isCleaningUp = false; // 是否正在执行清理
    this.cleanupStats = {
      totalResources: 0,
      cleanedResources: 0,
      failedCleanups: 0,
      cleanupTime: 0
    };
    
    // 注册进程退出事件
    this.registerProcessExitHandlers();
  }
  
  /**
   * 注册进程退出事件处理器
   */
  registerProcessExitHandlers() {
    // 正常退出
    process.on('exit', () => {
      this.performCleanup('exit');
    });
    
    // 捕获未处理的异常
    process.on('uncaughtException', (error) => {
      logError('捕获到未处理的异常', error);
      this.performCleanup('uncaughtException', error).then(() => {
        process.exit(1);
      });
    });
    
    // 捕获未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      logError('捕获到未处理的Promise拒绝', error);
      this.performCleanup('unhandledRejection', error).then(() => {
        process.exit(1);
      });
    });
    
    // 捕获信号
    process.on('SIGINT', () => {
      log('接收到SIGINT信号，正在清理资源...');
      this.performCleanup('SIGINT').then(() => {
        process.exit(0);
      });
    });
    
    process.on('SIGTERM', () => {
      log('接收到SIGTERM信号，正在清理资源...');
      this.performCleanup('SIGTERM').then(() => {
        process.exit(0);
      });
    });
  }
  
  /**
   * 注册资源
   * @param {string} id - 资源唯一标识
   * @param {string} type - 资源类型
   * @param {Object} resource - 资源对象
   * @param {Function} cleanupFn - 清理函数
   * @param {Object} options - 选项
   * @returns {string} 资源ID
   */
  registerResource(id, type, resource, cleanupFn, options = {}) {
    if (!id || typeof id !== 'string') {
      throw new Error('资源ID必须是非空字符串');
    }
    
    if (!type || !Object.values(ResourceType).includes(type)) {
      throw new Error('无效的资源类型');
    }
    
    if (this.resources.has(id)) {
      logWarning(`资源ID已存在，将覆盖: ${id}`);
    }
    
    const resourceInfo = {
      id,
      type,
      resource,
      cleanupFn,
      options: {
        priority: options.priority || 0, // 清理优先级，数字越大优先级越高
        timeout: options.timeout || 5000, // 清理超时时间（毫秒）
        retryCount: options.retryCount || 0, // 清理失败重试次数
        ...options
      },
      registeredAt: Date.now()
    };
    
    this.resources.set(id, resourceInfo);
    this.cleanupStats.totalResources++;
    
    log(`已注册资源: ${id} (类型: ${type})`);
    return id;
  }
  
  /**
   * 注销资源
   * @param {string} id - 资源ID
   * @returns {boolean} 是否成功注销
   */
  unregisterResource(id) {
    if (!this.resources.has(id)) {
      logWarning(`尝试注销不存在的资源: ${id}`);
      return false;
    }
    
    const resourceInfo = this.resources.get(id);
    
    // 如果正在清理，不要注销
    if (this.isCleaningUp) {
      logWarning(`正在执行清理，不能注销资源: ${id}`);
      return false;
    }
    
    // 执行清理
    try {
      if (resourceInfo.cleanupFn) {
        resourceInfo.cleanupFn(resourceInfo.resource);
      }
    } catch (error) {
      logError(`注销资源时出错: ${id}`, error);
    }
    
    this.resources.delete(id);
    log(`已注销资源: ${id}`);
    return true;
  }
  
  /**
   * 注册清理钩子
   * @param {Function} hook - 清理钩子函数
   * @returns {Function} 取消注册函数
   */
  registerCleanupHook(hook) {
    if (typeof hook !== 'function') {
      throw new Error('清理钩子必须是函数');
    }
    
    this.cleanupHooks.add(hook);
    
    // 返回取消注册函数
    return () => {
      this.cleanupHooks.delete(hook);
    };
  }
  
  /**
   * 执行资源清理
   * @param {string} trigger - 触发清理的原因
   * @param {Error} error - 错误对象（如果有）
   * @returns {Promise<void>}
   */
  async performCleanup(trigger, error = null) {
    if (this.isCleaningUp) {
      log('已经在执行清理，跳过');
      return;
    }
    
    this.isCleaningUp = true;
    const startTime = Date.now();
    
    log(`开始执行资源清理，触发原因: ${trigger}`);
    
    if (error) {
      logError('清理原因:', error);
    }
    
    try {
      // 按优先级排序资源
      const sortedResources = Array.from(this.resources.values())
        .sort((a, b) => b.options.priority - a.options.priority);
      
      // 执行清理钩子
      for (const hook of this.cleanupHooks) {
        try {
          await hook(trigger, error);
        } catch (hookError) {
          logError('执行清理钩子时出错', hookError);
        }
      }
      
      // 清理资源
      for (const resourceInfo of sortedResources) {
        await this.cleanupResource(resourceInfo);
      }
      
      // 记录清理统计
      this.cleanupStats.cleanupTime = Date.now() - startTime;
      
      log(`资源清理完成，耗时: ${this.cleanupStats.cleanupTime}ms`);
      this.logCleanupStats();
      
    } catch (cleanupError) {
      logError('执行资源清理时出错', cleanupError);
    } finally {
      this.isCleaningUp = false;
    }
  }
  
  /**
   * 清理单个资源
   * @param {Object} resourceInfo - 资源信息
   * @returns {Promise<void>}
   */
  async cleanupResource(resourceInfo) {
    const { id, type, resource, cleanupFn, options } = resourceInfo;
    
    // 类型断言确保cleanupFn的类型正确
    const cleanupFunction = /** @type {Function|null} */ (cleanupFn);
    
    log(`正在清理资源: ${id} (类型: ${type})`);
    
    let retryCount = 0;
    const maxRetries = options.retryCount;
    
    while (retryCount <= maxRetries) {
      try {
        // 设置超时
        const cleanupPromise = new Promise((resolve, reject) => {
          // 执行清理函数
          const result = cleanupFunction ? cleanupFunction(resource) : Promise.resolve();
          
          // 处理结果
          if (result && typeof result.then === 'function') {
            result.then(resolve).catch(reject);
          } else {
            resolve(result);
          }
        });
        
        // 添加超时
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('清理超时')), options.timeout);
        });
        
        // 等待清理完成或超时
        await Promise.race([cleanupPromise, timeoutPromise]);
        
        // 清理成功
        this.resources.delete(id);
        this.cleanupStats.cleanedResources++;
        log(`✅ 资源清理成功: ${id}`);
        return;
        
      } catch (cleanupError) {
        retryCount++;
        
        if (retryCount > maxRetries) {
          // 清理失败
          this.cleanupStats.failedCleanups++;
          logError(`❌ 资源清理失败: ${id} (重试次数: ${retryCount})`, cleanupError);
          return;
        }
        
        logWarning(`资源清理失败，将重试: ${id} (重试次数: ${retryCount}/${maxRetries})`, cleanupError);
        
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }
  
  /**
   * 获取资源信息
   * @param {string} id - 资源ID
   * @returns {Object|null} 资源信息
   */
  getResourceInfo(id) {
    return this.resources.get(id) || null;
  }
  
  /**
   * 获取所有资源信息
   * @returns {Array} 资源信息数组
   */
  getAllResources() {
    return Array.from(this.resources.values());
  }
  
  /**
   * 按类型获取资源
   * @param {string} type - 资源类型
   * @returns {Array} 资源信息数组
   */
  getResourcesByType(type) {
    return Array.from(this.resources.values()).filter(resource => resource.type === type);
  }
  
  /**
   * 记录清理统计
   */
  logCleanupStats() {
    const { totalResources, cleanedResources, failedCleanups, cleanupTime } = this.cleanupStats;
    const successRate = totalResources > 0 ? ((cleanedResources / totalResources) * 100).toFixed(2) : 0;
    
    log('===== 资源清理统计 =====');
    log(`总资源数: ${totalResources}`);
    log(`已清理资源数: ${cleanedResources}`);
    log(`清理失败资源数: ${failedCleanups}`);
    log(`清理成功率: ${successRate}%`);
    log(`清理耗时: ${cleanupTime}ms`);
    log('========================');
  }
  
  /**
   * 获取清理统计
   * @returns {Object} 清理统计
   */
  getCleanupStats() {
    return { ...this.cleanupStats };
  }
  
  /**
   * 重置清理统计
   */
  resetStats() {
    this.cleanupStats = {
      totalResources: this.resources.size,
      cleanedResources: 0,
      failedCleanups: 0,
      cleanupTime: 0
    };
  }
}

// 创建全局资源清理管理器实例
const resourceCleaner = new ResourceCleaner();

// 读取断点续传状态
/**
 * 从断点文件加载之前的处理状态，支持断点续传功能
 * 该函数会检查断点文件是否存在，并处理旧版本格式的兼容性问题
 * 包括将字符串格式的颜色数据转换为对象格式，清理多余空格等
 * 在加载前会验证文件的完整性，确保数据安全
 * @returns {Promise<Object>} 包含currentIndex、updatedColors和stats的断点状态对象
 */
async function loadCheckpoint() {
  // 验证checkpointFilePath常量是否存在
  if (!checkpointFilePath || typeof checkpointFilePath !== 'string') {
    throw new Error('checkpointFilePath常量未定义或不是字符串类型');
  }
  
  try {
    if (existsSync(checkpointFilePath)) {
      // 验证文件内容是否为有效的JSON
      const fileContent = readFileSync(checkpointFilePath, 'utf8');
      
      // 检查文件是否为空
      if (!fileContent || fileContent.trim() === '') {
        console.log('断点文件为空，将从头开始处理');
        return { 
          currentIndex: 0, 
          updatedColors: [], 
          stats: defaultStats() 
        };
      }
      
      const checkpointData = JSON.parse(fileContent);
      
      // 验证必要字段是否存在
      if (!checkpointData.hasOwnProperty('currentIndex') || 
          !checkpointData.hasOwnProperty('updatedColors') || 
          !checkpointData.hasOwnProperty('stats')) {
        throw new Error('断点文件缺少必要字段');
      }
      
      // 验证数据类型
      if (typeof checkpointData.currentIndex !== 'number' || 
          !Array.isArray(checkpointData.updatedColors) || 
          typeof checkpointData.stats !== 'object') {
        throw new Error('断点文件数据类型不正确');
      }
      
      // 验证currentIndex是否为非负整数
      if (checkpointData.currentIndex < 0) {
        throw new Error('断点文件中的currentIndex不能为负数');
      }
      
      // 检查updatedColors是否为字符串数组（旧格式兼容）
      if (checkpointData.updatedColors && checkpointData.updatedColors.length > 0 && 
          typeof checkpointData.updatedColors[0] === 'string') {
        // 如果是字符串格式，解析为对象并清理
        const parsedColors = checkpointData.updatedColors.map(colorStr => {
          const colorObj = JSON.parse(colorStr);
          
          // 消除颜色名称后的多余空格
          if (colorObj.name && colorObj.name.endsWith(' ')) {
            colorObj.name = colorObj.name.trim();
          }
          
          // 移除不需要的position属性
          if (colorObj.position) {
            delete colorObj.position;
          }
          
          return colorObj;
        });
        checkpointData.updatedColors = parsedColors;
      }
      
      console.log(`从断点继续: 索引 ${checkpointData.currentIndex}`);
      return checkpointData;
    }
  } catch (error) {
    console.error('读取断点文件失败:', error);
  }
  return { 
    currentIndex: 0, 
    updatedColors: [], 
    stats: defaultStats() 
  };
}

// 保存断点续传状态（增强版）
/**
 * 将当前处理状态保存到断点文件，支持增量备份和紧急保存
 * 该函数会同时创建全量备份和增量备份，确保数据安全
 * @param {number} currentIndex - 当前处理的颜色索引
 * @param {Array} updatedColors - 已更新的颜色对象数组
 * @param {Object} stats - 处理统计信息
 * @returns {Promise<void>}
 */
async function saveCheckpoint(currentIndex, updatedColors, stats) {
  // 输入参数验证
  if (typeof currentIndex !== 'number' || currentIndex < 0) {
    throw new Error('saveCheckpoint函数的currentIndex参数必须是非负整数');
  }
  
  if (!Array.isArray(updatedColors)) {
    throw new Error('saveCheckpoint函数的updatedColors参数必须是数组');
  }
  
  if (typeof stats !== 'object' || stats === null) {
    throw new Error('saveCheckpoint函数的stats参数必须是对象');
  }
  
  // 保留顺序的去重逻辑
  const seenCodes = new Set();
  const cleanedColors = [];

  try {
    // 按原始顺序遍历，保留第一次出现的每个颜色
    for (const color of updatedColors) {
      // 如果是字符串，先解析为对象
      const colorObj = typeof color === 'string' ? JSON.parse(color) : color;
      
      if (!seenCodes.has(colorObj.code)) {
        seenCodes.add(colorObj.code);
        
        // 创建清理后的颜色副本
        const cleanedColor = { ...colorObj };
        
        // 消除颜色名称后的多余空格
        if (cleanedColor.name && cleanedColor.name.endsWith(' ')) {
          cleanedColor.name = cleanedColor.name.trim();
        }
        
        // 移除不需要的position属性
        if (cleanedColor.position) {
          delete cleanedColor.position;
        }
        
        cleanedColors.push(cleanedColor);
      }
    }

    // 对颜色对象数组使用每行一个条目的格式
    const colorsJsonLines = cleanedColors.map(color => 
      `    ${JSON.stringify(color, null, 2).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()}`
    ).join(',\n');
    
    // 构建完整的checkpoint数据
    const checkpointData = {
      currentIndex: currentIndex,
      updatedColors: cleanedColors,
      stats: stats,
      lastUpdated: new Date().toISOString(),
      totalProcessed: cleanedColors.length,
      backupInfo: {
        type: 'full',
        timestamp: Date.now(),
        version: incrementalBackupManager.getNextBackupVersion()
      }
    };
    
    const checkpointContent = `{
  "currentIndex": ${currentIndex},
  "updatedColors": [
${colorsJsonLines}
  ],
  "stats": ${JSON.stringify(stats, null, 2)},
  "lastUpdated": "${new Date().toISOString()}",
  "totalProcessed": ${cleanedColors.length},
  "backupInfo": ${JSON.stringify(checkpointData.backupInfo, null, 2)}
}`;
    
    // ===== 增强的数据备份机制 =====
    try {
      // 1. 创建全量备份
      const backupDir = './backups';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `checkpoint_backup_${timestamp}.json`;
      const backupPath = join(backupDir, backupFileName);
      
      // 确保备份目录存在
      if (!existsSync(backupDir)) {
        mkdirSync(backupDir, { recursive: true });
      }
      
      // 创建全量备份文件
      await fsPromises.writeFile(backupPath, checkpointContent, 'utf8');
      log(`✅ 全量备份已创建: ${backupPath}`);
      
      // 2. 创建增量备份
      let previousData = null;
      if (existsSync(checkpointFilePath)) {
        try {
          previousData = JSON.parse(readFileSync(checkpointFilePath, 'utf8'));
        } catch (error) {
          logWarning('读取前一次数据失败，将创建基础增量备份');
        }
      }
      
      await incrementalBackupManager.createIncrementalBackup(checkpointData, previousData);
      
      // 3. 清理旧备份文件（保留最近10个全量备份）
      await cleanupOldBackups(backupDir, 10);
      
    } catch (backupError) {
      logWarning(`数据备份失败，但继续保存主文件: ${backupError.message}`);
    }
    // ===== 增强的数据备份机制结束 =====
    
    // 写入主文件
    await fsPromises.writeFile(checkpointFilePath, checkpointContent, 'utf8');
    
    // 验证写入的内容
    const fileContent = await fsPromises.readFile(checkpointFilePath, 'utf8');
    const fileData = JSON.parse(fileContent);
    
    // 验证关键数据
    if (fileData.currentIndex !== currentIndex || 
        fileData.updatedColors.length !== cleanedColors.length ||
        fileData.stats.updated !== stats.updated) {
      throw new Error('验证失败：保存的数据与原始数据不匹配');
    }
    
    log(`断点续传状态已保存，当前索引: ${currentIndex}，唯一颜色数: ${cleanedColors.length}`);
    
    // 注册信号处理器的清理回调
    signalHandler.registerCleanupCallback(async () => {
      log('信号处理器回调：保存紧急状态');
      await saveCheckpoint(currentIndex, updatedColors, stats);
    });
    
  } catch (error) {
    logError('保存断点续传状态失败:', error);
    throw error;
  }
}


/**
 * 页面管理器类，负责管理Puppeteer页面的创建、配置和交互
 * 提供统一的页面操作接口，包含错误处理和重试机制
 * 与BrowserPool集成，实现高效的页面资源管理
 */
class PageManager {
  /**
   * 构造函数，初始化页面管理器
   * @param {BrowserPool} browserPool - 浏览器连接池实例
   * @param {Object} options - 页面配置选项
   */
  constructor(browserPool, options = {}) {
    this.browserPool = browserPool;
    this.options = {
      defaultTimeout: options.defaultTimeout || 60000,
      defaultNavigationTimeout: options.defaultNavigationTimeout || 60000,
      userAgent: options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      viewport: options.viewport || { width: 1920, height: 1080 },
      ...options
    };
    this.page = null;
  }

  /**
   * 获取页面实例，如果不存在则创建新页面
   * @returns {Promise<Page>} Puppeteer页面对象
   */
  async getPage() {
    if (!this.page) {
      await this.createPage();
    }
    return /** @type {Page} */ (this.page);
  }

  /**
   * 创建新页面并进行基本配置
   * @returns {Promise<Page>} 配置完成的页面对象
   */
  async createPage() {
    try {
      // 从浏览器池获取浏览器实例
      const browser = await this.browserPool.getBrowser();
      
      // 创建新页面
      this.page = await browser.newPage();
      log('✅ 新页面创建成功');
      
      // 配置页面设置
      await this.page.setDefaultTimeout(this.options.defaultTimeout);
      await this.page.setDefaultNavigationTimeout(this.options.defaultNavigationTimeout);
      await this.page.setViewport(this.options.viewport);
      await this.page.setUserAgent(this.options.userAgent);
      log('✅ 页面配置完成');
      
      return this.page;
    } catch (error) {
      logError('创建页面失败:', error);
      throw error;
    }
  }

  /**
   * 安全导航到指定URL，包含重试机制和超时处理
   * @param {string} url - 要导航到的URL
   * @param {Object} options - 导航选项
   * @returns {Promise<void>}
   */
  async navigateTo(url, options = {}) {
    const page = await this.getPage();
    const maxRetries = options.maxRetries || 3;
    let retries = maxRetries;
    
    while (retries-- > 0) {
      try {
        log(`尝试导航到: ${url} (剩余重试次数: ${retries + 1})`);
        
        // 导航到URL
        await page.goto(url, { 
          waitUntil: options.waitUntil || 'networkidle2',
          timeout: options.timeout || this.options.defaultNavigationTimeout
        });
        
        // 等待body元素可见
        await page.waitForSelector('body', {visible: true, timeout: 10000});
        
        log(`✅ 成功导航到: ${url}`);
        return;
      } catch (error) {
        logError(`导航失败 (重试 ${maxRetries - retries}/${maxRetries}): ${error.message}`, error);
        
        if (retries <= 0) {
          throw new Error(`无法导航到 ${url}，已达到最大重试次数`);
        }
        
        // 重试前等待一段时间
        const delay = options.retryDelay || 3000;
        log(`等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * 安全地在输入框中输入文本，包含重试机制和超时处理
   * @param {string} selector - 输入框的选择器
   * @param {string} text - 要输入的文本
   * @param {Object} options - 输入选项
   * @returns {Promise<void>}
   */
  async typeText(selector, text, options = {}) {
    const page = await this.getPage();
    const maxRetries = options.maxRetries || 3;
    let retries = maxRetries;
    
    while (retries-- > 0) {
      try {
        log(`尝试输入文本到选择器: ${selector} (剩余重试次数: ${retries + 1})`);
        
        // 等待输入框出现
        await page.waitForSelector(selector, { timeout: options.timeout || 20000 });
        
        // 获取输入框元素
        const elements = await page.$$(selector);
        if (elements.length === 0) throw new Error(`找不到元素: ${selector}`);
        
        const element = elements[0];
        await element.focus();
        
        // 清空输入框并确保可编辑
        await element.evaluate((el) => {
          // 更明确的类型断言为HTMLInputElement
          const inputEl = el;
          inputEl['value'] = '';
          inputEl['disabled'] = false;
          inputEl['readOnly'] = false;
          // 触发input事件以确保状态更新
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        });
        
        // 输入文本
        await element.type(text, { delay: options.delay || 100 });
        
        log(`✅ 成功输入文本: ${text}`);
        return;
      } catch (error) {
        logError(`输入失败 (重试 ${maxRetries - retries}/${maxRetries}): ${error.message}`, error);
        
        if (retries <= 0) {
          throw new Error(`无法在 ${selector} 中输入文本，已达到最大重试次数`);
        }
        
        // 重试前等待一段时间
        const delay = options.retryDelay || 3000;
        log(`等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * 安全地点击元素，包含重试机制和超时处理
   * @param {string} selector - 要点击的元素选择器
   * @param {Object} options - 点击选项
   * @returns {Promise<void>}
   */
  async clickElement(selector, options = {}) {
    const page = await this.getPage();
    const maxRetries = options.maxRetries || 3;
    let retries = maxRetries;
    
    while (retries-- > 0) {
      try {
        log(`尝试点击元素: ${selector} (剩余重试次数: ${retries + 1})`);
        
        // 等待并确保按钮可点击
        await page.waitForFunction((sel) => {
          const btn = document.querySelector(sel);
          if (!btn) return false;
          
          // 检查元素可见性
          const style = window.getComputedStyle(btn);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          
          // 检查元素是否可点击
          const rect = btn.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0;
          const isEnabled = !btn.hasAttribute('disabled');
          
          return isVisible && isEnabled;
        }, {timeout: options.timeout || 20000}, selector);
        
        // 高亮按钮以便调试（类型安全版）
        await page.evaluate((sel) => {
          const btn = document.querySelector(sel);
          if (btn && btn instanceof HTMLElement) {
            btn.style.cssText += 'outline: 2px solid red; box-shadow: 0 0 10px yellow;';
          }
        }, selector);
        
        // 执行点击
        await page.click(selector);
        
        log(`✅ 成功点击元素: ${selector}`);
        return;
      } catch (error) {
        logError(`点击失败 (重试 ${maxRetries - retries}/${maxRetries}): ${error.message}`, error);
        
        if (retries <= 0) {
          throw new Error(`无法点击元素 ${selector}，已达到最大重试次数`);
        }
        
        // 重试前等待一段时间
        const delay = options.retryDelay || 3000;
        log(`等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * 等待元素出现并返回该元素
   * @param {string} selector - 元素选择器
   * @param {Object} options - 等待选项
   * @returns {Promise<ElementHandle>} 元素句柄
   */
  async waitForElement(selector, options = {}) {
    const page = await this.getPage();
    
    try {
      log(`等待元素出现: ${selector}`);
      const element = await page.waitForSelector(selector, {
        timeout: options.timeout || 20000,
        visible: options.visible !== false,
        ...options
      });
      log(`✅ 元素已出现: ${selector}`);
      return /** @type {ElementHandle} */ (element);
    } catch (error) {
      logError(`等待元素超时: ${selector}`, error);
      throw error;
    }
  }

  /**
   * 等待指定条件满足
   * @param {Function} conditionFn - 条件函数，在页面上下文中执行
   * @param {Object} options - 等待选项
   * @returns {Promise<any>} 条件函数的返回值
   */
  async waitForCondition(conditionFn, options = {}) {
    const page = await this.getPage();
    const maxRetries = options.maxRetries || 2;
    const timeout = options.timeout || 60000; // 增加到60秒
    let retries = maxRetries;
    
    while (retries-- > 0) {
      try {
        log(`等待条件满足... (剩余重试次数: ${retries + 1})`);
        const result = await page.waitForFunction(conditionFn.toString(), {
          timeout: timeout,
          ...options
        });
        log('✅ 条件已满足');
        return result;
      } catch (error) {
        logError(`等待条件超时 (剩余重试次数: ${retries})`, error);
        
        if (retries <= 0) {
          throw error;
        }
        
        // 重试前等待一段时间
        const delay = options.retryDelay || 5000;
        log(`等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * 在页面上下文中执行JavaScript函数
   * @param {Function} fn - 要执行的函数
   * @param {Array} args - 传递给函数的参数
   * @returns {Promise<any>} 函数执行结果
   */
  async evaluate(fn, ...args) {
    const page = await this.getPage();
    
    try {
      return await page.evaluate(fn.toString(), ...args);
    } catch (error) {
      logError('执行页面函数失败:', error);
      throw error;
    }
  }

  /**
   * 模拟按键操作
   * @param {string} key - 按键名称，如 'Enter', 'Tab', 'Escape' 等
   * @returns {Promise<void>}
   */
  async pressKey(key) {
    const page = await this.getPage();
    
    try {
      // 使用类型断言解决TypeScript错误
      await page.keyboard.press(/** @type {any} */ (key));
      log(`✅ 按键 ${key} 已按下`);
    } catch (error) {
      logError(`按键 ${key} 失败:`, error);
      throw error;
    }
  }

  /**
   * 延迟执行
   * @param {number} ms - 延迟时间（毫秒）
   * @returns {Promise<void>}
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 关闭当前页面并释放资源
   * @returns {Promise<void>}
   */
  async close() {
    if (this.page) {
      try {
        await this.page.close();
        this.page = null;
        log('✅ 页面已关闭');
      } catch (error) {
        logError('关闭页面失败:', error);
      }
    }
  }
}

// 使用Chrome DevTools MCP更新颜色
// 已通过ES模块导入puppeteer
// 已通过ES模块导入fs相关函数
// 已通过ES模块导入path相关函数

/**
 * 颜色处理器类，负责处理单个颜色的更新逻辑
 * 封装了颜色搜索、提取和验证的完整流程
 * 与PageManager集成，提供统一的颜色处理接口
 */
class ColorProcessor {
  /**
   * 构造函数，初始化颜色处理器
   * @param {PageManager} pageManager - 页面管理器实例
   * @param {Object} options - 处理选项
   */
  constructor(pageManager, options = {}) {
    this.pageManager = pageManager;
    this.options = {
      searchUrl: options.searchUrl || 'https://www.qtccolor.com/secaiku/',
      searchInputSelector: options.searchInputSelector || 'input[type="search"], input.search-input, input.el-input__inner, input[placeholder*="搜索"], input[placeholder*="search"], input',
      searchButtonSelector: options.searchButtonSelector || 'button.el-button--primary, button.search-btn, button[type="submit"], button[class*="search"], button[class*="btn"]',
      colorElementSelector: options.colorElementSelector || '#simple > div.SimpleColorBlock.el-col.el-col-24.el-col-xs-24.el-col-sm-14.el-col-md-14.el-col-lg-12 > div.block_warp.el-row.el-row--flex > div:nth-child(1) > div > div > img, img[src*="color"], img[alt*="color"], .color-image, .color-block img',
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 3000,
      ...options
    };
  }

  /**
   * 处理单个颜色，获取其HEX值
   * @param {Object} color - 包含code和name属性的颜色对象
   * @returns {Promise<Object>} 更新后的颜色对象，包含hex属性
   */
  async processColor(color) {
    if (!color?.code) {
      throw new Error('颜色代码无效');
    }

    log(`开始处理颜色: ${color.code}`);
    
    try {
      // 导航到搜索页面
      await this.pageManager.navigateTo(this.options.searchUrl);
      
      // 输入搜索词
      await this.pageManager.typeText(
        this.options.searchInputSelector,
        `PANTONE ${color.code}`
      );
      
      // 点击搜索按钮（只点击一次）
      await this.pageManager.clickElement(this.options.searchButtonSelector);
      
      // 等待2秒让结果加载
      await this.pageManager.delay(2000);
      
      // 提取颜色值
      const colorValue = await this.pageManager.evaluate(() => {
        const el = document.querySelector('img[style*="background"]');
        if (el && 'style' in el) {
          const style = el.style;
          if (style && typeof style === 'object' && 'backgroundColor' in style) {
            return style.backgroundColor || 
                   el.getAttribute('style')?.match(/background:\s*(#[0-9A-F]{6})/i)?.[1];
          }
        }
        return null;
      });
      
      if (!colorValue) {
        throw new Error('未找到颜色值');
      }
      
      // 直接转换颜色值格式
      const hexValue = colorValue.startsWith('rgb') ? rgbToHex(colorValue) : colorValue.toUpperCase();
      if (!hexValue) {
        throw new Error(`无法处理颜色值: ${colorValue}`);
      }
      
      log(`成功提取颜色值: ${hexValue}`);
      return { ...color, hex: hexValue };
      
    } catch (error) {
      logError(`处理颜色 ${color.code} 失败: ${error.message}`);
      return color; // 返回原始颜色对象
    }
  }

  // 删除 clickSearchButton 方法，改为直接调用 pageManager.clickElement

  // 删除 enterSearchTerm 方法，改为直接调用 pageManager.typeText

  // 删除 navigateToSearchPage 方法，改为直接调用 pageManager.navigateTo


  
  /**
   * 验证HEX颜色值是否有效
   * @param {string} hex - 要验证的HEX颜色值
   * @returns {boolean} 如果颜色值有效则返回true，否则返回false
   */
  validateHexColor(hex) {
    if (!hex || typeof hex !== 'string') {
      return false;
    }
    
    // 验证HEX颜色格式 (#RRGGBB)
    const hexRegex = /^#[0-9A-F]{6}$/i;
    return hexRegex.test(hex);
  }
}



// 安全导航函数
/**
 * 安全地导航到指定URL，包含重试机制和超时处理
 * 该函数会尝试导航到指定URL，如果失败会自动重试
 * 使用了Puppeteer的page.goto方法，并设置了合理的超时时间
 * @param {Page} page - Puppeteer页面对象
 * @param {string} url - 要导航到的URL
 * @param {number} maxRetries - 最大重试次数，默认为3
 * @returns {Promise<void>} 无返回值
 */
async function safeGoto(page, url, maxRetries = 3) {
  let retries = maxRetries;
  
  while (retries-- > 0) {
    try {
      log(`尝试导航到: ${url} (剩余重试次数: ${retries + 1})`);
      
      // 设置页面超时
      await page.setDefaultNavigationTimeout(60000);
      
      // 导航到URL
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });
      
      // 等待body元素可见
      await page.waitForSelector('body', {visible: true, timeout: 10000});
      
      log(`✅ 成功导航到: ${url}`);
      return;
    } catch (error) {
      logError(`导航失败 (重试 ${maxRetries - retries}/${maxRetries}): ${error.message}`, error);
      
      if (retries <= 0) {
        throw new Error(`无法导航到 ${url}，已达到最大重试次数`);
      }
      
      // 重试前等待一段时间
      log(`等待 ${3000}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

// 安全输入函数
/**
 * 安全地在输入框中输入文本，包含重试机制和超时处理
 * 该函数会等待输入框出现，然后输入指定文本
 * 如果输入框不可见或不可编辑，会自动重试
 * @param {Page} page - Puppeteer页面对象
 * @param {string} selector - 输入框的选择器
 * @param {string} text - 要输入的文本
 * @param {number} maxRetries - 最大重试次数，默认为3
 * @returns {Promise<void>} 无返回值
 */
async function safeType(page, selector, text, maxRetries = 3) {
  let retries = maxRetries;
  
  while (retries-- > 0) {
    try {
      log(`尝试输入文本到选择器: ${selector} (剩余重试次数: ${retries + 1})`);
      
      // 等待输入框出现
      await page.waitForSelector(selector, { timeout: 20000 });
      
      // 获取输入框元素
      const elements = await page.$$(selector);
      if (elements.length === 0) throw new Error(`找不到元素: ${selector}`);
      
      const element = elements[0];
      await element.focus();
      
      // 清空输入框并确保可编辑
      await element.evaluate((el) => {
        // 更明确的类型断言为HTMLInputElement
        const inputEl = el;
        inputEl['value'] = '';
        inputEl['disabled'] = false;
        inputEl['readOnly'] = false;
        // 触发input事件以确保状态更新
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      });
      
      // 输入文本
      await element.type(text, { delay: 100 });
      
      log(`✅ 成功输入文本: ${text}`);
      return;
    } catch (error) {
      logError(`输入失败 (重试 ${maxRetries - retries}/${maxRetries}): ${error.message}`, error);
      
      if (retries <= 0) {
        throw new Error(`无法在 ${selector} 中输入文本，已达到最大重试次数`);
      }
      
      // 重试前等待一段时间
      log(`等待 ${3000}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

// 重试失败条目
/**
 * 重试之前更新失败的颜色条目
 * 该函数会从断点数据中获取失败列表，然后逐个重试这些条目
 * 重试成功后会更新断点数据，从失败列表中移除成功的条目
 * @param {Page} page - Puppeteer页面对象
 * @param {Object} checkpointData - 包含失败条目的断点数据
 * @returns {Promise<Object>} 包含重试总数和成功数的统计对象
 */
async function retryFailedEntries(page, checkpointData) {
  log('开始重试失败条目...');
  
  const failedCodes = [...checkpointData.stats.failedCodes]; // 复制失败列表
  let retryCount = 0;
  let successCount = 0;
  
  for (const code of failedCodes) {
    // 在updatedColors中查找对应的颜色对象
    const failedColor = checkpointData.updatedColors.find(c => c.code === code);
    if (!failedColor) {
      log(`未找到失败条目 ${code}，跳过重试`, 'WARN');
      continue;
    }
    
    retryCount++;
    log(`重试失败条目 ${code} (${retryCount}/${failedCodes.length})`);
    
    // 使用updateSingleColor函数重试
    const updatedColor = await updateSingleColor(page, failedColor, 3);
    
    // 检查是否成功更新
    if (updatedColor.hex && updatedColor.hex !== failedColor.hex) {
      // 更新成功，替换原来的颜色对象
      const index = checkpointData.updatedColors.findIndex(c => c.code === code);
      if (index > -1) {
        checkpointData.updatedColors[index] = updatedColor;
      }
      
      // 从失败列表中移除
      const failedIndex = checkpointData.stats.failedCodes.indexOf(code);
      if (failedIndex > -1) {
        checkpointData.stats.failedCodes.splice(failedIndex, 1);
      }
      
      // 添加到成功列表
      checkpointData.stats.successfulCodes.push(code);
      successCount++;
     } else {
       log(`重试失败: ${code} 仍然无法更新`, 'WARN');
    }
    
    // 每重试5个条目保存一次断点
    if (retryCount % 5 === 0 || retryCount === failedCodes.length) {
      await saveCheckpoint(checkpointData.currentIndex, checkpointData.updatedColors, checkpointData.stats);
    }
  }
  
  log(`重试完成: 成功 ${successCount}/${retryCount} 个失败条目`);
  return { retryCount, successCount };
}

// 更新单个颜色（带重试机制）
/**
 * 从网站获取单个PANTONE颜色的HEX值，支持重试机制
 * 使用ColorProcessor类处理颜色搜索、提取和验证的完整流程
 * @param {Page} page - Puppeteer页面对象
 * @param {Object} color - 包含code和name属性的颜色对象
 * @param {number} maxRetries - 最大重试次数，默认为3
 * @returns {Promise<Object>} 更新后的颜色对象，包含hex属性
 */
async function updateSingleColor(page, color, maxRetries = 3) {
  // 创建页面管理器适配器，将Puppeteer页面对象适配为PageManager接口
  const pageManagerAdapter = {
    browserPool: null, // 适配器不需要browserPool，设为null
    options: {}, // 适配器不需要复杂选项，设为空对象
    page: null, // 适配器不需要page属性，设为null
    getPage: async () => page, // 返回当前页面
    createPage: async () => page, // 返回当前页面
    navigateTo: async (url) => await safeGoto(page, url),
    typeText: async (selector, text) => await safeType(page, selector, text),
    clickElement: async (selector) => await page.click(selector),
    waitForElement: async (selector, options = {}) => await page.waitForSelector(selector, options),
    waitForCondition: async (conditionFn, options = {}) => {
      return await page.waitForFunction(conditionFn, { timeout: options.timeout || 30000 });
    },
    evaluate: async (fn) => await page.evaluate(fn),
    pressKey: async (key) => {
      await page.keyboard.press(/** @type {any} */ (key));
    },
    delay: async (ms) => {
      return new Promise(resolve => setTimeout(resolve, ms));
    },
    close: async () => {} // 适配器不需要关闭页面，设为空函数
  };
  
  // 创建颜色处理器实例
  const colorProcessor = new ColorProcessor(pageManagerAdapter, {
    searchUrl: 'https://www.qtccolor.com/secaiku/',
    searchInputSelector: 'input[type="search"], input.search-input, input.el-input__inner, input[placeholder*="搜索"], input[placeholder*="search"], input',
    searchButtonSelector: 'button.el-button--primary, button.search-btn, button[type="submit"], button[class*="search"], button[class*="btn"]',
    colorElementSelector: '#simple > div.SimpleColorBlock.el-col.el-col-24.el-col-xs-24.el-col-sm-14.el-col-md-14.el-col-lg-12 > div.block_warp.el-row.el-row--flex > div:nth-child(1) > div > div > img, img[src*="color"], img[alt*="color"], .color-image, .color-block img',
    maxRetries: 3,
    retryDelay: 3000
  });
  
  // 使用颜色处理器处理颜色
  return await colorProcessor.processColor(color);
}

/**
 * 颜色批量处理器类，负责处理批量颜色更新的逻辑
 * 封装了批量处理、并发控制、进度保存和错误处理的完整流程
 * 与BrowserPool和ColorProcessor集成，提供高效的批量颜色处理接口
 */
class ColorBatchProcessor {
  /**
   * 构造函数，初始化颜色批量处理器
   * @param {BrowserPool} browserPool - 浏览器连接池实例
   * @param {Object} options - 处理选项
   */
  constructor(browserPool, options = {}) {
    this.browserPool = browserPool;
    this.options = {
      batchSize: options.batchSize || 5, // 每批处理颜色数量
      saveInterval: options.saveInterval || 5, // 每处理多少个颜色保存一次进度
      maxRetries: options.maxRetries || 3, // 最大重试次数
      concurrency: options.concurrency || 1, // 并发数，默认为1（串行）
      ...options
    };
  }

  /**
   * 批量处理颜色更新
   * @param {Array} colors - 颜色对象数组
   * @param {number} startIndex - 开始索引，用于断点续传
   * @param {Object} checkpointData - 断点数据
   * @returns {Promise<Object>} 包含更新后的颜色数组和统计信息的对象
   */
  async processBatch(colors, startIndex = 0, checkpointData = null) {
    // 初始化或恢复断点数据
    let updatedColors = checkpointData?.updatedColors || [];
    let stats = checkpointData?.stats || defaultStats();
    
    // 如果有断点数据，从断点位置继续
    const currentIndex = checkpointData?.currentIndex || startIndex;
    const colorsToProcess = colors.slice(currentIndex);
    
    log(`开始批量处理 ${colorsToProcess.length} 个颜色，从索引 ${currentIndex} 开始`);
    
    // 根据并发数选择处理方式
    if (this.options.concurrency > 1) {
      // 并发处理
      return await this.processBatchConcurrently(colors, currentIndex, updatedColors, stats);
    } else {
      // 串行处理
      return await this.processBatchSequentially(colors, currentIndex, updatedColors, stats);
    }
  }

  /**
   * 串行批量处理颜色
   * @param {Array} colors - 颜色对象数组
   * @param {number} currentIndex - 当前索引
   * @param {Array} updatedColors - 已更新的颜色数组
   * @param {Object} stats - 统计信息
   * @returns {Promise<Object>} 包含更新后的颜色数组和统计信息的对象
   */
  async processBatchSequentially(colors, currentIndex, updatedColors, stats) {
    for (let i = currentIndex; i < colors.length; i++) {
      const color = colors[i];
      
      try {
        // 获取浏览器实例
        const browser = await this.browserPool.getBrowser();
        const page = await browser.newPage();
        
        // 处理单个颜色
        const updatedColor = await this.processSingleColor(page, color);
        updatedColors.push(updatedColor);
        
        // 更新统计信息
        if (updatedColor.hex && updatedColor.hex !== color.hex) {
          stats.updated++;
          log(`✅ 颜色 ${color.code} 更新成功: ${updatedColor.hex}`);
        } else {
          stats.failed++;
          stats.failedCodes.push(color.code);
          log(`❌ 颜色 ${color.code} 更新失败`, 'WARN');
        }
        
        // 关闭页面
        await page.close();
        
        // 释放浏览器实例
        await this.browserPool.releaseBrowser(browser);
        
        // 定期保存进度
        if ((i + 1) % this.options.saveInterval === 0 || i === colors.length - 1) {
          await this.saveProgress(i + 1, updatedColors, stats);
        }
        
        // 显示进度
        this.showProgress(i + 1, colors.length, stats);
        
      } catch (error) {
        logError(`处理颜色 ${color.code} 时发生错误: ${error.message}`, error);
        stats.failed++;
        stats.failedCodes.push(color.code);
        
        // 即使出错也要保存进度
        if ((i + 1) % this.options.saveInterval === 0 || i === colors.length - 1) {
          await this.saveProgress(i + 1, updatedColors, stats);
        }
      }
    }
    
    return { updatedColors, stats };
  }

  /**
   * 并发批量处理颜色
   * @param {Array} colors - 颜色对象数组
   * @param {number} currentIndex - 当前索引
   * @param {Array} updatedColors - 已更新的颜色数组
   * @param {Object} stats - 统计信息
   * @returns {Promise<Object>} 包含更新后的颜色数组和统计信息的对象
   */
  async processBatchConcurrently(colors, currentIndex, updatedColors, stats) {
    const colorsToProcess = colors.slice(currentIndex);
    const batches = this.createBatches(colorsToProcess, this.options.batchSize);
    
    log(`将 ${colorsToProcess.length} 个颜色分为 ${batches.length} 批并发处理`);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      log(`处理第 ${batchIndex + 1}/${batches.length} 批，包含 ${batch.length} 个颜色`);
      
      // 并发处理当前批次
      const batchPromises = batch.map(async (color, indexInBatch) => {
        const colorIndex = currentIndex + batchIndex * this.options.batchSize + indexInBatch;
        
        try {
          // 获取浏览器实例
          const browser = await this.browserPool.getBrowser();
          const page = await browser.newPage();
          
          // 处理单个颜色
          const updatedColor = await this.processSingleColor(page, color);
          
          // 关闭页面
          await page.close();
          
          // 释放浏览器实例
          await this.browserPool.releaseBrowser(browser);
          
          return { color: updatedColor, index: colorIndex, success: true };
        } catch (error) {
          logError(`处理颜色 ${color.code} 时发生错误: ${error.message}`, error);
          return { color, index: colorIndex, success: false, error };
        }
      });
      
      // 等待当前批次完成
      const batchResults = await Promise.allSettled(batchPromises);
      
      // ===== 并发处理顺序保证增强 =====
      // 创建结果数组，按原始索引排序
      const sortedResults = [];
      
      // 首先收集所有成功和失败的结果
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          sortedResults.push(result.value);
        } else if (result.status === 'rejected') {
          // 处理失败的情况，创建占位符结果
          const failedResult = {
            color: null,
            index: -1,
            success: false,
            error: result.reason || new Error('Unknown error')
          };
          sortedResults.push(failedResult);
        } else {
          // 处理其他未知状态
          const failedResult = {
            color: null,
            index: -1,
            success: false,
            error: new Error('Unknown promise state')
          };
          sortedResults.push(failedResult);
        }
      }
      
      // 按原始索引排序，确保结果顺序与原始顺序一致
      sortedResults.sort((a, b) => a.index - b.index);
      
      // 验证顺序一致性
      const originalOrder = colors.slice(currentIndex, currentIndex + batch.length).map(c => c.code);
      const resultOrder = sortedResults.map(r => r.color ? r.color.code : 'unknown');
      
      if (JSON.stringify(originalOrder) !== JSON.stringify(resultOrder)) {
        log('警告: 处理结果顺序与原始顺序不一致，已自动修正', 'WARN');
        // 记录详细信息用于调试
        log(`原始顺序: ${originalOrder.join(', ')}`);
        log(`结果顺序: ${resultOrder.join(', ')}`);
      }
      
      // 处理排序后的结果
      for (const result of sortedResults) {
        if (result.success && result.color) {
          updatedColors.push(result.color);
          
          // 更新统计信息
          if (result.color.hex && result.color.hex !== colors[result.index].hex) {
            stats.updated++;
            log(`✅ 颜色 ${result.color.code} 更新成功: ${result.color.hex}`);
          } else {
            stats.failed++;
            stats.failedCodes.push(result.color.code);
            log(`❌ 颜色 ${result.color.code} 更新失败`, 'WARN');
          }
        } else {
          // 处理失败的情况
          if (result.color && result.color.code) {
            stats.failed++;
            stats.failedCodes.push(result.color.code);
            log(`❌ 颜色 ${result.color.code} 更新失败`, 'WARN');
            updatedColors.push(result.color); // 保留原始颜色
          } else {
            // 无法获取颜色信息的情况
            stats.failed++;
            log(`❌ 未知颜色更新失败`, 'WARN');
          }
        }
      }
      // ===== 并发处理顺序保证增强结束 =====
      
      // 保存进度
      const processedCount = Math.min(
        currentIndex + (batchIndex + 1) * this.options.batchSize,
        colors.length
      );
      await this.saveProgress(processedCount, updatedColors, stats);
      
      // 显示进度
      this.showProgress(processedCount, colors.length, stats);
    }
    
    return { updatedColors, stats };
  }

  /**
   * 处理单个颜色
   * @param {Page} page - Puppeteer页面对象
   * @param {Object} color - 颜色对象
   * @returns {Promise<Object>} 更新后的颜色对象
   */
  async processSingleColor(page, color) {
    // 创建页面管理器适配器
    const pageManagerAdapter = {
      browserPool: null, // 适配器不需要browserPool，设为null
      options: {}, // 适配器不需要复杂选项，设为空对象
      page: null, // 适配器不需要page属性，设为null
      getPage: async () => page, // 返回当前页面
      createPage: async () => page, // 返回当前页面
      navigateTo: async (url) => await safeGoto(page, url),
      typeText: async (selector, text) => await safeType(page, selector, text),
      clickElement: async (selector) => await page.click(selector),
      waitForElement: async (selector, options = {}) => await page.waitForSelector(selector, options),
      waitForCondition: async (conditionFn, options = {}) => {
        return await page.waitForFunction(conditionFn, { timeout: options.timeout || 30000 });
      },
      evaluate: async (fn) => await page.evaluate(fn),
      pressKey: async (key) => {
        await page.keyboard.press(/** @type {any} */ (key));
      },
      delay: async (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
      },
      close: async () => {} // 适配器不需要关闭页面，设为空函数
    };
    
    // 创建颜色处理器实例
    const colorProcessor = new ColorProcessor(pageManagerAdapter, {
      searchUrl: 'https://www.qtccolor.com/secaiku/',
      searchInputSelector: 'input[type="search"], input.search-input, input.el-input__inner, input[placeholder*="搜索"], input[placeholder*="search"], input',
      searchButtonSelector: 'button.el-button--primary, button.search-btn, button[type="submit"], button[class*="search"], button[class*="btn"]',
      colorElementSelector: '#simple > div.SimpleColorBlock.el-col.el-col-24.el-col-xs-24.el-col-sm-14.el-col-md-14.el-col-lg-12 > div.block_warp.el-row.el-row--flex > div:nth-child(1) > div > div > img, img[src*="color"], img[alt*="color"], .color-image, .color-block img',
      maxRetries: 3,
      retryDelay: 3000
    });
    
    // 使用颜色处理器处理颜色
    return await colorProcessor.processColor(color);
  }

  /**
   * 创建批次
   * @param {Array} items - 要分批的项目数组
   * @param {number} batchSize - 每批大小
   * @returns {Array<Array>} 批次数组
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 保存进度
   * @param {number} currentIndex - 当前索引
   * @param {Array} updatedColors - 已更新的颜色数组
   * @param {Object} stats - 统计信息
   * @returns {Promise<void>}
   */
  async saveProgress(currentIndex, updatedColors, stats) {
    try {
      await saveCheckpoint(currentIndex, updatedColors, stats);
      log(`进度已保存: ${currentIndex}/${stats.total}`);
    } catch (error) {
      logError(`保存进度失败: ${error.message}`, error);
    }
  }

  /**
   * 显示进度
   * @param {number} current - 当前进度
   * @param {number} total - 总数
   * @param {Object} stats - 统计信息
   */
  showProgress(current, total, stats) {
    const percentage = ((current / total) * 100).toFixed(2);
    const successRate = stats.updated > 0 
      ? ((stats.updated / (stats.updated + stats.failed)) * 100).toFixed(2) 
      : 0;
    
    log(`进度: ${current}/${total} (${percentage}%) | 成功: ${stats.updated} | 失败: ${stats.failed} | 成功率: ${successRate}%`);
  }

  /**
   * 重试失败的颜色
   * @param {Array} colors - 颜色对象数组
   * @param {Array} failedCodes - 失败的颜色代码数组
   * @returns {Promise<Object>} 包含更新后的颜色数组和统计信息的对象
   */
  async retryFailedColors(colors, failedCodes) {
    log(`开始重试 ${failedCodes.length} 个失败的颜色`);
    
    // 找出失败的颜色对象
    const failedColors = colors.filter(color => failedCodes.includes(color.code));
    if (failedColors.length === 0) {
      log('没有找到需要重试的颜色');
      return { updatedColors: [], stats: { total: 0, updated: 0, failed: 0, failedCodes: [] } };
    }
    
    // 重置统计信息
    const retryStats = {
      total: failedColors.length,
      updated: 0,
      failed: 0,
      failedCodes: []
    };
    
    const retryUpdatedColors = [];
    
    // 串行处理失败的颜色
    for (let i = 0; i < failedColors.length; i++) {
      const color = failedColors[i];
      
      try {
        // 获取浏览器实例
        const browser = await this.browserPool.getBrowser();
        const page = await browser.newPage();
        
        // 处理单个颜色
        const updatedColor = await this.processSingleColor(page, color);
        retryUpdatedColors.push(updatedColor);
        
        // 更新统计信息
        if (updatedColor.hex && updatedColor.hex !== color.hex) {
          retryStats.updated++;
          log(`✅ 重试成功: 颜色 ${color.code} 更新为 ${updatedColor.hex}`);
        } else {
          retryStats.failed++;
          retryStats.failedCodes.push(color.code);
          log(`❌ 重试失败: 颜色 ${color.code} 仍然无法更新`, 'WARN');
        }
        
        // 关闭页面
        await page.close();
        
        // 释放浏览器实例
        await this.browserPool.releaseBrowser(browser);
        
        // 显示进度
        this.showProgress(i + 1, failedColors.length, retryStats);
        
      } catch (error) {
        logError(`重试颜色 ${color.code} 时发生错误: ${error.message}`, error);
        retryStats.failed++;
        retryStats.failedCodes.push(color.code);
        retryUpdatedColors.push(color); // 保留原始颜色
      }
    }
    
    log(`重试完成: 成功 ${retryStats.updated}/${retryStats.total} 个颜色`);
    return { updatedColors: retryUpdatedColors, stats: retryStats };
  }
}

// 生成报告
/**
 * 生成PANTONE颜色更新报告，支持完整报告和部分报告
 * 该函数会创建一个Markdown格式的报告文件，包含处理统计信息和失败列表
 * @param {Object} stats - 包含处理统计信息的对象
 * @param {boolean} isPartial - 是否为部分报告（进行中状态）
 */
function generateReport(stats, isPartial = false) {
  log('生成更新报告...');
  
  const reportContent = `
# PANTONE颜色更新报告${isPartial ? ' (进行中)' : ''}
生成时间: ${new Date().toLocaleString()}

## 统计信息
- 总颜色数: ${stats.total}
- 成功更新: ${stats.updated}
- 更新失败: ${stats.failed}
- 更新成功率: ${((stats.updated / (stats.updated + stats.failed)) * 100).toFixed(2)}%
- 总体进度: ${(((stats.updated + stats.failed) / stats.total) * 100).toFixed(2)}%

## 未能更新的色号列表
${stats.failedCodes.map(code => `- ${code}`).join('\n')}
`;

  // 写入报告文件
  const reportFileName = isPartial ? 'pantone_update_report_partial.md' : 'pantone_update_report.md';
  writeFileSync(reportFileName, reportContent, 'utf8');
  log('报告已保存到 ' + reportFileName);
}

// 更新最终结果 - 只搜集数据到checkpoint文件
/**
 * 将处理结果更新到checkpoint文件，并生成最终报告
 * 该函数会直接修改断点文件，确保原始数据不会丢失
 * 清理颜色对象数据，移除不必要的属性，并格式化JSON输出
 * 确保checkpoint文件的可维护性和可读性
 * 改进的去重逻辑：确保数据完整性、有序性和增量增加
 * @param {Array} updatedColors - 已更新的颜色对象数组
 * @param {Object} stats - 处理统计信息
 * @returns {Promise<void>}
 */
async function updateFinalResults(updatedColors, stats) {
  try {
    // 读取现有的checkpoint数据
    let checkpointData = {};
    if (existsSync(checkpointFilePath)) {
      checkpointData = JSON.parse(readFileSync(checkpointFilePath, 'utf8'));
    }
    
    // 改进的去重逻辑：基于颜色代码的唯一性，同时保留最新的数据
    const seenCodes = new Set();
    const cleanedColors = [];
    
    // 首先处理现有数据，保留已有的唯一颜色
    if (checkpointData.updatedColors && Array.isArray(checkpointData.updatedColors)) {
      for (const color of checkpointData.updatedColors) {
        // 如果是字符串，先解析为对象
        const colorObj = typeof color === 'string' ? JSON.parse(color) : color;
        
        // 验证颜色对象结构
        if (colorObj && colorObj.code) {
          // 清理颜色对象
          const cleanedColor = { ...colorObj };
          if (cleanedColor.name && cleanedColor.name.endsWith(' ')) {
            cleanedColor.name = cleanedColor.name.trim();
          }
          
          // 移除不必要的属性
          if (cleanedColor.position) {
            delete cleanedColor.position;
          }
          
          // 添加到已见集合和清理后的数组
          seenCodes.add(colorObj.code);
          cleanedColors.push(cleanedColor);
        }
      }
    }
    
    // 然后处理新数据，只添加不重复的颜色
    let newColorsAdded = 0;
    for (const color of updatedColors) {
      // 如果是字符串，先解析为对象
      const colorObj = typeof color === 'string' ? JSON.parse(color) : color;
      
      // 验证颜色对象结构
      if (colorObj && colorObj.code) {
        // 只添加不重复的颜色
        if (!seenCodes.has(colorObj.code)) {
          seenCodes.add(colorObj.code);
          
          // 清理颜色对象
          const cleanedColor = { ...colorObj };
          if (cleanedColor.name && cleanedColor.name.endsWith(' ')) {
            cleanedColor.name = cleanedColor.name.trim();
          }
          
          // 移除不必要的属性
          if (cleanedColor.position) {
            delete cleanedColor.position;
          }
          
          // 验证必要字段
          if (!cleanedColor.brand) cleanedColor.brand = 'PANTONE';
          if (!cleanedColor.hex) cleanedColor.hex = '';
          
          cleanedColors.push(cleanedColor);
          newColorsAdded++;
        } else {
          // 如果颜色已存在，检查是否需要更新（例如HEX值不同）
          const existingIndex = cleanedColors.findIndex(c => c.code === colorObj.code);
          if (existingIndex !== -1 && colorObj.hex && colorObj.hex !== cleanedColors[existingIndex].hex) {
            // 更新现有颜色的HEX值
            cleanedColors[existingIndex].hex = colorObj.hex;
            log(`更新现有颜色的HEX值: ${colorObj.code} ${colorObj.name}`);
          }
        }
      }
    }
    
    log(`去重处理完成: 保留 ${cleanedColors.length} 个唯一颜色，新增 ${newColorsAdded} 个颜色`);
    
    // 对颜色对象数组使用每行一个条目的格式，添加空格提升可读性
    const colorsJsonLines = cleanedColors.map(color => 
      `    ${JSON.stringify(color, null, 2).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()}`
    ).join(',\n');
    
    // 使用清理后的颜色对象更新checkpoint数据
    checkpointData.updatedColors = cleanedColors;
    checkpointData.stats = stats;
    checkpointData.lastUpdate = new Date().toISOString();
    checkpointData.totalProcessed = cleanedColors.length; // 更新为去重后的总数
    
    // 构建完整的checkpoint数据，手动控制格式
    const checkpointContent = `{
  "currentIndex": ${checkpointData.currentIndex || 0},
  "updatedColors": [
${colorsJsonLines}
  ],
  "stats": ${JSON.stringify(checkpointData.stats || stats, null, 2)},
  "lastUpdated": "${new Date().toISOString()}",
  "totalProcessed": ${cleanedColors.length}
}`;
    
    // 直接写入文件
    writeFileSync(checkpointFilePath, checkpointContent, 'utf8');
    
    // 验证写入的内容是否正确
    const fileContent = readFileSync(checkpointFilePath, 'utf8');
    const fileData = JSON.parse(fileContent);
    
    // 验证关键数据
    if (fileData.updatedColors.length !== cleanedColors.length ||
        fileData.stats.updated !== stats.updated ||
        fileData.totalProcessed !== cleanedColors.length) {
      throw new Error('验证失败：保存的数据与原始数据不匹配');
    }
    
    // 验证数据唯一性
    const uniqueCodes = new Set(fileData.updatedColors.map(c => c.code));
    if (uniqueCodes.size !== fileData.updatedColors.length) {
      throw new Error('验证失败：保存的数据中存在重复的颜色代码');
    }
    
    // 生成最终报告
    generateReport(stats);
    log(`已搜集 ${cleanedColors.length} 个唯一颜色的数据到checkpoint文件`);
  } catch (error) {
    logError('更新checkpoint文件失败:', error);
    logError('错误详情:', error);
  }
}



/**
 * 主函数：批量更新PANTONE颜色的HEX值
 * 使用ColorBatchProcessor类处理批量颜色更新，优化并发处理和资源管理
 * 该函数会加载断点，创建浏览器连接池，然后使用ColorBatchProcessor处理颜色更新
 * 处理完成后会更新最终结果并生成报告
 * 改进增量处理机制，确保只处理新数据，避免重复处理已完成的颜色
 * 新增增量处理逻辑：基于颜色代码的增量更新，避免重复处理已完成的颜色
 */
async function updateColors(existingColors = []) {
  log('=== 开始批量更新PANTONE颜色HEX值 ===');
  
  try {
    // 加载断点
    log('正在加载断点...');
    const checkpointData = await loadCheckpoint();
    let colors = checkpointData?.updatedColors || [];
    let stats = checkpointData?.stats || defaultStats();
    let currentIndex = checkpointData?.currentIndex || 0;
    
    // 如果没有颜色数据，初始化
    if (colors.length === 0) {
      log('未找到颜色数据，初始化...');
      colors = colorSheets.colors || [];
      stats = defaultStats();
      currentIndex = 0;
    }
    
    // 改进增量处理机制：如果提供了现有颜色数据，使用增量处理逻辑
    let colorsToProcess;
    if (existingColors.length > 0) {
      log(`使用增量处理模式，现有颜色数据: ${existingColors.length} 个`);
      
      // 获取需要更新的颜色列表
      const colorsToUpdate = getColorsToUpdate(colors, existingColors);
      log(`增量处理: 需要更新 ${colorsToUpdate.length} 个颜色`);
      
      if (colorsToUpdate.length === 0) {
        log('✅ 所有颜色都已是最新状态，无需更新');
        showStats();
        return colors;
      }
      
      // 使用增量处理模式
      colorsToProcess = colorsToUpdate;
      log(`需要处理 ${colorsToProcess.length} 个颜色`);
    } else {
      // 传统处理模式：检查是否所有颜色都已处理
      if (currentIndex >= colors.length) {
        log(`所有颜色已处理完成 (当前索引: ${currentIndex}, 总颜色数: ${colors.length})`);
        log('如需重新处理所有颜色，请删除checkpoint文件或使用重试功能');
        
        // 显示当前统计信息
        showStats();
        return colors;
      }
      
      // 过滤出需要处理的颜色
      colorsToProcess = colors.slice(currentIndex);
      log(`需要处理 ${colorsToProcess.length} 个颜色，从索引 ${currentIndex} 开始`);
    }
    
    // 验证数据完整性：检查是否有重复的颜色代码
    const uniqueCodes = new Set(colors.map(c => c.code));
    if (uniqueCodes.size !== colors.length) {
      log(`警告：检测到重复的颜色代码，总数: ${colors.length}, 唯一代码数: ${uniqueCodes.size}`, 'WARN');
      log('将在处理过程中自动去重');
    }
    
    // 创建浏览器连接池
    log('正在创建浏览器连接池...');
    const browserPool = new BrowserPool({
      maxBrowsers: 3, // 最多3个浏览器实例
      browserOptions: {
        headless: false,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: [
          '--start-maximized',
          '--disable-infobars',
          '--disable-web-security'
        ]
      }
    });
    log('✅ 浏览器连接池创建成功');
    
    try {
      // 创建ColorBatchProcessor实例
      log('正在创建颜色批量处理器...');
      const batchProcessor = new ColorBatchProcessor(browserPool, {
        batchSize: 10, // 每批处理10个颜色
        concurrency: 3, // 最多同时处理3个批次
        saveInterval: 5, // 每处理5个颜色保存一次进度
      });
      log('✅ 颜色批量处理器创建成功');
      
      // 处理颜色批次
      log('开始处理颜色批次...');
      
      // 根据处理模式调整参数
      let processResult;
      if (existingColors.length > 0) {
        // 增量处理模式：处理需要更新的颜色
        processResult = await batchProcessor.processBatch(colorsToProcess, 0, checkpointData);
      } else {
        // 传统处理模式：从当前索引开始处理
        processResult = await batchProcessor.processBatch(colorsToProcess, currentIndex, checkpointData);
      }
      
      // 更新颜色数据和统计信息
      let finalUpdatedColors;
      if (existingColors.length > 0) {
        // 增量处理模式：合并现有颜色和更新后的颜色
        const updatedColorsMap = new Map();
        for (const color of processResult.updatedColors) {
          updatedColorsMap.set(color.code, color);
        }
        
        // 合并现有颜色和更新后的颜色
        finalUpdatedColors = existingColors.map(color => {
          const updatedColor = updatedColorsMap.get(color.code);
          return updatedColor || color;
        });
      } else {
        // 传统处理模式：合并已处理颜色和更新后的颜色
        finalUpdatedColors = [...colors.slice(0, currentIndex), ...processResult.updatedColors];
      }
      
      const finalStats = {
        ...processResult.stats,
        updated: processResult.stats.updated,
        failed: processResult.stats.failed,
        failedCodes: [...(processResult.stats.failedCodes || [])],
        successfulCodes: [...(processResult.stats.successfulCodes || [])]
      };
      
      log(`批次处理完成: 成功更新 ${processResult.stats.updated} 个颜色，失败 ${processResult.stats.failed} 个颜色`);
      
      // 更新最终结果
      log('\n正在更新最终结果...');
      await updateFinalResults(finalUpdatedColors, finalStats);
      log('✅ 最终结果更新完成');
      
      return finalUpdatedColors;
      
    } finally {
      // 关闭浏览器连接池
      log('\n正在关闭浏览器连接池...');
      await browserPool.closeAll();
      log('✅ 浏览器连接池已关闭');
    }
  } catch (error) {
    logError('❌ 批量更新颜色时出错: ' + error.message, error);
    throw error;
  }
}

// RGB转HEX辅助函数
/**
 * 将RGB颜色值转换为HEX格式
 * 该函数会解析RGB字符串，提取三个颜色分量，然后转换为6位HEX值
 * @param {string} rgb - RGB格式的颜色字符串，如 "rgb(233, 225, 218)"
 * @returns {string|null} 转换后的HEX颜色值，如 "#E9E1DA"，如果转换失败则返回null
 */
function rgbToHex(rgb) {
  if (!rgb || !rgb.startsWith('rgb')) return null;
  
  const matchResult = rgb.match(/\d+/g);
  if (!matchResult || matchResult.length !== 3) return null;
  
  const values = matchResult.map(Number);
  
  return '#' + values.map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

// 更新部分结果到文件
/**
 * 保存部分处理结果到文件，生成临时报告
 * 该函数会在处理过程中定期调用，保存当前进度和统计信息
 * @param {Array} updatedColors - 已更新的颜色对象数组
 * @param {Object} stats - 处理统计信息
 */
function updatePartialResults(updatedColors, stats) {
  try {
    // 生成临时报告
    generateReport(stats, true);
    
    log('部分结果已保存');
  } catch (error) {
    logError('保存部分结果失败: ' + error.message, error);
  }
}

// 执行MCP工具
/**
 * 执行Chrome DevTools MCP工具的辅助函数
 * 该函数会构建命令行参数，执行MCP工具，并处理输出结果
 * @param {string} toolName - 要执行的MCP工具名称
 * @param {Object} args - 传递给MCP工具的参数对象
 * @returns {Promise<Object>} 包含stdout的执行结果对象
 * @throws {Error} 当命令执行失败时抛出错误
 */
async function runMcpTool(toolName, args) {
  return new Promise((resolve, reject) => {
    try {
      // 基本CMD命令格式
      const command = `npx chrome-devtools-mcp@latest ${toolName} "${JSON.stringify(args).replace(/"/g, '\\"')}"`;
      console.log('执行命令:', command);

      // 直接执行
      const result = execSync(command, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: 'cmd.exe'
      });

      // 基本输出处理
      const cleanOutput = result.trim();
      if (!cleanOutput) throw new Error('空输出');

      try {
        resolve({ stdout: JSON.parse(cleanOutput) });
      } catch {
        resolve({ stdout: cleanOutput });
      }
    } catch (error) {
      console.error(`命令执行失败:`, error.message);
      console.log('原始错误:', error);
      reject(error);
    }
  });
}

// 清理临时文件和备份文件（已移除，不再使用临时文件和备份文件）

// ===== 增强的信号处理机制 =====
/**
 * 信号处理器类 - 处理程序中断信号，确保数据安全保存
 * 支持多种信号类型，提供优雅的退出机制
 */
class SignalHandler {
  constructor() {
    this.isHandlingSignal = false;
    this.cleanupCallbacks = [];
    this.signalHandlers = new Map();
    
    this.registerSignalHandlers();
  }
  
  /**
   * 注册信号处理器
   */
  registerSignalHandlers() {
    // SIGINT - Ctrl+C
    this.signalHandlers.set('SIGINT', this.handleSigint.bind(this));
    
    // SIGTERM - 终止信号
    this.signalHandlers.set('SIGTERM', this.handleSigterm.bind(this));
    
    // SIGHUP - 终端断开
    this.signalHandlers.set('SIGHUP', this.handleSighup.bind(this));
    
    // 注册所有信号处理器
    for (const [signal, handler] of this.signalHandlers) {
      process.on(signal, handler);
    }
    
    log('✅ 信号处理器已注册');
  }
  
  /**
   * 处理SIGINT信号 (Ctrl+C)
   */
  async handleSigint() {
    if (this.isHandlingSignal) return;
    this.isHandlingSignal = true;
    
    log('\n⚠️ 检测到SIGINT信号 (Ctrl+C)，正在保存当前状态...');
    await this.performEmergencySave('SIGINT');
    process.exit(0);
  }
  
  /**
   * 处理SIGTERM信号
   */
  async handleSigterm() {
    if (this.isHandlingSignal) return;
    this.isHandlingSignal = true;
    
    log('\n⚠️ 检测到SIGTERM信号，正在保存当前状态...');
    await this.performEmergencySave('SIGTERM');
    process.exit(0);
  }
  
  /**
   * 处理SIGHUP信号
   */
  async handleSighup() {
    if (this.isHandlingSignal) return;
    this.isHandlingSignal = true;
    
    log('\n⚠️ 检测到SIGHUP信号 (终端断开)，正在保存当前状态...');
    await this.performEmergencySave('SIGHUP');
    process.exit(0);
  }
  
  /**
   * 执行紧急保存操作
   * @param {string} signal - 信号类型
   */
  async performEmergencySave(signal) {
    try {
      log(`开始紧急保存 (信号: ${signal})...`);
      
      // 1. 保存当前处理状态到紧急备份文件
      await this.saveEmergencyBackup(signal);
      
      // 2. 执行全局资源清理（如果resourceCleaner已定义）
      if (typeof resourceCleaner !== 'undefined' && resourceCleaner.performCleanup) {
        await resourceCleaner.performCleanup(`signal_${signal}`);
      } else {
        logWarning('resourceCleaner未定义，跳过资源清理');
      }
      
      // 3. 执行所有注册的清理回调
      await this.executeCleanupCallbacks();
      
      // 4. 记录信号处理日志
      this.logSignalHandling(signal);
      
      log(`✅ 紧急保存完成，程序将退出`);
    } catch (error) {
      logError(`紧急保存失败: ${error.message}`, error);
    }
  }
  
  /**
   * 保存紧急备份
   * @param {string} signal - 信号类型
   */
  async saveEmergencyBackup(signal) {
    try {
      // 读取当前checkpoint数据
      let checkpointData = {};
      if (existsSync(checkpointFilePath)) {
        checkpointData = JSON.parse(readFileSync(checkpointFilePath, 'utf8'));
      }
      
      // 创建紧急备份文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const emergencyBackupFile = `emergency_backup_${signal}_${timestamp}.json`;
      const emergencyBackupPath = join(__dirname, 'backups', emergencyBackupFile);
      
      // 确保备份目录存在
      if (!existsSync(join(__dirname, 'backups'))) {
        mkdirSync(join(__dirname, 'backups'), { recursive: true });
      }
      
      // 添加紧急备份信息
      const emergencyData = {
        ...checkpointData,
        emergencyInfo: {
          signal: signal,
          timestamp: new Date().toISOString(),
          reason: 'program_interruption',
          savedAt: Date.now()
        }
      };
      
      // 保存紧急备份
      writeFileSync(emergencyBackupPath, JSON.stringify(emergencyData, null, 2), 'utf8');
      log(`✅ 紧急备份已保存: ${emergencyBackupFile}`);
      
    } catch (error) {
      logError(`保存紧急备份失败: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * 记录信号处理日志
   * @param {string} signal - 信号类型
   */
  logSignalHandling(signal) {
    const logEntry = {
      type: 'signal_handling',
      signal: signal,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      memoryUsage: process.memoryUsage()
    };
    
    try {
      const signalLogPath = join(__dirname, 'signal_handling.log');
      appendFileSync(signalLogPath, JSON.stringify(logEntry) + '\n', 'utf8');
    } catch (error) {
      // 忽略日志写入错误
    }
  }
  
  /**
   * 注册清理回调函数
   * @param {Function} callback - 清理回调函数
   */
  registerCleanupCallback(callback) {
    if (typeof callback === 'function') {
      this.cleanupCallbacks.push(callback);
    }
  }
  
  /**
   * 执行所有清理回调
   */
  async executeCleanupCallbacks() {
    for (const callback of this.cleanupCallbacks) {
      try {
        await callback();
      } catch (error) {
        logError('执行清理回调失败:', error);
      }
    }
  }
  
  /**
   * 注销信号处理器
   */
  unregister() {
    for (const [signal] of this.signalHandlers) {
      process.removeAllListeners(signal);
    }
    this.signalHandlers.clear();
    log('信号处理器已注销');
  }
}

// 创建全局信号处理器实例
const signalHandler = new SignalHandler();

// ===== 增量备份机制增强 =====
/**
 * 增量备份管理器 - 实现高效的增量备份机制
 * 支持差异备份、版本管理和压缩存储
 */
class IncrementalBackupManager {
  constructor() {
    this.backupDir = join(__dirname, 'backups');
    this.incrementalBackupDir = join(this.backupDir, 'incremental');
    this.maxIncrementalBackups = 150; // 最大增量备份数量
    this.fullBackupInterval = 10; // 每10次增量备份后执行一次全量备份
    
    this.ensureBackupDirs();
  }
  
  /**
   * 确保备份目录存在
   */
  ensureBackupDirs() {
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
    }
    if (!existsSync(this.incrementalBackupDir)) {
      mkdirSync(this.incrementalBackupDir, { recursive: true });
    }
  }
  
  /**
   * 创建增量备份
   * @param {Object} currentData - 当前数据
   * @param {Object} previousData - 前一次数据（可选）
   * @returns {Promise<string>} 备份文件路径
   */
  async createIncrementalBackup(currentData, previousData = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `incremental_${timestamp}.json`;
    const backupPath = join(this.incrementalBackupDir, backupFile);
    
    try {
      // 计算增量数据
      const incrementalData = this.calculateIncrementalData(currentData, previousData);
      
      // 添加备份元数据
      const backupData = {
        ...incrementalData,
        backupMetadata: {
          type: 'incremental',
          timestamp: new Date().toISOString(),
          version: this.getNextBackupVersion(),
          parentVersion: previousData?.backupMetadata?.version || null
        }
      };
      
      // 保存增量备份
      writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
      
      // 清理旧的增量备份
      await this.cleanupOldIncrementalBackups();
      
      log(`✅ 增量备份已创建: ${backupFile}`);
      return backupPath;
      
    } catch (error) {
      logError(`创建增量备份失败: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * 计算增量数据
   * @param {Object} currentData - 当前数据
   * @param {Object} previousData - 前一次数据
   * @returns {Object} 增量数据
   */
  calculateIncrementalData(currentData, previousData) {
    if (!previousData) {
      // 如果没有前一次数据，返回完整数据（作为基础版本）
      return currentData;
    }
    
    // 计算颜色数据的差异
    const incrementalColors = this.calculateColorDifferences(
      currentData.updatedColors || [],
      previousData.updatedColors || []
    );
    
    // 计算统计数据的差异
    const incrementalStats = this.calculateStatsDifferences(
      currentData.stats || {},
      previousData.stats || {}
    );
    
    return {
      currentIndex: currentData.currentIndex,
      updatedColors: incrementalColors,
      stats: incrementalStats,
      lastUpdated: currentData.lastUpdated
    };
  }
  
  /**
   * 计算颜色数据差异
   * @param {Array} currentColors - 当前颜色数据
   * @param {Array} previousColors - 前一次颜色数据
   * @returns {Array} 差异数据
   */
  calculateColorDifferences(currentColors, previousColors) {
    const differences = [];
    const previousColorMap = new Map(previousColors.map(color => [color.code, color]));
    
    for (const currentColor of currentColors) {
      const previousColor = previousColorMap.get(currentColor.code);
      
      if (!previousColor) {
        // 新增的颜色
        differences.push({
          operation: 'add',
          color: currentColor
        });
      } else if (!this.areColorsEqual(currentColor, previousColor)) {
        // 修改的颜色
        differences.push({
          operation: 'update',
          color: currentColor,
          previous: previousColor
        });
      }
      // 删除的颜色在增量备份中不需要特别处理
    }
    
    return differences;
  }
  
  /**
   * 比较两个颜色是否相等
   * @param {Object} color1 - 颜色1
   * @param {Object} color2 - 颜色2
   * @returns {boolean} 是否相等
   */
  areColorsEqual(color1, color2) {
    return color1.hex === color2.hex && 
           color1.name === color2.name && 
           color1.code === color2.code;
  }
  
  /**
   * 计算统计数据差异
   * @param {Object} currentStats - 当前统计数据
   * @param {Object} previousStats - 前一次统计数据
   * @returns {Object} 差异数据
   */
  calculateStatsDifferences(currentStats, previousStats) {
    const differences = {};
    
    const statFields = ['updated', 'failed', 'skipped', 'total'];
    for (const field of statFields) {
      if (currentStats[field] !== previousStats[field]) {
        differences[field] = {
          current: currentStats[field],
          previous: previousStats[field],
          delta: currentStats[field] - previousStats[field]
        };
      }
    }
    
    // 处理失败代码列表的差异
    if (currentStats.failedCodes && previousStats.failedCodes) {
      const addedFailures = currentStats.failedCodes.filter(code => 
        !previousStats.failedCodes.includes(code)
      );
      const removedFailures = previousStats.failedCodes.filter(code => 
        !currentStats.failedCodes.includes(code)
      );
      
      if (addedFailures.length > 0 || removedFailures.length > 0) {
        differences.failedCodes = {
          added: addedFailures,
          removed: removedFailures
        };
      }
    }
    
    return differences;
  }
  
  /**
   * 获取下一个备份版本号
   * @returns {string} 版本号
   */
  getNextBackupVersion() {
    const backups = this.getExistingBackups();
    if (backups.length === 0) {
      return 'v1.0.0';
    }
    
    const latestBackup = backups[backups.length - 1];
    const version = latestBackup.version || 'v1.0.0';
    
    // 简单的版本递增逻辑
    const versionParts = version.slice(1).split('.').map(Number);
    versionParts[2]++; // 修订号递增
    
    return `v${versionParts.join('.')}`;
  }
  
  /**
   * 获取现有的备份列表
   * @returns {Array} 备份列表
   */
  getExistingBackups() {
    if (!existsSync(this.incrementalBackupDir)) {
      return [];
    }
    
    try {
      const files = readdirSync(this.incrementalBackupDir)
        .filter(file => file.startsWith('incremental_') && file.endsWith('.json'))
        .map(file => {
          const filePath = join(this.incrementalBackupDir, file);
          const content = readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          
          return {
            file: file,
            path: filePath,
            version: data.backupMetadata?.version || 'v1.0.0',
            timestamp: data.backupMetadata?.timestamp || statSync(filePath).mtime.toISOString()
          };
        })
        .sort((a, b) => Number(new Date(a.timestamp)) - Number(new Date(b.timestamp)));
      
      return files;
    } catch (error) {
      logError('获取备份列表失败:', error);
      return [];
    }
  }
  
  /**
   * 清理旧的增量备份
   */
  async cleanupOldIncrementalBackups() {
    try {
      const backups = this.getExistingBackups();
      
      if (backups.length > this.maxIncrementalBackups) {
        const backupsToDelete = backups.slice(0, backups.length - this.maxIncrementalBackups);
        
        for (const backup of backupsToDelete) {
          unlinkSync(backup.path);
          log(`已清理旧增量备份: ${backup.file}`);
        }
      }
    } catch (error) {
      logWarning(`清理旧增量备份失败: ${error.message}`);
    }
  }
  
  /**
   * 从增量备份恢复数据
   * @param {string} targetVersion - 目标版本（可选）
   * @returns {Promise<Object>} 恢复的数据
   */
  async restoreFromBackup(targetVersion = null) {
    try {
      const backups = this.getExistingBackups();
      
      if (backups.length === 0) {
        throw new Error('没有可用的备份文件');
      }
      
      // 确定要恢复的备份
      let targetBackup;
      if (targetVersion) {
        targetBackup = backups.find(backup => backup.version === targetVersion);
        if (!targetBackup) {
          throw new Error(`找不到版本为 ${targetVersion} 的备份`);
        }
      } else {
        // 使用最新的备份
        targetBackup = backups[backups.length - 1];
      }
      
      log(`正在从备份恢复: ${targetBackup.file} (版本: ${targetBackup.version})`);
      
      // 读取备份数据
      const backupData = JSON.parse(readFileSync(targetBackup.path, 'utf8'));
      
      // 如果是增量备份，需要重建完整数据
      if (backupData.backupMetadata?.type === 'incremental') {
        return await this.reconstructFullData(backupData);
      }
      
      // 如果是全量备份，直接返回
      return backupData;
      
    } catch (error) {
      logError(`从备份恢复失败: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * 从增量备份重建完整数据
   * @param {Object} incrementalData - 增量备份数据
   * @returns {Promise<Object>} 完整数据
   */
  async reconstructFullData(incrementalData) {
    // 这里需要实现完整的数据重建逻辑
    // 由于时间关系，暂时返回增量数据本身
    // 实际实现应该遍历所有相关的增量备份来重建完整状态
    
    log('⚠️ 增量数据重建功能待实现，返回当前增量数据');
    return incrementalData;
  }
}

// 创建全局增量备份管理器实例
const incrementalBackupManager = new IncrementalBackupManager();

// 主函数
/**
 * 程序入口点，根据命令行参数执行不同的操作
 * 支持三种命令：
 * - stats: 显示当前处理统计信息
 * - update: 开始或继续更新PANTONE颜色HEX值（启动时自动检查并重试失败条目）
 * - retry: 重试之前更新失败的颜色条目
 * @returns {Promise<void>}
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const command = args[0] || 'update';
    
    if (command === 'stats') {
      // 显示统计信息
      await showStats();
      return;
    }
    
    if (command === 'update' || command === 'retry') {
      // 首先检查断点文件中是否有失败条目需要重试
      const checkpointData = await loadCheckpoint();
      if (checkpointData && checkpointData.stats && checkpointData.stats.failedCodes && checkpointData.stats.failedCodes.length > 0) {
        console.log(`检测到 ${checkpointData.stats.failedCodes.length} 个失败条目，开始集中重试...`);
        await retryFailedColors();
        
        // 如果是retry命令，重试完成后退出
        if (command === 'retry') {
          console.log('失败条目重试完成');
          return;
        }
      }
      
      // 更新颜色
      await updateColors();
      return;
    }
    
    console.log('用法: node update_hex.js [stats|update|retry]');
  } catch (error) {
    console.error('程序执行失败:', error);
    process.exit(1);
  }
}

// 重试失败条目的独立函数
/**
 * 专门用于重试之前更新失败的颜色条目
 * 该函数会从断点文件中加载失败列表，然后逐个重试这些条目
 * 重试成功后会从失败列表中移除，并更新统计信息
 * 每个条目仅重试一次，等待客户后续处理决定
 * 使用独立的浏览器会话，避免影响主处理流程
 */
 async function retryFailedColors() {
   log('=== 开始重试失败的颜色条目 ===');
   
   try {
     // 加载断点数据
     log('正在加载断点数据...');
     const checkpointData = await loadCheckpoint();
     
     if (!checkpointData) {
       log('未找到断点文件，请先运行更新命令');
       return;
     }
     
     if (!checkpointData.stats.failedCodes || checkpointData.stats.failedCodes.length === 0) {
       log('没有失败条目需要重试');
       return;
     }
     
     const failedCodes = [...checkpointData.stats.failedCodes]; // 复制失败列表
     log(`发现 ${failedCodes.length} 个失败条目需要重试`);
     
     // 启动浏览器（增强重试机制）
     let browser;
     let browserRetryCount = 0;
     const maxBrowserRetries = 3;
     
     log('正在启动浏览器...');
     while (browserRetryCount < maxBrowserRetries) {
       try {
         browser = await puppeteer.launch({
           executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
           headless: false,
           defaultViewport: null,
           args: [
             '--start-maximized',
             '--disable-infobars',
             '--disable-web-security'
           ]
         });
         log('✅ 浏览器启动成功');
         break;
       } catch (error) {
         browserRetryCount++;
         logError(`浏览器启动失败 (尝试 ${browserRetryCount}/${maxBrowserRetries}): ${error.message}`, error);
         if (browserRetryCount >= maxBrowserRetries) {
           logError('达到最大重试次数，退出程序', error);
           process.exit(1);
         }
         log(`等待 ${5000}ms 后重试...`);
         await new Promise(resolve => setTimeout(resolve, 5000));
         continue;
       }
     }
     
     try {
       if (!browser) {
         throw new Error('浏览器实例未成功创建');
       }
       
       log('正在创建新页面...');
       const page = await browser.newPage();
       log('✅ 新页面创建成功');
       
       log('正在配置页面设置...');
       await page.setDefaultTimeout(60000);
       await page.setDefaultNavigationTimeout(60000);
       await page.setViewport({ width: 1920, height: 1080 });
       await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
       log('✅ 页面配置完成');
       
       let retryCount = 0;
       let successCount = 0;
       
       log('\n=== 开始重试失败条目循环 ===');
       for (const code of failedCodes) {
         // 在updatedColors中查找对应的颜色对象
         const failedColor = checkpointData.updatedColors.find(c => c.code === code);
         if (!failedColor) {
           log(`未找到失败条目 ${code}，跳过重试`, 'WARN');
           continue;
         }
         
         retryCount++;
         log(`\n--- 重试条目 ${retryCount}/${failedCodes.length}: ${code} ${failedColor.name} ---`);
         
         // 使用updateSingleColor函数重试（仅重试一次）
         log('调用updateSingleColor函数重试...');
         const updatedColor = await updateSingleColor(page, failedColor, 1);
         
         // 检查是否成功更新
         if (updatedColor.hex && updatedColor.hex !== failedColor.hex) {
           // 更新成功，替换原来的颜色对象
           const index = checkpointData.updatedColors.findIndex(c => c.code === code);
           if (index > -1) {
             checkpointData.updatedColors[index] = updatedColor;
           }
           
           // 从失败列表中移除
           const failedIndex = checkpointData.stats.failedCodes.indexOf(code);
           if (failedIndex > -1) {
             checkpointData.stats.failedCodes.splice(failedIndex, 1);
           }
           
           // 更新统计信息
           checkpointData.stats.failed--;
           checkpointData.stats.updated++;
           
           // 添加到成功列表（如果不存在）
           if (!checkpointData.stats.successfulCodes) {
             checkpointData.stats.successfulCodes = [];
           }
           if (!checkpointData.stats.successfulCodes.includes(code)) {
             checkpointData.stats.successfulCodes.push(code);
           }
           
           successCount++;
          log(`✅ 重试成功: [${code}] ${failedColor.name} - HEX值: ${updatedColor.hex} (成功: ${successCount}/${retryCount})`);
         } else {
           log(`❌ 重试失败: ${code} 仍然无法更新，保留在失败列表中等待后续处理`, 'WARN');
         }
         
         // 每重试一个条目保存一次断点
         log('保存重试进度到断点文件...');
         await saveCheckpoint(checkpointData.currentIndex, checkpointData.updatedColors, checkpointData.stats);
         log('✅ 重试进度保存完成');
         
         // 添加延迟避免被封禁
         log(`等待 ${2000}ms 后处理下一个条目...`);
         await new Promise(resolve => setTimeout(resolve, 2000));
       }
       
       log('\n=== 重试失败条目循环完成 ===');
       log(`重试完成: 成功 ${successCount}/${retryCount} 个失败条目`);
       
       // 如果所有失败条目都重试成功了，生成最终报告
       if (successCount === retryCount && checkpointData.stats.failedCodes.length === 0) {
         log('所有失败条目已成功重试，生成最终报告...');
         await updateFinalResults(checkpointData.updatedColors, checkpointData.stats);
       }
       
     } finally {
       if (browser) {
         log('\n正在关闭浏览器...');
         await browser.close();
         log('✅ 浏览器已关闭');
       } else {
         log('浏览器实例未创建，无需关闭');
       }
     }
     
   } catch (error) {
     logError('❌ 重试失败条目时出错: ' + error.message, error);
     logError('错误堆栈: ' + error.stack, error);
   }
 }

// 显示统计信息函数
/**
 * 显示当前处理的统计信息，包括进度和失败列表
 * 该函数会从断点文件中读取统计数据，并以友好的格式展示
 * 帮助用户了解处理进度和问题所在
 */
 async function showStats() {
   try {
     const checkpointData = await loadCheckpoint();
     if (!checkpointData) {
       log('未找到断点文件，请先运行更新命令');
       return;
     }
     
     const stats = checkpointData.stats;
     const processedCount = stats.updated + stats.failed;
     const remainingCount = stats.total - processedCount;
     
     log('=== 统计信息 ===');
     log(`总颜色数: ${stats.total}`);
     log(`成功更新: ${stats.updated}`);
     log(`更新失败: ${stats.failed}`);
     log(`未处理颜色: ${remainingCount}`);
     log(`更新成功率: ${processedCount > 0 ? ((stats.updated / processedCount) * 100).toFixed(2) : '0.00'}%`);
     log(`总体进度: ${((processedCount / stats.total) * 100).toFixed(2)}%`);
     log(`失败色号数量: ${stats.failedCodes ? stats.failedCodes.length : 0}`);
     
     // 数据一致性检查
     const updatedColorsCount = checkpointData.updatedColors ? checkpointData.updatedColors.length : 0;
     const discrepancy = Math.abs(processedCount - updatedColorsCount);
     if (discrepancy > 0) {
       log(`⚠️ 警告: 统计数据与实际处理颜色数量不一致 (差异: ${discrepancy})`, 'WARN');
     }
     
     if (stats.failedCodes && stats.failedCodes.length > 0) {
       log('\n失败色号列表:');
       // 只显示前20个失败色号，避免输出过多
       const displayCount = Math.min(stats.failedCodes.length, 20);
       stats.failedCodes.slice(0, displayCount).forEach(code => log(`- ${code}`));
       if (stats.failedCodes.length > displayCount) {
         log(`... 还有 ${stats.failedCodes.length - displayCount} 个失败色号未显示`);
       }
     }
   } catch (error) {
     logError('显示统计信息时出错: ' + error, error);
   }
}

/**
 * 清理旧备份文件
 * @param {string} backupDir - 备份目录路径
 * @param {number} maxBackups - 最大保留备份数量
 */
async function cleanupOldBackups(backupDir, maxBackups = 10) {
  try {
    if (!existsSync(backupDir)) {
      return;
    }
    
    const files = readdirSync(backupDir)
      .filter(file => file.startsWith('checkpoint_backup_') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: join(backupDir, file),
        stats: statSync(join(backupDir, file))
      }))
      .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime()); // 按修改时间降序排序
    
    // 删除超过最大数量的旧备份
    if (files.length > maxBackups) {
      const filesToDelete = files.slice(maxBackups);
      for (const file of filesToDelete) {
        unlinkSync(file.path);
        log(`已清理旧备份: ${file.name}`);
      }
    }
  } catch (error) {
    logWarning(`清理旧备份失败: ${error.message}`);
  }
}

// 执行更新
/**
 * 程序执行入口点
 * 调用main函数开始执行程序，并捕获可能的错误
 */
main().catch(error => logError('程序执行出错: ' + error, error));