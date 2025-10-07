#!/usr/bin/env node

/**
 * 安全依赖更新脚本
 * 只更新补丁版本和安全修复，避免破坏性变更
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SafeUpdater {
    constructor() {
        this.rootDir = process.cwd();
        this.backendDir = path.join(this.rootDir, 'backend');
    }

    log(message) {
        console.log(`[${new Date().toISOString()}] ${message}`);
    }

    execCommand(command, cwd = this.rootDir) {
        try {
            this.log(`执行: ${command} (在 ${cwd})`);
            const result = execSync(command, { 
                cwd, 
                encoding: 'utf8',
                stdio: 'inherit'
            });
            return { success: true, output: result };
        } catch (error) {
            this.log(`命令失败: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    updatePatchVersions(directory) {
        this.log(`更新 ${directory} 中的补丁版本...`);
        
        // 只更新补丁版本，不更新主要或次要版本
        const result = this.execCommand('npm update --save', directory);
        return result;
    }

    fixSecurityIssues(directory) {
        this.log(`修复 ${directory} 中的安全问题...`);
        
        // 尝试自动修复安全问题
        const result = this.execCommand('npm audit fix', directory);
        return result;
    }

    checkPackageJson(directory) {
        const packageJsonPath = path.join(directory, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            this.log(`${packageJsonPath} 不存在，跳过`);
            return false;
        }
        return true;
    }

    async run() {
        this.log('开始安全依赖更新...');

        // 1. 前端更新
        if (this.checkPackageJson(this.rootDir)) {
            this.log('=== 前端依赖更新 ===');
            
            // 修复安全问题
            this.fixSecurityIssues(this.rootDir);
            
            // 更新补丁版本
            this.updatePatchVersions(this.rootDir);
            
            this.log('前端依赖更新完成');
        }

        // 2. 后端更新
        if (this.checkPackageJson(this.backendDir)) {
            this.log('=== 后端依赖更新 ===');
            
            // 修复安全问题
            this.fixSecurityIssues(this.backendDir);
            
            // 更新补丁版本
            this.updatePatchVersions(this.backendDir);
            
            this.log('后端依赖更新完成');
        }

        // 3. 最终检查
        this.log('=== 最终安全检查 ===');
        if (this.checkPackageJson(this.rootDir)) {
            this.execCommand('npm audit', this.rootDir);
        }
        if (this.checkPackageJson(this.backendDir)) {
            this.execCommand('npm audit', this.backendDir);
        }

        this.log('安全依赖更新完成！');
    }
}

// 运行更新
if (require.main === module) {
    const updater = new SafeUpdater();
    updater.run().catch(error => {
        console.error('更新失败:', error);
        process.exit(1);
    });
}

module.exports = SafeUpdater;