#!/usr/bin/env node
/**
 * OpenObserve定时备份脚本
 * 用于定期自动执行备份
 */

const { performFullBackup } = require('./backup-restore-strategy');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置参数
const CONFIG = {
    backupSchedule: '0 2 * * *', // 每天凌晨2点 (cron格式)
    backupDir: './backups',
    logFile: './backups/backup.log',
    maxLogSize: 10 * 1024 * 1024, // 10MB
    retentionDays: 30 // 保留30天的日志
};

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    // 控制台输出
    console.log(`${color}${logMessage}${colors.reset}`);
    
    // 文件输出
    try {
        fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
        
        // 检查日志文件大小，如果超过限制则轮转
        const stats = fs.statSync(CONFIG.logFile);
        if (stats.size > CONFIG.maxLogSize) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const rotatedLogFile = `${CONFIG.logFile}.${timestamp}`;
            fs.renameSync(CONFIG.logFile, rotatedLogFile);
        }
    } catch (error) {
        console.error(`写入日志文件失败: ${error.message}`);
    }
}

// 清理旧日志
function cleanupOldLogs() {
    try {
        const logDir = path.dirname(CONFIG.logFile);
        const logBaseName = path.basename(CONFIG.logFile);
        
        const logFiles = fs.readdirSync(logDir)
            .filter(file => file.startsWith(logBaseName) && file !== logBaseName)
            .map(file => {
                const filePath = path.join(logDir, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    path: filePath,
                    mtime: stats.mtime
                };
            })
            .sort((a, b) => b.mtime - a.mtime);
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - CONFIG.retentionDays);
        
        for (const logFile of logFiles) {
            if (logFile.mtime < cutoffDate) {
                fs.unlinkSync(logFile.path);
                log(`删除旧日志文件: ${logFile.name}`, colors.yellow);
            }
        }
    } catch (error) {
        log(`清理旧日志失败: ${error.message}`, colors.red);
    }
}

// 执行定时备份
async function runScheduledBackup() {
    log('=== 开始定时备份 ===', colors.cyan);
    
    try {
        const success = await performFullBackup();
        
        if (success) {
            log('✅ 定时备份成功完成', colors.green);
        } else {
            log('❌ 定时备份失败', colors.red);
        }
        
        // 清理旧日志
        cleanupOldLogs();
        
        return success;
    } catch (error) {
        log(`❌ 定时备份执行失败: ${error.message}`, colors.red);
        return false;
    }
}

// 创建Windows计划任务
function createWindowsScheduledTask() {
    log('创建Windows计划任务...', colors.blue);
    
    try {
        const scriptPath = path.resolve(__filename);
        const taskName = 'OpenObserveDailyBackup';
        
        // 删除现有任务（如果存在）
        try {
            execSync(`schtasks /delete /tn "${taskName}" /f`, { stdio: 'ignore' });
        } catch (error) {
            // 任务可能不存在，忽略错误
        }
        
        // 创建新任务
        const command = `schtasks /create /tn "${taskName}" /tr "node \\"${scriptPath}\\"" /sc daily /st 02:00 /ru SYSTEM /f`;
        execSync(command, { stdio: 'inherit' });
        
        log(`✅ Windows计划任务创建成功: ${taskName}`, colors.green);
        log('任务将在每天凌晨2点自动执行备份', colors.blue);
        
        return true;
    } catch (error) {
        log(`❌ 创建Windows计划任务失败: ${error.message}`, colors.red);
        return false;
    }
}

// 删除Windows计划任务
function deleteWindowsScheduledTask() {
    log('删除Windows计划任务...', colors.blue);
    
    try {
        const taskName = 'OpenObserveDailyBackup';
        execSync(`schtasks /delete /tn "${taskName}" /f`, { stdio: 'inherit' });
        
        log(`✅ Windows计划任务删除成功: ${taskName}`, colors.green);
        return true;
    } catch (error) {
        log(`❌ 删除Windows计划任务失败: ${error.message}`, colors.red);
        return false;
    }
}

// 主函数
async function main() {
    const command = process.argv[2];
    
    switch (command) {
        case 'run':
            await runScheduledBackup();
            break;
            
        case 'install':
            createWindowsScheduledTask();
            break;
            
        case 'uninstall':
            deleteWindowsScheduledTask();
            break;
            
        default:
            log('OpenObserve定时备份脚本', colors.cyan);
            log('');
            log('用法:', colors.blue);
            log('  node scheduled-backup.js run        # 执行一次备份');
            log('  node scheduled-backup.js install    # 安装计划任务');
            log('  node scheduled-backup.js uninstall  # 卸载计划任务');
            log('');
            log('说明:', colors.blue);
            log('  - 安装计划任务后，系统将在每天凌晨2点自动执行备份');
            log('  - 备份日志将保存到 ./backups/backup.log');
            log('  - 日志文件超过10MB将自动轮转，保留30天');
            break;
    }
}

// 执行主函数
if (require.main === module) {
    main().catch(error => {
        log(`执行失败: ${error.message}`, colors.red);
        process.exit(1);
    });
}

module.exports = {
    runScheduledBackup,
    createWindowsScheduledTask,
    deleteWindowsScheduledTask,
    CONFIG
};