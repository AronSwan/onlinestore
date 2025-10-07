#!/usr/bin/env node
/**
 * OpenObserve备份和恢复策略脚本
 * 用于自动化备份OpenObserve数据和配置
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');

// 配置参数
const CONFIG = {
    openobserveUrl: 'http://localhost:5080',
    username: 'admin@example.com',
    password: 'ComplexPass#123',
    organization: 'default',
    backupDir: './backups',
    maxBackups: 7, // 保留最近7天的备份
    compressionEnabled: true,
    includeConfig: true,
    includeData: true,
    includeMetadata: true
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
    console.log(`${color}${message}${colors.reset}`);
}

// 创建带基础认证的axios实例
const apiClient = axios.create({
    baseURL: CONFIG.openobserveUrl,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
    auth: {
        username: CONFIG.username,
        password: CONFIG.password
    }
});

// 确保备份目录存在
function ensureBackupDir() {
    if (!fs.existsSync(CONFIG.backupDir)) {
        fs.mkdirSync(CONFIG.backupDir, { recursive: true });
        log(`创建备份目录: ${CONFIG.backupDir}`, colors.blue);
    }
}

// 生成备份文件名
function generateBackupName(type) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${type}-backup-${timestamp}`;
}

// 获取Docker卷路径
function getDockerVolumePath(volumeName) {
    try {
        const result = execSync(`docker volume inspect ${volumeName} --format "{{ .Mountpoint }}"`, { encoding: 'utf8' });
        return result.trim();
    } catch (error) {
        log(`无法获取Docker卷路径: ${error.message}`, colors.red);
        return null;
    }
}

// 备份OpenObserve配置
async function backupConfig(backupName) {
    log('备份OpenObserve配置...', colors.blue);
    
    try {
        // 1. 备份环境变量
        const envBackup = {
            timestamp: new Date().toISOString(),
            container: 'shopping-openobserve',
            env: {}
        };
        
        // 获取容器环境变量
        try {
            const envResult = execSync('docker inspect shopping-openobserve --format "{{json .Config.Env}}"', { encoding: 'utf8' });
            envBackup.env = JSON.parse(envResult);
        } catch (error) {
            log(`获取环境变量失败: ${error.message}`, colors.yellow);
        }
        
        // 2. 备份配置文件
        const configDir = path.join(CONFIG.backupDir, backupName, 'config');
        fs.mkdirSync(configDir, { recursive: true });
        
        // 保存环境变量
        fs.writeFileSync(
            path.join(configDir, 'environment.json'),
            JSON.stringify(envBackup, null, 2)
        );
        
        // 3. 备份Docker Compose配置
        try {
            if (process.platform === 'win32') {
                execSync(`copy docker-compose.openobserve.yml "${path.join(configDir, 'docker-compose.yml')}"`, { stdio: 'inherit' });
            } else {
                execSync(`cp docker-compose.openobserve.yml ${path.join(configDir, 'docker-compose.yml')}`, { stdio: 'inherit' });
            }
        } catch (error) {
            log(`复制Docker Compose配置失败: ${error.message}`, colors.yellow);
        }
        
        // 4. 备份OpenObserve内部配置
        try {
            const streamsResponse = await apiClient.get(`/api/${CONFIG.organization}/streams`);
            fs.writeFileSync(
                path.join(configDir, 'streams.json'),
                JSON.stringify(streamsResponse.data, null, 2)
            );
            
            // 备份用户配置
            try {
                const usersResponse = await apiClient.get(`/api/${CONFIG.organization}/users`);
                fs.writeFileSync(
                    path.join(configDir, 'users.json'),
                    JSON.stringify(usersResponse.data, null, 2)
                );
            } catch (error) {
                log(`备份用户配置失败: ${error.message}`, colors.yellow);
            }
            
            // 备份角色配置
            try {
                const rolesResponse = await apiClient.get(`/api/${CONFIG.organization}/roles`);
                fs.writeFileSync(
                    path.join(configDir, 'roles.json'),
                    JSON.stringify(rolesResponse.data, null, 2)
                );
            } catch (error) {
                log(`备份角色配置失败: ${error.message}`, colors.yellow);
            }
        } catch (error) {
            log(`备份OpenObserve内部配置失败: ${error.message}`, colors.yellow);
        }
        
        log('✅ 配置备份完成', colors.green);
        return true;
    } catch (error) {
        log(`❌ 配置备份失败: ${error.message}`, colors.red);
        return false;
    }
}

// 备份OpenObserve数据
async function backupData(backupName) {
    log('备份OpenObserve数据...', colors.blue);
    
    try {
        const dataDir = path.join(CONFIG.backupDir, backupName, 'data');
        fs.mkdirSync(dataDir, { recursive: true });
        
        // 1. 备份Docker卷
        const volumes = [
            'caddy-style-shopping-site_openobserve_data',
            'caddy-style-shopping-site_openobserve_meta',
            'caddy-style-shopping-site_openobserve_files'
        ];
        
        for (const volume of volumes) {
            log(`备份Docker卷: ${volume}`, colors.blue);
            
            try {
                const volumePath = getDockerVolumePath(volume);
                if (volumePath) {
                    const destPath = path.join(dataDir, path.basename(volume));
                    fs.mkdirSync(destPath, { recursive: true });
                    
                    // 使用rsync或cp复制数据
                    if (process.platform === 'win32') {
                        execSync(`xcopy "${volumePath}\\*" "${destPath}\\" /E /I /H /Y`, { stdio: 'inherit' });
                    } else {
                        execSync(`rsync -av "${volumePath}/" "${destPath}/"`, { stdio: 'inherit' });
                    }
                    
                    log(`✅ 卷 ${volume} 备份完成`, colors.green);
                }
            } catch (error) {
                log(`❌ 卷 ${volume} 备份失败: ${error.message}`, colors.red);
            }
        }
        
        // 2. 导出流数据
        log('导出流数据...', colors.blue);
        try {
            const streamsResponse = await apiClient.get(`/api/${CONFIG.organization}/streams`);
            const streams = streamsResponse.data.list || [];
            
            for (const stream of streams) {
                log(`导出流数据: ${stream.name}`, colors.blue);
                
                try {
                    // 获取流中的所有数据
                    const exportResponse = await apiClient.post(`/api/${CONFIG.organization}/${stream.name}/_export`, {
                        start_time: new Date(Date.now() - 86400000 * 30).toISOString(), // 30天前
                        end_time: new Date().toISOString(),
                        format: 'json'
                    });
                    
                    if (exportResponse.data && exportResponse.data.hits) {
                        fs.writeFileSync(
                            path.join(dataDir, `${stream.name}-export.json`),
                            JSON.stringify(exportResponse.data.hits, null, 2)
                        );
                        
                        log(`✅ 流 ${stream.name} 数据导出完成 (${exportResponse.data.hits.length} 条记录)`, colors.green);
                    }
                } catch (error) {
                    log(`❌ 流 ${stream.name} 数据导出失败: ${error.message}`, colors.red);
                }
            }
        } catch (error) {
            log(`❌ 获取流列表失败: ${error.message}`, colors.red);
        }
        
        log('✅ 数据备份完成', colors.green);
        return true;
    } catch (error) {
        log(`❌ 数据备份失败: ${error.message}`, colors.red);
        return false;
    }
}

// 压缩备份
function compressBackup(backupName) {
    if (!CONFIG.compressionEnabled) {
        return true;
    }
    
    log(`压缩备份: ${backupName}`, colors.blue);
    
    try {
        const backupPath = path.join(CONFIG.backupDir, backupName);
        const archivePath = path.join(CONFIG.backupDir, `${backupName}.tar.gz`);
        
        if (process.platform === 'win32') {
            // Windows上使用tar命令
            execSync(`tar -czf "${archivePath}" -C "${CONFIG.backupDir}" "${backupName}"`, { stdio: 'inherit' });
        } else {
            // Linux/Mac上使用tar命令
            execSync(`tar -czf "${archivePath}" -C "${CONFIG.backupDir}" "${backupName}"`, { stdio: 'inherit' });
        }
        
        // 删除原始备份目录
        fs.rmSync(backupPath, { recursive: true, force: true });
        
        log(`✅ 备份压缩完成: ${archivePath}`, colors.green);
        return true;
    } catch (error) {
        log(`❌ 备份压缩失败: ${error.message}`, colors.red);
        return false;
    }
}

// 清理旧备份
function cleanupOldBackups() {
    log('清理旧备份...', colors.blue);
    
    try {
        const backupFiles = fs.readdirSync(CONFIG.backupDir)
            .filter(file => file.includes('backup-'))
            .map(file => ({
                name: file,
                path: path.join(CONFIG.backupDir, file),
                stat: fs.statSync(path.join(CONFIG.backupDir, file))
            }))
            .sort((a, b) => b.stat.mtime - a.stat.mtime);
        
        if (backupFiles.length > CONFIG.maxBackups) {
            const filesToDelete = backupFiles.slice(CONFIG.maxBackups);
            
            for (const file of filesToDelete) {
                fs.rmSync(file.path, { recursive: true, force: true });
                log(`删除旧备份: ${file.name}`, colors.yellow);
            }
        }
        
        log('✅ 旧备份清理完成', colors.green);
        return true;
    } catch (error) {
        log(`❌ 清理旧备份失败: ${error.message}`, colors.red);
        return false;
    }
}

// 执行完整备份
async function performFullBackup() {
    log('=== OpenObserve完整备份 ===', colors.cyan);
    log(`备份目标: ${CONFIG.openobserveUrl}`);
    log(`组织: ${CONFIG.organization}`);
    log(`备份目录: ${CONFIG.backupDir}`);
    log('');
    
    ensureBackupDir();
    
    const backupName = generateBackupName('full');
    log(`创建备份: ${backupName}`, colors.blue);
    
    const results = [];
    
    // 1. 备份配置
    if (CONFIG.includeConfig) {
        results.push(await backupConfig(backupName));
    }
    
    // 2. 备份数据
    if (CONFIG.includeData) {
        results.push(await backupData(backupName));
    }
    
    // 3. 压缩备份
    if (CONFIG.compressionEnabled) {
        results.push(compressBackup(backupName));
    }
    
    // 4. 清理旧备份
    results.push(cleanupOldBackups());
    
    // 5. 生成备份报告
    const backupReport = {
        timestamp: new Date().toISOString(),
        backupName,
        config: CONFIG,
        results: {
            configBackup: results[0] || false,
            dataBackup: results[1] || false,
            compression: results[2] || false,
            cleanup: results[results.length - 1] || false
        },
        success: results.every(r => r)
    };
    
    const reportPath = path.join(CONFIG.backupDir, `${backupName}-report.json`);
    fs.writeFileSync(reportPath, JSON.stringify(backupReport, null, 2));
    
    // 最终评估
    log('\n=== 备份结果 ===', colors.cyan);
    if (backupReport.success) {
        log('🎉 完整备份成功！', colors.green);
        log(`备份报告: ${reportPath}`, colors.blue);
    } else {
        log('❌ 部分备份失败', colors.red);
        log(`备份报告: ${reportPath}`, colors.blue);
    }
    
    return backupReport.success;
}

// 恢复配置
async function restoreConfig(backupName) {
    log('恢复OpenObserve配置...', colors.blue);
    
    try {
        const configDir = path.join(CONFIG.backupDir, backupName, 'config');
        
        if (!fs.existsSync(configDir)) {
            log(`❌ 配置备份目录不存在: ${configDir}`, colors.red);
            return false;
        }
        
        // 1. 恢复Docker Compose配置
        const composeFile = path.join(configDir, 'docker-compose.yml');
        if (fs.existsSync(composeFile)) {
            if (process.platform === 'win32') {
                execSync(`copy "${composeFile}" docker-compose.openobserve.yml`, { stdio: 'inherit' });
            } else {
                execSync(`cp "${composeFile}" docker-compose.openobserve.yml`, { stdio: 'inherit' });
            }
            log('✅ Docker Compose配置恢复完成', colors.green);
        }
        
        // 2. 恢复流配置
        const streamsFile = path.join(configDir, 'streams.json');
        if (fs.existsSync(streamsFile)) {
            const streamsData = JSON.parse(fs.readFileSync(streamsFile, 'utf8'));
            
            for (const stream of streamsData.list || []) {
                try {
                    await apiClient.post(`/api/${CONFIG.organization}/streams`, {
                        name: stream.name,
                        stream_type: stream.stream_type
                    });
                    log(`✅ 流 ${stream.name} 恢复完成`, colors.green);
                } catch (error) {
                    log(`❌ 流 ${stream.name} 恢复失败: ${error.message}`, colors.red);
                }
            }
        }
        
        log('✅ 配置恢复完成', colors.green);
        return true;
    } catch (error) {
        log(`❌ 配置恢复失败: ${error.message}`, colors.red);
        return false;
    }
}

// 恢复数据
async function restoreData(backupName) {
    log('恢复OpenObserve数据...', colors.blue);
    
    try {
        const dataDir = path.join(CONFIG.backupDir, backupName, 'data');
        
        if (!fs.existsSync(dataDir)) {
            log(`❌ 数据备份目录不存在: ${dataDir}`, colors.red);
            return false;
        }
        
        // 1. 恢复Docker卷
        const volumes = [
            'caddy-style-shopping-site_openobserve_data',
            'caddy-style-shopping-site_openobserve_meta',
            'caddy-style-shopping-site_openobserve_files'
        ];
        
        for (const volume of volumes) {
            log(`恢复Docker卷: ${volume}`, colors.blue);
            
            try {
                const volumePath = getDockerVolumePath(volume);
                if (volumePath) {
                    const sourcePath = path.join(dataDir, path.basename(volume));
                    
                    if (fs.existsSync(sourcePath)) {
                        // 停止OpenObserve容器
                        execSync('docker-compose -f docker-compose.openobserve.yml stop openobserve', { stdio: 'inherit' });
                        
                        // 恢复数据
                        if (process.platform === 'win32') {
                            execSync(`xcopy "${sourcePath}\\*" "${volumePath}\\" /E /I /H /Y`, { stdio: 'inherit' });
                        } else {
                            execSync(`rsync -av "${sourcePath}/" "${volumePath}/"`, { stdio: 'inherit' });
                        }
                        
                        // 重启OpenObserve容器
                        execSync('docker-compose -f docker-compose.openobserve.yml start openobserve', { stdio: 'inherit' });
                        
                        log(`✅ 卷 ${volume} 恢复完成`, colors.green);
                    }
                }
            } catch (error) {
                log(`❌ 卷 ${volume} 恢复失败: ${error.message}`, colors.red);
            }
        }
        
        log('✅ 数据恢复完成', colors.green);
        return true;
    } catch (error) {
        log(`❌ 数据恢复失败: ${error.message}`, colors.red);
        return false;
    }
}

// 列出可用备份
function listBackups() {
    log('=== 可用备份列表 ===', colors.cyan);
    
    try {
        const backupFiles = fs.readdirSync(CONFIG.backupDir)
            .filter(file => file.includes('backup-'))
            .map(file => {
                const filePath = path.join(CONFIG.backupDir, file);
                const stat = fs.statSync(filePath);
                return {
                    name: file,
                    path: filePath,
                    size: stat.size,
                    modified: stat.mtime,
                    isCompressed: file.endsWith('.tar.gz')
                };
            })
            .sort((a, b) => b.modified - a.modified);
        
        if (backupFiles.length === 0) {
            log('没有找到备份文件', colors.yellow);
            return [];
        }
        
        backupFiles.forEach((backup, index) => {
            const size = backup.isCompressed ? 
                `${(backup.size / 1024 / 1024).toFixed(2)}MB` : 
                `${(backup.size / 1024).toFixed(2)}KB`;
            
            log(`${index + 1}. ${backup.name}`, colors.blue);
            log(`   大小: ${size}`, colors.cyan);
            log(`   修改时间: ${backup.modified.toLocaleString()}`, colors.cyan);
            log(`   类型: ${backup.isCompressed ? '压缩' : '目录'}`, colors.cyan);
            log('');
        });
        
        return backupFiles;
    } catch (error) {
        log(`❌ 列出备份失败: ${error.message}`, colors.red);
        return [];
    }
}

// 主函数
async function main() {
    const command = process.argv[2];
    const backupName = process.argv[3];
    
    switch (command) {
        case 'backup':
            await performFullBackup();
            break;
            
        case 'restore':
            if (!backupName) {
                log('请指定备份名称', colors.red);
                log('用法: node backup-restore-strategy.js restore <backup-name>', colors.yellow);
                process.exit(1);
            }
            
            // 如果是压缩备份，先解压
            if (backupName.endsWith('.tar.gz')) {
                const extractDir = backupName.replace('.tar.gz', '');
                const extractPath = path.join(CONFIG.backupDir, extractDir);
                
                if (!fs.existsSync(extractPath)) {
                    log(`解压备份: ${backupName}`, colors.blue);
                    execSync(`tar -xzf "${path.join(CONFIG.backupDir, backupName)}" -C "${CONFIG.backupDir}"`, { stdio: 'inherit' });
                }
                
                await restoreConfig(extractDir);
                await restoreData(extractDir);
            } else {
                await restoreConfig(backupName);
                await restoreData(backupName);
            }
            break;
            
        case 'list':
            listBackups();
            break;
            
        default:
            log('OpenObserve备份和恢复策略', colors.cyan);
            log('');
            log('用法:', colors.blue);
            log('  node backup-restore-strategy.js backup                    # 执行完整备份');
            log('  node backup-restore-strategy.js restore <backup-name>    # 恢复指定备份');
            log('  node backup-restore-strategy.js list                      # 列出可用备份');
            log('');
            log('示例:', colors.blue);
            log('  node backup-restore-strategy.js backup');
            log('  node backup-restore-strategy.js restore full-backup-2025-10-07T04-10-00-000Z');
            log('  node backup-restore-strategy.js list');
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
    performFullBackup,
    restoreConfig,
    restoreData,
    listBackups,
    CONFIG
};