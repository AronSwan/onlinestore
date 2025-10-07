#!/usr/bin/env node

/**
 * 文档同步守护进程
 * 持续监控并同步后端文档系统与 Paperless-NGX
 */

const DocsIntegration = require('./docs-paperless-integration');
const PaperlessMonitor = require('./paperless-monitor');
const fs = require('fs');
const path = require('path');

class DocsSyncDaemon {
    constructor() {
        this.integration = new DocsIntegration();
        this.monitor = new PaperlessMonitor();
        this.isRunning = false;
        this.syncInterval = 5 * 60 * 1000; // 5分钟
        this.healthCheckInterval = 2 * 60 * 1000; // 2分钟
        this.logFile = path.join(__dirname, '..', 'logs', 'docs-sync-daemon.log');
        
        this.stats = {
            startTime: new Date(),
            documentsProcessed: 0,
            errorsCount: 0,
            lastSync: null,
            lastHealthCheck: null
        };
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [DAEMON] [${level}] ${message}\n`;
        
        console.log(logMessage.trim());
        fs.appendFileSync(this.logFile, logMessage);
    }

    async start() {
        if (this.isRunning) {
            this.log('守护进程已在运行中');
            return;
        }

        this.isRunning = true;
        this.log('启动文档同步守护进程');

        // 初始化检查
        await this.initialCheck();

        // 启动文档监控
        this.watcher = this.integration.startWatching();

        // 启动定期同步
        this.syncTimer = setInterval(() => {
            this.performSync();
        }, this.syncInterval);

        // 启动健康检查
        this.healthTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.healthCheckInterval);

        // 处理进程信号
        process.on('SIGINT', () => this.stop());
        process.on('SIGTERM', () => this.stop());

        this.log('文档同步守护进程已启动');
        this.log(`同步间隔: ${this.syncInterval / 1000}秒`);
        this.log(`健康检查间隔: ${this.healthCheckInterval / 1000}秒`);
    }

    async stop() {
        if (!this.isRunning) {
            return;
        }

        this.log('停止文档同步守护进程');
        this.isRunning = false;

        // 清理定时器
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }
        if (this.healthTimer) {
            clearInterval(this.healthTimer);
        }

        // 停止文档监控
        if (this.watcher) {
            await this.watcher.close();
        }

        // 生成最终报告
        await this.generateFinalReport();

        this.log('文档同步守护进程已停止');
        process.exit(0);
    }

    async initialCheck() {
        this.log('执行初始化检查');

        try {
            // 检查 Paperless-NGX 状态
            const status = await this.integration.checkPaperlessStatus();
            if (!status.running) {
                this.log('Paperless-NGX 未运行，尝试启动...', 'WARN');
                // 这里可以添加自动启动逻辑
            }

            // 生成初始文档报告
            await this.integration.generateReport();

            this.log('初始化检查完成');
        } catch (error) {
            this.log(`初始化检查失败: ${error.message}`, 'ERROR');
            this.stats.errorsCount++;
        }
    }

    async performSync() {
        if (!this.isRunning) return;

        this.log('执行定期同步');
        this.stats.lastSync = new Date();

        try {
            // 扫描新文档
            const documents = this.integration.scanDocuments();
            this.log(`发现 ${documents.length} 个文档文件`);

            // 检查是否有新文档需要导入
            const newDocuments = await this.findNewDocuments(documents);
            
            if (newDocuments.length > 0) {
                this.log(`发现 ${newDocuments.length} 个新文档，开始导入`);
                
                for (const doc of newDocuments) {
                    const result = await this.integration.importDocument(doc);
                    if (result.success) {
                        this.stats.documentsProcessed++;
                    } else {
                        this.stats.errorsCount++;
                    }
                }
            } else {
                this.log('没有发现新文档');
            }

        } catch (error) {
            this.log(`同步失败: ${error.message}`, 'ERROR');
            this.stats.errorsCount++;
        }
    }

    async findNewDocuments(documents) {
        // 这里可以实现更复杂的逻辑来判断哪些文档是新的
        // 目前简化为检查修改时间
        const cutoffTime = new Date(Date.now() - this.syncInterval);
        
        return documents.filter(doc => doc.modified > cutoffTime);
    }

    async performHealthCheck() {
        if (!this.isRunning) return;

        this.stats.lastHealthCheck = new Date();

        try {
            // 检查 Paperless-NGX 健康状态
            const healthy = await this.monitor.runHealthCheck();
            
            if (!healthy) {
                this.log('Paperless-NGX 健康检查失败', 'WARN');
                this.stats.errorsCount++;
            }

            // 检查文档目录状态
            await this.checkDocumentDirectories();

        } catch (error) {
            this.log(`健康检查失败: ${error.message}`, 'ERROR');
            this.stats.errorsCount++;
        }
    }

    async checkDocumentDirectories() {
        const dirs = [
            this.integration.consumeDir,
            this.integration.docsDir
        ];

        for (const dir of dirs) {
            if (!fs.existsSync(dir)) {
                this.log(`目录不存在: ${dir}`, 'ERROR');
                this.stats.errorsCount++;
            }
        }
    }

    async generateStatusReport() {
        const uptime = Date.now() - this.stats.startTime.getTime();
        const uptimeHours = Math.floor(uptime / (1000 * 60 * 60));
        const uptimeMinutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

        const report = {
            daemon: {
                status: this.isRunning ? 'running' : 'stopped',
                uptime: `${uptimeHours}h ${uptimeMinutes}m`,
                startTime: this.stats.startTime,
                lastSync: this.stats.lastSync,
                lastHealthCheck: this.stats.lastHealthCheck
            },
            statistics: {
                documentsProcessed: this.stats.documentsProcessed,
                errorsCount: this.stats.errorsCount,
                successRate: this.stats.documentsProcessed > 0 
                    ? ((this.stats.documentsProcessed / (this.stats.documentsProcessed + this.stats.errorsCount)) * 100).toFixed(2) + '%'
                    : 'N/A'
            },
            paperless: await this.integration.checkPaperlessStatus()
        };

        return report;
    }

    async generateFinalReport() {
        this.log('生成最终运行报告');

        const report = await this.generateStatusReport();
        
        console.log('\n=== 文档同步守护进程运行报告 ===');
        console.log(`运行时间: ${report.daemon.uptime}`);
        console.log(`处理文档: ${report.statistics.documentsProcessed}`);
        console.log(`错误次数: ${report.statistics.errorsCount}`);
        console.log(`成功率: ${report.statistics.successRate}`);
        
        // 保存报告
        const reportFile = path.join(path.dirname(this.logFile), 'daemon-final-report.json');
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    }

    // API 接口方法
    getStatus() {
        return this.generateStatusReport();
    }

    getStats() {
        return this.stats;
    }
}

// 命令行接口
if (require.main === module) {
    const daemon = new DocsSyncDaemon();
    
    const command = process.argv[2] || 'start';
    
    switch (command) {
        case 'start':
            daemon.start();
            break;
            
        case 'stop':
            daemon.stop();
            break;
            
        case 'status':
            daemon.getStatus().then(status => {
                console.log(JSON.stringify(status, null, 2));
            });
            break;
            
        default:
            console.log('文档同步守护进程');
            console.log('');
            console.log('用法: node docs-sync-daemon.js <command>');
            console.log('');
            console.log('命令:');
            console.log('  start  - 启动守护进程');
            console.log('  stop   - 停止守护进程');
            console.log('  status - 查看状态');
    }
}

module.exports = DocsSyncDaemon;