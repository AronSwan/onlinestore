#!/usr/bin/env node

/**
 * Paperless-NGX 监控脚本
 * 监控服务状态、性能指标和健康状况
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class PaperlessMonitor {
    constructor() {
        this.paperlessDir = path.join(__dirname, '..', 'paperless-ngx');
        this.logFile = path.join(__dirname, '..', 'logs', 'paperless-monitor.log');
        this.ensureLogDir();
    }

    ensureLogDir() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}\n`;
        
        console.log(logMessage.trim());
        fs.appendFileSync(this.logFile, logMessage);
    }

    async checkDockerServices() {
        try {
            const output = execSync('docker-compose ps --format json', {
                cwd: this.paperlessDir,
                encoding: 'utf8'
            });

            const services = output.trim().split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line));

            const results = {
                total: services.length,
                running: 0,
                healthy: 0,
                issues: []
            };

            services.forEach(service => {
                if (service.State === 'running') {
                    results.running++;
                    
                    if (service.Health === 'healthy' || !service.Health) {
                        results.healthy++;
                    } else {
                        results.issues.push(`${service.Service}: ${service.Health}`);
                    }
                } else {
                    results.issues.push(`${service.Service}: ${service.State}`);
                }
            });

            return results;
        } catch (error) {
            this.log(`Docker 服务检查失败: ${error.message}`, 'ERROR');
            return null;
        }
    }

    async checkWebService() {
        try {
            const response = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/ui_settings/', {
                encoding: 'utf8',
                timeout: 5000
            });

            return {
                accessible: response.trim() === '200',
                statusCode: response.trim()
            };
        } catch (error) {
            return {
                accessible: false,
                error: error.message
            };
        }
    }

    async checkDiskUsage() {
        try {
            const dataPath = path.join(this.paperlessDir, 'data');
            const mediaPath = path.join(this.paperlessDir, 'media');
            
            const getSize = (dirPath) => {
                if (!fs.existsSync(dirPath)) return 0;
                
                try {
                    const output = execSync(`du -sb "${dirPath}"`, { encoding: 'utf8' });
                    return parseInt(output.split('\t')[0]);
                } catch {
                    return 0;
                }
            };

            return {
                dataSize: getSize(dataPath),
                mediaSize: getSize(mediaPath),
                totalSize: getSize(this.paperlessDir)
            };
        } catch (error) {
            this.log(`磁盘使用检查失败: ${error.message}`, 'ERROR');
            return null;
        }
    }

    async checkDocumentCount() {
        try {
            const output = execSync(
                'docker-compose exec -T webserver python3 manage.py shell -c "from documents.models import Document; print(Document.objects.count())"',
                {
                    cwd: this.paperlessDir,
                    encoding: 'utf8'
                }
            );

            return parseInt(output.trim()) || 0;
        } catch (error) {
            this.log(`文档数量检查失败: ${error.message}`, 'ERROR');
            return null;
        }
    }

    async checkCeleryTasks() {
        try {
            const output = execSync(
                'docker-compose exec -T webserver python3 manage.py shell -c "from django_celery_results.models import TaskResult; active = TaskResult.objects.filter(status=\'PENDING\').count(); failed = TaskResult.objects.filter(status=\'FAILURE\').count(); print(f\'{active},{failed}\')"',
                {
                    cwd: this.paperlessDir,
                    encoding: 'utf8'
                }
            );

            const [active, failed] = output.trim().split(',').map(n => parseInt(n) || 0);
            return { active, failed };
        } catch (error) {
            this.log(`Celery 任务检查失败: ${error.message}`, 'ERROR');
            return null;
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async generateReport() {
        this.log('开始生成 Paperless-NGX 监控报告');

        const report = {
            timestamp: new Date().toISOString(),
            services: await this.checkDockerServices(),
            webService: await this.checkWebService(),
            diskUsage: await this.checkDiskUsage(),
            documentCount: await this.checkDocumentCount(),
            celeryTasks: await this.checkCeleryTasks()
        };

        // 生成报告摘要
        let summary = '\n=== Paperless-NGX 监控报告 ===\n';
        summary += `时间: ${report.timestamp}\n\n`;

        // 服务状态
        if (report.services) {
            summary += `🔧 服务状态:\n`;
            summary += `  - 总服务数: ${report.services.total}\n`;
            summary += `  - 运行中: ${report.services.running}\n`;
            summary += `  - 健康: ${report.services.healthy}\n`;
            
            if (report.services.issues.length > 0) {
                summary += `  - 问题: ${report.services.issues.join(', ')}\n`;
            }
            summary += '\n';
        }

        // Web 服务
        if (report.webService) {
            summary += `🌐 Web 服务:\n`;
            summary += `  - 可访问: ${report.webService.accessible ? '✅' : '❌'}\n`;
            summary += `  - 状态码: ${report.webService.statusCode || 'N/A'}\n`;
            if (report.webService.error) {
                summary += `  - 错误: ${report.webService.error}\n`;
            }
            summary += '\n';
        }

        // 磁盘使用
        if (report.diskUsage) {
            summary += `💾 磁盘使用:\n`;
            summary += `  - 数据目录: ${this.formatBytes(report.diskUsage.dataSize)}\n`;
            summary += `  - 媒体目录: ${this.formatBytes(report.diskUsage.mediaSize)}\n`;
            summary += `  - 总大小: ${this.formatBytes(report.diskUsage.totalSize)}\n\n`;
        }

        // 文档统计
        if (report.documentCount !== null) {
            summary += `📄 文档统计:\n`;
            summary += `  - 文档总数: ${report.documentCount}\n\n`;
        }

        // Celery 任务
        if (report.celeryTasks) {
            summary += `⚙️ 后台任务:\n`;
            summary += `  - 活跃任务: ${report.celeryTasks.active}\n`;
            summary += `  - 失败任务: ${report.celeryTasks.failed}\n\n`;
        }

        // 健康评分
        let healthScore = 100;
        let issues = [];

        if (!report.services || report.services.running !== report.services.total) {
            healthScore -= 30;
            issues.push('服务未完全运行');
        }

        if (!report.webService || !report.webService.accessible) {
            healthScore -= 40;
            issues.push('Web 服务不可访问');
        }

        if (report.celeryTasks && report.celeryTasks.failed > 0) {
            healthScore -= 10;
            issues.push('存在失败的后台任务');
        }

        summary += `🏥 健康评分: ${healthScore}/100\n`;
        if (issues.length > 0) {
            summary += `⚠️  问题: ${issues.join(', ')}\n`;
        }

        this.log(summary);

        // 保存详细报告
        const reportFile = path.join(path.dirname(this.logFile), 'paperless-report.json');
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

        return report;
    }

    async runHealthCheck() {
        try {
            const report = await this.generateReport();
            
            // 如果健康评分低于 80，发出警告
            let healthScore = 100;
            
            if (!report.services || report.services.running !== report.services.total) {
                healthScore -= 30;
            }
            
            if (!report.webService || !report.webService.accessible) {
                healthScore -= 40;
            }
            
            if (report.celeryTasks && report.celeryTasks.failed > 0) {
                healthScore -= 10;
            }

            if (healthScore < 80) {
                this.log(`⚠️  健康检查警告: 评分 ${healthScore}/100`, 'WARN');
                return false;
            }

            this.log(`✅ 健康检查通过: 评分 ${healthScore}/100`);
            return true;
        } catch (error) {
            this.log(`健康检查失败: ${error.message}`, 'ERROR');
            return false;
        }
    }
}

// 命令行接口
if (require.main === module) {
    const monitor = new PaperlessMonitor();
    
    const command = process.argv[2] || 'report';
    
    switch (command) {
        case 'health':
            monitor.runHealthCheck();
            break;
        case 'report':
            monitor.generateReport();
            break;
        default:
            console.log('用法: node paperless-monitor.js [health|report]');
            console.log('  health - 运行健康检查');
            console.log('  report - 生成详细报告');
    }
}

module.exports = PaperlessMonitor;