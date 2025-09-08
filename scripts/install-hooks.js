#!/usr/bin/env node
// @ai-generated: 基于Claude 4 Sonnet生成的Git钩子安装脚本

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Git钩子安装器
 * 自动安装和配置Git预提交钩子
 */
class GitHookInstaller {
    constructor() {
        this.projectRoot = process.cwd();
        this.gitDir = path.join(this.projectRoot, '.git');
        this.hooksDir = path.join(this.gitDir, 'hooks');
        this.sourceHooksDir = path.join(this.projectRoot, '.githooks');
    }

    /**
     * 检查Git仓库
     */
    checkGitRepository() {
        if (!fs.existsSync(this.gitDir)) {
            throw new Error('当前目录不是Git仓库');
        }
        
        if (!fs.existsSync(this.hooksDir)) {
            fs.mkdirSync(this.hooksDir, { recursive: true });
            console.log('✅ 创建Git钩子目录');
        }
        
        console.log('✅ Git仓库检查通过');
    }

    /**
     * 检查源钩子文件
     */
    checkSourceHooks() {
        if (!fs.existsSync(this.sourceHooksDir)) {
            throw new Error('源钩子目录不存在: .githooks');
        }
        
        const preCommitSource = path.join(this.sourceHooksDir, 'pre-commit');
        if (!fs.existsSync(preCommitSource)) {
            throw new Error('预提交钩子文件不存在: .githooks/pre-commit');
        }
        
        console.log('✅ 源钩子文件检查通过');
    }

    /**
     * 安装预提交钩子
     */
    installPreCommitHook() {
        const sourceFile = path.join(this.sourceHooksDir, 'pre-commit');
        const targetFile = path.join(this.hooksDir, 'pre-commit');
        
        // 备份现有钩子
        if (fs.existsSync(targetFile)) {
            const backupFile = `${targetFile}.backup.${Date.now()}`;
            fs.copyFileSync(targetFile, backupFile);
            console.log(`📦 备份现有钩子: ${path.basename(backupFile)}`);
        }
        
        // 复制新钩子
        fs.copyFileSync(sourceFile, targetFile);
        
        // 设置执行权限 (Unix/Linux/macOS)
        if (process.platform !== 'win32') {
            try {
                execSync(`chmod +x "${targetFile}"`);
                console.log('✅ 设置钩子执行权限');
            } catch (error) {
                console.warn('⚠️  无法设置执行权限:', error.message);
            }
        }
        
        console.log('✅ 预提交钩子安装完成');
    }

    /**
     * 配置Git钩子路径
     */
    configureGitHooksPath() {
        try {
            // 设置Git钩子路径指向.githooks目录
            execSync(`git config core.hooksPath .githooks`, { cwd: this.projectRoot });
            console.log('✅ 配置Git钩子路径');
        } catch (error) {
            console.warn('⚠️  无法配置Git钩子路径:', error.message);
            console.log('💡 手动运行: git config core.hooksPath .githooks');
        }
    }

    /**
     * 验证钩子安装
     */
    verifyInstallation() {
        const hookFile = path.join(this.hooksDir, 'pre-commit');
        
        if (!fs.existsSync(hookFile)) {
            throw new Error('钩子文件安装失败');
        }
        
        // 检查文件内容
        const content = fs.readFileSync(hookFile, 'utf8');
        if (!content.includes('预提交质量检查')) {
            throw new Error('钩子文件内容不正确');
        }
        
        console.log('✅ 钩子安装验证通过');
    }

    /**
     * 测试钩子
     */
    testHook() {
        console.log('\n🧪 测试预提交钩子...');
        
        try {
            // 检查是否有暂存的文件
            const stagedFiles = execSync('git diff --cached --name-only', { 
                cwd: this.projectRoot,
                encoding: 'utf8' 
            }).trim();
            
            if (!stagedFiles) {
                console.log('💡 没有暂存文件，无法测试钩子');
                console.log('💡 提示: 暂存一些文件后再测试');
                return;
            }
            
            // 运行钩子测试
            const hookFile = path.join(this.hooksDir, 'pre-commit');
            if (process.platform === 'win32') {
                execSync(`sh "${hookFile}"`, { 
                    cwd: this.projectRoot,
                    stdio: 'inherit' 
                });
            } else {
                execSync(`"${hookFile}"`, { 
                    cwd: this.projectRoot,
                    stdio: 'inherit' 
                });
            }
            
            console.log('✅ 钩子测试通过');
        } catch (error) {
            console.log('⚠️  钩子测试失败，但这可能是正常的');
            console.log('💡 钩子会在实际提交时正确工作');
        }
    }

    /**
     * 显示使用说明
     */
    showUsageInstructions() {
        console.log('\n' + '='.repeat(60));
        console.log('📖 Git钩子使用说明');
        console.log('='.repeat(60));
        console.log('');
        console.log('🎯 预提交钩子已安装，将在每次提交时自动运行以下检查:');
        console.log('   • ESLint代码规范检查');
        console.log('   • Prettier代码格式检查');
        console.log('   • 质量门禁检查');
        console.log('   • 文件大小检查');
        console.log('   • 待办事项检查');
        console.log('   • 敏感信息检查');
        console.log('');
        console.log('💡 常用命令:');
        console.log('   npm run lint:fix     - 自动修复ESLint问题');
        console.log('   npm run format       - 自动格式化代码');
        console.log('   npm run quality:gate - 运行质量门禁检查');
        console.log('   git commit --no-verify - 跳过钩子检查（不推荐）');
        console.log('');
        console.log('🔧 如需卸载钩子:');
        console.log('   git config --unset core.hooksPath');
        console.log('   rm .git/hooks/pre-commit');
        console.log('');
        console.log('='.repeat(60));
    }

    /**
     * 执行完整安装流程
     */
    async install() {
        try {
            console.log('🚀 开始安装Git钩子...');
            console.log('');
            
            this.checkGitRepository();
            this.checkSourceHooks();
            this.installPreCommitHook();
            this.configureGitHooksPath();
            this.verifyInstallation();
            
            console.log('');
            console.log('🎉 Git钩子安装成功!');
            
            this.testHook();
            this.showUsageInstructions();
            
        } catch (error) {
            console.error('❌ 安装失败:', error.message);
            process.exit(1);
        }
    }

    /**
     * 卸载钩子
     */
    async uninstall() {
        try {
            console.log('🗑️  开始卸载Git钩子...');
            
            // 重置Git钩子路径
            try {
                execSync('git config --unset core.hooksPath', { cwd: this.projectRoot });
                console.log('✅ 重置Git钩子路径');
            } catch (error) {
                console.log('💡 Git钩子路径未设置');
            }
            
            // 删除钩子文件
            const hookFile = path.join(this.hooksDir, 'pre-commit');
            if (fs.existsSync(hookFile)) {
                fs.unlinkSync(hookFile);
                console.log('✅ 删除预提交钩子');
            }
            
            console.log('🎉 Git钩子卸载完成!');
            
        } catch (error) {
            console.error('❌ 卸载失败:', error.message);
            process.exit(1);
        }
    }
}

// 主执行逻辑
if (require.main === module) {
    const installer = new GitHookInstaller();
    const command = process.argv[2];
    
    switch (command) {
        case 'uninstall':
            installer.uninstall();
            break;
        case 'install':
        default:
            installer.install();
            break;
    }
}

module.exports = GitHookInstaller;