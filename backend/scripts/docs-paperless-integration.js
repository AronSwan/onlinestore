#!/usr/bin/env node

/**
 * 后端文档系统与 Paperless-NGX 集成脚本
 * 将后端文档系统纳入 Paperless-NGX 监管
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { execSync } = require('child_process');

class DocsIntegration {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.paperlessDir = path.join(this.projectRoot, 'paperless-ngx');
        this.consumeDir = path.join(this.paperlessDir, 'consume');
        this.docsDir = path.join(this.projectRoot, 'docs');
        this.logFile = path.join(this.projectRoot, 'logs', 'docs-integration.log');
        
        this.watchedExtensions = ['.md', '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'];
        this.excludePatterns = ['node_modules', '.git', 'dist', 'build', 'coverage'];
        
        this.ensureDirectories();
    }

    ensureDirectories() {
        [
            path.dirname(this.logFile),
            this.consumeDir,
            path.join(this.docsDir, 'archived'),
            path.join(this.docsDir, 'processed')
        ].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}\n`;
        
        console.log(logMessage.trim());
        fs.appendFileSync(this.logFile, logMessage);
    }

    /**
     * 扫描后端文档目录，发现所有文档文件
     */
    scanDocuments() {
        const documents = [];
        
        const scanDir = (dirPath, relativePath = '') => {
            if (!fs.existsSync(dirPath)) return;
            
            const items = fs.readdirSync(dirPath);
            
            items.forEach(item => {
                const fullPath = path.join(dirPath, item);
                const relativeItemPath = path.join(relativePath, item);
                
                // 跳过排除的目录
                if (this.excludePatterns.some(pattern => relativeItemPath.includes(pattern))) {
                    return;
                }
                
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanDir(fullPath, relativeItemPath);
                } else if (stat.isFile()) {
                    const ext = path.extname(item).toLowerCase();
                    if (this.watchedExtensions.includes(ext)) {
                        documents.push({
                            path: fullPath,
                            relativePath: relativeItemPath,
                            name: item,
                            extension: ext,
                            size: stat.size,
                            modified: stat.mtime,
                            category: this.categorizeDocument(relativeItemPath)
                        });
                    }
                }
            });
        };
        
        scanDir(this.projectRoot);
        return documents;
    }

    /**
     * 根据文件路径分类文档
     */
    categorizeDocument(relativePath) {
        const pathParts = relativePath.split(path.sep);
        
        if (pathParts.includes('docs')) return 'documentation';
        if (pathParts.includes('api')) return 'api-docs';
        if (pathParts.includes('guides')) return 'guides';
        if (pathParts.includes('templates')) return 'templates';
        if (pathParts.includes('specs')) return 'specifications';
        if (pathParts.includes('README')) return 'readme';
        
        return 'general';
    }

    /**
     * 为文档生成标签
     */
    generateTags(document) {
        const tags = [];
        
        // 基于分类的标签
        tags.push(`category:${document.category}`);
        
        // 基于文件扩展名的标签
        tags.push(`format:${document.extension.substring(1)}`);
        
        // 基于路径的标签
        const pathParts = document.relativePath.split(path.sep);
        pathParts.forEach(part => {
            if (part !== document.name && part.length > 2) {
                tags.push(`path:${part}`);
            }
        });
        
        // 基于文件名的标签
        const nameWithoutExt = path.basename(document.name, document.extension);
        if (nameWithoutExt.includes('api')) tags.push('api');
        if (nameWithoutExt.includes('guide')) tags.push('guide');
        if (nameWithoutExt.includes('spec')) tags.push('specification');
        if (nameWithoutExt.includes('template')) tags.push('template');
        if (nameWithoutExt.includes('README')) tags.push('readme');
        
        return tags;
    }

    /**
     * 将文档复制到 Paperless-NGX 消费目录
     */
    async importDocument(document) {
        try {
            const tags = this.generateTags(document);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            // 生成新的文件名，包含元数据
            const nameWithoutExt = path.basename(document.name, document.extension);
            const newFileName = `${timestamp}_${nameWithoutExt}_[${tags.join(',')}]${document.extension}`;
            const targetPath = path.join(this.consumeDir, newFileName);
            
            // 复制文件
            fs.copyFileSync(document.path, targetPath);
            
            this.log(`导入文档: ${document.relativePath} -> ${newFileName}`);
            
            return {
                success: true,
                originalPath: document.path,
                targetPath: targetPath,
                fileName: newFileName,
                tags: tags
            };
        } catch (error) {
            this.log(`导入文档失败 ${document.relativePath}: ${error.message}`, 'ERROR');
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 批量导入所有文档
     */
    async importAllDocuments() {
        this.log('开始批量导入后端文档到 Paperless-NGX');
        
        const documents = this.scanDocuments();
        this.log(`发现 ${documents.length} 个文档文件`);
        
        const results = {
            total: documents.length,
            success: 0,
            failed: 0,
            errors: []
        };
        
        for (const document of documents) {
            const result = await this.importDocument(document);
            if (result.success) {
                results.success++;
            } else {
                results.failed++;
                results.errors.push({
                    file: document.relativePath,
                    error: result.error
                });
            }
        }
        
        this.log(`导入完成: 成功 ${results.success}, 失败 ${results.failed}`);
        
        if (results.errors.length > 0) {
            this.log('失败的文件:', 'ERROR');
            results.errors.forEach(error => {
                this.log(`  ${error.file}: ${error.error}`, 'ERROR');
            });
        }
        
        return results;
    }

    /**
     * 启动文档监控
     */
    startWatching() {
        this.log('启动后端文档监控系统');
        
        const watcher = chokidar.watch(this.projectRoot, {
            ignored: [
                /(^|[\/\\])\../, // 忽略隐藏文件
                /node_modules/,
                /\.git/,
                /dist/,
                /build/,
                /coverage/,
                this.paperlessDir // 忽略 paperless-ngx 目录本身
            ],
            persistent: true,
            ignoreInitial: true
        });
        
        watcher
            .on('add', filePath => this.handleFileChange(filePath, 'added'))
            .on('change', filePath => this.handleFileChange(filePath, 'changed'))
            .on('unlink', filePath => this.handleFileChange(filePath, 'removed'));
        
        this.log('文档监控系统已启动');
        
        // 保持进程运行
        process.on('SIGINT', () => {
            this.log('停止文档监控系统');
            watcher.close();
            process.exit(0);
        });
        
        return watcher;
    }

    /**
     * 处理文件变化
     */
    async handleFileChange(filePath, action) {
        const ext = path.extname(filePath).toLowerCase();
        
        // 只处理文档文件
        if (!this.watchedExtensions.includes(ext)) {
            return;
        }
        
        const relativePath = path.relative(this.projectRoot, filePath);
        this.log(`文档${action}: ${relativePath}`);
        
        if (action === 'added' || action === 'changed') {
            // 等待文件写入完成
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (fs.existsSync(filePath)) {
                const stat = fs.statSync(filePath);
                const document = {
                    path: filePath,
                    relativePath: relativePath,
                    name: path.basename(filePath),
                    extension: ext,
                    size: stat.size,
                    modified: stat.mtime,
                    category: this.categorizeDocument(relativePath)
                };
                
                await this.importDocument(document);
            }
        }
    }

    /**
     * 生成文档系统报告
     */
    async generateReport() {
        this.log('生成文档系统集成报告');
        
        const documents = this.scanDocuments();
        const categories = {};
        const extensions = {};
        
        documents.forEach(doc => {
            // 统计分类
            categories[doc.category] = (categories[doc.category] || 0) + 1;
            
            // 统计扩展名
            extensions[doc.extension] = (extensions[doc.extension] || 0) + 1;
        });
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalDocuments: documents.length,
                totalSize: documents.reduce((sum, doc) => sum + doc.size, 0),
                categories: Object.keys(categories).length,
                formats: Object.keys(extensions).length
            },
            categories: categories,
            extensions: extensions,
            recentDocuments: documents
                .sort((a, b) => b.modified - a.modified)
                .slice(0, 10)
                .map(doc => ({
                    name: doc.name,
                    path: doc.relativePath,
                    category: doc.category,
                    size: doc.size,
                    modified: doc.modified
                }))
        };
        
        // 保存报告
        const reportFile = path.join(path.dirname(this.logFile), 'docs-integration-report.json');
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        
        // 打印摘要
        console.log('\n=== 后端文档系统集成报告 ===');
        console.log(`总文档数: ${report.summary.totalDocuments}`);
        console.log(`总大小: ${this.formatBytes(report.summary.totalSize)}`);
        console.log(`分类数: ${report.summary.categories}`);
        console.log(`格式数: ${report.summary.formats}`);
        
        console.log('\n文档分类:');
        Object.entries(categories).forEach(([category, count]) => {
            console.log(`  ${category}: ${count}`);
        });
        
        console.log('\n文件格式:');
        Object.entries(extensions).forEach(([ext, count]) => {
            console.log(`  ${ext}: ${count}`);
        });
        
        return report;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 检查 Paperless-NGX 服务状态
     */
    async checkPaperlessStatus() {
        try {
            const output = execSync('docker-compose ps --format json', {
                cwd: this.paperlessDir,
                encoding: 'utf8'
            });
            
            const services = output.trim().split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line));
            
            const webserver = services.find(s => s.Service === 'webserver');
            
            return {
                running: webserver && webserver.State === 'running',
                healthy: webserver && (webserver.Health === 'healthy' || !webserver.Health),
                services: services.length
            };
        } catch (error) {
            return {
                running: false,
                error: error.message
            };
        }
    }
}

// 命令行接口
if (require.main === module) {
    const integration = new DocsIntegration();
    
    const command = process.argv[2] || 'help';
    
    switch (command) {
        case 'scan':
            integration.generateReport();
            break;
            
        case 'import':
            integration.importAllDocuments();
            break;
            
        case 'watch':
            integration.startWatching();
            break;
            
        case 'status':
            integration.checkPaperlessStatus().then(status => {
                console.log('Paperless-NGX 状态:', status);
            });
            break;
            
        case 'help':
        default:
            console.log('后端文档系统与 Paperless-NGX 集成工具');
            console.log('');
            console.log('用法: node docs-paperless-integration.js <command>');
            console.log('');
            console.log('命令:');
            console.log('  scan   - 扫描并生成文档系统报告');
            console.log('  import - 批量导入所有文档到 Paperless-NGX');
            console.log('  watch  - 启动实时文档监控');
            console.log('  status - 检查 Paperless-NGX 服务状态');
            console.log('  help   - 显示此帮助信息');
    }
}

module.exports = DocsIntegration;