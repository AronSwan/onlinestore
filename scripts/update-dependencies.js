#!/usr/bin/env node

/**
 * 依赖更新和安全检查脚本
 * 自动化检查和更新项目依赖，确保安全性和现代性
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DependencyUpdater {
    constructor() {
        this.rootDir = process.cwd();
        this.backendDir = path.join(this.rootDir, 'backend');
        this.logFile = path.join(this.rootDir, 'logs', 'dependency-update.log');
        this.reportFile = path.join(this.rootDir, 'docs', 'dependency-update-report.json');
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage);
        
        // 确保日志目录存在
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        fs.appendFileSync(this.logFile, logMessage + '\n');
    }

    execCommand(command, cwd = this.rootDir) {
        try {
            this.log(`执行命令: ${command} (在 ${cwd})`);
            const result = execSync(command, { 
                cwd, 
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            });
            return { success: true, output: result };
        } catch (error) {
            this.log(`命令执行失败: ${error.message}`);
            return { success: false, error: error.message, output: error.stdout };
        }
    }

    checkNodeVersion() {
        this.log('检查 Node.js 版本...');
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        
        if (majorVersion < 18) {
            this.log(`警告: Node.js 版本 ${nodeVersion} 可能过时，建议升级到 18+ LTS 版本`);
            return { outdated: true, current: nodeVersion, recommended: '18.x LTS' };
        }
        
        this.log(`Node.js 版本 ${nodeVersion} 符合要求`);
        return { outdated: false, current: nodeVersion };
    }

    auditSecurity(directory) {
        this.log(`在 ${directory} 中执行安全审计...`);
        const auditResult = this.execCommand('npm audit --json', directory);
        
        if (auditResult.success) {
            try {
                const audit = JSON.parse(auditResult.output);
                return {
                    vulnerabilities: audit.metadata?.vulnerabilities || {},
                    totalVulnerabilities: audit.metadata?.vulnerabilities?.total || 0
                };
            } catch (e) {
                this.log('解析审计结果失败');
                return { error: '解析失败' };
            }
        }
        
        return { error: auditResult.error };
    }

    checkOutdated(directory) {
        this.log(`在 ${directory} 中检查过时依赖...`);
        const outdatedResult = this.execCommand('npm outdated --json', directory);
        
        if (outdatedResult.success && outdatedResult.output.trim()) {
            try {
                return JSON.parse(outdatedResult.output);
            } catch (e) {
                this.log('解析过时依赖结果失败');
                return {};
            }
        }
        
        return {};
    }

    fixSecurityIssues(directory, autoFix = false) {
        this.log(`修复 ${directory} 中的安全问题...`);
        
        if (autoFix) {
            // 自动修复（谨慎使用）
            const fixResult = this.execCommand('npm audit fix', directory);
            return fixResult;
        } else {
            // 仅显示修复建议
            const fixResult = this.execCommand('npm audit fix --dry-run', directory);
            return fixResult;
        }
    }

    updateDependencies(directory, updateType = 'patch') {
        this.log(`更新 ${directory} 中的依赖 (${updateType})...`);
        
        let command;
        switch (updateType) {
            case 'patch':
                command = 'npm update';
                break;
            case 'minor':
                command = 'npm update --save';
                break;
            case 'major':
                // 需要手动处理主要版本更新
                this.log('主要版本更新需要手动处理');
                return { success: false, message: '主要版本更新需要手动处理' };
            default:
                command = 'npm update';
        }
        
        return this.execCommand(command, directory);
    }

    generateReport(results) {
        const report = {
            timestamp: new Date().toISOString(),
            nodeVersion: results.nodeVersion,
            frontend: {
                security: results.frontendSecurity,
                outdated: results.frontendOutdated,
                updateResults: results.frontendUpdates
            },
            backend: {
                security: results.backendSecurity,
                outdated: results.backendOutdated,
                updateResults: results.backendUpdates
            },
            recommendations: this.generateRecommendations(results)
        };

        // 确保报告目录存在
        const reportDir = path.dirname(this.reportFile);
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        fs.writeFileSync(this.reportFile, JSON.stringify(report, null, 2));
        this.log(`报告已生成: ${this.reportFile}`);
        
        return report;
    }

    generateRecommendations(results) {
        const recommendations = [];

        // Node.js 版本建议
        if (results.nodeVersion.outdated) {
            recommendations.push({
                type: 'runtime',
                priority: 'high',
                message: `升级 Node.js 到 ${results.nodeVersion.recommended}`
            });
        }

        // 安全漏洞建议
        const frontendVulns = results.frontendSecurity.totalVulnerabilities || 0;
        const backendVulns = results.backendSecurity.totalVulnerabilities || 0;

        if (frontendVulns > 0) {
            recommendations.push({
                type: 'security',
                priority: 'critical',
                message: `前端发现 ${frontendVulns} 个安全漏洞，需要立即修复`
            });
        }

        if (backendVulns > 0) {
            recommendations.push({
                type: 'security',
                priority: 'critical',
                message: `后端发现 ${backendVulns} 个安全漏洞，需要立即修复`
            });
        }

        // 过时依赖建议
        const frontendOutdatedCount = Object.keys(results.frontendOutdated).length;
        const backendOutdatedCount = Object.keys(results.backendOutdated).length;

        if (frontendOutdatedCount > 0) {
            recommendations.push({
                type: 'dependencies',
                priority: 'medium',
                message: `前端有 ${frontendOutdatedCount} 个过时依赖需要更新`
            });
        }

        if (backendOutdatedCount > 0) {
            recommendations.push({
                type: 'dependencies',
                priority: 'medium',
                message: `后端有 ${backendOutdatedCount} 个过时依赖需要更新`
            });
        }

        return recommendations;
    }

    async run(options = {}) {
        this.log('开始依赖更新和安全检查...');
        
        const results = {};

        // 1. 检查 Node.js 版本
        results.nodeVersion = this.checkNodeVersion();

        // 2. 前端检查
        this.log('检查前端依赖...');
        if (fs.existsSync(path.join(this.rootDir, 'package.json'))) {
            results.frontendSecurity = this.auditSecurity(this.rootDir);
            results.frontendOutdated = this.checkOutdated(this.rootDir);
            
            if (options.autoFix) {
                results.frontendUpdates = this.updateDependencies(this.rootDir, 'patch');
            }
        }

        // 3. 后端检查
        this.log('检查后端依赖...');
        if (fs.existsSync(path.join(this.backendDir, 'package.json'))) {
            results.backendSecurity = this.auditSecurity(this.backendDir);
            results.backendOutdated = this.checkOutdated(this.backendDir);
            
            if (options.autoFix) {
                results.backendUpdates = this.updateDependencies(this.backendDir, 'patch');
            }
        }

        // 4. 生成报告
        const report = this.generateReport(results);

        // 5. 显示摘要
        this.displaySummary(report);

        this.log('依赖检查完成');
        return report;
    }

    displaySummary(report) {
        console.log('\n=== 依赖检查摘要 ===');
        console.log(`检查时间: ${report.timestamp}`);
        console.log(`Node.js 版本: ${report.nodeVersion.current}`);
        
        if (report.recommendations.length > 0) {
            console.log('\n建议操作:');
            report.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
            });
        } else {
            console.log('\n✅ 所有依赖都是最新且安全的！');
        }
        
        console.log(`\n详细报告: ${this.reportFile}`);
    }
}

// 命令行接口
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {
        autoFix: args.includes('--auto-fix'),
        verbose: args.includes('--verbose')
    };

    const updater = new DependencyUpdater();
    updater.run(options).catch(error => {
        console.error('执行失败:', error);
        process.exit(1);
    });
}

module.exports = DependencyUpdater;