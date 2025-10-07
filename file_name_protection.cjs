// 作者：AI Assistant
// 时间：2025-09-26 13:45:00
// 用途：提供安全的文件操作功能，包括文件名/路径安全检查、安全文件写入/追加/创建/JSON写入、文件操作监控及不安全文件清理
// 依赖文件：无（仅依赖Node.js内置的fs和path模块）

const fs = require('fs');
const path = require('path');

/**
 * 安全的文件名正则表达式
 * - 允许字母、数字、下划线、连字符、点、空格
 * - 允许一些常用特殊字符：括号、中括号、逗号、@、#、$、%、&、+、=、^、`、~
 * - 不允许危险字符如引号、反斜杠、斜杠、星号、问号、冒号、分号、尖括号、竖线
 * - 不允许文件名过长（最大255个字符）
 * - 不允许以点开头或结尾（隐藏文件）
 * - 不允许连续多个点
 */
const SAFE_FILENAME_REGEX = /^(?!.*\.{2,})[a-zA-Z0-9_\-\. \(\)\[\]\,\@\#\$\%\&\+\=\^\`\~]{1,255}$/;
const HIDDEN_FILE_REGEX = /^\./;
const END_WITH_DOT_REGEX = /\.$/;

/**
 * 检查文件名是否安全
 * @param {string} filename - 要检查的文件名
 * @returns {boolean} - 如果文件名安全返回true，否则返回false
 */
function isSafeFilename(filename) {
    // 去除路径，只检查文件名
    const basename = path.basename(filename);
    
    // 检查基本文件名规则
    if (!SAFE_FILENAME_REGEX.test(basename)) {
        return false;
    }
    
    // 检查是否为隐藏文件（以点开头）
    if (HIDDEN_FILE_REGEX.test(basename)) {
        return false;
    }
    
    // 检查是否以点结尾
    if (END_WITH_DOT_REGEX.test(basename)) {
        return false;
    }
    
    return true;
}

/**
 * 检查文件路径中的每个部分是否都安全
 * @param {string} fullPath - 要检查的完整路径
 * @returns {boolean} - 如果路径安全返回true，否则返回false
 */
function isSafePath(fullPath) {
    // 规范化路径，确保跨平台一致性
    const normalizedPath = path.normalize(fullPath);
    
    // 分割路径为各个部分
    const parts = normalizedPath.split(path.sep);
    
    // 检查每个路径部分
    for (const part of parts) {
        // 跳过空字符串、当前目录(.)和父目录(..)标识符
        if (part && part !== '.' && part !== '..') {
            // 检查路径部分是否符合安全文件名规则
            if (!isSafeFilename(part)) {
                return false;
            }
        }
    }
    return true;
}

/**
 * 确保目录存在，如果不存在则创建
 * @param {string} dirPath - 目录路径
 * @returns {Promise<void>} - 创建完成的Promise
 */
async function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        // 检查目录路径的安全性，防止在创建过程中出现不安全路径
        const dirParts = dirPath.split(path.sep);
        for (let i = 1; i <= dirParts.length; i++) {
            const partialDir = dirParts.slice(0, i).join(path.sep);
            if (partialDir && !isSafePath(partialDir)) {
                monitorFileOperation(partialDir, 'mkdir');
                throw new Error(`不安全的目录路径: ${partialDir}`);
            }
        }
        
        try {
            // 使用异步API创建目录
            await fs.promises.mkdir(dirPath, { recursive: true });
        } catch (error) {
            throw new Error(`创建目录失败: ${error.message}`);
        }
    }
}

/**
 * 安全的文件写入函数
 * @param {string} filePath - 文件路径
 * @param {string} content - 文件内容
 * @param {object} options - 写入选项
 * @returns {Promise<void>} - 写入完成的Promise
 */
async function safeWriteFile(filePath, content, options = {}) {
    // 规范化路径，确保跨平台一致性
    const normalizedPath = path.normalize(filePath);
    
    // 检查路径安全性
    if (!isSafePath(normalizedPath)) {
        // 记录不安全的文件操作
        monitorFileOperation(normalizedPath, 'write');
        throw new Error(`不安全的文件路径: ${normalizedPath}`);
    }
    
    // 确保目录存在
    const dir = path.dirname(normalizedPath);
    await ensureDirectoryExists(dir);
    
    return fs.promises.writeFile(normalizedPath, content, options);
}

/**
 * 安全的文件追加函数
 * @param {string} filePath - 文件路径
 * @param {string} content - 要追加的内容
 * @param {object} options - 追加选项
 * @returns {Promise<void>} - 追加完成的Promise
 */
async function safeAppendFile(filePath, content, options = {}) {
    // 规范化路径，确保跨平台一致性
    const normalizedPath = path.normalize(filePath);
    
    if (!isSafePath(normalizedPath)) {
        throw new Error(`不安全的文件路径: ${normalizedPath}`);
    }
    
    // 确保目录存在
    const dir = path.dirname(normalizedPath);
    await ensureDirectoryExists(dir);
    
    return fs.promises.appendFile(normalizedPath, content, options);
}

/**
 * 安全的文件创建函数
 * @param {string} filePath - 文件路径
 * @returns {Promise<void>} - 创建完成的Promise
 */
async function safeCreateFile(filePath) {
    // 规范化路径，确保跨平台一致性
    const normalizedPath = path.normalize(filePath);
    
    if (!isSafePath(normalizedPath)) {
        throw new Error(`不安全的文件路径: ${normalizedPath}`);
    }
    
    // 确保目录存在
    const dir = path.dirname(normalizedPath);
    await ensureDirectoryExists(dir);
    
    // 创建空文件，使用独占模式防止覆盖现有文件
    return fs.promises.writeFile(normalizedPath, '', { flag: 'wx' });
}

/**
 * 安全的JSON文件写入函数
 * @param {string} filePath - 文件路径
 * @param {any} data - 要写入的JSON数据
 * @returns {Promise<void>} - 写入完成的Promise
 */
async function safeWriteJsonFile(filePath, data) {
    // 规范化路径，确保跨平台一致性
    const normalizedPath = path.normalize(filePath);
    
    if (!isSafePath(normalizedPath)) {
        throw new Error(`不安全的文件路径: ${normalizedPath}`);
    }
    
    // 确保目录存在
    const dir = path.dirname(normalizedPath);
    await ensureDirectoryExists(dir);
    
    return fs.promises.writeFile(normalizedPath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * 监控文件操作，记录潜在的不安全文件名
 * @param {string} filePath - 被尝试操作的文件路径
 * @param {string} operation - 操作类型（write, append, create等）
 * @returns {Promise<void>} - 记录完成的Promise
 */
async function monitorFileOperation(filePath, operation) {
    const timestamp = new Date().toISOString();
    const isSafe = isSafePath(filePath);
    
    if (!isSafe) {
        const logMessage = `[${timestamp}] 阻止了不安全的文件操作: ${operation} - 路径: ${filePath}\n`;
        
        try {
            // 将安全事件记录到日志文件
            const logFilePath = path.join(__dirname, 'file_security.log');
            const logDir = path.dirname(logFilePath);
            await ensureDirectoryExists(logDir);
            await fs.promises.appendFile(logFilePath, logMessage, 'utf8');
        } catch (err) {
            // 如果日志写入失败，输出到控制台
            console.error('安全日志记录失败:', err);
        }
        
        console.warn(`⚠️  安全警告: 尝试使用不安全的文件路径进行${operation}操作: ${filePath}`);
    }
}

/**
 * 清理工作区中的不安全文件
 * @param {string} workspacePath - 工作区路径
 * @returns {Promise<{removed: string[], errors: string[]}>} - 清理结果
 */
async function cleanUnsafeFiles(workspacePath) {
    const result = {
        removed: [],
        errors: []
    };
    
    try {
        // 检查工作区路径是否存在
        if (!fs.existsSync(workspacePath)) {
            result.errors.push(`工作区路径不存在: ${workspacePath}`);
            return result;
        }
        
        // 读取目录内容
        const items = await fs.promises.readdir(workspacePath, { withFileTypes: true });
        
        // 处理每个文件和目录
        for (const item of items) {
            const itemPath = path.join(workspacePath, item.name);
            
            if (item.isDirectory()) {
                // 递归处理子目录
                const subResult = await cleanUnsafeFiles(itemPath);
                result.removed.push(...subResult.removed);
                result.errors.push(...subResult.errors);
            } else if (item.isFile()) {
                // 检查文件名是否安全
                if (!isSafeFilename(item.name)) {
                    try {
                        await fs.promises.unlink(itemPath);
                        result.removed.push(itemPath);
                        console.log(`已删除不安全文件: ${itemPath}`);
                    } catch (error) {
                        result.errors.push(`删除文件失败 ${itemPath}: ${error.message}`);
                    }
                }
            }
        }
    } catch (error) {
        result.errors.push(`清理工作区失败: ${error.message}`);
    }
    
    return result;
}

// 导出所有函数
exports.isSafeFilename = isSafeFilename;
exports.isSafePath = isSafePath;
exports.safeWriteFile = safeWriteFile;
exports.safeAppendFile = safeAppendFile;
exports.safeCreateFile = safeCreateFile;
exports.safeWriteJsonFile = safeWriteJsonFile;
exports.monitorFileOperation = monitorFileOperation;
exports.cleanUnsafeFiles = cleanUnsafeFiles;

// 如果直接运行此脚本，则执行清理工作
if (require.main === module) {
    (async () => {
        console.log('开始清理工作区中的不安全文件名文件...');
        const workspaceDir = process.argv[2] || __dirname;
        const result = await cleanUnsafeFiles(workspaceDir);
        console.log(`清理完成，共清理了 ${result.removed.length} 个不安全文件。`);
        if (result.errors.length > 0) {
            console.log(`清理过程中发生 ${result.errors.length} 个错误。`);
        }
    })();
}